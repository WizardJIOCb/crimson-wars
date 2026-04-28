function resetMobileStick(kind) {
  if (kind === 'move') {
    mobile.moveId = null;
    mobile.moveX = 0;
    mobile.moveY = 0;
    mobile.moveStrength = 0;
    if (moveStickEl) {
      moveStickEl.classList.remove('dynamic-active');
      moveStickEl.style.removeProperty('left');
      moveStickEl.style.removeProperty('top');
      moveStickEl.style.removeProperty('right');
      moveStickEl.style.removeProperty('bottom');
    }
    if (moveKnobEl) moveKnobEl.style.transform = 'translate(-50%, -50%)';
    return;
  }
  mobile.aimId = null;
  mobile.aimStrength = 0;
  if (aimStickEl) {
    aimStickEl.classList.remove('dynamic-active');
    aimStickEl.style.removeProperty('left');
    aimStickEl.style.removeProperty('top');
    aimStickEl.style.removeProperty('right');
    aimStickEl.style.removeProperty('bottom');
  }
  if (aimKnobEl) aimKnobEl.style.transform = 'translate(-50%, -50%)';
}

function updateMobileStick(kind, clientX, clientY) {
  const stickEl = kind === 'move' ? moveStickEl : aimStickEl;
  const knobEl = kind === 'move' ? moveKnobEl : aimKnobEl;
  if (!stickEl || !knobEl) return;

  const rect = stickEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = Math.max(20, rect.width * 0.38);

  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) {
    dx = (dx / dist) * radius;
    dy = (dy / dist) * radius;
  }

  knobEl.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;

  const nx = dx / radius;
  const ny = dy / radius;
  const strength = Math.min(1, Math.hypot(nx, ny));

  if (kind === 'move') {
    mobile.moveX = nx;
    mobile.moveY = ny;
    mobile.moveStrength = strength;
  } else {
    if (strength > 0.02) {
      const len = Math.hypot(nx, ny) || 1;
      mobile.aimX = nx / len;
      mobile.aimY = ny / len;
      mobile.lastAimX = mobile.aimX;
      mobile.lastAimY = mobile.aimY;
    }
    mobile.aimStrength = strength;
  }
}

function getTouchById(touchList, id) {
  for (let i = 0; i < touchList.length; i += 1) {
    if (touchList[i].identifier === id) return touchList[i];
  }
  return null;
}


function canUseDynamicStickStart(kind, targetEl) {
  const isMove = kind === 'move';
  const stickEl = isMove ? moveStickEl : aimStickEl;
  if (!mobile.enabled || !stickEl || !mobileControlsEl) return false;
  if (isMove ? (mobile.moveId !== null) : (mobile.aimId !== null)) return false;
  if (!mobileControlsEl.classList.contains('active')) return false;
  if (!game.dynamicSticksEnabled) return false;
  if (!isMove && (!game.showAimStickEnabled || aimStickEl?.hidden)) return false;
  if (!(targetEl instanceof Element)) return false;
  if (targetEl.closest('#join-overlay') || targetEl.closest('#stats-panel') || targetEl.closest('#dev-console')) return false;
  if (targetEl.closest('#move-stick') || targetEl.closest('#aim-stick') || targetEl.closest('#jump-btn')) return false;
  if (targetEl.closest('button, input, select, textarea, details, summary, a, label')) return false;
  return true;
}

function placeStickAt(kind, clientX, clientY) {
  const stickEl = kind === 'move' ? moveStickEl : aimStickEl;
  if (!stickEl) return;
  const currentRect = stickEl.getBoundingClientRect();
  const radius = Math.max(42, currentRect.width / 2);
  const margin = 6;
  const x = Math.max(radius + margin, Math.min(window.innerWidth - radius - margin, clientX));
  const y = Math.max(radius + margin, Math.min(window.innerHeight - radius - margin, clientY));
  stickEl.classList.add('dynamic-active');
  stickEl.style.setProperty('left', x.toFixed(1) + 'px', 'important');
  stickEl.style.setProperty('top', y.toFixed(1) + 'px', 'important');
  stickEl.style.setProperty('right', 'auto', 'important');
  stickEl.style.setProperty('bottom', 'auto', 'important');
}
function initMobileControls() {
  if (!mobile.enabled || !moveStickEl || !aimStickEl) {
    setMobileControlsVisible(false);
    return;
  }

  const onStart = (kind, e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;

    if (kind === 'move' && mobile.moveId === null) {
      if (game.dynamicSticksEnabled) placeStickAt('move', touch.clientX, touch.clientY);
      mobile.moveId = touch.identifier;
      updateMobileStick('move', touch.clientX, touch.clientY);
    }
    if (kind === 'aim' && mobile.aimId === null) {
      if (game.dynamicSticksEnabled) placeStickAt('aim', touch.clientX, touch.clientY);
      mobile.aimId = touch.identifier;
      updateMobileStick('aim', touch.clientX, touch.clientY);
    }
  };

  moveStickEl.addEventListener('touchstart', (e) => onStart('move', e), { passive: false });
  aimStickEl.addEventListener('touchstart', (e) => onStart('aim', e), { passive: false });

  const onGlobalStart = (e) => {
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    const isMove = touch.clientX >= window.innerWidth * 0.5;
    const kind = isMove ? 'move' : 'aim';
    if (!canUseDynamicStickStart(kind, e.target)) return;
    if (kind === 'move') mobile.moveId = touch.identifier;
    else mobile.aimId = touch.identifier;
    placeStickAt(kind, touch.clientX, touch.clientY);
    updateMobileStick(kind, touch.clientX, touch.clientY);
    if (kind === 'aim') {
      input.shooting = mobile.aimStrength > 0.2;
      requestImmediateInputSend();
    }
    e.preventDefault();
  };
  window.addEventListener('touchstart', onGlobalStart, { passive: false, capture: true });

  const onMove = (e) => {
    if (mobile.moveId === null && mobile.aimId === null) return;
    const mt = mobile.moveId === null ? null : getTouchById(e.touches, mobile.moveId);
    const at = mobile.aimId === null ? null : getTouchById(e.touches, mobile.aimId);

    if (mt || at) e.preventDefault();
    if (mt) updateMobileStick('move', mt.clientX, mt.clientY);
    if (at) updateMobileStick('aim', at.clientX, at.clientY);
  };

  const onEnd = (e) => {
    let changed = false;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const t = e.changedTouches[i];
      if (mobile.moveId === t.identifier) {
        resetMobileStick('move');
        changed = true;
      }
      if (mobile.aimId === t.identifier) {
        resetMobileStick('aim');
        changed = true;
      }
    }
    if (changed) {
      e.preventDefault();
    }
  };

  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd, { passive: false });
  window.addEventListener('touchcancel', onEnd, { passive: false });

  updateMobileControlsVisibility();
}

initMobileControls();
updateMobileControlsVisibility();

jumpBtnEl?.addEventListener('touchstart', (e) => { e.preventDefault(); queueJump(); }, { passive: false });
jumpBtnEl?.addEventListener('mousedown', (e) => { e.preventDefault(); queueJump(); });

const joinToggleInfoBtn = document.getElementById('join-toggle-info');
const infoPanelHudHostEl = document.getElementById('info-panel-hud-host');
const infoPanelMenuHostEl = document.getElementById('info-panel-menu-host');
const settingsGraphicsHostEl = document.getElementById('settings-graphics-host');
const settingsTogglesHostEl = document.getElementById('settings-toggles-host');
const sessionExitBtn = document.getElementById('session-exit-btn');
const pvpDurationWrapEl = document.getElementById('pvp-duration-wrap');
const pvpDurationSelectEl = document.getElementById('pvp-duration-select');
const tabScoreboardEl = document.getElementById('tab-scoreboard');
const tr = (key, params = null) => {
  if (typeof window.cwI18nT === 'function') return window.cwI18nT(key, params);
  return String(key || '');
};
const trWithFallback = (key, fallback, params = null) => {
  const out = tr(key, params);
  return out === key ? String(fallback ?? key) : out;
};
const trHeroName = (heroId, fallback = '') => {
  const id = String(heroId || '').trim().toLowerCase();
  if (!id) return String(fallback || '');
  return trWithFallback(`hero.${id}.name`, String(fallback || id));
};
const trSkillName = (skillId, fallback = '') => {
  const id = String(skillId || '').trim().toLowerCase();
  if (!id) return String(fallback || '');
  return trWithFallback(`skill.${id}.name`, String(fallback || id));
};

function applyMenuButtonGlyph(buttonEl) {
  if (!(buttonEl instanceof HTMLElement)) return;
  const burger = buttonEl.querySelector('.menu-burger');
  const label = buttonEl.querySelector('.menu-label');
  if (burger) burger.textContent = 'в°';
  if (label) label.textContent = tr('ui.menu');
  buttonEl.setAttribute('aria-label', tr('ui.show_menu')); 
  buttonEl.title = tr('ui.show_menu');
}

function setInfoPanelHidden(hidden) {
  infoPanelHidden = Boolean(hidden);
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
  syncInfoPanelHost(overlayOpen);
  const forceVisibleInSettings = overlayOpen && currentMainMenuTab === 'menu';
  if (infoPanelEl) infoPanelEl.classList.toggle('is-hidden', infoPanelHidden && !forceVisibleInSettings);

  applyMenuButtonGlyph(toggleInfoBtn);

  if (toggleInfoBtn) {
    toggleInfoBtn.classList.toggle('hidden', !infoPanelHidden || overlayOpen);
  }

  if (devConsoleToggleBtn) {
    devConsoleToggleBtn.classList.toggle('hidden', !mobile.enabled || overlayOpen || !infoPanelHidden);
  }

  updateHudVisibility(overlayOpen);
  localStorage.setItem('cw:infoPanelHidden', infoPanelHidden ? '1' : '0');
}

if (toggleInfoBtn) {
  toggleInfoBtn.addEventListener('click', () => {
    setInfoPanelHidden(!infoPanelHidden);
  });
}

if (infoPanelCloseBtn) {
  infoPanelCloseBtn.addEventListener('click', () => {
    setInfoPanelHidden(true);
  });
}

function requestManualRunExit() {
  if (replayGame.active) {
    stopReplayGame({ showMenu: true });
    setInfoPanelHidden(true);
    statusEl.textContent = 'Returned to menu.';
    return;
  }
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) {
    statusEl.textContent = 'You are not in an active run.';
    return;
  }
  const me = Array.isArray(game.state.players) ? game.state.players.find((p) => p.id === game.myId) : null;
  if (!me || !me.alive) {
    statusEl.textContent = 'Run is already ending...';
    return;
  }
  if (!sendJson({ type: 'devCheat', command: 'killme' })) {
    statusEl.textContent = 'Failed to end run. Connection lost.';
    return;
  }
  pendingManualExitRequested = true;
  statusEl.textContent = 'Ending current run...';
  setInfoPanelHidden(true);
}

sessionExitBtn?.addEventListener('click', () => {
  requestManualRunExit();
});

const accountProgressSummaryEl = document.getElementById('account-progress-summary');
const heroTreePanelEl = document.getElementById('hero-tree-panel');
const heroActionFeedbackEl = document.getElementById('hero-action-feedback');
const heroGalleryV2El = document.getElementById('hero-gallery-v2');
const heroCharacterPanelEl = document.getElementById('hero-character-panel');
const profileSummaryEl = document.getElementById('profile-summary');
const profileAchievementsEl = document.getElementById('profile-achievements');
const profileCharacterStatsEl = document.getElementById('profile-character-stats');
const profileRunHistoryEl = document.getElementById('profile-run-history');
const menuVersionTriggerEl = document.getElementById('menu-version-trigger');
const gameVersionModalEl = document.getElementById('game-version-modal');
const gameVersionCloseBtn = document.getElementById('game-version-close');
const gameVersionBodyEl = document.getElementById('game-version-body');
const newsFeedEl = document.getElementById('news-feed');
const ratingBoardEl = document.getElementById('rating-board');
const deathScreenBloodOverlayEl = document.getElementById('death-screen-blood');
const hitScreenOverlayEl = document.getElementById('hit-screen-overlay');
const mainMenuTabButtons = Array.from(document.querySelectorAll('#main-menu-tabs .main-menu-tab'));
const mainMenuPanels = Array.from(document.querySelectorAll('#join-form [data-menu-panel]'));
let heroFocusId = selectedPlayerClass;
let selectedInventoryFilterKey = 'all';
let currentMainMenuTab = 'play';
let tabScoreboardVisible = false;
let heroEquipModalEl = null;
let heroEquipModalTitleEl = null;
let heroEquipModalBodyEl = null;
let lastTabScoreboardHtml = '';
let lastBattlePlayers = [];
const playerAliveState = new Map();
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
const infoPanelOriginalChildren = infoPanelEl ? Array.from(infoPanelEl.children) : [];
const infoPanelParagraphEls = infoPanelEl
  ? Array.from(infoPanelEl.children).filter((el) => el.tagName === 'P')
  : [];
const infoPanelQualityRowEl = qualitySelect?.closest('p') || null;
const infoPanelTogglesEl = infoPanelEl?.querySelector('.settings-toggles') || null;

function localizeSettingsMenuControls() {
  const currentLang = typeof window.cwI18nGetLanguage === 'function' ? window.cwI18nGetLanguage() : 'ru';
  const isRu = currentLang === 'ru';
  const settingsText = {
    graphicsQuality: isRu ? 'Уровень графики' : 'Graphics quality',
    qualityLow: isRu ? 'Низкое' : 'Low',
    qualityMedium: isRu ? 'Среднее' : 'Medium',
    qualityHigh: isRu ? 'Высокое' : 'High',
    shadows: isRu ? 'Тени' : 'Shadows',
    minimap: isRu ? 'Показывать миникарту' : 'Show minimap',
    tracers: isRu ? 'Трассеры пуль' : 'Bullet tracers',
    enemyHp: isRu ? 'HP врагов' : 'Enemy HP Bars',
    extraBlood: isRu ? 'Больше крови' : 'Extra blood',
    hitEffects: isRu ? 'Эффекты попаданий' : 'Hit effects',
    autoFire: isRu ? 'Авто-огонь' : 'Auto fire',
    dynamicSticks: isRu ? 'Динамические стики' : 'Dynamic sticks',
    aimStick: isRu ? 'Показывать стик прицеливания' : 'Show aim stick',
    connIndicator: isRu ? 'Индикатор соединения' : 'Connection indicator',
    showFps: isRu ? 'Показывать FPS' : 'Show FPS',
    showChat: isRu ? 'Показывать чат' : 'Show chat',
    gameSounds: isRu ? 'Звуки игры' : 'Game sounds',
    commentator: isRu ? 'Комментатор арены' : 'Arena commentator',
    commentatorVoice: isRu ? 'Озвучивать комментатора' : 'Voice commentator',
    replayPlayer: isRu ? 'Показывать плеер повтора' : 'Show replay player',
    soundVolume: isRu ? 'Громкость звука' : 'Sound volume',
  };

  if (infoPanelQualityRowEl && qualitySelect) {
    const qualityLabelEl = infoPanelQualityRowEl.querySelector('.cw-settings-inline-label') || document.createElement('span');
    qualityLabelEl.className = 'cw-settings-inline-label';
    qualityLabelEl.textContent = settingsText.graphicsQuality;
    if (qualityLabelEl.parentElement !== infoPanelQualityRowEl) {
      infoPanelQualityRowEl.insertBefore(qualityLabelEl, qualitySelect);
    }
    for (const node of Array.from(infoPanelQualityRowEl.childNodes)) {
      if (node !== qualityLabelEl && node !== qualitySelect && node.nodeType === Node.TEXT_NODE) {
        infoPanelQualityRowEl.removeChild(node);
      }
    }
    const optionMap = {
      low: settingsText.qualityLow,
      medium: settingsText.qualityMedium,
      high: settingsText.qualityHigh,
    };
    for (const option of Array.from(qualitySelect.options)) {
      const nextLabel = optionMap[String(option.value || '').toLowerCase()];
      if (nextLabel) option.textContent = nextLabel;
    }
  }

  const toggleLabelMap = {
    'shadow-toggle': settingsText.shadows,
    'show-minimap-toggle': settingsText.minimap,
    'bullet-tracers-toggle': settingsText.tracers,
    'enemy-hp-toggle': settingsText.enemyHp,
    'extra-blood-toggle': settingsText.extraBlood,
    'hit-effects-toggle': settingsText.hitEffects,
    'auto-fire-toggle': settingsText.autoFire,
    'dynamic-sticks-toggle': settingsText.dynamicSticks,
    'show-aim-stick-toggle': settingsText.aimStick,
    'conn-indicator-toggle': settingsText.connIndicator,
    'show-fps-toggle': settingsText.showFps,
    'show-chat-toggle': settingsText.showChat,
    'game-sfx-toggle': settingsText.gameSounds,
    'show-commentator-toggle': settingsText.commentator,
    'commentator-voice-setting-toggle': settingsText.commentatorVoice,
    'replay-player-toggle': settingsText.replayPlayer,
  };

  for (const [id, label] of Object.entries(toggleLabelMap)) {
    const input = document.getElementById(id);
    const labelEl = input?.closest('label');
    if (!labelEl) continue;
    const textNode = Array.from(labelEl.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && String(node.textContent || '').trim());
    if (textNode) {
      textNode.textContent = ` ${label}`;
      continue;
    }
    const span = Array.from(labelEl.querySelectorAll('span')).find((el) => el.id !== `${id}-value`);
    if (span) span.textContent = label;
  }

  const volumeLabel = document.querySelector('label[for="game-sfx-volume"]');
  if (volumeLabel) {
    const valueEl = document.getElementById('game-sfx-volume-value');
    volumeLabel.textContent = settingsText.soundVolume;
    if (valueEl) volumeLabel.appendChild(valueEl);
  }
}

function syncInfoPanelHost(overlayOpen = null) {
  if (!infoPanelEl) return;
  const menuOpen = overlayOpen === null ? (getComputedStyle(joinOverlay).display !== 'none') : Boolean(overlayOpen);
  const settingsMenuActive = menuOpen && currentMainMenuTab === 'menu';
  const targetHost = settingsMenuActive
    ? (infoPanelMenuHostEl || infoPanelHudHostEl)
    : infoPanelHudHostEl;
  if (targetHost && infoPanelEl.parentElement !== targetHost) targetHost.appendChild(infoPanelEl);
  infoPanelEl.classList.toggle('info-panel-in-menu', settingsMenuActive && targetHost === infoPanelMenuHostEl);
  layoutSettingsMenu(settingsMenuActive);
}

function layoutSettingsMenu(active) {
  if (!infoPanelEl) return;
  const hostsReady = settingsGraphicsHostEl && settingsTogglesHostEl;
  if (!active || !hostsReady) {
    for (const child of infoPanelOriginalChildren) {
      if (child && child.parentElement !== infoPanelEl) infoPanelEl.appendChild(child);
    }
    return;
  }
  localizeSettingsMenuControls();
  settingsGraphicsHostEl.replaceChildren();
  settingsTogglesHostEl.replaceChildren();
  if (infoPanelQualityRowEl) settingsGraphicsHostEl.appendChild(infoPanelQualityRowEl);
  if (infoPanelTogglesEl) settingsTogglesHostEl.appendChild(infoPanelTogglesEl);
}

setInfoPanelHidden(infoPanelHidden);

if (joinOverlay && typeof MutationObserver !== 'undefined') {
  const joinOverlayObserver = new MutationObserver(() => {
    syncInfoPanelHost();
  });
  joinOverlayObserver.observe(joinOverlay, { attributes: true, attributeFilter: ['style', 'class'] });
}

const newsUi = {
  items: [],
  activeId: '',
  activeItem: null,
  loading: false,
  loadingItem: false,
  postingComment: false,
  error: '',
  itemError: '',
  commentError: '',
  lastLoadedAt: 0,
  cacheMs: 15000,
  fetchToken: 0,
  itemFetchToken: 0,
  commentDraft: '',
  replyTargetId: '',
  replyDraftByParent: {},
  shareCopied: false,
};
let newsShareToastTimer = null;
let pendingManualExitRequested = false;
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
const MENU_TAB_IDS = new Set(['play', 'characters', 'skills', 'profile', 'rating', 'news']);
const initialUrlParams = new URLSearchParams(window.location.search);
const initialMenuTabParam = String(initialUrlParams.get('tab') || '').trim().toLowerCase();
const initialNewsIdParam = String(initialUrlParams.get('news') || '').trim();
const initialMenuTab = MENU_TAB_IDS.has(initialMenuTabParam) ? initialMenuTabParam : 'play';

const GAME_VERSION_HISTORY = [
  {
    version: 'v0.8.2',
    date: '30.03.2026',
    summaryKey: 'ui.version.v082',
  },
  {
    version: 'v0.8.1',
    date: '18.03.2026',
    summaryKey: 'ui.version.v081',
  },
  {
    version: 'v0.8.0',
    date: '18.03.2026',
    summaryKey: 'ui.version.v080',
  },
  {
    version: 'v0.7.4',
    date: '17.03.2026',
    summaryKey: 'ui.version.v074',
  },
  {
    version: 'v0.7.0',
    date: '15.03.2026',
    summaryKey: 'ui.version.v070',
  },
];

const CURRENT_GAME_VERSION = GAME_VERSION_HISTORY[0]?.version || 'v0.8.2';

function renderGameVersionHistory() {
  if (!gameVersionBodyEl) return;
  const rows = GAME_VERSION_HISTORY.map((item) => {
    const version = escapeNewsHtml(item?.version || '--');
    const date = escapeNewsHtml(item?.date || '--');
    const summary = escapeNewsHtml(item?.summaryKey ? tr(item.summaryKey) : (item?.summary || '--'));
    return ''
      + '<article class="version-entry">'
      +   '<div class="version-entry-head"><b>' + version + '</b><span>' + date + '</span></div>'
      +   '<p>' + summary + '</p>'
      + '</article>';
  }).join('');

  const inventoryGroupOrder = [
    ['consumable', trWithFallback('ui.inventory.group_consumables', 'Р Р°СЃС…РѕРґРЅРёРєРё')],
    ['armor', trWithFallback('ui.inventory.group_armor', 'Р‘СЂРѕРЅСЏ')],
    ['hands', trWithFallback('ui.inventory.group_hands', 'Р СѓРєРё Рё РѕСЂСѓР¶РёРµ')],
    ['rings', trWithFallback('ui.inventory.group_rings', 'РљРѕР»СЊС†Р°')],
    ['other', trWithFallback('ui.inventory.group_other', 'РџСЂРѕС‡РµРµ')],
  ];

  const getInventoryGroupKey = (itemDef, equipTargets) => {
    if (itemDef?.combatUse) return 'consumable';
    const slotCategory = String(itemDef?.slotCategory || '').trim().toLowerCase();
    if (['head', 'armor', 'legs'].includes(slotCategory)) return 'armor';
    if (slotCategory === 'ring') return 'rings';
    if (equipTargets.some((slot) => ['left_hand', 'right_hand'].includes(String(slot?.key || '').trim().toLowerCase()))) return 'hands';
    return 'other';
  };

  const inventoryCardsByGroup = new Map(inventoryGroupOrder.map(([key]) => [key, []]));
  for (const item of inventoryItems) {
    const itemDef = itemMap[item.itemId] || {};
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const equipTargets = getInventorySlotTargets(catalog, itemDef);
    const iconMeta = getInventoryItemIconMeta(itemDef, equipTargets);
    const equippedIn = Object.keys(equippedItems).filter((slotKey) => equippedItems[slotKey]?.uid === item.uid);
    const upgradeCost = Math.max(0, Number(item.upgradeCost) || 0);
    const canUpgradeItem = !itemDef.combatUse && Math.max(1, Number(item.level) || 1) < 10 && salvage >= upgradeCost;
    const equipButtons = equipTargets.map((slot, slotIndex) => `<button type="button" class="inventory-mini-btn inventory-text-action${equippedIn.includes(slot.key) ? ' active' : ''}" data-item-equip="${escapeHtml(item.uid)}" data-slot-key="${escapeHtml(slot.key)}" title="${escapeHtml(`${trWithFallback('ui.inventory.equip_to_slot', 'Снарядить в слот')}: ${getItemSlotLabel(slot)}`)}" aria-label="${escapeHtml(`${trWithFallback('ui.inventory.equip_to_slot', 'Снарядить в слот')}: ${getItemSlotLabel(slot)}`)}">${escapeHtml(`${trWithFallback('ui.inventory.slot_short', 'Slot')} ${slotIndex + 1}`)}</button>`).join('');
    const categoryLabel = getItemCategoryLabel(itemDef.slotCategory);
    const equippedMeta = equippedIn.length
      ? `<div class="inventory-item-chip inventory-item-chip-eq">${escapeHtml(equippedIn.map((slotKey) => getItemSlotLabel((catalog.itemSlots || []).find((slot) => slot.key === slotKey) || { key: slotKey })).join(', '))}</div>`
      : '';
    const actionButtonsHtml = `${equipButtons || ''}${!itemDef.combatUse ? `<button type="button" class="inventory-mini-btn inventory-text-action upgrade${canUpgradeItem ? '' : ' disabled-like'}" data-item-upgrade="${escapeHtml(item.uid)}" title="${escapeHtml(`Улучшить • ${upgradeCost}`)}" aria-label="${escapeHtml(`Улучшить • ${upgradeCost}`)}">${escapeHtml(trWithFallback('ui.inventory.action_upgrade', 'Upgrade'))}</button>` : ''}<button type="button" class="inventory-mini-btn inventory-text-action danger" data-item-sell="${escapeHtml(item.uid)}" title="${escapeHtml(`Продать • ${Math.max(0, Number(item.sellValue) || 0)}`)}" aria-label="${escapeHtml(`Продать • ${Math.max(0, Number(item.sellValue) || 0)}`)}">${escapeHtml(trWithFallback('ui.inventory.action_sell', 'Sell'))}</button>`;
    const cardHtml = `<div class="inventory-item-card inventory-item-card-compact rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="inventory-item-layout"><div class="inventory-item-icon inventory-item-icon-${escapeHtml(iconMeta.className)}">${escapeHtml(iconMeta.glyph)}</div><div class="inventory-item-main"><div class="inventory-item-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="inventory-item-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} • ${escapeHtml(categoryLabel)}</div><div class="inventory-item-chip-row"><div class="inventory-item-chip">Lv ${Math.max(1, Number(item.level) || 1)}</div>${quantity > 1 ? `<div class="inventory-item-chip">x${quantity}</div>` : ''}<div class="inventory-item-chip">${escapeHtml(trWithFallback('ui.inventory.sell_value_short', 'Продажа'))}: ${Math.max(0, Number(item.sellValue) || 0)}</div>${equippedMeta}</div>${itemDef.combatUse ? `<div class="inventory-item-consumable">${escapeHtml(trWithFallback('ui.inventory.consumable_hint_keys', 'Клавиши 4/5/6 в бою'))}</div>` : ''}<div class="inventory-item-actions-line inventory-item-actions-inline">${actionButtonsHtml}</div></div></div></div>`;
    const groupKey = getInventoryGroupKey(itemDef, equipTargets);
    inventoryCardsByGroup.get(groupKey)?.push(cardHtml);
  }

  const inventorySectionsHtml = inventoryGroupOrder.map(([key, title]) => {
    const cards = inventoryCardsByGroup.get(key) || [];
    if (!cards.length) return '';
    return `<div class="inventory-category-group"><div class="inventory-category-title">${escapeHtml(title)}</div><div class="inventory-category-grid">${cards.join('')}</div></div>`;
  }).join('');
  gameVersionBodyEl.innerHTML = '<div class="version-history">' + rows + '</div>';
}

function openGameVersionModal() {
  if (!gameVersionModalEl) return;
  renderGameVersionHistory();
  gameVersionModalEl.classList.remove('hidden');
}

function closeGameVersionModal() {
  if (!gameVersionModalEl) return;
  gameVersionModalEl.classList.add('hidden');
}

if (menuVersionTriggerEl) {
  menuVersionTriggerEl.textContent = CURRENT_GAME_VERSION;
  menuVersionTriggerEl.addEventListener('click', () => {
    openGameVersionModal();
  });
}

gameVersionCloseBtn?.addEventListener('click', () => {
  closeGameVersionModal();
});

gameVersionModalEl?.addEventListener('click', (e) => {
  if (e.target === gameVersionModalEl) closeGameVersionModal();
});

const CHAT_MAX_CLIENT_MESSAGES = 80;
const CHAT_MUTED_NAMES_STORAGE_KEY = 'cw:chatMutedNames';
const chatUi = {
  items: [],
  mutedNames: new Set(),
};

function normalizeChatNameKey(name) {
  return String(name || '').trim().toLowerCase();
}

function loadChatMutedNames() {
  try {
    const raw = localStorage.getItem(CHAT_MUTED_NAMES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    chatUi.mutedNames = new Set(parsed.map((x) => normalizeChatNameKey(x)).filter(Boolean));
  } catch {
    chatUi.mutedNames = new Set();
  }
}

function saveChatMutedNames() {
  try {
    localStorage.setItem(CHAT_MUTED_NAMES_STORAGE_KEY, JSON.stringify(Array.from(chatUi.mutedNames.values())));
  } catch {
    // ignore storage failures
  }
}

function formatChatClock(ts) {
  const ms = Math.max(0, Number(ts) || Date.now());
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function renderChatMessages() {
  if (!chatMessagesEl) return;
  const nearBottom = (chatMessagesEl.scrollHeight - chatMessagesEl.scrollTop - chatMessagesEl.clientHeight) < 24;
  const hasMessages = chatUi.items.length > 0;
  chatMessagesEl.classList.toggle('hidden', !hasMessages);
  chatMessagesEl.innerHTML = chatUi.items.map((item) => {
    const lineClass = item.system ? 'chat-line system' : 'chat-line';
    const timeHtml = '<span class="chat-time">[' + escapeHtml(formatChatClock(item.at)) + ']</span>';
    if (item.system) {
      return '<div class="' + lineClass + '">' + timeHtml + '<span>' + escapeHtml(item.text || '') + '</span></div>';
    }
    const nameHtml = '<span class="chat-name">' + escapeHtml(item.name || tr('ui.chat.system.player')) + ':</span>';
    return '<div class="' + lineClass + '">' + timeHtml + nameHtml + '<span>' + escapeHtml(item.text || '') + '</span></div>';
  }).join('');
  if (nearBottom) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function pushChatItem(item) {
  if (!item) return;
  const isSystem = Boolean(item.system);
  const name = String(item.name || '').trim();
  if (!isSystem && chatUi.mutedNames.has(normalizeChatNameKey(name))) return;
  chatUi.items.push({
    at: Number(item.at) || Date.now(),
    name,
    text: String(item.text || ''),
    system: isSystem,
  });
  if (chatUi.items.length > CHAT_MAX_CLIENT_MESSAGES) {
    chatUi.items.splice(0, chatUi.items.length - CHAT_MAX_CLIENT_MESSAGES);
  }
  renderChatMessages();
}

function pushLocalChatSystem(text) {
  pushChatItem({ system: true, text: String(text || ''), at: Date.now() });
}

function applyChatHistory(history) {
  chatUi.items = [];
  for (const item of Array.isArray(history) ? history : []) {
    pushChatItem(item);
  }
}

const commentatorState = {
  lastEventAt: new Map(),
  lastKillsRemarkAt: 0,
  lastLowHpAt: 0,
  lastRecoveryAt: 0,
  lastTitle: '',
  lastText: '',
  lastPlayerCount: 0,
  lastThreatLevel: 1,
  lastBossAlive: false,
  lastBossPortalAt: 0,
  lastBossCountdownBucket: 0,
  lastBossKills: 0,
  lastPvpLeaderId: '',
  lastKillMilestone: 0,
  lastMatchPulseBucket: 0,
  lastSkillRanks: new Map(),
  wasLowHp: false,
};
const COMMENTATOR_TTS_STORAGE_KEY = 'cw:commentatorTtsEnabled';
const commentatorSpeech = {
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function',
  enabled: false,
  lastSpokenAt: 0,
  activeSinceAt: 0,
  lastKey: '',
  lastQueuedText: '',
  activeKey: '',
  activeText: '',
  pendingTimer: 0,
  seq: 0,
  recentKeys: new Map(),
  queue: [],
};
let pendingFinalDeathCommentary = null;

try {
  const storedCommentatorTts = localStorage.getItem(COMMENTATOR_TTS_STORAGE_KEY);
  commentatorSpeech.enabled = storedCommentatorTts === null ? true : storedCommentatorTts === '1';
} catch {
  commentatorSpeech.enabled = true;
}

function setCommentatorLine(title, text, eventKey = 'generic', cooldownMs = 6000) {
  if (!commentatorTitleEl || !commentatorTextEl) return false;
  const now = Date.now();
  const key = String(eventKey || 'generic');
  const lastAt = Math.max(0, Number(commentatorState.lastEventAt.get(key)) || 0);
  if (cooldownMs > 0 && now - lastAt < cooldownMs) return false;
  const directVariant = key.toLowerCase().includes('skill_pick')
    ? null
    : pickCommentaryVariant(getExtraCommentaryVariants(key), null);
  const nextTitle = String(directVariant?.title || title || '').trim();
  const nextText = String(directVariant?.text || text || '').trim();
  if (!nextTitle || !nextText) return false;
  if (commentatorState.lastTitle === nextTitle && commentatorState.lastText === nextText && now - lastAt < Math.max(cooldownMs, 12000)) {
    return false;
  }
  commentatorState.lastEventAt.set(key, now);
  commentatorState.lastTitle = nextTitle;
  commentatorState.lastText = nextText;
  commentatorTitleEl.textContent = nextTitle;
  commentatorTextEl.textContent = nextText;
  if (game.embedMode && game.spectating) {
    window.parent?.postMessage({
      type: 'cw-live-spectator',
      status: 'commentary',
      roomCode: String(game.roomCode || game.state?.roomCode || ''),
      title: nextTitle,
      text: nextText,
    }, window.location.origin);
  }
  maybeSpeakCommentary(nextTitle, nextText, key);
  return true;
}

function pickCommentaryVariant(options, fallback) {
  const list = Array.isArray(options) ? options.filter(Boolean) : [];
  if (list.length <= 0) return fallback;
  const index = Math.floor(Math.random() * list.length);
  return list[index] || fallback;
}

function pluralizeRussianSeconds(value) {
  const n = Math.max(0, Math.abs(Number(value) || 0));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'СЃРµРєСѓРЅРґР°';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'СЃРµРєСѓРЅРґС‹';
  return 'СЃРµРєСѓРЅРґ';
}

function expandCommentarySpeechText(value) {
  return String(value || '')
    .replace(/(\d+)\s*СЃ\b/gi, (_, raw) => `${raw} ${pluralizeRussianSeconds(raw)}`)
    .replace(/(\d+)\s*sec\b/gi, (_, raw) => `${raw} ${pluralizeRussianSeconds(raw)}`)
    .replace(/Lv\s*(\d+)/gi, 'СѓСЂРѕРІРµРЅСЊ $1');
}

function buildSkillPickCommentaryVariants(skillLabel) {
  const name = String(skillLabel || 'РќР°РІС‹Рє').trim() || 'РќР°РІС‹Рє';
  return [
    { title: `Р’Р·СЏР»Рё РЅР°РІС‹Рє: ${name}.`, text: 'РћС‚Р»РёС‡РЅРѕ. Р‘РёР»Рґ С‚РѕР»СЊРєРѕ С‡С‚Рѕ СЃС‚Р°Р» Р»РёР±Рѕ СЃРёР»СЊРЅРµРµ, Р»РёР±Рѕ РіРѕСЂР°Р·РґРѕ СЃРјРµС€РЅРµРµ. РЎРєРѕСЂРѕ СѓРІРёРґРёРј, РєР°РєРѕР№ РёРјРµРЅРЅРѕ РІР°СЂРёР°РЅС‚ РІС‹РїР°Р».' },
    { title: `${name} РґРѕР±Р°РІР»РµРЅ РІ Р°СЂСЃРµРЅР°Р».`, text: 'РћС‡РµРЅСЊ Р»СЋР±Р»СЋ СЌС‚РѕС‚ РјРѕРјРµРЅС‚: РёРіСЂРѕРє РґРµР»Р°РµС‚ СЃРµСЂСЊС‘Р·РЅРѕРµ Р»РёС†Рѕ Рё РІС‹Р±РёСЂР°РµС‚ СЃРµР±Рµ РЅРѕРІС‹Р№ СЃРїРѕСЃРѕР± РїСЂРµРІСЂР°С‰Р°С‚СЊ Р°СЂРµРЅСѓ РІ РїСЂРѕР±Р»РµРјСѓ РґР»СЏ РѕРєСЂСѓР¶Р°СЋС‰РёС….' },
    { title: `${name} РѕС„РёС†РёР°Р»СЊРЅРѕ РІ Р±РёР»РґРµ.`, text: 'РЎС‚СЂР°С‚РµРіРёСЏ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ РІСЃС‘ СѓРјРЅРµРµ РЅР° Р±СѓРјР°РіРµ Рё РІСЃС‘ Р±РµР·СѓРјРЅРµРµ РІ СЂРµР°Р»СЊРЅРѕРј СЌС„РёСЂРµ. РРјРµРЅРЅРѕ С‚Р°Рє Рё СЂРѕР¶РґР°СЋС‚СЃСЏ РєСЂР°СЃРёРІС‹Рµ РєР°С‚Р°СЃС‚СЂРѕС„С‹.' },
    { title: `РџСЂРѕРєР°С‡РєР° СѓС€Р»Р° РІ СЃС‚РѕСЂРѕРЅСѓ: ${name}.`, text: 'Р“РµСЂРѕР№ СЃРЅРѕРІР° СЃРґРµР»Р°Р» РІС‹Р±РѕСЂ РјРµР¶РґСѓ РѕСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚СЊСЋ Рё С€РѕСѓ. РЎСѓРґСЏ РїРѕ Р°С‚РјРѕСЃС„РµСЂРµ, С€РѕСѓ РїРѕР±РµРґРёР»Рѕ Р±РµР· РѕСЃРѕР±РѕР№ Р±РѕСЂСЊР±С‹.' },
    { title: `${name} РІС‹Р±СЂР°Р»Рё Р±РµР· РїСЂР°РІР° РЅР° РѕС‚РјРµРЅСѓ.`, text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ СѓРІР°Р¶Р°РµС‚ СЃРјРµР»РѕСЃС‚СЊ. РџСЃРёС…РѕС‚РµСЂР°РїРµРІС‚ СЌС‚РѕР№ РєРѕРјРЅР°С‚С‹, РЅР°РІРµСЂРЅРѕРµ, СѓРІР°Р¶Р°РµС‚ РµС‘ С‡СѓС‚СЊ РјРµРЅСЊС€Рµ.' },
    { title: `РќРѕРІС‹Р№ С‚СЂСЋРє РІ РєР°СЂРјР°РЅРµ: ${name}.`, text: 'РўРµРїРµСЂСЊ РјРѕР¶РЅРѕ РѕС€РёР±Р°С‚СЊСЃСЏ РµС‰С‘ С‚РµС…РЅРёС‡РЅРµРµ, СЌС„С„РµРєС‚РЅРµРµ Рё СЃ РіРѕСЂР°Р·РґРѕ Р±РѕР»РµРµ СѓРІРµСЂРµРЅРЅС‹Рј РІС‹СЂР°Р¶РµРЅРёРµРј Р»РёС†Р°.' },
    { title: `${name} РІРєР»СЋС‡С‘РЅ РІ РїСЂРѕРіСЂР°РјРјСѓ РЅР°СЃРёР»РёСЏ.`, text: 'Р‘РёР»Рґ РЅР°Р±РёСЂР°РµС‚ С„РѕСЂРјСѓ РєР°Рє СЃС‚РµРЅРґР°Рї РїРѕСЃР»Рµ С‚СЂРµС‚СЊРµРіРѕ СЌСЃРїСЂРµСЃСЃРѕ: РіСЂРѕРјРєРѕ, СЂРµР·РєРѕ Рё СЃ Р»С‘РіРєРѕР№ СѓРіСЂРѕР·РѕР№ РґР»СЏ РјРµР±РµР»Рё.' },
    { title: `РЎРєРёР»Р»-РїРёРє Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅ: ${name}.`, text: 'РџСѓР±Р»РёРєР° РґРµР»Р°РµС‚ РІРёРґ, С‡С‚Рѕ СЌС‚Рѕ Р±С‹Р» РІР·РІРµС€РµРЅРЅС‹Р№ РІС‹Р±РѕСЂ. РњС‹ СЃ РІР°РјРё Р·РЅР°РµРј РїСЂР°РІРґСѓ: С…РѕС‚РµР»РѕСЃСЊ РїСЂРѕСЃС‚Рѕ СЃРґРµР»Р°С‚СЊ РµС‰С‘ РјРѕС‰РЅРµРµ Рё РµС‰С‘ РІРµСЃРµР»РµРµ.' },
  ];
}

function pluralizeRussianSeconds(value) {
  const n = Math.max(0, Math.abs(Number(value) || 0));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '\u0441\u0435\u043a\u0443\u043d\u0434\u0430';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return '\u0441\u0435\u043a\u0443\u043d\u0434\u044b';
  return '\u0441\u0435\u043a\u0443\u043d\u0434';
}

function expandCommentarySpeechText(value) {
  return String(value || '')
    .replace(/(\d+)\s*[СЃc](?=[\s.,!?;:)]|$)/giu, (_, raw) => `${raw} ${pluralizeRussianSeconds(raw)}`)
    .replace(/(\d+)\s*sec\b/gi, (_, raw) => `${raw} ${pluralizeRussianSeconds(raw)}`)
    .replace(/Lv\s*(\d+)/gi, '\u0443\u0440\u043e\u0432\u0435\u043d\u044c $1');
}

function buildSkillPickCommentaryVariants(skillLabel) {
  const name = String(skillLabel || '\u043d\u0430\u0432\u044b\u043a').trim() || '\u043d\u0430\u0432\u044b\u043a';
  return [
    { title: `Р’Р·СЏР»Рё РЅР°РІС‹Рє: ${name}.`, text: 'РћС‚Р»РёС‡РЅРѕ. Р‘РёР»Рґ С‚РѕР»СЊРєРѕ С‡С‚Рѕ СЃС‚Р°Р» Р»РёР±Рѕ СЃРёР»СЊРЅРµРµ, Р»РёР±Рѕ РіРѕСЂР°Р·РґРѕ СЃРјРµС€РЅРµРµ. РЎРєРѕСЂРѕ СѓРІРёРґРёРј, РєР°РєРѕР№ РёРјРµРЅРЅРѕ РІР°СЂРёР°РЅС‚ РІС‹РїР°Р».' },
    { title: `${name} РґРѕР±Р°РІР»РµРЅ РІ Р°СЂСЃРµРЅР°Р».`, text: 'РРіСЂРѕРє РґРµР»Р°РµС‚ СЃРµСЂСЊС‘Р·РЅРѕРµ Р»РёС†Рѕ Рё РІС‹Р±РёСЂР°РµС‚ СЃРµР±Рµ РЅРѕРІС‹Р№ СЃРїРѕСЃРѕР± РїСЂРµРІСЂР°С‰Р°С‚СЊ Р°СЂРµРЅСѓ РІ РїСЂРѕР±Р»РµРјСѓ РґР»СЏ РѕРєСЂСѓР¶Р°СЋС‰РёС….' },
    { title: `${name} РѕС„РёС†РёР°Р»СЊРЅРѕ РІ Р±РёР»РґРµ.`, text: 'РЎС‚СЂР°С‚РµРіРёСЏ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ СѓРјРЅРµРµ РЅР° Р±СѓРјР°РіРµ Рё Р±РµР·СѓРјРЅРµРµ РІ РїСЂСЏРјРѕРј СЌС„РёСЂРµ. РљСЂР°СЃРёРІС‹Рµ РєР°С‚Р°СЃС‚СЂРѕС„С‹ С‚Р°Рє Рё СЂРѕР¶РґР°СЋС‚СЃСЏ.' },
    { title: `РџСЂРѕРєР°С‡РєР° СѓС€Р»Р° РІ СЃС‚РѕСЂРѕРЅСѓ: ${name}.`, text: 'Р“РµСЂРѕР№ СЃРЅРѕРІР° РІС‹Р±РёСЂР°Р» РјРµР¶РґСѓ РѕСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚СЊСЋ Рё С€РѕСѓ. РЎСѓРґСЏ РїРѕ Р°С‚РјРѕСЃС„РµСЂРµ, С€РѕСѓ РїРѕР±РµРґРёР»Рѕ Р±РµР· РѕСЃРѕР±РѕР№ Р±РѕСЂСЊР±С‹.' },
    { title: `${name} РІС‹Р±СЂР°Р»Рё Р±РµР· РїСЂР°РІР° РЅР° РѕС‚РјРµРЅСѓ.`, text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ СѓРІР°Р¶Р°РµС‚ СЃРјРµР»РѕСЃС‚СЊ. РџСЃРёС…РѕС‚РµСЂР°РїРµРІС‚ СЌС‚РѕР№ РєРѕРјРЅР°С‚С‹, РЅР°РІРµСЂРЅРѕРµ, СѓРІР°Р¶Р°РµС‚ РµС‘ С‡СѓС‚СЊ РјРµРЅСЊС€Рµ.' },
    { title: `РќРѕРІС‹Р№ С‚СЂСЋРє РІ РєР°СЂРјР°РЅРµ: ${name}.`, text: 'РўРµРїРµСЂСЊ РјРѕР¶РЅРѕ РѕС€РёР±Р°С‚СЊСЃСЏ С‚РµС…РЅРёС‡РЅРµРµ, СЌС„С„РµРєС‚РЅРµРµ Рё СЃ РіРѕСЂР°Р·РґРѕ Р±РѕР»РµРµ СѓРІРµСЂРµРЅРЅС‹Рј РІС‹СЂР°Р¶РµРЅРёРµРј Р»РёС†Р°.' },
    { title: `${name} РІРєР»СЋС‡С‘РЅ РІ РїСЂРѕРіСЂР°РјРјСѓ С…Р°РѕСЃР°.`, text: 'Р‘РёР»Рґ РЅР°Р±РёСЂР°РµС‚ С„РѕСЂРјСѓ РєР°Рє СЃС‚РµРЅРґР°Рї РїРѕСЃР»Рµ С‚СЂРµС‚СЊРµРіРѕ СЌСЃРїСЂРµСЃСЃРѕ: РіСЂРѕРјРєРѕ, СЂРµР·РєРѕ Рё СЃ Р»С‘РіРєРѕР№ СѓРіСЂРѕР·РѕР№ РґР»СЏ РјРµР±РµР»Рё.' },
    { title: `РЎРєРёР»Р»-РїРёРє Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅ: ${name}.`, text: 'РџСѓР±Р»РёРєР° РґРµР»Р°РµС‚ РІРёРґ, С‡С‚Рѕ СЌС‚Рѕ Р±С‹Р» РІР·РІРµС€РµРЅРЅС‹Р№ РІС‹Р±РѕСЂ. РњС‹ СЃ РІР°РјРё Р·РЅР°РµРј РїСЂР°РІРґСѓ: С…РѕС‚РµР»РѕСЃСЊ РµС‰С‘ РјРѕС‰РЅРµРµ Рё РµС‰С‘ РІРµСЃРµР»РµРµ.' },
    { title: `РќР°РІС‹Рє ${name} Р·Р°РµС…Р°Р» РІ Р±РёР»Рґ.`, text: 'РўРµРїРµСЂСЊ Сѓ РіРµСЂРѕСЏ РµСЃС‚СЊ РµС‰С‘ РѕРґРёРЅ РїРѕРІРѕРґ РіРѕРІРѕСЂРёС‚СЊ, С‡С‚Рѕ РІСЃС‘ Р±С‹Р»Рѕ СЂР°СЃСЃС‡РёС‚Р°РЅРѕ. РћСЃРѕР±РµРЅРЅРѕ РµСЃР»Рё С‡РµСЂРµР· РїСЏС‚СЊ СЃРµРєСѓРЅРґ РЅР°С‡РЅС‘С‚СЃСЏ РёРјРїСЂРѕРІРёР·Р°С†РёСЏ.' },
    { title: `${name} РІС‹Р±СЂР°РЅ СЃ Р»РёС†РѕРј РїСЂРѕС„РµСЃСЃРѕСЂР° С…Р°РѕСЃР°.`, text: 'РЎРµСЂСЊС‘Р·РЅС‹Р№ РІС‹Р±РѕСЂ, СЃРµСЂСЊС‘Р·РЅС‹Рµ РїРѕСЃР»РµРґСЃС‚РІРёСЏ Рё Р°Р±СЃРѕР»СЋС‚РЅРѕ РЅРµСЃРµСЂСЊС‘Р·РЅР°СЏ РЅР°РґРµР¶РґР°, С‡С‚Рѕ РґР°Р»СЊС€Рµ СЃС‚Р°РЅРµС‚ СЃРїРѕРєРѕР№РЅРµРµ.' },
    { title: `Р‘РµСЂС‘Рј ${name}.`, text: 'РџР»Р°РЅ РїСЂРѕСЃС‚: РґРѕР±Р°РІРёС‚СЊ РјРѕС‰РЅРѕСЃС‚Рё, СЃРґРµР»Р°С‚СЊ РІРёРґ, С‡С‚Рѕ СЌС‚Рѕ СЃС‚СЂР°С‚РµРіРёСЏ, Рё РЅРµ СЃРјРѕС‚СЂРµС‚СЊ СЃР»РёС€РєРѕРј РґРѕР»РіРѕ РЅР° РїРѕР»РѕСЃРєСѓ Р·РґРѕСЂРѕРІСЊСЏ.' },
    { title: `${name} С‚РµРїРµСЂСЊ С‡Р°СЃС‚СЊ С…Р°СЂР°РєС‚РµСЂР°.`, text: 'Р‘РёР»Рґ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ РїРѕС…РѕР¶ РЅР° СЂРµР·СЋРјРµ С‡РµР»РѕРІРµРєР°, РєРѕС‚РѕСЂС‹Р№ СѓРјРµРµС‚ СЂРµС€Р°С‚СЊ РїСЂРѕР±Р»РµРјС‹, РЅРѕ РїСЂРµРґРїРѕС‡РёС‚Р°РµС‚ СЃРЅР°С‡Р°Р»Р° СЃРѕР·РґР°С‚СЊ РїР°СЂСѓ РЅРѕРІС‹С….' },
    { title: `РџР»СЋСЃ РѕРґРёРЅ С‚СЂСЋРє: ${name}.`, text: 'РђСЂРµРЅР° РїСЂРѕСЃРёР»Р° РѕСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚Рё, РёРіСЂРѕРє РІС‹Р±СЂР°Р» СЃРїРµС†СЌС„С„РµРєС‚С‹. РћС‡РµРЅСЊ С‡РµСЃС‚РЅС‹Р№ РґРёР°Р»РѕРі РїРѕРєРѕР»РµРЅРёР№.' },
    { title: `${name} РїСЂРёРЅСЏС‚ РІ РєРѕРјР°РЅРґСѓ.`, text: 'Р•СЃР»Рё РЅР°РІС‹Рє СЃСЂР°Р±РѕС‚Р°РµС‚, СЌС‚Рѕ РіРµРЅРёР№. Р•СЃР»Рё РЅРµС‚, РЅР°Р·РѕРІС‘Рј СЌС‚Рѕ СЌРєСЃРїРµСЂРёРјРµРЅС‚РѕРј Рё Р±С‹СЃС‚СЂРѕ СЃРјРµРЅРёРј С‚РµРјСѓ.' },
    { title: `Р’ РјРµРЅСЋ РїСЂРѕРєР°С‡РєРё РїРѕР±РµРґРёР» ${name}.`, text: 'Р”СЂСѓРіРёРµ РІР°СЂРёР°РЅС‚С‹ СЃРјРѕС‚СЂСЏС‚ РІСЃР»РµРґ Рё РґРµР»Р°СЋС‚ РІРёРґ, С‡С‚Рѕ РЅРµ РѕР±РёРґРµР»РёСЃСЊ. РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ, РєРѕРЅРµС‡РЅРѕ, РІСЃС‘ РІРёРґРµР».' },
    { title: `${name} РґРѕР±Р°РІР»РµРЅ РІ Р»РёС‡РЅСѓСЋ РєРѕР»Р»РµРєС†РёСЋ РїР»РѕС…РёС… РёРґРµР№.`, text: 'РџР»РѕС…РёС… РІ С…РѕСЂРѕС€РµРј СЃРјС‹СЃР»Рµ: РіСЂРѕРјРєРёС…, РїРѕР»РµР·РЅС‹С… Рё СЃРїРѕСЃРѕР±РЅС‹С… СѓСЃС‚СЂРѕРёС‚СЊ РЅР° СЌРєСЂР°РЅРµ РјР°Р»РµРЅСЊРєРёР№ РїРѕР¶Р°СЂ.' },
  ];
}

function buildSpectatorSkillPickCommentaryVariants(playerName, skillLabel, level) {
  const who = String(playerName || 'РРіСЂРѕРє').trim() || 'РРіСЂРѕРє';
  const name = String(skillLabel || 'РЅР°РІС‹Рє').trim() || 'РЅР°РІС‹Рє';
  const lvl = Math.max(1, Number(level) || 1);
  return [
    { title: `${who} Р±РµСЂС‘С‚ ${name}.`, text: `РЈСЂРѕРІРµРЅСЊ ${lvl}. Р‘РёР»Рґ РґРµР»Р°РµС‚ С€Р°Рі РІРїРµСЂС‘Рґ, Р° Р·РґСЂР°РІС‹Р№ СЃРјС‹СЃР» Р°РєРєСѓСЂР°С‚РЅРѕ РѕС‚С…РѕРґРёС‚ Рє СЃС‚РµРЅРѕС‡РєРµ.` },
    { title: `${who} РїСЂРѕРєР°С‡Р°Р» ${name}.`, text: `РўРµРїРµСЂСЊ С…Р°РѕСЃ Р±СѓРґРµС‚ РЅРµ РїСЂРѕСЃС‚Рѕ С…Р°РѕСЃРѕРј, Р° С…Р°РѕСЃРѕРј СЃ РїРѕРґРїРёСЃСЊСЋ Рё СѓСЂРѕРІРЅРµРј ${lvl}.` },
    { title: `${name} Сѓ ${who} СѓСЃРёР»РёРІР°РµС‚СЃСЏ.`, text: `РЈСЂРѕРІРµРЅСЊ ${lvl}. РђСЂРµРЅР° РґРµР»Р°РµС‚ РІРёРґ, С‡С‚Рѕ РЅРµ РЅРµСЂРІРЅРёС‡Р°РµС‚, РЅРѕ РјС‹-С‚Рѕ СЃР»С‹С€РёРј СЌС‚РѕС‚ СЃРєСЂРёРї РїРѕР»РѕРІРёС†.` },
    { title: `${who} РІС‹Р±РёСЂР°РµС‚ ${name}.`, text: 'РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ РјРѕРјРµРЅС‚: РёРіСЂРѕРє РЅР°Р¶РёРјР°РµС‚ РєРЅРѕРїРєСѓ, Р° РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ СѓР¶Рµ РїСЂРµРґСЃС‚Р°РІР»СЏРµС‚, РєР°Рє СЌС‚Рѕ РєСЂР°СЃРёРІРѕ РІС‹Р№РґРµС‚ РёР·-РїРѕРґ РєРѕРЅС‚СЂРѕР»СЏ.' },
    { title: `РќР°РІС‹Рє ${name} СѓС€С‘Р» Рє ${who}.`, text: `РЈСЂРѕРІРµРЅСЊ ${lvl}. Р•СЃР»Рё СЌС‚Рѕ Р±С‹Р» РїР»Р°РЅ, С‚Рѕ РѕРЅ СЃС‚Р°Р» РѕСЃС‚СЂРµРµ. Р•СЃР»Рё СЌС‚Рѕ Р±С‹Р»Р° РёРјРїСЂРѕРІРёР·Р°С†РёСЏ, С‚Рѕ РѕРЅР° СЃС‚Р°Р»Р° РґРѕСЂРѕР¶Рµ.` },
    { title: `${who} РґРѕР±Р°РІР»СЏРµС‚ ${name} РІ СЂРµС†РµРїС‚.`, text: 'РџРѕР»СѓС‡Р°РµС‚СЃСЏ Р±Р»СЋРґРѕ РїРѕРґ РЅР°Р·РІР°РЅРёРµРј вЂњРІС‹Р¶РёРІР°РЅРёРµ СЃ РїРµСЂС†РµРјвЂќ. РџРѕРґР°РІР°С‚СЊ РіРѕСЂСЏС‡РёРј, Р¶РµР»Р°С‚РµР»СЊРЅРѕ РЅРµ Р»РёС†РѕРј РІ РїРѕР».' },
    { title: `${name} С‚РµРїРµСЂСЊ СЂР°Р±РѕС‚Р°РµС‚ РЅР° ${who}.`, text: 'РљРѕРЅС‚СЂР°РєС‚ РїРѕРґРїРёСЃР°РЅ РѕРїС‹С‚РѕРј, РЅРµСЂРІР°РјРё Рё Р»С‘РіРєРѕР№ РїР°РЅРёРєРѕР№ РІ РіР»Р°Р·Р°С… Р±Р»РёР¶Р°Р№С€РёС… РІСЂР°РіРѕРІ.' },
    { title: `${who} СѓСЃРёР»РёР» Р±РёР»Рґ С‡РµСЂРµР· ${name}.`, text: 'Р›СЋР±Р»СЋ РїСЂРѕРєР°С‡РєСѓ: РїСЏС‚СЊ СЃРµРєСѓРЅРґ С‚РёС€РёРЅС‹ РІ РјРµРЅСЋ, Рё РІРѕС‚ СѓР¶Рµ РІСЃСЏ Р°СЂРµРЅР° Р·РІСѓС‡РёС‚ РєР°Рє РїР»РѕС…Р°СЏ РёРґРµСЏ СЃ С…РѕСЂРѕС€РёРј Р±СЋРґР¶РµС‚РѕРј.' },
    { title: `${name} РІС‹Р±СЂР°РЅ, ${who} РґРѕРІРѕР»РµРЅ.`, text: 'РџРѕ РєСЂР°Р№РЅРµР№ РјРµСЂРµ, СЃРµР№С‡Р°СЃ РґРѕРІРѕР»РµРЅ. РЎР»РµРґСѓСЋС‰РёРµ РІС…РѕРґСЏС‰РёРµ СѓРґР°СЂС‹ РјРѕРіСѓС‚ РІРЅРµСЃС‚Рё РїСЂР°РІРєРё РІ РЅР°СЃС‚СЂРѕРµРЅРёРµ.' },
    { title: `${who} РЅР°Р¶Р°Р» РЅР° ${name}.`, text: `РЈСЂРѕРІРµРЅСЊ ${lvl}. Р—РІСѓС‡РёС‚ РєР°Рє С‚РµС…РЅРёС‡РµСЃРєРѕРµ СЂРµС€РµРЅРёРµ, РІС‹РіР»СЏРґРёС‚ РєР°Рє РїСЂРёРіР»Р°С€РµРЅРёРµ Рє С€РѕСѓ.` },
  ];
}

function getCommentatorVoice() {
  if (!commentatorSpeech.supported) return null;
  const voices = Array.isArray(window.speechSynthesis?.getVoices?.()) ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return null;
  const maleNamePattern = /(pavel|aleks|alex|dmit|denis|ivan|nikol|maks|maxim|serg|mikhail|mihail|yuri|СЋСЂ|РёРІР°РЅ|РїР°РІРµР»|РґРјРёС‚|Р°Р»РµРєСЃ|СЃРµСЂРі|РјРёС…Р°)/i;
  return voices.find((voice) => /^ru(-|_|$)/i.test(String(voice.lang || '')) && maleNamePattern.test(String(voice.name || '')))
    || voices.find((voice) => /russian/i.test(String(voice.name || '')) && maleNamePattern.test(String(voice.name || '')))
    || voices.find((voice) => /^ru(-|_|$)/i.test(String(voice.lang || '')))
    || voices.find((voice) => /russian/i.test(String(voice.name || '')))
    || voices[0]
    || null;
}

function renderCommentatorVoiceUi() {
  if (commentatorVoiceToggleEl) {
    commentatorVoiceToggleEl.disabled = !commentatorSpeech.supported;
    commentatorVoiceToggleEl.classList.toggle('is-active', commentatorSpeech.supported && commentatorSpeech.enabled);
    commentatorVoiceToggleEl.textContent = commentatorSpeech.supported && commentatorSpeech.enabled ? 'РћР·РІСѓС‡РєР°: РІРєР»' : 'РћР·РІСѓС‡РєР°: РІС‹РєР»';
  }
  if (typeof window.syncCommentatorVoiceSettingToggle === 'function') {
    window.syncCommentatorVoiceSettingToggle(
      commentatorSpeech.supported && commentatorSpeech.enabled,
      !commentatorSpeech.supported,
    );
  }
  if (commentatorVoiceStatusEl) {
    commentatorVoiceStatusEl.textContent = !commentatorSpeech.supported
      ? 'Р‘СЂР°СѓР·РµСЂ РЅРµ РґР°Р» speech synthesis РґР»СЏ РѕР·РІСѓС‡РєРё.'
      : (commentatorSpeech.enabled ? 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ С‚РµРїРµСЂСЊ РіРѕРІРѕСЂРёС‚ РІСЃР»СѓС….' : 'РќР°Р¶РјРё, С‡С‚РѕР±С‹ РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ РЅР°С‡Р°Р» РіРѕРІРѕСЂРёС‚СЊ РІСЃР»СѓС….');
  }
}

function setCommentatorVoiceEnabled(enabled) {
  commentatorSpeech.enabled = Boolean(enabled) && commentatorSpeech.supported;
  try {
    localStorage.setItem(COMMENTATOR_TTS_STORAGE_KEY, commentatorSpeech.enabled ? '1' : '0');
  } catch {
    // ignore storage failures
  }
  if (commentatorSpeech.pendingTimer) {
    window.clearTimeout(commentatorSpeech.pendingTimer);
    commentatorSpeech.pendingTimer = 0;
  }
  if (!commentatorSpeech.enabled && commentatorSpeech.supported) {
    commentatorSpeech.seq += 1;
    commentatorSpeech.activeSinceAt = 0;
    commentatorSpeech.lastQueuedText = '';
    commentatorSpeech.activeKey = '';
    commentatorSpeech.activeText = '';
    commentatorSpeech.queue = [];
    window.speechSynthesis.cancel();
  }
  renderCommentatorVoiceUi();
}
window.setCommentatorVoiceEnabled = setCommentatorVoiceEnabled;
window.renderCommentatorVoiceUi = renderCommentatorVoiceUi;

function normalizeCommentarySpeechKeyPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b[a-z0-9]{5,8}\b/g, '#room')
    .replace(/\b\d{1,2}:\d{2}\b/g, '#time')
    .replace(/\b\d+(?:[.,]\d+)?\b/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCommentaryUrgent(key, spokenText) {
  const sample = `${String(key || '')} ${String(spokenText || '')}`.toLowerCase();
  return /final_death|player_final_death|death|boss|downed|respawn_wait|respawn|critical|low hp|РЅРѕРєР°СѓС‚|РЅРѕРєРґР°СѓРЅ|СѓРјРµСЂ|СЃРјРµСЂС‚|Р±РѕСЃСЃ/.test(sample);
}

function flushCommentarySpeechQueue() {
  if (!commentatorSpeech.supported || !commentatorSpeech.enabled || game.embedMode || document.hidden) return;
  if (commentatorSpeech.pendingTimer) return;
  if (commentatorSpeech.activeText) return;
  if (!commentatorSpeech.queue.length) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    commentatorSpeech.pendingTimer = window.setTimeout(() => {
      commentatorSpeech.pendingTimer = 0;
      flushCommentarySpeechQueue();
    }, 80);
    return;
  }
  const nextItem = commentatorSpeech.queue.shift();
  if (!nextItem?.text) return;
  const { key, text: queuedText } = nextItem;
  const spokenText = expandCommentarySpeechText(queuedText);
  const speakSeq = ++commentatorSpeech.seq;
  commentatorSpeech.activeSinceAt = Date.now();
  commentatorSpeech.activeKey = key || '';
  commentatorSpeech.activeText = spokenText;
  const voice = getCommentatorVoice();
  const utterance = new SpeechSynthesisUtterance(spokenText);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'ru-RU';
  } else {
    utterance.lang = 'ru-RU';
  }
  utterance.rate = 2.8;
  utterance.pitch = 0.92;
  utterance.volume = 0.92;
  utterance.onstart = () => {
    if (speakSeq !== commentatorSpeech.seq) return;
    commentatorSpeech.lastSpokenAt = Date.now();
  };
  utterance.onend = () => {
    if (speakSeq !== commentatorSpeech.seq) return;
    commentatorSpeech.activeSinceAt = 0;
    commentatorSpeech.activeKey = '';
    commentatorSpeech.activeText = '';
    window.setTimeout(flushCommentarySpeechQueue, 40);
  };
  utterance.onerror = () => {
    if (speakSeq !== commentatorSpeech.seq) return;
    commentatorSpeech.activeSinceAt = 0;
    commentatorSpeech.activeKey = '';
    commentatorSpeech.activeText = '';
    window.setTimeout(flushCommentarySpeechQueue, 40);
  };
  try {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  } catch {
    commentatorSpeech.activeSinceAt = 0;
    commentatorSpeech.activeKey = '';
    commentatorSpeech.activeText = '';
    return;
  }
}

function maybeSpeakCommentary(title, text, eventKey) {
  if (!commentatorSpeech.supported || !commentatorSpeech.enabled || game.embedMode || document.hidden) return;
  const spokenText = expandCommentarySpeechText(`${String(title || '').trim()}. ${String(text || '').trim()}`.trim());
  if (!spokenText) return;
  const key = [
    String(eventKey || 'generic').trim().toLowerCase(),
    normalizeCommentarySpeechKeyPart(title),
    normalizeCommentarySpeechKeyPart(text),
  ].join('|');
  const now = Date.now();
  const recentAt = Math.max(0, Number(commentatorSpeech.recentKeys.get(key)) || 0);
  if (recentAt && (now - recentAt) < 12000) return;
  if (commentatorSpeech.activeKey === key) return;
  if (commentatorSpeech.queue.some((item) => item?.key === key)) return;
  const urgent = isCommentaryUrgent(key, spokenText);
  commentatorSpeech.lastKey = key;
  commentatorSpeech.lastQueuedText = spokenText;
  commentatorSpeech.recentKeys.set(key, now);
  for (const [recentKey, stamp] of commentatorSpeech.recentKeys.entries()) {
    if ((now - Math.max(0, Number(stamp) || 0)) > 40000) commentatorSpeech.recentKeys.delete(recentKey);
  }
  if (commentatorSpeech.recentKeys.size > 36) {
    const oldestKey = commentatorSpeech.recentKeys.keys().next().value;
    if (oldestKey) commentatorSpeech.recentKeys.delete(oldestKey);
  }
  if (urgent) {
    commentatorSpeech.queue = [{ key, text: spokenText }];
    if (commentatorSpeech.activeText) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancel failures
      }
      commentatorSpeech.activeSinceAt = 0;
      commentatorSpeech.activeKey = '';
      commentatorSpeech.activeText = '';
    }
  } else if (commentatorSpeech.activeText) {
    commentatorSpeech.queue = [{ key, text: spokenText }];
  } else {
    commentatorSpeech.queue.push({ key, text: spokenText });
    if (commentatorSpeech.queue.length > 2) {
      commentatorSpeech.queue.splice(0, commentatorSpeech.queue.length - 2);
    }
  }
  if (commentatorSpeech.pendingTimer) {
    window.clearTimeout(commentatorSpeech.pendingTimer);
    commentatorSpeech.pendingTimer = 0;
  }
  commentatorSpeech.pendingTimer = window.setTimeout(() => {
    commentatorSpeech.pendingTimer = 0;
    flushCommentarySpeechQueue();
  }, urgent ? 10 : 25);
}

function getExtraCommentaryVariants(eventKey = 'generic') {
  const key = String(eventKey || 'generic').toLowerCase();
  if (key.includes('weapon_pick')) {
    const weaponName = key.replace(/^.*weapon_pick_/, '').replace(/[_-]+/g, ' ').trim() || 'РѕСЂСѓР¶РёРµ';
    const isSmg = /\bsmg\b|РїРї|РїРёСЃС‚РѕР»РµС‚.?РїСѓР»РµРј/.test(weaponName);
    const isShotgun = /shotgun|РґСЂРѕР±/.test(weaponName);
    const isSniper = /sniper|СЃРЅР°Р№РїРµСЂ/.test(weaponName);
    const isPistol = /pistol|РїРёСЃС‚РѕР»РµС‚/.test(weaponName);
    if (isSmg) return [
      { title: 'SMG РїРѕС€С‘Р» РІ СЂСѓРєРё.', text: 'РўРµРїРµСЂСЊ С‚РѕС‡РЅРѕСЃС‚СЊ СЃС‚Р°РЅРѕРІРёС‚СЃСЏ С„РёР»РѕСЃРѕС„СЃРєРёРј РІРѕРїСЂРѕСЃРѕРј, Р·Р°С‚Рѕ С‚РµРјРї Р·РІСѓС‡РёС‚ РєР°Рє СЃРїРѕСЂ РЅР° РїРѕРІС‹С€РµРЅРЅС‹С… РѕР±РѕСЂРѕС‚Р°С….' },
      { title: 'РџРёСЃС‚РѕР»РµС‚-РїСѓР»РµРјС‘С‚ РІ СЌС„РёСЂРµ.', text: 'Р“РµСЂРѕР№ РІС‹Р±СЂР°Р» СЂРµР¶РёРј вЂњРјРЅРѕРіРѕ РјР°Р»РµРЅСЊРєРёС… Р°СЂРіСѓРјРµРЅС‚РѕРІ РїРѕРґСЂСЏРґвЂќ. РњРѕРЅСЃС‚СЂР°Рј СЂРµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ РЅРµ РїРµСЂРµР±РёРІР°С‚СЊ.' },
      { title: 'SMG РІРєР»СЋС‡РёР» СЃРєРѕСЂРѕРіРѕРІРѕСЂРєСѓ.', text: 'РЎС‚РІРѕР» РіРѕРІРѕСЂРёС‚ Р±С‹СЃС‚СЂРѕ, РіРµСЂРѕР№ РґРІРёРіР°РµС‚СЃСЏ Р±С‹СЃС‚СЂРµРµ, Р·РґСЂР°РІС‹Р№ СЃРјС‹СЃР» РїСЂРѕСЃРёС‚ СЃСѓР±С‚РёС‚СЂС‹.' },
      { title: 'РЎРєРѕСЂРѕСЃС‚СЂРµР»СЊРЅРѕСЃС‚СЊ РїСЂРёР±С‹Р»Р°.', text: 'Р•СЃР»Рё РЅРµ РїРѕРїР°РґС‘Рј РїРµСЂРІС‹Рј РІС‹СЃС‚СЂРµР»РѕРј, Сѓ РЅР°СЃ РµСЃС‚СЊ РµС‰С‘ РґРІР°РґС†Р°С‚СЊ РїРѕРїС‹С‚РѕРє РѕР±СЉСЏСЃРЅРёС‚СЊ РїРѕР·РёС†РёСЋ.' },
      { title: 'SMG РґРµР»Р°РµС‚ Р°С‚РјРѕСЃС„РµСЂСѓ РЅРµСЂРІРЅРµРµ.', text: 'РћС‡РµРЅСЊ РґРµР»РѕРІРѕР№ РёРЅСЃС‚СЂСѓРјРµРЅС‚ РґР»СЏ С‚РµС…, РєС‚Рѕ С…РѕС‡РµС‚ РїСЂРѕРјР°С…РёРІР°С‚СЊСЃСЏ СЃС‚Р°С‚РёСЃС‚РёС‡РµСЃРєРё СѓР±РµРґРёС‚РµР»СЊРЅРѕ.' },
      { title: 'РџСѓР»РµРјС‘С‚РЅС‹Р№ СЂРµР¶РёРј РѕС‚РєСЂС‹С‚.', text: 'РђСЂРµРЅР° РїРѕР»СѓС‡Р°РµС‚ Р°СѓРґРёРѕРґРѕСЂРѕР¶РєСѓ РёР· РїР°РЅРёРєРё, РјРµС‚Р°Р»Р»Р° Рё РјР°Р»РµРЅСЊРєРёС… Р±С‹СЃС‚СЂС‹С… СЂРµС€РµРЅРёР№.' },
      { title: 'SMG РІР·СЏР» РјРёРєСЂРѕС„РѕРЅ.', text: 'РўРµРїРµСЂСЊ РєРѕРјРјРµРЅС‚Р°С‚РѕСЂСѓ РїСЂРёРґС‘С‚СЃСЏ РіРѕРІРѕСЂРёС‚СЊ Р±С‹СЃС‚СЂРµРµ, С‡С‚РѕР±С‹ РЅРµ РѕС‚СЃС‚Р°РІР°С‚СЊ РѕС‚ РєРѕР»РёС‡РµСЃС‚РІР° РІС‹СЃС‚СЂРµР»РѕРІ.' },
      { title: 'РЎРєРѕСЂРѕСЃС‚СЊ РІР°Р¶РЅРµРµ РїР°С„РѕСЃР°.', text: 'SMG РЅР°РїРѕРјРёРЅР°РµС‚: РёРЅРѕРіРґР° СЃС‚РёР»СЊ СЌС‚Рѕ РїСЂРѕСЃС‚Рѕ РѕС‡РµРЅСЊ РјРЅРѕРіРѕ РїСѓР»СЊ Р·Р° РєРѕСЂРѕС‚РєРёР№ СЃСЂРѕРє.' },
      { title: 'Р“РµСЂРѕР№ РЅР°С€С‘Р» РєРЅРѕРїРєСѓ вЂњС‡Р°СЃС‚РѕвЂќ.', text: 'РќР°Р¶РёРјР°С‚СЊ РµС‘ Р±СѓРґРµС‚ РїСЂРёСЏС‚РЅРѕ. РљРѕРЅС‚СЂРѕР»РёСЂРѕРІР°С‚СЊ РїРѕСЃР»РµРґСЃС‚РІРёСЏ Р±СѓРґРµС‚ СѓР¶Рµ РѕС‚РґРµР»СЊРЅС‹Рј Р¶Р°РЅСЂРѕРј.' },
      { title: 'SMG РІ РґРµР»Рµ.', text: 'РњРѕРЅСЃС‚СЂС‹ РµС‰С‘ РЅРµ РїРѕРЅСЏР»Рё, С‡С‚Рѕ РЅР°С‡Р°Р»РѕСЃСЊ, РЅРѕ СѓР¶Рµ РїРѕР»СѓС‡РёР»Рё РїРµСЂРІС‹Рµ С‚РµР·РёСЃС‹ РґРѕРєР»Р°РґР°.' },
    ];
    if (isShotgun) return [
      { title: 'Р”СЂРѕР±РѕРІРёРє РІС‹С€РµР» РЅР° Р±Р»РёР·РєРёР№ СЂР°Р·РіРѕРІРѕСЂ.', text: 'Р­С‚Рѕ РѕСЂСѓР¶РёРµ РЅРµ СЃРїРѕСЂРёС‚ РёР·РґР°Р»РµРєР°. РћРЅРѕ РїРѕРґС…РѕРґРёС‚ Рё РіРѕРІРѕСЂРёС‚ РІСЃС‘ СЃСЂР°Р·Сѓ, РєСЂСѓРїРЅС‹Рј С€СЂРёС„С‚РѕРј.' },
      { title: 'Shotgun РїСЂРёРЅСЏС‚ РІ СЃРµРјСЊСЋ.', text: 'РўРµРїРµСЂСЊ РєР°Р¶РґС‹Р№ РїСЂРѕРјР°С… Р±СѓРґРµС‚ РіСЂРѕРјРєРёРј, Р° РєР°Р¶РґРѕРµ РїРѕРїР°РґР°РЅРёРµ Р±СѓРґРµС‚ Р·РІСѓС‡Р°С‚СЊ РєР°Рє Р·Р°РєСЂС‹С‚Р°СЏ РґРІРµСЂСЊ.' },
      { title: 'Р”СЂРѕР±РѕРІРёРє Р»СЋР±РёС‚ Р»РёС‡РЅС‹Рµ РіСЂР°РЅРёС†С‹.', text: 'РўРѕС‡РЅРµРµ, Р»СЋР±РёС‚ РёС… РЅР°СЂСѓС€Р°С‚СЊ. РћС‡РµРЅСЊ РіСЂРѕРјРєРѕ Рё СЃ СѓР±РµРґРёС‚РµР»СЊРЅС‹Рј СЂР°Р·Р»С‘С‚РѕРј Р°СЂРіСѓРјРµРЅС‚РѕРІ.' },
      { title: 'Р‘Р»РёР¶РЅРёР№ Р±РѕР№ СЃС‚Р°Р» РіСЂРѕРјС‡Рµ.', text: 'РњРѕРЅСЃС‚СЂР°Рј Р»СѓС‡С€Рµ РґРµСЂР¶Р°С‚СЊ РґРёСЃС‚Р°РЅС†РёСЋ. РћРЅРё, РєРѕРЅРµС‡РЅРѕ, РЅРµ Р±СѓРґСѓС‚, РїРѕСЌС‚РѕРјСѓ Р±СѓРґРµС‚ РєСЂР°СЃРёРІРѕ.' },
      { title: 'Р“РµСЂРѕР№ РЅР°С€С‘Р» РґСЂРѕР±РѕРІРёРє.', text: 'Р­С‚Рѕ С‚РѕС‚ СЂРµРґРєРёР№ РјРѕРјРµРЅС‚, РєРѕРіРґР° вЂњРїРѕРґРѕР№С‚Рё РїРѕР±Р»РёР¶РµвЂќ Р·РІСѓС‡РёС‚ РєР°Рє СѓРіСЂРѕР·Р° Рё РїР»Р°РЅ РѕРґРЅРѕРІСЂРµРјРµРЅРЅРѕ.' },
      { title: 'Shotgun Р·Р°СЂСЏР¶РµРЅ РЅР°СЃС‚СЂРѕРµРЅРёРµРј.', text: 'РќР°СЃС‚СЂРѕРµРЅРёРµ Сѓ РЅРµРіРѕ РїСЂРѕСЃС‚РѕРµ: РІСЃРµ РІРѕРїСЂРѕСЃС‹ СЂРµС€Р°С‚СЊ РѕРґРЅРёРј С€РёСЂРѕРєРёРј Р¶РµСЃС‚РѕРј.' },
      { title: 'Р”СЂРѕР±СЊ РїРѕС€Р»Р° РІ СЌС„РёСЂ.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ СЃР»С‹С€РёС‚ СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ, Р°СЂРµРЅР° СЃР»С‹С€РёС‚ С€СѓРј, РІСЂР°РіРё СЃР»С‹С€Р°С‚ РїР»РѕС…РёРµ РЅРѕРІРѕСЃС‚Рё.' },
      { title: 'Р”СЂРѕР±РѕРІРёРє РґРѕР±Р°РІРёР» РґСЂР°РјСѓ.', text: 'РўРµРїРµСЂСЊ РєР°Р¶РґС‹Р№ РєРѕСЂРёРґРѕСЂ РІС‹РіР»СЏРґРёС‚ РєР°Рє РїСЂРёРіР»Р°С€РµРЅРёРµ Рє РЅРµРїСЂРёСЏС‚РЅРѕРјСѓ РґРёР°Р»РѕРіСѓ.' },
      { title: 'Р‘РѕР»СЊС€РѕР№ С…Р»РѕРїРѕРє РІ РјР°Р»РµРЅСЊРєРѕРј СЂР°РґРёСѓСЃРµ.', text: 'РРґРµР°Р»СЊРЅРѕ РґР»СЏ СЃРёС‚СѓР°С†РёР№, РіРґРµ С‚Р°РєС‚РёРєР° Р·Р°РєРѕРЅС‡РёР»Р°СЃСЊ, Р° СЌРјРѕС†РёРё С‚РѕР»СЊРєРѕ РЅР°С‡Р°Р»РёСЃСЊ.' },
      { title: 'Shotgun РіРѕРІРѕСЂРёС‚ РєРѕСЂРѕС‚РєРѕ.', text: 'РќРѕ С‚Р°Рє РіСЂРѕРјРєРѕ, С‡С‚Рѕ РґР°Р¶Рµ СЃС‚Р°С‚РёСЃС‚РёРєР° РґРµР»Р°РµС‚ С€Р°Рі РЅР°Р·Р°Рґ.' },
    ];
    if (isSniper) return [
      { title: 'РЎРЅР°Р№РїРµСЂРєР° РІ СЂСѓРєР°С….', text: 'РўРµРїРµСЂСЊ РјРѕР¶РЅРѕ СЂРµС€Р°С‚СЊ РїСЂРѕР±Р»РµРјС‹ СЃ С‚Р°РєРѕРіРѕ СЂР°СЃСЃС‚РѕСЏРЅРёСЏ, РіРґРµ СЃРѕРІРµСЃС‚СЊ СѓР¶Рµ РїР»РѕС…Рѕ РґРѕР±РёРІР°РµС‚.' },
      { title: 'Sniper РґРѕР±Р°РІР»РµРЅ РІ СЌС„РёСЂ.', text: 'Р“РµСЂРѕР№ РІС‹Р±СЂР°Р» СЃС‚РёР»СЊ вЂњРѕРґРЅРѕ РјРЅРµРЅРёРµ, РЅРѕ РѕС‡РµРЅСЊ СѓР±РµРґРёС‚РµР»СЊРЅРѕРµвЂќ.' },
      { title: 'Р”Р°Р»СЊРЅСЏСЏ РґРёСЃС‚Р°РЅС†РёСЏ РѕС‚РєСЂС‹С‚Р°.', text: 'РњРѕРЅСЃС‚СЂС‹ РµС‰С‘ РёРґСѓС‚, Р° Сѓ РЅРёС… СѓР¶Рµ РµСЃС‚СЊ РЅРµРїСЂРёСЏС‚РЅРѕРµ РїСЂРµРґС‡СѓРІСЃС‚РІРёРµ РІ СЂР°Р№РѕРЅРµ РіРѕР»РѕРІС‹.' },
      { title: 'РЎРЅР°Р№РїРµСЂСЃРєРёР№ Р°СЂРіСѓРјРµРЅС‚ РЅР°Р№РґРµРЅ.', text: 'Р РµРґРєРёР№ СЃР»СѓС‡Р°Р№, РєРѕРіРґР° РїР°СѓР·Р° РїРµСЂРµРґ РІС‹СЃС‚СЂРµР»РѕРј Р·РІСѓС‡РёС‚ СЃС‚СЂР°С€РЅРµРµ СЃР°РјРѕР№ СЃС‚СЂРµР»СЊР±С‹.' },
      { title: 'Sniper РїСЂРѕСЃРёС‚ С‚РёС€РёРЅС‹.', text: 'РђСЂРµРЅР°, РєРѕРЅРµС‡РЅРѕ, РЅРµ РґР°СЃС‚. РќРѕ СЃР°РјРѕСѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ РєСЂР°СЃРёРІР°СЏ.' },
      { title: 'РћРґРёРЅ РІС‹СЃС‚СЂРµР», РјРЅРѕРіРѕ СЃРјС‹СЃР»Р°.', text: 'РЎРЅР°Р№РїРµСЂРєР° РЅР°РїРѕРјРёРЅР°РµС‚: РёРЅРѕРіРґР° РјРёРЅРёРјР°Р»РёР·Рј С‚РѕР¶Рµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РіСЂСѓР±С‹Рј.' },
      { title: 'Р“РµСЂРѕР№ РІР·СЏР» РґР»РёРЅРЅСѓСЋ РјС‹СЃР»СЊ.', text: 'РћРЅР° Р»РµС‚РёС‚ РґР°Р»РµРєРѕ, Р±СЊС‘С‚ Р±РѕР»СЊРЅРѕ Рё РїР»РѕС…Рѕ РІРѕСЃРїСЂРёРЅРёРјР°РµС‚ РєСЂРёС‚РёРєСѓ.' },
      { title: 'РЎРЅР°Р№РїРµСЂСЃРєРёР№ СЂРµР¶РёРј Р°РєС‚РёРІРµРЅ.', text: 'РўРµРїРµСЂСЊ РїСЂРѕРјР°С…Рё Р±СѓРґСѓС‚ СЂРµРґРєРёРјРё, Р·Р°РјРµС‚РЅС‹РјРё Рё СЌРјРѕС†РёРѕРЅР°Р»СЊРЅРѕ РґРѕСЂРѕРіРёРјРё.' },
      { title: 'Sniper СЃРјРѕС‚СЂРёС‚ РІРґР°Р»СЊ.', text: 'Р РґР°Р»СЊ, РµСЃР»Рё С‡РµСЃС‚РЅРѕ, СѓР¶Рµ РЅРµРјРЅРѕРіРѕ РЅРµСЂРІРЅРёС‡Р°РµС‚.' },
      { title: 'РўРѕС‡РЅРѕСЃС‚СЊ РїРѕР»СѓС‡РёР»Р° РјРёРєСЂРѕС„РѕРЅ.', text: 'Р•СЃР»Рё РїРѕРїР°РґС‘С‚, Р±СѓРґРµС‚ РєСЂР°СЃРёРІРѕ. Р•СЃР»Рё РЅРµС‚, СЃРґРµР»Р°РµРј РІРёРґ, С‡С‚Рѕ СЌС‚Рѕ Р±С‹Р» РїСЂРµРґСѓРїСЂРµРґРёС‚РµР»СЊРЅС‹Р№.' },
    ];
    if (isPistol) return [
      { title: 'РџРёСЃС‚РѕР»РµС‚ СЃРЅРѕРІР° РІ РєР°РґСЂРµ.', text: 'РЎРєСЂРѕРјРЅРѕ, С‡РµСЃС‚РЅРѕ, Р±РµР· Р»РёС€РЅРµРіРѕ РїР°С„РѕСЃР°. РљР°Рє Р±СѓС‚РµСЂР±СЂРѕРґ РІ РјРёСЂРµ Р±РѕРµРІРѕР№ РєСѓР»РёРЅР°СЂРёРё.' },
      { title: 'Pistol РґРµСЂР¶РёС‚ Р±Р°Р·Сѓ.', text: 'РќРµ СЃР°РјС‹Р№ РіСЂРѕРјРєРёР№ РёРЅСЃС‚СЂСѓРјРµРЅС‚, Р·Р°С‚Рѕ РІСЃРµРіРґР° СЂСЏРґРѕРј, РєРѕРіРґР° РґРѕСЂРѕРіРёРµ РёРіСЂСѓС€РєРё Р·Р°РєР°РЅС‡РёРІР°СЋС‚ РїР°С‚СЂРѕРЅС‹.' },
      { title: 'РџРёСЃС‚РѕР»РµС‚ РІС‹Р±СЂР°РЅ.', text: 'РљР»Р°СЃСЃРёРєР° Р¶Р°РЅСЂР°: РјР°Р»РµРЅСЊРєРёР№ СЃС‚РІРѕР», Р±РѕР»СЊС€РёРµ РЅР°РґРµР¶РґС‹, СЃСЂРµРґРЅСЏСЏ С‚СЂРµРІРѕР¶РЅРѕСЃС‚СЊ.' },
      { title: 'Р‘Р°Р·РѕРІС‹Р№ Р°СЂРіСѓРјРµРЅС‚ РіРѕС‚РѕРІ.', text: 'РџРёСЃС‚РѕР»РµС‚ РЅРµ РѕР±РµС‰Р°РµС‚ С‡СѓРґРµСЃ. РћРЅ РїСЂРѕСЃС‚Рѕ РїСЂРёС…РѕРґРёС‚ РЅР° СЂР°Р±РѕС‚Сѓ Рё РґРµР»Р°РµС‚ вЂњРїРёС„вЂќ.' },
      { title: 'Pistol Р±РµР· Р»РёС€РЅРµРіРѕ С€РѕСѓ.', text: 'РРЅРѕРіРґР° РІС‹Р¶РёРІР°РЅРёРµ РЅР°С‡РёРЅР°РµС‚СЃСЏ СЃ РїСЂРѕСЃС‚РѕРіРѕ: РЅР°Р¶РёРјР°С‚СЊ, РѕС‚С…РѕРґРёС‚СЊ, РЅРµ СЃРїРѕСЂРёС‚СЊ СЃ С‚РѕР»РїРѕР№ Р»РёС†РѕРј.' },
      { title: 'РџРёСЃС‚РѕР»РµС‚ Р·РІСѓС‡РёС‚ СЃРїРѕРєРѕР№РЅРѕ.', text: 'Р­С‚Рѕ СЃРїРѕРєРѕР№СЃС‚РІРёРµ, РїСЂР°РІРґР°, РґРµСЂР¶РёС‚СЃСЏ СЂРѕРІРЅРѕ РґРѕ РїРµСЂРІРѕРіРѕ РѕРєСЂСѓР¶РµРЅРёСЏ.' },
      { title: 'Р“РµСЂРѕР№ РІРµСЂРЅСѓР»СЃСЏ Рє РєР»Р°СЃСЃРёРєРµ.', text: 'РљРѕРіРґР° РІСЃС‘ СЃР»РѕР¶РЅРѕРµ Р·Р°РєРѕРЅС‡РёР»РѕСЃСЊ, РѕСЃС‚Р°С‘С‚СЃСЏ С‡РµСЃС‚РЅР°СЏ РјР°Р»РµРЅСЊРєР°СЏ РјР°С€РёРЅРєР° РґР»СЏ РїСЂРѕР±Р»РµРј.' },
      { title: 'Pistol РїРѕРєР°Р·С‹РІР°РµС‚ С…Р°СЂР°РєС‚РµСЂ.', text: 'РЎ РІРёРґСѓ СЃРєСЂРѕРјРЅС‹Р№, РЅРѕ РІ С…РѕСЂРѕС€РёС… СЂСѓРєР°С… СЃРїРѕСЃРѕР±РµРЅ РёСЃРїРѕСЂС‚РёС‚СЊ РґРµРЅСЊ РѕС‡РµРЅСЊ РјРЅРѕРіРёРј.' },
      { title: 'РџРёСЃС‚РѕР»РµС‚ РІ РґРµР»Рµ.', text: 'РќРµ СЂРѕСЃРєРѕС€СЊ, РЅРµ С„РµР№РµСЂРІРµСЂРє, Р·Р°С‚Рѕ РїРѕРЅСЏС‚РЅС‹Р№ СЏР·С‹Рє РґР»СЏ СЂР°Р·РіРѕРІРѕСЂР° СЃ Р±Р»РёР¶Р°Р№С€РёРјРё РЅРµРїСЂРёСЏС‚РЅРѕСЃС‚СЏРјРё.' },
      { title: 'Р‘Р°Р·РѕРІС‹Р№ РЅР°Р±РѕСЂ РІС‹Р¶РёРІР°РЅРёСЏ Р°РєС‚РёРІРµРЅ.', text: 'РџРёСЃС‚РѕР»РµС‚, РЅРѕРіРё Рё РЅР°РґРµР¶РґР°. РљРѕРјРїР»РµРєС‚ СЃРѕРјРЅРёС‚РµР»СЊРЅС‹Р№, РЅРѕ РёСЃС‚РѕСЂРёС‡РµСЃРєРё СЂР°Р±РѕС‡РёР№.' },
    ];
    return [
      { title: 'РќРѕРІРѕРµ РѕСЂСѓР¶РёРµ РІ СЂСѓРєР°С….', text: 'РђСЂРµРЅР° РІС‹РґР°Р»Р° РёРЅСЃС‚СЂСѓРјРµРЅС‚, РіРµСЂРѕР№ РІС‹РґР°Р» СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ, РїРѕСЃР»РµРґСЃС‚РІРёСЏ СѓР¶Рµ РѕС„РѕСЂРјР»СЏСЋС‚ Р·Р°СЏРІРєСѓ.' },
      { title: 'РЎС‚РІРѕР» РЅР°Р№РґРµРЅ.', text: 'Р­С‚Рѕ РІСЃРµРіРґР° РїСЂРёСЏС‚РЅРѕ: РµС‰С‘ РѕРґРЅР° Р¶РµР»РµР·РєР°, РєРѕС‚РѕСЂР°СЏ РјРѕР¶РµС‚ РїСЂРµРІСЂР°С‚РёС‚СЊ РїР»Р°РЅ РІ С€СѓРј.' },
      { title: 'РћСЂСѓР¶РёРµ РІСЃС‚СѓРїР°РµС‚ РІ СЌС„РёСЂ.', text: 'РџСѓР±Р»РёРєР° Р¶РґС‘С‚ С‚РµСЃС‚, РІСЂР°РіРё Р¶РґСѓС‚ РїР»РѕС…Рѕ, РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ Р¶РґС‘С‚ РјР°С‚РµСЂРёР°Р» РґР»СЏ СЃР°СЂРєР°Р·РјР°.' },
      { title: 'Р›СѓС‚ РґР°Р» РЅРѕРІС‹Р№ Р°СЂРіСѓРјРµРЅС‚.', text: 'Р“Р»Р°РІРЅРѕРµ С‚РµРїРµСЂСЊ РЅРµ РїРµСЂРµРїСѓС‚Р°С‚СЊ Р°СЂРіСѓРјРµРЅС‚ СЃ СЃР°РјРѕСѓРІРµСЂРµРЅРЅРѕСЃС‚СЊСЋ. РҐРѕС‚СЏ РєС‚Рѕ РЅР°СЃ РѕСЃС‚Р°РЅРѕРІРёС‚.' },
      { title: 'Р“РµСЂРѕР№ РѕР±РЅРѕРІРёР» РєРѕРјРїР»РµРєС‚ Р±РѕР»Рё.', text: 'РЎС‚Р°СЂС‹Рµ РѕС€РёР±РєРё С‚РµРїРµСЂСЊ РјРѕР¶РЅРѕ СЃРѕРІРµСЂС€Р°С‚СЊ РЅРѕРІС‹Рј СЃРїРѕСЃРѕР±РѕРј. РџСЂРѕРіСЂРµСЃСЃ, РєР°Рє РЅРё РєСЂСѓС‚Рё.' },
      { title: 'РќРѕРІР°СЏ Р¶РµР»РµР·РєР° РїСЂРёРЅСЏС‚Р°.', text: 'РћРЅР° РїРѕРєР° Р±Р»РµСЃС‚РёС‚ Рё РјРѕР»С‡РёС‚. РЎРєРѕСЂРѕ Р±СѓРґРµС‚ Р±Р»РµСЃС‚РµС‚СЊ, С€СѓРјРµС‚СЊ Рё РґРµР»Р°С‚СЊ РІРёРґ, С‡С‚Рѕ С‚Р°Рє РЅР°РґРѕ.' },
      { title: 'РћСЂСѓР¶РµР№РЅС‹Р№ СЃР»РѕС‚ РѕР¶РёРІРёР»СЃСЏ.', text: 'РќР°РґРµР¶РґР° СЃС‚Р°Р»Р° С‚СЏР¶РµР»РµРµ, РіСЂРѕРјС‡Рµ Рё РїРѕС‚РµРЅС†РёР°Р»СЊРЅРѕ РѕРїР°СЃРЅРµРµ РґР»СЏ РІСЃРµС… СЂСЏРґРѕРј.' },
      { title: 'РђСЂСЃРµРЅР°Р» СЃС‚Р°Р» РёРЅС‚РµСЂРµСЃРЅРµРµ.', text: 'РРЅС‚РµСЂРµСЃРЅРµРµ РЅРµ Р·РЅР°С‡РёС‚ Р±РµР·РѕРїР°СЃРЅРµРµ. РќРѕ РјС‹ Р¶Рµ С‚СѓС‚ РЅРµ Р·Р° Р±РµР·РѕРїР°СЃРЅРѕСЃС‚СЊСЋ.' },
    ];
  }
  if (key.startsWith('boss_countdown')) return [
    { title: 'Р‘РѕСЃСЃ СѓР¶Рµ РїРѕС‡С‚Рё РЅР° РїРѕСЂРѕРіРµ.', text: 'РџРѕСЃР»РµРґРЅРёРµ СЃРµРєСѓРЅРґС‹ СЃРїРѕРєРѕР№СЃС‚РІРёСЏ. РњРѕР¶РЅРѕ СЃРѕР±СЂР°С‚СЊСЃСЏ, РјРѕР¶РЅРѕ РґСЂР°РјР°С‚РёС‡РЅРѕ РјРѕСЂРіРЅСѓС‚СЊ РІ РєР°РјРµСЂСѓ.' },
    { title: 'РќР°С‡Р°Р»СЊСЃС‚РІРѕ СЃРєРѕСЂРѕ РІС‹Р№РґРµС‚ РІ Р·Р°Р».', text: 'Р•СЃР»Рё Сѓ РєРѕРіРѕ-С‚Рѕ Р±С‹Р» РїР»Р°РЅ, СЃРµР№С‡Р°СЃ СЃР°РјРѕРµ РІСЂРµРјСЏ РІСЃРїРѕРјРЅРёС‚СЊ С…РѕС‚СЏ Р±С‹ РµРіРѕ РЅР°Р·РІР°РЅРёРµ.' },
    { title: 'РћС‚СЃС‡С‘С‚ РїР°С…РЅРµС‚ РїСЂРѕР±Р»РµРјР°РјРё.', text: 'РђСЂРµРЅР° Р°РєРєСѓСЂР°С‚РЅРѕ РїРѕРґР°С‘С‚ СЃРёРіРЅР°Р»: РґР°Р»СЊС€Рµ Р±СѓРґРµС‚ РЅРµ С„Р°СЂРј, Р° СЃРѕР±РµСЃРµРґРѕРІР°РЅРёРµ РЅР° РІС‹Р¶РёРІР°РЅРёРµ.' },
    { title: 'Р”Рѕ Р±РѕСЃСЃР° РѕСЃС‚Р°Р»РѕСЃСЊ СЃРѕРІСЃРµРј РЅРµРјРЅРѕРіРѕ.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ СЂРµРєРѕРјРµРЅРґСѓРµС‚ РіР»СѓР±РѕРєРёР№ РІРґРѕС…. РђСЂРµРЅР° СЂРµРєРѕРјРµРЅРґСѓРµС‚ РЅРµ СЂР°СЃСЃС‡РёС‚С‹РІР°С‚СЊ РЅР° СЂРµРєРѕРјРµРЅРґР°С†РёРё.' },
    { title: 'Р‘РѕР»СЊС€Р°СЏ РІСЃС‚СЂРµС‡Р° СѓР¶Рµ СЂСЏРґРѕРј.', text: 'Р’СЃРµ РґРµР»Р°СЋС‚ РІРёРґ, С‡С‚Рѕ РіРѕС‚РѕРІС‹. РћСЃРѕР±РµРЅРЅРѕ С‚Рµ, РєС‚Рѕ РЅРµ РіРѕС‚РѕРІ РІРѕРѕР±С‰Рµ.' },
  ];
  if (key.includes('skill_pick')) return [
    { title: 'РќР°РІС‹Рє РїРѕРґРѕР±СЂР°РЅ, СЃР°РјРѕРѕС†РµРЅРєР° РІС‹СЂРѕСЃР»Р°.', text: 'РўРµРїРµСЂСЊ Р±РёР»Рґ РІС‹РіР»СЏРґРёС‚ СѓРјРЅРµРµ, С‡РµРј РїСЏС‚СЊ СЃРµРєСѓРЅРґ РЅР°Р·Р°Рґ. РџСЂР°РІРґР°, РІСЂР°РіРё СЌС‚Рѕ С‚РѕР¶Рµ Р·Р°РјРµС‚РёР»Рё Рё СѓР¶Рµ РїРёС€СѓС‚ Р¶Р°Р»РѕР±Сѓ.' },
    { title: 'Р“РµСЂРѕР№ РЅР°С€С‘Р» РЅРѕРІСѓСЋ РєРЅРѕРїРєСѓ РЅР°РґРµР¶РґС‹.', text: 'РћС‡РµРЅСЊ РїРѕР»РµР·РЅРѕ: РЅР°Р¶РёРјР°РµС€СЊ, СЃС‚Р°РЅРѕРІРёС‚СЃСЏ РІРµСЃРµР»РµРµ, РѕРїР°СЃРЅРµРµ Рё РїРѕС‡РµРјСѓ-С‚Рѕ РіСЂРѕРјС‡Рµ.' },
    { title: 'РџСЂРѕРєР°С‡РєР° Р·Р°С€Р»Р° РІ РѕСЂРіР°РЅРёР·Рј.', text: 'РђСЂРµРЅР° СЃРґРµР»Р°Р»Р° РІРёРґ, С‡С‚Рѕ РЅРµ РёСЃРїСѓРіР°Р»Р°СЃСЊ, РЅРѕ РіРґРµ-С‚Рѕ РІ РєРѕРґРµ Сѓ РІСЂР°РіРѕРІ РґСЂРѕРіРЅСѓР»Рѕ РєРѕР»РµРЅРѕ.' },
    { title: 'РќРѕРІС‹Р№ РЅР°РІС‹Рє РІ РєР°СЂРјР°РЅРµ.', text: 'РљР°СЂРјР°РЅ С‚РµРїРµСЂСЊ РІР°Р¶РЅРёС‡Р°РµС‚, РіРµСЂРѕР№ СЃС‚СЂРѕРёС‚ РїР»Р°РЅС‹, Р±Р°Р»Р°РЅСЃ РЅРµСЂРІРЅРѕ РїСЂРѕРІРµСЂСЏРµС‚ СЃС‚СЂР°С…РѕРІРєСѓ.' },
    { title: 'Р‘РёР»Рґ РїРѕР»СѓС‡РёР» СЃРІРµР¶РёР№ СЃРѕСѓСЃ.', text: 'Р‘С‹Р»Рѕ РѕСЃС‚СЂРѕ, СЃС‚Р°Р»Рѕ РµС‰С‘ РѕСЃС‚СЂРµРµ. Р“РґРµ-С‚Рѕ СЂСЏРґРѕРј РІСЂР°Рі СѓР¶Рµ РїРѕР¶Р°Р»РµР», С‡С‚Рѕ СѓРјРµРµС‚ С…РѕРґРёС‚СЊ.' },
    { title: 'Р“РµСЂРѕР№ Р°РїРіСЂРµР№РґРЅСѓР»СЃСЏ Р±РµР· Р»РёС€РЅРµР№ СЃРєСЂРѕРјРЅРѕСЃС‚Рё.', text: 'РџСЂР°РІРёР»СЊРЅС‹Р№ РЅР°СЃС‚СЂРѕР№: РµСЃР»Рё СѓР¶ РІС‹Р¶РёРІР°С‚СЊ, С‚Рѕ СЃ СЌС„С„РµРєС‚Р°РјРё Рё РѕС‰СѓС‰РµРЅРёРµРј РЅРµР·Р°РєРѕРЅРЅРѕРіРѕ РїСЂРµРёРјСѓС‰РµСЃС‚РІР°.' },
    { title: 'РњРµРЅСЋ СѓРјРµРЅРёР№ СЃРЅРѕРІР° РїСЂРёРЅРµСЃР»Рѕ С…Р°СЂР°РєС‚РµСЂ.', text: 'РРіСЂРѕРє РІС‹Р±СЂР°Р» РєРЅРѕРїРєСѓ, Р° СЃСѓРґСЊР±Р° СѓР¶Рµ РѕС‚РєСЂС‹Р»Р° Р±Р»РѕРєРЅРѕС‚ РґР»СЏ Р·Р°РјРµС‡Р°РЅРёР№.' },
    { title: 'РџСЂРѕРєР°С‡РєР° РґРµР»Р°РµС‚ С€РѕСѓ С‚РѕР»С‰Рµ.', text: 'РўРµРїРµСЂСЊ Сѓ Р·Р°Р±РµРіР° Р±РѕР»СЊС€Рµ РјРµС…Р°РЅРёРє, Р±РѕР»СЊС€Рµ РЅР°РґРµР¶РґС‹ Рё Р±РѕР»СЊС€Рµ СЃРїРѕСЃРѕР±РѕРІ РєСЂР°СЃРёРІРѕ РѕС€РёР±РёС‚СЊСЃСЏ.' },
    { title: 'РќР°РІС‹Рє РїСЂРёРЅСЏС‚ Р±РµР· Р»РёС€РЅРёС… РІРѕРїСЂРѕСЃРѕРІ.', text: 'Р’РѕРїСЂРѕСЃС‹ РїРѕСЏРІСЏС‚СЃСЏ РїРѕР·Р¶Рµ, РєРѕРіРґР° РІСЃСЏ СЌС‚Р° РєСЂР°СЃРѕС‚Р° РЅР°С‡РЅС‘С‚ СЂР°Р±РѕС‚Р°С‚СЊ СЂСЏРґРѕРј СЃ Р»РёС†РѕРј РіРµСЂРѕСЏ.' },
    { title: 'Р‘РёР»Рґ РїРѕР»СѓС‡РёР» РЅРѕРІСѓСЋ СЃРїРµС†РёСЋ.', text: 'Р•СЃР»Рё СЃС‚Р°РЅРµС‚ РІРєСѓСЃРЅРѕ, СЃРєР°Р¶РµРј вЂњС‚Р°Рє Рё РїР»Р°РЅРёСЂРѕРІР°Р»РёвЂќ. Р•СЃР»Рё РѕСЃС‚СЂРѕ, С‚РѕР¶Рµ СЃРєР°Р¶РµРј вЂњС‚Р°Рє Рё РїР»Р°РЅРёСЂРѕРІР°Р»РёвЂќ.' },
    { title: 'Р’С‹Р±РѕСЂ СѓРјРµРЅРёСЏ Р·Р°СЃС‡РёС‚Р°РЅ.', text: 'Р­С‚Рѕ С‚РѕС‚ РјРѕРјРµРЅС‚, РєРѕРіРґР° СЃС‚СЂР°С‚РµРіРёСЏ РЅР°РґРµРІР°РµС‚ СЃРѕР»РЅРµС‡РЅС‹Рµ РѕС‡РєРё Рё РґРµР»Р°РµС‚ РІРёРґ, С‡С‚Рѕ РєРѕРЅС‚СЂРѕР»РёСЂСѓРµС‚ С…Р°РѕСЃ.' },
  ];
  if (key.includes('kill_milestone') || key.startsWith('kills_')) return [
    { title: 'РЎС‡С‘С‚С‡РёРє РІСЂР°РіРѕРІ Р±РѕРґСЂРѕ СЂР°Р·РіРѕРЅСЏРµС‚СЃСЏ.', text: 'РќР° Р°СЂРµРЅРµ СЃРЅРѕРІР° РјРёРЅСѓСЃ РїР°С‡РєР° РїСЂРѕР±Р»РµРј Рё РїР»СЋСЃ РїР°С‡РєР° СЃР°РјРѕСѓРІРµСЂРµРЅРЅРѕСЃС‚Рё.' },
    { title: 'РЈР±РёР№СЃС‚РІР° РёРґСѓС‚ РїР»РѕС‚РЅС‹Рј РіСЂР°С„РёРєРѕРј.', text: 'Р•СЃР»Рё Р±С‹ Сѓ С…Р°РѕСЃР° Р±С‹Р» Р±СѓС…РіР°Р»С‚РµСЂ, РѕРЅ Р±С‹ СЃРµР№С‡Р°СЃ РЅРµСЂРІРЅРѕ РѕР±РЅРѕРІР»СЏР» С‚Р°Р±Р»РёС†Сѓ.' },
    { title: 'РўРµРјРї РјСЏСЃРѕСЂСѓР±РєРё РїСЂРёР»РёС‡РЅС‹Р№.', text: 'Р“РµСЂРѕР№ РЅРµ РїСЂРѕСЃС‚Рѕ РІС‹Р¶РёРІР°РµС‚, РѕРЅ РµС‰С‘ Рё РґРµР»Р°РµС‚ СЌС‚Рѕ СЃ РїСЂРѕРёР·РІРѕРґСЃС‚РІРµРЅРЅС‹Рј РїР»Р°РЅРѕРј.' },
    { title: 'Р’СЂР°РіРё РёСЃС‡РµР·Р°СЋС‚ СЃ РїРѕРґРѕР·СЂРёС‚РµР»СЊРЅРѕР№ СЂРµРіСѓР»СЏСЂРЅРѕСЃС‚СЊСЋ.', text: 'РћС‡РµРЅСЊ Р±РѕРґСЂС‹Р№ Р·Р°Р±РµРі. РћС‡РµРЅСЊ РїР»РѕС…РѕР№ РґРµРЅСЊ РґР»СЏ РІСЃРµРіРѕ, С‡С‚Рѕ СЂРµС€РёР»Рѕ РїРѕРґРѕР№С‚Рё Р±Р»РёР¶Рµ.' },
    { title: 'РђСЂРµРЅР° СЃС‡РёС‚Р°РµС‚ РїРѕС‚РµСЂРё Рё РґРµР»Р°РµС‚ РІРёРґ, С‡С‚Рѕ РІСЃС‘ РЅРѕСЂРјР°Р»СЊРЅРѕ.', text: 'РњС‹ С‚РѕР¶Рµ РґРµР»Р°РµРј РІРёРґ. РџРѕР»СѓС‡Р°РµС‚СЃСЏ РїСЂРёРјРµСЂРЅРѕ РѕРґРёРЅР°РєРѕРІРѕ СѓР±РµРґРёС‚РµР»СЊРЅРѕ.' },
  ];
  if (key.includes('match_pulse')) return [
    { title: 'РњР°С‚С‡ РїСЂРѕРґРѕР»Р¶Р°РµС‚ РґРµР»Р°С‚СЊ РІРёРґ, С‡С‚Рѕ РІСЃС‘ РїРѕРґ РєРѕРЅС‚СЂРѕР»РµРј.', text: 'РљРѕРЅС‚СЂРѕР»СЊ, РїСЂР°РІРґР°, Р±РµРіР°РµС‚ РіРґРµ-С‚Рѕ Р·Р° РєР°РґСЂРѕРј, С‚СЏР¶РµР»Рѕ РґС‹С€РёС‚ Рё РїСЂРѕСЃРёС‚ Р°РїС‚РµС‡РєСѓ.' },
    { title: 'РўРµРјРї Р·Р°Р±РµРіР° РґРµСЂР¶РёС‚СЃСЏ Р±РѕРґСЂРѕ.', text: 'Р­С‚Рѕ СѓР¶Рµ РЅРµ РїСЂРѕРіСѓР»РєР°, СЌС‚Рѕ РєР°СЂРґРёРѕ СЃ СЋСЂРёРґРёС‡РµСЃРєРё СЃРѕРјРЅРёС‚РµР»СЊРЅРѕР№ РјРѕС‚РёРІР°С†РёРµР№.' },
    { title: 'РђСЂРµРЅР° РЅРµ РѕС‚РїСѓСЃРєР°РµС‚ Р·СЂРёС‚РµР»РµР№.', text: 'РљР°Р¶РµС‚СЃСЏ, СЌС‚РѕС‚ Р·Р°Р±РµРі РїРѕРґРїРёСЃР°Р» РєРѕРЅС‚СЂР°РєС‚ РЅР° РґСЂР°РјСѓ Рё РјРµР»РєРёРј С€СЂРёС„С‚РѕРј РґРѕР±Р°РІРёР» вЂњРµС‰С‘ РЅРµРјРЅРѕРіРѕ Р±РѕР»РёвЂќ.' },
    { title: 'Р­С„РёСЂ Р¶РёРІРµРµ РЅРµРєРѕС‚РѕСЂС‹С… РїР»Р°РЅРѕРІ РёРіСЂРѕРєРѕРІ.', text: 'РџР»Р°РЅС‹, РєРѕРЅРµС‡РЅРѕ, Р±С‹Р»Рё РєСЂР°СЃРёРІС‹Рµ. РџРѕС‚РѕРј РїСЂРёС€Р»Рё РІСЂР°РіРё Рё РїСЂРѕРІРµР»Рё СЂРµРґР°РєС‚СѓСЂСѓ.' },
    { title: 'Р—Р°Р±РµРі РЅР°Р±РёСЂР°РµС‚ С…Р°СЂР°РєС‚РµСЂ.', text: 'РҐР°СЂР°РєС‚РµСЂ РЅРµСЂРІРЅС‹Р№, С€СѓРјРЅС‹Р№ Рё СЏРІРЅРѕ РІРѕСЃРїРёС‚Р°РЅРЅС‹Р№ РІ РїР»РѕС…РѕРј СЂР°Р№РѕРЅРµ.' },
    { title: 'РњР°С‚С‡ Р·Р°С‚СЏРЅСѓР»СЃСЏ Рё РѕР±СЂС‘Р» С…Р°СЂР°РєС‚РµСЂ.', text: 'Р­С‚Рѕ СѓР¶Рµ РЅРµ РїСЂРѕСЃС‚Рѕ Р·Р°Р±РµРі, СЌС‚Рѕ СЃРїРѕСЂ СЃ Р°СЂРµРЅРѕР№ РЅР° РїРѕРІС‹С€РµРЅРЅС‹С… С‚РѕРЅР°С….' },
    { title: 'Р­С„РёСЂ РґРµСЂР¶РёС‚СЃСЏ Р±РѕРґСЂРѕ.', text: 'Р“РґРµ-С‚Рѕ РјРµР¶РґСѓ РїР°РЅРёРєРѕР№ Рё РјР°СЃС‚РµСЂСЃС‚РІРѕРј СЂРѕРґРёР»СЃСЏ СЃС‚РёР»СЊ. РќРµСЂРѕРІРЅС‹Р№, Р·Р°С‚Рѕ СЃРІРѕР№.' },
    { title: 'Р—Р°Р±РµРі РІСЃС‘ РµС‰С‘ Р¶РёРІ.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ РїСЂРѕРІРµСЂРёР» РїСѓР»СЊСЃ: Сѓ РјР°С‚С‡Р° РѕРЅ РµСЃС‚СЊ, Сѓ Р·РґСЂР°РІРѕРіРѕ СЃРјС‹СЃР»Р° РґР°РЅРЅС‹Рµ РїСЂРѕС‚РёРІРѕСЂРµС‡РёРІС‹Рµ.' },
    { title: 'Р’СЂРµРјСЏ РёРґС‘С‚, РїСЂРѕР±Р»РµРјС‹ РЅРµ Р·Р°РєР°РЅС‡РёРІР°СЋС‚СЃСЏ.', text: 'Р РµРґРєР°СЏ СЃС‚Р°Р±РёР»СЊРЅРѕСЃС‚СЊ РІ РјРёСЂРµ, РіРґРµ РІСЃС‘ РѕСЃС‚Р°Р»СЊРЅРѕРµ РїС‹С‚Р°РµС‚СЃСЏ СѓРєСѓСЃРёС‚СЊ РіРµСЂРѕСЏ Р·Р° СЂР°СЃРїРёСЃР°РЅРёРµ.' },
    { title: 'РЈРїСЂСЏРјСЃС‚РІРѕ РІС‹С€Р»Рѕ РЅР° РїРµСЂРІС‹Р№ РїР»Р°РЅ.', text: 'РРіСЂРѕРєРё СѓР¶Рµ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РґРѕР»РіРѕ РІ СЌС„РёСЂРµ, С‡С‚РѕР±С‹ Р°СЂРµРЅР° РЅР°С‡Р°Р»Р° РІРѕСЃРїСЂРёРЅРёРјР°С‚СЊ СЌС‚Рѕ Р»РёС‡РЅРѕ.' },
  ];
  if (key.includes('threat_up')) return [
    { title: 'РЈРіСЂРѕР·Р° СЃРЅРѕРІР° РїРѕРґРєСЂСѓС‚РёР»Р° СЂСѓС‡РєСѓ.', text: 'РљС‚Рѕ-С‚Рѕ РЅР° Р°СЂРµРЅРµ РїРѕСЃРјРѕС‚СЂРµР» РЅР° С…Р°РѕСЃ Рё СЃРєР°Р·Р°Р»: вЂњРђ РјРѕР¶РЅРѕ РїРѕРіСЂРѕРјС‡Рµ?вЂќ. РњРѕР¶РЅРѕ. РЈР¶Рµ СЃРґРµР»Р°Р»Рё.' },
    { title: 'РЎР»РѕР¶РЅРѕСЃС‚СЊ РІС‹СЂРѕСЃР»Р° Р±РµР· СЃРїСЂРѕСЃР°.', text: 'РћС‡РµРЅСЊ РїРѕ-РІР·СЂРѕСЃР»РѕРјСѓ: РЅРёРєР°РєРёС… РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёР№, С‚РѕР»СЊРєРѕ РЅРѕРІС‹Рµ РїСЂРѕР±Р»РµРјС‹ Рё СЃС‚Р°СЂС‹Р№ РѕРїС‚РёРјРёР·Рј.' },
    { title: 'РђСЂРµРЅР° РґРѕР±Р°РІРёР»Р° РїРµСЂС†Р°.', text: 'РўРµРїРµСЂСЊ РєР°Р¶РґС‹Р№ РјР°РЅС‘РІСЂ РїР°С…РЅРµС‚ РіРµСЂРѕРёР·РјРѕРј, РїР°РЅРёРєРѕР№ Рё СЃР»РµРіРєР° РїРѕРґРіРѕСЂРµРІС€РµР№ СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊСЋ.' },
    { title: 'Р”Р°РІР»РµРЅРёРµ РїРѕРґРЅРёРјР°РµС‚СЃСЏ РєР°Рє РїР»РѕС…РёРµ РЅРѕРІРѕСЃС‚Рё.', text: 'РњРµРґР»РµРЅРЅРѕ, РЅРµРёР·Р±РµР¶РЅРѕ Рё СЃ С‚Р°РєРёРј РІС‹СЂР°Р¶РµРЅРёРµРј, Р±СѓРґС‚Рѕ СЌС‚Рѕ РµС‰С‘ С‚РѕР»СЊРєРѕ СЂР°Р·РјРёРЅРєР°.' },
    { title: 'РЈСЂРѕРІРµРЅСЊ СѓРіСЂРѕР·С‹ РїРѕР»РµР· РІРІРµСЂС….', text: 'РРіСЂРѕРєР°Рј РїРѕСЂР° РґРµР»Р°С‚СЊ РІРёРґ, С‡С‚Рѕ РёРјРµРЅРЅРѕ СЌС‚РѕРіРѕ РѕРЅРё Рё С…РѕС‚РµР»Рё РѕС‚ РІРµС‡РµСЂР°.' },
    { title: 'РЈРіСЂРѕР·Р° РїРѕРґРЅСЏР»Р°СЃСЊ Рё РЅРµ РёР·РІРёРЅРёР»Р°СЃСЊ.', text: 'Р’СЂР°РіРё СЃС‚Р°Р»Рё Р·Р»РµРµ, РІРѕР·РґСѓС… РіСѓС‰Рµ, Р° РїСЂР°РІР° РЅР° СЂР°СЃСЃР»Р°Р±Р»РµРЅРёРµ РѕРїСЏС‚СЊ РѕС‚РѕР·РІР°Р»Рё.' },
    { title: 'РЎР»РѕР¶РЅРѕСЃС‚СЊ РїСЂРёР±Р°РІРёР»Р° РіР°Р·Сѓ.', text: 'РўРµРїРµСЂСЊ РєР°Р¶РґР°СЏ РѕС€РёР±РєР° СЃС‚РѕРёС‚ РґРѕСЂРѕР¶Рµ, Р·Р°С‚Рѕ РІС‹РіР»СЏРґРёС‚ Р·РЅР°С‡РёС‚РµР»СЊРЅРѕ РєРёРЅРµРјР°С‚РѕРіСЂР°С„РёС‡РЅРµРµ.' },
    { title: 'РђСЂРµРЅР° РїРѕРІС‹СЃРёР»Р° С‚РµРјРїРµСЂР°С‚СѓСЂСѓ.', text: 'Р’СЃРµ, РєС‚Рѕ С…РѕС‚РµР» СЃРїРѕРєРѕР№РЅС‹Р№ С„Р°СЂРј, РјРѕРіСѓС‚ РЅР°РїРёСЃР°С‚СЊ Р¶Р°Р»РѕР±Сѓ РїСЂСЏРјРѕ РЅР° РІС…РѕРґСЏС‰РёР№ СѓСЂРѕРЅ.' },
    { title: 'Р”Р°РІР»РµРЅРёРµ СЂР°СЃС‚С‘С‚.', text: 'РњР°С‚С‡ СЂРµС€РёР», С‡С‚Рѕ СѓС‡Р°СЃС‚РЅРёРєР°Рј СЃР»РёС€РєРѕРј РєРѕРјС„РѕСЂС‚РЅРѕ. РЎРјРµР»РѕРµ Р·Р°СЏРІР»РµРЅРёРµ, РєРѕРЅРµС‡РЅРѕ.' },
    { title: 'РЈСЂРѕРІРµРЅСЊ СѓРіСЂРѕР·С‹ СЃРЅРѕРІР° РїРѕР»РµР· РІРІРµСЂС….', text: 'Р“РµСЂРѕРё РґРµСЂР¶Р°С‚СЃСЏ, РЅРѕ Р°СЂРµРЅР° СЏРІРЅРѕ РїС‹С‚Р°РµС‚СЃСЏ РІС‹РёРіСЂР°С‚СЊ СЃРїРѕСЂ Р°СЂРіСѓРјРµРЅС‚Р°РјРё РїРѕС‚СЏР¶РµР»РµРµ.' },
  ];
  if (key.includes('low_hp')) return [
    { title: 'HP СЃС‚Р°Р»Рѕ РґРµРєРѕСЂР°С‚РёРІРЅС‹Рј.', text: 'РџРѕР»РѕСЃРєР° Р·РґРѕСЂРѕРІСЊСЏ РµС‰С‘ РµСЃС‚СЊ, РЅРѕ СѓР¶Рµ СЃРєРѕСЂРµРµ РґР»СЏ Р°С‚РјРѕСЃС„РµСЂС‹, С‡РµРј РґР»СЏ СѓРІРµСЂРµРЅРЅРѕСЃС‚Рё.' },
    { title: 'Р“РµСЂРѕР№ РёРіСЂР°РµС‚ РЅР° С‚РѕРЅРµРЅСЊРєРѕРіРѕ.', text: 'РќР°СЃС‚РѕР»СЊРєРѕ С‚РѕРЅРµРЅСЊРєРѕРіРѕ, С‡С‚Рѕ РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ Р±РѕРёС‚СЃСЏ РґС‹С€Р°С‚СЊ РІ СЃС‚РѕСЂРѕРЅСѓ РјРѕРЅРёС‚РѕСЂР°.' },
    { title: 'Р—РґРѕСЂРѕРІСЊРµ СѓС€Р»Рѕ РІ СЂРµР¶РёРј СЌРєРѕРЅРѕРјРёРё.', text: 'РљР°Р¶РґС‹Р№ РїРёРєСЃРµР»СЊ HP СЃРµР№С‡Р°СЃ СЂР°Р±РѕС‚Р°РµС‚ Р·Р° С‚СЂРѕРёС… Рё РїСЂРѕСЃРёС‚ РїСЂРµРјРёСЋ.' },
    { title: 'РљСЂР°СЃРЅР°СЏ Р·РѕРЅР° РјР°С€РµС‚ СЂСѓРєРѕР№.', text: 'РќРµ РґСЂСѓР¶РµР»СЋР±РЅРѕ. РЎРєРѕСЂРµРµ РєР°Рє С‡РµР»РѕРІРµРє, РєРѕС‚РѕСЂС‹Р№ СѓР¶Рµ Р·Р°Р±СЂРѕРЅРёСЂРѕРІР°Р» РјРµСЃС‚Рѕ РІ РЅРµРєСЂРѕР»РѕРіРµ.' },
    { title: 'РџРѕР»РѕСЃРєР° HP СЃС‚Р°Р»Р° С„РёР»РѕСЃРѕС„СЃРєРѕР№.', text: 'РћРЅР° Р·Р°РґР°С‘С‚ РІРµС‡РЅС‹Р№ РІРѕРїСЂРѕСЃ: вЂњРђ С‚РѕС‡РЅРѕ РЅР°РґРѕ Р±С‹Р»Рѕ Р·Р°С…РѕРґРёС‚СЊ РёРјРµРЅРЅРѕ СЃСЋРґР°?вЂќ.' },
    { title: 'Р—РґРѕСЂРѕРІСЊРµ РІС‹РіР»СЏРґРёС‚ РєР°Рє С‚РѕРЅРєР°СЏ С€СѓС‚РєР°.', text: 'РџРѕР»РѕСЃРєР° HP СЃС‚Р°Р»Р° С‚Р°РєРѕР№ СЃРєСЂРѕРјРЅРѕР№, С‡С‚Рѕ РµС‘ СѓР¶Рµ С…РѕС‡РµС‚СЃСЏ РїРѕРґРґРµСЂР¶Р°С‚СЊ РјРѕСЂР°Р»СЊРЅРѕ.' },
    { title: 'Р“РµСЂРѕР№ Р¶РёРІС‘С‚ РЅР° С‡РµСЃС‚РЅРѕРј СЃР»РѕРІРµ.', text: 'Р§РµСЃС‚РЅРѕРµ СЃР»РѕРІРѕ, РїСЂР°РІРґР°, РЅРµРјРЅРѕРіРѕ РґСЂРѕР¶РёС‚ Рё РїСЂРѕСЃРёС‚ Р°РїС‚РµС‡РєСѓ.' },
    { title: 'HP СѓС€Р»Рѕ РІ РјРёРЅРёРјР°Р»РёР·Рј.', text: 'РљСЂР°СЃРёРІРѕ, С‚СЂРµРІРѕР¶РЅРѕ Рё СЃРѕРІРµСЂС€РµРЅРЅРѕ РЅРµ С‚Рѕ РЅР°РїСЂР°РІР»РµРЅРёРµ, РєСѓРґР° С…РѕС‚РµР»РѕСЃСЊ Р±С‹ СЂР°Р·РІРёРІР°С‚СЊ Р±РёР»Рґ.' },
    { title: 'РќР° СЌРєСЂР°РЅРµ Р·Р°РїР°С…Р»Рѕ РѕСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚СЊСЋ.', text: 'Р РµРґРєРѕРµ С‡СѓРІСЃС‚РІРѕ РґР»СЏ СЌС‚РѕР№ Р°СЂРµРЅС‹. РќР°РґРµСЋСЃСЊ, РёРіСЂРѕРє С…РѕС‚СЏ Р±С‹ СѓР·РЅР°РµС‚ РµРіРѕ РІ Р»РёС†Рѕ.' },
    { title: 'РџРѕР»РѕСЃРєР° Р·РґРѕСЂРѕРІСЊСЏ РїСЂРѕРІРѕРґРёС‚ Р·Р°Р±Р°СЃС‚РѕРІРєСѓ.', text: 'РћРЅР° РµС‰С‘ РµСЃС‚СЊ, РЅРѕ СѓР¶Рµ СЏРІРЅРѕ РЅРµРґРѕРІРѕР»СЊРЅР° СѓСЃР»РѕРІРёСЏРјРё С‚СЂСѓРґР°.' },
  ];
  if (key.includes('boss_down')) return [
    { title: 'Р‘РѕСЃСЃ СЃР»РѕР¶РёР»СЃСЏ РєР°Рє РїР»РѕС…РѕР№ РїР»Р°РЅ.', text: 'РЁС‘Р» СѓРІРµСЂРµРЅРЅРѕ, С€СѓРјРµР» РґРѕСЂРѕРіРѕ, Р° Р·Р°РєРѕРЅС‡РёР» РєР°Рє Р±Р°Рі-СЂРµРїРѕСЂС‚: СЂРµР·РєРѕ, РіСЂСѓСЃС‚РЅРѕ Рё СЃ РїРѕРјРµС‚РєРѕР№ вЂњРЅРµ РІРѕСЃРїСЂРѕРёР·РІРѕРґРёС‚СЃСЏвЂќ.' },
    { title: 'РќР°С‡Р°Р»СЊРЅРёРє Р°СЂРµРЅС‹ РїРѕР»СѓС‡РёР» СѓРІРѕР»СЊРЅРёС‚РµР»СЊРЅСѓСЋ.', text: 'РџСЂРёС‡РёРЅР° РїСЂРѕСЃС‚Р°СЏ: СЃР»РёС€РєРѕРј РјРЅРѕРіРѕ РїР°С„РѕСЃР°, СЃР»РёС€РєРѕРј РјР°Р»Рѕ СѓРєР»РѕРЅРµРЅРёСЏ РѕС‚ РІС…РѕРґСЏС‰РµРіРѕ СЃРІРёРЅС†Р°.' },
    { title: 'Р‘РѕСЃСЃ СѓРїР°Р» Рё СЃРґРµР»Р°Р» РІРёРґ, С‡С‚Рѕ С‚Р°Рє Р·Р°РґСѓРјР°РЅРѕ.', text: 'РљР»Р°СЃСЃРёС‡РµСЃРєР°СЏ С‚Р°РєС‚РёРєР° Р±РѕР»СЊС€РѕРіРѕ Р·Р»РѕРґРµСЏ: СЃРЅР°С‡Р°Р»Р° РґР°РІРёС‚СЊ Р°РІС‚РѕСЂРёС‚РµС‚РѕРј, РїРѕС‚РѕРј Р»РµР¶Р°С‚СЊ Рё РїРµСЂРµРѕСЃРјС‹СЃР»РёРІР°С‚СЊ РєР°СЂСЊРµСЂСѓ.' },
    { title: 'РљСЂСѓРїРЅР°СЏ С‚СѓС€Р° РїРѕРєРёРЅСѓР»Р° С‡Р°С‚.', text: 'РРіСЂРѕРєРё РїРѕРґРїРёСЃР°Р»Рё Р·Р°СЏРІР»РµРЅРёРµ РЅР° РїРѕР±РµРґСѓ РІСЃРµРј, С‡С‚Рѕ Р±С‹Р»Рѕ РІ РёРЅРІРµРЅС‚Р°СЂРµ, РІРєР»СЋС‡Р°СЏ РЅРµСЂРІС‹ Рё СЃРѕРјРЅРёС‚РµР»СЊРЅС‹Рµ СЂРµС€РµРЅРёСЏ.' },
    { title: 'Р‘РѕСЃСЃ РїСЂРѕРёРіСЂР°Р» СЃРїРѕСЂ СЃ СЂРµР°Р»СЊРЅРѕСЃС‚СЊСЋ.', text: 'Р РµР°Р»СЊРЅРѕСЃС‚СЊ РїСЂРёС€Р»Р° РІ РІРёРґРµ СѓСЂРѕРЅР°, РєСЂРёС‚РѕРІ Рё РєРѕРјР°РЅРґС‹, РєРѕС‚РѕСЂР°СЏ РІРЅРµР·Р°РїРЅРѕ РІСЃРїРѕРјРЅРёР»Р°, РіРґРµ РєРЅРѕРїРєР° вЂњСЃС‚СЂРµР»СЏС‚СЊвЂќ.' },
    { title: 'РњРёРЅСѓСЃ РѕРґРёРЅ С…РѕРґСЏС‡РёР№ РєСЂРёР·РёСЃ.', text: 'РђСЂРµРЅР° РЅР° СЃРµРєСѓРЅРґСѓ РІС‹РґРѕС…РЅСѓР»Р°. РџРѕС‚РѕРј РІСЃРїРѕРјРЅРёР»Р°, С‡С‚Рѕ СЌС‚Рѕ Crimson Wars, Рё СЃРЅРѕРІР° РЅР°С‡Р°Р»Р° РіРѕС‚РѕРІРёС‚СЊ РіР°РґРѕСЃС‚Рё.' },
    { title: 'Р‘РѕСЃСЃСѓ РІС‹РґР°Р»Рё С„РёРЅР°Р»СЊРЅС‹Рµ С‚РёС‚СЂС‹.', text: 'Р‘РµР· РѕРІР°С†РёР№, Р·Р°С‚Рѕ СЃ Р»СѓС‚РѕРј. Р’ СЌС‚РѕРј Р¶Р°РЅСЂРµ СЌС‚Рѕ РїСЂРёРјРµСЂРЅРѕ РѕРґРЅРѕ Рё С‚Рѕ Р¶Рµ.' },
    { title: 'Р‘РѕР»СЊС€РѕР№ СЃС‚СЂР°С€РЅС‹Р№ Р°СЂРіСѓРјРµРЅС‚ Р·Р°РєРѕРЅС‡РёР»СЃСЏ.', text: 'РћРєР°Р·Р°Р»РѕСЃСЊ, РµСЃР»Рё РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РґРѕР»РіРѕ РѕР±СЉСЏСЃРЅСЏС‚СЊ Р±РѕСЃСЃР° РґСЂРѕР±СЊСЋ, РѕРЅ РЅР°С‡РёРЅР°РµС‚ СЃРѕРіР»Р°С€Р°С‚СЊСЃСЏ.' },
    { title: 'РќР°С‡Р°Р»СЊСЃС‚РІРѕ Р±РѕР»СЊС€Рµ РЅРµ РѕС‚РІРµС‡Р°РµС‚.', text: 'Р’РµСЂРѕСЏС‚РЅРѕ, Р·Р°РЅСЏС‚Рѕ РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅС‹Рј РјРµРЅРµРґР¶РјРµРЅС‚РѕРј Рё РїРµСЂРµСЃРјРѕС‚СЂРѕРј РїРѕР»РёС‚РёРєРё Р»РёС‡РЅРѕРіРѕ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІР°.' },
    { title: 'Р‘РѕСЃСЃ РїР°Р», Р·СЂРёС‚РµР»Рё РґРµР»Р°СЋС‚ РІРёРґ, С‡С‚Рѕ РІРµСЂРёР»Рё СЃ СЃР°РјРѕРіРѕ РЅР°С‡Р°Р»Р°.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ С‚РѕР¶Рµ РІРµСЂРёР». РџСЂРѕСЃС‚Рѕ РѕС‡РµРЅСЊ С‚РёС…Рѕ, С‡С‚РѕР±С‹ РЅРµ СЃРіР»Р°Р·РёС‚СЊ Рё РЅРµ РїРѕР»СѓС‡РёС‚СЊ РїРѕ Р»РёС†Сѓ.' },
    { title: 'Р‘РѕСЃСЃ РїРѕР»СѓС‡РёР» РѕР±СЉСЏСЃРЅРµРЅРёРµ.', text: 'РљРѕСЂРѕС‚РєРѕРµ, РіСЂРѕРјРєРѕРµ Рё, СЃСѓРґСЏ РїРѕ СЂРµР·СѓР»СЊС‚Р°С‚Сѓ, РґРѕРІРѕР»СЊРЅРѕ СѓР±РµРґРёС‚РµР»СЊРЅРѕРµ.' },
    { title: 'РќР°С‡Р°Р»СЊСЃС‚РІРѕ СЃРЅСЏС‚Рѕ СЃ РґРѕР»Р¶РЅРѕСЃС‚Рё.', text: 'Р РµРґРєРёР№ СЃР»СѓС‡Р°Р№, РєРѕРіРґР° СЃРѕРІРµС‰Р°РЅРёРµ Р·Р°РєРѕРЅС‡РёР»РѕСЃСЊ С…РѕСЂРѕС€Рѕ РґР»СЏ РєРѕРјР°РЅРґС‹ Рё РїР»РѕС…Рѕ РґР»СЏ Р±РѕСЃСЃР°.' },
    { title: 'Р‘РѕР»СЊС€Р°СЏ РїСЂРѕР±Р»РµРјР° Р»РµРіР»Р°.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ С„РёРєСЃРёСЂСѓРµС‚: РёРЅРѕРіРґР° РЅР°СЃРёР»РёРµ РІСЃС‘-С‚Р°РєРё СЂРµС€Р°РµС‚ РѕСЂРіР°РЅРёР·Р°С†РёРѕРЅРЅС‹Рµ РІРѕРїСЂРѕСЃС‹.' },
    { title: 'Р‘РѕСЃСЃ Р±РѕР»СЊС€Рµ РЅРµ СЃРїРѕСЂРёС‚.', text: 'Р’РѕР·РјРѕР¶РЅРѕ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ Р°СЂРіСѓРјРµРЅС‚С‹ РёРіСЂРѕРєРѕРІ РѕРєР°Р·Р°Р»РёСЃСЊ СЃР»РёС€РєРѕРј РіСЂРѕРјРєРёРјРё.' },
    { title: 'Р“Р»Р°РІРЅС‹Р№ РїСѓРЅРєС‚ РїРѕРІРµСЃС‚РєРё Р·Р°РєСЂС‹С‚.', text: 'Р‘РѕСЃСЃ РїСЂРёС€С‘Р» СЃ Р°РјР±РёС†РёСЏРјРё, СѓС€С‘Р» СЃ РІС‹РІРѕРґР°РјРё. Р’С‹РІРѕРґС‹, РїСЂР°РІРґР°, СѓР¶Рµ РЅРµ РѕР·РІСѓС‡РёС‚.' },
    { title: 'РљСЂСѓРїРЅР°СЏ С†РµР»СЊ РѕС„РёС†РёР°Р»СЊРЅРѕ РѕС‚РјРµРЅРµРЅР°.', text: 'РљРѕРјР°РЅРґР° РїРѕРґРїРёСЃР°Р»Р° РїСЂРѕС‚РѕРєРѕР» РїРѕР±РµРґС‹ РїСѓР»СЏРјРё, РЅР°РІС‹РєР°РјРё Рё РЅРµСЂРІРЅРѕР№ РєРѕРѕСЂРґРёРЅР°С†РёРµР№.' },
    { title: 'Р‘РѕСЃСЃСѓ РѕР±СЉСЏСЃРЅРёР»Рё РїСЂР°РІРёР»Р° СЌС„РёСЂР°.', text: 'РџСЂР°РІРёР»Р° РїСЂРѕСЃС‚С‹Рµ: РїСЂРёС€С‘Р» РєСЂР°СЃРёРІРѕ, СѓРїР°Р» РіСЂРѕРјРєРѕ, РѕСЃС‚Р°РІРёР» Р»СѓС‚ Рё РЅРµРїСЂРёСЏС‚РЅС‹Рµ РІРѕСЃРїРѕРјРёРЅР°РЅРёСЏ.' },
  ];
  if (key.includes('join_room') || key.includes('players_up')) return [
    { title: 'РќР° Р°СЂРµРЅСѓ Р·Р°С€С‘Р» РЅРѕРІС‹Р№ РѕРїС‚РёРјРёСЃС‚.', text: 'Р’СЃРµРіРґР° РїСЂРёСЏС‚РЅРѕ РІРёРґРµС‚СЊ С‡РµР»РѕРІРµРєР°, РєРѕС‚РѕСЂС‹Р№ РїРѕРєР° РµС‰С‘ РІРµСЂРёС‚ РІ Р°РєРєСѓСЂР°С‚РЅС‹Р№ Р·Р°Р±РµРі.' },
    { title: 'РЎРѕСЃС‚Р°РІ СЃС‚Р°Р» РїР»РѕС‚РЅРµРµ.', text: 'Р‘РѕР»СЊС€Рµ РёРіСЂРѕРєРѕРІ, Р±РѕР»СЊС€Рµ РїР»Р°РЅРѕРІ Рё Р±РѕР»СЊС€Рµ Р»СЋРґРµР№, РєРѕС‚РѕСЂС‹Рµ Р±СѓРґСѓС‚ РіРѕРІРѕСЂРёС‚СЊ вЂњСЏ РїСЂРёРєСЂС‹РІР°Р»вЂќ.' },
    { title: 'Р’ СЌС„РёСЂ РґРѕР±Р°РІРёР»Рё СЃРІРµР¶СѓСЋ РїР°СЂСѓ СЂСѓРє.', text: 'РђСЂРµРЅР° СѓР¶Рµ СѓР»С‹Р±Р°РµС‚СЃСЏ С‚Р°Рє, Р±СѓРґС‚Рѕ РїСЂРёРіРѕС‚РѕРІРёР»Р° РґР»СЏ РЅРёС… РѕС‚РґРµР»СЊРЅСѓСЋ С„РѕСЂРјСѓ РѕС‚С‡С‘С‚Р° Рѕ Р±РѕР»Рё.' },
    { title: 'РџРѕРґРєСЂРµРїР»РµРЅРёРµ РїСЂРёР±С‹Р»Рѕ.', text: 'РўРµРїРµСЂСЊ Сѓ С…Р°РѕСЃР° РїРѕСЏРІРёР»Р°СЃСЊ РєРѕРјР°РЅРґРЅР°СЏ РІРµСЂСЃРёСЏ, СЃ СЃРёРЅС…СЂРѕРЅРЅС‹РјРё РѕС€РёР±РєР°РјРё Рё РѕР±С‰РёРј СЌРЅС‚СѓР·РёР°Р·РјРѕРј.' },
    { title: 'РљРѕРјРЅР°С‚Р° СЃС‚Р°Р»Р° Р»СЋРґРЅРµРµ.', text: 'Р­С‚Рѕ РїРѕРІС‹С€Р°РµС‚ С€Р°РЅСЃС‹ РЅР° СЃРїР°СЃРµРЅРёРµ Рё РЅР° РєРѕР»Р»РµРєС‚РёРІРЅРѕРµ вЂњР° РєС‚Рѕ СЌС‚Рѕ СЃРґРµР»Р°Р»?вЂќ.' },
    { title: 'РќРѕРІС‹Р№ РёРіСЂРѕРє РІ РєР°РґСЂРµ.', text: 'РџРѕРєР° РІС‹РіР»СЏРґРёС‚ СѓРІРµСЂРµРЅРЅРѕ. РџРѕРґРѕР¶РґС‘Рј РїРµСЂРІС‹Р№ РїР»РѕС‚РЅС‹Р№ РєРѕРЅС‚Р°РєС‚ СЃ СЂРµР°Р»СЊРЅРѕСЃС‚СЊСЋ.' },
    { title: 'Р’ РјСЏСЃРѕСЂСѓР±РєСѓ РІРѕС€С‘Р» РµС‰С‘ РѕРґРёРЅ РґРѕР±СЂРѕРІРѕР»РµС†.', text: 'Р®СЂРёРґРёС‡РµСЃРєРё СЌС‚Рѕ СЃРјРµР»РѕСЃС‚СЊ, СЌРјРѕС†РёРѕРЅР°Р»СЊРЅРѕ СЌС‚Рѕ РѕС‡РµРЅСЊ РёРЅС‚РµСЂРµСЃРЅС‹Р№ РІС‹Р±РѕСЂ.' },
    { title: 'РђСѓРґРёС‚РѕСЂРёСЏ РїРѕР»СѓС‡РёР»Р° РЅРѕРІРѕРіРѕ РіРµСЂРѕСЏ.', text: 'Р“РµСЂРѕР№ РїРѕРєР° РЅРµ Р·РЅР°РµС‚, РЅР°СЃРєРѕР»СЊРєРѕ Р±СѓРєРІР°Р»СЊРЅРѕ Р°СЂРµРЅР° РІРѕСЃРїСЂРёРЅРёРјР°РµС‚ СЃР»РѕРІРѕ вЂњРёСЃРїС‹С‚Р°РЅРёРµвЂќ.' },
  ];
  if (key.includes('leave_room') || key.includes('players_down')) return [
    { title: 'РЎРѕСЃС‚Р°РІ РїРѕСЂРµРґРµР».', text: 'РљС‚Рѕ-С‚Рѕ СЂРµС€РёР», С‡С‚Рѕ Р¶РёР·РЅСЊ РІРЅРµ Р°СЂРµРЅС‹ С‚РѕР¶Рµ РёРјРµРµС‚ РЅРµРїР»РѕС…РѕР№ РіРµР№РјРїР»РµР№.' },
    { title: 'РћРґРёРЅ СѓС‡Р°СЃС‚РЅРёРє РїРѕРєРёРЅСѓР» С€РѕСѓ.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ РЅРµ РѕСЃСѓР¶РґР°РµС‚. РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ РїСЂРѕСЃС‚Рѕ РґРµР»Р°РµС‚ РїР°СѓР·Сѓ СЂРѕРІРЅРѕ С‚Р°РєРѕР№ РґР»РёРЅС‹, С‡С‚РѕР±С‹ РІСЃС‘ Р±С‹Р»Рѕ РїРѕРЅСЏС‚РЅРѕ.' },
    { title: 'РљРѕРјРЅР°С‚Р° СЃС‚Р°Р»Р° С‚РёС€Рµ.', text: 'РќРµ Р±РµР·РѕРїР°СЃРЅРµРµ, РєРѕРЅРµС‡РЅРѕ. РџСЂРѕСЃС‚Рѕ С‚РёС€Рµ. Р­С‚Рѕ СЂР°Р·РЅС‹Рµ Р¶Р°РЅСЂС‹ СЃР°РјРѕРѕР±РјР°РЅР°.' },
    { title: 'РњРёРЅСѓСЃ РѕРґРёРЅ РіРѕР»РѕСЃ РІ РѕР±С‰РµРј РїР»Р°РЅРµ.', text: 'РџР»Р°РЅ РѕС‚ СЌС‚РѕРіРѕ РЅРµ СЃС‚Р°Р» С…СѓР¶Рµ. РћРЅ Рё РґРѕ СЌС‚РѕРіРѕ Р±С‹Р», СЃРєР°Р¶РµРј РјСЏРіРєРѕ, РіРёР±РєРёРј.' },
    { title: 'РРіСЂРѕРє СѓС€С‘Р» РёР· СЌС„РёСЂР°.', text: 'Р РµРґРєРёР№ СЃР»СѓС‡Р°Р№, РєРѕРіРґР° РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ РїРѕР»РѕР¶РµРЅРёРµ СѓРґР°Р»РѕСЃСЊ РїСЂРµРґРѕС‚РІСЂР°С‚РёС‚СЊ Р·Р°СЂР°РЅРµРµ.' },
    { title: 'Р”РѕР±СЂРѕРІРѕР»СЊРЅР°СЏ СЌРІР°РєСѓР°С†РёСЏ Р·Р°С„РёРєСЃРёСЂРѕРІР°РЅР°.', text: 'РђСЂРµРЅР° СЃР»РµРіРєР° РѕР±РёРґРµР»Р°СЃСЊ, РЅРѕ Р±С‹СЃС‚СЂРѕ РЅР°Р№РґС‘С‚, РЅР° РєРѕРј РІС‹РјРµСЃС‚РёС‚СЊ С‡СѓРІСЃС‚РІР°.' },
    { title: 'РћРґРёРЅ Р±РёР»РµС‚ РЅР°СЂСѓР¶Сѓ РёСЃРїРѕР»СЊР·РѕРІР°РЅ.', text: 'РћСЃС‚Р°Р»СЊРЅС‹Рµ РїСЂРѕРґРѕР»Р¶Р°СЋС‚ Р°С‚С‚СЂР°РєС†РёРѕРЅ РїРѕРґ РЅР°Р·РІР°РЅРёРµРј вЂњР·Р°С‚Рѕ РѕРїС‹С‚ РєР°РїР°РµС‚вЂќ.' },
  ];
  if (key.includes('boss_portal')) return [
    { title: 'РџРѕСЂС‚Р°Р» Р±РѕСЃСЃР° РѕС‚РєСЂС‹Р»СЃСЏ Рё СЃСЂР°Р·Сѓ РїРѕР¶Р°Р»РµР» РІСЃРµС….', text: 'Р­С‚Рѕ С‚РѕС‚ СЃР°РјС‹Р№ РґРІРµСЂРЅРѕР№ Р·РІРѕРЅРѕРє, РїРѕСЃР»Рµ РєРѕС‚РѕСЂРѕРіРѕ РґРѕРј РґРµР»Р°РµС‚ РІРёРґ, С‡С‚Рѕ РµРіРѕ РЅРµС‚ РґРѕРјР°.' },
    { title: 'РќР° РєР°СЂС‚Рµ РїРѕСЏРІРёР»Р°СЃСЊ РґС‹СЂРєР° РІ СЃРїРѕРєРѕР№СЃС‚РІРёРё.', text: 'РР· РЅРµС‘, РїРѕ С‚СЂР°РґРёС†РёРё Р¶Р°РЅСЂР°, РІС‹Р№РґРµС‚ РЅРµ РґРѕСЃС‚Р°РІРєР° РїРёС†С†С‹, Р° РєРѕСЂРїРѕСЂР°С‚РёРІРЅР°СЏ РїСЂРµС‚РµРЅР·РёСЏ СЃ РїРѕР»РѕСЃРєРѕР№ Р·РґРѕСЂРѕРІСЊСЏ.' },
    { title: 'РџРѕСЂС‚Р°Р» РјРёРіР°РµС‚ РєР°Рє РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ РѕС‚ СЃСѓРґСЊР±С‹.', text: 'РЎСѓРґСЊР±Р° РѕР±С‹С‡РЅРѕ РЅРµ РјРёРіР°РµС‚ РїСЂРѕСЃС‚Рѕ С‚Р°Рє. РћРЅР° РјРёРіР°РµС‚, РєРѕРіРґР° СѓР¶Рµ РїСЂРёРЅРµСЃР»Р° Р±РѕСЃСЃР° Рё РёС‰РµС‚ СЂРѕР·РµС‚РєСѓ.' },
    { title: 'РђСЂРµРЅРµ СЃС‚Р°Р»Рѕ РјР°Р»Рѕ РѕР±С‹С‡РЅС‹С… РїСЂРѕР±Р»РµРј.', text: 'РћС‚РєСЂС‹С‚ РїРѕСЂС‚Р°Р» РґР»СЏ РїСЂРѕР±Р»РµРјС‹ РїСЂРµРјРёСѓРј-РєР»Р°СЃСЃР°: Р±РѕР»СЊС€Рµ СЂРѕСЃС‚, С…СѓР¶Рµ С…Р°СЂР°РєС‚РµСЂ, РіСЂРѕРјС‡Рµ С€Р°РіРё.' },
    { title: 'Р‘РѕСЃСЃСѓ РІРєР»СЋС‡РёР»Рё РЅР°РІРёРіР°С‚РѕСЂ.', text: 'РњР°СЂС€СЂСѓС‚ РїРѕСЃС‚СЂРѕРµРЅ: С‡РµСЂРµР· РїР°РЅРёРєСѓ, РјРёРјРѕ Р°РїС‚РµС‡РµРє, РїСЂСЏРјРѕ РІ С†РµРЅС‚СЂ РєРѕР»Р»РµРєС‚РёРІРЅРѕРіРѕ вЂњРѕР№вЂќ.' },
    { title: 'РџРѕСЂС‚Р°Р» СЃРІРµС‚РёС‚СЃСЏ РєР°Рє РїР»РѕС…Р°СЏ РёРґРµСЏ.', text: 'РќРѕ РѕС‡РµРЅСЊ РєСЂР°СЃРёРІР°СЏ РїР»РѕС…Р°СЏ РёРґРµСЏ. РРіСЂРѕРєРё, РєРѕРЅРµС‡РЅРѕ, СЃРµР№С‡Р°СЃ РїРѕРїСЂРѕР±СѓСЋС‚ РµС‘ РїРѕС‚СЂРѕРіР°С‚СЊ Р»РёС†РѕРј.' },
    { title: 'Р’С…РѕРґ РґР»СЏ Р±РѕР»СЊС€РѕРіРѕ РіРѕСЃС‚СЏ РіРѕС‚РѕРІ.', text: 'РљРѕРІСЂРѕРІРѕР№ РґРѕСЂРѕР¶РєРё РЅРµС‚, Р·Р°С‚Рѕ РµСЃС‚СЊ РїСѓР»Рё, СЃС‚СЂР°С… Рё РЅРµСЃРєРѕР»СЊРєРѕ РіРµСЂРѕРµРІ СЃ Р·Р°РІС‹С€РµРЅРЅРѕР№ СЃР°РјРѕРѕС†РµРЅРєРѕР№.' },
    { title: 'РџРѕСЂС‚Р°Р» РѕС‚РєСЂС‹Р»СЃСЏ СЃ РІС‹СЂР°Р¶РµРЅРёРµРј вЂњРЅСѓ РІСЃС‘вЂќ.', text: 'Р РµРґРєРёР№ СЃР»СѓС‡Р°Р№, РєРѕРіРґР° РіРµРѕРјРµС‚СЂРёСЏ РЅР° РєР°СЂС‚Рµ РІС‹РіР»СЏРґРёС‚ Р±РѕР»РµРµ СѓРіСЂРѕР¶Р°СЋС‰Рµ, С‡РµРј РЅР°Р»РѕРіРѕРІР°СЏ РїСЂРѕРІРµСЂРєР°.' },
    { title: 'РџРѕСЂС‚Р°Р» Р±РѕСЃСЃР° РѕС‚РєСЂС‹Р»СЃСЏ.', text: 'Р­С‚Рѕ РЅРµ РґРµРєРѕСЂР°С†РёСЏ. Р­С‚Рѕ РґРІРµСЂСЊ, Р·Р° РєРѕС‚РѕСЂРѕР№ Сѓ Р±Р°Р»Р°РЅСЃР° РЅР°С‡РёРЅР°РµС‚СЃСЏ С‚СЏР¶С‘Р»С‹Р№ С…Р°СЂР°РєС‚РµСЂ.' },
    { title: 'Р‘РѕР»СЊС€Р°СЏ РїСЂРѕР±Р»РµРјР° СѓР¶Рµ РЅР° РїРѕРґС…РѕРґРµ.', text: 'РРіСЂРѕРєРё РµС‰С‘ РјРѕРіСѓС‚ СЃРґРµР»Р°С‚СЊ РІРёРґ, С‡С‚Рѕ СЌС‚Рѕ С‡Р°СЃС‚СЊ РїР»Р°РЅР°. РћС‡РµРЅСЊ РєРѕСЂРѕС‚РєРѕРµ РѕРєРЅРѕ, РЅРѕ РјРѕРіСѓС‚.' },
    { title: 'РђСЂРµРЅР° РѕС‚РєСЂС‹Р»Р° СЃР»СѓР¶РµР±РЅС‹Р№ РІС…РѕРґ РґР»СЏ Р±РѕСЃСЃР°.', text: 'РЎРµСЂРІРёСЃ, РєРѕРЅРµС‡РЅРѕ, СЃРѕРјРЅРёС‚РµР»СЊРЅС‹Р№, РЅРѕ РїСѓРЅРєС‚СѓР°Р»СЊРЅРѕСЃС‚СЊ РїСѓРіР°СЋС‰Рµ С…РѕСЂРѕС€Р°СЏ.' },
    { title: 'РџРѕСЂС‚Р°Р» СЃРІРµС‚РёС‚СЃСЏ РЅРµРґРѕР±СЂС‹РјРё РЅР°РјРµСЂРµРЅРёСЏРјРё.', text: 'Р’ С‚Р°РєРёРµ РјРѕРјРµРЅС‚С‹ РґР°Р¶Рµ Р»СѓС‚ Р»РµР¶РёС‚ РєР°Рє-С‚Рѕ РЅР°РїСЂСЏР¶С‘РЅРЅРѕ.' },
    { title: 'Р‘РѕСЃСЃ РїРѕР»СѓС‡РёР» РїСЂРёРіР»Р°С€РµРЅРёРµ.', text: 'Рљ СЃРѕР¶Р°Р»РµРЅРёСЋ, RSVP Сѓ РЅРµРіРѕ РІСЃРµРіРґР° вЂњРёРґСѓ Рё РїРѕСЂС‡Сѓ РІРµС‡РµСЂвЂќ.' },
    { title: 'РћС‚РєСЂС‹Р»Р°СЃСЊ РґРІРµСЂСЊ РІ РєСЂСѓРїРЅС‹Рµ РЅРµРїСЂРёСЏС‚РЅРѕСЃС‚Рё.', text: 'РўРµРїРµСЂСЊ С„Р°СЂРј РІС‹РіР»СЏРґРёС‚ РЅРµ РєР°Рє РїРѕРґРіРѕС‚РѕРІРєР°, Р° РєР°Рє РїРѕСЃР»РµРґРЅСЏСЏ РїРѕРїС‹С‚РєР° РЅРµ РїР°РЅРёРєРѕРІР°С‚СЊ.' },
    { title: 'РќР° РєР°СЂС‚Рµ РІРєР»СЋС‡РёР»СЃСЏ РїРѕСЂС‚Р°Р».', text: 'Р­С‚Рѕ Р°СЂРµРЅР° РІРµР¶Р»РёРІРѕ СЃРѕРѕР±С‰Р°РµС‚, С‡С‚Рѕ СЂР°Р·РјРёРЅРєР° Р·Р°РєРѕРЅС‡РёР»Р°СЃСЊ Р±РµР· СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЏ СЃ РёРіСЂРѕРєР°РјРё.' },
  ];
  if (key.includes('boss_spawn') || key.includes('boss_arrived')) return [
    { title: 'Р‘РѕСЃСЃ РјР°С‚РµСЂРёР°Р»РёР·РѕРІР°Р»СЃСЏ СЃ РїСЂРµС‚РµРЅР·РёРµР№.', text: 'Р’РёРґ Сѓ РЅРµРіРѕ С‚Р°РєРѕР№, Р±СѓРґС‚Рѕ РѕРЅ РїСЂРёС€С‘Р» РЅРµ РґСЂР°С‚СЊСЃСЏ, Р° Р·Р°РєСЂС‹РІР°С‚СЊ РєРІР°СЂС‚Р°Р»СЊРЅС‹Р№ РїР»Р°РЅ РїРѕ СѓРЅРёР¶РµРЅРёСЋ РёРіСЂРѕРєРѕРІ.' },
    { title: 'Р“Р»Р°РІРЅР°СЏ РїСЂРѕР±Р»РµРјР° РІРµС‡РµСЂР° РІС‹С€Р»Р° РЅР° СЃРјРµРЅСѓ.', text: 'Р‘РѕР»СЊС€Р°СЏ, Р·Р»Р°СЏ Рё СЏРІРЅРѕ Р±РµР· СѓРІР°Р¶РµРЅРёСЏ Рє Р»РёС‡РЅРѕРјСѓ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІСѓ, РіСЂР°С„РёРєСѓ СЃРЅР° Рё РјРµРґРёС†РёРЅСЃРєРѕР№ СЃС‚СЂР°С…РѕРІРєРµ.' },
    { title: 'Р‘РѕСЃСЃ РІ РєР°РґСЂРµ, РІСЃРµРј РїСЂРёСЃС‚РµРіРЅСѓС‚СЊ СЌРјРѕС†РёРё.', text: 'РЎРµР№С‡Р°СЃ РЅР°С‡РЅС‘С‚СЃСЏ С‡Р°СЃС‚СЊ Р·Р°Р±РµРіР°, РіРґРµ РґР°Р¶Рµ СѓРІРµСЂРµРЅРЅС‹Рµ РёРіСЂРѕРєРё РІСЃРїРѕРјРёРЅР°СЋС‚ СЃР»РѕРІРѕ вЂњРјР°РјР°вЂќ.' },
    { title: 'РќР° Р°СЂРµРЅСѓ Р·Р°С€С‘Р» РІР»Р°РґРµР»РµС† РїР»РѕС…РѕРіРѕ РЅР°СЃС‚СЂРѕРµРЅРёСЏ.', text: 'РћРЅ РЅРµ РїСЂРµРґСЃС‚Р°РІРёР»СЃСЏ, РЅРѕ РїРѕР»РѕСЃРєР° Р·РґРѕСЂРѕРІСЊСЏ РЅР°РјРµРєР°РµС‚: Р·РЅР°РєРѕРјСЃС‚РІРѕ Р±СѓРґРµС‚ РґРѕР»РіРёРј Рё РіСЂРѕРјРєРёРј.' },
    { title: 'РџРѕСЏРІРёР»СЃСЏ Р±РѕСЃСЃ, Р°С‚РјРѕСЃС„РµСЂР° СЂРµР·РєРѕ СЃС‚Р°Р»Р° РґРѕСЂРѕР¶Рµ.', text: 'Р‘СЋРґР¶РµС‚ РЅР° СЃРїРµС†СЌС„С„РµРєС‚С‹ РІС‹СЂРѕСЃ, Р±СЋРґР¶РµС‚ РЅР° СЃРїРѕРєРѕР№СЃС‚РІРёРµ РёРіСЂРѕРєРѕРІ Р±С‹Р» СѓРєСЂР°РґРµРЅ РµС‰С‘ РЅР° РІС…РѕРґРµ.' },
    { title: 'РќР°С‡Р°Р»СЊСЃС‚РІРѕ РїСЂРёР±С‹Р»Рѕ Р±РµР· Р·Р°РїРёСЃРё.', text: 'РћС‡РµРЅСЊ РЅРµРІРµР¶Р»РёРІРѕ, РѕС‡РµРЅСЊ РѕРїР°СЃРЅРѕ Рё, С‡РµРіРѕ СѓР¶ С‚Р°Рј, РґРѕРІРѕР»СЊРЅРѕ СЌС„С„РµРєС‚РЅРѕ РґР»СЏ РїСЂСЏРјРѕРіРѕ СЌС„РёСЂР°.' },
    { title: 'Р‘РѕСЃСЃ РІС‹С€РµР» РєР°Рє С„РёРЅР°Р»СЊРЅС‹Р№ Р°СЂРіСѓРјРµРЅС‚.', text: 'РўРµРїРµСЂСЊ Сѓ РёРіСЂРѕРєРѕРІ РґРІР° РІР°СЂРёР°РЅС‚Р°: РєСЂР°СЃРёРІРѕ РїРѕР±РµРґРёС‚СЊ РёР»Рё РѕС‡РµРЅСЊ РїРѕР·РЅР°РІР°С‚РµР»СЊРЅРѕ Р±РµРіР°С‚СЊ РєСЂСѓРіР°РјРё.' },
    { title: 'РљСЂСѓРїРЅР°СЏ РЅРµРїСЂРёСЏС‚РЅРѕСЃС‚СЊ РІСЃС‚СѓРїРёР»Р° РІ РїРµСЂРµРіРѕРІРѕСЂС‹.', text: 'РџРµСЂРµРіРѕРІРѕСЂС‹, СЃСѓРґСЏ РїРѕ РїРѕР·Рµ, Р±СѓРґСѓС‚ РІРµСЃС‚РёСЃСЊ СѓРґР°СЂР°РјРё, СЂС‹РІРєР°РјРё Рё РїРѕР»РЅС‹Рј РѕС‚СЃСѓС‚СЃС‚РІРёРµРј РґРёРїР»РѕРјР°С‚РёРё.' },
    { title: 'Р’РѕС‚ Рё РѕРЅ, С…РѕРґСЏС‡РёР№ РґРµРґР»Р°Р№РЅ.', text: 'РўРѕР»СЊРєРѕ РІРјРµСЃС‚Рѕ РїРёСЃРµРј РѕС‚ РјРµРЅРµРґР¶РµСЂР° Сѓ РЅРµРіРѕ Р»Р°РїС‹, СЏСЂРѕСЃС‚СЊ Рё РЅРµРїСЂРёР»РёС‡РЅРѕ РґР»РёРЅРЅР°СЏ РїРѕР»РѕСЃРєР° Р·РґРѕСЂРѕРІСЊСЏ.' },
    { title: 'Р‘РѕСЃСЃ РїСЂРёС€С‘Р» РїСЂРѕРІРµСЂРёС‚СЊ, РєС‚Рѕ С‚СѓС‚ СЃР»РёС€РєРѕРј С…РѕСЂРѕС€Рѕ Р¶РёРІС‘С‚.', text: 'РЎРїРѕР№Р»РµСЂ: РїРѕ РјРЅРµРЅРёСЋ Р±РѕСЃСЃР°, СЃР»РёС€РєРѕРј С…РѕСЂРѕС€Рѕ Р¶РёРІСѓС‚ РІРѕРѕР±С‰Рµ РІСЃРµ, РєС‚Рѕ РµС‰С‘ РІРµСЂС‚РёРєР°Р»РµРЅ.' },
    { title: 'Р‘РѕСЃСЃ РІС‹С€РµР» РІ СЌС„РёСЂ.', text: 'Р—Р°Р» РїСЂРѕСЃРёС‚ Р·СЂРµР»РёС‰Р°, РёРіСЂРѕРєРё РїСЂРѕСЃСЏС‚ РґРёСЃС‚Р°РЅС†РёСЋ, Р±РѕСЃСЃ РЅРµ РїСЂРёРЅРёРјР°РµС‚ Р·Р°СЏРІРєРё.' },
    { title: 'Р“Р»Р°РІРЅС‹Р№ РіРѕСЃС‚СЊ РІРµС‡РµСЂР° РїСЂРёР±С‹Р».', text: 'РћС‡РµРЅСЊ СѓРІРµСЂРµРЅРЅР°СЏ РїРѕС…РѕРґРєР° РґР»СЏ С‚РѕРіРѕ, РєС‚Рѕ РµС‰С‘ РЅРµ РІРёРґРµР» РІРµСЃСЊ СЃРїРёСЃРѕРє РЅР°РІС‹РєРѕРІ РёРіСЂРѕРєРѕРІ.' },
    { title: 'РќР° СЃС†РµРЅРµ РєСЂСѓРїРЅР°СЏ РЅРµРїСЂРёСЏС‚РЅРѕСЃС‚СЊ.', text: 'РЎРµР№С‡Р°СЃ СЃС‚Р°РЅРµС‚ СЏСЃРЅРѕ, РєС‚Рѕ РєР°С‡Р°Р»СЃСЏ, Р° РєС‚Рѕ РїСЂРѕСЃС‚Рѕ РєРѕР»Р»РµРєС†РёРѕРЅРёСЂРѕРІР°Р» РєСЂР°СЃРёРІС‹Рµ РєРЅРѕРїРєРё.' },
    { title: 'Р‘РѕСЃСЃ РЅР° РєР°СЂС‚Рµ.', text: 'Р’СЃРµРј СЃРѕС…СЂР°РЅСЏС‚СЊ СЃРїРѕРєРѕР№СЃС‚РІРёРµ. РћСЃРѕР±РµРЅРЅРѕ С‚РµРј, РєС‚Рѕ СѓР¶Рµ РЅР°С‡Р°Р» Р±РµРіР°С‚СЊ РєСЂСѓРіР°РјРё.' },
    { title: 'РќР°С‡Р°Р»СЊСЃС‚РІРѕ РїСЂРёС€Р»Рѕ Р»РёС‡РЅРѕ.', text: 'РЎСЂР°Р·Сѓ РІРёРґРЅРѕ СѓРїСЂР°РІР»РµРЅС‡РµСЃРєРёР№ СЃС‚РёР»СЊ: РјР°Р»Рѕ СЃР»РѕРІ, РјРЅРѕРіРѕ РІС…РѕРґСЏС‰РµРіРѕ СѓСЂРѕРЅР°.' },
    { title: 'Р‘РѕР»СЊС€РѕР№ СЃРёР»СѓСЌС‚ РІ РєР°РґСЂРµ.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ РїСЂРѕРІРµСЂРёР» СЂРµРіР»Р°РјРµРЅС‚: РґР°, СЃРµР№С‡Р°СЃ СЂР°Р·СЂРµС€РµРЅРѕ РЅРµСЂРІРЅРёС‡Р°С‚СЊ.' },
    { title: 'Р‘РѕСЃСЃ РїСЂРёР±С‹Р» Р±РµР· РѕРїРѕР·РґР°РЅРёСЏ.', text: 'РџСѓРЅРєС‚СѓР°Р»СЊРЅРѕСЃС‚СЊ РѕС‚Р»РёС‡РЅР°СЏ, С…Р°СЂР°РєС‚РµСЂ РѕС‚РІСЂР°С‚РёС‚РµР»СЊРЅС‹Р№, РґСЂР°РјР°С‚СѓСЂРіРёСЏ РІРµР»РёРєРѕР»РµРїРЅР°СЏ.' },
    { title: 'РђСЂРµРЅР° РІС‹РїСѓСЃС‚РёР»Р° С‚СЏР¶С‘Р»СѓСЋ Р°СЂС‚РёР»Р»РµСЂРёСЋ.', text: 'Р•СЃР»Рё РґРѕ СЌС‚РѕРіРѕ Р±С‹Р» С…Р°РѕСЃ, С‚Рѕ С‚РµРїРµСЂСЊ Сѓ С…Р°РѕСЃР° РїРѕСЏРІРёР»СЃСЏ РјРµРЅРµРґР¶РµСЂ.' },
  ];
  if (key.includes('pvp_elimination')) return [
    { title: 'PvP СЃРєР°Р·Р°Р»Рѕ СЃРІРѕС‘ СЂРµР·РєРѕРµ СЃР»РѕРІРѕ.', text: 'РЎР»РѕРІРѕ Р±С‹Р»Рѕ РєРѕСЂРѕС‚РєРёРј, РіСЂРѕРјРєРёРј Рё РїРѕС‡РµРјСѓ-С‚Рѕ СЃСЂР°Р·Сѓ РѕС‚РїСЂР°РІРёР»Рѕ РѕРґРЅРѕРіРѕ СѓС‡Р°СЃС‚РЅРёРєР° РїРѕРґСѓРјР°С‚СЊ Рѕ Р¶РёР·РЅРё.' },
    { title: 'РќР° Р°СЂРµРЅРµ РјРёРЅСѓСЃ РѕРґРёРЅ СЃРїРѕСЂС‰РёРє.', text: 'Р”РёСЃРєСѓСЃСЃРёСЏ Р·Р°РєРѕРЅС‡РёР»Р°СЃСЊ Р°СЂРіСѓРјРµРЅС‚РѕРј, РєРѕС‚РѕСЂС‹Р№ Р»РµС‚РµР» Р±С‹СЃС‚СЂРµРµ, С‡РµРј СЃРѕР¶Р°Р»РµРЅРёРµ.' },
    { title: 'Р¤СЂР°Рі РѕС„РѕСЂРјР»РµРЅ СЃ С…Р°СЂР°РєС‚РµСЂРѕРј.', text: 'РќРµ С‚Рѕ С‡С‚РѕР±С‹ Р°РєРєСѓСЂР°С‚РЅРѕ, Р·Р°С‚Рѕ СѓР±РµРґРёС‚РµР»СЊРЅРѕ. Р’ СЌС‚РѕР№ РёРіСЂРµ СЌС‚Рѕ РїРѕС‡С‚Рё РєРѕРјРїР»РёРјРµРЅС‚.' },
    { title: 'РљС‚Рѕ-С‚Рѕ РїРѕР»СѓС‡РёР» СЌРєСЃРїСЂРµСЃСЃ-РїРµСЂРµСЂС‹РІ.', text: 'Р‘С‹СЃС‚СЂС‹Р№, Р±РѕР»РµР·РЅРµРЅРЅС‹Р№ Рё СЃ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅРѕР№ РїСЂРѕРіСЂР°РјРјРѕР№ вЂњРЅРµ СЃС‚РѕР№ С‚Р°Рј Р±РѕР»СЊС€РµвЂќ.' },
    { title: 'PvP СЃРЅРѕРІР° РЅР°РїРѕРјРЅРёР»Рѕ РїСЂРѕ РґРёСЃС‚Р°РЅС†РёСЋ.', text: 'Р”РёСЃС‚Р°РЅС†РёСЏ Р±С‹Р»Р° РІР°Р¶РЅР°. РћСЃРѕР±РµРЅРЅРѕ С‚Р°, РєРѕС‚РѕСЂСѓСЋ РёРіСЂРѕРє СѓР¶Рµ РЅРµ СѓСЃРїРµР» СЃРѕР·РґР°С‚СЊ.' },
    { title: 'Р¤СЂР°Рі РѕС„РѕСЂРјР»РµРЅ.', text: 'РљС‚Рѕ-С‚Рѕ РїСЂРѕРёРіСЂР°Р» РєРѕСЂРѕС‚РєСѓСЋ РґРёСЃРєСѓСЃСЃРёСЋ СЃ С‡СѓР¶РёРј СѓСЂРѕРЅРѕРј Рё С‚РµРїРµСЂСЊ Р¶РґС‘С‚ СЃР»РµРґСѓСЋС‰СѓСЋ РїРѕРїС‹С‚РєСѓ.' },
    { title: 'PvP СЃРЅРѕРІР° РѕР±СЉСЏСЃРЅРёР»Рѕ РїСЂР°РІРёР»Р°.', text: 'РџСЂР°РІРёР»Рѕ РїРµСЂРІРѕРµ: РµСЃР»Рё СЃС‚РѕРёС€СЊ РєСЂР°СЃРёРІРѕ, СЌС‚Рѕ РµС‰С‘ РЅРµ Р·РЅР°С‡РёС‚, С‡С‚Рѕ СЃС‚РѕРёС€СЊ РґРѕР»РіРѕ.' },
    { title: 'РњРёРЅСѓСЃ РѕРґРёРЅ СѓС‡Р°СЃС‚РЅРёРє РІРµСЂС‚РёРєР°Р»СЊРЅРѕРіРѕ РґРІРёР¶РµРЅРёСЏ.', text: 'Р РµСЃРїР°РІРЅ СЃРєРѕСЂРѕ, СЃР°РјРѕРѕС†РµРЅРєР° С‡СѓС‚СЊ РїРѕР·Р¶Рµ.' },
    { title: 'РќР° Р°СЂРµРЅРµ СЃР»СѓС‡РёР»СЃСЏ Р°СЂРіСѓРјРµРЅС‚ РїРѕСЃРёР»СЊРЅРµРµ.', text: 'РћС‡РµРЅСЊ СѓР±РµРґРёС‚РµР»СЊРЅРѕ, РѕС‡РµРЅСЊ Р±С‹СЃС‚СЂРѕ Рё РїРѕС‡С‚Рё Р±РµР· РјРµСЃС‚Р° РґР»СЏ РІРѕР·СЂР°Р¶РµРЅРёР№.' },
    { title: 'Р¤СЂР°Рі СѓС€С‘Р» РІ СЃС‚Р°С‚РёСЃС‚РёРєСѓ.', text: 'РЎС‚Р°С‚РёСЃС‚РёРєР° РґРѕРІРѕР»СЊРЅР°. РРіСЂРѕРє, РєРѕС‚РѕСЂРѕРіРѕ С‚СѓРґР° Р·Р°РїРёСЃР°Р»Рё, РІРµСЂРѕСЏС‚РЅРѕ, РјРµРЅСЊС€Рµ.' },
    { title: 'РљС‚Рѕ-С‚Рѕ РѕС‚РїСЂР°РІР»РµРЅ РЅР° РїР°СѓР·Сѓ.', text: 'РќРµ С‚СЂР°РіРµРґРёСЏ, Р° РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅС‹Р№ РјРѕРјРµРЅС‚ СЃ С‚Р°Р№РјРµСЂРѕРј РІРѕР·РІСЂР°С‰РµРЅРёСЏ.' },
    { title: 'PvP-Р»РёРЅРёСЏ СЃС‚Р°Р»Р° РѕСЃС‚СЂРµРµ.', text: 'РћРґРёРЅ С‚РѕС‡РЅС‹Р№ РјРѕРјРµРЅС‚, Рё С‡СЊСЏ-С‚Рѕ СЃС‚СЂР°С‚РµРіРёСЏ РїСЂРµРІСЂР°С‚РёР»Р°СЃСЊ РІ РѕР¶РёРґР°РЅРёРµ СЂРµСЃРїР°РІРЅР°.' },
  ];
  if (key.includes('player_count')) return [
    { title: 'РЎРѕСЃС‚Р°РІ РјР°С‚С‡Р° РёР·РјРµРЅРёР»СЃСЏ.', text: 'РђСЂРµРЅР° Р»СЋР±РёС‚ РґРёРЅР°РјРёРєСѓ: РєС‚Рѕ-С‚Рѕ РїСЂРёС…РѕРґРёС‚ Р·Р° СЃР»Р°РІРѕР№, РєС‚Рѕ-С‚Рѕ СѓС…РѕРґРёС‚ Р·Р° СЃРїРѕРєРѕР№СЃС‚РІРёРµРј.' },
    { title: 'РљРѕРјР°РЅРґР° СЃРЅРѕРІР° РїРµСЂРµСЃРѕР±РёСЂР°РµС‚СЃСЏ.', text: 'РўР°РєС‚РёРєР° СЃР»РµРіРєР° РґСЂРѕР¶РёС‚, Р·Р°С‚Рѕ С€РѕСѓ РїРѕР»СѓС‡Р°РµС‚ РЅРѕРІС‹Рµ РІРІРѕРґРЅС‹Рµ.' },
    { title: 'РљРѕР»РёС‡РµСЃС‚РІРѕ СѓС‡Р°СЃС‚РЅРёРєРѕРІ РїРѕРјРµРЅСЏР»РѕСЃСЊ.', text: 'Р­С‚Рѕ РІСЃРµРіРґР° РґРѕР±Р°РІР»СЏРµС‚ РёРЅС‚СЂРёРіРё Рё РЅРµРјРЅРѕРіРѕ РїРѕСЂС‚РёС‚ РІСЃРµ РїСЂРµРґС‹РґСѓС‰РёРµ РїР»Р°РЅС‹.' },
    { title: 'Р’ РєРѕРјРЅР°С‚Рµ РїРµСЂРµСЃС‚Р°РІРёР»Рё Р»СЋРґРµР№.', text: 'РќРµ РјРµР±РµР»СЊ, РєРѕРЅРµС‡РЅРѕ, РЅРѕ СЌС„С„РµРєС‚ РґР»СЏ С…Р°РѕСЃР° РїСЂРёРјРµСЂРЅРѕ С‚Р°РєРѕР№ Р¶Рµ.' },
    { title: 'РЎРѕСЃС‚Р°РІ Р°СЂРµРЅС‹ РѕР±РЅРѕРІРёР»СЃСЏ.', text: 'РљР°Р¶РґС‹Р№ РЅРѕРІС‹Р№ СЂР°СЃРєР»Р°Рґ Р·РІСѓС‡РёС‚ РєР°Рє С€Р°РЅСЃ. РР»Рё РєР°Рє РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ, РµСЃР»Рё Р±С‹С‚СЊ С‡РµСЃС‚РЅРµРµ.' },
  ];
  if (key.includes('hp_recovered')) return [
    { title: 'Р—РґРѕСЂРѕРІСЊРµ РІРµСЂРЅСѓР»РѕСЃСЊ РёР· РєРѕРјР°РЅРґРёСЂРѕРІРєРё.', text: 'РџСЂРёС€Р»Рѕ РЅРµ РІСЃС‘, РЅРѕ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ, С‡С‚РѕР±С‹ РіРµСЂРѕР№ СЃРЅРѕРІР° РЅР°С‡Р°Р» РїСЂРёРЅРёРјР°С‚СЊ СЃРѕРјРЅРёС‚РµР»СЊРЅС‹Рµ СЂРµС€РµРЅРёСЏ.' },
    { title: 'HP СЃРЅРѕРІР° РІС‹РіР»СЏРґРёС‚ РєР°Рє Р°СЂРіСѓРјРµРЅС‚.', text: 'РќРµ Р¶РµР»РµР·РѕР±РµС‚РѕРЅРЅС‹Р№, РєРѕРЅРµС‡РЅРѕ, РЅРѕ СѓР¶Рµ РЅРµ Р±СѓРјР°Р¶РЅР°СЏ СЃР°Р»С„РµС‚РєР° РїРѕРґ РґРѕР¶РґС‘Рј.' },
    { title: 'РџРѕР»РѕСЃРєР° Р·РґРѕСЂРѕРІСЊСЏ РїРѕРґСЂРѕСЃР»Р°.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ СЂР°Рґ, РЅРµРєСЂРѕР»РѕРі РІСЂРµРјРµРЅРЅРѕ Р·Р°РєСЂС‹С‚ Р±РµР· СЃРѕС…СЂР°РЅРµРЅРёСЏ.' },
    { title: 'Р“РµСЂРѕР№ РѕС‚Р»РёРї РѕС‚ РєСЂР°СЏ РїСЂРѕРїР°СЃС‚Рё.', text: 'РќРµ СѓС€С‘Р» РґР°Р»РµРєРѕ, РїСЂРѕСЃС‚Рѕ СЃРґРµР»Р°Р» С€Р°Рі РЅР°Р·Р°Рґ Рё СЃРєР°Р·Р°Р»: вЂњРЇ РІСЃС‘ РєРѕРЅС‚СЂРѕР»РёСЂСѓСЋвЂќ.' },
    { title: 'Р›РµС‡РµРЅРёРµ СЃСЂР°Р±РѕС‚Р°Р»Рѕ, СЃР°РјРѕРѕС†РµРЅРєР° С‚РѕР¶Рµ.', text: 'РЎР°РјРѕРµ РѕРїР°СЃРЅРѕРµ СЃРѕС‡РµС‚Р°РЅРёРµ: С‡СѓС‚СЊ Р±РѕР»СЊС€Рµ HP Рё СЃСЂР°Р·Сѓ РїР»Р°РЅС‹ РєР°Рє Сѓ Р±РµСЃСЃРјРµСЂС‚РЅРѕРіРѕ.' },
    { title: 'Р—РґРѕСЂРѕРІСЊРµ РІРµСЂРЅСѓР»РѕСЃСЊ Рє СЂР°Р·РіРѕРІРѕСЂСѓ.', text: 'РџРѕР»РѕСЃРєР° HP СЃРЅРѕРІР° РїРѕС…РѕР¶Р° РЅР° СЂРµСЃСѓСЂСЃ, Р° РЅРµ РЅР° С‚РѕРЅРєСѓСЋ РєСЂР°СЃРЅСѓСЋ РїРѕРґРїРёСЃСЊ Рє С‚СЂР°РіРµРґРёРё.' },
    { title: 'Р“РµСЂРѕР№ РІС‹Р±СЂР°Р»СЃСЏ РёР· РєСЂР°СЃРЅРѕР№ Р·РѕРЅС‹.', text: 'Р”СЂР°РјР° РѕС‚Р»РѕР¶РµРЅР°, РЅРѕ РЅРµ РѕС‚РјРµРЅРµРЅР°. РђСЂРµРЅР° С‚Р°РєРёРµ Р·Р°СЏРІРєРё С…СЂР°РЅРёС‚ Р±РµСЂРµР¶РЅРѕ.' },
    { title: 'HP СЃРЅРѕРІР° РІС‹РіР»СЏРґРёС‚ РїСЂРёР»РёС‡РЅРѕ.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ РїРѕС‡С‚Рё РїРѕРІРµСЂРёР» РІ СЃС‚Р°Р±РёР»СЊРЅРѕСЃС‚СЊ. РџРѕС‡С‚Рё. РњС‹ Р¶Рµ РІР·СЂРѕСЃР»С‹Рµ Р»СЋРґРё.' },
    { title: 'РЎРѕСЃС‚РѕСЏРЅРёРµ СЃС‚Р°Р±РёР»РёР·РёСЂРѕРІР°Р»РѕСЃСЊ.', text: 'Р•С‰С‘ РјРёРЅСѓС‚Сѓ РЅР°Р·Р°Рґ РїР°С…Р»Рѕ РєР°С‚Р°СЃС‚СЂРѕС„РѕР№, С‚РµРїРµСЂСЊ РїР°С…РЅРµС‚ СЃР°РјРѕСѓРІРµСЂРµРЅРЅРѕСЃС‚СЊСЋ. РџСЂРѕРіСЂРµСЃСЃ.' },
    { title: 'РџРѕР»РѕСЃРєР° Р·РґРѕСЂРѕРІСЊСЏ РѕР¶РёР»Р°.', text: 'Р РµРґРєРёР№ РїСЂРёСЏС‚РЅС‹Р№ РјРѕРјРµРЅС‚: РіРµСЂРѕР№ РІРѕСЃСЃС‚Р°РЅРѕРІРёР»СЃСЏ СЂР°РЅСЊС€Рµ, С‡РµРј РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ СѓСЃРїРµР» РЅР°РїРёСЃР°С‚СЊ РЅРµРєСЂРѕР»РѕРі.' },
    { title: 'РљСЂР°СЃРЅР°СЏ Р·РѕРЅР° РѕС‚РїСѓСЃС‚РёР»Р°.', text: 'РќРµРЅР°РґРѕР»РіРѕ РёР»Рё РЅР°РґРѕР»РіРѕ, СѓР·РЅР°РµРј РїРѕ СЃР»РµРґСѓСЋС‰РµРјСѓ РЅРµСѓРґР°С‡РЅРѕРјСѓ РјР°РЅС‘РІСЂСѓ.' },
  ];
  if (key.includes('pvp_leader')) return [
    { title: 'Р’ PvP РїРѕСЏРІРёР»СЃСЏ Р»РёРґРµСЂ.', text: 'РћСЃС‚Р°Р»СЊРЅС‹Рј РїРѕСЂР° Р»РёР±Рѕ РґРѕРіРѕРЅСЏС‚СЊ, Р»РёР±Рѕ РіРѕС‚РѕРІРёС‚СЊ СѓР±РµРґРёС‚РµР»СЊРЅСѓСЋ Р»РµРєС†РёСЋ РїСЂРѕ вЂњСЏ РёРіСЂР°Р» РЅР° РјР°РєСЂРѕвЂќ.' },
    { title: 'РљС‚Рѕ-С‚Рѕ РІС‹СЂРІР°Р»СЃСЏ РІРїРµСЂС‘Рґ.', text: 'РўР°Р±Р»РёС†Р° СѓРІР°Р¶Р°РµС‚ С†РёС„СЂС‹, Р° РїСЂРѕРёРіСЂС‹РІР°СЋС‰РёРµ РѕР±С‹С‡РЅРѕ СѓРІР°Р¶Р°СЋС‚ РѕРїСЂР°РІРґР°РЅРёСЏ.' },
    { title: 'Р›РёРґРµСЂСЃС‚РІРѕ СЃРјРµРЅРёР»Рѕ РІР»Р°РґРµР»СЊС†Р°.', text: 'PvP Р»СЋР±РёС‚ С‚Р°РєРёРµ РјРѕРјРµРЅС‚С‹: СЃРµРєСѓРЅРґСѓ РЅР°Р·Р°Рґ Р±С‹Р» С…Р°РѕСЃ, С‚РµРїРµСЂСЊ С…Р°РѕСЃ СЃ С‚Р°Р±Р»РёС‡РєРѕР№ вЂњРїРµСЂРІРѕРµ РјРµСЃС‚РѕвЂќ.' },
    { title: 'РќР° С‚Р°Р±Р»Рѕ РїРѕСЏРІРёР»СЃСЏ С„Р°РІРѕСЂРёС‚.', text: 'Р­С‚Рѕ РЅРµ РєРѕСЂРѕРЅР°, РєРѕРЅРµС‡РЅРѕ, РЅРѕ РїРѕРїР°СЃС‚СЊ РїРѕ РЅРµР№ С‚РµРїРµСЂСЊ Р·Р°С…РѕС‚СЏС‚ РІСЃРµ.' },
    { title: 'РћРґРёРЅ РёРіСЂРѕРє Р·Р°Р±СЂР°Р» С‚РµРјРї.', text: 'РћСЃС‚Р°Р»СЊРЅС‹Рµ РїРѕР»СѓС‡РёР»Рё Р±РµСЃРїР»Р°С‚РЅС‹Р№ РєСѓСЂСЃ вЂњРєР°Рє СЃСЂРѕС‡РЅРѕ РїРµСЂРµСЃС‚Р°С‚СЊ РѕС‚СЃС‚Р°РІР°С‚СЊвЂќ.' },
  ];
  if (key.includes('solo_survivor')) return [
    { title: 'РћСЃС‚Р°Р»СЃСЏ РѕРґРёРЅ РіРµСЂРѕР№ Рё РјРЅРѕРіРѕ РІРѕРїСЂРѕСЃРѕРІ.', text: 'Р“Р»Р°РІРЅС‹Р№ РІРѕРїСЂРѕСЃ: СЌС‚Рѕ СЃС‚СЂР°С‚РµРіРёСЏ, С‚СЂР°РіРµРґРёСЏ РёР»Рё РїСЂРѕСЃС‚Рѕ РєРѕРјР°РЅРґРЅР°СЏ СЂР°Р±РѕС‚Р° Р·Р°РєРѕРЅС‡РёР»Р°СЃСЊ СЂР°РЅСЊС€Рµ РІСЂРµРјРµРЅРё?' },
    { title: 'РЎРѕР»Рѕ-СЂРµР¶РёРј РІРєР»СЋС‡РёР»СЃСЏ Р±РµР· РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёСЏ.', text: 'РўРµРїРµСЂСЊ РІСЃС‘ РІРЅРёРјР°РЅРёРµ, РІРµСЃСЊ СѓСЂРѕРЅ Рё РІСЃРµ РїР»РѕС…РёРµ СЂРµС€РµРЅРёСЏ РїСЂРёРЅР°РґР»РµР¶Р°С‚ РѕРґРЅРѕРјСѓ С‡РµР»РѕРІРµРєСѓ.' },
    { title: 'РќР° Р°СЂРµРЅРµ РѕРґРёРЅРѕРєРёР№ С„РёРЅР°Р»РёСЃС‚.', text: 'Р—РІСѓС‡РёС‚ РіРѕСЂРґРѕ, РїРѕРєР° РЅРµ СЃРјРѕС‚СЂРёС€СЊ РЅР° РєРѕР»РёС‡РµСЃС‚РІРѕ РІСЂР°РіРѕРІ Рё РІС‹СЂР°Р¶РµРЅРёРµ Р»РёС†Р° СЃСѓРґСЊР±С‹.' },
    { title: 'РљРѕРјР°РЅРґР° СЃС‚Р°Р»Р° РєРѕРјРїР°РєС‚РЅРѕР№.', text: 'РќР°СЃС‚РѕР»СЊРєРѕ РєРѕРјРїР°РєС‚РЅРѕР№, С‡С‚Рѕ РїРѕРјРµС‰Р°РµС‚СЃСЏ РІ РѕРґРЅРѕРіРѕ РѕС‡РµРЅСЊ Р·Р°РЅСЏС‚РѕРіРѕ РіРµСЂРѕСЏ.' },
    { title: 'РћРґРёРЅ РїСЂРѕС‚РёРІ РІСЃРµС….', text: 'РљР»Р°СЃСЃРёРєР° Р¶Р°РЅСЂР°: РєСЂР°СЃРёРІРѕ РЅР° РїРѕСЃС‚РµСЂРµ, Р·Р°РјРµС‚РЅРѕ С…СѓР¶Рµ РІ Р±СѓС…РіР°Р»С‚РµСЂРёРё Р·РґРѕСЂРѕРІСЊСЏ.' },
    { title: 'РќР° СЃС†РµРЅРµ РѕСЃС‚Р°Р»СЃСЏ РѕРґРёРЅ.', text: 'Р’РµСЃСЊ Р»СѓС‚, РІРµСЃСЊ СЃС‚СЂР°С… Рё РІСЃСЏ РѕС‚РІРµС‚СЃС‚РІРµРЅРЅРѕСЃС‚СЊ С‚РµРїРµСЂСЊ СЃРјРѕС‚СЂСЏС‚ РЅР° РЅРµРіРѕ РѕРґРЅРѕРІСЂРµРјРµРЅРЅРѕ.' },
    { title: 'РЎРѕР»Рѕ-СЂРµР¶РёРј РІРєР»СЋС‡РёР»СЃСЏ СЃР°Рј.', text: 'РљРѕРјР°РЅРґРЅР°СЏ СЂР°Р±РѕС‚Р° Р·Р°РєРѕРЅС‡РёР»Р°СЃСЊ. РќР°С‡Р°Р»Р°СЃСЊ Р»РёС‡РЅР°СЏ РїРµСЂРµРїРёСЃРєР° СЃ СЃСѓРґСЊР±РѕР№.' },
    { title: 'РћРґРёРЅ РіРµСЂРѕР№ РїСЂРѕС‚РёРІ СЂР°СЃРїРёСЃР°РЅРёСЏ Р±РѕР»Рё.', text: 'РљСЂР°СЃРёРІРѕ Р·РІСѓС‡РёС‚, РїРѕРєР° РЅРµ РІСЃРїРѕРјРёРЅР°РµС€СЊ, С‡С‚Рѕ СЂР°СЃРїРёСЃР°РЅРёРµ РѕР±С‹С‡РЅРѕ РїСѓРЅРєС‚СѓР°Р»СЊРЅРѕРµ.' },
    { title: 'Р¤РёРЅР°Р»СЊРЅС‹Р№ РѕРґРёРЅРѕС‡РЅС‹Р№ РЅРѕРјРµСЂ.', text: 'РџСѓР±Р»РёРєР° Р»СЋР±РёС‚ С‚Р°РєРёРµ РјРѕРјРµРЅС‚С‹. РРіСЂРѕРєРё РѕР±С‹С‡РЅРѕ Р»СЋР±СЏС‚ РёС… СѓР¶Рµ РїРѕСЃР»Рµ РїРѕР±РµРґС‹.' },
    { title: 'РћСЃС‚Р°Р»СЃСЏ РѕРґРёРЅ РґРѕР±СЂРѕРІРѕР»РµС†.', text: 'РўРµРїРµСЂСЊ РєР°Р¶РґРѕРµ СЂРµС€РµРЅРёРµ Р·РІСѓС‡РёС‚ РіСЂРѕРјС‡Рµ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ РѕР±РІРёРЅРёС‚СЊ Р±РѕР»СЊС€Рµ РЅРµРєРѕРіРѕ.' },
  ];
  if (key.includes('respawn_wait') || key.includes('downed')) return [
    { title: 'Р“РµСЂРѕР№ РІСЂРµРјРµРЅРЅРѕ РёР·СѓС‡Р°РµС‚ РїРѕР».', text: 'РџРѕР», РєСЃС‚Р°С‚Рё, РІС‹РїРѕР»РЅРµРЅ РєР°С‡РµСЃС‚РІРµРЅРЅРѕ. Р–Р°Р»СЊ, РѕР±Р·РѕСЂ СЃР»РёС€РєРѕРј Р±Р»РёР·РєРёР№ Рё РїРѕ РЅРµРїСЂРёСЏС‚РЅРѕР№ РїСЂРёС‡РёРЅРµ.' },
    { title: 'РџР°СѓР·Р° РЅР° РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ РјС‹С€Р»РµРЅРёРµ.', text: 'РРЅРѕРіРґР° СЃС‚СЂР°С‚РµРіРёСЏ С‚СЂРµР±СѓРµС‚ Р»РµС‡СЊ. РРЅРѕРіРґР° СЃС‚СЂР°С‚РµРіРёСЏ РїСЂРѕСЃС‚Рѕ РЅРµ СѓСЃРїРµР»Р° СѓРІРµСЂРЅСѓС‚СЊСЃСЏ.' },
    { title: 'РРіСЂРѕРє СѓС€С‘Р» РІ СЂРµР¶РёРј РѕР¶РёРґР°РЅРёСЏ.', text: 'РЎРµР№С‡Р°СЃ РіР»Р°РІРЅРѕРµ РЅРµ РїР°РЅРёРєРѕРІР°С‚СЊ. РџР°РЅРёРєРѕРІР°С‚СЊ РјРѕР¶РЅРѕ Р±СѓРґРµС‚ РєСЂР°СЃРёРІРѕ РїРѕСЃР»Рµ СЂРµСЃРїР°РІРЅР°.' },
    { title: 'РќРµР±РѕР»СЊС€Р°СЏ С‚РµС…РЅРёС‡РµСЃРєР°СЏ СЃРјРµСЂС‚СЊ.', text: 'РќРµ С„РёРЅР°Р», Р° СЂРµРєР»Р°РјРЅР°СЏ РїР°СѓР·Р° РґР»СЏ СЃР°РјРѕР»СЋР±РёСЏ Рё РїСЂРѕРІРµСЂРєР° С‚РµСЂРїРµРЅРёСЏ РєРѕРјР°РЅРґС‹.' },
    { title: 'Р“РµСЂРѕР№ РїСЂРёР»С‘Рі РЅРµ РїРѕ РїР»Р°РЅСѓ.', text: 'РќРѕ СЃ С‚Р°РєРёРј РІС‹СЂР°Р¶РµРЅРёРµРј, Р±СѓРґС‚Рѕ СЌС‚Рѕ С‡Р°СЃС‚СЊ СЃР»РѕР¶РЅРѕР№ С‚Р°РєС‚РёРєРё, РєРѕС‚РѕСЂСѓСЋ РЅРёРєС‚Рѕ РЅРµ РїСЂРѕСЃРёР».' },
    { title: 'РќРѕРєРґР°СѓРЅ РІ РїСЂСЏРјРѕРј СЌС„РёСЂРµ.', text: 'Р“РµСЂРѕР№ РІСЂРµРјРµРЅРЅРѕ РёР·СѓС‡Р°РµС‚ РїРѕР» Рё РїРµСЂРµСЃРјР°С‚СЂРёРІР°РµС‚ РѕС‚РЅРѕС€РµРЅРёСЏ СЃ РІС…РѕРґСЏС‰РёРј СѓСЂРѕРЅРѕРј.' },
    { title: 'Р’РµСЂС‚РёРєР°Р»СЊРЅРѕСЃС‚СЊ РѕС‚РјРµРЅРµРЅР°.', text: 'РќРµРЅР°РґРѕР»РіРѕ, РЅРѕ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ, С‡С‚РѕР±С‹ РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ СѓСЃРїРµР» СЃРґРµР»Р°С‚СЊ РЅРµРїСЂРёСЏС‚РЅРѕ С‚РѕС‡РЅС‹Р№ РІС‹РІРѕРґ.' },
    { title: 'РРіСЂРѕРє РїСЂРёР»С‘Рі Р±РµР· СЂРѕРјР°РЅС‚РёРєРё.', text: 'Р РµСЃРїР°РІРЅ СЃРєРѕСЂРѕ, Р° РїРѕРєР° РјРѕР¶РЅРѕ РЅР°СЃР»Р°РґРёС‚СЊСЃСЏ РѕР±СЂР°Р·РѕРІР°С‚РµР»СЊРЅРѕР№ РїР°СѓР·РѕР№.' },
    { title: 'РќР° Р°СЂРµРЅРµ РјРёРЅСѓСЃ РѕРґРёРЅ СЃС‚РѕСЏС‰РёР№ Р°СЂРіСѓРјРµРЅС‚.', text: 'Р›РµР¶Р°С‡РёР№ Р°СЂРіСѓРјРµРЅС‚ С‚РѕР¶Рµ Р°СЂРіСѓРјРµРЅС‚, РїСЂРѕСЃС‚Рѕ РјРµРЅРµРµ РјРѕР±РёР»СЊРЅС‹Р№.' },
    { title: 'РќРѕРєРґР°СѓРЅ Р·Р°СЃС‡РёС‚Р°РЅ.', text: 'РћС‡РµРЅСЊ С‡РµСЃС‚РЅР°СЏ РѕР±СЂР°С‚РЅР°СЏ СЃРІСЏР·СЊ РѕС‚ РёРіСЂС‹: вЂњС‚Р°Рє РґРµР»Р°С‚СЊ Р±С‹Р»Рѕ Р±РѕР»СЊРЅРѕвЂќ.' },
    { title: 'Р“РµСЂРѕР№ РІСЂРµРјРµРЅРЅРѕ РІ СЂРµР¶РёРјРµ РєРѕРІСЂР°.', text: 'РќРµ СЃР°РјС‹Р№ РіРѕСЂРґС‹Р№ СЂРµР¶РёРј, Р·Р°С‚Рѕ РґР°С‘С‚ РїР°СЂСѓ СЃРµРєСѓРЅРґ РїРѕРґСѓРјР°С‚СЊ Рѕ РІС‹Р±РѕСЂРµ РјР°СЂС€СЂСѓС‚Р°.' },
  ];
  if (key.includes('final_death') || key.includes('player_final_death') || key.includes('death')) return [
    { title: 'Р“РµСЂРѕР№ Р·Р°РєРѕРЅС‡РёР» Р·Р°Р±РµРі СЃ РґСЂР°РјР°С‚РёС‡РЅС‹Рј С€Р»РµРїРєРѕРј.', text: 'РђСЂРµРЅР° Р±Р»Р°РіРѕРґР°СЂРёС‚ Р·Р° СѓС‡Р°СЃС‚РёРµ, РЅРµСЂРІС‹, РїР°С‚СЂРѕРЅС‹ Рё СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ, РєРѕС‚РѕСЂР°СЏ РґРµСЂР¶Р°Р»Р°СЃСЊ РґРѕР»СЊС€Рµ HP.' },
    { title: 'Р¤РёРЅР°Р»СЊРЅР°СЏ СЃРјРµСЂС‚СЊ РїСЂРёС€Р»Р° Р±РµР· СЃС‚СѓРєР°.', text: 'РћС‡РµРЅСЊ РіСЂСѓР±Рѕ, РѕС‡РµРЅСЊ СЌС„С„РµРєС‚РЅРѕ Рё СЃРѕРІРµСЂС€РµРЅРЅРѕ РЅРµ РїРѕ СЂР°СЃРїРёСЃР°РЅРёСЋ РіРµСЂРѕСЏ.' },
    { title: 'РРіСЂРѕРє РІС‹Р±С‹Р», РЅРѕ РѕСЃС‚Р°РІРёР» Р»РµРіРµРЅРґСѓ.', text: 'Р›РµРіРµРЅРґР° РєРѕСЂРѕС‚РєР°СЏ: вЂњСЏ РїРѕС‡С‚Рё РІС‹РІРµР·вЂќ. Р’ СЌС‚РѕР№ РёРіСЂРµ СЌС‚Рѕ СѓР¶Рµ Р»РёС‚РµСЂР°С‚СѓСЂРЅС‹Р№ Р¶Р°РЅСЂ.' },
    { title: 'Р—Р°Р±РµРі РґР»СЏ РіРµСЂРѕСЏ Р·Р°РєРѕРЅС‡РёР»СЃСЏ.', text: 'РљРѕРјРјРµРЅС‚Р°С‚РѕСЂ СЃРЅРёРјР°РµС‚ С€Р»СЏРїСѓ, РїРѕС‚РѕРј РЅР°РґРµРІР°РµС‚ РѕР±СЂР°С‚РЅРѕ, РїРѕС‚РѕРјСѓ С‡С‚Рѕ РІРѕРєСЂСѓРі РІСЃС‘ РµС‰С‘ Р»РµС‚Р°СЋС‚ РїСЂРѕР±Р»РµРјС‹.' },
    { title: 'Р“РµСЂРѕР№ РїР°Р», Р°СЂРµРЅР° СЃРґРµР»Р°Р»Р° РІРёРґ, С‡С‚Рѕ РµР№ РЅРµ РіСЂСѓСЃС‚РЅРѕ.', text: 'РњС‹ РµР№ РЅРµ РІРµСЂРёРј. РќРѕ Рё СЃРїРѕСЂРёС‚СЊ СЃ Р°СЂРµРЅРѕР№ СЃРµР№С‡Р°СЃ РєР°Рє-С‚Рѕ РЅРµ С…РѕС‡РµС‚СЃСЏ.' },
    { title: 'РџРѕСЃР»РµРґРЅРёР№ HP СѓС€С‘Р» РІ Р·Р°РєР°С‚.', text: 'РљСЂР°СЃРёРІРѕ, С‚СЂР°РіРёС‡РЅРѕ Рё СЃ Р»С‘РіРєРёРј Р°СЂРѕРјР°С‚РѕРј вЂњРЅР°РґРѕ Р±С‹Р»Рѕ Р±СЂР°С‚СЊ РґСЂСѓРіРѕР№ РЅР°РІС‹РєвЂќ.' },
    { title: 'Р¤РёРЅР°Р»СЊРЅС‹Р№ СЌРєСЂР°РЅ РїРѕС‡С‚Рё СЃР»С‹С€РЅРѕ.', text: 'РћРЅ С‚РёС…Рѕ РіРѕРІРѕСЂРёС‚: вЂњРќСѓ С‡С‚Рѕ, РµС‰С‘ СЂР°Р·РѕРє?вЂќ. Р СЌС‚Рѕ, РєРѕРЅРµС‡РЅРѕ, Р»РѕРІСѓС€РєР°.' },
    { title: 'Р“РµСЂРѕР№ РѕС‚РїСЂР°РІРёР»СЃСЏ РІ Р·Р°Р» СЃР»Р°РІС‹ РѕС€РёР±РѕРє.', text: 'РўР°Рј СѓСЋС‚РЅРѕ, РјРЅРѕРіРѕР»СЋРґРЅРѕ Рё РІСЃРµ РЅР°С‡РёРЅР°СЋС‚ СЂР°СЃСЃРєР°Р· СЃРѕ СЃР»РѕРІ вЂњРґР° СЏ РїСЂРѕСЃС‚Рѕ РЅРµ Р·Р°РјРµС‚РёР»вЂќ.' },
    { title: 'Р—Р°Р±РµРі РїРѕРґРїРёСЃР°Р» Р·Р°СЏРІР»РµРЅРёРµ РЅР° С„РёРЅР°Р».', text: 'Р“РµСЂРѕР№ РґРµСЂР¶Р°Р»СЃСЏ РґРѕСЃС‚РѕР№РЅРѕ, РЅРѕ Р°СЂРµРЅР° СЃРµРіРѕРґРЅСЏ Р±С‹Р»Р° Р±СѓС…РіР°Р»С‚РµСЂРѕРј: РІСЃС‘ РїРѕСЃС‡РёС‚Р°Р»Р° Рё СЃРїРёСЃР°Р»Р°.' },
    { title: 'Р¤РёРЅР°Р»СЊРЅР°СЏ С‚РѕС‡РєР° РїРѕСЃС‚Р°РІР»РµРЅР°.', text: 'РџСѓР±Р»РёРєР° РІС‹РґРѕС…РЅСѓР»Р°, РјРѕРЅСЃС‚СЂС‹ РґРѕРІРѕР»СЊРЅС‹, РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ РґРµР»Р°РµС‚ РІРёРґ, С‡С‚Рѕ РЅРµ РїСЂРёРІСЏР·Р°Р»СЃСЏ.' },
    { title: 'Р“РµСЂРѕР№ РІС‹С€РµР» РёР· С‡Р°С‚Р° Р¶РёР·РЅРё.', text: 'РљСЂР°СЃРёРІРѕ Р±РѕСЂРѕР»СЃСЏ, С€СѓРјРЅРѕ РїР°РґР°Р», РѕСЃС‚Р°РІРёР» РїРѕСЃР»Рµ СЃРµР±СЏ РѕРїС‹С‚ Рё Р»С‘РіРєСѓСЋ РЅРµР»РѕРІРєРѕСЃС‚СЊ.' },
    { title: 'РђСЂРµРЅР° Р·Р°Р±СЂР°Р»Р° СЃРІРѕС‘.', text: 'РЎСѓСЂРѕРІРѕ, Р±РµР· Р»РёС€РЅРµР№ Р»РёСЂРёРєРё Рё СЃ РѕС‚РІСЂР°С‚РёС‚РµР»СЊРЅРѕ С…РѕСЂРѕС€РёРј С‚Р°Р№РјРёРЅРіРѕРј.' },
    { title: 'Р­С‚Рѕ Р±С‹Р» РїРѕСЃР»РµРґРЅРёР№ Р°СЂРіСѓРјРµРЅС‚ РіРµСЂРѕСЏ.', text: 'Р”Р°Р»СЊС€Рµ РіРѕРІРѕСЂСЏС‚ С‚РѕР»СЊРєРѕ СЃС‚Р°С‚РёСЃС‚РёРєР°, СЌРєСЂР°РЅ СЃРјРµСЂС‚Рё Рё С‚РёС…РѕРµ вЂњРЅСѓ РµС‰С‘ РѕРґРёРЅ Р·Р°Р±РµРівЂќ.' },
    { title: 'Р¤РёРЅР°Р»СЊРЅС‹Р№ РїРѕРєР»РѕРЅ СЃРѕСЃС‚РѕСЏР»СЃСЏ.', text: 'РќРµ СЃРѕРІСЃРµРј РґРѕР±СЂРѕРІРѕР»СЊРЅС‹Р№, Р·Р°С‚Рѕ РѕС‡РµРЅСЊ СѓР±РµРґРёС‚РµР»СЊРЅС‹Р№ СЃ С‚РѕС‡РєРё Р·СЂРµРЅРёСЏ С„РёР·РёРєРё.' },
    { title: 'Р“РµСЂРѕР№ Р·Р°РєРѕРЅС‡РёР» СЃРјРµРЅСѓ.', text: 'Р Р°Р±РѕС‡РёР№ РґРµРЅСЊ Р±С‹Р» РЅР°СЃС‹С‰РµРЅРЅС‹Р№: Р±РµРі, СЃС‚СЂРµР»СЊР±Р°, РїР°РЅРёРєР° Рё РІРЅРµР·Р°РїРЅС‹Р№ РѕС‚РїСѓСЃРє РІ РјРµРЅСЋ.' },
    { title: 'Р—Р°Р±РµРі Р·Р°РІРµСЂС€С‘РЅ СЃ С…Р°СЂР°РєС‚РµСЂРѕРј.', text: 'РќРµ РїРѕР±РµРґР°, РЅРѕ Рё РЅРµ СЃРєСѓС‡РЅРѕ. Рђ СЌС‚Рѕ, Р±СѓРґРµРј С‡РµСЃС‚РЅС‹, СѓР¶Рµ РїРѕР»РѕРІРёРЅР° С€РѕСѓ.' },
  ];
  return [];
}

function setCommentaryVariant(variants, eventKey = 'generic', cooldownMs = 6000) {
  const selected = pickCommentaryVariant([...(Array.isArray(variants) ? variants : []), ...getExtraCommentaryVariants(eventKey)], null);
  if (!selected) return false;
  return setCommentatorLine(selected.title, selected.text, eventKey, cooldownMs);
}

function maybeCommentateSystemMessage(message) {
  const text = String(message || '').trim();
  if (!text) return;
  const pickedWeaponMatchNew = text.match(/\bPicked\s+(.+?)(?:[.!]|$)/i);
  if (pickedWeaponMatchNew) {
    const weaponLabel = String(pickedWeaponMatchNew[1] || 'РѕСЂСѓР¶РёРµ').trim();
    setCommentaryVariant([
      { title: `РќР°Р№РґРµРЅРѕ: ${weaponLabel}.`, text: 'Р›СѓС‚ РЅР°Р№РґРµРЅ, Р·РґСЂР°РІС‹Р№ СЃРјС‹СЃР» РІСЂРµРјРµРЅРЅРѕ РѕС‚Р»РѕР¶РµРЅ. РЎР°РјРѕРµ РІСЂРµРјСЏ РїСЂРѕРІРµСЂРёС‚СЊ, РЅР°СЃРєРѕР»СЊРєРѕ СЌС‚Р° Р¶РµР»РµР·РєР° РґСЂСѓР¶РёС‚ СЃ С‚РѕС‡РЅРѕСЃС‚СЊСЋ.' },
      { title: `${weaponLabel} Сѓ РіРµСЂРѕСЏ РІ СЂСѓРєР°С….`, text: 'РћС‚Р»РёС‡РЅРѕ. РўРµРїРµСЂСЊ РјРѕР¶РЅРѕ РѕС€РёР±Р°С‚СЊСЃСЏ Р±С‹СЃС‚СЂРµРµ, РіСЂРѕРјС‡Рµ Рё Р·РЅР°С‡РёС‚РµР»СЊРЅРѕ РґРѕСЂРѕР¶Рµ РґР»СЏ РјРµСЃС‚РЅРѕР№ С„Р°СѓРЅС‹.' },
      { title: `${weaponLabel} РїРѕС€С‘Р» РІ СЂР°Р±РѕС‚Сѓ.`, text: 'РђСЂРµРЅР° С‚РѕР»СЊРєРѕ С‡С‚Рѕ РІС‹РґР°Р»Р° РЅРѕРІС‹Р№ Р°СЂРіСѓРјРµРЅС‚ РІ СЃРїРѕСЂРµ СЃ С„Р°СѓРЅРѕР№. РЈ Р°СЂРіСѓРјРµРЅС‚Р° РїРѕРґРѕР·СЂРёС‚РµР»СЊРЅРѕ С…РѕСЂРѕС€РёР№ СѓСЂРѕРЅ Рё РїР»РѕС…РѕР№ С…Р°СЂР°РєС‚РµСЂ.' },
      { title: `РЎРІРµР¶РёР№ СЃС‚РІРѕР»: ${weaponLabel}.`, text: 'Р›СЋР±Р»СЋ СЌС‚РѕС‚ Р·РІСѓРє. Р­С‚Рѕ Р·РІСѓРє РЅР°РґРµР¶РґС‹, РєРѕС‚РѕСЂР°СЏ РµС‰С‘ РЅРµ Р·РЅР°РµС‚, РєР°Рє Р±С‹СЃС‚СЂРѕ РµС‘ СЃРµР№С‡Р°СЃ РїСЂРѕРІРµСЂСЏС‚ РЅР° РїСЂРѕС‡РЅРѕСЃС‚СЊ.' },
      { title: `${weaponLabel} РЅР°Р№РґРµРЅ Рё РЅРµРјРµРґР»РµРЅРЅРѕ СѓСЃС‹РЅРѕРІР»С‘РЅ.`, text: 'Р“РµСЂРѕР№ СЃРЅРѕРІР° РґРѕРєР°Р·Р°Р», С‡С‚Рѕ РјРѕР¶РµС‚ РїСЂРёРІСЏР·Р°С‚СЊСЃСЏ Рє РѕСЂСѓР¶РёСЋ Р±С‹СЃС‚СЂРµРµ, С‡РµРј Рє Р·РґСЂР°РІРѕРјСѓ СЃРјС‹СЃР»Сѓ.' },
      { title: `${weaponLabel} РІСЃС‚СѓРїР°РµС‚ РІ СЌС„РёСЂ.`, text: 'РџСѓР±Р»РёРєР° Р¶РґС‘С‚ С‚РµСЃС‚-РґСЂР°Р№РІ, РјРѕРЅСЃС‚СЂС‹ Р¶РґСѓС‚ С…СѓРґС€РµРіРѕ, Р° РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ СѓР¶Рµ РјРѕСЂР°Р»СЊРЅРѕ РіРѕС‚РѕРІРёС‚ СЃР°СЂРєР°Р·Рј РЅР° РїРѕСЃР»РµРґСЃС‚РІРёСЏ.' },
    ], `weapon_pick_${weaponLabel.toLowerCase()}`, 3500);
    return;
  }
  if (/activated XP Surge/i.test(text)) {
    setCommentaryVariant([
      { title: 'XP РїРѕР»РµС‚РµР»Р° СЃР°РјР°.', text: 'Р›РµРЅСЊ РѕС„РёС†РёР°Р»СЊРЅРѕ РїСЂРёР·РЅР°РЅР° С‚Р°РєС‚РёРєРѕР№: РєСЂРёСЃС‚Р°Р»Р»С‹ СЃР°РјРё Р±РµРіСѓС‚ Рє РіРµСЂРѕСЋ, РєР°Рє РЅРµРѕРїР»Р°С‡РµРЅРЅС‹Рµ РґРѕР»РіРё.' },
      { title: 'XP Surge Р°РєС‚РёРІРёСЂРѕРІР°РЅ.', text: 'РћС‡РµРЅСЊ СѓРґРѕР±РЅРѕ. Р”Р°Р¶Рµ РѕРїС‹С‚ СѓСЃС‚Р°Р» Р¶РґР°С‚СЊ Рё СЂРµС€РёР» СЃР°Рј РїСЂРёР№С‚Рё РІ СЂСѓРєРё.' },
      { title: 'РћРїС‹С‚ СЃР°Рј РїРѕС€С‘Р» РЅР°РІСЃС‚СЂРµС‡Сѓ.', text: 'РљСЂР°СЃРѕС‚Р°. Р”Р°Р¶Рµ РїСЂРѕРєР°С‡РєР° РїРѕРЅСЏР»Р°, С‡С‚Рѕ РіРµСЂРѕР№ СЃР»РёС€РєРѕРј Р·Р°РЅСЏС‚ РІС‹Р¶РёРІР°РЅРёРµРј, С‡С‚РѕР±С‹ Р±РµРіР°С‚СЊ Р·Р° РЅРµР№ РЅРѕРіР°РјРё.' },
      { title: 'Р›РµРЅРёРІС‹Р№ С„Р°СЂРј РІРєР»СЋС‡С‘РЅ РѕС„РёС†РёР°Р»СЊРЅРѕ.', text: 'РљСЂРёСЃС‚Р°Р»Р»С‹ СЃС‚СЏРіРёРІР°СЋС‚СЃСЏ СЃР°РјРё. Р­С‚Рѕ РЅРµ РјР°РіРёСЏ, СЌС‚Рѕ РјРµС‡С‚Р° С‡РµР»РѕРІРµРєР°, РєРѕС‚РѕСЂС‹Р№ СѓСЃС‚Р°Р» СЃРѕР±РёСЂР°С‚СЊ РёС… РІСЂСѓС‡РЅСѓСЋ.' },
      { title: 'XP Surge РІСЂСѓР±Р°РµС‚СЃСЏ Р±РµР· СЃС‚С‹РґР°.', text: 'РћС‡РµРЅСЊ Р·СЂРµР»РѕРµ СЂРµС€РµРЅРёРµ: РїСѓСЃС‚СЊ РѕРїС‹С‚ СЃР°Рј РїСЂРёС…РѕРґРёС‚, РїРѕРєР° РіРµСЂРѕР№ РґРµР»Р°РµС‚ РІРёРґ, С‡С‚Рѕ РїРѕР»РЅРѕСЃС‚СЊСЋ РєРѕРЅС‚СЂРѕР»РёСЂСѓРµС‚ РїСЂРѕРёСЃС…РѕРґСЏС‰РµРµ.' },
    ], 'xp_surge', 4000);
    return;
  }
  if (/joined room/i.test(text)) {
    setCommentaryVariant([
      { title: 'РЎРІРµР¶Р°СЏ РєСЂРѕРІСЊ РЅР° Р°СЂРµРЅРµ.', text: 'Р•С‰С‘ РѕРґРёРЅ РёРіСЂРѕРє Р·Р°Р»РµС‚РµР» РІ РјСЏСЃРѕСЂСѓР±РєСѓ. РўРµРїРµСЂСЊ РѕС€РёР±Р°С‚СЊСЃСЏ РјРѕР¶РЅРѕ РЅРµРјРЅРѕРіРѕ РєРѕР»Р»РµРєС‚РёРІРЅРµРµ.' },
      { title: 'Р’ РєРѕРјРЅР°С‚Рµ РїСЂРёР±Р°РІРёР»РѕСЃСЊ СѓРІРµСЂРµРЅРЅРѕСЃС‚Рё.', text: 'РќРѕРІС‹Р№ Р±РѕРµС† РІ СЌС„РёСЂРµ. РђСЂРµРЅР° СѓР¶Рµ РіРѕС‚РѕРІРёС‚ РґР»СЏ РЅРµРіРѕ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Р№ РЅР°Р±РѕСЂ РЅРµРїСЂРёСЏС‚РЅС‹С… СЃСЋСЂРїСЂРёР·РѕРІ.' },
      { title: 'РќР° Р°СЂРµРЅСѓ Р·Р°С€С‘Р» РµС‰С‘ РѕРґРёРЅ РѕРїС‚РёРјРёСЃС‚.', text: 'Р’СЃРµРіРґР° РїСЂРёСЏС‚РЅРѕ РІРёРґРµС‚СЊ С‡РµР»РѕРІРµРєР°, РєРѕС‚РѕСЂС‹Р№ РїРѕРєР° РµС‰С‘ РІРµСЂРёС‚, С‡С‚Рѕ РІСЃС‘ СЌС‚Рѕ Р·Р°РєРѕРЅС‡РёС‚СЃСЏ С…РѕСЂРѕС€Рѕ.' },
      { title: 'РџРѕРґРєСЂРµРїР»РµРЅРёРµ РїСЂРёР±С‹Р»Рѕ РєСЂР°СЃРёРІРѕ Рё Р±РµР· РіР°СЂР°РЅС‚РёР№.', text: 'РљРѕРјР°РЅРґР° СЂР°СЃС€РёСЂСЏРµС‚СЃСЏ. РљРѕР»РёС‡РµСЃС‚РІРѕ С…Р°РѕСЃР° СЂР°СЃС‚С‘С‚ РґР°Р¶Рµ Р±С‹СЃС‚СЂРµРµ, С‡РµРј РїРѕС‚РµРЅС†РёР°Р»СЊРЅР°СЏ РєРѕРѕСЂРґРёРЅР°С†РёСЏ.' },
    ], 'join_room', 5000);
    return;
  }
  if (/left room/i.test(text)) {
    setCommentaryVariant([
      { title: 'РљС‚Рѕ-С‚Рѕ СЂРµС€РёР» Р¶РёС‚СЊ РїРѕРґРѕР»СЊС€Рµ.', text: 'РРіСЂРѕРє РІС‹С€РµР» РёР· РєРѕРјРЅР°С‚С‹. РћСЃСѓР¶РґР°С‚СЊ РЅРµ Р±СѓРґРµРј. РЎР»РµРіРєР° СѓСЃРјРµС…РЅС‘РјСЃСЏ Рё РїСЂРѕРґРѕР»Р¶РёРј.' },
      { title: 'РћРґРёРЅ Р±РёР»РµС‚ РІ Р·РґСЂР°РІС‹Р№ СЃРјС‹СЃР» РёСЃРїРѕР»СЊР·РѕРІР°РЅ.', text: 'РљС‚Рѕ-С‚Рѕ РїРѕРєРёРЅСѓР» СЌС„РёСЂ СЂР°РЅСЊС€Рµ, С‡РµРј Р°СЂРµРЅР° СѓСЃРїРµР»Р° РѕР±СЉСЏСЃРЅРёС‚СЊ РµРјСѓ СЃРІРѕСЋ РїРѕР·РёС†РёСЋ РґРѕ РєРѕРЅС†Р°.' },
      { title: 'РЎРѕСЃС‚Р°РІ СЃР»РµРіРєР° РїРѕСЂРµРґРµР» РїРѕ РґРѕР±СЂРѕР№ РІРѕР»Рµ.', text: 'Р РµРґРєРёР№ Р¶Р°РЅСЂ РЅР° СЌС‚РѕР№ Р°СЂРµРЅРµ: С‡РµР»РѕРІРµРє СѓС€С‘Р» СЃР°Рј, Р° РЅРµ РІ РІРёРґРµ РґСЂР°РјР°С‚РёС‡РµСЃРєРѕР№ РіРѕСЂРёР·РѕРЅС‚Р°Р»Рё.' },
    ], 'leave_room', 5000);
    return;
  }
  if (/boss is approaching|portal opened/i.test(text)) {
    setCommentaryVariant([
      { title: 'РџРѕСЂС‚Р°Р» РЅР° Р±РѕСЃСЃР° СѓР¶Рµ РѕС‚РєСЂС‹С‚.', text: 'РџРѕР·РґСЂР°РІР»СЏСЋ, РёРіСЂР° РѕС„РёС†РёР°Р»СЊРЅРѕ РїРµСЂРµСЃС‚Р°Р»Р° С€СѓС‚РёС‚СЊ Рё РЅР°С‡Р°Р»Р° РіРѕС‚РѕРІРёС‚СЊ РїСЂРѕР±Р»РµРјС‹ РїРѕРєСЂСѓРїРЅРµРµ.' },
      { title: 'РћС‚РєСЂС‹Р»Р°СЃСЊ РґРІРµСЂСЊ РІ РѕС‚РґРµР» РєСЂСѓРїРЅС‹С… РЅРµРїСЂРёСЏС‚РЅРѕСЃС‚РµР№.', text: 'РЎ СЌС‚РѕРіРѕ РјРѕРјРµРЅС‚Р° С„Р°СЂРј СѓР¶Рµ СЃС‡РёС‚Р°РµС‚СЃСЏ РЅРµ РїРѕРґРіРѕС‚РѕРІРєРѕР№, Р° РЅРµСЂРІРЅС‹Рј С‚РёРєРѕРј РїРµСЂРµРґ РЅР°С‡Р°Р»СЊСЃС‚РІРѕРј.' },
      { title: 'РџРѕСЂС‚Р°Р» Р±РѕСЃСЃР° Р°РєС‚РёРІРµРЅ.', text: 'РђСЂРµРЅР° РєР°Рє Р±С‹ РЅР°РјРµРєР°РµС‚: СЂР°Р·РјРёРЅРєР° Р·Р°РєРѕРЅС‡РёР»Р°СЃСЊ, С‚РµРїРµСЂСЊ РїРѕР№РґСѓС‚ РІРѕРїСЂРѕСЃС‹ Р±РµР· РІР°СЂРёР°РЅС‚РѕРІ РѕС‚РІРµС‚Р°.' },
    ], 'boss_portal_system', 9000);
    return;
  }
  if (/BOSS arrived/i.test(text)) {
    setCommentaryVariant([
      { title: 'Р‘РѕСЃСЃ РїСЂРёР±С‹Р» Р»РёС‡РЅРѕ.', text: 'Р’РѕС‚ Рё РЅР°С‡Р°Р»СЊСЃС‚РІРѕ. РЎРµР№С‡Р°СЃ РЅР°С‡РЅСѓС‚СЃСЏ С‚Рµ СЃР°РјС‹Рµ РґРІРёР¶РµРЅРёСЏ, Р·Р° РєРѕС‚РѕСЂС‹Рµ РїРѕС‚РѕРј СЃС‚С‹РґРЅРѕ, РЅРѕ РєСЂР°СЃРёРІРѕ.' },
      { title: 'Р’ СЌС„РёСЂ Р·Р°С€С‘Р» СЃР°РјС‹Р№ РЅРµРїСЂРёСЏС‚РЅС‹Р№ РіРѕСЃС‚СЊ РІРµС‡РµСЂР°.', text: 'Р‘РѕСЃСЃ РЅР° РєР°СЂС‚Рµ. РЎРµР№С‡Р°СЃ Р±С‹СЃС‚СЂРѕ РІС‹СЏСЃРЅРёРј, РєС‚Рѕ С‚СѓС‚ РіРµСЂРѕР№, Р° РєС‚Рѕ РїСЂРѕСЃС‚Рѕ С‚Р°Р»Р°РЅС‚Р»РёРІРѕ СѓР±РµРіР°Р» РєСЂСѓРіР°РјРё.' },
      { title: 'Р“Р»Р°РІРЅР°СЏ РїСЂРѕР±Р»РµРјР° РјР°С‚С‡Р° РїСЂРёР±С‹Р»Р° Р±РµР· РѕРїРѕР·РґР°РЅРёР№.', text: 'РћС‡РµРЅСЊ РґРµР»РѕРІРѕР№ РІРёР·РёС‚: РјРёРЅРёРјСѓРј СЃР»РѕРІ, РјР°РєСЃРёРјСѓРј РґР°РІР»РµРЅРёСЏ Рё РїРѕР»РЅРѕРµ РЅРµСѓРІР°Р¶РµРЅРёРµ Рє Р»РёС‡РЅС‹Рј РіСЂР°РЅРёС†Р°Рј РёРіСЂРѕРєРѕРІ.' },
    ], 'boss_arrived_system', 9000);
    return;
  }
  if (/was eliminated/i.test(text)) {
    setCommentaryVariant([
      { title: 'РњРёРЅСѓСЃ РѕРґРёРЅ, РЅРѕ РЅРµ РЅР°РІСЃРµРіРґР°.', text: 'РќР° Р°СЂРµРЅРµ СЃР»СѓС‡РёР»РѕСЃСЊ РЅР°СЃРёР»СЊСЃС‚РІРµРЅРЅРѕРµ РїРµСЂРµСЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ РёРЅРёС†РёР°С‚РёРІС‹. РљРѕРјСѓ-С‚Рѕ РїРѕСЂР° Р¶РґР°С‚СЊ СЂРµСЃРїР°РІРЅ.' },
      { title: 'Р¤СЂР°Рі РѕС„РѕСЂРјР»РµРЅ Р±РµР· Р»РёС€РЅРµР№ РґРёРїР»РѕРјР°С‚РёРё.', text: 'РљС‚Рѕ-С‚Рѕ С‚РѕР»СЊРєРѕ С‡С‚Рѕ РїСЂРѕРёРіСЂР°Р» СЃРїРѕСЂ СЃ СѓСЂРѕРЅРѕРј Рё С‚РµРїРµСЂСЊ РІСЂРµРјРµРЅРЅРѕ РїРµСЂРµСЃРјР°С‚СЂРёРІР°РµС‚ Р¶РёР·РЅРµРЅРЅС‹Рµ СЂРµС€РµРЅРёСЏ.' },
      { title: 'Р’ PvP СЃРЅРѕРІР° РїРѕР±РµРґРёР»Р° РіСЂСѓР±Р°СЏ СѓР±РµРґРёС‚РµР»СЊРЅРѕСЃС‚СЊ.', text: 'РћРґРёРЅ РёРіСЂРѕРє РѕС‚РїСЂР°РІР»РµРЅ РїРѕРґСѓРјР°С‚СЊ Рѕ Р¶РёР·РЅРё. Р–РµР»Р°С‚РµР»СЊРЅРѕ РґРѕ СЃР»РµРґСѓСЋС‰РµРіРѕ СЂРµСЃРїР°РІРЅР°.' },
    ], 'pvp_elimination', 5000);
    return;
  }
  const pickedWeaponMatch = text.match(/\bPicked\s+(.+?)(?:[.!]|$)/i);
  if (pickedWeaponMatch) {
    const weaponLabel = String(pickedWeaponMatch[1] || 'РѕСЂСѓР¶РёРµ').trim();
    setCommentaryVariant([
      { title: `РќР°Р№РґРµРЅРѕ: ${weaponLabel}.`, text: 'Р›СѓС‚ РЅР°Р№РґРµРЅ, Р·РґСЂР°РІС‹Р№ СЃРјС‹СЃР» РІСЂРµРјРµРЅРЅРѕ РѕС‚Р»РѕР¶РµРЅ. РЎР°РјРѕРµ РІСЂРµРјСЏ РїСЂРѕРІРµСЂРёС‚СЊ, РЅР°СЃРєРѕР»СЊРєРѕ СЌС‚Р° Р¶РµР»РµР·РєР° РґСЂСѓР¶РёС‚ СЃ С‚РѕС‡РЅРѕСЃС‚СЊСЋ.' },
      { title: `${weaponLabel} Сѓ РіРµСЂРѕСЏ РІ СЂСѓРєР°С….`, text: 'РћС‚Р»РёС‡РЅРѕ. РўРµРїРµСЂСЊ РјРѕР¶РЅРѕ РѕС€РёР±Р°С‚СЊСЃСЏ Р±С‹СЃС‚СЂРµРµ, РіСЂРѕРјС‡Рµ Рё Р·РЅР°С‡РёС‚РµР»СЊРЅРѕ РґРѕСЂРѕР¶Рµ РґР»СЏ РјРµСЃС‚РЅРѕР№ С„Р°СѓРЅС‹.' },
    ], `weapon_pick_${weaponLabel.toLowerCase()}`, 3500);
    return;
  }
  if (/activated XP Surge/i.test(text)) {
    setCommentaryVariant([
      { title: 'XP РїРѕР»РµС‚РµР»Р° СЃР°РјР°.', text: 'Р›РµРЅСЊ РѕС„РёС†РёР°Р»СЊРЅРѕ РїСЂРёР·РЅР°РЅР° С‚Р°РєС‚РёРєРѕР№: РєСЂРёСЃС‚Р°Р»Р»С‹ СЃР°РјРё Р±РµРіСѓС‚ Рє РіРµСЂРѕСЋ, РєР°Рє РЅРµРѕРїР»Р°С‡РµРЅРЅС‹Рµ РґРѕР»РіРё.' },
      { title: 'XP Surge Р°РєС‚РёРІРёСЂРѕРІР°РЅ.', text: 'РћС‡РµРЅСЊ СѓРґРѕР±РЅРѕ. Р”Р°Р¶Рµ РѕРїС‹С‚ СѓСЃС‚Р°Р» Р¶РґР°С‚СЊ Рё СЂРµС€РёР» СЃР°Рј РїСЂРёР№С‚Рё РІ СЂСѓРєРё.' },
    ], 'xp_surge', 4000);
    return;
  }
  if (/joined room/i.test(text)) {
    setCommentatorLine('РЎРІРµР¶Р°СЏ РєСЂРѕРІСЊ РЅР° Р°СЂРµРЅРµ.', 'Р•С‰С‘ РѕРґРёРЅ РёРіСЂРѕРє Р·Р°Р»РµС‚РµР» РІ РјСЏСЃРѕСЂСѓР±РєСѓ. РўРµРїРµСЂСЊ РѕС€РёР±Р°С‚СЊСЃСЏ РјРѕР¶РЅРѕ РЅРµРјРЅРѕРіРѕ РєРѕР»Р»РµРєС‚РёРІРЅРµРµ.', 'join_room', 5000);
    return;
  }
  if (/left room/i.test(text)) {
    setCommentatorLine('РљС‚Рѕ-С‚Рѕ СЂРµС€РёР» Р¶РёС‚СЊ РїРѕРґРѕР»СЊС€Рµ.', 'РРіСЂРѕРє РІС‹С€РµР» РёР· РєРѕРјРЅР°С‚С‹. РћСЃСѓР¶РґР°С‚СЊ РЅРµ Р±СѓРґРµРј. РЎР»РµРіРєР° СѓСЃРјРµС…РЅС‘РјСЃСЏ Рё РїСЂРѕРґРѕР»Р¶РёРј.', 'leave_room', 5000);
    return;
  }
  if (/boss is approaching|portal opened/i.test(text)) {
    setCommentatorLine('РџРѕСЂС‚Р°Р» РЅР° Р±РѕСЃСЃР° СѓР¶Рµ РѕС‚РєСЂС‹С‚.', 'РџРѕР·РґСЂР°РІР»СЏСЋ, РёРіСЂР° РѕС„РёС†РёР°Р»СЊРЅРѕ РїРµСЂРµСЃС‚Р°Р»Р° С€СѓС‚РёС‚СЊ Рё РЅР°С‡Р°Р»Р° РіРѕС‚РѕРІРёС‚СЊ РїСЂРѕР±Р»РµРјС‹ РїРѕРєСЂСѓРїРЅРµРµ.', 'boss_portal_system', 9000);
    return;
  }
  if (/BOSS arrived/i.test(text)) {
    setCommentatorLine('Р‘РѕСЃСЃ РїСЂРёР±С‹Р» Р»РёС‡РЅРѕ.', 'Р’РѕС‚ Рё РЅР°С‡Р°Р»СЊСЃС‚РІРѕ. РЎРµР№С‡Р°СЃ РЅР°С‡РЅСѓС‚СЃСЏ С‚Рµ СЃР°РјС‹Рµ РґРІРёР¶РµРЅРёСЏ, Р·Р° РєРѕС‚РѕСЂС‹Рµ РїРѕС‚РѕРј СЃС‚С‹РґРЅРѕ, РЅРѕ РєСЂР°СЃРёРІРѕ.', 'boss_arrived_system', 9000);
    return;
  }
  if (/was eliminated/i.test(text)) {
    setCommentatorLine('РњРёРЅСѓСЃ РѕРґРёРЅ, РЅРѕ РЅРµ РЅР°РІСЃРµРіРґР°.', 'РќР° Р°СЂРµРЅРµ СЃР»СѓС‡РёР»РѕСЃСЊ РЅР°СЃРёР»СЊСЃС‚РІРµРЅРЅРѕРµ РїРµСЂРµСЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ РёРЅРёС†РёР°С‚РёРІС‹. РљРѕРјСѓ-С‚Рѕ РїРѕСЂР° Р¶РґР°С‚СЊ СЂРµСЃРїР°РІРЅ.', 'pvp_elimination', 5000);
  }
}

function getPlayerSkillRankMap(player) {
  const out = new Map();
  const skills = Array.isArray(player?.skills) ? player.skills : [];
  for (const skill of skills) {
    const id = String(skill?.id || '').trim().toLowerCase();
    if (!id) continue;
    out.set(id, Math.max(1, Number(skill?.level) || 1));
  }
  return out;
}

function seedSpectatorSkillRanks(players) {
  commentatorState.lastSkillRanks.clear();
  for (const player of Array.isArray(players) ? players : []) {
    const playerId = String(player?.id || '').trim();
    if (!playerId) continue;
    for (const [skillId, level] of getPlayerSkillRankMap(player).entries()) {
      commentatorState.lastSkillRanks.set(`${playerId}:${skillId}`, level);
    }
  }
}

function maybeCommentateSpectatorSkillPicks(players) {
  if (!game.spectating) return false;
  if (commentatorState.lastSkillRanks.size <= 0) {
    seedSpectatorSkillRanks(players);
    return false;
  }
  for (const player of Array.isArray(players) ? players : []) {
    const playerId = String(player?.id || '').trim();
    if (!playerId) continue;
    const skillRanks = getPlayerSkillRankMap(player);
    for (const [skillId, level] of skillRanks.entries()) {
      const key = `${playerId}:${skillId}`;
      const previousLevel = Math.max(0, Number(commentatorState.lastSkillRanks.get(key)) || 0);
      commentatorState.lastSkillRanks.set(key, level);
      if (previousLevel <= 0 || level <= previousLevel) continue;
      const skillLabel = trSkillName(skillId, player.skills?.find((skill) => String(skill?.id || '').toLowerCase() === skillId)?.name || skillId);
      const playerName = String(player?.name || 'РРіСЂРѕРє').trim() || 'РРіСЂРѕРє';
      return setCommentaryVariant(
        buildSpectatorSkillPickCommentaryVariants(playerName, skillLabel, level),
        `spectator_skill_pick_${playerId}_${skillId}_${level}`,
        1200,
      );
    }
  }
  return false;
}

function updateInGameCommentatorFromState(state) {
  if (!state || !Array.isArray(state.players)) return;
  const players = state.players.filter((player) => player && !player.isCompanion);
  const me = players.find((player) => player.id === game.myId) || null;
  const playerCount = players.length;
  const threatLevel = Math.max(1, Number(state.roomDifficulty?.level) || 1);
  const bossAlive = Boolean(state.bossAlive);
  const bossPortalAt = Math.max(0, Number(state.nextBossSpawnAt) || 0);
  const totalEnemyKills = Math.max(0, Number(state.totalEnemyKills) || 0);
  const totalBossKills = players.reduce((acc, player) => acc + Math.max(0, Number(player?.bossKills) || 0), 0);
  const matchNow = Math.max(0, Number(state.now) || Date.now());
  const roomStartedAt = Math.max(0, Number(state.roomStartedAt) || matchNow);
  const matchSec = Math.max(0, Math.floor((matchNow - roomStartedAt) / 1000));
  const killMilestone = Math.floor(totalEnemyKills / 15);

  if (maybeCommentateSpectatorSkillPicks(players)) return;

  if (!bossAlive && bossPortalAt > matchNow) {
    const bossEtaSec = Math.max(0, Math.ceil((bossPortalAt - matchNow) / 1000));
    const bossCountdownBucket = bossEtaSec <= 3 ? 3 : bossEtaSec <= 7 ? 7 : bossEtaSec <= 12 ? 12 : 0;
    if (bossCountdownBucket > 0 && bossCountdownBucket !== commentatorState.lastBossCountdownBucket) {
      setCommentaryVariant([
        { title: `Р”Рѕ Р±РѕСЃСЃР° РѕРєРѕР»Рѕ ${bossEtaSec}СЃ.`, text: 'РњРѕР¶РЅРѕ СЃРѕР±СЂР°С‚СЊСЃСЏ, РјРѕР¶РЅРѕ Р·Р°РїР°РЅРёРєРѕРІР°С‚СЊ. РСЃС‚РѕСЂРёСЏ РїРѕРґСЃРєР°Р·С‹РІР°РµС‚, С‡С‚Рѕ РјРЅРѕРіРёРµ РїРѕРїСЂРѕР±СѓСЋС‚ РѕР±Р° РІР°СЂРёР°РЅС‚Р° СЃСЂР°Р·Сѓ.' },
        { title: `Р‘РѕСЃСЃ РїРѕС‡С‚Рё Сѓ РґРІРµСЂРё: ${bossEtaSec}СЃ.`, text: 'Р•СЃР»Рё РєС‚Рѕ-С‚Рѕ РµС‰С‘ С…РѕС‚РµР» СЃРїРѕРєРѕР№РЅРѕ РїРѕС„Р°СЂРјРёС‚СЊ, РјРѕРјРµРЅС‚ СЃР»РµРіРєР° СѓРїСѓС‰РµРЅ.' },
      ], `boss_countdown_${bossCountdownBucket}`, 3200);
    }
    commentatorState.lastBossCountdownBucket = bossCountdownBucket;
  } else {
    commentatorState.lastBossCountdownBucket = 0;
  }

  if (killMilestone > 0 && killMilestone !== commentatorState.lastKillMilestone && Date.now() - commentatorState.lastKillsRemarkAt > 9000) {
    commentatorState.lastKillsRemarkAt = Date.now();
    commentatorState.lastKillMilestone = killMilestone;
    setCommentaryVariant([
      { title: `${totalEnemyKills} РєРёР»Р»РѕРІ СѓР¶Рµ РІ РєРѕРїРёР»РєРµ.`, text: 'РђСЂРµРЅР° РїРѕСЃС‚РµРїРµРЅРЅРѕ РїСЂРµРІСЂР°С‰Р°РµС‚СЃСЏ РІ РѕС‚С‡С‘С‚ Рѕ РїРµСЂРµСЂР°Р±РѕС‚РєРµ С‡СѓРґРѕРІРёС‰. Р¦РёС„СЂС‹ С…РѕСЂРѕС€РёРµ, С€Р°РЅСЃС‹ РЅР° СЃРїРѕРєРѕР№СЃС‚РІРёРµ РїР»РѕС…РёРµ.' },
      { title: `РЎС‡С‘С‚С‡РёРє РјРѕРЅСЃС‚СЂРѕРІ СѓР¶Рµ РЅР° ${totalEnemyKills}.`, text: 'РўРµРјРї Р±РѕРґСЂС‹Р№. Р­РєРѕР»РѕРіРё, РїСЂР°РІРґР°, РІСЂСЏРґ Р»Рё РѕС†РµРЅСЏС‚ С‚Р°РєРѕР№ РїРѕРґС…РѕРґ Рє С„Р°СѓРЅРµ.' },
      { title: `${totalEnemyKills} РІСЂР°РіРѕРІ СѓР±СЂР°РЅРѕ СЃ РїРѕРІРµСЃС‚РєРё.`, text: 'РљРѕРјР°РЅРґР° СЂР°Р±РѕС‚Р°РµС‚ С‚Р°Рє, Р±СѓРґС‚Рѕ РµР№ РїР»Р°С‚СЏС‚ Р·Р° СЃРєРѕСЂРѕСЃС‚СЊ, Р° РЅРµ Р·Р° РІС‹Р¶РёРІР°РЅРёРµ.' },
    ], 'kill_milestone_extra', 9000);
  }

  const matchPulseBucket = Math.floor(matchSec / 30);
  if (matchPulseBucket > 0 && matchPulseBucket !== commentatorState.lastMatchPulseBucket) {
    commentatorState.lastMatchPulseBucket = matchPulseBucket;
    setCommentaryVariant([
      { title: `РњР°С‚С‡ РґРµСЂР¶РёС‚СЃСЏ СѓР¶Рµ ${matchSec}СЃ.`, text: 'Р”Р»СЏ СЌС‚РѕР№ Р°СЂРµРЅС‹ СЌС‚Рѕ СѓР¶Рµ СЃРµСЂСЊС‘Р·РЅС‹Рµ РѕС‚РЅРѕС€РµРЅРёСЏ: РјРЅРѕРіРѕ РЅР°РїСЂСЏР¶РµРЅРёСЏ, РјР°Р»Рѕ РґРѕРІРµСЂРёСЏ Рё РЅРё РєР°РїР»Рё СЃС‚Р°Р±РёР»СЊРЅРѕСЃС‚Рё.' },
      { title: `${matchSec} СЃРµРєСѓРЅРґ С‡РёСЃС‚РѕРіРѕ СѓРїСЂСЏРјСЃС‚РІР°.`, text: 'РљР°С‚РєР° Р·Р°С‚СЏРЅСѓР»Р°СЃСЊ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ, С‡С‚РѕР±С‹ РёРіСЂР° РЅР°С‡Р°Р»Р° РІРѕСЃРїСЂРёРЅРёРјР°С‚СЊ СЌС‚Рѕ РєР°Рє Р»РёС‡РЅС‹Р№ РІС‹Р·РѕРІ.' },
    ], `match_pulse_${matchPulseBucket}`, 6000);
  }

  if (playerCount !== commentatorState.lastPlayerCount && commentatorState.lastPlayerCount > 0) {
    const morePlayers = playerCount > commentatorState.lastPlayerCount;
    setCommentatorLine(
      morePlayers ? 'РљРѕРјРЅР°С‚Р° СЃС‚Р°РЅРѕРІРёС‚СЃСЏ Р»СЋРґРЅРµРµ.' : 'РЎРѕСЃС‚Р°РІ РїРѕСЂРµРґРµР».',
      morePlayers
        ? `РўРµРїРµСЂСЊ РІ РјР°С‚С‡Рµ ${playerCount} РёРіСЂРѕРєР°. РћС‚Р»РёС‡РЅРѕ, РѕС€РёР±РѕРє СЃС‚Р°РЅРµС‚ Р±РѕР»СЊС€Рµ, Р° Р·СЂРµР»РёС‰Рµ Р±РѕРіР°С‡Рµ.`
        : `РРіСЂРѕРєРѕРІ РѕСЃС‚Р°Р»РѕСЃСЊ ${playerCount}. РђСЂРµРЅР° СЃРЅРѕРІР° РЅР°РїРѕРјРёРЅР°РµС‚ СЃРѕР±РµСЃРµРґРѕРІР°РЅРёРµ РЅР° РІС‹Р¶РёРІР°РЅРёРµ.`,
      'player_count',
      5000,
    );
  }

  if (threatLevel > commentatorState.lastThreatLevel) {
    setCommentatorLine(
      `РЈРіСЂРѕР·Р° РІС‹СЂРѕСЃР»Р° РґРѕ ${threatLevel}.`,
      pickCommentaryVariant([
        `РњРѕР±С‹ РѕС„РёС†РёР°Р»СЊРЅРѕ Р·Р»РµРµ, Р° РїСЂР°РІРѕ РЅР° СЂР°СЃСЃР»Р°Р±Р»РµРЅРёРµ СЃРЅРѕРІР° РѕС‚РјРµРЅРµРЅРѕ.`,
        `РРіСЂР° РїРѕРґРєСЂСѓС‚РёР»Р° РґР°РІР»РµРЅРёРµ. РљС‚Рѕ РЅРµ РІ С‚РѕРЅСѓСЃРµ, С‚РѕС‚ СѓР¶Рµ РїРѕС‡С‚Рё РІ С‚РёС‚СЂР°С….`,
        `РЎР»РѕР¶РЅРѕСЃС‚СЊ РїРѕРґРЅСЏР»Р°СЃСЊ. РЎР°РјРѕРµ РІСЂРµРјСЏ РґРµР»Р°С‚СЊ РІРёРґ, С‡С‚Рѕ РёРјРµРЅРЅРѕ СЌС‚РѕРіРѕ РІС‹ Рё С…РѕС‚РµР»Рё.`,
      ], 'РЎР»РѕР¶РЅРѕСЃС‚СЊ СЂР°СЃС‚С‘С‚, Р° Р¶Р°Р»РѕР±С‹ РІСЃС‘ РµС‰С‘ РЅРµ СЃС‡РёС‚Р°СЋС‚СЃСЏ С‚Р°РєС‚РёРєРѕР№.'),
      'threat_up',
      7000,
    );
  }

  if (!commentatorState.lastBossAlive && bossPortalAt > 0 && !bossAlive) {
    setCommentatorLine(
      'РќР° РєР°СЂС‚Рµ РѕС‚РєСЂС‹Р»СЃСЏ РїРѕСЂС‚Р°Р» Р±РѕСЃСЃР°.',
      'РЎРµРєСѓРЅРґРѕРјРµСЂ С‚РёРєР°РµС‚, РЅРµСЂРІС‹ РїР»Р°РІСЏС‚СЃСЏ. Р”Рѕ Р±РѕР»СЊС€РѕРіРѕ РЅР°С‡Р°Р»СЊРЅРёРєР° РѕСЃС‚Р°Р»РѕСЃСЊ СЃРѕРІСЃРµРј РЅРµРјРЅРѕРіРѕ РїРѕР·РѕСЂР° Рё РіРµСЂРѕРёР·РјР°.',
      'boss_portal',
      9000,
    );
  }

  if (!commentatorState.lastBossAlive && bossAlive) {
    setCommentatorLine(
      'Р‘РѕСЃСЃ СѓР¶Рµ РЅР° РєР°СЂС‚Рµ.',
      'Р’РѕС‚ Рё РІСЃС‚СЂРµС‡Р°, СЂР°РґРё РєРѕС‚РѕСЂРѕР№ РІСЃРµ СЏРєРѕР±С‹ РєР°С‡Р°Р»РёСЃСЊ. РЎРµР№С‡Р°СЃ РІС‹СЏСЃРЅРёРј, РєС‚Рѕ С‚СѓС‚ РіРµСЂРѕР№, Р° РєС‚Рѕ РїСЂРѕСЃС‚Рѕ СѓРґР°С‡РЅРѕ Р±РµРіР°Р» РєСЂСѓРіР°РјРё.',
      'boss_spawn',
      10000,
    );
  }

  if (commentatorState.lastBossAlive && !bossAlive && totalBossKills > commentatorState.lastBossKills) {
    setCommentatorLine(
      'Р‘РѕСЃСЃ СѓР»РѕР¶РµРЅ.',
      'Р РµРґРєРёР№ СЃР»СѓС‡Р°Р№: РєРѕР»Р»РµРєС‚РёРІ РґРµР№СЃС‚РІРёС‚РµР»СЊРЅРѕ СЃРїСЂР°РІРёР»СЃСЏ СЃ РїСЂРѕР±Р»РµРјРѕР№, Р° РЅРµ РїСЂРѕСЃС‚Рѕ РєСЂР°СЃРёРІРѕ РѕС‚ РЅРµС‘ СѓРјРµСЂ.',
      'boss_down',
      10000,
    );
  }

  if (totalEnemyKills >= 20 && totalEnemyKills % 25 < 3 && Date.now() - commentatorState.lastKillsRemarkAt > 12000) {
    commentatorState.lastKillsRemarkAt = Date.now();
    setCommentatorLine(
      `${totalEnemyKills} РєРёР»Р»РѕРІ СѓР¶Рµ РІ РєРѕРїРёР»РєРµ.`,
      'РђСЂРµРЅР° РїРѕСЃС‚РµРїРµРЅРЅРѕ РїСЂРµРІСЂР°С‰Р°РµС‚СЃСЏ РІ РѕС‚С‡С‘С‚ Рѕ РїРµСЂРµСЂР°Р±РѕС‚РєРµ С‡СѓРґРѕРІРёС‰. Р¦РёС„СЂС‹ С…РѕСЂРѕС€РёРµ, С€Р°РЅСЃС‹ РЅР° СЃРїРѕРєРѕР№СЃС‚РІРёРµ РїР»РѕС…РёРµ.',
      'kill_milestone',
      12000,
    );
  }

  if (me && me.alive) {
    const hpRatio = Math.max(0, Math.min(1, (Number(me.hp) || 0) / Math.max(1, Number(me.maxHp) || 1)));
    if (hpRatio <= 0.35 && Date.now() - commentatorState.lastLowHpAt > 15000) {
      commentatorState.lastLowHpAt = Date.now();
      commentatorState.wasLowHp = true;
      setCommentatorLine(
        'Р—РґРѕСЂРѕРІСЊРµ РІС‹РіР»СЏРґРёС‚ С‚СЂРµРІРѕР¶РЅРѕ.',
        'РЈ РіРµСЂРѕСЏ РѕСЃС‚Р°Р»РѕСЃСЊ РјР°Р»РѕРІР°С‚Рѕ С…Рї Рё СЃР»РёС€РєРѕРј РјРЅРѕРіРѕ СЃР°РјРѕСѓРІРµСЂРµРЅРЅРѕСЃС‚Рё. РњРѕР¶РµС‚, РІСЃС‘-С‚Р°РєРё РЅР°С‡Р°С‚СЊ СѓРІР°Р¶Р°С‚СЊ РІС…РѕРґСЏС‰РёР№ СѓСЂРѕРЅ.',
        'low_hp',
        15000,
      );
    } else if (commentatorState.wasLowHp && hpRatio >= 0.72 && Date.now() - commentatorState.lastRecoveryAt > 12000) {
      commentatorState.wasLowHp = false;
      commentatorState.lastRecoveryAt = Date.now();
      setCommentaryVariant([
        { title: 'РҐРї СЃРЅРѕРІР° РїРѕС…РѕР¶Рµ РЅР° С…Рї.', text: 'Р“РµСЂРѕР№ РєР°РєРёРј-С‚Рѕ С‡СѓРґРѕРј РІС‹Р»РµР· РёР· РєСЂР°СЃРЅРѕР№ Р·РѕРЅС‹. Р—РЅР°С‡РёС‚, РґСЂР°РјСѓ РїРѕРєР° РѕС‚РєР»Р°РґС‹РІР°РµРј.' },
        { title: 'РЎС‚Р°Р±РёР»РёР·РёСЂРѕРІР°Р»РёСЃСЊ.', text: 'Р•С‰С‘ РјРёРЅСѓС‚Сѓ РЅР°Р·Р°Рґ РїР°С…Р»Рѕ РєР°С‚Р°СЃС‚СЂРѕС„РѕР№, Р° С‚РµРїРµСЂСЊ СЃРЅРѕРІР° РїР°С…РЅРµС‚ СЃР°РјРѕСѓРІРµСЂРµРЅРЅРѕСЃС‚СЊСЋ. РљСЂР°СЃРѕС‚Р°.' },
      ], 'hp_recovered', 9000);
    }
  }

  if (String(game.gameMode || '') === 'pvp' && players.length > 1) {
    const leader = players.slice().sort((a, b) =>
      (Math.max(0, Number(b.pvpKills) || 0) - Math.max(0, Number(a.pvpKills) || 0))
      || (Math.max(0, Number(b.score) || 0) - Math.max(0, Number(a.score) || 0))
      || String(a.name || '').localeCompare(String(b.name || '')))[0] || null;
    const leaderId = String(leader?.id || '');
    const leaderKills = Math.max(0, Number(leader?.pvpKills) || 0);
    if (leaderId && leaderKills > 0 && leaderId !== commentatorState.lastPvpLeaderId) {
      commentatorState.lastPvpLeaderId = leaderId;
      setCommentatorLine(
        `${String(leader?.name || 'РљС‚Рѕ-С‚Рѕ')} РІС‹С€РµР» РІРїРµСЂС‘Рґ.`,
        `Р’ PvP РїРѕСЏРІРёР»СЃСЏ Р»РёРґРµСЂ СЃ ${leaderKills} С„СЂР°РіР°РјРё. РћСЃС‚Р°Р»СЊРЅС‹Рј РїРѕСЂР° Р»РёР±Рѕ РґРѕРіРѕРЅСЏС‚СЊ, Р»РёР±Рѕ РїСЂРёРґСѓРјС‹РІР°С‚СЊ РґРѕСЃС‚РѕР№РЅС‹Рµ РѕРїСЂР°РІРґР°РЅРёСЏ.`,
        'pvp_leader',
        8000,
      );
    }
  }

  if (playerCount === 1 && commentatorState.lastPlayerCount > 1) {
    setCommentaryVariant([
      { title: 'РќР° СЃС†РµРЅРµ РѕСЃС‚Р°Р»СЃСЏ РѕРґРёРЅ С‡РµР»РѕРІРµРє.', text: 'Р’СЃСЏ РѕС‚РІРµС‚СЃС‚РІРµРЅРЅРѕСЃС‚СЊ, РІРµСЃСЊ Р»СѓС‚ Рё РІРµСЃСЊ СѓР¶Р°СЃ РјР°С‚С‡Р° С‚РµРїРµСЂСЊ Р°РєРєСѓСЂР°С‚РЅРѕ Р»РµРіР»Рё РЅР° РѕРґРЅРѕРіРѕ РіРµСЂРѕСЏ.' },
      { title: 'РЎРѕР»Рѕ-СЂРµР¶РёРј РІРєР»СЋС‡РёР»СЃСЏ СЃР°Рј.', text: 'РљРѕРјР°РЅРґРЅР°СЏ СЂР°Р±РѕС‚Р° Р·Р°РєРѕРЅС‡РёР»Р°СЃСЊ. РќР°С‡Р°Р»Р°СЃСЊ Р»РёС‡РЅР°СЏ РїРµСЂРµРїРёСЃРєР° СЃ СЃСѓРґСЊР±РѕР№ Рё СѓРєР»РѕРЅРµРЅРёСЏРјРё.' },
    ], 'solo_survivor', 7000);
  }

  commentatorState.lastPlayerCount = playerCount;
  commentatorState.lastThreatLevel = threatLevel;
  commentatorState.lastBossAlive = bossAlive;
  commentatorState.lastBossPortalAt = bossPortalAt;
  commentatorState.lastBossKills = totalBossKills;
}

commentatorVoiceToggleEl?.addEventListener('click', () => {
  setCommentatorVoiceEnabled(!commentatorSpeech.enabled);
});
if (commentatorSpeech.supported) {
  if (typeof window.speechSynthesis?.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', renderCommentatorVoiceUi);
  } else {
    window.speechSynthesis.onvoiceschanged = renderCommentatorVoiceUi;
  }
}
renderCommentatorVoiceUi();

window.setInterval(() => {
  if (!commentatorSpeech.supported || !commentatorSpeech.enabled || game.embedMode) return;
  const activeForMs = Date.now() - Math.max(0, commentatorSpeech.activeSinceAt || 0);
  const speechBusy = Boolean(window.speechSynthesis.speaking || window.speechSynthesis.pending);
  if (commentatorSpeech.activeText && !speechBusy && activeForMs > 1200) {
    commentatorSpeech.activeSinceAt = 0;
    commentatorSpeech.activeKey = '';
    commentatorSpeech.activeText = '';
    flushCommentarySpeechQueue();
    return;
  }
  if (commentatorSpeech.activeText && speechBusy && activeForMs > 25000) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore cancel failures
    }
    commentatorSpeech.activeSinceAt = 0;
    commentatorSpeech.activeKey = '';
    commentatorSpeech.activeText = '';
    window.setTimeout(flushCommentarySpeechQueue, 60);
  }
}, 1200);

function handleLocalChatCommand(rawText) {
  const src = String(rawText || '').trim();
  if (!src.startsWith('/')) return false;
  const parts = src.slice(1).split(/\s+/).filter(Boolean);
  const cmd = String(parts.shift() || '').toLowerCase();
  const argName = String(parts.join(' ') || '').trim();
  const key = normalizeChatNameKey(argName);

  if (cmd === 'mute') {
    if (!key) {
      pushLocalChatSystem(tr('ui.chat.cmd.usage_mute'));
      return true;
    }
    chatUi.mutedNames.add(key);
    saveChatMutedNames();
    pushLocalChatSystem(tr('ui.chat.cmd.muted', { name: argName }));
    return true;
  }

  if (cmd === 'unmute') {
    if (!key) {
      pushLocalChatSystem(tr('ui.chat.cmd.usage_unmute'));
      return true;
    }
    chatUi.mutedNames.delete(key);
    saveChatMutedNames();
    pushLocalChatSystem(tr('ui.chat.cmd.unmuted', { name: argName }));
    return true;
  }

  if (cmd === 'muted') {
    const names = Array.from(chatUi.mutedNames.values());
    pushLocalChatSystem(names.length ? tr('ui.chat.cmd.muted_list', { names: names.join(', ') }) : tr('ui.chat.cmd.muted_empty'));
    return true;
  }

  if (cmd === 'chathelp' || cmd === 'help') {
    pushLocalChatSystem(tr('ui.chat.cmd.help'));
    return true;
  }

  pushLocalChatSystem(tr('ui.chat.cmd.unknown'));
  return true;
}

function submitChatMessage(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return false;
  if (handleLocalChatCommand(text)) return true;
  if (!sendJson({ type: 'chatSend', text })) {
    pushLocalChatSystem(tr('ui.chat.unavailable'));
  }
  return true;
}

chatFormEl?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!chatInputEl) return;
  const value = chatInputEl.value;
  chatInputEl.value = '';
  const handled = submitChatMessage(value);
  if (handled) chatInputEl.blur();
});

chatInputEl?.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    e.preventDefault();
    chatInputEl.blur();
  }
});

loadChatMutedNames();
renderChatMessages();

function escapeNewsHtml(raw) {
  const text = String(raw ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNewsDate(ts) {
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

let authorProfileModalEl = null;
let authorProfileTitleEl = null;
let authorProfileBodyEl = null;
let authorProfileRuns = [];

function ensureAuthorProfileModal() {
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
  title.textContent = tr('ui.profile.player');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'mini';
  closeBtn.textContent = tr('ui.close');
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  head.appendChild(title);
  head.appendChild(closeBtn);

  const body = document.createElement('div');
  body.id = 'author-profile-body';
  body.className = 'record-details-body';
  body.textContent = tr('ui.loading');

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

function ensureHeroEquipModal() {
  if (heroEquipModalEl) return;
  const modal = document.createElement('div');
  modal.id = 'hero-equip-modal';
  modal.className = 'record-details-modal hidden';
  modal.setAttribute('aria-live', 'polite');

  const card = document.createElement('div');
  card.className = 'record-details-card hero-equip-modal-card';

  const head = document.createElement('div');
  head.className = 'record-details-head';

  const title = document.createElement('b');
  title.id = 'hero-equip-modal-title';
  title.textContent = 'Снарядить слот';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'mini';
  closeBtn.textContent = trWithFallback('ui.close', 'Р—Р°РєСЂС‹С‚СЊ');
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  head.appendChild(title);
  head.appendChild(closeBtn);

  const body = document.createElement('div');
  body.id = 'hero-equip-modal-body';
  body.className = 'record-details-body hero-equip-modal-body';
  body.textContent = trWithFallback('ui.loading', 'Р—Р°РіСЂСѓР·РєР°...');

  card.appendChild(head);
  card.appendChild(body);
  modal.appendChild(card);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  const modalHost = document.getElementById('join-overlay') || document.body;
  modalHost.appendChild(modal);
  heroEquipModalEl = modal;
  heroEquipModalTitleEl = title;
  heroEquipModalBodyEl = body;
}

function closeHeroEquipModal() {
  heroEquipModalEl?.classList.add('hidden');
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

function formatRunGameModeLabel(run) {
  const raw = String(run?.runDetails?.gameMode || '').trim().toLowerCase();
  if (raw === 'hardcore') return tr('ui.play.mode.hardcore');
  if (raw === 'normal') return tr('ui.play.mode.normal');
  return 'РќРµРёР·РІРµСЃС‚РЅРѕ';
}

function renderAuthorProfileRunHistory(runPayload) {
  const runs = Array.isArray(runPayload?.runs) ? runPayload.runs : [];
  const total = Math.max(0, Number(runPayload?.total) || 0);
  if (!runs.length) {
    return '<div class="profile-card"><b>РСЃС‚РѕСЂРёСЏ Р·Р°Р±РµРіРѕРІ (0)</b><div class="record-details-empty">Р—Р°Р±РµРіРё РЅРµ РЅР°Р№РґРµРЅС‹.</div></div>';
  }

  const rows = runs.map((run, i) => {
    const kills = Math.max(0, Number(run?.kills) || 0);
    const score = Math.max(0, Number(run?.score) || 0);
    const durationSec = Math.max(1, Number(run?.durationSec) || 1);
    const heroXp = Math.max(0, Number(run?.runDetails?.xp) || 0);
    const roomCode = escapeNewsHtml(String(run?.roomCode || '-'));
    const gameMode = escapeNewsHtml(formatRunGameModeLabel(run));
    return ''
      + '<button type="button" class="profile-run-row" data-author-run-idx="' + i + '">'
      +   '<div class="profile-run-head"><span>' + formatRecordDateTime(run?.at) + '</span><span>Room ' + roomCode + ' | ' + gameMode + '</span></div>'
      +   '<div class="profile-run-main"><span>' + kills + ' kills</span><span>' + score + ' pts</span><span>' + durationSec + 's</span><span class="profile-run-meta">XP ' + heroXp + '</span></div>'
      + '</button>';
  }).join('');

  return '<div class="profile-card"><b>РСЃС‚РѕСЂРёСЏ Р·Р°Р±РµРіРѕРІ (' + total + ')</b><div class="profile-run-list author-run-list">' + rows + '</div></div>';
}

function bindAuthorProfileRunHistoryRows() {
  if (!authorProfileBodyEl) return;
  const buttons = Array.from(authorProfileBodyEl.querySelectorAll('[data-author-run-idx]'));
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const idx = Math.max(0, Number(btn.getAttribute('data-author-run-idx')) || 0);
      const run = authorProfileRuns[idx];
      if (!run) return;
      const label = 'Run #' + (idx + 1);
      openRecordDetailsModal(run, label);
    });
  }
}

function renderAuthorProfileBody(profile, runPayload) {
  const heroRows = (Array.isArray(profile?.heroStats) ? profile.heroStats : []).map((hero) => {
    const heroName = escapeNewsHtml(trHeroName(hero?.id, hero?.name || hero?.id || '-'));
    const heroLevel = Math.max(1, Number(hero?.level) || 1);
    const heroRuns = Math.max(0, Number(hero?.runs) || 0);
    const heroState = hero?.unlocked ? tr('ui.profile.hero_open') : tr('ui.profile.hero_closed');
    return '<div class="profile-hero-row"><span>' + heroName + '</span><span>Lv' + heroLevel + ' | ' + trWithFallback('ui.profile.runs', 'Runs') + ': ' + heroRuns + '</span><span>' + heroState + '</span></div>';
  }).join('');

  return ''
    + '<div class="profile-card"><b>РџСЂРѕС„РёР»СЊ Lv' + Math.max(1, Number(profile?.accountLevel) || 1) + '</b><div>'
    + 'XP ' + Math.max(0, Number(profile?.accountXp) || 0) + '/' + Math.max(1, Number(profile?.accountXpToNext) || 1)
    + ' | ' + trWithFallback('ui.profile.skill_points', 'Skill points') + ': ' + Math.max(0, Number(profile?.accountSkillPoints) || 0)
    + ' | ' + trWithFallback('ui.profile.shards', 'Shards') + ': ' + Math.max(0, Number(profile?.shards) || 0)
    + ' | ' + trWithFallback('ui.profile.heroes', 'Heroes') + ': ' + Math.max(0, Number(profile?.heroesUnlocked) || 0) + '/' + Math.max(0, Number(profile?.heroesTotal) || 0)
    + ' | ' + trWithFallback('ui.profile.runs', 'Runs') + ': ' + Math.max(0, Number(profile?.totalRuns) || 0)
    + '</div></div>'
    + '<div class="profile-card"><b>РРЅС„Рѕ Р°РєРєР°СѓРЅС‚Р°</b><div>РЎРѕР·РґР°РЅ: ' + formatPublicProfileDate(profile?.createdAt) + ' | РџРѕСЃР»РµРґРЅРёР№ РІС…РѕРґ: ' + formatPublicProfileDate(profile?.lastLoginAt) + '</div></div>'
    + '<div class="profile-card"><b>Р“РµСЂРѕРё</b><div class="profile-hero-list">' + (heroRows || '<div class="record-details-empty">РќРµС‚ РґР°РЅРЅС‹С… РїРѕ РіРµСЂРѕСЏРј.</div>') + '</div></div>'
    + renderAuthorProfileRunHistory(runPayload);
}

async function openAuthorProfileModal(accountId, fallbackName = '') {
  const id = Math.max(0, Number(accountId) || 0);
  if (!id) return;
  ensureAuthorProfileModal();
  if (!authorProfileModalEl || !authorProfileBodyEl || !authorProfileTitleEl) return;

  authorProfileTitleEl.textContent = 'РџСЂРѕС„РёР»СЊ РёРіСЂРѕРєР°';
  authorProfileBodyEl.innerHTML = '<div class="record-details-empty">Р—Р°РіСЂСѓР·РєР° РїСЂРѕС„РёР»СЏ...</div>';
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
    authorProfileTitleEl.textContent = 'РџСЂРѕС„РёР»СЊ: ' + String(profile?.nickname || fallbackName || ('ID ' + id));
    authorProfileBodyEl.innerHTML = renderAuthorProfileBody(profile, runData);
    bindAuthorProfileRunHistoryRows();
  } catch (err) {
    authorProfileRuns = [];
    authorProfileBodyEl.innerHTML = '<div class="record-details-empty">' + escapeNewsHtml(err?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїСЂРѕС„РёР»СЊ.') + '</div>';
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

  ensureAuthorProfileModal();
  if (authorProfileModalEl && authorProfileBodyEl && authorProfileTitleEl) {
    authorProfileTitleEl.textContent = 'РџСЂРѕС„РёР»СЊ РёРіСЂРѕРєР°';
    authorProfileBodyEl.innerHTML = '<div class="record-details-empty">РџРѕРёСЃРє Р°РєРєР°СѓРЅС‚Р° РїРѕ РЅРёРєСѓ...</div>';
    authorProfileModalEl.classList.remove('hidden');
  }

  try {
    const res = await fetch('/api/player/nickname-status?nickname=' + encodeURIComponent(nickname), { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    const foundId = Math.max(0, Number(payload?.player?.id) || 0);
    if (!res.ok || !payload?.ok || !payload?.isRegistered || !foundId) {
      throw new Error('РџСЂРѕС„РёР»СЊ РґР»СЏ СЌС‚РѕРіРѕ РЅРёРєР° РЅРµРґРѕСЃС‚СѓРїРµРЅ.');
    }
    await openAuthorProfileModal(foundId, nickname);
  } catch (err) {
    if (authorProfileBodyEl) {
      authorProfileBodyEl.innerHTML = '<div class="record-details-empty">' + escapeNewsHtml(err?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РїСЂРѕС„РёР»СЊ.') + '</div>';
    }
  }
}


function upsertNewsListCounters(item) {
  if (!item || !item.id) return;
  const idx = newsUi.items.findIndex((x) => x && x.id === item.id);
  if (idx < 0) return;
  newsUi.items[idx] = {
    ...newsUi.items[idx],
    title: item.title,
    summary: item.summary,
    publishedAt: item.publishedAt,
    views: Math.max(0, Number(item.views) || 0),
    commentsCount: Math.max(0, Number(item.commentsCount) || 0),
  };
}

function setNewsDetailItem(item) {
  if (!item || !item.id) return;
  newsUi.activeId = String(item.id);
  newsUi.activeItem = {
    ...item,
    views: Math.max(0, Number(item.views) || 0),
    commentsCount: Math.max(0, Number(item.commentsCount) || 0),
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
  upsertNewsListCounters(newsUi.activeItem);
}

function updateMenuUrlState(tabId, newsId = '') {
  const url = new URL(window.location.href);
  const tab = String(tabId || '').trim().toLowerCase();
  if (tab && tab !== 'play') url.searchParams.set('tab', tab);
  else url.searchParams.delete('tab');
  const id = String(newsId || '').trim();
  if (tab === 'news' && id) url.searchParams.set('news', id);
  else url.searchParams.delete('news');
  window.history.replaceState({}, document.title, url.toString());
}

function buildNewsShareUrl(newsId) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'news');
  url.searchParams.set('news', String(newsId || '').trim());
  return url.toString();
}

function showNewsShareToast() {
  newsUi.shareCopied = true;
  if (newsShareToastTimer) {
    clearTimeout(newsShareToastTimer);
    newsShareToastTimer = null;
  }
  renderNewsFeed();
  newsShareToastTimer = setTimeout(() => {
    newsUi.shareCopied = false;
    newsShareToastTimer = null;
    renderNewsFeed();
  }, 2000);
}

async function shareNewsLink(newsId) {
  const id = String(newsId || '').trim();
  if (!id) return;
  const shareUrl = buildNewsShareUrl(id);
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(shareUrl);
    showNewsShareToast();
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = shareUrl;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (ok) showNewsShareToast();
}

async function deleteNewsComment(newsId, { commentId, parentId = '' } = {}) {
  const newsKey = String(newsId || '').trim();
  const commentKey = String(commentId || '').trim();
  if (!newsKey || !commentKey || newsUi.postingComment) return;
  newsUi.postingComment = true;
  newsUi.commentError = '';
  renderNewsFeed();
  try {
    const query = parentId ? ('?parentId=' + encodeURIComponent(String(parentId || '').trim())) : '';
    const res = await fetch('/api/news/' + encodeURIComponent(newsKey) + '/comments/' + encodeURIComponent(commentKey) + query, {
      method: 'DELETE',
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok || !payload?.item) {
      throw new Error(payload?.message || ('HTTP ' + res.status));
    }
    setNewsDetailItem(payload.item);
    updateMenuUrlState('news', newsKey);
    newsUi.replyTargetId = '';
  } catch (err) {
    newsUi.commentError = err?.message || 'Failed to delete comment.';
  } finally {
    newsUi.postingComment = false;
    renderNewsFeed();
  }
}

async function submitNewsComment(newsId, { text, parentId = '' } = {}) {
  const bodyText = String(text || '').trim();
  if (!bodyText || newsUi.postingComment) return;
  newsUi.postingComment = true;
  newsUi.commentError = '';
  renderNewsFeed();
  try {
    const res = await fetch('/api/news/' + encodeURIComponent(newsId) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: bodyText, parentId: String(parentId || '').trim() }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok || !payload?.item) {
      throw new Error(payload?.message || ('HTTP ' + res.status));
    }
    setNewsDetailItem(payload.item);
    updateMenuUrlState('news', String(newsId || '').trim());
    if (parentId) {
      delete newsUi.replyDraftByParent[parentId];
      newsUi.replyTargetId = '';
    } else {
      newsUi.commentDraft = '';
    }
  } catch (err) {
    newsUi.commentError = err?.message || 'Failed to send comment.';
  } finally {
    newsUi.postingComment = false;
    renderNewsFeed();
  }
}

function renderNewsReplyComposer(container, parentId) {
  const wrap = document.createElement('div');
  wrap.className = 'news-comment-compose news-comment-reply-compose';

  const input = document.createElement('textarea');
  input.className = 'news-comment-input';
  input.rows = 2;
  input.maxLength = 1500;
  input.placeholder = trWithFallback('ui.news.comment_placeholder', 'Напишите комментарий...');
  input.value = String(newsUi.replyDraftByParent[parentId] || '');
  input.addEventListener('input', () => {
    newsUi.replyDraftByParent[parentId] = input.value;
  });

  const actions = document.createElement('div');
  actions.className = 'news-comment-actions';

  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'mini';
  sendBtn.textContent = newsUi.postingComment ? trWithFallback('ui.news.sending', 'Отправка...') : trWithFallback('ui.news.send', 'Отправить');
  sendBtn.disabled = newsUi.postingComment || !input.value.trim();
  sendBtn.addEventListener('click', () => {
    void submitNewsComment(newsUi.activeId, { text: input.value, parentId });
  });
  const refreshSendState = () => {
    sendBtn.disabled = newsUi.postingComment || !input.value.trim();
  };
  input.addEventListener('input', refreshSendState);
  input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!sendBtn.disabled) sendBtn.click();
    }
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'mini';
  cancelBtn.textContent = trWithFallback('ui.news.cancel', 'Отмена');
  cancelBtn.disabled = newsUi.postingComment;
  cancelBtn.addEventListener('click', () => {
    newsUi.replyTargetId = '';
    renderNewsFeed();
  });

  actions.appendChild(sendBtn);
  actions.appendChild(cancelBtn);
  wrap.appendChild(input);
  wrap.appendChild(actions);
  container.appendChild(wrap);
}

function renderNewsCommentNode(comment, isReply = false, parentCommentId = '') {
  const item = document.createElement('div');
  item.className = isReply ? 'news-comment news-comment-reply' : 'news-comment';

  const isLoggedIn = Boolean(game.playerAuth?.player);
  const parentId = String(comment?.id || '').trim();
  const myAccountId = Math.max(0, Number(game.playerAuth?.player?.id) || 0);
  const commentOwnerId = Math.max(0, Number(comment?.authorAccountId) || 0);
  const canDelete = Boolean(isLoggedIn && myAccountId > 0 && commentOwnerId === myAccountId && parentId);

  const head = document.createElement('div');
  head.className = 'news-comment-head';

  const authorAccountId = Math.max(0, Number(comment?.authorAccountId) || 0);
  const authorNameText = String(comment?.authorName || 'Player');
  const author = document.createElement('button');
  author.type = 'button';
  author.className = 'news-comment-author news-comment-author-btn';
  author.textContent = authorNameText;
  author.addEventListener('click', () => {
    void openAuthorProfileFromComment(authorAccountId, authorNameText);
  });

  const meta = document.createElement('div');
  meta.className = 'news-comment-meta';
  const date = document.createElement('span');
  date.className = 'news-comment-date';
  date.textContent = formatNewsDate(comment?.createdAt || 0);
  meta.appendChild(date);

  head.appendChild(author);
  head.appendChild(meta);

  const text = document.createElement('div');
  text.className = 'news-comment-text';
  text.textContent = String(comment?.text || '');

  item.appendChild(head);
  item.appendChild(text);

  const actionsRow = document.createElement('div');
  actionsRow.className = 'news-comment-actions-row';
  let hasActions = false;

  if (!isReply && isLoggedIn && parentId) {
    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'mini news-comment-reply-btn';
    replyBtn.textContent = newsUi.replyTargetId === parentId ? trWithFallback('ui.news.close_reply', 'Закрыть ответ') : trWithFallback('ui.news.reply', 'Ответить');
    replyBtn.addEventListener('click', () => {
      newsUi.replyTargetId = newsUi.replyTargetId === parentId ? '' : parentId;
      renderNewsFeed();
    });
    actionsRow.appendChild(replyBtn);
    hasActions = true;
  }

  if (canDelete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'mini news-comment-delete-btn';
    deleteBtn.textContent = trWithFallback('ui.news.delete', 'Удалить');
    deleteBtn.disabled = newsUi.postingComment;
    deleteBtn.addEventListener('click', () => {
      void deleteNewsComment(newsUi.activeId, {
        commentId: parentId,
        parentId: isReply ? parentCommentId : '',
      });
    });
    actionsRow.appendChild(deleteBtn);
    hasActions = true;
  }

  if (hasActions) {
    item.appendChild(actionsRow);
  }

  if (!isReply && isLoggedIn && parentId && newsUi.replyTargetId === parentId) {
    renderNewsReplyComposer(item, parentId);
  }

  const replies = Array.isArray(comment?.replies) ? comment.replies : [];
  if (replies.length > 0) {
    const repliesWrap = document.createElement('div');
    repliesWrap.className = 'news-comment-replies';
    for (const reply of replies) {
      repliesWrap.appendChild(renderNewsCommentNode(reply, true, parentId));
    }
    item.appendChild(repliesWrap);
  }

  return item;
}

function renderNewsFeed() {
  if (!newsFeedEl) return;

  newsFeedEl.innerHTML = '';

  if (newsUi.loading && newsUi.items.length === 0 && !newsUi.activeItem) {
    const loading = document.createElement('div');
    loading.className = 'news-sub';
    loading.textContent = trWithFallback('ui.news.loading_news', 'Загрузка новостей...');
    newsFeedEl.appendChild(loading);
    return;
  }

  if (newsUi.error && newsUi.items.length === 0 && !newsUi.activeItem) {
    const error = document.createElement('div');
    error.className = 'news-sub';
    error.textContent = newsUi.error;
    newsFeedEl.appendChild(error);
    return;
  }

  if (newsUi.activeItem) {
    const detailActions = document.createElement('div');
    detailActions.className = 'news-detail-actions';
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'mini news-back-btn';
    backBtn.textContent = trWithFallback('ui.news.back', '← К списку новостей');
    backBtn.addEventListener('click', () => {
      newsUi.activeId = '';
      newsUi.activeItem = null;
      newsUi.itemError = '';
      newsUi.commentError = '';
      newsUi.replyTargetId = '';
      newsUi.shareCopied = false;
      updateMenuUrlState('news', '');
      renderNewsFeed();
    });
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'mini news-share-btn';
    shareBtn.textContent = newsUi.shareCopied ? trWithFallback('ui.news.share_copied', 'Ссылка скопирована') : trWithFallback('ui.news.share', 'Поделиться');
    shareBtn.addEventListener('click', async () => {
      try {
        await shareNewsLink(newsUi.activeId);
      } catch {
        newsUi.commentError = trWithFallback('ui.news.share_copy_failed', 'Не удалось скопировать ссылку.');
        renderNewsFeed();
      }
    });
    detailActions.appendChild(backBtn);
    detailActions.appendChild(shareBtn);
    newsFeedEl.appendChild(detailActions);

    if (newsUi.loadingItem) {
      const loadingItem = document.createElement('div');
      loadingItem.className = 'news-sub';
      loadingItem.textContent = trWithFallback('ui.news.opening', 'Открываем новость...');
      newsFeedEl.appendChild(loadingItem);
      return;
    }

    if (newsUi.itemError) {
      const itemError = document.createElement('div');
      itemError.className = 'news-sub';
      itemError.textContent = newsUi.itemError;
      newsFeedEl.appendChild(itemError);
      return;
    }

    const item = newsUi.activeItem;

    const article = document.createElement('article');
    article.className = 'news-item news-item-detail';

    const h = document.createElement('h3');
    h.className = 'news-item-title';
    h.textContent = String(item?.title || trWithFallback('ui.news.untitled', 'Без названия'));

    const meta = document.createElement('div');
    meta.className = 'news-item-meta';
    meta.textContent = formatNewsDate(item?.publishedAt) + ' | ' + trWithFallback('ui.news.views', 'Просмотры') + ': ' + (Math.max(0, Number(item?.views) || 0)) + ' | ' + trWithFallback('ui.news.comments_count', 'Комментарии') + ': ' + (Math.max(0, Number(item?.commentsCount) || 0));

    const summary = document.createElement('div');
    summary.className = 'news-sub';
    summary.textContent = String(item?.summary || '');

    article.appendChild(h);
    article.appendChild(meta);
    if (summary.textContent) article.appendChild(summary);

    const lines = Array.isArray(item?.items) ? item.items : [];
    if (lines.length > 0) {
      const list = document.createElement('div');
      list.className = 'news-list';
      for (const line of lines) {
        const row = document.createElement('div');
        row.textContent = '- ' + String(line || '').replace(/^[-\s]+/, '');
        list.appendChild(row);
      }
      article.appendChild(list);
    }

    newsFeedEl.appendChild(article);

    const commentsTitle = document.createElement('div');
    commentsTitle.className = 'news-comments-title';
    commentsTitle.textContent = trWithFallback('ui.news.comments', 'Комментарии');

    const isLoggedIn = Boolean(game.playerAuth?.player);
    if (isLoggedIn) {
      const compose = document.createElement('div');
      compose.className = 'news-comment-compose';

      const input = document.createElement('textarea');
      input.className = 'news-comment-input';
      input.rows = 3;
      input.maxLength = 1500;
      input.placeholder = trWithFallback('ui.news.comment_placeholder', 'Напишите комментарий...');
      input.value = newsUi.commentDraft;
      input.addEventListener('input', () => {
        newsUi.commentDraft = input.value;
      });

      const actions = document.createElement('div');
      actions.className = 'news-comment-actions';

      const sendBtn = document.createElement('button');
      sendBtn.type = 'button';
      sendBtn.className = 'mini';
      sendBtn.textContent = newsUi.postingComment ? trWithFallback('ui.news.sending', 'Отправка...') : trWithFallback('ui.news.send', 'Отправить');
      sendBtn.disabled = newsUi.postingComment || !input.value.trim();
      sendBtn.addEventListener('click', () => {
        void submitNewsComment(item.id, { text: input.value });
      });
      const refreshSendState = () => {
        sendBtn.disabled = newsUi.postingComment || !input.value.trim();
      };
      input.addEventListener('input', refreshSendState);
      input.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          if (!sendBtn.disabled) sendBtn.click();
        }
      });

      actions.appendChild(sendBtn);
      compose.appendChild(input);
      compose.appendChild(actions);
      newsFeedEl.appendChild(compose);
    } else {
      const authHint = document.createElement('div');
      authHint.className = 'news-sub';
      authHint.textContent = trWithFallback('ui.news.auth_hint', 'Войдите в аккаунт, чтобы оставлять комментарии и ответы.');
      newsFeedEl.appendChild(authHint);
    }

    if (newsUi.commentError) {
      const commentError = document.createElement('div');
      commentError.className = 'news-sub';
      commentError.textContent = newsUi.commentError;
      newsFeedEl.appendChild(commentError);
    }

    newsFeedEl.appendChild(commentsTitle);

    const commentsWrap = document.createElement('div');
    commentsWrap.className = 'news-comments-wrap';
    const comments = Array.isArray(item?.comments) ? item.comments : [];
    if (comments.length <= 0) {
      const empty = document.createElement('div');
      empty.className = 'news-sub';
      empty.textContent = trWithFallback('ui.news.no_comments', 'Пока нет комментариев.');
      commentsWrap.appendChild(empty);
    } else {
      for (const comment of comments) {
        commentsWrap.appendChild(renderNewsCommentNode(comment, false));
      }
    }
    newsFeedEl.appendChild(commentsWrap);
    return;
  }

  const items = Array.isArray(newsUi.items) ? newsUi.items : [];
  if (items.length <= 0) {
    const empty = document.createElement('div');
    empty.className = 'news-sub';
    empty.textContent = trWithFallback('ui.news.empty', 'Пока новостей нет.');
    newsFeedEl.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'news-items';
  for (const item of items) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'news-item news-item-button';

    const h = document.createElement('div');
    h.className = 'news-item-title';
    h.textContent = String(item?.title || trWithFallback('ui.news.untitled', 'Без названия'));

    const meta = document.createElement('div');
    meta.className = 'news-item-meta';
    meta.textContent = formatNewsDate(item?.publishedAt) + ' | ' + trWithFallback('ui.news.views', 'Просмотры') + ': ' + (Math.max(0, Number(item?.views) || 0)) + ' | ' + trWithFallback('ui.news.comments_count', 'Комментарии') + ': ' + (Math.max(0, Number(item?.commentsCount) || 0));

    const summary = document.createElement('div');
    summary.className = 'news-sub';
    summary.textContent = String(item?.summary || '');

    card.appendChild(h);
    card.appendChild(meta);
    if (summary.textContent) card.appendChild(summary);

    card.addEventListener('click', () => {
      void openNewsItem(item?.id || '');
    });

    list.appendChild(card);
  }
  newsFeedEl.appendChild(list);
}

async function requestNewsFeed(options = {}) {
  const force = options?.force === true;
  const now = Date.now();
  if (!force && !newsUi.loading && newsUi.items.length > 0 && (now - newsUi.lastLoadedAt) < newsUi.cacheMs) {
    renderNewsFeed();
    return;
  }
  const token = newsUi.fetchToken + 1;
  newsUi.fetchToken = token;
  newsUi.loading = true;
  newsUi.error = '';
  renderNewsFeed();
  try {
    const res = await fetch('/api/news', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const payload = await res.json();
    if (newsUi.fetchToken !== token) return;
    newsUi.items = Array.isArray(payload?.items) ? payload.items : [];
    newsUi.lastLoadedAt = Date.now();
    newsUi.error = '';
    if (newsUi.activeItem) upsertNewsListCounters(newsUi.activeItem);
  } catch (err) {
    if (newsUi.fetchToken !== token) return;
    newsUi.error = err?.message || 'Failed to load news.';
  } finally {
    if (newsUi.fetchToken === token) {
      newsUi.loading = false;
      renderNewsFeed();
    }
  }
}

async function openNewsItem(newsId, { force = false } = {}) {
  const id = String(newsId || '').trim();
  if (!id) return;
  if (newsUi.loadingItem) return;
  if (!force && newsUi.activeItem && newsUi.activeId === id) {
    renderNewsFeed();
    return;
  }

  const token = newsUi.itemFetchToken + 1;
  newsUi.itemFetchToken = token;
  newsUi.loadingItem = true;
  newsUi.itemError = '';
  newsUi.commentError = '';
  newsUi.replyTargetId = '';
  newsUi.activeId = id;
  newsUi.activeItem = null;
  renderNewsFeed();

  try {
    const res = await fetch('/api/news/' + encodeURIComponent(id), { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (newsUi.itemFetchToken !== token) return;
    if (!res.ok || !payload?.ok || !payload?.item) {
      throw new Error(payload?.message || ('HTTP ' + res.status));
    }
    setNewsDetailItem(payload.item);
    updateMenuUrlState('news', id);
  } catch (err) {
    if (newsUi.itemFetchToken !== token) return;
    newsUi.itemError = err?.message || 'Failed to open news.';
  } finally {
    if (newsUi.itemFetchToken === token) {
      newsUi.loadingItem = false;
      renderNewsFeed();
    }
  }
}


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
  const titleText = escapeNewsHtml(trWithFallback('ui.rating.title', 'Player Rating'));
  const modeOptions = (ratingUi.modes || []).map((mode) => {
    const key = String(mode?.key || 'all');
    const modeTitle = String(mode?.titleKey ? tr(mode.titleKey) : (mode?.title || key || 'Mode'));
    const selected = key === ratingUi.currentMode ? ' selected' : '';
    return '<option value="' + escapeNewsHtml(key) + '"' + selected + '>' + escapeNewsHtml(modeTitle) + '</option>';
  }).join('');
  const modeControl = '<div class="rating-mode-wrap"><select id="rating-mode-select" class="rating-mode-select">' + modeOptions + '</select></div>';
  const header = '<div class="rating-header-row"><b>' + titleText + '</b>' + modeControl + '</div>';
  if (ratingUi.loading && ratingUi.items.length === 0) {
    ratingBoardEl.innerHTML = header + '<div class="profile-run-empty">' + escapeNewsHtml(trWithFallback('ui.rating.loading', 'Loading rating...')) + '</div>';
    return;
  }
  if (ratingUi.error && ratingUi.items.length === 0) {
    ratingBoardEl.innerHTML = header + '<div class="profile-run-empty">' + escapeNewsHtml(ratingUi.error) + '</div>';
    return;
  }

  const categories = (ratingUi.categories || []).map((cat) => {
    const active = cat.key === ratingUi.currentCategory ? ' active' : '';
    return '<button type="button" class="mini rating-category-btn' + active + '" data-rating-cat="' + escapeNewsHtml(String(cat.key || '')) + '">' + escapeNewsHtml(getRatingCategoryTitle(cat)) + '</button>';
  }).join('');

  const rows = (ratingUi.items || []).map((item, i) => {
    const rank = ((ratingUi.page - 1) * ratingUi.pageSize) + i + 1;
    const pid = Math.max(0, Number(item?.playerId) || 0);
    const nick = escapeNewsHtml(String(item?.nickname || 'Unknown'));
    const nickHtml = pid > 0
      ? ('<button type="button" class="news-comment-author news-comment-author-btn" data-rating-player="' + pid + '">' + nick + '</button>')
      : nick;
    const replayRunId = Math.max(0, Number(item?.replayRunId) || 0);
    const valueText = escapeNewsHtml(formatRatingValue(item, ratingUi.currentCategory));
    const playBtn = replayRunId > 0 ? ('<button type="button" class="mini rating-play-btn" data-rating-replay="' + replayRunId + '" data-rating-rank="' + rank + '">' + escapeNewsHtml(trWithFallback('ui.rating.play', 'Play')) + '</button>') : '';
    return '<div class="record-row rating-row"><div class="record-rank">#' + rank + '</div><div class="record-name">' + nickHtml + '</div><div class="record-meta"><span class="rating-value-text">' + valueText + '</span>' + playBtn + '</div></div>';
  }).join('');

  const prevDisabled = ratingUi.page <= 1 ? ' disabled' : '';
  const nextDisabled = ratingUi.page >= ratingUi.totalPages ? ' disabled' : '';
  const pager = '<div class="profile-run-history-pager">'
    + '<button type="button" class="mini" data-rating-nav="prev"' + prevDisabled + '>' + escapeNewsHtml(trWithFallback('ui.prev', 'Prev')) + '</button>'
    + '<span class="profile-run-history-page">' + escapeNewsHtml(trWithFallback('ui.page', 'Page')) + ' ' + ratingUi.page + '/' + ratingUi.totalPages + ' | ' + escapeNewsHtml(trWithFallback('ui.total', 'Total')) + ': ' + ratingUi.total + '</span>'
    + '<button type="button" class="mini" data-rating-nav="next"' + nextDisabled + '>' + escapeNewsHtml(trWithFallback('ui.next', 'Next')) + '</button>'
    + '</div>';
  ratingBoardEl.innerHTML = header
    + '<div class="rating-categories">' + categories + '</div>'
    + (rows || '<div class="profile-run-empty">' + escapeNewsHtml(trWithFallback('ui.rating.empty', 'No data yet.')) + '</div>')
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
      if (pid > 0) void openAuthorProfileModal(pid, b.textContent || '');
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

async function requestLeaderboard({ force = false, page = ratingUi.page, category = ratingUi.currentCategory, mode = ratingUi.currentMode } = {}) {
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
globalThis.renderNewsFeed = renderNewsFeed;

function setMainMenuTab(tabId) {
  const nextTab = String(tabId || '').trim() || 'play';
  const prevTab = currentMainMenuTab;
  currentMainMenuTab = nextTab;
  for (const btn of mainMenuTabButtons) {
    const active = btn.getAttribute('data-menu-tab') === nextTab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  }
  for (const panel of mainMenuPanels) {
    const active = panel.getAttribute('data-menu-panel') === nextTab;
    panel.classList.toggle('active', active);
  }
  syncInfoPanelHost();
  if (infoPanelEl) {
    const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
    const forceVisibleInSettings = overlayOpen && nextTab === 'menu';
    infoPanelEl.classList.toggle('is-hidden', infoPanelHidden && !forceVisibleInSettings);
  }
  if (nextTab === 'profile') {
    void requestProfileRunHistory({ force: false, page: profileRunHistoryUi.page });
  }
  if (nextTab === 'rating') {
    void requestLeaderboard({ force: false, page: ratingUi.page, category: ratingUi.currentCategory, mode: ratingUi.currentMode });
  }
  if (nextTab === 'news') {
    if (prevTab === 'news' && newsUi.activeItem) {
      newsUi.activeId = '';
      newsUi.activeItem = null;
      newsUi.itemError = '';
      newsUi.commentError = '';
      newsUi.replyTargetId = '';
      newsUi.shareCopied = false;
      updateMenuUrlState('news', '');
      renderNewsFeed();
    }
    void requestNewsFeed({ force: false });
  }
  if (nextTab !== 'news') {
    newsUi.shareCopied = false;
    updateMenuUrlState(nextTab, '');
  } else if (!newsUi.activeItem) {
    updateMenuUrlState('news', '');
  }
}

for (const btn of mainMenuTabButtons) {
  btn.addEventListener('click', () => {
    setMainMenuTab(btn.getAttribute('data-menu-tab'));
  });
}
currentMainMenuTab = initialMenuTab;
setMainMenuTab(currentMainMenuTab);
void requestNewsFeed({ force: false });
if (currentMainMenuTab === 'news' && initialNewsIdParam) {
  void openNewsItem(initialNewsIdParam, { force: true });
}

function getPlayerVariant(id) {
  return PLAYER_VARIANTS.find((x) => x.id === id) || PLAYER_VARIANTS[0];
}

function sanitizePlayerClass(id) {
  const key = (id || '').toString().trim();
  return getPlayerVariant(key).id;
}

function getProgressionCatalog() {
  const fallbackHeroes = PLAYER_VARIANTS.map((variant) => ({
    ...variant,
    unlockLevel: variant.id === 'cyber' ? 1 : 999,
    unlockShardCost: variant.id === 'cyber' ? 0 : 9999,
    unlockCardId: variant.id === 'cyber' ? '' : (variant.id + '_core_card'),
    unlockCardName: variant.name + ' Core Card',
    unlockCardNeed: variant.id === 'cyber' ? 0 : 99,
    tagline: '',
  }));
  const catalog = game.playerAuth?.progressionCatalog || null;
  return {
    baseHeroId: catalog?.baseHeroId || 'cyber',
    heroLevelCap: Math.max(1, Number(catalog?.heroLevelCap) || 999),
    heroes: Array.isArray(catalog?.heroes) && catalog.heroes.length > 0 ? catalog.heroes : fallbackHeroes,
    cards: Array.isArray(catalog?.cards) ? catalog.cards : [],
    itemSlots: Array.isArray(catalog?.itemSlots) ? catalog.itemSlots : [],
    items: Array.isArray(catalog?.items) ? catalog.items : [],
    trees: catalog?.trees && typeof catalog.trees === 'object' ? catalog.trees : {},
  };
}

function getProgressionState() {
  return game.playerAuth?.progression || null;
}

function getUnlockedHeroSet(catalog, progression) {
  if (progression?.unlockedHeroes && Array.isArray(progression.unlockedHeroes)) {
    return new Set(progression.unlockedHeroes.map((id) => String(id || '').trim()).filter(Boolean));
  }
  return new Set([catalog.baseHeroId || 'cyber']);
}

function setHeroActionFeedback(message, kind = '') {
  if (!heroActionFeedbackEl) return;
  const text = String(message || '').trim();
  if (!text) {
    heroActionFeedbackEl.textContent = '';
    heroActionFeedbackEl.className = 'hero-action-feedback hidden';
    return;
  }
  heroActionFeedbackEl.textContent = text;
  heroActionFeedbackEl.className = `hero-action-feedback ${kind}`.trim();
  heroActionFeedbackEl.classList.remove('hidden');
}

function humanizeHeroApiError(err, fallback) {
  const msg = String(err?.message || '').trim();
  if (msg.includes('404')) {
    return 'Progression API not found on server. Restart server to apply updates.';
  }
  return msg || fallback;
}
async function selectHeroForAccount(heroId) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/select-hero', {
    method: 'POST',
    body: JSON.stringify({ heroId }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function unlockHeroForAccount(heroId) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/unlock-hero', {
    method: 'POST',
    body: JSON.stringify({ heroId }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function upgradeHeroNodeForAccount(heroId, nodeId) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/upgrade-node', {
    method: 'POST',
    body: JSON.stringify({ heroId, nodeId }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function unlockHeroSkillForAccount(heroId, skillId) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/unlock-hero-skill', {
    method: 'POST',
    body: JSON.stringify({ heroId, skillId }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function upgradeHeroSkillForAccount(heroId, skillId) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/upgrade-hero-skill', {
    method: 'POST',
    body: JSON.stringify({ heroId, skillId }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function equipItemForAccount(heroId, itemUid, slotKey) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/equip-item', {
    method: 'POST',
    body: JSON.stringify({ heroId, itemUid, slotKey }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function unequipItemForAccount(heroId, slotKey) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/unequip-item', {
    method: 'POST',
    body: JSON.stringify({ heroId, slotKey }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function sellInventoryItemForAccount(itemUid) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/sell-item', {
    method: 'POST',
    body: JSON.stringify({ itemUid }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function upgradeInventoryItemForAccount(itemUid) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/upgrade-item', {
    method: 'POST',
    body: JSON.stringify({ itemUid }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

function useQuickItemInRun(slotKey) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  const key = String(slotKey || '').trim();
  if (!key) return false;
  sendJson({ type: 'useQuickItem', slotKey: key });
  return true;
}

function getCatalogItemMap(catalog) {
  const out = {};
  for (const item of Array.isArray(catalog?.items) ? catalog.items : []) {
    if (!item?.id) continue;
    out[item.id] = item;
  }
  return out;
}

function getItemDisplayName(itemDef) {
  const id = String(itemDef?.id || '').trim().toLowerCase();
  return trWithFallback(`item.${id}.name`, itemDef?.name || itemDef?.id || '-');
}

function getItemRarityLabel(rarity) {
  const key = String(rarity || 'common').trim().toLowerCase();
  return trWithFallback(`ui.inventory.rarity.${key}`, key);
}

function getItemSlotLabel(slot) {
  return trWithFallback(`ui.inventory.slot.${String(slot?.key || '').toLowerCase()}`, slot?.name || slot?.key || '-');
}

function getItemCategoryLabel(category) {
  const key = String(category || '').trim().toLowerCase();
  const fallbackMap = {
    head: 'Шапка',
    armor: 'Броня',
    legs: 'Штаны',
    hand: 'Рука',
    ring: 'Кольцо',
    quick: 'Быстрый слот',
  };
  return trWithFallback(`ui.inventory.category.${key}`, fallbackMap[key] || key || '-');
}

function getInventoryItemIconMeta(itemDef, equipTargets) {
  if (itemDef?.combatUse) {
    return { glyph: 'FX', className: 'consumable' };
  }
  const slotCategory = String(itemDef?.slotCategory || '').trim().toLowerCase();
  if (slotCategory === 'head') return { glyph: 'HD', className: 'head' };
  if (slotCategory === 'armor') return { glyph: 'AR', className: 'armor' };
  if (slotCategory === 'legs') return { glyph: 'LG', className: 'legs' };
  if (slotCategory === 'ring') return { glyph: 'RG', className: 'ring' };
  const hasLeftHand = equipTargets.some((slot) => String(slot?.key || '').trim().toLowerCase() === 'left_hand');
  const hasRightHand = equipTargets.some((slot) => String(slot?.key || '').trim().toLowerCase() === 'right_hand');
  if (hasLeftHand && hasRightHand) return { glyph: 'WP', className: 'hands' };
  if (hasLeftHand) return { glyph: 'LH', className: 'hands' };
  if (hasRightHand) return { glyph: 'RH', className: 'hands' };
  return { glyph: 'IT', className: 'other' };
}

function getItemRaritySortWeight(rarity) {
  switch (String(rarity || '').trim().toLowerCase()) {
    case 'legendary': return 5;
    case 'epic': return 4;
    case 'rare': return 3;
    case 'uncommon': return 2;
    default: return 1;
  }
}

function getInventorySlotTargets(catalog, itemDef) {
  const slotCategory = String(itemDef?.slotCategory || '').trim();
  return (Array.isArray(catalog?.itemSlots) ? catalog.itemSlots : []).filter((slot) => String(slot?.category || '').trim() === slotCategory);
}

function openHeroEquipModal(hero, slotKey) {
  const catalog = getProgressionCatalog();
  const progression = getProgressionState();
  const slot = (Array.isArray(catalog?.itemSlots) ? catalog.itemSlots : []).find((entry) => String(entry?.key || '') === String(slotKey || ''));
  if (!slot) return;

  ensureHeroEquipModal();
  if (!heroEquipModalEl || !heroEquipModalTitleEl || !heroEquipModalBodyEl) return;

  const itemMap = getCatalogItemMap(catalog);
  const inventoryItems = Array.isArray(progression?.inventoryItems) ? progression.inventoryItems.slice() : [];
  const equippedItems = getHeroEquipmentItemMap(catalog, progression, hero.id);
  const matchingItems = inventoryItems
    .filter((item) => {
      const itemDef = itemMap[item.itemId] || {};
      return getInventorySlotTargets(catalog, itemDef).some((target) => String(target?.key || '') === String(slotKey || ''));
    })
    .sort((a, b) => {
      const itemDefA = itemMap[a.itemId] || {};
      const itemDefB = itemMap[b.itemId] || {};
      const aEquipped = Object.values(equippedItems).some((entry) => entry?.uid === a.uid) ? 1 : 0;
      const bEquipped = Object.values(equippedItems).some((entry) => entry?.uid === b.uid) ? 1 : 0;
      return (bEquipped - aEquipped)
        || (getItemRaritySortWeight(itemDefB.rarity) - getItemRaritySortWeight(itemDefA.rarity))
        || ((Number(b.level) || 0) - (Number(a.level) || 0))
        || String(getItemDisplayName(itemDefA)).localeCompare(String(getItemDisplayName(itemDefB)));
    });

  heroEquipModalTitleEl.textContent = `${trWithFallback('ui.inventory.equip_slot_title', 'Снарядить слот')}: ${getItemSlotLabel(slot)}`;
  if (!matchingItems.length) {
    heroEquipModalBodyEl.innerHTML = `<div class="hero-equip-modal-empty">${escapeHtml(trWithFallback('ui.inventory.no_matching_items', 'Р”Р»СЏ СЌС‚РѕРіРѕ СЃР»РѕС‚Р° РїРѕРєР° РЅРµС‚ РїРѕРґС…РѕРґСЏС‰РёС… РїСЂРµРґРјРµС‚РѕРІ.'))}</div>`;
    heroEquipModalEl.classList.remove('hidden');
    return;
  }

  const rowsHtml = matchingItems.map((item) => {
    const itemDef = itemMap[item.itemId] || {};
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const equippedIn = Object.keys(equippedItems).filter((key) => equippedItems[key]?.uid === item.uid);
    const equippedMeta = equippedIn.length
      ? `<div class="hero-equip-picker-meta hero-equip-picker-meta-eq">${escapeHtml(trWithFallback('ui.inventory.equipped_in', 'Экипировано'))}: ${escapeHtml(equippedIn.map((key) => getItemSlotLabel((catalog.itemSlots || []).find((entry) => entry.key === key) || { key })).join(', '))}</div>`
      : '';
    return `<div class="hero-equip-picker-row rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="hero-equip-picker-copy"><div class="hero-equip-picker-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="hero-equip-picker-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} • Lv ${Math.max(1, Number(item.level) || 1)}${quantity > 1 ? ` • x${quantity}` : ''}</div>${equippedMeta}</div><button type="button" class="hero-equip-action" data-modal-item-equip="${escapeHtml(item.uid)}" data-slot-key="${escapeHtml(slot.key)}">${escapeHtml(trWithFallback('ui.inventory.equip', 'Снарядить'))}</button></div>`;
  }).join('');

  heroEquipModalBodyEl.innerHTML = `<div class="hero-equip-picker-list">${rowsHtml}</div>`;
  for (const btn of heroEquipModalBodyEl.querySelectorAll('[data-modal-item-equip]')) {
    btn.addEventListener('click', async () => {
      try {
        await equipItemForAccount(hero.id, btn.getAttribute('data-modal-item-equip') || '', btn.getAttribute('data-slot-key') || '');
        closeHeroEquipModal();
        setHeroActionFeedback(trWithFallback('ui.inventory.equipped', 'Предмет экипирован.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to equip item.'), 'err');
      }
    });
  }

  heroEquipModalEl.classList.remove('hidden');
}

function getHeroEquipmentItemMap(catalog, progression, heroId) {
  const inventoryItems = Array.isArray(progression?.inventoryItems) ? progression.inventoryItems : [];
  const inventoryByUid = Object.fromEntries(inventoryItems.map((item) => [String(item.uid || ''), item]));
  const heroEquipment = progression?.heroEquipment?.[heroId] && typeof progression.heroEquipment[heroId] === 'object'
    ? progression.heroEquipment[heroId]
    : {};
  const out = {};
  for (const slotKey of Object.keys(heroEquipment)) {
    const item = inventoryByUid[String(heroEquipment[slotKey] || '').trim()];
    if (item) out[slotKey] = item;
  }
  return out;
}

const heroPreviewImageCache = new Map();

function getHeroPreviewImage(heroId) {
  const key = String(heroId || '').trim().toLowerCase() || 'cyber';
  if (heroPreviewImageCache.has(key)) return heroPreviewImageCache.get(key);
  const img = new Image();
  img.src = getHeroCardImagePath(key);
  heroPreviewImageCache.set(key, img);
  return img;
}
function drawCharacterPreview(previewCanvas, variant) {
  const c = previewCanvas;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;

  const portrait = getHeroPreviewImage(variant.id);
  if (portrait?.complete && portrait.naturalWidth > 0 && portrait.naturalHeight > 0) {
    g.imageSmoothingEnabled = true;
    const srcRatio = portrait.naturalWidth / Math.max(1, portrait.naturalHeight);
    const dstRatio = c.width / Math.max(1, c.height);
    let sx = 0;
    let sy = 0;
    let sw = portrait.naturalWidth;
    let sh = portrait.naturalHeight;
    if (srcRatio > dstRatio) {
      sw = Math.round(sh * dstRatio);
      sx = Math.round((portrait.naturalWidth - sw) * 0.5);
    } else {
      sh = Math.round(sw / dstRatio);
      sy = Math.round((portrait.naturalHeight - sh) * 0.18);
      sy = Math.max(0, Math.min(sy, portrait.naturalHeight - sh));
    }
    g.drawImage(portrait, sx, sy, sw, sh, 0, 0, c.width, c.height);
    g.fillStyle = variant.accent;
    g.fillRect(c.width - 14, 4, 10, 3);
    return;
  }

  const sprite = sprites.players[variant.id];
  const fw = Math.max(8, Number(variant.frameW) || 32);
  const fh = Math.max(8, Number(variant.frameH) || 48);
  const baseScale = Math.max(0.5, Number(variant.scale) || 1);
  const frameCount = sprite?.naturalWidth ? Math.max(1, Math.floor(sprite.naturalWidth / fw)) : 1;
  const idleFrame = Math.max(0, Math.min(frameCount - 1, Number(variant.idleFrame) || 1));

  if (!(sprite?.complete && sprite.naturalWidth >= fw && sprite.naturalHeight >= fh)) {
    g.fillStyle = variant.accent;
    g.beginPath();
    g.arc(c.width / 2, c.height / 2, 12, 0, Math.PI * 2);
    g.fill();
    return;
  }

  const fitScale = Math.min(
    baseScale,
    Math.max(0.2, (c.width - 8) / fw),
    Math.max(0.2, (c.height - 8) / fh),
  );

  const dw = fw * fitScale;
  const dh = fh * fitScale;
  const dx = Math.round((c.width - dw) / 2);
  const dy = Math.round((c.height - dh) / 2) + 1;
  g.drawImage(sprite, idleFrame * fw, (variant.rows?.down || 0) * fh, fw, fh, dx, dy, dw, dh);

  const tint = String(variant.tint || variant.accent || '').trim();
  if (tint) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = 0.34;
    g.fillStyle = tint;
    g.fillRect(dx, dy, dw, dh);
    g.restore();
  }

  g.fillStyle = variant.accent;
  g.fillRect(c.width - 14, 4, 10, 3);
}

function renderAccountSummary(catalog, progression) {
  if (!accountProgressSummaryEl) return;
  if (!game.playerAuth?.player || !progression) {
    accountProgressSummaryEl.innerHTML = '<b>' + trWithFallback('ui.profile.guest_mode', 'Guest mode:') + '</b> ' + trWithFallback('ui.profile.guest_progression_hint', 'account progression, heroes and talents are saved only for logged in players.') ;
    return;
  }
  const level = Math.max(1, Number(progression.accountLevel) || 1);
  const xp = Math.max(0, Number(progression.accountXp) || 0);
  const xpToNext = Math.max(1, Number(progression.accountXpToNext) || 1);
  const points = Math.max(0, Number(progression.accountSkillPoints) || 0);
  const shards = Math.max(0, Number(progression.shards) || 0);
  const salvage = Math.max(0, Number(progression.salvage) || 0);
  accountProgressSummaryEl.innerHTML = `${trWithFallback('ui.profile.account', 'Account')} Lv${level} | XP ${xp}/${xpToNext} | ${trWithFallback('ui.profile.skill_points', 'Skill points')}: <b>${points}</b> | ${trWithFallback('ui.profile.shards', 'Shards')}: <b>${shards}</b> | ${trWithFallback('ui.inventory.salvage', 'Лом')}: <b>${salvage}</b>`;
}

function getNodeLevel(progression, heroId, nodeId) {
  return Math.max(0, Number(progression?.heroNodes?.[heroId]?.[nodeId]) || 0);
}

function getHeroSkillLevel(progression, heroId, skillId) {
  return Math.max(0, Number(progression?.heroSkillLevels?.[heroId]?.[skillId]) || 0);
}

function heroRequirementMeta(need, have, formatter) {
  const enough = Math.max(0, Number(have) || 0) >= Math.max(0, Number(need) || 0);
  return {
    enough,
    text: formatter(Math.max(0, Number(need) || 0), Math.max(0, Number(have) || 0)),
  };
}

function bindHeroUnlockButton(targetEl, hero) {
  const unlockBtn = targetEl?.querySelector?.('[data-hero-unlock="1"]');
  unlockBtn?.addEventListener('click', async () => {
    try {
      await unlockHeroForAccount(hero.id);
      setHeroActionFeedback(trWithFallback('ui.hero.unlocked_msg', `${hero.name} unlocked.`, { hero: trHeroName(hero.id, hero.name) }), 'ok');
      selectedPlayerClass = hero.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      await selectHeroForAccount(hero.id);
      renderCharacterPicker();
    } catch (err) {
      setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unlock hero.'), 'err');
    }
  });
}

function bindHeroProgressionButtons(targetEl, hero) {
  for (const btn of targetEl?.querySelectorAll?.('.hero-node-up') || []) {
    btn.addEventListener('click', async () => {
      const heroSkillId = btn.getAttribute('data-hero-skill-id') || '';
      const heroSkillAction = btn.getAttribute('data-hero-skill-action') || '';
      if (heroSkillId) {
        try {
          if (heroSkillAction === 'unlock') await unlockHeroSkillForAccount(hero.id, heroSkillId);
          else await upgradeHeroSkillForAccount(hero.id, heroSkillId);
          setHeroActionFeedback(`${hero.name}: ${heroSkillId} ${heroSkillAction === 'unlock' ? 'unlocked' : 'upgraded'}`, 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to update hero skill.'), 'err');
        }
        return;
      }
      const nodeId = btn.getAttribute('data-node-id') || '';
      if (!nodeId) return;
      try {
        await upgradeHeroNodeForAccount(hero.id, nodeId);
        setHeroActionFeedback(`Upgraded ${hero.name}: ${nodeId}`, 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade node.'), 'err');
      }
    });
  }
}

function bindHeroInventoryButtons(targetEl, hero) {
  for (const btn of targetEl?.querySelectorAll?.('[data-inventory-filter]') || []) {
    btn.addEventListener('click', () => {
      selectedInventoryFilterKey = String(btn.getAttribute('data-inventory-filter') || 'all');
      renderCharacterPicker();
    });
  }

  for (const btn of targetEl?.querySelectorAll?.('[data-open-slot-equip]') || []) {
    btn.addEventListener('click', () => {
      openHeroEquipModal(hero, btn.getAttribute('data-open-slot-equip') || '');
    });
  }

  for (const btn of targetEl?.querySelectorAll?.('[data-unequip-slot]') || []) {
    btn.addEventListener('click', async () => {
      try {
        await unequipItemForAccount(hero.id, btn.getAttribute('data-unequip-slot') || '');
        setHeroActionFeedback(trWithFallback('ui.inventory.unequipped', 'Предмет снят.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unequip item.'), 'err');
      }
    });
  }

  for (const btn of targetEl?.querySelectorAll?.('[data-item-equip]') || []) {
    btn.addEventListener('click', async () => {
      try {
        await equipItemForAccount(hero.id, btn.getAttribute('data-item-equip') || '', btn.getAttribute('data-slot-key') || '');
        setHeroActionFeedback(trWithFallback('ui.inventory.equipped', 'Предмет экипирован.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to equip item.'), 'err');
      }
    });
  }

  for (const btn of targetEl?.querySelectorAll?.('[data-item-sell]') || []) {
    btn.addEventListener('click', async () => {
      try {
        await sellInventoryItemForAccount(btn.getAttribute('data-item-sell') || '');
        setHeroActionFeedback(trWithFallback('ui.inventory.sold', 'Предмет продан.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to sell item.'), 'err');
      }
    });
  }

  for (const btn of targetEl?.querySelectorAll?.('[data-item-upgrade]') || []) {
    btn.addEventListener('click', async () => {
      try {
        await upgradeInventoryItemForAccount(btn.getAttribute('data-item-upgrade') || '');
        setHeroActionFeedback(trWithFallback('ui.inventory.upgraded', 'Предмет улучшен.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade item.'), 'err');
      }
    });
  }
}

function splitHeroPanelsBetweenMenus(hero) {
  if (!heroTreePanelEl || !heroCharacterPanelEl) return;
  const shell = heroTreePanelEl.querySelector('.hero-loadout-shell');
  if (!shell) {
    heroCharacterPanelEl.innerHTML = '';
    return;
  }

  const cards = Array.from(shell.children);
  const headerCard = cards[0] || null;
  const layoutCard = cards[1] || null;
  const layoutChildren = Array.from(layoutCard?.children || []);
  const stageCard = layoutChildren[0] || null;
  const talentCard = layoutChildren[1] || null;
  const uniqueCard = layoutChildren[2] || null;

  heroCharacterPanelEl.innerHTML = '';
  const characterShell = document.createElement('div');
  characterShell.className = 'hero-loadout-shell';
  if (stageCard) characterShell.appendChild(stageCard.cloneNode(true));
  const characterSkillsRow = document.createElement('div');
  characterSkillsRow.className = 'hero-skill-panels-row';
  if (talentCard) characterSkillsRow.appendChild(talentCard.cloneNode(true));
  if (uniqueCard) characterSkillsRow.appendChild(uniqueCard.cloneNode(true));
  if (characterSkillsRow.children.length) characterShell.appendChild(characterSkillsRow);
  heroCharacterPanelEl.appendChild(characterShell);

  shell.innerHTML = '';
  if (headerCard) shell.appendChild(headerCard);
  const skillsRow = document.createElement('div');
  skillsRow.className = 'hero-skill-panels-row';
  if (talentCard) skillsRow.appendChild(talentCard);
  if (uniqueCard) skillsRow.appendChild(uniqueCard);
  shell.appendChild(skillsRow);

  bindHeroUnlockButton(heroCharacterPanelEl, hero);
  bindHeroProgressionButtons(heroCharacterPanelEl, hero);
  bindHeroInventoryButtons(heroCharacterPanelEl, hero);
  bindHeroUnlockButton(heroTreePanelEl, hero);
  bindHeroProgressionButtons(heroTreePanelEl, hero);
}

function renderHeroTreePanel(catalog, progression, hero, unlocked) {
  if (!heroTreePanelEl) return;
  if (!hero) {
    heroTreePanelEl.innerHTML = '';
    return;
  }

  const points = Math.max(0, Number(progression?.accountSkillPoints) || 0);
  const shards = Math.max(0, Number(progression?.shards) || 0);
  const accountLevel = Math.max(1, Number(progression?.accountLevel) || 1);
  const needLevel = Math.max(1, Number(hero.unlockLevel) || 1);
  const needShardCost = Math.max(0, Number(hero.unlockShardCost ?? hero.unlockCost) || 0);
  const needCardId = String(hero.unlockCardId || '').trim();
  const needCards = Math.max(0, Number(hero.unlockCardNeed) || 0);
  const cardName = trWithFallback(`hero.${String(hero.id || '').toLowerCase()}.card`, String(hero.unlockCardName || hero.name || trWithFallback('ui.hero.card', 'Hero Card')));
  const haveCards = needCardId ? Math.max(0, Number(progression?.heroCards?.[needCardId]) || 0) : needCards;
  const accountLevelReq = heroRequirementMeta(needLevel, accountLevel, (need, have) => trWithFallback('ui.hero.need_have_level', 'Required level: {need} вЂў You have: {have}', { need, have }));
  const shardsReq = heroRequirementMeta(needShardCost, shards, (need, have) => trWithFallback('ui.hero.need_have', 'Need: {need} вЂў You have: {have}', { need, have }));
  const cardsReq = heroRequirementMeta(needCards, haveCards, (need, have) => trWithFallback('ui.hero.need_have_cards', '{card}: need {need} вЂў you have {have}', { card: cardName, need, have }));
  const canUnlock = game.playerAuth?.player
    && !unlocked
    && accountLevelReq.enough
    && shardsReq.enough
    && cardsReq.enough;

  const tree = Array.isArray(catalog.trees?.[hero.id]) ? catalog.trees[hero.id] : [];
  const uniqueSkills = Array.isArray(hero.uniqueSkills) ? hero.uniqueSkills : [];
  const heroLevels = progression?.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
  const heroXp = progression?.heroXp && typeof progression.heroXp === 'object' ? progression.heroXp : {};
  const heroXpToNext = progression?.heroXpToNext && typeof progression.heroXpToNext === 'object' ? progression.heroXpToNext : {};
  const heroLevelCap = Math.max(1, Number(catalog?.heroLevelCap) || 999);
  const heroLevel = Math.max(1, Number(heroLevels[hero.id]) || 1);
  const heroXpValue = Math.max(0, Number(heroXp[hero.id]) || 0);
  const heroXpNeed = Math.max(0, Number(heroXpToNext[hero.id]) || 0);
  const rows = [];
  for (const node of tree) {
    const lvl = getNodeLevel(progression, hero.id, node.id);
    const maxLevel = Math.max(1, Number(node.maxLevel) || 1);
    const cost = Math.max(1, Number(node.cost) || 1);
    const pointReq = heroRequirementMeta(cost, points, (need, have) => trWithFallback('ui.hero.need_have_points', 'Skill points: need {need} вЂў you have {have}', { need, have }));
    const canUpgrade = Boolean(game.playerAuth?.player && unlocked && lvl < maxLevel && pointReq.enough);
    const nodeName = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.name`, node.name || node.id);
    const nodeDesc = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.desc`, node.desc || '');
    const reqClass = pointReq.enough ? 'ok' : 'lack';
    rows.push(`<div class="hero-node ${pointReq.enough ? '' : 'hero-node-lack'}"><div><div class="hero-node-name">${escapeHtml(nodeName)}</div><div class="hero-node-desc">${escapeHtml(nodeDesc)}</div><div class="hero-node-desc hero-req ${reqClass}">${escapeHtml(pointReq.text)}</div></div><button type="button" class="hero-node-up ${pointReq.enough ? '' : 'hero-node-up-lack'}" data-node-id="${escapeHtml(node.id)}" ${canUpgrade ? '' : 'disabled'}>Lv ${lvl}/${maxLevel}</button></div>`);
  }

  const skillRows = uniqueSkills.map((skill) => {
    const lvl = getHeroSkillLevel(progression, hero.id, skill.id);
    const maxLevel = Math.max(1, Number(skill.maxLevel) || 1);
    const unlockedSkill = lvl > 0;
    const unlockCost = Math.max(1, Number(skill.unlockCostShards) || 1);
    const upgradeCost = Math.max(1, (Number(skill.upgradeCostShardsBase) || 1) + (Math.max(0, lvl - 1) * Math.max(0, Number(skill.upgradeCostShardsStep) || 0)));
    const shardWord = trWithFallback('ui.profile.shards', 'Shards').toLowerCase();
    const costReq = heroRequirementMeta(unlockedSkill ? upgradeCost : unlockCost, shards, (need, have) => {
      const tpl = unlockedSkill ? 'ui.hero.skill_upgrade_cost' : 'ui.hero.skill_unlock_cost';
      const fb = unlockedSkill ? 'Upgrade: {cost} shards' : 'Unlock: {cost} shards';
      return trWithFallback(tpl, fb, { cost: need, currency: shardWord })
        + ' вЂў '
        + `${trWithFallback('ui.hero.have_label', 'РЈ РІР°СЃ')}: ${have}`;
    });
    const canUnlockSkill = Boolean(game.playerAuth?.player && unlocked && !unlockedSkill && costReq.enough);
    const canUpgradeSkill = Boolean(game.playerAuth?.player && unlocked && unlockedSkill && lvl < maxLevel && costReq.enough);
    const skillName = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.name`, skill.name || skill.id);
    const skillDesc = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.desc`, skill.desc || '');
    const skillType = skill.kind === 'active'
      ? trWithFallback('ui.hero.skill_type_active', 'Active')
      : (skill.globalAura
        ? trWithFallback('ui.hero.skill_type_passive_aura', 'Passive Aura')
        : trWithFallback('ui.hero.skill_type_passive', 'Passive'));
    const requirementLabel = unlockedSkill
      ? (lvl >= maxLevel
        ? trWithFallback('ui.common.max', 'MAX')
        : costReq.text)
      : costReq.text;
    const requirementDisplayLabel = String(requirementLabel || '')
      .replace(/\s+[вЂўВ·]\s+(Need|РќСѓР¶РЅРѕ):\s*\d+\s+[вЂўВ·]\s+/iu, ' вЂў ')
      .replace(/\s+РІР‚Сћ\s+(Need|РќСѓР¶РЅРѕ):\s*\d+\s+РІР‚Сћ\s+/iu, ' вЂў ');
    return `<div class="hero-node hero-unique-skill ${(!costReq.enough && lvl < maxLevel) ? 'hero-node-lack' : ''}"><div><div class="hero-node-name">${escapeHtml(skillName)} <span class="muted">(${escapeHtml(skillType)})</span></div><div class="hero-node-desc">${escapeHtml(skillDesc)}</div><div class="hero-node-desc hero-req ${(costReq.enough || lvl >= maxLevel) ? 'ok' : 'lack'}">${escapeHtml(requirementDisplayLabel)}</div></div><button type="button" class="hero-node-up ${(!costReq.enough && lvl < maxLevel) ? 'hero-node-up-lack' : ''}" data-hero-skill-id="${escapeHtml(skill.id)}" data-hero-skill-action="${unlockedSkill ? 'upgrade' : 'unlock'}" ${(unlockedSkill ? canUpgradeSkill : canUnlockSkill) ? '' : 'disabled'}>Lv ${lvl}/${maxLevel}</button></div>`;
  }).join('');

  const unlockMeta = !unlocked
    ? `<div class="hero-lock-meta"><span class="hero-req ${accountLevelReq.enough ? 'ok' : 'lack'}">${escapeHtml(accountLevelReq.text)}</span><span class="hero-req ${cardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(cardsReq.text)}</span><span class="hero-req ${shardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(shardsReq.text)}</span></div>`
    : '<div class="hero-lock-meta unlocked">' + trWithFallback('ui.hero.unlocked', 'Unlocked') + '</div>';

  const actionBtn = !game.playerAuth?.player
    ? '<button type="button" class="hero-main-action" disabled>' + trWithFallback('ui.auth.login_required_unlock', 'Login to unlock/progress') + '</button>'
    : (!unlocked
      ? `<button type="button" class="hero-main-action" data-hero-unlock="1" ${canUnlock ? '' : 'disabled'}>${trWithFallback('ui.hero.unlock_btn', 'Unlock hero')}</button>`
      : '');

  const heroDisplayName = trHeroName(hero.id, hero.name);
  const heroTagline = trWithFallback(`hero.${String(hero.id || '').toLowerCase()}.tagline`, hero.tagline || '');
  const heroStats = hero.baseStats && typeof hero.baseStats === 'object'
    ? `POW ${Math.max(0, Number(hero.baseStats.power) || 0)} | AGI ${Math.max(0, Number(hero.baseStats.agility) || 0)} | VIT ${Math.max(0, Number(hero.baseStats.vitality) || 0)} | TEC ${Math.max(0, Number(hero.baseStats.tech) || 0)}`
    : '';
  const heroXpLabel = heroLevel >= heroLevelCap
    ? `Lv ${heroLevel}/${heroLevelCap} MAX`
    : `Lv ${heroLevel}/${heroLevelCap} | XP ${heroXpValue}/${heroXpNeed}`;
  heroTreePanelEl.innerHTML = `<div class="hero-tree-head"><div><b>${escapeHtml(heroDisplayName)}</b><div class="hero-tagline">${escapeHtml(heroTagline)}</div><div class="hero-tagline">${escapeHtml(heroXpLabel)}</div><div class="hero-tagline">${escapeHtml(heroStats)}</div></div>${unlockMeta}</div>${actionBtn}<div class="hero-tree-list">${rows.join('')}</div><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.hero.unique_skills', 'Уникальные навыки'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.unique_skills_hint', 'Активные навыки и пассивные эффекты выбранного героя.'))}</div></div></div><div class="hero-tree-list">${skillRows || '<div class="hero-tagline">Нет уникальных навыков.</div>'}</div>`;

  const unlockBtn = heroTreePanelEl.querySelector('[data-hero-unlock="1"]');
  unlockBtn?.addEventListener('click', async () => {
    try {
      await unlockHeroForAccount(hero.id);
      setHeroActionFeedback(trWithFallback('ui.hero.unlocked_msg', `${hero.name} unlocked.`, { hero: trHeroName(hero.id, hero.name) }), 'ok');
      selectedPlayerClass = hero.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      await selectHeroForAccount(hero.id);
      renderCharacterPicker();
    } catch (err) {
      setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unlock hero.'), 'err');
    }
  });

  for (const btn of heroTreePanelEl.querySelectorAll('.hero-node-up')) {
    btn.addEventListener('click', async () => {
      const heroSkillId = btn.getAttribute('data-hero-skill-id') || '';
      const heroSkillAction = btn.getAttribute('data-hero-skill-action') || '';
      if (heroSkillId) {
        try {
          if (heroSkillAction === 'unlock') await unlockHeroSkillForAccount(hero.id, heroSkillId);
          else await upgradeHeroSkillForAccount(hero.id, heroSkillId);
          setHeroActionFeedback(`${hero.name}: ${heroSkillId} ${heroSkillAction === 'unlock' ? 'unlocked' : 'upgraded'}`, 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to update hero skill.'), 'err');
        }
        return;
      }
      const nodeId = btn.getAttribute('data-node-id') || '';
      if (!nodeId) return;
      try {
        await upgradeHeroNodeForAccount(hero.id, nodeId);
        setHeroActionFeedback(`Upgraded ${hero.name}: ${nodeId}`, 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade node.'), 'err');
      }
    });
  }
}

function renderHeroTreePanelV2(catalog, progression, hero, unlocked) {
  if (!heroTreePanelEl) return;
  if (!hero) {
    heroTreePanelEl.innerHTML = '';
    return;
  }

  const points = Math.max(0, Number(progression?.accountSkillPoints) || 0);
  const shards = Math.max(0, Number(progression?.shards) || 0);
  const salvage = Math.max(0, Number(progression?.salvage) || 0);
  const accountLevel = Math.max(1, Number(progression?.accountLevel) || 1);
  const needLevel = Math.max(1, Number(hero.unlockLevel) || 1);
  const needShardCost = Math.max(0, Number(hero.unlockShardCost ?? hero.unlockCost) || 0);
  const needCardId = String(hero.unlockCardId || '').trim();
  const needCards = Math.max(0, Number(hero.unlockCardNeed) || 0);
  const cardName = trWithFallback(`hero.${String(hero.id || '').toLowerCase()}.card`, String(hero.unlockCardName || hero.name || trWithFallback('ui.hero.card', 'Hero Card')));
  const haveCards = needCardId ? Math.max(0, Number(progression?.heroCards?.[needCardId]) || 0) : needCards;
  const accountLevelReq = heroRequirementMeta(needLevel, accountLevel, (need, have) => trWithFallback('ui.hero.need_have_level', 'Required level: {need} вЂў You have: {have}', { need, have }));
  const shardsReq = heroRequirementMeta(needShardCost, shards, (need, have) => trWithFallback('ui.hero.need_have', 'Need: {need} вЂў You have: {have}', { need, have }));
  const cardsReq = heroRequirementMeta(needCards, haveCards, (need, have) => trWithFallback('ui.hero.need_have_cards', '{card}: need {need} вЂў you have {have}', { card: cardName, need, have }));
  const canUnlock = game.playerAuth?.player && !unlocked && accountLevelReq.enough && shardsReq.enough && cardsReq.enough;

  const tree = Array.isArray(catalog.trees?.[hero.id]) ? catalog.trees[hero.id] : [];
  const uniqueSkills = Array.isArray(hero.uniqueSkills) ? hero.uniqueSkills : [];
  const itemMap = getCatalogItemMap(catalog);
  const inventoryItems = Array.isArray(progression?.inventoryItems) ? progression.inventoryItems : [];
  const equippedItems = getHeroEquipmentItemMap(catalog, progression, hero.id);
  const heroLevels = progression?.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
  const heroXp = progression?.heroXp && typeof progression.heroXp === 'object' ? progression.heroXp : {};
  const heroXpToNext = progression?.heroXpToNext && typeof progression.heroXpToNext === 'object' ? progression.heroXpToNext : {};
  const heroLevelCap = Math.max(1, Number(catalog?.heroLevelCap) || 999);
  const heroLevel = Math.max(1, Number(heroLevels[hero.id]) || 1);
  const heroXpValue = Math.max(0, Number(heroXp[hero.id]) || 0);
  const heroXpNeed = Math.max(0, Number(heroXpToNext[hero.id]) || 0);

  const rows = [];
  for (const node of tree) {
    const lvl = getNodeLevel(progression, hero.id, node.id);
    const maxLevel = Math.max(1, Number(node.maxLevel) || 1);
    const cost = Math.max(1, Number(node.cost) || 1);
    const pointReq = heroRequirementMeta(cost, points, (need, have) => trWithFallback('ui.hero.need_have_points', 'Skill points: need {need} вЂў you have {have}', { need, have }));
    const canUpgrade = Boolean(game.playerAuth?.player && unlocked && lvl < maxLevel && pointReq.enough);
    const nodeName = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.name`, node.name || node.id);
    const nodeDesc = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.desc`, node.desc || '');
    const reqClass = pointReq.enough ? 'ok' : 'lack';
    rows.push(`<div class="hero-node ${pointReq.enough ? '' : 'hero-node-lack'}"><div><div class="hero-node-name">${escapeHtml(nodeName)}</div><div class="hero-node-desc">${escapeHtml(nodeDesc)}</div><div class="hero-node-desc hero-req ${reqClass}">${escapeHtml(pointReq.text)}</div></div><button type="button" class="hero-node-up ${pointReq.enough ? '' : 'hero-node-up-lack'}" data-node-id="${escapeHtml(node.id)}" ${canUpgrade ? '' : 'disabled'}>Lv ${lvl}/${maxLevel}</button></div>`);
  }

  const skillRows = uniqueSkills.map((skill) => {
    const lvl = getHeroSkillLevel(progression, hero.id, skill.id);
    const maxLevel = Math.max(1, Number(skill.maxLevel) || 1);
    const unlockedSkill = lvl > 0;
    const unlockCost = Math.max(1, Number(skill.unlockCostShards) || 1);
    const upgradeCost = Math.max(1, (Number(skill.upgradeCostShardsBase) || 1) + (Math.max(0, lvl - 1) * Math.max(0, Number(skill.upgradeCostShardsStep) || 0)));
    const shardWord = trWithFallback('ui.profile.shards', 'Shards').toLowerCase();
    const costReq = heroRequirementMeta(unlockedSkill ? upgradeCost : unlockCost, shards, (need, have) => {
      const tpl = unlockedSkill ? 'ui.hero.skill_upgrade_cost' : 'ui.hero.skill_unlock_cost';
      const fb = unlockedSkill ? 'Upgrade: {cost} shards' : 'Unlock: {cost} shards';
      return trWithFallback(tpl, fb, { cost: need, currency: shardWord }) + ' вЂў ' + `${trWithFallback('ui.hero.have_label', 'РЈ РІР°СЃ')}: ${have}`;
    });
    const canUnlockSkill = Boolean(game.playerAuth?.player && unlocked && !unlockedSkill && costReq.enough);
    const canUpgradeSkill = Boolean(game.playerAuth?.player && unlocked && unlockedSkill && lvl < maxLevel && costReq.enough);
    const skillName = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.name`, skill.name || skill.id);
    const skillDesc = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.desc`, skill.desc || '');
    const skillType = skill.kind === 'active'
      ? trWithFallback('ui.hero.skill_type_active', 'Active')
      : (skill.globalAura ? trWithFallback('ui.hero.skill_type_passive_aura', 'Passive Aura') : trWithFallback('ui.hero.skill_type_passive', 'Passive'));
    const requirementLabel = unlockedSkill ? (lvl >= maxLevel ? trWithFallback('ui.common.max', 'MAX') : costReq.text) : costReq.text;
    return `<div class="hero-node hero-unique-skill ${(!costReq.enough && lvl < maxLevel) ? 'hero-node-lack' : ''}"><div><div class="hero-node-name">${escapeHtml(skillName)} <span class="muted">(${escapeHtml(skillType)})</span></div><div class="hero-node-desc">${escapeHtml(skillDesc)}</div><div class="hero-node-desc hero-req ${(costReq.enough || lvl >= maxLevel) ? 'ok' : 'lack'}">${escapeHtml(requirementLabel)}</div></div><button type="button" class="hero-node-up ${(!costReq.enough && lvl < maxLevel) ? 'hero-node-up-lack' : ''}" data-hero-skill-id="${escapeHtml(skill.id)}" data-hero-skill-action="${unlockedSkill ? 'upgrade' : 'unlock'}" ${(unlockedSkill ? canUpgradeSkill : canUnlockSkill) ? '' : 'disabled'}>Lv ${lvl}/${maxLevel}</button></div>`;
  }).join('');

  const gearSlots = (Array.isArray(catalog.itemSlots) ? catalog.itemSlots : []).filter((slot) => slot?.kind === 'gear');
  const quickSlots = (Array.isArray(catalog.itemSlots) ? catalog.itemSlots : []).filter((slot) => slot?.kind === 'consumable');

  const renderEquipSlotCard = (slot, extraMeta = '') => {
    const item = equippedItems[slot.key] || null;
    const itemDef = item ? itemMap[item.itemId] : null;
    const iconMeta = itemDef
      ? getInventoryItemIconMeta(itemDef, getInventorySlotTargets(catalog, itemDef))
      : getInventoryItemIconMeta(
        {
          slotCategory: slot?.category,
          combatUse: slot?.kind === 'consumable',
        },
        [slot],
      );
    const itemName = itemDef ? getItemDisplayName(itemDef) : trWithFallback('ui.inventory.empty_slot', 'Пусто');
    const itemMeta = itemDef
      ? `${getItemRarityLabel(itemDef.rarity)} • Lv ${Math.max(1, Number(item.level) || 1)}${Math.max(1, Number(item.quantity) || 1) > 1 ? ` • x${Math.max(1, Number(item.quantity) || 1)}` : ''}`
      : (slot?.kind === 'consumable' ? '' : trWithFallback('ui.inventory.empty_slot_hint', 'Выберите предмет из инвентаря'));
    return `<div class="hero-equip-slot ${item ? `filled rarity-${escapeHtml(String(itemDef?.rarity || 'common').toLowerCase())}` : 'empty'}"><div class="hero-equip-slot-layout"><div class="hero-equip-slot-side"><div class="hero-equip-slot-icon inventory-item-icon inventory-item-icon-${escapeHtml(iconMeta.className)}">${escapeHtml(iconMeta.glyph)}</div>${item ? `<button type="button" class="hero-equip-action" data-unequip-slot="${escapeHtml(slot.key)}">${escapeHtml(trWithFallback('ui.inventory.unequip', 'Снять'))}</button>` : '<div class="hero-equip-slot-empty-cta">' + escapeHtml(trWithFallback('ui.inventory.empty_slot_cta', 'Снарядите предмет из инвентаря')) + '</div>'}</div><div class="hero-equip-slot-copy"><div class="hero-equip-slot-label">${escapeHtml(getItemSlotLabel(slot))}${extraMeta ? `<span class="hero-equip-slot-hotkey">${escapeHtml(extraMeta)}</span>` : ''}</div><div class="hero-equip-slot-name">${escapeHtml(itemName)}</div><div class="hero-equip-slot-meta">${escapeHtml(itemMeta)}</div></div></div></div>`;
  };

  const gearSlotsByGroup = {
    core: gearSlots.filter((slot) => ['head', 'armor', 'legs'].includes(String(slot.key || ''))),
    hands: gearSlots.filter((slot) => ['left_hand', 'right_hand'].includes(String(slot.key || ''))),
    rings: gearSlots.filter((slot) => String(slot.category || '') === 'ring'),
  };

  const buildGearGroupHtml = (group) => `<div class="hero-slot-group"><div class="hero-slot-group-title">${escapeHtml(group.title)}</div><div class="hero-slot-group-grid">${group.slots.map((slot) => renderEquipSlotCard(slot)).join('')}</div></div>`;
  const coreGearGroupHtml = buildGearGroupHtml({
    title: trWithFallback('ui.inventory.core_slots', 'Основные слоты'),
    slots: gearSlotsByGroup.core,
  });
  const handGearGroupHtml = buildGearGroupHtml({
    title: trWithFallback('ui.inventory.hand_slots', 'Руки и оружейные модули'),
    slots: gearSlotsByGroup.hands,
  });
  const ringGearGroupHtml = buildGearGroupHtml({
    title: trWithFallback('ui.inventory.ring_slots', 'Кольца'),
    slots: gearSlotsByGroup.rings,
  });

  const quickSlotsHtml = quickSlots.map((slot, index) => renderEquipSlotCard(slot, `[${index + 4}]`)).join('');

  const inventoryGroupOrder = [
    ['consumable', trWithFallback('ui.inventory.group_consumables', 'Расходники')],
    ['armor', trWithFallback('ui.inventory.group_armor', 'Броня')],
    ['hands', trWithFallback('ui.inventory.group_hands', 'Руки и оружие')],
    ['rings', trWithFallback('ui.inventory.group_rings', 'Кольца')],
    ['other', trWithFallback('ui.inventory.group_other', 'Прочее')],
  ];
  const inventoryFilterOptions = [
    ['all', trWithFallback('ui.inventory.filter_all', 'Все')],
    ['consumable', trWithFallback('ui.inventory.group_consumables', 'Расходники')],
    ['head', trWithFallback('ui.inventory.filter_head', 'Шапка')],
    ['weapon', trWithFallback('ui.inventory.filter_weapon', 'Оружие')],
    ['armor', trWithFallback('ui.inventory.filter_armor', 'Броня')],
    ['legs', trWithFallback('ui.inventory.filter_legs', 'Штаны')],
    ['ring', trWithFallback('ui.inventory.filter_ring', 'Кольца')],
    ['other', trWithFallback('ui.inventory.group_other', 'Прочее')],
  ];

  const getInventoryGroupKey = (itemDef, equipTargets) => {
    if (itemDef?.combatUse) return 'consumable';
    const slotCategory = String(itemDef?.slotCategory || '').trim().toLowerCase();
    if (['head', 'armor', 'legs'].includes(slotCategory)) return 'armor';
    if (slotCategory === 'ring') return 'rings';
    if (equipTargets.some((slot) => ['left_hand', 'right_hand'].includes(String(slot?.key || '').trim().toLowerCase()))) return 'hands';
    return 'other';
  };

  const inventoryCardsByGroup = new Map(inventoryGroupOrder.map(([key]) => [key, []]));
  const inventoryEntries = [];
  for (const item of inventoryItems) {
    const itemDef = itemMap[item.itemId] || {};
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const equipTargets = getInventorySlotTargets(catalog, itemDef);
    const iconMeta = getInventoryItemIconMeta(itemDef, equipTargets);
    const equippedIn = Object.keys(equippedItems).filter((slotKey) => equippedItems[slotKey]?.uid === item.uid);
    const upgradeCost = Math.max(0, Number(item.upgradeCost) || 0);
    const canUpgradeItem = !itemDef.combatUse && Math.max(1, Number(item.level) || 1) < 10 && salvage >= upgradeCost;
    const equipButtons = equipTargets.map((slot, slotIndex) => `<button type="button" class="inventory-mini-btn inventory-text-action${equippedIn.includes(slot.key) ? ' active' : ''}" data-item-equip="${escapeHtml(item.uid)}" data-slot-key="${escapeHtml(slot.key)}" title="${escapeHtml(`${trWithFallback('ui.inventory.equip_to_slot', 'Снарядить в слот')}: ${getItemSlotLabel(slot)}`)}" aria-label="${escapeHtml(`${trWithFallback('ui.inventory.equip_to_slot', 'Снарядить в слот')}: ${getItemSlotLabel(slot)}`)}">${escapeHtml(`${trWithFallback('ui.inventory.slot_short', 'Slot')} ${slotIndex + 1}`)}</button>`).join('');
    const categoryLabel = getItemCategoryLabel(itemDef.slotCategory);
    const equippedMeta = equippedIn.length
      ? `<div class="inventory-item-chip inventory-item-chip-eq">${escapeHtml(equippedIn.map((slotKey) => getItemSlotLabel((catalog.itemSlots || []).find((slot) => slot.key === slotKey) || { key: slotKey })).join(', '))}</div>`
      : '';
    const actionButtonsHtml = `${equipButtons || ''}${!itemDef.combatUse ? `<button type="button" class="inventory-mini-btn inventory-text-action upgrade${canUpgradeItem ? '' : ' disabled-like'}" data-item-upgrade="${escapeHtml(item.uid)}" title="${escapeHtml(`Улучшить • ${upgradeCost}`)}" aria-label="${escapeHtml(`Улучшить • ${upgradeCost}`)}">${escapeHtml(trWithFallback('ui.inventory.action_upgrade', 'Upgrade'))}</button>` : ''}<button type="button" class="inventory-mini-btn inventory-text-action danger" data-item-sell="${escapeHtml(item.uid)}" title="${escapeHtml(`Продать • ${Math.max(0, Number(item.sellValue) || 0)}`)}" aria-label="${escapeHtml(`Продать • ${Math.max(0, Number(item.sellValue) || 0)}`)}">${escapeHtml(trWithFallback('ui.inventory.action_sell', 'Sell'))}</button>`;
    const cardHtml = `<div class="inventory-item-card inventory-item-card-compact rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="inventory-item-layout"><div class="inventory-item-icon inventory-item-icon-${escapeHtml(iconMeta.className)}">${escapeHtml(iconMeta.glyph)}</div><div class="inventory-item-main"><div class="inventory-item-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="inventory-item-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} • ${escapeHtml(categoryLabel)}</div><div class="inventory-item-chip-row"><div class="inventory-item-chip">Lv ${Math.max(1, Number(item.level) || 1)}</div>${quantity > 1 ? `<div class="inventory-item-chip">x${quantity}</div>` : ''}<div class="inventory-item-chip">${escapeHtml(trWithFallback('ui.inventory.sell_value_short', 'Продажа'))}: ${Math.max(0, Number(item.sellValue) || 0)}</div>${equippedMeta}</div>${itemDef.combatUse ? `<div class="inventory-item-consumable">${escapeHtml(trWithFallback('ui.inventory.consumable_hint_keys', 'Клавиши 4/5/6 в бою'))}</div>` : ''}</div><div class="inventory-item-actions-compact">${actionButtonsHtml}</div></div></div>`;
    const groupKey = getInventoryGroupKey(itemDef, equipTargets);
    inventoryCardsByGroup.get(groupKey)?.push(cardHtml);
    const slotCategory = String(itemDef?.slotCategory || '').trim().toLowerCase();
    const filterTags = new Set(['all']);
    if (itemDef?.combatUse || equipTargets.some((slot) => String(slot?.kind || '').trim().toLowerCase() === 'consumable')) {
      filterTags.add('consumable');
    }
    if (slotCategory === 'head') filterTags.add('head');
    if (slotCategory === 'armor') filterTags.add('armor');
    if (slotCategory === 'legs') filterTags.add('legs');
    if (slotCategory === 'ring') filterTags.add('ring');
    if (equipTargets.some((slot) => ['left_hand', 'right_hand'].includes(String(slot?.key || '').trim().toLowerCase()))) {
      filterTags.add('weapon');
    }
    if (!itemDef?.combatUse && !filterTags.has('head') && !filterTags.has('armor') && !filterTags.has('legs') && !filterTags.has('ring') && !filterTags.has('weapon')) {
      filterTags.add('other');
    }
    inventoryEntries.push({ cardHtml, filterTags });
  }

  const inventoryFilterTabsHtml = `<div class="inventory-filter-tabs">${inventoryFilterOptions.map(([key, label]) => `<button type="button" class="inventory-filter-tab${selectedInventoryFilterKey === key ? ' active' : ''}" data-inventory-filter="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join('')}</div>`;
  const inventorySectionsHtml = selectedInventoryFilterKey === 'all'
    ? inventoryGroupOrder.map(([key, title]) => {
      const cards = inventoryCardsByGroup.get(key) || [];
      if (!cards.length) return '';
      return `<div class="inventory-category-group"><div class="inventory-category-title">${escapeHtml(title)}</div><div class="inventory-category-grid">${cards.join('')}</div></div>`;
    }).join('')
    : (() => {
      const filteredCards = inventoryEntries.filter((entry) => entry.filterTags.has(selectedInventoryFilterKey)).map((entry) => entry.cardHtml);
      return filteredCards.length
        ? `<div class="inventory-category-grid">${filteredCards.join('')}</div>`
        : `<div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.filter_empty', 'В этой категории пока нет предметов.'))}</div>`;
    })();

  const inventoryRows = inventoryItems
    .slice()
    .sort((a, b) => {
      const itemDefA = itemMap[a.itemId] || {};
      const itemDefB = itemMap[b.itemId] || {};
      const aEquipped = Object.values(equippedItems).some((entry) => entry?.uid === a.uid) ? 1 : 0;
      const bEquipped = Object.values(equippedItems).some((entry) => entry?.uid === b.uid) ? 1 : 0;
      return (bEquipped - aEquipped)
        || String(itemDefA.slotCategory || '').localeCompare(String(itemDefB.slotCategory || ''))
        || (getItemRaritySortWeight(itemDefB.rarity) - getItemRaritySortWeight(itemDefA.rarity))
        || String(getItemDisplayName(itemDefA)).localeCompare(String(getItemDisplayName(itemDefB)));
    })
    .map((item) => {
    const itemDef = itemMap[item.itemId] || {};
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const equipTargets = getInventorySlotTargets(catalog, itemDef);
    const equippedIn = Object.keys(equippedItems).filter((slotKey) => equippedItems[slotKey]?.uid === item.uid);
    const upgradeCost = Math.max(0, Number(item.upgradeCost) || 0);
    const canUpgradeItem = !itemDef.combatUse && Math.max(1, Number(item.level) || 1) < 10 && salvage >= upgradeCost;
    const equipButtons = equipTargets.map((slot) => `<button type="button" class="inventory-mini-btn${equippedIn.includes(slot.key) ? ' active' : ''}" data-item-equip="${escapeHtml(item.uid)}" data-slot-key="${escapeHtml(slot.key)}">${escapeHtml(getItemSlotLabel(slot))}</button>`).join('');
    const categoryLabel = getItemCategoryLabel(itemDef.slotCategory);
    return `<div class="inventory-item-card rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="inventory-item-head"><div><div class="inventory-item-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="inventory-item-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} вЂў ${escapeHtml(categoryLabel)} вЂў Lv ${Math.max(1, Number(item.level) || 1)}${quantity > 1 ? ` вЂў x${quantity}` : ''}${equippedIn.length ? ` вЂў ${escapeHtml(trWithFallback('ui.inventory.equipped_in', 'Р­РєРёРїРёСЂРѕРІР°РЅРѕ'))}: ${escapeHtml(equippedIn.map((slotKey) => getItemSlotLabel((catalog.itemSlots || []).find((slot) => slot.key === slotKey) || { key: slotKey })).join(', '))}` : ''}</div></div><div class="inventory-item-values">${escapeHtml(trWithFallback('ui.inventory.sell_value_short', 'РџСЂРѕРґР°Р¶Р°'))}: ${Math.max(0, Number(item.sellValue) || 0)}</div></div>${equipButtons ? `<div class="inventory-item-actions-line">${equipButtons}</div>` : ''}<div class="inventory-item-actions-line">${!itemDef.combatUse ? `<button type="button" class="inventory-mini-btn${canUpgradeItem ? '' : ' disabled-like'}" data-item-upgrade="${escapeHtml(item.uid)}">${escapeHtml(`РЈР»СѓС‡С€РёС‚СЊ: ${upgradeCost} Р»РѕРј вЂў РЈ РІР°СЃ: ${salvage}`)}</button>` : `<span class="inventory-item-consumable">${escapeHtml(trWithFallback('ui.inventory.consumable_hint_keys', 'Р‘РѕРµРІРѕР№ СЂР°СЃС…РѕРґРЅРёРє. РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ РІ СЂР°РЅe: РєР»Р°РІРёС€Рё 4/5/6.'))}</span>`}<button type="button" class="inventory-mini-btn danger" data-item-sell="${escapeHtml(item.uid)}">${escapeHtml(`РџСЂРѕРґР°С‚СЊ Р·Р° ${Math.max(0, Number(item.sellValue) || 0)}`)}</button></div></div>`;
  }).join('');

  const unlockMeta = !unlocked
    ? `<div class="hero-lock-meta"><span class="hero-req ${accountLevelReq.enough ? 'ok' : 'lack'}">${escapeHtml(accountLevelReq.text)}</span><span class="hero-req ${cardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(cardsReq.text)}</span><span class="hero-req ${shardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(shardsReq.text)}</span></div>`
    : '<div class="hero-lock-meta unlocked">' + trWithFallback('ui.hero.unlocked', 'Unlocked') + '</div>';
  const actionBtn = !game.playerAuth?.player
    ? '<button type="button" class="hero-main-action" disabled>' + trWithFallback('ui.auth.login_required_unlock', 'Login to unlock/progress') + '</button>'
    : (!unlocked
      ? `<button type="button" class="hero-main-action" data-hero-unlock="1" ${canUnlock ? '' : 'disabled'}>${trWithFallback('ui.hero.unlock_btn', 'Unlock hero')}</button>`
      : '');
  const heroDisplayName = trHeroName(hero.id, hero.name);
  const heroTagline = trWithFallback(`hero.${String(hero.id || '').toLowerCase()}.tagline`, hero.tagline || '');
  const heroStats = hero.baseStats && typeof hero.baseStats === 'object'
    ? `POW ${Math.max(0, Number(hero.baseStats.power) || 0)} | AGI ${Math.max(0, Number(hero.baseStats.agility) || 0)} | VIT ${Math.max(0, Number(hero.baseStats.vitality) || 0)} | TEC ${Math.max(0, Number(hero.baseStats.tech) || 0)}`
    : '';
  const heroXpLabel = heroLevel >= heroLevelCap ? `Lv ${heroLevel}/${heroLevelCap} MAX` : `Lv ${heroLevel}/${heroLevelCap} | XP ${heroXpValue}/${heroXpNeed}`;
  heroTreePanelEl.innerHTML = `<div class="hero-loadout-shell"><div class="hero-loadout-card"><div class="hero-tree-head"><div><b>${escapeHtml(heroDisplayName)}</b><div class="hero-tagline">${escapeHtml(heroTagline)}</div><div class="hero-tagline">${escapeHtml(heroXpLabel)}</div><div class="hero-tagline">${escapeHtml(heroStats)}</div></div>${unlockMeta}</div>${actionBtn}</div><div class="hero-loadout-layout"><div class="hero-loadout-card hero-loadout-stage"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.inventory.equipment', 'Экипировка'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.equipment_hint', 'Слева слоты экипировки, справа портрет, ниже инвентарь и боевые расходники.'))}</div></div><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.salvage', 'Лом'))}: ${salvage}</div></div><div class="hero-loadout-stage-grid"><div class="hero-loadout-stage-side">${coreGearGroupHtml}${handGearGroupHtml}${ringGearGroupHtml}<div class="hero-slot-group"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.inventory.items', 'Инвентарь'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.items_hint', 'Выбирайте предметы, снаряжайте их в слот, улучшайте или продавайте прямо здесь.'))}</div></div><div class="hero-tagline">${inventoryItems.length}</div></div>${inventoryFilterTabsHtml}<div class="inventory-category-list">${inventorySectionsHtml || `<div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.empty', 'Инвентарь пока пуст.'))}</div>`}</div></div></div><div class="hero-loadout-stage-portrait"><div class="hero-loadout-portrait-wrap hero-loadout-portrait-large"><img class="hero-loadout-portrait" src="${escapeHtml(getHeroCardImagePath(hero.id))}" alt="${escapeHtml(heroDisplayName)}" /></div><div class="hero-tree-head hero-loadout-hero-head"><div><b>${escapeHtml(heroDisplayName)}</b><div class="hero-tagline">${escapeHtml(heroTagline)}</div><div class="hero-tagline">${escapeHtml(heroXpLabel)}</div><div class="hero-tagline">${escapeHtml(heroStats)}</div><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.quick_slots_hint', 'Быстрые слоты работают в бою на клавишах 4, 5 и 6.'))}</div></div></div><div class="hero-slot-group"><div class="hero-slot-group-title">${escapeHtml(trWithFallback('ui.inventory.quick_slots', 'Боевые расходники'))}</div><div class="hero-slot-group-grid">${quickSlotsHtml}</div></div></div></div></div><div class="hero-loadout-card"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.hero.talent_tree', 'Таланты героя'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.talent_tree_hint', 'Пассивные улучшения аккаунта для выбранного героя.'))}</div></div></div><div class="hero-tree-list">${rows.join('')}</div></div><div class="hero-loadout-card"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.hero.unique_skills', 'Уникальные навыки'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.unique_skills_hint', 'Активные навыки и пассивные эффекты выбранного героя.'))}</div></div></div><div class="hero-tree-list">${skillRows || '<div class="hero-tagline">Нет уникальных навыков.</div>'}</div></div></div>`;

  const renderedSlotOrder = [
    ...gearSlotsByGroup.core,
    ...gearSlotsByGroup.hands,
    ...gearSlotsByGroup.rings,
    ...quickSlots,
  ];
  const renderedSlotEls = Array.from(heroTreePanelEl.querySelectorAll('.hero-equip-slot'));
  renderedSlotOrder.forEach((slot, index) => {
    const slotEl = renderedSlotEls[index];
    if (!(slotEl instanceof HTMLElement)) return;
    slotEl.dataset.slotKey = String(slot.key || '');
    if (!slotEl.classList.contains('empty')) return;
    let actionEl = slotEl.querySelector('.hero-equip-slot-empty-cta');
    if (!(actionEl instanceof HTMLElement)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hero-equip-action';
    btn.dataset.openSlotEquip = String(slot.key || '');
    btn.textContent = trWithFallback('ui.inventory.equip', 'Снарядить');
    actionEl.replaceWith(btn);
  });

  const unlockBtn = heroTreePanelEl.querySelector('[data-hero-unlock="1"]');
  unlockBtn?.addEventListener('click', async () => {
    try {
      await unlockHeroForAccount(hero.id);
      setHeroActionFeedback(trWithFallback('ui.hero.unlocked_msg', `${hero.name} unlocked.`, { hero: trHeroName(hero.id, hero.name) }), 'ok');
      selectedPlayerClass = hero.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      await selectHeroForAccount(hero.id);
      renderCharacterPicker();
    } catch (err) {
      setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unlock hero.'), 'err');
    }
  });

  for (const btn of heroTreePanelEl.querySelectorAll('.hero-node-up')) {
    btn.addEventListener('click', async () => {
      const heroSkillId = btn.getAttribute('data-hero-skill-id') || '';
      const heroSkillAction = btn.getAttribute('data-hero-skill-action') || '';
      if (heroSkillId) {
        try {
          if (heroSkillAction === 'unlock') await unlockHeroSkillForAccount(hero.id, heroSkillId);
          else await upgradeHeroSkillForAccount(hero.id, heroSkillId);
          setHeroActionFeedback(`${hero.name}: ${heroSkillId} ${heroSkillAction === 'unlock' ? 'unlocked' : 'upgraded'}`, 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to update hero skill.'), 'err');
        }
        return;
      }
      const nodeId = btn.getAttribute('data-node-id') || '';
      if (!nodeId) return;
      try {
        await upgradeHeroNodeForAccount(hero.id, nodeId);
        setHeroActionFeedback(`Upgraded ${hero.name}: ${nodeId}`, 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade node.'), 'err');
      }
    });
  }

  for (const btn of heroTreePanelEl.querySelectorAll('[data-open-slot-equip]')) {
    btn.addEventListener('click', () => {
      openHeroEquipModal(hero, btn.getAttribute('data-open-slot-equip') || '');
    });
  }

  for (const btn of heroTreePanelEl.querySelectorAll('[data-unequip-slot]')) {
    btn.addEventListener('click', async () => {
      try {
        await unequipItemForAccount(hero.id, btn.getAttribute('data-unequip-slot') || '');
        setHeroActionFeedback(trWithFallback('ui.inventory.unequipped', 'РџСЂРµРґРјРµС‚ СЃРЅСЏС‚.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unequip item.'), 'err');
      }
    });
  }

  for (const btn of heroTreePanelEl.querySelectorAll('[data-item-equip]')) {
    btn.addEventListener('click', async () => {
      try {
        await equipItemForAccount(hero.id, btn.getAttribute('data-item-equip') || '', btn.getAttribute('data-slot-key') || '');
        setHeroActionFeedback(trWithFallback('ui.inventory.equipped', 'РџСЂРµРґРјРµС‚ СЌРєРёРїРёСЂРѕРІР°РЅ.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to equip item.'), 'err');
      }
    });
  }

  for (const btn of heroTreePanelEl.querySelectorAll('[data-item-sell]')) {
    btn.addEventListener('click', async () => {
      try {
        await sellInventoryItemForAccount(btn.getAttribute('data-item-sell') || '');
        setHeroActionFeedback(trWithFallback('ui.inventory.sold', 'РџСЂРµРґРјРµС‚ РїСЂРѕРґР°РЅ.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to sell item.'), 'err');
      }
    });
  }

  for (const btn of heroTreePanelEl.querySelectorAll('[data-item-upgrade]')) {
    btn.addEventListener('click', async () => {
      try {
        await upgradeInventoryItemForAccount(btn.getAttribute('data-item-upgrade') || '');
        setHeroActionFeedback(trWithFallback('ui.inventory.upgraded', 'РџСЂРµРґРјРµС‚ СѓР»СѓС‡С€РµРЅ.'), 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade item.'), 'err');
      }
    });
  }
}

function renderCharacterPicker() {
  if (!characterSelectEl) return;
  const catalog = getProgressionCatalog();
  const progression = getProgressionState();
  const unlockedHeroes = getUnlockedHeroSet(catalog, progression);
  const heroes = catalog.heroes.map((hero) => ({ ...getPlayerVariant(hero.id), ...hero }));

  selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);
  if (!unlockedHeroes.has(selectedPlayerClass)) {
    selectedPlayerClass = progression?.activeHero && unlockedHeroes.has(progression.activeHero)
      ? progression.activeHero
      : (catalog.baseHeroId || 'cyber');
    localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
  }

  if (!heroFocusId || !heroes.some((hero) => hero.id === heroFocusId)) {
    heroFocusId = selectedPlayerClass;
  }

  characterSelectEl.innerHTML = '';
  if (heroGalleryV2El) heroGalleryV2El.innerHTML = '';
  const focusedHero = heroes.find((hero) => hero.id === heroFocusId) || heroes[0] || null;
  renderHeroGalleryV2(heroes, progression, unlockedHeroes);
  renderProfilePanel(heroes, progression, unlockedHeroes);
  renderAccountSummary(catalog, progression);
  renderHeroTreePanelV2(catalog, progression, focusedHero, focusedHero ? unlockedHeroes.has(focusedHero.id) : false);
  if (focusedHero) splitHeroPanelsBetweenMenus(focusedHero);
}

function buildHeroUnlockHint(hero, progression) {
  const needLevel = Math.max(1, Number(hero.unlockLevel) || 1);
  const needShardCost = Math.max(0, Number(hero.unlockShardCost ?? hero.unlockCost) || 0);
  const cardId = String(hero.unlockCardId || '').trim();
  const cardNeed = Math.max(0, Number(hero.unlockCardNeed) || 0);
  const haveCards = cardId ? Math.max(0, Number(progression?.heroCards?.[cardId]) || 0) : cardNeed;
  if (cardNeed > 0) return `Lv${needLevel} | ${trWithFallback('ui.hero.cores', 'Cores')} ${haveCards}/${cardNeed} | ${needShardCost} ${trWithFallback('ui.profile.shards', 'Shards').toLowerCase()}`;
  return `Lv${needLevel} | ${needShardCost} ${trWithFallback('ui.profile.shards', 'Shards').toLowerCase()}`;
}

function getHeroCardImagePath(heroId) {
  const id = String(heroId || '').trim().toLowerCase();
  if (!id) return '/assets/characters/cyber.jpg';
  if (id === 'medic') return '/assets/characters/medis.jpg';
  return `/assets/characters/${id}.jpg`;
}

function renderHeroGalleryV2(heroes, progression, unlockedHeroes) {
  if (!heroGalleryV2El) return;
  heroGalleryV2El.innerHTML = '';
  const heroLevels = progression?.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
  for (const hero of heroes) {
    const unlocked = unlockedHeroes.has(hero.id);
    const focused = hero.id === heroFocusId;
    const active = hero.id === selectedPlayerClass;

    const cardBtn = document.createElement('button');
    cardBtn.type = 'button';
    cardBtn.className = `hero-v2-card${active ? ' active' : ''}${focused ? ' focused' : ''}${unlocked ? '' : ' locked'}`;
    cardBtn.style.setProperty('--accent', hero.accent || '#38bdf8');
    cardBtn.setAttribute('aria-label', trWithFallback('ui.hero.aria', `Hero ${hero.name}`, { hero: trHeroName(hero.id, hero.name) }));

    const inner = document.createElement('div');
    inner.className = 'hero-v2-inner';

    const portrait = document.createElement('img');
    portrait.className = 'hero-v2-portrait';
    portrait.src = getHeroCardImagePath(hero.id);
    portrait.alt = hero.name;

    const preview = document.createElement('canvas');
    preview.width = 100;
    preview.height = 108;
    preview.className = 'hero-v2-preview hidden';
    drawCharacterPreview(preview, hero);

    portrait.addEventListener('error', () => {
      portrait.classList.add('hidden');
      preview.classList.remove('hidden');
    }, { once: true });

    inner.appendChild(portrait);
    inner.appendChild(preview);
    if (!unlocked) {
      const lockBadge = document.createElement('img');
      lockBadge.className = 'hero-v2-lock';
      lockBadge.src = '/assets/ui/lock-overlay.svg';
      lockBadge.alt = trWithFallback('ui.hero.locked', 'Locked');
      inner.appendChild(lockBadge);
    }
    cardBtn.appendChild(inner);

    const name = document.createElement('div');
    name.className = 'hero-v2-name';
    const heroLevel = Math.max(1, Number(heroLevels[hero.id]) || 1);
    name.textContent = `${trHeroName(hero.id, hero.name)} [${heroLevel}]`;

    const status = document.createElement('div');
    status.className = `hero-v2-status ${active ? 'selected' : (unlocked ? 'unlocked' : 'locked')}`;
    status.textContent = unlocked ? (active ? trWithFallback('ui.hero.selected_short', 'Selected') : trWithFallback('ui.hero.unlocked', 'Unlocked')) : buildHeroUnlockHint(hero, progression);

    cardBtn.addEventListener('click', async () => {
      heroFocusId = hero.id;
      if (!unlocked) {
        renderCharacterPicker();
        return;
      }
      selectedPlayerClass = hero.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      if (game.playerAuth?.player) {
        try {
          await selectHeroForAccount(hero.id);
          setHeroActionFeedback(trWithFallback('ui.hero.selected', `${hero.name} selected.`, { hero: trHeroName(hero.id, hero.name) }), 'ok');
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to select hero.'), 'err');
        }
      }
      renderCharacterPicker();
    });

    const wrap = document.createElement('div');
    wrap.className = 'hero-v2-item';
    wrap.appendChild(cardBtn);
    wrap.appendChild(name);
    wrap.appendChild(status);
    heroGalleryV2El.appendChild(wrap);
  }
}

function resetProfileRunHistoryUi() {
  profileRunHistoryUi.items = [];
  profileRunHistoryUi.page = 1;
  profileRunHistoryUi.totalPages = 1;
  profileRunHistoryUi.total = 0;
  profileRunHistoryUi.loading = false;
  profileRunHistoryUi.error = '';
  profileRunHistoryUi.loadedNickname = '';
  profileRunHistoryUi.lastLoadedAt = 0;
}

function renderProfileRunHistory() {
  if (!profileRunHistoryEl) return;
  if (!game.playerAuth?.player) {
    profileRunHistoryEl.innerHTML = '<b>' + trWithFallback('ui.profile.history', 'Run history ({total})', { total: profileRunHistoryUi.total || 0 }) + '</b><div class="profile-run-empty">' + trWithFallback('ui.profile.login_required', 'Login required.') + '</div>';
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
    void requestProfileRunHistory({ force: true, page: profileRunHistoryUi.page });
  });

  head.appendChild(title);
  head.appendChild(refreshBtn);
  profileRunHistoryEl.appendChild(head);

  if (profileRunHistoryUi.loading && profileRunHistoryUi.items.length === 0) {
    const loading = document.createElement('div');
    loading.className = 'profile-run-empty';
    loading.textContent = 'Р—Р°РіСЂСѓР·РєР° РЅРѕРІРѕСЃС‚РµР№...';
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
    empty.textContent = 'No runs yet. Finish a run to see history here.';
    profileRunHistoryEl.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'profile-run-list';
  const rankOffset = (profileRunHistoryUi.page - 1) * profileRunHistoryUi.pageSize;

  for (let i = 0; i < profileRunHistoryUi.items.length; i += 1) {
    const run = profileRunHistoryUi.items[i];
    const heroXp = Math.max(0, Number(run?.runDetails?.xp) || 0);
    const gameModeLabel = formatRunGameModeLabel(run);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'profile-run-row';

    const headRow = document.createElement('div');
    headRow.className = 'profile-run-head';

    const when = document.createElement('span');
    when.textContent = formatRecordDateTime(run?.at);

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
      openRecordDetailsModal(run, runRank);
    });

    list.appendChild(row);
  }

  profileRunHistoryEl.appendChild(list);

  const pager = document.createElement('div');
  pager.className = 'profile-run-history-pager';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'mini';
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = profileRunHistoryUi.loading || !canPrev;
  prevBtn.addEventListener('click', () => {
    if (profileRunHistoryUi.page > 1) {
      void requestProfileRunHistory({ force: true, page: profileRunHistoryUi.page - 1 });
    }
  });

  const pageText = document.createElement('div');
  pageText.className = 'profile-run-history-page';
  pageText.textContent = 'Page ' + profileRunHistoryUi.page + '/' + profileRunHistoryUi.totalPages;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'mini';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = profileRunHistoryUi.loading || !canNext;
  nextBtn.addEventListener('click', () => {
    if (profileRunHistoryUi.page < profileRunHistoryUi.totalPages) {
      void requestProfileRunHistory({ force: true, page: profileRunHistoryUi.page + 1 });
    }
  });

  pager.appendChild(prevBtn);
  pager.appendChild(pageText);
  pager.appendChild(nextBtn);

  profileRunHistoryEl.appendChild(pager);
}

async function requestProfileRunHistory({ force = false, page = profileRunHistoryUi.page } = {}) {
  if (!profileRunHistoryEl) return;
  if (!game.playerAuth?.player) {
    resetProfileRunHistoryUi();
    renderProfileRunHistory();
    return;
  }

  const nicknameKey = String(game.playerAuth.player.nickname || '').trim().toLowerCase();
  if (!nicknameKey) {
    resetProfileRunHistoryUi();
    renderProfileRunHistory();
    return;
  }

  if (profileRunHistoryUi.loadedNickname && profileRunHistoryUi.loadedNickname !== nicknameKey) {
    resetProfileRunHistoryUi();
  }

  const nextPage = Math.max(1, Math.floor(page) || 1);
  const now = Date.now();
  if (!force
    && !profileRunHistoryUi.loading
    && profileRunHistoryUi.loadedNickname === nicknameKey
    && profileRunHistoryUi.page === nextPage
    && profileRunHistoryUi.items.length > 0
    && (now - profileRunHistoryUi.lastLoadedAt) < PROFILE_RUN_HISTORY_CACHE_MS) {
    renderProfileRunHistory();
    return;
  }

  const token = profileRunHistoryUi.fetchToken + 1;
  profileRunHistoryUi.fetchToken = token;
  profileRunHistoryUi.loading = true;
  profileRunHistoryUi.error = '';
  profileRunHistoryUi.page = nextPage;
  renderProfileRunHistory();

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
      renderProfileRunHistory();
    }
  }
}

function renderProfilePanel(heroes, progression, unlockedHeroes) {
  if (!profileSummaryEl || !profileAchievementsEl || !profileCharacterStatsEl || !profileRunHistoryEl) return;
  if (!game.playerAuth?.player || !progression) {
    profileSummaryEl.innerHTML = '<b>' + trWithFallback('ui.profile.guest_profile', 'Guest profile') + '</b><div>' + trWithFallback('ui.profile.login_to_save', 'Login to save profile progression, achievements and hero stats.') + '</div>';
    profileAchievementsEl.innerHTML = '<b>' + trWithFallback('ui.profile.achievements', 'Achievements') + '</b><div>' + trWithFallback('ui.profile.login_required', 'Login required.') + '</div>';
    profileCharacterStatsEl.innerHTML = '<b>' + trWithFallback('ui.profile.hero_stats', 'Hero stats') + '</b><div>' + trWithFallback('ui.profile.login_required', 'Login required.') + '</div>';
    resetProfileRunHistoryUi();
    renderProfileRunHistory();
    return;
  }

  const level = Math.max(1, Number(progression.accountLevel) || 1);
  const xp = Math.max(0, Number(progression.accountXp) || 0);
  const xpToNext = Math.max(1, Number(progression.accountXpToNext) || 1);
  const shards = Math.max(0, Number(progression.shards) || 0);
  const points = Math.max(0, Number(progression.accountSkillPoints) || 0);
  const unlockedCount = unlockedHeroes.size;
  const heroLevels = progression.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
  const totalRuns = Math.max(0, Number(progression.totalRuns) || 0);
  const heroRuns = progression.heroRuns && typeof progression.heroRuns === 'object' ? progression.heroRuns : {};

  profileSummaryEl.innerHTML = `<b>${trWithFallback('ui.profile.profile', 'Profile')} Lv${level}</b><div>XP ${xp}/${xpToNext} | ${trWithFallback('ui.profile.skill_points', 'Skill points')}: ${points} | ${trWithFallback('ui.profile.shards', 'Shards')}: ${shards} | ${trWithFallback('ui.profile.heroes', 'Heroes')}: ${unlockedCount}/${heroes.length} | ${trWithFallback('ui.profile.runs', 'Runs')}: ${totalRuns}</div>`;
  profileAchievementsEl.innerHTML = '<b>' + trWithFallback('ui.profile.achievements', 'Achievements') + '</b><div>' + trWithFallback('ui.profile.achievements_hint', 'First Blood, Survivor, Boss Hunter and account milestones can be shown here.') + '</div>';

  const rows = heroes.map((hero) => {
    const heroLvl = Math.max(1, Number(heroLevels[hero.id]) || 1);
    const runs = Math.max(0, Number(heroRuns[hero.id]) || 0);
    const unlocked = unlockedHeroes.has(hero.id) ? trWithFallback('ui.hero.unlocked', 'Unlocked') : trWithFallback('ui.hero.locked', 'Locked');
    return `<div class="profile-hero-row"><span>${escapeHtml(trHeroName(hero.id, hero.name))}</span><span>Lv${heroLvl} | ${trWithFallback('ui.profile.runs', 'Runs')}: ${runs}</span><span>${unlocked}</span></div>`;
  }).join('');
  profileCharacterStatsEl.innerHTML = `<b>${trWithFallback('ui.profile.hero_stats', 'Hero stats')}</b><div class="profile-hero-list">${rows}</div>`;
  renderProfileRunHistory();
  if (currentMainMenuTab === 'profile') {
    void requestProfileRunHistory({ force: false, page: profileRunHistoryUi.page });
  }
}

globalThis.renderCharacterPicker = renderCharacterPicker;

const storedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
if (nameInput && storedNickname && storedNickname.trim() && !game.playerAuth?.player) {
  nameInput.value = storedNickname.trim().slice(0, 18);
}
if (!game.playerAuth?.player) {
  void updateNicknameStatus(nameInput?.value || '');
}
selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);
renderCharacterPicker();

applyPresetToUi('normal');
applyRoomSync(configFromSyncUi());

syncPresetEl?.addEventListener('change', () => {
  const key = syncPresetEl.value;
  if (key === 'custom') return;
  applyPresetToUi(key);
  applyRoomSync(configFromSyncUi());
});

for (const el of [syncTickrateEl, syncStateRateEl, syncRenderDelayEl, syncMaxExtrapolationEl, syncEntityInterpEl, syncBulletCorrectionEl, syncInputRateEl]) {
  el?.addEventListener('change', () => {
    if (syncPresetEl) syncPresetEl.value = 'custom';
    applyRoomSync(configFromSyncUi());
  });
}

async function sendJoinRequest(roomCode, joinSync = null, options = {}) {
  const mode = joinSync ? 'create' : 'join';
  const skipRouting = options?.skipRouting === true;
  const source = options?.source || 'menu';
  if (typeof window.cwSetPendingJoinAnalytics === 'function') {
    window.cwSetPendingJoinAnalytics(mode, roomCode, source);
  }
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal(mode === 'create' ? 'create_room_attempt' : 'join_room_attempt', {
      source,
      room_code: String(roomCode || '').trim().toUpperCase() || 'AUTO',
      sync_preset: joinSync ? String(syncPresetEl?.value || 'custom') : 'none',
    });
    window.cwTrackMetrikaGoal('game_start_attempt', {
      mode,
      source,
      room_code: String(roomCode || '').trim().toUpperCase() || 'AUTO',
    });
  }
  clearJoinFeedback();
  if (!skipRouting) {
    try {
      const route = await resolveRoomRoute(mode, roomCode, { gameMode: selectedGameMode, pvpDurationMin: selectedPvpDurationMin });
      if (mode === 'join' && route?.found && route?.room?.isFull) {
        const message = `Room ${route.room.code} is full (${route.room.players}/${route.room.maxPlayers}).`;
        statusEl.textContent = message;
        setJoinFeedback(message);
        joinOverlay.style.display = 'grid';
        joinOverlay.classList.remove('death-mode');
        setDeathCinematicActive(false);
        updateMobileControlsVisibility();
        return;
      }
      const workerOrigin = normalizeOrigin(route?.target?.publicBaseUrl || APP_ORIGIN);
      await connectGameSocket(workerOrigin);
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to resolve room route.';
      setJoinFeedback(err.message || 'Failed to resolve room route.');
      return;
    }
  } else {
    try {
      await connectGameSocket(currentWorkerOrigin || APP_ORIGIN);
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to connect to game server.';
      setJoinFeedback(err.message || 'Failed to connect to game server.');
      return;
    }
  }
  if (ws.readyState !== WebSocket.OPEN) return;
  const name = (game.playerAuth?.player?.nickname || nameInput.value.trim() || 'Fighter').trim();
  localStorage.setItem(NICKNAME_STORAGE_KEY, name);
  if (authLoginNicknameEl && !authLoginNicknameEl.value) authLoginNicknameEl.value = name;
  if (authRegisterNicknameEl && !authRegisterNicknameEl.value) authRegisterNicknameEl.value = name;
  waitingForFirstState = true;
  resetNetStats();
  waitingForFirstStateSince = performance.now();
  sendJson({
    type: 'join',
    name,
    playerClass: selectedPlayerClass,
    roomCode,
    integrationToken: pendingIntegrationToken || undefined,
    sync: joinSync || undefined,
    gameMode: mode === 'create' ? selectedGameMode : undefined,
    pvpDurationMin: mode === 'create' && selectedGameMode === 'pvp' ? normalizePvpDurationMin(selectedPvpDurationMin) : undefined,
  });
  closeGameVersionModal();
  joinOverlay.style.display = 'none';
  joinOverlay.classList.remove('death-mode');
  setDeathCinematicActive(false);
  updateMobileControlsVisibility();
}

async function sendSpectateRequest(roomCode, options = {}) {
  const normalizedRoomCode = String(roomCode || '').trim().toUpperCase();
  const skipRouting = options?.skipRouting === true;
  if (!normalizedRoomCode) {
    const message = 'Spectate mode needs a room code.';
    statusEl.textContent = message;
    setJoinFeedback(message);
    return;
  }
  clearJoinFeedback();
  if (!skipRouting) {
    try {
      const route = await resolveRoomRoute('join', normalizedRoomCode, { gameMode: selectedGameMode, pvpDurationMin: selectedPvpDurationMin });
      const workerOrigin = normalizeOrigin(route?.target?.publicBaseUrl || APP_ORIGIN);
      await connectGameSocket(workerOrigin);
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to resolve live room route.';
      setJoinFeedback(err.message || 'Failed to resolve live room route.');
      return;
    }
  } else {
    try {
      await connectGameSocket(currentWorkerOrigin || APP_ORIGIN);
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to connect to live room.';
      setJoinFeedback(err.message || 'Failed to connect to live room.');
      return;
    }
  }
  if (ws.readyState !== WebSocket.OPEN) return;
  waitingForFirstState = true;
  resetNetStats();
  waitingForFirstStateSince = performance.now();
  sendJson({
    type: 'join',
    roomCode: normalizedRoomCode,
    spectate: true,
  });
  closeGameVersionModal();
  joinOverlay.style.display = 'none';
  joinOverlay.classList.remove('death-mode');
  setDeathCinematicActive(false);
  updateMobileControlsVisibility();
}


async function copyRoomCodeToClipboard(roomCode, { silent = false } = {}) {
  const code = String(roomCode || '').trim();
  if (!code) return false;
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    if (!silent) statusEl.textContent = `Room code: ${code} (clipboard unavailable)`;
    return false;
  }
  try {
    await navigator.clipboard.writeText(code);
    if (!silent) statusEl.textContent = `Room code copied: ${code}`;
    return true;
  } catch {
    if (!silent) statusEl.textContent = `Room code: ${code} (click Room to copy)`;
    return false;
  }
}

if (roomMetaEl) { roomMetaEl.style.cursor = 'pointer'; roomMetaEl.title = 'Click to copy room code'; }
roomMetaEl?.addEventListener('click', () => {
  if (!game.roomCode) return;
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('room_code_copy', { room_code: game.roomCode });
  }
  copyRoomCodeToClipboard(game.roomCode, { silent: false });
});
function renderPresence(presence) {
  if (!presenceMetaEl) return;
  const online = Number(presence?.online) || 0;
  const inGame = Number(presence?.inGame) || 0;
  const inMenu = Number(presence?.inMenu) || 0;
  const hasRegistered = Number.isFinite(Number(presence?.registered));
  const registered = hasRegistered ? Math.max(0, Number(presence?.registered) || 0) : null;
  const renderCount = (value) => {
    if (value === null) return '<span class="presence-count">--</span>';
    const cls = value > 0 ? 'presence-count hot' : 'presence-count';
    return `<span class="${cls}">${value}</span>`;
  };
  presenceMetaEl.innerHTML = `Online: ${renderCount(online)} | In game: ${renderCount(inGame)} | In menu: ${renderCount(inMenu)} | Registered: ${renderCount(registered)}`;
}

function renderRoomsList(rooms) {
  if (!roomsListEl) return;

  if (!rooms.length) {
    roomsListEl.textContent = 'No active rooms yet.';
    return;
  }

  roomsListEl.innerHTML = '';
  for (const room of rooms) {
    const row = document.createElement('div');
    row.className = 'room-row';

    const code = document.createElement('div');
    code.className = 'room-code';
    code.textContent = room.code;

    const meta = document.createElement('div');
    meta.className = 'room-meta';
    meta.textContent = `${room.players}/${room.maxPlayers}`;

    const joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.className = 'room-join';
    joinBtn.textContent = 'Join';
    joinBtn.disabled = room.players >= room.maxPlayers;
    joinBtn.addEventListener('click', () => {
      roomCodeInput.value = room.code;
      joinMode = 'join';
      if (typeof window.cwTrackMetrikaGoal === 'function') {
        window.cwTrackMetrikaGoal('room_search_result_click', {
          room_code: room.code,
          players: Number(room.players) || 0,
        });
      }
      void sendJoinRequest(room.code, null, { source: 'rooms_list' });
    });

    row.appendChild(code);
    row.appendChild(meta);
    row.appendChild(joinBtn);
    roomsListEl.appendChild(row);
  }
}

async function requestRoomsList() {
  if (!roomsListEl) return;
  try {
    const res = await fetch('/api/rooms', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (payload?.isShuttingDown) {
      statusEl.textContent = 'Server restarting. New rooms are temporarily unavailable.';
    }
    renderPresence(payload.presence);
    renderRoomsList(Array.isArray(payload.rooms) ? payload.rooms : []);
  } catch {
    if (presenceMetaEl) presenceMetaEl.textContent = 'Online: -- | In game: -- | In menu: -- | Registered: --';
    roomsListEl.textContent = 'Failed to load rooms.';
  }
}


function updateRecordsPager() {
  if (recordsPageEl) recordsPageEl.textContent = `Page ${recordsUi.page}/${recordsUi.totalPages}`;
  if (recordsTotalEl) recordsTotalEl.textContent = `(Total: ${recordsUi.total})`;
  if (recordsPrevBtn) recordsPrevBtn.disabled = recordsUi.page <= 1;
  if (recordsNextBtn) recordsNextBtn.disabled = recordsUi.page >= recordsUi.totalPages;
}

function buildReplayShareUrl(recordId, startSec = 0, replayApiPath = '') {
  const id = Math.max(0, Number(recordId) || 0);
  const at = Math.max(0, Number(startSec) || 0);
  const replayPath = String(replayApiPath || '').trim();
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  url.searchParams.delete('mode');
  url.searchParams.delete('routed');
  if (id > 0) url.searchParams.set('replay', String(id));
  else url.searchParams.delete('replay');
  if (replayPath.startsWith('/api/')) url.searchParams.set('replayPath', replayPath);
  else url.searchParams.delete('replayPath');
  url.searchParams.delete('replayApiPath');
  if (at > 0) url.searchParams.set('replayAt', String(at));
  else url.searchParams.delete('replayAt');
  url.searchParams.delete('t');
  return url.toString();
}

function formatReplayClock(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatReplayBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function describeReplayLoadProgress(info) {
  const received = Math.max(0, Number(info?.received) || 0);
  const total = Math.max(0, Number(info?.total) || 0);
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((received / total) * 100))) : null;
  if (total > 0) return `${formatReplayBytes(received)} / ${formatReplayBytes(total)}${percent !== null ? ` (${percent}%)` : ''}`;
  if (received > 0) return `${formatReplayBytes(received)} loaded`;
  return 'Preparing replay data...';
}

function showReplayLoadOverlay(label, meta = 'Preparing replay data...') {
  if (replayLoadLabelEl) replayLoadLabelEl.textContent = label || 'Loading replay...';
  if (replayLoadMetaEl) replayLoadMetaEl.textContent = meta;
  if (replayLoadFillEl) {
    replayLoadFillEl.style.width = '0%';
    replayLoadFillEl.classList.add('indeterminate');
  }
  if (replayLoadOverlayEl) replayLoadOverlayEl.classList.remove('hidden');
}

function updateReplayLoadOverlay(info) {
  if (replayLoadMetaEl) replayLoadMetaEl.textContent = describeReplayLoadProgress(info);
  if (!replayLoadFillEl) return;
  const total = Math.max(0, Number(info?.total) || 0);
  const received = Math.max(0, Math.min(total || Number.MAX_SAFE_INTEGER, Number(info?.received) || 0));
  if (total > 0) {
    const percent = Math.max(0, Math.min(100, (received / total) * 100));
    replayLoadFillEl.classList.remove('indeterminate');
    replayLoadFillEl.style.width = `${percent.toFixed(1)}%`;
    return;
  }
  replayLoadFillEl.style.width = '35%';
  replayLoadFillEl.classList.add('indeterminate');
}

function hideReplayLoadOverlay() {
  if (replayLoadOverlayEl) replayLoadOverlayEl.classList.add('hidden');
}

function updateRecordReplayStageButton() {
  if (!recordReplayStageLoadBtn) return;
  const shouldShow = recordReplay.recordId > 0 && !recordReplay.loaded;
  recordReplayStageLoadBtn.classList.toggle('hidden', !shouldShow);
  recordReplayStageLoadBtn.disabled = recordReplay.loading;
  recordReplayStageLoadBtn.textContent = recordReplay.loading ? 'Loading...' : 'Load Replay';
}

function stopRecordReplayPlayback(resetElapsed = false) {
  if (recordReplay.rafId) cancelAnimationFrame(recordReplay.rafId);
  recordReplay.rafId = 0;
  recordReplay.playing = false;
  if (resetElapsed) recordReplay.elapsedMs = 0;
  if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = recordReplay.loaded ? 'Play Replay' : 'Load Replay';
  updateRecordReplayButtons();
  updateRecordReplayStageButton();
}

function setRecordReplaySpeed(speed) {
  const nextSpeed = Math.max(1, Number(speed) || 1);
  recordReplay.speed = nextSpeed;
  const buttons = recordReplaySpeedsEl ? Array.from(recordReplaySpeedsEl.querySelectorAll('[data-replay-speed]')) : [];
  for (const btn of buttons) {
    btn.classList.toggle('active', Number(btn.dataset.replaySpeed) === nextSpeed);
  }
  if (recordReplayMetaEl && recordReplay.loaded && !recordReplay.playing) {
    const replayDurationMs = getReplayDurationMs(recordReplay.payload);
    recordReplayMetaEl.textContent = `Ready. ${formatReplayClock(replayDurationMs)} total | speed x${recordReplay.speed}`;
  }
}

function updateRecordReplayButtons() {
  if (recordReplayToggleBtn) recordReplayToggleBtn.textContent = recordReplay.playing ? 'Pause' : 'Continue';
}

function seekRecordReplay(elapsedMs, { keepPaused = null } = {}) {
  const totalMs = getReplayDurationMs(recordReplay.payload);
  recordReplay.elapsedMs = Math.max(0, Math.min(totalMs, Number(elapsedMs) || 0));
  recordReplay.startedAt = performance.now() - (recordReplay.elapsedMs / Math.max(1, recordReplay.speed || 1));
  if (typeof keepPaused === 'boolean') recordReplay.playing = !keepPaused;
  drawRecordReplay();
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
  }
  if (recordReplayProgressEl && !recordReplay.seeking) {
    const value = totalMs > 0 ? Math.round((recordReplay.elapsedMs / totalMs) * 1000) : 0;
    recordReplayProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
  updateRecordReplayButtons();
}

function resizeRecordReplayCanvas() {
  if (!recordReplayCanvasEl) return null;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const cssWidth = Math.max(280, Math.round(recordReplayCanvasEl.clientWidth || 520));
  const cssHeight = Math.max(180, Math.round(cssWidth / 1.625));
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);
  if (recordReplayCanvasEl.width !== width || recordReplayCanvasEl.height !== height) {
    recordReplayCanvasEl.width = width;
    recordReplayCanvasEl.height = height;
  }
  const replayCtx = recordReplayCanvasEl.getContext('2d');
  if (!replayCtx) return null;
  replayCtx.setTransform(1, 0, 0, 1, 0, 0);
  replayCtx.scale(dpr, dpr);
  return { ctx: replayCtx, width: cssWidth, height: cssHeight };
}

function pickReplayFramePair(frames, elapsedMs) {
  if (!Array.isArray(frames) || frames.length <= 0) return { current: null, next: null, alpha: 0 };
  if (frames.length === 1 || elapsedMs <= Number(frames[0]?.t || 0)) return { current: frames[0], next: frames[0], alpha: 0 };
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (Number(frames[mid]?.t || 0) <= elapsedMs) lo = mid;
    else hi = mid - 1;
  }
  const current = frames[lo] || frames[frames.length - 1];
  const next = frames[Math.min(frames.length - 1, lo + 1)] || current;
  const currentT = Number(current?.t || 0);
  const nextT = Math.max(currentT, Number(next?.t || currentT));
  const alpha = nextT > currentT ? Math.max(0, Math.min(1, (elapsedMs - currentT) / (nextT - currentT))) : 0;
  return { current, next, alpha, index: lo };
}

function frameEntityMap(frameList) {
  const map = new Map();
  for (const item of Array.isArray(frameList) ? frameList : []) {
    map.set(item[0], item);
  }
  return map;
}

function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}

function getReplayDurationMs(payload) {
  const secondsMs = Math.max(0, Number(payload?.durationSec || 0) * 1000);
  const lastFrameMs = Math.max(0, Number(payload?.frames?.at(-1)?.t || 0));
  return Math.max(secondsMs, lastFrameMs);
}
function getReplayChatTimeline(payload) {
  const source = Array.isArray(payload?.chat) ? payload.chat : [];
  if (payload && Array.isArray(payload.__chatTimeline) && Number(payload.__chatTimelineSourceLen) === source.length) {
    return payload.__chatTimeline;
  }
  const timeline = source.map((entry, idx) => ({
    idx,
    t: Math.max(0, Number(entry?.t) || 0),
    at: Math.max(0, Number(entry?.at) || 0),
    name: String(entry?.name || 'Player').trim().slice(0, 32),
    text: String(entry?.text || '').trim(),
    system: Boolean(entry?.system),
  })).filter((entry) => entry.text.length > 0)
    .sort((a, b) => (a.t - b.t) || (a.at - b.at) || (a.idx - b.idx));
  if (payload) {
    payload.__chatTimeline = timeline;
    payload.__chatTimelineSourceLen = source.length;
  }
  return timeline;
}
function syncReplayGameChat(elapsedMs, payload) {
  const timeline = getReplayChatTimeline(payload);
  const t = Math.max(0, Number(elapsedMs) || 0);
  let lo = 0;
  let hi = timeline.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((Number(timeline[mid]?.t) || 0) <= t) lo = mid + 1;
    else hi = mid;
  }
  const visibleCount = lo;
  if (replayGame.chatPayloadRef === payload && replayGame.chatShownCount === visibleCount) return;
  replayGame.chatPayloadRef = payload || null;
  replayGame.chatShownCount = visibleCount;
  chatUi.items = timeline.slice(0, visibleCount).map((entry) => ({
    at: entry.at > 0 ? entry.at : (Number(payload?.startedAt) || Date.now()) + entry.t,
    name: entry.name || 'Player',
    text: entry.text,
    system: entry.system,
  }));
  if (chatUi.items.length > CHAT_MAX_CLIENT_MESSAGES) {
    chatUi.items.splice(0, chatUi.items.length - CHAT_MAX_CLIENT_MESSAGES);
  }
  renderChatMessages();
}
function updateReplayGameButtons() {
  if (replayGameToggleBtn) replayGameToggleBtn.textContent = replayGame.playing ? 'Pause' : 'Continue';
}

function seekReplayGame(elapsedMs, { keepPaused = null } = {}) {
  const totalMs = getReplayDurationMs(replayGame.payload);
  replayGame.elapsedMs = Math.max(0, Math.min(totalMs, Number(elapsedMs) || 0));
  replayGame.startedAt = performance.now() - (replayGame.elapsedMs / Math.max(1, replayGame.speed || 1));
  if (typeof keepPaused === 'boolean') replayGame.playing = !keepPaused;
  visuals.enemyPrev = new Map();
  visuals.playerPrev = new Map();
  visuals.rocketPrev = new Map();
  visuals.bulletIds = new Set();
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  visuals.dropPrev = new Map();
  visuals.xpOrbPrev = new Map();
  visuals.prevBossAlive = false;
  visuals.blood = [];
  visuals.bloodPuddles = [];
  visuals.gore = [];
  visuals.hitFx = [];
  visuals.muzzle = [];
  visuals.muzzleGroundFlashes = [];
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.muzzleGroundFlashes = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  visuals.dodgeWind = [];
  visuals.dodgeWindScheduled = [];
  replayGame.fxFrameIndex = -1;
  tickReplayGame(performance.now());
  updateReplayGameButtons();
  syncReplayGameChat(replayGame.elapsedMs, replayGame.payload);
}

function makeReplayBulletId(kind, fromEnemy, x, y, matchIndex) {
  return `${kind}:${fromEnemy ? 1 : 0}:${Math.round(x / 8)}:${Math.round(y / 8)}:${matchIndex}`;
}

function isNewReplayBulletTuple(bullet) {
  return Array.isArray(bullet) && (typeof bullet[0] === 'string' || typeof bullet[0] === 'number') && bullet.length >= 8;
}

function buildReplayCollisionTargets(enemiesRaw, playersRaw, bullet) {
  const targets = [];
  const hitPlayers = Boolean(bullet?.[7]);
  if (hitPlayers) {
    for (const player of Array.isArray(playersRaw) ? playersRaw : []) {
      if (!player?.[4]) continue;
      targets.push({
        x: Number(player[1]) || 0,
        y: Number(player[2]) || 0,
        r: 18,
      });
    }
    return targets;
  }

  for (const enemy of Array.isArray(enemiesRaw) ? enemiesRaw : []) {
    targets.push({
      x: Number(enemy[2]) || 0,
      y: Number(enemy[3]) || 0,
      r: Math.max(18, Number(enemy[6]) || 18),
    });
  }
  return targets;
}

function findReplayBulletImpactPoint(bullet, dtSec, enemiesRaw, playersRaw) {
  const x1 = Number(bullet?.[1]) || 0;
  const y1 = Number(bullet?.[2]) || 0;
  const vx = Number(bullet?.[3]) || 0;
  const vy = Number(bullet?.[4]) || 0;
  const bulletRadius = Math.max(2, Number(bullet?.[8]) || 3);
  const x2 = x1 + vx * dtSec;
  const y2 = y1 + vy * dtSec;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segLenSq = dx * dx + dy * dy;
  if (segLenSq <= 0.0001) return { x: x1, y: y1 };

  const targets = buildReplayCollisionTargets(enemiesRaw, playersRaw, bullet);
  let bestT = 1;
  for (const target of targets) {
    const rr = Math.max(4, bulletRadius + Math.max(8, Number(target.r) || 0));
    const tx = Number(target.x) || 0;
    const ty = Number(target.y) || 0;
    const proj = ((tx - x1) * dx + (ty - y1) * dy) / segLenSq;
    const t = Math.max(0, Math.min(1, proj));
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const ddx = tx - px;
    const ddy = ty - py;
    if ((ddx * ddx + ddy * ddy) <= rr * rr) {
      bestT = Math.min(bestT, Math.max(0, t - 0.06));
    }
  }

  return {
    x: x1 + dx * bestT,
    y: y1 + dy * bestT,
  };
}

function interpolateReplayBullets(currentBullets, nextBullets, alpha, currentT, nextT, currentEnemies, nextEnemies, currentPlayers, nextPlayers) {
  const source = Array.isArray(currentBullets) ? currentBullets : [];
  const target = Array.isArray(nextBullets) ? nextBullets : [];
  if (source.some(isNewReplayBulletTuple)) {
    const targetById = new Map();
    for (const nextBullet of target) {
      if (!isNewReplayBulletTuple(nextBullet)) continue;
      targetById.set(String(nextBullet[0]), nextBullet);
    }
    const dtSec = Math.max(0.001, (Math.max(currentT, nextT) - currentT) / 1000 || 0.2);
    return source.map((bullet, index) => {
      if (!isNewReplayBulletTuple(bullet)) {
        return {
          id: `legacy-${index}`,
          ownerId: '',
          x: Number(bullet?.[0]) || 0,
          y: Number(bullet?.[1]) || 0,
          vx: 0,
          vy: 0,
          color: bullet?.[3] ? '#fb7185' : ((bullet?.[2] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc'),
          kind: bullet?.[2] || 'bullet',
          radius: (bullet?.[2] || 'bullet') === 'rocket' ? 6 : 3,
          fromEnemy: Boolean(bullet?.[3]),
        };
      }
      const nextBullet = targetById.get(String(bullet[0])) || bullet;
      const x1 = Number(bullet[1]) || 0;
      const y1 = Number(bullet[2]) || 0;
      let x2 = Number(nextBullet[1]) || 0;
      let y2 = Number(nextBullet[2]) || 0;
      if (targetById.has(String(bullet[0]))) {
        x2 = Number(nextBullet[1]) || x1;
        y2 = Number(nextBullet[2]) || y1;
      } else {
        const impact = findReplayBulletImpactPoint(
          bullet,
          dtSec,
          Array.isArray(currentEnemies) && currentEnemies.length ? currentEnemies : nextEnemies,
          Array.isArray(currentPlayers) && currentPlayers.length ? currentPlayers : nextPlayers,
        );
        x2 = impact.x;
        y2 = impact.y;
      }
      return {
        id: String(bullet[0]),
        ownerId: bullet[9] || '',
        x: lerp(x1, x2, alpha),
        y: lerp(y1, y2, alpha),
        vx: Number(bullet[3]) || 0,
        vy: Number(bullet[4]) || 0,
        color: bullet[5] || (bullet[7] ? '#fb7185' : ((bullet[6] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc')),
        kind: bullet[6] || 'bullet',
        radius: Math.max(2, Number(bullet[8]) || ((bullet[6] || 'bullet') === 'rocket' ? 6 : 3)),
        fromEnemy: Boolean(bullet[7]),
      };
    });
  }
  const used = new Set();
  const out = [];
  const dtSec = Math.max(0.001, (Math.max(currentT, nextT) - currentT) / 1000 || 0.2);

  for (let i = 0; i < source.length; i += 1) {
    const bullet = source[i];
    let bestIndex = -1;
    let bestScore = Infinity;
    for (let j = 0; j < target.length; j += 1) {
      if (used.has(j)) continue;
      const nextBullet = target[j];
      if ((bullet?.[2] || 'bullet') !== (nextBullet?.[2] || 'bullet')) continue;
      if ((bullet?.[3] ? 1 : 0) !== (nextBullet?.[3] ? 1 : 0)) continue;
      const dx = (Number(nextBullet?.[0]) || 0) - (Number(bullet?.[0]) || 0);
      const dy = (Number(nextBullet?.[1]) || 0) - (Number(bullet?.[1]) || 0);
      const score = dx * dx + dy * dy;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = j;
      }
    }

    const nextBullet = bestIndex >= 0 ? target[bestIndex] : null;
    if (bestIndex >= 0) used.add(bestIndex);
    const x1 = Number(bullet?.[0]) || 0;
    const y1 = Number(bullet?.[1]) || 0;
    const x2 = Number(nextBullet?.[0]) || x1;
    const y2 = Number(nextBullet?.[1]) || y1;
    out.push({
      id: makeReplayBulletId(bullet?.[2] || 'bullet', Boolean(bullet?.[3]), x1, y1, bestIndex >= 0 ? bestIndex : i),
      ownerId: '',
      x: lerp(x1, x2, alpha),
      y: lerp(y1, y2, alpha),
      vx: (x2 - x1) / dtSec,
      vy: (y2 - y1) / dtSec,
      color: bullet?.[3] ? '#fb7185' : ((bullet?.[2] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc'),
      kind: bullet?.[2] || 'bullet',
      radius: (bullet?.[2] || 'bullet') === 'rocket' ? 6 : 3,
      fromEnemy: Boolean(bullet?.[3]),
    });
  }

  return out;
}

function isNewReplayXpOrbTuple(orb) {
  if (!Array.isArray(orb)) return false;
  return orb.length >= 4;
}

function interpolateReplayXpOrbs(currentOrbs, nextOrbs, alpha) {
  const source = Array.isArray(currentOrbs) ? currentOrbs : [];
  const target = Array.isArray(nextOrbs) ? nextOrbs : [];

  if (source.some(isNewReplayXpOrbTuple)) {
    const targetById = new Map();
    for (const nextOrb of target) {
      if (!isNewReplayXpOrbTuple(nextOrb)) continue;
      targetById.set(Number(nextOrb[0]) || 0, nextOrb);
    }
    return source.map((orb, index) => {
      if (!isNewReplayXpOrbTuple(orb)) {
        return {
          id: `rx-legacy-${index}`,
          x: Number(orb?.[0]) || 0,
          y: Number(orb?.[1]) || 0,
          xp: Math.max(1, Number(orb?.[2]) || 1),
          ttlMs: 999999,
          ttlMaxMs: 999999,
        };
      }
      const orbId = Number(orb[0]) || 0;
      const nextOrb = targetById.get(orbId) || orb;
      return {
        id: `rx-${orbId}`,
        x: lerp(Number(orb[1]) || 0, Number(nextOrb[1]) || Number(orb[1]) || 0, alpha),
        y: lerp(Number(orb[2]) || 0, Number(nextOrb[2]) || Number(orb[2]) || 0, alpha),
        xp: Math.max(1, Number(orb[3]) || 1),
        pullSpeed: Math.max(0, Number(orb[4]) || 0),
        ttlMs: 999999,
        ttlMaxMs: 999999,
      };
    });
  }

  return source.map((orb, index) => {
    const nextOrb = target[index] || orb;
    return {
      id: `rx-${index}`,
      x: lerp(Number(orb?.[0]) || 0, Number(nextOrb?.[0]) || Number(orb?.[0]) || 0, alpha),
      y: lerp(Number(orb?.[1]) || 0, Number(nextOrb?.[1]) || Number(orb?.[1]) || 0, alpha),
      xp: Math.max(1, Number(orb?.[2]) || 1),
      ttlMs: 999999,
      ttlMaxMs: 999999,
    };
  });
}

function updateReplayGameSpeed(speed) {
  const nextSpeed = Math.max(1, Number(speed) || 1);
  replayGame.speed = nextSpeed;
  const buttons = replayGameSpeedsEl ? Array.from(replayGameSpeedsEl.querySelectorAll('[data-replay-game-speed]')) : [];
  for (const btn of buttons) {
    btn.classList.toggle('active', Number(btn.dataset.replayGameSpeed) === nextSpeed);
  }
  if (replayGameMetaEl && replayGame.active) {
    const totalMs = getReplayDurationMs(replayGame.payload);
    replayGameMetaEl.textContent = `Replay ${formatReplayClock(replayGame.elapsedMs)} / ${formatReplayClock(totalMs)} | x${replayGame.speed}`;
  }
}

function buildReplayState(payload, elapsedMs) {
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  const pair = pickReplayFramePair(frames, elapsedMs);
  const { current, next, alpha, index } = pair;
  if (!current) return null;

  const nowMs = Number(payload?.startedAt || Date.now()) + Math.max(0, Number(elapsedMs) || 0);
  const nextPlayers = frameEntityMap(next?.p);
  const nextEnemies = frameEntityMap(next?.e);
  const nextCompanions = frameEntityMap(next?.c);
  const playerList = [];

  for (const player of Array.isArray(current.p) ? current.p : []) {
    const nextPlayer = nextPlayers.get(player[0]) || player;
    const x = lerp(player[1], nextPlayer[1], alpha);
    const y = lerp(player[2], nextPlayer[2], alpha);
    const level = Math.max(1, Math.floor(Number(player[14]) || 1));
    const xpToNext = Math.max(1, Math.floor(Number(player[16]) || 1));
    const aimX = lerp(x, nextPlayer[1], 0.65);
    const aimY = lerp(y, nextPlayer[2], 0.65);
    const skills = (Array.isArray(player[9]) ? player[9] : []).map((skill) => ({
      id: skill[0] || '',
      level: Math.max(0, Number(skill[1]) || 0),
      cooldownMs: Math.max(0, Number(skill[2]) || 0),
      maxCooldownMs: Math.max(0, Number(skill[3]) || 0),
      kind: skill[4] || 'passive',
      rarity: skill[5] || 'common',
      name: skill[6] || skill[0] || 'Skill',
      desc: '',
    }));
    const dodgeInvulnLeftMs = Math.max(0, Number(player[19]) || 0);
    const frameNowMs = Number(payload?.startedAt || Date.now()) + Math.max(0, Number(current?.t) || 0);
    const dodgeInvulnUntil = dodgeInvulnLeftMs > 0 ? (frameNowMs + dodgeInvulnLeftMs) : 0;
    playerList.push({
      id: player[0],
      name: player[0] === payload?.playerId ? (payload?.playerName || 'Replay') : `Player ${String(player[0]).slice(0, 4)}`,
      x,
      y,
      hp: Math.max(0, Number(player[3]) || 0),
      maxHp: Math.max(1, Number(player[17]) || 100),
      alive: Boolean(player[4]),
      score: Math.max(0, Number(player[8]) || 0),
      kills: Math.max(0, Number(player[7]) || 0),
      weaponKey: player[5] || 'pistol',
      weaponLabel: player[5] || 'pistol',
      ammo: null,
      aimX,
      aimY,
      shooting: false,
      damageMul: 1,
      fireRateMul: 1,
      moveSpeedMul: 1,
      pickupRadius: 0,
      hpRegenPerSec: 0,
      moveSpeed: 0,
      shotDamage: 1,
      shotIntervalMs: 170,
      playerClass: player[6] || 'cyber',
      netQuality: 0,
      netPingMs: 0,
      slowUntil: 0,
      dodgeCooldownMs: 0,
      dodgeCharges: Math.max(0, Number(player[10]) || 0),
      dodgeChargesMax: Math.max(1, Number(player[11]) || 1),
      dodgeRechargeMs: Math.max(0, Number(player[12]) || 0),
      dodgeRechargeTotalMs: Math.max(1, Number(player[13]) || 1200),
      dodgeInvulnUntil,
      level,
      xp: Math.max(0, Math.floor(Number(player[15]) || 0)),
      xpToNext,
      pendingSkillChoices: [],
      enemyKills: Math.max(0, Number(player[7]) || 0),
      bossKills: Math.max(0, Math.floor(Number(player[18]) || 0)),
      skills,
    });
  }

  for (const companion of Array.isArray(current.c) ? current.c : []) {
    const nextCompanion = nextCompanions.get(companion[0]) || companion;
    playerList.push({
      id: companion[0],
      name: '',
      x: lerp(companion[1], nextCompanion[1], alpha),
      y: lerp(companion[2], nextCompanion[2], alpha),
      hp: 1,
      maxHp: 1,
      alive: true,
      score: 0,
      kills: 0,
      weaponKey: companion[3] || 'pistol',
      weaponLabel: companion[3] || 'pistol',
      ammo: null,
      aimX: lerp(companion[1], nextCompanion[1], alpha) + 10,
      aimY: lerp(companion[2], nextCompanion[2], alpha),
      shooting: false,
      damageMul: 1,
      fireRateMul: 1,
      moveSpeedMul: 1,
      pickupRadius: 0,
      hpRegenPerSec: 0,
      moveSpeed: 0,
      shotDamage: 1,
      shotIntervalMs: 170,
      playerClass: payload?.playerClass || 'cyber',
      netQuality: 0,
      netPingMs: 0,
      slowUntil: 0,
      dodgeCooldownMs: 0,
      dodgeCharges: 0,
      dodgeChargesMax: 0,
      dodgeRechargeMs: 0,
      dodgeRechargeTotalMs: 1200,
      dodgeInvulnUntil: 0,
      level: 1,
      xp: 0,
      xpToNext: 1,
      pendingSkillChoices: [],
      skills: [],
      isCompanion: true,
      ownerId: companion[4] || '',
    });
  }

  const enemies = (Array.isArray(current.e) ? current.e : []).map((enemy) => {
    const nextEnemy = nextEnemies.get(enemy[0]) || enemy;
    return {
      id: enemy[0],
      type: enemy[1] || 'normal',
      x: lerp(enemy[2], nextEnemy[2], alpha),
      y: lerp(enemy[3], nextEnemy[3], alpha),
      hp: Math.max(0, Number(enemy[4]) || 0),
      maxHp: Math.max(1, Number(enemy[5]) || 1),
      radius: Math.max(18, Number(enemy[6]) || 18),
      spriteScale: enemy[1] === 'boss' ? 1.8 : 1,
    };
  });

  const bullets = interpolateReplayBullets(
    current.b,
    next?.b,
    alpha,
    Number(current?.t || 0),
    Number(next?.t || current?.t || 0),
    current.e,
    next?.e,
    current.p,
    next?.p,
  );

  const drops = (Array.isArray(current.d) ? current.d : []).map((drop, index) => {
    const kind = drop[3] || 'weapon';
    const weaponKey = drop[2] || 'pistol';
    return {
      id: `rd-${index}`,
      x: Number(drop[0]) || 0,
      y: Number(drop[1]) || 0,
      kind,
      weaponKey: kind === 'xp_vacuum' ? null : weaponKey,
      weaponLabel: kind === 'xp_vacuum' ? 'XP Surge' : weaponKey,
      ttlMs: 999999,
      ttlMaxMs: 999999,
    };
  });

  const xpOrbs = interpolateReplayXpOrbs(current.x, next?.x, alpha);

  const bossPortals = (Array.isArray(current.bp) ? current.bp : []).map((portal, index) => ({
    id: `rp-${index}`,
    x: Number(portal[0]) || 0,
    y: Number(portal[1]) || 0,
    spawnAt: nowMs + Math.max(0, Number(portal[2]) || 0),
    ttlMs: Math.max(0, Number(portal[2]) || 0),
  }));

  return {
    replayFrameIndex: index,
    now: nowMs,
    roomCode: payload?.roomCode || 'REPLAY',
    roomStartedAt: Number(payload?.roomStartedAt || payload?.startedAt || nowMs),
    totalEnemyKills: Math.max(0, Number(current.te) || 0),
    nextBossAtKills: Math.max(50, Math.max(0, Number(current.te) || 0) + 25),
    bossAlive: Boolean(current.ba),
    nextBossSpawnAt: 0,
    roomDifficulty: {
      level: 1 + Math.floor(Math.max(0, Number(elapsedMs) || 0) / 60000),
      hpMul: 1,
      speedMul: 1,
      damageMul: 1,
      attackRateMul: 1,
      spawnIntervalMs: Number(payload?.captureIntervalMs) || 200,
    },
    world: payload?.world || { width: 2400, height: 1400 },
    sync: { tickRate: 45, stateSendHz: 30, netRenderDelayMs: 0 },
    players: playerList,
    bullets,
    enemies,
    bossPortals,
    drops,
    xpOrbs,
    decor: { trees: Array.isArray(payload?.decor?.trees) ? payload.decor.trees : [] },
  };
}

function stopReplayGame({ showMenu = true } = {}) {
  replayGame.active = false;
  replayGame.recordId = 0;
  replayGame.payload = null;
  replayGame.playing = true;
  replayGame.startedAt = 0;
  replayGame.elapsedMs = 0;
  replayGame.fxFrameIndex = -1;
  replayGame.seeking = false;
  replayGame.chatShownCount = -1;
  replayGame.chatPayloadRef = null;
  if (replayGameControlsEl) replayGameControlsEl.classList.add('hidden');
  if (replayGameMetaEl) replayGameMetaEl.textContent = 'Replay';
  if (replayGameProgressEl) replayGameProgressEl.value = '0';
  updateReplayGameButtons();
  if (showMenu) {
    clearLocalSessionState();
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
  }
  document.body.classList.remove('replay-game-active');
}

function tickReplayGame(ts) {
  if (!replayGame.active || !replayGame.payload) return;
  if (replayGame.playing) {
    if (!replayGame.startedAt) replayGame.startedAt = ts - (replayGame.elapsedMs / replayGame.speed);
    const totalMs = getReplayDurationMs(replayGame.payload);
    replayGame.elapsedMs = Math.max(0, (ts - replayGame.startedAt) * replayGame.speed);
    if (replayGame.elapsedMs >= totalMs) {
      replayGame.elapsedMs = totalMs;
      replayGame.playing = false;
      updateReplayGameButtons();
    }
  }
  const totalMs = getReplayDurationMs(replayGame.payload);
  const nextState = buildReplayState(replayGame.payload, replayGame.elapsedMs);
  if (nextState) {
    if (nextState.replayFrameIndex !== replayGame.fxFrameIndex) {
      processStateFx(nextState);
      replayGame.fxFrameIndex = nextState.replayFrameIndex;
    }
    game.state = nextState;
    game.world = nextState.world;
    game.roomCode = nextState.roomCode;
    game.roomStartedAt = nextState.roomStartedAt;
    game.totalEnemyKills = nextState.totalEnemyKills;
    game.nextBossAtKills = nextState.nextBossAtKills;
    game.nextBossSpawnAt = nextState.nextBossSpawnAt;
    game.bossAlive = nextState.bossAlive;
    game.roomDifficulty = nextState.roomDifficulty;
    game.sortedTrees = Array.isArray(nextState.decor?.trees) ? nextState.decor.trees.slice().sort((a, b) => a.y - b.y) : [];
    updateScoreboard(nextState.players || []);
    updateStatsPanel((nextState.players || []).find((p) => p.id === game.myId) || (nextState.players || [])[0] || null);
    updateJumpButtonUi((nextState.players || []).find((p) => p.id === game.myId) || null);
    roomMetaEl.textContent = `Replay: ${nextState.roomCode}`;
    weaponMetaEl.textContent = 'Replay mode';
    if (movementMetaEl) movementMetaEl.textContent = 'Controls disabled';
    syncReplayGameChat(replayGame.elapsedMs, replayGame.payload);
    if (replayGameMetaEl) {
      replayGameMetaEl.textContent = `Replay ${formatReplayClock(replayGame.elapsedMs)} / ${formatReplayClock(totalMs)} | x${replayGame.speed}`;
    }
  }
  if (replayGameProgressEl && !replayGame.seeking) {
    const value = totalMs > 0 ? Math.round((replayGame.elapsedMs / totalMs) * 1000) : 0;
    replayGameProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
}

function startReplayGame(payload, record) {
  if (!payload || !Array.isArray(payload.frames) || payload.frames.length <= 0) return false;
  if (game.myId || game.connected) leaveActiveRoom();
  clearLocalSessionState();
  closeRecordDetailsModal();
  replayGame.active = true;
  replayGame.recordId = Math.max(0, Number(record?.id) || 0);
  replayGame.payload = payload;
  replayGame.playing = true;
  replayGame.startedAt = 0;
  replayGame.elapsedMs = 0;
  replayGame.fxFrameIndex = -1;
  replayGame.seeking = false;
  replayGame.chatShownCount = -1;
  replayGame.chatPayloadRef = payload;
  chatUi.items = [];
  renderChatMessages();
  game.connected = false;
  game.myId = payload.playerId || 'replay-player';
  game.roomCode = payload.roomCode || 'REPLAY';
  visuals.enemyPrev = new Map();
  visuals.playerPrev = new Map();
  visuals.rocketPrev = new Map();
  visuals.bulletIds = new Set();
  visuals.blood = [];
  visuals.bloodPuddles = [];
  visuals.gore = [];
  visuals.hitFx = [];
  visuals.muzzle = [];
  visuals.muzzleGroundFlashes = [];
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  visuals.dodgeWind = [];
  visuals.dodgeWindScheduled = [];
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  visuals.dropPrev = new Map();
  visuals.xpOrbPrev = new Map();
  visuals.prevBossAlive = false;
  closeGameVersionModal();
  joinOverlay.style.display = 'none';
  document.body.classList.add('replay-game-active');
  if (replayGameControlsEl) replayGameControlsEl.classList.remove('hidden');
  if (replayGameProgressEl) replayGameProgressEl.value = '0';
  updateReplayGameSpeed(replayGame.speed || 1);
  updateReplayGameButtons();
  updateMobileControlsVisibility();
  tickReplayGame(performance.now());
  return true;
}

function startReplayGameAt(payload, record, startSec = 0) {
  const started = startReplayGame(payload, record);
  if (!started) return false;
  const atMs = Math.max(0, Math.round((Number(startSec) || 0) * 1000));
  if (atMs > 0) {
    replayGame.playing = false;
    seekReplayGame(atMs, { keepPaused: true });
  }
  return true;
}

async function maybeStartReplayFromUrl() {
  const recordId = Math.max(0, Number(pendingReplayRecordId) || 0);
  const startSec = Math.max(0, Number(pendingReplayStartSec) || 0);
  const replayApiPath = String(pendingReplayApiPath || '').trim();
  if (recordId <= 0 && !replayApiPath) return;
  pendingReplayRecordId = 0;
  pendingReplayStartSec = 0;
  pendingReplayApiPath = '';
  try {
    statusEl.textContent = 'Loading replay...';
    showReplayLoadOverlay(replayApiPath ? 'Loading shared replay...' : `Loading replay #${recordId}`, 'Preparing replay data...');
    const payload = await fetchReplayPayloadByRecordId(recordId, {
      replayApiPath,
      onProgress(info) {
        const text = describeReplayLoadProgress(info);
        updateReplayLoadOverlay(info);
        statusEl.textContent = `Loading replay... ${text}`;
      },
    });
    const replay = payload?.replay || null;
    const record = payload?.record || { id: recordId, replayApiPath };
    if (!replay || !Array.isArray(replay.frames) || replay.frames.length <= 0) {
      throw new Error('Replay not found.');
    }
    startReplayGameAt(replay, record, startSec);
    const replayName = record?.name || (recordId > 0 ? `Record #${recordId}` : 'Shared replay');
    statusEl.textContent = `Replay loaded: ${replayName}${startSec > 0 ? ` from ${startSec}s` : ''}`;
  } catch (err) {
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
    statusEl.textContent = err?.message || 'Failed to load replay.';
  } finally {
    hideReplayLoadOverlay();
  }
}

function drawRecordReplay() {
  if (!recordReplayCanvasEl) return;
  const sized = resizeRecordReplayCanvas();
  if (!sized) return;
  const replayCtx = sized.ctx;
  const width = sized.width;
  const height = sized.height;
  replayCtx.clearRect(0, 0, width, height);
  replayCtx.fillStyle = '#08131d';
  replayCtx.fillRect(0, 0, width, height);

  const payload = recordReplay.payload;
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  const world = payload?.world || { width: 2400, height: 1400 };
  const worldW = Math.max(1, Number(world.width) || 2400);
  const worldH = Math.max(1, Number(world.height) || 1400);
  const scale = Math.min(width / worldW, height / worldH);
  const offsetX = (width - worldW * scale) * 0.5;
  const offsetY = (height - worldH * scale) * 0.5;
  const toScreenX = (x) => offsetX + (Number(x) || 0) * scale;
  const toScreenY = (y) => offsetY + (Number(y) || 0) * scale;

  replayCtx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  replayCtx.lineWidth = 1;
  const gridStep = 240;
  for (let x = 0; x <= worldW; x += gridStep) {
    const sx = toScreenX(x);
    replayCtx.beginPath();
    replayCtx.moveTo(sx, offsetY);
    replayCtx.lineTo(sx, offsetY + worldH * scale);
    replayCtx.stroke();
  }
  for (let y = 0; y <= worldH; y += gridStep) {
    const sy = toScreenY(y);
    replayCtx.beginPath();
    replayCtx.moveTo(offsetX, sy);
    replayCtx.lineTo(offsetX + worldW * scale, sy);
    replayCtx.stroke();
  }

  const { current, next, alpha } = pickReplayFramePair(frames, recordReplay.elapsedMs);
  if (!current) {
    replayCtx.fillStyle = '#94a3b8';
    replayCtx.font = '14px Segoe UI';
    replayCtx.fillText('Replay has no frames.', 18, 24);
    return;
  }

  const nextPlayers = frameEntityMap(next?.p);
  const nextEnemies = frameEntityMap(next?.e);
  const nextCompanions = frameEntityMap(next?.c);
  const previewBullets = interpolateReplayBullets(
    current.b,
    next?.b,
    alpha,
    Number(current?.t || 0),
    Number(next?.t || current?.t || 0),
    current.e,
    next?.e,
    current.p,
    next?.p,
  );

  for (const portal of Array.isArray(current.bp) ? current.bp : []) {
    const sx = toScreenX(portal[0]);
    const sy = toScreenY(portal[1]);
    replayCtx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 16, 0, Math.PI * 2);
    replayCtx.fill();
    replayCtx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    replayCtx.stroke();
  }

  for (const drop of Array.isArray(current.d) ? current.d : []) {
    const sx = toScreenX(drop[0]);
    const sy = toScreenY(drop[1]);
    replayCtx.fillStyle = '#f59e0b';
    replayCtx.fillRect(sx - 4, sy - 4, 8, 8);
  }

  for (const orb of Array.isArray(current.x) ? current.x : []) {
    const useNewTuple = Array.isArray(orb) && orb.length >= 4;
    const sx = toScreenX(useNewTuple ? orb[1] : orb[0]);
    const sy = toScreenY(useNewTuple ? orb[2] : orb[1]);
    replayCtx.fillStyle = '#60a5fa';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const bullet of previewBullets) {
    const sx = toScreenX(bullet.x);
    const sy = toScreenY(bullet.y);
    replayCtx.fillStyle = bullet.fromEnemy ? '#fb7185' : (bullet.kind === 'rocket' ? '#f59e0b' : '#f8fafc');
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, bullet.kind === 'rocket' ? 4 : 2.2, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const enemy of Array.isArray(current.e) ? current.e : []) {
    const nextEnemy = nextEnemies.get(enemy[0]) || enemy;
    const sx = toScreenX(lerp(enemy[2], nextEnemy[2], alpha));
    const sy = toScreenY(lerp(enemy[3], nextEnemy[3], alpha));
    const radius = Math.max(5, (Number(enemy[6]) || 18) * scale * 0.55);
    replayCtx.fillStyle = enemy[1] === 'boss' ? '#dc2626' : (enemy[1] === 'ranged' ? '#fb7185' : (enemy[1] === 'charger' ? '#f97316' : '#ef4444'));
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, radius, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const companion of Array.isArray(current.c) ? current.c : []) {
    const nextCompanion = nextCompanions.get(companion[0]) || companion;
    const sx = toScreenX(lerp(companion[1], nextCompanion[1], alpha));
    const sy = toScreenY(lerp(companion[2], nextCompanion[2], alpha));
    replayCtx.fillStyle = '#22c55e';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 5.5, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const player of Array.isArray(current.p) ? current.p : []) {
    const nextPlayer = nextPlayers.get(player[0]) || player;
    const sx = toScreenX(lerp(player[1], nextPlayer[1], alpha));
    const sy = toScreenY(lerp(player[2], nextPlayer[2], alpha));
    const isTracked = player[0] === payload?.playerId;
    replayCtx.fillStyle = isTracked ? '#22d3ee' : '#e2e8f0';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, isTracked ? 8 : 6, 0, Math.PI * 2);
    replayCtx.fill();
    if (!player[4]) {
      replayCtx.strokeStyle = 'rgba(248, 113, 113, 0.95)';
      replayCtx.lineWidth = 2;
      replayCtx.beginPath();
      replayCtx.moveTo(sx - 7, sy - 7);
      replayCtx.lineTo(sx + 7, sy + 7);
      replayCtx.moveTo(sx + 7, sy - 7);
      replayCtx.lineTo(sx - 7, sy + 7);
      replayCtx.stroke();
    }
  }

  replayCtx.fillStyle = '#e2e8f0';
  replayCtx.font = '12px Segoe UI';
  replayCtx.fillText(`Time ${formatReplayClock(recordReplay.elapsedMs)}`, 14, 20);
  replayCtx.fillText(`Kills ${Math.max(0, Number(current.te) || 0)} | Bosses ${Math.max(0, Number(current.tb) || 0)}`, 14, 38);
  if (payload?.truncated) replayCtx.fillText('Truncated', width - 72, 20);
}

function tickRecordReplayFrame(ts) {
  if (!recordReplay.playing || !recordReplay.payload) return;
  if (!recordReplay.startedAt) recordReplay.startedAt = ts - (recordReplay.elapsedMs / recordReplay.speed);
  const totalMs = getReplayDurationMs(recordReplay.payload);
  recordReplay.elapsedMs = Math.max(0, (ts - recordReplay.startedAt) * recordReplay.speed);
  if (recordReplay.elapsedMs >= totalMs) {
    recordReplay.elapsedMs = totalMs;
    stopRecordReplayPlayback(false);
  }
  drawRecordReplay();
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
  }
  if (recordReplayProgressEl && !recordReplay.seeking) {
    const value = totalMs > 0 ? Math.round((recordReplay.elapsedMs / totalMs) * 1000) : 0;
    recordReplayProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
  if (recordReplay.playing) {
    recordReplay.rafId = requestAnimationFrame(tickRecordReplayFrame);
  }
}

function startRecordReplayPlayback() {
  if (!recordReplay.payload) return;
  if (recordReplay.elapsedMs >= getReplayDurationMs(recordReplay.payload)) {
    recordReplay.elapsedMs = 0;
  }
  recordReplay.playing = true;
  recordReplay.startedAt = 0;
  if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Pause Replay';
  updateRecordReplayButtons();
  recordReplay.rafId = requestAnimationFrame(tickRecordReplayFrame);
}

function resetRecordReplayUi(recordId = 0) {
  stopRecordReplayPlayback(true);
  recordReplay.recordId = Math.max(0, Number(recordId) || 0);
  recordReplay.record = null;
  recordReplay.loading = false;
  recordReplay.loaded = false;
  recordReplay.payload = null;
  recordReplay.startedAt = 0;
  recordReplay.seeking = false;
  if (recordReplayPanelEl) recordReplayPanelEl.classList.toggle('hidden', recordReplay.recordId <= 0);
  if (recordReplaySpeedsEl) recordReplaySpeedsEl.classList.add('hidden');
  if (recordReplayControlsEl) recordReplayControlsEl.classList.add('hidden');
  if (recordReplayProgressEl) recordReplayProgressEl.value = '0';
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = recordReplay.recordId > 0
      ? 'Replay is available on demand.'
      : 'Replay is unavailable for this record.';
  }
  drawRecordReplay();
  setRecordReplaySpeed(1);
  updateRecordReplayButtons();
  updateRecordReplayStageButton();
}

async function loadRecordReplay(recordId, options = {}) {
  const id = Math.max(0, Number(recordId) || 0);
  if (id <= 0) return false;
  const autoPlay = options?.autoPlay === true;
  recordReplay.loading = true;
  if (recordReplayPlayBtn) {
    recordReplayPlayBtn.disabled = true;
    recordReplayPlayBtn.textContent = 'Loading...';
  }
  if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Loading replay data...';
  showReplayLoadOverlay(`Loading replay #${id}`, 'Preparing replay data...');
  updateRecordReplayStageButton();
  try {
    const payload = await fetchReplayPayloadByRecordId(id, {
      replayApiPath: recordReplay.record?.replayApiPath || '',
      onProgress(info) {
        const text = describeReplayLoadProgress(info);
        updateReplayLoadOverlay(info);
        if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Loading replay data... ${text}`;
      },
    });
    recordReplay.payload = payload?.replay || null;
    recordReplay.loaded = Boolean(recordReplay.payload && Array.isArray(recordReplay.payload.frames) && recordReplay.payload.frames.length > 0);
    recordReplay.elapsedMs = 0;
    drawRecordReplay();
    if (!recordReplay.loaded) throw new Error('empty replay');
    if (recordReplaySpeedsEl) recordReplaySpeedsEl.classList.remove('hidden');
    if (recordReplayControlsEl) recordReplayControlsEl.classList.remove('hidden');
    if (recordReplayProgressEl) recordReplayProgressEl.value = '0';
    const totalMs = getReplayDurationMs(recordReplay.payload);
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Replay loaded. ${formatReplayClock(totalMs)} total | speed x${recordReplay.speed}`;
    if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Play Replay';
    updateRecordReplayButtons();
    updateRecordReplayStageButton();
    if (autoPlay) startRecordReplayPlayback();
    return true;
  } catch {
    recordReplay.payload = null;
    recordReplay.loaded = false;
    if (recordReplayControlsEl) recordReplayControlsEl.classList.add('hidden');
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Replay is not available for this record.';
    if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Replay Unavailable';
    updateRecordReplayButtons();
    updateRecordReplayStageButton();
    return false;
  } finally {
    recordReplay.loading = false;
    hideReplayLoadOverlay();
    if (recordReplayPlayBtn) recordReplayPlayBtn.disabled = false;
    updateRecordReplayStageButton();
  }
}

async function fetchReplayPayloadByRecordId(recordId, options = {}) {
  const id = Math.max(0, Number(recordId) || 0);
  const onProgress = typeof options?.onProgress === 'function' ? options.onProgress : null;
  const replayApiPath = String(options?.replayApiPath || '').trim();
  if (id <= 0 && !replayApiPath) return null;
  const replayUrl = replayApiPath || (`/api/records/${id}/replay`);
  const res = await fetch(replayUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Math.max(0, Number(res.headers.get('content-length')) || 0);
  if (!res.body || typeof res.body.getReader !== 'function') {
    onProgress?.({ received: total, total, done: true });
    return res.json();
  }

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  onProgress?.({ received, total, done: false });
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value?.length) {
      chunks.push(value);
      received += value.length;
      onProgress?.({ received, total, done: false });
    }
  }
  onProgress?.({ received: total > 0 ? total : received, total, done: true });

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

async function copyReplayLink(recordId, options = {}) {
  const id = Math.max(0, Number(recordId) || 0);
  const replayApiPath = String(options?.replayApiPath || '').trim();
  if ((id <= 0 && !replayApiPath) || !navigator.clipboard?.writeText) {
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Replay link is unavailable.';
    return false;
  }
  const startSec = Math.max(0, Math.floor((Number(recordReplay.elapsedMs) || 0) / 1000));
  try {
    await navigator.clipboard.writeText(buildReplayShareUrl(id, startSec, replayApiPath));
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Replay link copied${startSec > 0 ? ` from ${startSec}s` : ''}.`;
    return true;
  } catch {
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Failed to copy replay link.';
    return false;
  }
}

function closeRecordDetailsModal() {
  if (!recordDetailsModalEl) return;
  resetRecordReplayUi(0);
  recordDetailsModalEl.classList.add('hidden');
}

function formatRecordDateTime(ts) {
  const value = Math.max(0, Number(ts) || 0);
  if (value <= 0) return '--';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

function renderRunDetailsHtml(details) {
  if (!details || typeof details !== 'object') {
    return '<div class="record-details-empty">No detailed run stats for this record.</div>';
  }

  const shotIntervalMs = Math.max(1, Number(details.shotIntervalMs) || 1);
  const fireRate = (1000 / shotIntervalMs).toFixed(2);
  const list = [
    ['Character', details.playerClass || '--'],
    ['Level', Math.max(1, Number(details.level) || 1)],
    ['Monsters killed', Math.max(0, Number(details.enemyKills) || 0)],
    ['Bosses killed', Math.max(0, Number(details.bossKills) || 0)],
    ['XP', `${Math.max(0, Number(details.xp) || 0)} / ${Math.max(1, Number(details.xpToNext) || 1)}`],
    ['HP', `${Math.max(0, Number(details.hp) || 0)} / ${Math.max(1, Number(details.maxHp) || 1)}`],
    ['Weapon', details.weaponLabel || details.weaponKey || '--'],
    ['Damage / shot', Math.max(1, Number(details.shotDamage) || 1)],
    ['Fire rate', `${fireRate} shots/s`],
    ['Move speed', Math.max(0, Math.round(Number(details.moveSpeed) || 0))],
    ['Pickup radius', Math.max(0, Math.round(Number(details.pickupRadius) || 0))],
    ['HP regen', `${Math.max(0, Number(details.hpRegenPerSec) || 0).toFixed(2)}/s`],
    ['Jump charges', Math.max(1, Number(details.dodgeChargesMax) || 1)],
    ['Damage multiplier', `x${Math.max(0.1, Number(details.damageMul) || 1).toFixed(2)}`],
    ['Fire-rate multiplier', `x${Math.max(0.1, Number(details.fireRateMul) || 1).toFixed(2)}`],
    ['Speed multiplier', `x${Math.max(0.1, Number(details.moveSpeedMul) || 1).toFixed(2)}`],
    ['Room kills at death', Math.max(0, Number(details.totalEnemyKills) || 0)],
    ['Bosses killed in room', Math.max(0, Number(details.totalBossKills) || 0)],
    ['Survived', `${Math.max(1, Number(details.survivedSec) || 1)}s`],
  ];

  const rows = list.map(([k, v]) => `<div class="rd-row"><span>${k}</span><b>${v}</b></div>`).join('');
  const skills = Array.isArray(details.skills) ? details.skills : [];
  const skillsHtml = skills.length
    ? `<div class="rd-skills">${skills.map((s) => `<span class="rd-skill">${trSkillName(s.id, s.name || s.id)} Lv${Math.max(1, Number(s.level) || 1)}</span>`).join('')}</div>`
    : '<div class="record-details-empty">' + trWithFallback('ui.record.no_skills', 'No skills picked.') + '</div>';

  return `<div class="rd-grid">${rows}</div><div class="rd-subtitle">${trWithFallback('ui.main.skills', 'Skills')}</div>${skillsHtml}`;
}

function openRecordDetailsModal(record, rankLabel) {
  if (!recordDetailsModalEl || !recordDetailsTitleEl || !recordDetailsBodyEl) return;
  const name = record?.name || 'Unknown';
  const kills = Number(record?.kills) || 0;
  const score = Number(record?.score) || 0;
  const durationSec = Number(record?.durationSec) || 0;
  const roomCode = (record?.roomCode || '-').toString();
  const playedAt = formatRecordDateTime(record?.at);

  recordDetailsTitleEl.textContent = `${rankLabel} ${name} | ${kills} kills | ${score} pts`;
  const summary = `<div class="rd-summary">${playedAt} | Room ${roomCode} | ${durationSec}s</div>`;
  recordDetailsBodyEl.innerHTML = summary + renderRunDetailsHtml(record?.runDetails || null);
  resetRecordReplayUi(record?.id);
  recordReplay.record = record || null;
  if (recordReplayCopyLinkBtn) {
    recordReplayCopyLinkBtn.disabled = false;
    recordReplayCopyLinkBtn.title = '';
  }
  recordDetailsModalEl.classList.remove('hidden');
}

function renderRecordsList(items, page = 1, totalPages = 1, total = 0) {
  if (!recordsListEl) return;
  recordsUi.page = page;
  recordsUi.totalPages = totalPages;
  recordsUi.total = total;
  updateRecordsPager();

  if (!items.length) {
    recordsListEl.textContent = 'No records yet.';
    return;
  }

  const rankOffset = (recordsUi.page - 1) * recordsUi.pageSize;
  recordsListEl.innerHTML = '';
  for (let i = 0; i < items.length; i += 1) {
    const r = items[i];
    const rankNumber = rankOffset + i + 1;
    const rankLabel = `#${rankNumber}`;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'record-row';

    const rank = document.createElement('div');
    rank.className = 'record-rank';
    rank.textContent = rankLabel;

    const name = document.createElement('div');
    name.className = 'record-name';
    const attempts = Math.max(1, Number(r.attempts) || 1);
    name.textContent = (r.name || 'Unknown') + ' [' + attempts + ']';

    const kills = Number(r.kills) || 0;
    const score = Number(r.score) || 0;

    const meta = document.createElement('div');
    meta.className = 'record-meta';
    meta.textContent = `${kills} kills / ${score} pts`;

    row.addEventListener('click', () => {
      openRecordDetailsModal(r, rankLabel);
    });

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(meta);
    recordsListEl.appendChild(row);
  }
}

recordDetailsCloseBtn?.addEventListener('click', () => {
  closeRecordDetailsModal();
});

recordDetailsModalEl?.addEventListener('click', (e) => {
  if (e.target === recordDetailsModalEl) closeRecordDetailsModal();
});
recordReplayPlayBtn?.addEventListener('click', async () => {
  if (recordReplay.loading) return;
  if (!recordReplay.loaded) {
    await loadRecordReplay(recordReplay.recordId, { autoPlay: true });
    return;
  }
  if (recordReplay.playing) {
    stopRecordReplayPlayback(false);
    drawRecordReplay();
    if (recordReplayMetaEl) {
      const totalMs = getReplayDurationMs(recordReplay.payload);
      recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
    }
    return;
  }
  startRecordReplayPlayback();
});
recordReplayInGameBtn?.addEventListener('click', async () => {
  if (recordReplay.loading) return;
  if (!recordReplay.loaded) {
    const ok = await loadRecordReplay(recordReplay.recordId);
    if (!ok) return;
  }
  startReplayGame(recordReplay.payload, recordReplay.record);
});
recordReplayCopyLinkBtn?.addEventListener('click', async () => {
  await copyReplayLink(recordReplay.recordId, { replayApiPath: recordReplay.record?.replayApiPath || '' });
});
recordReplayStageLoadBtn?.addEventListener('click', async () => {
  if (recordReplay.loading || recordReplay.loaded) return;
  await loadRecordReplay(recordReplay.recordId, { autoPlay: true });
});
recordReplaySpeedsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-replay-speed]');
  if (!btn) return;
  const nextSpeed = Math.max(1, Number(btn.dataset.replaySpeed) || 1);
  const prevElapsed = recordReplay.elapsedMs;
  setRecordReplaySpeed(nextSpeed);
  if (recordReplay.playing) {
    const nowTs = performance.now();
    recordReplay.startedAt = nowTs - (prevElapsed / nextSpeed);
  } else {
    drawRecordReplay();
  }
});
recordReplayStartBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(0, { keepPaused: true });
});
recordReplayBackBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(recordReplay.elapsedMs - 5000, { keepPaused: true });
});
recordReplayToggleBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = !recordReplay.playing;
  recordReplay.startedAt = performance.now() - (recordReplay.elapsedMs / Math.max(1, recordReplay.speed || 1));
  updateRecordReplayButtons();
  if (recordReplay.playing) tickRecordReplayFrame(performance.now());
});
recordReplayForwardBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(recordReplay.elapsedMs + 5000, { keepPaused: true });
});
recordReplayEndBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(getReplayDurationMs(recordReplay.payload), { keepPaused: true });
});
recordReplayProgressEl?.addEventListener('input', () => {
  if (!recordReplay.payload) return;
  recordReplay.seeking = true;
  const totalMs = getReplayDurationMs(recordReplay.payload);
  const ratio = Math.max(0, Math.min(1, (Number(recordReplayProgressEl.value) || 0) / 1000));
  recordReplay.playing = false;
  seekRecordReplay(totalMs * ratio, { keepPaused: true });
});
recordReplayProgressEl?.addEventListener('change', () => {
  recordReplay.seeking = false;
});
replayGameExitBtn?.addEventListener('click', () => {
  stopReplayGame({ showMenu: true });
});
replayGameStartBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(0, { keepPaused: true });
});
replayGameBackBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(replayGame.elapsedMs - 5000, { keepPaused: true });
});
replayGameToggleBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = !replayGame.playing;
  replayGame.startedAt = performance.now() - (replayGame.elapsedMs / Math.max(1, replayGame.speed || 1));
  updateReplayGameButtons();
  tickReplayGame(performance.now());
});
replayGameForwardBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(replayGame.elapsedMs + 5000, { keepPaused: true });
});
replayGameEndBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(getReplayDurationMs(replayGame.payload), { keepPaused: true });
});
replayGameSpeedsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-replay-game-speed]');
  if (!btn) return;
  const nextSpeed = Math.max(1, Number(btn.dataset.replayGameSpeed) || 1);
  const prevElapsed = replayGame.elapsedMs;
  updateReplayGameSpeed(nextSpeed);
  if (replayGame.active) {
    replayGame.startedAt = performance.now() - (prevElapsed / nextSpeed);
    tickReplayGame(performance.now());
  }
});
replayGameProgressEl?.addEventListener('input', () => {
  if (!replayGame.payload) return;
  replayGame.seeking = true;
  const totalMs = getReplayDurationMs(replayGame.payload);
  const ratio = Math.max(0, Math.min(1, (Number(replayGameProgressEl.value) || 0) / 1000));
  replayGame.playing = false;
  seekReplayGame(totalMs * ratio, { keepPaused: true });
});
replayGameProgressEl?.addEventListener('change', () => {
  replayGame.seeking = false;
});
window.addEventListener('resize', () => {
  if (!recordReplayPanelEl || recordReplayPanelEl.classList.contains('hidden')) return;
  drawRecordReplay();
});
async function requestRecordsList(page = recordsUi.page) {
  if (!recordsListEl) return;
  try {
    const params = new URLSearchParams({
      page: String(Math.max(1, page)),
      page_size: String(recordsUi.pageSize),
    });
    const res = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    renderRecordsList(
      Array.isArray(payload.records) ? payload.records : [],
      Number(payload.page) || 1,
      Number(payload.totalPages) || 1,
      Number(payload.total) || 0,
    );
  } catch {
    recordsUi.total = 0;
    updateRecordsPager();
    recordsListEl.textContent = 'Failed to load records.';
  }
}
function updatePlayerInterpolation(dt) {
  if (!game.state) return;
  const liveMap = mapById(game.state.players);
  const targetMap = game.sampledNet?.players ? new Map(game.sampledNet.players) : new Map(liveMap);
  if (game.myId && liveMap.has(game.myId)) {
    targetMap.set(game.myId, liveMap.get(game.myId));
  }
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt);
  const alive = new Set();

  for (const [id, p] of targetMap.entries()) {
    alive.add(id);
    const live = liveMap.get(id);
    const sampledAlive = (typeof p?.alive === 'boolean') ? Boolean(p.alive) : Boolean(live?.alive);
    const isAlive = Boolean(live?.alive ?? sampledAlive);
    const targetX = (live && sampledAlive !== isAlive) ? Number(live.x) || Number(p.x) || 0 : (Number(p.x) || Number(live?.x) || 0);
    const targetY = (live && sampledAlive !== isAlive) ? Number(live.y) || Number(p.y) || 0 : (Number(p.y) || Number(live?.y) || 0);

    let r = game.renderPlayers.get(id);
    if (!r) {
      r = { x: targetX, y: targetY, vx: 0, vy: 0, alive: isAlive };
      game.renderPlayers.set(id, r);
      continue;
    }

    const wasAlive = Boolean(r.alive);
    const dx = targetX - r.x;
    const dy = targetY - r.y;
    const d2 = dx * dx + dy * dy;
    const nowMs = Date.now();
    const dodgeUntil = Number(live?.dodgeInvulnUntil) || Number(p?.dodgeInvulnUntil) || 0;
    const dodgeActive = dodgeUntil > nowMs;
    const respawnSnap = !wasAlive && isAlive;
    // Keep respawn instant, but do not snap dodge-jumps: they should look smooth.
    const longJumpSnap = !dodgeActive && d2 > (340 * 340);

    if (respawnSnap || longJumpSnap) {
      r.vx = 0;
      r.vy = 0;
      r.x = targetX;
      r.y = targetY;
    } else {
      const isLocalPlayer = Boolean(game.myId) && String(id) === String(game.myId);
      // For remote players: keep regular motion responsive, but make dodge/jump movement smoother.
      const alphaRemote = dodgeActive ? Math.max(alpha, 0.26) : Math.max(alpha, 0.52);
      const alphaPlayer = isLocalPlayer ? alpha : alphaRemote;
      const nx = r.x + (targetX - r.x) * alphaPlayer;
      const ny = r.y + (targetY - r.y) * alphaPlayer;
      r.vx = (nx - r.x) / Math.max(0.001, dt);
      r.vy = (ny - r.y) / Math.max(0.001, dt);
      r.x = nx;
      r.y = ny;
    }

    r.alive = isAlive;
  }

  for (const id of Array.from(game.renderPlayers.keys())) {
    if (!alive.has(id)) game.renderPlayers.delete(id);
  }
}

function getPlayerRenderPos(player) {
  return game.renderPlayers.get(player.id) || player;
}

function updateEnemyInterpolation(dt) {
  if (!game.state) return;
  const targetMap = game.sampledNet?.enemies || mapById(game.state.enemies);
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt);
  const alive = new Set();

  for (const [id, e] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderEnemies.get(id);
    if (!r) {
      r = { x: e.x, y: e.y, vx: 0, vy: 0, faceLeft: Boolean(e.faceLeft) };
      game.renderEnemies.set(id, r);
      continue;
    }

    const nx = r.x + (e.x - r.x) * alpha;
    const ny = r.y + (e.y - r.y) * alpha;
    r.vx = (nx - r.x) / Math.max(0.001, dt);
    r.vy = (ny - r.y) / Math.max(0.001, dt);
    if (typeof e.faceLeft === 'boolean') r.faceLeft = e.faceLeft;
    else if (Math.abs(Number(r.vx) || 0) > 0.15) r.faceLeft = (Number(r.vx) || 0) < 0;
    r.x = nx;
    r.y = ny;
  }

  for (const id of Array.from(game.renderEnemies.keys())) {
    if (!alive.has(id)) game.renderEnemies.delete(id);
  }
}

function syncBulletsFromState(nextState) {
  const alive = new Set();

  for (const b of nextState.bullets) {
    const id = b.id;
    if (!id) continue;
    alive.add(id);

    let r = game.renderBullets.get(id);
    if (!r) {
      r = {
        x: b.x,
        y: b.y,
        serverX: b.x,
        serverY: b.y,
        ownerId: b.ownerId || '',
        ownerPlayerId: b.ownerPlayerId || '',
        vx: b.vx || 0,
        vy: b.vy || 0,
        color: b.color,
        kind: b.kind || 'bullet',
        radius: b.radius || 3,
        shooterType: b.shooterType || '',
        weaponKey: b.weaponKey || '',
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = b.x;
    r.serverY = b.y;
    r.ownerId = b.ownerId || '';
    r.ownerPlayerId = b.ownerPlayerId || '';
    r.vx = (r.vx * 0.3) + ((b.vx || 0) * 0.7);
    r.vy = (r.vy * 0.3) + ((b.vy || 0) * 0.7);
    r.color = b.color;
    r.kind = b.kind || 'bullet';
    r.radius = b.radius || 3;
    r.shooterType = b.shooterType || '';
    r.weaponKey = b.weaponKey || '';
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
}

function updateBulletInterpolation(dt) {
  const liveBullets = mapById(game.state?.bullets || []);
  const targets = game.sampledNet?.bullets || new Map(liveBullets);
  const alive = new Set();

  for (const [id, tb] of targets.entries()) {
    alive.add(id);

    let r = game.renderBullets.get(id);
    if (!r) {
      r = {
        x: tb.x,
        y: tb.y,
        serverX: tb.x,
        serverY: tb.y,
        ownerId: tb.ownerId || '',
        ownerPlayerId: tb.ownerPlayerId || '',
        vx: tb.vx || 0,
        vy: tb.vy || 0,
        color: tb.color,
        kind: tb.kind || 'bullet',
        radius: tb.radius || 3,
        shooterType: tb.shooterType || '',
        weaponKey: tb.weaponKey || '',
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = tb.x;
    r.serverY = tb.y;
    r.ownerId = tb.ownerId || '';
    r.ownerPlayerId = tb.ownerPlayerId || '';
    const isRocket = String(tb.kind || r.kind || '').toLowerCase() === 'rocket';
    const velBlend = isRocket ? 0.45 : 0.65;
    r.vx = (r.vx * (1 - velBlend)) + ((tb.vx || 0) * velBlend);
    r.vy = (r.vy * (1 - velBlend)) + ((tb.vy || 0) * velBlend);
    r.color = tb.color;
    r.kind = tb.kind || 'bullet';
    r.radius = tb.radius || 3;
    r.shooterType = tb.shooterType || '';
    r.weaponKey = tb.weaponKey || '';

    if (replayGame.active) {
      if (isRocket && typeof spawnRocketTrailFx === 'function') {
        const dx = tb.x - r.x;
        const dy = tb.y - r.y;
        if ((dx * dx + dy * dy) >= 0.49) {
          const invDt = 1 / Math.max(0.001, dt);
          const trailVx = Number(tb.vx) || (dx * invDt);
          const trailVy = Number(tb.vy) || (dy * invDt);
          spawnRocketTrailFx(r.x, r.y, trailVx, trailVy, tb.color || '#fb923c');
        }
      }
      r.x = tb.x;
      r.y = tb.y;
      continue;
    }

    // Keep full bullet speed for all players; position alignment is handled by player interpolation.
    const predictMul = 1;
    r.x += r.vx * dt * predictMul;
    r.y += r.vy * dt * predictMul;

    const dx = r.serverX - r.x;
    const dy = r.serverY - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      const speed = Math.hypot(r.vx, r.vy);
      const maxStep = Math.max(isRocket ? 5 : 8, speed * dt * (isRocket ? 1.05 : 1.4));
      const correction = Math.min(dist, maxStep);
      const corrRate = roomSync.bulletCorrectionRate * (isRocket ? 0.58 : 1);
      const k = (correction / dist) * Math.min(1, corrRate * dt);
      r.x += dx * k;
      r.y += dy * k;
    }
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
}

function updateXpOrbInterpolation(dt) {
  if (!game.state) return;
  const targetMap = game.sampledNet?.xpOrbs || mapById(game.state.xpOrbs || []);
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt * 0.9);
  const alive = new Set();
  for (const [id, o] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderXpOrbs.get(id);
    if (!r) {
      r = { x: o.x, y: o.y };
      game.renderXpOrbs.set(id, r);
      continue;
    }
    if (replayGame.active) {
      r.x = o.x;
      r.y = o.y;
      continue;
    }
    r.x += (o.x - r.x) * alpha;
    r.y += (o.y - r.y) * alpha;
  }
  for (const id of Array.from(game.renderXpOrbs.keys())) {
    if (!alive.has(id)) game.renderXpOrbs.delete(id);
  }
}
function getXpOrbRenderPos(orb) {
  return game.renderXpOrbs.get(orb.id) || orb;
}

function getEnemyRenderPos(enemy) {
  return game.renderEnemies.get(enemy.id) || enemy;
}

function getBulletRenderPos(bullet) {
  const id = bullet.id;
  return (id && game.renderBullets.get(id)) || bullet;
}
function pushNetSnapshot(state) {
  const snap = {
    t: performance.now(),
    players: state.players.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      alive: Boolean(p.alive),
      dodgeInvulnUntil: Number(p.dodgeInvulnUntil) || 0,
    })),
    enemies: state.enemies.map((e) => ({ id: e.id, x: e.x, y: e.y, faceLeft: Boolean(e.faceLeft) })),
    bullets: state.bullets.map((b) => ({
      id: b.id ?? `${b.x.toFixed(1)}:${b.y.toFixed(1)}`,
      ownerId: b.ownerId || '',
      ownerPlayerId: b.ownerPlayerId || '',
      x: b.x,
      y: b.y,
      vx: b.vx || 0,
      vy: b.vy || 0,
      color: b.color,
      kind: b.kind || 'bullet',
      radius: b.radius || 3,
      shooterType: b.shooterType || '',
      weaponKey: b.weaponKey || '',
    })),
    xpOrbs: state.xpOrbs.map((o) => ({ id: o.id, x: o.x, y: o.y })),
  };

  game.netSnapshots.push(snap);
  if (game.netSnapshots.length > 30) game.netSnapshots.shift();
}

function mapById(list) {
  const out = new Map();
  for (const item of list) out.set(item.id, item);
  return out;
}

function sampleBufferedState() {
  const snaps = game.netSnapshots;
  if (snaps.length === 0) return null;

  const target = performance.now() - roomSync.netRenderDelayMs;
  let a = snaps[0];
  let b = snaps[snaps.length - 1];

  for (let i = 0; i < snaps.length - 1; i += 1) {
    if (snaps[i].t <= target && target <= snaps[i + 1].t) {
      a = snaps[i];
      b = snaps[i + 1];
      break;
    }
  }

  if (target >= snaps[snaps.length - 1].t) {
    const latest = snaps[snaps.length - 1];
    const extraMs = Math.min(roomSync.maxExtrapolationMs, target - latest.t);
    const extraSec = Math.max(0, extraMs / 1000);

    const bullets = latest.bullets.map((x) => ({
      ...x,
      x: x.x + x.vx * extraSec,
      y: x.y + x.vy * extraSec,
    }));

    return {
      players: mapById(latest.players),
      enemies: mapById(latest.enemies),
      bullets: mapById(bullets),
      xpOrbs: mapById(latest.xpOrbs || []),
    };
  }

  const dt = Math.max(1, b.t - a.t);
  const k = Math.max(0, Math.min(1, (target - a.t) / dt));

  const lerpMap = (la, lb, withVel, snapDistanceSq = Infinity) => {
    const ma = mapById(la);
    const mb = mapById(lb);
    const ids = new Set([...ma.keys(), ...mb.keys()]);
    const out = new Map();

    for (const id of ids) {
      const pa = ma.get(id);
      const pb = mb.get(id);
      if (pa && pb) {
        const paAliveKnown = typeof pa.alive === 'boolean';
        const pbAliveKnown = typeof pb.alive === 'boolean';
        const aliveChanged = paAliveKnown && pbAliveKnown && (Boolean(pa.alive) !== Boolean(pb.alive));

        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        if (aliveChanged || dx * dx + dy * dy > snapDistanceSq) {
          out.set(id, { ...pb, id });
          continue;
        }
        out.set(id, {
          id,
          x: pa.x + (pb.x - pa.x) * k,
          y: pa.y + (pb.y - pa.y) * k,
          vx: withVel ? (pb.vx ?? pa.vx ?? 0) : 0,
          vy: withVel ? (pb.vy ?? pa.vy ?? 0) : 0,
          color: pb.color ?? pa.color,
          kind: pb.kind ?? pa.kind,
          radius: pb.radius ?? pa.radius,
          ownerId: pb.ownerId ?? pa.ownerId ?? '',
          ownerPlayerId: pb.ownerPlayerId ?? pa.ownerPlayerId ?? '',
          shooterType: pb.shooterType ?? pa.shooterType,
          weaponKey: pb.weaponKey ?? pa.weaponKey,
          faceLeft: typeof pb.faceLeft === 'boolean' ? pb.faceLeft : pa.faceLeft,
          alive: pbAliveKnown ? Boolean(pb.alive) : (paAliveKnown ? Boolean(pa.alive) : undefined),
          dodgeInvulnUntil: Number(pb.dodgeInvulnUntil ?? pa.dodgeInvulnUntil) || 0,
        });
      } else {
        out.set(id, pb || pa);
      }
    }

    return out;
  };

  return {
    players: lerpMap(a.players, b.players, false, 210 * 210),
    enemies: lerpMap(a.enemies, b.enemies, false),
    bullets: lerpMap(a.bullets, b.bullets, true),
    xpOrbs: lerpMap(a.xpOrbs || [], b.xpOrbs || [], false),
  };
}
function isVisibleWorld(x, y, pad = 0) {
  const sx = x - camera.x;
  const sy = y - camera.y;
  return sx >= -pad && sx <= canvas.width + pad && sy >= -pad && sy <= canvas.height + pad;
}

function setTabScoreboardVisible(visible) {
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
  tabScoreboardVisible = Boolean(visible) && !overlayOpen;
  if (!tabScoreboardEl) return;
  tabScoreboardEl.classList.toggle('hidden', !tabScoreboardVisible);
  if (tabScoreboardVisible) updateTabScoreboard(lastBattlePlayers);
}

function updateTabScoreboard(players) {
  if (!tabScoreboardEl) return;
  const list = Array.isArray(players) ? players.filter((p) => !p.isCompanion) : [];
  lastBattlePlayers = list;
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
  if (!tabScoreboardVisible || overlayOpen) {
    tabScoreboardEl.classList.add('hidden');
    return;
  }

  const pvpMode = normalizeGameMode(game.gameMode) === 'pvp';
  const sorted = [...list].sort((a, b) => (Math.max(0, Number(b?.score) || 0) - Math.max(0, Number(a?.score) || 0))
    || (Math.max(0, Number(b?.pvpKills) || 0) - Math.max(0, Number(a?.pvpKills) || 0))
    || (Math.max(0, Number(b?.kills) || 0) - Math.max(0, Number(a?.kills) || 0))
    || String(a?.name || '').localeCompare(String(b?.name || '')));

  const title = trWithFallback('ui.scoreboard.tab_title', 'Players in battle (TAB)');
  const headRank = trWithFallback('ui.scoreboard.rank', '#');
  const headNick = trWithFallback('ui.scoreboard.nick', 'Nickname');
  const headDeaths = trWithFallback('ui.scoreboard.deaths', 'Deaths');
  const headPing = trWithFallback('ui.scoreboard.ping', 'Ping');
  const headKills = trWithFallback('ui.scoreboard.kills', 'Kills');
  const headPvp = trWithFallback('ui.scoreboard.pvp_kills', 'PvP');
  const headPve = trWithFallback('ui.scoreboard.pve_kills', 'PvE');

  const rows = sorted.map((p, index) => {
    const kills = Math.max(0, Number(p?.kills) || 0);
    const pvpKills = Math.max(0, Number(p?.pvpKills) || 0);
    const enemyKills = Math.max(0, Number(p?.enemyKills) || kills);
    const deaths = Math.max(0, Number(p?.pvpDeaths) || 0);
    const ping = Math.max(0, Number(p?.netPingMs) || 0);
    const meClass = p?.id === game.myId ? ' class="me"' : '';

    if (pvpMode) {
      return `<tr${meClass}><td class="num">${index + 1}</td><td>${escapeHtml(String(p?.name || '-'))}</td><td class="num">${pvpKills}</td><td class="num">${enemyKills}</td><td class="num">${deaths}</td><td class="num">${ping > 0 ? ping : '--'}</td></tr>`;
    }
    return `<tr${meClass}><td class="num">${index + 1}</td><td>${escapeHtml(String(p?.name || '-'))}</td><td class="num">${kills}</td><td class="num">${deaths}</td><td class="num">${ping > 0 ? ping : '--'}</td></tr>`;
  }).join('');

  const headHtml = pvpMode
    ? `<tr><th class="num">${escapeHtml(headRank)}</th><th>${escapeHtml(headNick)}</th><th class="num">${escapeHtml(headPvp)}</th><th class="num">${escapeHtml(headPve)}</th><th class="num">${escapeHtml(headDeaths)}</th><th class="num">${escapeHtml(headPing)}</th></tr>`
    : `<tr><th class="num">${escapeHtml(headRank)}</th><th>${escapeHtml(headNick)}</th><th class="num">${escapeHtml(headKills)}</th><th class="num">${escapeHtml(headDeaths)}</th><th class="num">${escapeHtml(headPing)}</th></tr>`;

  const nextHtml = `<p class="tab-scoreboard-title">${escapeHtml(title)}</p><table><thead>${headHtml}</thead><tbody>${rows}</tbody></table>`;
  if (nextHtml === lastTabScoreboardHtml) return;
  lastTabScoreboardHtml = nextHtml;
  tabScoreboardEl.innerHTML = nextHtml;
}

function updateScoreboard(players) {
  updateTabScoreboard(players);
  const sorted = [...players].filter((p) => !p.isCompanion).sort((a, b) => b.score - a.score);
  const titleBase = tr('ui.scoreboard.players');
  const titleText = scoreboardMinimized ? `${titleBase}: ${sorted.length}` : titleBase;
  const toggleLabel = scoreboardMinimized ? tr('ui.scoreboard.expand') : tr('ui.scoreboard.minimize');
  const toggleIcon = scoreboardMinimized ? '+' : '&minus;';
  const rows = sorted.map((p) => {
    const kills = Number(p.kills) || 0;
    const pvpKills = Math.max(0, Number(p.pvpKills) || 0);
    const enemyKills = Math.max(0, Number(p.enemyKills) || kills);
    const mag = Math.max(0, Number(p.magazineAmmo) || 0);
    const reserve = p.reserveAmmo === null ? 'в€ћ' : Math.max(0, Number(p.reserveAmmo) || 0);
    const reload = Math.max(0, Number(p.reloadLeftMs) || 0);
    const ammo = reload > 0 ? `${mag}/${reserve} reloading` : `${mag}/${reserve}`;
    const meClass = p.id === game.myId ? ' me' : '';
    const conn = getConnectionIndicatorData(p);
    const connIcon = game.connectionIndicatorEnabled
      ? `<span class="conn-wrap" aria-label="${conn.title}"><span class="conn-indicator conn-lvl-${conn.level}"></span><span class="conn-meta">${conn.shortText}</span></span>`
      : '';
    const pvpMode = normalizeGameMode(game.gameMode) === 'pvp';
    const killsText = pvpMode
      ? `${trWithFallback('ui.scoreboard.pvp_kills', 'PvP')}: ${pvpKills} | ${trWithFallback('ui.scoreboard.pve_kills', 'PvE')}: ${enemyKills}`
      : `${trWithFallback('ui.scoreboard.kills', 'Kills')}: ${kills}`;
    return `<div class="score-row${meClass}">${connIcon}<span class="score-player-text">${p.name} - ${killsText} (${p.weaponLabel} ${ammo})</span></div>`;
  });

  const nextHtml = scoreboardMinimized
    ? `<div class="score-head"><div class="score-title">${titleText}</div><button type="button" class="panel-close panel-close-sm scoreboard-toggle" aria-label="${toggleLabel}" title="${toggleLabel}">${toggleIcon}</button></div>`
    : `<div class="score-head"><div class="score-title">${titleText}</div><button type="button" class="panel-close panel-close-sm scoreboard-toggle" aria-label="${toggleLabel}" title="${toggleLabel}">${toggleIcon}</button></div>${rows.join('')}`;
  const allowPinnedHover = !replayGame.active && !mobile.enabled;
  if (allowPinnedHover && scoreboardEl.matches(':hover')) return;
  if (nextHtml === lastScoreboardHtml) return;
  lastScoreboardHtml = nextHtml;
  scoreboardEl.innerHTML = nextHtml;
}

function keyStateFromCode(code, isDown) {
  if (code === 'KeyW' || code === 'ArrowUp') input.up = isDown;
  if (code === 'KeyS' || code === 'ArrowDown') input.down = isDown;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = isDown;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = isDown;
}

function queueJump() {
  input.jumpQueued = true;
  requestImmediateInputSend();
}

function updateSyncSettingsVisibility() {
  if (!syncSettingsEl) return;
  syncSettingsEl.style.display = joinMode === 'create' ? '' : 'none';
}

function updatePvpDurationVisibility() {
  if (!pvpDurationWrapEl) return;
  const visible = joinMode === 'create' && selectedGameMode === 'pvp';
  pvpDurationWrapEl.classList.toggle('hidden', !visible);
}

function renderGameModeSelection() {
  if (!Array.isArray(gameModeOptionButtons) || !gameModeOptionButtons.length) return;
  for (const btn of gameModeOptionButtons) {
    if (!(btn instanceof HTMLElement)) continue;
    const mode = normalizeGameMode(btn.dataset.gameMode || 'normal');
    btn.classList.toggle('active', mode === selectedGameMode);
  }
  if (pvpDurationSelectEl) pvpDurationSelectEl.value = String(normalizePvpDurationMin(selectedPvpDurationMin));
  updatePvpDurationVisibility();
}

let immediateInputSendQueued = false;

function requestImmediateInputSend() {
  if (immediateInputSendQueued) return;
  immediateInputSendQueued = true;
  setTimeout(() => {
    immediateInputSendQueued = false;
    sendInput();
  }, 0);
}


window.addEventListener('keydown', (e) => {
  if (e.code === 'Backquote') {
    e.preventDefault();
    toggleDevConsole();
    return;
  }

  if (e.code === 'Escape') {
    if (recordDetailsModalEl && !recordDetailsModalEl.classList.contains('hidden')) {
      e.preventDefault();
      closeRecordDetailsModal();
      return;
    }
    if (gameVersionModalEl && !gameVersionModalEl.classList.contains('hidden')) {
      e.preventDefault();
      closeGameVersionModal();
      return;
    }
  }

  if (isDevConsoleOpen()) return;

  const t = e.target;
  const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';

  if (!typing && e.code === 'Escape' && !overlayOpen && game.state && !e.repeat) {
    e.preventDefault();
    setInfoPanelHidden(!infoPanelHidden);
    return;
  }

  if (!typing && !overlayOpen && e.code === 'Enter' && chatInputEl && game.showChatEnabled) {
    e.preventDefault();
    chatInputEl.focus();
    return;
  }

  if (!typing && !overlayOpen && e.code === 'Tab') {
    e.preventDefault();
    setTabScoreboardVisible(true);
    return;
  }

  if (typing) return;

  if (!typing && e.code === 'KeyH') {
    setInfoPanelHidden(!infoPanelHidden);
    return;
  }

  if (!typing && !overlayOpen && !e.repeat && runBoundDevCommand(e.code)) {
    e.preventDefault();
    return;
  }

  if (!typing && e.code === 'Space') {
    e.preventDefault();
    queueJump();
    return;
  }

  const digitMatch = !typing ? /^Digit([1-3])$/.exec(e.code) : null;
  if (digitMatch) {
    const idx = Number(digitMatch[1]);
    if (chooseSkillByIndex(idx)) {
      e.preventDefault();
      return;
    }
  }

  const quickDigitMatch = !typing && !overlayOpen ? /^Digit([4-6])$/.exec(e.code) : null;
  if (quickDigitMatch && !e.repeat) {
    const slotIndex = Math.max(1, Number(quickDigitMatch[1]) - 3);
    if (useQuickItemInRun(`quick_${slotIndex}`)) {
      e.preventDefault();
      return;
    }
  }

  const before = `${input.up}:${input.down}:${input.left}:${input.right}`;
  keyStateFromCode(e.code, true);
  const after = `${input.up}:${input.down}:${input.left}:${input.right}`;
  if (before !== after) requestImmediateInputSend();
  if (e.code === 'Digit1' && ws.readyState === WebSocket.OPEN) {
    sendJson({ type: 'weaponSwitch', weaponKey: 'pistol' });
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Tab') {
    setTabScoreboardVisible(false);
    return;
  }
  if (isDevConsoleOpen()) return;
  const t = e.target;
  const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
  if (typing) return;
  const before = `${input.up}:${input.down}:${input.left}:${input.right}`;
  keyStateFromCode(e.code, false);
  const after = `${input.up}:${input.down}:${input.left}:${input.right}`;
  if (before !== after) requestImmediateInputSend();
});

window.addEventListener('blur', () => {
  setTabScoreboardVisible(false);
});

function setPointerFromClient(clientX, clientY) {
  input.pointerX = clientX;
  input.pointerY = clientY;
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  input.shooting = true;
  setPointerFromClient(e.clientX, e.clientY);
  requestImmediateInputSend();
});
window.addEventListener('mouseup', () => {
  if (!input.shooting) return;
  input.shooting = false;
  requestImmediateInputSend();
});
canvas.addEventListener('mousemove', (e) => {
  setPointerFromClient(e.clientX, e.clientY);
  if (input.shooting) requestImmediateInputSend();
});

let mobileShootTouchId = null;
canvas.addEventListener('touchstart', (e) => {
  if (!mobile.enabled) return;
  const t = e.changedTouches[0];
  if (!t) return;
  if (t.identifier === mobile.moveId || t.identifier === mobile.aimId) return;
  mobileShootTouchId = t.identifier;
  input.shooting = true;
  setPointerFromClient(t.clientX, t.clientY);
  requestImmediateInputSend();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!mobile.enabled || mobileShootTouchId === null) return;
  const t = getTouchById(e.touches, mobileShootTouchId);
  if (!t) return;
  setPointerFromClient(t.clientX, t.clientY);
  requestImmediateInputSend();
  e.preventDefault();
}, { passive: false });

const stopMobileTapShoot = (e) => {
  if (!mobile.enabled || mobileShootTouchId === null) return;
  const ended = getTouchById(e.changedTouches, mobileShootTouchId);
  if (!ended) return;
  mobileShootTouchId = null;
  input.shooting = false;
  requestImmediateInputSend();
  e.preventDefault();
};
canvas.addEventListener('touchend', stopMobileTapShoot, { passive: false });
canvas.addEventListener('touchcancel', stopMobileTapShoot, { passive: false });

joinForm.addEventListener('click', (e) => {
  const rawTarget = e.target;
  if (!(rawTarget instanceof Element)) return;
  const t = rawTarget.closest('button');
  if (!(t instanceof HTMLButtonElement)) return;

  if (t.dataset.gameMode) {
    selectedGameMode = normalizeGameMode(t.dataset.gameMode);
    localStorage.setItem(GAME_MODE_STORAGE_KEY, selectedGameMode);
    renderGameModeSelection();
    return;
  }

  if (!t.dataset.mode) return;
  joinMode = t.dataset.mode;
  updateSyncSettingsVisibility();
});

updateSyncSettingsVisibility();
renderGameModeSelection();

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (ws.readyState !== WebSocket.OPEN) return;
  const roomCode = joinMode === 'create' ? '' : roomCodeInput.value.trim();
  const joinSync = joinMode === 'create' ? configFromSyncUi() : null;
  void sendJoinRequest(roomCode, joinSync, { source: 'join_form' });
});

function handleSkillOptionInteract(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const card = t.closest('.skill-option');
  if (!(card instanceof HTMLElement)) return;
  const sid = card.dataset.skillId;
  if (!sid || ws.readyState !== WebSocket.OPEN || !game.myId) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
  const skillLabel = trSkillName(sid, sid);
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('skill_pick', { skill_id: sid });
  }
  setCommentaryVariant(buildSkillPickCommentaryVariants(skillLabel), `skill_pick_${String(sid).toLowerCase()}`, 2200);
  sendJson({ type: 'skillPick', skillId: sid });
  return;
  setCommentaryVariant([
    { title: `Р’Р·СЏР»Рё РЅР°РІС‹Рє: ${skillLabel}.`, text: 'РћС‚Р»РёС‡РЅРѕ, Р±РёР»Рґ С‚РѕР»СЊРєРѕ С‡С‚Рѕ СЃС‚Р°Р» Р»РёР±Рѕ СЃРёР»СЊРЅРµРµ, Р»РёР±Рѕ РіРѕСЂР°Р·РґРѕ СЃРјРµС€РЅРµРµ. РЎРєРѕСЂРѕ СѓРІРёРґРёРј РєР°РєРѕР№ РёРјРµРЅРЅРѕ РІР°СЂРёР°РЅС‚ РІС‹РїР°Р».' },
    { title: `${skillLabel} РґРѕР±Р°РІР»РµРЅ РІ Р°СЂСЃРµРЅР°Р».`, text: 'РћС‡РµРЅСЊ Р»СЋР±Р»СЋ СЌС‚РѕС‚ РјРѕРјРµРЅС‚: РёРіСЂРѕРє РґРµР»Р°РµС‚ СЃРµСЂСЊС‘Р·РЅРѕРµ Р»РёС†Рѕ Рё РІС‹Р±РёСЂР°РµС‚ СЃРµР±Рµ РЅРѕРІС‹Рµ СЃРїРѕСЃРѕР±С‹ СЃРѕР·РґР°РІР°С‚СЊ С…Р°РѕСЃ.' },
  ], `skill_pick_${String(sid).toLowerCase()}`, 2500);
  sendJson({ type: 'skillPick', skillId: sid });
}

levelupOptionsEl?.addEventListener('pointerdown', handleSkillOptionInteract);
levelupOptionsEl?.addEventListener('click', handleSkillOptionInteract);



const DEATH_OVERLAY_DELAY_MS = 500;
const DEATH_REWARDS_SHOW_DELAY_MS = 500;
let pendingDeathOverlayTimer = null;
let pendingDeathResult = null;
let pendingDeathRewardsTimer = null;
let latestRunRewards = null;
let latestDeathSnapshot = null;
let localDeathStateLocked = false;

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
    : '<div class="death-reward-cards muted">' + trWithFallback('ui.run_rewards.no_items', 'РџСЂРµРґРјРµС‚С‹ РІ СЌС‚РѕС‚ СЂР°Р· РЅРµ РІС‹РїР°Р»Рё') + '</div>';
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
function clearLocalSessionState() {
  cancelPendingDeathOverlay();
  clearDeathCameraLock();
  clearHitScreenOverlayFx();
  localDeathStateLocked = false;
  pendingManualExitRequested = false;
  commentatorState.lastEventAt.clear();
  commentatorState.lastKillsRemarkAt = 0;
  commentatorState.lastLowHpAt = 0;
  commentatorState.lastRecoveryAt = 0;
  commentatorState.lastTitle = '';
  commentatorState.lastText = '';
  commentatorState.lastPlayerCount = 0;
  commentatorState.lastThreatLevel = 1;
  commentatorState.lastBossAlive = false;
  commentatorState.lastBossPortalAt = 0;
  commentatorState.lastBossCountdownBucket = 0;
  commentatorState.lastBossKills = 0;
  commentatorState.lastPvpLeaderId = '';
  commentatorState.lastKillMilestone = 0;
  commentatorState.lastMatchPulseBucket = 0;
  commentatorState.lastSkillRanks.clear();
  commentatorState.wasLowHp = false;
  if (commentatorSpeech.pendingTimer) {
    window.clearTimeout(commentatorSpeech.pendingTimer);
    commentatorSpeech.pendingTimer = 0;
  }
  commentatorSpeech.lastKey = '';
  commentatorSpeech.activeSinceAt = 0;
  commentatorSpeech.lastQueuedText = '';
  commentatorSpeech.activeKey = '';
  commentatorSpeech.activeText = '';
  commentatorSpeech.queue = [];
  commentatorSpeech.recentKeys.clear();
  commentatorSpeech.seq += 1;
  if (commentatorSpeech.supported) window.speechSynthesis.cancel();
  if (commentatorTitleEl) commentatorTitleEl.textContent = 'РњР°С‚С‡ Р·Р°РіСЂСѓР¶Р°РµС‚СЃСЏ. РЎР°СЂРєР°Р·Рј РїСЂРѕРіСЂРµРІР°РµС‚СЃСЏ.';
  if (commentatorTextEl) commentatorTextEl.textContent = 'РљР°Рє С‚РѕР»СЊРєРѕ РЅР° РєР°СЂС‚Рµ РЅР°С‡РЅС‘С‚СЃСЏ С…РѕС‚СЊ РєР°РєР°СЏ-С‚Рѕ РґСЂР°РјР°, СЏ СЃСЂР°Р·Сѓ СЌС‚Рѕ РѕС‚РјРµС‡Сѓ.';
  game.myId = null;
  game.spectating = false;
  game.roomCode = null;
  game.state = null;
  game.netSnapshots = [];
  game.sampledNet = null;
  game.nextInputSeq = 0;
  game.renderPlayers.clear();
  game.renderEnemies.clear();
  game.renderBullets.clear();
  game.renderXpOrbs.clear();
  game.roomStartedAt = 0;
  game.totalEnemyKills = 0;
  game.nextBossAtKills = 50;
  game.nextBossSpawnAt = 0;
  game.bossAlive = false;
  game.roomDifficulty = { level: 1, hpMul: 1, speedMul: 1, damageMul: 1, attackRateMul: 1, spawnIntervalMs: 760 };
  game.mySkillChoices = [];
  prevMyAlive = null;
  sessionStartedAt = 0;
  waitingForFirstState = false;
  waitingForFirstStateSince = 0;
  netStats.pendingPings.clear();
  netStats.rttSamples = [];
  netStats.rttMs = 0;
  netStats.jitterMs = 0;
  netStats.stateDelayMs = 0;
  roomMetaEl.textContent = '';
  weaponMetaEl.textContent = '';
  if (movementMetaEl) movementMetaEl.textContent = '';
  input.jumpQueued = false;
  scoreboardEl.innerHTML = '';
  lastScoreboardHtml = '';
  lastTabScoreboardHtml = '';
  lastBattlePlayers = [];
  playerAliveState.clear();
  setTabScoreboardVisible(false);
  lastLevelupHtml = '';
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  visuals.dodgeWind = [];
  visuals.dodgeWindScheduled = [];
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  visuals.rocketPrev = new Map();
  visuals.dropPrev = new Map();
  visuals.xpOrbPrev = new Map();
  visuals.prevBossAlive = false;
  updateTopCenterHud(Date.now());
  updateBottomHud();
  updateStatsPanel(null);
  updateJumpButtonUi(null);
  immediateInputSendQueued = false;
  chatUi.items = [];
  renderChatMessages();
}

function leaveActiveRoom() {
  if (ws.readyState === WebSocket.OPEN && (game.myId || game.spectating)) {
    sendJson({ type: 'leave' });
  }
  clearLocalSessionState();
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


refreshRoomsBtn?.addEventListener('click', () => {
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('room_search_manual', { source: 'refresh_button' });
  }
  requestRoomsList();
});
refreshRecordsBtn?.addEventListener('click', () => {
  requestRecordsList(recordsUi.page);
});
recordsPrevBtn?.addEventListener('click', () => {
  if (recordsUi.page > 1) requestRecordsList(recordsUi.page - 1);
});
recordsNextBtn?.addEventListener('click', () => {
  if (recordsUi.page < recordsUi.totalPages) requestRecordsList(recordsUi.page + 1);
});

setInterval(() => {
  if (!game.myId && !game.spectating && game.connected) {
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }
}, 5000);
registerSocketHandlers({
open: () => {
  game.connected = true;
  statusEl.textContent = game.embedMode ? 'Connecting live view...' : 'Connected. Create room or join code.';
  game.runtimeInstance.publicBaseUrl = currentWorkerOrigin || APP_ORIGIN;
  renderInstanceMeta();
  void refreshPlayerAuthSession({ silent: true });
  if (!game.embedMode) {
    requestRoomsList();
    requestRecordsList(1);
  }
  sendNetPing();
  if (pendingAutoSpectate && roomCodeInput?.value) {
    pendingAutoSpectate = false;
    joinMode = 'join';
    void sendSpectateRequest(roomCodeInput.value.trim(), { skipRouting: true });
  } else if (pendingAutoJoin && roomCodeInput?.value) {
    pendingAutoJoin = false;
    joinMode = 'join';
    void sendJoinRequest(roomCodeInput.value.trim(), null, { skipRouting: true });
  } else if (pendingAutoCreate) {
    pendingAutoCreate = false;
    joinMode = 'create';
    void sendJoinRequest('', configFromSyncUi(), { skipRouting: true });
  }
},
close: () => {
  game.connected = false;
  netStats.pendingPings.clear();
  if (!restartReloadTimer) {
    statusEl.textContent = 'Disconnected';
  }
},
message: (ev) => {
  const rawSize = typeof ev.data === 'string' ? ev.data.length : 0;
  if (rawSize > 0) markRxBytes(rawSize);

  let msg;
  try { msg = JSON.parse(ev.data); } catch { return; }

  if (msg.type === 'netPong') {
    handleNetPong(msg);
    return;
  }

  if (msg.type === 'devConsole') {
    onDevConsoleServerMessage(msg);
    return;
  }

  if (msg.type === 'chat') {
    pushChatItem(msg);
    return;
  }

  if (msg.type === 'serverRestart') {
    handleServerRestartNotice(msg);
    return;
  }

  if (msg.type === 'accountProgression') {
    if (msg.progression) game.playerAuth.progression = msg.progression;
    if (msg.rewards) {
      latestRunRewards = formatRunRewardsPayload(msg.rewards);
      const cardPieces = latestRunRewards.cards.map((card) => ('+' + card.count + ' ' + card.name));
      statusEl.textContent = trWithFallback('ui.run_rewards.status', 'Run rewards: +{xp} XP, +{shards} shards', { xp: latestRunRewards.gainedXp, shards: latestRunRewards.gainedShards })
        + (latestRunRewards.levelsGained > 0 ? (', +' + latestRunRewards.levelsGained + ' account level') : '')
        + (cardPieces.length > 0 ? (', ' + cardPieces.join(', ')) : '');
      if (joinOverlay.classList.contains('death-cinematic-active')) {
        renderDeathRewardsPanel();
      }
    }
    renderCharacterPicker();
    return;
  }

  if (msg.type === 'welcome') {
    clearJoinFeedback();
    game.spectating = Boolean(msg.spectator);
    game.myId = msg.id || null;
    game.runtimeInstance.instanceId = String(msg.instanceId || '');
    game.runtimeInstance.publicBaseUrl = currentWorkerOrigin || APP_ORIGIN;
    renderInstanceMeta();
    resetNetStats();
    prevMyAlive = true;
    localDeathStateLocked = false;
    pendingManualExitRequested = false;
    clearDeathCameraLock();
    latestRunRewards = null;
    latestDeathSnapshot = null;
    sessionStartedAt = Date.now();
    if (msg.sync) applyRoomSync(msg.sync);
    game.roomCode = msg.roomCode;
    if (msg.gameMode) game.gameMode = normalizeGameMode(msg.gameMode);
    game.skillCatalog = {};
    const catalog = Array.isArray(msg.skillCatalog) ? msg.skillCatalog : [];
    for (const sk of catalog) { if (sk && sk.id) game.skillCatalog[sk.id] = sk; }
    game.renderPlayers.clear();
    game.renderEnemies.clear();
    game.renderBullets.clear();
    game.renderXpOrbs.clear();
    game.netSnapshots = [];
    game.sampledNet = null;
    game.nextInputSeq = 0;
    visuals.enemyPrev = new Map();
    visuals.playerPrev = new Map();
    visuals.blood = [];
    visuals.bloodPuddles = [];
    visuals.gore = [];
    visuals.hitFx = [];
    visuals.muzzle = [];
    visuals.muzzleGroundFlashes = [];
    visuals.bossBlast = [];
    visuals.bloodMist = [];
    visuals.rocketSmoke = [];
    visuals.rocketFire = [];
    visuals.rocketBlast = [];
    visuals.skillBursts = [];
    visuals.skillArcs = [];
    visuals.skillLinks = [];
    visuals.skillLabels = [];
  visuals.dodgeWind = [];
  visuals.dodgeWindScheduled = [];
    visuals.skillCdPrev = new Map();
    visuals.skillOfferPrev = new Map();
    visuals.rocketPrev = new Map();
    visuals.dropPrev = new Map();
    visuals.xpOrbPrev = new Map();
    visuals.prevBossAlive = false;
    roomMetaEl.textContent = `Room: ${msg.roomCode}`;
    if (!game.spectating) copyRoomCodeToClipboard(msg.roomCode, { silent: true });
    statusEl.textContent = game.spectating
      ? `Spectating room ${msg.roomCode} | tick ${roomSync.tickRate}`
      : `Online as ${msg.id} | tick ${roomSync.tickRate}`;
    const pendingJoin = game.analytics?.pendingJoin || null;
    if (!game.spectating && typeof window.cwTrackMetrikaGoal === 'function') {
      const mode = pendingJoin?.mode || (joinMode === 'create' ? 'create' : 'join');
      const source = pendingJoin?.source || 'unknown';
      window.cwTrackMetrikaGoal('room_connected', {
        mode,
        source,
        room_code: msg.roomCode,
      });
      window.cwTrackMetrikaGoal('game_start_success', {
        mode,
        source,
        room_code: msg.roomCode,
      });
      if (mode === 'create') {
        window.cwTrackMetrikaGoal('room_created', {
          source,
          room_code: msg.roomCode,
        });
      } else {
        window.cwTrackMetrikaGoal('room_join_success', {
          source,
          room_code: msg.roomCode,
        });
      }
    }
    if (typeof window.cwClearPendingJoinAnalytics === 'function') {
      window.cwClearPendingJoinAnalytics();
    }
    if (msg.progressionCatalog) game.playerAuth.progressionCatalog = msg.progressionCatalog;
    if (msg.progression) game.playerAuth.progression = msg.progression;
    const heroCatalog = Array.isArray(game.playerAuth?.progressionCatalog?.heroes) ? game.playerAuth.progressionCatalog.heroes : [];
    for (const hero of heroCatalog) {
      const uniqueSkills = Array.isArray(hero?.uniqueSkills) ? hero.uniqueSkills : [];
      for (const skill of uniqueSkills) {
        if (skill?.id) game.skillCatalog[skill.id] = skill;
      }
    }
    applyChatHistory(msg.chatHistory);
    setCommentatorLine(
      game.spectating ? 'РђСЂРµРЅР° СѓР¶Рµ РІ СЌС„РёСЂРµ.' : 'РњР°С‚С‡ РЅР°С‡Р°Р»СЃСЏ. РЎР°РјРѕСѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ С‚РѕР¶Рµ.',
      game.spectating
        ? `РџРѕРґРіР»СЏРґС‹РІР°РµРј Р·Р° РєРѕРјРЅР°С‚РѕР№ ${msg.roomCode} Р±РµР· РїСЂР°РІР° РІРјРµС€Р°С‚СЊСЃСЏ. РЎРјРѕС‚СЂРµС‚СЊ Р±РµР·РѕРїР°СЃРЅРµРµ, С‡РµРј СѓС‡Р°СЃС‚РІРѕРІР°С‚СЊ.`
        : `РљРѕРјРЅР°С‚Р° ${msg.roomCode} Р·Р°РіСЂСѓР¶РµРЅР°. РџРѕСЃРјРѕС‚СЂРёРј, РЅР°СЃРєРѕР»СЊРєРѕ Р±С‹СЃС‚СЂРѕ Р°СЂРµРЅР° РѕР±СЉСЏСЃРЅРёС‚ РІСЃРµРј РїСЂР°РІРёР»Р° С‡РµСЂРµР· Р±РѕР»СЊ.`,
      game.spectating ? 'spectate_welcome' : 'welcome',
      0,
    );
    joinOverlay.style.display = 'none';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
    if (!game.spectating && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'cw-player-run',
        status: 'started',
        roomCode: String(msg.roomCode || ''),
      }, window.location.origin);
    }
    if (game.embedMode && game.spectating) {
      window.parent?.postMessage({
        type: 'cw-live-spectator',
        status: 'welcome',
        roomCode: String(msg.roomCode || ''),
      }, window.location.origin);
    }
    if (msg.me?.activeHero) {
      selectedPlayerClass = sanitizePlayerClass(msg.me.activeHero);
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
    }
    renderCharacterPicker();
    if (msg.me?.name && !game.playerAuth?.player) {
      game.playerAuth.nicknameStatus = {
        nickname: msg.me.name,
        isRegistered: !!msg.me.isRegisteredNickname,
        isOccupied: false,
      };
      renderPlayerAuthUi();
    }
  }

  if (msg.type === 'joinError') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    statusEl.textContent = msg.message;
    setJoinFeedback(msg.message);
    if (game.embedMode) {
      window.parent?.postMessage({
        type: 'cw-live-spectator',
        status: 'error',
        roomCode: String(msg.roomCode || roomCodeInput?.value || ''),
        message: String(msg.message || ''),
      }, window.location.origin);
    }
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      const pendingJoin = game.analytics?.pendingJoin || null;
      window.cwTrackMetrikaGoal('room_join_error', {
        mode: pendingJoin?.mode || joinMode || 'unknown',
        source: pendingJoin?.source || 'unknown',
        room_code: msg.roomCode || pendingJoin?.roomCode || roomCodeInput?.value?.trim()?.toUpperCase() || 'AUTO',
        error_code: String(msg.code || 'unknown'),
      });
    }
    if (!msg.redirectUrl && typeof window.cwClearPendingJoinAnalytics === 'function') {
      window.cwClearPendingJoinAnalytics();
    }
    if (msg.redirectUrl) {
      try {
        const redirectedOrigin = normalizeOrigin(msg.redirectUrl);
        currentWorkerOrigin = redirectedOrigin;
        if (pendingAutoSpectate || game.spectating || game.embedMode) {
          void sendSpectateRequest(msg.roomCode || roomCodeInput?.value || '', { skipRouting: true });
        } else {
          void sendJoinRequest(msg.roomCode || roomCodeInput?.value || '', null, { skipRouting: true });
        }
      } catch {
        statusEl.textContent = msg.message || 'Failed to switch game server.';
        setJoinFeedback(msg.message || 'Failed to switch game server.');
      }
      return;
    }
    if (Number(msg.retryAfterMs) > 0) {
      scheduleClientReload(Number(msg.retryAfterMs), msg.message || 'Server restarting. Reconnecting...');
    }
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
    joinFeedbackEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }

  if (msg.type === 'system') statusEl.textContent = msg.message;
  if (msg.type === 'system') maybeCommentateSystemMessage(msg.message);

  if (msg.type === 'state') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    const s = msg.payload;
    if (game.embedMode && game.spectating) {
      window.parent?.postMessage({
        type: 'cw-live-spectator',
        status: 'ready',
        roomCode: String(s?.roomCode || game.roomCode || ''),
        players: Array.isArray(s?.players) ? s.players.filter((p) => p && !p.isCompanion).length : 0,
        enemies: Array.isArray(s?.enemies) ? s.enemies.length : 0,
      }, window.location.origin);
    }
    onStateNetSample(s.now);
    game.state = s;
    game.world = s.world;
    game.roomCode = s.roomCode;
    game.gameMode = normalizeGameMode(s.gameMode || game.gameMode || 'normal');
    game.roomStartedAt = Number(s.roomStartedAt) || game.roomStartedAt || Date.now();
    game.totalEnemyKills = Number(s.totalEnemyKills) || 0;
    game.nextBossAtKills = Number(s.nextBossAtKills) || game.nextBossAtKills || 50;
    game.nextBossSpawnAt = Number(s.nextBossSpawnAt) || 0;
    game.bossAlive = Boolean(s.bossAlive);
    game.roomDifficulty = s.roomDifficulty || game.roomDifficulty;
    pushNetSnapshot(s);
    syncBulletsFromState(s);
    try {
      processStateFx(s);
    } catch (error) {
      console.error('processStateFx failed', error);
    }
    if (game.bossAlive && typeof window.cwTrackMetrikaGoalOnce === 'function') {
      window.cwTrackMetrikaGoalOnce(`boss_encounter:${s.roomCode}`, 'boss_encounter', {
        room_code: s.roomCode,
        total_enemy_kills: Number(s.totalEnemyKills) || 0,
      });
    }
    if (s.sync) applyRoomSync(s.sync);
    roomMetaEl.textContent = `Room: ${s.roomCode}`;
    updateInGameCommentatorFromState(s);

    game.sortedTrees = (s.decor?.trees || []).slice().sort((a, b) => a.y - b.y);
    updateScoreboard(s.players);

    const seenAliveIds = new Set();
    for (const pl of Array.isArray(s.players) ? s.players : []) {
      if (!pl || pl.isCompanion) continue;
      seenAliveIds.add(pl.id);
      const wasAlive = playerAliveState.get(pl.id);
      if (wasAlive === false && pl.alive) {
        if (typeof spawnSkillBurstFx === 'function') spawnSkillBurstFx(pl.x, pl.y, '#93c5fd', 78);
        if (typeof spawnHitFx === 'function') spawnHitFx(pl.x, pl.y, 24, pl.id === game.myId);
        const rp = game.renderPlayers.get(pl.id);
        if (rp) {
          rp.x = pl.x;
          rp.y = pl.y;
          rp.vx = 0;
          rp.vy = 0;
          rp.alive = true;
        } else {
          game.renderPlayers.set(pl.id, { x: pl.x, y: pl.y, vx: 0, vy: 0, alive: true });
        }
      }
      playerAliveState.set(pl.id, Boolean(pl.alive));
    }
    for (const id of Array.from(playerAliveState.keys())) {
      if (!seenAliveIds.has(id)) playerAliveState.delete(id);
    }

    const me = s.players.find((p) => p.id === game.myId);
    if (me) {
      if (localDeathStateLocked && me.alive) {
        // Keep local player down during death sequence to avoid visible auto-respawn before overlay/menu handoff.
        me.alive = false;
        me.hp = 0;
      }
      updateStatsPanel(me);
      updateJumpButtonUi(me);
      const dodgeCdMeta = Math.max(0, Number(me.dodgeCooldownMs) || 0);
      const jumpMeta = dodgeCdMeta > 0 ? (dodgeCdMeta / 1000).toFixed(1) + 's' : 'ready';
      const mag = Math.max(0, Number(me.magazineAmmo) || 0);
      const magSize = Math.max(1, Number(me.magazineSize) || 1);
      const reserve = me.reserveAmmo === null ? 'в€ћ' : Math.max(0, Number(me.reserveAmmo) || 0);
      const reloadLeft = Math.max(0, Number(me.reloadLeftMs) || 0);
      const reloadText = reloadLeft > 0 ? ` | Reload ${(reloadLeft / 1000).toFixed(1)}s` : '';
      weaponMetaEl.textContent = `Weapon: ${me.weaponLabel} | Mag: ${mag}/${magSize} | Ammo: ${reserve}${reloadText} | Jump: ${jumpMeta}`;
      if (movementMetaEl) {
        const nowMs = Date.now();
        const slowed = (Number(me.slowUntil) || 0) > nowMs;
        const slowLeft = Math.max(0, (Number(me.slowUntil) || 0) - nowMs);
        const dodgeCd = Math.max(0, Number(me.dodgeCooldownMs) || 0);
        const invuln = (Number(me.dodgeInvulnUntil) || 0) > nowMs;
        const dodgeText = dodgeCd > 0 ? (dodgeCd / 1000).toFixed(1) + 's' : 'ready';
        const slowText = slowed ? ('SLOWED ' + (slowLeft / 1000).toFixed(1) + 's') : 'normal';
        movementMetaEl.textContent = `Move: ${slowText} | Jump: ${dodgeText}${invuln ? ' | i-frames' : ''}`;
      }
      if (prevMyAlive === true && !me.alive) {
        window.cwPlaySfx?.('playerDeath', {
          x: me.x,
          y: me.y,
          key: `playerDeath:${me.id || game.myId || 'me'}`,
          minGapMs: 900,
          radius: 1300,
          volume: 1.18,
        });
        const deathsByLives = Math.max(0,
          Math.max(1, Number(me.livesTotal) || 1) - Math.max(0, Number(me.livesLeft) || 0),
        );
        const pvpDeaths = Math.max(0, Number(me.pvpDeaths) || 0);
        const deathResult = {
          kills: Number(me.kills) || 0,
          score: Number(me.score) || 0,
          enemyKills: Number(me.enemyKills) || Number(me.kills) || 0,
          bossKills: Number(me.bossKills) || 0,
          pvpKills: Math.max(0, Number(me.pvpKills) || 0),
          pvpDeaths,
          deaths: Math.max(deathsByLives, pvpDeaths, 1),
          gameMode: normalizeGameMode(game.gameMode || s.gameMode || 'normal'),
          pvpMatchEnded: Boolean(s.pvpMatchEnded),
          heroLevel: Math.max(1, Number(me.level) || 1),
          heroXp: Math.max(0, Number(me.xp) || 0),
          heroXpToNext: Math.max(1, Number(me.xpToNext) || 1),
          roomCode: game.roomCode || s.roomCode || '-',
          survivalSec: Math.max(1, Math.floor((Date.now() - (sessionStartedAt || Date.now())) / 1000)),
        };
        const finalDeath = Boolean(me.isOut) || !Boolean(me.canRespawn);
        if (finalDeath) {
          setCommentaryVariant([
            {
              title: 'Р“РµСЂРѕР№ Р·Р°РєРѕРЅС‡РёР»СЃСЏ СЂР°РЅСЊС€Рµ РјР°С‚С‡Р°.',
              text: 'РљР»Р°СЃСЃРёРєР° Р¶Р°РЅСЂР°: Р°РјР±РёС†РёРё Р±С‹Р»Рё РѕРіСЂРѕРјРЅС‹Рµ, РїРѕР»РѕСЃРєР° С…Рї РѕРєР°Р·Р°Р»Р°СЃСЊ РєРѕСЂРѕС‡Рµ.',
            },
            {
              title: 'Р¤РёРЅР°Р» РїРѕР»СѓС‡РёР»СЃСЏ РєРѕСЂРѕС‚РєРёР№, РЅРѕ РІС‹СЂР°Р·РёС‚РµР»СЊРЅС‹Р№.',
              text: 'РђСЂРµРЅР° РїСЂРёРЅСЏР»Р° СЃРјРµР»РѕСЃС‚СЊ Рє СЃРІРµРґРµРЅРёСЋ Рё С‚СѓС‚ Р¶Рµ РѕС„РѕСЂРјРёР»Р° СѓРІРѕР»СЊРЅРµРЅРёРµ Р±РµР· РІС‹С…РѕРґРЅРѕРіРѕ РїРѕСЃРѕР±РёСЏ.',
            },
            {
              title: 'РќР° СЌС‚РѕРј Р·Р°Р±РµРі РѕС„РёС†РёР°Р»СЊРЅРѕ РїСЂРµРІСЂР°С‚РёР»СЃСЏ РІ СЃС‚Р°С‚РёСЃС‚РёРєСѓ.',
              text: 'РџСѓР±Р»РёРєР° Р°РїР»РѕРґРёСЂСѓРµС‚, РјРѕРЅСЃС‚СЂС‹ РґРѕРµРґР°СЋС‚ СѓРІРµСЂРµРЅРЅРѕСЃС‚СЊ, Р° РєРѕРјРјРµРЅС‚Р°С‚РѕСЂ РґРµР»Р°РµС‚ РїРѕРјРµС‚РєСѓ: Р¶РёС‚СЊ С…РѕС‚РµР»РѕСЃСЊ, РЅРѕ РЅРµ СЃСЂРѕСЃР»РѕСЃСЊ.',
            },
            {
              title: 'Р“РµСЂРѕРёР·Рј РІСЃС‚СЂРµС‚РёР»СЃСЏ СЃ Р±СѓС…РіР°Р»С‚РµСЂРёРµР№ СѓСЂРѕРЅР°.',
              text: 'РЎРѕС€Р»РёСЃСЊ С†РёС„СЂС‹, Рё РІС‹СЏСЃРЅРёР»РѕСЃСЊ РЅРµРїСЂРёСЏС‚РЅРѕРµ: РІС…РѕРґСЏС‰РµРіРѕ Р±С‹Р»Рѕ Р±РѕР»СЊС€Рµ, С‡РµРј С…РѕС‚РµР»РѕСЃСЊ Р±С‹ РґР»СЏ РґР°Р»СЊРЅРµР№С€РµР№ Р¶РёР·РЅРё.',
            },
            {
              title: 'РљР°С‚РєР° Р·Р°РєРѕРЅС‡РёР»Р°СЃСЊ РІ Р»СѓС‡С€РёС… С‚СЂР°РґРёС†РёСЏС… Р°СЂРµРЅС‹.',
              text: 'РЁСѓРјР° Р±С‹Р»Рѕ РјРЅРѕРіРѕ, РїР»Р°РЅРѕРІ РµС‰С‘ Р±РѕР»СЊС€Рµ, Р° РІРѕС‚ Р·Р°РїР°СЃ РїСЂРѕС‡РЅРѕСЃС‚Рё СЃРЅРѕРІР° РїРѕРґРІС‘Р» РєРѕР»Р»РµРєС‚РёРІ РјРµС‡С‚С‹.',
            },
            {
              title: 'РћС‡РµРЅСЊ СЃРјРµР»РѕРµ СЂРµС€РµРЅРёРµ СѓРјРµСЂРµС‚СЊ РёРјРµРЅРЅРѕ Р·РґРµСЃСЊ.',
              text: 'Р—СЂРµР»РёС‰РЅРѕ, РІРЅРµР·Р°РїРЅРѕ Рё СЃ С‚РµРј СЃР°РјС‹Рј РїРѕСЃР»РµРІРєСѓСЃРёРµРј, РєРѕРіРґР° С…РѕС‡РµС‚СЃСЏ РІРёРЅРёС‚СЊ РІСЃС‘, РєСЂРѕРјРµ СЃРѕР±СЃС‚РІРµРЅРЅРѕРіРѕ РїРѕР·РёС†РёРѕРЅРёСЂРѕРІР°РЅРёСЏ.',
            },
          ], 'player_final_death', 6000);
          pendingFinalDeathCommentary = {
            title: commentatorState.lastTitle,
            text: commentatorState.lastText,
          };
          lockCameraForDeathSequence();
          spawnPlayerDeathBloodFx(deathResult);
          if (pendingManualExitRequested) {
            pendingManualExitRequested = false;
            openDeathOverlay(deathResult);
          } else {
            scheduleDeathOverlay(deathResult);
          }
        }
      }
      if (!me.alive && Boolean(me.canRespawn) && !Boolean(me.isOut)) {
        const leftMs = Math.max(0, Number(me.respawnAt) - Date.now());
        const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
        const livesLeft = Math.max(0, Number(me.livesLeft) || 0);
        const tokensLeft = Math.max(0, Number(me.reviveTokens) || 0);
        const extra = livesLeft > 0 ? (` | Lives left: ${livesLeft}`) : (tokensLeft > 0 ? (` | Tokens left: ${tokensLeft}`) : '');
        statusEl.textContent = `Downed. Respawn in ${leftSec}s${extra}`;
        setCommentatorLine('РќРѕРєРґР°СѓРЅ Р±РµР· РїСЂР°РІР° РЅР° РґСЂР°РјР°С‚РёС‡РµСЃРєСѓСЋ РїР°СѓР·Сѓ.', `Р РµСЃРїР°РІРЅ С‡РµСЂРµР· ${leftSec}СЃ. РћС‚Р»РёС‡РЅС‹Р№ РјРѕРјРµРЅС‚ РїРµСЂРµСЃРјРѕС‚СЂРµС‚СЊ СЃРІРѕРё РѕС‚РЅРѕС€РµРЅРёСЏ СЃ РІС…РѕРґСЏС‰РёРј СѓСЂРѕРЅРѕРј.`, 'player_respawn_wait', 5000);
      }
      prevMyAlive = Boolean(me.alive);
    } else {
      if (game.spectating) {
        const featuredPlayer = s.players.find((p) => !p.isCompanion) || null;
        updateStatsPanel(featuredPlayer);
        weaponMetaEl.textContent = featuredPlayer
          ? `${featuredPlayer.name} | ${featuredPlayer.weaponLabel} | HP ${Math.max(0, Math.round(Number(featuredPlayer.hp) || 0))}/${Math.max(1, Math.round(Number(featuredPlayer.maxHp) || 1))}`
          : 'Spectator mode';
        if (movementMetaEl) movementMetaEl.textContent = 'Spectator mode';
      } else {
        updateStatsPanel(null);
        if (movementMetaEl) movementMetaEl.textContent = '';
      }
      updateJumpButtonUi(null);
      prevMyAlive = null;
    }
  }
},
});

void connectGameSocket(APP_ORIGIN);

function buildCurrentInputPayload(includeJump = true) {
  if (!game.connected || !game.myId || !game.state) return null;
  const me = game.state.players.find((p) => p.id === game.myId);
  if (!me) return null;

  let moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  let aimX = input.pointerX + camera.x;
  let aimY = input.pointerY + camera.y;
  let shooting = input.shooting;

  if (mobile.enabled) {
    if (mobile.moveStrength > 0.05) {
      moveX = mobile.moveX * Math.min(1, mobile.moveStrength * 1.15);
      moveY = mobile.moveY * Math.min(1, mobile.moveStrength * 1.15);
    }

    const sx = me.x - camera.x;
    const sy = me.y - camera.y;
    const aimDistWorld = 240;
    const aimDistScreen = 120;

    if (mobile.aimStrength > 0.08) {
      aimX = me.x + mobile.aimX * aimDistWorld;
      aimY = me.y + mobile.aimY * aimDistWorld;
      shooting = mobile.aimStrength > 0.2;
      input.pointerX = sx + mobile.aimX * aimDistScreen;
      input.pointerY = sy + mobile.aimY * aimDistScreen;
    }
  }
  const manualAimOverride = Boolean(input.shooting || (mobile.enabled && mobile.aimStrength > 0.2));

  if (game.autoFireEnabled && !manualAimOverride) {
    const pvpMode = normalizeGameMode(game.gameMode) === 'pvp';
    let nearest = null;
    let bestD2 = Infinity;

    // Monsters are always valid targets.
    for (const e of game.state.enemies || []) {
      const dx = e.x - me.x;
      const dy = e.y - me.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = e;
      }
    }

    // In PvP, include other players into the same nearest-target search.
    if (pvpMode) {
      for (const p of game.state.players || []) {
        if (!p || p.id === me.id || p.isCompanion || !p.alive) continue;
        const dx = p.x - me.x;
        const dy = p.y - me.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          nearest = p;
        }
      }
    }

    if (nearest) {
      aimX = nearest.x;
      aimY = nearest.y;
      shooting = true;
    } else {
      shooting = false;
    }
  }

  return {
    moveX,
    moveY,
    aimX,
    aimY,
    shooting,
    jump: includeJump ? input.jumpQueued : false,
  };
}

function sendInput() {
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) return;
  const payload = buildCurrentInputPayload(true);
  if (!payload) return;
  const seq = game.nextInputSeq + 1;
  game.nextInputSeq = seq;

  sendJson({
    type: 'input',
    seq,
    ...payload,
  });

  input.jumpQueued = false;
}

window.addEventListener('cw:i18n-changed', () => {
  applyMenuButtonGlyph(toggleInfoBtn);
  applyMenuButtonGlyph(joinToggleInfoBtn);
  renderGameVersionHistory();
  renderNewsFeed();
  renderRatingBoard();
  renderProfileRunHistory();
  updateTabScoreboard(lastBattlePlayers);
});

void maybeStartReplayFromUrl();

