'use strict';

(() => {
  const profileSummaryEl = document.getElementById('profile-summary');
  const profileAchievementsEl = document.getElementById('profile-achievements');
  const profileCharacterStatsEl = document.getElementById('profile-character-stats');
  const profileRunHistoryEl = document.getElementById('profile-run-history');

  const PROFILE_RUN_HISTORY_CACHE_MS = 12000;
  const profileRunHistoryUi = {
    items: [],
    page: 1,
    totalPages: 1,
    pageSize: 8,
    total: 0,
    loading: false,
    error: '',
    loadedNickname: '',
    lastLoadedAt: 0,
    fetchToken: 0,
  };

  const tr = (key, params = null) => {
    if (typeof window.cwI18nT === 'function') return window.cwI18nT(key, params);
    return String(key || '');
  };

  const trWithFallback = (key, fallback, params = null) => {
    const out = tr(key, params);
    return out === key ? String(fallback ?? key) : out;
  };

  function escapeHtml(raw) {
    return String(raw ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function getGameState() {
    try {
      return game || {};
    } catch {
      return {};
    }
  }

  function isProfileTabActive() {
    try {
      if (typeof currentMainMenuTab === 'string') return currentMainMenuTab === 'profile';
    } catch {}
    return Boolean(document.querySelector('#main-menu-tabs [data-menu-tab="profile"].active'));
  }

  function formatProfileRecordDate(ts) {
    try {
      if (typeof formatRecordDateTime === 'function') return formatRecordDateTime(ts);
    } catch {}
    const ms = Math.max(0, Number(ts) || 0);
    return ms ? new Date(ms).toLocaleString() : '--';
  }

  function formatProfileGameMode(run) {
    try {
      if (typeof formatRunGameModeLabel === 'function') return formatRunGameModeLabel(run);
    } catch {}
    return String(run?.gameMode || run?.mode || 'normal');
  }

  function localizeHeroName(heroId, fallback = '') {
    try {
      if (typeof trHeroName === 'function') return trHeroName(heroId, fallback);
    } catch {}
    return String(fallback || heroId || '');
  }

  function resetRunHistoryUi() {
    profileRunHistoryUi.items = [];
    profileRunHistoryUi.page = 1;
    profileRunHistoryUi.totalPages = 1;
    profileRunHistoryUi.total = 0;
    profileRunHistoryUi.loading = false;
    profileRunHistoryUi.error = '';
    profileRunHistoryUi.loadedNickname = '';
    profileRunHistoryUi.lastLoadedAt = 0;
  }

  function renderRunHistory() {
    if (!profileRunHistoryEl) return;
    const state = getGameState();
    if (!state.playerAuth?.player) {
      profileRunHistoryEl.innerHTML = '<b>' + escapeHtml(trWithFallback('ui.profile.history', 'Run history ({total})', { total: profileRunHistoryUi.total || 0 })) + '</b><div class="profile-run-empty">' + escapeHtml(trWithFallback('ui.profile.login_required', 'Login required.')) + '</div>';
      return;
    }

    const canPrev = profileRunHistoryUi.page > 1;
    const canNext = profileRunHistoryUi.page < profileRunHistoryUi.totalPages;

    profileRunHistoryEl.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'profile-run-history-head';

    const title = document.createElement('div');
    title.className = 'profile-run-history-title';
    title.textContent = trWithFallback('ui.profile.history', 'Run history ({total})', { total: profileRunHistoryUi.total });

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'mini';
    refreshBtn.textContent = trWithFallback('ui.refresh', 'Refresh');
    refreshBtn.disabled = profileRunHistoryUi.loading;
    refreshBtn.addEventListener('click', () => {
      void requestRunHistory({ force: true, page: profileRunHistoryUi.page });
    });

    head.appendChild(title);
    head.appendChild(refreshBtn);
    profileRunHistoryEl.appendChild(head);

    if (profileRunHistoryUi.loading && profileRunHistoryUi.items.length === 0) {
      const loading = document.createElement('div');
      loading.className = 'profile-run-empty';
      loading.textContent = trWithFallback('ui.profile.loading_history', 'Loading run history...');
      profileRunHistoryEl.appendChild(loading);
      return;
    }

    if (profileRunHistoryUi.error && profileRunHistoryUi.items.length === 0) {
      const error = document.createElement('div');
      error.className = 'profile-run-empty';
      error.textContent = profileRunHistoryUi.error;
      profileRunHistoryEl.appendChild(error);
      return;
    }

    if (!profileRunHistoryUi.items.length) {
      const empty = document.createElement('div');
      empty.className = 'profile-run-empty';
      empty.textContent = trWithFallback('ui.profile.no_runs', 'No runs yet. Finish a run to see history here.');
      profileRunHistoryEl.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'profile-run-list';
    const rankOffset = (profileRunHistoryUi.page - 1) * profileRunHistoryUi.pageSize;

    for (let i = 0; i < profileRunHistoryUi.items.length; i += 1) {
      const run = profileRunHistoryUi.items[i];
      const heroXp = Math.max(0, Number(run?.runDetails?.xp) || 0);
      const gameModeLabel = formatProfileGameMode(run);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'profile-run-row';

      const headRow = document.createElement('div');
      headRow.className = 'profile-run-head';

      const when = document.createElement('span');
      when.textContent = formatProfileRecordDate(run?.at);

      const room = document.createElement('span');
      room.textContent = 'Room ' + String(run?.roomCode || '-') + ' | ' + gameModeLabel;

      headRow.appendChild(when);
      headRow.appendChild(room);

      const main = document.createElement('div');
      main.className = 'profile-run-main';
      main.innerHTML = '<span>' + Math.max(0, Number(run?.kills) || 0) + ' kills</span>'
        + '<span>' + Math.max(0, Number(run?.score) || 0) + ' pts</span>'
        + '<span>' + Math.max(1, Number(run?.durationSec) || 1) + 's</span>'
        + '<span class="profile-run-meta">XP ' + heroXp + '</span>';

      row.appendChild(headRow);
      row.appendChild(main);

      const runRank = 'Run #' + (rankOffset + i + 1);
      row.addEventListener('click', () => {
        try {
          if (typeof openRecordDetailsModal === 'function') openRecordDetailsModal(run, runRank);
        } catch {}
      });

      list.appendChild(row);
    }

    profileRunHistoryEl.appendChild(list);

    const pager = document.createElement('div');
    pager.className = 'profile-run-history-pager';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'mini';
    prevBtn.textContent = trWithFallback('ui.prev', 'Prev');
    prevBtn.disabled = profileRunHistoryUi.loading || !canPrev;
    prevBtn.addEventListener('click', () => {
      if (profileRunHistoryUi.page > 1) {
        void requestRunHistory({ force: true, page: profileRunHistoryUi.page - 1 });
      }
    });

    const pageText = document.createElement('div');
    pageText.className = 'profile-run-history-page';
    pageText.textContent = trWithFallback('ui.page', 'Page') + ' ' + profileRunHistoryUi.page + '/' + profileRunHistoryUi.totalPages;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'mini';
    nextBtn.textContent = trWithFallback('ui.next', 'Next');
    nextBtn.disabled = profileRunHistoryUi.loading || !canNext;
    nextBtn.addEventListener('click', () => {
      if (profileRunHistoryUi.page < profileRunHistoryUi.totalPages) {
        void requestRunHistory({ force: true, page: profileRunHistoryUi.page + 1 });
      }
    });

    pager.appendChild(prevBtn);
    pager.appendChild(pageText);
    pager.appendChild(nextBtn);

    profileRunHistoryEl.appendChild(pager);
  }

  async function requestRunHistory({ force = false, page = profileRunHistoryUi.page } = {}) {
    if (!profileRunHistoryEl) return;
    const state = getGameState();
    if (!state.playerAuth?.player) {
      resetRunHistoryUi();
      renderRunHistory();
      return;
    }

    const nicknameKey = String(state.playerAuth.player.nickname || '').trim().toLowerCase();
    if (!nicknameKey) {
      resetRunHistoryUi();
      renderRunHistory();
      return;
    }

    if (profileRunHistoryUi.loadedNickname && profileRunHistoryUi.loadedNickname !== nicknameKey) {
      resetRunHistoryUi();
    }

    const nextPage = Math.max(1, Math.floor(page) || 1);
    const now = Date.now();
    if (!force
      && !profileRunHistoryUi.loading
      && profileRunHistoryUi.loadedNickname === nicknameKey
      && profileRunHistoryUi.page === nextPage
      && profileRunHistoryUi.items.length > 0
      && (now - profileRunHistoryUi.lastLoadedAt) < PROFILE_RUN_HISTORY_CACHE_MS) {
      renderRunHistory();
      return;
    }

    const token = profileRunHistoryUi.fetchToken + 1;
    profileRunHistoryUi.fetchToken = token;
    profileRunHistoryUi.loading = true;
    profileRunHistoryUi.error = '';
    profileRunHistoryUi.page = nextPage;
    renderRunHistory();

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        page_size: String(profileRunHistoryUi.pageSize),
      });
      const res = await fetch('/api/player/run-history?' + params.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const payload = await res.json();

      if (profileRunHistoryUi.fetchToken !== token) return;

      profileRunHistoryUi.items = Array.isArray(payload.runs) ? payload.runs : [];
      profileRunHistoryUi.page = Math.max(1, Number(payload.page) || nextPage);
      profileRunHistoryUi.totalPages = Math.max(1, Number(payload.totalPages) || 1);
      profileRunHistoryUi.total = Math.max(0, Number(payload.total) || 0);
      profileRunHistoryUi.loadedNickname = nicknameKey;
      profileRunHistoryUi.lastLoadedAt = Date.now();
      profileRunHistoryUi.error = '';
    } catch {
      if (profileRunHistoryUi.fetchToken !== token) return;
      profileRunHistoryUi.error = trWithFallback('ui.profile.run_history_failed', 'Failed to load run history.');
    } finally {
      if (profileRunHistoryUi.fetchToken === token) {
        profileRunHistoryUi.loading = false;
        renderRunHistory();
      }
    }
  }

  function renderProfilePanel(heroes, progression, unlockedHeroes) {
    if (!profileSummaryEl || !profileAchievementsEl || !profileCharacterStatsEl || !profileRunHistoryEl) return;
    const state = getGameState();
    if (!state.playerAuth?.player || !progression) {
      profileSummaryEl.innerHTML = '<b>' + escapeHtml(trWithFallback('ui.profile.guest_profile', 'Guest profile')) + '</b><div>' + escapeHtml(trWithFallback('ui.profile.login_to_save', 'Login to save profile progression, achievements and hero stats.')) + '</div>';
      profileAchievementsEl.innerHTML = '<b>' + escapeHtml(trWithFallback('ui.profile.achievements', 'Achievements')) + '</b><div>' + escapeHtml(trWithFallback('ui.profile.login_required', 'Login required.')) + '</div>';
      profileCharacterStatsEl.innerHTML = '<b>' + escapeHtml(trWithFallback('ui.profile.hero_stats', 'Hero stats')) + '</b><div>' + escapeHtml(trWithFallback('ui.profile.login_required', 'Login required.')) + '</div>';
      resetRunHistoryUi();
      renderRunHistory();
      return;
    }

    const safeHeroes = Array.isArray(heroes) ? heroes : [];
    const safeUnlocked = unlockedHeroes instanceof Set ? unlockedHeroes : new Set();
    const level = Math.max(1, Number(progression.accountLevel) || 1);
    const xp = Math.max(0, Number(progression.accountXp) || 0);
    const xpToNext = Math.max(1, Number(progression.accountXpToNext) || 1);
    const shards = Math.max(0, Number(progression.shards) || 0);
    const points = Math.max(0, Number(progression.accountSkillPoints) || 0);
    const unlockedCount = safeUnlocked.size;
    const heroLevels = progression.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
    const totalRuns = Math.max(0, Number(progression.totalRuns) || 0);
    const heroRuns = progression.heroRuns && typeof progression.heroRuns === 'object' ? progression.heroRuns : {};

    profileSummaryEl.innerHTML = `<b>${escapeHtml(trWithFallback('ui.profile.profile', 'Profile'))} Lv${level}</b><div>XP ${xp}/${xpToNext} | ${escapeHtml(trWithFallback('ui.profile.skill_points', 'Skill points'))}: ${points} | ${escapeHtml(trWithFallback('ui.profile.shards', 'Shards'))}: ${shards} | ${escapeHtml(trWithFallback('ui.profile.heroes', 'Heroes'))}: ${unlockedCount}/${safeHeroes.length} | ${escapeHtml(trWithFallback('ui.profile.runs', 'Runs'))}: ${totalRuns}</div>`;
    profileAchievementsEl.innerHTML = '<b>' + escapeHtml(trWithFallback('ui.profile.achievements', 'Achievements')) + '</b><div>' + escapeHtml(trWithFallback('ui.profile.achievements_hint', 'First Blood, Survivor, Boss Hunter and account milestones can be shown here.')) + '</div>';

    const rows = safeHeroes.map((hero) => {
      const heroLvl = Math.max(1, Number(heroLevels[hero.id]) || 1);
      const runs = Math.max(0, Number(heroRuns[hero.id]) || 0);
      const unlocked = safeUnlocked.has(hero.id) ? trWithFallback('ui.hero.unlocked', 'Unlocked') : trWithFallback('ui.hero.locked', 'Locked');
      return `<div class="profile-hero-row"><span>${escapeHtml(localizeHeroName(hero.id, hero.name))}</span><span>Lv${heroLvl} | ${escapeHtml(trWithFallback('ui.profile.runs', 'Runs'))}: ${runs}</span><span>${escapeHtml(unlocked)}</span></div>`;
    }).join('');
    profileCharacterStatsEl.innerHTML = `<b>${escapeHtml(trWithFallback('ui.profile.hero_stats', 'Hero stats'))}</b><div class="profile-hero-list">${rows}</div>`;
    renderRunHistory();
    if (isProfileTabActive()) {
      void requestRunHistory({ force: false, page: profileRunHistoryUi.page });
    }
  }

  function renderFromCurrentState() {
    try {
      if (typeof getProgressionCatalog !== 'function'
        || typeof getProgressionState !== 'function'
        || typeof getUnlockedHeroSet !== 'function'
        || typeof getPlayerVariant !== 'function') {
        return;
      }
      const catalog = getProgressionCatalog();
      const progression = getProgressionState();
      const unlockedHeroes = getUnlockedHeroSet(catalog, progression);
      const heroes = catalog.heroes.map((hero) => ({ ...getPlayerVariant(hero.id), ...hero }));
      renderProfilePanel(heroes, progression, unlockedHeroes);
    } catch {}
  }

  globalThis.CWProfile = {
    render: renderProfilePanel,
    renderFromCurrentState,
    renderRunHistory,
    requestRunHistory,
    resetRunHistoryUi,
    getState: () => ({ ...profileRunHistoryUi }),
  };

  renderFromCurrentState();
  if (isProfileTabActive()) {
    void requestRunHistory({ force: false });
  }
})();
