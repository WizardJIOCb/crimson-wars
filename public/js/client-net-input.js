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
  if (burger) burger.textContent = '☰';
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
const menuVersionTriggerEl = document.getElementById('menu-version-trigger');
const gameVersionModalEl = document.getElementById('game-version-modal');
const gameVersionCloseBtn = document.getElementById('game-version-close');
const gameVersionBodyEl = document.getElementById('game-version-body');
const deathScreenBloodOverlayEl = document.getElementById('death-screen-blood');
const hitScreenOverlayEl = document.getElementById('hit-screen-overlay');
const mainMenuTabButtons = Array.from(document.querySelectorAll('#main-menu-tabs .main-menu-tab'));
const mainMenuPanels = Array.from(document.querySelectorAll('#join-form [data-menu-panel]'));
let heroFocusId = selectedPlayerClass;
let selectedInventoryFilterKey = 'all';
let currentMainMenuTab = 'play';
let tabScoreboardVisible = false;
let lastTabScoreboardHtml = '';
let lastBattlePlayers = [];
const playerAliveState = new Map();
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
    companionNames: isRu ? 'Ники союзных ботов' : 'Ally bot names',
    companionReserveAmmo: isRu ? 'Патроны союзного бота' : 'Ally bot ammo',
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
    'show-companion-names-toggle': settingsText.companionNames,
    'show-companion-reserve-toggle': settingsText.companionReserveAmmo,
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

const MENU_TAB_IDS = new Set(['play', 'characters', 'skills', 'profile', 'rating', 'news']);
const initialUrlParams = new URLSearchParams(window.location.search);
const initialMenuTabParam = String(initialUrlParams.get('tab') || '').trim().toLowerCase();
const initialMenuTab = MENU_TAB_IDS.has(initialMenuTabParam) ? initialMenuTabParam : 'play';
let pendingManualExitRequested = false;

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
const COMMENTATOR_VOLUME_STORAGE_KEY = 'cw:commentatorVoiceVolume';
const COMMENTATOR_QUEUE_MAX = 8;
const COMMENTATOR_QUEUE_PREVIEW_MAX = 4;
const commentatorSpeech = {
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function',
  enabled: false,
  volume: 0.92,
  lastSpokenAt: 0,
  lastRate: 0,
  activeSinceAt: 0,
  activeItem: null,
  lastKey: '',
  lastQueuedText: '',
  activeKey: '',
  activeText: '',
  pendingTimer: 0,
  volumeRestartTimer: 0,
  seq: 0,
  totalQueued: 0,
  totalStarted: 0,
  totalSpoken: 0,
  totalDropped: 0,
  peakQueueLength: 0,
  recentKeys: new Map(),
  queue: [],
};
let pendingFinalDeathCommentary = null;

try {
  const storedCommentatorTts = localStorage.getItem(COMMENTATOR_TTS_STORAGE_KEY);
  commentatorSpeech.enabled = storedCommentatorTts === null ? true : storedCommentatorTts === '1';
  const storedCommentatorVolume = localStorage.getItem(COMMENTATOR_VOLUME_STORAGE_KEY);
  if (storedCommentatorVolume !== null) {
    commentatorSpeech.volume = Math.max(0, Math.min(1, (Number(storedCommentatorVolume) || 0) / 100));
  }
} catch {
  commentatorSpeech.enabled = true;
}

function setCommentatorLine(title, text, eventKey = 'generic', cooldownMs = 6000, options = {}) {
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
  if (!options?.silent) maybeSpeakCommentary(nextTitle, nextText, key);
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
  if (mod10 === 1 && mod100 !== 11) return 'секунда';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'секунды';
  return 'секунд';
}

function expandCommentarySpeechText(value) {
  return String(value || '')
    .replace(/(\d+)\s*с\b/gi, (_, raw) => `${raw} ${pluralizeRussianSeconds(raw)}`)
    .replace(/(\d+)\s*sec\b/gi, (_, raw) => `${raw} ${pluralizeRussianSeconds(raw)}`)
    .replace(/Lv\s*(\d+)/gi, 'уровень $1');
}

function buildSkillPickCommentaryVariants(skillLabel) {
  const name = String(skillLabel || 'Навык').trim() || 'Навык';
  return [
    { title: `Взяли навык: ${name}.`, text: 'Отлично. Билд только что стал либо сильнее, либо гораздо смешнее. Скоро увидим, какой именно вариант выпал.' },
    { title: `${name} добавлен в арсенал.`, text: 'Очень люблю этот момент: игрок делает серьёзное лицо и выбирает себе новый способ превращать арену в проблему для окружающих.' },
    { title: `${name} официально в билде.`, text: 'Стратегия становится всё умнее на бумаге и всё безумнее в реальном эфире. Именно так и рождаются красивые катастрофы.' },
    { title: `Прокачка ушла в сторону: ${name}.`, text: 'Герой снова сделал выбор между осторожностью и шоу. Судя по атмосфере, шоу победило без особой борьбы.' },
    { title: `${name} выбрали без права на отмену.`, text: 'Комментатор уважает смелость. Психотерапевт этой комнаты, наверное, уважает её чуть меньше.' },
    { title: `Новый трюк в кармане: ${name}.`, text: 'Теперь можно ошибаться ещё техничнее, эффектнее и с гораздо более уверенным выражением лица.' },
    { title: `${name} включён в программу насилия.`, text: 'Билд набирает форму как стендап после третьего эспрессо: громко, резко и с лёгкой угрозой для мебели.' },
    { title: `Скилл-пик зафиксирован: ${name}.`, text: 'Публика делает вид, что это был взвешенный выбор. Мы с вами знаем правду: хотелось просто сделать ещё мощнее и ещё веселее.' },
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
    .replace(/(\d+)\s*[сc](?=[\s.,!?;:)]|$)/giu, (_, raw) => `${raw} ${pluralizeRussianSeconds(raw)}`)
    .replace(/(\d+)\s*sec\b/gi, (_, raw) => `${raw} ${pluralizeRussianSeconds(raw)}`)
    .replace(/Lv\s*(\d+)/gi, '\u0443\u0440\u043e\u0432\u0435\u043d\u044c $1');
}

function buildSkillPickCommentaryVariants(skillLabel) {
  const name = String(skillLabel || '\u043d\u0430\u0432\u044b\u043a').trim() || '\u043d\u0430\u0432\u044b\u043a';
  return [
    { title: `Взяли навык: ${name}.`, text: 'Отлично. Билд только что стал либо сильнее, либо гораздо смешнее. Скоро увидим, какой именно вариант выпал.' },
    { title: `${name} добавлен в арсенал.`, text: 'Игрок делает серьёзное лицо и выбирает себе новый способ превращать арену в проблему для окружающих.' },
    { title: `${name} официально в билде.`, text: 'Стратегия становится умнее на бумаге и безумнее в прямом эфире. Красивые катастрофы так и рождаются.' },
    { title: `Прокачка ушла в сторону: ${name}.`, text: 'Герой снова выбирал между осторожностью и шоу. Судя по атмосфере, шоу победило без особой борьбы.' },
    { title: `${name} выбрали без права на отмену.`, text: 'Комментатор уважает смелость. Психотерапевт этой комнаты, наверное, уважает её чуть меньше.' },
    { title: `Новый трюк в кармане: ${name}.`, text: 'Теперь можно ошибаться техничнее, эффектнее и с гораздо более уверенным выражением лица.' },
    { title: `${name} включён в программу хаоса.`, text: 'Билд набирает форму как стендап после третьего эспрессо: громко, резко и с лёгкой угрозой для мебели.' },
    { title: `Скилл-пик зафиксирован: ${name}.`, text: 'Публика делает вид, что это был взвешенный выбор. Мы с вами знаем правду: хотелось ещё мощнее и ещё веселее.' },
    { title: `Навык ${name} заехал в билд.`, text: 'Теперь у героя есть ещё один повод говорить, что всё было рассчитано. Особенно если через пять секунд начнётся импровизация.' },
    { title: `${name} выбран с лицом профессора хаоса.`, text: 'Серьёзный выбор, серьёзные последствия и абсолютно несерьёзная надежда, что дальше станет спокойнее.' },
    { title: `Берём ${name}.`, text: 'План прост: добавить мощности, сделать вид, что это стратегия, и не смотреть слишком долго на полоску здоровья.' },
    { title: `${name} теперь часть характера.`, text: 'Билд становится похож на резюме человека, который умеет решать проблемы, но предпочитает сначала создать пару новых.' },
    { title: `Плюс один трюк: ${name}.`, text: 'Арена просила осторожности, игрок выбрал спецэффекты. Очень честный диалог поколений.' },
    { title: `${name} принят в команду.`, text: 'Если навык сработает, это гений. Если нет, назовём это экспериментом и быстро сменим тему.' },
    { title: `В меню прокачки победил ${name}.`, text: 'Другие варианты смотрят вслед и делают вид, что не обиделись. Комментатор, конечно, всё видел.' },
    { title: `${name} добавлен в личную коллекцию плохих идей.`, text: 'Плохих в хорошем смысле: громких, полезных и способных устроить на экране маленький пожар.' },
  ];
}

function buildSpectatorSkillPickCommentaryVariants(playerName, skillLabel, level) {
  const who = String(playerName || 'Игрок').trim() || 'Игрок';
  const name = String(skillLabel || 'навык').trim() || 'навык';
  const lvl = Math.max(1, Number(level) || 1);
  return [
    { title: `${who} берёт ${name}.`, text: `Уровень ${lvl}. Билд делает шаг вперёд, а здравый смысл аккуратно отходит к стеночке.` },
    { title: `${who} прокачал ${name}.`, text: `Теперь хаос будет не просто хаосом, а хаосом с подписью и уровнем ${lvl}.` },
    { title: `${name} у ${who} усиливается.`, text: `Уровень ${lvl}. Арена делает вид, что не нервничает, но мы-то слышим этот скрип половиц.` },
    { title: `${who} выбирает ${name}.`, text: 'Классический момент: игрок нажимает кнопку, а комментатор уже представляет, как это красиво выйдет из-под контроля.' },
    { title: `Навык ${name} ушёл к ${who}.`, text: `Уровень ${lvl}. Если это был план, то он стал острее. Если это была импровизация, то она стала дороже.` },
    { title: `${who} добавляет ${name} в рецепт.`, text: 'Получается блюдо под названием “выживание с перцем”. Подавать горячим, желательно не лицом в пол.' },
    { title: `${name} теперь работает на ${who}.`, text: 'Контракт подписан опытом, нервами и лёгкой паникой в глазах ближайших врагов.' },
    { title: `${who} усилил билд через ${name}.`, text: 'Люблю прокачку: пять секунд тишины в меню, и вот уже вся арена звучит как плохая идея с хорошим бюджетом.' },
    { title: `${name} выбран, ${who} доволен.`, text: 'По крайней мере, сейчас доволен. Следующие входящие удары могут внести правки в настроение.' },
    { title: `${who} нажал на ${name}.`, text: `Уровень ${lvl}. Звучит как техническое решение, выглядит как приглашение к шоу.` },
  ];
}

function getCommentatorVoice() {
  if (!commentatorSpeech.supported) return null;
  const voices = Array.isArray(window.speechSynthesis?.getVoices?.()) ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return null;
  const maleNamePattern = /(pavel|aleks|alex|dmit|denis|ivan|nikol|maks|maxim|serg|mikhail|mihail|yuri|юр|иван|павел|дмит|алекс|серг|миха)/i;
  return voices.find((voice) => /^ru(-|_|$)/i.test(String(voice.lang || '')) && maleNamePattern.test(String(voice.name || '')))
    || voices.find((voice) => /russian/i.test(String(voice.name || '')) && maleNamePattern.test(String(voice.name || '')))
    || voices.find((voice) => /^ru(-|_|$)/i.test(String(voice.lang || '')))
    || voices.find((voice) => /russian/i.test(String(voice.name || '')))
    || voices[0]
    || null;
}

function getCommentatorVoiceVolume() {
  return Math.max(0, Math.min(1, Number(commentatorSpeech.volume) || 0));
}

function renderCommentatorVoiceVolumeUi() {
  const percent = Math.round(getCommentatorVoiceVolume() * 100);
  if (commentatorVoiceVolumeEl instanceof HTMLInputElement) {
    commentatorVoiceVolumeEl.value = String(percent);
    commentatorVoiceVolumeEl.disabled = !commentatorSpeech.supported;
    commentatorVoiceVolumeEl.title = percent <= 0
      ? '\u0413\u043e\u043b\u043e\u0441 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0442\u043e\u0440\u0430 \u0432 \u043d\u0443\u043b\u0435'
      : `\u0413\u0440\u043e\u043c\u043a\u043e\u0441\u0442\u044c: ${percent}%`;
  }
  if (commentatorVoiceVolumeValueEl) {
    commentatorVoiceVolumeValueEl.textContent = `${percent}%`;
  }
}

function setCommentatorVoiceVolume(value) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  commentatorSpeech.volume = normalized / 100;
  try {
    localStorage.setItem(COMMENTATOR_VOLUME_STORAGE_KEY, String(normalized));
  } catch {
    // ignore storage failures
  }
  renderCommentatorVoiceVolumeUi();
  scheduleCommentatorVoiceVolumeRestart();
}

function scheduleCommentatorVoiceVolumeRestart() {
  if (!commentatorSpeech.supported || !commentatorSpeech.enabled || game.embedMode || document.hidden) return;
  if (!commentatorSpeech.activeText) return;
  if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) return;
  if (commentatorSpeech.volumeRestartTimer) {
    window.clearTimeout(commentatorSpeech.volumeRestartTimer);
  }
  commentatorSpeech.volumeRestartTimer = window.setTimeout(() => {
    commentatorSpeech.volumeRestartTimer = 0;
    restartActiveCommentarySpeechWithCurrentVolume();
  }, 140);
}

function restartActiveCommentarySpeechWithCurrentVolume() {
  if (!commentatorSpeech.supported || !commentatorSpeech.enabled || !commentatorSpeech.activeText) return;
  const activeText = commentatorSpeech.activeText;
  const activeItem = commentatorSpeech.activeItem || {
    id: commentatorSpeech.totalQueued || 1,
    key: commentatorSpeech.activeKey || 'commentator_volume_restart',
    text: activeText,
    queuedAt: Date.now(),
    urgent: false,
  };
  commentatorSpeech.seq += 1;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore cancel failures
  }
  clearActiveCommentarySpeech();
  if (commentatorSpeech.pendingTimer) {
    window.clearTimeout(commentatorSpeech.pendingTimer);
    commentatorSpeech.pendingTimer = 0;
  }
  if (getCommentatorVoiceVolume() > 0) {
    commentatorSpeech.queue.unshift({
      ...activeItem,
      text: activeText,
      queuedAt: Date.now(),
      restartedForVolume: true,
    });
    while (commentatorSpeech.queue.length > COMMENTATOR_QUEUE_MAX) {
      commentatorSpeech.queue.pop();
      commentatorSpeech.totalDropped += 1;
    }
    commentatorSpeech.pendingTimer = window.setTimeout(() => {
      commentatorSpeech.pendingTimer = 0;
      flushCommentarySpeechQueue();
    }, 90);
  } else {
    window.setTimeout(flushCommentarySpeechQueue, 90);
  }
  renderCommentatorSpeechMonitor();
}

function renderCommentatorVoiceUi() {
  if (commentatorVoiceToggleEl) {
    commentatorVoiceToggleEl.disabled = !commentatorSpeech.supported;
    commentatorVoiceToggleEl.classList.toggle('is-active', commentatorSpeech.supported && commentatorSpeech.enabled);
    commentatorVoiceToggleEl.textContent = commentatorSpeech.supported && commentatorSpeech.enabled ? 'Озвучка: вкл' : 'Озвучка: выкл';
  }
  if (typeof window.syncCommentatorVoiceSettingToggle === 'function') {
    window.syncCommentatorVoiceSettingToggle(
      commentatorSpeech.supported && commentatorSpeech.enabled,
      !commentatorSpeech.supported,
    );
  }
  if (commentatorVoiceStatusEl) {
    commentatorVoiceStatusEl.textContent = !commentatorSpeech.supported
      ? 'Браузер не дал speech synthesis для озвучки.'
      : (commentatorSpeech.enabled ? 'Комментатор теперь говорит вслух.' : 'Нажми, чтобы комментатор начал говорить вслух.');
  }
  if (commentatorVoiceToggleEl) {
    commentatorVoiceToggleEl.textContent = commentatorSpeech.supported && commentatorSpeech.enabled
      ? '\u041e\u0437\u0432\u0443\u0447\u043a\u0430: \u0432\u043a\u043b'
      : '\u041e\u0437\u0432\u0443\u0447\u043a\u0430: \u0432\u044b\u043a\u043b';
    commentatorVoiceToggleEl.title = commentatorSpeech.enabled
      ? '\u0412\u044b\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043e\u0437\u0432\u0443\u0447\u043a\u0443 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0442\u043e\u0440\u0430'
      : '\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043e\u0437\u0432\u0443\u0447\u043a\u0443 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0442\u043e\u0440\u0430';
  }
  if (commentatorVoiceStatusEl) {
    commentatorVoiceStatusEl.textContent = !commentatorSpeech.supported
      ? '\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u0434\u0430\u043b speech synthesis \u0434\u043b\u044f \u043e\u0437\u0432\u0443\u0447\u043a\u0438.'
      : (commentatorSpeech.enabled
        ? '\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0442\u043e\u0440 \u0433\u043e\u0442\u043e\u0432. \u041e\u0447\u0435\u0440\u0435\u0434\u044c \u0440\u0430\u0441\u0442\u0435\u0442 - \u0442\u0435\u043c\u043f \u0443\u0441\u043a\u043e\u0440\u044f\u0435\u0442\u0441\u044f.'
        : '\u041d\u0430\u0436\u043c\u0438, \u0447\u0442\u043e\u0431\u044b \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0442\u043e\u0440 \u043d\u0430\u0447\u0430\u043b \u0433\u043e\u0432\u043e\u0440\u0438\u0442\u044c \u0432\u0441\u043b\u0443\u0445.');
  }
  renderCommentatorVoiceVolumeUi();
  renderCommentatorSpeechMonitor();
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
  if (commentatorSpeech.volumeRestartTimer) {
    window.clearTimeout(commentatorSpeech.volumeRestartTimer);
    commentatorSpeech.volumeRestartTimer = 0;
  }
  if (!commentatorSpeech.enabled && commentatorSpeech.supported) {
    commentatorSpeech.seq += 1;
    commentatorSpeech.lastQueuedText = '';
    clearActiveCommentarySpeech();
    commentatorSpeech.queue = [];
    window.speechSynthesis.cancel();
  }
  trimCommentarySpeechQueue();
  renderCommentatorSpeechMonitor();
  renderCommentatorVoiceUi();
}
window.setCommentatorVoiceEnabled = setCommentatorVoiceEnabled;
window.setCommentatorVoiceVolume = setCommentatorVoiceVolume;
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
  return /final_death|player_final_death|death|boss|downed|respawn_wait|respawn|critical|low hp|нокаут|нокдаун|умер|смерт|босс/.test(sample);
}

function getCommentatorSpeechRate(pressure = null) {
  const queuePressure = Number.isFinite(Number(pressure))
    ? Math.max(0, Number(pressure) || 0)
    : Math.max(0, commentatorSpeech.queue.length + (commentatorSpeech.activeText ? 1 : 0));
  const extra = Math.max(0, queuePressure - 1);
  return Math.max(1.7, Math.min(3.35, 2.18 + Math.min(1.17, extra * 0.17)));
}

function summarizeCommentarySpeechText(value, maxLen = 74) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1)).trim()}...`;
}

function renderCommentatorSpeechMonitor() {
  const queueCount = commentatorSpeech.queue.length;
  const activeItem = commentatorSpeech.activeItem || null;
  const activeId = activeItem?.id ? `#${activeItem.id}` : (commentatorSpeech.activeText ? '#' : '-');
  const rate = commentatorSpeech.activeText
    ? Math.max(0, Number(commentatorSpeech.lastRate) || getCommentatorSpeechRate())
    : getCommentatorSpeechRate(queueCount);
  if (commentatorQueueRateEl) commentatorQueueRateEl.textContent = commentatorSpeech.enabled ? `x${rate.toFixed(2)}` : 'off';
  if (commentatorQueueCurrentEl) commentatorQueueCurrentEl.textContent = activeId;
  if (commentatorQueueCountEl) commentatorQueueCountEl.textContent = String(queueCount);
  if (commentatorQueueTotalEl) {
    commentatorQueueTotalEl.textContent = `${commentatorSpeech.totalQueued}/${commentatorSpeech.totalSpoken}`;
    commentatorQueueTotalEl.title = `Queued total: ${commentatorSpeech.totalQueued}; spoken: ${commentatorSpeech.totalSpoken}; dropped: ${commentatorSpeech.totalDropped}; peak: ${commentatorSpeech.peakQueueLength}`;
  }
  if (!commentatorQueueListEl) return;
  const rows = [];
  if (activeItem?.text || commentatorSpeech.activeText) {
    rows.push({
      cls: 'is-active',
      label: '\u0413\u043e\u0432\u043e\u0440\u0438\u0442',
      text: activeItem?.text || commentatorSpeech.activeText,
    });
  }
  for (const item of commentatorSpeech.queue.slice(0, COMMENTATOR_QUEUE_PREVIEW_MAX)) {
    rows.push({
      cls: item.urgent ? 'is-urgent' : '',
      label: item.urgent ? '\u0421\u0440\u043e\u0447\u043d\u043e' : `#${item.id || '?'}`,
      text: item.text,
    });
  }
  if (!rows.length) {
    commentatorQueueListEl.innerHTML = '<div class="commentator-queue-empty">\u041e\u0447\u0435\u0440\u0435\u0434\u044c \u043e\u0437\u0432\u0443\u0447\u043a\u0438 \u043f\u0443\u0441\u0442\u0430</div>';
    return;
  }
  const hiddenCount = Math.max(0, queueCount - COMMENTATOR_QUEUE_PREVIEW_MAX);
  const itemsHtml = rows.map((row) => `
    <div class="commentator-queue-item ${row.cls}">
      <span class="commentator-queue-label">${escapeHtml(row.label)}</span>
      <span class="commentator-queue-text">${escapeHtml(summarizeCommentarySpeechText(row.text))}</span>
    </div>
  `).join('');
  const moreHtml = hiddenCount > 0
    ? `<div class="commentator-queue-more">+\u0435\u0449\u0435 ${hiddenCount}</div>`
    : '';
  commentatorQueueListEl.innerHTML = itemsHtml + moreHtml;
}

function clearActiveCommentarySpeech({ countDropped = false } = {}) {
  if (countDropped && (commentatorSpeech.activeText || commentatorSpeech.activeItem)) {
    commentatorSpeech.totalDropped += 1;
  }
  commentatorSpeech.activeSinceAt = 0;
  commentatorSpeech.activeKey = '';
  commentatorSpeech.activeText = '';
  commentatorSpeech.activeItem = null;
  commentatorSpeech.lastRate = 0;
  renderCommentatorSpeechMonitor();
}

function trimCommentarySpeechQueue() {
  while (commentatorSpeech.queue.length > COMMENTATOR_QUEUE_MAX) {
    commentatorSpeech.queue.shift();
    commentatorSpeech.totalDropped += 1;
  }
  commentatorSpeech.peakQueueLength = Math.max(commentatorSpeech.peakQueueLength, commentatorSpeech.queue.length);
}

function flushCommentarySpeechQueue() {
  renderCommentatorSpeechMonitor();
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
  const speechRate = getCommentatorSpeechRate(commentatorSpeech.queue.length + 1);
  const nextItem = commentatorSpeech.queue.shift();
  if (!nextItem?.text) return;
  const { key, text: queuedText } = nextItem;
  const spokenText = expandCommentarySpeechText(queuedText);
  const speakSeq = ++commentatorSpeech.seq;
  commentatorSpeech.activeSinceAt = Date.now();
  commentatorSpeech.activeKey = key || '';
  commentatorSpeech.activeText = spokenText;
  commentatorSpeech.activeItem = { ...nextItem, text: spokenText };
  commentatorSpeech.totalStarted += 1;
  commentatorSpeech.lastRate = speechRate;
  renderCommentatorSpeechMonitor();
  const voice = getCommentatorVoice();
  const utterance = new SpeechSynthesisUtterance(spokenText);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'ru-RU';
  } else {
    utterance.lang = 'ru-RU';
  }
  utterance.rate = speechRate;
  utterance.pitch = 0.92;
  utterance.volume = getCommentatorVoiceVolume();
  utterance.onstart = () => {
    if (speakSeq !== commentatorSpeech.seq) return;
    commentatorSpeech.lastSpokenAt = Date.now();
    renderCommentatorSpeechMonitor();
  };
  utterance.onend = () => {
    if (speakSeq !== commentatorSpeech.seq) return;
    commentatorSpeech.totalSpoken += 1;
    clearActiveCommentarySpeech();
    window.setTimeout(flushCommentarySpeechQueue, 40);
  };
  utterance.onerror = () => {
    if (speakSeq !== commentatorSpeech.seq) return;
    clearActiveCommentarySpeech();
    window.setTimeout(flushCommentarySpeechQueue, 40);
  };
  try {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  } catch {
    clearActiveCommentarySpeech();
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
  const queueItem = {
    id: commentatorSpeech.totalQueued + 1,
    key,
    text: spokenText,
    queuedAt: now,
    urgent,
  };
  commentatorSpeech.totalQueued = queueItem.id;
  if (urgent) {
    commentatorSpeech.totalDropped += commentatorSpeech.queue.length;
    commentatorSpeech.queue = [queueItem];
    if (commentatorSpeech.activeText) {
      commentatorSpeech.seq += 1;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancel failures
      }
      clearActiveCommentarySpeech({ countDropped: true });
    }
  } else {
    commentatorSpeech.queue.push(queueItem);
    trimCommentarySpeechQueue();
  }
  commentatorSpeech.peakQueueLength = Math.max(commentatorSpeech.peakQueueLength, commentatorSpeech.queue.length);
  renderCommentatorSpeechMonitor();
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
    const weaponName = key.replace(/^.*weapon_pick_/, '').replace(/[_-]+/g, ' ').trim() || 'оружие';
    const isSmg = /\bsmg\b|пп|пистолет.?пулем/.test(weaponName);
    const isShotgun = /shotgun|дроб/.test(weaponName);
    const isSniper = /sniper|снайпер/.test(weaponName);
    const isPistol = /pistol|пистолет/.test(weaponName);
    if (isSmg) return [
      { title: 'SMG пошёл в руки.', text: 'Теперь точность становится философским вопросом, зато темп звучит как спор на повышенных оборотах.' },
      { title: 'Пистолет-пулемёт в эфире.', text: 'Герой выбрал режим “много маленьких аргументов подряд”. Монстрам рекомендуется не перебивать.' },
      { title: 'SMG включил скороговорку.', text: 'Ствол говорит быстро, герой двигается быстрее, здравый смысл просит субтитры.' },
      { title: 'Скорострельность прибыла.', text: 'Если не попадём первым выстрелом, у нас есть ещё двадцать попыток объяснить позицию.' },
      { title: 'SMG делает атмосферу нервнее.', text: 'Очень деловой инструмент для тех, кто хочет промахиваться статистически убедительно.' },
      { title: 'Пулемётный режим открыт.', text: 'Арена получает аудиодорожку из паники, металла и маленьких быстрых решений.' },
      { title: 'SMG взял микрофон.', text: 'Теперь комментатору придётся говорить быстрее, чтобы не отставать от количества выстрелов.' },
      { title: 'Скорость важнее пафоса.', text: 'SMG напоминает: иногда стиль это просто очень много пуль за короткий срок.' },
      { title: 'Герой нашёл кнопку “часто”.', text: 'Нажимать её будет приятно. Контролировать последствия будет уже отдельным жанром.' },
      { title: 'SMG в деле.', text: 'Монстры ещё не поняли, что началось, но уже получили первые тезисы доклада.' },
    ];
    if (isShotgun) return [
      { title: 'Дробовик вышел на близкий разговор.', text: 'Это оружие не спорит издалека. Оно подходит и говорит всё сразу, крупным шрифтом.' },
      { title: 'Shotgun принят в семью.', text: 'Теперь каждый промах будет громким, а каждое попадание будет звучать как закрытая дверь.' },
      { title: 'Дробовик любит личные границы.', text: 'Точнее, любит их нарушать. Очень громко и с убедительным разлётом аргументов.' },
      { title: 'Ближний бой стал громче.', text: 'Монстрам лучше держать дистанцию. Они, конечно, не будут, поэтому будет красиво.' },
      { title: 'Герой нашёл дробовик.', text: 'Это тот редкий момент, когда “подойти поближе” звучит как угроза и план одновременно.' },
      { title: 'Shotgun заряжен настроением.', text: 'Настроение у него простое: все вопросы решать одним широким жестом.' },
      { title: 'Дробь пошла в эфир.', text: 'Комментатор слышит уверенность, арена слышит шум, враги слышат плохие новости.' },
      { title: 'Дробовик добавил драму.', text: 'Теперь каждый коридор выглядит как приглашение к неприятному диалогу.' },
      { title: 'Большой хлопок в маленьком радиусе.', text: 'Идеально для ситуаций, где тактика закончилась, а эмоции только начались.' },
      { title: 'Shotgun говорит коротко.', text: 'Но так громко, что даже статистика делает шаг назад.' },
    ];
    if (isSniper) return [
      { title: 'Снайперка в руках.', text: 'Теперь можно решать проблемы с такого расстояния, где совесть уже плохо добивает.' },
      { title: 'Sniper добавлен в эфир.', text: 'Герой выбрал стиль “одно мнение, но очень убедительное”.' },
      { title: 'Дальняя дистанция открыта.', text: 'Монстры ещё идут, а у них уже есть неприятное предчувствие в районе головы.' },
      { title: 'Снайперский аргумент найден.', text: 'Редкий случай, когда пауза перед выстрелом звучит страшнее самой стрельбы.' },
      { title: 'Sniper просит тишины.', text: 'Арена, конечно, не даст. Но самоуверенность красивая.' },
      { title: 'Один выстрел, много смысла.', text: 'Снайперка напоминает: иногда минимализм тоже может быть грубым.' },
      { title: 'Герой взял длинную мысль.', text: 'Она летит далеко, бьёт больно и плохо воспринимает критику.' },
      { title: 'Снайперский режим активен.', text: 'Теперь промахи будут редкими, заметными и эмоционально дорогими.' },
      { title: 'Sniper смотрит вдаль.', text: 'И даль, если честно, уже немного нервничает.' },
      { title: 'Точность получила микрофон.', text: 'Если попадёт, будет красиво. Если нет, сделаем вид, что это был предупредительный.' },
    ];
    if (isPistol) return [
      { title: 'Пистолет снова в кадре.', text: 'Скромно, честно, без лишнего пафоса. Как бутерброд в мире боевой кулинарии.' },
      { title: 'Pistol держит базу.', text: 'Не самый громкий инструмент, зато всегда рядом, когда дорогие игрушки заканчивают патроны.' },
      { title: 'Пистолет выбран.', text: 'Классика жанра: маленький ствол, большие надежды, средняя тревожность.' },
      { title: 'Базовый аргумент готов.', text: 'Пистолет не обещает чудес. Он просто приходит на работу и делает “пиф”.' },
      { title: 'Pistol без лишнего шоу.', text: 'Иногда выживание начинается с простого: нажимать, отходить, не спорить с толпой лицом.' },
      { title: 'Пистолет звучит спокойно.', text: 'Это спокойствие, правда, держится ровно до первого окружения.' },
      { title: 'Герой вернулся к классике.', text: 'Когда всё сложное закончилось, остаётся честная маленькая машинка для проблем.' },
      { title: 'Pistol показывает характер.', text: 'С виду скромный, но в хороших руках способен испортить день очень многим.' },
      { title: 'Пистолет в деле.', text: 'Не роскошь, не фейерверк, зато понятный язык для разговора с ближайшими неприятностями.' },
      { title: 'Базовый набор выживания активен.', text: 'Пистолет, ноги и надежда. Комплект сомнительный, но исторически рабочий.' },
    ];
    return [
      { title: 'Новое оружие в руках.', text: 'Арена выдала инструмент, герой выдал уверенность, последствия уже оформляют заявку.' },
      { title: 'Ствол найден.', text: 'Это всегда приятно: ещё одна железка, которая может превратить план в шум.' },
      { title: 'Оружие вступает в эфир.', text: 'Публика ждёт тест, враги ждут плохо, комментатор ждёт материал для сарказма.' },
      { title: 'Лут дал новый аргумент.', text: 'Главное теперь не перепутать аргумент с самоуверенностью. Хотя кто нас остановит.' },
      { title: 'Герой обновил комплект боли.', text: 'Старые ошибки теперь можно совершать новым способом. Прогресс, как ни крути.' },
      { title: 'Новая железка принята.', text: 'Она пока блестит и молчит. Скоро будет блестеть, шуметь и делать вид, что так надо.' },
      { title: 'Оружейный слот оживился.', text: 'Надежда стала тяжелее, громче и потенциально опаснее для всех рядом.' },
      { title: 'Арсенал стал интереснее.', text: 'Интереснее не значит безопаснее. Но мы же тут не за безопасностью.' },
    ];
  }
  if (key.startsWith('boss_countdown')) return [
    { title: 'Босс уже почти на пороге.', text: 'Последние секунды спокойствия. Можно собраться, можно драматично моргнуть в камеру.' },
    { title: 'Начальство скоро выйдет в зал.', text: 'Если у кого-то был план, сейчас самое время вспомнить хотя бы его название.' },
    { title: 'Отсчёт пахнет проблемами.', text: 'Арена аккуратно подаёт сигнал: дальше будет не фарм, а собеседование на выживание.' },
    { title: 'До босса осталось совсем немного.', text: 'Комментатор рекомендует глубокий вдох. Арена рекомендует не рассчитывать на рекомендации.' },
    { title: 'Большая встреча уже рядом.', text: 'Все делают вид, что готовы. Особенно те, кто не готов вообще.' },
  ];
  if (key.includes('skill_pick')) return [
    { title: 'Навык подобран, самооценка выросла.', text: 'Теперь билд выглядит умнее, чем пять секунд назад. Правда, враги это тоже заметили и уже пишут жалобу.' },
    { title: 'Герой нашёл новую кнопку надежды.', text: 'Очень полезно: нажимаешь, становится веселее, опаснее и почему-то громче.' },
    { title: 'Прокачка зашла в организм.', text: 'Арена сделала вид, что не испугалась, но где-то в коде у врагов дрогнуло колено.' },
    { title: 'Новый навык в кармане.', text: 'Карман теперь важничает, герой строит планы, баланс нервно проверяет страховку.' },
    { title: 'Билд получил свежий соус.', text: 'Было остро, стало ещё острее. Где-то рядом враг уже пожалел, что умеет ходить.' },
    { title: 'Герой апгрейднулся без лишней скромности.', text: 'Правильный настрой: если уж выживать, то с эффектами и ощущением незаконного преимущества.' },
    { title: 'Меню умений снова принесло характер.', text: 'Игрок выбрал кнопку, а судьба уже открыла блокнот для замечаний.' },
    { title: 'Прокачка делает шоу толще.', text: 'Теперь у забега больше механик, больше надежды и больше способов красиво ошибиться.' },
    { title: 'Навык принят без лишних вопросов.', text: 'Вопросы появятся позже, когда вся эта красота начнёт работать рядом с лицом героя.' },
    { title: 'Билд получил новую специю.', text: 'Если станет вкусно, скажем “так и планировали”. Если остро, тоже скажем “так и планировали”.' },
    { title: 'Выбор умения засчитан.', text: 'Это тот момент, когда стратегия надевает солнечные очки и делает вид, что контролирует хаос.' },
  ];
  if (key.includes('kill_milestone') || key.startsWith('kills_')) return [
    { title: 'Счётчик врагов бодро разгоняется.', text: 'На арене снова минус пачка проблем и плюс пачка самоуверенности.' },
    { title: 'Убийства идут плотным графиком.', text: 'Если бы у хаоса был бухгалтер, он бы сейчас нервно обновлял таблицу.' },
    { title: 'Темп мясорубки приличный.', text: 'Герой не просто выживает, он ещё и делает это с производственным планом.' },
    { title: 'Враги исчезают с подозрительной регулярностью.', text: 'Очень бодрый забег. Очень плохой день для всего, что решило подойти ближе.' },
    { title: 'Арена считает потери и делает вид, что всё нормально.', text: 'Мы тоже делаем вид. Получается примерно одинаково убедительно.' },
  ];
  if (key.includes('match_pulse')) return [
    { title: 'Матч продолжает делать вид, что всё под контролем.', text: 'Контроль, правда, бегает где-то за кадром, тяжело дышит и просит аптечку.' },
    { title: 'Темп забега держится бодро.', text: 'Это уже не прогулка, это кардио с юридически сомнительной мотивацией.' },
    { title: 'Арена не отпускает зрителей.', text: 'Кажется, этот забег подписал контракт на драму и мелким шрифтом добавил “ещё немного боли”.' },
    { title: 'Эфир живее некоторых планов игроков.', text: 'Планы, конечно, были красивые. Потом пришли враги и провели редактуру.' },
    { title: 'Забег набирает характер.', text: 'Характер нервный, шумный и явно воспитанный в плохом районе.' },
    { title: 'Матч затянулся и обрёл характер.', text: 'Это уже не просто забег, это спор с ареной на повышенных тонах.' },
    { title: 'Эфир держится бодро.', text: 'Где-то между паникой и мастерством родился стиль. Неровный, зато свой.' },
    { title: 'Забег всё ещё жив.', text: 'Комментатор проверил пульс: у матча он есть, у здравого смысла данные противоречивые.' },
    { title: 'Время идёт, проблемы не заканчиваются.', text: 'Редкая стабильность в мире, где всё остальное пытается укусить героя за расписание.' },
    { title: 'Упрямство вышло на первый план.', text: 'Игроки уже достаточно долго в эфире, чтобы арена начала воспринимать это лично.' },
  ];
  if (key.includes('threat_up')) return [
    { title: 'Угроза снова подкрутила ручку.', text: 'Кто-то на арене посмотрел на хаос и сказал: “А можно погромче?”. Можно. Уже сделали.' },
    { title: 'Сложность выросла без спроса.', text: 'Очень по-взрослому: никаких предупреждений, только новые проблемы и старый оптимизм.' },
    { title: 'Арена добавила перца.', text: 'Теперь каждый манёвр пахнет героизмом, паникой и слегка подгоревшей уверенностью.' },
    { title: 'Давление поднимается как плохие новости.', text: 'Медленно, неизбежно и с таким выражением, будто это ещё только разминка.' },
    { title: 'Уровень угрозы полез вверх.', text: 'Игрокам пора делать вид, что именно этого они и хотели от вечера.' },
    { title: 'Угроза поднялась и не извинилась.', text: 'Враги стали злее, воздух гуще, а права на расслабление опять отозвали.' },
    { title: 'Сложность прибавила газу.', text: 'Теперь каждая ошибка стоит дороже, зато выглядит значительно кинематографичнее.' },
    { title: 'Арена повысила температуру.', text: 'Все, кто хотел спокойный фарм, могут написать жалобу прямо на входящий урон.' },
    { title: 'Давление растёт.', text: 'Матч решил, что участникам слишком комфортно. Смелое заявление, конечно.' },
    { title: 'Уровень угрозы снова полез вверх.', text: 'Герои держатся, но арена явно пытается выиграть спор аргументами потяжелее.' },
  ];
  if (key.includes('low_hp')) return [
    { title: 'HP стало декоративным.', text: 'Полоска здоровья ещё есть, но уже скорее для атмосферы, чем для уверенности.' },
    { title: 'Герой играет на тоненького.', text: 'Настолько тоненького, что комментатор боится дышать в сторону монитора.' },
    { title: 'Здоровье ушло в режим экономии.', text: 'Каждый пиксель HP сейчас работает за троих и просит премию.' },
    { title: 'Красная зона машет рукой.', text: 'Не дружелюбно. Скорее как человек, который уже забронировал место в некрологе.' },
    { title: 'Полоска HP стала философской.', text: 'Она задаёт вечный вопрос: “А точно надо было заходить именно сюда?”.' },
    { title: 'Здоровье выглядит как тонкая шутка.', text: 'Полоска HP стала такой скромной, что её уже хочется поддержать морально.' },
    { title: 'Герой живёт на честном слове.', text: 'Честное слово, правда, немного дрожит и просит аптечку.' },
    { title: 'HP ушло в минимализм.', text: 'Красиво, тревожно и совершенно не то направление, куда хотелось бы развивать билд.' },
    { title: 'На экране запахло осторожностью.', text: 'Редкое чувство для этой арены. Надеюсь, игрок хотя бы узнает его в лицо.' },
    { title: 'Полоска здоровья проводит забастовку.', text: 'Она ещё есть, но уже явно недовольна условиями труда.' },
  ];
  if (key.includes('boss_down')) return [
    { title: 'Босс сложился как плохой план.', text: 'Шёл уверенно, шумел дорого, а закончил как баг-репорт: резко, грустно и с пометкой “не воспроизводится”.' },
    { title: 'Начальник арены получил увольнительную.', text: 'Причина простая: слишком много пафоса, слишком мало уклонения от входящего свинца.' },
    { title: 'Босс упал и сделал вид, что так задумано.', text: 'Классическая тактика большого злодея: сначала давить авторитетом, потом лежать и переосмысливать карьеру.' },
    { title: 'Крупная туша покинула чат.', text: 'Игроки подписали заявление на победу всем, что было в инвентаре, включая нервы и сомнительные решения.' },
    { title: 'Босс проиграл спор с реальностью.', text: 'Реальность пришла в виде урона, критов и команды, которая внезапно вспомнила, где кнопка “стрелять”.' },
    { title: 'Минус один ходячий кризис.', text: 'Арена на секунду выдохнула. Потом вспомнила, что это Crimson Wars, и снова начала готовить гадости.' },
    { title: 'Боссу выдали финальные титры.', text: 'Без оваций, зато с лутом. В этом жанре это примерно одно и то же.' },
    { title: 'Большой страшный аргумент закончился.', text: 'Оказалось, если достаточно долго объяснять босса дробью, он начинает соглашаться.' },
    { title: 'Начальство больше не отвечает.', text: 'Вероятно, занято горизонтальным менеджментом и пересмотром политики личного пространства.' },
    { title: 'Босс пал, зрители делают вид, что верили с самого начала.', text: 'Комментатор тоже верил. Просто очень тихо, чтобы не сглазить и не получить по лицу.' },
    { title: 'Босс получил объяснение.', text: 'Короткое, громкое и, судя по результату, довольно убедительное.' },
    { title: 'Начальство снято с должности.', text: 'Редкий случай, когда совещание закончилось хорошо для команды и плохо для босса.' },
    { title: 'Большая проблема легла.', text: 'Комментатор фиксирует: иногда насилие всё-таки решает организационные вопросы.' },
    { title: 'Босс больше не спорит.', text: 'Возможно, потому что аргументы игроков оказались слишком громкими.' },
    { title: 'Главный пункт повестки закрыт.', text: 'Босс пришёл с амбициями, ушёл с выводами. Выводы, правда, уже не озвучит.' },
    { title: 'Крупная цель официально отменена.', text: 'Команда подписала протокол победы пулями, навыками и нервной координацией.' },
    { title: 'Боссу объяснили правила эфира.', text: 'Правила простые: пришёл красиво, упал громко, оставил лут и неприятные воспоминания.' },
  ];
  if (key.includes('join_room') || key.includes('players_up')) return [
    { title: 'На арену зашёл новый оптимист.', text: 'Всегда приятно видеть человека, который пока ещё верит в аккуратный забег.' },
    { title: 'Состав стал плотнее.', text: 'Больше игроков, больше планов и больше людей, которые будут говорить “я прикрывал”.' },
    { title: 'В эфир добавили свежую пару рук.', text: 'Арена уже улыбается так, будто приготовила для них отдельную форму отчёта о боли.' },
    { title: 'Подкрепление прибыло.', text: 'Теперь у хаоса появилась командная версия, с синхронными ошибками и общим энтузиазмом.' },
    { title: 'Комната стала люднее.', text: 'Это повышает шансы на спасение и на коллективное “а кто это сделал?”.' },
    { title: 'Новый игрок в кадре.', text: 'Пока выглядит уверенно. Подождём первый плотный контакт с реальностью.' },
    { title: 'В мясорубку вошёл ещё один доброволец.', text: 'Юридически это смелость, эмоционально это очень интересный выбор.' },
    { title: 'Аудитория получила нового героя.', text: 'Герой пока не знает, насколько буквально арена воспринимает слово “испытание”.' },
  ];
  if (key.includes('leave_room') || key.includes('players_down')) return [
    { title: 'Состав поредел.', text: 'Кто-то решил, что жизнь вне арены тоже имеет неплохой геймплей.' },
    { title: 'Один участник покинул шоу.', text: 'Комментатор не осуждает. Комментатор просто делает паузу ровно такой длины, чтобы всё было понятно.' },
    { title: 'Комната стала тише.', text: 'Не безопаснее, конечно. Просто тише. Это разные жанры самообмана.' },
    { title: 'Минус один голос в общем плане.', text: 'План от этого не стал хуже. Он и до этого был, скажем мягко, гибким.' },
    { title: 'Игрок ушёл из эфира.', text: 'Редкий случай, когда горизонтальное положение удалось предотвратить заранее.' },
    { title: 'Добровольная эвакуация зафиксирована.', text: 'Арена слегка обиделась, но быстро найдёт, на ком выместить чувства.' },
    { title: 'Один билет наружу использован.', text: 'Остальные продолжают аттракцион под названием “зато опыт капает”.' },
  ];
  if (key.includes('boss_portal')) return [
    { title: 'Портал босса открылся и сразу пожалел всех.', text: 'Это тот самый дверной звонок, после которого дом делает вид, что его нет дома.' },
    { title: 'На карте появилась дырка в спокойствии.', text: 'Из неё, по традиции жанра, выйдет не доставка пиццы, а корпоративная претензия с полоской здоровья.' },
    { title: 'Портал мигает как предупреждение от судьбы.', text: 'Судьба обычно не мигает просто так. Она мигает, когда уже принесла босса и ищет розетку.' },
    { title: 'Арене стало мало обычных проблем.', text: 'Открыт портал для проблемы премиум-класса: больше рост, хуже характер, громче шаги.' },
    { title: 'Боссу включили навигатор.', text: 'Маршрут построен: через панику, мимо аптечек, прямо в центр коллективного “ой”.' },
    { title: 'Портал светится как плохая идея.', text: 'Но очень красивая плохая идея. Игроки, конечно, сейчас попробуют её потрогать лицом.' },
    { title: 'Вход для большого гостя готов.', text: 'Ковровой дорожки нет, зато есть пули, страх и несколько героев с завышенной самооценкой.' },
    { title: 'Портал открылся с выражением “ну всё”.', text: 'Редкий случай, когда геометрия на карте выглядит более угрожающе, чем налоговая проверка.' },
    { title: 'Портал босса открылся.', text: 'Это не декорация. Это дверь, за которой у баланса начинается тяжёлый характер.' },
    { title: 'Большая проблема уже на подходе.', text: 'Игроки ещё могут сделать вид, что это часть плана. Очень короткое окно, но могут.' },
    { title: 'Арена открыла служебный вход для босса.', text: 'Сервис, конечно, сомнительный, но пунктуальность пугающе хорошая.' },
    { title: 'Портал светится недобрыми намерениями.', text: 'В такие моменты даже лут лежит как-то напряжённо.' },
    { title: 'Босс получил приглашение.', text: 'К сожалению, RSVP у него всегда “иду и порчу вечер”.' },
    { title: 'Открылась дверь в крупные неприятности.', text: 'Теперь фарм выглядит не как подготовка, а как последняя попытка не паниковать.' },
    { title: 'На карте включился портал.', text: 'Это арена вежливо сообщает, что разминка закончилась без согласования с игроками.' },
  ];
  if (key.includes('boss_spawn') || key.includes('boss_arrived')) return [
    { title: 'Босс материализовался с претензией.', text: 'Вид у него такой, будто он пришёл не драться, а закрывать квартальный план по унижению игроков.' },
    { title: 'Главная проблема вечера вышла на смену.', text: 'Большая, злая и явно без уважения к личному пространству, графику сна и медицинской страховке.' },
    { title: 'Босс в кадре, всем пристегнуть эмоции.', text: 'Сейчас начнётся часть забега, где даже уверенные игроки вспоминают слово “мама”.' },
    { title: 'На арену зашёл владелец плохого настроения.', text: 'Он не представился, но полоска здоровья намекает: знакомство будет долгим и громким.' },
    { title: 'Появился босс, атмосфера резко стала дороже.', text: 'Бюджет на спецэффекты вырос, бюджет на спокойствие игроков был украден ещё на входе.' },
    { title: 'Начальство прибыло без записи.', text: 'Очень невежливо, очень опасно и, чего уж там, довольно эффектно для прямого эфира.' },
    { title: 'Босс вышел как финальный аргумент.', text: 'Теперь у игроков два варианта: красиво победить или очень познавательно бегать кругами.' },
    { title: 'Крупная неприятность вступила в переговоры.', text: 'Переговоры, судя по позе, будут вестись ударами, рывками и полным отсутствием дипломатии.' },
    { title: 'Вот и он, ходячий дедлайн.', text: 'Только вместо писем от менеджера у него лапы, ярость и неприлично длинная полоска здоровья.' },
    { title: 'Босс пришёл проверить, кто тут слишком хорошо живёт.', text: 'Спойлер: по мнению босса, слишком хорошо живут вообще все, кто ещё вертикален.' },
    { title: 'Босс вышел в эфир.', text: 'Зал просит зрелища, игроки просят дистанцию, босс не принимает заявки.' },
    { title: 'Главный гость вечера прибыл.', text: 'Очень уверенная походка для того, кто ещё не видел весь список навыков игроков.' },
    { title: 'На сцене крупная неприятность.', text: 'Сейчас станет ясно, кто качался, а кто просто коллекционировал красивые кнопки.' },
    { title: 'Босс на карте.', text: 'Всем сохранять спокойствие. Особенно тем, кто уже начал бегать кругами.' },
    { title: 'Начальство пришло лично.', text: 'Сразу видно управленческий стиль: мало слов, много входящего урона.' },
    { title: 'Большой силуэт в кадре.', text: 'Комментатор проверил регламент: да, сейчас разрешено нервничать.' },
    { title: 'Босс прибыл без опоздания.', text: 'Пунктуальность отличная, характер отвратительный, драматургия великолепная.' },
    { title: 'Арена выпустила тяжёлую артиллерию.', text: 'Если до этого был хаос, то теперь у хаоса появился менеджер.' },
  ];
  if (key.includes('pvp_elimination')) return [
    { title: 'PvP сказало своё резкое слово.', text: 'Слово было коротким, громким и почему-то сразу отправило одного участника подумать о жизни.' },
    { title: 'На арене минус один спорщик.', text: 'Дискуссия закончилась аргументом, который летел быстрее, чем сожаление.' },
    { title: 'Фраг оформлен с характером.', text: 'Не то чтобы аккуратно, зато убедительно. В этой игре это почти комплимент.' },
    { title: 'Кто-то получил экспресс-перерыв.', text: 'Быстрый, болезненный и с образовательной программой “не стой там больше”.' },
    { title: 'PvP снова напомнило про дистанцию.', text: 'Дистанция была важна. Особенно та, которую игрок уже не успел создать.' },
    { title: 'Фраг оформлен.', text: 'Кто-то проиграл короткую дискуссию с чужим уроном и теперь ждёт следующую попытку.' },
    { title: 'PvP снова объяснило правила.', text: 'Правило первое: если стоишь красиво, это ещё не значит, что стоишь долго.' },
    { title: 'Минус один участник вертикального движения.', text: 'Респавн скоро, самооценка чуть позже.' },
    { title: 'На арене случился аргумент посильнее.', text: 'Очень убедительно, очень быстро и почти без места для возражений.' },
    { title: 'Фраг ушёл в статистику.', text: 'Статистика довольна. Игрок, которого туда записали, вероятно, меньше.' },
    { title: 'Кто-то отправлен на паузу.', text: 'Не трагедия, а образовательный момент с таймером возвращения.' },
    { title: 'PvP-линия стала острее.', text: 'Один точный момент, и чья-то стратегия превратилась в ожидание респавна.' },
  ];
  if (key.includes('player_count')) return [
    { title: 'Состав матча изменился.', text: 'Арена любит динамику: кто-то приходит за славой, кто-то уходит за спокойствием.' },
    { title: 'Команда снова пересобирается.', text: 'Тактика слегка дрожит, зато шоу получает новые вводные.' },
    { title: 'Количество участников поменялось.', text: 'Это всегда добавляет интриги и немного портит все предыдущие планы.' },
    { title: 'В комнате переставили людей.', text: 'Не мебель, конечно, но эффект для хаоса примерно такой же.' },
    { title: 'Состав арены обновился.', text: 'Каждый новый расклад звучит как шанс. Или как предупреждение, если быть честнее.' },
  ];
  if (key.includes('hp_recovered')) return [
    { title: 'Здоровье вернулось из командировки.', text: 'Пришло не всё, но достаточно, чтобы герой снова начал принимать сомнительные решения.' },
    { title: 'HP снова выглядит как аргумент.', text: 'Не железобетонный, конечно, но уже не бумажная салфетка под дождём.' },
    { title: 'Полоска здоровья подросла.', text: 'Комментатор рад, некролог временно закрыт без сохранения.' },
    { title: 'Герой отлип от края пропасти.', text: 'Не ушёл далеко, просто сделал шаг назад и сказал: “Я всё контролирую”.' },
    { title: 'Лечение сработало, самооценка тоже.', text: 'Самое опасное сочетание: чуть больше HP и сразу планы как у бессмертного.' },
    { title: 'Здоровье вернулось к разговору.', text: 'Полоска HP снова похожа на ресурс, а не на тонкую красную подпись к трагедии.' },
    { title: 'Герой выбрался из красной зоны.', text: 'Драма отложена, но не отменена. Арена такие заявки хранит бережно.' },
    { title: 'HP снова выглядит прилично.', text: 'Комментатор почти поверил в стабильность. Почти. Мы же взрослые люди.' },
    { title: 'Состояние стабилизировалось.', text: 'Ещё минуту назад пахло катастрофой, теперь пахнет самоуверенностью. Прогресс.' },
    { title: 'Полоска здоровья ожила.', text: 'Редкий приятный момент: герой восстановился раньше, чем комментатор успел написать некролог.' },
    { title: 'Красная зона отпустила.', text: 'Ненадолго или надолго, узнаем по следующему неудачному манёвру.' },
  ];
  if (key.includes('pvp_leader')) return [
    { title: 'В PvP появился лидер.', text: 'Остальным пора либо догонять, либо готовить убедительную лекцию про “я играл на макро”.' },
    { title: 'Кто-то вырвался вперёд.', text: 'Таблица уважает цифры, а проигрывающие обычно уважают оправдания.' },
    { title: 'Лидерство сменило владельца.', text: 'PvP любит такие моменты: секунду назад был хаос, теперь хаос с табличкой “первое место”.' },
    { title: 'На табло появился фаворит.', text: 'Это не корона, конечно, но попасть по ней теперь захотят все.' },
    { title: 'Один игрок забрал темп.', text: 'Остальные получили бесплатный курс “как срочно перестать отставать”.' },
  ];
  if (key.includes('solo_survivor')) return [
    { title: 'Остался один герой и много вопросов.', text: 'Главный вопрос: это стратегия, трагедия или просто командная работа закончилась раньше времени?' },
    { title: 'Соло-режим включился без предупреждения.', text: 'Теперь всё внимание, весь урон и все плохие решения принадлежат одному человеку.' },
    { title: 'На арене одинокий финалист.', text: 'Звучит гордо, пока не смотришь на количество врагов и выражение лица судьбы.' },
    { title: 'Команда стала компактной.', text: 'Настолько компактной, что помещается в одного очень занятого героя.' },
    { title: 'Один против всех.', text: 'Классика жанра: красиво на постере, заметно хуже в бухгалтерии здоровья.' },
    { title: 'На сцене остался один.', text: 'Весь лут, весь страх и вся ответственность теперь смотрят на него одновременно.' },
    { title: 'Соло-режим включился сам.', text: 'Командная работа закончилась. Началась личная переписка с судьбой.' },
    { title: 'Один герой против расписания боли.', text: 'Красиво звучит, пока не вспоминаешь, что расписание обычно пунктуальное.' },
    { title: 'Финальный одиночный номер.', text: 'Публика любит такие моменты. Игроки обычно любят их уже после победы.' },
    { title: 'Остался один доброволец.', text: 'Теперь каждое решение звучит громче, потому что обвинить больше некого.' },
  ];
  if (key.includes('respawn_wait') || key.includes('downed')) return [
    { title: 'Герой временно изучает пол.', text: 'Пол, кстати, выполнен качественно. Жаль, обзор слишком близкий и по неприятной причине.' },
    { title: 'Пауза на горизонтальное мышление.', text: 'Иногда стратегия требует лечь. Иногда стратегия просто не успела увернуться.' },
    { title: 'Игрок ушёл в режим ожидания.', text: 'Сейчас главное не паниковать. Паниковать можно будет красиво после респавна.' },
    { title: 'Небольшая техническая смерть.', text: 'Не финал, а рекламная пауза для самолюбия и проверка терпения команды.' },
    { title: 'Герой прилёг не по плану.', text: 'Но с таким выражением, будто это часть сложной тактики, которую никто не просил.' },
    { title: 'Нокдаун в прямом эфире.', text: 'Герой временно изучает пол и пересматривает отношения с входящим уроном.' },
    { title: 'Вертикальность отменена.', text: 'Ненадолго, но достаточно, чтобы комментатор успел сделать неприятно точный вывод.' },
    { title: 'Игрок прилёг без романтики.', text: 'Респавн скоро, а пока можно насладиться образовательной паузой.' },
    { title: 'На арене минус один стоящий аргумент.', text: 'Лежачий аргумент тоже аргумент, просто менее мобильный.' },
    { title: 'Нокдаун засчитан.', text: 'Очень честная обратная связь от игры: “так делать было больно”.' },
    { title: 'Герой временно в режиме ковра.', text: 'Не самый гордый режим, зато даёт пару секунд подумать о выборе маршрута.' },
  ];
  if (key.includes('final_death') || key.includes('player_final_death') || key.includes('death')) return [
    { title: 'Герой закончил забег с драматичным шлепком.', text: 'Арена благодарит за участие, нервы, патроны и уверенность, которая держалась дольше HP.' },
    { title: 'Финальная смерть пришла без стука.', text: 'Очень грубо, очень эффектно и совершенно не по расписанию героя.' },
    { title: 'Игрок выбыл, но оставил легенду.', text: 'Легенда короткая: “я почти вывез”. В этой игре это уже литературный жанр.' },
    { title: 'Забег для героя закончился.', text: 'Комментатор снимает шляпу, потом надевает обратно, потому что вокруг всё ещё летают проблемы.' },
    { title: 'Герой пал, арена сделала вид, что ей не грустно.', text: 'Мы ей не верим. Но и спорить с ареной сейчас как-то не хочется.' },
    { title: 'Последний HP ушёл в закат.', text: 'Красиво, трагично и с лёгким ароматом “надо было брать другой навык”.' },
    { title: 'Финальный экран почти слышно.', text: 'Он тихо говорит: “Ну что, ещё разок?”. И это, конечно, ловушка.' },
    { title: 'Герой отправился в зал славы ошибок.', text: 'Там уютно, многолюдно и все начинают рассказ со слов “да я просто не заметил”.' },
    { title: 'Забег подписал заявление на финал.', text: 'Герой держался достойно, но арена сегодня была бухгалтером: всё посчитала и списала.' },
    { title: 'Финальная точка поставлена.', text: 'Публика выдохнула, монстры довольны, комментатор делает вид, что не привязался.' },
    { title: 'Герой вышел из чата жизни.', text: 'Красиво боролся, шумно падал, оставил после себя опыт и лёгкую неловкость.' },
    { title: 'Арена забрала своё.', text: 'Сурово, без лишней лирики и с отвратительно хорошим таймингом.' },
    { title: 'Это был последний аргумент героя.', text: 'Дальше говорят только статистика, экран смерти и тихое “ну ещё один забег”.' },
    { title: 'Финальный поклон состоялся.', text: 'Не совсем добровольный, зато очень убедительный с точки зрения физики.' },
    { title: 'Герой закончил смену.', text: 'Рабочий день был насыщенный: бег, стрельба, паника и внезапный отпуск в меню.' },
    { title: 'Забег завершён с характером.', text: 'Не победа, но и не скучно. А это, будем честны, уже половина шоу.' },
  ];
  return [];
}

function setCommentaryVariant(variants, eventKey = 'generic', cooldownMs = 6000, options = {}) {
  const selected = pickCommentaryVariant([...(Array.isArray(variants) ? variants : []), ...getExtraCommentaryVariants(eventKey)], null);
  if (!selected) return false;
  return setCommentatorLine(selected.title, selected.text, eventKey, cooldownMs, options);
}

function maybeCommentateSystemMessage(message) {
  const text = String(message || '').trim();
  if (!text) return;
  const pickedWeaponMatchNew = text.match(/\bPicked\s+(.+?)(?:[.!]|$)/i);
  if (pickedWeaponMatchNew) {
    const weaponLabel = String(pickedWeaponMatchNew[1] || 'оружие').trim();
    setCommentaryVariant([
      { title: `Найдено: ${weaponLabel}.`, text: 'Лут найден, здравый смысл временно отложен. Самое время проверить, насколько эта железка дружит с точностью.' },
      { title: `${weaponLabel} у героя в руках.`, text: 'Отлично. Теперь можно ошибаться быстрее, громче и значительно дороже для местной фауны.' },
      { title: `${weaponLabel} пошёл в работу.`, text: 'Арена только что выдала новый аргумент в споре с фауной. У аргумента подозрительно хороший урон и плохой характер.' },
      { title: `Свежий ствол: ${weaponLabel}.`, text: 'Люблю этот звук. Это звук надежды, которая ещё не знает, как быстро её сейчас проверят на прочность.' },
      { title: `${weaponLabel} найден и немедленно усыновлён.`, text: 'Герой снова доказал, что может привязаться к оружию быстрее, чем к здравому смыслу.' },
      { title: `${weaponLabel} вступает в эфир.`, text: 'Публика ждёт тест-драйв, монстры ждут худшего, а комментатор уже морально готовит сарказм на последствия.' },
    ], `weapon_pick_${weaponLabel.toLowerCase()}`, 3500);
    return;
  }
  if (/activated XP Surge/i.test(text)) {
    setCommentaryVariant([
      { title: 'XP полетела сама.', text: 'Лень официально признана тактикой: кристаллы сами бегут к герою, как неоплаченные долги.' },
      { title: 'XP Surge активирован.', text: 'Очень удобно. Даже опыт устал ждать и решил сам прийти в руки.' },
      { title: 'Опыт сам пошёл навстречу.', text: 'Красота. Даже прокачка поняла, что герой слишком занят выживанием, чтобы бегать за ней ногами.' },
      { title: 'Ленивый фарм включён официально.', text: 'Кристаллы стягиваются сами. Это не магия, это мечта человека, который устал собирать их вручную.' },
      { title: 'XP Surge врубается без стыда.', text: 'Очень зрелое решение: пусть опыт сам приходит, пока герой делает вид, что полностью контролирует происходящее.' },
    ], 'xp_surge', 4000);
    return;
  }
  if (/joined room/i.test(text)) {
    setCommentaryVariant([
      { title: 'Свежая кровь на арене.', text: 'Ещё один игрок залетел в мясорубку. Теперь ошибаться можно немного коллективнее.' },
      { title: 'В комнате прибавилось уверенности.', text: 'Новый боец в эфире. Арена уже готовит для него персональный набор неприятных сюрпризов.' },
      { title: 'На арену зашёл ещё один оптимист.', text: 'Всегда приятно видеть человека, который пока ещё верит, что всё это закончится хорошо.' },
      { title: 'Подкрепление прибыло красиво и без гарантий.', text: 'Команда расширяется. Количество хаоса растёт даже быстрее, чем потенциальная координация.' },
    ], 'join_room', 5000);
    return;
  }
  if (/left room/i.test(text)) {
    setCommentaryVariant([
      { title: 'Кто-то решил жить подольше.', text: 'Игрок вышел из комнаты. Осуждать не будем. Слегка усмехнёмся и продолжим.' },
      { title: 'Один билет в здравый смысл использован.', text: 'Кто-то покинул эфир раньше, чем арена успела объяснить ему свою позицию до конца.' },
      { title: 'Состав слегка поредел по доброй воле.', text: 'Редкий жанр на этой арене: человек ушёл сам, а не в виде драматической горизонтали.' },
    ], 'leave_room', 5000);
    return;
  }
  if (/boss is approaching|portal opened/i.test(text)) {
    setCommentaryVariant([
      { title: 'Портал на босса уже открыт.', text: 'Поздравляю, игра официально перестала шутить и начала готовить проблемы покрупнее.' },
      { title: 'Открылась дверь в отдел крупных неприятностей.', text: 'С этого момента фарм уже считается не подготовкой, а нервным тиком перед начальством.' },
      { title: 'Портал босса активен.', text: 'Арена как бы намекает: разминка закончилась, теперь пойдут вопросы без вариантов ответа.' },
    ], 'boss_portal_system', 9000);
    return;
  }
  if (/BOSS arrived/i.test(text)) {
    setCommentaryVariant([
      { title: 'Босс прибыл лично.', text: 'Вот и начальство. Сейчас начнутся те самые движения, за которые потом стыдно, но красиво.' },
      { title: 'В эфир зашёл самый неприятный гость вечера.', text: 'Босс на карте. Сейчас быстро выясним, кто тут герой, а кто просто талантливо убегал кругами.' },
      { title: 'Главная проблема матча прибыла без опозданий.', text: 'Очень деловой визит: минимум слов, максимум давления и полное неуважение к личным границам игроков.' },
    ], 'boss_arrived_system', 9000);
    return;
  }
  if (/was eliminated/i.test(text)) {
    setCommentaryVariant([
      { title: 'Минус один, но не навсегда.', text: 'На арене случилось насильственное перераспределение инициативы. Кому-то пора ждать респавн.' },
      { title: 'Фраг оформлен без лишней дипломатии.', text: 'Кто-то только что проиграл спор с уроном и теперь временно пересматривает жизненные решения.' },
      { title: 'В PvP снова победила грубая убедительность.', text: 'Один игрок отправлен подумать о жизни. Желательно до следующего респавна.' },
    ], 'pvp_elimination', 5000);
    return;
  }
  const pickedWeaponMatch = text.match(/\bPicked\s+(.+?)(?:[.!]|$)/i);
  if (pickedWeaponMatch) {
    const weaponLabel = String(pickedWeaponMatch[1] || 'оружие').trim();
    setCommentaryVariant([
      { title: `Найдено: ${weaponLabel}.`, text: 'Лут найден, здравый смысл временно отложен. Самое время проверить, насколько эта железка дружит с точностью.' },
      { title: `${weaponLabel} у героя в руках.`, text: 'Отлично. Теперь можно ошибаться быстрее, громче и значительно дороже для местной фауны.' },
    ], `weapon_pick_${weaponLabel.toLowerCase()}`, 3500);
    return;
  }
  if (/activated XP Surge/i.test(text)) {
    setCommentaryVariant([
      { title: 'XP полетела сама.', text: 'Лень официально признана тактикой: кристаллы сами бегут к герою, как неоплаченные долги.' },
      { title: 'XP Surge активирован.', text: 'Очень удобно. Даже опыт устал ждать и решил сам прийти в руки.' },
    ], 'xp_surge', 4000);
    return;
  }
  if (/joined room/i.test(text)) {
    setCommentatorLine('Свежая кровь на арене.', 'Ещё один игрок залетел в мясорубку. Теперь ошибаться можно немного коллективнее.', 'join_room', 5000);
    return;
  }
  if (/left room/i.test(text)) {
    setCommentatorLine('Кто-то решил жить подольше.', 'Игрок вышел из комнаты. Осуждать не будем. Слегка усмехнёмся и продолжим.', 'leave_room', 5000);
    return;
  }
  if (/boss is approaching|portal opened/i.test(text)) {
    setCommentatorLine('Портал на босса уже открыт.', 'Поздравляю, игра официально перестала шутить и начала готовить проблемы покрупнее.', 'boss_portal_system', 9000);
    return;
  }
  if (/BOSS arrived/i.test(text)) {
    setCommentatorLine('Босс прибыл лично.', 'Вот и начальство. Сейчас начнутся те самые движения, за которые потом стыдно, но красиво.', 'boss_arrived_system', 9000);
    return;
  }
  if (/was eliminated/i.test(text)) {
    setCommentatorLine('Минус один, но не навсегда.', 'На арене случилось насильственное перераспределение инициативы. Кому-то пора ждать респавн.', 'pvp_elimination', 5000);
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
      const playerName = String(player?.name || 'Игрок').trim() || 'Игрок';
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
        { title: `До босса около ${bossEtaSec}с.`, text: 'Можно собраться, можно запаниковать. История подсказывает, что многие попробуют оба варианта сразу.' },
        { title: `Босс почти у двери: ${bossEtaSec}с.`, text: 'Если кто-то ещё хотел спокойно пофармить, момент слегка упущен.' },
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
      { title: `${totalEnemyKills} киллов уже в копилке.`, text: 'Арена постепенно превращается в отчёт о переработке чудовищ. Цифры хорошие, шансы на спокойствие плохие.' },
      { title: `Счётчик монстров уже на ${totalEnemyKills}.`, text: 'Темп бодрый. Экологи, правда, вряд ли оценят такой подход к фауне.' },
      { title: `${totalEnemyKills} врагов убрано с повестки.`, text: 'Команда работает так, будто ей платят за скорость, а не за выживание.' },
    ], 'kill_milestone_extra', 9000);
  }

  const matchPulseBucket = Math.floor(matchSec / 30);
  if (matchPulseBucket > 0 && matchPulseBucket !== commentatorState.lastMatchPulseBucket) {
    commentatorState.lastMatchPulseBucket = matchPulseBucket;
    setCommentaryVariant([
      { title: `Матч держится уже ${matchSec}с.`, text: 'Для этой арены это уже серьёзные отношения: много напряжения, мало доверия и ни капли стабильности.' },
      { title: `${matchSec} секунд чистого упрямства.`, text: 'Катка затянулась достаточно, чтобы игра начала воспринимать это как личный вызов.' },
    ], `match_pulse_${matchPulseBucket}`, 6000);
  }

  if (playerCount !== commentatorState.lastPlayerCount && commentatorState.lastPlayerCount > 0) {
    const morePlayers = playerCount > commentatorState.lastPlayerCount;
    setCommentatorLine(
      morePlayers ? 'Комната становится люднее.' : 'Состав поредел.',
      morePlayers
        ? `Теперь в матче ${playerCount} игрока. Отлично, ошибок станет больше, а зрелище богаче.`
        : `Игроков осталось ${playerCount}. Арена снова напоминает собеседование на выживание.`,
      'player_count',
      5000,
    );
  }

  if (threatLevel > commentatorState.lastThreatLevel) {
    setCommentatorLine(
      `Угроза выросла до ${threatLevel}.`,
      pickCommentaryVariant([
        `Мобы официально злее, а право на расслабление снова отменено.`,
        `Игра подкрутила давление. Кто не в тонусе, тот уже почти в титрах.`,
        `Сложность поднялась. Самое время делать вид, что именно этого вы и хотели.`,
      ], 'Сложность растёт, а жалобы всё ещё не считаются тактикой.'),
      'threat_up',
      7000,
    );
  }

  if (!commentatorState.lastBossAlive && bossPortalAt > 0 && !bossAlive) {
    setCommentatorLine(
      'На карте открылся портал босса.',
      'Секундомер тикает, нервы плавятся. До большого начальника осталось совсем немного позора и героизма.',
      'boss_portal',
      9000,
    );
  }

  if (!commentatorState.lastBossAlive && bossAlive) {
    setCommentatorLine(
      'Босс уже на карте.',
      'Вот и встреча, ради которой все якобы качались. Сейчас выясним, кто тут герой, а кто просто удачно бегал кругами.',
      'boss_spawn',
      10000,
    );
  }

  if (commentatorState.lastBossAlive && !bossAlive && totalBossKills > commentatorState.lastBossKills) {
    setCommentatorLine(
      'Босс уложен.',
      'Редкий случай: коллектив действительно справился с проблемой, а не просто красиво от неё умер.',
      'boss_down',
      10000,
    );
  }

  if (totalEnemyKills >= 20 && totalEnemyKills % 25 < 3 && Date.now() - commentatorState.lastKillsRemarkAt > 12000) {
    commentatorState.lastKillsRemarkAt = Date.now();
    setCommentatorLine(
      `${totalEnemyKills} киллов уже в копилке.`,
      'Арена постепенно превращается в отчёт о переработке чудовищ. Цифры хорошие, шансы на спокойствие плохие.',
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
        'Здоровье выглядит тревожно.',
        'У героя осталось маловато хп и слишком много самоуверенности. Может, всё-таки начать уважать входящий урон.',
        'low_hp',
        15000,
      );
    } else if (commentatorState.wasLowHp && hpRatio >= 0.72 && Date.now() - commentatorState.lastRecoveryAt > 12000) {
      commentatorState.wasLowHp = false;
      commentatorState.lastRecoveryAt = Date.now();
      setCommentaryVariant([
        { title: 'Хп снова похоже на хп.', text: 'Герой каким-то чудом вылез из красной зоны. Значит, драму пока откладываем.' },
        { title: 'Стабилизировались.', text: 'Ещё минуту назад пахло катастрофой, а теперь снова пахнет самоуверенностью. Красота.' },
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
        `${String(leader?.name || 'Кто-то')} вышел вперёд.`,
        `В PvP появился лидер с ${leaderKills} фрагами. Остальным пора либо догонять, либо придумывать достойные оправдания.`,
        'pvp_leader',
        8000,
      );
    }
  }

  if (playerCount === 1 && commentatorState.lastPlayerCount > 1) {
    setCommentaryVariant([
      { title: 'На сцене остался один человек.', text: 'Вся ответственность, весь лут и весь ужас матча теперь аккуратно легли на одного героя.' },
      { title: 'Соло-режим включился сам.', text: 'Командная работа закончилась. Началась личная переписка с судьбой и уклонениями.' },
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
commentatorVoiceVolumeEl?.addEventListener('input', () => {
  setCommentatorVoiceVolume(commentatorVoiceVolumeEl.value);
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
  renderCommentatorSpeechMonitor();
  if (!commentatorSpeech.supported || !commentatorSpeech.enabled || game.embedMode) return;
  const activeForMs = Date.now() - Math.max(0, commentatorSpeech.activeSinceAt || 0);
  const speechBusy = Boolean(window.speechSynthesis.speaking || window.speechSynthesis.pending);
  if (commentatorSpeech.activeText && !speechBusy && activeForMs > 1200) {
    clearActiveCommentarySpeech();
    flushCommentarySpeechQueue();
    return;
  }
  if (commentatorSpeech.activeText && speechBusy && activeForMs > 25000) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore cancel failures
    }
    clearActiveCommentarySpeech({ countDropped: true });
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

function formatRunGameModeLabel(run) {
  const raw = String(run?.runDetails?.gameMode || '').trim().toLowerCase();
  if (raw === 'hardcore') return tr('ui.play.mode.hardcore');
  if (raw === 'normal') return tr('ui.play.mode.normal');
  return 'Неизвестно';
}

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
    void globalThis.CWProfile?.requestRunHistory?.({ force: false });
  }
  if (nextTab === 'rating') {
    void globalThis.CWRating?.request?.({ force: false });
  }
  if (nextTab === 'news') {
    if (prevTab === 'news' && globalThis.CWNews?.hasActiveItem?.()) {
      globalThis.CWNews.resetActiveDetail();
    }
    void globalThis.CWNews?.request?.({ force: false });
  }
  if (nextTab !== 'news') {
    globalThis.CWNews?.clearShareState?.();
    globalThis.CWNews?.updateMenuUrlState?.(nextTab, '');
  } else if (!globalThis.CWNews?.hasActiveItem?.()) {
    globalThis.CWNews?.updateMenuUrlState?.('news', '');
  }
}

for (const btn of mainMenuTabButtons) {
  btn.addEventListener('click', () => {
    setMainMenuTab(btn.getAttribute('data-menu-tab'));
  });
}
currentMainMenuTab = initialMenuTab;
setMainMenuTab(currentMainMenuTab);
function renderCharacterPicker() {
  return globalThis.CWCharacters?.render?.();
}

function useQuickItemInRun(slotKey) {
  return Boolean(globalThis.CWCharacters?.useQuickItemInRun?.(slotKey));
}

function getItemDisplayName(itemDef) {
  return globalThis.CWCharacters?.getItemDisplayName?.(itemDef) || String(itemDef?.name || itemDef?.id || '-');
}


const storedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
if (nameInput && storedNickname && storedNickname.trim() && !game.playerAuth?.player) {
  nameInput.value = storedNickname.trim().slice(0, 18);
}
if (!game.playerAuth?.player) {
  void updateNicknameStatus(nameInput?.value || '');
}
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
  const resumeOnly = options?.resumeOnly === true;
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
    resumeOnly: resumeOnly || undefined,
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

function catmullRom1D(p0, p1, p2, p3, alpha) {
  const t = Math.max(0, Math.min(1, Number(alpha) || 0));
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1)
    + (-p0 + p2) * t
    + ((2 * p0) - (5 * p1) + (4 * p2) - p3) * t2
    + (-p0 + (3 * p1) - (3 * p2) + p3) * t3
  );
}

function sampleReplaySmoothCoord(prevItem, currentItem, nextItem, next2Item, coordIndex, alpha) {
  const currentValue = Number(currentItem?.[coordIndex]) || 0;
  const nextValue = Number(nextItem?.[coordIndex]);
  if (!Number.isFinite(nextValue)) return currentValue;
  const linear = lerp(currentValue, nextValue, alpha);
  if (!Array.isArray(currentItem) || !Array.isArray(nextItem) || alpha <= 0 || alpha >= 1) return linear;

  const prevValue = Number.isFinite(Number(prevItem?.[coordIndex])) ? (Number(prevItem?.[coordIndex]) || currentValue) : currentValue;
  const next2Value = Number.isFinite(Number(next2Item?.[coordIndex])) ? (Number(next2Item?.[coordIndex]) || nextValue) : nextValue;
  const curved = catmullRom1D(prevValue, currentValue, nextValue, next2Value, alpha);
  if (!Number.isFinite(curved)) return linear;

  const seg = Math.abs(nextValue - currentValue);
  const pad = Math.min(180, Math.max(18, seg * 0.5));
  const min = Math.min(currentValue, nextValue) - pad;
  const max = Math.max(currentValue, nextValue) + pad;
  return Math.max(min, Math.min(max, curved));
}

function getReplayFallbackMagazineSize(weaponKey) {
  const normalized = String(weaponKey || 'pistol').toLowerCase();
  if (normalized === 'sniper') return 5;
  if (normalized === 'shotgun') return 8;
  if (normalized === 'smg') return 36;
  return 12;
}

function getReplayFallbackReloadMs(weaponKey) {
  const normalized = String(weaponKey || 'pistol').toLowerCase();
  if (normalized === 'sniper') return 1400;
  if (normalized === 'shotgun') return 1100;
  if (normalized === 'smg') return 1250;
  return 900;
}

function sampleReplayDiscreteValue(currentItem, nextItem, index, alpha, fallbackValue = 0) {
  const useNext = Math.max(0, Math.min(1, Number(alpha) || 0)) >= 0.5;
  const value = useNext ? nextItem?.[index] : currentItem?.[index];
  if (value === undefined || value === null || value === '') return fallbackValue;
  return value;
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
  visuals.spectatorMuzzleBulletIds = new Set();
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

function findReplayBulletSegmentImpact(bullet, targetX, targetY, enemiesRaw, playersRaw) {
  const x1 = Number(bullet?.[1]) || 0;
  const y1 = Number(bullet?.[2]) || 0;
  const bulletRadius = Math.max(2, Number(bullet?.[8]) || 3);
  const x2 = Number(targetX) || x1;
  const y2 = Number(targetY) || y1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segLenSq = dx * dx + dy * dy;
  if (segLenSq <= 0.0001) return { x: x1, y: y1, t: 0, hit: false };

  const targets = buildReplayCollisionTargets(enemiesRaw, playersRaw, bullet);
  let bestT = 1;
  let hit = false;
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
      hit = true;
    }
  }

  return {
    x: x1 + dx * bestT,
    y: y1 + dy * bestT,
    t: bestT,
    hit,
  };
}

function findReplayBulletImpact(bullet, dtSec, enemiesRaw, playersRaw) {
  const x1 = Number(bullet?.[1]) || 0;
  const y1 = Number(bullet?.[2]) || 0;
  const vx = Number(bullet?.[3]) || 0;
  const vy = Number(bullet?.[4]) || 0;
  const safeDtSec = Math.max(0, Number(dtSec) || 0);
  return findReplayBulletSegmentImpact(bullet, x1 + vx * safeDtSec, y1 + vy * safeDtSec, enemiesRaw, playersRaw);
}

function findReplayBulletImpactPoint(bullet, dtSec, enemiesRaw, playersRaw) {
  const impact = findReplayBulletImpact(bullet, dtSec, enemiesRaw, playersRaw);
  return { x: impact.x, y: impact.y };
}

function getReplayBulletExtrapolateSec(kind, dtSec) {
  const normalizedKind = String(kind || 'bullet').toLowerCase();
  if (normalizedKind === 'rocket') return Math.min(dtSec, 0.12);
  return Math.min(dtSec, 0.22);
}

function buildReplayRawTupleMap(list) {
  const map = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    if (!Array.isArray(item)) continue;
    const id = item[0];
    if (id === undefined || id === null || id === '') continue;
    map.set(String(id), item);
  }
  return map;
}

function interpolateReplayRawTuples(currentList, nextList, alpha, xIndex, yIndex) {
  const source = Array.isArray(currentList) ? currentList : [];
  const nextById = buildReplayRawTupleMap(nextList);
  return source.map((item) => {
    if (!Array.isArray(item)) return item;
    const out = item.slice();
    const nextItem = nextById.get(String(item[0]));
    if (Array.isArray(nextItem)) {
      const x1 = Number(item[xIndex]) || 0;
      const y1 = Number(item[yIndex]) || 0;
      out[xIndex] = lerp(x1, Number(nextItem[xIndex]) || x1, alpha);
      out[yIndex] = lerp(y1, Number(nextItem[yIndex]) || y1, alpha);
    }
    return out;
  });
}

function buildReplayCollisionFrame(current, next, alpha) {
  return {
    enemies: interpolateReplayRawTuples(current?.e, next?.e, alpha, 2, 3),
    players: interpolateReplayRawTuples(current?.p, next?.p, alpha, 1, 2),
  };
}

function buildReplayEmergingRecordedBullets(payload, current, next, alpha, elapsedMs) {
  const target = Array.isArray(next?.b) ? next.b : [];
  if (target.length <= 0) return [];
  const sourceById = buildReplayRawTupleMap(current?.b);
  const byBulletId = getReplayShotTimelineByBulletId(payload);
  const currentT = Math.max(0, Number(current?.t) || 0);
  const nextT = Math.max(currentT, Number(next?.t) || currentT);
  const nowMs = Math.max(0, Number(elapsedMs) || 0);
  const fallbackDtSec = Math.max(0.001, (nextT - currentT) / 1000 || 0.2);
  const out = [];

  for (const bullet of target) {
    if (!isNewReplayBulletTuple(bullet)) continue;
    const bulletId = String(bullet[0] ?? '');
    if (!bulletId || sourceById.has(bulletId)) continue;

    const event = byBulletId.get(bulletId);
    const targetX = Number(bullet[1]) || 0;
    const targetY = Number(bullet[2]) || 0;
    let startX = targetX - (Number(bullet[3]) || 0) * Math.min(fallbackDtSec, 0.18);
    let startY = targetY - (Number(bullet[4]) || 0) * Math.min(fallbackDtSec, 0.18);
    let visibleAlpha = alpha;

    if (event) {
      const shotAt = Math.max(currentT, Math.min(nextT, Number(event.offsetMs) || currentT));
      if (nowMs < shotAt) continue;
      const horizonSec = Math.max(0.001, (nextT - shotAt) / 1000);
      const ageSec = Math.max(0, (nowMs - shotAt) / 1000);
      const bulletTuple = [
        bulletId,
        Number(event.x) || startX,
        Number(event.y) || startY,
        Number(event.vx) || Number(bullet[3]) || 0,
        Number(event.vy) || Number(bullet[4]) || 0,
        bullet[5] || event.color || '#f59e0b',
        bullet[6] || 'bullet',
        bullet[7] ? 1 : 0,
        Math.max(2, Number(bullet[8]) || Number(event.radius) || 3),
        bullet[9] || event.ownerId || '',
        bullet[10] || event.weaponKey || '',
        bullet[11] || event.ownerPlayerId || '',
        bullet[12] || event.shooterType || 'player',
      ];
      const impact = findReplayBulletImpact(bulletTuple, horizonSec, buildReplayCollisionFrame(current, next, alpha).enemies, buildReplayCollisionFrame(current, next, alpha).players);
      const impactSec = impact.hit ? horizonSec * Math.max(0, Math.min(1, Number(impact.t) || 0)) : Infinity;
      const linearX = (Number(event.x) || startX) + (Number(event.vx) || Number(bullet[3]) || 0) * ageSec;
      const linearY = (Number(event.y) || startY) + (Number(event.vy) || Number(bullet[4]) || 0) * ageSec;
      out.push({
        id: bulletId,
        ownerId: bullet[9] || '',
        ownerPlayerId: bullet[11] || '',
        x: ageSec >= impactSec ? impact.x : linearX,
        y: ageSec >= impactSec ? impact.y : linearY,
        vx: Number(bullet[3]) || 0,
        vy: Number(bullet[4]) || 0,
        color: bullet[5] || (bullet[7] ? '#fb7185' : ((bullet[6] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc')),
        kind: bullet[6] || 'bullet',
        radius: Math.max(2, Number(bullet[8]) || ((bullet[6] || 'bullet') === 'rocket' ? 6 : 3)),
        fromEnemy: Boolean(bullet[7]),
        weaponKey: bullet[10] || '',
        shooterType: bullet[12] || '',
      });
      continue;
    }
    out.push({
      id: bulletId,
      ownerId: bullet[9] || '',
      ownerPlayerId: bullet[11] || '',
      x: lerp(startX, targetX, visibleAlpha),
      y: lerp(startY, targetY, visibleAlpha),
      vx: Number(bullet[3]) || 0,
      vy: Number(bullet[4]) || 0,
      color: bullet[5] || (bullet[7] ? '#fb7185' : ((bullet[6] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc')),
      kind: bullet[6] || 'bullet',
      radius: Math.max(2, Number(bullet[8]) || ((bullet[6] || 'bullet') === 'rocket' ? 6 : 3)),
      fromEnemy: Boolean(bullet[7]),
      weaponKey: bullet[10] || '',
      shooterType: bullet[12] || '',
    });
  }

  return out;
}

function interpolateReplayBullets(currentBullets, nextBullets, alpha, currentT, nextT, currentEnemies, nextEnemies, currentPlayers, nextPlayers) {
  const source = Array.isArray(currentBullets) ? currentBullets : [];
  const target = Array.isArray(nextBullets) ? nextBullets : [];
  const collisionEnemies = Array.isArray(currentEnemies) && currentEnemies.length ? currentEnemies : nextEnemies;
  const collisionPlayers = Array.isArray(currentPlayers) && currentPlayers.length ? currentPlayers : nextPlayers;
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
      const kind = String(bullet[6] || 'bullet').toLowerCase();
      const vx1 = Number(bullet[3]) || 0;
      const vy1 = Number(bullet[4]) || 0;
      const vx2 = Number(nextBullet[3]) || vx1;
      const vy2 = Number(nextBullet[4]) || vy1;
      const dtAlphaSec = dtSec * Math.max(0, Math.min(1, alpha));
      const linearFullX = x1 + vx1 * dtSec;
      const linearFullY = y1 + vy1 * dtSec;
      const linearX = x1 + vx1 * dtAlphaSec;
      const linearY = y1 + vy1 * dtAlphaSec;
      const velocityCurveFullX = sampleReplayVelocityCurveCoord(x1, vx1, vx2, dtSec, 1);
      const velocityCurveFullY = sampleReplayVelocityCurveCoord(y1, vy1, vy2, dtSec, 1);
      const velocityCurveX = sampleReplayVelocityCurveCoord(x1, vx1, vx2, dtSec, alpha);
      const velocityCurveY = sampleReplayVelocityCurveCoord(y1, vy1, vy2, dtSec, alpha);
      const linearDist = Math.hypot(vx1 * dtSec, vy1 * dtSec);
      const recordedDx = x2 - x1;
      const recordedDy = y2 - y1;
      const recordedDist = Math.hypot(recordedDx, recordedDy);
      const directionDot = (recordedDx * vx1) + (recordedDy * vy1);
      const useVelocityCurvePath = kind === 'rocket';
      const impact = findReplayBulletSegmentImpact(
        bullet,
        useVelocityCurvePath ? velocityCurveFullX : linearFullX,
        useVelocityCurvePath ? velocityCurveFullY : linearFullY,
        collisionEnemies,
        collisionPlayers,
      );
      const impactSec = impact.hit ? dtSec * Math.max(0, Math.min(1, Number(impact.t) || 0)) : Infinity;
      const compressionThreshold = kind === 'rocket' ? 0.98 : 0.93;
      const useConstantSpeedImpactPath = impact.hit || directionDot <= 0 || (linearDist > 1 && recordedDist < linearDist * compressionThreshold);

      if (useVelocityCurvePath || useConstantSpeedImpactPath) {
        const pathX = useVelocityCurvePath ? velocityCurveX : linearX;
        const pathY = useVelocityCurvePath ? velocityCurveY : linearY;
        return {
          id: String(bullet[0]),
          ownerId: bullet[9] || '',
          ownerPlayerId: bullet[11] || '',
          x: dtAlphaSec >= impactSec ? impact.x : pathX,
          y: dtAlphaSec >= impactSec ? impact.y : pathY,
          vx: vx1,
          vy: vy1,
          color: bullet[5] || (bullet[7] ? '#fb7185' : ((bullet[6] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc')),
          kind: bullet[6] || 'bullet',
          radius: Math.max(2, Number(bullet[8]) || ((bullet[6] || 'bullet') === 'rocket' ? 6 : 3)),
          fromEnemy: Boolean(bullet[7]),
          weaponKey: bullet[10] || '',
          shooterType: bullet[12] || '',
        };
      }

      if (targetById.has(String(bullet[0]))) {
        x2 = Number(nextBullet[1]) || x1;
        y2 = Number(nextBullet[2]) || y1;
      } else {
        const extrapolateSec = getReplayBulletExtrapolateSec(bullet[6], dtSec);
        const dtAlphaSec = extrapolateSec * Math.max(0, Math.min(1, alpha));
        const rawX = x1 + (Number(bullet[3]) || 0) * dtAlphaSec;
        const rawY = y1 + (Number(bullet[4]) || 0) * dtAlphaSec;
        const impact = findReplayBulletSegmentImpact(
          bullet,
          x1 + (Number(bullet[3]) || 0) * extrapolateSec,
          y1 + (Number(bullet[4]) || 0) * extrapolateSec,
          collisionEnemies,
          collisionPlayers,
        );
        const impactSec = impact.hit ? extrapolateSec * Math.max(0, Math.min(1, Number(impact.t) || 0)) : Infinity;
        return {
          id: String(bullet[0]),
          ownerId: bullet[9] || '',
          ownerPlayerId: bullet[11] || '',
          x: dtAlphaSec >= impactSec ? impact.x : rawX,
          y: dtAlphaSec >= impactSec ? impact.y : rawY,
          vx: Number(bullet[3]) || 0,
          vy: Number(bullet[4]) || 0,
          color: bullet[5] || (bullet[7] ? '#fb7185' : ((bullet[6] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc')),
          kind: bullet[6] || 'bullet',
          radius: Math.max(2, Number(bullet[8]) || ((bullet[6] || 'bullet') === 'rocket' ? 6 : 3)),
          fromEnemy: Boolean(bullet[7]),
          weaponKey: bullet[10] || '',
          shooterType: bullet[12] || '',
        };
      }
      return {
        id: String(bullet[0]),
        ownerId: bullet[9] || '',
        ownerPlayerId: bullet[11] || '',
        x: lerp(x1, x2, alpha),
        y: lerp(y1, y2, alpha),
        vx: Number(bullet[3]) || 0,
        vy: Number(bullet[4]) || 0,
        color: bullet[5] || (bullet[7] ? '#fb7185' : ((bullet[6] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc')),
        kind: bullet[6] || 'bullet',
        radius: Math.max(2, Number(bullet[8]) || ((bullet[6] || 'bullet') === 'rocket' ? 6 : 3)),
        fromEnemy: Boolean(bullet[7]),
        weaponKey: bullet[10] || '',
        shooterType: bullet[12] || '',
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
    const extrapolateSec = getReplayBulletExtrapolateSec(bullet?.[2], dtSec);
    const x2 = nextBullet ? (Number(nextBullet?.[0]) || x1) : (x1 + (Number(bullet?.[4]) || 0) * extrapolateSec);
    const y2 = nextBullet ? (Number(nextBullet?.[1]) || y1) : (y1 + (Number(bullet?.[5]) || 0) * extrapolateSec);
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

function parseReplayShotEvents(frame, payload) {
  const events = Array.isArray(frame?.se) ? frame.se : [];
  const startedAt = Math.max(0, Number(payload?.startedAt) || Date.now());
  return events.map((event) => ({
    id: event?.[0],
    bulletId: event?.[1],
    ownerId: event?.[2] || '',
    ownerPlayerId: event?.[3] || '',
    shooterType: event?.[4] || 'player',
    weaponKey: event?.[5] || 'pistol',
    x: Number(event?.[6]) || 0,
    y: Number(event?.[7]) || 0,
    vx: Number(event?.[8]) || 0,
    vy: Number(event?.[9]) || 0,
    color: event?.[10] || '#f59e0b',
    radius: Math.max(2, Number(event?.[11]) || 3),
    at: startedAt + Math.max(0, Number(event?.[12]) || 0),
    kind: event?.[13] || 'bullet',
    replayShot: true,
  }));
}

function getReplayShotTimeline(payload) {
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  if (
    payload
    && Array.isArray(payload.__shotTimeline)
    && payload.__shotTimelineSourceLen === frames.length
  ) {
    return payload.__shotTimeline;
  }

  const seen = new Set();
  const timeline = [];
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    const frame = frames[frameIndex];
    const events = Array.isArray(frame?.se) ? frame.se : [];
    for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
      const event = events[eventIndex];
      const id = event?.[0] ?? `${frameIndex}:${eventIndex}`;
      const dedupeKey = String(id);
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      timeline.push({
        id,
        bulletId: event?.[1],
        ownerId: event?.[2] || '',
        ownerPlayerId: event?.[3] || '',
        shooterType: event?.[4] || 'player',
        weaponKey: event?.[5] || 'pistol',
        x: Number(event?.[6]) || 0,
        y: Number(event?.[7]) || 0,
        vx: Number(event?.[8]) || 0,
        vy: Number(event?.[9]) || 0,
        color: event?.[10] || '#f59e0b',
        radius: Math.max(2, Number(event?.[11]) || 3),
        offsetMs: Math.max(0, Number(event?.[12]) || Number(frame?.t) || 0),
      });
    }
  }
  timeline.sort((a, b) => (a.offsetMs - b.offsetMs) || String(a.id).localeCompare(String(b.id)));

  const byBulletId = new Map();
  for (const event of timeline) {
    if (event.bulletId !== undefined && event.bulletId !== null && event.bulletId !== '') {
      byBulletId.set(String(event.bulletId), event);
    }
  }

  if (payload) {
    payload.__shotTimeline = timeline;
    payload.__shotTimelineByBulletId = byBulletId;
    payload.__shotTimelineSourceLen = frames.length;
  }
  return timeline;
}

function getReplayShotTimelineByBulletId(payload) {
  getReplayShotTimeline(payload);
  return payload?.__shotTimelineByBulletId instanceof Map ? payload.__shotTimelineByBulletId : new Map();
}

function getReplayShotTimelineByOwner(payload) {
  const timeline = getReplayShotTimeline(payload);
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  if (
    payload
    && payload.__shotTimelineByOwner instanceof Map
    && payload.__shotTimelineByOwnerSourceLen === frames.length
  ) {
    return payload.__shotTimelineByOwner;
  }
  const byOwner = new Map();
  for (const event of timeline) {
    const ownerKeys = [
      String(event?.ownerId || ''),
      String(event?.ownerPlayerId || ''),
    ].filter(Boolean);
    for (const ownerKey of ownerKeys) {
      if (!byOwner.has(ownerKey)) byOwner.set(ownerKey, []);
      byOwner.get(ownerKey).push(event);
    }
  }
  if (payload) {
    payload.__shotTimelineByOwner = byOwner;
    payload.__shotTimelineByOwnerSourceLen = frames.length;
  }
  return byOwner;
}

function pickReplayRecentShotEvent(payload, ownerKeys, elapsedMs) {
  const byOwner = getReplayShotTimelineByOwner(payload);
  const nowMs = Math.max(0, Number(elapsedMs) || 0);
  let best = null;
  let bestAgeMs = Infinity;

  for (const rawKey of Array.isArray(ownerKeys) ? ownerKeys : []) {
    const key = String(rawKey || '').trim();
    if (!key) continue;
    const events = byOwner.get(key);
    if (!Array.isArray(events) || events.length <= 0) continue;
    let lo = 0;
    let hi = events.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if ((Number(events[mid]?.offsetMs) || 0) <= nowMs) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (idx < 0) continue;
    const event = events[idx];
    const ageMs = nowMs - Math.max(0, Number(event?.offsetMs) || 0);
    if (ageMs < 0 || ageMs > 1200) continue;
    if (ageMs < bestAgeMs) {
      best = event;
      bestAgeMs = ageMs;
    }
  }

  return best;
}

function resolveReplayAimTarget(payload, ownerKeys, elapsedMs, x, y, fallbackDx = 1, fallbackDy = 0) {
  const shotEvent = pickReplayRecentShotEvent(payload, ownerKeys, elapsedMs);
  let dirX = Number(fallbackDx) || 0;
  let dirY = Number(fallbackDy) || 0;
  if (shotEvent) {
    dirX = Number(shotEvent.vx) || dirX;
    dirY = Number(shotEvent.vy) || dirY;
  }
  const len = Math.hypot(dirX, dirY);
  if (len <= 0.001) {
    dirX = 1;
    dirY = 0;
  } else {
    dirX /= len;
    dirY /= len;
  }
  return {
    x: (Number(x) || 0) + dirX * 44,
    y: (Number(y) || 0) + dirY * 44,
  };
}

function getReplayShotVisualLifeMs(event, payload) {
  const captureMs = Math.max(100, Number(payload?.captureIntervalMs) || 350);
  const weaponKey = String(event?.weaponKey || '').toLowerCase();
  const kind = String(event?.kind || '').toLowerCase();
  if (kind === 'rocket' || weaponKey === 'homing_missiles') return Math.max(420, Math.min(980, captureMs * 2));
  if (weaponKey === 'shotgun') return Math.max(180, Math.min(360, captureMs + 40));
  if (weaponKey === 'sniper') return Math.max(260, Math.min(520, captureMs + 110));
  if (weaponKey === 'smg') return Math.max(180, Math.min(390, captureMs + 35));
  return Math.max(220, Math.min(460, captureMs + 80));
}

function isReplayRecordedWeaponBullet(bullet) {
  if (!bullet || bullet.fromEnemy) return false;
  const kind = String(bullet.kind || 'bullet').toLowerCase();
  if (kind === 'rocket') return false;
  return !bullet.replaySyntheticShot;
}

function buildReplayShotBulletTuple(event) {
  return [
    event?.id,
    Number(event?.x) || 0,
    Number(event?.y) || 0,
    Number(event?.vx) || 0,
    Number(event?.vy) || 0,
    event?.color || '#f59e0b',
    event?.kind || 'bullet',
    0,
    Math.max(2, Number(event?.radius) || (String(event?.kind || '').toLowerCase() === 'rocket' ? 6 : 3)),
    event?.ownerId || '',
    event?.weaponKey || 'pistol',
    event?.ownerPlayerId || '',
    event?.shooterType || 'player',
  ];
}

function getReplayShotEventImpact(payload, event) {
  if (!event || event.__replayImpactReady) return event?.__replayImpact || null;
  event.__replayImpactReady = true;
  event.__replayImpact = null;
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  const pair = pickReplayFramePair(frames, Math.max(0, Number(event.offsetMs) || 0));
  if (!pair.current) return null;
  const collisionFrame = buildReplayCollisionFrame(pair.current, pair.next, pair.alpha);
  const lifeSec = Math.max(0.001, getReplayShotVisualLifeMs(event, payload) / 1000);
  const impact = findReplayBulletImpact(buildReplayShotBulletTuple(event), lifeSec, collisionFrame.enemies, collisionFrame.players);
  if (!impact.hit) return null;
  event.__replayImpact = {
    x: impact.x,
    y: impact.y,
    sec: lifeSec * Math.max(0, Math.min(1, Number(impact.t) || 0)),
  };
  return event.__replayImpact;
}

function buildReplaySyntheticShotBullets(payload, current, next, alpha, elapsedMs, visibleBulletIds = null) {
  const timeline = getReplayShotTimeline(payload);
  const out = [];
  const nowMs = Math.max(0, Number(elapsedMs) || 0);
  const collisionFrame = buildReplayCollisionFrame(current, next, alpha);
  const blockedBulletIds = visibleBulletIds instanceof Set
    ? visibleBulletIds
    : new Set(
      (Array.isArray(current?.b) ? current.b : [])
        .map((bullet) => (Array.isArray(bullet) ? String(bullet[0] ?? '') : ''))
        .filter(Boolean),
    );
  for (const event of timeline) {
    const ageMs = nowMs - Math.max(0, Number(event.offsetMs) || 0);
    if (ageMs < 0 || ageMs > getReplayShotVisualLifeMs(event, payload)) continue;
    const bulletId = String(event?.bulletId ?? '');
    if (bulletId && blockedBulletIds.has(bulletId)) continue;
    const ageSec = ageMs / 1000;
    const bulletTuple = buildReplayShotBulletTuple(event);
    const eventImpact = getReplayShotEventImpact(payload, event);
    const impact = eventImpact
      ? { x: eventImpact.x, y: eventImpact.y, hit: true }
      : findReplayBulletImpact(bulletTuple, getReplayShotVisualLifeMs(event, payload) / 1000, collisionFrame.enemies, collisionFrame.players);
    const impactSec = eventImpact
      ? Math.max(0, Number(eventImpact.sec) || 0)
      : (impact.hit ? Math.max(0, Math.hypot((impact.x - (Number(event.x) || 0)), (impact.y - (Number(event.y) || 0))) / Math.max(1, Math.hypot(Number(event.vx) || 0, Number(event.vy) || 0))) : Infinity);
    if ((eventImpact || impact.hit) && ageSec > impactSec + 0.055) continue;
    const linearX = (Number(event.x) || 0) + (Number(event.vx) || 0) * ageSec;
    const linearY = (Number(event.y) || 0) + (Number(event.vy) || 0) * ageSec;
    const x = ageSec >= impactSec ? impact.x : linearX;
    const y = ageSec >= impactSec ? impact.y : linearY;
    const kind = event.kind || 'bullet';
    out.push({
      id: `replay-shot:${event.id}`,
      ownerId: event.ownerId || '',
      ownerPlayerId: event.ownerPlayerId || '',
      x,
      y,
      vx: Number(event.vx) || 0,
      vy: Number(event.vy) || 0,
      color: event.color || '#f59e0b',
      kind,
      radius: Math.max(2, Number(event.radius) || (String(kind).toLowerCase() === 'rocket' ? 6 : 3)),
      fromEnemy: false,
      weaponKey: event.weaponKey || 'pistol',
      shooterType: event.shooterType || 'player',
      replaySyntheticShot: true,
    });
  }
  return out;
}

function buildReplayBulletsForElapsed(payload, current, next, alpha, elapsedMs) {
  const recorded = interpolateReplayBullets(
    current?.b,
    next?.b,
    alpha,
    Number(current?.t || 0),
    Number(next?.t || current?.t || 0),
    current?.e,
    next?.e,
    current?.p,
    next?.p,
  );
  if (getReplayShotTimelineByBulletId(payload).size <= 0) return recorded;
  const emerging = buildReplayEmergingRecordedBullets(payload, current, next, alpha, elapsedMs);
  const visibleBulletIds = new Set();
  for (const bullet of recorded) {
    const bulletId = String(bullet?.id ?? '');
    if (bulletId) visibleBulletIds.add(bulletId);
  }
  for (const bullet of emerging) {
    const bulletId = String(bullet?.id ?? '');
    if (bulletId) visibleBulletIds.add(bulletId);
  }
  return recorded
    .concat(emerging)
    .concat(buildReplaySyntheticShotBullets(payload, current, next, alpha, elapsedMs, visibleBulletIds));
}

function sampleReplayVelocityCurveCoord(x1, v1, v2, dtSec, alpha) {
  const t = Math.max(0, Math.min(1, Number(alpha) || 0));
  const startV = Number(v1) || 0;
  const endV = Number(v2) || startV;
  return (Number(x1) || 0) + (((startV * t) + ((endV - startV) * t * t * 0.5)) * dtSec);
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
  const prevFrame = frames[Math.max(0, index - 1)] || current;
  const next2Frame = frames[Math.min(frames.length - 1, index + 2)] || next;
  const prevPlayers = frameEntityMap(prevFrame?.p);
  const nextPlayers = frameEntityMap(next?.p);
  const next2Players = frameEntityMap(next2Frame?.p);
  const prevEnemies = frameEntityMap(prevFrame?.e);
  const nextEnemies = frameEntityMap(next?.e);
  const next2Enemies = frameEntityMap(next2Frame?.e);
  const prevCompanions = frameEntityMap(prevFrame?.c);
  const nextCompanions = frameEntityMap(next?.c);
  const next2Companions = frameEntityMap(next2Frame?.c);
  const playerList = [];

  for (const player of Array.isArray(current.p) ? current.p : []) {
    const nextPlayer = nextPlayers.get(player[0]) || player;
    const prevPlayer = prevPlayers.get(player[0]) || player;
    const next2Player = next2Players.get(player[0]) || nextPlayer;
    const x = sampleReplaySmoothCoord(prevPlayer, player, nextPlayer, next2Player, 1, alpha);
    const y = sampleReplaySmoothCoord(prevPlayer, player, nextPlayer, next2Player, 2, alpha);
    const weaponKey = player[5] || 'pistol';
    const fallbackMagazineSize = getReplayFallbackMagazineSize(weaponKey);
    const fallbackReloadTotalMs = getReplayFallbackReloadMs(weaponKey);
    const level = Math.max(1, Math.floor(Number(player[14]) || 1));
    const xpToNext = Math.max(1, Math.floor(Number(player[16]) || 1));
    const hasRecordedAim = Number.isFinite(Number(player[20])) || Number.isFinite(Number(player[21]))
      || Number.isFinite(Number(nextPlayer[20])) || Number.isFinite(Number(nextPlayer[21]));
    const moveDx = (Number(nextPlayer[1]) || x) - (Number(player[1]) || x);
    const moveDy = (Number(nextPlayer[2]) || y) - (Number(player[2]) || y);
    const aimXRecorded = sampleReplaySmoothCoord(prevPlayer, player, nextPlayer, next2Player, 20, alpha);
    const aimYRecorded = sampleReplaySmoothCoord(prevPlayer, player, nextPlayer, next2Player, 21, alpha);
    const fallbackAim = resolveReplayAimTarget(payload, [player[0]], elapsedMs, x, y, moveDx, moveDy);
    const aimX = hasRecordedAim ? aimXRecorded : fallbackAim.x;
    const aimY = hasRecordedAim ? aimYRecorded : fallbackAim.y;
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
    const magazineSize = Math.max(1, Math.floor(Number(sampleReplayDiscreteValue(player, nextPlayer, 23, alpha, fallbackMagazineSize)) || fallbackMagazineSize));
    const magazineAmmo = Math.max(0, Math.floor(Number(sampleReplayDiscreteValue(player, nextPlayer, 22, alpha, magazineSize)) || 0));
    const reserveAmmoRaw = Number(sampleReplayDiscreteValue(player, nextPlayer, 24, alpha, -1));
    const reserveAmmo = Number.isFinite(reserveAmmoRaw) && reserveAmmoRaw >= 0 ? Math.max(0, Math.floor(reserveAmmoRaw)) : null;
    const reloadLeftMs = Math.max(0, Math.round(lerp(Number(player[25]) || 0, Number(nextPlayer[25]) || 0, alpha)));
    const reloadTotalMs = Math.max(1, Math.round(Number(sampleReplayDiscreteValue(player, nextPlayer, 26, alpha, fallbackReloadTotalMs)) || fallbackReloadTotalMs));
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
      weaponKey,
      weaponLabel: weaponKey,
      ammo: reserveAmmo,
      magazineAmmo,
      magazineSize,
      reserveAmmo,
      reloadLeftMs,
      reloadTotalMs,
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
    const prevCompanion = prevCompanions.get(companion[0]) || companion;
    const next2Companion = next2Companions.get(companion[0]) || nextCompanion;
    const cx = sampleReplaySmoothCoord(prevCompanion, companion, nextCompanion, next2Companion, 1, alpha);
    const cy = sampleReplaySmoothCoord(prevCompanion, companion, nextCompanion, next2Companion, 2, alpha);
    const companionWeaponKey = companion[3] || 'pistol';
    const companionFallbackMagazineSize = getReplayFallbackMagazineSize(companionWeaponKey);
    const companionFallbackReloadTotalMs = getReplayFallbackReloadMs(companionWeaponKey);
    const hasRecordedCompanionAim = Number.isFinite(Number(companion[5])) || Number.isFinite(Number(companion[6]))
      || Number.isFinite(Number(nextCompanion[5])) || Number.isFinite(Number(nextCompanion[6]));
    const companionAimRecordedX = sampleReplaySmoothCoord(prevCompanion, companion, nextCompanion, next2Companion, 5, alpha);
    const companionAimRecordedY = sampleReplaySmoothCoord(prevCompanion, companion, nextCompanion, next2Companion, 6, alpha);
    const companionFallbackAim = resolveReplayAimTarget(
      payload,
      [companion[0], companion[4]],
      elapsedMs,
      cx,
      cy,
      (Number(nextCompanion[1]) || cx) - (Number(companion[1]) || cx),
      (Number(nextCompanion[2]) || cy) - (Number(companion[2]) || cy),
    );
    playerList.push({
      id: companion[0],
      name: '',
      x: cx,
      y: cy,
      hp: 1,
      maxHp: 1,
      alive: true,
      score: 0,
      kills: 0,
      weaponKey: companionWeaponKey,
      weaponLabel: companionWeaponKey,
      ammo: null,
      magazineAmmo: Math.max(0, Math.floor(Number(sampleReplayDiscreteValue(companion, nextCompanion, 7, alpha, companionFallbackMagazineSize)) || 0)),
      magazineSize: Math.max(1, Math.floor(Number(sampleReplayDiscreteValue(companion, nextCompanion, 8, alpha, companionFallbackMagazineSize)) || companionFallbackMagazineSize)),
      reserveAmmo: null,
      reloadLeftMs: Math.max(0, Math.round(lerp(Number(companion[9]) || 0, Number(nextCompanion[9]) || 0, alpha))),
      reloadTotalMs: Math.max(1, Math.round(Number(sampleReplayDiscreteValue(companion, nextCompanion, 10, alpha, companionFallbackReloadTotalMs)) || companionFallbackReloadTotalMs)),
      aimX: hasRecordedCompanionAim ? companionAimRecordedX : companionFallbackAim.x,
      aimY: hasRecordedCompanionAim ? companionAimRecordedY : companionFallbackAim.y,
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

  const bullets = buildReplayBulletsForElapsed(payload, current, next, alpha, elapsedMs);

  const drops = (Array.isArray(current.d) ? current.d : []).map((drop, index) => {
    const kind = drop[3] || 'weapon';
    const weaponKey = drop[2] || 'pistol';
    const dropId = Math.max(0, Number(drop[4]) || 0) || index;
    const hasReplayTtl = Number.isFinite(Number(drop[5]));
    const ttlMs = hasReplayTtl ? Math.max(0, Number(drop[5]) || 0) : 999999;
    return {
      id: `rd-${dropId}`,
      x: Number(drop[0]) || 0,
      y: Number(drop[1]) || 0,
      kind,
      weaponKey: kind === 'xp_vacuum' ? null : weaponKey,
      weaponLabel: kind === 'xp_vacuum' ? 'XP Surge' : weaponKey,
      ttlMs,
      ttlMaxMs: hasReplayTtl ? Math.max(1, ttlMs) : 999999,
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
    shotEvents: parseReplayShotEvents(current, payload),
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
    const previousState = game.state;
    if (replayGame.playing && !replayGame.seeking && previousState && typeof processReplayInterpolatedFx === 'function') {
      processReplayInterpolatedFx(previousState, nextState);
    }
    if (nextState.replayFrameIndex !== replayGame.fxFrameIndex) {
      processStateFx(nextState);
      if (replayGame.playing && !replayGame.seeking) updateInGameCommentatorFromState(nextState);
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
  visuals.spectatorMuzzleBulletIds = new Set();
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
  const previewBullets = buildReplayBulletsForElapsed(payload, current, next, alpha, recordReplay.elapsedMs);

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
    if (bullet?.replayHidden) continue;
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
function updatePlayerInterpolation(dt) {
  if (!game.state) return;
  const liveMap = mapById(game.state.players);
  const targetMap = game.sampledNet?.players ? new Map(game.sampledNet.players) : new Map(liveMap);
  const usingBufferedTargets = Boolean(game.sampledNet?.players);
  const statePerfAt = usingBufferedTargets ? 0 : Math.max(0, Number(netStats?.lastStateAt) || 0);
  const extraSec = usingBufferedTargets ? 0 : getLiveStateExtrapolationSec();
  if (game.myId && liveMap.has(game.myId)) {
    targetMap.set(game.myId, liveMap.get(game.myId));
  }
  const alpha = 1 - Math.exp(-getEffectiveEntityInterpRate() * dt);
  const spectatorSmoothing = isSpectatorSmoothingView();
  const alive = new Set();

  for (const [id, p] of targetMap.entries()) {
    alive.add(id);
    const live = liveMap.get(id);
    const sampledAlive = (typeof p?.alive === 'boolean') ? Boolean(p.alive) : Boolean(live?.alive);
    const isAlive = Boolean(live?.alive ?? sampledAlive);
    const fallbackTargetX = (live && sampledAlive !== isAlive) ? Number(live.x) || Number(p.x) || 0 : (Number(p.x) || Number(live?.x) || 0);
    const fallbackTargetY = (live && sampledAlive !== isAlive) ? Number(live.y) || Number(p.y) || 0 : (Number(p.y) || Number(live?.y) || 0);

    let r = game.renderPlayers.get(id);
    if (!r) {
      r = {
        x: fallbackTargetX,
        y: fallbackTargetY,
        vx: 0,
        vy: 0,
        alive: isAlive,
        serverVx: 0,
        serverVy: 0,
        serverStatePerfAt: statePerfAt,
        serverStateX: fallbackTargetX,
        serverStateY: fallbackTargetY,
      };
      game.renderPlayers.set(id, r);
      continue;
    }

    const maxSpeed = (() => {
      const liveRef = live || p;
      const baseSpeed = Math.max(0, Number(liveRef?.moveSpeed) || 0);
      const dodgeActive = Number(liveRef?.dodgeInvulnUntil) > Date.now();
      return Math.max(260, baseSpeed * (dodgeActive ? 2.8 : 1.9));
    })();
    const predictedTarget = (!usingBufferedTargets && live)
      ? resolveLiveEntityTarget(r, live, statePerfAt, isAlive ? extraSec : 0, maxSpeed)
      : {
        x: fallbackTargetX,
        y: fallbackTargetY,
        vx: Number(p?.vx) || 0,
        vy: Number(p?.vy) || 0,
      };
    const targetX = predictedTarget.x;
    const targetY = predictedTarget.y;

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

    if (replayGame.active) {
      if (respawnSnap || longJumpSnap) {
        r.vx = 0;
        r.vy = 0;
      } else {
        r.vx = (fallbackTargetX - r.x) / Math.max(0.001, dt);
        r.vy = (fallbackTargetY - r.y) / Math.max(0.001, dt);
      }
      r.x = fallbackTargetX;
      r.y = fallbackTargetY;
      r.alive = isAlive;
      continue;
    }

    if (respawnSnap || longJumpSnap) {
      r.vx = 0;
      r.vy = 0;
      r.x = targetX;
      r.y = targetY;
    } else {
      const isLocalPlayer = Boolean(game.myId) && String(id) === String(game.myId);
      // Spectator/live views prefer stability over input responsiveness: every player is remote there.
      const alphaRemote = spectatorSmoothing
        ? (dodgeActive ? Math.max(alpha, 0.32) : Math.max(alpha, 0.48))
        : (dodgeActive ? Math.max(alpha, 0.26) : Math.max(alpha, 0.52));
      const alphaPlayer = isLocalPlayer ? alpha : alphaRemote;
      const nx = r.x + (targetX - r.x) * alphaPlayer;
      const ny = r.y + (targetY - r.y) * alphaPlayer;
      r.vx = usingBufferedTargets ? (nx - r.x) / Math.max(0.001, dt) : predictedTarget.vx;
      r.vy = usingBufferedTargets ? (ny - r.y) / Math.max(0.001, dt) : predictedTarget.vy;
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

function getSpectatorBulletSpawnAnchor(bullet) {
  if (!isSpectatorSmoothingView() || replayGame.active) return null;
  const ownerId = String(bullet?.ownerId || bullet?.ownerPlayerId || '');
  if (!ownerId) return null;
  const owner = (game.state?.players || []).find((p) => String(p?.id || '') === ownerId);
  if (!owner) return null;
  const ownerRender = getPlayerRenderPos(owner);
  const vx = Number(bullet?.vx) || 0;
  const vy = Number(bullet?.vy) || 0;
  const speed = Math.hypot(vx, vy);
  const dirX = speed > 0.001 ? vx / speed : 1;
  const dirY = speed > 0.001 ? vy / speed : 0;
  return {
    x: (Number(ownerRender.x) || Number(owner.x) || 0) + dirX * 20,
    y: (Number(ownerRender.y) || Number(owner.y) || 0) + dirY * 20,
    a: Math.atan2(dirY, dirX || 1),
    owner,
  };
}

function getSpectatorBulletVisualTarget(bullet) {
  if (!isSpectatorSmoothingView() || replayGame.active) return null;
  const ownerId = String(bullet?.ownerId || bullet?.ownerPlayerId || '');
  if (!ownerId) return null;
  const ownerLive = (game.state?.players || []).find((p) => String(p?.id || '') === ownerId);
  const ownerTarget = game.sampledNet?.players?.get(ownerId) || ownerLive;
  if (!ownerTarget) return null;
  const ownerRender = getPlayerRenderPos(ownerTarget);
  const ownerTargetX = Number(ownerTarget.x) || 0;
  const ownerTargetY = Number(ownerTarget.y) || 0;
  const dxFromOwner = (Number(bullet?.x) || 0) - ownerTargetX;
  const dyFromOwner = (Number(bullet?.y) || 0) - ownerTargetY;
  const distFromOwner = Math.hypot(dxFromOwner, dyFromOwner);
  const follow = Math.max(0, Math.min(1, (520 - distFromOwner) / 340));
  if (follow <= 0) return null;
  const offsetX = ((Number(ownerRender.x) || ownerTargetX) - ownerTargetX) * follow;
  const offsetY = ((Number(ownerRender.y) || ownerTargetY) - ownerTargetY) * follow;
  return {
    x: (Number(bullet?.x) || 0) + offsetX,
    y: (Number(bullet?.y) || 0) + offsetY,
  };
}

function spawnSpectatorBulletMuzzleFx(bullet, anchor) {
  if (!game.bulletTracersEnabled || !anchor) return;
  const bulletId = bullet?.id;
  if (bulletId !== undefined && bulletId !== null) {
    if (visuals.spectatorMuzzleBulletIds.has(bulletId)) return;
    visuals.spectatorMuzzleBulletIds.add(bulletId);
  }
  const weaponKey = String(bullet?.weaponKey || anchor.owner?.weaponKey || '').toLowerCase();
  const isCompanionShot = Boolean(anchor.owner?.isCompanion) || String(bullet?.shooterType || '').toLowerCase() === 'companion';
  const flashColor = '#facc15';
  const flashEdgeColor = '#fb923c';
  visuals.muzzle.push({
    x: anchor.x,
    y: anchor.y,
    a: anchor.a,
    c: flashColor,
    life: 0.05,
    ttl: 0.05,
  });
  visuals.muzzleGroundFlashes.push({
    x: anchor.x + Math.cos(anchor.a) * 3,
    y: anchor.y + Math.sin(anchor.a) * 3 + 8,
    a: anchor.a,
    c1: flashColor,
    c2: flashEdgeColor,
    life: 0.13,
    ttl: 0.13,
    size: isCompanionShot ? 0.9 : (weaponKey === 'shotgun' ? 1.72 : (weaponKey === 'sniper' ? 1.55 : 1)),
    intensity: isCompanionShot ? 0.62 : (weaponKey === 'shotgun' ? 0.46 : 1),
  });
}

function spawnSpectatorShotEventFx(event, state) {
  const replayShot = Boolean(replayGame.active || event?.replayShot);
  if ((!isSpectatorSmoothingView() && !replayShot) || !event) return;
  const eventId = event.id ?? `${event.ownerId || event.ownerPlayerId || 'shot'}:${event.at || Date.now()}`;
  const ownerId = String(event.ownerId || event.ownerPlayerId || '');
  const owner = (state?.players || game.state?.players || []).find((p) => String(p?.id || '') === ownerId) || {
    id: ownerId,
    x: Number(event.x) || 0,
    y: Number(event.y) || 0,
    weaponKey: event.weaponKey || 'pistol',
    isCompanion: String(event.shooterType || '').toLowerCase() === 'companion',
    ownerId: event.ownerPlayerId || '',
  };
  const weaponKey = String(event.weaponKey || owner.weaponKey || 'pistol').toLowerCase();
  let dirX = Number(event.vx) || 1;
  let dirY = Number(event.vy) || 0;
  const speed = Math.max(120, Math.hypot(dirX, dirY) || (weaponKey === 'sniper' ? 3050 : 920));
  dirX /= speed;
  dirY /= speed;
  const ownerRender = replayShot ? owner : getPlayerRenderPos(owner);
  const anchor = {
    x: (Number(ownerRender?.x) || Number(event.x) || 0) + dirX * 20,
    y: (Number(ownerRender?.y) || Number(event.y) || 0) + dirY * 20,
    a: Math.atan2(dirY, dirX || 1),
    owner,
  };
  const fakeBulletId = `shot-event:${eventId}`;
  const alreadyVisualized = visuals.spectatorMuzzleBulletIds instanceof Set
    && visuals.spectatorMuzzleBulletIds.has(fakeBulletId);
  const fakeBullet = {
    id: fakeBulletId,
    ownerId,
    ownerPlayerId: event.ownerPlayerId || '',
    weaponKey,
    shooterType: event.shooterType || 'player',
    color: event.color || '#facc15',
    x: Number(event.x) || anchor.x,
    y: Number(event.y) || anchor.y,
    vx: dirX * speed,
    vy: dirY * speed,
    radius: Math.max(2, Number(event.radius) || 3),
  };
  spawnSpectatorBulletMuzzleFx(fakeBullet, anchor);
  if (replayShot && !alreadyVisualized && replayGame.playing && !replayGame.seeking) {
    window.cwPlaySfx?.('shot', {
      x: anchor.x,
      y: anchor.y,
      weaponKey,
      key: `replayShot:${eventId}`,
      minGapMs: 0,
      radius: 1600,
      volume: ownerId === game.myId ? 0.88 : 0.42,
      replay: true,
    });
  }

  // Replay frames already contain their own bullet positions. Shot events in
  // replay are only used to restore muzzle/audio timing, otherwise we can draw
  // the same shot twice in different directions.
  if (replayShot) return;

  const bulletId = event.bulletId;
  const hasRealBullet = bulletId !== undefined && bulletId !== null && (
    game.renderBullets.has(bulletId)
    || (state?.bullets || []).some((b) => String(b?.id) === String(bulletId))
  );
  if (hasRealBullet) return;

  const syntheticId = `synthetic-shot:${eventId}`;
  if (game.renderBullets.has(syntheticId)) return;
  game.renderBullets.set(syntheticId, {
    id: syntheticId,
    x: anchor.x + dirX * 8,
    y: anchor.y + dirY * 8,
    serverX: anchor.x + dirX * 120,
    serverY: anchor.y + dirY * 120,
    ownerId,
    ownerPlayerId: event.ownerPlayerId || '',
    vx: dirX * Math.min(speed, weaponKey === 'sniper' ? 1500 : 920),
    vy: dirY * Math.min(speed, weaponKey === 'sniper' ? 1500 : 920),
    color: event.color || '#facc15',
    kind: 'bullet',
    radius: Math.max(2, Number(event.radius) || 3),
    shooterType: event.shooterType || 'player',
    weaponKey,
    syntheticShot: true,
    syntheticExpiresAt: performance.now() + (weaponKey === 'sniper' ? 105 : 85),
  });
}

function updateEnemyInterpolation(dt) {
  if (!game.state) return;
  const targetMap = game.sampledNet?.enemies || mapById(game.state.enemies);
  const usingBufferedTargets = Boolean(game.sampledNet?.enemies);
  const statePerfAt = usingBufferedTargets ? 0 : Math.max(0, Number(netStats?.lastStateAt) || 0);
  const extraSec = usingBufferedTargets ? 0 : getLiveStateExtrapolationSec();
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt);
  const alive = new Set();

  for (const [id, e] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderEnemies.get(id);
    if (!r) {
      r = {
        x: e.x,
        y: e.y,
        vx: 0,
        vy: 0,
        faceLeft: Boolean(e.faceLeft),
        serverVx: 0,
        serverVy: 0,
        serverStatePerfAt: statePerfAt,
        serverStateX: Number(e.x) || 0,
        serverStateY: Number(e.y) || 0,
      };
      game.renderEnemies.set(id, r);
      continue;
    }

    if (replayGame.active) {
      const targetX = Number(e.x) || 0;
      const targetY = Number(e.y) || 0;
      const dx = targetX - r.x;
      const dy = targetY - r.y;
      if (dx * dx + dy * dy > (320 * 320)) {
        r.vx = 0;
        r.vy = 0;
      } else {
        r.vx = dx / Math.max(0.001, dt);
        r.vy = dy / Math.max(0.001, dt);
      }
      if (typeof e.faceLeft === 'boolean') r.faceLeft = e.faceLeft;
      else if (Math.abs(Number(r.vx) || 0) > 0.15) r.faceLeft = (Number(r.vx) || 0) < 0;
      r.x = targetX;
      r.y = targetY;
      continue;
    }

    const maxSpeed = (() => {
      const type = String(e?.type || '').toLowerCase();
      if (type === 'boss') return 900;
      if (type === 'charger') return 720;
      return 520;
    })();
    const predictedTarget = usingBufferedTargets
      ? { x: Number(e.x) || 0, y: Number(e.y) || 0, vx: Number(e.vx) || 0, vy: Number(e.vy) || 0 }
      : resolveLiveEntityTarget(r, e, statePerfAt, extraSec, maxSpeed);
    const nx = r.x + (predictedTarget.x - r.x) * alpha;
    const ny = r.y + (predictedTarget.y - r.y) * alpha;
    r.vx = usingBufferedTargets ? (nx - r.x) / Math.max(0.001, dt) : predictedTarget.vx;
    r.vy = usingBufferedTargets ? (ny - r.y) / Math.max(0.001, dt) : predictedTarget.vy;
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
  if (isSpectatorSmoothingView() && !replayGame.active) return;
  const alive = new Set();

  for (const b of nextState.bullets) {
    const id = b.id;
    if (!id) continue;
    alive.add(id);

    let r = game.renderBullets.get(id);
    if (!r) {
      if (isSpectatorSmoothingView() && !replayGame.active) continue;
      r = {
        id,
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

    r.id = id;
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
      const spawnAnchor = getSpectatorBulletSpawnAnchor(tb);
      const visualTarget = getSpectatorBulletVisualTarget(tb);
      r = {
        id,
        x: spawnAnchor?.x ?? tb.x,
        y: spawnAnchor?.y ?? tb.y,
        serverX: visualTarget?.x ?? tb.x,
        serverY: visualTarget?.y ?? tb.y,
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

    r.id = id;
    const visualTarget = getSpectatorBulletVisualTarget(tb);
    r.serverX = visualTarget?.x ?? tb.x;
    r.serverY = visualTarget?.y ?? tb.y;
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
        const trailNow = performance.now();
        const lastTrailAt = Math.max(0, Number(r.replayTrailAt) || 0);
        if ((dx * dx + dy * dy) >= 0.49 && trailNow - lastTrailAt >= 55) {
          const invDt = 1 / Math.max(0.001, dt);
          const trailVx = Number(tb.vx) || (dx * invDt);
          const trailVy = Number(tb.vy) || (dy * invDt);
          spawnRocketTrailFx(r.x, r.y, trailVx, trailVy, tb.color || '#fb923c');
          r.replayTrailAt = trailNow;
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
    if (alive.has(id)) continue;
    const r = game.renderBullets.get(id);
    if (r?.syntheticShot && Number(r.syntheticExpiresAt) > performance.now()) {
      r.x += (Number(r.vx) || 0) * dt;
      r.y += (Number(r.vy) || 0) * dt;
      continue;
    }
    game.renderBullets.delete(id);
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
  const rendered = id && game.renderBullets.get(id);
  if (rendered) return rendered;
  if (isSpectatorSmoothingView() && !replayGame.active) return null;
  return bullet;
}

function getBulletsForRender() {
  if (replayGame.active) {
    return game.state?.bullets || [];
  }
  if (isSpectatorSmoothingView() && !replayGame.active) {
    return Array.from(game.renderBullets.values());
  }
  return game.state?.bullets || [];
}
function pushNetSnapshot(state) {
  if (!isSpectatorSmoothingView()) return;
  const snap = {
    t: performance.now(),
    players: state.players.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      alive: Boolean(p.alive),
      moveSpeed: Math.max(0, Number(p.moveSpeed) || 0),
      dodgeInvulnUntil: Number(p.dodgeInvulnUntil) || 0,
    })),
    enemies: state.enemies.map((e) => ({
      id: e.id,
      type: e.type || 'normal',
      x: e.x,
      y: e.y,
      faceLeft: Boolean(e.faceLeft),
    })),
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

function pushLiveEntitySnapshot(state) {
  if (isSpectatorSmoothingView()) return;
  const snap = {
    t: performance.now(),
    players: state.players.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      alive: Boolean(p.alive),
      moveSpeed: Math.max(0, Number(p.moveSpeed) || 0),
      dodgeInvulnUntil: Number(p.dodgeInvulnUntil) || 0,
      isCompanion: Boolean(p.isCompanion),
    })),
    enemies: state.enemies.map((e) => ({
      id: e.id,
      type: e.type || 'normal',
      x: e.x,
      y: e.y,
      faceLeft: Boolean(e.faceLeft),
    })),
  };
  game.liveEntitySnapshots.push(snap);
  if (game.liveEntitySnapshots.length > 6) game.liveEntitySnapshots.shift();
}

function mapById(list) {
  const out = new Map();
  for (const item of list) out.set(item.id, item);
  return out;
}

function deriveSnapshotVelocity(prevItem, nextItem, dtMs, maxSpeed = 0) {
  const fallback = {
    vx: Number(nextItem?.vx) || 0,
    vy: Number(nextItem?.vy) || 0,
  };
  if (!prevItem || dtMs <= 0) return fallback;

  let vx = ((Number(nextItem?.x) || 0) - (Number(prevItem?.x) || 0)) / Math.max(0.001, dtMs / 1000);
  let vy = ((Number(nextItem?.y) || 0) - (Number(prevItem?.y) || 0)) / Math.max(0.001, dtMs / 1000);

  const speed = Math.hypot(vx, vy);
  const cappedSpeed = Math.max(0, Number(maxSpeed) || 0);
  if (cappedSpeed > 0 && speed > cappedSpeed) {
    const scale = cappedSpeed / Math.max(0.001, speed);
    vx *= scale;
    vy *= scale;
  }

  return { vx, vy };
}

function getLiveStateExtrapolationSec() {
  const lastStateAt = Math.max(0, Number(netStats?.lastStateAt) || 0);
  if (lastStateAt <= 0) return 0;
  const observedIntervalMs = Math.max(1, getObservedStateIntervalMs());
  const maxExtraMs = Math.min(
    Math.max(16, observedIntervalMs * 0.9),
    Math.max(20, Number(roomSync.maxExtrapolationMs) || 0),
  );
  const ageMs = Math.max(0, performance.now() - lastStateAt);
  return Math.max(0, Math.min(maxExtraMs, ageMs)) / 1000;
}

function resolveLiveEntityTarget(renderEntry, item, statePerfAt, extraSec, maxSpeed = 0) {
  const stateX = Number(item?.x) || 0;
  const stateY = Number(item?.y) || 0;
  if (!renderEntry || typeof renderEntry !== 'object') {
    return { x: stateX, y: stateY, vx: 0, vy: 0 };
  }

  const prevPerfAt = Math.max(0, Number(renderEntry.serverStatePerfAt) || 0);
  const prevStateX = Number.isFinite(Number(renderEntry.serverStateX)) ? Number(renderEntry.serverStateX) : stateX;
  const prevStateY = Number.isFinite(Number(renderEntry.serverStateY)) ? Number(renderEntry.serverStateY) : stateY;
  const isNewState = statePerfAt > 0 && statePerfAt !== prevPerfAt;

  if (isNewState) {
    const prevItem = prevPerfAt > 0
      ? { x: prevStateX, y: prevStateY, vx: Number(renderEntry.serverVx) || 0, vy: Number(renderEntry.serverVy) || 0 }
      : null;
    const vel = deriveSnapshotVelocity(prevItem, { x: stateX, y: stateY }, Math.max(1, statePerfAt - prevPerfAt), maxSpeed);
    renderEntry.serverVx = vel.vx;
    renderEntry.serverVy = vel.vy;
    renderEntry.serverStatePerfAt = statePerfAt;
    renderEntry.serverStateX = stateX;
    renderEntry.serverStateY = stateY;
  } else if (prevPerfAt <= 0) {
    renderEntry.serverVx = 0;
    renderEntry.serverVy = 0;
    renderEntry.serverStatePerfAt = statePerfAt;
    renderEntry.serverStateX = stateX;
    renderEntry.serverStateY = stateY;
  }

  return {
    x: stateX + (Number(renderEntry.serverVx) || 0) * extraSec,
    y: stateY + (Number(renderEntry.serverVy) || 0) * extraSec,
    vx: Number(renderEntry.serverVx) || 0,
    vy: Number(renderEntry.serverVy) || 0,
  };
}

function extrapolateSnapshotMap(previousList, latestList, dtMs, extraSec, options = {}) {
  const latest = Array.isArray(latestList) ? latestList : [];
  const previous = mapById(Array.isArray(previousList) ? previousList : []);
  const out = new Map();
  const resolveMaxSpeed = typeof options.resolveMaxSpeed === 'function' ? options.resolveMaxSpeed : null;
  const includeVelocity = options.withVel === true;

  for (const item of latest) {
    const prevItem = previous.get(item.id);
    const aliveKnown = typeof prevItem?.alive === 'boolean' && typeof item?.alive === 'boolean';
    const aliveChanged = aliveKnown && (Boolean(prevItem.alive) !== Boolean(item.alive));
    const maxSpeed = resolveMaxSpeed ? Math.max(0, Number(resolveMaxSpeed(item, prevItem)) || 0) : 0;
    const vel = deriveSnapshotVelocity(prevItem, item, dtMs, maxSpeed);
    const canAdvance = extraSec > 0 && !aliveChanged && (typeof item?.alive !== 'boolean' || Boolean(item.alive));

    out.set(item.id, {
      ...item,
      x: canAdvance ? ((Number(item.x) || 0) + vel.vx * extraSec) : (Number(item.x) || 0),
      y: canAdvance ? ((Number(item.y) || 0) + vel.vy * extraSec) : (Number(item.y) || 0),
      vx: includeVelocity ? vel.vx : (Number(item.vx) || 0),
      vy: includeVelocity ? vel.vy : (Number(item.vy) || 0),
    });
  }

  return out;
}

function interpolateSnapshotMap(la, lb, k, withVel, snapDistanceSq = Infinity) {
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
        moveSpeed: Number(pb.moveSpeed ?? pa.moveSpeed) || 0,
        isCompanion: Boolean(pb.isCompanion ?? pa.isCompanion),
      });
    } else {
      out.set(id, pb || pa);
    }
  }

  return out;
}

function getLiveEntityRenderDelayMs() {
  const observedIntervalMs = getObservedStateIntervalMs();
  const jitterPadMs = Math.min(18, Math.max(0, Number(netStats?.jitterMs) || 0) * 0.8);
  return Math.max(28, Math.min(72, observedIntervalMs * 0.88 + jitterPadMs));
}

function sampleLiveEntityTargets() {
  const snaps = game.liveEntitySnapshots;
  if (!Array.isArray(snaps) || snaps.length <= 0) return null;
  if (snaps.length === 1) {
    return {
      players: mapById(snaps[0].players || []),
      enemies: mapById(snaps[0].enemies || []),
    };
  }

  const target = performance.now() - getLiveEntityRenderDelayMs();
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
    const previous = snaps[snaps.length - 2] || latest;
    const latestDtMs = Math.max(1, latest.t - previous.t);
    const extraMs = Math.min(Math.max(16, getObservedStateIntervalMs() * 0.35), Math.max(0, target - latest.t));
    const extraSec = Math.max(0, extraMs / 1000);
    return {
      players: extrapolateSnapshotMap(previous.players, latest.players, latestDtMs, extraSec, {
        resolveMaxSpeed: (item) => {
          const baseSpeed = Math.max(0, Number(item?.moveSpeed) || 0);
          const dodgeActive = Number(item?.dodgeInvulnUntil) > Date.now();
          return Math.max(260, baseSpeed * (dodgeActive ? 2.8 : 1.9));
        },
      }),
      enemies: extrapolateSnapshotMap(previous.enemies, latest.enemies, latestDtMs, extraSec, {
        resolveMaxSpeed: (item) => {
          const type = String(item?.type || '').toLowerCase();
          if (type === 'boss') return 900;
          if (type === 'charger') return 720;
          return 520;
        },
      }),
    };
  }

  const dt = Math.max(1, b.t - a.t);
  const k = Math.max(0, Math.min(1, (target - a.t) / dt));
  return {
    players: interpolateSnapshotMap(a.players, b.players, k, false, 210 * 210),
    enemies: interpolateSnapshotMap(a.enemies, b.enemies, k, false),
  };
}

function sampleBufferedState() {
  const snaps = game.netSnapshots;
  if (snaps.length === 0) return null;

  const target = performance.now() - getEffectiveNetRenderDelayMs();
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
    const previous = snaps.length > 1 ? snaps[snaps.length - 2] : null;
    const latestDtMs = previous ? Math.max(1, latest.t - previous.t) : 0;
    const extraMs = Math.min(roomSync.maxExtrapolationMs, target - latest.t);
    const extraSec = Math.max(0, extraMs / 1000);

    const bullets = latest.bullets.map((x) => ({
      ...x,
      x: x.x + x.vx * extraSec,
      y: x.y + x.vy * extraSec,
    }));

    return {
      players: extrapolateSnapshotMap(previous?.players, latest.players, latestDtMs, extraSec, {
        resolveMaxSpeed: (item) => {
          const baseSpeed = Math.max(0, Number(item?.moveSpeed) || 0);
          const dodgeActive = Number(item?.dodgeInvulnUntil) > Date.now();
          return Math.max(260, baseSpeed * (dodgeActive ? 2.8 : 1.9));
        },
      }),
      enemies: extrapolateSnapshotMap(previous?.enemies, latest.enemies, latestDtMs, extraSec, {
        resolveMaxSpeed: (item) => {
          const type = String(item?.type || '').toLowerCase();
          if (type === 'boss') return 900;
          if (type === 'charger') return 720;
          return 520;
        },
      }),
      bullets: mapById(bullets),
      xpOrbs: extrapolateSnapshotMap(previous?.xpOrbs || [], latest.xpOrbs || [], latestDtMs, extraSec),
    };
  }

  const dt = Math.max(1, b.t - a.t);
  const k = Math.max(0, Math.min(1, (target - a.t) / dt));

  return {
    players: interpolateSnapshotMap(a.players, b.players, k, false, 210 * 210),
    enemies: interpolateSnapshotMap(a.enemies, b.enemies, k, false),
    bullets: interpolateSnapshotMap(a.bullets, b.bullets, k, true),
    xpOrbs: interpolateSnapshotMap(a.xpOrbs || [], b.xpOrbs || [], k, false),
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

function isCompactLiveEnemyTuple(enemy) {
  return Array.isArray(enemy) && enemy.length >= 7;
}

function isCompactLiveBulletTuple(bullet) {
  return Array.isArray(bullet) && bullet.length >= 13;
}

function isCompactLiveXpOrbTuple(orb) {
  return Array.isArray(orb) && orb.length >= 4;
}

function isCompactLiveDropTuple(drop) {
  return Array.isArray(drop) && drop.length >= 6;
}

function isCompactLiveSkillOrbTuple(orb) {
  return Array.isArray(orb) && orb.length >= 6;
}

function ageLiveTimedList(list, deltaMs, options = {}) {
  const source = Array.isArray(list) ? list : [];
  const dtMs = Math.max(0, Number(deltaMs) || 0);
  const ttlMaxMsDefault = Math.max(0, Number(options.ttlMaxMsDefault) || 0);
  const keepExpired = options.keepExpired === true;
  const out = [];
  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const next = { ...item };
    if (Number.isFinite(Number(next.ttlMs))) next.ttlMs = Math.max(0, Number(next.ttlMs) - dtMs);
    if (!Number.isFinite(Number(next.ttlMaxMs)) && ttlMaxMsDefault > 0) next.ttlMaxMs = ttlMaxMsDefault;
    if (!keepExpired && Number.isFinite(Number(next.ttlMs)) && next.ttlMs <= 0) continue;
    out.push(next);
  }
  return out;
}

function carryForwardOmittedRealtimeCollections(state, previousState = null) {
  if (!state || typeof state !== 'object' || !previousState || typeof previousState !== 'object') return state;
  const deltaMs = Math.max(0, (Number(state.now) || 0) - (Number(previousState.now) || 0));
  if (!Array.isArray(state.drops) && Array.isArray(previousState.drops)) {
    state.drops = ageLiveTimedList(previousState.drops, deltaMs, { ttlMaxMsDefault: 20000 });
  }
  if (!Array.isArray(state.xpOrbs) && Array.isArray(previousState.xpOrbs)) {
    state.xpOrbs = ageLiveTimedList(previousState.xpOrbs, deltaMs, { ttlMaxMsDefault: 14000 });
  }
  if (!Array.isArray(state.skillOrbs) && Array.isArray(previousState.skillOrbs)) {
    state.skillOrbs = ageLiveTimedList(previousState.skillOrbs, deltaMs, { ttlMaxMsDefault: 15000 });
  }
  return state;
}

function normalizeLiveStatePayload(state) {
  if (!state || typeof state !== 'object') return state;

  if (Array.isArray(state.bullets) && state.bullets.some(isCompactLiveBulletTuple)) {
    state.bullets = state.bullets.map((bullet) => {
      if (!isCompactLiveBulletTuple(bullet)) return bullet;
      return {
        id: bullet[0],
        ownerId: bullet[1] || '',
        ownerPlayerId: bullet[2] || '',
        weaponKey: bullet[3] || '',
        x: Number(bullet[4]) || 0,
        y: Number(bullet[5]) || 0,
        vx: Number(bullet[6]) || 0,
        vy: Number(bullet[7]) || 0,
        color: bullet[8] || '',
        kind: bullet[9] || 'bullet',
        radius: Math.max(2, Number(bullet[10]) || 2),
        fromEnemy: Boolean(bullet[11]),
        shooterType: bullet[12] || '',
      };
    });
  }

  if (Array.isArray(state.enemies) && state.enemies.some(isCompactLiveEnemyTuple)) {
    state.enemies = state.enemies.map((enemy) => {
      if (!isCompactLiveEnemyTuple(enemy)) return enemy;
      return {
        id: enemy[0],
        type: enemy[1] || 'normal',
        x: Number(enemy[2]) || 0,
        y: Number(enemy[3]) || 0,
        hp: Math.max(0, Number(enemy[4]) || 0),
        maxHp: Math.max(1, Number(enemy[5]) || 1),
        radius: Math.max(18, Number(enemy[6]) || 18),
        faceLeft: Boolean(enemy[7]),
      };
    });
  }

  if (Array.isArray(state.xpOrbs) && state.xpOrbs.some(isCompactLiveXpOrbTuple)) {
    state.xpOrbs = state.xpOrbs.map((orb) => {
      if (!isCompactLiveXpOrbTuple(orb)) return orb;
      return {
        id: orb[0],
        x: Number(orb[1]) || 0,
        y: Number(orb[2]) || 0,
        ttlMs: Math.max(0, Number(orb[3]) || 0),
        ttlMaxMs: 14000,
      };
    });
  }

  if (Array.isArray(state.drops) && state.drops.some(isCompactLiveDropTuple)) {
    state.drops = state.drops.map((drop) => {
      if (!isCompactLiveDropTuple(drop)) return drop;
      const kind = drop[3] || 'weapon';
      const weaponKey = drop[4] || null;
      return {
        id: drop[0],
        x: Number(drop[1]) || 0,
        y: Number(drop[2]) || 0,
        kind,
        weaponKey: kind === 'xp_vacuum' ? null : weaponKey,
        weaponLabel: kind === 'xp_vacuum' ? 'XP Surge' : (weaponKey || 'Weapon'),
        ttlMs: Math.max(0, Number(drop[5]) || 0),
        ttlMaxMs: 20000,
      };
    });
  }

  if (Array.isArray(state.skillOrbs) && state.skillOrbs.some(isCompactLiveSkillOrbTuple)) {
    state.skillOrbs = state.skillOrbs.map((orb) => {
      if (!isCompactLiveSkillOrbTuple(orb)) return orb;
      return {
        id: orb[0],
        ownerId: orb[1] || '',
        skillId: orb[2] || '',
        x: Number(orb[3]) || 0,
        y: Number(orb[4]) || 0,
        ttlMs: Math.max(0, Number(orb[5]) || 0),
        ttlMaxMs: 15000,
      };
    });
  }

  return state;
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
  const nowMs = performance.now();
  if (!scoreboardMinimized && nowMs - lastScoreboardUpdateAt < 250) return;
  lastScoreboardUpdateAt = nowMs;
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
    const reserve = p.reserveAmmo === null ? '∞' : Math.max(0, Number(p.reserveAmmo) || 0);
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
  const livesInSettings = Boolean(syncSettingsEl.closest('#menu-panel-menu'));
  syncSettingsEl.style.display = livesInSettings || joinMode === 'create' ? '' : 'none';
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
    { title: `Взяли навык: ${skillLabel}.`, text: 'Отлично, билд только что стал либо сильнее, либо гораздо смешнее. Скоро увидим какой именно вариант выпал.' },
    { title: `${skillLabel} добавлен в арсенал.`, text: 'Очень люблю этот момент: игрок делает серьёзное лицо и выбирает себе новые способы создавать хаос.' },
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

function requestRoomsList(...args) {
  return globalThis.CWRoomsList?.request?.(...args);
}

function requestRecordsList(...args) {
  return globalThis.CWRecordsList?.request?.(...args);
}

function cancelPendingDeathOverlay() {
  return globalThis.CWDeath?.cancelPending?.();
}

function clearDeathCameraLock() {
  return globalThis.CWDeath?.clearCamera?.();
}

function clearHitScreenOverlayFx() {
  return globalThis.CWDeath?.clearHitOverlay?.();
}

function setDeathCinematicActive(active) {
  return globalThis.CWDeath?.setCinematic?.(active);
}

function clearDeathRewardsUi() {
  return globalThis.CWDeath?.clearRewards?.();
}

function formatRunRewardsPayload(rewards) {
  return globalThis.CWDeath?.formatRewards?.(rewards) || {
    gainedXp: 0,
    gainedShards: 0,
    levelsGained: 0,
    cards: [],
    items: [],
  };
}

function renderDeathRewardsPanel() {
  return globalThis.CWDeath?.renderRewards?.();
}

function lockCameraForDeathSequence() {
  return globalThis.CWDeath?.lockCamera?.();
}

function spawnPlayerDeathBloodFx(result) {
  return globalThis.CWDeath?.spawnPlayerBlood?.(result);
}

function openDeathOverlay(result) {
  return globalThis.CWDeath?.open?.(result);
}

function scheduleDeathOverlay(result) {
  return globalThis.CWDeath?.schedule?.(result);
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
  if (commentatorSpeech.volumeRestartTimer) {
    window.clearTimeout(commentatorSpeech.volumeRestartTimer);
    commentatorSpeech.volumeRestartTimer = 0;
  }
  commentatorSpeech.lastKey = '';
  commentatorSpeech.activeSinceAt = 0;
  commentatorSpeech.activeItem = null;
  commentatorSpeech.lastQueuedText = '';
  commentatorSpeech.activeKey = '';
  commentatorSpeech.activeText = '';
  commentatorSpeech.lastRate = 0;
  commentatorSpeech.queue = [];
  commentatorSpeech.totalQueued = 0;
  commentatorSpeech.totalStarted = 0;
  commentatorSpeech.totalSpoken = 0;
  commentatorSpeech.totalDropped = 0;
  commentatorSpeech.peakQueueLength = 0;
  commentatorSpeech.recentKeys.clear();
  commentatorSpeech.seq += 1;
  if (commentatorSpeech.supported) window.speechSynthesis.cancel();
  renderCommentatorSpeechMonitor();
  if (commentatorTitleEl) commentatorTitleEl.textContent = 'Матч загружается. Сарказм прогревается.';
  if (commentatorTextEl) commentatorTextEl.textContent = 'Как только на карте начнётся хоть какая-то драма, я сразу это отмечу.';
  game.myId = null;
  game.spectating = false;
  game.roomCode = null;
  game.state = null;
  game.netSnapshots = [];
  game.liveEntitySnapshots = [];
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
  game.spectatorCount = 0;
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
  if (typeof window.cwClearStoredActiveRunResume === 'function') {
    window.cwClearStoredActiveRunResume();
  }
  clearLocalSessionState();
}

refreshRecordsBtn?.addEventListener('click', () => {
  requestRecordsList(recordsUi.page);
});

setInterval(() => {
  if (!game.myId && !game.spectating && game.connected) {
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }
}, 5000);

function startPendingRoomIntent() {
  if (!game.connected) return false;
  if (pendingAutoSpectate && roomCodeInput?.value) {
    pendingAutoSpectate = false;
    joinMode = 'join';
    void sendSpectateRequest(roomCodeInput.value.trim(), { skipRouting: true });
    return true;
  }
  if (pendingAutoJoin && roomCodeInput?.value) {
    pendingAutoJoin = false;
    joinMode = 'join';
    void sendJoinRequest(roomCodeInput.value.trim(), null, {
      skipRouting: true,
      source: pendingStoredRunResume ? 'auto_resume' : 'auto_join',
      resumeOnly: pendingStoredRunResume,
    });
    return true;
  }
  if (pendingAutoCreate) {
    pendingAutoCreate = false;
    joinMode = 'create';
    void sendJoinRequest('', configFromSyncUi(), { skipRouting: true });
    return true;
  }
  return false;
}

window.cwStartPendingRoomIntent = startPendingRoomIntent;

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
  startPendingRoomIntent();
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
    game.spectatorCount = Math.max(0, Number(msg.spectators ?? msg.spectatorCount) || 0);
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
    game.liveEntitySnapshots = [];
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
    visuals.spectatorMuzzleBulletIds = new Set();
    visuals.dropPrev = new Map();
    visuals.xpOrbPrev = new Map();
    visuals.prevBossAlive = false;
    roomMetaEl.textContent = `Room: ${msg.roomCode}`;
    if (!game.spectating) copyRoomCodeToClipboard(msg.roomCode, { silent: true });
    statusEl.textContent = game.spectating
      ? `Spectating room ${msg.roomCode} | tick ${roomSync.tickRate}`
      : (msg.resumed ? `Reconnected as ${msg.id} | tick ${roomSync.tickRate}` : `Online as ${msg.id} | tick ${roomSync.tickRate}`);
    if (!game.spectating && msg.me?.playerAccountId && typeof window.cwSetStoredActiveRunResume === 'function') {
      window.cwSetStoredActiveRunResume(msg.roomCode, msg.me.playerAccountId);
    }
    if (!game.spectating) pendingStoredRunResume = false;
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
      game.spectating ? 'Арена уже в эфире.' : 'Матч начался. Самоуверенность тоже.',
      game.spectating
        ? `Подглядываем за комнатой ${msg.roomCode} без права вмешаться. Смотреть безопаснее, чем участвовать.`
        : `Комната ${msg.roomCode} загружена. Посмотрим, насколько быстро арена объяснит всем правила через боль.`,
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
          void sendJoinRequest(msg.roomCode || roomCodeInput?.value || '', null, {
            skipRouting: true,
            source: pendingStoredRunResume ? 'auto_resume' : 'menu',
            resumeOnly: pendingStoredRunResume,
          });
        }
      } catch {
        statusEl.textContent = msg.message || 'Failed to switch game server.';
        setJoinFeedback(msg.message || 'Failed to switch game server.');
      }
      return;
    }
    if (pendingStoredRunResume) {
      pendingStoredRunResume = false;
      if (typeof window.cwClearStoredActiveRunResume === 'function') {
        window.cwClearStoredActiveRunResume();
      }
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
    const previousState = game.state;
    const s = normalizeLiveStatePayload(msg.payload);
    carryForwardOmittedRealtimeCollections(s, previousState);
    if ((!s.decor || !Array.isArray(s.decor.trees)) && game.state?.decor) {
      s.decor = game.state.decor;
    }
    if (game.embedMode && game.spectating) {
      window.parent?.postMessage({
        type: 'cw-live-spectator',
        status: 'ready',
        roomCode: String(s?.roomCode || game.roomCode || ''),
        players: Array.isArray(s?.players) ? s.players.filter((p) => p && !p.isCompanion).length : 0,
        enemies: Array.isArray(s?.enemies) ? s.enemies.length : 0,
        spectators: Math.max(0, Number(s?.spectators ?? s?.spectatorCount) || 0),
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
    game.spectatorCount = Math.max(0, Number(s.spectators ?? s.spectatorCount) || 0);
    game.roomDifficulty = s.roomDifficulty || game.roomDifficulty;
    if (isSpectatorSmoothingView()) {
      pushNetSnapshot(s);
      if (Array.isArray(game.liveEntitySnapshots) && game.liveEntitySnapshots.length > 0) game.liveEntitySnapshots.length = 0;
    } else {
      pushLiveEntitySnapshot(s);
      if (Array.isArray(game.netSnapshots) && game.netSnapshots.length > 0) game.netSnapshots.length = 0;
    }
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

    const nextTrees = s.decor?.trees || [];
    if (game.sortedTreesRoomCode !== s.roomCode || game.sortedTreesSourceCount !== nextTrees.length) {
      game.sortedTrees = nextTrees.slice().sort((a, b) => a.y - b.y);
      game.sortedTreesRoomCode = s.roomCode;
      game.sortedTreesSourceCount = nextTrees.length;
    }
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
      const reserve = me.reserveAmmo === null ? '∞' : Math.max(0, Number(me.reserveAmmo) || 0);
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
              title: 'Герой закончился раньше матча.',
              text: 'Классика жанра: амбиции были огромные, полоска хп оказалась короче.',
            },
            {
              title: 'Финал получился короткий, но выразительный.',
              text: 'Арена приняла смелость к сведению и тут же оформила увольнение без выходного пособия.',
            },
            {
              title: 'На этом забег официально превратился в статистику.',
              text: 'Публика аплодирует, монстры доедают уверенность, а комментатор делает пометку: жить хотелось, но не срослось.',
            },
            {
              title: 'Героизм встретился с бухгалтерией урона.',
              text: 'Сошлись цифры, и выяснилось неприятное: входящего было больше, чем хотелось бы для дальнейшей жизни.',
            },
            {
              title: 'Катка закончилась в лучших традициях арены.',
              text: 'Шума было много, планов ещё больше, а вот запас прочности снова подвёл коллектив мечты.',
            },
            {
              title: 'Очень смелое решение умереть именно здесь.',
              text: 'Зрелищно, внезапно и с тем самым послевкусием, когда хочется винить всё, кроме собственного позиционирования.',
            },
          ], 'player_final_death', 6000, { silent: true });
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
        setCommentatorLine('Нокдаун без права на драматическую паузу.', `Респавн через ${leftSec}с. Отличный момент пересмотреть свои отношения с входящим уроном.`, 'player_respawn_wait', 5000);
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
  localizeSettingsMenuControls();
  applyMenuButtonGlyph(toggleInfoBtn);
  applyMenuButtonGlyph(joinToggleInfoBtn);
  renderGameVersionHistory();
  globalThis.CWNews?.render?.();
  globalThis.CWRating?.render?.();
  globalThis.CWProfile?.renderFromCurrentState?.();
  updateTabScoreboard(lastBattlePlayers);
});

void maybeStartReplayFromUrl();
