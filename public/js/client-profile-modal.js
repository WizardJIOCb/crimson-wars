'use strict';

(() => {
  let authorProfileModalEl = null;
  let authorProfileTitleEl = null;
  let authorProfileBodyEl = null;
  let authorProfileRuns = [];

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

  function ensureModal() {
    if (authorProfileModalEl) return;
    const modal = document.createElement('div');
    modal.id = 'author-profile-modal';
    modal.className = 'record-details-modal hidden';
    modal.setAttribute('aria-live', 'polite');

    const card = document.createElement('div');
    card.className = 'record-details-card';

    const head = document.createElement('div');
    head.className = 'record-details-head';

    const title = document.createElement('b');
    title.id = 'author-profile-title';
    title.textContent = trWithFallback('ui.profile.player', 'Профиль игрока');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mini';
    closeBtn.textContent = trWithFallback('ui.close', 'Закрыть');
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    head.appendChild(title);
    head.appendChild(closeBtn);

    const body = document.createElement('div');
    body.id = 'author-profile-body';
    body.className = 'record-details-body';
    body.textContent = trWithFallback('ui.loading', 'Загрузка...');

    card.appendChild(head);
    card.appendChild(body);
    modal.appendChild(card);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    const modalHost = document.getElementById('join-overlay') || document.body;
    modalHost.appendChild(modal);
    authorProfileModalEl = modal;
    authorProfileTitleEl = title;
    authorProfileBodyEl = body;
  }

  function formatPublicProfileDate(ts) {
    const ms = Math.max(0, Number(ts) || 0);
    if (!ms) return '--';
    try {
      return new Date(ms).toLocaleString(window.cwI18nGetLanguage?.() === 'ru' ? 'ru-RU' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return new Date(ms).toLocaleString();
    }
  }

  function formatModalRunDate(ts) {
    try {
      if (typeof formatRecordDateTime === 'function') return formatRecordDateTime(ts);
    } catch {}
    return formatPublicProfileDate(ts);
  }

  function formatModalGameMode(run) {
    try {
      if (typeof formatRunGameModeLabel === 'function') return formatRunGameModeLabel(run);
    } catch {}
    const raw = String(run?.runDetails?.gameMode || '').trim().toLowerCase();
    if (raw === 'hardcore') return trWithFallback('ui.play.mode.hardcore', 'Хардкор');
    if (raw === 'normal') return trWithFallback('ui.play.mode.normal', 'Обычный');
    return trWithFallback('ui.unknown', 'Неизвестно');
  }

  function localizeHeroName(heroId, fallback = '') {
    try {
      if (typeof trHeroName === 'function') return trHeroName(heroId, fallback);
    } catch {}
    return String(fallback || heroId || '');
  }

  function renderRunHistory(runPayload) {
    const runs = Array.isArray(runPayload?.runs) ? runPayload.runs : [];
    const total = Math.max(0, Number(runPayload?.total) || 0);
    if (!runs.length) {
      return '<div class="profile-card"><b>' + escapeHtml(trWithFallback('ui.profile.history', 'История забегов ({total})', { total: 0 })) + '</b><div class="record-details-empty">' + escapeHtml(trWithFallback('ui.profile.no_runs_found', 'Забеги не найдены.')) + '</div></div>';
    }

    const rows = runs.map((run, i) => {
      const kills = Math.max(0, Number(run?.kills) || 0);
      const score = Math.max(0, Number(run?.score) || 0);
      const durationSec = Math.max(1, Number(run?.durationSec) || 1);
      const heroXp = Math.max(0, Number(run?.runDetails?.xp) || 0);
      const roomCode = escapeHtml(String(run?.roomCode || '-'));
      const gameMode = escapeHtml(formatModalGameMode(run));
      return ''
        + '<button type="button" class="profile-run-row" data-author-run-idx="' + i + '">'
        + '<div class="profile-run-head"><span>' + escapeHtml(formatModalRunDate(run?.at)) + '</span><span>Room ' + roomCode + ' | ' + gameMode + '</span></div>'
        + '<div class="profile-run-main"><span>' + kills + ' kills</span><span>' + score + ' pts</span><span>' + durationSec + 's</span><span class="profile-run-meta">XP ' + heroXp + '</span></div>'
        + '</button>';
    }).join('');

    return '<div class="profile-card"><b>' + escapeHtml(trWithFallback('ui.profile.history', 'История забегов ({total})', { total })) + '</b><div class="profile-run-list author-run-list">' + rows + '</div></div>';
  }

  function bindRunHistoryRows() {
    if (!authorProfileBodyEl) return;
    const buttons = Array.from(authorProfileBodyEl.querySelectorAll('[data-author-run-idx]'));
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        const idx = Math.max(0, Number(btn.getAttribute('data-author-run-idx')) || 0);
        const run = authorProfileRuns[idx];
        if (!run) return;
        const label = 'Run #' + (idx + 1);
        try {
          if (typeof openRecordDetailsModal === 'function') openRecordDetailsModal(run, label);
        } catch {}
      });
    }
  }

  function renderProfileBody(profile, runPayload) {
    const heroRows = (Array.isArray(profile?.heroStats) ? profile.heroStats : []).map((hero) => {
      const heroName = escapeHtml(localizeHeroName(hero?.id, hero?.name || hero?.id || '-'));
      const heroLevel = Math.max(1, Number(hero?.level) || 1);
      const heroRuns = Math.max(0, Number(hero?.runs) || 0);
      const heroState = hero?.unlocked
        ? trWithFallback('ui.profile.hero_open', 'Открыт')
        : trWithFallback('ui.profile.hero_closed', 'Закрыт');
      return '<div class="profile-hero-row"><span>' + heroName + '</span><span>Lv' + heroLevel + ' | ' + escapeHtml(trWithFallback('ui.profile.runs', 'Runs')) + ': ' + heroRuns + '</span><span>' + escapeHtml(heroState) + '</span></div>';
    }).join('');

    return ''
      + '<div class="profile-card"><b>' + escapeHtml(trWithFallback('ui.profile.profile', 'Профиль')) + ' Lv' + Math.max(1, Number(profile?.accountLevel) || 1) + '</b><div>'
      + 'XP ' + Math.max(0, Number(profile?.accountXp) || 0) + '/' + Math.max(1, Number(profile?.accountXpToNext) || 1)
      + ' | ' + escapeHtml(trWithFallback('ui.profile.skill_points', 'Skill points')) + ': ' + Math.max(0, Number(profile?.accountSkillPoints) || 0)
      + ' | ' + escapeHtml(trWithFallback('ui.profile.shards', 'Shards')) + ': ' + Math.max(0, Number(profile?.shards) || 0)
      + ' | ' + escapeHtml(trWithFallback('ui.profile.heroes', 'Heroes')) + ': ' + Math.max(0, Number(profile?.heroesUnlocked) || 0) + '/' + Math.max(0, Number(profile?.heroesTotal) || 0)
      + ' | ' + escapeHtml(trWithFallback('ui.profile.runs', 'Runs')) + ': ' + Math.max(0, Number(profile?.totalRuns) || 0)
      + '</div></div>'
      + '<div class="profile-card"><b>' + escapeHtml(trWithFallback('ui.profile.account_info', 'Инфо аккаунта')) + '</b><div>' + escapeHtml(trWithFallback('ui.profile.created_at', 'Создан')) + ': ' + escapeHtml(formatPublicProfileDate(profile?.createdAt)) + ' | ' + escapeHtml(trWithFallback('ui.profile.last_login', 'Последний вход')) + ': ' + escapeHtml(formatPublicProfileDate(profile?.lastLoginAt)) + '</div></div>'
      + '<div class="profile-card"><b>' + escapeHtml(trWithFallback('ui.profile.heroes', 'Герои')) + '</b><div class="profile-hero-list">' + (heroRows || '<div class="record-details-empty">' + escapeHtml(trWithFallback('ui.profile.no_hero_data', 'Нет данных по героям.')) + '</div>') + '</div></div>'
      + renderRunHistory(runPayload);
  }

  async function openAuthorProfileModal(accountId, fallbackName = '') {
    const id = Math.max(0, Number(accountId) || 0);
    if (!id) return;
    ensureModal();
    if (!authorProfileModalEl || !authorProfileBodyEl || !authorProfileTitleEl) return;

    authorProfileTitleEl.textContent = trWithFallback('ui.profile.player', 'Профиль игрока');
    authorProfileBodyEl.innerHTML = '<div class="record-details-empty">' + escapeHtml(trWithFallback('ui.profile.loading_profile', 'Загрузка профиля...')) + '</div>';
    authorProfileModalEl.classList.remove('hidden');

    try {
      const [profileRes, runsRes] = await Promise.all([
        fetch('/api/player/public-profile/' + id, { cache: 'no-store' }),
        fetch('/api/player/public-profile/' + id + '/run-history?page=1&page_size=8', { cache: 'no-store' }),
      ]);

      const profilePayload = await profileRes.json().catch(() => ({}));
      if (!profileRes.ok || !profilePayload?.ok || !profilePayload?.profile) {
        throw new Error(profilePayload?.message || ('HTTP ' + profileRes.status));
      }

      const runsPayload = await runsRes.json().catch(() => ({}));
      const runData = runsRes.ok && runsPayload?.ok
        ? {
            runs: Array.isArray(runsPayload.runs) ? runsPayload.runs : [],
            total: Math.max(0, Number(runsPayload.total) || 0),
          }
        : { runs: [], total: 0 };

      authorProfileRuns = runData.runs;

      const profile = profilePayload.profile;
      authorProfileTitleEl.textContent = trWithFallback('ui.profile.profile', 'Профиль') + ': ' + String(profile?.nickname || fallbackName || ('ID ' + id));
      authorProfileBodyEl.innerHTML = renderProfileBody(profile, runData);
      bindRunHistoryRows();
    } catch (err) {
      authorProfileRuns = [];
      authorProfileBodyEl.innerHTML = '<div class="record-details-empty">' + escapeHtml(err?.message || trWithFallback('ui.profile.load_failed', 'Не удалось загрузить профиль.')) + '</div>';
    }
  }

  async function openAuthorProfileFromComment(authorAccountId, authorNameText) {
    const accountId = Math.max(0, Number(authorAccountId) || 0);
    const nickname = String(authorNameText || '').trim();
    if (accountId > 0) {
      await openAuthorProfileModal(accountId, nickname);
      return;
    }

    if (!nickname) return;

    ensureModal();
    if (authorProfileModalEl && authorProfileBodyEl && authorProfileTitleEl) {
      authorProfileTitleEl.textContent = trWithFallback('ui.profile.player', 'Профиль игрока');
      authorProfileBodyEl.innerHTML = '<div class="record-details-empty">' + escapeHtml(trWithFallback('ui.profile.searching_by_name', 'Поиск аккаунта по нику...')) + '</div>';
      authorProfileModalEl.classList.remove('hidden');
    }

    try {
      const res = await fetch('/api/player/nickname-status?nickname=' + encodeURIComponent(nickname), { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));
      const foundId = Math.max(0, Number(payload?.player?.id) || 0);
      if (!res.ok || !payload?.ok || !payload?.isRegistered || !foundId) {
        throw new Error(trWithFallback('ui.profile.nickname_profile_unavailable', 'Профиль для этого ника недоступен.'));
      }
      await openAuthorProfileModal(foundId, nickname);
    } catch (err) {
      if (authorProfileBodyEl) {
        authorProfileBodyEl.innerHTML = '<div class="record-details-empty">' + escapeHtml(err?.message || trWithFallback('ui.profile.open_failed', 'Не удалось открыть профиль.')) + '</div>';
      }
    }
  }

  globalThis.CWProfileModal = {
    open: openAuthorProfileModal,
    openFromComment: openAuthorProfileFromComment,
  };
  globalThis.openAuthorProfileModal = openAuthorProfileModal;
  globalThis.openAuthorProfileFromComment = openAuthorProfileFromComment;
})();
