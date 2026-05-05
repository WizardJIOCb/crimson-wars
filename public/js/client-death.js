(function initClientDeath() {
  const missionVictoryOverlayEl = document.getElementById('mission-victory-overlay');
  const missionVictoryCardEl = missionVictoryOverlayEl?.querySelector('.mission-victory-card') || null;
  const missionVictoryBurstsEl = document.getElementById('mission-victory-bursts');
  const missionVictoryKickerEl = document.getElementById('mission-victory-kicker');
  const missionVictoryTitleEl = document.getElementById('mission-victory-title');
  const missionVictoryLineEl = document.getElementById('mission-victory-line');
  const missionVictoryStatsEl = document.getElementById('mission-victory-stats');
  const missionVictoryObjectivesEl = document.getElementById('mission-victory-objectives');
  const missionVictoryRewardsEl = document.getElementById('mission-victory-rewards');
  const missionVictoryContinueBtn = document.getElementById('mission-victory-continue');
  const missionVictoryMenuBtn = document.getElementById('mission-victory-menu');
  let latestMissionVictoryPayload = null;
  let pendingMissionVictorySparkTimer = null;
  let pendingMissionVictoryLayoutFrame = 0;

  function formatRunDuration(value) {
    if (typeof globalThis.cwFormatDurationSec === 'function') return globalThis.cwFormatDurationSec(value);
    const totalSec = Math.max(0, Math.floor(Number(value) || 0));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours}ч ${String(minutes).padStart(2, '0')}м ${String(seconds).padStart(2, '0')}с`;
  }

  function clampMissionNumber(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.round(num));
  }

  function getMissionPayloadMission(result, options = {}) {
    const resultMission = result?.mission && typeof result.mission === 'object' ? result.mission : null;
    const optionMission = options?.mission && typeof options.mission === 'object' ? options.mission : null;
    return resultMission || optionMission || game.mission || null;
  }

  function formatMissionGoalValue(goal) {
    const current = clampMissionNumber(goal?.current);
    const target = Math.max(1, clampMissionNumber(goal?.target, 1));
    const type = String(goal?.type || '').trim();
    if (type === 'survive') return `${formatRunDuration(current)} / ${formatRunDuration(target)}`;
    return `${Math.min(current, target)} / ${target}`;
  }

  function buildMissionVictoryLine(result, options = {}) {
    const mission = getMissionPayloadMission(result, options);
    const campaign = String(mission?.campaignShortName || mission?.campaignName || result?.campaignName || '').trim();
    const missionTitle = String(options?.title || mission?.title || result?.levelTitle || '').trim();
    const enemyKills = clampMissionNumber(result?.enemyKills ?? result?.kills);
    const bossKills = clampMissionNumber(result?.bossKills);
    const survival = formatRunDuration(Math.max(1, Number(result?.survivalSec) || 1));
    const survived = clampMissionNumber(result?.survivors ?? result?.squadSurvivors, 1);
    const squad = Math.max(1, clampMissionNumber(result?.squadSize ?? result?.roomAlivePlayers, survived));
    const intro = [campaign, missionTitle].filter(Boolean).join(' / ');
    const prefix = intro ? `${intro}: ` : '';
    if (bossKills > 0) {
      return `${prefix}полевой отчет подписан кровью, боссов сложили ${bossKills}, рядовых списали ${enemyKills}, живыми вышли ${survived}/${squad}. Карточка вырвана за ${survival}.`;
    }
    return `${prefix}цель выполнена, всем раздали пиздов по ведомости, живыми вышли ${survived}/${squad}. Забег закрыт за ${survival}, морально-волевые в бодром плюсе.`;
  }

  function buildMissionVictoryStatsHtml(result, options = {}) {
    const mission = getMissionPayloadMission(result, options);
    const goals = Array.isArray(mission?.goals) ? mission.goals : [];
    const completedGoals = clampMissionNumber(mission?.completedGoals ?? result?.completedGoals, goals.filter((goal) => goal?.completed).length);
    const totalGoals = Math.max(goals.length, clampMissionNumber(mission?.totalGoals ?? result?.totalGoals, goals.length));
    const survived = clampMissionNumber(result?.survivors ?? result?.squadSurvivors, 1);
    const squad = Math.max(1, clampMissionNumber(result?.squadSize ?? result?.roomAlivePlayers, survived));
    const rows = [
      ['Счет', clampMissionNumber(result?.score)],
      ['Фрагов', clampMissionNumber(result?.kills)],
      ['Мобов списано', clampMissionNumber(result?.enemyKills ?? result?.kills)],
      ['Боссов уложено', clampMissionNumber(result?.bossKills)],
      ['Выживание', formatRunDuration(Math.max(1, Number(result?.survivalSec) || 1))],
      ['Уровень героя', `Lv ${Math.max(1, clampMissionNumber(result?.heroLevel, 1))}`],
      ['Смертей', clampMissionNumber(result?.deaths ?? result?.pvpDeaths)],
      ['Отряд жив', `${survived}/${squad}`],
      ['Цели', totalGoals > 0 ? `${completedGoals}/${totalGoals}` : 'готово'],
      ['Комната', String(result?.roomCode || game.roomCode || '-')],
      ['Режим', String(result?.gameMode || game.gameMode || 'normal')],
      ['Карточка', result?.victory ? 'вырвана' : 'жива'],
    ];
    return rows.map(([label, value]) => (
      `<div class="mission-victory-stat"><span>${escapeHtml(String(label))}</span><b>${escapeHtml(String(value))}</b></div>`
    )).join('');
  }

  function buildMissionVictoryObjectivesHtml(result, options = {}) {
    const mission = getMissionPayloadMission(result, options);
    const goals = Array.isArray(mission?.goals) ? mission.goals : [];
    const title = '<div class="mission-victory-section-title">Цели забега</div>';
    if (!goals.length) {
      return title
        + '<div class="mission-victory-objective-list">'
        + '<div class="mission-victory-objective"><strong>Главная задача</strong><span>закрыта с пафосом</span></div>'
        + '</div>';
    }
    const items = goals.map((goal) => {
      const target = Math.max(1, clampMissionNumber(goal?.target, 1));
      const current = clampMissionNumber(goal?.current, target);
      const progress = Math.max(0, Math.min(100, Math.round(((Number(goal?.progress) || (current / target)) * 100))));
      const label = String(goal?.label || goal?.type || 'Objective').trim();
      return ''
        + '<div class="mission-victory-objective">'
        +   `<strong>${escapeHtml(label)}</strong>`
        +   `<span>${escapeHtml(formatMissionGoalValue({ ...goal, current, target }))}</span>`
        +   `<div class="mission-victory-progress"><i style="--goal-progress: ${progress}%"></i></div>`
        + '</div>';
    }).join('');
    return title + `<div class="mission-victory-objective-list">${items}</div>`;
  }

  function buildMissionVictoryRewardsHtml() {
    const title = '<div class="mission-victory-section-title">Добыча и бухгалтерия триумфа</div>';
    const rewards = latestRunRewards;
    if (!rewards) {
      const loggedIn = Boolean(game.playerAuth?.player);
      return title
        + '<div class="mission-victory-reward-list">'
        + `<div class="mission-victory-reward"><strong>${loggedIn ? 'Награды синхронизируются' : 'Аккаунт не подключен'}</strong><span>${loggedIn ? 'секунду, казна считает' : 'честь есть, лута нет'}</span></div>`
        + '</div>';
    }
    const rows = [
      ['Опыт аккаунта', `+${clampMissionNumber(rewards.gainedXp)}`],
      ['Осколки', `+${clampMissionNumber(rewards.gainedShards)}`],
    ];
    if (clampMissionNumber(rewards.levelsGained) > 0) rows.push(['Уровни аккаунта', `+${clampMissionNumber(rewards.levelsGained)}`]);
    const cards = Array.isArray(rewards.cards) ? rewards.cards : [];
    const items = Array.isArray(rewards.items) ? rewards.items : [];
    if (cards.length > 0) {
      rows.push(['Карты героев', cards.map((card) => `+${card.count} ${card.name}`).join(', ')]);
    } else {
      rows.push(['Карты героев', 'не выпали, но мы сделали вид, что тактика']);
    }
    if (items.length > 0) {
      rows.push(['Предметы', items.map((item) => `+${item.quantity} ${item.name}${item.level > 1 ? ` Lv${item.level}` : ''}`).join(', ')]);
    } else {
      rows.push(['Предметы', 'без трофейной тележки']);
    }
    const itemsHtml = rows.map(([label, value]) => (
      `<div class="mission-victory-reward"><strong>${escapeHtml(String(label))}</strong><span>${escapeHtml(String(value))}</span></div>`
    )).join('');
    return title + `<div class="mission-victory-reward-list">${itemsHtml}</div>`;
  }

  function renderMissionVictoryOverlay() {
    if (!latestMissionVictoryPayload) return;
    const result = latestMissionVictoryPayload.result || {};
    const options = latestMissionVictoryPayload.options || {};
    const mission = getMissionPayloadMission(result, options);
    const hasHeadline = Object.prototype.hasOwnProperty.call(result || {}, 'headline');
    const title = String(hasHeadline ? result.headline : '').trim();
    const missionTitle = String(options.title || mission?.title || result?.levelTitle || 'миссия закрыта').trim();
    if (missionVictoryKickerEl) missionVictoryKickerEl.textContent = missionTitle;
    if (missionVictoryTitleEl) {
      missionVictoryTitleEl.textContent = title;
      missionVictoryTitleEl.classList.toggle('hidden', !title);
    }
    if (missionVictoryLineEl) missionVictoryLineEl.textContent = buildMissionVictoryLine(result, options);
    if (missionVictoryStatsEl) missionVictoryStatsEl.innerHTML = buildMissionVictoryStatsHtml(result, options);
    if (missionVictoryObjectivesEl) missionVictoryObjectivesEl.innerHTML = buildMissionVictoryObjectivesHtml(result, options);
    if (missionVictoryRewardsEl) missionVictoryRewardsEl.innerHTML = buildMissionVictoryRewardsHtml();
    if (missionVictoryContinueBtn) {
      missionVictoryContinueBtn.textContent = 'Дальше в сюжет';
      missionVictoryContinueBtn.title = 'Закрыть победный экран и открыть вкладку сюжетных кампаний.';
      missionVictoryContinueBtn.setAttribute('aria-label', 'Дальше в сюжет: открыть вкладку сюжетных кампаний');
    }
    if (missionVictoryMenuBtn) {
      missionVictoryMenuBtn.textContent = 'В штаб';
      missionVictoryMenuBtn.title = 'Закрыть победный экран и вернуться на вкладку обычного забега.';
      missionVictoryMenuBtn.setAttribute('aria-label', 'В штаб: вернуться на вкладку обычного забега');
    }
    scheduleMissionVictoryLayoutSync();
  }

  function syncMissionVictoryLayoutMode() {
    if (!missionVictoryCardEl || !missionVictoryOverlayEl || missionVictoryOverlayEl.classList.contains('hidden')) return;
    missionVictoryCardEl.classList.remove('is-fit', 'is-scrollable');
    const limit = Math.max(240, Math.floor((window.innerHeight || document.documentElement.clientHeight || 720) * 0.8));
    const naturalHeight = Math.ceil(missionVictoryCardEl.scrollHeight || missionVictoryCardEl.getBoundingClientRect().height || 0);
    missionVictoryCardEl.classList.add(naturalHeight <= limit + 1 ? 'is-fit' : 'is-scrollable');
  }

  function scheduleMissionVictoryLayoutSync() {
    if (pendingMissionVictoryLayoutFrame) cancelAnimationFrame(pendingMissionVictoryLayoutFrame);
    pendingMissionVictoryLayoutFrame = requestAnimationFrame(() => {
      pendingMissionVictoryLayoutFrame = 0;
      syncMissionVictoryLayoutMode();
    });
  }

  function spawnMissionVictoryDomFx() {
    if (!missionVictoryBurstsEl) return;
    missionVictoryBurstsEl.innerHTML = '';
    const colors = ['#b4534a', '#8f1d2c', '#d6b46f', '#9ca3af', '#c08457'];
    const count = Math.max(24, Math.min(58, Math.round((window.innerWidth || 900) / 26)));
    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement('div');
      spark.className = 'mission-victory-spark';
      const angle = Math.random() * Math.PI * 2;
      const distance = 130 + Math.random() * Math.min(520, Math.max(window.innerWidth || 900, window.innerHeight || 700) * 0.42);
      spark.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--spark-rot', `${Math.round(angle * 180 / Math.PI)}deg`);
      spark.style.setProperty('--spark-w', `${6 + Math.random() * 24}px`);
      spark.style.setProperty('--spark-h', `${2 + Math.random() * 4}px`);
      spark.style.setProperty('--spark-delay', `${Math.round(Math.random() * 420)}ms`);
      spark.style.setProperty('--spark-life', `${850 + Math.round(Math.random() * 780)}ms`);
      spark.style.setProperty('--spark-color', colors[i % colors.length]);
      missionVictoryBurstsEl.appendChild(spark);
    }
    if (pendingMissionVictorySparkTimer) clearTimeout(pendingMissionVictorySparkTimer);
    pendingMissionVictorySparkTimer = setTimeout(() => {
      pendingMissionVictorySparkTimer = null;
      if (missionVictoryBurstsEl) missionVictoryBurstsEl.innerHTML = '';
    }, 2400);
  }

  function spawnMissionVictoryWorldFx(result) {
    const players = Array.isArray(game.state?.players) ? game.state.players : [];
    const me = players.find((player) => player?.id === game.myId) || players.find((player) => !player?.isCompanion) || null;
    if (!me) return;
    const x = Number(me.x) || 0;
    const y = Number(me.y) || 0;
    if (typeof spawnSkillBurstFx === 'function') {
      spawnSkillBurstFx(x, y, '#b4534a', 260, { style: 'shockwave', trailRings: 6, spikeCount: 18, accentColor: '#d6b46f', innerColor: '#7f1d1d', life: 0.95, growSpeed: 520 });
      spawnSkillBurstFx(x, y, '#7f1d1d', 170, { style: 'shockwave', trailRings: 4, spikeCount: 14, accentColor: '#c08457', innerColor: '#b91c1c', life: 0.72, growSpeed: 460 });
    }
    if (typeof spawnRadialHitFx === 'function') spawnRadialHitFx(x, y, 220, { color: '#b4534a', count: 34 });
    if (typeof spawnSkillLabel === 'function') {
      const score = clampMissionNumber(result?.score);
      spawnSkillLabel(score > 0 ? `CLEAR +${score}` : 'MISSION CLEAR', x, y - 24);
    }
  }

  function hideMissionVictoryOverlay() {
    if (pendingMissionVictoryLayoutFrame) {
      cancelAnimationFrame(pendingMissionVictoryLayoutFrame);
      pendingMissionVictoryLayoutFrame = 0;
    }
    if (pendingMissionVictorySparkTimer) {
      clearTimeout(pendingMissionVictorySparkTimer);
      pendingMissionVictorySparkTimer = null;
    }
    if (missionVictoryBurstsEl) missionVictoryBurstsEl.innerHTML = '';
    missionVictoryCardEl?.classList.remove('is-fit', 'is-scrollable');
    missionVictoryOverlayEl?.classList.add('hidden');
    missionVictoryOverlayEl?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mission-victory-active');
  }

  function openMissionVictoryMenu(tabId = 'story') {
    hideMissionVictoryOverlay();
    latestMissionVictoryPayload = null;
    leaveActiveRoom();
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode', 'death-cinematic-active', 'death-rewards-visible');
    setDeathCinematicActive(false);
    clearDeathRewardsUi();
    statusEl.textContent = tabId === 'story' ? 'Mission complete. Story tab updated.' : 'Mission complete. Back at hub.';
    updateMobileControlsVisibility();
    requestRoomsList();
    requestRecordsList(recordsUi.page);
    if (typeof window.cwSetMainMenuTab === 'function') {
      window.cwSetMainMenuTab(tabId);
    } else {
      document.querySelector(`#main-menu-tabs [data-menu-tab="${tabId}"]`)?.click();
    }
    if (typeof globalThis.renderRunSetupMenu === 'function') {
      globalThis.renderRunSetupMenu();
    }
  }

  function clearDeathRewardsUi() {
    joinOverlay.classList.remove('death-rewards-visible');
    if (deathRewardsBodyEl) deathRewardsBodyEl.innerHTML = escapeNewsHtml(tr('ui.death.collecting_rewards'));
  }

  function localizeRewardCardName(cardId, fallbackName) {
    const id = String(cardId || '').trim().toLowerCase();
    const fb = String(fallbackName || id);
    if (id.endsWith('_core_card')) {
      const heroId = id.slice(0, -'_core_card'.length);
      const heroName = trHeroName(heroId, heroId);
      return trWithFallback('ui.hero.core_card', `${heroName} Core Card`, { hero: heroName });
    }
    return fb;
  }

  function formatRunRewardsPayload(rewards) {
    const gainedXp = Math.max(0, Number(rewards?.gainedXp) || 0);
    const gainedShards = Math.max(0, Number(rewards?.gainedShards) || 0);
    const levelsGained = Math.max(0, Number(rewards?.levelsGained) || 0);
    const gainedCards = rewards?.gainedCards && typeof rewards.gainedCards === 'object' ? rewards.gainedCards : {};
    const gainedItems = Array.isArray(rewards?.gainedItems) ? rewards.gainedItems : [];
    const catalogCards = Array.isArray(game.playerAuth?.progressionCatalog?.cards) ? game.playerAuth.progressionCatalog.cards : [];
    const cardNameById = Object.fromEntries(catalogCards.map((card) => [String(card.id || ''), String(card.name || card.id || '')]));
    const catalogItems = Array.isArray(game.playerAuth?.progressionCatalog?.items) ? game.playerAuth.progressionCatalog.items : [];
    const itemNameById = Object.fromEntries(catalogItems.map((item) => [String(item.id || ''), getItemDisplayName(item)]));
    const cards = [];
    for (const cardId of Object.keys(gainedCards)) {
      const cnt = Math.max(0, Number(gainedCards[cardId]) || 0);
      if (cnt <= 0) continue;
      const rawName = cardNameById[cardId] || cardId;
      cards.push({ id: cardId, count: cnt, name: localizeRewardCardName(cardId, rawName) });
    }
    const items = gainedItems.map((item) => ({
      itemId: String(item?.itemId || ''),
      name: itemNameById[String(item?.itemId || '')] || String(item?.itemId || ''),
      quantity: Math.max(1, Number(item?.quantity) || 1),
      level: Math.max(1, Number(item?.level) || 1),
    })).filter((item) => item.itemId);
    return { gainedXp, gainedShards, levelsGained, cards, items };
  }

  function buildDeathRewardsPvpResultsHtml() {
    const players = Array.isArray(game.state?.players)
      ? game.state.players.filter((p) => p && !p.isCompanion)
      : [];
    if (!players.length) return '';

    const sorted = [...players].sort((a, b) => (
      (Math.max(0, Number(b?.pvpKills) || 0) - Math.max(0, Number(a?.pvpKills) || 0))
      || (Math.max(0, Number(b?.enemyKills) || 0) - Math.max(0, Number(a?.enemyKills) || 0))
      || (Math.max(0, Number(b?.score) || 0) - Math.max(0, Number(a?.score) || 0))
    ));

    const headRank = trWithFallback('ui.scoreboard.rank', '#');
    const headNick = trWithFallback('ui.scoreboard.nick', 'Nickname');
    const headPvp = trWithFallback('ui.scoreboard.pvp_kills', 'PvP');
    const headPve = trWithFallback('ui.scoreboard.pve_kills', 'PvE');
    const headDeaths = trWithFallback('ui.scoreboard.deaths', 'Deaths');
    const title = trWithFallback('ui.run_rewards.pvp_results', 'PvP match results');

    const rows = sorted.map((pl, index) => {
      const pvpKills = Math.max(0, Number(pl?.pvpKills) || 0);
      const pveKills = Math.max(0, Number(pl?.enemyKills) || 0);
      const deaths = Math.max(0, Number(pl?.pvpDeaths) || 0);
      const meClass = pl?.id === game.myId ? ' class="me"' : '';
      return `<tr${meClass}><td class="num">${index + 1}</td><td>${escapeHtml(String(pl?.name || '-'))}</td><td class="num">${pvpKills}</td><td class="num">${pveKills}</td><td class="num">${deaths}</td></tr>`;
    }).join('');

    return ''
      + `<details class="death-reward-pvp" open>`
      +   `<summary class="death-reward-pvp-title">${escapeHtml(title)}</summary>`
      +   `<table class="death-reward-pvp-table">`
      +     `<thead><tr><th class="num">${escapeHtml(headRank)}</th><th>${escapeHtml(headNick)}</th><th class="num">${escapeHtml(headPvp)}</th><th class="num">${escapeHtml(headPve)}</th><th class="num">${escapeHtml(headDeaths)}</th></tr></thead>`
      +     `<tbody>${rows}</tbody>`
      +   `</table>`
      + `</details>`;
  }

  function renderDeathRewardsPanel() {
    if (!deathRewardsBodyEl) return;
    const run = latestDeathSnapshot || {};
    const rewards = latestRunRewards;
    const isLoggedIn = Boolean(game.playerAuth?.player);
    const accountXpLabel = rewards
      ? ('+' + rewards.gainedXp)
      : (isLoggedIn ? trWithFallback('ui.pending', 'Pending...') : trWithFallback('ui.profile.login_required', 'Login required.'));
    const shardsLabel = rewards
      ? ('+' + rewards.gainedShards)
      : (isLoggedIn ? trWithFallback('ui.pending', 'Pending...') : trWithFallback('ui.profile.login_required', 'Login required.'));
    const isPvpRun = normalizeGameMode(run.gameMode || game.gameMode || 'normal') === 'pvp';
    const deathsValue = Math.max(0, Number(run.deaths) || Number(run.pvpDeaths) || 0);
    const baseRows = [
      [trWithFallback('ui.run_rewards.score', 'Score'), Math.max(0, Number(run.score) || 0)],
      [trWithFallback('ui.run_rewards.kills', 'Kills'), Math.max(0, Number(run.kills) || 0)],
      [trWithFallback('ui.run_rewards.deaths', 'Deaths'), deathsValue],
      [trWithFallback('ui.run_rewards.enemy_kills', 'Enemy kills'), Math.max(0, Number(run.enemyKills) || 0)],
      [trWithFallback('ui.run_rewards.boss_kills', 'Boss kills'), Math.max(0, Number(run.bossKills) || 0)],
      [trWithFallback('ui.run_rewards.survival', 'Survival'), formatRunDuration(Math.max(1, Number(run.survivalSec) || 1))],
      [trWithFallback('ui.run_rewards.hero_xp', 'Hero XP'), `Lv${Math.max(1, Number(run.heroLevel) || 1)} | ${Math.max(0, Number(run.heroXp) || 0)}/${Math.max(1, Number(run.heroXpToNext) || 1)}`],
      [trWithFallback('ui.run_rewards.account_xp', 'Account XP'), accountXpLabel],
      [trWithFallback('ui.run_rewards.shards', 'Shards'), shardsLabel],
    ];
    if (rewards && rewards.levelsGained > 0) baseRows.push([trWithFallback('ui.run_rewards.account_level_up', 'Account level up'), '+' + rewards.levelsGained]);
    const rowsHtml = baseRows.map(([k, v]) => `<div class="death-reward-row"><span>${escapeHtml(String(k))}</span><b>${escapeHtml(String(v))}</b></div>`).join('');
    const cardsHtml = rewards && rewards.cards.length > 0
      ? (`<div class="death-reward-cards">` + rewards.cards.map((card) => `<span>+${card.count} ${escapeHtml(card.name)}</span>`).join('') + `</div>`)
      : '<div class="death-reward-cards muted">' + trWithFallback('ui.run_rewards.no_cards', 'No hero card drops this run') + '</div>';
    const itemsHtml = rewards && rewards.items.length > 0
      ? (`<div class="death-reward-cards">` + rewards.items.map((item) => `<span>+${item.quantity} ${escapeHtml(item.name)}${item.level > 1 ? ` Lv${item.level}` : ''}</span>`).join('') + `</div>`)
      : '<div class="death-reward-cards muted">' + trWithFallback('ui.run_rewards.no_items', 'Предметы в этот раз не выпали') + '</div>';
    const pvpResultsHtml = (isPvpRun && Boolean(run.pvpMatchEnded)) ? buildDeathRewardsPvpResultsHtml() : '';
    deathRewardsBodyEl.innerHTML = rowsHtml + cardsHtml + itemsHtml + pvpResultsHtml;
  }

  function scheduleDeathRewardsReveal() {
    if (pendingDeathRewardsTimer) clearTimeout(pendingDeathRewardsTimer);
    clearDeathRewardsUi();
    pendingDeathRewardsTimer = setTimeout(() => {
      pendingDeathRewardsTimer = null;
      renderDeathRewardsPanel();
      joinOverlay.classList.add('death-rewards-visible');
    }, DEATH_REWARDS_SHOW_DELAY_MS);
  }

  function cancelPendingDeathOverlay() {
    if (pendingDeathOverlayTimer) {
      clearTimeout(pendingDeathOverlayTimer);
      pendingDeathOverlayTimer = null;
    }
    if (pendingDeathRewardsTimer) {
      clearTimeout(pendingDeathRewardsTimer);
      pendingDeathRewardsTimer = null;
    }
    pendingDeathResult = null;
    clearDeathScreenBloodFx();
    clearDeathRewardsUi();
  }

  function clearDeathScreenBloodFx() {
    if (!deathScreenBloodOverlayEl) return;
    deathScreenBloodOverlayEl.innerHTML = '';
  }

  function clearHitScreenOverlayFx() {
    if (!hitScreenOverlayEl) return;
    hitScreenOverlayEl.innerHTML = '';
    hitScreenOverlayEl.style.setProperty('--hit-flash', '0');
  }

  function spawnDeathScreenBloodFx() {
    if (!deathScreenBloodOverlayEl) return;
    clearDeathScreenBloodFx();

    const shotCount = 22;
    const w = Math.max(320, window.innerWidth || 0);
    const h = Math.max(240, window.innerHeight || 0);
    const maxX = (w * 0.48);
    const maxY = (h * 0.46);

    for (let i = 0; i < shotCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.24 + Math.random() * 0.78) * Math.min(maxX, maxY);
      const tx = Math.cos(angle) * dist + ((Math.random() - 0.5) * 56);
      const ty = Math.sin(angle) * dist + ((Math.random() - 0.5) * 44);
      const delay = Math.round(Math.random() * 360);
      const flyDur = Math.round(280 + Math.random() * 360);
      const fadeDur = Math.round(760 + Math.random() * 680);

      const shot = document.createElement('div');
      shot.className = 'death-screen-shot';
      shot.style.setProperty('--tx', tx.toFixed(1) + 'px');
      shot.style.setProperty('--ty', ty.toFixed(1) + 'px');
      shot.style.setProperty('--delay', delay + 'ms');
      shot.style.setProperty('--fly-dur', flyDur + 'ms');
      shot.style.setProperty('--drop-size', (6 + Math.random() * 8).toFixed(1) + 'px');
      deathScreenBloodOverlayEl.appendChild(shot);

      const splat = document.createElement('div');
      splat.className = 'death-screen-splat';
      splat.style.setProperty('--tx', tx.toFixed(1) + 'px');
      splat.style.setProperty('--ty', ty.toFixed(1) + 'px');
      splat.style.setProperty('--rot', Math.round((Math.random() * 70) - 35) + 'deg');
      splat.style.setProperty('--delay', (delay + Math.max(70, Math.round(flyDur * 0.64))) + 'ms');
      splat.style.setProperty('--fade-dur', fadeDur + 'ms');
      splat.style.setProperty('--splat-size', (24 + Math.random() * 78).toFixed(1) + 'px');
      deathScreenBloodOverlayEl.appendChild(splat);

      const cleanupMs = delay + flyDur + fadeDur + 420;
      setTimeout(() => {
        shot.remove();
        splat.remove();
      }, cleanupMs);
    }
  }

  function spawnPlayerDeathBloodFx(result) {
    const me = game.state?.players?.find((p) => p.id === game.myId);
    if (!me) return;
    const x = Number(me.x) || 0;
    const y = Number(me.y) || 0;

    if (typeof spawnBlood === 'function') spawnBlood(x, y, 140);
    if (typeof spawnGoreBurst === 'function') spawnGoreBurst(x, y, 88);
    if (typeof spawnHitFx === 'function') spawnHitFx(x, y, 28, true);

    if (typeof spawnBloodPuddle === 'function') {
      for (let i = 0; i < 9; i += 1) {
        const ox = (Math.random() * 64) - 32;
        const oy = (Math.random() * 44) - 22;
        const intensity = 1.35 + Math.random() * 0.9;
        spawnBloodPuddle(x + ox, y + oy, intensity);
      }
    }
  }

  function lockCameraForDeathSequence() {
    game.deathCameraLock = {
      active: true,
      x: Math.max(0, Number(camera.x) || 0),
      y: Math.max(0, Number(camera.y) || 0),
    };
  }

  function clearDeathCameraLock() {
    if (game.deathCameraLock && typeof game.deathCameraLock === 'object') {
      game.deathCameraLock.active = false;
    }
    game.deathCameraLock = null;
  }

  function scheduleDeathOverlay(result) {
    localDeathStateLocked = true;
    if (pendingDeathOverlayTimer) return;
    pendingDeathResult = result || null;
    statusEl.textContent = 'Critical damage...';
    pendingDeathOverlayTimer = setTimeout(() => {
      const snapshot = pendingDeathResult;
      pendingDeathOverlayTimer = null;
      pendingDeathResult = null;
      openDeathOverlay(snapshot);
    }, DEATH_OVERLAY_DELAY_MS);
  }

  function renderDeathResult(result) {
    if (!deathResultEl) return;
    if (!result) {
      deathResultEl.textContent = tr('ui.death.last_result');
      return;
    }
    deathResultEl.textContent = `Last result: ${result.kills} kills | ${result.score} pts | ${formatRunDuration(result.survivalSec)} | room ${result.roomCode}`;
  }

  function setDeathCinematicActive(active) {
    const on = Boolean(active);
    if (on) {
      joinOverlay.classList.remove('death-cinematic-active');
      if (deathCinematicEl) {
        deathCinematicEl.setAttribute('aria-hidden', 'true');
        void deathCinematicEl.offsetWidth;
        deathCinematicEl.setAttribute('aria-hidden', 'false');
      }
      joinOverlay.classList.add('death-cinematic-active');
      return;
    }
    joinOverlay.classList.remove('death-cinematic-active');
    if (deathCinematicEl) deathCinematicEl.setAttribute('aria-hidden', 'true');
  }

  function openDeathMenuAfterCinematic() {
    clearDeathCameraLock();
    clearDeathRewardsUi();
    clearDeathScreenBloodFx();
    clearHitScreenOverlayFx();
    setDeathCinematicActive(false);
    joinOverlay.classList.add('death-mode');
    statusEl.textContent = tr('ui.death.you_died');
    updateMobileControlsVisibility();
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }

  function openDeathOverlay(result) {
    latestDeathSnapshot = result || null;
    cancelPendingDeathOverlay();
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      window.cwTrackMetrikaGoal('player_death', {
        room_code: result?.roomCode || '-',
        kills: Number(result?.kills) || 0,
        score: Number(result?.score) || 0,
        survival_sec: Number(result?.survivalSec) || 0,
      });
    }
    leaveActiveRoom();
    if (pendingFinalDeathCommentary?.title && pendingFinalDeathCommentary?.text) {
      commentatorState.lastTitle = pendingFinalDeathCommentary.title;
      commentatorState.lastText = pendingFinalDeathCommentary.text;
      if (commentatorTitleEl) commentatorTitleEl.textContent = pendingFinalDeathCommentary.title;
      if (commentatorTextEl) commentatorTextEl.textContent = pendingFinalDeathCommentary.text;
      maybeSpeakCommentary(
        pendingFinalDeathCommentary.title,
        pendingFinalDeathCommentary.text,
        'player_final_death_overlay',
      );
      pendingFinalDeathCommentary = null;
    }
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.add('death-mode');
    spawnDeathScreenBloodFx();
    renderDeathResult(result);
    renderDeathRewardsPanel();
    setDeathCinematicActive(true);
    scheduleDeathRewardsReveal();
  }

  function openVictoryOverlay(result, options = {}) {
    latestDeathSnapshot = result || null;
    cancelPendingDeathOverlay();
    clearDeathScreenBloodFx();
    clearHitScreenOverlayFx();
    clearDeathRewardsUi();
    latestMissionVictoryPayload = { result: result || {}, options: options || {} };
    joinOverlay.style.display = 'none';
    joinOverlay.classList.remove('death-mode', 'death-cinematic-active', 'death-rewards-visible');
    missionVictoryOverlayEl?.classList.remove('hidden');
    missionVictoryOverlayEl?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mission-victory-active');
    renderMissionVictoryOverlay();
    spawnMissionVictoryDomFx();
    spawnMissionVictoryWorldFx(result || {});
    window.cwPlayVictoryFanfare?.({ key: `missionVictory:${result?.roomCode || game.roomCode || Date.now()}` });
    setDeathCinematicActive(false);
    statusEl.textContent = String(options.title || 'Mission complete');
    if (commentatorTitleEl && options.title) commentatorTitleEl.textContent = String(options.title);
    if (commentatorTextEl) commentatorTextEl.textContent = String(options.message || 'Цель выполнена. Теперь можно хвастаться, будто всё так и планировалось.');
    updateMobileControlsVisibility();
  }

  deathContinueBtn?.addEventListener('click', () => {
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      window.cwTrackMetrikaGoal('death_overlay_continue', { source: 'death_cinematic' });
    }
    openDeathMenuAfterCinematic();
  });

  deathRewardsMenuBtn?.addEventListener('click', () => {
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      window.cwTrackMetrikaGoal('death_overlay_continue', { source: 'run_rewards' });
    }
    openDeathMenuAfterCinematic();
  });

  missionVictoryContinueBtn?.addEventListener('click', () => {
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      window.cwTrackMetrikaGoal('campaign_victory_continue', { target: 'story' });
    }
    openMissionVictoryMenu('story');
  });

  missionVictoryMenuBtn?.addEventListener('click', () => {
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      window.cwTrackMetrikaGoal('campaign_victory_continue', { target: 'run' });
    }
    openMissionVictoryMenu('run');
  });

  window.addEventListener('resize', () => {
    if (!missionVictoryOverlayEl || missionVictoryOverlayEl.classList.contains('hidden')) return;
    scheduleMissionVictoryLayoutSync();
  }, { passive: true });

  Object.assign(globalThis, {
    clearDeathRewardsUi,
    formatRunRewardsPayload,
    buildDeathRewardsPvpResultsHtml,
    renderDeathRewardsPanel,
    scheduleDeathRewardsReveal,
    cancelPendingDeathOverlay,
    clearDeathScreenBloodFx,
    clearHitScreenOverlayFx,
    spawnDeathScreenBloodFx,
    spawnPlayerDeathBloodFx,
    lockCameraForDeathSequence,
    clearDeathCameraLock,
    scheduleDeathOverlay,
    renderDeathResult,
    setDeathCinematicActive,
    openDeathMenuAfterCinematic,
    openDeathOverlay,
    openVictoryOverlay,
    renderMissionVictoryOverlay,
    hideMissionVictoryOverlay,
  });

  globalThis.CWDeath = {
    clearRewards: clearDeathRewardsUi,
    formatRewards: formatRunRewardsPayload,
    renderRewards: renderDeathRewardsPanel,
    cancelPending: cancelPendingDeathOverlay,
    clearBlood: clearDeathScreenBloodFx,
    clearHitOverlay: clearHitScreenOverlayFx,
    setCinematic: setDeathCinematicActive,
    lockCamera: lockCameraForDeathSequence,
    clearCamera: clearDeathCameraLock,
    spawnPlayerBlood: spawnPlayerDeathBloodFx,
    schedule: scheduleDeathOverlay,
    open: openDeathOverlay,
    openVictory: openVictoryOverlay,
  };
}());
