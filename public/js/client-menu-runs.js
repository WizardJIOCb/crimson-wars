(function initClientMenuRuns() {
  const runSetupHostEl = document.getElementById('run-setup-host');
  const campaignBrowserHostEl = document.getElementById('campaign-browser-host');
  const RUN_MAP_IMAGES = {
    mall_night: '/assets/maps/night-mall.jpg',
    ringroad_bbq: '/assets/maps/ringroad-bbq.jpg',
    clinic_yard: '/assets/maps/clinic-yard.jpg',
    reactor_sprawl: '/assets/maps/reactor-sprawl.jpg',
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function tr(key, fallback, params = null) {
    if (typeof window.cwI18nT === 'function') return window.cwI18nT(key, params);
    return fallback;
  }

  function formatRunDuration(value) {
    if (typeof globalThis.cwFormatDurationSec === 'function') return globalThis.cwFormatDurationSec(value);
    const totalSec = Math.max(0, Math.floor(Number(value) || 0));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours}ч ${String(minutes).padStart(2, '0')}м ${String(seconds).padStart(2, '0')}с`;
  }

  function getSelection() {
    if (typeof window.cwGetRunSelection === 'function') return window.cwGetRunSelection();
    return {
      runType: 'free',
      mapId: 'mall_night',
      campaignId: '',
      campaignLevelId: '',
      gameMode: 'normal',
      pvpDurationMin: 10,
    };
  }

  function getMaps() {
    if (typeof window.cwGetMapCatalog === 'function') return window.cwGetMapCatalog();
    return [];
  }

  function getRunMapImagePath(mapId) {
    return RUN_MAP_IMAGES[String(mapId || '').trim()] || '';
  }

  function getCampaignMapImagePath(campaign) {
    const levels = Array.isArray(campaign?.levels) ? campaign.levels : [];
    const level = levels.find((entry) => getRunMapImagePath(entry?.mapId)) || levels[0] || null;
    return getRunMapImagePath(level?.mapId || campaign?.mapId || '');
  }

  function getCampaigns() {
    if (typeof window.cwGetCampaignCatalog === 'function') return window.cwGetCampaignCatalog();
    return [];
  }

  function getProgression() {
    const sharedGame = window.cwGame || globalThis.cwGame || null;
    return sharedGame?.playerAuth?.progression || null;
  }

  function getCampaignProgress(campaignId) {
    const progression = getProgression();
    return progression?.campaignProgress?.[String(campaignId || '').trim()] || null;
  }

  function getLevelProgress(campaignId, levelId) {
    const campaignProgress = getCampaignProgress(campaignId);
    return campaignProgress?.levels?.[String(levelId || '').trim()] || null;
  }

  function isLevelUnlocked(campaign, index) {
    const levels = Array.isArray(campaign?.levels) ? campaign.levels : [];
    if (index <= 0) return true;
    const previousLevel = levels[index - 1];
    const previousProgress = getLevelProgress(campaign?.id, previousLevel?.id);
    return Boolean((Number(previousProgress?.completedAt) || 0) > 0 || (Number(previousProgress?.victories) || 0) > 0);
  }

  function getCompletedLevelsCount(campaign) {
    const levels = Array.isArray(campaign?.levels) ? campaign.levels : [];
    let count = 0;
    for (const level of levels) {
      const progress = getLevelProgress(campaign?.id, level?.id);
      if ((Number(progress?.completedAt) || 0) > 0 || (Number(progress?.victories) || 0) > 0) count += 1;
    }
    return count;
  }

  function getFirstUnlockedLevelId(campaign) {
    const levels = Array.isArray(campaign?.levels) ? campaign.levels : [];
    for (let i = 0; i < levels.length; i += 1) {
      if (isLevelUnlocked(campaign, i)) return String(levels[i]?.id || '').trim();
    }
    return String(levels[0]?.id || '').trim();
  }

  function getSelectedCampaignBundle() {
    const selection = getSelection();
    const campaigns = getCampaigns();
    const campaign = campaigns.find((entry) => String(entry?.id || '') === String(selection.campaignId || '')) || campaigns[0] || null;
    if (!campaign) return { campaign: null, level: null };
    const levels = Array.isArray(campaign.levels) ? campaign.levels : [];
    let level = levels.find((entry) => String(entry?.id || '') === String(selection.campaignLevelId || '')) || null;
    if (!level || !isLevelUnlocked(campaign, Math.max(0, Number(level.index) || 0))) {
      const fallbackLevelId = getFirstUnlockedLevelId(campaign);
      if (typeof window.cwSetSelectedCampaign === 'function') {
        window.cwSetSelectedCampaign(campaign.id, fallbackLevelId);
      }
      level = levels.find((entry) => String(entry?.id || '') === fallbackLevelId) || levels[0] || null;
    }
    return { campaign, level };
  }

  function formatGoals(level) {
    const goals = Array.isArray(level?.goals) ? level.goals : [];
    return goals.map((goal) => `<span class="run-goal-chip">${escapeHtml(goal.label || `${goal.type}: ${goal.target}`)}</span>`).join('');
  }

  function renderRunSetupCard() {
    if (!runSetupHostEl) return;
    const maps = getMaps();
    if (maps.length <= 0) {
      runSetupHostEl.innerHTML = '<div class="run-setup-empty">Карты подтянутся вместе с каталогом прогресса.</div>';
      return;
    }
    const mapCardsHtml = maps.map((map) => {
      const selection = getSelection();
      const selected = String(selection.mapId || '') === String(map?.id || '');
      const cover = map?.cover && typeof map.cover === 'object' ? map.cover : {};
      const imagePath = getRunMapImagePath(map?.id);
      const style = [
        `--cover-from:${cover.from || '#1a2432'}`,
        `--cover-to:${cover.to || '#0b1017'}`,
        `--cover-accent:${cover.accent || '#f97316'}`,
        `--cover-glow:${cover.glow || 'rgba(249, 115, 22, 0.24)'}`,
      ].join(';');
      return ''
        + `<button type="button" class="run-map-card${selected ? ' is-selected' : ''}" data-map-id="${escapeHtml(map.id)}">`
        +   `<span class="run-map-cover${imagePath ? ' has-image' : ''}" style="${style}">${imagePath ? `<img src="${escapeHtml(imagePath)}" alt="" loading="lazy" />` : ''}</span>`
        +   `<span class="run-map-name">${escapeHtml(map.name || map.id)}</span>`
        +   `<span class="run-map-subtitle">${escapeHtml(map.subtitle || '')}</span>`
        +   `<span class="run-map-meta">${Math.max(0, Number(map.worldWidth) || 0)} x ${Math.max(0, Number(map.worldHeight) || 0)}</span>`
        + `</button>`;
    }).join('');

    runSetupHostEl.innerHTML = ''
      + `<div class="run-setup-copy">${escapeHtml(tr('ui.play.free_run_hint', 'Свободный забег стартует сразу на выбранной карте. Просто выберите место, где вам будет удобнее страдать.'))}</div>`
      + `<div class="run-map-grid">${mapCardsHtml}</div>`;

    runSetupHostEl.querySelectorAll('[data-map-id]').forEach((button) => {
      button.addEventListener('click', () => {
        if (typeof window.cwSetSelectedRunType === 'function') {
          window.cwSetSelectedRunType('free');
        }
        if (typeof window.cwSetSelectedMapId === 'function') {
          window.cwSetSelectedMapId(button.getAttribute('data-map-id') || 'mall_night');
        }
        renderRunSetupMenu();
      });
    });
  }

  function renderCampaignBrowser() {
    if (!campaignBrowserHostEl) return;
    const selection = getSelection();
    const campaigns = getCampaigns();
    if (campaigns.length <= 0) {
      campaignBrowserHostEl.innerHTML = '<div class="run-setup-empty">Кампании подтянутся вместе с каталогом прогресса.</div>';
      return;
    }

    const { campaign: selectedCampaign, level: selectedLevel } = getSelectedCampaignBundle();
    const campaignCardsHtml = campaigns.map((campaign) => {
      const selected = String(selection.campaignId || '') === String(campaign?.id || '');
      const completed = getCompletedLevelsCount(campaign);
      const total = Math.max(1, (Array.isArray(campaign?.levels) ? campaign.levels.length : 0));
      const campaignProgress = getCampaignProgress(campaign?.id);
      const cover = campaign?.cover && typeof campaign.cover === 'object' ? campaign.cover : {};
      const imagePath = getCampaignMapImagePath(campaign);
      const style = [
        `--cover-from:${cover.from || '#1a2432'}`,
        `--cover-to:${cover.to || '#0b1017'}`,
        `--cover-accent:${cover.accent || '#f97316'}`,
        `--cover-glow:${cover.glow || 'rgba(249, 115, 22, 0.24)'}`,
      ].join(';');
      return ''
        + `<button type="button" class="campaign-card${selected ? ' is-selected' : ''}" data-campaign-id="${escapeHtml(campaign.id)}">`
        +   `<span class="campaign-card-cover${imagePath ? ' has-image' : ''}" style="${style}">${imagePath ? `<img src="${escapeHtml(imagePath)}" alt="" loading="lazy" />` : ''}<b>${escapeHtml(cover.artLabel || campaign.shortName || campaign.name || campaign.id)}</b></span>`
        +   `<span class="campaign-card-head">`
        +     `<strong>${escapeHtml(campaign.shortName || campaign.name || campaign.id)}</strong>`
        +     `<small>${escapeHtml(campaign.tagline || '')}</small>`
        +   `</span>`
        +   `<span class="campaign-card-desc">${escapeHtml(campaign.description || '')}</span>`
        +   `<span class="campaign-card-stats">Прогресс ${completed}/${total} | Попыток ${Math.max(0, Number(campaignProgress?.attempts) || 0)} | Лучший счёт ${Math.max(0, Number(campaignProgress?.bestScore) || 0)}</span>`
        + `</button>`;
    }).join('');

    const levelCardsHtml = (Array.isArray(selectedCampaign?.levels) ? selectedCampaign.levels : []).map((level) => {
      const index = Math.max(0, Number(level?.index) || 0);
      const unlocked = isLevelUnlocked(selectedCampaign, index);
      const selected = String(selectedLevel?.id || '') === String(level?.id || '');
      const progress = getLevelProgress(selectedCampaign?.id, level?.id);
      const status = !unlocked
        ? 'Закрыто'
        : ((Number(progress?.completedAt) || 0) > 0 || (Number(progress?.victories) || 0) > 0)
          ? 'Пройдено'
          : 'Доступно';
      return ''
        + `<button type="button" class="campaign-level-card${selected ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}" data-level-id="${escapeHtml(level.id)}" ${unlocked ? '' : 'disabled'}>`
        +   `<span class="campaign-level-head"><b>${index + 1}. ${escapeHtml(level.title || level.id)}</b><small>${status}</small></span>`
        +   `<span class="campaign-level-brief">${escapeHtml(level.brief || '')}</span>`
        +   `<span class="campaign-level-goals">${formatGoals(level)}</span>`
        +   `<span class="campaign-level-scenario">${escapeHtml(level.scenario || '')}</span>`
        + `</button>`;
    }).join('');

    const selectedCampaignProgress = getCampaignProgress(selectedCampaign?.id);
    campaignBrowserHostEl.innerHTML = ''
      + `<div class="campaign-card-grid">${campaignCardsHtml}</div>`
      + (selectedCampaign
        ? ''
          + `<div class="campaign-detail-shell">`
          +   `<div class="campaign-detail-main">`
          +     `<div class="campaign-detail-title">${escapeHtml(selectedCampaign.name || selectedCampaign.id)}</div>`
          +     `<div class="campaign-detail-copy">${escapeHtml(selectedCampaign.description || '')}</div>`
          +     `<div class="campaign-detail-meta">Пройдено ${getCompletedLevelsCount(selectedCampaign)}/${Math.max(1, selectedCampaign.levels.length)} | Побед ${Math.max(0, Number(selectedCampaignProgress?.victories) || 0)} | Лучшее выживание ${escapeHtml(formatRunDuration(Math.max(0, Number(selectedCampaignProgress?.bestSurvivalSec) || 0)))}</div>`
          +   `</div>`
          +   `<div class="campaign-level-list">${levelCardsHtml}</div>`
          + `</div>`
        : '<div class="campaign-passive-copy">Кампании можно изучить заранее: у каждой свой угарный сюжет, статистика и последовательность уровней.</div>');

    campaignBrowserHostEl.querySelectorAll('[data-campaign-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextCampaignId = button.getAttribute('data-campaign-id') || '';
        const nextCampaign = campaigns.find((entry) => String(entry?.id || '') === nextCampaignId) || null;
        const nextLevelId = getFirstUnlockedLevelId(nextCampaign);
        if (typeof window.cwSetSelectedRunType === 'function') {
          window.cwSetSelectedRunType('campaign');
        }
        if (typeof window.cwSetSelectedCampaign === 'function') {
          window.cwSetSelectedCampaign(nextCampaignId, nextLevelId);
        }
        renderRunSetupMenu();
      });
    });

    campaignBrowserHostEl.querySelectorAll('[data-level-id]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!selectedCampaign) return;
        if (typeof window.cwSetSelectedRunType === 'function') {
          window.cwSetSelectedRunType('campaign');
        }
        if (typeof window.cwSetSelectedCampaign === 'function') {
          window.cwSetSelectedCampaign(selectedCampaign.id, button.getAttribute('data-level-id') || '');
        }
        renderRunSetupMenu();
      });
    });
  }

  function renderRunSetupMenu() {
    if (typeof window.cwEnsureSelectedRunSetupValid === 'function') {
      window.cwEnsureSelectedRunSetupValid();
    }
    renderRunSetupCard();
    renderCampaignBrowser();
  }

  globalThis.renderRunSetupMenu = renderRunSetupMenu;
  renderRunSetupMenu();
}());
