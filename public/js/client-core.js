const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function cwFormatDurationSec(value, options = {}) {
  const totalSec = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (options && options.clock) return `${hh}:${mm}:${ss}`;
  return `${hours}ч ${mm}м ${ss}с`;
}

globalThis.cwFormatDurationSec = cwFormatDurationSec;

const statusEl = document.getElementById('status');
const instanceMetaEl = document.getElementById('instance-meta');
const roomMetaEl = document.getElementById('room-meta');
const weaponMetaEl = document.getElementById('weapon-meta');
const movementMetaEl = document.getElementById('movement-meta');
const netMetaEl = document.getElementById('net-meta');
const showFpsToggleEl = document.getElementById('show-fps-toggle');
const showChatToggleEl = document.getElementById('show-chat-toggle');
const gameSfxToggleEl = document.getElementById('game-sfx-toggle');
const gameSfxVolumeEl = document.getElementById('game-sfx-volume');
const gameSfxVolumeValueEl = document.getElementById('game-sfx-volume-value');
const showCompanionNamesToggleEl = document.getElementById('show-companion-names-toggle');
const showCompanionReserveToggleEl = document.getElementById('show-companion-reserve-toggle');
const showCommentatorToggleEl = document.getElementById('show-commentator-toggle');
const commentatorVoiceSettingToggleEl = document.getElementById('commentator-voice-setting-toggle');
const replayPlayerToggleEl = document.getElementById('replay-player-toggle');
const replayPlayerToggleWrapEl = document.getElementById('replay-player-toggle-wrap');
const fpsCornerEl = document.getElementById('fps-corner');
const chatWrapEl = document.getElementById('chat-wrap');
const chatMessagesEl = document.getElementById('chat-messages');
const chatFormEl = document.getElementById('chat-form');
const chatInputEl = document.getElementById('chat-input');
const showMinimapToggleEl = document.getElementById('show-minimap-toggle');
const showAimStickToggleEl = document.getElementById('show-aim-stick-toggle');
const dynamicSticksToggleEl = document.getElementById('dynamic-sticks-toggle');
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
const battleHubPlayerCardEl = document.getElementById('battle-hub-player-card');
const battleHubPlayerAvatarEl = document.getElementById('battle-hub-player-avatar');
const battleHubPlayerNameEl = document.getElementById('battle-hub-player-name');
const battleHubPlayerAccountLevelEl = document.getElementById('battle-hub-player-account-level');
const battleHubPlayerStateEl = document.getElementById('battle-hub-player-state');
const battleHubPlayerLevelEl = document.getElementById('battle-hub-player-level');
const battleHubPlayerXpFillEl = document.getElementById('battle-hub-player-xp-fill');
const battleHubPlayerXpTextEl = document.getElementById('battle-hub-player-xp-text');
const battleHubPlayerSkillsEl = document.getElementById('battle-hub-player-skills');
const battleHubPlayerStoryEl = document.getElementById('battle-hub-player-story');
const battleHubPlayerHeroesEl = document.getElementById('battle-hub-player-heroes');
const battleHubPlayerRunsEl = document.getElementById('battle-hub-player-runs');
const battleHubPlayerShardsEl = document.getElementById('battle-hub-player-shards');
const battleHubPlayerSkillPointsEl = document.getElementById('battle-hub-player-skill-points');
const battleHubPlayerRatingValueEl = document.getElementById('battle-hub-player-rating-value');
const battleHubPlayerRatingDetailEl = document.getElementById('battle-hub-player-rating-detail');
const battleHubHeroSkillsEl = document.getElementById('battle-hub-hero-skills');
const battleHubHeroSkillsCountEl = document.getElementById('battle-hub-hero-skills-count');
const battleHubHeroSkillsListEl = document.getElementById('battle-hub-hero-skills-list');
const joinFeedbackEl = document.getElementById('join-feedback');
const playerLogoutBtn = document.getElementById('player-logout');
const providerGoogleBtn = document.getElementById('provider-google');
const providerVkBtn = document.getElementById('provider-vk');
const providerMailruBtn = document.getElementById('provider-mailru');
const playerRenamePanelEl = document.getElementById('player-rename-panel');
const playerRenameNicknameEl = document.getElementById('player-rename-nickname');
const playerRenameSaveBtn = document.getElementById('player-rename-save');
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
const playMenuPanelEl = document.getElementById('menu-panel-play');
const playSideColumnEl = document.querySelector('#menu-panel-play > .cw-column-side');
const playDeployCardEl = document.getElementById('play-deploy-card');
const playRoomsBrowserEl = document.getElementById('rooms-browser');
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
const recordReplayPanelEl = document.getElementById('record-replay-panel');
const recordReplayPlayBtn = document.getElementById('record-replay-play');
const recordReplayInGameBtn = document.getElementById('record-replay-ingame');
const recordReplayCopyLinkBtn = document.getElementById('record-replay-copy-link');
const recordReplaySpeedsEl = document.getElementById('record-replay-speeds');
const recordReplayControlsEl = document.getElementById('record-replay-controls');
const recordReplayStartBtn = document.getElementById('record-replay-start');
const recordReplayBackBtn = document.getElementById('record-replay-back');
const recordReplayToggleBtn = document.getElementById('record-replay-toggle');
const recordReplayForwardBtn = document.getElementById('record-replay-forward');
const recordReplayEndBtn = document.getElementById('record-replay-end');
const recordReplayProgressEl = document.getElementById('record-replay-progress');
const recordReplayMetaEl = document.getElementById('record-replay-meta');
const recordReplayCanvasEl = document.getElementById('record-replay-canvas');
const recordReplayStageLoadBtn = document.getElementById('record-replay-stage-load');
const replayGameControlsEl = document.getElementById('replay-game-controls');
const replayGameExitBtn = document.getElementById('replay-game-exit');
const replayGameMetaEl = document.getElementById('replay-game-meta');
const replayGameSpeedsEl = document.getElementById('replay-game-speeds');
const replayGameStartBtn = document.getElementById('replay-game-start');
const replayGameBackBtn = document.getElementById('replay-game-back');
const replayGameToggleBtn = document.getElementById('replay-game-toggle');
const replayGameForwardBtn = document.getElementById('replay-game-forward');
const replayGameEndBtn = document.getElementById('replay-game-end');
const replayGameProgressEl = document.getElementById('replay-game-progress');
const deathResultEl = document.getElementById('death-result');
const deathCinematicEl = document.getElementById('death-cinematic');
const deathContinueBtn = document.getElementById('death-continue');
const deathRewardsPanelEl = document.getElementById('death-rewards-panel');
const deathRewardsBodyEl = document.getElementById('death-rewards-body');
const deathRewardsMenuBtn = document.getElementById('death-rewards-menu');
const deploySummaryRunEl = document.getElementById('deploy-summary-run');
const deploySummaryTargetEl = document.getElementById('deploy-summary-target');
const deploySummaryModeEl = document.getElementById('deploy-summary-mode');
const syncSettingsEl = document.getElementById('sync-settings');
const syncPresetEl = document.getElementById('sync-preset');
const syncTickrateEl = document.getElementById('sync-tickrate');
const syncStateRateEl = document.getElementById('sync-state-rate');
const syncRenderDelayEl = document.getElementById('sync-render-delay');
const syncMaxExtrapolationEl = document.getElementById('sync-max-extrapolation');
const syncEntityInterpEl = document.getElementById('sync-entity-interp');
const syncBulletCorrectionEl = document.getElementById('sync-bullet-correction');
const syncInputRateEl = document.getElementById('sync-input-rate');
const gameModePanelEl = document.getElementById('game-mode-panel');
const gameModeOptionButtons = Array.from(document.querySelectorAll('[data-game-mode]'));
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
const objectiveMetaEl = document.getElementById('objective-meta');
const bossSpawnAlertEl = document.getElementById('boss-spawn-alert');
const commentatorPanelEl = document.getElementById('commentator-panel');
const commentatorPanelCloseBtn = document.getElementById('commentator-panel-close');
const commentatorTitleEl = document.getElementById('commentator-title');
const commentatorTextEl = document.getElementById('commentator-text');
const commentatorVoiceToggleEl = document.getElementById('commentator-voice-toggle');
const commentatorVoiceStatusEl = document.getElementById('commentator-voice-status');
const commentatorVoiceVolumeEl = document.getElementById('commentator-voice-volume');
const commentatorVoiceVolumeValueEl = document.getElementById('commentator-voice-volume-value');
const commentatorQueueRateEl = document.getElementById('commentator-queue-rate');
const commentatorQueueCurrentEl = document.getElementById('commentator-queue-current');
const commentatorQueueCountEl = document.getElementById('commentator-queue-count');
const commentatorQueueTotalEl = document.getElementById('commentator-queue-total');
const commentatorQueueListEl = document.getElementById('commentator-queue-list');
const replayLoadOverlayEl = document.getElementById('replay-load-overlay');
const replayLoadLabelEl = document.getElementById('replay-load-label');
const replayLoadFillEl = document.getElementById('replay-load-fill');
const replayLoadMetaEl = document.getElementById('replay-load-meta');
const runStartOverlayEl = document.getElementById('run-start-overlay');
const runStartLabelEl = document.getElementById('run-start-label');
const runStartFillEl = document.getElementById('run-start-fill');
const runStartMetaEl = document.getElementById('run-start-meta');
const runStartImpactImgEl = document.getElementById('run-start-impact-img');
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
const trCore = (key, fb = key, params = null) => {
  if (typeof window.cwI18nT !== 'function') return fb;
  const out = window.cwI18nT(key, params);
  return out === key ? fb : out;
};
const trHeroNameCore = (heroId, fallback = '') => {
  const id = String(heroId || '').trim().toLowerCase();
  if (!id) return String(fallback || '');
  return trCore(`hero.${id}.name`, String(fallback || id));
};
const trSkillNameCore = (skillId, fallback = '') => {
  const id = String(skillId || '').trim().toLowerCase();
  if (!id) return String(fallback || '');
  return trCore(`skill.${id}.name`, String(fallback || id));
};
const trItemNameCore = (itemId, fallback = '') => {
  const id = String(itemId || '').trim().toLowerCase();
  if (!id) return String(fallback || '');
  return trCore(`item.${id}.name`, String(fallback || id));
};

function getProgressionCatalogItem(itemId) {
  const id = String(itemId || '').trim();
  if (!id) return null;
  const items = Array.isArray(game.playerAuth?.progressionCatalog?.items) ? game.playerAuth.progressionCatalog.items : [];
  return items.find((item) => String(item?.id || '').trim() === id) || null;
}

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
const SPECTATOR_RENDER_DELAY_MIN_MS = 170;
const SPECTATOR_ENTITY_INTERP_RATE = 10;
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
  { id: 'cyber', name: 'Cyber', accent: '#8ec5ff', tint: '#9ec5ff', sprite: '/assets/sprites/player_cyber.png', frameW: 64, frameH: 64, rows: { down: 2, left: 1, right: 3, up: 0 }, scale: 0.88, fps: 10, idleFrame: 1 },
  { id: 'scout', name: 'Scout', accent: '#a7e7c5', tint: '#bdf0d4', sprite: '/assets/sprites/player_cyber.png', frameW: 64, frameH: 64, rows: { down: 2, left: 1, right: 3, up: 0 }, scale: 0.88, fps: 10, idleFrame: 1 },
  { id: 'shadow', name: 'Shadow', accent: '#d4c1ff', tint: '#dccbff', sprite: '/assets/sprites/player_cyber.png', frameW: 64, frameH: 64, rows: { down: 2, left: 1, right: 3, up: 0 }, scale: 0.88, fps: 10, idleFrame: 1 },
  { id: 'medic', name: 'Medic', accent: '#ffd1dc', tint: '#ffdbe4', sprite: '/assets/sprites/player_cyber.png', frameW: 64, frameH: 64, rows: { down: 2, left: 1, right: 3, up: 0 }, scale: 0.88, fps: 10, idleFrame: 1 },
  { id: 'raider', name: 'Raider', accent: '#ffe4b5', tint: '#ffe9c9', sprite: '/assets/sprites/player_cyber.png', frameW: 64, frameH: 64, rows: { down: 2, left: 1, right: 3, up: 0 }, scale: 0.88, fps: 10, idleFrame: 1 },
];


function getToggleDefaultOn(key) {
  const stored = localStorage.getItem(key);
  if (stored === null) {
    localStorage.setItem(key, '1');
    return true;
  }
  return stored !== '0';
}

function getToggleDefaultOff(key) {
  const stored = localStorage.getItem(key);
  if (stored === null) {
    localStorage.setItem(key, '0');
    return false;
  }
  return stored === '1';
}

function getStoredPercent(key, fallback = 70) {
  const stored = localStorage.getItem(key);
  if (stored === null) {
    localStorage.setItem(key, String(fallback));
    return fallback;
  }
  const value = Math.round(Number(stored));
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : fallback));
}

const game = {
  myId: null,
  spectating: false,
  embedMode: false,
  roomCode: null,
  connected: false,
  world: { width: 2400, height: 1400 },
  state: null,
  sortedTrees: [],
  sortedMapObjects: [],
  qualityKey: 'medium',
  shadowsEnabled: getToggleDefaultOn('cw:shadowsEnabled'),
  bulletTracersEnabled: getToggleDefaultOn('cw:bulletTracersEnabled'),
  enemyHpBarsEnabled: getToggleDefaultOn('cw:enemyHpBarsEnabled'),
  showCompanionNamesEnabled: getToggleDefaultOff('cw:showCompanionNamesEnabled'),
  showCompanionReserveAmmoEnabled: getToggleDefaultOn('cw:showCompanionReserveAmmoEnabled'),
  extraBloodEnabled: getToggleDefaultOn('cw:extraBloodEnabled'),
  hitEffectsEnabled: getToggleDefaultOn('cw:hitEffectsEnabled'),
  autoFireEnabled: getToggleDefaultOn('cw:autoFireEnabled'),
  connectionIndicatorEnabled: getToggleDefaultOn('cw:connectionIndicatorEnabled'),
  showFpsEnabled: getToggleDefaultOn('cw:showFpsEnabled'),
  showChatEnabled: getToggleDefaultOn('cw:showChatEnabled'),
  sfxEnabled: getToggleDefaultOn('cw:sfxEnabled'),
  sfxVolume: getStoredPercent('cw:sfxVolume', 70) / 100,
  showCommentatorEnabled: getToggleDefaultOn('cw:showCommentatorEnabled'),
  showReplayPlayerEnabled: getToggleDefaultOn('cw:showReplayPlayerEnabled'),
  showMinimapEnabled: getToggleDefaultOn('cw:showMinimapEnabled'),
  showAimStickEnabled: getToggleDefaultOn('cw:showAimStickEnabled'),
  dynamicSticksEnabled: getToggleDefaultOff('cw:dynamicSticksEnabled'),
  renderPlayers: new Map(),
  renderEnemies: new Map(),
  renderBullets: new Map(),
  renderXpOrbs: new Map(),
  netSnapshots: [],
  liveEntitySnapshots: [],
  sampledNet: null,
  nextInputSeq: 0,
  roomStartedAt: 0,
  runType: 'free',
  mapId: 'mall_night',
  campaignId: '',
  campaignLevelId: '',
  gameMode: 'normal',
  matchDurationSec: 0,
  matchEndsAt: 0,
  totalEnemyKills: 0,
  nextBossAtKills: 50,
  nextBossSpawnAt: 0,
  bossAlive: false,
  spectatorCount: 0,
  roomDifficulty: { level: 1, hpMul: 1, speedMul: 1, damageMul: 1, attackRateMul: 1, spawnIntervalMs: 760 },
  mission: null,
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
    needsNicknameSetup: false,
    nicknameStatus: null,
    progression: null,
    progressionCatalog: null,
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
  muzzleGroundFlashes: [],
  rocketSmoke: [],
  rocketFire: [],
  rocketBlast: [],
  hitFx: [],
  objectImpactFx: [],
  bossBlast: [],
  bloodMist: [],
  skillBursts: [],
  skillArcs: [],
  skillLinks: [],
  skillLabels: [],
  dodgeWind: [],
  forceShield: [],
  dodgeWindScheduled: [],
  skillCdPrev: new Map(),
  skillOfferPrev: new Map(),
  enemyPrev: new Map(),
  playerPrev: new Map(),
  rocketPrev: new Map(),
  rocketTrailLastAt: new Map(),
  bossPortalPrev: new Map(),
  dropPrev: new Map(),
  bulletIds: new Set(),
  spectatorMuzzleBulletIds: new Set(),
  xpOrbPrev: new Map(),
  mapObjectPrev: new Map(),
  objectImpactEventIds: new Map(),
  prevBossAlive: false,
  runStartFireworks: [],
  groundTileCanvas: null,
  groundTiles: {},
  groundTileSize: 0,
};

const gameAudio = {
  ctx: null,
  unlocked: false,
  master: null,
  lastPlayedAt: new Map(),
  assetCache: new Map(),
  assetBufferCache: new Map(),
  assetBufferPromises: new Map(),
  activeHtmlAudios: new Set(),
  activeVoicesByGroup: new Map(),
  missingAssets: new Set(),
  warmupStarted: false,
};

let joinMode = 'create';
const NICKNAME_STORAGE_KEY = 'cw:nickname';
const PLAYER_CLASS_STORAGE_KEY = 'cw:playerClass';
const GAME_MODE_STORAGE_KEY = 'cw:gameMode';
const PVP_DURATION_STORAGE_KEY = 'cw:pvpDurationMin';
const RUN_TYPE_STORAGE_KEY = 'cw:runType';
const MAP_ID_STORAGE_KEY = 'cw:mapId';
const CAMPAIGN_ID_STORAGE_KEY = 'cw:campaignId';
const CAMPAIGN_LEVEL_ID_STORAGE_KEY = 'cw:campaignLevelId';
const ACTIVE_RUN_RESUME_STORAGE_KEY = 'cw:activeRunResume';
const ACTIVE_RUN_RESUME_MAX_AGE_MS = 6 * 60 * 60 * 1000;
let selectedPlayerClass = 'cyber';
let selectedGameMode = normalizeGameMode(localStorage.getItem(GAME_MODE_STORAGE_KEY) || 'normal');
let selectedPvpDurationMin = normalizePvpDurationMin(localStorage.getItem(PVP_DURATION_STORAGE_KEY) || '10');
let selectedRunType = localStorage.getItem(RUN_TYPE_STORAGE_KEY) === 'campaign' ? 'campaign' : 'free';
let selectedMapId = String(localStorage.getItem(MAP_ID_STORAGE_KEY) || 'mall_night').trim() || 'mall_night';
let selectedCampaignId = String(localStorage.getItem(CAMPAIGN_ID_STORAGE_KEY) || 'mall_of_the_dead').trim() || 'mall_of_the_dead';
let selectedCampaignLevelId = String(localStorage.getItem(CAMPAIGN_LEVEL_ID_STORAGE_KEY) || '').trim();
let pendingIntegrationToken = '';
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
let lastScoreboardUpdateAt = 0;
let lastStatsPanelHtml = '';
let lastStatsPanelUpdateAt = 0;
let lastLevelupHtml = '';
let skillTooltipEl = null;
let skillTooltipChip = null;
let skillTooltipPinned = false;
let lastSkillBarHtml = '';
let devConsoleOpen = false;
let nicknameCheckTimer = null;
let restartReloadTimer = null;
let pendingAutoJoin = false;
let pendingAutoCreate = false;
let pendingAutoSpectate = false;
let pendingReplayRecordId = 0;
let pendingReplayStartSec = 0;
let pendingReplayApiPath = '';
let routedIntent = null;
let authPopupWindow = null;
let pendingStoredRunResume = false;
let storedRunResumeAutoAttempted = false;
const recordReplay = {
  recordId: 0,
  record: null,
  loading: false,
  loaded: false,
  playing: false,
  speed: 1,
  payload: null,
  startedAt: 0,
  elapsedMs: 0,
  rafId: 0,
  seeking: false,
};

function readStoredActiveRunResume() {
  const raw = localStorage.getItem(ACTIVE_RUN_RESUME_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const roomCode = String(parsed?.roomCode || '').trim().toUpperCase();
    const playerAccountId = Math.max(0, Number(parsed?.playerAccountId) || 0);
    const savedAt = Math.max(0, Number(parsed?.savedAt) || 0);
    if (!roomCode || !playerAccountId || !savedAt) return null;
    if (Date.now() - savedAt > ACTIVE_RUN_RESUME_MAX_AGE_MS) return null;
    return {
      roomCode,
      playerAccountId,
      savedAt,
    };
  } catch {
    return null;
  }
}

function setStoredActiveRunResume(roomCode, playerAccountId) {
  const normalizedRoomCode = String(roomCode || '').trim().toUpperCase();
  const normalizedPlayerAccountId = Math.max(0, Number(playerAccountId) || 0);
  if (!normalizedRoomCode || !normalizedPlayerAccountId) return;
  localStorage.setItem(ACTIVE_RUN_RESUME_STORAGE_KEY, JSON.stringify({
    roomCode: normalizedRoomCode,
    playerAccountId: normalizedPlayerAccountId,
    savedAt: Date.now(),
  }));
}

function clearStoredActiveRunResume() {
  pendingStoredRunResume = false;
  storedRunResumeAutoAttempted = false;
  localStorage.removeItem(ACTIVE_RUN_RESUME_STORAGE_KEY);
}

function getMapCatalog() {
  const maps = game.playerAuth?.progressionCatalog?.maps;
  return Array.isArray(maps) && maps.length > 0 ? maps : [{
    id: 'mall_night',
    name: 'Night Mall',
    subtitle: '',
    description: '',
    worldWidth: 4800,
    worldHeight: 2800,
    cover: null,
  }];
}

function getCampaignCatalog() {
  const campaigns = game.playerAuth?.progressionCatalog?.campaigns;
  return Array.isArray(campaigns) ? campaigns : [];
}

function getCampaignDefById(campaignId) {
  const targetId = String(campaignId || '').trim();
  return getCampaignCatalog().find((campaign) => String(campaign?.id || '') === targetId) || null;
}

function getCampaignLevelDefById(campaignId, levelId) {
  const campaign = getCampaignDefById(campaignId);
  if (!campaign) return null;
  const targetId = String(levelId || '').trim();
  const levels = Array.isArray(campaign.levels) ? campaign.levels : [];
  return levels.find((level) => String(level?.id || '') === targetId) || null;
}

function getFirstCampaignLevelId(campaignId) {
  const campaign = getCampaignDefById(campaignId);
  const levels = Array.isArray(campaign?.levels) ? campaign.levels : [];
  return String(levels[0]?.id || '').trim();
}

function syncRunTypeLayoutState() {
  if (!playMenuPanelEl) return;
  const storyRun = selectedRunType === 'campaign';
  playMenuPanelEl.classList.toggle('is-story-run', storyRun);
  playMenuPanelEl.classList.toggle('is-free-run', !storyRun);
}

function setSelectedRunType(runType) {
  selectedRunType = String(runType || '').trim().toLowerCase() === 'campaign' ? 'campaign' : 'free';
  if (selectedRunType === 'campaign' && selectedGameMode === 'pvp') {
    selectedGameMode = 'normal';
    localStorage.setItem(GAME_MODE_STORAGE_KEY, selectedGameMode);
    if (typeof globalThis.renderGameModeSelection === 'function') {
      globalThis.renderGameModeSelection();
    }
  }
  localStorage.setItem(RUN_TYPE_STORAGE_KEY, selectedRunType);
  syncRunTypeLayoutState();
  renderDeploySelectionSummary();
}

function setSelectedMapId(mapId) {
  const targetId = String(mapId || '').trim();
  const hasMap = getMapCatalog().some((entry) => String(entry?.id || '') === targetId);
  selectedMapId = hasMap ? targetId : String(getMapCatalog()[0]?.id || 'mall_night');
  localStorage.setItem(MAP_ID_STORAGE_KEY, selectedMapId);
  renderDeploySelectionSummary();
}

function setSelectedCampaign(campaignId, levelId = '') {
  const campaign = getCampaignDefById(campaignId) || getCampaignCatalog()[0] || null;
  selectedCampaignId = String(campaign?.id || 'mall_of_the_dead').trim();
  localStorage.setItem(CAMPAIGN_ID_STORAGE_KEY, selectedCampaignId);
  const level = getCampaignLevelDefById(selectedCampaignId, levelId) || getCampaignLevelDefById(selectedCampaignId, selectedCampaignLevelId) || null;
  selectedCampaignLevelId = String(level?.id || getFirstCampaignLevelId(selectedCampaignId) || '').trim();
  localStorage.setItem(CAMPAIGN_LEVEL_ID_STORAGE_KEY, selectedCampaignLevelId);
  renderDeploySelectionSummary();
}

function ensureSelectedRunSetupValid() {
  setSelectedMapId(selectedMapId);
  const campaigns = getCampaignCatalog();
  if (campaigns.length > 0) {
    setSelectedCampaign(selectedCampaignId, selectedCampaignLevelId);
  } else {
    selectedCampaignId = '';
    selectedCampaignLevelId = '';
    localStorage.removeItem(CAMPAIGN_ID_STORAGE_KEY);
    localStorage.removeItem(CAMPAIGN_LEVEL_ID_STORAGE_KEY);
  }
  if (selectedRunType === 'campaign' && campaigns.length <= 0) {
    setSelectedRunType('free');
  }
  renderDeploySelectionSummary();
}

function getSelectedMapDef() {
  return getMapCatalog().find((entry) => String(entry?.id || '') === selectedMapId) || getMapCatalog()[0] || null;
}

function getSelectedCampaignBundleForSummary() {
  const campaign = getCampaignDefById(selectedCampaignId) || getCampaignCatalog()[0] || null;
  const level = campaign
    ? getCampaignLevelDefById(campaign.id, selectedCampaignLevelId) || getCampaignLevelDefById(campaign.id, getFirstCampaignLevelId(campaign.id))
    : null;
  return { campaign, level };
}

function getDeployGameModeLabel() {
  if (selectedGameMode === 'hardcore') return 'Hardcore';
  if (selectedGameMode === 'pvp') return `PvP${selectedPvpDurationMin ? ` ${normalizePvpDurationMin(selectedPvpDurationMin)} min` : ''}`;
  return 'Normal';
}

function renderDeploySelectionSummary() {
  if (!deploySummaryRunEl || !deploySummaryTargetEl || !deploySummaryModeEl) return;
  if (selectedRunType === 'campaign') {
    const { campaign, level } = getSelectedCampaignBundleForSummary();
    deploySummaryRunEl.textContent = 'Story';
    deploySummaryTargetEl.textContent = `${campaign?.shortName || campaign?.name || 'Campaign'}${level ? ` / ${level.title || level.id}` : ''}`;
  } else {
    const map = getSelectedMapDef();
    deploySummaryRunEl.textContent = 'Free run';
    deploySummaryTargetEl.textContent = map?.name || selectedMapId || 'Map';
  }
  deploySummaryModeEl.textContent = getDeployGameModeLabel();
}

function queueStoredActiveRunResume() {
  const playerAccountId = Math.max(0, Number(game.playerAuth?.player?.id) || 0);
  if (!playerAccountId || storedRunResumeAutoAttempted) return false;
  if (game.myId || game.spectating || pendingAutoJoin || pendingAutoCreate || pendingAutoSpectate) return false;
  if (pendingReplayRecordId > 0 || pendingReplayApiPath) return false;
  const stored = readStoredActiveRunResume();
  if (!stored) {
    clearStoredActiveRunResume();
    return false;
  }
  if (stored.playerAccountId !== playerAccountId) {
    clearStoredActiveRunResume();
    return false;
  }
  storedRunResumeAutoAttempted = true;
  pendingStoredRunResume = true;
  joinMode = 'join';
  pendingAutoCreate = false;
  pendingAutoSpectate = false;
  pendingAutoJoin = true;
  if (roomCodeInput) roomCodeInput.value = stored.roomCode;
  if (typeof window.cwStartPendingRoomIntent === 'function' && game.connected) {
    window.cwStartPendingRoomIntent();
  }
  return true;
}
const replayGame = {
  active: false,
  recordId: 0,
  payload: null,
  speed: 1,
  playing: true,
  startedAt: 0,
  elapsedMs: 0,
  fxFrameIndex: -1,
  seeking: false,
  chatShownCount: -1,
  chatPayloadRef: null,
};
const RUN_START_LOADING_IMAGE = '/assets/backgrounds/screen-loading.jpg';
const RUN_START_IMPACT_IMAGES = ['/assets/backgrounds/start-1.png', '/assets/backgrounds/start-2.png'];
const RUN_START_MIN_LOADING_MS = 650;
const RUN_START_ZOOM_INTRO_DURATION_MS = 2850;
const RUN_START_SPIN_INTRO_DURATION_MS = 4300;
const runStartSequence = {
  token: 0,
  active: false,
  loading: false,
  firstStateReady: false,
  resourcesReady: false,
  resourceLoaded: 0,
  resourceTotal: 0,
  progress: 0,
  startedAt: 0,
  introActive: false,
  introStartedAt: 0,
  cameraMode: 'zoom',
  impactSrc: RUN_START_IMPACT_IMAGES[0],
  impactTimer: 0,
  finishTimer: 0,
  progressTimer: 0,
  minLoadingTimer: 0,
};
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
window.cwGame = game;

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

function isSpectatorSmoothingView() {
  return Boolean(game?.spectating);
}

function getObservedStateIntervalMs() {
  const samples = Array.isArray(netStats?.stateIntervals) ? netStats.stateIntervals.filter((value) => Number.isFinite(value) && value > 0) : [];
  if (samples.length > 0) {
    const sorted = [...samples].sort((a, b) => a - b);
    const p75Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75));
    return Math.max(1, Number(sorted[p75Index]) || 0);
  }
  const fallbackHz = Math.max(1, Number(netStats?.stateHz) || Number(roomSync.stateSendHz) || ROOM_SYNC_PRESETS.normal.stateSendHz);
  return 1000 / fallbackHz;
}

function getEffectiveNetRenderDelayMs() {
  const base = Math.max(0, Number(roomSync.netRenderDelayMs) || ROOM_SYNC_PRESETS.normal.netRenderDelayMs);
  const observedIntervalMs = getObservedStateIntervalMs();
  const jitterPadMs = Math.min(42, Math.max(0, Number(netStats?.jitterMs) || 0) * 1.35);
  const adaptiveDelayMs = Math.min(250, observedIntervalMs * 1.08 + jitterPadMs);
  const desiredDelayMs = Math.max(base, adaptiveDelayMs);
  return isSpectatorSmoothingView() ? Math.max(desiredDelayMs, SPECTATOR_RENDER_DELAY_MIN_MS) : desiredDelayMs;
}

function getEffectiveEntityInterpRate() {
  const base = Math.max(1, Number(roomSync.entityInterpRate) || ROOM_SYNC_PRESETS.normal.entityInterpRate);
  return isSpectatorSmoothingView() ? Math.min(base, SPECTATOR_ENTITY_INTERP_RATE) : base;
}

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

function connectGameSocket(origin = currentWorkerOrigin, options = {}) {
  const nextOrigin = normalizeOrigin(origin);
  const forceReconnect = Boolean(options?.forceReconnect);
  if (!forceReconnect && ws instanceof WebSocket && currentWorkerOrigin === nextOrigin && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
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

function normalizeGameMode(raw) {
  const mode = String(raw || '').trim().toLowerCase();
  if (mode === 'hardcore' || mode === 'pvp') return mode;
  return 'normal';
}

function normalizePvpDurationMin(raw) {
  const value = Math.floor(Number(raw) || 0);
  if (value === 3 || value === 5 || value === 10 || value === 15) return value;
  return 10;
}

function applyInitialRoomIntent() {
  const params = new URLSearchParams(window.location.search);
  const replay = Math.max(0, Number(params.get('replay')) || 0);
  const replayAt = Math.max(0, Number(params.get('replayAt')) || Number(params.get('t')) || 0);
  const replayPathRaw = String(params.get('replayPath') || params.get('replayApiPath') || '').trim();
  const replayPath = replayPathRaw.startsWith('/api/') ? replayPathRaw : '';
  const room = (params.get('room') || '').trim().toUpperCase();
  const mode = (params.get('mode') || '').trim().toLowerCase();
  const spectate = mode === 'spectate' || mode === 'watch' || mode === 'observer';
  const embed = params.get('embed') === '1' || params.get('view') === 'embed';
  const hubEmbed = !embed && !spectate && params.get('hub') !== '0' && params.get('view') !== 'game';
  const integrationToken = String(params.get('integrationToken') || params.get('integration_token') || '').trim();
  const presetName = String(params.get('name') || '').trim();
  const presetHeroId = String(params.get('heroId') || params.get('hero_id') || '').trim().toLowerCase();
  const gameMode = normalizeGameMode(params.get('gameMode') || params.get('game_mode') || selectedGameMode);
  const pvpDurationMin = normalizePvpDurationMin(params.get('pvpDurationMin') || params.get('pvp_duration_min') || selectedPvpDurationMin);
  const runType = String(params.get('runType') || params.get('run_type') || selectedRunType).trim().toLowerCase() === 'campaign' ? 'campaign' : 'free';
  const mapId = String(params.get('mapId') || params.get('map_id') || selectedMapId).trim();
  const campaignId = String(params.get('campaignId') || params.get('campaign_id') || selectedCampaignId).trim();
  const campaignLevelId = String(params.get('campaignLevelId') || params.get('campaign_level_id') || selectedCampaignLevelId).trim();
  const routed = params.get('routed') === '1';
  pendingReplayRecordId = replay;
  pendingReplayStartSec = replayAt;
  pendingReplayApiPath = replayPath;
  if (roomCodeInput && room) roomCodeInput.value = room.slice(0, 10);
  if (spectate) {
    joinMode = 'join';
  } else if (mode === 'join' || (room && !mode)) {
    joinMode = 'join';
  } else if (mode === 'create') {
    joinMode = 'create';
  }
  pendingAutoJoin = Boolean(room && joinMode === 'join' && !spectate);
  pendingAutoSpectate = Boolean(room && spectate);
  pendingAutoCreate = Boolean(!room && joinMode === 'create' && routed);
  game.embedMode = embed;
  document.documentElement.classList.toggle('battle-hub-embed', hubEmbed);
  document.body.classList.toggle('live-embed', game.embedMode);
  document.body.classList.toggle('battle-hub-embed', hubEmbed);
  pendingIntegrationToken = integrationToken;
  selectedGameMode = gameMode;
  selectedPvpDurationMin = pvpDurationMin;
  setSelectedRunType(runType);
  selectedMapId = mapId || selectedMapId;
  selectedCampaignId = campaignId || selectedCampaignId;
  selectedCampaignLevelId = campaignLevelId || selectedCampaignLevelId;
  if (presetName && nameInput && !game.playerAuth?.player) {
    nameInput.value = presetName.slice(0, 18);
  }
  if (presetHeroId) {
    const knownHeroId = PLAYER_VARIANTS.some((variant) => variant.id === presetHeroId) ? presetHeroId : 'cyber';
    selectedPlayerClass = knownHeroId;
    localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
  }
  localStorage.setItem(GAME_MODE_STORAGE_KEY, selectedGameMode);
  localStorage.setItem(PVP_DURATION_STORAGE_KEY, String(selectedPvpDurationMin));
  ensureSelectedRunSetupValid();

  if (pendingReplayRecordId > 0 || pendingReplayApiPath) {
    pendingAutoJoin = false;
    pendingAutoSpectate = false;
    pendingAutoCreate = false;
  }
  routedIntent = routed ? { mode: joinMode, room } : null;
}

async function resolveRoomRoute(mode, roomCode = '', options = {}) {
  const params = new URLSearchParams({
    mode: mode === 'create' ? 'create' : 'join',
  });
  const normalizedCode = String(roomCode || '').trim().toUpperCase();
  const requestedGameMode = normalizeGameMode(options?.gameMode || selectedGameMode);
  const requestedPvpDurationMin = normalizePvpDurationMin(options?.pvpDurationMin || selectedPvpDurationMin);
  if (normalizedCode) params.set('roomCode', normalizedCode);
  if ((mode === 'create') && requestedGameMode !== 'normal') params.set('gameMode', requestedGameMode);
  if ((mode === 'create') && requestedGameMode === 'pvp') params.set('pvpDurationMin', String(requestedPvpDurationMin));
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
  if (providerGoogleBtn) providerGoogleBtn.disabled = game.playerAuth.busy;
  if (providerVkBtn) providerVkBtn.disabled = game.playerAuth.busy;
  if (providerMailruBtn) providerMailruBtn.disabled = game.playerAuth.busy;
  if (playerRenameSaveBtn) playerRenameSaveBtn.disabled = game.playerAuth.busy;
}

function setAuthTab(mode) {
  game.playerAuth.mode = mode === 'login' || mode === 'register' ? mode : 'guest';
  for (const button of authTabButtons) {
    const isActive = button.dataset.authTab === game.playerAuth.mode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
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

function getBattleHubPlayerHeroId(progression = null) {
  const pendingHero = String(battleHubPlayerCardEl?.dataset?.nextHero || '').trim().toLowerCase();
  const activeHero = String(progression?.activeHero || '').trim().toLowerCase();
  const storedHero = String(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || '').trim().toLowerCase();
  const candidate = pendingHero || activeHero || storedHero || selectedPlayerClass || 'cyber';
  return PLAYER_VARIANTS.some((variant) => variant.id === candidate) ? candidate : 'cyber';
}

function getBattleHubHeroAvatarPath(heroId) {
  const id = String(heroId || '').trim().toLowerCase();
  if (id === 'medic') return '/assets/characters/medis.png';
  if (!PLAYER_VARIANTS.some((variant) => variant.id === id)) return '/assets/characters/cyber.png';
  return `/assets/characters/${id}.png`;
}

function getBattleHubHeroAccent(heroId) {
  return PLAYER_VARIANTS.find((variant) => variant.id === heroId)?.accent || '#39c1d9';
}

const BATTLE_HUB_HERO_SWAP_COVER_MS = 180;
const BATTLE_HUB_HERO_SWAP_REVEAL_MS = 1450;
const BATTLE_HUB_SKILL_MODAL_CLOSE_MS = 360;
const BATTLE_HUB_SKILL_MODAL_PURCHASE_CLOSE_MS = 520;
let battleHubHeroSwapTimer = 0;
let battleHubHeroSwapToken = 0;
let battleHubHeroSkillModalEl = null;
let battleHubHeroSkillModalState = null;
let battleHubHeroSkillFx = null;

function shouldReduceBattleHubFx() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function waitBattleHubFx(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

function clearBattleHubHeroSwapTimer() {
  if (!battleHubHeroSwapTimer) return;
  globalThis.clearTimeout(battleHubHeroSwapTimer);
  battleHubHeroSwapTimer = 0;
}

async function beginBattleHubPlayerSwapFx(nextHeroId = '') {
  if (!battleHubPlayerCardEl || shouldReduceBattleHubFx()) return false;
  const token = ++battleHubHeroSwapToken;
  const nextHero = String(nextHeroId || '').trim().toLowerCase();
  clearBattleHubHeroSwapTimer();
  battleHubPlayerCardEl.dataset.nextHero = nextHero;
  battleHubPlayerCardEl.style.setProperty('--avatar-accent', getBattleHubHeroAccent(nextHero));
  battleHubPlayerCardEl.classList.remove('is-hero-swap-covering', 'is-hero-swap-revealing');
  void battleHubPlayerCardEl.offsetWidth;
  battleHubPlayerCardEl.classList.add('is-hero-swap-covering');
  await waitBattleHubFx(BATTLE_HUB_HERO_SWAP_COVER_MS);
  return token === battleHubHeroSwapToken;
}

function endBattleHubPlayerSwapFx() {
  if (!battleHubPlayerCardEl || shouldReduceBattleHubFx()) return;
  const token = battleHubHeroSwapToken;
  clearBattleHubHeroSwapTimer();
  battleHubPlayerCardEl.classList.remove('is-hero-swap-covering');
  void battleHubPlayerCardEl.offsetWidth;
  battleHubPlayerCardEl.classList.add('is-hero-swap-revealing');
  battleHubHeroSwapTimer = globalThis.setTimeout(() => {
    if (token !== battleHubHeroSwapToken) return;
    battleHubPlayerCardEl.classList.remove('is-hero-swap-revealing');
    delete battleHubPlayerCardEl.dataset.nextHero;
    battleHubHeroSwapTimer = 0;
  }, BATTLE_HUB_HERO_SWAP_REVEAL_MS);
}

function cancelBattleHubPlayerSwapFx() {
  if (!battleHubPlayerCardEl) return;
  ++battleHubHeroSwapToken;
  clearBattleHubHeroSwapTimer();
  battleHubPlayerCardEl.classList.remove('is-hero-swap-covering', 'is-hero-swap-revealing');
  delete battleHubPlayerCardEl.dataset.nextHero;
}

function getBattleHubPlayerName() {
  return String(
    game.playerAuth?.player?.nickname
      || game.playerAuth?.nicknameStatus?.nickname
      || nameInput?.value
      || localStorage.getItem(NICKNAME_STORAGE_KEY)
      || 'Fighter'
  ).trim().slice(0, 18) || 'Fighter';
}

function getBattleHubSkillProgress(progression = null, catalog = null) {
  const skillLevels = progression?.heroSkillLevels && typeof progression.heroSkillLevels === 'object'
    ? progression.heroSkillLevels
    : {};
  let unlocked = 0;
  let totalLevel = 0;
  for (const heroSkills of Object.values(skillLevels)) {
    if (!heroSkills || typeof heroSkills !== 'object') continue;
    for (const value of Object.values(heroSkills)) {
      const level = Math.max(0, Number(value) || 0);
      if (level <= 0) continue;
      unlocked += 1;
      totalLevel += level;
    }
  }
  const heroes = Array.isArray(catalog?.heroes) ? catalog.heroes : [];
  const total = heroes.reduce((sum, hero) => sum + (Array.isArray(hero?.uniqueSkills) ? hero.uniqueSkills.length : 0), 0);
  return { unlocked, total, totalLevel };
}

function getBattleHubStoryProgress(progression = null) {
  const campaigns = getCampaignCatalog();
  const campaignProgress = progression?.campaignProgress && typeof progression.campaignProgress === 'object'
    ? progression.campaignProgress
    : {};
  let completed = 0;
  let total = 0;
  let bestScore = 0;
  let victories = 0;
  for (const campaign of campaigns) {
    const levels = Array.isArray(campaign?.levels) ? campaign.levels : [];
    total += levels.length;
    const progress = campaignProgress[String(campaign?.id || '').trim()] || {};
    bestScore = Math.max(bestScore, Math.max(0, Number(progress?.bestScore) || 0));
    victories += Math.max(0, Number(progress?.victories) || 0);
    const levelProgress = progress?.levels && typeof progress.levels === 'object' ? progress.levels : {};
    for (const level of levels) {
      const state = levelProgress[String(level?.id || '').trim()] || {};
      if ((Math.max(0, Number(state?.completedAt) || 0) > 0) || (Math.max(0, Number(state?.victories) || 0) > 0)) {
        completed += 1;
      }
    }
  }
  return { completed, total, bestScore, victories };
}

function getBattleHubHeroCatalogEntry(heroId, catalog = null) {
  const id = String(heroId || '').trim().toLowerCase();
  const variant = PLAYER_VARIANTS.find((item) => item.id === id) || PLAYER_VARIANTS[0] || {};
  const heroes = Array.isArray(catalog?.heroes) ? catalog.heroes : [];
  const hero = heroes.find((item) => String(item?.id || '').trim().toLowerCase() === id);
  return hero ? { ...variant, ...hero } : { ...variant, uniqueSkills: [] };
}

function getBattleHubHeroSkillLevel(progression = null, heroId = '', skillId = '') {
  const heroSkills = progression?.heroSkillLevels && typeof progression.heroSkillLevels === 'object'
    ? progression.heroSkillLevels[String(heroId || '').trim().toLowerCase()]
    : null;
  if (!heroSkills || typeof heroSkills !== 'object') return 0;
  return Math.max(0, Number(heroSkills[String(skillId || '').trim()]) || 0);
}

function getBattleHubHeroSkillType(skill) {
  if (skill?.kind === 'active') return 'Active';
  if (skill?.globalAura) return 'Aura';
  return 'Passive';
}

function getBattleHubHeroSkillTypeLabel(skill) {
  if (skill?.kind === 'active') return trCore('ui.hero.skill_type_active', 'Active');
  if (skill?.globalAura) return trCore('ui.hero.skill_type_aura', 'Aura');
  return trCore('ui.hero.skill_type_passive', 'Passive');
}

const BATTLE_HUB_SKILL_STAT_LABEL_KEYS = {
  damage: 'ui.skill_stat.damage',
  radius: 'ui.skill_stat.radius',
  targets: 'ui.skill_stat.targets',
  knockback: 'ui.skill_stat.knockback',
  stun: 'ui.skill_stat.stun',
  cooldown: 'ui.skill_stat.cooldown',
  'missile speed': 'ui.skill_stat.missile_speed',
  'explosion radius': 'ui.skill_stat.explosion_radius',
  'fire rate': 'ui.skill_stat.fire_rate',
  'reload speed': 'ui.skill_stat.reload_speed',
  'move speed': 'ui.skill_stat.move_speed',
  'max hp': 'ui.skill_stat.max_hp',
  'pickup radius': 'ui.skill_stat.pickup_radius',
  'hp regen': 'ui.skill_stat.hp_regen',
  'jump charges': 'ui.skill_stat.jump_charges',
  'bullet pierce': 'ui.skill_stat.bullet_pierce',
  'bullet damage': 'ui.skill_stat.bullet_damage',
  'other heroes damage': 'ui.skill_stat.other_heroes_damage',
  'other heroes fire rate': 'ui.skill_stat.other_heroes_fire_rate',
  'other heroes speed': 'ui.skill_stat.other_heroes_speed',
  'other heroes hp': 'ui.skill_stat.other_heroes_hp',
  'other heroes pickup': 'ui.skill_stat.other_heroes_pickup',
  'other heroes regen': 'ui.skill_stat.other_heroes_regen',
};

function localizeBattleHubSkillStatLine(line) {
  const raw = String(line || '').trim();
  const match = raw.match(/^([^:]+):\s*(.*)$/);
  if (!match) return raw;
  const label = match[1].trim();
  const value = match[2].trim().replace(/\bready\b/gi, trCore('ui.skill.ready', 'ready'));
  const key = BATTLE_HUB_SKILL_STAT_LABEL_KEYS[label.toLowerCase()];
  return `${key ? trCore(key, label) : label}: ${value}`;
}

function formatBattleHubShardAmount(count) {
  const value = Math.max(0, Math.floor(Number(count) || 0));
  const lang = typeof window.cwI18nGetLanguage === 'function'
    ? String(window.cwI18nGetLanguage() || '').toLowerCase()
    : '';
  if (lang === 'ru') {
    const mod10 = value % 10;
    const mod100 = value % 100;
    const key = mod10 === 1 && mod100 !== 11
      ? 'ui.skill_modal.shard_one'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'ui.skill_modal.shard_few'
        : 'ui.skill_modal.shard_many';
    return `${value} ${trCore(key, 'осколков')}`;
  }
  const shardKey = value === 1 ? 'ui.skill_modal.shard_one' : 'ui.skill_modal.shard_other';
  return `${value} ${trCore(shardKey, value === 1 ? 'shard' : 'shards')}`;
}

function getBattleHubHeroSkillStats(skill, level) {
  const lvl = Math.max(1, Number(level) || 1);
  const displaySkill = { ...skill, level: lvl, cooldownMs: 0 };
  const lines = buildSkillCurrentStatLines(displaySkill, skill)
    .filter((line) => !String(line || '').startsWith('Current CD'));
  if (lines.length > 0) return lines.slice(0, 2).map(localizeBattleHubSkillStatLine);
  const desc = String(skill?.desc || '').trim();
  return desc ? [desc] : [getBattleHubHeroSkillTypeLabel(skill)];
}

function getBattleHubHeroSkillCost(skill, level) {
  const currentLevel = Math.max(0, Number(level) || 0);
  const maxLevel = Math.max(1, Number(skill?.maxLevel) || 1);
  if (currentLevel >= maxLevel) return { action: 'maxed', cost: 0, nextLevel: maxLevel, maxLevel };
  if (currentLevel <= 0) {
    return {
      action: 'unlock',
      cost: Math.max(1, Number(skill?.unlockCostShards) || 1),
      nextLevel: 1,
      maxLevel,
    };
  }
  return {
    action: 'upgrade',
    cost: Math.max(1, (Number(skill?.upgradeCostShardsBase) || 1) + (Number(skill?.upgradeCostShardsStep) || 0) * Math.max(0, currentLevel - 1)),
    nextLevel: currentLevel + 1,
    maxLevel,
  };
}

function getBattleHubSkillActionApi(action) {
  if (action === 'unlock') {
    return globalThis.CWCharacters?.unlockHeroSkillForAccount || globalThis.unlockHeroSkillForAccount || null;
  }
  if (action === 'upgrade') {
    return globalThis.CWCharacters?.upgradeHeroSkillForAccount || globalThis.upgradeHeroSkillForAccount || null;
  }
  return null;
}

function buildBattleHubSkillStatRows(skill, level) {
  const rows = buildSkillCurrentStatLines({ ...skill, level: Math.max(1, Number(level) || 1), cooldownMs: 0 }, skill)
    .filter((line) => !String(line || '').startsWith('Current CD'));
  if (rows.length > 0) return rows.map(localizeBattleHubSkillStatLine);
  const desc = String(skill?.desc || '').trim();
  return desc ? [desc] : [getBattleHubHeroSkillTypeLabel(skill)];
}

function ensureBattleHubHeroSkillModalElement() {
  if (battleHubHeroSkillModalEl) return battleHubHeroSkillModalEl;
  const el = document.createElement('div');
  el.className = 'battle-hub-skill-modal hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = '<div class="battle-hub-skill-modal-backdrop" data-skill-modal-close="1"></div>'
    + '<div class="battle-hub-skill-modal-card" role="document">'
    + `<button class="battle-hub-skill-modal-close" type="button" data-skill-modal-close="1" aria-label="${escapeHtml(trCore('ui.skill_modal.close_aria', 'Close skill details'))}"></button>`
    + '<div class="battle-hub-skill-modal-content"></div>'
    + '</div>';
  el.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('[data-skill-modal-close]')) closeBattleHubHeroSkillModal();
  });
  document.body.appendChild(el);
  battleHubHeroSkillModalEl = el;
  return el;
}

function closeBattleHubHeroSkillModal(options = {}) {
  if (!battleHubHeroSkillModalEl) return;
  if (battleHubHeroSkillModalEl.classList.contains('hidden') || battleHubHeroSkillModalEl.classList.contains('is-closing')) return;
  const purchased = Boolean(options.purchased);
  battleHubHeroSkillModalEl.classList.toggle('is-purchased', purchased);
  battleHubHeroSkillModalEl.classList.remove('is-open');
  battleHubHeroSkillModalEl.classList.add('is-closing');
  globalThis.setTimeout(() => {
    if (!battleHubHeroSkillModalEl) return;
    battleHubHeroSkillModalEl.classList.add('hidden');
    battleHubHeroSkillModalEl.classList.remove('is-open', 'is-closing', 'is-purchased', 'is-busy');
    battleHubHeroSkillModalState = null;
  }, purchased ? BATTLE_HUB_SKILL_MODAL_PURCHASE_CLOSE_MS : BATTLE_HUB_SKILL_MODAL_CLOSE_MS);
}

function getBattleHubSkillModalData(heroId, skillId) {
  const progression = game.playerAuth?.progression || null;
  const catalog = game.playerAuth?.progressionCatalog || null;
  const hero = getBattleHubHeroCatalogEntry(heroId, catalog);
  const skills = Array.isArray(hero?.uniqueSkills) ? hero.uniqueSkills : [];
  const skill = skills.find((item) => String(item?.id || '').trim() === skillId) || null;
  if (!skill) return null;
  const level = getBattleHubHeroSkillLevel(progression, heroId, skillId);
  return { hero, skill, level, progression, loggedIn: Boolean(game.playerAuth?.player) };
}

function renderBattleHubHeroSkillModal() {
  if (!battleHubHeroSkillModalState) return;
  const data = getBattleHubSkillModalData(battleHubHeroSkillModalState.heroId, battleHubHeroSkillModalState.skillId);
  const modal = ensureBattleHubHeroSkillModalElement();
  const content = modal.querySelector('.battle-hub-skill-modal-content');
  if (!(content instanceof HTMLElement) || !data) {
    closeBattleHubHeroSkillModal();
    return;
  }

  const { hero, skill, level, progression, loggedIn } = data;
  const skillId = String(skill?.id || '').trim();
  const skillName = trSkillNameCore(skillId, skill?.name || skillId || 'Skill');
  const skillTypeLabel = getBattleHubHeroSkillTypeLabel(skill);
  const rarityRaw = String(skill?.rarity || 'common').trim().toLowerCase();
  const rarity = ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(rarityRaw) ? rarityRaw : 'common';
  const rarityLabel = trCore(`ui.inventory.rarity.${rarity}`, rarity);
  const color = rarityColor(rarity);
  modal.style.setProperty('--avatar-accent', getBattleHubHeroAccent(String(hero?.id || '').trim().toLowerCase()));
  modal.style.setProperty('--skill-color', color);
  const closeBtn = modal.querySelector('.battle-hub-skill-modal-close');
  closeBtn?.setAttribute?.('aria-label', trCore('ui.skill_modal.close_aria', 'Close skill details'));
  const icon = skillBadgeLabel(skill);
  const maxLevel = Math.max(1, Number(skill?.maxLevel) || 1);
  const currentLevel = Math.max(0, Number(level) || 0);
  const cost = getBattleHubHeroSkillCost(skill, currentLevel);
  const shards = Math.max(0, Number(progression?.shards) || 0);
  const canPay = loggedIn && cost.action !== 'maxed' && shards >= cost.cost && Boolean(getBattleHubSkillActionApi(cost.action));
  const currentRows = buildBattleHubSkillStatRows(skill, Math.max(1, currentLevel || 1));
  const nextRows = cost.action === 'upgrade' || cost.action === 'unlock'
    ? buildBattleHubSkillStatRows(skill, Math.max(1, cost.nextLevel))
    : [];
  const descFallback = String(skill?.desc || '').trim() || skillTypeLabel;
  const desc = trCore(`skill.${skillId.toLowerCase()}.desc`, descFallback);
  const currentHtml = currentRows.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
  const nextHtml = nextRows.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
  const actionLabel = cost.action === 'unlock'
    ? trCore('ui.skill_modal.unlock_for', 'Unlock for {cost}', { cost: formatBattleHubShardAmount(cost.cost) })
    : cost.action === 'upgrade'
      ? trCore('ui.skill_modal.upgrade_for', 'Upgrade for {cost}', { cost: formatBattleHubShardAmount(cost.cost) })
      : trCore('ui.skill_modal.max_level', 'Max level reached');
  const statusLabel = !loggedIn
    ? trCore('ui.profile.login_required', 'Login required.')
    : cost.action === 'maxed'
      ? trCore('ui.skill_modal.maxed', 'Maxed')
      : shards >= cost.cost
        ? trCore('ui.skill_modal.ready', 'Ready: {shards}', { shards: formatBattleHubShardAmount(shards) })
        : trCore('ui.skill_modal.need_more', 'Need {shards} more', { shards: formatBattleHubShardAmount(Math.max(0, cost.cost - shards)) });
  const levelText = currentLevel > 0
    ? `Lv ${currentLevel}/${maxLevel}`
    : `${trCore('ui.hero.locked', 'Locked')} / ${maxLevel}`;
  const nextTitle = currentLevel > 0
    ? trCore('ui.skill_modal.next_level', 'Next Lv {level}', { level: cost.nextLevel })
    : trCore('ui.skill_modal.unlock_preview', 'Unlock preview');
  const heroName = trHeroNameCore(hero?.id, hero?.name || hero?.id || 'Hero');

  content.innerHTML = '<div class="battle-hub-skill-modal-hero">'
    + renderBattleHubHeroSkillModalArt(skill, icon, rarity, color)
    + '<div class="battle-hub-skill-modal-head">'
    + `<span class="battle-hub-skill-modal-kicker">${escapeHtml(skillTypeLabel)} | ${escapeHtml(rarityLabel)}</span>`
    + `<strong>${escapeHtml(skillName)}</strong>`
    + `<small>${escapeHtml(heroName)} | ${escapeHtml(levelText)}</small>`
    + '</div>'
    + '</div>'
    + `<p class="battle-hub-skill-modal-desc">${escapeHtml(desc)}</p>`
    + '<div class="battle-hub-skill-modal-stats">'
    + `<section><b>${escapeHtml(trCore('ui.skill_modal.current', 'Current'))}</b><div>${currentHtml}</div></section>`
    + (nextHtml ? `<section><b>${escapeHtml(nextTitle)}</b><div>${nextHtml}</div></section>` : '')
    + '</div>'
    + '<div class="battle-hub-skill-modal-economy">'
    + `<span><b>${escapeHtml(trCore('ui.skill_modal.cost', 'Cost'))}</b><strong>${escapeHtml(cost.action === 'maxed' ? trCore('ui.skill_modal.done', 'Done') : formatBattleHubShardAmount(cost.cost))}</strong></span>`
    + `<span class="${shards > 0 ? 'has-value' : ''}"><b>${escapeHtml(trCore('ui.skill_modal.your_shards', 'Your shards'))}</b><strong>${shards}</strong></span>`
    + `<span><b>${escapeHtml(trCore('ui.skill_modal.after', 'After'))}</b><strong>${cost.action === 'maxed' ? shards : Math.max(0, shards - cost.cost)}</strong></span>`
    + '</div>'
    + `<div class="battle-hub-skill-modal-status ${canPay ? 'ok' : 'warn'}">${escapeHtml(statusLabel)}</div>`
    + `<button class="battle-hub-skill-modal-action" type="button" data-skill-modal-action="${escapeHtml(cost.action)}"${canPay ? '' : ' disabled'}>${escapeHtml(actionLabel)}</button>`;

  const actionBtn = content.querySelector('.battle-hub-skill-modal-action');
  actionBtn?.addEventListener('click', () => {
    void purchaseBattleHubHeroSkill();
  }, { once: true });
}

function openBattleHubHeroSkillModal(heroId, skillId) {
  const nextHeroId = String(heroId || '').trim().toLowerCase();
  const nextSkillId = String(skillId || '').trim();
  if (!nextHeroId || !nextSkillId) return;
  battleHubHeroSkillModalState = { heroId: nextHeroId, skillId: nextSkillId };
  const modal = ensureBattleHubHeroSkillModalElement();
  renderBattleHubHeroSkillModal();
  modal.classList.remove('hidden', 'is-closing', 'is-purchased', 'is-busy');
  void modal.offsetWidth;
  modal.classList.add('is-open');
}

async function purchaseBattleHubHeroSkill() {
  if (!battleHubHeroSkillModalState || !battleHubHeroSkillModalEl) return;
  const data = getBattleHubSkillModalData(battleHubHeroSkillModalState.heroId, battleHubHeroSkillModalState.skillId);
  if (!data) return;
  const cost = getBattleHubHeroSkillCost(data.skill, data.level);
  const actionApi = getBattleHubSkillActionApi(cost.action);
  if (!actionApi || cost.action === 'maxed') return;
  battleHubHeroSkillModalEl.classList.add('is-busy');
  try {
    await actionApi(data.hero.id, data.skill.id);
    battleHubHeroSkillFx = {
      heroId: String(data.hero.id || '').trim().toLowerCase(),
      skillId: String(data.skill.id || '').trim(),
      at: performance.now(),
    };
    renderBattleHubPlayerBadge();
    globalThis.CWCharacters?.render?.();
    globalThis.setTimeout(() => {
      const target = Array.from(battleHubHeroSkillsListEl?.querySelectorAll?.('.battle-hub-hero-skill') || [])
        .find((node) => node instanceof HTMLElement && String(node.dataset.battleHubSkillId || '') === String(data.skill.id || ''));
      target?.classList?.remove?.('is-skill-flash');
    }, 1400);
    closeBattleHubHeroSkillModal({ purchased: true });
  } catch (err) {
    const msg = String(err?.message || trCore('ui.skill_modal.purchase_failed', 'Purchase failed.')).trim();
    battleHubHeroSkillModalEl.classList.remove('is-busy');
    renderBattleHubHeroSkillModal();
    const status = battleHubHeroSkillModalEl.querySelector('.battle-hub-skill-modal-status');
    if (status instanceof HTMLElement) {
      status.textContent = msg;
      status.className = 'battle-hub-skill-modal-status warn';
    }
  }
}

function renderBattleHubHeroSkills(heroId, progression = null, catalog = null, loggedIn = false) {
  if (!battleHubHeroSkillsEl || !battleHubHeroSkillsListEl) return;
  const hero = getBattleHubHeroCatalogEntry(heroId, catalog);
  const skills = Array.isArray(hero?.uniqueSkills) ? hero.uniqueSkills : [];
  const unlockedCount = skills.reduce((sum, skill) => sum + (getBattleHubHeroSkillLevel(progression, heroId, skill?.id) > 0 ? 1 : 0), 0);

  battleHubHeroSkillsEl.classList.toggle('is-empty', skills.length === 0);
  if (battleHubHeroSkillsCountEl) {
    battleHubHeroSkillsCountEl.textContent = skills.length > 0
      ? `${unlockedCount}/${skills.length} ${trCore('ui.hero.unlocked', 'Unlocked').toLowerCase()}`
      : trCore('ui.hero.no_unique_skills', 'No unique skills.');
  }

  if (skills.length === 0) {
    battleHubHeroSkillsListEl.innerHTML = `<div class="battle-hub-hero-skill-placeholder">${loggedIn ? trCore('ui.hero.no_unique_skills', 'No unique skills.') : trCore('ui.auth.login_required_unlock', 'Login to unlock/progress')}</div>`;
    return;
  }

  battleHubHeroSkillsListEl.innerHTML = skills.map((skill) => {
    const skillId = String(skill?.id || '').trim();
    const level = loggedIn ? getBattleHubHeroSkillLevel(progression, heroId, skillId) : 0;
    const maxLevel = Math.max(1, Number(skill?.maxLevel) || 1);
    const unlocked = level > 0;
    const rarityRaw = String(skill?.rarity || 'common').trim().toLowerCase();
    const rarity = ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(rarityRaw) ? rarityRaw : 'common';
    const color = rarityColor(rarity);
    const skillName = trSkillNameCore(skillId, skill?.name || skillId || 'Skill');
    const skillType = getBattleHubHeroSkillTypeLabel(skill);
    const icon = skillBadgeLabel(skill);
    const levelLabel = unlocked
      ? `Lv ${level}/${maxLevel}`
      : `${trCore('ui.hero.locked', 'Locked')} ${formatBattleHubShardAmount(Math.max(1, Number(skill?.unlockCostShards) || 1))}`;
    const statLines = getBattleHubHeroSkillStats(skill, level);
    const statHtml = statLines.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
    const title = `${skillName} | ${skillType} | ${levelLabel} | ${statLines.join(' | ')}`;
    const flash = battleHubHeroSkillFx
      && String(battleHubHeroSkillFx.heroId || '') === String(heroId || '').trim().toLowerCase()
      && String(battleHubHeroSkillFx.skillId || '') === skillId
      && performance.now() - Number(battleHubHeroSkillFx.at || 0) < 1600;
    const cost = getBattleHubHeroSkillCost(skill, level);
    const shards = Math.max(0, Number(progression?.shards) || 0);
    const canAfford = loggedIn && cost.action !== 'maxed' && shards >= cost.cost;
    return `<button type="button" class="battle-hub-hero-skill ${unlocked ? 'is-unlocked' : 'is-locked'} ${canAfford ? 'can-afford' : ''} ${flash ? 'is-skill-flash' : ''} rarity-${rarity}" data-battle-hub-hero-id="${escapeHtml(heroId)}" data-battle-hub-skill-id="${escapeHtml(skillId)}" style="--skill-color:${color}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">`
      + renderBattleHubHeroSkillIcon(skill, icon)
      + '<span class="battle-hub-hero-skill-copy">'
      + `<span class="battle-hub-hero-skill-name">${escapeHtml(skillName)}</span>`
      + `<span class="battle-hub-hero-skill-meta"><b>${escapeHtml(skillType)}</b><strong>${escapeHtml(levelLabel)}</strong></span>`
      + `<span class="battle-hub-hero-skill-stats">${statHtml}</span>`
      + '</span>'
      + '</button>';
  }).join('');
}

battleHubHeroSkillsListEl?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const skillBtn = target.closest('.battle-hub-hero-skill');
  if (!(skillBtn instanceof HTMLElement)) return;
  openBattleHubHeroSkillModal(skillBtn.dataset.battleHubHeroId || '', skillBtn.dataset.battleHubSkillId || '');
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!battleHubHeroSkillModalEl || battleHubHeroSkillModalEl.classList.contains('hidden')) return;
  closeBattleHubHeroSkillModal();
});

function getBattleHubRatingSummary(progression = null, skillProgress = null, storyProgress = null) {
  const playerId = Math.max(0, Number(game.playerAuth?.player?.id) || 0);
  const playerName = getBattleHubPlayerName().toLowerCase();
  const ratingState = typeof globalThis.CWRating?.getState === 'function' ? globalThis.CWRating.getState() : null;
  const ratingItems = Array.isArray(ratingState?.items) ? ratingState.items : [];
  const rankIndex = ratingItems.findIndex((item) => {
    const itemPlayerId = Math.max(0, Number(item?.playerId) || 0);
    if (playerId > 0 && itemPlayerId === playerId) return true;
    return String(item?.nickname || '').trim().toLowerCase() === playerName;
  });
  if (rankIndex >= 0) {
    const rank = ((Math.max(1, Number(ratingState?.page) || 1) - 1) * Math.max(1, Number(ratingState?.pageSize) || 10)) + rankIndex + 1;
    const category = String(ratingState?.currentCategory || '').replace(/_/g, ' ') || 'loaded rating';
    return { value: `#${rank}`, detail: category };
  }

  const level = Math.max(1, Number(progression?.accountLevel) || 1);
  const runs = Math.max(0, Number(progression?.totalRuns) || 0);
  const heroesUnlocked = Array.isArray(progression?.unlockedHeroes) ? progression.unlockedHeroes.length : 1;
  const storyDone = Math.max(0, Number(storyProgress?.completed) || 0);
  const skillsUnlocked = Math.max(0, Number(skillProgress?.unlocked) || 0);
  const index = (level * 100) + (storyDone * 45) + (skillsUnlocked * 35) + (heroesUnlocked * 25) + Math.min(250, runs * 5);
  const storyTotal = Math.max(0, Number(storyProgress?.total) || 0);
  const storyPct = storyTotal > 0 ? Math.round((storyDone / storyTotal) * 100) : 0;
  return {
    value: String(index),
    detail: `Story ${storyPct}% · Skills ${skillsUnlocked}`,
  };
}

function renderBattleHubPlayerBadge() {
  if (!battleHubPlayerCardEl) return;
  const player = game.playerAuth?.player || null;
  const progression = game.playerAuth?.progression || null;
  const catalog = game.playerAuth?.progressionCatalog || null;
  const loggedIn = Boolean(player);
  const heroId = getBattleHubPlayerHeroId(progression);
  const level = loggedIn ? Math.max(1, Number(progression?.accountLevel) || 1) : 1;
  const heroLevel = loggedIn ? Math.max(1, Number(progression?.heroLevels?.[heroId]) || 1) : 1;
  const xp = loggedIn ? Math.max(0, Number(progression?.accountXp) || 0) : 0;
  const xpToNext = loggedIn ? Math.max(1, Number(progression?.accountXpToNext) || 1) : 1;
  const xpPercent = Math.max(0, Math.min(100, (xp / xpToNext) * 100));
  const playerName = getBattleHubPlayerName();
  const stateLabel = loggedIn
    ? (game.playerAuth?.needsNicknameSetup ? 'Setup' : 'Online')
    : 'Guest';
  const avatarPath = getBattleHubHeroAvatarPath(heroId);
  const skillProgress = getBattleHubSkillProgress(progression, catalog);
  const storyProgress = getBattleHubStoryProgress(progression);
  const heroesUnlocked = loggedIn && Array.isArray(progression?.unlockedHeroes) ? progression.unlockedHeroes.length : 1;
  const heroesTotal = Math.max(heroesUnlocked, Array.isArray(catalog?.heroes) ? catalog.heroes.length : PLAYER_VARIANTS.length);
  const totalRuns = loggedIn ? Math.max(0, Number(progression?.totalRuns) || 0) : 0;
  const shards = loggedIn ? Math.max(0, Number(progression?.shards) || 0) : 0;
  const skillPoints = loggedIn ? Math.max(0, Number(progression?.accountSkillPoints) || 0) : 0;
  const ratingSummary = getBattleHubRatingSummary(progression, skillProgress, storyProgress);

  battleHubPlayerCardEl.classList.toggle('is-guest', !loggedIn);
  battleHubPlayerCardEl.style.setProperty('--avatar-accent', getBattleHubHeroAccent(heroId));
  battleHubPlayerCardEl.title = `${playerName} | Profile Lv ${level} | Hero Lv ${heroLevel} | XP ${xp}/${xpToNext}`;

  if (battleHubPlayerNameEl) battleHubPlayerNameEl.textContent = playerName;
  if (battleHubPlayerAccountLevelEl) battleHubPlayerAccountLevelEl.textContent = `Profile Lv ${level}`;
  if (battleHubPlayerStateEl) battleHubPlayerStateEl.textContent = stateLabel;
  if (battleHubPlayerLevelEl) battleHubPlayerLevelEl.textContent = `Hero Lv ${heroLevel}`;
  if (battleHubPlayerXpFillEl) battleHubPlayerXpFillEl.style.width = `${xpPercent.toFixed(1)}%`;
  if (battleHubPlayerXpTextEl) battleHubPlayerXpTextEl.textContent = `LV ${level} · XP ${xp} / ${xpToNext} · ${Math.round(xpPercent)}%`;
  if (battleHubPlayerSkillsEl) {
    battleHubPlayerSkillsEl.textContent = skillProgress.total > 0
      ? `${skillProgress.unlocked}/${skillProgress.total}`
      : String(skillProgress.unlocked);
  }
  if (battleHubPlayerStoryEl) {
    battleHubPlayerStoryEl.textContent = storyProgress.total > 0
      ? `${storyProgress.completed}/${storyProgress.total}`
      : '0/0';
  }
  if (battleHubPlayerHeroesEl) battleHubPlayerHeroesEl.textContent = `${heroesUnlocked}/${heroesTotal}`;
  if (battleHubPlayerRunsEl) battleHubPlayerRunsEl.textContent = String(totalRuns);
  if (battleHubPlayerShardsEl) battleHubPlayerShardsEl.textContent = String(shards);
  if (battleHubPlayerSkillPointsEl) battleHubPlayerSkillPointsEl.textContent = String(skillPoints);
  if (battleHubPlayerRatingValueEl) battleHubPlayerRatingValueEl.textContent = ratingSummary.value;
  if (battleHubPlayerRatingDetailEl) battleHubPlayerRatingDetailEl.textContent = ratingSummary.detail;
  renderBattleHubHeroSkills(heroId, progression, catalog, loggedIn);
  if (battleHubPlayerAvatarEl) {
    if (!battleHubPlayerAvatarEl.dataset.fallbackBound) {
      battleHubPlayerAvatarEl.dataset.fallbackBound = '1';
      battleHubPlayerAvatarEl.addEventListener('error', () => {
        if (!String(battleHubPlayerAvatarEl.getAttribute('src') || '').endsWith('/cyber.png')) {
          battleHubPlayerAvatarEl.src = '/assets/characters/cyber.png';
        }
      });
    }
    if (battleHubPlayerAvatarEl.getAttribute('src') !== avatarPath) {
      battleHubPlayerAvatarEl.src = avatarPath;
    }
    battleHubPlayerAvatarEl.alt = playerName;
  }
}

function updatePlayRoomsPlacement() {
  if (!playRoomsBrowserEl || !playSideColumnEl) return;
  if (playDeployCardEl && playDeployCardEl.parentElement === playSideColumnEl) {
    if (playRoomsBrowserEl.previousElementSibling !== playDeployCardEl) {
      playSideColumnEl.insertBefore(playRoomsBrowserEl, playDeployCardEl.nextSibling);
    }
    return;
  }
  if (playRoomsBrowserEl.parentElement !== playSideColumnEl) {
    playSideColumnEl.appendChild(playRoomsBrowserEl);
  }
}

function renderPlayerAuthUi() {
  const player = game.playerAuth.player;
  const loggedIn = Boolean(player);
  const needsNicknameSetup = loggedIn && Boolean(game.playerAuth.needsNicknameSetup);
  updatePlayRoomsPlacement();
  if (playerAccessDetailsEl) playerAccessDetailsEl.classList.toggle('is-authenticated', loggedIn);
  if (playerAccessDetailsEl) playerAccessDetailsEl.classList.toggle('needs-nickname-setup', needsNicknameSetup);
  if (playerAuthSummaryEl) {
    if (needsNicknameSetup) {
      playerAuthSummaryEl.textContent = 'Вход выполнен. Выберите постоянный никнейм для аккаунта.';
    } else if (loggedIn) {
      const summaryText = trCore('ui.auth.summary_logged_in', `Logged in as ${player.nickname}. This nickname is reserved for your account.`, { nickname: player.nickname });
      const escapedNickname = escapeHtml(player.nickname);
      playerAuthSummaryEl.innerHTML = escapeHtml(summaryText).replace(escapedNickname, `<span class="auth-summary-nickname">${escapedNickname}</span>`);
    } else {
      playerAuthSummaryEl.textContent = trCore('ui.auth.summary_guest', 'Guest mode. Registered nicknames require login.');
    }
  }
  if (playerLogoutBtn) playerLogoutBtn.classList.toggle('hidden', !loggedIn);
  if (playerRenamePanelEl) playerRenamePanelEl.classList.toggle('hidden', !needsNicknameSetup);
  if (playerRenameNicknameEl && needsNicknameSetup && !playerRenameNicknameEl.value) {
    playerRenameNicknameEl.value = player?.nickname || '';
  }
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
      nicknameHintEl.textContent = trCore('ui.auth.nick_authenticated', 'Authenticated nickname. Join will use your reserved account name.');
      nicknameHintEl.className = 'field-hint ok';
    } else if (status?.isRegistered) {
      nicknameHintEl.textContent = trCore('ui.auth.nick_registered', `Nickname ${status.nickname} is registered. Use Login to play with it.`, { nickname: status.nickname });
      nicknameHintEl.className = 'field-hint err';
    } else if (status?.isOccupied) {
      nicknameHintEl.textContent = trCore('ui.auth.nick_in_use', `Nickname ${status.nickname} is already in use right now.`, { nickname: status.nickname });
      nicknameHintEl.className = 'field-hint err';
    } else if (status?.nickname) {
      nicknameHintEl.textContent = trCore('ui.auth.nick_available', `Nickname ${status.nickname} is available for guest play.`, { nickname: status.nickname });
      nicknameHintEl.className = 'field-hint ok';
    } else {
      nicknameHintEl.textContent = trCore('ui.nickname_hint_guest', 'Guest mode: choose any free nickname.');
      nicknameHintEl.className = 'field-hint';
    }
  }
  renderBattleHubPlayerBadge();
}

function setPlayerAccessCollapsed(collapsed) {
  if (!playerAccessDetailsEl) return;
  playerAccessDetailsEl.classList.toggle('is-collapsed', Boolean(collapsed));
}

function reloadForPlayerSession(message) {
  setAuthFeedback(message, 'ok');
  statusEl.textContent = message;
  void (async () => {
    await refreshPlayerAuthSession({ silent: true });
    try {
      await connectGameSocket(APP_ORIGIN, { forceReconnect: true });
    } catch {
      // The normal join flow will surface connection errors if reconnect fails.
    }
  })();
}

function consumeAuthRedirectFeedback() {
  const url = new URL(window.location.href);
  const authError = String(url.searchParams.get('authError') || '').trim();
  const authProvider = String(url.searchParams.get('authProvider') || '').trim().toLowerCase();
  const authStatus = String(url.searchParams.get('authStatus') || '').trim().toLowerCase();
  if (!authError && !authProvider && !authStatus) return;
  if (authError) {
    const providerLabel = authProvider === 'google' ? 'Google' : (authProvider === 'vk' ? 'VK ID' : 'External login');
    const message = `${providerLabel}: ${authError}`;
    setAuthFeedback(message, 'err');
    statusEl.textContent = message;
    setAuthTab('login');
    setPlayerAccessCollapsed(false);
  } else if (authProvider) {
    const providerLabel = authProvider === 'google' ? 'Google' : (authProvider === 'vk' ? 'VK ID' : 'External login');
    const message = authStatus === 'created'
      ? `${providerLabel}: account created and connected.`
      : `${providerLabel}: login successful.`;
    setAuthFeedback(message, 'ok');
    statusEl.textContent = message;
    setPlayerAccessCollapsed(false);
  }
  url.searchParams.delete('authError');
  url.searchParams.delete('authProvider');
  url.searchParams.delete('authStatus');
  window.history.replaceState({}, document.title, url.toString());
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
  let authLoaded = false;
  try {
    const data = await apiJson('/api/player/me', { method: 'GET' });
    authLoaded = true;
    game.playerAuth.player = data.player || null;
    game.playerAuth.identities = Array.isArray(data.identities) ? data.identities : [];
    game.playerAuth.needsNicknameSetup = Boolean(data?.nicknameSetupRequired);
    game.playerAuth.progressionCatalog = data?.progressionCatalog || null;
    game.playerAuth.progression = data?.progression || null;
    ensureSelectedRunSetupValid();
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
    game.playerAuth.needsNicknameSetup = false;
    game.playerAuth.progressionCatalog = null;
    game.playerAuth.progression = null;
    ensureSelectedRunSetupValid();
  }
  renderPlayerAuthUi();
  if (typeof globalThis.renderCharacterPicker === 'function') {
    globalThis.renderCharacterPicker();
  }
  if (typeof globalThis.renderRunSetupMenu === 'function') {
    globalThis.renderRunSetupMenu();
  }
  if (typeof globalThis.renderNewsFeed === 'function') {
    globalThis.renderNewsFeed();
  }
  if (authLoaded && game.playerAuth.player) {
    queueStoredActiveRunResume();
  } else if (authLoaded && !game.playerAuth.player) {
    clearStoredActiveRunResume();
  }
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
    statusEl.textContent = trCore('ui.auth.logged_in_short', `Logged in as ${data.player?.nickname || nickname}.`, { nickname: data.player?.nickname || nickname });
    renderPlayerAuthUi();
    setPlayerAccessCollapsed(false);
    reloadForPlayerSession('Logged in. Session refreshed.');
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
    statusEl.textContent = trCore('ui.auth.registered_short', `Nickname ${data.player?.nickname || nickname} registered.`, { nickname: data.player?.nickname || nickname });
    renderPlayerAuthUi();
    setPlayerAccessCollapsed(false);
    reloadForPlayerSession('Nickname registered. Session refreshed.');
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
    clearStoredActiveRunResume();
    game.playerAuth.player = null;
    game.playerAuth.identities = [];
    game.playerAuth.needsNicknameSetup = false;
    game.playerAuth.nicknameStatus = null;
    game.playerAuth.progression = null;
    game.playerAuth.progressionCatalog = null;
    ensureSelectedRunSetupValid();
    statusEl.textContent = 'Logged out. Guest mode active.';
    renderPlayerAuthUi();
    if (typeof globalThis.renderRunSetupMenu === 'function') {
      globalThis.renderRunSetupMenu();
    }
    setPlayerAccessCollapsed(false);
    void updateNicknameStatus(nameInput?.value || '');
    reloadForPlayerSession('Logged out. Session refreshed.');
  } catch (err) {
    setPlayerAccessCollapsed(false);
    setAuthFeedback(err.message, 'err');
    statusEl.textContent = err.message;
  } finally {
    setPlayerAuthBusy(false);
  }
}

async function completeExternalNicknameSetup() {
  const nickname = (playerRenameNicknameEl?.value || '').trim();
  if (!nickname) {
    setAuthFeedback('Введите никнейм.', 'err');
    statusEl.textContent = 'Введите никнейм.';
    return;
  }
  clearAuthFeedback();
  setPlayerAuthBusy(true);
  try {
    const data = await apiJson('/api/player/complete-nickname', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    });
    game.playerAuth.player = data.player || game.playerAuth.player;
    game.playerAuth.identities = Array.isArray(data.identities) ? data.identities : game.playerAuth.identities;
    game.playerAuth.needsNicknameSetup = Boolean(data?.nicknameSetupRequired);
    statusEl.textContent = `Никнейм ${data.player?.nickname || nickname} сохранён.`;
    setAuthFeedback(`Никнейм ${data.player?.nickname || nickname} сохранён.`, 'ok');
    if (playerRenameNicknameEl) playerRenameNicknameEl.value = '';
    renderPlayerAuthUi();
    try {
      await connectGameSocket(APP_ORIGIN, { forceReconnect: true });
    } catch {
      // Normal join flow will surface connection errors if reconnect fails.
    }
  } catch (err) {
    setAuthFeedback(err.message, 'err');
    statusEl.textContent = err.message;
  } finally {
    setPlayerAuthBusy(false);
  }
}

function startExternalAuth(provider) {
  const normalized = provider === 'google' ? 'google' : (provider === 'vk' ? 'vk' : (provider === 'mailru' ? 'mailru' : ''));
  if (!normalized) return;
  clearAuthFeedback();
  statusEl.textContent = normalized === 'google'
    ? 'Opening Google sign-in...'
    : (normalized === 'mailru' ? 'Opening Mail.ru sign-in...' : 'Opening VK ID sign-in...');
  const authUrl = `${window.location.origin}/api/auth/${normalized}/start`;
  const popupWidth = 560;
  const popupHeight = 720;
  const left = Math.max(0, Math.round(window.screenX + ((window.outerWidth - popupWidth) / 2)));
  const top = Math.max(0, Math.round(window.screenY + ((window.outerHeight - popupHeight) / 2)));
  const features = [
    `width=${popupWidth}`,
    `height=${popupHeight}`,
    `left=${left}`,
    `top=${top}`,
    'popup=yes',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
  authPopupWindow = window.open(authUrl, `cw-oauth-${normalized}`, features);
  if (authPopupWindow) {
    try {
      authPopupWindow.focus();
    } catch {
      // noop
    }
    return;
  }
  window.location.assign(authUrl);
}

async function handleOAuthPopupResult(payload) {
  const provider = String(payload?.provider || '').trim().toLowerCase();
  const authError = String(payload?.message || '').trim();
  if (payload?.ok) {
    const providerLabel = provider === 'google' ? 'Google' : (provider === 'vk' ? 'VK ID' : (provider === 'mailru' ? 'Mail.ru' : 'External login'));
    const status = authError === 'created' ? 'account created and connected.' : 'login successful.';
    const message = `${providerLabel}: ${status}`;
    setAuthFeedback(message, 'ok');
    statusEl.textContent = message;
    setPlayerAccessCollapsed(false);
    await refreshPlayerAuthSession({ silent: true });
    try {
      await connectGameSocket(APP_ORIGIN, { forceReconnect: true });
    } catch {
      // Normal join flow will surface errors if reconnect fails.
    }
    return;
  }
  const providerLabel = provider === 'google' ? 'Google' : (provider === 'vk' ? 'VK ID' : (provider === 'mailru' ? 'Mail.ru' : 'External login'));
  const message = `${providerLabel}: ${authError || 'sign-in failed.'}`;
  setAuthFeedback(message, 'err');
  statusEl.textContent = message;
  setAuthTab('login');
  setPlayerAccessCollapsed(false);
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

providerGoogleBtn?.addEventListener('click', () => {
  startExternalAuth('google');
});

providerVkBtn?.addEventListener('click', () => {
  startExternalAuth('vk');
});

providerMailruBtn?.addEventListener('click', () => {
  startExternalAuth('mailru');
});

playerRenameSaveBtn?.addEventListener('click', () => {
  void completeExternalNicknameSetup();
});

playerRenameNicknameEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    void completeExternalNicknameSetup();
  }
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const payload = event.data;
  if (!payload || payload.type !== 'cw-oauth-result') return;
  if (authPopupWindow && !authPopupWindow.closed) {
    try {
      authPopupWindow.close();
    } catch {
      // noop
    }
  }
  authPopupWindow = null;
  void handleOAuthPopupResult(payload);
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
  renderBattleHubPlayerBadge();
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
renderDeploySelectionSummary();
consumeAuthRedirectFeedback();
window.cwSetStoredActiveRunResume = setStoredActiveRunResume;
window.cwClearStoredActiveRunResume = clearStoredActiveRunResume;
window.cwSetSelectedRunType = setSelectedRunType;
window.cwSetSelectedMapId = setSelectedMapId;
window.cwSetSelectedCampaign = setSelectedCampaign;
window.cwEnsureSelectedRunSetupValid = ensureSelectedRunSetupValid;
window.renderBattleHubPlayerBadge = renderBattleHubPlayerBadge;
window.beginBattleHubPlayerSwapFx = beginBattleHubPlayerSwapFx;
window.endBattleHubPlayerSwapFx = endBattleHubPlayerSwapFx;
window.cancelBattleHubPlayerSwapFx = cancelBattleHubPlayerSwapFx;
window.renderDeploySelectionSummary = renderDeploySelectionSummary;
window.cwGetMapCatalog = getMapCatalog;
window.cwGetCampaignCatalog = getCampaignCatalog;
window.cwGetCampaignDefById = getCampaignDefById;
window.cwGetCampaignLevelDefById = getCampaignLevelDefById;
window.cwGetRunSelection = () => ({
  runType: selectedRunType,
  mapId: selectedMapId,
  campaignId: selectedCampaignId,
  campaignLevelId: selectedCampaignLevelId,
  gameMode: selectedGameMode,
  pvpDurationMin: selectedPvpDurationMin,
});
void refreshPlayerAuthSession({ silent: true });

function formatMissionObjectiveText(mission) {
  if (!mission || mission.runType !== 'campaign') return '';
  const goals = Array.isArray(mission.goals) ? mission.goals : [];
  if (!goals.length) return '';
  const pending = goals.filter((goal) => !goal?.completed);
  const focusGoal = pending[0] || goals[goals.length - 1] || null;
  if (!focusGoal) return '';
  const current = Math.max(0, Number(focusGoal.current) || 0);
  const target = Math.max(1, Number(focusGoal.target) || 1);
  const label = String(focusGoal.label || mission.brief || mission.title || 'Mission').trim();
  const progress = `${Math.min(current, target)}/${target}`;
  return `${label} (${progress})`;
}

function updateTopCenterHud(nowMs = Date.now()) {
  if (!matchTimerEl || !bossProgressEl || !difficultyMetaEl) return;
  const viewersLabel = trCore('ui.hud.viewers', 'Viewers');
  if (objectiveMetaEl) {
    const objectiveText = formatMissionObjectiveText(game.mission);
    objectiveMetaEl.textContent = objectiveText ? `Objective: ${objectiveText}` : '';
    objectiveMetaEl.classList.toggle('hidden', !objectiveText);
  }
  if (!game.state) {
    matchTimerEl.textContent = `${trCore('ui.hud.time', 'Time')} 00:00`;
    bossProgressEl.textContent = `${trCore('ui.hud.boss_in', 'Boss in')} -- kills`;
    difficultyMetaEl.textContent = `${trCore('ui.hud.threat', 'Threat')} Lv1 | ${viewersLabel}: 0`;
    if (bossSpawnAlertEl) bossSpawnAlertEl.classList.add('hidden');
    return;
  }

  const startedAt = Number(game.roomStartedAt) || Number(game.state.roomStartedAt) || nowMs;
  const elapsedSec = Math.max(0, (nowMs - startedAt) / 1000);
  matchTimerEl.textContent = `${trCore('ui.hud.time', 'Time')} ${formatClock(elapsedSec)}`;

  if (String(game.gameMode || 'normal').toLowerCase() === 'pvp') {
    const endsAt = Number(game.matchEndsAt) || 0;
    const leftSec = endsAt > nowMs ? Math.max(0, (endsAt - nowMs) / 1000) : 0;
    bossProgressEl.textContent = `${trCore('ui.hud.pvp_ends', 'PvP ends in')} ${formatClock(leftSec)}`;
    const alivePlayers = Array.isArray(game.state?.players)
      ? game.state.players.filter((p) => !p.isCompanion && p.alive).length
      : 0;
    difficultyMetaEl.textContent = `${trCore('ui.scoreboard.players', 'Players')}: ${alivePlayers} | ${viewersLabel}: ${Math.max(0, Number(game.spectatorCount) || 0)}`;
    if (bossSpawnAlertEl) bossSpawnAlertEl.classList.add('hidden');
    return;
  }

  const nextSpawnAt = Number(game.nextBossSpawnAt) || 0;
  const bossAlive = Boolean(game.bossAlive);
  if (bossAlive) {
    bossProgressEl.textContent = trCore('ui.hud.boss_active', 'Boss: ACTIVE');
  } else if (nextSpawnAt > nowMs) {
    bossProgressEl.textContent = `${trCore('ui.hud.boss_in', 'Boss in')} ${(Math.max(0, nextSpawnAt - nowMs) / 1000).toFixed(1)}s`;
  } else {
    const leftKills = Math.max(0, (Number(game.nextBossAtKills) || 0) - (Number(game.totalEnemyKills) || 0));
    bossProgressEl.textContent = `${trCore('ui.hud.boss_in', 'Boss in')} ${leftKills} kills`;
  }

  const diff = game.roomDifficulty || {};
  const level = Math.max(1, Number(diff.level) || 1);
  const hpMul = Math.max(1, Number(diff.hpMul) || 1);
  difficultyMetaEl.textContent = `${trCore('ui.hud.threat', 'Threat')} Lv${level} x${hpMul.toFixed(2)} | ${viewersLabel}: ${Math.max(0, Number(game.spectatorCount) || 0)}`;

  if (bossSpawnAlertEl) {
    const portals = Array.isArray(game.state?.bossPortals) ? game.state.bossPortals : [];
    const portal = portals[0] || null;
    if (!bossAlive && portal) {
      const leftSec = Math.max(0, (Number(portal.spawnAt) - nowMs) / 1000);
      bossSpawnAlertEl.textContent = `BOSS TELEPORT IN ${leftSec.toFixed(1)}s`;
      bossSpawnAlertEl.classList.remove('hidden');
    } else {
      bossSpawnAlertEl.classList.add('hidden');
    }
  }
}



function rarityColor(r) {
  if (r === 'legendary') return '#fbbf24';
  if (r === 'epic') return '#f0abfc';
  if (r === 'rare') return '#93c5fd';
  if (r === 'uncommon') return '#86efac';
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
    laser_strike: 'LS',
    homing_missiles: 'HM',
  };
  if (named[id]) return named[id];
  const name = String(skill?.name || id || '?').replace(/[^A-Za-z0-9]+/g, ' ').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 3).toUpperCase();
}

function getBattleHubHeroSkillIconPath(skill) {
  const explicit = String(skill?.icon || skill?.iconPath || '').trim();
  if (explicit) {
    if (/^(?:https?:)?\/\//.test(explicit) || explicit.startsWith('/') || explicit.startsWith('data:')) return explicit;
    return `/assets/hero-skills/${explicit}`;
  }
  const skillId = String(skill?.id || '').trim();
  if (!skillId) return '';
  const heroId = String(skill?.heroId || skill?.sourceHeroId || '').trim().toLowerCase();
  return heroId ? `/assets/hero-skills/${heroId}_${skillId}.webp` : `/assets/hero-skills/${skillId}.webp`;
}

function renderBattleHubHeroSkillIcon(skill, fallbackIcon, extraClass = '') {
  const imagePath = getBattleHubHeroSkillIconPath(skill);
  const className = ['battle-hub-hero-skill-icon', imagePath ? 'has-image' : '', extraClass].filter(Boolean).join(' ');
  if (imagePath) {
    return `<span class="${escapeHtml(className)}"><img src="${escapeHtml(imagePath)}" alt="" loading="lazy" decoding="async"></span>`;
  }
  return `<span class="${escapeHtml(className)}">${escapeHtml(fallbackIcon)}</span>`;
}

function renderBattleHubHeroSkillModalArt(skill, fallbackIcon, rarity, color) {
  const imagePath = getBattleHubHeroSkillIconPath(skill);
  const className = `battle-hub-skill-modal-art rarity-${rarity}${imagePath ? ' has-image' : ''}`;
  const style = `--skill-color:${color}`;
  if (imagePath) {
    return `<div class="${escapeHtml(className)}" style="${escapeHtml(style)}"><img src="${escapeHtml(imagePath)}" alt="" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="${escapeHtml(className)}" style="${escapeHtml(style)}"><span>${escapeHtml(fallbackIcon)}</span></div>`;
}

globalThis.renderBattleHubHeroSkillIcon = renderBattleHubHeroSkillIcon;

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureSkillTooltipElement() {
  if (skillTooltipEl) return skillTooltipEl;
  const el = document.createElement('div');
  el.className = 'skill-tooltip hidden';
  document.body.appendChild(el);
  skillTooltipEl = el;
  return el;
}

function hideSkillTooltip(resetPinned = true) {
  if (!skillTooltipEl) return;
  skillTooltipEl.classList.add('hidden');
  skillTooltipChip = null;
  if (resetPinned) skillTooltipPinned = false;
}

function positionSkillTooltipForChip(chip) {
  if (!skillTooltipEl || !chip) return;
  const rect = chip.getBoundingClientRect();
  const tipRect = skillTooltipEl.getBoundingClientRect();
  let x = rect.left + (rect.width * 0.5) - (tipRect.width * 0.5);
  x = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, x));
  let y = rect.top - tipRect.height - 10;
  if (y < 8) y = rect.bottom + 10;
  skillTooltipEl.style.left = x + 'px';
  skillTooltipEl.style.top = y + 'px';
}

function fmtSkillNumber(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '--';
  return Number(n.toFixed(digits)).toString();
}

function buildSkillCurrentStatLines(skill, def) {
  const lvl = Math.max(1, Number(skill?.level) || 1);
  const lines = [];

  if ((def?.kind || skill?.kind) === 'active') {
    const damage = (Number(def?.damage) || 0) + (Number(def?.damagePerLevel) || 0) * (lvl - 1);
    const radius = (Number(def?.radius) || 0) + (Number(def?.radiusPerLevel) || 0) * (lvl - 1);
    const targets = (Number(def?.targets) || 0) + (Number(def?.targetsPerLevel) || 0) * (lvl - 1);
    if (damage > 0) lines.push('Damage: ' + Math.round(damage));
    if (radius > 0) lines.push('Radius: ' + Math.round(radius));
    if (targets > 0) lines.push('Targets: ' + Math.max(1, Math.round(targets)));
    if (Number(def?.knockbackMul) > 0) lines.push('Knockback: x' + fmtSkillNumber(Number(def?.knockbackMul), 2));
    if (Number(def?.stunMs) > 0) lines.push('Stun: ' + Math.round(Number(def?.stunMs)) + 'ms');

    const baseCd = Math.max(0, Number(def?.cooldownMs) || 0);
    const cdMul = Math.max(0, Number(def?.cooldownMulPerLevel) || 0);
    if (baseCd > 0) {
      const currentCd = Math.max(220, Math.round(baseCd * Math.max(0.2, 1 - cdMul * (lvl - 1))));
      lines.push('Cooldown: ' + fmtSkillNumber(currentCd / 1000, 2) + 's');
    }

    if (Number(def?.missileSpeed) > 0) {
      const missileSpeed = (Number(def?.missileSpeed) || 0) + (Number(def?.missileSpeedPerLevel) || 0) * (lvl - 1);
      lines.push('Missile speed: ' + Math.round(missileSpeed));
    }
    if (Number(def?.explosionRadius) > 0) {
      const explosionRadius = (Number(def?.explosionRadius) || 0) + (Number(def?.explosionRadiusPerLevel) || 0) * (lvl - 1);
      lines.push('Explosion radius: ' + Math.round(explosionRadius));
    }
  } else {
    const dmgPct = (Number(def?.damageMulPerLevel) || 0) * lvl * 100;
    const firePct = (Number(def?.fireRateMulPerLevel) || 0) * lvl * 100;
    const reloadPct = (Number(def?.reloadSpeedMulPerLevel) || 0) * lvl * 100;
    const movePct = (Number(def?.moveSpeedMulPerLevel) || 0) * lvl * 100;
    const hpFlat = (Number(def?.maxHpFlatPerLevel) || 0) * lvl;
    const pickupFlat = (Number(def?.pickupRadiusPerLevel) || 0) * lvl;
    const regen = (Number(def?.hpRegenPerSecPerLevel) || 0) * lvl;
    const dodge = (Number(def?.extraDodgeChargesPerLevel) || 0) * lvl;
    const bulletPierce = (Number(def?.bulletPierceFlat) || 0) + (Number(def?.bulletPiercePerLevel) || 0) * lvl;
    const bulletDmgPct = (Number(def?.bulletDamageMulPerLevel) || 0) * lvl * 100;
    const globalDmgPct = (Number(def?.globalDamageMulPerLevel) || 0) * lvl * 100;
    const globalFirePct = (Number(def?.globalFireRateMulPerLevel) || 0) * lvl * 100;
    const globalMovePct = (Number(def?.globalMoveSpeedMulPerLevel) || 0) * lvl * 100;
    const globalHpFlat = (Number(def?.globalMaxHpFlatPerLevel) || 0) * lvl;
    const globalPickup = (Number(def?.globalPickupRadiusPerLevel) || 0) * lvl;
    const globalRegen = (Number(def?.globalHpRegenPerSecPerLevel) || 0) * lvl;

    if (dmgPct !== 0) lines.push('Damage: +' + fmtSkillNumber(dmgPct, 1) + '%');
    if (firePct !== 0) lines.push('Fire rate: +' + fmtSkillNumber(firePct, 1) + '%');
    if (reloadPct !== 0) lines.push('Reload speed: +' + fmtSkillNumber(reloadPct, 1) + '%');
    if (movePct !== 0) lines.push('Move speed: +' + fmtSkillNumber(movePct, 1) + '%');
    if (hpFlat !== 0) lines.push('Max HP: +' + Math.round(hpFlat));
    if (pickupFlat !== 0) lines.push('Pickup radius: +' + Math.round(pickupFlat));
    if (regen !== 0) lines.push('HP regen: +' + fmtSkillNumber(regen, 2) + '/s');
    if (dodge !== 0) lines.push('Jump charges: +' + Math.round(dodge));
    if (bulletPierce !== 0) lines.push('Bullet pierce: +' + Math.round(bulletPierce));
    if (bulletDmgPct !== 0) lines.push('Bullet damage: +' + fmtSkillNumber(bulletDmgPct, 1) + '%');
    if (globalDmgPct !== 0) lines.push('Other heroes damage: +' + fmtSkillNumber(globalDmgPct, 1) + '%');
    if (globalFirePct !== 0) lines.push('Other heroes fire rate: +' + fmtSkillNumber(globalFirePct, 1) + '%');
    if (globalMovePct !== 0) lines.push('Other heroes speed: +' + fmtSkillNumber(globalMovePct, 1) + '%');
    if (globalHpFlat !== 0) lines.push('Other heroes HP: +' + Math.round(globalHpFlat));
    if (globalPickup !== 0) lines.push('Other heroes pickup: +' + Math.round(globalPickup));
    if (globalRegen !== 0) lines.push('Other heroes regen: +' + fmtSkillNumber(globalRegen, 2) + '/s');
  }

  const cdLeft = Math.max(0, Number(skill?.cooldownMs) || 0);
  if ((skill?.kind || def?.kind) === 'active') {
    lines.push(cdLeft > 0 ? ('Current CD: ' + fmtSkillNumber(cdLeft / 1000, 2) + 's') : 'Current CD: ready');
  }

  return lines;
}

function showSkillTooltip(chip) {
  if (!(chip instanceof HTMLElement)) {
    hideSkillTooltip();
    return;
  }
  const sid = String(chip.dataset.skillId || '').toLowerCase();
  if (!sid) {
    hideSkillTooltip();
    return;
  }
  const me = game.state?.players?.find((p) => p.id === game.myId);
  const skills = Array.isArray(me?.skills) ? me.skills : [];
  const skill = skills.find((s) => String(s.id || '').toLowerCase() === sid);
  if (!skill) {
    hideSkillTooltip();
    return;
  }

  const def = game.skillCatalog?.[sid] || {};
  const rarity = String(skill.rarity || def.rarity || 'common').toLowerCase();
  const color = rarityColor(rarity);
  const descFallback = String(skill.desc || def.desc || trCore('ui.skill.no_description', 'No description')).trim();
  const desc = trCore(`skill.${sid}.desc`, descFallback);
  const lines = buildSkillCurrentStatLines(skill, def);

  const tip = ensureSkillTooltipElement();
  const linesHtml = lines.map((line) => '<div class="skill-tooltip-line">' + escapeHtml(line) + '</div>').join('');
  const skillTitle = trSkillNameCore(skill.id || sid, skill.name || sid);
  tip.innerHTML = '<div class="skill-tooltip-title" style="color:' + color + '">' + escapeHtml(skillTitle) + ' Lv' + Math.max(1, Number(skill.level) || 1) + '</div>'
    + '<div class="skill-tooltip-desc">' + escapeHtml(desc) + '</div>'
    + '<div class="skill-tooltip-stats">' + linesHtml + '</div>';
  tip.classList.remove('hidden');
  skillTooltipChip = chip;
  positionSkillTooltipForChip(chip);
}

skillBarEl?.addEventListener('pointerover', (event) => {
  if (mobile.enabled || skillTooltipPinned) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const chip = target.closest('.skill-chip');
  if (!(chip instanceof HTMLElement)) return;
  showSkillTooltip(chip);
});

skillBarEl?.addEventListener('pointermove', (event) => {
  if (mobile.enabled || skillTooltipPinned) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const chip = target.closest('.skill-chip');
  if (!(chip instanceof HTMLElement)) {
    hideSkillTooltip(false);
    return;
  }
  if (chip !== skillTooltipChip) {
    showSkillTooltip(chip);
    return;
  }
  positionSkillTooltipForChip(chip);
});

skillBarEl?.addEventListener('pointerleave', () => {
  if (!skillTooltipPinned) hideSkillTooltip(false);
});

skillBarEl?.addEventListener('click', (event) => {
  if (!mobile.enabled) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const chip = target.closest('.skill-chip');
  if (!(chip instanceof HTMLElement)) {
    hideSkillTooltip();
    return;
  }
  if (skillTooltipPinned && chip === skillTooltipChip) {
    hideSkillTooltip();
    return;
  }
  showSkillTooltip(chip);
  skillTooltipPinned = true;
  event.preventDefault();
  event.stopPropagation();
});

document.addEventListener('click', (event) => {
  if (!mobile.enabled) return;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('#skill-bar')) return;
  hideSkillTooltip();
});

function renderLevelupChoices() {
  if (!levelupOverlayEl || !levelupOptionsEl) return;
  document.body.classList.remove('levelup-open');
  levelupOverlayEl.classList.add('hidden');
  if (lastLevelupHtml !== '') {
    levelupOptionsEl.innerHTML = '';
    lastLevelupHtml = '';
  }
}

function chooseSkillByIndex(idx) {
  void idx;
  return false;
}

function getBottomHudPlayer() {
  const players = Array.isArray(game.state?.players) ? game.state.players : [];
  if (!players.length) return null;
  const me = players.find((p) => p && p.id === game.myId);
  if (me) return me;
  if (!game.spectating && !game.embedMode) return null;
  const alivePlayers = players.filter((p) => p && !p.isCompanion && p.alive !== false);
  const candidates = alivePlayers.length > 0 ? alivePlayers : players.filter((p) => p && !p.isCompanion);
  if (!candidates.length) return null;
  return candidates
    .slice()
    .sort((a, b) => (Math.max(0, Number(b?.score) || 0) - Math.max(0, Number(a?.score) || 0)))
    [0] || null;
}

function updateBottomHud() {
  if (!bottomHudEl) return;
  const inMenu = !game.state;
  const hudPlayer = inMenu ? null : getBottomHudPlayer();
  bottomHudEl.classList.toggle('hidden', inMenu || !hudPlayer);
  if (inMenu || !hudPlayer) {
    if (xpLevelEl) xpLevelEl.textContent = 'Lv1';
    if (xpFillEl) xpFillEl.style.width = '0%';
    if (xpTextEl) xpTextEl.textContent = '0 / 0 XP';
    if (skillBarEl && lastSkillBarHtml !== '') {
      skillBarEl.innerHTML = '';
      lastSkillBarHtml = '';
    }
    hideSkillTooltip();
    renderLevelupChoices();
    return;
  }

  const lvl = Math.max(1, Number(hudPlayer.level) || 1);
  const xp = Math.max(0, Number(hudPlayer.xp) || 0);
  const xpToNext = Math.max(1, Number(hudPlayer.xpToNext) || 1);
  if (xpLevelEl) xpLevelEl.textContent = `Lv${lvl}`;
  if (xpFillEl) xpFillEl.style.width = `${Math.max(0, Math.min(100, (xp / xpToNext) * 100)).toFixed(1)}%`;
  if (xpTextEl) xpTextEl.textContent = `${xp} / ${xpToNext} XP`;

  const skills = Array.isArray(hudPlayer.skills) ? hudPlayer.skills : [];
  if (skillBarEl) {
    const compactSkills = mobile.enabled;
    const skillChips = skills.map((s) => {
      const cd = Math.max(0, Number(s.cooldownMs) || 0);
      const rarity = (s.rarity || 'common').toLowerCase();
      if (compactSkills) {
        const badge = skillBadgeLabel(s);
        const stateText = s.kind === 'active' ? (cd > 0 ? `${Math.max(0.1, cd / 1000).toFixed(1)}` : 'R') : '';
        const localizedSkillName = trSkillNameCore(s.id, s.name);
        const label = `${localizedSkillName} Lv${s.level}${stateText ? `, ${stateText === 'R' ? trCore('ui.skill.ready', 'ready') : `${stateText}s ${trCore('ui.skill.cooldown', 'cooldown')}`}` : ''}`;
        return `<div class="skill-chip compact" data-skill-id="${s.id}" title="${label}" aria-label="${label}" style="border-color:${rarityColor(rarity)}66"><span class="skill-chip-icon">${badge}</span><span class="skill-chip-level">Lv${s.level}</span>${stateText ? `<span class="skill-chip-state${stateText === 'R' ? ' ready' : ''}">${stateText}</span>` : ''}</div>`;
      }
      const localizedSkillName = trSkillNameCore(s.id, s.name);
      const cdText = s.kind === 'active' ? (cd > 0 ? `${(cd / 1000).toFixed(1)}s` : trCore('ui.skill.ready', 'ready')) : `Lv${s.level}`;
      return `<div class="skill-chip" data-skill-id="${s.id}" style="border-color:${rarityColor(rarity)}66"><div>${localizedSkillName} Lv${s.level}</div><div class="cd">${cdText}</div></div>`;
    });
    const quickChips = (Array.isArray(hudPlayer.quickSlots) ? hudPlayer.quickSlots : []).map((slot, index) => {
      const rarity = String(slot?.rarity || 'common').toLowerCase();
      const quantity = Math.max(0, Number(slot?.quantity) || 0);
      const itemId = String(slot?.itemId || '').trim();
      const itemDef = getProgressionCatalogItem(itemId) || {};
      const itemName = trItemNameCore(itemId, String(slot?.name || itemDef?.name || itemId || `Quick ${index + 1}`));
      const hotkey = `${index + 4}`;
      const stateText = quantity > 0 ? `x${quantity}` : trCore('ui.inventory.empty_slot', 'Empty');
      const badge = itemName.slice(0, 3).toUpperCase();
      if (compactSkills) {
        const label = `${hotkey}: ${itemName} ${stateText}`;
        return `<div class="skill-chip compact quick-chip${quantity > 0 ? '' : ' empty'}" title="${label}" aria-label="${label}" style="border-color:${rarityColor(rarity)}66"><span class="skill-chip-icon">${badge}</span><span class="skill-chip-level">[${hotkey}]</span><span class="skill-chip-state${quantity > 0 ? ' ready' : ''}">${stateText}</span></div>`;
      }
      return `<div class="skill-chip quick-chip${quantity > 0 ? '' : ' empty'}" style="border-color:${rarityColor(rarity)}66"><div>${itemName} [${hotkey}]</div><div class="cd">${stateText}</div></div>`;
    });
    const nextSkillBarHtml = [...skillChips, ...quickChips].join('');
    if (nextSkillBarHtml !== lastSkillBarHtml) {
      skillBarEl.innerHTML = nextSkillBarHtml;
      lastSkillBarHtml = nextSkillBarHtml;
      if (skillTooltipPinned) {
        const sid = String(skillTooltipChip?.dataset?.skillId || '').toLowerCase();
        const nextChip = sid ? skillBarEl.querySelector('.skill-chip[data-skill-id="' + sid + '"]') : null;
        if (nextChip instanceof HTMLElement) {
          showSkillTooltip(nextChip);
          skillTooltipPinned = true;
        } else {
          hideSkillTooltip();
        }
      } else {
        hideSkillTooltip(false);
      }
    }
  }


  renderLevelupChoices();
}

function setStatsPanelOpen(open) {
  statsPanelOpen = Boolean(open);
  localStorage.setItem('cw:statsPanelOpen', statsPanelOpen ? '1' : '0');
  if (statsPanelEl) statsPanelEl.classList.toggle('hidden', !statsPanelOpen);
  if (statsToggleBtn) statsToggleBtn.setAttribute('aria-expanded', statsPanelOpen ? 'true' : 'false');
  if (statsPanelOpen && game.state?.players) {
    updateStatsPanel(game.state.players.find((p) => p.id === game.myId), { force: true });
  }
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

function updateStatsPanel(me, options = {}) {
  if (!statsContentEl) return;
  if (!me) {
    const emptyHtml = 'No data yet.';
    if (lastStatsPanelHtml !== emptyHtml) {
      lastStatsPanelHtml = emptyHtml;
      statsContentEl.innerHTML = emptyHtml;
    }
    return;
  }
  if (!options.force && (!statsPanelOpen || statsPanelEl?.classList.contains('hidden'))) return;
  const nowMs = performance.now();
  if (!options.force && nowMs - lastStatsPanelUpdateAt < 250) return;

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

  const nextHtml = [
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
  lastStatsPanelUpdateAt = nowMs;
  if (nextHtml === lastStatsPanelHtml) return;
  lastStatsPanelHtml = nextHtml;
  statsContentEl.innerHTML = nextHtml;
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
  const expectedStateMs = getObservedStateIntervalMs();
  const backlogMs = Math.max(0, stalenessMs - expectedStateMs * 1.15);
  netStats.stateDelayMs = getEffectiveNetRenderDelayMs() + backlogMs;
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
  const interpMs = game.netSnapshots.length > 0 ? getEffectiveNetRenderDelayMs() : 0;

  const netLine1 = 'NET: ping ' + Math.round(netStats.rttMs) + 'ms | jitter ' + Math.round(netStats.jitterMs) + 'ms | loss ' + lossPct.toFixed(1) + '%';
  const netLine2 = 'state ' + netStats.stateHz.toFixed(1) + 'Hz | delay ' + Math.round(netStats.stateDelayMs) + 'ms | interp ' + interpMs + 'ms | rx ' + netStats.rxKBps.toFixed(1) + 'KB/s (' + formatBytesTotal(netStats.rxTotalBytes) + ') | tx ' + netStats.txKBps.toFixed(1) + 'KB/s (' + formatBytesTotal(netStats.txTotalBytes) + ')';
  netMetaEl.innerHTML = '<span class="net-line">' + netLine1 + '</span><span class="net-line">' + netLine2 + '</span>';
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

  const pingPart = ` | Ping: ${Math.max(0, pingMs)}ms`;
  const shortText = `${Math.max(0, pingMs)}ms`;
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
  mapProps: {
    car_red: loadImage('/assets/map-props/car_red.png'),
    car_blue: loadImage('/assets/map-props/car_blue.png'),
    bus_yellow: loadImage('/assets/map-props/bus_yellow.png'),
    ambulance: loadImage('/assets/map-props/ambulance.png'),
    barrier: loadImage('/assets/map-props/barrier.png'),
    shack: loadImage('/assets/map-props/shack.png'),
    mall_block: loadImage('/assets/map-props/mall_block.png'),
    clinic_block: loadImage('/assets/map-props/clinic_block.svg'),
    industrial_tank: loadImage('/assets/map-props/industrial_tank.png'),
    reactor_block: loadImage('/assets/map-props/reactor_block.svg'),
    build_1: loadImage('/assets/buildings/build-1.png'),
    build_2: loadImage('/assets/buildings/build-2.png'),
    build_3: loadImage('/assets/buildings/build-3.png'),
    build_4: loadImage('/assets/buildings/build-4.png'),
    build_5: loadImage('/assets/buildings/build-5.png'),
    build_6: loadImage('/assets/buildings/build-6.png'),
    build_7: loadImage('/assets/buildings/build-7.png'),
  },
  backgrounds: {
    runLoading: loadImage(RUN_START_LOADING_IMAGE),
    start1: loadImage(RUN_START_IMPACT_IMAGES[0]),
    start2: loadImage(RUN_START_IMPACT_IMAGES[1]),
  },
};

function runStartEaseOutCubic(t) {
  const p = clamp(t, 0, 1);
  return 1 - Math.pow(1 - p, 3);
}

function runStartEaseInOut(t) {
  const p = clamp(t, 0, 1);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) * 0.5;
}

function collectRunStartImageResources(value, out = []) {
  if (!value) return out;
  if (value instanceof HTMLImageElement) {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRunStartImageResources(item, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) collectRunStartImageResources(item, out);
  }
  return out;
}

function getRunStartImageResources() {
  const seen = new Set();
  return collectRunStartImageResources(sprites, [])
    .filter((img) => {
      const key = String(img.currentSrc || img.src || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function waitForRunStartImage(img) {
  if (!img) return Promise.resolve(false);
  if (img.complete && Number(img.naturalWidth) > 0) {
    if (typeof img.decode === 'function') return img.decode().then(() => true).catch(() => true);
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let done = false;
    let timer = 0;
    const finish = (ok) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      resolve(Boolean(ok));
    };
    const onLoad = () => finish(true);
    const onError = () => finish(false);
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    timer = window.setTimeout(() => finish(img.complete && Number(img.naturalWidth) > 0), 6500);
  });
}

function updateRunStartLoadingUi() {
  if (!runStartSequence.active || !runStartSequence.loading) return;
  const resourceTotal = Math.max(0, Number(runStartSequence.resourceTotal) || 0);
  const resourceLoaded = Math.max(0, Math.min(resourceTotal, Number(runStartSequence.resourceLoaded) || 0));
  const resourceRatio = resourceTotal > 0 ? resourceLoaded / resourceTotal : 1;
  const stateRatio = runStartSequence.firstStateReady ? 1 : 0;
  const elapsedMs = Math.max(0, performance.now() - (Number(runStartSequence.startedAt) || performance.now()));
  const waitDrift = Math.min(0.1, elapsedMs / 9000);
  const targetProgress = Math.min(
    runStartSequence.resourcesReady && runStartSequence.firstStateReady ? 1 : 0.94,
    resourceRatio * 0.72 + stateRatio * 0.18 + waitDrift,
  );
  runStartSequence.progress = Math.max(Number(runStartSequence.progress) || 0, targetProgress);
  if (runStartFillEl) runStartFillEl.style.width = `${Math.round(runStartSequence.progress * 100)}%`;
  if (runStartLabelEl) runStartLabelEl.textContent = 'Загрузка боя';
  if (runStartMetaEl) {
    if (!runStartSequence.resourcesReady) {
      runStartMetaEl.textContent = `Ресурсы: ${resourceLoaded}/${resourceTotal || '...'} | сервер ${runStartSequence.firstStateReady ? 'готов' : 'подключается'}`;
    } else if (!runStartSequence.firstStateReady) {
      runStartMetaEl.textContent = 'Ресурсы готовы | ждём первый кадр боя';
    } else {
      runStartMetaEl.textContent = 'Бой готов | вход в зону';
    }
  }
}

function buildRunStartFireworks() {
  const palettes = [
    ['#facc15', '#fb923c', '#fff7ed'],
    ['#fb7185', '#f472b6', '#ffe4e6'],
    ['#38bdf8', '#22d3ee', '#ecfeff'],
    ['#22c55e', '#86efac', '#f0fdf4'],
    ['#a78bfa', '#f0abfc', '#f5f3ff'],
    ['#f8fafc', '#f43f5e', '#fed7aa'],
  ];
  const specs = [];
  const count = window.innerWidth < 760 ? 18 : 30;
  for (let i = 0; i < count; i += 1) {
    const palette = palettes[i % palettes.length];
    const sideBias = i % 2 === 0 ? -1 : 1;
    const startX = 0.08 + Math.random() * 0.84;
    const targetX = clamp(0.5 + sideBias * (0.08 + Math.random() * 0.26), 0.12, 0.88);
    const sparkCount = 18 + Math.floor(Math.random() * 18);
    const ringCount = 1 + Math.floor(Math.random() * 3);
    specs.push({
      startX,
      startY: 1.05 + Math.random() * 0.16,
      targetX,
      targetY: 0.16 + Math.random() * 0.48,
      delay: 80 + Math.random() * 1560,
      duration: 920 + Math.random() * 980,
      sway: (Math.random() - 0.5) * 160,
      color: palette[0],
      color2: palette[1],
      coreColor: palette[2],
      size: 2 + Math.random() * 3.9,
      sparkCount,
      ringCount,
      shellRadius: 38 + Math.random() * 72,
      crackle: 0.35 + Math.random() * 0.55,
      gravity: 18 + Math.random() * 36,
      spin: Math.random() * Math.PI * 2,
      starPoints: 5 + Math.floor(Math.random() * 4),
    });
  }
  return specs;
}

function clearRunStartTimers() {
  window.clearTimeout(runStartSequence.impactTimer);
  window.clearTimeout(runStartSequence.finishTimer);
  window.clearTimeout(runStartSequence.minLoadingTimer);
  window.clearInterval(runStartSequence.progressTimer);
  runStartSequence.impactTimer = 0;
  runStartSequence.finishTimer = 0;
  runStartSequence.minLoadingTimer = 0;
  runStartSequence.progressTimer = 0;
}

function hideRunStartOverlay() {
  if (runStartOverlayEl) {
    runStartOverlayEl.classList.add('hidden');
    runStartOverlayEl.classList.remove('is-intro', 'impact-active');
  }
  if (runStartImpactImgEl) runStartImpactImgEl.removeAttribute('src');
}

function cancelRunStartLoading(options = {}) {
  const targetToken = Math.max(0, Number(options?.token) || 0);
  if (targetToken > 0 && targetToken !== runStartSequence.token) return;
  runStartSequence.token += 1;
  runStartSequence.active = false;
  runStartSequence.loading = false;
  runStartSequence.introActive = false;
  runStartSequence.cameraMode = 'zoom';
  runStartSequence.firstStateReady = false;
  runStartSequence.resourcesReady = false;
  runStartSequence.resourceLoaded = 0;
  runStartSequence.resourceTotal = 0;
  runStartSequence.progress = 0;
  visuals.runStartFireworks = [];
  clearRunStartTimers();
  hideRunStartOverlay();
}

function finishRunStartIntro(token) {
  if (token !== runStartSequence.token) return;
  runStartSequence.active = false;
  runStartSequence.loading = false;
  runStartSequence.introActive = false;
  runStartSequence.cameraMode = 'zoom';
  runStartSequence.progress = 0;
  visuals.runStartFireworks = [];
  clearRunStartTimers();
  hideRunStartOverlay();
}

function triggerRunStartImpact(token) {
  if (token !== runStartSequence.token || !runStartSequence.introActive || !runStartOverlayEl || !runStartImpactImgEl) return;
  runStartImpactImgEl.src = runStartSequence.impactSrc;
  runStartOverlayEl.classList.remove('impact-active');
  void runStartOverlayEl.offsetWidth;
  runStartOverlayEl.classList.add('impact-active');
  runStartSequence.impactTimer = window.setTimeout(() => {
    if (token === runStartSequence.token && runStartOverlayEl) runStartOverlayEl.classList.remove('impact-active');
  }, 1880);
}

function startRunIntroTransition(token) {
  if (token !== runStartSequence.token || !runStartSequence.active || !runStartSequence.loading) return;
  runStartSequence.loading = false;
  runStartSequence.introActive = true;
  runStartSequence.introStartedAt = performance.now();
  runStartSequence.progress = 1;
  runStartSequence.cameraMode = Math.random() < 0.5 ? 'zoom' : 'spin';
  runStartSequence.impactSrc = RUN_START_IMPACT_IMAGES[Math.floor(Math.random() * RUN_START_IMPACT_IMAGES.length)] || RUN_START_IMPACT_IMAGES[0];
  visuals.runStartFireworks = buildRunStartFireworks();
  window.clearInterval(runStartSequence.progressTimer);
  runStartSequence.progressTimer = 0;
  if (runStartFillEl) runStartFillEl.style.width = '100%';
  if (runStartMetaEl) runStartMetaEl.textContent = 'Бой готов | вход в зону';
  if (runStartOverlayEl) {
    runStartOverlayEl.classList.remove('hidden');
    runStartOverlayEl.classList.add('is-intro');
  }
  runStartSequence.impactTimer = window.setTimeout(() => triggerRunStartImpact(token), 620);
  runStartSequence.finishTimer = window.setTimeout(() => finishRunStartIntro(token), getRunStartIntroDurationMs() + 320);
}

function maybeStartRunIntroTransition() {
  if (!runStartSequence.active || !runStartSequence.loading || !runStartSequence.resourcesReady || !runStartSequence.firstStateReady) return;
  if (runStartSequence.minLoadingTimer) return;
  const token = runStartSequence.token;
  const elapsedMs = Math.max(0, performance.now() - (Number(runStartSequence.startedAt) || performance.now()));
  const delayMs = Math.max(0, RUN_START_MIN_LOADING_MS - elapsedMs);
  updateRunStartLoadingUi();
  runStartSequence.minLoadingTimer = window.setTimeout(() => {
    runStartSequence.minLoadingTimer = 0;
    startRunIntroTransition(token);
  }, delayMs);
}

async function preloadRunStartResources(token) {
  const images = getRunStartImageResources();
  runStartSequence.resourceTotal = images.length;
  runStartSequence.resourceLoaded = 0;
  updateRunStartLoadingUi();
  await Promise.all(images.map((img) => waitForRunStartImage(img).then(() => {
    if (token !== runStartSequence.token) return;
    runStartSequence.resourceLoaded += 1;
    updateRunStartLoadingUi();
  })));
  if (token !== runStartSequence.token) return;
  runStartSequence.resourcesReady = true;
  updateRunStartLoadingUi();
  maybeStartRunIntroTransition();
}

function beginRunStartLoading(options = {}) {
  if (game.embedMode || replayGame.active || game.spectating) return 0;
  const token = runStartSequence.token + 1;
  runStartSequence.token = token;
  runStartSequence.active = true;
  runStartSequence.loading = true;
  runStartSequence.firstStateReady = false;
  runStartSequence.resourcesReady = false;
  runStartSequence.resourceLoaded = 0;
  runStartSequence.resourceTotal = 0;
  runStartSequence.progress = 0;
  runStartSequence.startedAt = performance.now();
  runStartSequence.introActive = false;
  runStartSequence.introStartedAt = 0;
  runStartSequence.cameraMode = 'zoom';
  runStartSequence.impactSrc = RUN_START_IMPACT_IMAGES[Math.floor(Math.random() * RUN_START_IMPACT_IMAGES.length)] || RUN_START_IMPACT_IMAGES[0];
  visuals.runStartFireworks = [];
  clearRunStartTimers();
  if (runStartOverlayEl) {
    runStartOverlayEl.classList.remove('hidden', 'is-intro', 'impact-active');
  }
  if (runStartImpactImgEl) runStartImpactImgEl.src = runStartSequence.impactSrc;
  if (runStartFillEl) runStartFillEl.style.width = '0%';
  if (runStartLabelEl) runStartLabelEl.textContent = options?.resumeOnly ? 'Возвращаемся в бой' : 'Загрузка боя';
  if (runStartMetaEl) runStartMetaEl.textContent = 'Подготовка ресурсов...';
  runStartSequence.progressTimer = window.setInterval(updateRunStartLoadingUi, 120);
  void preloadRunStartResources(token);
  updateRunStartLoadingUi();
  return token;
}

function markRunStartFirstStateReady() {
  if (!runStartSequence.active || !runStartSequence.loading) return;
  runStartSequence.firstStateReady = true;
  updateRunStartLoadingUi();
  maybeStartRunIntroTransition();
}

function getRunStartIntroProgress(nowMs = performance.now()) {
  if (!runStartSequence.introActive) return 1;
  const elapsed = Math.max(0, Number(nowMs) - (Number(runStartSequence.introStartedAt) || Number(nowMs)));
  return clamp(elapsed / getRunStartIntroDurationMs(), 0, 1);
}

function getRunStartIntroDurationMs() {
  return runStartSequence.cameraMode === 'spin' ? RUN_START_SPIN_INTRO_DURATION_MS : RUN_START_ZOOM_INTRO_DURATION_MS;
}

function getRunStartMapFitScale() {
  const worldW = Math.max(1, Number(game.world?.width) || Number(game.state?.world?.width) || canvas.width);
  const worldH = Math.max(1, Number(game.world?.height) || Number(game.state?.world?.height) || canvas.height);
  const fit = Math.min(canvas.width / worldW, canvas.height / worldH, 1);
  return clamp(fit, 0.12, 1);
}

function getRunStartSceneScale(nowMs = performance.now()) {
  if (!runStartSequence.introActive) return 1;
  const p = getRunStartIntroProgress(nowMs);
  const eased = runStartEaseInOut(p);
  const startScale = getRunStartMapFitScale();
  return startScale + (1 - startScale) * eased;
}

function getRunStartCameraFocusProgress(nowMs = performance.now()) {
  if (!runStartSequence.introActive) return 1;
  const p = getRunStartIntroProgress(nowMs);
  return runStartEaseInOut(clamp((p - 0.04) / 0.96, 0, 1));
}

function getRunStartSceneTransform(nowMs = performance.now()) {
  if (!runStartSequence.introActive) return { active: false, scale: 1, rotation: 0, shakeX: 0, shakeY: 0 };
  const p = getRunStartIntroProgress(nowMs);
  const scale = getRunStartSceneScale(nowMs);
  const spinProgress = runStartEaseOutCubic(p);
  const rotation = runStartSequence.cameraMode === 'spin'
    ? (Math.PI * 2 * (1 - spinProgress))
    : 0;
  const impactP = clamp((Math.max(0, Number(nowMs) - runStartSequence.introStartedAt) - 620) / 520, 0, 1);
  const shake = impactP > 0 && impactP < 1 ? (1 - impactP) * (runStartSequence.cameraMode === 'spin' ? 7 : 8) : 0;
  return {
    active: p < 1,
    scale,
    rotation,
    shakeX: Math.sin(Number(nowMs) * 0.08) * shake,
    shakeY: Math.cos(Number(nowMs) * 0.103) * shake * 0.72,
  };
}

function getRunStartViewportScale(nowMs = performance.now()) {
  return clamp(getRunStartSceneScale(nowMs), 0.12, 1);
}

function getRunStartViewportWorldPad(nowMs = performance.now()) {
  if (!runStartSequence.introActive) return 0;
  const scale = Math.max(0.12, getRunStartViewportScale(nowMs));
  const rotationPad = runStartSequence.cameraMode === 'spin' ? Math.hypot(canvas.width, canvas.height) * 0.36 : 90;
  return Math.ceil(rotationPad / scale) + 140;
}

function runStartColorAlpha(color, alpha = 1) {
  const raw = String(color || '#ffffff').replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  const value = Number.parseInt(full, 16);
  const a = clamp(alpha, 0, 1).toFixed(3);
  if (!Number.isFinite(value)) return `rgba(255,255,255,${a})`;
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${a})`;
}

function drawRunStartStar(x, y, radius, points, rotation, color, alpha) {
  const p = Math.max(4, Math.round(Number(points) || 5));
  const outer = Math.max(1, Number(radius) || 1);
  const inner = outer * 0.42;
  ctx.beginPath();
  for (let i = 0; i < p * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation - Math.PI * 0.5 + (i / (p * 2)) * Math.PI * 2;
    const sx = x + Math.cos(a) * r;
    const sy = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fillStyle = runStartColorAlpha(color, alpha);
  ctx.fill();
}

function drawRunStartCinematicOverlay(nowMs = performance.now()) {
  if (!runStartSequence.introActive) return;
  const elapsed = Math.max(0, Number(nowMs) - runStartSequence.introStartedAt);
  const p = getRunStartIntroProgress(nowMs);
  const fade = Math.max(0, 1 - p);
  const specs = Array.isArray(visuals.runStartFireworks) ? visuals.runStartFireworks : [];

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const vignette = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.48,
    Math.max(120, Math.min(canvas.width, canvas.height) * 0.18),
    canvas.width * 0.5,
    canvas.height * 0.5,
    Math.max(canvas.width, canvas.height) * 0.78,
  );
  vignette.addColorStop(0, `rgba(0, 0, 0, ${(0.02 * fade).toFixed(3)})`);
  vignette.addColorStop(1, `rgba(0, 0, 0, ${(0.42 * fade).toFixed(3)})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const spec of specs) {
    const local = clamp((elapsed - spec.delay) / spec.duration, 0, 1);
    if (local <= 0 || local >= 1) continue;
    const eased = runStartEaseOutCubic(Math.min(local, 0.68) / 0.68);
    const startX = spec.startX * canvas.width;
    const startY = spec.startY * canvas.height;
    const targetX = spec.targetX * canvas.width;
    const targetY = spec.targetY * canvas.height;
    const arc = Math.sin(Math.min(1, local / 0.68) * Math.PI) * spec.sway;
    const x = startX + (targetX - startX) * eased + arc;
    const y = startY + (targetY - startY) * eased - Math.sin(Math.min(1, local / 0.68) * Math.PI) * 80;
    const launchAlpha = local < 0.72 ? Math.sin(clamp(local / 0.72, 0, 1) * Math.PI) : 0;
    if (launchAlpha > 0.01) {
      for (let t = 1; t <= 5; t += 1) {
        const trailT = Math.max(0, local - t * 0.045);
        const trailE = runStartEaseOutCubic(Math.min(trailT, 0.68) / 0.68);
        const trailArc = Math.sin(Math.min(1, trailT / 0.68) * Math.PI) * spec.sway;
        const tx = startX + (targetX - startX) * trailE + trailArc;
        const ty = startY + (targetY - startY) * trailE - Math.sin(Math.min(1, trailT / 0.68) * Math.PI) * 80;
        const tailAlpha = launchAlpha * (1 - t / 6);
        ctx.strokeStyle = t % 2 === 0 ? spec.color2 : spec.color;
        ctx.globalAlpha = tailAlpha * 0.38;
        ctx.lineWidth = Math.max(1, spec.size * (1.7 - t * 0.18));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      const glow = ctx.createRadialGradient(x, y, 0, x, y, spec.size * 9);
      glow.addColorStop(0, runStartColorAlpha(spec.coreColor, launchAlpha * 0.54));
      glow.addColorStop(0.35, runStartColorAlpha(spec.color, launchAlpha * 0.24));
      glow.addColorStop(1, runStartColorAlpha(spec.color2, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, spec.size * 9, 0, Math.PI * 2);
      ctx.fill();
      drawRunStartStar(x, y, spec.size * 2.7, spec.starPoints, spec.spin + local * 10, spec.coreColor, launchAlpha);
    }
    if (local > 0.54) {
      const burstT = clamp((local - 0.54) / 0.46, 0, 1);
      const burstEase = runStartEaseOutCubic(burstT);
      const burstAlpha = Math.max(0, Math.pow(1 - burstT, 1.4));
      const shellR = spec.shellRadius * burstEase;
      const smokeAlpha = Math.max(0, (1 - burstT) * 0.18);
      if (smokeAlpha > 0.005) {
        const smoke = ctx.createRadialGradient(x, y, shellR * 0.2, x, y, shellR * 1.45 + 24);
        smoke.addColorStop(0, `rgba(226,232,240,${smokeAlpha.toFixed(3)})`);
        smoke.addColorStop(0.45, `rgba(148,163,184,${(smokeAlpha * 0.35).toFixed(3)})`);
        smoke.addColorStop(1, 'rgba(15,23,42,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = smoke;
        ctx.beginPath();
        ctx.arc(x, y, shellR * 1.45 + 24, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let ring = 0; ring < spec.ringCount; ring += 1) {
        const ringR = shellR * (1 + ring * 0.28);
        ctx.globalAlpha = burstAlpha * (0.22 - ring * 0.045);
        ctx.strokeStyle = ring % 2 === 0 ? spec.color : spec.color2;
        ctx.lineWidth = Math.max(1, spec.size * (1.4 - ring * 0.22));
        ctx.beginPath();
        ctx.arc(x, y, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < spec.sparkCount; i += 1) {
        const a = spec.spin + (i / spec.sparkCount) * Math.PI * 2 + Math.sin(i * 7.13) * 0.13;
        const drift = 0.74 + (((i * 37) % 100) / 100) * 0.48;
        const dist = shellR * drift;
        const fall = spec.gravity * burstT * burstT * (0.35 + (i % 5) * 0.1);
        const sx = x + Math.cos(a) * dist;
        const sy = y + Math.sin(a) * dist + fall;
        const back = Math.max(4, spec.size * 3.8) * (1 - burstT * 0.55);
        const px = sx - Math.cos(a) * back;
        const py = sy - Math.sin(a) * back - fall * 0.12;
        const sparkColor = i % 3 === 0 ? spec.coreColor : (i % 2 === 0 ? spec.color2 : spec.color);
        ctx.strokeStyle = sparkColor;
        ctx.globalAlpha = burstAlpha * (0.42 + (i % 4) * 0.08);
        ctx.lineWidth = Math.max(0.8, spec.size * (0.72 - burstT * 0.22));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        if ((i + Math.floor(elapsed * 0.02)) % 5 === 0 && burstT < spec.crackle) {
          drawRunStartStar(sx, sy, spec.size * (1.6 + (i % 3) * 0.32), 5, a + elapsed * 0.018, sparkColor, burstAlpha * 0.78);
        } else {
          ctx.globalAlpha = burstAlpha * 0.66;
          ctx.fillStyle = sparkColor;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.9, spec.size * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  const impactT = clamp((elapsed - 620) / 680, 0, 1);
  if (impactT > 0 && impactT < 1) {
    const a = Math.sin(impactT * Math.PI);
    const r = Math.max(canvas.width, canvas.height) * (0.12 + impactT * 0.48);
    const flash = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.5, 0, canvas.width * 0.5, canvas.height * 0.5, r);
    flash.addColorStop(0, `rgba(255, 255, 255, ${(0.34 * a).toFixed(3)})`);
    flash.addColorStop(0.35, `rgba(250, 204, 21, ${(0.18 * a).toFixed(3)})`);
    flash.addColorStop(1, 'rgba(248, 113, 113, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = flash;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();
}

window.cwBeginRunStartLoading = beginRunStartLoading;
window.cwCancelRunStartLoading = cancelRunStartLoading;
window.cwMarkRunStartFirstStateReady = markRunStartFirstStateReady;

function getQ() {
  return QUALITY[game.qualityKey] || QUALITY.medium;
}

function hashGroundSeed(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createGroundRng(seed) {
  let state = (Number(seed) || 0) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillGroundNoise(g, size, count, colors, radiusMin = 2, radiusMax = 6, alphaMul = 1, rng = Math.random) {
  const palette = Array.isArray(colors) ? colors.filter(Boolean) : [];
  if (palette.length <= 0) return;
  const random = typeof rng === 'function' ? rng : Math.random;
  for (let i = 0; i < count; i += 1) {
    const color = palette[i % palette.length];
    const x = random() * size;
    const y = random() * size;
    const r = radiusMin + random() * Math.max(0.1, radiusMax - radiusMin);
    g.fillStyle = color;
    g.globalAlpha = alphaMul * (0.22 + random() * 0.32);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

function getGroundMaterialTheme(material) {
  const materials = {
    asphalt_wet: {
      tint: 'rgba(22, 28, 34, 0.34)',
      stroke: 'rgba(148, 163, 184, 0.06)',
      spots: ['#111827', '#1f2937', '#334155'],
      clouds: ['rgba(71, 85, 105, 0.12)', 'rgba(15, 23, 42, 0.08)', 'rgba(148, 163, 184, 0.05)'],
      macro: [],
      baseFill: '#2a3036',
    },
    asphalt: {
      tint: 'rgba(28, 34, 40, 0.26)',
      stroke: 'rgba(148, 163, 184, 0.055)',
      spots: ['#111827', '#1f2937', '#4b5563'],
      clouds: ['rgba(71, 85, 105, 0.1)', 'rgba(148, 163, 184, 0.05)'],
      macro: [],
      baseFill: '#353b41',
    },
    concrete: {
      tint: 'rgba(70, 79, 87, 0.2)',
      stroke: 'rgba(226, 232, 240, 0.065)',
      spots: ['#475569', '#64748b', '#94a3b8'],
      clouds: ['rgba(100, 116, 139, 0.1)', 'rgba(226, 232, 240, 0.04)'],
      macro: [],
      baseFill: '#535a61',
    },
    concrete_tiles: {
      tint: 'rgba(70, 79, 87, 0.22)',
      stroke: 'rgba(226, 232, 240, 0.065)',
      spots: ['#475569', '#64748b', '#94a3b8'],
      clouds: ['rgba(100, 116, 139, 0.1)', 'rgba(226, 232, 240, 0.04)'],
      macro: [],
      baseFill: '#535a61',
    },
    dirt: {
      tint: 'rgba(50, 34, 22, 0.56)',
      stroke: 'rgba(251, 191, 36, 0.04)',
      spots: ['#4a2c1d', '#6b3f28', '#7c4a2c'],
      clouds: ['rgba(123, 79, 44, 0.22)', 'rgba(79, 54, 31, 0.18)', 'rgba(146, 112, 64, 0.12)'],
      macro: ['rgba(102, 69, 40, 0.18)', 'rgba(60, 40, 22, 0.14)'],
    },
    grass: {
      tint: 'rgba(20, 36, 16, 0.34)',
      stroke: 'rgba(74, 222, 128, 0.04)',
      spots: ['#405228', '#4f652d', '#64743c'],
      clouds: ['rgba(87, 111, 49, 0.22)', 'rgba(116, 96, 58, 0.12)', 'rgba(57, 78, 34, 0.18)'],
      macro: ['rgba(92, 118, 52, 0.18)', 'rgba(83, 68, 38, 0.14)'],
    },
    toxic: {
      tint: 'rgba(22, 52, 18, 0.42)',
      stroke: 'rgba(190, 242, 100, 0.12)',
      spots: ['#65a30d', '#84cc16', '#bef264'],
      clouds: ['rgba(132, 204, 22, 0.18)', 'rgba(190, 242, 100, 0.12)', 'rgba(61, 94, 16, 0.18)'],
      macro: ['rgba(132, 204, 22, 0.18)', 'rgba(217, 249, 157, 0.14)'],
    },
  };
  return materials[material] || materials.asphalt_wet;
}

function paintGroundClouds(g, size, colors, rng, count, alphaMul = 1) {
  const palette = Array.isArray(colors) ? colors.filter(Boolean) : [];
  if (palette.length <= 0) return;
  const random = typeof rng === 'function' ? rng : Math.random;
  for (let i = 0; i < count; i += 1) {
    const color = palette[i % palette.length];
    const x = random() * size;
    const y = random() * size;
    const rx = size * (0.12 + random() * 0.2);
    const ry = rx * (0.58 + random() * 0.7);
    g.save();
    g.translate(x, y);
    g.rotate(random() * Math.PI * 2);
    g.scale(1, ry / Math.max(1, rx));
    const gradient = g.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = alphaMul * (0.3 + random() * 0.34);
    g.fillStyle = gradient;
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.globalAlpha = 1;
}

function drawGroundSourceTexture(g, size, material, rng) {
  const theme = getGroundMaterialTheme(material);
  const organic = material === 'grass' || material === 'dirt' || material === 'toxic';
  if (!organic) {
    g.fillStyle = theme.baseFill || '#30363d';
    g.fillRect(0, 0, size, size);
    return;
  }
  if (!(sprites.ground.complete && sprites.ground.naturalWidth > 0)) {
    g.fillStyle = '#25301e';
    g.fillRect(0, 0, size, size);
    return;
  }
  const half = size * 0.5;
  const drawQuarter = (destX, destY, flipX, flipY) => {
    g.save();
    g.translate(destX + half * 0.5, destY + half * 0.5);
    g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    g.drawImage(sprites.ground, -half * 0.5, -half * 0.5, half, half);
    g.restore();
  };
  drawQuarter(0, 0, false, false);
  drawQuarter(half, 0, true, false);
  drawQuarter(0, half, false, true);
  drawQuarter(half, half, true, true);
}

function buildGroundMaterialTile(material, size, variantIndex = 0) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  const rng = createGroundRng(hashGroundSeed(`tile:${material}:${size}:${variantIndex}`));
  const theme = getGroundMaterialTheme(material);

  drawGroundSourceTexture(g, size, material, rng);

  g.fillStyle = theme.tint;
  g.fillRect(0, 0, size, size);
  paintGroundClouds(
    g,
    size,
    theme.clouds,
    rng,
    material === 'grass' || material === 'dirt' ? 8 : 5,
    material === 'grass' ? 0.62 : 0.48,
  );
  fillGroundNoise(
    g,
    size,
    material === 'toxic' ? 18 : (material === 'grass' || material === 'dirt' ? 36 : 24),
    theme.spots,
    2,
    material === 'grass' ? 8 : 6,
    material === 'grass' ? 0.42 : 0.24,
    rng,
  );

  if (material === 'concrete') {
    g.strokeStyle = 'rgba(226, 232, 240, 0.045)';
    g.lineWidth = Math.max(1, size * 0.01);
    for (let i = 0; i < 4; i += 1) {
      const startX = rng() * size * 0.9;
      const startY = rng() * size;
      const len = size * (0.14 + rng() * 0.24);
      g.beginPath();
      g.moveTo(startX, startY);
      g.lineTo(startX + len, startY + (rng() - 0.5) * size * 0.08);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 3; i += 1) {
      const x = rng() * size * 0.8;
      const y = rng() * size * 0.8;
      const w = size * (0.12 + rng() * 0.18);
      const h = size * (0.06 + rng() * 0.1);
      g.fillRect(x, y, w, h);
    }
  } else if (material === 'concrete_tiles') {
    g.strokeStyle = theme.stroke;
    g.lineWidth = Math.max(1, size * 0.012);
    for (let i = 0; i < 3; i += 1) {
      const y = ((i + 1) / 4) * size + (rng() * size * 0.05 - size * 0.025);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(size, y + (rng() * size * 0.04 - size * 0.02));
      g.stroke();
    }
    g.strokeStyle = 'rgba(241, 245, 249, 0.08)';
    g.lineWidth = Math.max(1, size * 0.018);
    g.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);
  } else if (material === 'asphalt' || material === 'asphalt_wet') {
    g.strokeStyle = theme.stroke;
    g.lineWidth = Math.max(1, size * 0.01);
    for (let i = 0; i < 2; i += 1) {
      const y = ((i + 1) / 3) * size + (rng() * size * 0.06 - size * 0.03);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(size, y + (rng() * size * 0.05 - size * 0.025));
      g.stroke();
    }
  } else if (material === 'toxic') {
    g.globalCompositeOperation = 'lighter';
    fillGroundNoise(g, size, 12, ['#d9f99d', '#bef264'], 5, 14, 0.22, rng);
    g.globalCompositeOperation = 'source-over';
  }

  return c;
}

function buildGroundMacroStamp(material, size, variantIndex = 0) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const rng = createGroundRng(hashGroundSeed(`macro:${material}:${size}:${variantIndex}`));
  const theme = getGroundMaterialTheme(material);
  paintGroundClouds(
    g,
    size,
    theme.macro,
    rng,
    material === 'grass' || material === 'dirt' ? 10 : 7,
    material === 'grass' || material === 'dirt' ? 0.86 : 0.72,
  );
  if (material === 'grass' || material === 'dirt' || material === 'toxic') {
    fillGroundNoise(g, size, 18, theme.spots, 4, size * 0.05, 0.08, rng);
  }
  return c;
}

function buildGroundMaterialSet(material, size) {
  const soft = material === 'grass' || material === 'dirt' || material === 'toxic';
  const variantCount = soft ? 1 : 3;
  const macroCount = soft ? 3 : 0;
  const macroSize = Math.max(196, Math.round(size * (soft ? 2.2 : 1.9)));
  return {
    salt: hashGroundSeed(`material:${material}`),
    variants: Array.from({ length: variantCount }, (_, index) => buildGroundMaterialTile(material, size, index)),
    macroStamps: Array.from({ length: macroCount }, (_, index) => buildGroundMacroStamp(material, macroSize, index)),
  };
}

function rebuildGroundTile() {
  visuals.groundTileCanvas = null;
  visuals.groundTiles = {};
  if (!getQ().groundTexture) return;

  const size = getQ().groundTileSize;
  const materials = ['asphalt_wet', 'asphalt', 'concrete', 'concrete_tiles', 'dirt', 'grass', 'toxic'];
  for (const material of materials) {
    visuals.groundTiles[material] = buildGroundMaterialSet(material, size);
  }
  visuals.groundTileCanvas = visuals.groundTiles.asphalt_wet?.variants?.[0] || null;
  visuals.groundTileSize = size;
}

sprites.ground.addEventListener('load', rebuildGroundTile);
for (const v of PLAYER_VARIANTS) {
  sprites.players[v.id].addEventListener('load', () => { if (typeof globalThis.renderCharacterPicker === 'function') globalThis.renderCharacterPicker(); });
}
rebuildGroundTile();

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

function setShowCompanionNamesEnabled(enabled) {
  game.showCompanionNamesEnabled = Boolean(enabled);
  if (showCompanionNamesToggleEl) showCompanionNamesToggleEl.checked = game.showCompanionNamesEnabled;
  localStorage.setItem('cw:showCompanionNamesEnabled', game.showCompanionNamesEnabled ? '1' : '0');
}

showCompanionNamesToggleEl?.addEventListener('change', () => {
  setShowCompanionNamesEnabled(showCompanionNamesToggleEl.checked);
});
setShowCompanionNamesEnabled(game.showCompanionNamesEnabled);

function setShowCompanionReserveAmmoEnabled(enabled) {
  game.showCompanionReserveAmmoEnabled = Boolean(enabled);
  if (showCompanionReserveToggleEl) showCompanionReserveToggleEl.checked = game.showCompanionReserveAmmoEnabled;
  localStorage.setItem('cw:showCompanionReserveAmmoEnabled', game.showCompanionReserveAmmoEnabled ? '1' : '0');
}

showCompanionReserveToggleEl?.addEventListener('change', () => {
  setShowCompanionReserveAmmoEnabled(showCompanionReserveToggleEl.checked);
});
setShowCompanionReserveAmmoEnabled(game.showCompanionReserveAmmoEnabled);

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

function setShowChatEnabled(enabled) {
  game.showChatEnabled = Boolean(enabled);
  if (showChatToggleEl) showChatToggleEl.checked = game.showChatEnabled;
  localStorage.setItem('cw:showChatEnabled', game.showChatEnabled ? '1' : '0');
  if (!game.showChatEnabled && chatInputEl && document.activeElement === chatInputEl) chatInputEl.blur();
  updateHudVisibility(getComputedStyle(joinOverlay).display !== 'none');
}

showChatToggleEl?.addEventListener('change', () => {
  setShowChatEnabled(showChatToggleEl.checked);
});
setShowChatEnabled(game.showChatEnabled);

function setGameSfxEnabled(enabled) {
  game.sfxEnabled = Boolean(enabled);
  if (gameSfxToggleEl) gameSfxToggleEl.checked = game.sfxEnabled;
  localStorage.setItem('cw:sfxEnabled', game.sfxEnabled ? '1' : '0');
  if (game.sfxEnabled) unlockGameAudio();
}

function applyGameSfxEnabled(enabled, { persist = true, unlock = true } = {}) {
  game.sfxEnabled = Boolean(enabled);
  if (gameSfxToggleEl) gameSfxToggleEl.checked = game.sfxEnabled;
  if (persist) localStorage.setItem('cw:sfxEnabled', game.sfxEnabled ? '1' : '0');
  if (game.sfxEnabled && unlock) unlockGameAudio();
}

function setGameSfxVolume(percent) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  game.sfxVolume = value / 100;
  localStorage.setItem('cw:sfxVolume', String(value));
  if (gameSfxVolumeEl) gameSfxVolumeEl.value = String(value);
  if (gameSfxVolumeValueEl) gameSfxVolumeValueEl.textContent = `${value}%`;
  if (gameAudio.master) gameAudio.master.gain.value = 0.6 * game.sfxVolume;
}

function applyGameSfxVolume(percent, { persist = true } = {}) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  game.sfxVolume = value / 100;
  if (persist) localStorage.setItem('cw:sfxVolume', String(value));
  if (gameSfxVolumeEl) gameSfxVolumeEl.value = String(value);
  if (gameSfxVolumeValueEl) gameSfxVolumeValueEl.textContent = `${value}%`;
  if (gameAudio.master) gameAudio.master.gain.value = 0.6 * game.sfxVolume;
}

window.cwSetGameSfxEnabled = setGameSfxEnabled;
window.cwSetGameSfxVolume = setGameSfxVolume;
window.cwApplyLiveSfxState = (volume, muted = false, unlock = false) => {
  const normalizedVolume = Math.max(0, Math.min(1, Number(volume) || 0));
  const effectiveVolume = muted ? 0 : normalizedVolume;
  game.liveAudioEnabled = effectiveVolume > 0;
  applyGameSfxVolume(Math.round(effectiveVolume * 100), { persist: false });
  applyGameSfxEnabled(effectiveVolume > 0, { persist: false, unlock: Boolean(unlock) });
  if (unlock && effectiveVolume > 0) unlockGameAudio();
};

function getGameSfxVolume() {
  const value = Number(game.sfxVolume);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.7;
}

function getGameAudioContext() {
  if (!game.sfxEnabled || typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!gameAudio.ctx) {
    gameAudio.ctx = new AudioContextCtor();
    gameAudio.master = gameAudio.ctx.createGain();
    gameAudio.master.gain.value = 0.6 * getGameSfxVolume();
    gameAudio.master.connect(gameAudio.ctx.destination);
  }
  return gameAudio.ctx;
}

function unlockGameAudio() {
  const ctxAudio = getGameAudioContext();
  if (!ctxAudio) return;
  if (ctxAudio.state === 'suspended') {
    void ctxAudio.resume().catch(() => {});
  }
  gameAudio.unlocked = true;
  warmupSfxAssets();
}

window.cwUnlockGameAudio = unlockGameAudio;

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const payload = event.data;
  if (!payload || payload.type !== 'cw-live-audio-control') return;
  const volume = Math.max(0, Math.min(1, Number(payload.volume) || 0));
  const muted = Boolean(payload.muted);
  window.cwApplyLiveSfxState(volume, muted, Boolean(payload.unlock));
});

function sfxDistanceGain(x, y, radius = 760) {
  const me = game.state?.players?.find((p) => p.id === game.myId) || null;
  if (!me || game.spectating) return 0.78;
  const dist = Math.hypot((Number(x) || 0) - (Number(me.x) || 0), (Number(y) || 0) - (Number(me.y) || 0));
  return Math.max(0.08, Math.min(1, 1 - (dist / Math.max(160, radius))));
}

function makeSfxEnvelope(ctxAudio, when, volume, attack = 0.006, decay = 0.18) {
  const gain = ctxAudio.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  gain.connect(gameAudio.master || ctxAudio.destination);
  return gain;
}

function playTone(freq, duration, {
  type = 'sine',
  volume = 0.18,
  pitchTo = 0,
  delay = 0,
  attack = 0.006,
  decay = null,
} = {}) {
  const ctxAudio = getGameAudioContext();
  if (!ctxAudio || !gameAudio.unlocked || ctxAudio.state === 'suspended') return;
  const now = ctxAudio.currentTime + Math.max(0, Number(delay) || 0);
  const osc = ctxAudio.createOscillator();
  const gain = makeSfxEnvelope(ctxAudio, now, volume, attack, decay ?? Math.max(0.035, duration - attack));
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, freq), now);
  if (pitchTo > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, pitchTo), now + Math.max(0.02, duration));
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + Math.max(0.03, duration) + 0.03);
}

function playNoise(duration, {
  volume = 0.16,
  delay = 0,
  filter = 900,
  filterType = 'lowpass',
  attack = 0.003,
} = {}) {
  const ctxAudio = getGameAudioContext();
  if (!ctxAudio || !gameAudio.unlocked || ctxAudio.state === 'suspended') return;
  const len = Math.max(1, Math.floor(ctxAudio.sampleRate * Math.max(0.025, duration)));
  const buffer = ctxAudio.createBuffer(1, len, ctxAudio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctxAudio.createBufferSource();
  const biquad = ctxAudio.createBiquadFilter();
  const now = ctxAudio.currentTime + Math.max(0, Number(delay) || 0);
  const gain = makeSfxEnvelope(ctxAudio, now, volume, attack, Math.max(0.035, duration - attack));
  src.buffer = buffer;
  biquad.type = filterType;
  biquad.frequency.setValueAtTime(Math.max(60, filter), now);
  src.connect(biquad);
  biquad.connect(gain);
  src.start(now);
  src.stop(now + Math.max(0.03, duration) + 0.03);
}

function sfxRange(prefix, start, end, pad = 2, suffix = '.ogg') {
  const out = [];
  for (let i = start; i <= end; i += 1) out.push(`${prefix}${String(i).padStart(pad, '0')}${suffix}`);
  return out;
}

function sfxJoin(...lists) {
  return lists.flat().filter(Boolean);
}

const SFX_ROOT = '/assets/sfx';
const SFX_COLLECTIONS = {
  buttons: sfxRange(`${SFX_ROOT}/sfx-pack-button_sfx/v1/Buttons/ogg/buttonsound_`, 1, 100),
  gunshot: sfxRange(`${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_`, 6, 24),
  gunEmpty: sfxRange(`${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunempty/ogg/gunempty_`, 1, 17),
  gunReload: sfxRange(`${SFX_ROOT}/sfx-pack-gun_sfx/v1/reload/ogg/reload_`, 1, 19),
  gunReady: sfxRange(`${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunready/ogg/gunready_`, 1, 17),
  gunToggles: sfxRange(`${SFX_ROOT}/sfx-pack-gun_sfx/v1/guntoggles/ogg/guntoggles_`, 1, 16),
  shellCasings: sfxRange(`${SFX_ROOT}/sfx-pack-gun_sfx/v1/shellcasings/ogg/shellcasings_`, 1, 20),
  zombieAgro: sfxRange(`${SFX_ROOT}/sfx-pack-zombie_sfx/v1/agro/ogg/agro_`, 1, 17),
  zombieGrowls: sfxRange(`${SFX_ROOT}/sfx-pack-zombie_sfx/v1/Growls/ogg/growls_`, 1, 10),
  zombieHowls: sfxRange(`${SFX_ROOT}/sfx-pack-zombie_sfx/v1/howls/ogg/howls_`, 1, 10),
  zombieIdle: sfxRange(`${SFX_ROOT}/sfx-pack-zombie_sfx/v1/idle/ogg/idle_`, 1, 11),
  zombieMisc: sfxRange(`${SFX_ROOT}/sfx-pack-zombie_sfx/v1/misc/ogg/misc_`, 1, 24),
  radioSignals: sfxRange(`${SFX_ROOT}/sfx-pack-radio_sfx/v1/ham_radio_signals/ogg/ham_radio_signals_`, 1, 7),
  radioVoices: sfxRange(`${SFX_ROOT}/sfx-pack-radio_sfx/v1/Radio_static_with_Voices/ogg/Radio_static_with_Voices_`, 1, 12),
  pistolDesigned: [
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedGunshot_Pistol1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedGunshot_Pistol2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedGunshot_Pistol3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedGunshot_Pistol4.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedGunshot_Pistol1_Reverb.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedGunshot_Pistol2_Reverb.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedGunshot_Pistol3_Reverb.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedGunshot_Pistol4_Reverb.ogg`,
  ],
  punches: [
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedPunch1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedPunch2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedPunch3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Combat/DesignedPunch4.ogg`,
  ],
  playerInjured: [
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanInjured1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanInjured2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanInjured3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanInjured4.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanInjured5.ogg`,
  ],
  playerBreath: [
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanBreathingOut1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanBreathingOut2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanBreathingOut3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanBreathingOut4.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanExhausted1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Human/HumanCough1.ogg`,
  ],
  clothes: [
    `${SFX_ROOT}/Survival Effects ogg/Clothing/ClothesRubberMovement1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Clothing/ClothesRubberMovement2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Clothing/ClothesRubberMovement3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Clothing/ClothesSyntheticfabric1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Clothing/ClothesSyntheticfabric2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Clothing/ClothesSyntheticfabric3.ogg`,
  ],
  medicine: [
    `${SFX_ROOT}/Survival Effects ogg/Medicine/Bandage1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Medicine/BlisterPack1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Medicine/BlisterPack2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Medicine/BlisterPack3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Medicine/PillsBox1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Medicine/PillsBox2.ogg`,
  ],
  food: [
    `${SFX_ROOT}/Survival Effects ogg/Food/EatingFood1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/EatingFood2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/EatingFood3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingDriedSoupBox1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingDriedSoupBox2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingNoodles1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingNoodles2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingNoodles3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingNoodles4.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingWaterBottle1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingWaterBottle2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/FoodPackagingWaterBottle3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/SmallGlassBottles1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Food/SmallGlassBottles2.ogg`,
  ],
  equipmentHandling: [
    `${SFX_ROOT}/Survival Effects ogg/Equipment/DesignedGunSoundHandling1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/DesignedGunSoundHandling2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/DesignedGunSoundHandling3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/DesignedGunSoundHandling4.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/DesignedGunSoundReload1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/DesignedGunSoundReload2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/DesignedGunSoundReload3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/DesignedGunSoundReload4.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/LargeBagHandling1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/LargeBagHandling2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/LargeBagHandling3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/LargeBagZip1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/LargeBagZip2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/PaperDocument1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/PaperDocument2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/PaperDocument3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/PlasticBagHandling1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/PlasticBagHandling2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/PlasticBagHandling3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/PlasticBox1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/PlasticBox2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/MatchHandling1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/MatchHandling2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/MatchLight1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/MatchLight2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/MatchStrike1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/MatchStrike2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/MatchStrike3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/FirelighterPackaging1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Equipment/FirelighterPackaging2.ogg`,
  ],
  environmentLight: [
    `${SFX_ROOT}/Survival Effects ogg/Environment/SwitchButton1_On.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/SwitchButton2_On.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/SwitchButton3_On.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/WaterSplash1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/WaterSplash2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/GrassRip1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/GrassRip2.ogg`,
  ],
  environmentHeavy: [
    `${SFX_ROOT}/Survival Effects ogg/Environment/GateWoodChain1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/GateWoodChain2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/GateWoodChain3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/Gravelfall1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/Gravelfall2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/Gravelfall3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/Rockfall1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/Rockfall2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/Rockfall3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/MetalCabinet1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/OldDoorOpen.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/OldDoorClose.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/OldDoorCreak.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Environment/OldDoorOpenAndClose.ogg`,
  ],
  destruction: [
    `${SFX_ROOT}/Survival Effects ogg/Destruction/CardboardBoxRip1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/CardboardBoxRip2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/ClothRip1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/ClothRip2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/ClothRip3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/DesignedCarCrash1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/DesignedCarCrash2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/LargeGlassMirrorCrunch1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/LargeGlassMirrorCrunch2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/LargeGlassMirrorSmash1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/LargeGlassMirrorSmash2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/WoodSnap1.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/WoodSnap2.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/WoodSnap3.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/WoodSnap4.ogg`,
    `${SFX_ROOT}/Survival Effects ogg/Destruction/WoodSnap5.ogg`,
  ],
};

const SFX_ASSET_VARIANTS = {
  shot: {
    pistol: [
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_06.ogg`,
    ],
    smg: [
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_16.ogg`,
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_18.ogg`,
    ],
    shotgun: [
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_08.ogg`,
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_11.ogg`,
    ],
    sniper: [
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_14.ogg`,
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_15.ogg`,
    ],
    rocket: [
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_10.ogg`,
    ],
    default: [
      `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunshot/ogg/gunshot_06.ogg`,
    ],
  },
  weaponReload: [
    `${SFX_ROOT}/sfx-pack-gun_sfx/v1/gunready/ogg/gunready_08.ogg`,
  ],
};

function chooseSfxAssetUrl(name, options = {}) {
  const entry = SFX_ASSET_VARIANTS[name];
  if (!entry) return '';
  let list = Array.isArray(entry) ? entry : null;
  if (!list) {
    const enemyType = String(options.enemyType || '').toLowerCase();
    const weapon = String(options.weaponKey || '').toLowerCase();
    const key = entry[enemyType] ? enemyType
      : weapon.includes('shotgun') ? 'shotgun'
        : weapon.includes('sniper') ? 'sniper'
          : weapon.includes('smg') ? 'smg'
            : weapon.includes('rocket') ? 'rocket'
              : weapon.includes('pistol') ? 'pistol'
                : 'default';
    list = entry[key] || entry.default || [];
  }
  if (!list.length) return '';
  return list[Math.floor(Math.random() * list.length)] || '';
}

function warmupSfxAssets() {
  if (gameAudio.warmupStarted) return;
  gameAudio.warmupStarted = true;
  const urls = new Set();
  for (const entry of Object.values(SFX_ASSET_VARIANTS)) {
    if (Array.isArray(entry)) {
      for (const url of entry) urls.add(url);
    } else {
      for (const list of Object.values(entry)) {
        for (const url of list) urls.add(url);
      }
    }
  }
  for (const url of urls) {
    gameAudio.assetCache.set(url, url);
    void loadSfxAssetBuffer(url);
  }
}

function loadSfxAssetBuffer(url) {
  if (!url) return Promise.resolve(null);
  if (gameAudio.assetBufferCache.has(url)) return Promise.resolve(gameAudio.assetBufferCache.get(url) || null);
  if (gameAudio.assetBufferPromises.has(url)) return gameAudio.assetBufferPromises.get(url);
  const ctxAudio = getGameAudioContext();
  if (!ctxAudio) return Promise.resolve(null);
  const promise = fetch(url, { cache: 'force-cache' })
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((buf) => new Promise((resolve, reject) => {
      ctxAudio.decodeAudioData(buf.slice(0), resolve, reject);
    }))
    .then((audioBuffer) => {
      gameAudio.assetBufferCache.set(url, audioBuffer || null);
      gameAudio.assetBufferPromises.delete(url);
      return audioBuffer || null;
    })
    .catch(() => {
      gameAudio.assetBufferPromises.delete(url);
      return null;
    });
  gameAudio.assetBufferPromises.set(url, promise);
  return promise;
}

function playSfxAssetBuffer(url, volume, options = {}, onFail = null) {
  const ctxAudio = getGameAudioContext();
  if (!ctxAudio || !gameAudio.unlocked || ctxAudio.state === 'suspended') return false;
  const buffer = gameAudio.assetBufferCache.get(url);
  if (!buffer) {
    void loadSfxAssetBuffer(url);
    return false;
  }
  try {
    const voiceGroup = String(options.voiceGroup || 'default');
    const maxVoices = Math.max(1, Math.floor(Number(options.maxVoices) || 12));
    let group = gameAudio.activeVoicesByGroup.get(voiceGroup);
    if (!group) {
      group = new Set();
      gameAudio.activeVoicesByGroup.set(voiceGroup, group);
    }
    if (group.size >= maxVoices) return true;
    const source = ctxAudio.createBufferSource();
    const gain = ctxAudio.createGain();
    const rateMin = Number(options.rateMin);
    const rateMax = Number(options.rateMax);
    const lo = Number.isFinite(rateMin) ? rateMin : 0.98;
    const hi = Number.isFinite(rateMax) ? rateMax : 1.02;
    source.buffer = buffer;
    source.playbackRate.value = lo + Math.random() * Math.max(0.01, hi - lo);
    gain.gain.value = Math.max(0, Math.min(1, volume));
    source.connect(gain);
    gain.connect(gameAudio.master || ctxAudio.destination);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      group.delete(source);
      if (group.size <= 0) gameAudio.activeVoicesByGroup.delete(voiceGroup);
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
    source.addEventListener('ended', cleanup, { once: true });
    group.add(source);
    source.start();
    return true;
  } catch {
    if (typeof onFail === 'function') onFail();
    return false;
  }
}

function playSfxAssetUrl(url, volume, options = {}, onFail = null) {
  if (!url || !gameAudio.unlocked) return false;
  try {
    const voiceGroup = String(options.voiceGroup || 'default');
    const maxVoices = Math.max(1, Math.floor(Number(options.maxVoices) || 12));
    let group = gameAudio.activeVoicesByGroup.get(voiceGroup);
    if (!group) {
      group = new Set();
      gameAudio.activeVoicesByGroup.set(voiceGroup, group);
    }
    if (group.size >= maxVoices) return true;
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = Math.max(0, Math.min(1, volume));
    const rateMin = Number(options.rateMin);
    const rateMax = Number(options.rateMax);
    const lo = Number.isFinite(rateMin) ? rateMin : 0.94;
    const hi = Number.isFinite(rateMax) ? rateMax : 1.06;
    audio.playbackRate = lo + Math.random() * Math.max(0.01, hi - lo);
    let failed = false;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      group.delete(audio);
      if (group.size <= 0) gameAudio.activeVoicesByGroup.delete(voiceGroup);
      gameAudio.activeHtmlAudios.delete(audio);
      audio.pause();
      audio.removeAttribute('src');
      try { audio.load(); } catch {}
    };
    const failOnce = () => {
      if (failed) return;
      failed = true;
      cleanup();
      if (typeof onFail === 'function') onFail();
    };
    group.add(audio);
    gameAudio.activeHtmlAudios.add(audio);
    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', failOnce, { once: true });
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') promise.catch(failOnce);
    return true;
  } catch {
    if (typeof onFail === 'function') onFail();
    return false;
  }
}

function tryPlaySfxAsset(name, options, volume, onFail = null) {
  const url = chooseSfxAssetUrl(name, options);
  if (!url) return false;
  if (name === 'shot') {
    if (playSfxAssetBuffer(url, volume, options, onFail)) return true;
  }
  return playSfxAssetUrl(url, volume, options, onFail);
}

function playProceduralSfx(name, options, volume) {
  const weapon = String(options.weaponKey || '').toLowerCase();
  if (name === 'shot') {
    const isShotgun = weapon.includes('shotgun');
    const isSniper = weapon.includes('sniper');
    const isSmg = weapon.includes('smg');
    const base = isSniper ? 98 : isShotgun ? 124 : isSmg ? 205 : 176;
    playNoise(isSniper ? 0.11 : isShotgun ? 0.09 : 0.045, { volume: volume * (isSniper ? 0.34 : isShotgun ? 0.3 : 0.17), filter: isSniper ? 420 : isShotgun ? 760 : 1450 });
    playTone(base, isSniper ? 0.16 : 0.07, { type: 'square', volume: volume * (isSniper ? 0.18 : 0.1), pitchTo: base * 0.42 });
    if (isShotgun) playTone(64, 0.13, { type: 'sawtooth', volume: volume * 0.16, pitchTo: 38, delay: 0.012 });
    return;
  }
  if (name === 'enemyShot') {
    playNoise(0.075, { volume: volume * 0.2, filter: 1800, filterType: 'bandpass' });
    playTone(148, 0.09, { type: 'sawtooth', volume: volume * 0.12, pitchTo: 72 });
    playTone(520, 0.055, { type: 'triangle', volume: volume * 0.08, pitchTo: 310, delay: 0.008 });
    return;
  }
  if (name === 'weaponReload') {
    const isShotgun = weapon.includes('shotgun');
    const isSniper = weapon.includes('sniper');
    const isSmg = weapon.includes('smg');
    playNoise(isShotgun ? 0.11 : 0.07, { volume: volume * 0.11, filter: isSniper ? 620 : 1180, filterType: 'bandpass' });
    playTone(isSniper ? 150 : isSmg ? 260 : 210, isShotgun ? 0.13 : 0.09, { type: 'triangle', volume: volume * 0.08, pitchTo: isSniper ? 92 : 165 });
    playTone(isShotgun ? 92 : 420, 0.045, { type: 'square', volume: volume * 0.035, pitchTo: isShotgun ? 76 : 360, delay: isShotgun ? 0.08 : 0.045 });
    return;
  }
  if (name === 'enemyDeath') {
    playNoise(0.16, { volume: volume * 0.22, filter: 520 });
    playTone(132, 0.18, { type: 'sawtooth', volume: volume * 0.12, pitchTo: 58 });
    return;
  }
  if (name === 'bossDeath') {
    playNoise(0.55, { volume: volume * 0.52, filter: 360 });
    playTone(92, 0.72, { type: 'sawtooth', volume: volume * 0.36, pitchTo: 28 });
    playTone(46, 0.62, { type: 'triangle', volume: volume * 0.28, pitchTo: 24, delay: 0.08 });
    return;
  }
  if (name === 'bossSpawn' || name === 'bossPortal') {
    playTone(58, 0.72, { type: 'sawtooth', volume: volume * 0.25, pitchTo: 118 });
    playNoise(0.32, { volume: volume * 0.2, filter: 240 });
    return;
  }
  if (name === 'rocketExplosion') {
    playNoise(0.34, { volume: volume * 0.42, filter: 340 });
    playTone(74, 0.32, { type: 'sawtooth', volume: volume * 0.22, pitchTo: 34 });
    playTone(156, 0.16, { type: 'triangle', volume: volume * 0.12, pitchTo: 58, delay: 0.035 });
    return;
  }
  if (name === 'crystal' || name === 'levelup') {
    playTone(880, 0.12, { type: 'sine', volume: volume * 0.13, pitchTo: 1320 });
    playTone(1760, 0.16, { type: 'triangle', volume: volume * 0.08, pitchTo: 2480, delay: 0.035 });
    return;
  }
  if (name === 'skill') {
    playTone(392, 0.2, { type: 'triangle', volume: volume * 0.16, pitchTo: 784 });
    playTone(988, 0.22, { type: 'sine', volume: volume * 0.1, pitchTo: 1480, delay: 0.025 });
    playNoise(0.2, { volume: volume * 0.08, filter: 2200, filterType: 'highpass' });
    return;
  }
  if (name === 'skillDodge' || name === 'playerRespawn') {
    playNoise(0.11, { volume: volume * 0.11, filter: 1800, filterType: 'highpass' });
    playTone(520, 0.13, { type: 'triangle', volume: volume * 0.13, pitchTo: 980 });
    playTone(180, 0.12, { type: 'sine', volume: volume * 0.06, pitchTo: 92, delay: 0.018 });
    return;
  }
  if (name === 'weaponPickup' || name === 'uiOpen' || name === 'uiSuccess') {
    playTone(220, 0.12, { type: 'square', volume: volume * 0.14, pitchTo: 330 });
    playTone(660, 0.16, { type: 'triangle', volume: volume * 0.1, pitchTo: 990, delay: 0.045 });
    return;
  }
  if (name === 'playerHit' || name === 'uiError' || name === 'weaponEmpty') {
    playNoise(0.13, { volume: volume * 0.2, filter: 680 });
    playTone(116, 0.12, { type: 'sawtooth', volume: volume * 0.1, pitchTo: 72 });
    return;
  }
  if (name === 'playerDeath' || name === 'playerDowned') {
    playNoise(0.28, { volume: volume * 0.32, filter: 420 });
    playTone(154, 0.34, { type: 'sawtooth', volume: volume * 0.2, pitchTo: 38 });
    return;
  }
}

function playGameSfx(name, options = {}) {
  const replayAudio = Boolean(replayGame.active || options.replay);
  if (!game.sfxEnabled || (game.embedMode && !game.liveAudioEnabled && !replayAudio)) return;
  if (name !== 'shot' && name !== 'weaponReload') return;
  const normalized = { ...options };
  const weapon = String(normalized.weaponKey || '').toLowerCase();
  if (name === 'shot') {
    const isShotgun = weapon.includes('shotgun');
    const isSniper = weapon.includes('sniper');
    const isSmg = weapon.includes('smg');
    const isRocket = weapon.includes('rocket');
    normalized.voiceGroup = `shot:${weapon || 'default'}`;
    normalized.maxVoices = isSmg ? 48 : (isShotgun ? 12 : (isSniper ? 8 : (isRocket ? 6 : 18)));
    normalized.minGapMs = 0;
    normalized.volume = (Number(normalized.volume) || 1) * (isSmg ? 0.82 : (isShotgun ? 1 : (isSniper ? 0.94 : (isRocket ? 1.08 : 0.88))));
    normalized.rateMin = isSmg ? 0.98 : 0.94;
    normalized.rateMax = isSniper ? 0.99 : 1.03;
  } else if (name === 'weaponReload') {
    normalized.voiceGroup = 'reload:all';
    normalized.maxVoices = 6;
    normalized.minGapMs = 0;
    normalized.volume = (Number(normalized.volume) || 1) * 0.34;
    normalized.rateMin = 0.98;
    normalized.rateMax = 1.02;
  }
  const key = String(normalized.key || name || 'sfx');
  const nowMs = performance.now();
  const minGap = Math.max(0, Number(normalized.minGapMs) || 0);
  const lastAt = Math.max(0, Number(gameAudio.lastPlayedAt.get(key)) || 0);
  if (minGap > 0 && nowMs - lastAt < minGap) return;
  gameAudio.lastPlayedAt.set(key, nowMs);

  const distance = sfxDistanceGain(normalized.x, normalized.y, normalized.radius);
  const volume = Math.max(0, Math.min(1, (Number(normalized.volume) || 1) * distance * getGameSfxVolume()));
  if (volume <= 0.01) return;
  if (tryPlaySfxAsset(name, normalized, volume, null)) return;
}

window.cwPlaySfx = playGameSfx;
window.addEventListener('pointerdown', unlockGameAudio, { passive: true });
window.addEventListener('keydown', unlockGameAudio);
gameSfxToggleEl?.addEventListener('change', () => {
  setGameSfxEnabled(gameSfxToggleEl.checked);
});
gameSfxVolumeEl?.addEventListener('input', () => {
  setGameSfxVolume(gameSfxVolumeEl.value);
});
setGameSfxVolume(Math.round(getGameSfxVolume() * 100));
setGameSfxEnabled(game.sfxEnabled);

function setShowCommentatorEnabled(enabled) {
  game.showCommentatorEnabled = Boolean(enabled);
  if (showCommentatorToggleEl) showCommentatorToggleEl.checked = game.showCommentatorEnabled;
  localStorage.setItem('cw:showCommentatorEnabled', game.showCommentatorEnabled ? '1' : '0');
  updateHudVisibility(getComputedStyle(joinOverlay).display !== 'none');
}

showCommentatorToggleEl?.addEventListener('change', () => {
  setShowCommentatorEnabled(showCommentatorToggleEl.checked);
});
commentatorPanelCloseBtn?.addEventListener('click', () => {
  setShowCommentatorEnabled(false);
});
setShowCommentatorEnabled(game.showCommentatorEnabled);
window.setShowCommentatorEnabled = setShowCommentatorEnabled;

function syncCommentatorVoiceSettingToggle(enabled, disabled = false) {
  if (!(commentatorVoiceSettingToggleEl instanceof HTMLInputElement)) return;
  commentatorVoiceSettingToggleEl.checked = Boolean(enabled);
  commentatorVoiceSettingToggleEl.disabled = Boolean(disabled);
}

window.syncCommentatorVoiceSettingToggle = syncCommentatorVoiceSettingToggle;

commentatorVoiceSettingToggleEl?.addEventListener('change', () => {
  if (typeof window.setCommentatorVoiceEnabled === 'function') {
    window.setCommentatorVoiceEnabled(commentatorVoiceSettingToggleEl.checked);
  }
});

function updateReplayPlayerToggleVisibility() {
  if (!replayPlayerToggleWrapEl) return;
  replayPlayerToggleWrapEl.classList.toggle('hidden', !replayGame.active);
}

function setShowReplayPlayerEnabled(enabled) {
  game.showReplayPlayerEnabled = Boolean(enabled);
  if (replayPlayerToggleEl) replayPlayerToggleEl.checked = game.showReplayPlayerEnabled;
  localStorage.setItem('cw:showReplayPlayerEnabled', game.showReplayPlayerEnabled ? '1' : '0');
  updateHudVisibility(getComputedStyle(joinOverlay).display !== 'none');
}

replayPlayerToggleEl?.addEventListener('change', () => {
  setShowReplayPlayerEnabled(replayPlayerToggleEl.checked);
});
setShowReplayPlayerEnabled(game.showReplayPlayerEnabled);

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

function setShowAimStickEnabled(enabled) {
  game.showAimStickEnabled = Boolean(enabled);
  if (showAimStickToggleEl) showAimStickToggleEl.checked = game.showAimStickEnabled;
  localStorage.setItem('cw:showAimStickEnabled', game.showAimStickEnabled ? '1' : '0');
  updateAimStickVisibility();
}

showAimStickToggleEl?.addEventListener('change', () => {
  setShowAimStickEnabled(showAimStickToggleEl.checked);
});
setShowAimStickEnabled(game.showAimStickEnabled);

function setDynamicSticksEnabled(enabled) {
  game.dynamicSticksEnabled = Boolean(enabled);
  if (dynamicSticksToggleEl) dynamicSticksToggleEl.checked = game.dynamicSticksEnabled;
  localStorage.setItem('cw:dynamicSticksEnabled', game.dynamicSticksEnabled ? '1' : '0');
  if (mobileControlsEl) {
    mobileControlsEl.classList.toggle('dynamic-enabled', game.dynamicSticksEnabled);
    mobileControlsEl.classList.remove('sticks-ghost');
  }
}

dynamicSticksToggleEl?.addEventListener('change', () => {
  setDynamicSticksEnabled(dynamicSticksToggleEl.checked);
});
setDynamicSticksEnabled(game.dynamicSticksEnabled);

function getSafeCanvasViewportSize() {
  const rawWidth = Math.floor(Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 1280);
  const rawHeight = Math.floor(Number(window.innerHeight) || Number(document.documentElement?.clientHeight) || 720);
  let isFramed = false;
  try {
    isFramed = window.self !== window.top;
  } catch {
    isFramed = true;
  }
  const maxHeight = isFramed ? 920 : 2160;
  return {
    width: Math.max(320, Math.min(4096, rawWidth)),
    height: Math.max(360, Math.min(maxHeight, rawHeight)),
  };
}

function resizeCanvas() {
  const { width, height } = getSafeCanvasViewportSize();
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function setMobileControlsVisible(visible) {
  if (!mobileControlsEl) return;
  mobileControlsEl.classList.toggle('active', Boolean(visible));
  mobileControlsEl.classList.toggle('dynamic-enabled', game.dynamicSticksEnabled);
  mobileControlsEl.classList.remove('sticks-ghost');
  mobileControlsEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
}



function updateAimStickVisibility() {
  if (!aimStickEl) return;
  aimStickEl.hidden = !mobile.enabled || !game.showAimStickEnabled;
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
  fpsCornerEl.classList.toggle('hidden', menuOpen || game.embedMode || !game.showFpsEnabled);
}

function updateMinimapVisibility(overlayOpen = null) {
  if (!minimapWrapEl) return;
  const menuOpen = overlayOpen === null ? (getComputedStyle(joinOverlay).display !== 'none') : Boolean(overlayOpen);
  const minimapDisabled = !game.showMinimapEnabled;
  minimapWrapEl.classList.toggle('hidden', menuOpen || game.embedMode || minimapDisabled);
  if (toggleInfoBtn) toggleInfoBtn.classList.toggle('minimap-hidden', minimapDisabled);
}

function updateHudVisibility(overlayOpen) {
  const menuOpen = Boolean(overlayOpen);
  const showHudPanel = !menuOpen;
  const embedMode = Boolean(game.embedMode);
  canvas.classList.toggle('hidden', menuOpen);
  if (hudEl) hudEl.classList.toggle('menu-hidden', !showHudPanel || embedMode);
  if (toggleInfoBtn) toggleInfoBtn.classList.toggle('hidden', embedMode || !infoPanelHidden || menuOpen);
  const joinToggleInfoBtn = document.getElementById('join-toggle-info');
  if (joinToggleInfoBtn) joinToggleInfoBtn.classList.toggle('hidden', embedMode || !menuOpen || !infoPanelHidden);
  if (scoreboardEl) scoreboardEl.classList.toggle('hidden', menuOpen || embedMode);
  if (topCenterHudEl) topCenterHudEl.classList.toggle('hidden', menuOpen);
  if (commentatorPanelEl) commentatorPanelEl.classList.toggle('hidden', menuOpen || embedMode || !game.showCommentatorEnabled);
  if (bottomHudEl) bottomHudEl.classList.toggle('hidden', menuOpen);
  if (statsToggleBtn) statsToggleBtn.classList.toggle('hidden', menuOpen || embedMode);
  if (chatWrapEl) chatWrapEl.classList.toggle('hidden', menuOpen || embedMode || !game.showChatEnabled);
  if (menuOpen && chatInputEl && document.activeElement === chatInputEl) chatInputEl.blur();
  if (replayGameControlsEl) replayGameControlsEl.classList.toggle('hidden', menuOpen || embedMode || !replayGame.active || !game.showReplayPlayerEnabled);
  updateReplayPlayerToggleVisibility();
  if (menuOpen) {
    if (statsPanelEl) statsPanelEl.classList.add('hidden');
  } else {
    setStatsPanelOpen(statsPanelOpen);
  }
  if (menuOpen && levelupOverlayEl) levelupOverlayEl.classList.add('hidden');
  if (menuOpen) document.body.classList.remove('levelup-open');
  updateFpsCornerVisibility(menuOpen);
  updateMinimapVisibility(menuOpen);
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
  const replayMobile = mobile.enabled && replayGame.active;
  updateHudVisibility(overlayOpen);
  if (devConsoleToggleBtn) devConsoleToggleBtn.classList.toggle('hidden', !mobile.enabled);
  if (mobileControlsEl) mobileControlsEl.classList.toggle('replay-active', replayMobile);
  updateAimStickVisibility();

  if (!mobile.enabled) {
    setMobileControlsVisible(false);
    return;
  }
  setMobileControlsVisible(!overlayOpen);
}
