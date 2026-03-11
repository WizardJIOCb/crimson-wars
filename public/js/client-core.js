
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const statusEl = document.getElementById('status');
const instanceMetaEl = document.getElementById('instance-meta');
const roomMetaEl = document.getElementById('room-meta');
const weaponMetaEl = document.getElementById('weapon-meta');
const movementMetaEl = document.getElementById('movement-meta');
const netMetaEl = document.getElementById('net-meta');
const showFpsToggleEl = document.getElementById('show-fps-toggle');
const fpsCornerEl = document.getElementById('fps-corner');
const showMinimapToggleEl = document.getElementById('show-minimap-toggle');
const minimapWrapEl = document.getElementById('minimap-wrap');
const minimapCanvasEl = document.getElementById('minimap');
const qualitySelect = document.getElementById('quality-select');
const shadowToggleEl = document.getElementById('shadow-toggle');
const bulletTracersToggleEl = document.getElementById('bullet-tracers-toggle');
const enemyHpToggleEl = document.getElementById('enemy-hp-toggle');
const extraBloodToggleEl = document.getElementById('extra-blood-toggle');
const hitEffectsToggleEl = document.getElementById('hit-effects-toggle');
const autoFireToggleEl = document.getElementById('auto-fire-toggle');
const connIndicatorToggleEl = document.getElementById('conn-indicator-toggle');
const scoreboardEl = document.getElementById('scoreboard');
const hudEl = document.getElementById('hud');
const joinOverlay = document.getElementById('join-overlay');
const joinForm = document.getElementById('join-form');
const playerAccessDetailsEl = document.getElementById('player-access-details');
const nameInput = document.getElementById('name');
const nicknameHintEl = document.getElementById('nickname-hint');
const playerAuthSummaryEl = document.getElementById('player-auth-summary');
const playerAuthFeedbackEl = document.getElementById('player-auth-feedback');
const joinFeedbackEl = document.getElementById('join-feedback');
const playerLogoutBtn = document.getElementById('player-logout');
const authTabButtons = Array.from(document.querySelectorAll('[data-auth-tab]'));
const authPanels = Array.from(document.querySelectorAll('[data-auth-panel]'));
const authLoginNicknameEl = document.getElementById('auth-login-nickname');
const authLoginPasswordEl = document.getElementById('auth-login-password');
const playerLoginBtn = document.getElementById('player-login');
const authRegisterNicknameEl = document.getElementById('auth-register-nickname');
const authRegisterPasswordEl = document.getElementById('auth-register-password');
const playerRegisterBtn = document.getElementById('player-register');
const characterSelectEl = document.getElementById('character-select');
const roomCodeInput = document.getElementById('room-code');
const refreshRoomsBtn = document.getElementById('refresh-rooms');
const roomsListEl = document.getElementById('rooms-list');
const presenceMetaEl = document.getElementById('presence-meta');
const refreshRecordsBtn = document.getElementById('refresh-records');
const recordsListEl = document.getElementById('records-list');
const recordsPrevBtn = document.getElementById('records-prev');
const recordsNextBtn = document.getElementById('records-next');
const recordsPageEl = document.getElementById('records-page');
const recordsTotalEl = document.getElementById('records-total');
const recordDetailsModalEl = document.getElementById('record-details-modal');
const recordDetailsTitleEl = document.getElementById('record-details-title');
const recordDetailsBodyEl = document.getElementById('record-details-body');
const recordDetailsCloseBtn = document.getElementById('record-details-close');
const deathResultEl = document.getElementById('death-result');
const deathCinematicEl = document.getElementById('death-cinematic');
const deathContinueBtn = document.getElementById('death-continue');
const syncSettingsEl = document.getElementById('sync-settings');
const syncPresetEl = document.getElementById('sync-preset');
const syncTickrateEl = document.getElementById('sync-tickrate');
const syncStateRateEl = document.getElementById('sync-state-rate');
const syncRenderDelayEl = document.getElementById('sync-render-delay');
const syncMaxExtrapolationEl = document.getElementById('sync-max-extrapolation');
const syncEntityInterpEl = document.getElementById('sync-entity-interp');
const syncBulletCorrectionEl = document.getElementById('sync-bullet-correction');
const syncInputRateEl = document.getElementById('sync-input-rate');
const infoPanelEl = document.getElementById('info-panel');
const infoPanelCloseBtn = document.getElementById('info-panel-close');
const toggleInfoBtn = document.getElementById('toggle-info');
const mobileControlsEl = document.getElementById('mobile-controls');
const moveStickEl = document.getElementById('move-stick');
const moveKnobEl = document.getElementById('move-knob');
const aimStickEl = document.getElementById('aim-stick');
const aimKnobEl = document.getElementById('aim-knob');
const jumpBtnEl = document.getElementById('jump-btn');
const topCenterHudEl = document.getElementById('top-center-hud');
const matchTimerEl = document.getElementById('match-timer');
const bossProgressEl = document.getElementById('boss-progress');
const difficultyMetaEl = document.getElementById('difficulty-meta');
const bottomHudEl = document.getElementById('bottom-hud');
const skillBarEl = document.getElementById('skill-bar');
const xpLevelEl = document.getElementById('xp-level');
const xpFillEl = document.getElementById('xp-fill');
const xpTextEl = document.getElementById('xp-text');
const levelupOverlayEl = document.getElementById('levelup-overlay');
const levelupOptionsEl = document.getElementById('levelup-options');
const statsToggleBtn = document.getElementById('stats-toggle');
const statsPanelEl = document.getElementById('stats-panel');
const statsPanelCloseBtn = document.getElementById('stats-panel-close');
const statsContentEl = document.getElementById('stats-content');
const devConsoleToggleBtn = document.getElementById('dev-console-toggle');
const devConsoleEl = document.getElementById('dev-console');
const devConsoleLogEl = document.getElementById('dev-console-log');
const devConsoleFormEl = document.getElementById('dev-console-form');
const devConsoleInputEl = document.getElementById('dev-console-input');

ctx.imageSmoothingEnabled = false;

const APP_ORIGIN = window.location.origin;
let currentWorkerOrigin = APP_ORIGIN;
const METRIKA_COUNTER_ID = 107267514;
let ws = {
  readyState: WebSocket.CLOSED,
  close() {},
  addEventListener() {},
  send() {},
};
let socketOpenPromise = null;
const socketHandlers = {
  open: [],
  close: [],
  message: [],
};

const QUALITY = {
  low: { groundTexture: false, groundTileSize: 96, maxBlood: 120, maxMuzzle: 28, bloodMult: 0.55, overlays: false },
  medium: { groundTexture: true, groundTileSize: 128, maxBlood: 220, maxMuzzle: 50, bloodMult: 0.85, overlays: true },
  high: { groundTexture: true, groundTileSize: 160, maxBlood: 360, maxMuzzle: 90, bloodMult: 1, overlays: true },
};

const input = { up: false, down: false, left: false, right: false, shooting: false, jumpQueued: false, pointerX: 0, pointerY: 0 };
const CLIENT_CAMERA_FOLLOW_RATE = 14;
const CLIENT_CAMERA_SNAP_DIST = 140;
const mobile = {
  enabled: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
  moveId: null,
  aimId: null,
  moveX: 0,
  moveY: 0,
  moveStrength: 0,
  aimX: 1,
  aimY: 0,
  aimStrength: 0,
  lastAimX: 1,
  lastAimY: 0,
};

const PLAYER_VARIANTS = [
  { id: 'cyber', name: 'Cyber', accent: '#22d3ee', sprite: '/assets/sprites/player_cyber.png', frameW: 64, frameH: 64, rows: { down: 2, left: 1, right: 3, up: 0 }, scale: 0.88, fps: 10, idleFrame: 1 },
];


function getToggleDefaultOn(key) {
  const stored = localStorage.getItem(key);
  if (stored === null) {
    localStorage.setItem(key, '1');
    return true;
  }
  return stored !== '0';
}

const game = {
  myId: null,
  roomCode: null,
  connected: false,
  world: { width: 2400, height: 1400 },
  state: null,
  sortedTrees: [],
  qualityKey: 'medium',
  shadowsEnabled: getToggleDefaultOn('cw:shadowsEnabled'),
  bulletTracersEnabled: getToggleDefaultOn('cw:bulletTracersEnabled'),
  enemyHpBarsEnabled: getToggleDefaultOn('cw:enemyHpBarsEnabled'),
  extraBloodEnabled: getToggleDefaultOn('cw:extraBloodEnabled'),
  hitEffectsEnabled: getToggleDefaultOn('cw:hitEffectsEnabled'),
  autoFireEnabled: localStorage.getItem('cw:autoFireEnabled') === '1',
  connectionIndicatorEnabled: getToggleDefaultOn('cw:connectionIndicatorEnabled'),
  showFpsEnabled: getToggleDefaultOn('cw:showFpsEnabled'),
  showMinimapEnabled: getToggleDefaultOn('cw:showMinimapEnabled'),
  renderPlayers: new Map(),
  renderEnemies: new Map(),
  renderBullets: new Map(),
  netSnapshots: [],
  sampledNet: null,
  nextInputSeq: 0,
  roomStartedAt: 0,
  totalEnemyKills: 0,
  nextBossAtKills: 50,
  nextBossSpawnAt: 0,
  bossAlive: false,
  roomDifficulty: { level: 1, hpMul: 1, speedMul: 1, damageMul: 1, attackRateMul: 1, spawnIntervalMs: 760 },
  skillCatalog: {},
  mySkillChoices: [],
  runtimeInstance: {
    instanceId: '',
    publicBaseUrl: '',
  },
  playerAuth: {
    mode: 'guest',
    player: null,
    identities: [],
    nicknameStatus: null,
    busy: false,
    checkingNickname: false,
  },
  analytics: {
    pendingJoin: null,
    sentKeys: new Set(),
  },
};

const camera = { x: 0, y: 0 };
const visuals = {
  blood: [],
  bloodPuddles: [],
  gore: [],
  muzzle: [],
  rocketSmoke: [],
  rocketFire: [],
  hitFx: [],
  bossBlast: [],
  bloodMist: [],
  skillBursts: [],
  skillArcs: [],
  skillLinks: [],
  skillLabels: [],
  skillCdPrev: new Map(),
  enemyPrev: new Map(),
  playerPrev: new Map(),
  rocketPrev: new Map(),
  bulletIds: new Set(),
  groundTileCanvas: null,
  groundTileSize: 0,
};

let joinMode = 'create';
const NICKNAME_STORAGE_KEY = 'cw:nickname';
const PLAYER_CLASS_STORAGE_KEY = 'cw:playerClass';
let selectedPlayerClass = 'cyber';
const storedInfoPanelHidden = localStorage.getItem('cw:infoPanelHidden');
let infoPanelHidden = storedInfoPanelHidden === null ? true : storedInfoPanelHidden === '1';
const storedStatsPanelOpen = localStorage.getItem('cw:statsPanelOpen');
let statsPanelOpen = storedStatsPanelOpen === '1';
const storedScoreboardMinimized = localStorage.getItem('cw:scoreboardMinimized');
let scoreboardMinimized = storedScoreboardMinimized === null ? true : storedScoreboardMinimized === '1';
let lastFrameTs = performance.now();
let fpsFrameCount = 0;
let fpsAccumSec = 0;

const recordsUi = { page: 1, totalPages: 1, pageSize: 10, total: 0 };
let prevMyAlive = null;
let sessionStartedAt = 0;
let waitingForFirstState = false;
let waitingForFirstStateSince = 0;
let lastScoreboardHtml = '';
let lastLevelupHtml = '';
let devConsoleOpen = false;
let nicknameCheckTimer = null;
let restartReloadTimer = null;
let pendingAutoJoin = false;
let pendingAutoCreate = false;
let routedIntent = null;
const DEV_CMD_HISTORY_LIMIT = 60;
const DEV_CMD_HISTORY_STORAGE_KEY = 'cw:devConsoleHistory';
const devConsoleHistory = [];
let devConsoleHistoryIndex = -1;
const DEV_KEY_BINDINGS_STORAGE_KEY = 'cw:devKeyBindings';
let devKeyBindings = {};

function trackMetrikaGoal(goal, params = {}) {
  if (typeof window.ym !== 'function') return false;
  try {
    window.ym(METRIKA_COUNTER_ID, 'reachGoal', goal, params);
    return true;
  } catch {
    return false;
  }
}

function trackMetrikaGoalOnce(key, goal, params = {}) {
  if (!key) return trackMetrikaGoal(goal, params);
  if (game.analytics.sentKeys.has(key)) return false;
  const sent = trackMetrikaGoal(goal, params);
  if (sent) game.analytics.sentKeys.add(key);
  return sent;
}

function setPendingJoinAnalytics(mode, roomCode = '', source = 'menu') {
  game.analytics.pendingJoin = {
    mode: mode === 'create' ? 'create' : 'join',
    roomCode: String(roomCode || '').trim().toUpperCase(),
    source,
    startedAt: Date.now(),
  };
}

function clearPendingJoinAnalytics() {
  game.analytics.pendingJoin = null;
}

window.cwTrackMetrikaGoal = trackMetrikaGoal;
window.cwTrackMetrikaGoalOnce = trackMetrikaGoalOnce;
window.cwSetPendingJoinAnalytics = setPendingJoinAnalytics;
window.cwClearPendingJoinAnalytics = clearPendingJoinAnalytics;

function loadDevConsoleHistory() {
  try {
    const raw = localStorage.getItem(DEV_CMD_HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    devConsoleHistory.splice(0, devConsoleHistory.length, ...parsed
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(-DEV_CMD_HISTORY_LIMIT));
    devConsoleHistoryIndex = devConsoleHistory.length;
  } catch {
    devConsoleHistory.length = 0;
    devConsoleHistoryIndex = 0;
  }
}

function saveDevConsoleHistory() {
  localStorage.setItem(DEV_CMD_HISTORY_STORAGE_KEY, JSON.stringify(devConsoleHistory.slice(-DEV_CMD_HISTORY_LIMIT)));
}

function clearDevConsoleHistory() {
  devConsoleHistory.length = 0;
  devConsoleHistoryIndex = 0;
  localStorage.removeItem(DEV_CMD_HISTORY_STORAGE_KEY);
}

function loadDevKeyBindings() {
  try {
    const raw = localStorage.getItem(DEV_KEY_BINDINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    devKeyBindings = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    devKeyBindings = {};
  }
}

function saveDevKeyBindings() {
  localStorage.setItem(DEV_KEY_BINDINGS_STORAGE_KEY, JSON.stringify(devKeyBindings));
}

function normalizeBindKey(rawKey) {
  const value = String(rawKey || '').trim();
  if (!value) return null;
  if (/^Key[A-Z]$/.test(value)) return { code: value, label: value.slice(3) };
  if (/^Digit[0-9]$/.test(value)) return { code: value, label: value.slice(5) };
  if (/^[A-Za-z]$/.test(value)) {
    const upper = value.toUpperCase();
    return { code: `Key${upper}`, label: upper };
  }
  if (/^[0-9]$/.test(value)) return { code: `Digit${value}`, label: value };
  const aliases = {
    space: { code: 'Space', label: 'Space' },
    spacebar: { code: 'Space', label: 'Space' },
    enter: { code: 'Enter', label: 'Enter' },
    escape: { code: 'Escape', label: 'Escape' },
    esc: { code: 'Escape', label: 'Escape' },
    tab: { code: 'Tab', label: 'Tab' },
    backquote: { code: 'Backquote', label: '`' },
    tilde: { code: 'Backquote', label: '`' },
  };
  return aliases[value.toLowerCase()] || null;
}

function parseBindCommand(rawCommand) {
  const command = String(rawCommand || '').trim();
  const match = /^bind\s+(?:"([^"]+)"|(\S+))\s+(?:"([^"]+)"|(.+))$/i.exec(command);
  if (!match) return null;
  const keyToken = match[1] || match[2] || '';
  const commandToken = (match[3] || match[4] || '').trim();
  return { keyToken, commandToken };
}

function parseUnbindCommand(rawCommand) {
  const command = String(rawCommand || '').trim();
  const match = /^unbind\s+(?:"([^"]+)"|(\S+))$/i.exec(command);
  if (!match) return null;
  return { keyToken: match[1] || match[2] || '' };
}

function handleLocalDevConsoleCommand(rawCommand) {
  const bindParsed = parseBindCommand(rawCommand);
  if (bindParsed) {
    const normalizedKey = normalizeBindKey(bindParsed.keyToken);
    if (!normalizedKey) {
      appendDevConsoleLine('Bind failed: unsupported key.', 'err');
      return true;
    }
    if (!bindParsed.commandToken) {
      appendDevConsoleLine('Bind failed: command is empty.', 'err');
      return true;
    }
    devKeyBindings[normalizedKey.code] = {
      key: normalizedKey.label,
      command: bindParsed.commandToken,
    };
    saveDevKeyBindings();
    appendDevConsoleLine(`Bound ${normalizedKey.label} -> ${bindParsed.commandToken}`, 'ok');
    return true;
  }

  const unbindParsed = parseUnbindCommand(rawCommand);
  if (unbindParsed) {
    const normalizedKey = normalizeBindKey(unbindParsed.keyToken);
    if (!normalizedKey) {
      appendDevConsoleLine('Unbind failed: unsupported key.', 'err');
      return true;
    }
    if (!devKeyBindings[normalizedKey.code]) {
      appendDevConsoleLine(`No bind for ${normalizedKey.label}.`, 'err');
      return true;
    }
    delete devKeyBindings[normalizedKey.code];
    saveDevKeyBindings();
    appendDevConsoleLine(`Unbound ${normalizedKey.label}.`, 'ok');
    return true;
  }

  if (/^binds$/i.test(String(rawCommand || '').trim())) {
    const entries = Object.entries(devKeyBindings);
    if (entries.length === 0) {
      appendDevConsoleLine('No binds configured.');
      return true;
    }
    for (const [, binding] of entries.sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
      appendDevConsoleLine(`${binding.key} -> ${binding.command}`);
    }
    return true;
  }

  return false;
}

function runBoundDevCommand(code) {
  const binding = devKeyBindings[String(code || '')];
  if (!binding?.command) return false;
  submitDevConsoleCommand(binding.command);
  return true;
}

const ROOM_SYNC_PRESETS = {
  normal: {
    tickRate: 45,
    stateSendHz: 30,
    netRenderDelayMs: 90,
    maxExtrapolationMs: 80,
    entityInterpRate: 16,
    bulletCorrectionRate: 18,
    inputSendHz: 30,
  },
  better: {
    tickRate: 55,
    stateSendHz: 40,
    netRenderDelayMs: 75,
    maxExtrapolationMs: 90,
    entityInterpRate: 20,
    bulletCorrectionRate: 22,
    inputSendHz: 40,
  },
  best: {
    tickRate: 60,
    stateSendHz: 50,
    netRenderDelayMs: 65,
    maxExtrapolationMs: 100,
    entityInterpRate: 24,
    bulletCorrectionRate: 26,
    inputSendHz: 50,
  },
};

const roomSync = { ...ROOM_SYNC_PRESETS.normal };
let inputSendIntervalId = null;

const NET_PING_INTERVAL_MS = 1000;
const NET_PING_TIMEOUT_MS = 4000;
const NET_BYTES_WINDOW_MS = 2000;
const NET_RTT_SAMPLES_MAX = 9;

const netStats = {
  pingSeq: 0,
  pendingPings: new Map(),
  sentPings: 0,
  recvPings: 0,
  lostPings: 0,
  rttMs: 0,
  jitterMs: 0,
  stateHz: 0,
  stateDelayMs: 0,
  lastStateAt: 0,
  stateIntervals: [],
  rttSamples: [],
  rxSamples: [],
  txSamples: [],
  rxKBps: 0,
  txKBps: 0,
  rxTotalBytes: 0,
  txTotalBytes: 0,
};

function resetNetStats() {
  netStats.pingSeq = 0;
  netStats.pendingPings.clear();
  netStats.sentPings = 0;
  netStats.recvPings = 0;
  netStats.lostPings = 0;
  netStats.rttMs = 0;
  netStats.jitterMs = 0;
  netStats.stateHz = 0;
  netStats.stateDelayMs = 0;
  netStats.lastStateAt = 0;
  netStats.stateIntervals.length = 0;
  netStats.rttSamples.length = 0;
  netStats.rxSamples.length = 0;
  netStats.txSamples.length = 0;
  netStats.rxKBps = 0;
  netStats.txKBps = 0;
  netStats.rxTotalBytes = 0;
  netStats.txTotalBytes = 0;
}
function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function formatClock(secTotal) {
  const s = Math.max(0, Math.floor(secTotal));
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data || {};
}

function normalizeUrlForCompare(url) {
  try {
    const parsed = new URL(url, window.location.href);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeOrigin(url) {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return APP_ORIGIN;
  }
}

function buildWorkerWsUrl(origin) {
  const endpoint = new URL(normalizeOrigin(origin));
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
  endpoint.pathname = '/ws';
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint.toString();
}

function registerSocketHandlers(handlers) {
  if (typeof handlers?.open === 'function') socketHandlers.open.push(handlers.open);
  if (typeof handlers?.close === 'function') socketHandlers.close.push(handlers.close);
  if (typeof handlers?.message === 'function') socketHandlers.message.push(handlers.message);
}

function attachSocketBridge(socket) {
  socket.addEventListener('open', (event) => {
    if (socket !== ws) return;
    socketOpenPromise = null;
    for (const handler of socketHandlers.open) handler(event);
  });
  socket.addEventListener('close', (event) => {
    if (socket !== ws) return;
    socketOpenPromise = null;
    for (const handler of socketHandlers.close) handler(event);
  });
  socket.addEventListener('message', (event) => {
    if (socket !== ws) return;
    for (const handler of socketHandlers.message) handler(event);
  });
}

function connectGameSocket(origin = currentWorkerOrigin) {
  const nextOrigin = normalizeOrigin(origin);
  if (ws instanceof WebSocket && currentWorkerOrigin === nextOrigin && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return socketOpenPromise || Promise.resolve();
  }

  currentWorkerOrigin = nextOrigin;
  renderInstanceMeta();

  if (ws instanceof WebSocket) {
    try {
      ws.close(1000, 'switch worker');
    } catch {
      // ignore close race
    }
  }

  const socket = new WebSocket(buildWorkerWsUrl(nextOrigin));
  ws = socket;
  socketOpenPromise = new Promise((resolve, reject) => {
    let settled = false;
    socket.addEventListener('open', () => {
      if (socket !== ws || settled) return;
      settled = true;
      resolve();
    });
    socket.addEventListener('error', () => {
      if (socket !== ws || settled) return;
      settled = true;
      reject(new Error('Socket connection failed.'));
    });
    socket.addEventListener('close', () => {
      if (socket !== ws || settled) return;
      settled = true;
      reject(new Error('Socket closed before connection.'));
    });
  });
  attachSocketBridge(socket);
  return socketOpenPromise;
}

function renderInstanceMeta() {
  if (!instanceMetaEl) return;
  const uiHost = new URL(APP_ORIGIN).host;
  const workerHost = new URL(currentWorkerOrigin || APP_ORIGIN).host;
  const instanceId = game.runtimeInstance.instanceId || '--';
  instanceMetaEl.textContent = `Instance: ${instanceId} | UI: ${uiHost} | Game: ${workerHost}`;
}

function applyInitialRoomIntent() {
  const params = new URLSearchParams(window.location.search);
  const room = (params.get('room') || '').trim().toUpperCase();
  const mode = (params.get('mode') || '').trim().toLowerCase();
  const routed = params.get('routed') === '1';
  if (roomCodeInput && room) roomCodeInput.value = room.slice(0, 10);
  if (mode === 'join' || (room && !mode)) {
    joinMode = 'join';
  } else if (mode === 'create') {
    joinMode = 'create';
  }
  pendingAutoJoin = Boolean(room && joinMode === 'join');
  pendingAutoCreate = Boolean(!room && joinMode === 'create' && routed);
  routedIntent = routed ? { mode: joinMode, room } : null;
}

async function resolveRoomRoute(mode, roomCode = '') {
  const params = new URLSearchParams({
    mode: mode === 'create' ? 'create' : 'join',
  });
  const normalizedCode = String(roomCode || '').trim().toUpperCase();
  if (normalizedCode) params.set('roomCode', normalizedCode);
  return apiJson(`/api/room-route?${params.toString()}`, { method: 'GET' });
}

function redirectToResolvedTarget(route) {
  const rawRedirectUrl = route?.target?.redirectUrl || '';
  const redirect = rawRedirectUrl ? new URL(rawRedirectUrl, window.location.href) : null;
  if (redirect) redirect.searchParams.set('routed', '1');
  const redirectUrl = normalizeUrlForCompare(redirect ? redirect.toString() : '');
  const currentUrl = normalizeUrlForCompare(window.location.href);
  if (!redirectUrl || !currentUrl || redirectUrl === currentUrl) return false;
  window.location.assign(redirectUrl);
  return true;
}

function consumeRoutedIntent(mode, roomCode = '') {
  if (!routedIntent) return false;
  const normalizedMode = mode === 'create' ? 'create' : 'join';
  const normalizedRoom = String(roomCode || '').trim().toUpperCase();
  const matches = routedIntent.mode === normalizedMode
    && (normalizedMode === 'create' || routedIntent.room === normalizedRoom);
  if (!matches) return false;
  routedIntent = null;
  const url = new URL(window.location.href);
  url.searchParams.delete('routed');
  window.history.replaceState({}, document.title, url.toString());
  return true;
}

function setPlayerAuthBusy(busy) {
  game.playerAuth.busy = Boolean(busy);
  if (playerLoginBtn) playerLoginBtn.disabled = game.playerAuth.busy;
  if (playerRegisterBtn) playerRegisterBtn.disabled = game.playerAuth.busy;
  if (playerLogoutBtn) playerLogoutBtn.disabled = game.playerAuth.busy;
}

function setAuthTab(mode) {
  game.playerAuth.mode = mode === 'login' || mode === 'register' ? mode : 'guest';
  for (const button of authTabButtons) {
    button.classList.toggle('active', button.dataset.authTab === game.playerAuth.mode);
  }
  for (const panel of authPanels) {
    panel.classList.toggle('active', panel.dataset.authPanel === game.playerAuth.mode);
  }
  clearAuthFeedback();
}

function setAuthFeedback(message, kind = '') {
  if (!playerAuthFeedbackEl) return;
  const text = String(message || '').trim();
  if (!text) {
    clearAuthFeedback();
    return;
  }
  playerAuthFeedbackEl.textContent = text;
  playerAuthFeedbackEl.className = `auth-feedback${kind ? ` ${kind}` : ''}`;
  playerAuthFeedbackEl.classList.remove('hidden');
}

function clearAuthFeedback() {
  if (!playerAuthFeedbackEl) return;
  playerAuthFeedbackEl.textContent = '';
  playerAuthFeedbackEl.className = 'auth-feedback hidden';
}

function setJoinFeedback(message) {
  if (!joinFeedbackEl) return;
  const text = String(message || '').trim();
  if (!text) {
    clearJoinFeedback();
    return;
  }
  joinFeedbackEl.textContent = text;
  joinFeedbackEl.className = 'join-feedback';
  joinFeedbackEl.classList.remove('hidden');
}

function clearJoinFeedback() {
  if (!joinFeedbackEl) return;
  joinFeedbackEl.textContent = '';
  joinFeedbackEl.className = 'join-feedback hidden';
}

function renderPlayerAuthUi() {
  const player = game.playerAuth.player;
  const loggedIn = Boolean(player);
  if (playerAuthSummaryEl) {
    playerAuthSummaryEl.textContent = loggedIn
      ? `Logged in as ${player.nickname}. This nickname is reserved for your account.`
      : 'Guest mode. Registered nicknames require login.';
  }
  if (playerLogoutBtn) playerLogoutBtn.classList.toggle('hidden', !loggedIn);
  if (nameInput) {
    if (loggedIn) {
      nameInput.value = player.nickname;
      nameInput.disabled = true;
    } else {
      nameInput.disabled = false;
    }
  }
  if (authLoginNicknameEl && !authLoginNicknameEl.value && nameInput?.value) authLoginNicknameEl.value = nameInput.value;
  if (authRegisterNicknameEl && !authRegisterNicknameEl.value && nameInput?.value) authRegisterNicknameEl.value = nameInput.value;
  if (nicknameHintEl) {
    const status = game.playerAuth.nicknameStatus;
    if (loggedIn) {
      nicknameHintEl.textContent = 'Authenticated nickname. Join will use your reserved account name.';
      nicknameHintEl.className = 'field-hint ok';
    } else if (status?.isRegistered) {
      nicknameHintEl.textContent = `Nickname ${status.nickname} is registered. Use Login to play with it.`;
      nicknameHintEl.className = 'field-hint err';
    } else if (status?.isOccupied) {
      nicknameHintEl.textContent = `Nickname ${status.nickname} is already in use right now.`;
      nicknameHintEl.className = 'field-hint err';
    } else if (status?.nickname) {
      nicknameHintEl.textContent = `Nickname ${status.nickname} is available for guest play.`;
      nicknameHintEl.className = 'field-hint ok';
    } else {
      nicknameHintEl.textContent = 'Guest mode: choose any free nickname.';
      nicknameHintEl.className = 'field-hint';
    }
  }
}

function setPlayerAccessCollapsed(collapsed) {
  if (!playerAccessDetailsEl) return;
  playerAccessDetailsEl.open = !collapsed;
}

function reloadForPlayerSession(message) {
  setAuthFeedback(message, 'ok');
  statusEl.textContent = message;
  window.setTimeout(() => {
    window.location.reload();
  }, 120);
}

function scheduleClientReload(delayMs = 1500, message = 'Server restarting. Reconnecting...') {
  if (restartReloadTimer) return;
  statusEl.textContent = message;
  const waitMs = Math.max(250, Number(delayMs) || 1500);
  restartReloadTimer = window.setTimeout(() => {
    window.location.reload();
  }, waitMs);
}

function handleServerRestartNotice(msg) {
  const retryAfterMs = Math.max(500, Number(msg?.retryAfterMs) || 1500);
  const reason = (msg?.reason || 'restart').toString();
  joinOverlay.style.display = 'grid';
  joinOverlay.classList.remove('death-mode');
  setDeathCinematicActive(false);
  updateMobileControlsVisibility();
  if (typeof clearLocalSessionState === 'function') clearLocalSessionState();
  scheduleClientReload(retryAfterMs, reason === 'restart'
    ? 'Server restarting. Reconnecting...'
    : `Server ${reason}. Reconnecting...`);
}

async function refreshPlayerAuthSession({ silent = false } = {}) {
  try {
    const data = await apiJson('/api/player/me', { method: 'GET' });
    game.playerAuth.player = data.player || null;
    game.playerAuth.identities = Array.isArray(data.identities) ? data.identities : [];
    if (game.playerAuth.player?.nickname) {
      localStorage.setItem(NICKNAME_STORAGE_KEY, game.playerAuth.player.nickname);
      game.playerAuth.nicknameStatus = {
        nickname: game.playerAuth.player.nickname,
        isRegistered: true,
        isOccupied: false,
      };
    }
  } catch {
    game.playerAuth.player = null;
    game.playerAuth.identities = [];
  }
  renderPlayerAuthUi();
  if (!game.playerAuth.player && !silent) {
    void updateNicknameStatus(nameInput?.value || '');
  }
}

async function updateNicknameStatus(rawNickname) {
  const nickname = String(rawNickname || '').trim();
  if (game.playerAuth.player) {
    game.playerAuth.nicknameStatus = {
      nickname: game.playerAuth.player.nickname,
      isRegistered: true,
      isOccupied: false,
    };
    renderPlayerAuthUi();
    return;
  }
  if (!nickname) {
    game.playerAuth.nicknameStatus = null;
    renderPlayerAuthUi();
    return;
  }
  game.playerAuth.checkingNickname = true;
  try {
    const data = await apiJson(`/api/player/nickname-status?nickname=${encodeURIComponent(nickname)}`, { method: 'GET' });
    game.playerAuth.nicknameStatus = data;
  } catch (err) {
    game.playerAuth.nicknameStatus = {
      nickname,
      isRegistered: false,
      isOccupied: false,
      error: err.message,
    };
  } finally {
    game.playerAuth.checkingNickname = false;
    renderPlayerAuthUi();
  }
}

function scheduleNicknameStatusCheck() {
  if (nicknameCheckTimer) clearTimeout(nicknameCheckTimer);
  nicknameCheckTimer = setTimeout(() => {
    nicknameCheckTimer = null;
    void updateNicknameStatus(nameInput?.value || '');
  }, 240);
}

async function loginPlayerAccount() {
  const nickname = (authLoginNicknameEl?.value || nameInput?.value || '').trim();
  const password = (authLoginPasswordEl?.value || '').trim();
  if (!nickname || !password) {
    setPlayerAccessCollapsed(false);
    setAuthFeedback('Enter nickname and password.', 'err');
    statusEl.textContent = 'Enter nickname and password.';
    return;
  }
  clearAuthFeedback();
  setPlayerAuthBusy(true);
  trackMetrikaGoal('player_login_attempt', { auth_mode: 'login' });
  try {
    const data = await apiJson('/api/player/login', {
      method: 'POST',
      body: JSON.stringify({ nickname, password }),
    });
    trackMetrikaGoal('player_login_success', { auth_mode: 'login' });
    game.playerAuth.player = data.player || null;
    game.playerAuth.identities = Array.isArray(data.identities) ? data.identities : [];
    if (authLoginPasswordEl) authLoginPasswordEl.value = '';
    statusEl.textContent = `Logged in as ${data.player?.nickname || nickname}.`;
    renderPlayerAuthUi();
    setPlayerAccessCollapsed(true);
    reloadForPlayerSession('Logged in. Refreshing session...');
  } catch (err) {
    setPlayerAccessCollapsed(false);
    setAuthFeedback(err.message, 'err');
    statusEl.textContent = err.message;
  } finally {
    setPlayerAuthBusy(false);
  }
}

async function registerPlayerAccount() {
  const nickname = (authRegisterNicknameEl?.value || nameInput?.value || '').trim();
  const password = (authRegisterPasswordEl?.value || '').trim();
  if (!nickname || !password) {
    setPlayerAccessCollapsed(false);
    setAuthFeedback('Enter nickname and password.', 'err');
    statusEl.textContent = 'Enter nickname and password.';
    return;
  }
  clearAuthFeedback();
  setPlayerAuthBusy(true);
  trackMetrikaGoal('player_register_attempt', { auth_mode: 'register' });
  try {
    const data = await apiJson('/api/player/register', {
      method: 'POST',
      body: JSON.stringify({ nickname, password }),
    });
    trackMetrikaGoal('player_register_success', { auth_mode: 'register' });
    game.playerAuth.player = data.player || null;
    game.playerAuth.identities = Array.isArray(data.identities) ? data.identities : [];
    if (authRegisterPasswordEl) authRegisterPasswordEl.value = '';
    statusEl.textContent = `Nickname ${data.player?.nickname || nickname} registered.`;
    renderPlayerAuthUi();
    setPlayerAccessCollapsed(true);
    reloadForPlayerSession('Nickname registered. Refreshing session...');
  } catch (err) {
    setPlayerAccessCollapsed(false);
    setAuthFeedback(err.message, 'err');
    statusEl.textContent = err.message;
  } finally {
    setPlayerAuthBusy(false);
  }
}

async function logoutPlayerAccount() {
  setPlayerAuthBusy(true);
  clearAuthFeedback();
  trackMetrikaGoal('player_logout_click', { auth_mode: game.playerAuth.player ? 'account' : 'guest' });
  try {
    await apiJson('/api/player/logout', { method: 'POST', body: '{}' });
    trackMetrikaGoal('player_logout_success', { auth_mode: 'account' });
    game.playerAuth.player = null;
    game.playerAuth.identities = [];
    game.playerAuth.nicknameStatus = null;
    statusEl.textContent = 'Logged out. Guest mode active.';
    renderPlayerAuthUi();
    setPlayerAccessCollapsed(false);
    void updateNicknameStatus(nameInput?.value || '');
    reloadForPlayerSession('Logged out. Refreshing session...');
  } catch (err) {
    setPlayerAccessCollapsed(false);
    setAuthFeedback(err.message, 'err');
    statusEl.textContent = err.message;
  } finally {
    setPlayerAuthBusy(false);
  }
}

for (const button of authTabButtons) {
  button.addEventListener('click', () => {
    setAuthTab(button.dataset.authTab || 'guest');
  });
}

playerLoginBtn?.addEventListener('click', () => {
  void loginPlayerAccount();
});

playerRegisterBtn?.addEventListener('click', () => {
  void registerPlayerAccount();
});

playerLogoutBtn?.addEventListener('click', () => {
  void logoutPlayerAccount();
});

authLoginPasswordEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    void loginPlayerAccount();
  }
});

authRegisterPasswordEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    void registerPlayerAccount();
  }
});

nameInput?.addEventListener('input', () => {
  if (game.playerAuth.player) return;
  scheduleNicknameStatusCheck();
});

nameInput?.addEventListener('blur', () => {
  if (game.playerAuth.player) return;
  void updateNicknameStatus(nameInput.value || '');
});

setAuthTab('guest');
applyInitialRoomIntent();
renderPlayerAuthUi();
renderInstanceMeta();
void refreshPlayerAuthSession({ silent: true });

function updateTopCenterHud(nowMs = Date.now()) {
  if (!matchTimerEl || !bossProgressEl || !difficultyMetaEl) return;
  if (!game.state) {
    matchTimerEl.textContent = 'Time 00:00';
    bossProgressEl.textContent = 'Boss in -- kills';
    difficultyMetaEl.textContent = 'Threat Lv1';
    return;
  }

  const startedAt = Number(game.roomStartedAt) || Number(game.state.roomStartedAt) || nowMs;
  const elapsedSec = Math.max(0, (nowMs - startedAt) / 1000);
  matchTimerEl.textContent = `Time ${formatClock(elapsedSec)}`;

  const nextSpawnAt = Number(game.nextBossSpawnAt) || 0;
  const bossAlive = Boolean(game.bossAlive);
  if (bossAlive) {
    bossProgressEl.textContent = 'Boss: ACTIVE';
  } else if (nextSpawnAt > nowMs) {
    bossProgressEl.textContent = `Boss in ${(Math.max(0, nextSpawnAt - nowMs) / 1000).toFixed(1)}s`;
  } else {
    const leftKills = Math.max(0, (Number(game.nextBossAtKills) || 0) - (Number(game.totalEnemyKills) || 0));
    bossProgressEl.textContent = `Boss in ${leftKills} kills`;
  }

  const diff = game.roomDifficulty || {};
  const level = Math.max(1, Number(diff.level) || 1);
  const hpMul = Math.max(1, Number(diff.hpMul) || 1);
  difficultyMetaEl.textContent = `Threat Lv${level} x${hpMul.toFixed(2)}`;
}



function rarityColor(r) {
  if (r === 'epic') return '#f0abfc';
  if (r === 'rare') return '#93c5fd';
  return '#d1d5db';
}

function skillBadgeLabel(skill) {
  const id = String(skill?.id || '').toLowerCase();
  const named = {
    weapon_mastery: 'DMG',
    rapid_reload: 'RLD',
    vitality: 'HP',
    haste: 'SPD',
    magnetism: 'MAG',
    bloodlust: 'BLD',
    regeneration: 'REG',
    dodge_instinct: 'JMP',
    pistol_buddy: 'P',
    smg_buddy: 'SMG',
    shotgun_buddy: 'SG',
    sniper_buddy: 'SN',
    shockwave: 'SW',
    blade_orbit: 'ORB',
    chain_lightning: 'CL',
    homing_missiles: 'HM',
  };
  if (named[id]) return named[id];
  const name = String(skill?.name || id || '?').replace(/[^A-Za-z0-9]+/g, ' ').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 3).toUpperCase();
}

function renderLevelupChoices() {
  if (!levelupOverlayEl || !levelupOptionsEl) return;
  const choices = Array.isArray(game.mySkillChoices) ? game.mySkillChoices : [];
  const levelupOpen = choices.length > 0 && Boolean(game.state);
  document.body.classList.toggle('levelup-open', levelupOpen);
  if (!levelupOpen) {
    levelupOverlayEl.classList.add('hidden');
    if (lastLevelupHtml !== '') {
      levelupOptionsEl.innerHTML = '';
      lastLevelupHtml = '';
    }
    return;
  }

  levelupOverlayEl.classList.remove('hidden');
  const cards = choices.map((id, idx) => {
    const def = game.skillCatalog[id] || { id, name: id, kind: 'passive', rarity: 'common', desc: '' };
    const me = game.state.players.find((p) => p.id === game.myId);
    const existing = (me?.skills || []).find((s) => s.id === id);
    const nextLvl = (Number(existing?.level) || 0) + 1;
    const rarity = (def.rarity || 'common').toLowerCase();
    const hotkey = idx + 1;
    return `<button class="skill-option" data-skill-id="${id}" data-hotkey="${hotkey}" style="border-color:${rarityColor(rarity)}55"><div class="nm" style="color:${rarityColor(rarity)}">[${hotkey}] ${def.name}</div><div class="meta">Press ${hotkey} | ${def.kind.toUpperCase()} | ${rarity.toUpperCase()} | Lv ${nextLvl}</div><div class="desc">${def.desc || 'No description'}</div></button>`;
  });
  const nextHtml = cards.join('');
  if (nextHtml !== lastLevelupHtml) {
    levelupOptionsEl.innerHTML = nextHtml;
    lastLevelupHtml = nextHtml;
  }
}


function chooseSkillByIndex(idx) {
  const choices = Array.isArray(game.mySkillChoices) ? game.mySkillChoices : [];
  if (idx < 1 || idx > choices.length) return false;
  const sid = choices[idx - 1];
  if (!sid || ws.readyState !== WebSocket.OPEN || !game.myId) return false;
  sendJson({ type: 'skillPick', skillId: sid });
  return true;
}
function updateBottomHud() {
  if (!bottomHudEl) return;
  const me = game.state?.players?.find((p) => p.id === game.myId);
  const inMenu = !game.state;
  bottomHudEl.classList.toggle('hidden', inMenu);
  if (inMenu || !me) {
    if (xpLevelEl) xpLevelEl.textContent = 'Lv1';
    if (xpFillEl) xpFillEl.style.width = '0%';
    if (xpTextEl) xpTextEl.textContent = '0 / 0 XP';
    if (skillBarEl) skillBarEl.innerHTML = '';
    renderLevelupChoices();
    return;
  }

  const lvl = Math.max(1, Number(me.level) || 1);
  const xp = Math.max(0, Number(me.xp) || 0);
  const xpToNext = Math.max(1, Number(me.xpToNext) || 1);
  if (xpLevelEl) xpLevelEl.textContent = `Lv${lvl}`;
  if (xpFillEl) xpFillEl.style.width = `${Math.max(0, Math.min(100, (xp / xpToNext) * 100)).toFixed(1)}%`;
  if (xpTextEl) xpTextEl.textContent = `${xp} / ${xpToNext} XP`;

  const skills = Array.isArray(me.skills) ? me.skills : [];
  if (skillBarEl) {
    const compactSkills = mobile.enabled;
    const chips = skills.map((s) => {
      const cd = Math.max(0, Number(s.cooldownMs) || 0);
      const rarity = (s.rarity || 'common').toLowerCase();
      if (compactSkills) {
        const badge = skillBadgeLabel(s);
        const stateText = s.kind === 'active' ? (cd > 0 ? `${Math.max(0.1, cd / 1000).toFixed(1)}` : 'R') : '';
        const label = `${s.name} Lv${s.level}${stateText ? `, ${stateText === 'R' ? 'ready' : `${stateText}s cooldown`}` : ''}`;
        return `<div class="skill-chip compact" title="${label}" aria-label="${label}" style="border-color:${rarityColor(rarity)}66"><span class="skill-chip-icon">${badge}</span><span class="skill-chip-level">Lv${s.level}</span>${stateText ? `<span class="skill-chip-state${stateText === 'R' ? ' ready' : ''}">${stateText}</span>` : ''}</div>`;
      }
      const cdText = s.kind === 'active' ? (cd > 0 ? `${(cd / 1000).toFixed(1)}s` : 'ready') : `Lv${s.level}`;
      return `<div class="skill-chip" style="border-color:${rarityColor(rarity)}66"><div>${s.name} Lv${s.level}</div><div class="cd">${cdText}</div></div>`;
    });
    skillBarEl.innerHTML = chips.join('');
  }

  game.mySkillChoices = Array.isArray(me.pendingSkillChoices) ? me.pendingSkillChoices : [];
  renderLevelupChoices();
}

function setStatsPanelOpen(open) {
  statsPanelOpen = Boolean(open);
  localStorage.setItem('cw:statsPanelOpen', statsPanelOpen ? '1' : '0');
  if (statsPanelEl) statsPanelEl.classList.toggle('hidden', !statsPanelOpen);
  if (statsToggleBtn) statsToggleBtn.setAttribute('aria-expanded', statsPanelOpen ? 'true' : 'false');
}

function setScoreboardMinimized(minimized) {
  scoreboardMinimized = Boolean(minimized);
  localStorage.setItem('cw:scoreboardMinimized', scoreboardMinimized ? '1' : '0');
  if (scoreboardEl) scoreboardEl.classList.toggle('is-minimized', scoreboardMinimized);
}

function fmtStatNum(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '--';
  return Number(n.toFixed(digits)).toString();
}

function updateStatsPanel(me) {
  if (!statsContentEl) return;
  if (!me) {
    statsContentEl.innerHTML = 'No data yet.';
    return;
  }

  const shotIntervalMs = Math.max(1, Number(me.shotIntervalMs) || 1);
  const shotsPerSec = 1000 / shotIntervalMs;
  const hp = Math.max(0, Number(me.hp) || 0);
  const maxHp = Math.max(1, Number(me.maxHp) || 1);
  const hpRegen = Math.max(0, Number(me.hpRegenPerSec) || 0);
  const dodgeMax = Math.max(1, Number(me.dodgeChargesMax) || 1);
  const pickupRadius = Math.max(0, Number(me.pickupRadius) || 0);
  const moveSpeed = Math.max(0, Number(me.moveSpeed) || 0);
  const damageMul = Math.max(0.2, Number(me.damageMul) || 1);
  const fireRateMul = Math.max(0.2, Number(me.fireRateMul) || 1);
  const moveSpeedMul = Math.max(0.2, Number(me.moveSpeedMul) || 1);
  const enemyKills = Math.max(0, Number(me.enemyKills) || 0);
  const bossKills = Math.max(0, Number(me.bossKills) || 0);

  statsContentEl.innerHTML = [
    `<div class="stats-row"><span>Monsters killed</span><b>${enemyKills}</b></div>`,
    `<div class="stats-row"><span>Bosses killed</span><b>${bossKills}</b></div>`,
    `<div class="stats-row"><span>HP</span><b>${Math.round(hp)} / ${Math.round(maxHp)}</b></div>`,
    `<div class="stats-row"><span>Damage / shot</span><b>${Math.round(Math.max(1, Number(me.shotDamage) || 1))}</b></div>`,
    `<div class="stats-row"><span>Fire rate</span><b>${fmtStatNum(shotsPerSec, 2)} shots/s</b></div>`,
    `<div class="stats-row"><span>Move speed</span><b>${Math.round(moveSpeed)}</b></div>`,
    `<div class="stats-row"><span>Pickup radius</span><b>${Math.round(pickupRadius)}</b></div>`,
    `<div class="stats-row"><span>HP regen</span><b>${fmtStatNum(hpRegen, 2)}/s</b></div>`,
    `<div class="stats-row"><span>Jump charges</span><b>${dodgeMax}</b></div>`,
    `<div class="stats-row"><span>Damage multiplier</span><b>x${fmtStatNum(damageMul, 2)}</b></div>`,
    `<div class="stats-row"><span>Fire-rate multiplier</span><b>x${fmtStatNum(fireRateMul, 2)}</b></div>`,
    `<div class="stats-row"><span>Speed multiplier</span><b>x${fmtStatNum(moveSpeedMul, 2)}</b></div>`,
  ].join('');
}

statsToggleBtn?.addEventListener('click', () => {
  setStatsPanelOpen(!statsPanelOpen);
});
statsPanelCloseBtn?.addEventListener('click', () => {
  setStatsPanelOpen(false);
});
scoreboardEl?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.closest('.scoreboard-toggle')) return;
  setScoreboardMinimized(!scoreboardMinimized);
  if (game.state?.players) updateScoreboard(game.state.players);
});
setStatsPanelOpen(statsPanelOpen);
setScoreboardMinimized(scoreboardMinimized);
updateStatsPanel(null);

function updateJumpButtonUi(me) {
  if (!jumpBtnEl) return;
  if (!me) {
    jumpBtnEl.style.setProperty('--jump-progress', '1');
    jumpBtnEl.textContent = 'JUMP';
    return;
  }

  const maxCharges = Math.max(1, Number(me.dodgeChargesMax) || 1);
  const charges = Math.max(0, Math.min(maxCharges, Number(me.dodgeCharges) || 0));
  const cdMs = Math.max(0, Number(me.dodgeRechargeMs ?? me.dodgeCooldownMs) || 0);
  const cdTotalMs = Math.max(1, Number(me.dodgeRechargeTotalMs) || 1200);

  let fill = 1;
  if (charges < maxCharges) {
    const regen = 1 - Math.max(0, Math.min(1, cdMs / cdTotalMs));
    fill = Math.max(0, Math.min(1, (charges + regen) / maxCharges));
  }

  jumpBtnEl.style.setProperty('--jump-progress', fill.toFixed(3));
  if (charges > 0) {
    jumpBtnEl.textContent = maxCharges > 1 ? `JUMP x${charges}` : 'JUMP';
  } else {
    jumpBtnEl.textContent = `JUMP ${(cdMs / 1000).toFixed(1)}s`;
  }
}

updateJumpButtonUi(null);

function normalizeRoomSync(raw) {
  return {
    tickRate: Math.round(clampNum(raw?.tickRate, 20, 120, ROOM_SYNC_PRESETS.normal.tickRate)),
    stateSendHz: Math.round(clampNum(raw?.stateSendHz, 10, 120, ROOM_SYNC_PRESETS.normal.stateSendHz)),
    netRenderDelayMs: Math.round(clampNum(raw?.netRenderDelayMs, 20, 250, ROOM_SYNC_PRESETS.normal.netRenderDelayMs)),
    maxExtrapolationMs: Math.round(clampNum(raw?.maxExtrapolationMs, 20, 250, ROOM_SYNC_PRESETS.normal.maxExtrapolationMs)),
    entityInterpRate: clampNum(raw?.entityInterpRate, 4, 50, ROOM_SYNC_PRESETS.normal.entityInterpRate),
    bulletCorrectionRate: clampNum(raw?.bulletCorrectionRate, 4, 60, ROOM_SYNC_PRESETS.normal.bulletCorrectionRate),
    inputSendHz: Math.round(clampNum(raw?.inputSendHz, 10, 120, ROOM_SYNC_PRESETS.normal.inputSendHz)),
  };
}

function applyRoomSync(config) {
  const next = normalizeRoomSync(config);
  roomSync.tickRate = next.tickRate;
  roomSync.stateSendHz = next.stateSendHz;
  roomSync.netRenderDelayMs = next.netRenderDelayMs;
  roomSync.maxExtrapolationMs = next.maxExtrapolationMs;
  roomSync.entityInterpRate = next.entityInterpRate;
  roomSync.bulletCorrectionRate = next.bulletCorrectionRate;
  roomSync.inputSendHz = next.inputSendHz;
  startInputSender();
}

function syncUiFromConfig(config) {
  if (syncTickrateEl) syncTickrateEl.value = String(config.tickRate);
  if (syncStateRateEl) syncStateRateEl.value = String(config.stateSendHz);
  if (syncRenderDelayEl) syncRenderDelayEl.value = String(config.netRenderDelayMs);
  if (syncMaxExtrapolationEl) syncMaxExtrapolationEl.value = String(config.maxExtrapolationMs);
  if (syncEntityInterpEl) syncEntityInterpEl.value = String(config.entityInterpRate);
  if (syncBulletCorrectionEl) syncBulletCorrectionEl.value = String(config.bulletCorrectionRate);
  if (syncInputRateEl) syncInputRateEl.value = String(config.inputSendHz);
}

function configFromSyncUi() {
  return normalizeRoomSync({
    tickRate: syncTickrateEl?.value,
    stateSendHz: syncStateRateEl?.value,
    netRenderDelayMs: syncRenderDelayEl?.value,
    maxExtrapolationMs: syncMaxExtrapolationEl?.value,
    entityInterpRate: syncEntityInterpEl?.value,
    bulletCorrectionRate: syncBulletCorrectionEl?.value,
    inputSendHz: syncInputRateEl?.value,
  });
}

function applyPresetToUi(presetKey) {
  const preset = ROOM_SYNC_PRESETS[presetKey] || ROOM_SYNC_PRESETS.normal;
  syncUiFromConfig(preset);
}

function startInputSender() {
  if (inputSendIntervalId) clearInterval(inputSendIntervalId);
  const hz = Math.max(10, Math.min(120, roomSync.inputSendHz || 30));
  inputSendIntervalId = setInterval(sendInput, 1000 / hz);
}

function pruneBytesSamples(samples, nowMs) {
  while (samples.length > 0 && nowMs - samples[0].t > NET_BYTES_WINDOW_MS) {
    samples.shift();
  }
}

function markRxBytes(bytes) {
  const nowMs = performance.now();
  netStats.rxTotalBytes += bytes;
  netStats.rxSamples.push({ t: nowMs, bytes });
  pruneBytesSamples(netStats.rxSamples, nowMs);
}

function markTxBytes(bytes) {
  const nowMs = performance.now();
  netStats.txTotalBytes += bytes;
  netStats.txSamples.push({ t: nowMs, bytes });
  pruneBytesSamples(netStats.txSamples, nowMs);
}

function updateThroughputStats() {
  const nowMs = performance.now();
  pruneBytesSamples(netStats.rxSamples, nowMs);
  pruneBytesSamples(netStats.txSamples, nowMs);

  const rxBytes = netStats.rxSamples.reduce((sum, x) => sum + x.bytes, 0);
  const txBytes = netStats.txSamples.reduce((sum, x) => sum + x.bytes, 0);
  const sec = NET_BYTES_WINDOW_MS / 1000;
  netStats.rxKBps = rxBytes / 1024 / sec;
  netStats.txKBps = txBytes / 1024 / sec;
}

function sendJson(payload) {
  if (ws.readyState !== WebSocket.OPEN) return false;
  const raw = JSON.stringify(payload);
  ws.send(raw);
  markTxBytes(raw.length);
  return true;
}

function sendNetPing() {
  if (ws.readyState !== WebSocket.OPEN) return;
  const nowMs = performance.now();
  for (const [seq, sentAt] of Array.from(netStats.pendingPings.entries())) {
    if (nowMs - sentAt > NET_PING_TIMEOUT_MS) {
      netStats.pendingPings.delete(seq);
      netStats.lostPings += 1;
    }
  }

  netStats.pingSeq += 1;
  netStats.sentPings += 1;
  netStats.pendingPings.set(netStats.pingSeq, nowMs);
  sendJson({ type: 'netPing', seq: netStats.pingSeq });
}

function handleNetPong(msg) {
  const seq = Number(msg.seq) || 0;
  const sentAt = netStats.pendingPings.get(seq);
  if (!sentAt) return;

  netStats.pendingPings.delete(seq);
  netStats.recvPings += 1;
  const rtt = performance.now() - sentAt;
  netStats.rttSamples.push(rtt);
  if (netStats.rttSamples.length > NET_RTT_SAMPLES_MAX) netStats.rttSamples.shift();
  const sorted = [...netStats.rttSamples].sort((a, b) => a - b);
  const medianRtt = sorted[Math.floor(sorted.length / 2)] || rtt;
  const prevRtt = netStats.rttMs || medianRtt;
  netStats.rttMs = medianRtt;
  netStats.jitterMs = (netStats.jitterMs * 0.8) + (Math.abs(medianRtt - prevRtt) * 0.2);
}

function onStateNetSample(serverNow) {
  const nowPerf = performance.now();
  if (netStats.lastStateAt > 0) {
    const dt = nowPerf - netStats.lastStateAt;
    netStats.stateIntervals.push(dt);
    if (netStats.stateIntervals.length > 50) netStats.stateIntervals.shift();
    const avg = netStats.stateIntervals.reduce((sum, x) => sum + x, 0) / netStats.stateIntervals.length;
    netStats.stateHz = avg > 0 ? 1000 / avg : 0;
  }
  netStats.lastStateAt = nowPerf;
  updateStateDelayEstimate();
}

function updateStateDelayEstimate() {
  if (netStats.lastStateAt <= 0) {
    netStats.stateDelayMs = 0;
    return;
  }
  const nowPerf = performance.now();
  const stalenessMs = Math.max(0, nowPerf - netStats.lastStateAt);
  const expectedTickMs = 1000 / Math.max(1, roomSync.tickRate || 45);
  const backlogMs = Math.max(0, stalenessMs - expectedTickMs * 1.2);
  netStats.stateDelayMs = roomSync.netRenderDelayMs + backlogMs;
}

function formatBytesTotal(bytes) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b >= 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
  if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + 'MB';
  if (b >= 1024) return (b / 1024).toFixed(1) + 'KB';
  return Math.round(b) + 'B';
}
function updateNetMetaUi() {
  if (!netMetaEl) return;
  updateThroughputStats();
  updateStateDelayEstimate();

  const delivered = netStats.recvPings + netStats.lostPings;
  const lossPct = delivered > 0 ? (netStats.lostPings * 100) / delivered : 0;
  const interpMs = game.netSnapshots.length > 0 ? roomSync.netRenderDelayMs : 0;

  netMetaEl.textContent = 'NET: ping ' + Math.round(netStats.rttMs) + 'ms | jitter ' + Math.round(netStats.jitterMs) + 'ms | loss ' + lossPct.toFixed(1) + '% | state ' + netStats.stateHz.toFixed(1) + 'Hz | delay ' + Math.round(netStats.stateDelayMs) + 'ms | interp ' + interpMs + 'ms | rx ' + netStats.rxKBps.toFixed(1) + 'KB/s (' + formatBytesTotal(netStats.rxTotalBytes) + ') | tx ' + netStats.txKBps.toFixed(1) + 'KB/s (' + formatBytesTotal(netStats.txTotalBytes) + ')';
}

function computeConnectionQualityLevel(rttMs, jitterMs, lossPct, stateDelayMs) {
  const rtt = Math.max(0, Number(rttMs) || 0);
  const jitter = Math.max(0, Number(jitterMs) || 0);
  const loss = Math.max(0, Number(lossPct) || 0);
  const delay = Math.max(0, Number(stateDelayMs) || 0);

  let score = 10;
  score -= Math.min(4, Math.max(0, (rtt - 40) / 40));
  score -= Math.min(2, Math.max(0, (jitter - 10) / 15));
  score -= Math.min(3, loss / 4);
  score -= Math.min(2, Math.max(0, (delay - 80) / 60));

  return Math.max(1, Math.min(10, Math.round(score)));
}

function getLocalConnectionQualityLevel() {
  const delivered = netStats.recvPings + netStats.lostPings;
  const lossPct = delivered > 0 ? (netStats.lostPings * 100) / delivered : 0;
  return computeConnectionQualityLevel(netStats.rttMs, netStats.jitterMs, lossPct, netStats.stateDelayMs);
}

function getConnectionIndicatorData(player) {
  const reported = Number(player?.netQuality);
  const level = Number.isFinite(reported) && reported > 0
    ? Math.max(1, Math.min(10, Math.round(reported)))
    : (player?.id === game.myId ? getLocalConnectionQualityLevel() : 0);

  const reportedPing = Number(player?.netPingMs);
  const pingMs = Number.isFinite(reportedPing) && reportedPing > 0
    ? Math.round(reportedPing)
    : (player?.id === game.myId ? Math.round(Number(netStats.rttMs) || 0) : 0);

  if (level <= 0) return { level: 0, title: 'Connection: no data yet', shortText: '--' };
  let label = 'Poor';
  if (level >= 9) label = 'Excellent';
  else if (level >= 7) label = 'Good';
  else if (level >= 5) label = 'Fair';

  const pingPart = pingMs > 0 ? ` | Ping: ${pingMs}ms` : '';
  const shortText = pingMs > 0 ? `${pingMs}ms` : `Q${level}`;
  return { level, title: `Connection: ${label} (${level}/10)${pingPart}`, shortText };
}

function sendNetStatsReport() {
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) return;
  const delivered = netStats.recvPings + netStats.lostPings;
  const lossPct = delivered > 0 ? (netStats.lostPings * 100) / delivered : 0;
  sendJson({
    type: 'netStats',
    rttMs: Number(netStats.rttMs) || 0,
    jitterMs: Number(netStats.jitterMs) || 0,
    lossPct,
    stateDelayMs: Number(netStats.stateDelayMs) || 0,
  });
}

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const playerSprites = Object.fromEntries(PLAYER_VARIANTS.map((v) => [v.id, loadImage(v.sprite)]));
const sprites = {
  players: playerSprites,
  enemy: loadImage('/assets/sprites/enemy_mummy.png'),
  ground: loadImage('/assets/tiles/ground_grass.jpg'),
};

function getQ() {
  return QUALITY[game.qualityKey] || QUALITY.medium;
}

function rebuildGroundTile() {
  visuals.groundTileCanvas = null;
  if (!sprites.ground.complete || sprites.ground.naturalWidth <= 0 || !getQ().groundTexture) return;

  const size = getQ().groundTileSize;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');

  g.drawImage(sprites.ground, 0, 0, size, size);
  g.fillStyle = 'rgba(8,10,14,0.72)';
  g.fillRect(0, 0, size, size);

  visuals.groundTileCanvas = c;
  visuals.groundTileSize = size;
}

sprites.ground.addEventListener('load', rebuildGroundTile);
for (const v of PLAYER_VARIANTS) {
  sprites.players[v.id].addEventListener('load', () => { if (typeof globalThis.renderCharacterPicker === 'function') globalThis.renderCharacterPicker(); });
}

qualitySelect?.addEventListener('change', () => {
  const q = qualitySelect.value;
  if (!QUALITY[q]) return;
  game.qualityKey = q;
  rebuildGroundTile();
});

function setShadowsEnabled(enabled) {
  game.shadowsEnabled = Boolean(enabled);
  if (shadowToggleEl) shadowToggleEl.checked = game.shadowsEnabled;
  localStorage.setItem('cw:shadowsEnabled', game.shadowsEnabled ? '1' : '0');
}

shadowToggleEl?.addEventListener('change', () => {
  setShadowsEnabled(shadowToggleEl.checked);
});
setShadowsEnabled(game.shadowsEnabled);

function setBulletTracersEnabled(enabled) {
  game.bulletTracersEnabled = Boolean(enabled);
  if (bulletTracersToggleEl) bulletTracersToggleEl.checked = game.bulletTracersEnabled;
  localStorage.setItem('cw:bulletTracersEnabled', game.bulletTracersEnabled ? '1' : '0');
}

bulletTracersToggleEl?.addEventListener('change', () => {
  setBulletTracersEnabled(bulletTracersToggleEl.checked);
});
setBulletTracersEnabled(game.bulletTracersEnabled);

function setEnemyHpBarsEnabled(enabled) {
  game.enemyHpBarsEnabled = Boolean(enabled);
  if (enemyHpToggleEl) enemyHpToggleEl.checked = game.enemyHpBarsEnabled;
  localStorage.setItem('cw:enemyHpBarsEnabled', game.enemyHpBarsEnabled ? '1' : '0');
}

enemyHpToggleEl?.addEventListener('change', () => {
  setEnemyHpBarsEnabled(enemyHpToggleEl.checked);
});
setEnemyHpBarsEnabled(game.enemyHpBarsEnabled);

function setExtraBloodEnabled(enabled) {
  game.extraBloodEnabled = Boolean(enabled);
  if (extraBloodToggleEl) extraBloodToggleEl.checked = game.extraBloodEnabled;
  localStorage.setItem('cw:extraBloodEnabled', game.extraBloodEnabled ? '1' : '0');
}

extraBloodToggleEl?.addEventListener('change', () => {
  setExtraBloodEnabled(extraBloodToggleEl.checked);
});
setExtraBloodEnabled(game.extraBloodEnabled);

function setHitEffectsEnabled(enabled) {
  game.hitEffectsEnabled = Boolean(enabled);
  if (hitEffectsToggleEl) hitEffectsToggleEl.checked = game.hitEffectsEnabled;
  localStorage.setItem('cw:hitEffectsEnabled', game.hitEffectsEnabled ? '1' : '0');
}

hitEffectsToggleEl?.addEventListener('change', () => {
  setHitEffectsEnabled(hitEffectsToggleEl.checked);
});
setHitEffectsEnabled(game.hitEffectsEnabled);


function setAutoFireEnabled(enabled) {
  game.autoFireEnabled = Boolean(enabled);
  if (autoFireToggleEl) autoFireToggleEl.checked = game.autoFireEnabled;
  localStorage.setItem('cw:autoFireEnabled', game.autoFireEnabled ? '1' : '0');
}

autoFireToggleEl?.addEventListener('change', () => {
  setAutoFireEnabled(autoFireToggleEl.checked);
});
setAutoFireEnabled(game.autoFireEnabled);
function setConnectionIndicatorEnabled(enabled) {
  game.connectionIndicatorEnabled = Boolean(enabled);
  if (connIndicatorToggleEl) connIndicatorToggleEl.checked = game.connectionIndicatorEnabled;
  localStorage.setItem('cw:connectionIndicatorEnabled', game.connectionIndicatorEnabled ? '1' : '0');
}

connIndicatorToggleEl?.addEventListener('change', () => {
  setConnectionIndicatorEnabled(connIndicatorToggleEl.checked);
});
setConnectionIndicatorEnabled(game.connectionIndicatorEnabled);

function setShowFpsEnabled(enabled) {
  game.showFpsEnabled = Boolean(enabled);
  if (showFpsToggleEl) showFpsToggleEl.checked = game.showFpsEnabled;
  localStorage.setItem('cw:showFpsEnabled', game.showFpsEnabled ? '1' : '0');
  updateFpsCornerVisibility();
}

showFpsToggleEl?.addEventListener('change', () => {
  setShowFpsEnabled(showFpsToggleEl.checked);
});
setShowFpsEnabled(game.showFpsEnabled);

function setShowMinimapEnabled(enabled) {
  game.showMinimapEnabled = Boolean(enabled);
  if (showMinimapToggleEl) showMinimapToggleEl.checked = game.showMinimapEnabled;
  localStorage.setItem('cw:showMinimapEnabled', game.showMinimapEnabled ? '1' : '0');
  updateMinimapVisibility();
}

showMinimapToggleEl?.addEventListener('change', () => {
  setShowMinimapEnabled(showMinimapToggleEl.checked);
});
setShowMinimapEnabled(game.showMinimapEnabled);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function setMobileControlsVisible(visible) {
  if (!mobileControlsEl) return;
  mobileControlsEl.classList.toggle('active', Boolean(visible));
  mobileControlsEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
}


function isDevConsoleOpen() {
  return Boolean(devConsoleOpen);
}

function appendDevConsoleLine(text, kind = '') {
  if (!devConsoleLogEl) return;
  const line = document.createElement('div');
  line.className = `dev-console-line${kind ? ` ${kind}` : ''}`;
  line.textContent = String(text || '');
  devConsoleLogEl.appendChild(line);
  while (devConsoleLogEl.childNodes.length > 80) {
    devConsoleLogEl.removeChild(devConsoleLogEl.firstChild);
  }
  devConsoleLogEl.scrollTop = devConsoleLogEl.scrollHeight;
}


function pushDevCommandHistory(cmd) {
  const normalized = String(cmd || '').trim();
  if (!normalized) return;
  if (devConsoleHistory[devConsoleHistory.length - 1] !== normalized) {
    devConsoleHistory.push(normalized);
    if (devConsoleHistory.length > DEV_CMD_HISTORY_LIMIT) devConsoleHistory.splice(0, devConsoleHistory.length - DEV_CMD_HISTORY_LIMIT);
    saveDevConsoleHistory();
  }
  devConsoleHistoryIndex = devConsoleHistory.length;
}

function browseDevCommandHistory(step) {
  if (!devConsoleInputEl || devConsoleHistory.length === 0) return;
  const next = Math.max(0, Math.min(devConsoleHistory.length, devConsoleHistoryIndex + step));
  devConsoleHistoryIndex = next;
  if (devConsoleHistoryIndex >= devConsoleHistory.length) {
    devConsoleInputEl.value = '';
  } else {
    devConsoleInputEl.value = devConsoleHistory[devConsoleHistoryIndex] || '';
    const len = devConsoleInputEl.value.length;
    devConsoleInputEl.setSelectionRange(len, len);
  }
}
function setDevConsoleOpen(open) {
  if (!devConsoleEl) return;
  const next = Boolean(open);
  devConsoleOpen = next;
  devConsoleEl.classList.toggle('hidden', !next);
  if (next) {
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
    input.shooting = false;
    if (devConsoleInputEl) {
      devConsoleInputEl.focus();
      devConsoleInputEl.select();
    }
  } else if (devConsoleInputEl) {
    devConsoleInputEl.blur();
  }
}

function toggleDevConsole(force) {
  if (!devConsoleEl) return false;
  setDevConsoleOpen(typeof force === 'boolean' ? force : !devConsoleOpen);
  return devConsoleOpen;
}

function submitDevConsoleCommand(rawCommand) {
  const cmd = String(rawCommand || '').trim();
  if (!cmd) return;
  pushDevCommandHistory(cmd);
  appendDevConsoleLine(`> ${cmd}`);
  if (cmd.toLowerCase() === 'clear') {
    if (devConsoleLogEl) devConsoleLogEl.innerHTML = '';
    return;
  }
  if (cmd.toLowerCase() === 'history') {
    if (devConsoleHistory.length === 0) {
      appendDevConsoleLine('History is empty.');
      return;
    }
    const start = Math.max(0, devConsoleHistory.length - 20);
    for (let i = start; i < devConsoleHistory.length; i += 1) {
      appendDevConsoleLine((i - start + 1) + '. ' + (devConsoleHistory[i] || ''));
    }
    return;
  }
  if (cmd.toLowerCase() === 'clearhistory') {
    clearDevConsoleHistory();
    appendDevConsoleLine('Command history cleared.', 'ok');
    return;
  }
  if (handleLocalDevConsoleCommand(cmd)) return;
  if (!sendJson({ type: 'devCheat', command: cmd })) {
    appendDevConsoleLine('Not connected.', 'err');
  }
}

function onDevConsoleServerMessage(msg) {
  const text = String(msg?.text || '').trim();
  if (!text) return;
  appendDevConsoleLine(text, msg?.ok === false ? 'err' : 'ok');
}
function updateFpsCornerVisibility(overlayOpen = null) {
  if (!fpsCornerEl) return;
  const menuOpen = overlayOpen === null ? (getComputedStyle(joinOverlay).display !== 'none') : Boolean(overlayOpen);
  fpsCornerEl.classList.toggle('hidden', menuOpen || !game.showFpsEnabled);
}

function updateMinimapVisibility(overlayOpen = null) {
  if (!minimapWrapEl) return;
  const menuOpen = overlayOpen === null ? (getComputedStyle(joinOverlay).display !== 'none') : Boolean(overlayOpen);
  const minimapDisabled = !game.showMinimapEnabled;
  minimapWrapEl.classList.toggle('hidden', menuOpen || minimapDisabled);
  if (toggleInfoBtn) toggleInfoBtn.classList.toggle('minimap-hidden', minimapDisabled);
}

function updateHudVisibility(overlayOpen) {
  canvas.classList.toggle('hidden', Boolean(overlayOpen));
  if (hudEl) hudEl.classList.toggle('menu-hidden', Boolean(overlayOpen));
  if (topCenterHudEl) topCenterHudEl.classList.toggle('hidden', Boolean(overlayOpen));
  if (bottomHudEl) bottomHudEl.classList.toggle('hidden', Boolean(overlayOpen));
  if (statsToggleBtn) statsToggleBtn.classList.toggle('hidden', Boolean(overlayOpen));
  if (overlayOpen) {
    if (statsPanelEl) statsPanelEl.classList.add('hidden');
  } else {
    setStatsPanelOpen(statsPanelOpen);
  }
  if (overlayOpen && levelupOverlayEl) levelupOverlayEl.classList.add('hidden');
  if (overlayOpen) document.body.classList.remove('levelup-open');
  updateFpsCornerVisibility(overlayOpen);
  updateMinimapVisibility(overlayOpen);
}


devConsoleFormEl?.addEventListener('submit', (e) => {
  e.preventDefault();
  submitDevConsoleCommand(devConsoleInputEl?.value || '');
  if (devConsoleInputEl) devConsoleInputEl.value = '';
});

devConsoleInputEl?.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowUp') {
    e.preventDefault();
    browseDevCommandHistory(-1);
    return;
  }
  if (e.code === 'ArrowDown') {
    e.preventDefault();
    browseDevCommandHistory(1);
    return;
  }
  if (e.code === 'Escape' || e.code === 'Backquote') {
    e.preventDefault();
    e.stopPropagation();
    toggleDevConsole(false);
  }
});

devConsoleToggleBtn?.addEventListener('click', () => {
  toggleDevConsole();
});

appendDevConsoleLine('Console ready. Type help.');
loadDevConsoleHistory();
loadDevKeyBindings();
function updateMobileControlsVisibility() {
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
  updateHudVisibility(overlayOpen);
  if (devConsoleToggleBtn) devConsoleToggleBtn.classList.toggle('hidden', !mobile.enabled || overlayOpen);

  if (!mobile.enabled) {
    setMobileControlsVisible(false);
    return;
  }
  setMobileControlsVisible(!overlayOpen);
}
