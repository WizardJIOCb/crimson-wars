const nav = document.getElementById('site-nav');
const mobileToggle = document.querySelector('.mobile-menu-toggle');
const newsGrid = document.getElementById('landing-news-grid');
const ratingsGrid = document.getElementById('landing-ratings-grid');
const latestRunsGrid = document.getElementById('landing-latest-runs');
const latestRunsPager = document.getElementById('landing-latest-runs-pager');
const revealNodes = Array.from(document.querySelectorAll('.reveal'));
const profileModal = document.getElementById('landing-profile-modal');
const profileBody = document.getElementById('landing-profile-body');
const profileTitle = document.getElementById('landing-profile-title');
const profileCloseBtn = document.getElementById('landing-profile-close');
const hubFrame = document.getElementById('battle-hub-frame');
const hubLoading = document.getElementById('battle-hub-loading');
const hubTabTitle = document.getElementById('hub-tab-title');
const hubTabDescription = document.getElementById('hub-tab-description');
const HUB_TABS = new Set(['play', 'characters', 'skills', 'profile', 'rating', 'news']);
const hubTabMeta = {
  play: {
    title: 'Play',
    description: 'Создай комнату, зайди по коду, выбери режим и стартуй без лишнего шага между лендингом и игрой.',
  },
  characters: {
    title: 'Characters',
    description: 'Смотри доступных героев, переключай стиль боя и собирай состав до того, как откроется арена.',
  },
  skills: {
    title: 'Skills',
    description: 'Прокачка и дерево героя теперь открываются внутри лендинга, а не в отдельном экране-ответвлении.',
  },
  profile: {
    title: 'Profile',
    description: 'Аккаунт, прогресс, история забегов и личная динамика теперь остаются прямо в основном flow страницы.',
  },
  rating: {
    title: 'Rating',
    description: 'Полный leaderboard живёт внутри общего battle hub, а блоки ниже на лендинге работают как preview.',
  },
  news: {
    title: 'News',
    description: 'Патчи, апдейты и обсуждение доступны без разрыва между витриной проекта и игровым меню.',
  },
};
let activeHubTab = 'play';
let latestRunsSignature = '';
let latestRunsPollTimer = 0;
let latestRunsPage = 1;
let latestRunsTotalPages = 1;
const LATEST_RUNS_PAGE_SIZE = 3;
const HERO_LABELS = {
  cyber: 'Cyber',
  scout: 'Scout',
  shadow: 'Shadow',
  medic: 'Medic',
  medis: 'Medic',
  raider: 'Raider',
};

function toggleMenu(forceOpen) {
  if (!nav || !mobileToggle) return;
  const nextState = typeof forceOpen === 'boolean' ? forceOpen : !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', nextState);
  document.body.classList.toggle('menu-open', nextState);
  mobileToggle.setAttribute('aria-expanded', String(nextState));
  mobileToggle.classList.toggle('is-open', nextState);
}

mobileToggle?.addEventListener('click', () => {
  toggleMenu();
});

for (const link of Array.from(document.querySelectorAll('.site-nav a'))) {
  link.addEventListener('click', () => {
    toggleMenu(false);
  });
}

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  }
}, { threshold: 0.18 });

for (const node of revealNodes) {
  revealObserver.observe(node);
}

function getHubUrl(tabId) {
  const nextTab = HUB_TABS.has(String(tabId || '').trim().toLowerCase()) ? String(tabId).trim().toLowerCase() : 'play';
  return nextTab === 'play' ? '/play' : `/play?tab=${encodeURIComponent(nextTab)}`;
}

function scrollToBattleHub() {
  const section = document.getElementById('play');
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setActiveHubTab(tabId, { updateFrame = true, scrollIntoView = false } = {}) {
  const nextTab = HUB_TABS.has(String(tabId || '').trim().toLowerCase()) ? String(tabId).trim().toLowerCase() : 'play';
  activeHubTab = nextTab;
  for (const button of Array.from(document.querySelectorAll('[data-hub-tab]'))) {
    const isActive = String(button.getAttribute('data-hub-tab') || '').trim().toLowerCase() === nextTab;
    if (button.tagName === 'BUTTON') button.classList.toggle('active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  }
  if (hubTabTitle) hubTabTitle.textContent = hubTabMeta[nextTab]?.title || 'Play';
  if (hubTabDescription) hubTabDescription.textContent = hubTabMeta[nextTab]?.description || '';
  if (updateFrame && hubFrame) {
    const nextUrl = getHubUrl(nextTab);
    const currentUrl = String(hubFrame.getAttribute('src') || '').trim();
    if (currentUrl !== nextUrl) {
      hubLoading?.classList.remove('is-hidden');
      hubFrame.setAttribute('src', nextUrl);
    }
  }
  if (scrollIntoView) scrollToBattleHub();
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const trigger = target.closest('[data-hub-tab]');
  if (!(trigger instanceof Element)) return;
  const nextTab = String(trigger.getAttribute('data-hub-tab') || '').trim().toLowerCase();
  if (!HUB_TABS.has(nextTab)) return;
  event.preventDefault();
  toggleMenu(false);
  setActiveHubTab(nextTab, { updateFrame: true, scrollIntoView: true });
});

hubFrame?.addEventListener('load', () => {
  hubLoading?.classList.add('is-hidden');
});

setActiveHubTab('play', { updateFrame: false, scrollIntoView: false });

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatNewsDate(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return 'Свежий апдейт';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(stamp);
}

function formatShortDateTime(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(stamp);
}

function formatProfileDateTime(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(stamp);
}

function formatDurationSec(value) {
  return `${Math.max(0, Number(value) || 0)}s`;
}

function formatRunGameModeLabel(run) {
  const raw = String(run?.runDetails?.gameMode || '').trim().toLowerCase();
  if (raw === 'hardcore') return '\u0425\u0430\u0440\u0434\u043a\u043e\u0440';
  if (raw === 'normal') return '\u041e\u0431\u044b\u0447\u043d\u044b\u0439';
  if (raw === 'pvp') return 'PvP';
  return '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439';
}

function formatRunHeroLabel(run) {
  const raw = String(run?.runDetails?.heroId || run?.runDetails?.playerClass || '').trim().toLowerCase();
  if (!raw) return '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u0433\u0435\u0440\u043e\u0439';
  if (HERO_LABELS[raw]) return HERO_LABELS[raw];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatRunAgo(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return '\u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e';
  const diffSec = Math.max(0, Math.round((Date.now() - stamp) / 1000));
  if (diffSec < 60) return `${diffSec || 1} \u0441\u0435\u043a. \u043d\u0430\u0437\u0430\u0434`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} \u043c\u0438\u043d. \u043d\u0430\u0437\u0430\u0434`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} \u0447. \u043d\u0430\u0437\u0430\u0434`;
  return `${Math.floor(diffSec / 86400)} \u0434. \u043d\u0430\u0437\u0430\u0434`;
}

function buildReplayUrl(run) {
  const id = Math.max(0, Number(run?.id) || 0);
  const url = new URL('/play', window.location.origin);
  if (id > 0) {
    url.searchParams.set('replay', String(id));
    url.searchParams.set('replayPath', `/api/leaderboard/runs/${id}/replay`);
  }
  return url.toString();
}

function buildLatestRunsSignature(runs) {
  return (Array.isArray(runs) ? runs : [])
    .slice(0, 10)
    .map((run) => `${Math.max(0, Number(run?.id) || 0)}:${Math.max(0, Number(run?.at) || 0)}`)
    .join('|');
}

function renderLatestRunsPager() {
  if (!latestRunsPager) return;
  if (latestRunsTotalPages <= 1) {
    latestRunsPager.innerHTML = '';
    return;
  }
  latestRunsPager.innerHTML = `
    <button class="raid-pager-btn" type="button" data-runs-page-action="prev" ${latestRunsPage <= 1 ? 'disabled' : ''}>
      \u041d\u0430\u0437\u0430\u0434
    </button>
    <span class="raid-pager-status">\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430 ${latestRunsPage} \u0438\u0437 ${latestRunsTotalPages}</span>
    <button class="raid-pager-btn" type="button" data-runs-page-action="next" ${latestRunsPage >= latestRunsTotalPages ? 'disabled' : ''}>
      \u0412\u043f\u0435\u0440\u0451\u0434
    </button>
  `;
}

function formatRatingValue(item, categoryKey) {
  const value = Math.max(0, Number(item?.value) || 0);
  if (categoryKey === 'best_time_run') return `${value}s`;
  if (categoryKey === 'best_dps_run') return `${value.toFixed(2)} DPS`;
  if (categoryKey === 'profile_level') return `Lv${value}`;
  if (categoryKey === 'heroes_unlocked') return `${value} героев`;
  if (categoryKey === 'runs_count') return `${value} забегов`;
  if (categoryKey === 'shards_balance') return `${value} shards`;
  if (categoryKey === 'best_pvp_kills_run') return `${value} PvP`;
  return String(value);
}

function closeProfileModal() {
  if (!profileModal) return;
  profileModal.classList.add('hidden');
  profileModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('menu-open');
}

function openProfileModalShell(title) {
  if (!profileModal || !profileBody || !profileTitle) return;
  profileTitle.textContent = title;
  profileBody.innerHTML = 'Загрузка...';
  profileModal.classList.remove('hidden');
  profileModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('menu-open');
}

profileCloseBtn?.addEventListener('click', closeProfileModal);
profileModal?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.hasAttribute('data-profile-close')) closeProfileModal();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
    toggleMenu(false);
    return;
  }
  if (event.key === 'Escape' && profileModal && !profileModal.classList.contains('hidden')) {
    closeProfileModal();
  }
});

function renderProfile(profile, runPayload) {
  const publicHeroes = Array.isArray(profile?.heroStats) ? profile.heroStats : [];
  const runs = Array.isArray(runPayload?.runs) ? runPayload.runs : [];

  const heroesHtml = publicHeroes.length > 0
    ? publicHeroes.map((hero) => `
        <div class="landing-profile-row">
          <span>${escapeHtml(hero?.name || hero?.id || 'Hero')}</span>
          <span>Lv${Math.max(1, Number(hero?.level) || 1)}</span>
          <span>${Math.max(0, Number(hero?.runs) || 0)} runs | ${hero?.unlocked ? 'Unlocked' : 'Locked'}</span>
        </div>
      `).join('')
    : '<div class="landing-profile-empty">No hero data.</div>';

  const runsHtml = runs.length > 0
    ? runs.map((run) => `
        <div class="landing-profile-run">
          <div class="landing-profile-run-head">
            <span>${escapeHtml(formatShortDateTime(run?.at))}</span>
            <span>Room ${escapeHtml(run?.roomCode || '-')} | ${escapeHtml(formatRunGameModeLabel(run))}</span>
          </div>
          <div class="landing-profile-run-main">
            <span>${Math.max(0, Number(run?.kills) || 0)} kills</span>
            <span>${Math.max(0, Number(run?.score) || 0)} pts</span>
            <span>${escapeHtml(formatDurationSec(run?.durationSec))}</span>
            <span class="landing-profile-run-xp">XP ${Math.max(0, Number(run?.runDetails?.xp) || 0)}</span>
          </div>
        </div>
      `).join('')
    : '<div class="landing-profile-empty">Runs not found.</div>';

  return `
    <div class="landing-profile-card">
      <h3>Profile Lv${Math.max(1, Number(profile?.accountLevel) || 1)}</h3>
      <div class="landing-profile-meta">
        XP ${Math.max(0, Number(profile?.accountXp) || 0)}/${Math.max(0, Number(profile?.accountXpToNext) || 0)}
        | Skill points: ${Math.max(0, Number(profile?.accountSkillPoints) || 0)}
        | Shards: ${Math.max(0, Number(profile?.shards) || 0)}
        | Heroes: ${Math.max(0, Number(profile?.heroesUnlocked) || 0)}/${Math.max(0, Number(profile?.heroesTotal) || 0)}
        | Runs: ${Math.max(0, Number(profile?.totalRuns) || 0)}
      </div>
    </div>
    <div class="landing-profile-card">
      <h3>Account info</h3>
      <div class="landing-profile-meta">
        Created: ${escapeHtml(formatProfileDateTime(profile?.createdAt))}
        | Last login: ${escapeHtml(formatProfileDateTime(profile?.lastLoginAt))}
      </div>
    </div>
    <div class="landing-profile-card">
      <h3>Heroes</h3>
      <div class="landing-profile-heroes">${heroesHtml}</div>
    </div>
    <div class="landing-profile-card">
      <h3>Run history (${Math.max(0, Number(runPayload?.total) || runs.length)})</h3>
      <div class="landing-profile-runs">${runsHtml}</div>
    </div>
  `;
}

async function openPlayerProfile(playerId, fallbackName) {
  const id = Math.max(0, Number(playerId) || 0);
  if (!id || !profileBody || !profileTitle) return;
  openProfileModalShell(`Profile: ${String(fallbackName || `ID ${id}`)}`);
  try {
    const [profileResponse, runsResponse] = await Promise.all([
      fetch(`/api/player/public-profile/${id}`, { cache: 'no-store' }),
      fetch(`/api/player/public-profile/${id}/run-history?page=1&page_size=8`, { cache: 'no-store' }),
    ]);
    const profilePayload = await profileResponse.json().catch(() => ({}));
    const runsPayload = await runsResponse.json().catch(() => ({}));
    if (!profileResponse.ok || !profilePayload?.ok || !profilePayload?.profile) {
      throw new Error(profilePayload?.message || `HTTP ${profileResponse.status}`);
    }
    profileTitle.textContent = `Profile: ${String(profilePayload.profile?.nickname || fallbackName || `ID ${id}`)}`;
    const runData = runsResponse.ok && runsPayload?.ok
      ? {
          runs: Array.isArray(runsPayload.runs) ? runsPayload.runs : [],
          total: Math.max(0, Number(runsPayload.total) || 0),
        }
      : { runs: [], total: 0 };
    profileBody.innerHTML = renderProfile(profilePayload.profile, runData);
  } catch (error) {
    profileBody.innerHTML = `<div class="landing-profile-card">Не удалось загрузить профиль: ${escapeHtml(error?.message || 'Unknown error')}</div>`;
  }
}

function bindRatingProfileButtons() {
  if (!ratingsGrid) return;
  for (const button of Array.from(ratingsGrid.querySelectorAll('[data-rating-player]'))) {
    button.addEventListener('click', () => {
      const playerId = Math.max(0, Number(button.getAttribute('data-rating-player')) || 0);
      const nickname = String(button.textContent || '').trim();
      void openPlayerProfile(playerId, nickname);
    });
  }
}

function renderNews(items) {
  if (!newsGrid) return;
  if (!Array.isArray(items) || items.length === 0) {
    newsGrid.innerHTML = `
      <article class="news-card">
        <span class="news-meta">Пока тихо</span>
        <h3>Сводка еще не пролилась</h3>
        <p>Как только в игре появится свежий патч, этот блок первым поднимет боевую новость на поверхность.</p>
        <a href="#play" data-hub-tab="news">Открыть вкладку новостей</a>
      </article>
    `;
    return;
  }

  newsGrid.innerHTML = items.slice(0, 3).map((item) => {
    const title = escapeHtml(item?.title || 'Crimson Wars update');
    const summary = escapeHtml(item?.summary || 'Свежая запись в журнале обновлений.');
    const date = escapeHtml(formatNewsDate(item?.publishedAt));
    return `
      <article class="news-card">
        <span class="news-meta">${date}</span>
        <h3>${title}</h3>
        <p>${summary}</p>
        <a href="#play" data-hub-tab="news">Открыть новость</a>
      </article>
    `;
  }).join('');
}

function renderRatings(cards) {
  if (!ratingsGrid) return;
  if (!Array.isArray(cards) || cards.length === 0) {
    ratingsGrid.innerHTML = `
      <article class="rating-card">
        <span class="rating-card-meta">Пусто</span>
        <h3>Рейтинги еще не прогрузились</h3>
        <p>Можно открыть полную вкладку рейтинга в игре и посмотреть таблицы уже там.</p>
        <a class="rating-card-link" href="#play" data-hub-tab="rating">Открыть полный рейтинг</a>
      </article>
    `;
    return;
  }

  ratingsGrid.innerHTML = cards.map((card) => {
    const rows = (card.items || []).slice(0, 3).map((item, index) => {
      const playerId = Math.max(0, Number(item?.playerId) || 0);
      const nickname = escapeHtml(item?.nickname || item?.name || 'Unknown');
      const nicknameHtml = playerId > 0
        ? `<button type="button" class="rating-name" data-rating-player="${playerId}">${nickname}</button>`
        : `<span class="rating-name">${nickname}</span>`;
      return `
        <div class="rating-card-row">
          <span class="rating-rank">#${index + 1}</span>
          ${nicknameHtml}
          <span class="rating-value">${escapeHtml(formatRatingValue(item, card.key))}</span>
        </div>
      `;
    }).join('');
    return `
      <article class="rating-card">
        <span class="rating-card-meta">${escapeHtml(card.source === 'account' ? 'Профиль' : 'Забеги')}</span>
        <h3>${escapeHtml(card.title || card.key)}</h3>
        <div class="rating-card-list">${rows}</div>
        <a class="rating-card-link" href="#play" data-hub-tab="rating">Открыть полный рейтинг</a>
      </article>
    `;
  }).join('');
  bindRatingProfileButtons();
}

function renderLatestRuns(runs) {
  if (!latestRunsGrid) return;
  if (!Array.isArray(runs) || runs.length === 0) {
    latestRunsGrid.innerHTML = `
      <article class="raid-card raid-card-featured">
        <span class="raid-card-topline">\u0422\u0438\u0445\u043e</span>
        <h3>\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0441\u0432\u0435\u0436\u0438\u0445 \u0432\u044b\u043b\u0430\u0437\u043e\u043a</h3>
        <p>\u041a\u0430\u043a \u0442\u043e\u043b\u044c\u043a\u043e \u0437\u0430\u043a\u043e\u043d\u0447\u0438\u0442\u0441\u044f \u043d\u043e\u0432\u044b\u0439 \u0437\u0430\u0431\u0435\u0433, \u043e\u043d \u0441\u0440\u0430\u0437\u0443 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c.</p>
      </article>
    `;
    renderLatestRunsPager();
    return;
  }

  latestRunsGrid.innerHTML = runs.map((run, index) => {
    const kills = Math.max(0, Number(run?.kills) || 0);
    const score = Math.max(0, Number(run?.score) || 0);
    const duration = escapeHtml(formatDurationSec(run?.durationSec));
    const playedAt = escapeHtml(formatShortDateTime(run?.at));
    const ago = escapeHtml(formatRunAgo(run?.at));
    const hero = escapeHtml(formatRunHeroLabel(run));
    const mode = escapeHtml(formatRunGameModeLabel(run));
    const xp = Math.max(0, Number(run?.runDetails?.xp) || 0);
    const bossKills = Math.max(0, Number(run?.runDetails?.bossKills) || 0);
    const name = escapeHtml(run?.name || '\u0411\u0435\u0437 \u0438\u043c\u0435\u043d\u0438');
    const room = escapeHtml(run?.roomCode || '-');
    const replayUrl = escapeHtml(buildReplayUrl(run));
    const badge = latestRunsPage === 1 && index === 0
      ? '\u0421\u0430\u043c\u0430\u044f \u0441\u0432\u0435\u0436\u0430\u044f'
      : '\u0412\u044b\u043b\u0430\u0437\u043a\u0430';
    const summary = latestRunsPage === 1 && index === 0
      ? `${name}: ${kills} \u0443\u0431\u0438\u0439\u0441\u0442\u0432, ${score} \u043e\u0447\u043a\u043e\u0432, ${duration} \u0447\u0438\u0441\u0442\u043e\u0433\u043e \u0434\u0430\u0432\u043b\u0435\u043d\u0438\u044f.`
      : `${name} \u0437\u0430\u043a\u043e\u043d\u0447\u0438\u043b \u0437\u0430\u0431\u0435\u0433 \u0441 ${kills} \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430\u043c\u0438 \u0438 ${score} \u043e\u0447\u043a\u0430\u043c\u0438 \u0437\u0430 ${duration}.`;

    return `
      <article class="raid-card${latestRunsPage === 1 && index === 0 ? ' raid-card-featured' : ''}">
        <div class="raid-card-head">
          <div class="raid-card-name">
            <span class="raid-card-topline">${escapeHtml(badge)}</span>
            <strong>${name}</strong>
            <span class="raid-card-subtitle">${hero} | \u041a\u043e\u043c\u043d\u0430\u0442\u0430 ${room} | ${playedAt}</span>
          </div>
          <span class="raid-card-badge">${ago}</span>
        </div>
        <h3>${summary}</h3>
        <div class="raid-card-stats">
          <div class="raid-stat">
            <span>\u0423\u0431\u0438\u0439\u0441\u0442\u0432\u0430</span>
            <strong>${kills}</strong>
          </div>
          <div class="raid-stat">
            <span>\u041e\u0447\u043a\u0438</span>
            <strong>${score}</strong>
          </div>
          <div class="raid-stat">
            <span>\u0412\u0440\u0435\u043c\u044f</span>
            <strong>${duration}</strong>
          </div>
          <div class="raid-stat">
            <span>XP \u0433\u0435\u0440\u043e\u044f</span>
            <strong>${xp}</strong>
          </div>
        </div>
        <div class="raid-card-footer">
          <div class="raid-card-meta">
            <span>\u0420\u0435\u0436\u0438\u043c: ${mode}</span>
            <span>\u0411\u043e\u0441\u0441\u043e\u0432: ${bossKills}</span>
            <span>\u041a\u043e\u043c\u043d\u0430\u0442\u0430: ${room}</span>
          </div>
          <div class="raid-card-actions">
            <a class="raid-replay-link" href="${replayUrl}" target="_blank" rel="noopener noreferrer">\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0437\u0430\u0431\u0435\u0433</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
  renderLatestRunsPager();
}

async function loadNews() {
  if (!newsGrid) return;
  try {
    const response = await fetch('/api/news', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    renderNews(Array.isArray(payload?.items) ? payload.items : []);
  } catch (_error) {
    newsGrid.innerHTML = `
      <article class="news-card">
        <span class="news-meta">Ошибка</span>
        <h3>Сводка не загрузилась</h3>
        <p>Игра на месте. Если нужно, можешь сразу открыть новостную вкладку внутри боевого меню и проверить все там.</p>
        <a href="#play" data-hub-tab="news">Открыть новости в игре</a>
      </article>
    `;
  }
}

async function loadRatings() {
  if (!ratingsGrid) return;
  try {
    const categoriesResponse = await fetch('/api/leaderboard?mode=all&page=1&page_size=3', { cache: 'no-store' });
    if (!categoriesResponse.ok) throw new Error(`HTTP ${categoriesResponse.status}`);
    const categoriesPayload = await categoriesResponse.json();
    const categories = Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : [];
    const selected = categories.slice(0, 6);
    const cards = await Promise.all(selected.map(async (category) => {
      const params = new URLSearchParams({
        category: String(category?.key || ''),
        mode: 'all',
        page: '1',
        page_size: '3',
      });
      const response = await fetch(`/api/leaderboard?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) return null;
      return {
        key: String(category?.key || ''),
        title: String(category?.title || category?.key || 'Rating'),
        source: String(category?.source || 'runs'),
        items: Array.isArray(payload?.items) ? payload.items : [],
      };
    }));
    renderRatings(cards.filter(Boolean));
  } catch (_error) {
    ratingsGrid.innerHTML = `
      <article class="rating-card">
        <span class="rating-card-meta">Ошибка</span>
        <h3>Не удалось загрузить рейтинги</h3>
        <p>Полная таблица все равно доступна в игровом меню, если нужно посмотреть топы без лендинга.</p>
        <a class="rating-card-link" href="#play" data-hub-tab="rating">Открыть рейтинг в игре</a>
      </article>
    `;
  }
}

async function loadLatestRuns() {
  if (!latestRunsGrid) return;
  try {
    const response = await fetch(`/api/landing/latest-runs?page=${latestRunsPage}&page_size=${LATEST_RUNS_PAGE_SIZE}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) throw new Error(`HTTP ${response.status}`);
    const runs = Array.isArray(payload?.runs) ? payload.runs : [];
    latestRunsPage = Math.max(1, Number(payload?.page) || latestRunsPage);
    latestRunsTotalPages = Math.max(1, Number(payload?.totalPages) || 1);
    const nextSignature = buildLatestRunsSignature(runs);
    if (nextSignature !== latestRunsSignature) {
      latestRunsSignature = nextSignature;
      renderLatestRuns(runs);
    } else {
      renderLatestRunsPager();
    }
  } catch (_error) {
    if (!latestRunsSignature) {
      latestRunsGrid.innerHTML = `
        <article class="raid-card raid-card-featured">
          <span class="raid-card-topline">\u041e\u0448\u0438\u0431\u043a\u0430</span>
          <h3>\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0432\u044b\u043b\u0430\u0437\u043a\u0438</h3>
          <p>\u041b\u0435\u043d\u0442\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430, \u043d\u043e \u043f\u043e\u043f\u044b\u0442\u043a\u0430 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.</p>
        </article>
      `;
    }
    renderLatestRunsPager();
  }
}

function goToLatestRunsPage(nextPage) {
  const page = Math.max(1, Number(nextPage) || 1);
  if (page === latestRunsPage) return;
  latestRunsPage = page;
  latestRunsSignature = '';
  latestRunsGrid?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  void loadLatestRuns();
}

latestRunsPager?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest('[data-runs-page-action]');
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  const action = String(button.getAttribute('data-runs-page-action') || '').trim().toLowerCase();
  if (action === 'prev' && latestRunsPage > 1) goToLatestRunsPage(latestRunsPage - 1);
  if (action === 'next' && latestRunsPage < latestRunsTotalPages) goToLatestRunsPage(latestRunsPage + 1);
});

function startLatestRunsPolling() {
  if (!latestRunsGrid || latestRunsPollTimer) return;
  latestRunsPollTimer = window.setInterval(() => {
    if (document.hidden) return;
    void loadLatestRuns();
  }, 15000);
}

void loadNews();
void loadRatings();
void loadLatestRuns();
startLatestRunsPolling();
