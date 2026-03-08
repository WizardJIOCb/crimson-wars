
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const statusEl = document.getElementById('status');
const roomMetaEl = document.getElementById('room-meta');
const weaponMetaEl = document.getElementById('weapon-meta');
const fpsMetaEl = document.getElementById('fps-meta');
const netMetaEl = document.getElementById('net-meta');
const qualitySelect = document.getElementById('quality-select');
const shadowToggleEl = document.getElementById('shadow-toggle');
const enemyHpToggleEl = document.getElementById('enemy-hp-toggle');
const extraBloodToggleEl = document.getElementById('extra-blood-toggle');
const connIndicatorToggleEl = document.getElementById('conn-indicator-toggle');
const scoreboardEl = document.getElementById('scoreboard');
const hudEl = document.getElementById('hud');
const joinOverlay = document.getElementById('join-overlay');
const joinForm = document.getElementById('join-form');
const nameInput = document.getElementById('name');
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
const toggleInfoBtn = document.getElementById('toggle-info');
const mobileControlsEl = document.getElementById('mobile-controls');
const moveStickEl = document.getElementById('move-stick');
const moveKnobEl = document.getElementById('move-knob');
const aimStickEl = document.getElementById('aim-stick');
const aimKnobEl = document.getElementById('aim-knob');

ctx.imageSmoothingEnabled = false;

const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${wsProto}://${location.host}/ws`);

const QUALITY = {
  low: { groundTexture: false, groundTileSize: 96, maxBlood: 120, maxMuzzle: 28, bloodMult: 0.55, overlays: false },
  medium: { groundTexture: true, groundTileSize: 128, maxBlood: 220, maxMuzzle: 50, bloodMult: 0.85, overlays: true },
  high: { groundTexture: true, groundTileSize: 160, maxBlood: 360, maxMuzzle: 90, bloodMult: 1, overlays: true },
};

const input = { up: false, down: false, left: false, right: false, shooting: false, pointerX: 0, pointerY: 0 };
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
  enemyHpBarsEnabled: getToggleDefaultOn('cw:enemyHpBarsEnabled'),
  extraBloodEnabled: getToggleDefaultOn('cw:extraBloodEnabled'),
  connectionIndicatorEnabled: getToggleDefaultOn('cw:connectionIndicatorEnabled'),
  renderPlayers: new Map(),
  renderEnemies: new Map(),
  renderBullets: new Map(),
  netSnapshots: [],
  sampledNet: null,
};

const camera = { x: 0, y: 0 };
const visuals = { blood: [], bloodPuddles: [], gore: [], muzzle: [], enemyPrev: new Map(), bulletIds: new Set(), groundTileCanvas: null, groundTileSize: 0 };

let joinMode = 'create';
const NICKNAME_STORAGE_KEY = 'cw:nickname';
const PLAYER_CLASS_STORAGE_KEY = 'cw:playerClass';
let selectedPlayerClass = 'cyber';
const storedInfoPanelHidden = localStorage.getItem('cw:infoPanelHidden');
let infoPanelHidden = storedInfoPanelHidden === null ? true : storedInfoPanelHidden === '1';
let lastFrameTs = performance.now();
let fpsFrameCount = 0;
let fpsAccumSec = 0;

const recordsUi = { page: 1, totalPages: 1, pageSize: 10, total: 0 };
let prevMyAlive = null;
let sessionStartedAt = 0;
let waitingForFirstState = false;
let waitingForFirstStateSince = 0;
let lastScoreboardHtml = '';

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
function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

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
  sprites.players[v.id].addEventListener('load', renderCharacterPicker);
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

function setConnectionIndicatorEnabled(enabled) {
  game.connectionIndicatorEnabled = Boolean(enabled);
  if (connIndicatorToggleEl) connIndicatorToggleEl.checked = game.connectionIndicatorEnabled;
  localStorage.setItem('cw:connectionIndicatorEnabled', game.connectionIndicatorEnabled ? '1' : '0');
}

connIndicatorToggleEl?.addEventListener('change', () => {
  setConnectionIndicatorEnabled(connIndicatorToggleEl.checked);
});
setConnectionIndicatorEnabled(game.connectionIndicatorEnabled);

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

function updateHudVisibility(overlayOpen) {
  if (!hudEl) return;
  hudEl.classList.toggle('menu-hidden', Boolean(overlayOpen));
}

function updateMobileControlsVisibility() {
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
  updateHudVisibility(overlayOpen);

  if (!mobile.enabled) {
    setMobileControlsVisible(false);
    return;
  }
  setMobileControlsVisible(!overlayOpen);
}

function resetMobileStick(kind) {
  if (kind === 'move') {
    mobile.moveId = null;
    mobile.moveX = 0;
    mobile.moveY = 0;
    mobile.moveStrength = 0;
    if (moveKnobEl) moveKnobEl.style.transform = 'translate(-50%, -50%)';
    return;
  }
  mobile.aimId = null;
  mobile.aimStrength = 0;
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
      mobile.moveId = touch.identifier;
      updateMobileStick('move', touch.clientX, touch.clientY);
    }
    if (kind === 'aim' && mobile.aimId === null) {
      mobile.aimId = touch.identifier;
      updateMobileStick('aim', touch.clientX, touch.clientY);
    }
  };

  moveStickEl.addEventListener('touchstart', (e) => onStart('move', e), { passive: false });
  aimStickEl.addEventListener('touchstart', (e) => onStart('aim', e), { passive: false });

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
    if (changed) e.preventDefault();
  };

  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd, { passive: false });
  window.addEventListener('touchcancel', onEnd, { passive: false });

  updateMobileControlsVisibility();
}

initMobileControls();
updateMobileControlsVisibility();

function setInfoPanelHidden(hidden) {
  infoPanelHidden = Boolean(hidden);
  if (infoPanelEl) infoPanelEl.classList.toggle('is-hidden', infoPanelHidden);
  if (toggleInfoBtn) toggleInfoBtn.textContent = infoPanelHidden ? 'Show menu' : 'Hide menu';
  localStorage.setItem('cw:infoPanelHidden', infoPanelHidden ? '1' : '0');
}

if (toggleInfoBtn) {
  toggleInfoBtn.addEventListener('click', () => {
    setInfoPanelHidden(!infoPanelHidden);
  });
}

setInfoPanelHidden(infoPanelHidden);

function getPlayerVariant(id) {
  return PLAYER_VARIANTS.find((x) => x.id === id) || PLAYER_VARIANTS[0];
}

function sanitizePlayerClass(id) {
  const key = (id || '').toString().trim();
  return getPlayerVariant(key).id;
}

function drawCharacterPreview(previewCanvas, variant) {
  const c = previewCanvas;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;

  const sprite = sprites.players[variant.id];
  const fw = Math.max(8, Number(variant.frameW) || 32);
  const fh = Math.max(8, Number(variant.frameH) || 48);
  const scale = Math.max(0.5, Number(variant.scale) || 1);
  const frameCount = sprite?.naturalWidth ? Math.max(1, Math.floor(sprite.naturalWidth / fw)) : 1;
  const idleFrame = Math.max(0, Math.min(frameCount - 1, Number(variant.idleFrame) || 1));

  if (!(sprite?.complete && sprite.naturalWidth >= fw && sprite.naturalHeight >= fh)) {
    g.fillStyle = variant.accent;
    g.beginPath();
    g.arc(c.width / 2, c.height / 2, 12, 0, Math.PI * 2);
    g.fill();
    return;
  }

  const dw = fw * scale;
  const dh = fh * scale;
  const dx = Math.round((c.width - dw) / 2);
  const dy = Math.round(c.height - dh - 1);
  g.drawImage(sprite, idleFrame * fw, (variant.rows?.down || 0) * fh, fw, fh, dx, dy, dw, dh);

  g.fillStyle = variant.accent;
  g.fillRect(c.width - 14, 4, 10, 3);
}
function renderCharacterPicker() {
  if (!characterSelectEl) return;
  characterSelectEl.innerHTML = '';
  selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);

  for (const variant of PLAYER_VARIANTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'char-option' + (variant.id === selectedPlayerClass ? ' active' : '');
    btn.dataset.classId = variant.id;

    const preview = document.createElement('canvas');
    preview.width = 48;
    preview.height = 52;
    preview.className = 'char-preview';
    drawCharacterPreview(preview, variant);

    const label = document.createElement('span');
    label.className = 'char-label';
    label.textContent = variant.name;

    btn.appendChild(preview);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      selectedPlayerClass = variant.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      renderCharacterPicker();
    });
    characterSelectEl.appendChild(btn);
  }
}


const storedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
if (nameInput && storedNickname && storedNickname.trim()) {
  nameInput.value = storedNickname.trim().slice(0, 18);
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

function sendJoinRequest(roomCode, joinSync = null) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const name = nameInput.value.trim() || 'Fighter';
  localStorage.setItem(NICKNAME_STORAGE_KEY, name);
  waitingForFirstState = true;
  waitingForFirstStateSince = performance.now();
  sendJson({
    type: 'join',
    name,
    playerClass: selectedPlayerClass,
    roomCode,
    sync: joinSync || undefined,
  });
  joinOverlay.style.display = 'none';
  joinOverlay.classList.remove('death-mode');
  setDeathCinematicActive(false);
  updateMobileControlsVisibility();
}

function renderPresence(presence) {
  if (!presenceMetaEl) return;
  const online = Number(presence?.online) || 0;
  const inGame = Number(presence?.inGame) || 0;
  const inMenu = Number(presence?.inMenu) || 0;
  presenceMetaEl.textContent = `Online: ${online} | In game: ${inGame} | In menu: ${inMenu}`;
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
      sendJoinRequest(room.code, null);
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
    renderPresence(payload.presence);
    renderRoomsList(Array.isArray(payload.rooms) ? payload.rooms : []);
  } catch {
    if (presenceMetaEl) presenceMetaEl.textContent = 'Online: -- | In game: -- | In menu: --';
    roomsListEl.textContent = 'Failed to load rooms.';
  }
}


function updateRecordsPager() {
  if (recordsPageEl) recordsPageEl.textContent = `Page ${recordsUi.page}/${recordsUi.totalPages}`;
  if (recordsTotalEl) recordsTotalEl.textContent = `(Total: ${recordsUi.total})`;
  if (recordsPrevBtn) recordsPrevBtn.disabled = recordsUi.page <= 1;
  if (recordsNextBtn) recordsNextBtn.disabled = recordsUi.page >= recordsUi.totalPages;
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
    const row = document.createElement('div');
    row.className = 'record-row';

    const rank = document.createElement('div');
    rank.className = 'record-rank';
    rank.textContent = `#${rankOffset + i + 1}`;

    const name = document.createElement('div');
    name.className = 'record-name';
    name.textContent = r.name || 'Unknown';

    const kills = Number(r.kills) || 0;
    const score = Number(r.score) || 0;
    const durationSec = Number(r.durationSec) || 0;
    const roomCode = (r.roomCode || '-').toString();

    const meta = document.createElement('div');
    meta.className = 'record-meta';
    meta.textContent = `${kills}K / ${score}pts`;

    const details = [
      `Name: ${r.name || 'Unknown'}`,
      `Kills: ${kills}`,
      `Score (points): ${score}`,
      `Room: ${roomCode}`,
      `Match time: ${durationSec}s`,
    ].join('\n');
    row.title = details;
    meta.title = details;

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(meta);
    recordsListEl.appendChild(row);
  }
}

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
    let r = game.renderPlayers.get(id);
    if (!r) {
      r = { x: p.x, y: p.y, vx: 0, vy: 0 };
      game.renderPlayers.set(id, r);
      continue;
    }

    const nx = r.x + (p.x - r.x) * alpha;
    const ny = r.y + (p.y - r.y) * alpha;
    r.vx = (nx - r.x) / Math.max(0.001, dt);
    r.vy = (ny - r.y) / Math.max(0.001, dt);
    r.x = nx;
    r.y = ny;
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
      r = { x: e.x, y: e.y, vx: 0, vy: 0 };
      game.renderEnemies.set(id, r);
      continue;
    }

    const nx = r.x + (e.x - r.x) * alpha;
    const ny = r.y + (e.y - r.y) * alpha;
    r.vx = (nx - r.x) / Math.max(0.001, dt);
    r.vy = (ny - r.y) / Math.max(0.001, dt);
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
        vx: b.vx || 0,
        vy: b.vy || 0,
        color: b.color,
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = b.x;
    r.serverY = b.y;
    r.vx = (r.vx * 0.3) + ((b.vx || 0) * 0.7);
    r.vy = (r.vy * 0.3) + ((b.vy || 0) * 0.7);
    r.color = b.color;
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
}

function updateBulletInterpolation(dt) {
  const targets = game.sampledNet?.bullets || mapById(game.state?.bullets || []);
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
        vx: tb.vx || 0,
        vy: tb.vy || 0,
        color: tb.color,
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = tb.x;
    r.serverY = tb.y;
    r.vx = (r.vx * 0.35) + ((tb.vx || 0) * 0.65);
    r.vy = (r.vy * 0.35) + ((tb.vy || 0) * 0.65);
    r.color = tb.color;

    r.x += r.vx * dt;
    r.y += r.vy * dt;

    const dx = r.serverX - r.x;
    const dy = r.serverY - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      const correction = Math.min(dist, Math.max(8, Math.hypot(r.vx, r.vy) * dt * 1.4));
      const k = (correction / dist) * Math.min(1, roomSync.bulletCorrectionRate * dt);
      r.x += dx * k;
      r.y += dy * k;
    }
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
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
    players: state.players.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    enemies: state.enemies.map((e) => ({ id: e.id, x: e.x, y: e.y })),
    bullets: state.bullets.map((b) => ({
      id: b.id ?? `${b.x.toFixed(1)}:${b.y.toFixed(1)}`,
      x: b.x,
      y: b.y,
      vx: b.vx || 0,
      vy: b.vy || 0,
      color: b.color,
    })),
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
    };
  }

  const dt = Math.max(1, b.t - a.t);
  const k = Math.max(0, Math.min(1, (target - a.t) / dt));

  const lerpMap = (la, lb, withVel) => {
    const ma = mapById(la);
    const mb = mapById(lb);
    const ids = new Set([...ma.keys(), ...mb.keys()]);
    const out = new Map();

    for (const id of ids) {
      const pa = ma.get(id);
      const pb = mb.get(id);
      if (pa && pb) {
        out.set(id, {
          id,
          x: pa.x + (pb.x - pa.x) * k,
          y: pa.y + (pb.y - pa.y) * k,
          vx: withVel ? (pb.vx ?? pa.vx ?? 0) : 0,
          vy: withVel ? (pb.vy ?? pa.vy ?? 0) : 0,
          color: pb.color ?? pa.color,
        });
      } else {
        out.set(id, pb || pa);
      }
    }

    return out;
  };

  return {
    players: lerpMap(a.players, b.players, false),
    enemies: lerpMap(a.enemies, b.enemies, false),
    bullets: lerpMap(a.bullets, b.bullets, true),
  };
}
function isVisibleWorld(x, y, pad = 0) {
  const sx = x - camera.x;
  const sy = y - camera.y;
  return sx >= -pad && sx <= canvas.width + pad && sy >= -pad && sy <= canvas.height + pad;
}

function updateScoreboard(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const rows = sorted.map((p) => {
    const kills = Number(p.kills) || 0;
    const ammo = p.ammo === null ? 'inf' : p.ammo;
    const meClass = p.id === game.myId ? ' me' : '';
    const conn = getConnectionIndicatorData(p);
    const connIcon = game.connectionIndicatorEnabled
      ? `<span class="conn-wrap" aria-label="${conn.title}"><span class="conn-indicator conn-lvl-${conn.level}"></span><span class="conn-meta">${conn.shortText}</span></span>`
      : '';
    return `<div class="score-row${meClass}">${connIcon}<span class="score-player-text">${p.name} - Kills: ${kills} (${p.weaponLabel} ${ammo})</span></div>`;
  });

  const nextHtml = `<div class="score-title">Players</div>${rows.join('')}`;
  if (scoreboardEl.matches(':hover')) return;
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

function updateSyncSettingsVisibility() {
  if (!syncSettingsEl) return;
  syncSettingsEl.style.display = joinMode === 'create' ? '' : 'none';
}


window.addEventListener('keydown', (e) => {
  const t = e.target;
  const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;

  if (!typing && e.code === 'KeyH') {
    setInfoPanelHidden(!infoPanelHidden);
    return;
  }

  keyStateFromCode(e.code, true);
  if (e.code === 'Digit1' && ws.readyState === WebSocket.OPEN) {
    sendJson({ type: 'weaponSwitch', weaponKey: 'pistol' });
  }
});
window.addEventListener('keyup', (e) => keyStateFromCode(e.code, false));
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) input.shooting = true; });
window.addEventListener('mouseup', () => { input.shooting = false; });
canvas.addEventListener('mousemove', (e) => { input.pointerX = e.clientX; input.pointerY = e.clientY; });

joinForm.addEventListener('click', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLButtonElement)) return;
  if (!t.dataset.mode) return;
  joinMode = t.dataset.mode;
  updateSyncSettingsVisibility();
});

updateSyncSettingsVisibility();

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (ws.readyState !== WebSocket.OPEN) return;
  const roomCode = joinMode === 'create' ? '' : roomCodeInput.value.trim();
  const joinSync = joinMode === 'create' ? configFromSyncUi() : null;
  sendJoinRequest(roomCode, joinSync);
});

function clearLocalSessionState() {
  game.myId = null;
  game.roomCode = null;
  game.state = null;
  game.netSnapshots = [];
  game.sampledNet = null;
  game.renderPlayers.clear();
  game.renderEnemies.clear();
  game.renderBullets.clear();
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
  scoreboardEl.innerHTML = '';
  lastScoreboardHtml = '';
}

function leaveActiveRoom() {
  if (ws.readyState === WebSocket.OPEN && game.myId) {
    sendJson({ type: 'leave' });
  }
  clearLocalSessionState();
}

function renderDeathResult(result) {
  if (!deathResultEl) return;
  if (!result) {
    deathResultEl.textContent = 'Last result: --';
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
  setDeathCinematicActive(false);
  joinOverlay.classList.add('death-mode');
  statusEl.textContent = 'You died. Last result is shown below.';
  updateMobileControlsVisibility();
  requestRoomsList();
  requestRecordsList(recordsUi.page);
}

function openDeathOverlay(result) {
  leaveActiveRoom();
  joinOverlay.style.display = 'grid';
  joinOverlay.classList.add('death-mode');
  renderDeathResult(result);
  setDeathCinematicActive(true);
}

deathContinueBtn?.addEventListener('click', () => {
  openDeathMenuAfterCinematic();
});


refreshRoomsBtn?.addEventListener('click', () => {
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
  if (!game.myId && game.connected) {
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }
}, 5000);
ws.addEventListener('open', () => {
  game.connected = true;
  statusEl.textContent = 'Connected. Create room or join code.';
  requestRoomsList();
  requestRecordsList(1);
  sendNetPing();
});

ws.addEventListener('close', () => {
  game.connected = false;
  netStats.pendingPings.clear();
  statusEl.textContent = 'Disconnected';
});
ws.addEventListener('message', (ev) => {
  const rawSize = typeof ev.data === 'string' ? ev.data.length : 0;
  if (rawSize > 0) markRxBytes(rawSize);

  let msg;
  try { msg = JSON.parse(ev.data); } catch { return; }

  if (msg.type === 'netPong') {
    handleNetPong(msg);
    return;
  }

  if (msg.type === 'welcome') {
    game.myId = msg.id;
    prevMyAlive = true;
    sessionStartedAt = Date.now();
    if (msg.sync) applyRoomSync(msg.sync);
    game.roomCode = msg.roomCode;
    game.renderPlayers.clear();
    game.renderEnemies.clear();
    game.renderBullets.clear();
    game.netSnapshots = [];
    game.sampledNet = null;
    visuals.enemyPrev = new Map();
    visuals.blood = [];
    visuals.bloodPuddles = [];
    visuals.gore = [];
    visuals.muzzle = [];
    roomMetaEl.textContent = `Room: ${msg.roomCode}`;
    statusEl.textContent = `Online as ${msg.id} | tick ${roomSync.tickRate}`;
  }

  if (msg.type === 'joinError') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    statusEl.textContent = msg.message;
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }

  if (msg.type === 'system') statusEl.textContent = msg.message;

  if (msg.type === 'state') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    const s = msg.payload;
    onStateNetSample(s.now);
    pushNetSnapshot(s);
    syncBulletsFromState(s);
    processStateFx(s);
    game.state = s;
    game.world = s.world;
    game.roomCode = s.roomCode;
    if (s.sync) applyRoomSync(s.sync);
    roomMetaEl.textContent = `Room: ${s.roomCode}`;

    game.sortedTrees = (s.decor?.trees || []).slice().sort((a, b) => a.y - b.y);
    updateScoreboard(s.players);

    const me = s.players.find((p) => p.id === game.myId);
    if (me) {
      weaponMetaEl.textContent = `Weapon: ${me.weaponLabel} | Ammo: ${me.ammo === null ? 'inf' : me.ammo}`;
      if (prevMyAlive === true && !me.alive) {
        const deathResult = {
          kills: Number(me.kills) || 0,
          score: Number(me.score) || 0,
          roomCode: game.roomCode || s.roomCode || '-',
          survivalSec: Math.max(1, Math.floor((Date.now() - (sessionStartedAt || Date.now())) / 1000)),
        };
        openDeathOverlay(deathResult);
        return;
      }
      prevMyAlive = Boolean(me.alive);
    } else {
      prevMyAlive = null;
    }
  }
});

function sendInput() {
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) return;
  const me = game.state.players.find((p) => p.id === game.myId);
  if (!me) return;

  let moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  let aimX = input.pointerX + camera.x;
  let aimY = input.pointerY + camera.y;
  let shooting = input.shooting;

  if (mobile.enabled) {
    moveX = mobile.moveX * Math.min(1, mobile.moveStrength * 1.15);
    moveY = mobile.moveY * Math.min(1, mobile.moveStrength * 1.15);

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
    } else {
      aimX = me.x + mobile.lastAimX * aimDistWorld;
      aimY = me.y + mobile.lastAimY * aimDistWorld;
      shooting = false;
      input.pointerX = sx + mobile.lastAimX * aimDistScreen;
      input.pointerY = sy + mobile.lastAimY * aimDistScreen;
    }
  }

  sendJson({
    type: 'input',
    moveX,
    moveY,
    aimX,
    aimY,
    shooting,
  });
}
function spawnBlood(x, y, count) {
  const q = getQ();
  const n = Math.floor(count * q.bloodMult);
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 170;
    visuals.blood.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.2 + Math.random() * 0.45, ttl: 0.2 + Math.random() * 0.45, s: 1.2 + Math.random() * 2.4 });
  }
  if (visuals.blood.length > q.maxBlood) visuals.blood.splice(0, visuals.blood.length - q.maxBlood);
}

function spawnBloodPuddle(x, y, intensity = 1) {
  visuals.bloodPuddles.push({
    x: x + (Math.random() * 10 - 5),
    y: y + (Math.random() * 10 - 5),
    r: 14 + Math.random() * 10 * intensity,
    life: 1.2 + Math.random() * 0.6,
    ttl: 1.2 + Math.random() * 0.6,
  });
  if (visuals.bloodPuddles.length > 60) visuals.bloodPuddles.splice(0, visuals.bloodPuddles.length - 60);
}


function spawnGoreBurst(x, y, damage = 10) {
  if (!game.extraBloodEnabled) return;
  const chunks = Math.max(3, Math.min(14, Math.floor(damage * 0.45)));
  for (let i = 0; i < chunks; i += 1) {
    const angle = (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 26 + Math.random() * 120;
    const lift = 45 + Math.random() * 120;
    visuals.gore.push({
      x,
      y,
      z: 4 + Math.random() * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: lift,
      life: 0.45 + Math.random() * 0.55,
      ttl: 0.45 + Math.random() * 0.55,
      s: 1.4 + Math.random() * 1.8,
      splat: false,
    });
  }
  if (visuals.gore.length > 260) visuals.gore.splice(0, visuals.gore.length - 260);
}

function processStateFx(nextState) {
  const prevMap = visuals.enemyPrev;
  const nextMap = new Map();

  for (const e of nextState.enemies) {
    nextMap.set(e.id, { x: e.x, y: e.y, hp: e.hp });
    const prev = prevMap.get(e.id);
    if (prev && e.hp < prev.hp) {
      const hitDamage = Math.max(1, prev.hp - e.hp);
      spawnBlood(e.x, e.y, Math.max(2, Math.floor(hitDamage * 0.45)));
      spawnGoreBurst(e.x, e.y, hitDamage);
    }
  }

  for (const [id, prev] of prevMap.entries()) {
    if (!nextMap.has(id)) {
      spawnBlood(prev.x, prev.y, 18);
      spawnGoreBurst(prev.x, prev.y, 18);
      spawnBloodPuddle(prev.x, prev.y, 1);
    }
  }
  visuals.enemyPrev = nextMap;

  const playersById = new Map(nextState.players.map((p) => [p.id, p]));
  const ids = new Set();
  for (const b of nextState.bullets) {
    ids.add(b.id);
    if (!visuals.bulletIds.has(b.id)) {
      const owner = playersById.get(b.ownerId);
      if (owner) {
        const a = Math.atan2(b.y - owner.y, b.x - owner.x);
        visuals.muzzle.push({ x: owner.x + Math.cos(a) * 20, y: owner.y + Math.sin(a) * 20, a, c: b.color || '#ffd166', life: 0.05, ttl: 0.05 });
      }
    }
  }
  visuals.bulletIds = ids;

  const maxM = getQ().maxMuzzle;
  if (visuals.muzzle.length > maxM) visuals.muzzle.splice(0, visuals.muzzle.length - maxM);
}
function updateFx(dt) {
  for (let i = visuals.blood.length - 1; i >= 0; i -= 1) {
    const p = visuals.blood[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    if (p.life <= 0) visuals.blood.splice(i, 1);
  }

  for (let i = visuals.gore.length - 1; i >= 0; i -= 1) {
    const g = visuals.gore[i];
    g.life -= dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vx *= 0.985;
    g.vy *= 0.985;
    g.vz -= 280 * dt;
    g.z += g.vz * dt;

    if (g.z <= 0 && !g.splat) {
      g.z = 0;
      g.splat = true;
      spawnBlood(g.x, g.y, 2);
      spawnBloodPuddle(g.x, g.y, 0.35);
    }

    if (g.life <= 0 || (g.splat && g.life < g.ttl * 0.35)) {
      visuals.gore.splice(i, 1);
    }
  }

  for (let i = visuals.bloodPuddles.length - 1; i >= 0; i -= 1) {
    visuals.bloodPuddles[i].life -= dt;
    if (visuals.bloodPuddles[i].life <= 0) visuals.bloodPuddles.splice(i, 1);
  }

  for (let i = visuals.muzzle.length - 1; i >= 0; i -= 1) {
    visuals.muzzle[i].life -= dt;
    if (visuals.muzzle[i].life <= 0) visuals.muzzle.splice(i, 1);
  }
}
function drawGround() {
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const q = getQ();
  if (q.groundTexture && visuals.groundTileCanvas) {
    const t = visuals.groundTileSize;
    const startX = Math.floor(camera.x / t) * t;
    const startY = Math.floor(camera.y / t) * t;
    const endX = camera.x + canvas.width + t;
    const endY = camera.y + canvas.height + t;

    for (let y = startY; y < endY; y += t) {
      for (let x = startX; x < endX; x += t) {
        ctx.drawImage(visuals.groundTileCanvas, x - camera.x, y - camera.y, t, t);
      }
    }
  }

  if (q.overlays) {
    const g = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.55, 70, canvas.width * 0.5, canvas.height * 0.55, Math.max(canvas.width, canvas.height) * 0.8);
    g.addColorStop(0, 'rgba(120,35,20,0.13)');
    g.addColorStop(1, 'rgba(16,8,8,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawCircle(x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x - camera.x, y - camera.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawShadowAtScreen(sx, sy, rx, ry, alpha = 0.28) {
  if (!game.shadowsEnabled) return;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawHpBar(x, y, ratio) {
  const sx = x - camera.x - 19;
  const sy = y - camera.y - 36;
  if (sx < -40 || sx > canvas.width + 40 || sy < -20 || sy > canvas.height + 20) return;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(sx, sy, 38, 5);
  ctx.fillStyle = ratio > 0.35 ? '#84cc16' : '#ef4444';
  ctx.fillRect(sx, sy, 38 * ratio, 5);
}
function drawTrees() {
  for (const tr of game.sortedTrees) {
    if (!isVisibleWorld(tr.x, tr.y - 36, 90)) continue;
    const x = tr.x - camera.x;
    const y = tr.y - camera.y;
    const s = (tr.scale || 1) * 1.6;

    drawShadowAtScreen(x + 8 * s, y + 12 * s, 14 * s, 6 * s, 0.24);

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#2a211c';
    ctx.beginPath();
    ctx.moveTo(-2 * s, 10 * s);
    ctx.lineTo(6 * s, -18 * s);
    ctx.lineTo(12 * s, -16 * s);
    ctx.lineTo(3 * s, 12 * s);
    ctx.closePath();
    ctx.fill();

    const canopy = ['#132a1b', '#173221', '#1c3b27'];
    const blobs = [
      { x: -16, y: -24, r: 10 },
      { x: -6, y: -28, r: 11 },
      { x: 6, y: -28, r: 10 },
      { x: 16, y: -24, r: 9 },
      { x: -1, y: -21, r: 12 },
    ];

    for (let i = 0; i < blobs.length; i += 1) {
      const b = blobs[i];
      ctx.fillStyle = canopy[i % canopy.length];
      ctx.beginPath();
      ctx.arc(b.x * s, b.y * s, b.r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawVariantAccents(x, y, variant) {
  ctx.fillStyle = variant.accent;
  ctx.fillRect(x - 7, y - 22, 14, 3);
}
function drawWeaponIcon(sx, sy, weaponKey) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#f8fafc';
  ctx.fillStyle = '#f8fafc';
  if (weaponKey === 'smg') {
    ctx.fillRect(-6, -1, 10, 2);
    ctx.fillRect(2, -3, 2, 5);
    ctx.fillRect(-1, 1, 2, 4);
  } else if (weaponKey === 'shotgun') {
    ctx.fillRect(-7, -1, 12, 2);
    ctx.fillRect(-2, 1, 2, 5);
  } else if (weaponKey === 'sniper') {
    ctx.fillRect(-8, -1, 14, 2);
    ctx.fillRect(-2, -4, 4, 2);
    ctx.strokeRect(4, -2, 2, 3);
  } else {
    ctx.fillRect(-5, -1, 8, 2);
    ctx.fillRect(1, -3, 2, 5);
  }
  ctx.restore();
}

function drawPlayer(p, t, isMe, rx, ry) {
  if (!isVisibleWorld(rx, ry, 50)) return;
  const x = rx - camera.x;
  const y = ry - camera.y;

  if (!p.alive) {
    drawCircle(rx, ry, 18, '#6b7280');
    return;
  }

  const variant = getPlayerVariant(p.playerClass || (isMe ? selectedPlayerClass : 'cyber'));
  const playerSprite = sprites.players[variant.id];
  const fw = Math.max(8, Number(variant.frameW) || 32);
  const fh = Math.max(8, Number(variant.frameH) || 48);
  const scale = Math.max(0.5, Number(variant.scale) || 1);

  const dw = fw * scale;
  const dh = fh * scale;
  drawShadowAtScreen(x, y + dh * 0.34, Math.max(10, dw * 0.33), Math.max(4, dh * 0.1), 0.3);

  if (playerSprite?.complete && playerSprite.naturalWidth >= fw && playerSprite.naturalHeight >= fh) {
    const rv = game.renderPlayers.get(p.id);
    const keyMoving = input.up || input.down || input.left || input.right;
    const mobileMoving = mobile.enabled && mobile.moveStrength > 0.08;
    const velMoving = Math.hypot(rv?.vx || 0, rv?.vy || 0) > 10;
    const moving = isMe ? (keyMoving || mobileMoving || velMoving) : velMoving;
    const phase = isMe ? 0 : (p.id.charCodeAt(0) % 3);

    const frameCount = Math.max(1, Math.floor(playerSprite.naturalWidth / fw));
    const rowCount = Math.max(1, Math.floor(playerSprite.naturalHeight / fh));
    const fps = Math.max(2, Number(variant.fps) || 9);
    const idleFrame = Math.max(0, Math.min(frameCount - 1, Number(variant.idleFrame) || 1));
    const frame = moving ? (Math.floor(t * fps + phase) % frameCount) : idleFrame;

    const lookDx = isMe ? (input.pointerX - x) : (rv?.vx || 0);
    const lookDy = isMe ? (input.pointerY - y) : (rv?.vy || 0);
    let dir = 'down';
    if (Math.abs(lookDx) > Math.abs(lookDy)) dir = lookDx < 0 ? 'left' : 'right';
    else if (Math.abs(lookDy) > 0.0001) dir = lookDy < 0 ? 'up' : 'down';

    const rows = variant.rows || { down: 0, left: 1, right: 2, up: 3 };
    const selectedRow = Number(rows[dir]);
    const row = Number.isFinite(selectedRow) ? Math.max(0, Math.min(rowCount - 1, selectedRow)) : 0;

    ctx.save();
    ctx.translate(x, y + 2);
    ctx.drawImage(playerSprite, frame * fw, row * fh, fw, fh, -dw / 2, -dh * 0.6, dw, dh);
    drawVariantAccents(0, 0, variant);
    ctx.restore();
  } else {
    drawCircle(rx, ry, 18, isMe ? '#22d3ee' : '#a78bfa');
  }

  drawHpBar(rx, ry, Math.max(0, p.hp / p.maxHp));
  ctx.fillStyle = '#f8fafc';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, x, y - 42);
}
function drawEnemies(enemies, t) {
  const fw = 37;
  const fh = 45;
  const frames = Math.max(2, Math.floor((sprites.enemy.naturalWidth || (fw * 2)) / fw));

  for (const e of enemies) {
    const re = getEnemyRenderPos(e);
    if (!isVisibleWorld(re.x, re.y, 60)) continue;
    const x = re.x - camera.x;
    const y = re.y - camera.y;

    drawShadowAtScreen(x, y + 29, 14, 6, 0.3);

    if (sprites.enemy.complete && sprites.enemy.naturalWidth >= fw * 2) {
      const frame = Math.floor(t * 12) % frames;
      if (Math.abs(re.vx || 0) > 0.15) re.faceLeft = (re.vx || 0) < 0;
      const faceLeft = Boolean(re.faceLeft);

      ctx.save();
      ctx.translate(x, y + 2);
      if (faceLeft) ctx.scale(-1, 1);
      ctx.drawImage(sprites.enemy, frame * fw, 0, fw, fh, -21, -24, 42, 50);
      ctx.restore();
    } else {
      drawCircle(re.x, re.y, 18, '#ef4444');
    }

    if (game.enemyHpBarsEnabled) drawHpBar(re.x, re.y, Math.max(0, e.hp / e.maxHp));
  }
}

function drawBloodPuddles() {
  for (const p of visuals.bloodPuddles) {
    if (!isVisibleWorld(p.x, p.y, 34)) continue;
    const a = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(120, 10, 18, ${(a * 0.6).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(p.x - camera.x, p.y - camera.y, p.r, p.r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFx() {
  for (const g of visuals.gore) {
    if (!isVisibleWorld(g.x, g.y, 26)) continue;
    if (game.shadowsEnabled && g.z > 0) {
      drawShadowAtScreen(g.x - camera.x, g.y - camera.y + 4, g.s * 1.25, g.s * 0.6, 0.2);
    }

    const a = Math.max(0, g.life / g.ttl);
    ctx.fillStyle = `rgba(150, 12, 20, ${Math.min(1, a + 0.2).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(g.x - camera.x, g.y - camera.y - g.z, g.s, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of visuals.blood) {
    if (!isVisibleWorld(p.x, p.y, 20)) continue;
    const a = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(180,16,28,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const f of visuals.muzzle) {
    if (!isVisibleWorld(f.x, f.y, 20)) continue;
    const a = Math.max(0, f.life / f.ttl);
    ctx.save();
    ctx.translate(f.x - camera.x, f.y - camera.y);
    ctx.rotate(f.a);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.c;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(18, 0);
    ctx.lineTo(0, 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function render(ts) {
  const dt = Math.min(0.05, (ts - lastFrameTs) / 1000);
  lastFrameTs = ts;

  fpsFrameCount += 1;
  fpsAccumSec += dt;
  if (fpsAccumSec >= 0.25) {
    if (fpsMetaEl) fpsMetaEl.textContent = `FPS: ${Math.round(fpsFrameCount / fpsAccumSec)}`;
    updateNetMetaUi();
    fpsFrameCount = 0;
    fpsAccumSec = 0;
  }
  game.sampledNet = sampleBufferedState();
  updateFx(dt);
  updatePlayerInterpolation(dt);
  updateEnemyInterpolation(dt);
  updateBulletInterpolation(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!game.state) {
    const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
    const waitingElapsed = performance.now() - waitingForFirstStateSince;
    if (waitingForFirstState && !overlayOpen && waitingElapsed >= 250) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Waiting for state from server...', 24, 40);
    }
    requestAnimationFrame(render);
    return;
  }

  const me = game.state.players.find((p) => p.id === game.myId) || game.state.players[0];
  if (me) {
    const m = getPlayerRenderPos(me);
    camera.x = Math.max(0, Math.min(m.x - canvas.width / 2, game.world.width - canvas.width));
    camera.y = Math.max(0, Math.min(m.y - canvas.height / 2, game.world.height - canvas.height));
  }

  drawGround();
  drawBloodPuddles();

  for (const d of game.state.drops || []) {
    if (!isVisibleWorld(d.x, d.y, 50)) continue;
    const x = d.x - camera.x;
    const y = d.y - camera.y;
    const glow = d.weaponKey === 'sniper' ? '#e5e7eb' : (d.weaponKey === 'shotgun' ? '#f97316' : (d.weaponKey === 'smg' ? '#38bdf8' : '#22c55e'));

    drawShadowAtScreen(x, y + 10, 9, 4, 0.24);

    ctx.fillStyle = 'rgba(8,12,18,0.78)';
    ctx.fillRect(x - 26, y - 28, 52, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 26, y - 28, 52, 12);

    drawWeaponIcon(x - 17, y - 22, d.weaponKey);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(d.weaponLabel || 'Weapon', x - 10, y - 18);

    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x - 10, y);
    ctx.closePath();
    ctx.fillStyle = glow;
    ctx.fill();
  }

  for (const b of game.state.bullets) {
    const rb = getBulletRenderPos(b);
    if (!isVisibleWorld(rb.x, rb.y, 12)) continue;
    drawShadowAtScreen(rb.x - camera.x, rb.y - camera.y + 3, 3, 1.8, 0.18);
    drawCircle(rb.x, rb.y, 3, rb.color || b.color || '#f59e0b');
  }

  drawEnemies(game.state.enemies, ts / 1000);

  for (const p of game.state.players) {
    const rp = getPlayerRenderPos(p);
    drawPlayer(p, ts / 1000, p.id === game.myId, rp.x, rp.y);
  }

  drawTrees();
  drawFx();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-camera.x, -camera.y, game.world.width, game.world.height);

  requestAnimationFrame(render);
}

startInputSender();
setInterval(sendNetPing, NET_PING_INTERVAL_MS);
setInterval(sendNetStatsReport, 1500);
requestAnimationFrame(render);
