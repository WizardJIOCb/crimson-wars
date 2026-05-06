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

  function formatRunDuration(value) {
    if (typeof globalThis.cwFormatDurationSec === 'function') return globalThis.cwFormatDurationSec(value);
    const totalSec = Math.max(0, Math.floor(Number(value) || 0));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours}ч ${String(minutes).padStart(2, '0')}м ${String(seconds).padStart(2, '0')}с`;
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
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) modal.classList.add('hidden');
    });

    document.body.appendChild(modal);
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

  function sanitizeProfileColor(raw) {
    const value = String(raw || '').trim();
    if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
    return '#fb923c';
  }

  function getProfileHeroAvatarPath(heroId) {
    const id = String(heroId || '').trim().toLowerCase();
    if (id === 'medic') return '/assets/characters/medis.png';
    if (['cyber', 'scout', 'shadow', 'raider', 'medis'].includes(id)) return '/assets/characters/' + id + '.png';
    return '/assets/characters/cyber.png';
  }

  function getProfileHeroAccent(heroId) {
    const id = String(heroId || '').trim().toLowerCase();
    if (id === 'scout') return '#a7e7c5';
    if (id === 'shadow') return '#d4c1ff';
    if (id === 'medic') return '#ffd1dc';
    if (id === 'raider') return '#ffe4b5';
    return '#8ec5ff';
  }

  function getProfileRarityColor(rarity) {
    const key = String(rarity || '').trim().toLowerCase();
    if (key === 'legendary') return '#fbbf24';
    if (key === 'epic') return '#f0abfc';
    if (key === 'rare') return '#93c5fd';
    if (key === 'uncommon') return '#86efac';
    return '#d1d5db';
  }

  function getProfileRarityLabel(rarity) {
    const key = String(rarity || 'common').trim().toLowerCase();
    return trWithFallback('ui.inventory.rarity.' + key, key);
  }

  function getProfileSkillTypeLabel(skill) {
    if (skill?.kind === 'active') return trWithFallback('ui.hero.skill_type_active', 'Активное');
    if (skill?.globalAura) return trWithFallback('ui.hero.skill_type_aura', 'Аура');
    return trWithFallback('ui.hero.skill_type_passive', 'Пассивное');
  }

  function normalizeProfileAssetPath(raw, fallbackBase, fallbackId) {
    const explicit = String(raw || '').trim();
    if (explicit) {
      if (/^(?:https?:)?\/\//i.test(explicit) || explicit.startsWith('/') || explicit.startsWith('data:')) return explicit;
      return fallbackBase.replace(/\/+$/, '') + '/' + explicit.replace(/^\/+/, '');
    }
    const id = String(fallbackId || '').trim();
    return id ? fallbackBase.replace(/\/+$/, '') + '/' + id + '.webp' : '';
  }

  function makeProfileBadge(source, fallback = '?') {
    const raw = String(source?.badge || source?.name || source?.id || fallback || '?').trim();
    if (source?.badge) return raw.slice(0, 4).toUpperCase();
    const parts = raw.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return raw.slice(0, 2).toUpperCase() || '?';
  }

  function renderAuthorProfileSlotIcon(imagePath, badge) {
    const safePath = String(imagePath || '').trim();
    const safeBadge = escapeHtml(String(badge || '?').slice(0, 4));
    if (safePath) {
      return '<span class="author-profile-slot-icon has-image"><img src="' + escapeHtml(safePath) + '" alt="" loading="lazy" decoding="async"><span>' + safeBadge + '</span></span>';
    }
    return '<span class="author-profile-slot-icon"><span>' + safeBadge + '</span></span>';
  }

  function renderAuthorProfileSkillSlot(skill, index) {
    const skillId = String(skill?.id || '').trim();
    const level = Math.max(0, Number(skill?.level) || 0);
    const maxLevel = Math.max(1, Number(skill?.maxLevel) || 1);
    const unlocked = level > 0 || skill?.unlocked === true;
    const rarity = String(skill?.rarity || 'common').trim().toLowerCase();
    const color = sanitizeProfileColor(getProfileRarityColor(rarity));
    const icon = normalizeProfileAssetPath(skill?.icon || skill?.iconPath, '/assets/hero-skills', skill?.heroId ? String(skill.heroId) + '_' + skillId : skillId);
    const style = '--slot-color:' + color + ';--slot-delay:' + Math.min(520, index * 48) + 'ms;';
    const skillName = escapeHtml(trWithFallback('skill.' + skillId.toLowerCase() + '.name', skill?.name || skillId || 'Умение'));
    const skillDesc = escapeHtml(trWithFallback('skill.' + skillId.toLowerCase() + '.desc', skill?.desc || (unlocked ? 'Готово к бою.' : 'Пока закрыто.')));
    return ''
      + '<article class="author-profile-slot author-profile-skill-slot ' + (unlocked ? 'is-unlocked' : 'is-locked') + '" style="' + escapeHtml(style) + '">'
      + '<span class="author-profile-slot-ring" aria-hidden="true"></span>'
      + renderAuthorProfileSlotIcon(icon, makeProfileBadge(skill))
      + '<div><b>' + skillName + '</b><span>' + escapeHtml(getProfileSkillTypeLabel(skill)) + ' | ' + escapeHtml(getProfileRarityLabel(rarity)) + '</span><small>' + skillDesc + '</small></div>'
      + '<em>' + (unlocked ? 'Lv' + level + '/' + maxLevel : '0/' + maxLevel) + '</em>'
      + '</article>';
  }

  function renderAuthorProfileEquipmentSlot(slot, index) {
    const item = slot?.item && typeof slot.item === 'object' ? slot.item : null;
    const rarity = String(item?.rarity || 'common').trim().toLowerCase();
    const color = sanitizeProfileColor(item ? getProfileRarityColor(rarity) : '#64748b');
    const slotName = String(slot?.slotName || slot?.slotKey || 'Слот').trim();
    const itemId = String(item?.itemId || '').trim();
    const itemName = String(item?.name || 'Пустой слот').trim();
    const icon = item ? normalizeProfileAssetPath(item?.icon || item?.iconPath, '/assets/items', itemId) : '';
    const qty = Math.max(0, Number(item?.quantity) || 0);
    const level = Math.max(1, Number(item?.level) || 1);
    const meta = item
      ? (item?.stackable ? 'x' + qty : 'Lv' + level) + ' | ' + getProfileRarityLabel(rarity)
      : trWithFallback('ui.inventory.empty_slot', 'Пустой слот');
    const style = '--slot-color:' + color + ';--slot-delay:' + Math.min(520, index * 42) + 'ms;';
    return ''
      + '<article class="author-profile-slot author-profile-equipment-slot ' + (item ? '' : 'is-empty') + '" style="' + escapeHtml(style) + '">'
      + '<span class="author-profile-slot-ring" aria-hidden="true"></span>'
      + renderAuthorProfileSlotIcon(icon, makeProfileBadge({ name: itemName }, slotName))
      + '<div><b>' + escapeHtml(slotName) + '</b><span>' + escapeHtml(itemName) + '</span><small>' + escapeHtml(meta) + '</small></div>'
      + '</article>';
  }

  function buildAuthorProfileReplayUrl(run, profileId = 0) {
    const id = Math.max(0, Number(run?.id) || 0);
    if (!id) return '/play';
    const url = new URL('/play', window.location.origin);
    url.searchParams.set('replay', String(id));
    const apiPath = String(run?.replayApiPath || '').trim()
      || (profileId > 0 ? '/api/player/public-profile/' + profileId + '/run-history/' + id + '/replay' : '/api/leaderboard/runs/' + id + '/replay');
    url.searchParams.set('replayPath', apiPath);
    return url.toString();
  }

  function buildAuthorProfileLiveUrl(activeRun) {
    const explicit = String(activeRun?.spectateUrl || '').trim();
    if (explicit) {
      try {
        return new URL(explicit, window.location.origin).toString();
      } catch {
        return explicit;
      }
    }
    const roomCode = String(activeRun?.roomCode || '').trim().toUpperCase();
    if (!roomCode) return '/play';
    const url = new URL('/play', window.location.origin);
    url.searchParams.set('room', roomCode);
    url.searchParams.set('mode', 'spectate');
    return url.toString();
  }

  function renderAuthorProfileActiveRunRow(activeRun) {
    if (!activeRun?.live) return '';
    const roomCode = escapeHtml(String(activeRun.roomCode || '').trim().toUpperCase() || '-');
    const player = activeRun?.player && typeof activeRun.player === 'object' ? activeRun.player : {};
    const kills = Math.max(0, Number(player.kills ?? activeRun.totalEnemyKills) || 0);
    const score = Math.max(0, Number(player.score) || 0);
    const duration = escapeHtml(formatRunDuration(Math.max(1, Number(activeRun.liveForSec) || 1)));
    const gameMode = escapeHtml(formatModalGameMode({ runDetails: { gameMode: activeRun.gameMode } }));
    const url = escapeHtml(buildAuthorProfileLiveUrl(activeRun));
    return ''
      + '<div class="profile-run-row author-profile-live-run">'
      + '<div class="profile-run-copy"><div class="profile-run-head"><span>' + escapeHtml(trWithFallback('ui.profile.active_run', 'Сейчас в забеге')) + '</span><span>Room ' + roomCode + ' | ' + gameMode + '</span></div>'
      + '<div class="profile-run-main"><span>' + kills + ' kills</span><span>' + score + ' pts</span><span>' + duration + '</span><span class="profile-run-meta">LIVE</span></div></div>'
      + '<a class="profile-run-launch" data-profile-run-launch="1" href="' + url + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(trWithFallback('ui.profile.launch_run', 'Запустить')) + '</a>'
      + '</div>';
  }

  function renderAuthorProfileLiveTitle(profile, fallbackName, fallbackId) {
    const activeRun = profile?.activeRun && typeof profile.activeRun === 'object' ? profile.activeRun : null;
    const title = escapeHtml(trWithFallback('ui.profile.profile', 'Профиль') + ': ' + String(profile?.nickname || fallbackName || ('ID ' + fallbackId)));
    const live = activeRun?.live
      ? '<span class="author-profile-title-live">LIVE | ' + escapeHtml(String(activeRun.roomCode || '').trim().toUpperCase() || 'run') + '</span>'
      : '';
    return title + live;
  }

  function renderRunHistory(runPayload, profile = null) {
    const runs = Array.isArray(runPayload?.runs) ? runPayload.runs : [];
    const total = Math.max(0, Number(runPayload?.total) || 0);
    const activeRunHtml = renderAuthorProfileActiveRunRow(profile?.activeRun);
    const profileId = Math.max(0, Number(profile?.id) || 0);

    const rows = runs.map((run, i) => {
      const kills = Math.max(0, Number(run?.kills) || 0);
      const score = Math.max(0, Number(run?.score) || 0);
      const duration = escapeHtml(formatRunDuration(Math.max(1, Number(run?.durationSec) || 1)));
      const heroXp = Math.max(0, Number(run?.runDetails?.xp) || 0);
      const roomCode = escapeHtml(String(run?.roomCode || '-'));
      const gameMode = escapeHtml(formatModalGameMode(run));
      const replayUrl = escapeHtml(buildAuthorProfileReplayUrl(run, profileId));
      return ''
        + '<div role="button" tabindex="0" class="profile-run-row" data-author-run-idx="' + i + '">'
        + '<div class="profile-run-copy"><div class="profile-run-head"><span>' + escapeHtml(formatModalRunDate(run?.at)) + '</span><span>Room ' + roomCode + ' | ' + gameMode + '</span></div>'
        + '<div class="profile-run-main"><span>' + kills + ' kills</span><span>' + score + ' pts</span><span>' + duration + '</span><span class="profile-run-meta">XP ' + heroXp + '</span></div></div>'
        + '<a class="profile-run-launch" data-profile-run-launch="1" href="' + replayUrl + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(trWithFallback('ui.profile.launch_run', 'Запустить')) + '</a>'
        + '</div>';
    }).join('');
    const emptyHtml = !runs.length
      ? '<div class="record-details-empty">' + escapeHtml(trWithFallback('ui.profile.no_runs_found', 'Забеги не найдены.')) + '</div>'
      : '';

    return '<div class="profile-card"><b>' + escapeHtml(trWithFallback('ui.profile.history', 'История забегов ({total})', { total })) + '</b><div class="profile-run-list author-run-list">' + activeRunHtml + rows + emptyHtml + '</div></div>';
  }

  function bindRunHistoryRows() {
    if (!authorProfileBodyEl) return;
    const buttons = Array.from(authorProfileBodyEl.querySelectorAll('[data-author-run-idx]'));
    for (const btn of buttons) {
      btn.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('[data-profile-run-launch]')) return;
        const idx = Math.max(0, Number(btn.getAttribute('data-author-run-idx')) || 0);
        const run = authorProfileRuns[idx];
        if (!run) return;
        const label = 'Run #' + (idx + 1);
        try {
          if (typeof openRecordDetailsModal === 'function') openRecordDetailsModal(run, label);
        } catch {}
      });
      btn.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.target instanceof Element && event.target.closest('[data-profile-run-launch]')) return;
        event.preventDefault();
        btn.click();
      });
    }
  }

  function renderProfileBody(profile, runPayload) {
    const activeHero = profile?.activeHero && typeof profile.activeHero === 'object' ? profile.activeHero : {};
    const activeSkills = Array.isArray(profile?.activeSkills) ? profile.activeSkills : [];
    const equippedItems = Array.isArray(profile?.equippedItems) ? profile.equippedItems : [];
    const activeHeroId = String(activeHero?.id || 'cyber').trim().toLowerCase();
    const heroName = localizeHeroName(activeHeroId, activeHero?.name || activeHeroId || 'Hero');
    const heroAccent = sanitizeProfileColor(activeHero?.accent || getProfileHeroAccent(activeHeroId));
    const heroAvatar = String(activeHero?.avatar || getProfileHeroAvatarPath(activeHeroId)).trim();
    const heroLevel = Math.max(1, Number(activeHero?.level) || 1);
    const heroXp = Math.max(0, Number(activeHero?.xp) || 0);
    const heroXpNeed = Math.max(0, Number(activeHero?.xpToNext) || 0);
    const heroXpPct = heroXpNeed > 0 ? Math.max(0, Math.min(100, (heroXp / heroXpNeed) * 100)) : 100;
    const heroStats = activeHero?.baseStats && typeof activeHero.baseStats === 'object' ? activeHero.baseStats : {};
    const heroStatsHtml = [
      [trWithFallback('ui.profile.power', 'Сила'), heroStats.power],
      [trWithFallback('ui.profile.agility', 'Скорость'), heroStats.agility],
      [trWithFallback('ui.profile.vitality', 'Живучесть'), heroStats.vitality],
      [trWithFallback('ui.profile.tech', 'Техника'), heroStats.tech],
    ].filter(([, value]) => Number(value) > 0).map(([label, value]) =>
      '<span><b>' + Math.max(0, Number(value) || 0) + '</b>' + escapeHtml(label) + '</span>').join('');
    const heroRows = (Array.isArray(profile?.heroStats) ? profile.heroStats : []).map((hero) => {
      const heroName = escapeHtml(localizeHeroName(hero?.id, hero?.name || hero?.id || '-'));
      const heroLevel = Math.max(1, Number(hero?.level) || 1);
      const heroRuns = Math.max(0, Number(hero?.runs) || 0);
      const heroState = hero?.unlocked
        ? trWithFallback('ui.profile.hero_open', 'Открыт')
        : trWithFallback('ui.profile.hero_closed', 'Закрыт');
      const activeClass = String(hero?.id || '').trim().toLowerCase() === activeHeroId ? ' is-active' : '';
      return '<div class="profile-hero-row' + activeClass + '"><span>' + heroName + '</span><span>Lv' + heroLevel + ' | ' + escapeHtml(trWithFallback('ui.profile.runs', 'Runs')) + ': ' + heroRuns + '</span><span>' + escapeHtml(heroState) + '</span></div>';
    }).join('');
    const skillsHtml = activeSkills.length
      ? activeSkills.map((skill, index) => renderAuthorProfileSkillSlot(skill, index)).join('')
      : '<div class="record-details-empty">' + escapeHtml(trWithFallback('ui.profile.no_skills', 'Нет данных по умениям.')) + '</div>';
    const equipmentHtml = equippedItems.length
      ? equippedItems.map((slot, index) => renderAuthorProfileEquipmentSlot(slot, index)).join('')
      : '<div class="record-details-empty">' + escapeHtml(trWithFallback('ui.profile.no_equipment', 'Нет данных по предметам.')) + '</div>';

    return ''
      + '<div class="author-profile-shell" style="--profile-accent:' + escapeHtml(heroAccent) + ';--hero-xp:' + heroXpPct.toFixed(1) + '%;">'
      + '<section class="author-profile-hero-card">'
      + '<div class="author-profile-hero-art"><img src="' + escapeHtml(heroAvatar) + '" alt="' + escapeHtml(heroName) + '" loading="eager" decoding="async"></div>'
      + '<div class="author-profile-hero-info"><span class="author-profile-kicker">' + escapeHtml(trWithFallback('ui.profile.active_hero', 'Активный герой')) + '</span><h3>' + escapeHtml(heroName) + '</h3><p>' + escapeHtml(activeHero?.tagline || trWithFallback('ui.profile.hero_fallback_tagline', 'Зашел в профиль красиво, будто сейчас будет выбирать умение под драматичную музыку.')) + '</p>'
      + '<div class="author-profile-hero-xp"><span>Lv' + heroLevel + '</span><i aria-hidden="true"></i><span>' + (heroXpNeed > 0 ? heroXp + '/' + heroXpNeed + ' XP' : 'MAX') + '</span></div>'
      + (heroStatsHtml ? '<div class="author-profile-hero-stats">' + heroStatsHtml + '</div>' : '')
      + '</div></section>'
      + '<section class="author-profile-strip"><span><b>Lv' + Math.max(1, Number(profile?.accountLevel) || 1) + '</b>' + escapeHtml(trWithFallback('ui.profile.account', 'аккаунт')) + '</span><span><b>' + Math.max(0, Number(profile?.shards) || 0) + '</b>' + escapeHtml(trWithFallback('ui.profile.shards', 'shards')) + '</span><span><b>' + Math.max(0, Number(profile?.heroesUnlocked) || 0) + '/' + Math.max(0, Number(profile?.heroesTotal) || 0) + '</b>' + escapeHtml(trWithFallback('ui.profile.heroes', 'герои')) + '</span><span><b>' + Math.max(0, Number(profile?.totalRuns) || 0) + '</b>' + escapeHtml(trWithFallback('ui.profile.runs', 'Runs')) + '</span></section>'
      + '<div class="profile-card author-profile-card"><b>' + escapeHtml(trWithFallback('ui.hero.unique_skills', 'Умения')) + '</b><div class="author-profile-slot-grid">' + skillsHtml + '</div></div>'
      + '<div class="profile-card author-profile-card"><b>' + escapeHtml(trWithFallback('ui.inventory.items', 'Предметы')) + '</b><div class="author-profile-equipment-grid">' + equipmentHtml + '</div></div>'
      + '<div class="profile-card author-profile-card"><b>' + escapeHtml(trWithFallback('ui.profile.heroes', 'Герои')) + '</b><div class="profile-hero-list">' + (heroRows || '<div class="record-details-empty">' + escapeHtml(trWithFallback('ui.profile.no_hero_data', 'Нет данных по героям.')) + '</div>') + '</div></div>'
      + '<div class="profile-card author-profile-card"><b>' + escapeHtml(trWithFallback('ui.profile.account_info', 'Инфо аккаунта')) + '</b><div>' + escapeHtml(trWithFallback('ui.profile.created_at', 'Создан')) + ': ' + escapeHtml(formatPublicProfileDate(profile?.createdAt)) + ' | ' + escapeHtml(trWithFallback('ui.profile.last_login', 'Последний вход')) + ': ' + escapeHtml(formatPublicProfileDate(profile?.lastLoginAt)) + ' | XP ' + Math.max(0, Number(profile?.accountXp) || 0) + '/' + Math.max(1, Number(profile?.accountXpToNext) || 1) + '</div></div>'
      + renderRunHistory(runPayload, profile)
      + '</div>';
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
      authorProfileTitleEl.innerHTML = renderAuthorProfileLiveTitle(profile, fallbackName, id);
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
