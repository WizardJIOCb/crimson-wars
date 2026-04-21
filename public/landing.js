const nav = document.getElementById('site-nav');
const mobileToggle = document.querySelector('.mobile-menu-toggle');
const newsGrid = document.getElementById('landing-news-grid');
const ratingsGrid = document.getElementById('landing-ratings-grid');
const revealNodes = Array.from(document.querySelectorAll('.reveal'));
const profileModal = document.getElementById('landing-profile-modal');
const profileBody = document.getElementById('landing-profile-body');
const profileTitle = document.getElementById('landing-profile-title');
const profileCloseBtn = document.getElementById('landing-profile-close');

function toggleMenu(forceOpen) {
  if (!nav || !mobileToggle) return;
  const nextState = typeof forceOpen === 'boolean' ? forceOpen : !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', nextState);
  document.body.classList.toggle('menu-open', nextState);
  mobileToggle.setAttribute('aria-expanded', String(nextState));
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
  if (raw === 'hardcore') return 'Hardcore';
  if (raw === 'normal') return 'Normal';
  if (raw === 'pvp') return 'PvP';
  return 'Unknown';
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
        <a href="/play?tab=news">Открыть вкладку новостей</a>
      </article>
    `;
    return;
  }

  newsGrid.innerHTML = items.slice(0, 3).map((item) => {
    const title = escapeHtml(item?.title || 'Crimson Wars update');
    const summary = escapeHtml(item?.summary || 'Свежая запись в журнале обновлений.');
    const date = escapeHtml(formatNewsDate(item?.publishedAt));
    const link = `/play?tab=news&news=${encodeURIComponent(String(item?.id || ''))}`;
    return `
      <article class="news-card">
        <span class="news-meta">${date}</span>
        <h3>${title}</h3>
        <p>${summary}</p>
        <a href="${link}">Открыть новость</a>
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
        <a class="rating-card-link" href="/play?tab=rating">Открыть полный рейтинг</a>
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
        <a class="rating-card-link" href="/play?tab=rating">Открыть полный рейтинг</a>
      </article>
    `;
  }).join('');
  bindRatingProfileButtons();
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
        <a href="/play?tab=news">Открыть новости в игре</a>
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
        <a class="rating-card-link" href="/play?tab=rating">Открыть рейтинг в игре</a>
      </article>
    `;
  }
}

void loadNews();
void loadRatings();
