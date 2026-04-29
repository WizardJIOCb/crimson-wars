'use strict';

(() => {
  const ratingBoardEl = document.getElementById('rating-board');
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

  const ratingUi = {
    categories: [],
    currentCategory: 'best_kills_run',
    modes: [
      { key: 'all', titleKey: 'ui.rating.mode.all' },
      { key: 'normal', titleKey: 'ui.rating.mode.normal' },
      { key: 'hardcore', titleKey: 'ui.rating.mode.hardcore' },
    ],
    currentMode: 'all',
    items: [],
    page: 1,
    totalPages: 1,
    total: 0,
    pageSize: 10,
    loading: false,
    error: '',
    fetchToken: 0,
  };

  function formatRatingValue(item, categoryKey) {
    const value = Math.max(0, Number(item?.value) || 0);
    if (categoryKey === 'best_time_run') return value + 's';
    if (categoryKey === 'best_dps_run') return value.toFixed(2) + ' DPS';
    if (categoryKey === 'profile_level') return 'Lv' + value + ' (XP ' + Math.max(0, Number(item?.accountXp) || 0) + ')';
    if (categoryKey === 'heroes_unlocked') return value + ' ' + trWithFallback('ui.rating.unit.heroes_short', 'heroes');
    if (categoryKey === 'runs_count') return value + ' ' + trWithFallback('ui.rating.unit.runs_short', 'runs');
    return String(value);
  }

  function getRatingCategoryTitle(cat) {
    const key = String(cat?.key || '').trim();
    const map = {
      best_kills_run: 'ui.rating.category.best_kills_run',
      best_pvp_kills_run: 'ui.rating.category.best_pvp_kills_run',
      runs_count: 'ui.rating.category.runs_count',
      best_score_run: 'ui.rating.category.best_score_run',
      best_dps_run: 'ui.rating.category.best_dps_run',
      total_pts: 'ui.rating.category.total_pts',
      best_time_run: 'ui.rating.category.best_time_run',
      profile_level: 'ui.rating.category.profile_level',
      total_kills: 'ui.rating.category.total_kills',
      shards_balance: 'ui.rating.category.shards_balance',
      heroes_unlocked: 'ui.rating.category.heroes_unlocked',
    };
    const titleKey = map[key] || '';
    if (titleKey) return trWithFallback(titleKey, String(cat?.title || key || 'Category'));
    return String(cat?.title || key || 'Category');
  }

  function renderRatingBoard() {
    if (!ratingBoardEl) return;
    const titleText = escapeHtml(trWithFallback('ui.rating.title', 'Player Rating'));
    const modeOptions = (ratingUi.modes || []).map((mode) => {
      const key = String(mode?.key || 'all');
      const modeTitle = String(mode?.titleKey ? tr(mode.titleKey) : (mode?.title || key || 'Mode'));
      const selected = key === ratingUi.currentMode ? ' selected' : '';
      return '<option value="' + escapeHtml(key) + '"' + selected + '>' + escapeHtml(modeTitle) + '</option>';
    }).join('');
    const modeControl = '<div class="rating-mode-wrap"><select id="rating-mode-select" class="rating-mode-select">' + modeOptions + '</select></div>';
    const header = '<div class="rating-header-row"><b>' + titleText + '</b>' + modeControl + '</div>';
    if (ratingUi.loading && ratingUi.items.length === 0) {
      ratingBoardEl.innerHTML = header + '<div class="profile-run-empty">' + escapeHtml(trWithFallback('ui.rating.loading', 'Loading rating...')) + '</div>';
      return;
    }
    if (ratingUi.error && ratingUi.items.length === 0) {
      ratingBoardEl.innerHTML = header + '<div class="profile-run-empty">' + escapeHtml(ratingUi.error) + '</div>';
      return;
    }

    const categories = (ratingUi.categories || []).map((cat) => {
      const active = cat.key === ratingUi.currentCategory ? ' active' : '';
      return '<button type="button" class="mini rating-category-btn' + active + '" data-rating-cat="' + escapeHtml(String(cat.key || '')) + '">' + escapeHtml(getRatingCategoryTitle(cat)) + '</button>';
    }).join('');

    const rows = (ratingUi.items || []).map((item, i) => {
      const rank = ((ratingUi.page - 1) * ratingUi.pageSize) + i + 1;
      const pid = Math.max(0, Number(item?.playerId) || 0);
      const nick = escapeHtml(String(item?.nickname || 'Unknown'));
      const nickHtml = pid > 0
        ? ('<button type="button" class="news-comment-author news-comment-author-btn" data-rating-player="' + pid + '">' + nick + '</button>')
        : nick;
      const replayRunId = Math.max(0, Number(item?.replayRunId) || 0);
      const valueText = escapeHtml(formatRatingValue(item, ratingUi.currentCategory));
      const playBtn = replayRunId > 0 ? ('<button type="button" class="mini rating-play-btn" data-rating-replay="' + replayRunId + '" data-rating-rank="' + rank + '">' + escapeHtml(trWithFallback('ui.rating.play', 'Play')) + '</button>') : '';
      return '<div class="record-row rating-row"><div class="record-rank">#' + rank + '</div><div class="record-name">' + nickHtml + '</div><div class="record-meta"><span class="rating-value-text">' + valueText + '</span>' + playBtn + '</div></div>';
    }).join('');

    const prevDisabled = ratingUi.page <= 1 ? ' disabled' : '';
    const nextDisabled = ratingUi.page >= ratingUi.totalPages ? ' disabled' : '';
    const pager = '<div class="profile-run-history-pager">'
      + '<button type="button" class="mini" data-rating-nav="prev"' + prevDisabled + '>' + escapeHtml(trWithFallback('ui.prev', 'Prev')) + '</button>'
      + '<span class="profile-run-history-page">' + escapeHtml(trWithFallback('ui.page', 'Page')) + ' ' + ratingUi.page + '/' + ratingUi.totalPages + ' | ' + escapeHtml(trWithFallback('ui.total', 'Total')) + ': ' + ratingUi.total + '</span>'
      + '<button type="button" class="mini" data-rating-nav="next"' + nextDisabled + '>' + escapeHtml(trWithFallback('ui.next', 'Next')) + '</button>'
      + '</div>';
    ratingBoardEl.innerHTML = header
      + '<div class="rating-categories">' + categories + '</div>'
      + (rows || '<div class="profile-run-empty">' + escapeHtml(trWithFallback('ui.rating.empty', 'No data yet.')) + '</div>')
      + pager;

    for (const b of Array.from(ratingBoardEl.querySelectorAll('[data-rating-cat]'))) {
      b.addEventListener('click', () => {
        const cat = String(b.getAttribute('data-rating-cat') || '').trim();
        if (!cat) return;
        ratingUi.currentCategory = cat;
        ratingUi.page = 1;
        void requestLeaderboard({ force: true, page: 1, category: cat, mode: ratingUi.currentMode });
      });
    }

    for (const navBtn of Array.from(ratingBoardEl.querySelectorAll('[data-rating-nav]'))) {
      navBtn.addEventListener('click', () => {
        const dir = String(navBtn.getAttribute('data-rating-nav') || '').trim();
        if (dir === 'prev' && ratingUi.page > 1) {
          void requestLeaderboard({ force: true, page: ratingUi.page - 1, category: ratingUi.currentCategory, mode: ratingUi.currentMode });
        }
        if (dir === 'next' && ratingUi.page < ratingUi.totalPages) {
          void requestLeaderboard({ force: true, page: ratingUi.page + 1, category: ratingUi.currentCategory, mode: ratingUi.currentMode });
        }
      });
    }

    for (const b of Array.from(ratingBoardEl.querySelectorAll('[data-rating-player]'))) {
      b.addEventListener('click', () => {
        const pid = Math.max(0, Number(b.getAttribute('data-rating-player')) || 0);
        if (pid > 0) void globalThis.CWProfileModal?.open?.(pid, b.textContent || '');
      });
    }

    for (const b of Array.from(ratingBoardEl.querySelectorAll('[data-rating-replay]'))) {
      b.addEventListener('click', () => {
        const replayRunId = Math.max(0, Number(b.getAttribute('data-rating-replay')) || 0);
        if (!replayRunId) return;
        const rank = Math.max(1, Number(b.getAttribute('data-rating-rank')) || 1);
        const rowIndex = rank - 1 - ((ratingUi.page - 1) * ratingUi.pageSize);
        const item = ratingUi.items[rowIndex] || null;
        const replayRun = item?.replayRun || null;
        const row = b.closest('.rating-row');
        const nickname = String(row?.querySelector('.record-name')?.textContent || '').trim() || 'Unknown';
        openRecordDetailsModal({
          id: replayRunId,
          name: replayRun?.name || nickname,
          kills: Math.max(0, Number(replayRun?.kills) || 0),
          score: Math.max(0, Number(replayRun?.score) || 0),
          roomCode: String(replayRun?.roomCode || '-'),
          durationSec: Math.max(1, Number(replayRun?.durationSec) || 1),
          at: Math.max(0, Number(replayRun?.at) || 0),
          runDetails: replayRun?.runDetails || null,
          replayApiPath: '/api/leaderboard/runs/' + replayRunId + '/replay',
        }, '#' + rank);
      });
    }
    const modeSelect = ratingBoardEl.querySelector('#rating-mode-select');
    modeSelect?.addEventListener('change', () => {
      const nextMode = String(modeSelect.value || 'all').trim().toLowerCase();
      ratingUi.currentMode = (nextMode === 'normal' || nextMode === 'hardcore' || nextMode === 'pvp') ? nextMode : 'all';
      ratingUi.page = 1;
      void requestLeaderboard({ force: true, page: 1, category: ratingUi.currentCategory, mode: ratingUi.currentMode });
    });
  }

  async function requestLeaderboard({
    force = false,
    page = ratingUi.page,
    category = ratingUi.currentCategory,
    mode = ratingUi.currentMode,
  } = {}) {
    if (!ratingBoardEl) return;
    if (!force && ratingUi.loading) return;
    const token = ratingUi.fetchToken + 1;
    ratingUi.fetchToken = token;
    ratingUi.loading = true;
    ratingUi.error = '';
    ratingUi.page = Math.max(1, Number(page) || 1);
    ratingUi.currentCategory = String(category || ratingUi.currentCategory || 'best_kills_run');
    ratingUi.currentMode = String(mode || ratingUi.currentMode || 'all').trim().toLowerCase();
    if (ratingUi.currentMode !== 'normal' && ratingUi.currentMode !== 'hardcore' && ratingUi.currentMode !== 'pvp') ratingUi.currentMode = 'all';
    renderRatingBoard();
    try {
      const params = new URLSearchParams({
        category: ratingUi.currentCategory,
        mode: ratingUi.currentMode,
        page: String(ratingUi.page),
        page_size: String(ratingUi.pageSize),
      });
      const res = await fetch('/api/leaderboard?' + params.toString(), { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      if (ratingUi.fetchToken !== token) return;
      if (!res.ok || !payload?.ok) throw new Error(payload?.message || ('HTTP ' + res.status));
      ratingUi.categories = Array.isArray(payload.categories) ? payload.categories : [];
      ratingUi.modes = Array.isArray(payload.modes) ? payload.modes : ratingUi.modes;
      ratingUi.items = Array.isArray(payload.items) ? payload.items : [];
      ratingUi.page = Math.max(1, Number(payload.page) || ratingUi.page);
      ratingUi.totalPages = Math.max(1, Number(payload.totalPages) || 1);
      ratingUi.total = Math.max(0, Number(payload.total) || 0);
      ratingUi.currentCategory = String(payload?.category?.key || ratingUi.currentCategory || 'best_kills_run');
      ratingUi.currentMode = String(payload?.mode?.key || ratingUi.currentMode || 'all').trim().toLowerCase();
      if (ratingUi.currentMode !== 'normal' && ratingUi.currentMode !== 'hardcore' && ratingUi.currentMode !== 'pvp') ratingUi.currentMode = 'all';
      ratingUi.error = '';
    } catch (err) {
      if (ratingUi.fetchToken !== token) return;
      ratingUi.error = err?.message || 'Failed to load leaderboard.';
    } finally {
      if (ratingUi.fetchToken === token) {
        ratingUi.loading = false;
        renderRatingBoard();
      }
    }
  }

  globalThis.CWRating = {
    render: renderRatingBoard,
    request: requestLeaderboard,
    getState: () => ({ ...ratingUi }),
  };
  globalThis.renderRatingBoard = renderRatingBoard;

  try {
    if (typeof currentMainMenuTab === 'string' && currentMainMenuTab === 'rating') {
      void requestLeaderboard({ force: false });
    }
  } catch {}
})();
