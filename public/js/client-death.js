(function initClientDeath() {
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
      [trWithFallback('ui.run_rewards.survival', 'Survival'), `${Math.max(1, Number(run.survivalSec) || 1)}s`],
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
    deathResultEl.textContent = `Last result: ${result.kills} kills | ${result.score} pts | ${result.survivalSec}s | room ${result.roomCode}`;
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
  };
}());
