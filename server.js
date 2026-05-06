const path = require('path');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');
const express = require('express');
const Database = require('better-sqlite3');
const WebSocket = require('ws');

const { WebSocketServer } = WebSocket;

const config = require('./server/config');
const { getMapDef, getCampaignDef, getCampaignLevelDef, getMobDef, getMobDefs, getDefaultBossMobIdForMap } = require('./server/world-content');
const { createWorldContentStore } = require('./server/world-content-store');
const { createAdminAuthStore } = require('./server/admin-auth-store');
const { createPlayerAuthStore, normalizeNickname } = require('./server/player-auth-store');
const { createRecordsStore } = require('./server/records-store');
const { createRuntimeRegistryStore } = require('./server/runtime-registry-store');
const { createSkillsStore } = require('./server/skills-store');
const { createAccountProgressionStore } = require('./server/account-progression-store');
const { createNewsStore } = require('./server/news-store');
const { isMysqlStoreEnabled, createMysqlSyncClient, setMysqlSyncMonitor } = require('./server/mysql-sync');
const { createLeaderboardService } = require('./server/services/leaderboard-service');
const { registerLeaderboardRoutes } = require('./server/http/leaderboard-routes');
const { registerNewsRoutes } = require('./server/http/news-routes');
const { clamp, segmentIntersectsCircle, wrapAngleDelta } = require('./server/game/math');
const PORT = process.env.PORT || 8080;
const IS_PROD = process.env.NODE_ENV === 'production';

function envEnabled(name) {
  const value = (process.env[name] || '').toString().trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

const DEV_CHEATS_ENABLED = (process.env.DEV_CHEATS_ENABLED || '1') !== '0';
const DEV_CHEAT_SECRET = (process.env.DEV_CHEAT_SECRET || 'bloodmoon').toString().trim();
const ADMIN_BOOTSTRAP_LOGIN = process.env.ADMIN_BOOTSTRAP_LOGIN || 'WizardJIOCb';
const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || (IS_PROD ? '' : 'WizardJIOCb-local');
const ADMIN_SESSION_COOKIE = 'crimson_admin_session';
const PLAYER_SESSION_COOKIE = 'crimson_player_session';
const INSTANCE_ID = (process.env.INSTANCE_ID || `${require('os').hostname()}-${process.pid}`).toString().trim();
const SHUTDOWN_GRACE_MS = Math.max(1000, Number(process.env.SHUTDOWN_GRACE_MS) || 8000);
const RESTART_RETRY_MS = Math.max(1000, Number(process.env.RESTART_RETRY_MS) || 2500);
const PLAYER_RECONNECT_GRACE_MS = Math.max(5000, Number(process.env.PLAYER_RECONNECT_GRACE_MS) || 30000);
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || (IS_PROD ? '' : `http://localhost:${PORT}`)).toString().trim().replace(/\/+$/, '');
const SESSION_COOKIE_DOMAIN = (process.env.SESSION_COOKIE_DOMAIN || (IS_PROD ? '.rodion.pro' : '')).toString().trim();
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').toString().trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').toString().trim();
const GOOGLE_REDIRECT_URI = (process.env.GOOGLE_REDIRECT_URI || '').toString().trim();
const VK_CLIENT_ID = (process.env.VK_CLIENT_ID || '').toString().trim();
const VK_CLIENT_SECRET = (process.env.VK_CLIENT_SECRET || '').toString().trim();
const VK_REDIRECT_URI = (process.env.VK_REDIRECT_URI || '').toString().trim();
const VK_SERVICE_TOKEN = (process.env.VK_SERVICE_TOKEN || '').toString().trim();
const USE_MYSQL_STORE = isMysqlStoreEnabled();
const MYSQL_STORE = USE_MYSQL_STORE ? { enabled: true } : { enabled: false };
const CHAT_MAX_LEN = 180;
const CHAT_HISTORY_LIMIT = 50;
const CHAT_WELCOME_LIMIT = 30;
const CHAT_SPAM_WINDOW_MS = 8000;
const CHAT_SPAM_MAX_MESSAGES = 4;
const CHAT_SPAM_MUTE_MS = 15000;
const PARTNER_RUNS_START_SECRET = (process.env.PARTNER_RUNS_START_SECRET || '').toString().trim();
const PARTNER_RUNS_CALLBACK_BASE_URL = (process.env.PARTNER_RUNS_CALLBACK_BASE_URL || '').toString().trim().replace(/\/+$/, '');
const PARTNER_RUNS_CALLBACK_SECRET = (process.env.PARTNER_RUNS_CALLBACK_SECRET || '').toString().trim();
const PARTNER_RUNS_SESSION_TTL_MS = Math.max(60_000, Number(process.env.PARTNER_RUNS_SESSION_TTL_MS) || (30 * 60 * 1000));

const {
  MAIN_LOOP_RATE,
  MAIN_LOOP_MS,
  MAX_PLAYERS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAP_DEFS,
  CAMPAIGN_DEFS,
  PLAYER_RADIUS,
  ENEMY_RADIUS,
  BULLET_RADIUS,
  DROP_RADIUS,
  PLAYER_SPEED,
  PLAYER_MOVE_SPEED_GLOBAL_MUL,
  PLAYER_HP_MAX,
  PLAYER_DODGE_DISTANCE,
  PLAYER_DODGE_COOLDOWN_MS,
  PLAYER_DODGE_MAX_CHARGES,
  PLAYER_DODGE_INVULN_MS,
  PLAYER_RESPAWN_MODE,
  PLAYER_RESPAWN_DELAY_MS,
  PLAYER_RESPAWN_EXTRA_LIVES,
  PLAYER_RESPAWN_START_TOKENS,
  ENEMY_SPEED_MIN,
  ENEMY_SPEED_MAX,
  ENEMY_HP_BASE,
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_ATTACK_WINDUP_MS,
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_BASE_COOLDOWN_MS,
  ENEMY_ATTACK_MIN_COOLDOWN_MS,
  ENEMY_ATTACK_CAST_FREQUENCY,
  ENEMY_CHARGER_DASH_DISTANCE,
  ENEMY_RANGED_DAMAGE,
  ENEMY_RANGED_BULLET_SPEED,
  ENEMY_RANGED_BULLET_LIFE_MS,
  ENEMY_RANGED_FIRE_COOLDOWN_MS,
  ENEMY_RANGED_MIN_RANGE,
  ENEMY_RANGED_MAX_RANGE,
  ENEMY_HIT_STUN_MS,
  ENEMY_HIT_KNOCKBACK_SPEED,
  ENEMY_HIT_KNOCKBACK_FRICTION,
  ENEMY_SKILL_KNOCKBACK_BONUS,
  ENEMY_KNOCKBACK_BOSS_RESIST,
  ENEMY_KNOCKBACK_CHARGER_RESIST,
  BOSS_KILL_INTERVAL,
  BOSS_PORTAL_WARN_MS,
  BOSS_RADIUS,
  BOSS_SPRITE_SCALE,
  BOSS_HP_BASE,
  BOSS_SPEED,
  BOSS_ATTACK_DAMAGE,
  BOSS_ATTACK_WINDUP_MS,
  BOSS_ATTACK_COOLDOWN_MS,
  BOSS_DASH_DISTANCE,
  DIFFICULTY_STEP_SEC,
  DIFFICULTY_SPAWN_MIN_MS,
  DIFFICULTY_HP_PER_LEVEL,
  DIFFICULTY_SPEED_PER_LEVEL,
  DIFFICULTY_DAMAGE_PER_LEVEL,
  DIFFICULTY_ATTACK_RATE_PER_LEVEL,
  DIFFICULTY_SPAWN_REDUCTION_MS,
  XP_ORB_LIFETIME_MS,
  XP_ORB_PULL_SPEED,
  PLAYER_PICKUP_RADIUS_BASE,
  SKILL_PICK_OPTIONS,
  SKILL_OFFER_TTL_MS,
  SKILL_OFFER_PICKUP_RADIUS,
  SKILL_OFFER_SPAWN_MIN_DIST,
  SKILL_OFFER_SPAWN_MAX_DIST,
  PLAYER_SLOW_FACTOR,
  PLAYER_SLOW_DURATION_MS,
  DROP_LIFETIME_MS,
  TREE_COUNT,
  LEADERBOARD_LIMIT,
  LEADERBOARD_PAGE_SIZE,
  DATA_DIR,
  RECORDS_DB_PATH,
  SKILLS_CONFIG_PATH,
  WORLD_CONTENT_PATH,
  ADMIN_AUTH_DB_PATH,
  PLAYER_AUTH_DB_PATH,
  RUNTIME_REGISTRY_DB_PATH,
  DEFAULT_ROOM_SYNC,
  WEAPONS,
  DROP_WEAPON_KEYS,
  DEFAULT_SKILL_DEFS,
  ACCOUNT_BASE_HERO_ID,
  ACCOUNT_XP_BASE,
  ACCOUNT_XP_PER_LEVEL,
  ACCOUNT_XP_QUAD,
  ACCOUNT_XP_FROM_SCORE_MUL,
  ACCOUNT_XP_FROM_KILLS_MUL,
  ACCOUNT_XP_FROM_BOSS_KILLS_MUL,
  ACCOUNT_XP_FROM_SURVIVAL_SEC_MUL,
  ACCOUNT_SHARDS_FROM_SCORE_MUL,
  ACCOUNT_SHARDS_FROM_KILLS_MUL,
  ACCOUNT_SHARDS_FROM_BOSS_KILLS_MUL,
  ACCOUNT_SHARDS_FROM_SURVIVAL_SEC_MUL,
  ITEM_SALVAGE_START,
  ITEM_SLOT_DEFS,
  ITEM_DEFS,
  HERO_DEFS,
  HERO_LEVEL_CAP,
  HERO_XP_BASE,
  HERO_XP_PER_LEVEL,
  HERO_XP_QUAD,
  HERO_UNIQUE_SKILL_DEFS,
  HERO_SKILL_TREE_DEFS,
} = config;

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Crimson-Instance', INSTANCE_ID);
  next();
});
app.get('/', (req, res, next) => {
  const compatibilityParams = [
    'room',
    'mode',
    'tab',
    'news',
    'replay',
    'replayAt',
    'replayPath',
    'replayApiPath',
    't',
    'integrationToken',
    'integration_token',
    'heroId',
    'hero_id',
    'name',
  ];
  const shouldRedirectToPlay = compatibilityParams.some((key) => Object.prototype.hasOwnProperty.call(req.query || {}, key));
  if (shouldRedirectToPlay) {
    const search = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    res.redirect(302, `/play${search}`);
    return;
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/play', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'play.html'));
});
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', perMessageDeflate: false });

const rooms = new Map();
const activeSockets = new Set();
let isShuttingDown = false;
let shutdownStartedAt = 0;
let forceShutdownTimer = null;
const processStartedAt = Date.now();
const REPLAY_CAPTURE_INTERVAL_MS = Math.max(100, Number(process.env.REPLAY_CAPTURE_INTERVAL_MS) || 150);
const REPLAY_FRAME_LIMIT = 14400;
const REPLAY_CHAT_LIMIT = 240;
const REPLAY_BULLET_SAMPLE_LIMIT = Math.max(12, Number(process.env.REPLAY_BULLET_SAMPLE_LIMIT) || 40);
const REPLAY_DROP_SAMPLE_LIMIT = Math.max(8, Number(process.env.REPLAY_DROP_SAMPLE_LIMIT) || 28);
const REPLAY_XP_ORB_SAMPLE_LIMIT = Math.max(24, Number(process.env.REPLAY_XP_ORB_SAMPLE_LIMIT) || 96);
const COMPANION_SYNC_INTERVAL_MS = Math.max(80, Number(process.env.COMPANION_SYNC_INTERVAL_MS) || 220);
const WS_STATE_BACKPRESSURE_BYTES = Math.max(64 * 1024, Number(process.env.WS_STATE_BACKPRESSURE_BYTES) || (256 * 1024));
const XP_SURGE_DURATION_MS = 3200;
const XP_SURGE_PULL_MIN_MUL = 0.22;
const XP_SURGE_PULL_MAX_MUL = 3.9;
const XP_ORB_COLLECT_RADIUS = Math.max(12, Math.round(PLAYER_RADIUS * 0.9));
const XP_ORB_COLLECT_FINISH_MARGIN = Math.max(2, Math.round(PLAYER_RADIUS * 0.18));
const XP_ORB_PULL_SPEED_MUL = 1.16;
const XP_ORB_TARGET_SPEED_GRACE = Math.max(80, PLAYER_SPEED * PLAYER_MOVE_SPEED_GLOBAL_MUL * 0.45);
const XP_ORB_TARGET_SPEED_BONUS_MUL = 0.9;
const XP_ORB_TARGET_SPEED_MAX_BONUS = Math.max(260, XP_ORB_PULL_SPEED * 2.1);
const XP_ORB_TARGET_SPEED_CAP = Math.max(900, XP_ORB_PULL_SPEED * 3.4);
const partnerRunSessions = new Map();
const GOOGLE_OAUTH_STATE_COOKIE = 'cw_google_oauth_state';
const VK_OAUTH_STATE_COOKIE = 'cw_vk_oauth_state';
const VK_OAUTH_VERIFIER_COOKIE = 'cw_vk_oauth_verifier';
const RUNTIME_DIAG_ENABLED = envEnabled('RUNTIME_DIAG_ENABLED');
const RUNTIME_DIAG_LOG_PATH = String(process.env.RUNTIME_DIAG_LOG_PATH || (IS_PROD ? '/tmp/cw-runtime-diag.log' : '')).trim();
const RUNTIME_DIAG_SLOW_MS = Math.max(1, Number(process.env.RUNTIME_DIAG_SLOW_MS) || 18);
const RUNTIME_DIAG_PERIOD_MS = Math.max(1000, Number(process.env.RUNTIME_DIAG_PERIOD_MS) || 10000);
const RUNTIME_DIAG_STATE_BYTES = Math.max(1024, Number(process.env.RUNTIME_DIAG_STATE_BYTES) || (48 * 1024));
const RUNTIME_DIAG_BUFFERED_BYTES = Math.max(1024, Number(process.env.RUNTIME_DIAG_BUFFERED_BYTES) || WS_STATE_BACKPRESSURE_BYTES);
const runtimeDiagLastRoomLogAt = new Map();
const ADAPTIVE_STATE_SEND_ENABLED = (process.env.ADAPTIVE_STATE_SEND_ENABLED || '1') !== '0';
const REALTIME_STATIC_COLLECTION_RESEND_MS = Math.max(150, Number(process.env.REALTIME_STATIC_COLLECTION_RESEND_MS) || 900);
const REALTIME_XP_ORB_STATIC_RESEND_MS = Math.max(100, Number(process.env.REALTIME_XP_ORB_STATIC_RESEND_MS) || 280);
const REALTIME_XP_ORB_RADIUS = Math.max(240, Number(process.env.REALTIME_XP_ORB_RADIUS) || 960);
const REALTIME_XP_ORB_LIMIT = Math.max(24, Number(process.env.REALTIME_XP_ORB_LIMIT) || 96);
const REALTIME_BULLET_RADIUS = Math.max(320, Number(process.env.REALTIME_BULLET_RADIUS) || 1280);
const REALTIME_BULLET_LIMIT = Math.max(16, Number(process.env.REALTIME_BULLET_LIMIT) || 56);
const REALTIME_DROP_RADIUS = Math.max(240, Number(process.env.REALTIME_DROP_RADIUS) || 1100);
const REALTIME_DROP_LIMIT = Math.max(8, Number(process.env.REALTIME_DROP_LIMIT) || 40);

setMysqlSyncMonitor(USE_MYSQL_STORE ? {
  enabled: true,
  thresholdMs: Math.max(1, Number(process.env.MYSQL_SYNC_SLOW_MS) || 25),
  previewLimit: Math.max(120, Number(process.env.MYSQL_SYNC_PREVIEW_LIMIT) || 360),
  logPath: String(process.env.MYSQL_SYNC_LOG_PATH || (IS_PROD ? '/tmp/cw-mysql-wall.log' : '')).trim(),
  instanceId: INSTANCE_ID,
  shouldLog: () => hasActiveGameplay(),
} : null);

function normalizeGameMode(rawMode) {
  const mode = String(rawMode || '').trim().toLowerCase();
  if (mode === 'hardcore' || mode === 'pvp') return mode;
  return 'normal';
}

function randomHex(size = 24) {
  return crypto.randomBytes(Math.max(8, Math.floor(size))).toString('hex');
}

function buildUrlWithParams(baseUrl, params = {}) {
  const raw = String(baseUrl || '').trim();
  if (!raw) return '';
  const url = new URL(raw);
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function sanitizePartnerCallbackPath(rawPath) {
  const value = String(rawPath || '').trim();
  if (!value || value.includes('://')) return '';
  if (!value.startsWith('/')) return '';
  return value;
}

function requirePartnerRunsSecret(req, res, next) {
  if (!PARTNER_RUNS_START_SECRET) {
    res.status(503).json({ ok: false, message: 'Partner integration start secret is not configured' });
    return;
  }
  const headerSecret = String(req.headers['x-crimson-integration-secret'] || '').trim();
  const bearer = String(req.headers.authorization || '').trim();
  const bearerSecret = bearer.toLowerCase().startsWith('bearer ') ? bearer.slice(7).trim() : '';
  const suppliedSecret = headerSecret || bearerSecret;
  if (!suppliedSecret || suppliedSecret !== PARTNER_RUNS_START_SECRET) {
    res.status(401).json({ ok: false, message: 'Invalid integration secret' });
    return;
  }
  next();
}

function cleanupPartnerRunSessions(now = Date.now()) {
  for (const [token, session] of partnerRunSessions.entries()) {
    if (!session) {
      partnerRunSessions.delete(token);
      continue;
    }
    const expiresAt = Math.max(0, Number(session.expiresAt) || 0);
    const completedAt = Math.max(0, Number(session.completedAt) || 0);
    if ((expiresAt > 0 && expiresAt <= now) || completedAt > 0) {
      partnerRunSessions.delete(token);
    }
  }
}

function createPartnerRunSession(payload) {
  cleanupPartnerRunSessions();
  const createdAt = Date.now();
  const token = randomHex(18);
  const session = {
    token,
    createdAt,
    expiresAt: createdAt + PARTNER_RUNS_SESSION_TTL_MS,
    claimedAt: 0,
    completedAt: 0,
    partnerRunId: String(payload.partnerRunId || '').trim(),
    externalPlayerId: String(payload.externalPlayerId || '').trim(),
    playerName: normalizeNickname(payload.playerName || 'Fighter') || 'Fighter',
    heroId: String(payload.heroId || '').trim().toLowerCase() || ACCOUNT_BASE_HERO_ID,
    roomCode: cleanRoomCode(payload.roomCode || ''),
    gameMode: normalizeGameMode(payload.gameMode || 'normal'),
    pvpDurationMin: normalizePvpDurationMin(payload.pvpDurationMin),
    callbackPath: sanitizePartnerCallbackPath(payload.callbackPath || payload.rewardEndpointPath || ''),
    metadata: payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
      ? payload.metadata
      : {},
    requestedBy: String(payload.requestedBy || '').trim(),
  };
  partnerRunSessions.set(token, session);
  return session;
}

function consumePartnerRunSession(token, expectedRoomCode = '') {
  cleanupPartnerRunSessions();
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return null;
  const session = partnerRunSessions.get(cleanToken);
  if (!session) return null;
  if (session.completedAt || session.claimedAt) return null;
  const now = Date.now();
  if (session.expiresAt && session.expiresAt <= now) {
    partnerRunSessions.delete(cleanToken);
    return null;
  }
  const expectedCode = cleanRoomCodeForLookup(expectedRoomCode || '');
  if (expectedCode && expectedCode !== cleanRoomCodeForLookup(session.roomCode)) return null;
  session.claimedAt = now;
  return { ...session };
}

async function sendPartnerRunCompletion(target, payload) {
  const context = target?.partnerRunContext || null;
  if (!context || context.callbackSentAt) return;
  if (!PARTNER_RUNS_CALLBACK_BASE_URL || !context.callbackPath) return;

  const callbackUrl = new URL(context.callbackPath, PARTNER_RUNS_CALLBACK_BASE_URL).toString();
  context.callbackAttemptedAt = Date.now();

  const headers = {
    'Content-Type': 'application/json',
    'X-Crimson-Integration-Event': 'run.completed',
  };
  if (PARTNER_RUNS_CALLBACK_SECRET) {
    headers['X-Crimson-Integration-Secret'] = PARTNER_RUNS_CALLBACK_SECRET;
  }

  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    context.callbackStatus = response.status;
    context.callbackResponseOk = response.ok;
    context.callbackSentAt = Date.now();
  } catch (error) {
    context.callbackError = error?.message || 'Failed to send callback';
  } finally {
    const stored = partnerRunSessions.get(context.integrationToken);
    if (stored) {
      stored.completedAt = Date.now();
      partnerRunSessions.set(context.integrationToken, stored);
    }
  }
}

function normalizeRespawnMode(rawMode) {
  const mode = String(rawMode || '').trim().toLowerCase();
  if (mode === 'lives' || mode === 'token' || mode === 'none') return mode;
  return 'none';
}

function normalizePvpDurationMin(raw) {
  const value = Math.floor(Number(raw) || 0);
  if (PVP_MATCH_DURATION_OPTIONS_MIN.includes(value)) return value;
  return PVP_DEFAULT_MATCH_DURATION_MIN;
}

function getRoomMaxPlayers(gameMode) {
  return normalizeGameMode(gameMode) === 'pvp' ? PVP_MAX_PLAYERS : MAX_PLAYERS;
}

const RESPAWN_MODE = normalizeRespawnMode(process.env.PLAYER_RESPAWN_MODE || PLAYER_RESPAWN_MODE);
const RESPAWN_DELAY_MS = Math.max(0, Number(process.env.PLAYER_RESPAWN_DELAY_MS) || PLAYER_RESPAWN_DELAY_MS || 3000);
const RESPAWN_EXTRA_LIVES = Math.max(0, Math.floor(Number(process.env.PLAYER_RESPAWN_EXTRA_LIVES) || PLAYER_RESPAWN_EXTRA_LIVES || 0));
const RESPAWN_START_TOKENS = Math.max(0, Math.floor(Number(process.env.PLAYER_RESPAWN_START_TOKENS) || PLAYER_RESPAWN_START_TOKENS || 0));
const HARDCORE_ENEMY_SPAWN_MUL = 3;
const HARDCORE_ENEMY_HP_MUL = 2;
const PVP_MAX_PLAYERS = Math.max(MAX_PLAYERS, Math.floor(Number(process.env.PVP_MAX_PLAYERS) || 16));
const PVP_RESPAWN_DELAY_MS = Math.max(1000, Number(process.env.PVP_RESPAWN_DELAY_MS) || 2500);
const PVP_PLAYER_SCORE_KILL = Math.max(10, Number(process.env.PVP_PLAYER_SCORE_KILL) || 120);
const PVP_ENEMY_SPAWN_MUL = Math.max(0, Number(process.env.PVP_ENEMY_SPAWN_MUL) || 0.2);
const PVP_ENEMY_HP_MUL = Math.max(0.3, Number(process.env.PVP_ENEMY_HP_MUL) || 0.9);
const PVP_MATCH_DURATION_OPTIONS_MIN = [3, 5, 10, 15];
const PVP_DEFAULT_MATCH_DURATION_MIN = 10;
const adminAuthStore = createAdminAuthStore({
  dataDir: DATA_DIR,
  dbPath: ADMIN_AUTH_DB_PATH,
  bootstrapLogin: ADMIN_BOOTSTRAP_LOGIN,
  bootstrapPassword: ADMIN_BOOTSTRAP_PASSWORD,
  isProd: IS_PROD,
  mysql: MYSQL_STORE,
});
const playerAuthStore = createPlayerAuthStore({
  dataDir: DATA_DIR,
  dbPath: PLAYER_AUTH_DB_PATH,
  mysql: MYSQL_STORE,
});
const worldContentStore = createWorldContentStore({
  dataDir: DATA_DIR,
  filePath: WORLD_CONTENT_PATH,
  mysql: MYSQL_STORE,
});
const accountProgressionStore = createAccountProgressionStore({
  dataDir: DATA_DIR,
  dbPath: PLAYER_AUTH_DB_PATH,
  baseHeroId: ACCOUNT_BASE_HERO_ID,
  maps: MAP_DEFS,
  campaigns: CAMPAIGN_DEFS,
  heroDefs: HERO_DEFS,
  heroSkillTreeDefs: HERO_SKILL_TREE_DEFS,
  heroUniqueSkillDefs: HERO_UNIQUE_SKILL_DEFS,
  heroLevelCap: HERO_LEVEL_CAP,
  heroXpBase: HERO_XP_BASE,
  heroXpPerLevel: HERO_XP_PER_LEVEL,
  heroXpQuad: HERO_XP_QUAD,
  itemSalvageStart: ITEM_SALVAGE_START,
  itemSlotDefs: ITEM_SLOT_DEFS,
  itemDefs: ITEM_DEFS,
  xpBase: ACCOUNT_XP_BASE,
  xpPerLevel: ACCOUNT_XP_PER_LEVEL,
  xpQuad: ACCOUNT_XP_QUAD,
  xpFromScoreMul: ACCOUNT_XP_FROM_SCORE_MUL,
  xpFromKillsMul: ACCOUNT_XP_FROM_KILLS_MUL,
  xpFromBossKillsMul: ACCOUNT_XP_FROM_BOSS_KILLS_MUL,
  xpFromSurvivalSecMul: ACCOUNT_XP_FROM_SURVIVAL_SEC_MUL,
  shardsFromScoreMul: ACCOUNT_SHARDS_FROM_SCORE_MUL,
  shardsFromKillsMul: ACCOUNT_SHARDS_FROM_KILLS_MUL,
  shardsFromBossKillsMul: ACCOUNT_SHARDS_FROM_BOSS_KILLS_MUL,
  shardsFromSurvivalSecMul: ACCOUNT_SHARDS_FROM_SURVIVAL_SEC_MUL,
  mysql: MYSQL_STORE,
});
const runtimeRegistryStore = createRuntimeRegistryStore({
  dataDir: DATA_DIR,
  dbPath: RUNTIME_REGISTRY_DB_PATH,
  instanceId: INSTANCE_ID,
  mysql: MYSQL_STORE,
});
const recordsStore = createRecordsStore({
  dataDir: DATA_DIR,
  dbPath: RECORDS_DB_PATH,
  leaderboardLimit: LEADERBOARD_LIMIT,
  leaderboardPageSize: LEADERBOARD_PAGE_SIZE,
  mysql: MYSQL_STORE,
});
const RUN_PERSIST_QUEUE_DIR = path.join(DATA_DIR, 'run-persist-queue');
const RUN_PERSIST_WORKER_PATH = path.join(__dirname, 'server', 'run-persistence-worker.js');
const pendingRunPersistencePayloads = [];

function spawnRunPersistenceWorker(payload) {
  fs.mkdirSync(RUN_PERSIST_QUEUE_DIR, { recursive: true });
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.json`;
  const payloadPath = path.join(RUN_PERSIST_QUEUE_DIR, fileName);
  fs.writeFileSync(payloadPath, JSON.stringify(payload), 'utf8');
  const child = spawn(process.execPath, [RUN_PERSIST_WORKER_PATH, payloadPath], {
    cwd: __dirname,
    env: process.env,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function flushRunPersistenceQueue({ force = false } = {}) {
  if (pendingRunPersistencePayloads.length <= 0) return;
  if (!force && hasActiveGameplay()) return;
  const payloads = pendingRunPersistencePayloads.splice(0, pendingRunPersistencePayloads.length);
  for (const payload of payloads) {
    try {
      spawnRunPersistenceWorker(payload);
    } catch (err) {
      pendingRunPersistencePayloads.unshift(payload);
      console.error('Run persistence queue failed:', err.message);
      break;
    }
  }
}

function queueRunPersistence(payload) {
  if (!payload || (!payload.record && !payload.progression)) return;
  pendingRunPersistencePayloads.push(payload);
  setImmediate(() => flushRunPersistenceQueue());
}

const skillsStore = createSkillsStore({
  dataDir: DATA_DIR,
  skillsConfigPath: SKILLS_CONFIG_PATH,
  defaultSkillDefs: DEFAULT_SKILL_DEFS,
  mysql: MYSQL_STORE,
});

const newsStore = createNewsStore({
  dataDir: DATA_DIR,
  filePath: path.join(DATA_DIR, 'news.json'),
  mysql: MYSQL_STORE,
});
const progressionCatalog = accountProgressionStore.getCatalogPayload();
const leaderboardService = createLeaderboardService({
  Database,
  createMysqlSyncClient,
  useMysqlStore: USE_MYSQL_STORE,
  mysqlStore: MYSQL_STORE,
  playerAuthDbPath: PLAYER_AUTH_DB_PATH,
  recordsDbPath: RECORDS_DB_PATH,
  leaderboardLimit: LEADERBOARD_LIMIT,
  playerAuthStore,
  recordsStore,
  accountProgressionStore,
  normalizeNickname,
});
const heroDefsById = Object.fromEntries((progressionCatalog.heroes || []).map((hero) => [hero.id, hero]));
const itemDefsById = Object.fromEntries((ITEM_DEFS || []).map((item) => [String(item.id || '').trim(), item]));
const heroUniqueSkillDefsById = Object.fromEntries(
  Object.values(HERO_UNIQUE_SKILL_DEFS || {})
    .flatMap((list) => Array.isArray(list) ? list : [])
    .map((skill) => [skill.id, skill]),
);

function replaceArrayContents(target, nextItems) {
  const items = Array.isArray(nextItems) ? nextItems : [];
  if (!Array.isArray(target)) return items.slice();
  target.splice(0, target.length, ...items);
  return target;
}

function refreshWorldContentRuntime() {
  accountProgressionStore.replaceWorldCatalog({
    maps: MAP_DEFS,
    campaigns: CAMPAIGN_DEFS,
  });
  const latestCatalog = accountProgressionStore.getCatalogPayload();
  progressionCatalog.maps = replaceArrayContents(progressionCatalog.maps, latestCatalog.maps);
  progressionCatalog.campaigns = replaceArrayContents(progressionCatalog.campaigns, latestCatalog.campaigns);
  return latestCatalog;
}

function reloadWorldContentRuntime() {
  try {
    if (typeof worldContentStore.reload === 'function') {
      worldContentStore.reload();
      refreshWorldContentRuntime();
    }
  } catch (err) {
    console.error('World content runtime reload failed:', err?.message || err);
  }
}

function getCombatSkillDef(skillId, playerClass = '') {
  const id = String(skillId || '').trim().toLowerCase();
  if (!id) return null;
  const classId = String(playerClass || '').trim().toLowerCase();
  if (classId && Array.isArray(HERO_UNIQUE_SKILL_DEFS[classId])) {
    const heroSkill = HERO_UNIQUE_SKILL_DEFS[classId].find((skill) => skill.id === id);
    if (heroSkill) return heroSkill;
  }
  return heroUniqueSkillDefsById[id] || skillsStore.getById(id) || null;
}

function normalizePublicRarity(raw) {
  const rarity = String(raw || '').trim().toLowerCase();
  return ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(rarity) ? rarity : 'common';
}

function getPublicHeroAvatarPath(heroId) {
  const id = String(heroId || '').trim().toLowerCase();
  if (id === 'medic') return '/assets/characters/medis.png';
  if (['cyber', 'scout', 'shadow', 'raider', 'medis'].includes(id)) return `/assets/characters/${id}.png`;
  return '/assets/characters/cyber.png';
}

function normalizePublicAssetPath(raw, fallbackBase, fallbackId) {
  const explicit = String(raw || '').trim();
  if (explicit) {
    if (/^(?:https?:)?\/\//i.test(explicit) || explicit.startsWith('/') || explicit.startsWith('data:')) return explicit;
    return `${fallbackBase.replace(/\/+$/, '')}/${explicit.replace(/^\/+/, '')}`;
  }
  const id = String(fallbackId || '').trim();
  return id ? `${fallbackBase.replace(/\/+$/, '')}/${id}.webp` : '';
}

function makePublicSkillBadge(skill) {
  const id = String(skill?.id || '').toLowerCase();
  const named = {
    pulse_wave: 'PW',
    ion_lance: 'ION',
    arc_matrix: 'ARC',
    seeker_protocol: 'SKR',
    adaptive_frame: 'HP',
    combat_firmware: 'DMG',
    sync_link: 'SYN',
    razor_wind: 'RW',
    hunter_mark: 'HM',
    storm_net: 'SN',
    sky_chasers: 'SKY',
    long_stride: 'SPD',
    vital_sight: 'VS',
    trailblazer: 'TRL',
    void_burst: 'VB',
    night_fangs: 'NF',
    eclipse_chain: 'ECL',
    black_comets: 'BC',
    assassin_instinct: 'DMG',
    ghost_step: 'GST',
    sterile_wave: 'SW',
    triage_beam: 'TB',
    toxin_arc: 'TOX',
    rescue_rockets: 'RR',
    field_aid: 'REG',
    support_protocol: 'SUP',
    shrapnel_burst: 'SB',
    war_stomp: 'STP',
    berserk_arc: 'BRK',
    siege_barrage: 'SG',
    iron_hide: 'HP',
    battle_rage: 'RAG',
  };
  if (named[id]) return named[id];
  const parts = String(skill?.name || id || '?').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || '?').slice(0, 3).toUpperCase();
}

function buildPublicProfileProgressionDetails(publicProgression, catalog) {
  const heroDefs = Array.isArray(catalog?.heroes) ? catalog.heroes : [];
  const itemDefs = Array.isArray(catalog?.items) ? catalog.items : [];
  const itemSlots = Array.isArray(catalog?.itemSlots) ? catalog.itemSlots : [];
  const itemDefById = new Map(itemDefs.map((item) => [String(item?.id || '').trim(), item]));
  const activeHeroIdRaw = String(publicProgression?.activeHero || catalog?.baseHeroId || heroDefs[0]?.id || '').trim();
  const activeHeroDef = heroDefs.find((hero) => String(hero?.id || '').trim() === activeHeroIdRaw) || heroDefs[0] || {};
  const activeHeroId = String(activeHeroDef?.id || activeHeroIdRaw || 'cyber').trim();
  const heroLevels = publicProgression?.heroLevels && typeof publicProgression.heroLevels === 'object'
    ? publicProgression.heroLevels
    : {};
  const heroXp = publicProgression?.heroXp && typeof publicProgression.heroXp === 'object'
    ? publicProgression.heroXp
    : {};
  const heroXpToNext = publicProgression?.heroXpToNext && typeof publicProgression.heroXpToNext === 'object'
    ? publicProgression.heroXpToNext
    : {};
  const heroRuns = publicProgression?.heroRuns && typeof publicProgression.heroRuns === 'object'
    ? publicProgression.heroRuns
    : {};
  const skillLevelsByHero = publicProgression?.heroSkillLevels && typeof publicProgression.heroSkillLevels === 'object'
    ? publicProgression.heroSkillLevels
    : {};
  const activeSkillLevels = skillLevelsByHero[activeHeroId] && typeof skillLevelsByHero[activeHeroId] === 'object'
    ? skillLevelsByHero[activeHeroId]
    : {};
  const inventory = Array.isArray(publicProgression?.inventoryItems) ? publicProgression.inventoryItems : [];
  const inventoryByUid = new Map(inventory.map((item) => [String(item?.uid || '').trim(), item]));
  const equipmentByHero = publicProgression?.heroEquipment && typeof publicProgression.heroEquipment === 'object'
    ? publicProgression.heroEquipment
    : {};
  const activeEquipment = equipmentByHero[activeHeroId] && typeof equipmentByHero[activeHeroId] === 'object'
    ? equipmentByHero[activeHeroId]
    : {};

  const activeHero = {
    id: activeHeroId,
    name: String(activeHeroDef?.name || activeHeroId).trim(),
    accent: String(activeHeroDef?.accent || '#39c1d9').trim(),
    avatar: getPublicHeroAvatarPath(activeHeroId),
    level: Math.max(1, Number(heroLevels[activeHeroId]) || 1),
    xp: Math.max(0, Number(heroXp[activeHeroId]) || 0),
    xpToNext: Math.max(0, Number(heroXpToNext[activeHeroId]) || 0),
    runs: Math.max(0, Number(heroRuns[activeHeroId]) || 0),
    tagline: String(activeHeroDef?.tagline || '').trim(),
    baseStats: activeHeroDef?.baseStats && typeof activeHeroDef.baseStats === 'object' ? { ...activeHeroDef.baseStats } : {},
  };

  const activeSkills = (Array.isArray(activeHeroDef?.uniqueSkills) ? activeHeroDef.uniqueSkills : []).map((skill) => {
    const skillId = String(skill?.id || '').trim();
    const level = Math.max(0, Number(activeSkillLevels[skillId]) || 0);
    const rarity = normalizePublicRarity(skill?.rarity);
    return {
      id: skillId,
      heroId: activeHeroId,
      name: String(skill?.name || skillId).trim(),
      desc: String(skill?.desc || '').trim(),
      kind: String(skill?.kind || 'passive').trim(),
      rarity,
      level,
      maxLevel: Math.max(1, Number(skill?.maxLevel) || 1),
      unlocked: level > 0,
      globalAura: skill?.globalAura === true,
      badge: makePublicSkillBadge(skill),
      icon: normalizePublicAssetPath(skill?.icon || skill?.iconPath, '/assets/hero-skills', activeHeroId ? `${activeHeroId}_${skillId}` : skillId),
    };
  });

  const equippedItems = itemSlots.map((slot) => {
    const slotKey = String(slot?.key || '').trim();
    const uid = String(activeEquipment[slotKey] || '').trim();
    const publicItem = uid ? inventoryByUid.get(uid) : null;
    const itemDef = publicItem ? (itemDefById.get(String(publicItem.itemId || '').trim()) || {}) : {};
    const itemId = String(publicItem?.itemId || itemDef?.id || '').trim();
    const rarity = normalizePublicRarity(publicItem?.rarity || itemDef?.rarity);
    return {
      slotKey,
      slotName: String(slot?.name || slotKey).trim(),
      slotKind: String(slot?.kind || '').trim(),
      slotCategory: String(slot?.category || '').trim(),
      empty: !publicItem,
      item: publicItem ? {
        uid: publicItem.uid,
        itemId,
        name: String(itemDef?.name || itemId).trim(),
        rarity,
        level: Math.max(1, Number(publicItem.level) || 1),
        quantity: Math.max(0, Number(publicItem.quantity) || 0),
        stackable: publicItem.stackable === true || itemDef?.stackable === true,
        maxStack: Math.max(0, Number(publicItem.maxStack ?? itemDef?.maxStack) || 0),
        slotCategory: String(publicItem.slotCategory || itemDef?.slotCategory || '').trim(),
        icon: normalizePublicAssetPath(itemDef?.icon || publicItem.icon, '/assets/items', itemId),
        stats: itemDef?.stats && typeof itemDef.stats === 'object' ? { ...itemDef.stats } : {},
      } : null,
    };
  });

  return { activeHero, activeSkills, equippedItems };
}

function sanitizeHeroId(rawHeroId) {
  const id = (rawHeroId || '').toString().trim();
  if (heroDefsById[id]) return id;
  return progressionCatalog.baseHeroId || ACCOUNT_BASE_HERO_ID;
}

function resolveJoinHeroForPlayer(playerAccountId, requestedHeroId) {
  const desiredHeroId = sanitizeHeroId(requestedHeroId);
  if (!playerAccountId) {
    return {
      heroId: progressionCatalog.baseHeroId || ACCOUNT_BASE_HERO_ID,
      progression: null,
    };
  }

  const progression = accountProgressionStore.getOrCreateProgression(playerAccountId);
  if (!progression) {
    return {
      heroId: progressionCatalog.baseHeroId || ACCOUNT_BASE_HERO_ID,
      progression: null,
    };
  }

  let heroId = desiredHeroId;
  if (!progression.unlockedHeroes.includes(heroId)) {
    heroId = progression.unlockedHeroes.includes(progression.activeHero)
      ? progression.activeHero
      : (progression.unlockedHeroes[0] || progressionCatalog.baseHeroId || ACCOUNT_BASE_HERO_ID);
  }
  return { heroId, progression };
}

function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseNetQualityLevel(report) {
  const rttMs = clampNum(report?.rttMs, 0, 2000, 0);
  const jitterMs = clampNum(report?.jitterMs, 0, 1000, 0);
  const lossPct = clampNum(report?.lossPct, 0, 100, 0);
  const stateDelayMs = clampNum(report?.stateDelayMs, 0, 2000, 0);

  let score = 10;
  score -= Math.min(4, Math.max(0, (rttMs - 40) / 40));
  score -= Math.min(2, Math.max(0, (jitterMs - 10) / 15));
  score -= Math.min(3, lossPct / 4);
  score -= Math.min(2, Math.max(0, (stateDelayMs - 80) / 60));

  return Math.max(1, Math.min(10, Math.round(score)));
}

function parseNetPingMs(report) {
  return Math.round(clampNum(report?.rttMs, 0, 2000, 0));
}

function normalizeRoomSync(raw) {
  return {
    tickRate: Math.round(clampNum(raw?.tickRate, 20, 120, DEFAULT_ROOM_SYNC.tickRate)),
    stateSendHz: Math.round(clampNum(raw?.stateSendHz, 10, 120, DEFAULT_ROOM_SYNC.stateSendHz)),
    netRenderDelayMs: Math.round(clampNum(raw?.netRenderDelayMs, 20, 250, DEFAULT_ROOM_SYNC.netRenderDelayMs)),
    maxExtrapolationMs: Math.round(clampNum(raw?.maxExtrapolationMs, 20, 250, DEFAULT_ROOM_SYNC.maxExtrapolationMs)),
    entityInterpRate: clampNum(raw?.entityInterpRate, 4, 50, DEFAULT_ROOM_SYNC.entityInterpRate),
    bulletCorrectionRate: clampNum(raw?.bulletCorrectionRate, 4, 60, DEFAULT_ROOM_SYNC.bulletCorrectionRate),
    inputSendHz: Math.round(clampNum(raw?.inputSendHz, 10, 120, DEFAULT_ROOM_SYNC.inputSendHz)),
  };
}

function getPresenceStats() {
  return {
    ...runtimeRegistryStore.getPresence(),
    registered: playerAuthStore.countAccounts(),
  };
}

function listRoomsForLobby() {
  return runtimeRegistryStore.listRooms();
}

function hasActiveGameplay() {
  for (const room of rooms.values()) {
    if (room?.players?.size > 0) return true;
  }
  return false;
}

function publishRuntimeRegistry() {
  const localRooms = Array.from(rooms.values())
    .filter((room) => room.players.size > 0)
    .map((room) => ({
      code: room.code,
      players: room.players.size,
      maxPlayers: getRoomMaxPlayers(room.gameMode),
      startedAt: room.startedAt,
    }));
  let inGamePlayers = 0;
  for (const room of rooms.values()) {
    inGamePlayers += room.players.size;
  }
  runtimeRegistryStore.publishInstance({
    startedAt: processStartedAt,
    isShuttingDown,
    onlineSockets: activeSockets.size,
    inGamePlayers,
    inMenuSockets: Math.max(0, activeSockets.size - inGamePlayers),
    roomCount: localRooms.length,
    publicBaseUrl: PUBLIC_BASE_URL,
  });
  runtimeRegistryStore.publishRooms(localRooms, {
    isShuttingDown,
    publicBaseUrl: PUBLIC_BASE_URL,
    skipPersist: !isShuttingDown,
  });
}

function parseCookies(req) {
  const out = {};
  const raw = (req.headers.cookie || '').toString();
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function cleanRoomCodeForLookup(raw) {
  return (raw || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

function buildRoomRedirectUrl(baseUrl, roomCode, mode = 'join', gameMode = 'normal', pvpDurationMin = PVP_DEFAULT_MATCH_DURATION_MIN) {
  const base = (baseUrl || '').toString().trim().replace(/\/+$/, '');
  if (!base) return '';
  const url = new URL(base);
  const normalizedMode = mode === 'create' ? 'create' : 'join';
  const normalizedGameMode = normalizeGameMode(gameMode);
  const normalizedPvpDurationMin = normalizePvpDurationMin(pvpDurationMin);
  if (roomCode) url.searchParams.set('room', cleanRoomCodeForLookup(roomCode));
  if (normalizedMode) url.searchParams.set('mode', normalizedMode);
  if (normalizedMode === 'create' && normalizedGameMode !== 'normal') {
    url.searchParams.set('gameMode', normalizedGameMode);
  }
  if (normalizedMode === 'create' && normalizedGameMode === 'pvp') {
    url.searchParams.set('pvpDurationMin', String(normalizedPvpDurationMin));
  }
  return url.toString();
}

function getRequestBaseUrl(req) {
  const host = String(req?.headers?.host || '').trim();
  if (!host) return PUBLIC_BASE_URL;
  const protoHeader = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const proto = protoHeader || (IS_PROD ? 'https' : 'http');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function setTransientCookie(req, res, name, value, maxAgeSec = 600) {
  const parts = [
    `${name}=${encodeURIComponent(String(value || ''))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(Number(maxAgeSec) || 0))}`,
  ];
  appendCookieDomain(parts, req);
  if (IS_PROD) parts.push('Secure');
  appendSetCookieHeader(res, parts.join('; '));
}

function clearTransientCookie(req, res, name) {
  setTransientCookie(req, res, name, '', 0);
}

function createOAuthState() {
  return crypto.randomBytes(24).toString('base64url');
}

function createPkceVerifier() {
  return crypto.randomBytes(48).toString('base64url');
}

function createPkceChallenge(verifier) {
  return crypto.createHash('sha256').update(String(verifier || '')).digest('base64url');
}

function decodeJwtPayload(token) {
  const raw = String(token || '').trim();
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function pickProfileDisplayName(profile = {}, fallback = '') {
  const candidates = [
    profile?.name,
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
    [profile?.given_name, profile?.family_name].filter(Boolean).join(' '),
    profile?.display_name,
    profile?.preferred_username,
    profile?.screen_name,
    profile?.nickname,
    profile?.user?.name,
    [profile?.user?.first_name, profile?.user?.last_name].filter(Boolean).join(' '),
    [profile?.user?.given_name, profile?.user?.family_name].filter(Boolean).join(' '),
    fallback,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return '';
}

function getPlayRedirectBase(req) {
  return new URL('/play', getRequestBaseUrl(req) || GOOGLE_REDIRECT_URI || VK_REDIRECT_URI);
}

function getGoogleRedirectUri(req) {
  return GOOGLE_REDIRECT_URI || `${getRequestBaseUrl(req)}/api/auth/google/callback`;
}

function getVkRedirectUri(req) {
  return VK_REDIRECT_URI || `${getRequestBaseUrl(req)}/api/auth/vk/callback`;
}

function buildPlayRedirectUrl(req, params = {}) {
  const url = getPlayRedirectBase(req);
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function sendOauthPopupResult(req, res, {
  ok = false,
  provider = '',
  message = '',
  redirectUrl = '',
} = {}) {
  const payload = {
    type: 'cw-oauth-result',
    ok: Boolean(ok),
    provider: String(provider || ''),
    message: String(message || ''),
  };
  const fallback = String(redirectUrl || buildPlayRedirectUrl(req)).replace(/"/g, '&quot;');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Crimson Wars OAuth</title>
</head>
<body>
  <script>
    (function () {
      var payload = ${JSON.stringify(payload)};
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, window.location.origin);
          window.close();
          return;
        }
      } catch (err) {}
      window.location.replace("${fallback}");
    })();
  </script>
</body>
</html>`;
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

function renderVkOauthPopupPage({ provider, appId, redirectUri }) {
  const normalizedProvider = provider === 'mailru' ? 'mail_ru' : 'vkid';
  const providerForCallback = provider === 'mailru' ? 'mailru' : 'vk';
  const safeAppId = JSON.stringify(String(appId || ''));
  const safeRedirect = JSON.stringify(String(redirectUri || ''));
  const safeProvider = JSON.stringify(normalizedProvider);
  const safeProviderForCallback = JSON.stringify(providerForCallback);
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Crimson Wars Sign-In</title>
  <style>
    body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #0b0b0d; color: #f4ede8; display: grid; min-height: 100vh; place-items: center; }
    .card { width: min(92vw, 420px); padding: 24px; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; background: linear-gradient(180deg, rgba(22,22,24,0.98), rgba(8,8,10,0.98)); box-shadow: 0 16px 48px rgba(0,0,0,0.35); }
    .title { margin: 0 0 10px; font-size: 28px; font-weight: 800; }
    .copy { margin: 0 0 16px; font-size: 14px; line-height: 1.45; color: #cfd6de; }
    #vkid-oauth-root { min-height: 48px; }
    .error { margin-top: 14px; color: #ff9da3; font-size: 13px; }
  </style>
</head>
<body>
  <section class="card">
    <h1 class="title">Crimson Wars</h1>
    <p class="copy">Завершаем внешний вход. Если кнопка не появилась, проверьте блокировку скриптов или обновите окно.</p>
    <div id="vkid-oauth-root"></div>
    <div id="vkid-oauth-error" class="error"></div>
  </section>
  <script src="https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js"></script>
  <script>
    (function () {
      var provider = ${safeProvider};
      var providerForCallback = ${safeProviderForCallback};
      var errorEl = document.getElementById('vkid-oauth-error');
      function fail(message) {
        var text = String(message || 'VK ID login failed');
        if (errorEl) errorEl.textContent = text;
        window.location.replace('/api/auth/vk/callback?provider=' + encodeURIComponent(providerForCallback) + '&error=' + encodeURIComponent(text));
      }
      if (!('VKIDSDK' in window)) {
        fail('VK ID SDK is unavailable.');
        return;
      }
      try {
        var VKID = window.VKIDSDK;
        VKID.Config.init({
          app: ${safeAppId},
          redirectUrl: ${safeRedirect},
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: ''
        });
        var oAuth = new VKID.OAuthList();
        oAuth.render({
          container: document.getElementById('vkid-oauth-root'),
          oauthList: [provider]
        })
        .on(VKID.WidgetEvents.ERROR, function (error) {
          fail(error && error.message ? error.message : 'VK ID widget error');
        })
        .on(VKID.OAuthListInternalEvents.LOGIN_SUCCESS, function (payload) {
          var url = new URL('/api/auth/vk/callback', window.location.origin);
          url.searchParams.set('provider', providerForCallback);
          url.searchParams.set('code', payload.code || '');
          url.searchParams.set('device_id', payload.device_id || '');
          window.location.replace(url.toString());
        });
      } catch (error) {
        fail(error && error.message ? error.message : 'VK ID init error');
      }
    })();
  </script>
</body>
</html>`;
}

async function fetchJsonWithDetails(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.error_description || payload?.error || payload?.message || text || `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

function buildPartnerRunJoinUrl(session) {
  return buildUrlWithParams(buildRoomRedirectUrl(
    PUBLIC_BASE_URL,
    session.roomCode,
    'join',
    session.gameMode,
    session.pvpDurationMin,
  ), {
    integrationToken: session.token,
    name: session.playerName,
    heroId: session.heroId,
  });
}

function readAdminSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_SESSION_COOKIE] || '';
  const session = adminAuthStore.getSession(token);
  return session || null;
}

function readPlayerSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[PLAYER_SESSION_COOKIE] || '';
  const session = playerAuthStore.getSession(token);
  return session || null;
}

function isConsoleAdmin(ws, player = null) {
  const adminLoginKey = normalizeNickname(ADMIN_BOOTSTRAP_LOGIN).toLowerCase();
  const adminUserLoginKey = (ws?.adminSession?.user?.login || '').toString().trim().toLowerCase();
  if (adminUserLoginKey && adminUserLoginKey === adminLoginKey) return true;

  const sessionNicknameKey = (ws?.playerSession?.player?.nickname || '').toString().trim().toLowerCase();
  if (sessionNicknameKey && sessionNicknameKey === adminLoginKey) return true;

  const playerNicknameKey = (player?.name || '').toString().trim().toLowerCase();
  if (playerNicknameKey && playerNicknameKey === adminLoginKey && ws?.playerSession?.player?.nickname) {
    return sessionNicknameKey === adminLoginKey;
  }

  return false;
}

function attachAdminAuth(req, _res, next) {
  if (shouldSkipGlobalAuth(req)) {
    req.adminSession = null;
    req.adminUser = null;
    next();
    return;
  }
  const session = readAdminSession(req);
  req.adminSession = session;
  req.adminUser = session?.user || null;
  next();
}

function attachPlayerAuth(req, _res, next) {
  if (shouldSkipGlobalAuth(req)) {
    req.playerSession = null;
    req.playerUser = null;
    next();
    return;
  }
  const session = readPlayerSession(req);
  req.playerSession = session;
  req.playerUser = session?.player || null;
  next();
}

function shouldSkipGlobalAuth(req) {
  const method = String(req?.method || '').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return false;
  const reqPath = String(req?.path || '').split('?')[0];
  if (reqPath === '/healthz' || reqPath === '/readyz') return true;
  if (reqPath === '/api/rooms' || reqPath === '/api/records' || reqPath === '/api/leaderboard') return true;
  if (reqPath.startsWith('/api/landing/')) return true;
  if (reqPath.startsWith('/api/news')) return true;
  return false;
}

function requireAdmin(req, res, next) {
  if (!req.adminUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  next();
}

function requireAdminManager(req, res, next) {
  if (!req.adminUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  if (!req.adminUser.canManageAdmins) {
    res.status(403).json({ ok: false, message: 'Forbidden' });
    return;
  }
  next();
}

function getCookieDomainForRequest(req) {
  const configured = String(SESSION_COOKIE_DOMAIN || '').trim().toLowerCase();
  if (!configured) return '';
  const host = String(req?.headers?.host || '').split(':')[0].trim().toLowerCase();
  const domain = configured.replace(/^\./, '');
  if (!host) return '';
  return host === domain || host.endsWith(`.${domain}`) ? configured : '';
}

function appendCookieDomain(parts, req) {
  const domain = getCookieDomainForRequest(req);
  if (domain) parts.push(`Domain=${domain}`);
}

function appendSetCookieHeader(res, value) {
  const current = res.getHeader('Set-Cookie');
  const next = Array.isArray(current) ? current.slice() : (current ? [String(current)] : []);
  next.push(value);
  res.setHeader('Set-Cookie', next);
}

function setAdminSessionCookie(req, res, token) {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor((1000 * 60 * 60 * 24 * 14) / 1000)}`,
  ];
  appendCookieDomain(parts, req);
  if (IS_PROD) parts.push('Secure');
  appendSetCookieHeader(res, parts.join('; '));
}

function clearAdminSessionCookie(req, res) {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  appendCookieDomain(parts, req);
  if (IS_PROD) parts.push('Secure');
  appendSetCookieHeader(res, parts.join('; '));
}

function setPlayerSessionCookie(req, res, token) {
  const parts = [
    `${PLAYER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor((1000 * 60 * 60 * 24 * 30) / 1000)}`,
  ];
  appendCookieDomain(parts, req);
  if (IS_PROD) parts.push('Secure');
  appendSetCookieHeader(res, parts.join('; '));
}

function clearPlayerSessionCookie(req, res) {
  const parts = [
    `${PLAYER_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  appendCookieDomain(parts, req);
  if (IS_PROD) parts.push('Secure');
  appendSetCookieHeader(res, parts.join('; '));
}

function generateAdminPassword() {
  return crypto.randomBytes(12).toString('base64url');
}

app.use(attachPlayerAuth);
app.use(attachAdminAuth);

app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    instanceId: INSTANCE_ID,
    isShuttingDown,
    uptimeSec: Math.round(process.uptime()),
    now: Date.now(),
  });
});

app.get('/readyz', (_req, res) => {
  if (isShuttingDown) {
    res.status(503).json({
      ok: false,
      ready: false,
      instanceId: INSTANCE_ID,
      isShuttingDown: true,
      shutdownStartedAt,
      now: Date.now(),
    });
    return;
  }
  res.json({
    ok: true,
    ready: true,
    instanceId: INSTANCE_ID,
    now: Date.now(),
  });
});

app.get('/api/runtime', (_req, res) => {
  res.json({
    ok: true,
    instanceId: INSTANCE_ID,
    publicBaseUrl: PUBLIC_BASE_URL,
    isShuttingDown,
    shutdownStartedAt,
    rooms: rooms.size,
    onlineSockets: activeSockets.size,
    instances: runtimeRegistryStore.listInstances(),
    lobbyRooms: runtimeRegistryStore.listRooms(),
    now: Date.now(),
  });
});

app.get('/api/auth/google/start', (req, res) => {
  const redirectUri = getGoogleRedirectUri(req);
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !redirectUri) {
    res.redirect(302, buildPlayRedirectUrl(req, {
      authError: 'Google OAuth is not configured.',
      authProvider: 'google',
    }));
    return;
  }
  const state = createOAuthState();
  setTransientCookie(req, res, GOOGLE_OAUTH_STATE_COOKIE, state, 600);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');
  res.redirect(302, url.toString());
});

app.get('/api/auth/google/callback', async (req, res) => {
  const queryError = String(req.query?.error || '').trim();
  if (queryError) {
    clearTransientCookie(req, res, GOOGLE_OAUTH_STATE_COOKIE);
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: 'google',
      message: queryError,
      redirectUrl: buildPlayRedirectUrl(req, { authError: queryError, authProvider: 'google' }),
    });
    return;
  }
  const state = String(req.query?.state || '').trim();
  const expectedState = String(parseCookies(req)[GOOGLE_OAUTH_STATE_COOKIE] || '').trim();
  clearTransientCookie(req, res, GOOGLE_OAUTH_STATE_COOKIE);
  if (!state || !expectedState || state !== expectedState) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: 'google',
      message: 'Google login state mismatch.',
      redirectUrl: buildPlayRedirectUrl(req, { authError: 'Google login state mismatch.', authProvider: 'google' }),
    });
    return;
  }
  const code = String(req.query?.code || '').trim();
  if (!code) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: 'google',
      message: 'Google login code is missing.',
      redirectUrl: buildPlayRedirectUrl(req, { authError: 'Google login code is missing.', authProvider: 'google' }),
    });
    return;
  }
  try {
    const tokenPayload = await fetchJsonWithDetails('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: getGoogleRedirectUri(req),
        grant_type: 'authorization_code',
      }).toString(),
    });
    const accessToken = String(tokenPayload?.access_token || '').trim();
    const profile = await fetchJsonWithDetails('https://openidconnect.googleapis.com/v1/userinfo', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const providerUserId = String(profile?.sub || '').trim();
    if (!providerUserId) {
      throw new Error('Google profile id is missing.');
    }
    const providerEmail = String(profile?.email || '').trim();
    const idTokenProfile = decodeJwtPayload(tokenPayload?.id_token);
    const nicknameBase = pickProfileDisplayName(profile, pickProfileDisplayName(idTokenProfile, providerEmail.split('@')[0] || 'Google Player'));
    const authResult = playerAuthStore.authenticateExternal({
      provider: 'google',
      providerUserId,
      providerEmail,
      nicknameBase,
    });
    if (!authResult?.ok) {
      throw new Error(authResult?.message || 'Google sign-in failed');
    }
    setPlayerSessionCookie(req, res, authResult.token);
    sendOauthPopupResult(req, res, {
      ok: true,
      provider: 'google',
      message: authResult.createdAccount ? 'created' : 'login',
      redirectUrl: buildPlayRedirectUrl(req, {
        authProvider: 'google',
        authStatus: authResult.createdAccount ? 'created' : 'login',
      }),
    });
  } catch (err) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: 'google',
      message: err?.message || 'Google sign-in failed.',
      redirectUrl: buildPlayRedirectUrl(req, {
        authError: err?.message || 'Google sign-in failed.',
        authProvider: 'google',
      }),
    });
  }
});

app.get('/api/auth/vk/start', (req, res) => {
  const redirectUri = getVkRedirectUri(req);
  if (!VK_CLIENT_ID || !VK_CLIENT_SECRET || !redirectUri) {
    res.redirect(302, buildPlayRedirectUrl(req, {
      authError: 'VK ID OAuth is not configured.',
      authProvider: 'vk',
    }));
    return;
  }
  const state = createOAuthState();
  const verifier = createPkceVerifier();
  const challenge = createPkceChallenge(verifier);
  setTransientCookie(req, res, VK_OAUTH_STATE_COOKIE, state, 600);
  setTransientCookie(req, res, VK_OAUTH_VERIFIER_COOKIE, verifier, 600);
  const url = new URL('https://id.vk.com/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', VK_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'vkid.personal_info email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  res.redirect(302, url.toString());
});

app.get('/api/auth/mailru/start', (req, res) => {
  const redirectUri = getVkRedirectUri(req);
  if (!VK_CLIENT_ID || !redirectUri) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: 'mailru',
      message: 'Mail.ru sign-in is not configured.',
      redirectUrl: buildPlayRedirectUrl(req, {
        authError: 'Mail.ru sign-in is not configured.',
        authProvider: 'mailru',
      }),
    });
    return;
  }
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(renderVkOauthPopupPage({
    provider: 'mailru',
    appId: VK_CLIENT_ID,
    redirectUri,
  }));
});

app.get('/api/auth/vk/callback', async (req, res) => {
  const requestedProvider = String(req.query?.provider || '').trim().toLowerCase() === 'mailru' ? 'mailru' : 'vk';
  const cookies = parseCookies(req);
  const expectedState = String(cookies[VK_OAUTH_STATE_COOKIE] || '').trim();
  const verifier = String(cookies[VK_OAUTH_VERIFIER_COOKIE] || '').trim();
  const queryError = String(req.query?.error || '').trim();
  if (queryError) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: requestedProvider,
      message: queryError,
      redirectUrl: buildPlayRedirectUrl(req, { authError: queryError, authProvider: requestedProvider }),
    });
    return;
  }
  if (requestedProvider === 'vk') {
    clearTransientCookie(req, res, VK_OAUTH_STATE_COOKIE);
    clearTransientCookie(req, res, VK_OAUTH_VERIFIER_COOKIE);
  }
  const state = String(req.query?.state || '').trim();
  if (requestedProvider === 'vk' && (!state || !expectedState || state !== expectedState)) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: requestedProvider,
      message: 'VK login state mismatch.',
      redirectUrl: buildPlayRedirectUrl(req, { authError: 'VK login state mismatch.', authProvider: requestedProvider }),
    });
    return;
  }
  const code = String(req.query?.code || '').trim();
  const deviceId = String(req.query?.device_id || '').trim();
  if (!code) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: requestedProvider,
      message: 'VK login code is missing.',
      redirectUrl: buildPlayRedirectUrl(req, { authError: 'VK login code is missing.', authProvider: requestedProvider }),
    });
    return;
  }
  if (requestedProvider === 'vk' && !verifier) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: requestedProvider,
      message: 'VK login verifier is missing.',
      redirectUrl: buildPlayRedirectUrl(req, { authError: 'VK login verifier is missing.', authProvider: requestedProvider }),
    });
    return;
  }
  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: VK_CLIENT_ID,
      client_secret: VK_CLIENT_SECRET,
      redirect_uri: getVkRedirectUri(req),
      code,
    });
    if (requestedProvider === 'vk') tokenBody.set('code_verifier', verifier);
    if (deviceId) tokenBody.set('device_id', deviceId);
    const tokenPayload = await fetchJsonWithDetails('https://id.vk.com/oauth2/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
    const idTokenPayload = decodeJwtPayload(tokenPayload?.id_token);
    let vkUserInfo = null;
    const accessToken = String(tokenPayload?.access_token || '').trim();
    if (accessToken && VK_CLIENT_ID) {
      try {
        const userInfoUrl = new URL('https://id.vk.com/oauth2/user_info');
        userInfoUrl.searchParams.set('client_id', VK_CLIENT_ID);
        userInfoUrl.searchParams.set('access_token', accessToken);
        vkUserInfo = await fetchJsonWithDetails(userInfoUrl.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
      } catch {
        vkUserInfo = null;
      }
    }
    const profile = vkUserInfo?.user || vkUserInfo || idTokenPayload || {};
    const providerUserId = String(profile?.sub || tokenPayload?.user_id || '').trim();
    const providerEmail = String(profile?.email || tokenPayload?.email || '').trim();
    const nicknameBase = pickProfileDisplayName(profile, pickProfileDisplayName(idTokenPayload, providerEmail.split('@')[0] || 'VK Player'));
    if (!providerUserId) {
      throw new Error('VK profile id is missing.');
    }
    const authResult = playerAuthStore.authenticateExternal({
      provider: requestedProvider,
      providerUserId,
      providerEmail,
      nicknameBase,
    });
    if (!authResult?.ok) {
      throw new Error(authResult?.message || 'VK sign-in failed');
    }
    setPlayerSessionCookie(req, res, authResult.token);
    sendOauthPopupResult(req, res, {
      ok: true,
      provider: requestedProvider,
      message: authResult.createdAccount ? 'created' : 'login',
      redirectUrl: buildPlayRedirectUrl(req, {
        authProvider: requestedProvider,
        authStatus: authResult.createdAccount ? 'created' : 'login',
      }),
    });
  } catch (err) {
    sendOauthPopupResult(req, res, {
      ok: false,
      provider: requestedProvider,
      message: err?.message || 'VK sign-in failed.',
      redirectUrl: buildPlayRedirectUrl(req, {
        authError: err?.message || 'VK sign-in failed.',
        authProvider: requestedProvider,
      }),
    });
  }
});

app.get('/api/room-route', (req, res) => {
  const mode = (req.query.mode || 'join').toString().trim().toLowerCase() === 'create' ? 'create' : 'join';
  const roomCode = cleanRoomCodeForLookup(req.query.roomCode || req.query.room_code || '');
  const gameMode = normalizeGameMode(req.query.gameMode || req.query.game_mode || 'normal');
  const pvpDurationMin = normalizePvpDurationMin(req.query.pvpDurationMin || req.query.pvp_duration_min);
  const requestBaseUrl = getRequestBaseUrl(req);

  if (mode === 'join') {
    if (!roomCode) {
      res.status(400).json({ ok: false, message: 'Room code is required' });
      return;
    }
    const room = runtimeRegistryStore.getRoomByCode(roomCode);
    if (!room) {
      res.json({
        ok: true,
        mode,
        found: false,
        roomCode,
        target: {
          instanceId: INSTANCE_ID,
          publicBaseUrl: requestBaseUrl || PUBLIC_BASE_URL,
          redirectUrl: buildRoomRedirectUrl(requestBaseUrl || PUBLIC_BASE_URL, roomCode, mode, gameMode, pvpDurationMin),
          isCurrentInstance: true,
        },
      });
      return;
    }
    res.json({
      ok: true,
      mode,
      found: true,
      room: {
        code: room.code,
        players: room.players,
        maxPlayers: room.maxPlayers,
        isFull: room.players >= room.maxPlayers,
        instanceId: room.instanceId,
      },
      target: {
        instanceId: room.instanceId,
        publicBaseUrl: room.publicBaseUrl || PUBLIC_BASE_URL,
        redirectUrl: buildRoomRedirectUrl(room.publicBaseUrl || PUBLIC_BASE_URL, room.code, mode, gameMode, pvpDurationMin),
        isCurrentInstance: room.instanceId === INSTANCE_ID,
      },
    });
    return;
  }

  const target = req.playerUser ? {
    instanceId: INSTANCE_ID,
    publicBaseUrl: requestBaseUrl || PUBLIC_BASE_URL,
  } : (runtimeRegistryStore.chooseTargetInstance() || {
    instanceId: INSTANCE_ID,
    publicBaseUrl: PUBLIC_BASE_URL,
  });
  res.json({
    ok: true,
    mode,
    target: {
      instanceId: target.instanceId,
      publicBaseUrl: target.publicBaseUrl || PUBLIC_BASE_URL,
      redirectUrl: buildRoomRedirectUrl(target.publicBaseUrl || PUBLIC_BASE_URL, '', mode, gameMode, pvpDurationMin),
      isCurrentInstance: target.instanceId === INSTANCE_ID,
    },
  });
});

app.get('/api/player/me', (req, res) => {
  const catalog = accountProgressionStore.getCatalogPayload();
  if (!req.playerUser) {
    res.json({
      ok: true,
      authenticated: false,
      player: null,
      identities: [],
      providers: ['google', 'vk', 'mailru'],
      nicknameSetupRequired: false,
      progressionCatalog: catalog,
      progression: null,
    });
    return;
  }
  const progression = accountProgressionStore.getOrCreateProgression(req.playerUser.id);
  res.json({
    ok: true,
    authenticated: true,
    player: req.playerUser,
    identities: req.playerSession?.identities || [],
    providers: ['google', 'vk', 'mailru'],
    nicknameSetupRequired: playerAuthStore.needsNicknameSetup(req.playerUser.id),
    progressionCatalog: catalog,
    progression: accountProgressionStore.toPublicProgression(progression),
  });
});

app.post('/api/integrations/partner-runs/start', requirePartnerRunsSecret, (req, res) => {
  const partnerRunId = String(req.body?.partnerRunId || req.body?.runId || '').trim();
  const externalPlayerId = String(req.body?.externalPlayerId || req.body?.playerId || '').trim();
  const callbackPath = sanitizePartnerCallbackPath(req.body?.callbackPath || req.body?.rewardEndpointPath || '');
  if (!partnerRunId) {
    res.status(400).json({ ok: false, message: 'partnerRunId is required' });
    return;
  }
  if (!externalPlayerId) {
    res.status(400).json({ ok: false, message: 'externalPlayerId is required' });
    return;
  }
  if (!callbackPath) {
    res.status(400).json({ ok: false, message: 'callbackPath is required and must start with /' });
    return;
  }

  const room = getOrCreateRoom(
    req.body?.roomCode || '',
    DEFAULT_ROOM_SYNC,
    req.body?.gameMode || 'normal',
    req.body?.pvpDurationMin,
  );
  const session = createPartnerRunSession({
    partnerRunId,
    externalPlayerId,
    playerName: req.body?.playerName || req.body?.nickname || 'Fighter',
    heroId: req.body?.heroId || req.body?.playerClass || ACCOUNT_BASE_HERO_ID,
    roomCode: room.code,
    gameMode: room.gameMode,
    pvpDurationMin: room.pvpDurationMin,
    callbackPath,
    metadata: req.body?.metadata,
    requestedBy: req.body?.requestedBy,
  });

  res.status(201).json({
    ok: true,
    integration: 'partner-runs',
    session: {
      integrationToken: session.token,
      expiresAt: session.expiresAt,
      roomCode: room.code,
      gameMode: room.gameMode,
      pvpDurationMin: room.pvpDurationMin,
      playerName: session.playerName,
      heroId: session.heroId,
      partnerRunId: session.partnerRunId,
      externalPlayerId: session.externalPlayerId,
    },
    launch: {
      joinUrl: buildPartnerRunJoinUrl(session),
      websocketJoinPayload: {
        type: 'join',
        roomCode: room.code,
        name: session.playerName,
        playerClass: session.heroId,
        integrationToken: session.token,
      },
    },
    callback: {
      baseUrlConfigured: Boolean(PARTNER_RUNS_CALLBACK_BASE_URL),
      baseUrl: PARTNER_RUNS_CALLBACK_BASE_URL || null,
      path: session.callbackPath,
    },
  });
});

app.get('/api/player/public-profile/:id', (req, res) => {
  if (hasActiveGameplay()) {
    res.status(503).json({
      ok: false,
      message: 'Profile loading is paused during an active match.',
      lowLatencyMode: true,
      now: Date.now(),
    });
    return;
  }

  const playerId = Math.max(0, Number(req.params.id) || 0);
  if (!playerId) {
    res.status(400).json({ ok: false, message: 'Invalid player id' });
    return;
  }

  const player = playerAuthStore.getAccountById(playerId);
  if (!player) {
    res.status(404).json({ ok: false, message: 'Player not found' });
    return;
  }

  const progression = accountProgressionStore.getOrCreateProgression(player.id);
  const publicProgression = accountProgressionStore.toPublicProgression(progression);
  const catalog = accountProgressionStore.getCatalogPayload();
  const heroDefs = Array.isArray(catalog?.heroes) ? catalog.heroes : [];
  const heroLevels = publicProgression?.heroLevels && typeof publicProgression.heroLevels === 'object'
    ? publicProgression.heroLevels
    : {};
  const heroRuns = publicProgression?.heroRuns && typeof publicProgression.heroRuns === 'object'
    ? publicProgression.heroRuns
    : {};
  const unlocked = new Set(Array.isArray(publicProgression?.unlockedHeroes) ? publicProgression.unlockedHeroes : []);

  const heroStats = heroDefs.map((hero) => ({
    id: hero.id,
    name: hero.name || hero.id,
    accent: hero.accent || '#39c1d9',
    avatar: getPublicHeroAvatarPath(hero.id),
    level: Math.max(1, Number(heroLevels[hero.id]) || 1),
    runs: Math.max(0, Number(heroRuns[hero.id]) || 0),
    unlocked: unlocked.has(hero.id),
  }));
  const publicDetails = buildPublicProfileProgressionDetails(publicProgression, catalog);

  res.json({
    ok: true,
    profile: {
      id: player.id,
      nickname: player.nickname,
      createdAt: Math.max(0, Number(player.createdAt) || 0),
      lastLoginAt: Math.max(0, Number(player.lastLoginAt) || 0),
      accountLevel: Math.max(1, Number(publicProgression?.accountLevel) || 1),
      accountXp: Math.max(0, Number(publicProgression?.accountXp) || 0),
      accountXpToNext: Math.max(1, Number(publicProgression?.accountXpToNext) || 1),
      accountSkillPoints: Math.max(0, Number(publicProgression?.accountSkillPoints) || 0),
      shards: Math.max(0, Number(publicProgression?.shards) || 0),
      totalRuns: Math.max(0, Number(publicProgression?.totalRuns) || 0),
      heroesUnlocked: unlocked.size,
      heroesTotal: heroDefs.length,
      heroStats,
      activeHero: publicDetails.activeHero,
      activeSkills: publicDetails.activeSkills,
      equippedItems: publicDetails.equippedItems,
      activeRun: buildPublicActiveRunForPlayer(player),
    },
    now: Date.now(),
  });
});

app.get('/api/player/public-profile/:id/run-history', (req, res) => {
  const playerId = Math.max(0, Number(req.params.id) || 0);
  if (!playerId) {
    res.status(400).json({ ok: false, message: 'Invalid player id' });
    return;
  }

  const player = playerAuthStore.getAccountById(playerId);
  if (!player) {
    res.status(404).json({ ok: false, message: 'Player not found' });
    return;
  }

  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.page_size) || 8;
  const payload = hasActiveGameplay() && typeof recordsStore.listPlayerRunsByNameMemory === 'function'
    ? recordsStore.listPlayerRunsByNameMemory(player.nickname, page, pageSize)
    : recordsStore.listPlayerRunsByName(player.nickname, page, pageSize);
  const runs = payload.items.map((run) => ({
    ...run,
    replayApiPath: '/api/player/public-profile/' + playerId + '/run-history/' + Math.max(0, Number(run?.id) || 0) + '/replay',
  }));

  res.json({
    ok: true,
    runs,
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
    totalPages: payload.totalPages,
    now: Date.now(),
  });
});

app.get('/api/player/public-profile/:id/run-history/:runId/replay', (req, res) => {
  if (hasActiveGameplay()) {
    res.status(503).json({
      ok: false,
      error: 'Replay loading is paused during an active match.',
      lowLatencyMode: true,
      recordId: Math.max(0, Number(req.params.runId) || 0),
      now: Date.now(),
    });
    return;
  }

  const playerId = Math.max(0, Number(req.params.id) || 0);
  if (!playerId) {
    res.status(400).json({ ok: false, message: 'Invalid player id' });
    return;
  }

  const player = playerAuthStore.getAccountById(playerId);
  if (!player) {
    res.status(404).json({ ok: false, message: 'Player not found' });
    return;
  }

  const payload = recordsStore.getPlayerRunReplayByNameAndId(player.nickname, req.params.runId);
  if (!payload?.replay) {
    res.status(404).json({
      ok: false,
      error: 'Replay not found.',
      recordId: Math.max(0, Number(req.params.runId) || 0),
      now: Date.now(),
    });
    return;
  }

  res.json({
    ok: true,
    record: {
      id: payload.id,
      name: payload.name,
      kills: payload.kills,
      score: payload.score,
      roomCode: payload.roomCode,
      durationSec: payload.durationSec,
      at: payload.at,
      replayApiPath: '/api/player/public-profile/' + playerId + '/run-history/' + Math.max(0, Number(payload.id) || 0) + '/replay',
    },
    replay: payload.replay,
    now: Date.now(),
  });
});

app.post('/api/player/progression/select-hero', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const heroId = (req.body?.heroId || '').toString();
  const result = accountProgressionStore.selectActiveHero(req.playerUser.id, heroId);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to select hero' });
    return;
  }
  res.json({ ok: true, progression: result.progression });
});

app.post('/api/player/progression/unlock-hero', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const heroId = (req.body?.heroId || '').toString();
  const result = accountProgressionStore.unlockHero(req.playerUser.id, heroId);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to unlock hero' });
    return;
  }
  res.json({ ok: true, progression: result.progression, alreadyUnlocked: !!result.alreadyUnlocked });
});

app.post('/api/player/progression/upgrade-node', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const heroId = (req.body?.heroId || '').toString();
  const nodeId = (req.body?.nodeId || '').toString();
  const result = accountProgressionStore.upgradeHeroNode(req.playerUser.id, heroId, nodeId);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to upgrade node' });
    return;
  }
  res.json({ ok: true, progression: result.progression });
});

app.post('/api/player/progression/unlock-hero-skill', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const heroId = (req.body?.heroId || '').toString();
  const skillId = (req.body?.skillId || '').toString();
  const result = accountProgressionStore.unlockHeroSkill(req.playerUser.id, heroId, skillId);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to unlock hero skill' });
    return;
  }
  res.json({ ok: true, progression: result.progression, alreadyUnlocked: !!result.alreadyUnlocked });
});

app.post('/api/player/progression/upgrade-hero-skill', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const heroId = (req.body?.heroId || '').toString();
  const skillId = (req.body?.skillId || '').toString();
  const result = accountProgressionStore.upgradeHeroSkill(req.playerUser.id, heroId, skillId);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to upgrade hero skill' });
    return;
  }
  res.json({ ok: true, progression: result.progression });
});

app.post('/api/player/progression/equip-item', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const heroId = (req.body?.heroId || '').toString();
  const itemUid = (req.body?.itemUid || '').toString();
  const slotKey = (req.body?.slotKey || '').toString();
  const result = accountProgressionStore.equipItem(req.playerUser.id, heroId, itemUid, slotKey);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to equip item' });
    return;
  }
  res.json({ ok: true, progression: result.progression });
});

app.post('/api/player/progression/unequip-item', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const heroId = (req.body?.heroId || '').toString();
  const slotKey = (req.body?.slotKey || '').toString();
  const result = accountProgressionStore.unequipItem(req.playerUser.id, heroId, slotKey);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to unequip item' });
    return;
  }
  res.json({ ok: true, progression: result.progression });
});

app.post('/api/player/progression/sell-item', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const itemUid = (req.body?.itemUid || '').toString();
  const result = accountProgressionStore.sellItem(req.playerUser.id, itemUid);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to sell item' });
    return;
  }
  res.json({ ok: true, progression: result.progression });
});

app.post('/api/player/progression/upgrade-item', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const itemUid = (req.body?.itemUid || '').toString();
  const result = accountProgressionStore.upgradeItem(req.playerUser.id, itemUid);
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to upgrade item' });
    return;
  }
  res.json({ ok: true, progression: result.progression });
});

app.get('/api/player/nickname-status', (req, res) => {
  const result = playerAuthStore.getNicknameStatus(req.query.nickname);
  const normalized = normalizeNickname(req.query.nickname);
  const occupiedInLobby = normalized
    ? Array.from(rooms.values()).some((room) =>
      Array.from(room.players.values()).some((player) => player.name.toLowerCase() === normalized.toLowerCase()))
    : false;
  if (!result.ok) {
    res.status(result.code).json({
      ok: false,
      message: result.message,
      nickname: result.nickname,
      nicknameKey: result.nicknameKey,
      isRegistered: false,
      isOccupied: occupiedInLobby,
    });
    return;
  }
  res.json({
    ok: true,
    nickname: result.nickname,
    nicknameKey: result.nicknameKey,
    isRegistered: result.isRegistered,
    isOccupied: occupiedInLobby,
    player: result.player,
  });
});

app.post('/api/player/register', (req, res) => {
  const nickname = (req.body?.nickname || '').toString();
  const password = (req.body?.password || '').toString();
  const result = playerAuthStore.register(nickname, password);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  setPlayerSessionCookie(req, res, result.token);
  res.json({
    ok: true,
    player: result.player,
    identities: result.identities,
    providers: ['google', 'vk', 'mailru'],
  });
});

app.post('/api/player/login', (req, res) => {
  const nickname = (req.body?.nickname || '').toString();
  const password = (req.body?.password || '').toString();
  const result = playerAuthStore.authenticate(nickname, password);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  setPlayerSessionCookie(req, res, result.token);
  res.json({
    ok: true,
    player: result.player,
    identities: result.identities,
    providers: ['google', 'vk', 'mailru'],
  });
});

app.post('/api/player/logout', (req, res) => {
  const cookies = parseCookies(req);
  playerAuthStore.deleteSession(cookies[PLAYER_SESSION_COOKIE] || '');
  clearPlayerSessionCookie(req, res);
  res.json({ ok: true });
});

app.post('/api/player/complete-nickname', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  const nickname = (req.body?.nickname || '').toString();
  const result = playerAuthStore.renamePlayer(req.playerUser.id, nickname, { requireNicknameSetup: true });
  if (!result?.ok) {
    res.status(result?.code || 400).json({ ok: false, message: result?.message || 'Failed to save nickname' });
    return;
  }
  res.json({
    ok: true,
    player: result.player,
    identities: result.identities,
    nicknameSetupRequired: !!result.needsNicknameSetup,
  });
});

app.get('/admin/skills', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-skills.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/admin/me', (req, res) => {
  if (!req.adminUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  res.json({ ok: true, user: req.adminUser });
});

app.post('/api/admin/login', (req, res) => {
  const login = (req.body?.login || '').toString();
  const password = (req.body?.password || '').toString();
  const result = adminAuthStore.authenticate(login, password);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  setAdminSessionCookie(req, res, result.token);
  res.json({ ok: true, user: result.user });
});

app.post('/api/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  adminAuthStore.deleteSession(cookies[ADMIN_SESSION_COOKIE] || '');
  clearAdminSessionCookie(req, res);
  res.json({ ok: true });
});

app.get('/api/admin/users', requireAdminManager, (_req, res) => {
  res.json({ ok: true, users: adminAuthStore.listUsers() });
});

app.post('/api/admin/users', requireAdminManager, (req, res) => {
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const generatedPassword = (payload.password || '').toString() ? null : generateAdminPassword();
  const result = adminAuthStore.createUser(req.adminUser, {
    login: payload.login,
    password: payload.password || generatedPassword,
    canManageAdmins: !!payload.canManageAdmins,
    isActive: payload.isActive !== false,
  });
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, user: result.user, generatedPassword });
});

app.put('/api/admin/users/:id', requireAdminManager, (req, res) => {
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const result = adminAuthStore.updateUser(req.adminUser, req.params.id, payload);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, user: result.user });
});

app.delete('/api/admin/users/:id', requireAdminManager, (req, res) => {
  const result = adminAuthStore.deleteUser(req.adminUser, req.params.id);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true });
});

registerNewsRoutes(app, {
  adminNewsHtmlPath: path.join(__dirname, 'public', 'admin-news.html'),
  newsImageDir: path.join(DATA_DIR, 'news-images'),
  newsStore,
  requireAdmin,
  accountProgressionStore,
});

app.get('/api/rooms', (_req, res) => {
  const rooms = listRoomsForLobby().map((room) => ({
    ...room,
    redirectUrl: buildRoomRedirectUrl(room.publicBaseUrl || PUBLIC_BASE_URL, room.code, 'join'),
  }));
  res.json({
    rooms,
    presence: getPresenceStats(),
    instanceId: INSTANCE_ID,
    publicBaseUrl: PUBLIC_BASE_URL,
    isShuttingDown,
    now: Date.now(),
  });
});

registerLeaderboardRoutes(app, {
  leaderboardService,
  recordsStore,
  leaderboardPageSize: LEADERBOARD_PAGE_SIZE,
  hasActiveGameplay,
});

app.get('/api/landing/latest-runs', (req, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Math.max(1, Math.min(12, Number(req.query.page_size) || 6));
  const payload = hasActiveGameplay() && typeof recordsStore.listLatestPlayerRunsMemory === 'function'
    ? recordsStore.listLatestPlayerRunsMemory(page, pageSize)
    : recordsStore.listLatestPlayerRuns(page, pageSize);

  res.json({
    ok: true,
    runs: payload.items,
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
    totalPages: payload.totalPages,
    now: Date.now(),
  });
});

app.get('/api/landing/live-run', (req, res) => {
  const requestedRoomCode = cleanRoomCodeForLookup(req.query.roomCode || req.query.room || '');
  const localActiveRooms = sortLandingLiveRooms(listLocalActiveRooms());
  const allActiveRooms = listRoomsForLobby().filter((room) => Math.max(0, Number(room?.players) || 0) > 0);
  const featuredRoom = getFeaturedLandingLiveRoom(requestedRoomCode);
  const latestRunsPayload = hasActiveGameplay() && typeof recordsStore.listLatestPlayerRunsMemory === 'function'
    ? recordsStore.listLatestPlayerRunsMemory(1, 1)
    : recordsStore.listLatestPlayerRuns(1, 1);
  const fallbackRun = latestRunsPayload?.items?.[0] || null;
  const fallbackReplayId = Math.max(0, Number(fallbackRun?.id) || 0);
  const roomSummaries = localActiveRooms.map(buildLandingLiveRoomSummary).filter(Boolean);
  const selectedRoomCode = featuredRoom ? cleanRoomCodeForLookup(featuredRoom.code) : '';

  res.json({
    ok: true,
    live: Boolean(featuredRoom),
    featuredRun: buildLandingLiveRoomPayload(featuredRoom),
    liveRuns: roomSummaries,
    selectedRoomCode,
    activeRuns: allActiveRooms.length,
    localActiveRuns: localActiveRooms.length,
    presence: getPresenceStats(),
    fallbackRun: fallbackRun ? {
      id: fallbackReplayId,
      name: fallbackRun.name,
      at: Math.max(0, Number(fallbackRun.at) || 0),
      kills: Math.max(0, Number(fallbackRun.kills) || 0),
      score: Math.max(0, Number(fallbackRun.score) || 0),
      durationSec: Math.max(0, Number(fallbackRun.durationSec) || 0),
      roomCode: fallbackRun.roomCode || '',
      runDetails: fallbackRun.runDetails || {},
      replayUrl: fallbackReplayId > 0 ? `/play?replay=${fallbackReplayId}&replayPath=${encodeURIComponent(`/api/leaderboard/runs/${fallbackReplayId}/replay`)}` : '/play',
    } : null,
    now: Date.now(),
  });
});

app.get('/api/player/run-history', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }

  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.page_size) || 20;
  const payload = hasActiveGameplay() && typeof recordsStore.listPlayerRunsByNameMemory === 'function'
    ? recordsStore.listPlayerRunsByNameMemory(req.playerUser.nickname, page, pageSize)
    : recordsStore.listPlayerRunsByName(req.playerUser.nickname, page, pageSize);

  const runs = payload.items.map((run) => ({
    ...run,
    replayApiPath: '/api/player/run-history/' + Math.max(0, Number(run?.id) || 0) + '/replay',
  }));

  res.json({
    ok: true,
    runs,
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
    totalPages: payload.totalPages,
    now: Date.now(),
  });
});

app.get('/api/player/run-history/:id/replay', (req, res) => {
  if (!req.playerUser) {
    res.status(401).json({ ok: false, message: 'Authentication required' });
    return;
  }
  if (hasActiveGameplay()) {
    res.status(503).json({
      ok: false,
      error: 'Replay loading is paused during an active match.',
      lowLatencyMode: true,
      recordId: Math.max(0, Number(req.params.id) || 0),
      now: Date.now(),
    });
    return;
  }

  const payload = recordsStore.getPlayerRunReplayByNameAndId(req.playerUser.nickname, req.params.id);
  if (!payload?.replay) {
    res.status(404).json({
      error: 'Replay not found.',
      recordId: Math.max(0, Number(req.params.id) || 0),
      now: Date.now(),
    });
    return;
  }

  res.json({
    record: {
      id: payload.id,
      name: payload.name,
      kills: payload.kills,
      score: payload.score,
      roomCode: payload.roomCode,
      durationSec: payload.durationSec,
      at: payload.at,
    },
    replay: payload.replay,
    now: Date.now(),
  });
});

app.get('/api/skills', (_req, res) => {
  const active = skillsStore.getActiveCollection();
  res.json({
    skills: skillsStore.getList(),
    activeCollection: active ? { id: active.id, name: active.name, updatedAt: active.updatedAt } : null,
    instanceId: INSTANCE_ID,
    now: Date.now(),
  });
});

app.get('/api/admin/skills', requireAdmin, (req, res) => {
  const collectionId = (req.query.collection_id || '').toString();
  res.json({ ok: true, ...skillsStore.getAdminPayload(collectionId) });
});

app.post('/api/admin/skill-collections', requireAdmin, (req, res) => {
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const result = skillsStore.createCollection({
    name: payload.name,
    sourceCollectionId: payload.sourceCollectionId,
  });
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, collection: result.collection, ...skillsStore.getAdminPayload(result.collection.id) });
});

app.put('/api/admin/skill-collections/:id', requireAdmin, (req, res) => {
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const result = skillsStore.renameCollection(req.params.id, payload.name);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, collection: result.collection, ...skillsStore.getAdminPayload(result.collection.id) });
});

app.post('/api/admin/skill-collections/:id/activate', requireAdmin, (req, res) => {
  const result = skillsStore.activateCollection(req.params.id);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, collection: result.collection, ...skillsStore.getAdminPayload(result.collection.id) });
});

app.delete('/api/admin/skill-collections/:id', requireAdmin, (req, res) => {
  const result = skillsStore.deleteCollection(req.params.id);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, ...skillsStore.getAdminPayload(result.activeCollectionId) });
});

app.put('/api/admin/skills/:id', requireAdmin, (req, res) => {
  const id = (req.params.id || '').toString().trim().toLowerCase();
  const collectionId = (req.query.collection_id || '').toString();
  const existing = skillsStore.getById(id, collectionId);
  if (!existing) {
    res.status(404).json({ ok: false, message: 'Skill not found' });
    return;
  }
  const patch = req.body && typeof req.body === 'object' ? req.body : {};
  const result = skillsStore.updateSkill(id, patch, collectionId);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, skill: result.skill, ...skillsStore.getAdminPayload(result.collection?.id) });
});

app.get('/api/admin/world-content', requireAdmin, (_req, res) => {
  res.json({ ok: true, ...worldContentStore.getAdminPayload(), now: Date.now() });
});

app.put('/api/admin/world-content', requireAdmin, (req, res) => {
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const result = worldContentStore.saveAdminPayload(payload);
  if (!result.ok) {
    res.status(result.code || 400).json({ ok: false, message: result.message || 'Failed to save world content' });
    return;
  }
  refreshWorldContentRuntime();
  const refreshedRooms = refreshActiveRoomScenesFromWorldContent();
  res.json({ ok: true, ...result, refreshedRooms, now: Date.now() });
});

app.post('/api/admin/world-content/reset', requireAdmin, (_req, res) => {
  const result = worldContentStore.resetToDefaults();
  if (!result.ok) {
    res.status(result.code || 500).json({ ok: false, message: result.message || 'Failed to reset world content' });
    return;
  }
  refreshWorldContentRuntime();
  const refreshedRooms = refreshActiveRoomScenesFromWorldContent();
  res.json({ ok: true, ...result, refreshedRooms, now: Date.now() });
});

function getRoomWorld(room = null) {
  const width = Math.max(1200, Number(room?.world?.width) || WORLD_WIDTH);
  const height = Math.max(900, Number(room?.world?.height) || WORLD_HEIGHT);
  return { width, height };
}

function getRoomWorldWidth(room = null) {
  return getRoomWorld(room).width;
}

function getRoomWorldHeight(room = null) {
  return getRoomWorld(room).height;
}

function getEnemySpawnPadding(room = null) {
  const world = getRoomWorld(room);
  return Math.max(72, Math.round(Math.min(world.width, world.height) * 0.03));
}

function getEnemyWorldBounds(room = null) {
  const world = getRoomWorld(room);
  const padding = getEnemySpawnPadding(room);
  return {
    minX: -padding,
    maxX: world.width + padding,
    minY: -padding,
    maxY: world.height + padding,
  };
}

function randomSpawnEdge(room = null) {
  const world = getRoomWorld(room);
  const edgePadding = getEnemySpawnPadding(room);
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * world.width, y: -edgePadding };
  if (side === 1) return { x: world.width + edgePadding, y: Math.random() * world.height };
  if (side === 2) return { x: Math.random() * world.width, y: world.height + edgePadding };
  return { x: -edgePadding, y: Math.random() * world.height };
}

function randomPlayerSpawn(room = null, gameMode = 'normal') {
  const world = getRoomWorld(room);
  if (normalizeGameMode(gameMode) === 'pvp') {
    const margin = PLAYER_RADIUS + 40;
    return {
      x: margin + Math.random() * Math.max(1, world.width - margin * 2),
      y: margin + Math.random() * Math.max(1, world.height - margin * 2),
    };
  }
  return {
    x: world.width / 2 + (Math.random() - 0.5) * 260,
    y: world.height / 2 + (Math.random() - 0.5) * 200,
  };
}

function generateTrees(worldOrRoom = null, densityMul = 1, options = {}) {
  const world = worldOrRoom?.width && worldOrRoom?.height ? worldOrRoom : getRoomWorld(worldOrRoom);
  const trees = [];
  const baseArea = WORLD_WIDTH * WORLD_HEIGHT;
  const worldArea = Math.max(baseArea, world.width * world.height);
  const targetCount = Math.max(18, Math.round(TREE_COUNT * (worldArea / baseArea) * Math.max(0.15, Number(densityMul) || 1)));
  let attempts = 0;
  while (trees.length < targetCount && attempts < targetCount * 8) {
    attempts += 1;
    const x = 120 + Math.random() * Math.max(1, world.width - 240);
    const y = 120 + Math.random() * Math.max(1, world.height - 240);
    const dx = x - world.width / 2;
    const dy = y - world.height / 2;
    if (dx * dx + dy * dy < 260 * 260) continue;
    if (isTreePlacementBlocked(x, y, options)) continue;
    trees.push({ x, y, scale: 0.7 + Math.random() * 0.6 });
  }
  return trees;
}

const BUILDING_FOOTPRINT_POINTS = Object.freeze([
  [-0.5, -0.02],
  [-0.32, -0.38],
  [0, -0.5],
  [0.32, -0.38],
  [0.5, -0.02],
  [0.42, 0.38],
  [0, 0.5],
  [-0.42, 0.38],
]);

const SCENE_PROP_TEMPLATES = {
  red_hatchback: {
    spriteKey: 'car_red',
    w: 104,
    h: 62,
    anchorY: 0.56,
    shadowScale: 1,
    collisionScaleX: 0.88,
    collisionScaleY: 0.58,
    collisionOffsetY: 4,
    solid: true,
    solidAfterDestroyed: true,
    destructible: true,
    maxHp: 78,
    explosive: true,
    explosionRadius: 96,
    explosionDamage: 30,
  },
  burnt_sedan: {
    spriteKey: 'car_blue',
    w: 110,
    h: 64,
    anchorY: 0.56,
    shadowScale: 1.05,
    collisionScaleX: 0.9,
    collisionScaleY: 0.58,
    collisionOffsetY: 4,
    solid: true,
    solidAfterDestroyed: true,
    destructible: true,
    maxHp: 88,
    explosive: false,
  },
  yellow_bus: {
    spriteKey: 'bus_yellow',
    w: 194,
    h: 78,
    anchorY: 0.57,
    shadowScale: 1.28,
    collisionScaleX: 0.92,
    collisionScaleY: 0.6,
    collisionOffsetY: 5,
    solid: true,
    solidAfterDestroyed: true,
    destructible: true,
    maxHp: 184,
    explosive: true,
    explosionRadius: 152,
    explosionDamage: 52,
  },
  ambulance_van: {
    spriteKey: 'ambulance',
    w: 128,
    h: 72,
    anchorY: 0.56,
    shadowScale: 1.08,
    collisionScaleX: 0.9,
    collisionScaleY: 0.58,
    collisionOffsetY: 4,
    solid: true,
    solidAfterDestroyed: true,
    destructible: true,
    maxHp: 112,
    explosive: true,
    explosionRadius: 116,
    explosionDamage: 42,
  },
  concrete_barrier: {
    spriteKey: 'barrier',
    w: 120,
    h: 42,
    anchorY: 0.52,
    shadowScale: 0.92,
    collisionScaleX: 0.96,
    collisionScaleY: 0.76,
    collisionOffsetY: 2,
    solid: true,
    solidAfterDestroyed: true,
    destructible: true,
    maxHp: 104,
    explosive: false,
  },
  road_shack: {
    spriteKey: 'shack',
    w: 170,
    h: 128,
    anchorY: 0.58,
    shadowScale: 1.18,
    collisionScaleX: 0.92,
    collisionScaleY: 0.78,
    collisionOffsetY: 12,
    solid: true,
    destructible: false,
    maxHp: 168,
    explosive: false,
  },
  mall_block: {
    spriteKey: 'mall_block',
    w: 720,
    h: 280,
    anchorY: 0.54,
    shadowScale: 1.4,
    collisionScaleX: 0.96,
    collisionScaleY: 0.86,
    collisionOffsetY: 18,
    solid: true,
    destructible: false,
    maxHp: 720,
    explosive: false,
  },
  clinic_block: {
    spriteKey: 'clinic_block',
    w: 520,
    h: 232,
    anchorY: 0.54,
    shadowScale: 1.28,
    collisionScaleX: 0.94,
    collisionScaleY: 0.84,
    collisionOffsetY: 16,
    solid: true,
    destructible: false,
    maxHp: 560,
    explosive: false,
  },
  industrial_tank: {
    spriteKey: 'industrial_tank',
    w: 246,
    h: 198,
    anchorY: 0.56,
    shadowScale: 1.18,
    collisionScaleX: 0.86,
    collisionScaleY: 0.82,
    collisionOffsetY: 10,
    solid: true,
    destructible: false,
    maxHp: 320,
    explosive: false,
  },
  reactor_block: {
    spriteKey: 'reactor_block',
    w: 436,
    h: 256,
    anchorY: 0.55,
    shadowScale: 1.32,
    collisionScaleX: 0.94,
    collisionScaleY: 0.86,
    collisionOffsetY: 18,
    solid: true,
    destructible: false,
    maxHp: 620,
    explosive: false,
  },
  bullet_bistro_bunker: {
    spriteKey: 'build_1',
    w: 520,
    h: 520,
    anchorY: 0.68,
    shadowScale: 1.34,
    collisionShape: 'polygon',
    collisionPoints: BUILDING_FOOTPRINT_POINTS,
    collisionScaleX: 0.66,
    collisionScaleY: 0.3,
    collisionOffsetY: 26,
    solid: true,
    destructible: false,
    maxHp: 900,
    explosive: false,
  },
  fuel_hell_checkpoint: {
    spriteKey: 'build_2',
    w: 540,
    h: 540,
    anchorY: 0.68,
    shadowScale: 1.32,
    collisionShape: 'polygon',
    collisionPoints: BUILDING_FOOTPRINT_POINTS,
    collisionScaleX: 0.68,
    collisionScaleY: 0.3,
    collisionOffsetY: -10,
    solid: true,
    destructible: false,
    maxHp: 780,
    explosive: false,
  },
  haven_nope_tower: {
    spriteKey: 'build_3',
    w: 520,
    h: 520,
    anchorY: 0.7,
    shadowScale: 1.28,
    collisionShape: 'polygon',
    collisionPoints: BUILDING_FOOTPRINT_POINTS,
    collisionScaleX: 0.62,
    collisionScaleY: 0.27,
    collisionOffsetY: 60,
    solid: true,
    destructible: false,
    maxHp: 980,
    explosive: false,
  },
  fix_or_die_garage: {
    spriteKey: 'build_4',
    w: 520,
    h: 520,
    anchorY: 0.68,
    shadowScale: 1.3,
    collisionShape: 'polygon',
    collisionPoints: BUILDING_FOOTPRINT_POINTS,
    collisionScaleX: 0.68,
    collisionScaleY: 0.29,
    collisionOffsetY: 22,
    solid: true,
    destructible: false,
    maxHp: 760,
    explosive: false,
  },
  almost_alive_clinic: {
    spriteKey: 'build_5',
    w: 520,
    h: 520,
    anchorY: 0.68,
    shadowScale: 1.34,
    collisionShape: 'polygon',
    collisionPoints: BUILDING_FOOTPRINT_POINTS,
    collisionScaleX: 0.68,
    collisionScaleY: 0.3,
    collisionOffsetY: 17,
    solid: true,
    destructible: false,
    maxHp: 840,
    explosive: false,
  },
  hellmart_24_7: {
    spriteKey: 'build_6',
    w: 500,
    h: 500,
    anchorY: 0.68,
    shadowScale: 1.28,
    collisionShape: 'polygon',
    collisionPoints: BUILDING_FOOTPRINT_POINTS,
    collisionScaleX: 0.66,
    collisionScaleY: 0.29,
    collisionOffsetY: 24,
    solid: true,
    destructible: false,
    maxHp: 740,
    explosive: false,
  },
  dead_signal_station: {
    spriteKey: 'build_7',
    w: 520,
    h: 520,
    anchorY: 0.68,
    shadowScale: 1.32,
    collisionShape: 'polygon',
    collisionPoints: BUILDING_FOOTPRINT_POINTS,
    collisionScaleX: 0.66,
    collisionScaleY: 0.29,
    collisionOffsetY: 66,
    solid: true,
    destructible: false,
    maxHp: 820,
    explosive: false,
  },
};

function getScenePropTemplate(kind) {
  return SCENE_PROP_TEMPLATES[String(kind || '').trim()] || null;
}

function buildMapObjectRect(obj, pad = 0) {
  const width = Math.max(16, Number(obj?.collisionW) || Number(obj?.w) || 0);
  const height = Math.max(16, Number(obj?.collisionH) || Number(obj?.h) || 0);
  const offsetY = Number(obj?.collisionOffsetY) || 0;
  return {
    minX: (Number(obj?.x) || 0) - width * 0.5 - pad,
    maxX: (Number(obj?.x) || 0) + width * 0.5 + pad,
    minY: (Number(obj?.y) || 0) + offsetY - height * 0.5 - pad,
    maxY: (Number(obj?.y) || 0) + offsetY + height * 0.5 + pad,
  };
}

function rectsOverlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function getMapObjectCollisionPolygon(obj, pad = 0) {
  const points = Array.isArray(obj?.collisionPoints) ? obj.collisionPoints : [];
  if (points.length < 3) return null;
  const centerX = Number(obj?.x) || 0;
  const centerY = (Number(obj?.y) || 0) + (Number(obj?.collisionOffsetY) || 0);
  const width = Math.max(16, Number(obj?.collisionW) || Number(obj?.w) || 0);
  const height = Math.max(16, Number(obj?.collisionH) || Number(obj?.h) || 0);
  const inflate = Math.max(0, Number(pad) || 0);
  return points
    .map((point) => {
      const px = Array.isArray(point) ? Number(point[0]) : Number(point?.x);
      const py = Array.isArray(point) ? Number(point[1]) : Number(point?.y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
      let x = centerX + px * width;
      let y = centerY + py * height;
      if (inflate > 0) {
        const dx = x - centerX;
        const dy = y - centerY;
        const len = Math.hypot(dx, dy) || 1;
        x += (dx / len) * inflate;
        y += (dy / len) * inflate;
      }
      return { x, y };
    })
    .filter(Boolean);
}

function getPolygonBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points || []) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

function pointInsidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    const crosses = ((a.y > y) !== (b.y > y))
      && (x < ((b.x - a.x) * (y - a.y)) / ((b.y - a.y) || 0.000001) + a.x);
    if (crosses) inside = !inside;
  }
  return inside;
}

function getClosestPointOnSegment(x, y, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 0.000001) return { x: ax, y: ay, t: 0 };
  const t = clamp(((x - ax) * abx + (y - ay) * aby) / lenSq, 0, 1);
  return { x: ax + abx * t, y: ay + aby * t, t };
}

function getClosestPointOnPolygon(x, y, points) {
  let best = null;
  let bestD2 = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const point = getClosestPointOnSegment(x, y, a.x, a.y, b.x, b.y);
    const dx = x - point.x;
    const dy = y - point.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = { ...point, edgeA: a, edgeB: b, d2 };
    }
  }
  return best || { x, y, d2: 0 };
}

function getClosestPointOnMapObject(x, y, obj, pad = 0) {
  const polygon = getMapObjectCollisionPolygon(obj, pad);
  if (polygon && polygon.length >= 3) return getClosestPointOnPolygon(Number(x) || 0, Number(y) || 0, polygon);
  return getClosestPointOnRect(x, y, buildMapObjectRect(obj, pad));
}

function isPointInsideMapObject(x, y, obj, pad = 0) {
  const polygon = getMapObjectCollisionPolygon(obj, pad);
  if (polygon && polygon.length >= 3) return pointInsidePolygon(Number(x) || 0, Number(y) || 0, polygon);
  return isPointInsideRect(x, y, buildMapObjectRect(obj, pad));
}

function pushCircleOutOfPolygon(x, y, radius, points) {
  if (!Array.isArray(points) || points.length < 3) return { x, y };
  const closest = getClosestPointOnPolygon(x, y, points);
  const inside = pointInsidePolygon(x, y, points);
  let dx = x - closest.x;
  let dy = y - closest.y;
  let dist = Math.hypot(dx, dy);
  if (!inside && dist >= radius) return { x, y };
  if (inside) {
    dx = closest.x - x;
    dy = closest.y - y;
    dist = Math.hypot(dx, dy);
  }
  if (dist <= 0.001) {
    const bounds = getPolygonBounds(points);
    const cx = bounds ? (bounds.minX + bounds.maxX) * 0.5 : x;
    const cy = bounds ? (bounds.minY + bounds.maxY) * 0.5 : y;
    if (inside && closest.edgeA && closest.edgeB) {
      const ex = closest.edgeB.x - closest.edgeA.x;
      const ey = closest.edgeB.y - closest.edgeA.y;
      dx = -ey;
      dy = ex;
      const mx = (closest.edgeA.x + closest.edgeB.x) * 0.5;
      const my = (closest.edgeA.y + closest.edgeB.y) * 0.5;
      if ((dx * (mx - cx) + dy * (my - cy)) < 0) {
        dx = -dx;
        dy = -dy;
      }
    } else {
      dx = x - cx;
      dy = y - cy;
    }
    dist = Math.hypot(dx, dy) || 1;
  }
  const push = inside ? radius + dist + 0.5 : radius - dist + 0.5;
  return {
    x: x + (dx / dist) * push,
    y: y + (dy / dist) * push,
  };
}

function pushCircleOutOfMapObject(x, y, radius, obj) {
  const polygon = getMapObjectCollisionPolygon(obj);
  if (polygon && polygon.length >= 3) return pushCircleOutOfPolygon(x, y, radius, polygon);
  return pushCircleOutOfRect(x, y, radius, buildMapObjectRect(obj));
}

function segmentIntersectsSegment(ax, ay, bx, by, cx, cy, dx, dy) {
  const rX = bx - ax;
  const rY = by - ay;
  const sX = dx - cx;
  const sY = dy - cy;
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) <= 0.000001) return null;
  const qpx = cx - ax;
  const qpy = cy - ay;
  const t = (qpx * sY - qpy * sX) / denom;
  const u = (qpx * rY - qpy * rX) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: ax + rX * t, y: ay + rY * t, t };
}

function getSegmentPolygonHit(x1, y1, x2, y2, points) {
  if (!Array.isArray(points) || points.length < 3) return null;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const bounds = getPolygonBounds(points);
  const centerX = bounds ? (bounds.minX + bounds.maxX) * 0.5 : x1;
  const centerY = bounds ? (bounds.minY + bounds.maxY) * 0.5 : y1;
  if (pointInsidePolygon(x1, y1, points)) {
    const len = Math.hypot(dx, dy) || 1;
    return { x: x1, y: y1, nx: -dx / len, ny: -dy / len, t: 0 };
  }
  let best = null;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const hit = segmentIntersectsSegment(x1, y1, x2, y2, a.x, a.y, b.x, b.y);
    if (!hit || (best && hit.t >= best.t)) continue;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    let nx = -ey;
    let ny = ex;
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    if ((nx * (mx - centerX) + ny * (my - centerY)) < 0) {
      nx = -nx;
      ny = -ny;
    }
    const nLen = Math.hypot(nx, ny) || 1;
    best = { x: hit.x, y: hit.y, nx: nx / nLen, ny: ny / nLen, t: hit.t };
  }
  return best;
}

function getSegmentMapObjectHit(x1, y1, x2, y2, obj, pad = 0) {
  const polygon = getMapObjectCollisionPolygon(obj, pad);
  if (polygon && polygon.length >= 3) return getSegmentPolygonHit(x1, y1, x2, y2, polygon);
  return getSegmentExpandedRectHit(x1, y1, x2, y2, buildMapObjectRect(obj), pad);
}

function rectIntersectsLine(ax, ay, bx, by, rect) {
  return segmentIntersectsExpandedRect(ax, ay, bx, by, rect, 0);
}

function rectIntersectsMapObject(rect, obj, pad = 0) {
  const polygon = getMapObjectCollisionPolygon(obj, pad);
  if (!polygon || polygon.length < 3) return rectsOverlap(rect, buildMapObjectRect(obj, pad));
  const bounds = getPolygonBounds(polygon);
  if (!bounds || !rectsOverlap(rect, bounds)) return false;
  const corners = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ];
  if (corners.some((point) => pointInsidePolygon(point.x, point.y, polygon))) return true;
  if (polygon.some((point) => isPointInsideRect(point.x, point.y, rect))) return true;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    if (rectIntersectsLine(a.x, a.y, b.x, b.y, rect)) return true;
  }
  return false;
}

function isTreePlacementBlocked(x, y, options = {}) {
  const avoidObjects = Array.isArray(options.avoidObjects) ? options.avoidObjects : [];
  for (const obj of avoidObjects) {
    if (!obj) continue;
    const rect = buildMapObjectRect(obj, 42);
    if (x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY) return true;
  }
  return false;
}

function chooseRandomItem(list) {
  const items = Array.isArray(list) ? list.filter(Boolean) : [];
  if (items.length <= 0) return null;
  return items[Math.floor(Math.random() * items.length)] || null;
}

function sceneCenterSafeRadius(world) {
  return Math.max(280, Math.min(world.width, world.height) * 0.11);
}

function instantiateSceneProp(blueprint, world, nextId) {
  const template = getScenePropTemplate(blueprint?.kind);
  if (!template) return null;
  const zombieBreakable = blueprint?.zombieBreakable === true;
  const destructible = template.destructible === true || zombieBreakable;
  const scale = Math.max(0.45, Number(blueprint?.scale) || 1);
  const width = Math.max(22, Math.round(template.w * scale));
  const height = Math.max(22, Math.round(template.h * scale));
  const marginX = Math.max(64, width * 0.5 + 28);
  const marginY = Math.max(64, height * 0.5 + 28);
  const x = clamp((Number(blueprint?.x) || 0.5) * world.width, marginX, world.width - marginX);
  const y = clamp((Number(blueprint?.y) || 0.5) * world.height, marginY, world.height - marginY);
  const maxHp = destructible ? Math.max(1, Math.round((Number(template.maxHp) || 1) * Math.max(0.6, Number(blueprint?.hpMul) || 1))) : 1;
  const collisionScaleX = Math.max(0.24, Number(template.collisionScaleX) || 1);
  const collisionScaleY = Math.max(0.24, Number(template.collisionScaleY) || 1);
  const collisionPoints = Array.isArray(template.collisionPoints)
    ? template.collisionPoints
      .map((point) => (Array.isArray(point) ? [Number(point[0]), Number(point[1])] : null))
      .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    : [];
  const fallbackExplosionRadius = zombieBreakable ? clamp(Math.max(width, height) * 0.34, 72, 180) : 0;
  const fallbackExplosionDamage = zombieBreakable ? clamp(Math.round(maxHp * 0.14), 18, 48) : 0;
  return {
    id: `prop_${nextId}`,
    kind: String(blueprint.kind),
    spriteKey: template.spriteKey,
    x,
    y,
    w: width,
    h: height,
    angle: Number(blueprint?.angle) || 0,
    anchorY: Number(template.anchorY) || 0.56,
    shadowScale: Number(template.shadowScale) || 1,
    collisionW: Math.max(18, Math.round(width * collisionScaleX)),
    collisionH: Math.max(18, Math.round(height * collisionScaleY)),
    collisionOffsetY: Math.round(Number(template.collisionOffsetY) || 0),
    collisionShape: collisionPoints.length >= 3 ? 'polygon' : String(template.collisionShape || 'rect'),
    collisionPoints,
    solid: template.solid !== false,
    solidAfterDestroyed: zombieBreakable ? false : template.solidAfterDestroyed === true,
    destructible,
    zombieBreakable,
    hideAfterDestroyed: zombieBreakable,
    maxHp,
    hp: maxHp,
    explosive: template.explosive === true || zombieBreakable,
    explosionRadius: Math.max(0, Number(template.explosionRadius) || fallbackExplosionRadius),
    explosionDamage: Math.max(0, Number(template.explosionDamage) || fallbackExplosionDamage),
    destroyed: false,
    destroyedAt: 0,
    lastHitAt: 0,
    styleTag: String(blueprint?.styleTag || ''),
  };
}

function canPlaceSceneProp(objects, candidate, world, options = {}) {
  if (!candidate) return false;
  if (options.allowCenter !== true) {
    const centerDx = candidate.x - world.width * 0.5;
    const centerDy = candidate.y - world.height * 0.5;
    const centerClear = sceneCenterSafeRadius(world);
    if ((centerDx * centerDx) + (centerDy * centerDy) < centerClear * centerClear) return false;
  }
  const rect = buildMapObjectRect(candidate, 42);
  for (const obj of objects) {
    if (!obj) continue;
    if (rectsOverlap(rect, buildMapObjectRect(obj, 34))) return false;
  }
  return true;
}

function buildRoomScene(content) {
  const mapDef = content?.mapDef || getMapDef(content?.mapId);
  const world = content?.world || getRoomWorld(null);
  const scene = mapDef?.scene && typeof mapDef.scene === 'object' ? mapDef.scene : {};
  const terrainZones = Array.isArray(scene.terrainZones)
    ? scene.terrainZones.map((zoneDef, index) => ({
      id: `zone_${index + 1}`,
      material: String(zoneDef?.material || scene.baseMaterial || 'asphalt_wet'),
      shape: String(zoneDef?.shape || 'ellipse'),
      x: clamp((Number(zoneDef?.x) || 0.5) * world.width, 0, world.width),
      y: clamp((Number(zoneDef?.y) || 0.5) * world.height, 0, world.height),
      w: Math.max(60, (Number(zoneDef?.w) || 0.18) * world.width),
      h: Math.max(60, (Number(zoneDef?.h) || 0.18) * world.height),
      alpha: Math.max(0.08, Math.min(1, Number(zoneDef?.alpha) || 0.65)),
      feather: Math.max(0.04, Math.min(0.45, Number(zoneDef?.feather) || 0.18)),
      angle: Number(zoneDef?.angle) || 0,
      centerStripe: zoneDef?.centerStripe === true,
    }))
    : [];

  const objects = [];
  let nextId = 1;
  for (const blueprint of Array.isArray(scene.plannedObjects) ? scene.plannedObjects : []) {
    const obj = instantiateSceneProp(blueprint, world, nextId);
    if (!obj) continue;
    objects.push(obj);
    nextId += 1;
  }

  if (String(content?.runType || 'free') === 'free') {
    const randomProps = scene.randomProps && typeof scene.randomProps === 'object' ? scene.randomProps : null;
    const kinds = Array.isArray(randomProps?.kinds) ? randomProps.kinds : [];
    const countMin = Math.max(0, Math.round(Number(randomProps?.countMin) || 0));
    const countMax = Math.max(countMin, Math.round(Number(randomProps?.countMax) || countMin));
    const targetCount = countMax > 0 ? Math.floor(countMin + Math.random() * (countMax - countMin + 1)) : 0;
    let attempts = 0;
    while (objects.length < targetCount + (Array.isArray(scene.plannedObjects) ? scene.plannedObjects.length : 0) && attempts < Math.max(30, targetCount * 18)) {
      attempts += 1;
      const kind = chooseRandomItem(kinds);
      if (!kind) break;
      const obj = instantiateSceneProp({
        kind,
        x: 0.08 + Math.random() * 0.84,
        y: 0.08 + Math.random() * 0.84,
        angle: (Math.random() - 0.5) * Math.PI * 0.34,
        scale: 0.9 + Math.random() * 0.22,
      }, world, nextId);
      if (!obj || !canPlaceSceneProp(objects, obj, world)) continue;
      objects.push(obj);
      nextId += 1;
    }
  }

  const trees = generateTrees(world, content?.treeDensityMul, { avoidObjects: objects });
  return {
    trees,
    terrainZones,
    mapObjects: objects,
    theme: {
      themeId: String(scene.themeId || mapDef?.id || 'default'),
      baseMaterial: String(scene.baseMaterial || 'asphalt_wet'),
      accent: String(mapDef?.cover?.accent || '#22c55e'),
      glow: String(mapDef?.cover?.glow || 'rgba(34, 197, 94, 0.2)'),
    },
  };
}

function applySceneToRoom(room, scene) {
  if (!room || !scene) return;
  room.trees = scene.trees;
  room.terrainZones = scene.terrainZones;
  room.mapObjects = scene.mapObjects;
  room.sceneTheme = scene.theme;
  markMapObjectsChanged(room);
}

function refreshActiveRoomScenesFromWorldContent() {
  let refreshed = 0;
  for (const room of rooms.values()) {
    const mapDef = getMapDef(room?.mapId);
    if (!room || !mapDef) continue;
    const scene = buildRoomScene({
      runType: room.runType,
      mapId: mapDef.id,
      mapDef,
      world: room.world,
      treeDensityMul: Math.max(0.15, Number(mapDef.treeDensityMul) || 1),
    });
    applySceneToRoom(room, scene);
    refreshed += 1;
  }
  return refreshed;
}

function getSceneObjects(room, options = {}) {
  const solidOnly = options.solidOnly === true;
  return (Array.isArray(room?.mapObjects) ? room.mapObjects : []).filter((obj) => {
    if (!obj) return false;
    if (solidOnly && !obj.solid) return false;
    return true;
  });
}

function pushCircleOutOfRect(x, y, radius, rect) {
  const closestX = clamp(x, rect.minX, rect.maxX);
  const closestY = clamp(y, rect.minY, rect.maxY);
  let dx = x - closestX;
  let dy = y - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return { x, y };
  const dist = Math.sqrt(Math.max(0.000001, d2));
  if (dist > 0.001) {
    const push = radius - dist;
    return {
      x: x + (dx / dist) * push,
      y: y + (dy / dist) * push,
    };
  }

  const left = Math.abs(x - rect.minX);
  const right = Math.abs(rect.maxX - x);
  const top = Math.abs(y - rect.minY);
  const bottom = Math.abs(rect.maxY - y);
  const minSide = Math.min(left, right, top, bottom);
  if (minSide === left) return { x: rect.minX - radius, y };
  if (minSide === right) return { x: rect.maxX + radius, y };
  if (minSide === top) return { x, y: rect.minY - radius };
  return { x, y: rect.maxY + radius };
}

function resolveCircleAgainstScene(room, x, y, radius) {
  let resolved = { x, y };
  const objects = getSceneObjects(room, { solidOnly: true });
  for (let pass = 0; pass < 2; pass += 1) {
    for (const obj of objects) {
      resolved = pushCircleOutOfMapObject(resolved.x, resolved.y, radius, obj);
    }
  }
  return resolved;
}

function moveActorWithSceneCollision(room, startX, startY, dx, dy, radius, bounds) {
  let x = clamp(startX + dx, bounds.minX, bounds.maxX);
  let y = clamp(startY, bounds.minY, bounds.maxY);
  let resolved = resolveCircleAgainstScene(room, x, y, radius);
  x = clamp(resolved.x, bounds.minX, bounds.maxX);

  y = clamp(startY + dy, bounds.minY, bounds.maxY);
  resolved = resolveCircleAgainstScene(room, x, y, radius);
  y = clamp(resolved.y, bounds.minY, bounds.maxY);
  return { x, y };
}

function getSegmentExpandedRectHit(x1, y1, x2, y2, rect, pad = 0) {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const minX = rect.minX - pad;
  const maxX = rect.maxX + pad;
  const minY = rect.minY - pad;
  const maxY = rect.maxY + pad;
  const tests = [
    [-dx, x1 - minX],
    [dx, maxX - x1],
    [-dy, y1 - minY],
    [dy, maxY - y1],
  ];
  for (const [p, q] of tests) {
    if (Math.abs(p) < 0.000001) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  const hitX = x1 + dx * t0;
  const hitY = y1 + dy * t0;
  const eps = 0.75;
  let nx = 0;
  let ny = 0;
  if (Math.abs(hitX - minX) <= eps) nx = -1;
  else if (Math.abs(hitX - maxX) <= eps) nx = 1;
  else if (Math.abs(hitY - minY) <= eps) ny = -1;
  else if (Math.abs(hitY - maxY) <= eps) ny = 1;
  if (!nx && !ny) {
    const len = Math.hypot(dx, dy) || 1;
    nx = -dx / len;
    ny = -dy / len;
  }
  return { x: hitX, y: hitY, nx, ny, t: t0 };
}

function segmentIntersectsExpandedRect(x1, y1, x2, y2, rect, pad = 0) {
  return Boolean(getSegmentExpandedRectHit(x1, y1, x2, y2, rect, pad));
}

function getSegmentCircleHit(x1, y1, x2, y2, cx, cy, radius) {
  const r = Math.max(0, Number(radius) || 0);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return { x: x1, y: y1, t: 0 };
  if (a <= 0.000001) return null;
  const b = 2 * (fx * dx + fy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  let t = null;
  if (t1 >= 0 && t1 <= 1) t = t1;
  else if (t2 >= 0 && t2 <= 1) t = t2;
  if (t === null) return null;
  return {
    x: x1 + dx * t,
    y: y1 + dy * t,
    t,
  };
}

function isPointInsideRect(x, y, rect) {
  return x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY;
}

function findSceneBlockingObject(room, x1, y1, x2, y2, pad = 0, options = {}) {
  const excludeId = String(options.excludeId || '');
  const solidObjects = getSceneObjects(room, { solidOnly: true });
  const segDx = x2 - x1;
  const segDy = y2 - y1;
  const segLenSq = Math.max(1, segDx * segDx + segDy * segDy);
  let best = null;
  let bestAlong = Infinity;
  for (const obj of solidObjects) {
    if (!obj) continue;
    if (excludeId && String(obj.id) === excludeId) continue;
    const hit = getSegmentMapObjectHit(x1, y1, x2, y2, obj, pad);
    if (!hit) continue;
    const rect = getPolygonBounds(getMapObjectCollisionPolygon(obj, pad)) || buildMapObjectRect(obj, pad);
    const cx = Number(hit.x) || (rect.minX + rect.maxX) * 0.5;
    const cy = Number(hit.y) || (rect.minY + rect.maxY) * 0.5;
    const along = ((cx - x1) * segDx + (cy - y1) * segDy) / segLenSq;
    if (along < -0.05 || along > 1.05) continue;
    if (along < bestAlong) {
      bestAlong = along;
      best = { obj, rect, centerX: cx, centerY: cy, along, hit };
    }
  }
  return best;
}

function clearEnemyAvoidState(enemy) {
  if (!enemy) return;
  enemy.avoidObjectId = '';
  enemy.avoidWaypointX = 0;
  enemy.avoidWaypointY = 0;
  enemy.avoidUntil = 0;
}

function pointBlockedByScene(room, x, y, options = {}) {
  const excludeId = String(options.excludeId || '');
  for (const obj of getSceneObjects(room, { solidOnly: true })) {
    if (!obj) continue;
    if (excludeId && String(obj.id) === excludeId) continue;
    if (isPointInsideMapObject(x, y, obj, Number(options.pad) || 0)) return true;
  }
  return false;
}

function getCollectibleWorldBounds(room, radius = PLAYER_RADIUS) {
  const world = getRoomWorld(room);
  const margin = Math.max(12, radius + 8);
  return {
    minX: margin,
    maxX: Math.max(margin, world.width - margin),
    minY: margin,
    maxY: Math.max(margin, world.height - margin),
  };
}

function isCollectiblePlacementFree(room, x, y, radius = PLAYER_RADIUS) {
  return !pointBlockedByScene(room, x, y, { pad: Math.max(6, radius * 0.55) });
}

function findNearestCollectibleSpawnPoint(room, x, y, options = {}) {
  if (!room) return { x: Number(x) || 0, y: Number(y) || 0 };
  const radius = Math.max(8, Number(options.radius) || Math.max(10, PLAYER_RADIUS * 0.82));
  const bounds = options.bounds || getCollectibleWorldBounds(room, radius);
  const baseX = clamp(Number(x) || 0, bounds.minX, bounds.maxX);
  const baseY = clamp(Number(y) || 0, bounds.minY, bounds.maxY);
  const tryPoint = (candidateX, candidateY) => {
    let tx = clamp(candidateX, bounds.minX, bounds.maxX);
    let ty = clamp(candidateY, bounds.minY, bounds.maxY);
    if (isCollectiblePlacementFree(room, tx, ty, radius)) return { x: tx, y: ty };
    const resolved = resolveCircleAgainstScene(room, tx, ty, radius);
    tx = clamp(resolved.x, bounds.minX, bounds.maxX);
    ty = clamp(resolved.y, bounds.minY, bounds.maxY);
    if (isCollectiblePlacementFree(room, tx, ty, radius)) return { x: tx, y: ty };
    return null;
  };

  let found = tryPoint(baseX, baseY);
  if (found) return found;

  const ringStep = Math.max(18, radius * 1.9);
  for (let ring = 1; ring <= 8; ring += 1) {
    const dist = ring * ringStep;
    const samples = 8 + ring * 4;
    for (let sample = 0; sample < samples; sample += 1) {
      const angle = (sample / samples) * Math.PI * 2;
      found = tryPoint(baseX + Math.cos(angle) * dist, baseY + Math.sin(angle) * dist);
      if (found) return found;
    }
  }

  return { x: baseX, y: baseY };
}

const SCENE_NAV_CELL_SIZE = 80;
const SCENE_NAV_CELL_INSET = 6;
const SCENE_NAV_BLOCK_PAD = Math.max(ENEMY_RADIUS, PLAYER_RADIUS) + 14;
const SCENE_NAV_FLOW_CACHE_LIMIT = 18;
const SCENE_NAV_DIRECTIONS = [
  { dx: -1, dy: 0, diagonal: false },
  { dx: 1, dy: 0, diagonal: false },
  { dx: 0, dy: -1, diagonal: false },
  { dx: 0, dy: 1, diagonal: false },
  { dx: -1, dy: -1, diagonal: true },
  { dx: 1, dy: -1, diagonal: true },
  { dx: -1, dy: 1, diagonal: true },
  { dx: 1, dy: 1, diagonal: true },
];

function getSceneNavCellIndex(grid, col, row) {
  return row * grid.cols + col;
}

function isSceneNavCellPassable(grid, col, row) {
  if (!grid || col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return false;
  return grid.blocked[getSceneNavCellIndex(grid, col, row)] !== 1;
}

function getSceneNavCellCenter(grid, index) {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return {
    x: Math.min(grid.worldWidth - 1, col * grid.cellSize + grid.cellSize * 0.5),
    y: Math.min(grid.worldHeight - 1, row * grid.cellSize + grid.cellSize * 0.5),
  };
}

function getRoomSceneNavGrid(room) {
  if (!room) return null;
  if (room.sceneNavGrid) return room.sceneNavGrid;
  const world = getRoomWorld(room);
  const solidObjects = getSceneObjects(room, { solidOnly: true });
  const cellSize = SCENE_NAV_CELL_SIZE;
  const cols = Math.max(1, Math.ceil(world.width / cellSize));
  const rows = Math.max(1, Math.ceil(world.height / cellSize));
  const blocked = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const minX = col * cellSize + SCENE_NAV_CELL_INSET;
      const minY = row * cellSize + SCENE_NAV_CELL_INSET;
      const maxX = Math.min(world.width, (col + 1) * cellSize) - SCENE_NAV_CELL_INSET;
      const maxY = Math.min(world.height, (row + 1) * cellSize) - SCENE_NAV_CELL_INSET;
      if (maxX <= minX || maxY <= minY) {
        blocked[index] = 1;
        continue;
      }
      const cellRect = { minX, minY, maxX, maxY };
      let isBlocked = false;
      for (const obj of solidObjects) {
        if (!obj) continue;
        if (rectIntersectsMapObject(cellRect, obj, SCENE_NAV_BLOCK_PAD)) {
          isBlocked = true;
          break;
        }
      }
      blocked[index] = isBlocked ? 1 : 0;
    }
  }
  room.sceneNavGrid = {
    cellSize,
    cols,
    rows,
    blocked,
    worldWidth: world.width,
    worldHeight: world.height,
  };
  room.sceneNavFlowCache = new Map();
  return room.sceneNavGrid;
}

function findNearestSceneNavCell(grid, x, y, maxRing = 8) {
  if (!grid) return -1;
  const baseCol = clamp(Math.floor((Number(x) || 0) / grid.cellSize), 0, grid.cols - 1);
  const baseRow = clamp(Math.floor((Number(y) || 0) / grid.cellSize), 0, grid.rows - 1);
  let bestIndex = -1;
  let bestDistSq = Infinity;
  const inspectCell = (col, row) => {
    if (!isSceneNavCellPassable(grid, col, row)) return;
    const index = getSceneNavCellIndex(grid, col, row);
    const center = getSceneNavCellCenter(grid, index);
    const dx = center.x - x;
    const dy = center.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = index;
    }
  };
  for (let ring = 0; ring <= maxRing; ring += 1) {
    const minCol = Math.max(0, baseCol - ring);
    const maxCol = Math.min(grid.cols - 1, baseCol + ring);
    const minRow = Math.max(0, baseRow - ring);
    const maxRow = Math.min(grid.rows - 1, baseRow + ring);
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (ring > 0 && col > minCol && col < maxCol && row > minRow && row < maxRow) continue;
        inspectCell(col, row);
      }
    }
    if (bestIndex >= 0) return bestIndex;
  }
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) inspectCell(col, row);
  }
  return bestIndex;
}

function getSceneNavFlowField(room, targetX, targetY) {
  const grid = getRoomSceneNavGrid(room);
  if (!grid) return null;
  const goalIndex = findNearestSceneNavCell(grid, targetX, targetY);
  if (goalIndex < 0) return null;
  if (!(room.sceneNavFlowCache instanceof Map)) room.sceneNavFlowCache = new Map();
  if (room.sceneNavFlowCache.has(goalIndex)) return room.sceneNavFlowCache.get(goalIndex) || null;

  const cellCount = grid.cols * grid.rows;
  const dist = new Int16Array(cellCount);
  dist.fill(-1);
  const queue = new Int32Array(cellCount);
  let head = 0;
  let tail = 0;
  dist[goalIndex] = 0;
  queue[tail++] = goalIndex;

  while (head < tail) {
    const index = queue[head++];
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    const nextDist = dist[index] + 1;
    for (const dir of SCENE_NAV_DIRECTIONS) {
      const nextCol = col + dir.dx;
      const nextRow = row + dir.dy;
      if (!isSceneNavCellPassable(grid, nextCol, nextRow)) continue;
      if (dir.diagonal) {
        if (!isSceneNavCellPassable(grid, col + dir.dx, row) || !isSceneNavCellPassable(grid, col, row + dir.dy)) continue;
      }
      const nextIndex = getSceneNavCellIndex(grid, nextCol, nextRow);
      if (dist[nextIndex] >= 0) continue;
      dist[nextIndex] = nextDist;
      queue[tail++] = nextIndex;
    }
  }

  const flow = { goalIndex, dist };
  room.sceneNavFlowCache.set(goalIndex, flow);
  while (room.sceneNavFlowCache.size > SCENE_NAV_FLOW_CACHE_LIMIT) {
    const oldestKey = room.sceneNavFlowCache.keys().next().value;
    room.sceneNavFlowCache.delete(oldestKey);
  }
  return flow;
}

function chooseEnemyNavWaypoint(room, enemy, target, radius, bounds) {
  const grid = getRoomSceneNavGrid(room);
  if (!grid || !enemy || !target) return null;
  const startIndex = findNearestSceneNavCell(grid, enemy.x, enemy.y);
  if (startIndex < 0) return null;
  const flow = getSceneNavFlowField(room, target.x, target.y);
  if (!flow?.dist) return null;
  const currentDist = flow.dist[startIndex];
  if (currentDist < 0) return null;
  if (currentDist === 0) return { x: Number(target.x) || enemy.x, y: Number(target.y) || enemy.y };

  const startCol = startIndex % grid.cols;
  const startRow = Math.floor(startIndex / grid.cols);
  let bestIndex = -1;
  let bestScore = Infinity;

  for (const dir of SCENE_NAV_DIRECTIONS) {
    const nextCol = startCol + dir.dx;
    const nextRow = startRow + dir.dy;
    if (!isSceneNavCellPassable(grid, nextCol, nextRow)) continue;
    if (dir.diagonal) {
      if (!isSceneNavCellPassable(grid, startCol + dir.dx, startRow) || !isSceneNavCellPassable(grid, startCol, startRow + dir.dy)) continue;
    }
    const nextIndex = getSceneNavCellIndex(grid, nextCol, nextRow);
    const nextDist = flow.dist[nextIndex];
    if (nextDist < 0 || nextDist >= currentDist) continue;
    const center = getSceneNavCellCenter(grid, nextIndex);
    const score = nextDist * 1000 + Math.hypot((Number(target.x) || 0) - center.x, (Number(target.y) || 0) - center.y);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = nextIndex;
    }
  }

  if (bestIndex < 0) return null;
  const waypoint = getSceneNavCellCenter(grid, bestIndex);
  const minX = (bounds?.minX ?? 0) + radius;
  const maxX = (bounds?.maxX ?? grid.worldWidth) - radius;
  const minY = (bounds?.minY ?? 0) + radius;
  const maxY = (bounds?.maxY ?? grid.worldHeight) - radius;
  return {
    x: clamp(waypoint.x, minX, maxX),
    y: clamp(waypoint.y, minY, maxY),
  };
}

function chooseEnemyBypassWaypoint(room, enemy, targetX, targetY, radius, bounds, blocking) {
  if (!blocking?.rect) return null;
  const rect = blocking.rect;
  const clear = Math.max(radius + 30, 34);
  const clampX = (value) => clamp(value, bounds.minX + radius, bounds.maxX - radius);
  const clampY = (value) => clamp(value, bounds.minY + radius, bounds.maxY - radius);
  const candidates = [
    {
      x: clampX(rect.minX - clear),
      y: clampY(clamp(targetY, rect.minY - clear, rect.maxY + clear)),
      side: 'left',
    },
    {
      x: clampX(rect.maxX + clear),
      y: clampY(clamp(targetY, rect.minY - clear, rect.maxY + clear)),
      side: 'right',
    },
    {
      x: clampX(clamp(targetX, rect.minX - clear, rect.maxX + clear)),
      y: clampY(rect.minY - clear),
      side: 'top',
    },
    {
      x: clampX(clamp(targetX, rect.minX - clear, rect.maxX + clear)),
      y: clampY(rect.maxY + clear),
      side: 'bottom',
    },
  ];

  let best = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    if (pointBlockedByScene(room, candidate.x, candidate.y, { excludeId: blocking.obj.id, pad: radius * 0.35 })) continue;
    const toWaypoint = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
    if (toWaypoint <= radius * 0.5) continue;
    let score = toWaypoint + Math.hypot(targetX - candidate.x, targetY - candidate.y);
    const firstLegBlocked = Boolean(findSceneBlockingObject(room, enemy.x, enemy.y, candidate.x, candidate.y, radius * 0.65, {
      excludeId: blocking.obj.id,
    }));
    const secondLegBlocked = Boolean(findSceneBlockingObject(room, candidate.x, candidate.y, targetX, targetY, radius * 0.65, {
      excludeId: blocking.obj.id,
    }));
    if (firstLegBlocked) score += 800;
    if (secondLegBlocked) score += 180;
    if (String(enemy.avoidObjectId || '') === String(blocking.obj.id || '')) {
      const sameWaypointDist = Math.hypot((Number(enemy.avoidWaypointX) || 0) - candidate.x, (Number(enemy.avoidWaypointY) || 0) - candidate.y);
      if (sameWaypointDist < 18) score -= 22;
    }
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function canEnemyBreakMapObject(obj) {
  return Boolean(obj?.destructible) && !obj.destroyed && Boolean(obj.solid);
}

function findRoomMapObjectById(room, objectId) {
  const id = String(objectId || '');
  if (!id) return null;
  return (Array.isArray(room?.mapObjects) ? room.mapObjects : []).find((obj) => String(obj?.id || '') === id) || null;
}

function getClosestPointOnRect(x, y, rect) {
  return {
    x: clamp(Number(x) || 0, rect.minX, rect.maxX),
    y: clamp(Number(y) || 0, rect.minY, rect.maxY),
  };
}

function getEnemyMapObjectAttackPoint(enemy, obj, radius, bounds = {}) {
  const rect = getPolygonBounds(getMapObjectCollisionPolygon(obj)) || buildMapObjectRect(obj);
  const closest = getClosestPointOnMapObject(enemy?.x, enemy?.y, obj);
  let nx = (Number(enemy?.x) || 0) - closest.x;
  let ny = (Number(enemy?.y) || 0) - closest.y;
  let len = Math.hypot(nx, ny);
  if (len <= 0.001) {
    const cx = (rect.minX + rect.maxX) * 0.5;
    const cy = (rect.minY + rect.maxY) * 0.5;
    nx = (Number(enemy?.x) || 0) - cx;
    ny = (Number(enemy?.y) || 0) - cy;
    len = Math.hypot(nx, ny) || 1;
  }
  const standOff = Math.max(10, radius + 8);
  const minX = bounds?.minX ?? 0;
  const maxX = bounds?.maxX ?? getRoomWorld(null).width;
  const minY = bounds?.minY ?? 0;
  const maxY = bounds?.maxY ?? getRoomWorld(null).height;
  return {
    x: clamp(closest.x + (nx / len) * standOff, minX + radius, maxX - radius),
    y: clamp(closest.y + (ny / len) * standOff, minY + radius, maxY - radius),
    hitX: closest.x,
    hitY: closest.y,
  };
}

function getEnemyBreakSteerTarget(enemy, obj, radius, bounds) {
  const attackPoint = getEnemyMapObjectAttackPoint(enemy, obj, radius, bounds);
  return {
    x: attackPoint.x,
    y: attackPoint.y,
    targetBlocked: true,
    breakObjectId: String(obj.id || ''),
    breakObjectX: attackPoint.hitX,
    breakObjectY: attackPoint.hitY,
  };
}

function getEnemySteerTarget(room, enemy, target, radius, now, bounds) {
  const direct = {
    x: Number(target?.x) || Number(enemy?.x) || 0,
    y: Number(target?.y) || Number(enemy?.y) || 0,
    targetBlocked: false,
  };
  if (!room || !enemy || !target) return direct;

  const cachedObjectId = String(enemy.avoidObjectId || '');
  const cachedUntil = Math.max(0, Number(enemy.avoidUntil) || 0);
  const cachedX = Number(enemy.avoidWaypointX) || 0;
  const cachedY = Number(enemy.avoidWaypointY) || 0;
  const cachedActive = cachedObjectId && cachedUntil > now;
  const directBlock = findSceneBlockingObject(room, enemy.x, enemy.y, target.x, target.y, radius * 0.72);

  if (!directBlock) {
    clearEnemyAvoidState(enemy);
    return direct;
  }

  if (canEnemyBreakMapObject(directBlock.obj)) {
    clearEnemyAvoidState(enemy);
    return getEnemyBreakSteerTarget(enemy, directBlock.obj, radius, bounds);
  }

  const navWaypoint = chooseEnemyNavWaypoint(room, enemy, target, radius, bounds);
  if (navWaypoint) {
    clearEnemyAvoidState(enemy);
    return { x: navWaypoint.x, y: navWaypoint.y, targetBlocked: true };
  }

  if (cachedActive) {
    const distToWaypoint = Math.hypot(cachedX - enemy.x, cachedY - enemy.y);
    const stillBlockedBySame = String(directBlock.obj?.id || '') === cachedObjectId;
    if (distToWaypoint > Math.max(radius * 0.9, 16) && stillBlockedBySame) {
      return { x: cachedX, y: cachedY, targetBlocked: true };
    }
  }

  const waypoint = chooseEnemyBypassWaypoint(room, enemy, target.x, target.y, radius, bounds, directBlock);
  if (!waypoint) {
    clearEnemyAvoidState(enemy);
    return { ...direct, targetBlocked: true };
  }

  enemy.avoidObjectId = String(directBlock.obj?.id || '');
  enemy.avoidWaypointX = waypoint.x;
  enemy.avoidWaypointY = waypoint.y;
  enemy.avoidUntil = now + 1200;
  return { x: waypoint.x, y: waypoint.y, targetBlocked: true };
}

function markMapObjectsChanged(room) {
  if (!room) return;
  room.mapObjectStateVersion = Math.max(1, Number(room.mapObjectStateVersion) || 1) + 1;
  room.sceneNavGrid = null;
  room.sceneNavFlowCache = new Map();
}

function damageSceneObjectsInRadius(room, x, y, radius, damage, ownerId, now, options = {}) {
  if (!room || radius <= 0 || damage <= 0) return 0;
  let hits = 0;
  const excludeId = String(options.excludeId || '');
  for (const obj of getSceneObjects(room)) {
    if (!obj.destructible || obj.destroyed) continue;
    if (excludeId && String(obj.id) === excludeId) continue;
    const nearest = getClosestPointOnMapObject(x, y, obj);
    const nearestX = nearest.x;
    const nearestY = nearest.y;
    const dx = nearestX - x;
    const dy = nearestY - y;
    const dist = Math.hypot(dx, dy);
    const reach = Math.max(16, radius);
    if (dist > reach) continue;
    const falloff = 1 - Math.min(0.52, (dist / Math.max(1, reach)) * 0.52);
    if (damageMapObject(room, obj, Math.max(1, Math.round(damage * falloff)), ownerId, now, { cause: options.cause || 'explosion' })) {
      hits += 1;
    }
  }
  return hits;
}

function explodeMapObject(room, obj, now, ownerId = '') {
  if (!room || !obj || !obj.explosive || Number(obj.explodedAt) > 0) return false;
  obj.explodedAt = now;
  const radius = Math.max(28, Number(obj.explosionRadius) || 0);
  const damage = Math.max(1, Number(obj.explosionDamage) || 1);
  const ownerKey = String(ownerId || '');
  for (const enemy of room.enemies.slice()) {
    const dx = enemy.x - obj.x;
    const dy = enemy.y - obj.y;
    const reach = radius + Math.max(ENEMY_RADIUS, Number(enemy.radius) || ENEMY_RADIUS);
    const dist = Math.hypot(dx, dy);
    if (dist > reach) continue;
    const falloff = 1 - Math.min(0.48, (dist / Math.max(1, reach)) * 0.48);
    enemyTakeDamage(room, enemy, Math.max(1, Math.round(damage * falloff)), ownerKey, now, {
      sourceX: obj.x,
      sourceY: obj.y,
      stunMs: ENEMY_HIT_STUN_MS * 1.35,
      knockback: ENEMY_HIT_KNOCKBACK_SPEED * 2.1 * falloff,
    });
  }
  for (const player of room.players.values()) {
    if (!player || !player.alive) continue;
    const reach = radius + PLAYER_RADIUS;
    const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
    if (dist > reach) continue;
    const falloff = 1 - Math.min(0.42, (dist / Math.max(1, reach)) * 0.42);
    applyEnemyHitToPlayer(room, player, Math.max(1, Math.round(damage * 0.45 * falloff)), now, {
      applySlow: true,
      sourceX: obj.x,
      sourceY: obj.y,
    });
  }
  damageSceneObjectsInRadius(room, obj.x, obj.y, radius * 0.95, damage * 0.78, ownerKey, now, {
    excludeId: obj.id,
    cause: 'chain_explosion',
  });
  markMapObjectsChanged(room);
  return true;
}

function damageMapObject(room, obj, damage, ownerId = '', now = Date.now(), options = {}) {
  if (!room || !obj || obj.destroyed) return false;
  if (!obj.destructible) return false;
  const amount = Math.max(1, Math.round(Number(damage) || 0));
  if (amount <= 0) return false;
  obj.hp = Math.max(0, Math.round(Number(obj.hp) || 0) - amount);
  obj.lastHitAt = now;
  if (obj.hp <= 0) {
    const clearDestroyedObject = options.clearOnDestroyed === true;
    if (clearDestroyedObject) {
      obj.solidAfterDestroyed = false;
      obj.hideAfterDestroyed = true;
      if (!obj.explosive) {
        const width = Math.max(1, Number(obj.w) || Number(obj.collisionW) || 40);
        const height = Math.max(1, Number(obj.h) || Number(obj.collisionH) || 40);
        obj.explosive = true;
        obj.explosionRadius = Math.max(48, Math.min(180, Math.max(width, height) * 0.34));
        obj.explosionDamage = Math.max(16, Math.min(46, Math.round((Number(obj.maxHp) || 80) * 0.14)));
      }
    }
    obj.hp = 0;
    obj.destroyed = true;
    obj.destroyedAt = now;
    obj.solid = obj.solidAfterDestroyed === true;
    if (obj.explosive) explodeMapObject(room, obj, now, ownerId);
  }
  markMapObjectsChanged(room);
  return true;
}

function cloneMissionGoals(goals) {
  return (Array.isArray(goals) ? goals : []).map((goal) => ({
    type: String(goal?.type || '').trim(),
    target: Math.max(0, Number(goal?.target) || 0),
    label: String(goal?.label || '').trim(),
  })).filter((goal) => goal.type && goal.target > 0);
}

function createCampaignMission(campaignDef, levelDef) {
  if (!campaignDef || !levelDef) return null;
  return {
    runType: 'campaign',
    campaignId: campaignDef.id,
    campaignName: campaignDef.name,
    campaignShortName: campaignDef.shortName,
    levelId: levelDef.id,
    levelIndex: Math.max(0, Number(levelDef.index) || 0),
    title: String(levelDef.title || '').trim(),
    brief: String(levelDef.brief || '').trim(),
    scenario: String(levelDef.scenario || '').trim(),
    goals: cloneMissionGoals(levelDef.goals),
    completedAt: 0,
    failedAt: 0,
    success: false,
  };
}

function cloneMobCatalog(mobs) {
  return JSON.parse(JSON.stringify(Array.isArray(mobs) ? mobs : []));
}

function buildMobCatalog(mobs = getMobDefs()) {
  const source = Array.isArray(mobs) && mobs.length > 0 ? mobs : getMobDefs();
  const list = cloneMobCatalog(source).filter((mob) => mob && mob.id);
  const byId = new Map(list.map((mob) => [String(mob.id || ''), mob]));
  return { list, byId };
}

function getRoomMobDef(room, mobId) {
  const id = String(mobId || '').trim();
  if (room?.mobCatalogById instanceof Map && room.mobCatalogById.has(id)) return room.mobCatalogById.get(id);
  return getMobDef(id);
}

function getMobBehaviorFromDef(mobDef, fallback = 'melee') {
  return String(mobDef?.behavior || fallback || 'melee').trim().toLowerCase() || 'melee';
}

function getEnemyBehavior(enemy) {
  const behavior = String(enemy?.behavior || '').trim().toLowerCase();
  if (behavior) return behavior;
  const type = String(enemy?.type || '').trim().toLowerCase();
  if (type === 'boss') return 'boss';
  if (type === 'ranged') return 'ranged';
  if (type === 'charger') return 'charger';
  return 'melee';
}

function getMobSpawnWeightsFromLevel(levelDef, mobCatalog) {
  const weights = levelDef?.modifiers?.mobWeights;
  if (!weights || typeof weights !== 'object' || Array.isArray(weights)) return null;
  const out = {};
  for (const mob of mobCatalog.list || []) {
    const id = String(mob?.id || '');
    if (!id || getMobBehaviorFromDef(mob) === 'boss') continue;
    const weight = Math.max(0, Number(weights[id]) || 0);
    if (weight > 0) out[id] = weight;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function getDefaultMobSpawnWeights(mobCatalog) {
  const out = {};
  for (const mob of mobCatalog.list || []) {
    const id = String(mob?.id || '');
    if (!id || getMobBehaviorFromDef(mob) === 'boss') continue;
    const weight = Math.max(0, Number(mob?.defaultWeight) || 0);
    if (weight > 0) out[id] = weight;
  }
  if (Object.keys(out).length <= 0) {
    out.normal = 62;
    out.ranged = 16;
    out.charger = 22;
  }
  return out;
}

function getBossMobIdFromLevel(levelDef, mapId, mobCatalog) {
  const bossIds = new Set((mobCatalog?.list || [])
    .filter((mob) => getMobBehaviorFromDef(mob) === 'boss')
    .map((mob) => String(mob.id || '')));
  const requested = String(levelDef?.modifiers?.bossMobId || '').trim();
  if (requested && bossIds.has(requested)) return requested;
  const mapped = getDefaultBossMobIdForMap(mapId);
  if (mapped && bossIds.has(mapped)) return mapped;
  return bossIds.has('boss') ? 'boss' : (Array.from(bossIds)[0] || 'boss');
}

function resolveNewRoomContent(options = {}) {
  reloadWorldContentRuntime();
  const mobCatalog = buildMobCatalog(getMobDefs());
  const requestedRunType = String(options.runType || 'free').trim().toLowerCase() === 'campaign' ? 'campaign' : 'free';
  if (requestedRunType === 'campaign') {
    const campaignId = String(options.campaignId || '').trim();
    const campaignLevelId = String(options.campaignLevelId || '').trim();
    const campaignDef = getCampaignDef(campaignId);
    const levelDef = getCampaignLevelDef(campaignId, campaignLevelId);
    if (!campaignDef || !levelDef) {
      return { ok: false, code: 404, message: 'Campaign or level not found.' };
    }
    const progression = options.progression || null;
    if (!accountProgressionStore.isCampaignLevelUnlocked(progression, campaignId, campaignLevelId)) {
      return { ok: false, code: 403, message: 'Campaign level is locked. Finish previous missions first.' };
    }
    const mapDef = getMapDef(levelDef.mapId);
    const levelModifiers = levelDef.modifiers && typeof levelDef.modifiers === 'object' ? levelDef.modifiers : {};
    const mobSpawnWeights = getMobSpawnWeightsFromLevel(levelDef, mobCatalog) || getDefaultMobSpawnWeights(mobCatalog);
    const bossMobId = getBossMobIdFromLevel(levelDef, mapDef.id, mobCatalog);
    return {
      ok: true,
      runType: 'campaign',
      mapId: mapDef.id,
      mapDef,
      world: {
        width: Math.max(1200, Number(mapDef.worldWidth) || WORLD_WIDTH),
        height: Math.max(900, Number(mapDef.worldHeight) || WORLD_HEIGHT),
      },
      campaignId: campaignDef.id,
      campaignLevelId: levelDef.id,
      mission: createCampaignMission(campaignDef, levelDef),
      enemySpawnMul: Math.max(0.25, Number(levelModifiers.enemySpawnMul) || 1),
      enemyHpMul: Math.max(0.25, Number(levelModifiers.enemyHpMul) || 1),
      bossKillInterval: Math.max(4, Math.round(Number(levelModifiers.bossKillInterval) || BOSS_KILL_INTERVAL)),
      bossMobId,
      treeDensityMul: Math.max(0.15, Number(mapDef.treeDensityMul) || 1),
      mobCatalog,
      mobSpawnWeights,
    };
  }

  const mapDef = getMapDef(options.mapId);
  const mobSpawnWeights = getDefaultMobSpawnWeights(mobCatalog);
  const bossMobId = getBossMobIdFromLevel(null, mapDef.id, mobCatalog);
  return {
    ok: true,
    runType: 'free',
    mapId: mapDef.id,
    mapDef,
    world: {
      width: Math.max(1200, Number(mapDef.worldWidth) || WORLD_WIDTH),
      height: Math.max(900, Number(mapDef.worldHeight) || WORLD_HEIGHT),
    },
    campaignId: '',
    campaignLevelId: '',
    mission: null,
    enemySpawnMul: 1,
    enemyHpMul: 1,
    bossKillInterval: BOSS_KILL_INTERVAL,
    bossMobId,
    treeDensityMul: Math.max(0.15, Number(mapDef.treeDensityMul) || 1),
    mobCatalog,
    mobSpawnWeights,
  };
}

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function cleanRoomCode(raw) {
  const code = (raw || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return code;
}

function findOccupiedPlayer(name) {
  const key = normalizeNickname(name).toLowerCase();
  if (!key) return null;
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      if ((player.name || '').toString().trim().toLowerCase() === key) {
        return { room, player };
      }
    }
  }
  return null;
}

function isSocketOpen(ws) {
  return Boolean(ws && ws.readyState === WebSocket.OPEN);
}

function isPlayerReconnectPending(player, now = Date.now()) {
  return Boolean(
    player
    && player.playerAccountId
    && Math.max(0, Number(player.resumeExpiresAt) || 0) > now,
  );
}

function findRoomPlayerByAccount(playerAccountId, requestedCode = '') {
  const accountId = Math.max(0, Number(playerAccountId) || 0);
  const normalizedCode = cleanRoomCodeForLookup(requestedCode);
  if (!accountId) return null;
  for (const room of rooms.values()) {
    if (normalizedCode && room.code !== normalizedCode) continue;
    for (const player of room.players.values()) {
      if (Math.max(0, Number(player?.playerAccountId) || 0) !== accountId) continue;
      return { room, player };
    }
  }
  return null;
}

function buildPublicActiveRunForPlayer(playerAccount) {
  const accountId = Math.max(0, Number(playerAccount?.id) || 0);
  const byAccount = accountId > 0 ? findRoomPlayerByAccount(accountId) : null;
  const byName = byAccount || findOccupiedPlayer(playerAccount?.nickname || '');
  const room = byName?.room || null;
  const player = byName?.player || null;
  if (!room || !player || room.completedAt) return null;
  const now = Date.now();
  const roomCode = cleanRoomCodeForLookup(room.code);
  const playerScore = Math.max(0, Number(room.scores?.get(player.id)) || 0);
  const playerKills = Math.max(0, Number(room.kills?.get(player.id)) || 0);
  const roomDifficulty = getRoomDifficulty(room, now);
  return {
    live: true,
    roomCode,
    startedAt: Math.max(0, Number(room.startedAt) || 0),
    liveForSec: Math.max(1, Math.floor((now - (Number(room.startedAt) || now)) / 1000)),
    gameMode: normalizeGameMode(room.gameMode || 'normal'),
    runType: String(room.runType || 'free'),
    mapId: String(room.mapId || ''),
    campaignId: String(room.campaignId || ''),
    campaignLevelId: String(room.campaignLevelId || ''),
    players: Math.max(0, Number(room.players?.size) || 0),
    maxPlayers: Math.max(1, Number(room.maxPlayers) || getRoomMaxPlayers(room.gameMode)),
    spectators: Math.max(0, Number(room.spectators?.size) || 0),
    totalEnemyKills: Math.max(0, Number(room.totalEnemyKills) || 0),
    totalBossKills: Math.max(0, Number(room.totalBossKills) || 0),
    bossAlive: hasAliveBoss(room),
    roomDifficulty: {
      level: Math.max(1, Number(roomDifficulty.level) || 1),
      hpMul: Number(roomDifficulty.hpMul.toFixed(3)),
      speedMul: Number(roomDifficulty.speedMul.toFixed(3)),
      damageMul: Number(roomDifficulty.damageMul.toFixed(3)),
    },
    spectateUrl: roomCode ? `/play?room=${encodeURIComponent(roomCode)}&mode=spectate` : '/play',
    player: {
      name: String(player.name || playerAccount?.nickname || '').trim(),
      accountId: Math.max(0, Number(player.playerAccountId) || 0),
      heroId: String(player.playerClass || '').trim(),
      heroName: String(heroDefsById[player.playerClass]?.name || player.playerClass || '').trim(),
      level: Math.max(1, Math.floor(Number(player.level) || 1)),
      hp: Math.max(0, Math.round(Number(player.hp) || 0)),
      maxHp: Math.max(1, Math.round(Number(player.maxHp) || PLAYER_HP_MAX)),
      alive: player.alive !== false,
      kills: playerKills,
      score: playerScore,
    },
  };
}

function resolveJoinIdentity(ws, rawName) {
  const normalizedName = normalizeNickname(rawName || 'Fighter') || 'Fighter';
  const nicknameStatus = playerAuthStore.getNicknameStatus(normalizedName);
  if (!nicknameStatus.ok) {
    return {
      ok: false,
      code: 400,
      message: nicknameStatus.message,
      name: normalizedName,
    };
  }
  const occupied = findOccupiedPlayer(normalizedName);
  if (occupied) {
    const occupiedPlayer = occupied.player;
    const sameAccount = occupiedPlayer.playerAccountId
      && ws.playerSession?.player?.id
      && occupiedPlayer.playerAccountId === ws.playerSession.player.id;
    return {
      ok: false,
      code: 409,
      message: sameAccount
        ? `Nickname ${normalizedName} is already active in this room. Open another browser profile or log out to join with a different nickname.`
        : `Nickname ${normalizedName} is already in use.`,
      name: normalizedName,
    };
  }

  const sessionPlayer = ws.playerSession?.player || null;
  if (nicknameStatus.isRegistered) {
    if (!sessionPlayer) {
      return {
        ok: false,
        code: 401,
        message: `Nickname ${normalizedName} is registered. Log in to use it.`,
        name: normalizedName,
      };
    }
    if (sessionPlayer.nicknameKey !== nicknameStatus.nicknameKey) {
      return {
        ok: false,
        code: 403,
        message: `Nickname ${normalizedName} belongs to another account.`,
        name: normalizedName,
      };
    }
    return {
      ok: true,
      name: sessionPlayer.nickname,
      playerAccountId: sessionPlayer.id,
      isRegistered: true,
    };
  }

  return {
    ok: true,
    name: nicknameStatus.nickname,
    playerAccountId: sessionPlayer?.nicknameKey === nicknameStatus.nicknameKey ? sessionPlayer.id : null,
    isRegistered: false,
  };
}

function getOrCreateRoom(requestedCode, requestedSync, requestedGameMode, requestedPvpDurationMin, options = {}) {
  const provided = cleanRoomCode(requestedCode);
  let code = provided;

  if (!code) {
    do {
      code = randomRoomCode();
    } while (rooms.has(code));
  }

  if (!rooms.has(code)) {
    const content = resolveNewRoomContent(options);
    if (!content.ok) return content;
    const scene = buildRoomScene(content);
    const sync = normalizeRoomSync(requestedSync || DEFAULT_ROOM_SYNC);
    const baseGameMode = normalizeGameMode(requestedGameMode || 'normal');
    const gameMode = content.runType === 'campaign' && baseGameMode === 'pvp' ? 'normal' : baseGameMode;
    const pvpDurationMin = normalizePvpDurationMin(requestedPvpDurationMin);
    const baseEnemySpawnMul = gameMode === 'hardcore'
      ? HARDCORE_ENEMY_SPAWN_MUL
      : (gameMode === 'pvp' ? PVP_ENEMY_SPAWN_MUL : 1);
    const baseEnemyHpMul = gameMode === 'hardcore'
      ? HARDCORE_ENEMY_HP_MUL
      : (gameMode === 'pvp' ? PVP_ENEMY_HP_MUL : 1);
    const enemySpawnMul = Number((baseEnemySpawnMul * Math.max(0.25, Number(content.enemySpawnMul) || 1)).toFixed(3));
    const enemyHpMul = Number((baseEnemyHpMul * Math.max(0.25, Number(content.enemyHpMul) || 1)).toFixed(3));
    const startedAt = Date.now();
    const matchDurationSec = gameMode === 'pvp' ? (pvpDurationMin * 60) : 0;
    rooms.set(code, {
      code,
      instanceId: INSTANCE_ID,
      sync,
      runType: content.runType,
      mapId: content.mapId,
      world: content.world,
      mission: content.mission,
      campaignId: content.campaignId,
      campaignLevelId: content.campaignLevelId,
      gameMode,
      maxPlayers: getRoomMaxPlayers(gameMode),
      pvpDurationMin,
      matchDurationSec,
      matchEndsAt: matchDurationSec > 0 ? (startedAt + matchDurationSec * 1000) : 0,
      pvpMatchEnded: false,
      enemySpawnMul,
      enemyHpMul,
      mobCatalog: cloneMobCatalog(content.mobCatalog?.list || []),
      mobCatalogById: content.mobCatalog?.byId instanceof Map ? content.mobCatalog.byId : buildMobCatalog(content.mobCatalog?.list || []).byId,
      mobSpawnWeights: content.mobSpawnWeights || {},
      tickMs: 1000 / sync.tickRate,
      stateIntervalMs: 1000 / sync.stateSendHz,
      stateAccumulatorMs: 0,
      accumulatorMs: 0,
      players: new Map(),
      spectators: new Map(),
      companions: [],
      bullets: [],
      shotEvents: [],
      replayShotEvents: [],
      objectImpactEvents: [],
      replayObjectImpactEvents: [],
      enemies: [],
      drops: [],
      xpOrbs: [],
      skillOrbs: [],
      hasMovingXpOrbs: false,
      chatHistory: [],
      xpMagnetPlayerId: '',
      xpMagnetUntil: 0,
      xpMagnetStartedAt: 0,
      scores: new Map(),
      kills: new Map(),
      nextEnemyId: 1,
      nextCompanionId: 1,
      nextBulletId: 1,
      nextShotEventId: 1,
      nextObjectImpactEventId: 1,
      nextDropId: 1,
      nextXpOrbId: 1,
      nextSkillOrbId: 1,
      nextPortalId: 1,
      bossPortals: [],
      totalEnemyKills: 0,
      totalBossKills: 0,
      nextBossAtKills: Math.max(4, Number(content.bossKillInterval) || BOSS_KILL_INTERVAL),
      bossKillInterval: Math.max(4, Number(content.bossKillInterval) || BOSS_KILL_INTERVAL),
      bossMobId: String(content.bossMobId || 'boss'),
      lastEnemySpawnAt: 0,
      lastCompanionSyncAt: 0,
      startedAt,
      completedAt: 0,
      missionSuccess: false,
      trees: scene.trees,
      terrainZones: scene.terrainZones,
      mapObjects: scene.mapObjects,
      sceneTheme: scene.theme,
      mapObjectStateVersion: 1,
      realtimeCollectionState: {
        drops: { version: 1, lastSentVersion: 0, lastSentAt: 0 },
        xpOrbs: { version: 1, lastSentVersion: 0, lastSentAt: 0 },
        skillOrbs: { version: 1, lastSentVersion: 0, lastSentAt: 0 },
      },
      lastTickDiag: null,
    });
    publishRuntimeRegistry();
  }

  return rooms.get(code);
}
function sendTo(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload), { compress: false });
  }
}

function canSendRealtimeState(ws) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  return Math.max(0, Number(ws.bufferedAmount) || 0) <= WS_STATE_BACKPRESSURE_BYTES;
}

function getOpenSocketBufferStats(room) {
  let recipients = 0;
  let maxBufferedAmount = 0;
  let totalBufferedAmount = 0;
  const collect = (ws) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const bufferedAmount = Math.max(0, Number(ws.bufferedAmount) || 0);
    recipients += 1;
    totalBufferedAmount += bufferedAmount;
    if (bufferedAmount > maxBufferedAmount) maxBufferedAmount = bufferedAmount;
  };
  for (const player of room.players.values()) collect(player.ws);
  for (const spectator of room.spectators.values()) collect(spectator.ws);
  return { recipients, maxBufferedAmount, totalBufferedAmount };
}

function collectRoomRuntimeSnapshot(room) {
  let companionCount = 0;
  let replayFrames = 0;
  for (const player of room.players.values()) {
    if (Array.isArray(player?.companions)) companionCount += player.companions.length;
    if (Array.isArray(player?.runReplay?.frames)) replayFrames += player.runReplay.frames.length;
  }
  const socketStats = getOpenSocketBufferStats(room);
  return {
    roomAgeSec: Math.max(0, Math.round((Date.now() - Math.max(0, Number(room?.startedAt) || 0)) / 1000)),
    players: room.players.size,
    spectators: room.spectators.size,
    companions: companionCount,
    enemies: Array.isArray(room.enemies) ? room.enemies.length : 0,
    bullets: Array.isArray(room.bullets) ? room.bullets.length : 0,
    xpOrbs: Array.isArray(room.xpOrbs) ? room.xpOrbs.length : 0,
    movingXpOrbs: Math.max(0, Number(room?.lastTickDiag?.movingXpOrbs) || 0),
    drops: Array.isArray(room.drops) ? room.drops.length : 0,
    skillOrbs: Array.isArray(room.skillOrbs) ? room.skillOrbs.length : 0,
    shotEvents: Array.isArray(room.shotEvents) ? room.shotEvents.length : 0,
    replayShotEvents: Array.isArray(room.replayShotEvents) ? room.replayShotEvents.length : 0,
    replayFrames,
    recipients: socketStats.recipients,
    maxBufferedAmount: socketStats.maxBufferedAmount,
    totalBufferedAmount: socketStats.totalBufferedAmount,
  };
}

function ensureRealtimeCollectionState(room, key) {
  if (!room || !key) return { version: 1, lastSentVersion: 0, lastSentAt: 0 };
  if (!room.realtimeCollectionState || typeof room.realtimeCollectionState !== 'object') room.realtimeCollectionState = {};
  if (!room.realtimeCollectionState[key] || typeof room.realtimeCollectionState[key] !== 'object') {
    room.realtimeCollectionState[key] = { version: 1, lastSentVersion: 0, lastSentAt: 0 };
  }
  return room.realtimeCollectionState[key];
}

function bumpRealtimeCollectionVersion(room, key) {
  const state = ensureRealtimeCollectionState(room, key);
  state.version = Math.max(1, Number(state.version) || 1) + 1;
  return state.version;
}

function shouldIncludeRealtimeCollection(room, key, now, options = {}) {
  const state = ensureRealtimeCollectionState(room, key);
  const resendMs = Math.max(0, Number(options.resendMs) || REALTIME_STATIC_COLLECTION_RESEND_MS);
  const force = options.force === true;
  if (force || state.lastSentVersion !== state.version || (now - Math.max(0, Number(state.lastSentAt) || 0)) >= resendMs) {
    state.lastSentVersion = state.version;
    state.lastSentAt = now;
    return true;
  }
  return false;
}

function sampleListEvenly(list, limit) {
  const source = Array.isArray(list) ? list : [];
  const maxItems = Math.max(1, Math.floor(Number(limit) || 0));
  if (source.length <= maxItems) return source;
  const out = [];
  const step = source.length / maxItems;
  for (let i = 0; out.length < maxItems && i < source.length; i += step) {
    out.push(source[Math.min(source.length - 1, Math.floor(i))]);
  }
  return out;
}

function sampleReplayXpOrbs(room, limit = REPLAY_XP_ORB_SAMPLE_LIMIT) {
  const source = Array.isArray(room?.xpOrbs) ? room.xpOrbs : [];
  const maxItems = Math.max(1, Math.floor(Number(limit) || 0));
  if (source.length <= maxItems) return source;
  const replayXpAlwaysIncludeRadius = Math.max(
    PLAYER_PICKUP_RADIUS_BASE + 128,
    ...Array.from(room?.players?.values?.() || []).map((player) => Math.max(0, Number(player?.pickupRadius) || PLAYER_PICKUP_RADIUS_BASE) + 128),
  );
  return selectRealtimeEntitiesByInterest(room, source, {
    alwaysIncludeRadius: replayXpAlwaysIncludeRadius,
    radius: Math.max(1200, Math.round(REALTIME_XP_ORB_RADIUS * 1.15)),
    maxItems,
    priorityFn: (orb) => {
      if ((Number(orb?.pullSpeed) || 0) > 1) return -4;
      const xpValue = Math.max(0, Number(orb?.xp) || 0);
      if (xpValue >= 12) return -2;
      if (xpValue >= 6) return -1;
      return 0;
    },
  });
}

function sampleReplayDrops(room, limit = REPLAY_DROP_SAMPLE_LIMIT) {
  const source = Array.isArray(room?.drops) ? room.drops : [];
  const maxItems = Math.max(1, Math.floor(Number(limit) || 0));
  if (source.length <= maxItems) return source;
  return selectRealtimeEntitiesByInterest(room, source, {
    alwaysIncludeRadius: Math.max(DROP_RADIUS + 180, Math.round(REALTIME_DROP_RADIUS * 0.42)),
    radius: Math.max(900, Math.round(REALTIME_DROP_RADIUS * 0.95)),
    maxItems,
    priorityFn: (drop) => {
      const kind = String(drop?.kind || '').toLowerCase();
      if (kind === 'xp_vacuum') return -3;
      return 0;
    },
  });
}

function sampleReplayBullets(room, limit = REPLAY_BULLET_SAMPLE_LIMIT) {
  const source = Array.isArray(room?.bullets) ? room.bullets : [];
  const maxItems = Math.max(1, Math.floor(Number(limit) || 0));
  if (source.length <= maxItems) return source;
  return selectRealtimeEntitiesByInterest(room, source, {
    alwaysIncludeRadius: Math.max(480, Math.round(REALTIME_BULLET_RADIUS * 0.55)),
    radius: REALTIME_BULLET_RADIUS,
    maxItems,
    priorityFn: (bullet) => {
      const kind = String(bullet?.kind || '').toLowerCase();
      if (kind === 'rocket') return -4;
      if (bullet?.fromEnemy) return -3;
      if (bullet?.ownerPlayerId || bullet?.ownerId) return -1;
      return 0;
    },
  });
}

function getEffectiveReplayCaptureIntervalMs(replay, room) {
  const baseMs = Math.max(100, Number(replay?.captureIntervalMs) || REPLAY_CAPTURE_INTERVAL_MS);
  if (!room) return baseMs;
  const xpCount = Array.isArray(room.xpOrbs) ? room.xpOrbs.length : 0;
  const bulletCount = Array.isArray(room.bullets) ? room.bullets.length : 0;
  const enemyCount = Array.isArray(room.enemies) ? room.enemies.length : 0;
  const movingXpOrbs = Math.max(0, Number(room?.lastTickDiag?.movingXpOrbs) || 0);
  const lastStateBytes = Math.max(0, Number(room?.lastRuntimeDiagState?.bytes) || 0);
  let mul = 1;
  if (lastStateBytes >= 32000 || xpCount >= 260 || bulletCount >= 64 || enemyCount >= 96 || movingXpOrbs >= 140) mul = 2;
  else if (lastStateBytes >= 24000 || xpCount >= 180 || bulletCount >= 42 || enemyCount >= 72 || movingXpOrbs >= 80) mul = 1.5;
  else if (lastStateBytes >= 18000 || xpCount >= 110 || bulletCount >= 28 || enemyCount >= 50 || movingXpOrbs >= 36) mul = 1.25;
  return Math.max(baseMs, Math.round(baseMs * mul));
}

function getAlivePlayerAnchors(room) {
  const anchors = [];
  if (!room?.players || typeof room.players.values !== 'function') return anchors;
  for (const player of room.players.values()) {
    if (!player) continue;
    if (player.alive) anchors.push({ x: Number(player.x) || 0, y: Number(player.y) || 0 });
  }
  if (anchors.length > 0) return anchors;
  for (const player of room.players.values()) {
    if (!player) continue;
    anchors.push({ x: Number(player.x) || 0, y: Number(player.y) || 0 });
  }
  return anchors;
}

function nearestAnchorDistanceSq(anchors, x, y) {
  if (!Array.isArray(anchors) || anchors.length <= 0) return 0;
  let best = Infinity;
  for (const anchor of anchors) {
    const dx = (Number(anchor?.x) || 0) - x;
    const dy = (Number(anchor?.y) || 0) - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  return best;
}

function selectRealtimeEntitiesByInterest(room, list, options = {}) {
  const source = Array.isArray(list) ? list : [];
  const maxItems = Math.max(1, Math.floor(Number(options.maxItems) || source.length || 1));
  if (source.length <= maxItems) return source;
  const anchors = getAlivePlayerAnchors(room);
  if (anchors.length <= 0) return source.slice(0, maxItems);
  const radiusSq = Math.max(0, Number(options.radius) || 0) ** 2;
  const alwaysIncludeRadiusSq = Math.max(0, Number(options.alwaysIncludeRadius) || 0) ** 2;
  const priorityFn = typeof options.priorityFn === 'function' ? options.priorityFn : null;
  const alwaysInclude = [];
  const inRange = [];
  const outOfRange = [];
  for (const item of source) {
    const d2 = nearestAnchorDistanceSq(anchors, Number(item?.x) || 0, Number(item?.y) || 0);
    const priority = priorityFn ? Number(priorityFn(item, d2)) || 0 : 0;
    const entry = { item, d2, priority };
    if (alwaysIncludeRadiusSq > 0 && d2 <= alwaysIncludeRadiusSq) {
      alwaysInclude.push(entry);
    } else if (radiusSq <= 0 || d2 <= radiusSq) {
      inRange.push(entry);
    } else {
      outOfRange.push(entry);
    }
  }
  const byPriority = (a, b) => (a.priority - b.priority) || (a.d2 - b.d2);
  alwaysInclude.sort(byPriority);
  inRange.sort(byPriority);
  if (alwaysInclude.length >= maxItems) return alwaysInclude.map((entry) => entry.item);
  if (alwaysInclude.length + inRange.length >= maxItems) {
    return alwaysInclude.concat(inRange.slice(0, maxItems - alwaysInclude.length)).map((entry) => entry.item);
  }
  outOfRange.sort(byPriority);
  return alwaysInclude
    .concat(inRange)
    .concat(outOfRange.slice(0, maxItems - alwaysInclude.length - inRange.length))
    .map((entry) => entry.item);
}

function getAdaptiveStateSendHz(room) {
  const baseHz = Math.max(1, Math.round(Number(room?.sync?.stateSendHz) || DEFAULT_ROOM_SYNC.stateSendHz));
  if (!ADAPTIVE_STATE_SEND_ENABLED) return baseHz;
  const lastState = room?.lastRuntimeDiagState || null;
  const stateBytes = Math.max(0, Number(lastState?.bytes) || 0);
  const maxBufferedAmount = Math.max(0, Number(lastState?.maxBufferedAmount) || 0);
  let hz = baseHz;

  if (maxBufferedAmount >= 192 * 1024) hz = Math.min(hz, 6);
  else if (maxBufferedAmount >= 128 * 1024) hz = Math.min(hz, 8);
  else if (maxBufferedAmount >= 64 * 1024) hz = Math.min(hz, 10);
  else if (maxBufferedAmount >= 24 * 1024) hz = Math.min(hz, 12);

  if (stateBytes >= 44 * 1024) hz = Math.min(hz, 10);
  else if (stateBytes >= 36 * 1024) hz = Math.min(hz, 12);
  else if (stateBytes >= 28 * 1024) hz = Math.min(hz, 15);
  else if (stateBytes >= 20 * 1024) hz = Math.min(hz, 20);

  return Math.max(6, Math.min(baseHz, hz));
}

function appendRuntimeDiagLog(entry) {
  const line = `[runtime-diag] ${JSON.stringify(entry)}`;
  console.warn(line);
  if (!RUNTIME_DIAG_LOG_PATH) return;
  try {
    fs.appendFileSync(RUNTIME_DIAG_LOG_PATH, `${line}\n`, 'utf8');
  } catch (err) {
    console.warn(`[runtime-diag] failed to append ${RUNTIME_DIAG_LOG_PATH}: ${err?.message || err}`);
  }
}

function collectSerializedStatePayloadStats(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  return {
    players: Array.isArray(source.players) ? source.players.length : 0,
    enemies: Array.isArray(source.enemies) ? source.enemies.length : 0,
    bullets: Array.isArray(source.bullets) ? source.bullets.length : 0,
    xpOrbs: Array.isArray(source.xpOrbs) ? source.xpOrbs.length : 0,
    drops: Array.isArray(source.drops) ? source.drops.length : 0,
    skillOrbs: Array.isArray(source.skillOrbs) ? source.skillOrbs.length : 0,
    shotEvents: Array.isArray(source.shotEvents) ? source.shotEvents.length : 0,
    objectImpactEvents: Array.isArray(source.objectImpactEvents) ? source.objectImpactEvents.length : 0,
  };
}

function maybeLogRoomRuntime(room, now, metrics = {}) {
  if (!RUNTIME_DIAG_ENABLED || !room) return;
  if (room.players.size <= 0) {
    runtimeDiagLastRoomLogAt.delete(room.code);
    return;
  }
  const lastState = room.lastRuntimeDiagState || null;
  const snapshot = collectRoomRuntimeSnapshot(room);
  const loopMs = Math.max(0, Number(metrics.loopMs) || 0);
  const tickWorkMs = Math.max(0, Number(metrics.tickWorkMs) || 0);
  const stateBytes = Math.max(0, Number(lastState?.bytes) || 0);
  const stateMaxBuffered = Math.max(
    Math.max(0, Number(lastState?.maxBufferedAmount) || 0),
    Math.max(0, Number(snapshot.maxBufferedAmount) || 0),
  );
  const reasons = [];
  if (loopMs >= RUNTIME_DIAG_SLOW_MS || tickWorkMs >= RUNTIME_DIAG_SLOW_MS) reasons.push('slow_loop');
  if (stateBytes >= RUNTIME_DIAG_STATE_BYTES) reasons.push('large_state');
  if (stateMaxBuffered >= RUNTIME_DIAG_BUFFERED_BYTES) reasons.push('ws_backpressure');
  if (metrics.accumulatorClamped) reasons.push('accumulator_clamped');
  const lastAt = Math.max(0, Number(runtimeDiagLastRoomLogAt.get(room.code)) || 0);
  if (reasons.length <= 0 && now - lastAt < RUNTIME_DIAG_PERIOD_MS) return;
  if (reasons.length <= 0) reasons.push('periodic');
  runtimeDiagLastRoomLogAt.set(room.code, now);
  appendRuntimeDiagLog({
    ts: new Date(now).toISOString(),
    instanceId: INSTANCE_ID,
    room: room.code,
    reasons,
    roomAgeSec: snapshot.roomAgeSec,
    loopMs: Number(loopMs.toFixed(3)),
    tickWorkMs: Number(tickWorkMs.toFixed(3)),
    steps: Math.max(0, Number(metrics.steps) || 0),
    tickMs: Number((Math.max(0, Number(metrics.tickMs) || 0)).toFixed(3)),
    effectiveStateSendHz: Math.max(1, Number(lastState?.stateSendHz) || Number(room?.sync?.stateSendHz) || DEFAULT_ROOM_SYNC.stateSendHz),
    stateBytes,
    serializeMs: Number((Math.max(0, Number(lastState?.serializeMs) || 0)).toFixed(3)),
    jsonMs: Number((Math.max(0, Number(lastState?.jsonMs) || 0)).toFixed(3)),
    broadcastMs: Number((Math.max(0, Number(lastState?.broadcastMs) || 0)).toFixed(3)),
    stateRecipients: Math.max(0, Number(lastState?.recipients) || snapshot.recipients),
    stateSent: Math.max(0, Number(lastState?.sent) || 0),
    stateSkipped: Math.max(0, Number(lastState?.skipped) || 0),
    stateMaxBuffered,
    stateTotalBuffered: Math.max(0, Number(lastState?.totalBufferedAmount) || snapshot.totalBufferedAmount),
    statePlayersSent: Math.max(0, Number(lastState?.playersSent) || 0),
    stateEnemiesSent: Math.max(0, Number(lastState?.enemiesSent) || 0),
    stateBulletsSent: Math.max(0, Number(lastState?.bulletsSent) || 0),
    stateXpOrbsSent: Math.max(0, Number(lastState?.xpOrbsSent) || 0),
    stateDropsSent: Math.max(0, Number(lastState?.dropsSent) || 0),
    stateSkillOrbsSent: Math.max(0, Number(lastState?.skillOrbsSent) || 0),
    stateShotEventsSent: Math.max(0, Number(lastState?.shotEventsSent) || 0),
    players: snapshot.players,
    spectators: snapshot.spectators,
    companions: snapshot.companions,
    enemies: snapshot.enemies,
    bullets: snapshot.bullets,
    xpOrbs: snapshot.xpOrbs,
    movingXpOrbs: snapshot.movingXpOrbs,
    drops: snapshot.drops,
    skillOrbs: snapshot.skillOrbs,
    shotEvents: snapshot.shotEvents,
    replayShotEvents: snapshot.replayShotEvents,
    replayFrames: snapshot.replayFrames,
    tickPlayersMs: Number((Math.max(0, Number(room?.lastTickDiag?.playersMs) || 0)).toFixed(3)),
    tickCompanionsMs: Number((Math.max(0, Number(room?.lastTickDiag?.companionsMs) || 0)).toFixed(3)),
    tickBulletsMs: Number((Math.max(0, Number(room?.lastTickDiag?.bulletsMs) || 0)).toFixed(3)),
    tickEnemiesMs: Number((Math.max(0, Number(room?.lastTickDiag?.enemiesMs) || 0)).toFixed(3)),
    tickXpOrbsMs: Number((Math.max(0, Number(room?.lastTickDiag?.xpOrbsMs) || 0)).toFixed(3)),
    tickDropsMs: Number((Math.max(0, Number(room?.lastTickDiag?.dropsMs) || 0)).toFixed(3)),
    tickSkillOrbsMs: Number((Math.max(0, Number(room?.lastTickDiag?.skillOrbsMs) || 0)).toFixed(3)),
    tickReplayMs: Number((Math.max(0, Number(room?.lastTickDiag?.replayMs) || 0)).toFixed(3)),
    tickSystemMs: Number((Math.max(0, Number(room?.lastTickDiag?.systemMs) || 0)).toFixed(3)),
  });
}

function pushRoomShotEvent(room, event) {
  if (!room || !event) return;
  if (!Array.isArray(room.shotEvents)) room.shotEvents = [];
  if (!Array.isArray(room.replayShotEvents)) room.replayShotEvents = [];
  if (!Number.isFinite(Number(room.nextShotEventId))) room.nextShotEventId = 1;
  const payload = {
    id: room.nextShotEventId++,
    at: Date.now(),
    ...event,
  };
  room.shotEvents.push(payload);
  room.replayShotEvents.push(payload);
  if (room.shotEvents.length > 96) {
    room.shotEvents.splice(0, room.shotEvents.length - 96);
  }
  if (room.replayShotEvents.length > 512) {
    room.replayShotEvents.splice(0, room.replayShotEvents.length - 512);
  }
}

function getMapObjectImpactMaterial(obj) {
  const key = `${String(obj?.kind || '')} ${String(obj?.spriteKey || '')} ${String(obj?.styleTag || '')}`.toLowerCase();
  if (/(car|hatchback|sedan|bus|ambulance|van|tank)/.test(key)) return 'metal';
  if (/(shack|wood|hut)/.test(key)) return 'wood';
  if (/(mall|clinic|reactor|barrier|concrete|block|industrial)/.test(key)) return 'concrete';
  return obj?.destructible ? 'metal' : 'concrete';
}

function pushRoomObjectImpactEvent(room, obj, hit, bullet, now = Date.now()) {
  if (!room || !obj || !hit) return;
  if (!Array.isArray(room.objectImpactEvents)) room.objectImpactEvents = [];
  if (!Array.isArray(room.replayObjectImpactEvents)) room.replayObjectImpactEvents = [];
  if (!Number.isFinite(Number(room.nextObjectImpactEventId))) room.nextObjectImpactEventId = 1;
  const vx = Number(bullet?.vx) || 0;
  const vy = Number(bullet?.vy) || 0;
  const speed = Math.hypot(vx, vy) || 1;
  const payload = {
    id: room.nextObjectImpactEventId++,
    at: now,
    objectId: String(obj.id || ''),
    kind: String(obj.kind || ''),
    spriteKey: String(obj.spriteKey || ''),
    material: getMapObjectImpactMaterial(obj),
    bulletKind: String(bullet?.kind || 'bullet'),
    x: Number(hit.x) || Number(obj.x) || 0,
    y: Number(hit.y) || Number(obj.y) || 0,
    dirX: vx / speed,
    dirY: vy / speed,
    nx: Number(hit.nx) || 0,
    ny: Number(hit.ny) || 0,
    damage: Math.max(0, Number(bullet?.damage) || 0),
  };
  room.objectImpactEvents.push(payload);
  room.replayObjectImpactEvents.push(payload);
  if (room.objectImpactEvents.length > 96) {
    room.objectImpactEvents.splice(0, room.objectImpactEvents.length - 96);
  }
  if (room.replayObjectImpactEvents.length > 512) {
    room.replayObjectImpactEvents.splice(0, room.replayObjectImpactEvents.length - 512);
  }
}

function findBulletObjectImpact(room, prevX, prevY, nextX, nextY, bulletRadius) {
  const solidObjects = getSceneObjects(room, { solidOnly: true });
  let hitObject = null;
  let hitInfo = null;
  for (const obj of solidObjects) {
    const objectHit = getSegmentMapObjectHit(prevX, prevY, nextX, nextY, obj, bulletRadius);
    if (!objectHit) continue;
    if (!hitInfo || Number(objectHit.t) < Number(hitInfo.t)) {
      hitObject = obj;
      hitInfo = objectHit;
    }
  }
  return hitObject && hitInfo ? { obj: hitObject, hit: hitInfo } : null;
}

function applyBulletObjectImpact(room, bullet, impact, now = Date.now()) {
  if (!room || !bullet || !impact?.obj || !impact?.hit) return false;
  const obj = impact.obj;
  pushRoomObjectImpactEvent(room, obj, impact.hit, bullet, now);
  if (obj.destructible) {
    damageMapObject(room, obj, Math.max(1, Number(bullet.damage) || 1), bullet.ownerPlayerId || bullet.ownerId, now, {
      cause: bullet.fromEnemy ? 'enemy_bullet' : 'bullet',
      clearOnDestroyed: bullet.fromEnemy === true && canEnemyBreakMapObject(obj),
    });
  }
  if (bullet.kind === 'rocket') {
    explodeRocket(room, bullet, now);
  }
  return true;
}

function isEnemyInMapObjectAttackRange(enemy, obj, radius) {
  if (!enemy || !obj) return false;
  const closest = getClosestPointOnMapObject(enemy.x, enemy.y, obj);
  const dx = (Number(enemy.x) || 0) - closest.x;
  const dy = (Number(enemy.y) || 0) - closest.y;
  const behavior = getEnemyBehavior(enemy);
  const bonus = enemy.type === 'boss' ? 44 : (behavior === 'charger' ? 26 : 20);
  const reach = Math.max(12, radius + bonus);
  return dx * dx + dy * dy <= reach * reach;
}

function getEnemyMapObjectAttackDamage(enemy) {
  const base = enemy?.type === 'boss' ? BOSS_ATTACK_DAMAGE : ENEMY_ATTACK_DAMAGE;
  const behavior = getEnemyBehavior(enemy);
  const typeMul = behavior === 'charger' ? 1.15 : (enemy?.type === 'boss' ? 1.35 : (behavior === 'brute' ? 1.25 : 1));
  return Math.max(1, Math.round(base * typeMul * Math.max(1, Number(enemy?.damageMul) || 1)));
}

function applyEnemyHitToMapObject(room, enemy, obj, now) {
  if (!room || !enemy || !canEnemyBreakMapObject(obj)) return false;
  const damage = getEnemyMapObjectAttackDamage(enemy);
  const hitPoint = getClosestPointOnMapObject(enemy.x, enemy.y, obj);
  const dirX = hitPoint.x - (Number(enemy.x) || 0);
  const dirY = hitPoint.y - (Number(enemy.y) || 0);
  const len = Math.hypot(dirX, dirY) || 1;
  pushRoomObjectImpactEvent(room, obj, {
    x: hitPoint.x,
    y: hitPoint.y,
    nx: -dirX / len,
    ny: -dirY / len,
  }, {
    kind: 'enemy_melee',
    vx: (dirX / len) * 360,
    vy: (dirY / len) * 360,
    damage,
  }, now);
  return damageMapObject(room, obj, damage, enemy.id || 'enemy', now, {
    cause: 'enemy_melee',
    clearOnDestroyed: true,
  });
}

function broadcastRoom(room, payload, options = {}) {
  const raw = typeof options.raw === 'string' ? options.raw : JSON.stringify(payload);
  const isRealtimeState = options.isRealtimeState ?? (payload?.type === 'state');
  let recipients = 0;
  let sent = 0;
  let skipped = 0;
  let maxBufferedAmount = 0;
  let totalBufferedAmount = 0;
  const send = (ws) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const bufferedAmount = Math.max(0, Number(ws.bufferedAmount) || 0);
    recipients += 1;
    totalBufferedAmount += bufferedAmount;
    if (bufferedAmount > maxBufferedAmount) maxBufferedAmount = bufferedAmount;
    if (isRealtimeState && !canSendRealtimeState(ws)) {
      skipped += 1;
      return;
    }
    ws.send(raw, { compress: false });
    sent += 1;
  };
  for (const p of room.players.values()) {
    send(p.ws);
  }
  for (const spectator of room.spectators.values()) {
    send(spectator.ws);
  }
  return {
    rawBytes: Buffer.byteLength(raw, 'utf8'),
    recipients,
    sent,
    skipped,
    maxBufferedAmount,
    totalBufferedAmount,
  };
}

function sanitizeChatText(rawText) {
  let text = String(rawText || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > CHAT_MAX_LEN) text = text.slice(0, CHAT_MAX_LEN).trim();
  return text;
}

function pushRoomChat(room, entry) {
  if (!room || !entry) return;
  if (!Array.isArray(room.chatHistory)) room.chatHistory = [];
  room.chatHistory.push(entry);
  if (room.chatHistory.length > CHAT_HISTORY_LIMIT) {
    room.chatHistory.splice(0, room.chatHistory.length - CHAT_HISTORY_LIMIT);
  }
}

function canSendChatMessage(player, now) {
  if (!player) return { ok: false, reason: 'unavailable' };
  const mutedUntil = Math.max(0, Number(player.chatMutedUntil) || 0);
  if (mutedUntil > now) return { ok: false, reason: 'muted', leftMs: mutedUntil - now };

  if (!Array.isArray(player.chatRecentAt)) player.chatRecentAt = [];
  player.chatRecentAt = player.chatRecentAt.filter((ts) => now - ts <= CHAT_SPAM_WINDOW_MS);
  if (player.chatRecentAt.length >= CHAT_SPAM_MAX_MESSAGES) {
    player.chatMutedUntil = now + CHAT_SPAM_MUTE_MS;
    return { ok: false, reason: 'spam', leftMs: CHAT_SPAM_MUTE_MS };
  }

  player.chatRecentAt.push(now);
  return { ok: true };
}

function handleRoomChatMessage(room, player, msg, now = Date.now()) {
  const text = sanitizeChatText(msg?.text);
  if (!text) return;

  const gate = canSendChatMessage(player, now);
  if (!gate.ok) {
    if (gate.reason === 'spam') {
      sendTo(player.ws, { type: 'system', message: 'Chat: too many messages, muted for 15s.' });
      return;
    }
    if (gate.reason === 'muted') {
      const leftSec = Math.max(1, Math.ceil((Number(gate.leftMs) || 0) / 1000));
      sendTo(player.ws, { type: 'system', message: `Chat muted for ${leftSec}s.` });
      return;
    }
    sendTo(player.ws, { type: 'system', message: 'Chat is unavailable.' });
    return;
  }

  const payload = {
    type: 'chat',
    id: `c${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: now,
    name: String(player.name || 'Player').slice(0, 32),
    playerId: player.id,
    text,
  };
  pushRoomChat(room, payload);
  for (const p of room.players.values()) {
    appendReplayChatMessage(p.runReplay, payload, now);
  }
  broadcastRoom(room, payload);
}

function getCompanionSkillDefs() {
  return skillsStore.getList().filter((def) => String(def?.companionWeaponKey || '').trim());
}

function createCompanion(room, owner, def, ordinal = 0) {
  const world = getRoomWorld(room);
  const spawnX = Number(owner?.x) || world.width / 2;
  const spawnY = Number(owner?.y) || world.height / 2;
  const seed = (ordinal + 1) * 0.73 + String(def?.id || '').length * 0.19;
  const holdAngle = Math.PI * 2 * (seed - Math.floor(seed));
  const holdRadius = 44 + (ordinal % 3) * 10 + (String(def?.id || '').charCodeAt(0) % 7);
  return {
    id: `c${room.nextCompanionId++}`,
    ownerId: owner.id,
    skillId: def.id,
    ordinal: ordinal,
    x: spawnX,
    y: spawnY,
    aimX: spawnX + 1,
    aimY: spawnY,
    vx: 0,
    vy: 0,
    alive: true,
    hp: 1,
    maxHp: 1,
    fireCooldownLeft: 0,
    weaponKey: String(def.companionWeaponKey || 'pistol').toLowerCase(),
    weaponMagazine: Math.max(1, Math.floor(Number(WEAPONS[String(def.companionWeaponKey || 'pistol').toLowerCase()]?.magazineSize) || 1)),
    weaponReserveAmmo: null,
    weaponReloadLeftMs: 0,
    reloadSpeedMul: normalizeReloadSpeedMul(owner?.reloadSpeedMul),
    playerClass: owner.playerClass || 'cyber',
    name: '',
    holdOffsetX: Math.cos(holdAngle) * holdRadius,
    holdOffsetY: Math.sin(holdAngle) * holdRadius * 0.78,
  };
}

function syncRoomCompanions(room) {
  if (!room) return;
  const desired = [];
  const defs = getCompanionSkillDefs();
  for (const owner of room.players.values()) {
    for (const def of defs) {
      const count = Math.max(0, getSkillRank(owner, def.id));
      for (let ordinal = 0; ordinal < count; ordinal += 1) {
        desired.push({
          ownerId: owner.id,
          skillId: def.id,
          ordinal,
          owner,
          def,
        });
      }
    }
  }

  const existingByKey = new Map();
  for (const companion of room.companions || []) {
    const key = `${companion.ownerId || ''}:${companion.skillId || ''}:${Math.max(0, Number(companion.ordinal) || 0)}`;
    if (!existingByKey.has(key)) existingByKey.set(key, companion);
  }

  const nextCompanions = [];
  for (const entry of desired) {
    const key = `${entry.ownerId || ''}:${entry.skillId || ''}:${Math.max(0, Number(entry.ordinal) || 0)}`;
    const companion = existingByKey.get(key);
    if (companion) {
      existingByKey.delete(key);
      const nextWeaponKey = String(entry.def.companionWeaponKey || companion.weaponKey || 'pistol').toLowerCase();
      if (companion.weaponKey !== nextWeaponKey) {
        companion.weaponKey = nextWeaponKey;
        companion.weaponMagazine = getWeaponMagazineSize(nextWeaponKey);
        companion.weaponReloadLeftMs = 0;
      } else {
        ensureCompanionWeaponAmmo(companion);
      }
      companion.playerClass = entry.owner.playerClass || companion.playerClass || 'cyber';
      nextCompanions.push(companion);
      continue;
    }
    nextCompanions.push(createCompanion(room, entry.owner, entry.def, entry.ordinal));
  }
  room.companions = nextCompanions;
}

function getCompanionWeaponRange(weaponKey) {
  if (weaponKey === 'shotgun') return 300;
  if (weaponKey === 'sniper') return 760;
  if (weaponKey === 'smg') return 470;
  return 520;
}

function getWeaponMagazineSize(weaponKey) {
  const weapon = WEAPONS[String(weaponKey || 'pistol').toLowerCase()] || WEAPONS.pistol;
  return Math.max(1, Math.floor(Number(weapon.magazineSize) || 1));
}

function normalizeReloadSpeedMul(value) {
  return Math.max(0.2, Number(value) || 1);
}

function getWeaponReloadMs(weaponKey, reloadSpeedMul = 1) {
  const weapon = WEAPONS[String(weaponKey || 'pistol').toLowerCase()] || WEAPONS.pistol;
  return Math.max(120, Math.floor((Number(weapon.reloadMs) || 900) / normalizeReloadSpeedMul(reloadSpeedMul)));
}

function ensureCompanionWeaponAmmo(companion) {
  if (!companion) return;
  const magazineSize = getWeaponMagazineSize(companion.weaponKey);
  if (!Number.isFinite(Number(companion.weaponMagazine))) {
    companion.weaponMagazine = magazineSize;
  } else {
    companion.weaponMagazine = Math.max(0, Math.min(magazineSize, Math.floor(Number(companion.weaponMagazine) || 0)));
  }
  companion.weaponReserveAmmo = null;
  companion.weaponReloadLeftMs = Math.max(0, Number(companion.weaponReloadLeftMs) || 0);
}

function startCompanionReload(companion) {
  if (!companion) return false;
  ensureCompanionWeaponAmmo(companion);
  if (Number(companion.weaponReloadLeftMs) > 0) return true;
  if (Math.max(0, Math.floor(Number(companion.weaponMagazine) || 0)) >= getWeaponMagazineSize(companion.weaponKey)) return false;
  companion.weaponReloadLeftMs = getWeaponReloadMs(companion.weaponKey, companion.reloadSpeedMul);
  companion.fireCooldownLeft = Math.max(Number(companion.fireCooldownLeft) || 0, companion.weaponReloadLeftMs);
  return true;
}

function updateCompanionReload(companion, dtMs) {
  if (!companion) return;
  ensureCompanionWeaponAmmo(companion);
  if (Number(companion.weaponReloadLeftMs) <= 0) return;
  companion.weaponReloadLeftMs = Math.max(0, Number(companion.weaponReloadLeftMs) - dtMs);
  if (companion.weaponReloadLeftMs <= 0) {
    companion.weaponMagazine = getWeaponMagazineSize(companion.weaponKey);
    companion.weaponReserveAmmo = null;
  }
}

function fireCompanionWeapon(room, companion, owner, now) {
  const weapon = WEAPONS[companion.weaponKey] || WEAPONS.pistol;
  ensureCompanionWeaponAmmo(companion);
  if (Number(companion.weaponReloadLeftMs) > 0) return;
  if (Math.max(0, Math.floor(Number(companion.weaponMagazine) || 0)) <= 0) {
    startCompanionReload(companion);
    return;
  }
  const dx = companion.aimX - companion.x;
  const dy = companion.aimY - companion.y;
  const baseAngle = Math.atan2(dy, dx);
  const damageMul = Math.max(0.2, Number(owner?.damageMul) || 1);
  const fireRateMul = Math.max(0.2, Number(owner?.fireRateMul) || 1);
  const bulletSkill = getPlayerBulletSkillStats(owner);
  const firstBulletId = room.nextBulletId;
  const eventSpeed = Math.max(120, Number(weapon.bulletSpeed) || 920);
  const bulletRadius = Math.max(2, Number(weapon.radius) || BULLET_RADIUS);
  const muzzle = getWeaponMuzzleOrigin(companion, baseAngle, bulletRadius);
  pushRoomShotEvent(room, {
    bulletId: firstBulletId,
    ownerId: companion.id,
    ownerPlayerId: owner?.id || companion.ownerId,
    shooterType: 'companion',
    weaponKey: String(companion.weaponKey || 'pistol').toLowerCase(),
    kind: 'bullet',
    x: muzzle.x,
    y: muzzle.y,
    vx: Math.cos(baseAngle) * eventSpeed,
    vy: Math.sin(baseAngle) * eventSpeed,
    color: weapon.color || '#f59e0b',
    radius: bulletRadius,
  });

  for (let i = 0; i < weapon.pellets; i += 1) {
    const spread = (Math.random() - 0.5) * (weapon.spreadDeg * Math.PI / 180);
    const angle = baseAngle + spread;
    const speedVariance = Math.max(0, Number(weapon.bulletSpeedVariance) || 0);
    const speedMul = 1 + ((Math.random() * 2) - 1) * speedVariance;
    const bulletSpeed = Math.max(120, weapon.bulletSpeed * speedMul);
    room.bullets.push({
      id: room.nextBulletId++,
      ownerId: companion.id,
      ownerPlayerId: owner?.id || companion.ownerId,
      fromEnemy: false,
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(angle) * bulletSpeed,
      vy: Math.sin(angle) * bulletSpeed,
      lifeMs: weapon.bulletLifeMs,
      damage: Math.max(1, Math.round(weapon.bulletDamage * damageMul * bulletSkill.damageMul)),
      color: weapon.color,
      weaponKey: String(companion.weaponKey || 'pistol').toLowerCase(),
      segmentHit: String(companion.weaponKey || '').toLowerCase() === 'sniper',
      pierceRemaining: bulletSkill.pierce,
      hitEnemyIds: bulletSkill.pierce > 0 ? [] : undefined,
      homingRange: bulletSkill.homingRange,
      homingTurnRate: bulletSkill.homingTurnRate,
      homingDelayMs: 45,
      shooterType: 'companion',
    });
  }

  companion.fireCooldownLeft = Math.max(35, weapon.cooldownMs / fireRateMul);
  companion.lastShotAt = now;
  companion.weaponMagazine = Math.max(0, Math.floor(Number(companion.weaponMagazine) || 0) - 1);
  if (companion.weaponMagazine <= 0) startCompanionReload(companion);
}

function tickCompanions(room, dtSec, now) {
  if (!room || !Array.isArray(room.companions) || room.companions.length === 0) return;
  const world = getRoomWorld(room);
  const byOwner = new Map();
  for (const companion of room.companions) {
    if (!byOwner.has(companion.ownerId)) byOwner.set(companion.ownerId, []);
    byOwner.get(companion.ownerId).push(companion);
  }

  for (const companions of byOwner.values()) {
    companions.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  for (const companion of room.companions) {
    const owner = room.players.get(companion.ownerId);
    if (!owner) continue;
    companion.reloadSpeedMul = normalizeReloadSpeedMul(owner.reloadSpeedMul);
    updateCompanionReload(companion, dtSec * 1000);
    const squad = byOwner.get(companion.ownerId) || [companion];
    const slotIndex = Math.max(0, squad.findIndex((item) => item.id === companion.id));
    const slotCount = Math.max(1, squad.length);
    const moveLen = Math.hypot(Number(owner.moveX) || 0, Number(owner.moveY) || 0);
    const moving = moveLen > 0.12;
    const moveDirX = moving ? (Number(owner.moveX) || 0) / moveLen : 0;
    const moveDirY = moving ? (Number(owner.moveY) || 0) / moveLen : 0;
    const aimDx = (Number(owner.aimX) || owner.x + 1) - owner.x;
    const aimDy = (Number(owner.aimY) || owner.y) - owner.y;
    const aimLen = Math.hypot(aimDx, aimDy) || 1;
    const fallbackDirX = aimDx / aimLen;
    const fallbackDirY = aimDy / aimLen;
    const dirX = moving ? moveDirX : fallbackDirX;
    const dirY = moving ? moveDirY : fallbackDirY;
    const sideX = -dirY;
    const sideY = dirX;

    let desiredX = owner.x;
    let desiredY = owner.y;
    if (moving) {
      const behindDist = 48 + Math.min(22, slotCount * 6);
      const sideSpread = (slotIndex - (slotCount - 1) / 2) * 28;
      desiredX = owner.x - dirX * behindDist + sideX * sideSpread;
      desiredY = owner.y - dirY * behindDist + sideY * sideSpread * 0.9;
    } else {
      desiredX = owner.x + Number(companion.holdOffsetX || 0);
      desiredY = owner.y + Number(companion.holdOffsetY || 0);
    }
    desiredX = clamp(desiredX, PLAYER_RADIUS, world.width - PLAYER_RADIUS);
    desiredY = clamp(desiredY, PLAYER_RADIUS, world.height - PLAYER_RADIUS);

    const followDx = desiredX - companion.x;
    const followDy = desiredY - companion.y;
    const followDist = Math.hypot(followDx, followDy) || 1;
    const followSpeed = PLAYER_SPEED * 0.86;
    const desiredSpeed = Math.min(followSpeed, followDist * (moving ? 6.4 : 5.1));
    companion.vx = followDist > 2 ? (followDx / followDist) * desiredSpeed : 0;
    companion.vy = followDist > 2 ? (followDy / followDist) * desiredSpeed : 0;

    if (!owner.alive) {
      const moved = moveActorWithSceneCollision(
        room,
        companion.x,
        companion.y,
        companion.vx * dtSec,
        companion.vy * dtSec,
        PLAYER_RADIUS,
        {
          minX: PLAYER_RADIUS,
          maxX: world.width - PLAYER_RADIUS,
          minY: PLAYER_RADIUS,
          maxY: world.height - PLAYER_RADIUS,
        },
      );
      companion.x = moved.x;
      companion.y = moved.y;
      companion.aimX = owner.x;
      companion.aimY = owner.y;
      continue;
    }

    const range = getCompanionWeaponRange(companion.weaponKey);
    const target = nearestEnemyTo(room, companion.x, companion.y, range, { excludePlayerId: owner.id });
    if (target) {
      companion.aimX = target.x;
      companion.aimY = target.y;
      const tdx = target.x - companion.x;
      const tdy = target.y - companion.y;
      const targetDist = Math.hypot(tdx, tdy) || 1;
      if (targetDist > range * 0.62) {
        companion.vx += (tdx / targetDist) * followSpeed * 0.28;
        companion.vy += (tdy / targetDist) * followSpeed * 0.28;
      }
      companion.fireCooldownLeft = Math.max(0, Number(companion.fireCooldownLeft) - dtSec * 1000);
      if (companion.fireCooldownLeft <= 0) {
        fireCompanionWeapon(room, companion, owner, now);
      }
    } else {
      companion.aimX = owner.aimX || owner.x + 1;
      companion.aimY = owner.aimY || owner.y;
      companion.fireCooldownLeft = Math.max(0, Number(companion.fireCooldownLeft) - dtSec * 1000);
    }

    const speedLen = Math.hypot(companion.vx, companion.vy);
    if (speedLen > followSpeed) {
      companion.vx = (companion.vx / speedLen) * followSpeed;
      companion.vy = (companion.vy / speedLen) * followSpeed;
    }
    const moved = moveActorWithSceneCollision(
      room,
      companion.x,
      companion.y,
      companion.vx * dtSec,
      companion.vy * dtSec,
      PLAYER_RADIUS,
      {
        minX: PLAYER_RADIUS,
        maxX: world.width - PLAYER_RADIUS,
        minY: PLAYER_RADIUS,
        maxY: world.height - PLAYER_RADIUS,
      },
    );
    companion.x = moved.x;
    companion.y = moved.y;
  }
}

function isPvpRoom(room) {
  return normalizeGameMode(room?.gameMode) === 'pvp';
}

function nearestHostileTargetTo(room, x, y, maxRange = Infinity, options = {}) {
  const excludePlayerId = String(options?.excludePlayerId || '');
  let best = null;
  let bestD2 = maxRange * maxRange;

  for (const enemy of room.enemies) {
    if (!enemy || enemy.hp <= 0) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      best = { kind: 'enemy', id: enemy.id, x: enemy.x, y: enemy.y, enemy };
      bestD2 = d2;
    }
  }

  if (isPvpRoom(room)) {
    for (const player of room.players.values()) {
      if (!player || !player.alive) continue;
      if (excludePlayerId && String(player.id) === excludePlayerId) continue;
      const dx = player.x - x;
      const dy = player.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        best = { kind: 'player', id: player.id, x: player.x, y: player.y, player };
        bestD2 = d2;
      }
    }
  }

  return best;
}

function nearestEnemyTo(room, x, y, maxRange = Infinity, options = {}) {
  return nearestHostileTargetTo(room, x, y, maxRange, options);
}

function collectSkillTargets(room, player, maxTargets, radius) {
  const items = room.enemies
    .map((enemy) => ({
      target: { kind: 'enemy', id: enemy.id, x: enemy.x, y: enemy.y, enemy },
      d2: (enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2,
    }));

  if (isPvpRoom(room)) {
    for (const other of room.players.values()) {
      if (!other || !other.alive || other.id === player.id) continue;
      items.push({
        target: { kind: 'player', id: other.id, x: other.x, y: other.y, player: other },
        d2: (other.x - player.x) ** 2 + (other.y - player.y) ** 2,
      });
    }
  }

  return items
    .filter((x) => x.d2 <= radius * radius)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, maxTargets)
    .map((x) => x.target);
}

function collectEnemiesInRadius(room, x, y, radius, sourcePlayerId = '') {
  const items = room.enemies
    .map((enemy) => ({
      target: { kind: 'enemy', id: enemy.id, x: enemy.x, y: enemy.y, enemy },
      d2: (enemy.x - x) ** 2 + (enemy.y - y) ** 2,
    }));

  if (isPvpRoom(room)) {
    const ownerId = String(sourcePlayerId || '');
    for (const other of room.players.values()) {
      if (!other || !other.alive) continue;
      if (ownerId && String(other.id) === ownerId) continue;
      items.push({
        target: { kind: 'player', id: other.id, x: other.x, y: other.y, player: other },
        d2: (other.x - x) ** 2 + (other.y - y) ** 2,
      });
    }
  }

  return items
    .filter((item) => item.d2 <= radius * radius)
    .sort((a, b) => a.d2 - b.d2)
    .map((item) => item.target);
}

function applySkillDamageToTarget(room, target, damage, ownerId, now, options = {}) {
  if (!target) return false;
  if (target.kind === 'enemy' && target.enemy) {
    return enemyTakeDamage(room, target.enemy, damage, ownerId, now, options);
  }
  if (target.kind === 'player' && target.player) {
    const attacker = ownerId ? room.players.get(ownerId) : null;
    if (!attacker) return false;
    return applyPlayerHitToPlayer(room, attacker, target.player, damage, now);
  }
  return false;
}

function castHomingMissiles(room, player, def, st, now) {
  const lvl = Math.max(1, Number(st?.level) || 1);
  const radius = Math.max(80, (Number(def.radius) || 520) + (Number(def.radiusPerLevel) || 0) * (lvl - 1));
  const rocketCount = Math.max(1, Math.round((Number(def.targets) || 5) + (Number(def.targetsPerLevel) || 0) * (lvl - 1)));
  const targets = collectSkillTargets(room, player, rocketCount, radius);
  if (targets.length <= 0) return false;

  const damage = Math.max(1, Math.round(((Number(def.damage) || 34) + (Number(def.damagePerLevel) || 0) * (lvl - 1)) * Math.max(0.2, Number(player.damageMul) || 1)));
  const missileSpeed = Math.max(160, (Number(def.missileSpeed) || 320) + (Number(def.missileSpeedPerLevel) || 0) * (lvl - 1));
  const rawTurnRate = (Number(def.turnRate) || 5.8) + (Number(def.turnRatePerLevel) || 0) * (lvl - 1);
  const turnRate = Math.max(1.8, rawTurnRate * 0.78);
  const turnAccel = Math.max(10, turnRate * 4.6);
  const explosionRadius = Math.max(24, (Number(def.explosionRadius) || 58) + (Number(def.explosionRadiusPerLevel) || 0) * (lvl - 1));
  const lifeMs = Math.max(900, Number(def.lifeMs) || 2600);
  const baseAngle = Math.random() * Math.PI * 2;
  const world = getRoomWorld(room);

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const angle = baseAngle + ((Math.PI * 2 * i) / Math.max(1, targets.length)) + ((Math.random() - 0.5) * 0.26);
    const spawnDist = PLAYER_RADIUS + 12 + ((i % 2) * 7);
    const bulletId = room.nextBulletId++;
    const rocket = {
      id: bulletId,
      kind: 'rocket',
      ownerId: player.id,
      fromEnemy: false,
      x: clamp(player.x + Math.cos(angle) * spawnDist, PLAYER_RADIUS, world.width - PLAYER_RADIUS),
      y: clamp(player.y + Math.sin(angle) * spawnDist, PLAYER_RADIUS, world.height - PLAYER_RADIUS),
      vx: Math.cos(angle) * missileSpeed * 0.78,
      vy: Math.sin(angle) * missileSpeed * 0.78,
      speed: missileSpeed,
      lifeMs,
      damage,
      radius: 6,
      color: '#fb923c',
      targetId: target.id,
      targetKind: target.kind || 'enemy',
      turnRate,
      turnAccel,
      wobbleAmp: 0.28 + Math.random() * 0.16,
      wobbleFreq: 7 + Math.random() * 3.5,
      wobblePhase: Math.random() * Math.PI * 2,
      retargetRange: radius * 1.15,
      explosionRadius,
      spawnAt: now,
    };
    room.bullets.push(rocket);
    pushRoomShotEvent(room, {
      bulletId,
      ownerId: player.id,
      ownerPlayerId: player.ownerId || '',
      shooterType: 'player',
      weaponKey: 'homing_missiles',
      kind: 'rocket',
      x: rocket.x,
      y: rocket.y,
      vx: rocket.vx,
      vy: rocket.vy,
      color: rocket.color || '#fb923c',
      radius: Math.max(2, Number(rocket.radius) || 6),
      at: now,
    });
  }

  return true;
}

function castLaserStrike(room, player, def, st, now) {
  const lvl = Math.max(1, Number(st?.level) || 1);
  const radius = Math.max(90, (Number(def.radius) || 320) + (Number(def.radiusPerLevel) || 0) * (lvl - 1));
  const maxTargets = Math.max(1, Math.round((Number(def.targets) || 1) + (Number(def.targetsPerLevel) || 0) * (lvl - 1)));
  const targets = collectSkillTargets(room, player, maxTargets, radius);
  if (targets.length <= 0) return false;

  const baseDamage = (Number(def.damage) || 40) + (Number(def.damagePerLevel) || 0) * (lvl - 1);
  const damageMul = Math.max(0.2, Number(player.damageMul) || 1);
  const damage = Math.max(1, Math.round(baseDamage * damageMul));

  for (const target of targets) {
    applySkillDamageToTarget(room, target, damage, player.id, now);
  }
  return true;
}

function explodeRocket(room, bullet, now) {
  const radius = Math.max(18, Number(bullet.explosionRadius) || 54);
  const ownerId = bullet?.ownerPlayerId || bullet?.ownerId || '';
  const enemies = room.enemies.slice();
  for (const enemy of enemies) {
    const dx = enemy.x - bullet.x;
    const dy = enemy.y - bullet.y;
    const reach = radius + Math.max(ENEMY_RADIUS, Number(enemy.radius) || ENEMY_RADIUS);
    const dist = Math.hypot(dx, dy);
    if (dist > reach) continue;
    const falloff = 1 - Math.min(0.45, (dist / Math.max(1, reach)) * 0.45);
    enemyTakeDamage(room, enemy, Math.max(1, Math.round((Number(bullet.damage) || 1) * falloff)), ownerId, now, {
      sourceX: bullet.x,
      sourceY: bullet.y,
      stunMs: ENEMY_HIT_STUN_MS * 1.2,
      knockback: ENEMY_HIT_KNOCKBACK_SPEED * 1.9 * falloff,
    });
  }

  if (isPvpRoom(room)) {
    const attackerId = ownerId;
    const attacker = attackerId ? room.players.get(attackerId) : null;
    if (attacker) {
      for (const player of room.players.values()) {
        if (!player || !player.alive || player.id === attacker.id) continue;
        const dx = player.x - bullet.x;
        const dy = player.y - bullet.y;
        const reach = radius + PLAYER_RADIUS;
        const dist = Math.hypot(dx, dy);
        if (dist > reach) continue;
        const falloff = 1 - Math.min(0.45, (dist / Math.max(1, reach)) * 0.45);
        const amount = Math.max(1, Math.round((Number(bullet.damage) || 1) * falloff));
        applyPlayerHitToPlayer(room, attacker, player, amount, now, { allowDeadAttacker: true });
      }
    }
  }

  damageSceneObjectsInRadius(room, bullet.x, bullet.y, radius * 0.92, Math.max(10, (Number(bullet.damage) || 1) * 0.88), ownerId, now, {
    cause: 'rocket',
  });
}

function findBulletHomingTarget(room, bullet, maxRange) {
  if (!room || !bullet || maxRange <= 0) return null;
  const speed = Math.hypot(Number(bullet.vx) || 0, Number(bullet.vy) || 0) || 1;
  const dirX = (Number(bullet.vx) || 0) / speed;
  const dirY = (Number(bullet.vy) || 0) / speed;
  const ownerId = String(bullet.ownerPlayerId || bullet.ownerId || '');
  let best = null;
  let bestScore = Infinity;
  const range2 = maxRange * maxRange;

  for (const enemy of room.enemies || []) {
    if (!enemy || Number(enemy.hp) <= 0) continue;
    if (Array.isArray(bullet.hitEnemyIds) && bullet.hitEnemyIds.includes(enemy.id)) continue;
    const dx = (Number(enemy.x) || 0) - (Number(bullet.x) || 0);
    const dy = (Number(enemy.y) || 0) - (Number(bullet.y) || 0);
    const d2 = dx * dx + dy * dy;
    if (d2 <= 0.01 || d2 > range2) continue;
    const dist = Math.sqrt(d2);
    const dot = (dx / dist) * dirX + (dy / dist) * dirY;
    if (dot < 0.12) continue;
    const score = d2 / Math.max(0.12, dot * dot);
    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }

  if (!best && isPvpRoom(room)) {
    for (const player of room.players.values()) {
      if (!player || !player.alive || String(player.id) === ownerId) continue;
      const dx = (Number(player.x) || 0) - (Number(bullet.x) || 0);
      const dy = (Number(player.y) || 0) - (Number(bullet.y) || 0);
      const d2 = dx * dx + dy * dy;
      if (d2 <= 0.01 || d2 > range2) continue;
      const dist = Math.sqrt(d2);
      const dot = (dx / dist) * dirX + (dy / dist) * dirY;
      if (dot < 0.12) continue;
      const score = d2 / Math.max(0.12, dot * dot);
      if (score < bestScore) {
        bestScore = score;
        best = player;
      }
    }
  }

  return best;
}

function castPlayerActiveSkill(room, player, def, st, now) {
  const skillId = String(def?.castType || def?.id || '').toLowerCase();
  if (skillId === 'homing_missiles') {
    return castHomingMissiles(room, player, def, st, now);
  }
  if (skillId === 'laser_strike') {
    return castLaserStrike(room, player, def, st, now);
  }

  const lvl = Math.max(1, Number(st?.level) || 1);
  const radius = Math.max(40, (Number(def.radius) || 120) + (Number(def.radiusPerLevel) || 0) * (lvl - 1));
  const damage = Math.max(1, (Number(def.damage) || 10) + (Number(def.damagePerLevel) || 0) * (lvl - 1));
  if (skillId === 'shockwave') {
    const targets = collectEnemiesInRadius(room, player.x, player.y, radius, player.id);
    if (targets.length <= 0) return false;
    for (const target of targets) {
      applySkillDamageToTarget(room, target, damage * player.damageMul, player.id, now, {
        sourceX: player.x,
        sourceY: player.y,
        stunMs: ENEMY_HIT_STUN_MS * ENEMY_SKILL_KNOCKBACK_BONUS,
        knockback: ENEMY_HIT_KNOCKBACK_SPEED * ENEMY_SKILL_KNOCKBACK_BONUS,
      });
    }
    damageSceneObjectsInRadius(room, player.x, player.y, radius * 0.92, damage * player.damageMul * 0.72, player.id, now, {
      cause: 'shockwave',
    });
    return true;
  }

  if (skillId === 'psi_blast') {
    const targets = collectEnemiesInRadius(room, player.x, player.y, radius, player.id);
    if (targets.length <= 0) return false;
    const knockbackMul = Math.max(1.8, Number(def.knockbackMul) || 2.6);
    const stunMs = Math.max(120, Number(def.stunMs) || 180);
    for (const target of targets) {
      applySkillDamageToTarget(room, target, damage * player.damageMul, player.id, now, {
        sourceX: player.x,
        sourceY: player.y,
        stunMs,
        knockback: ENEMY_HIT_KNOCKBACK_SPEED * knockbackMul,
      });
    }
    damageSceneObjectsInRadius(room, player.x, player.y, radius * 0.88, damage * player.damageMul * 0.64, player.id, now, {
      cause: 'psi_blast',
    });
    return true;
  }

  const maxTargets = Math.max(1, Math.round((Number(def.targets) || 1) + (Number(def.targetsPerLevel) || 0) * (lvl - 1)));
  const targets = collectSkillTargets(room, player, maxTargets, radius);
  if (targets.length <= 0) return false;

  for (const target of targets) {
    applySkillDamageToTarget(room, target, damage * player.damageMul, player.id, now);
  }
  return true;
}

function buildRoomMissionState(room, now = Date.now()) {
  const mission = room?.mission;
  if (!mission || room?.runType !== 'campaign') return null;
  const elapsedSec = Math.max(0, Math.floor((now - (Number(room.startedAt) || now)) / 1000));
  const highestLevel = Math.max(1, ...Array.from(room.players.values()).map((player) => Math.max(1, Number(player?.level) || 1)));
  const goals = cloneMissionGoals(mission.goals).map((goal) => {
    let current = 0;
    if (goal.type === 'survive') current = elapsedSec;
    else if (goal.type === 'enemy_kills') current = Math.max(0, Number(room.totalEnemyKills) || 0);
    else if (goal.type === 'boss_kills') current = Math.max(0, Number(room.totalBossKills) || 0);
    else if (goal.type === 'player_level') current = highestLevel;
    const target = Math.max(1, Number(goal.target) || 1);
    const completed = current >= target;
    return {
      type: goal.type,
      label: goal.label,
      current,
      target,
      completed,
      progress: Math.max(0, Math.min(1, current / target)),
    };
  });
  const completedGoals = goals.filter((goal) => goal.completed).length;
  const allCompleted = goals.length > 0 && completedGoals >= goals.length;
  return {
    runType: 'campaign',
    campaignId: mission.campaignId,
    campaignName: mission.campaignName,
    campaignShortName: mission.campaignShortName,
    levelId: mission.levelId,
    levelIndex: Math.max(0, Number(mission.levelIndex) || 0),
    title: mission.title,
    brief: mission.brief,
    scenario: mission.scenario,
    goals,
    completedGoals,
    totalGoals: goals.length,
    completedAt: Math.max(0, Number(mission.completedAt) || 0),
    failedAt: Math.max(0, Number(mission.failedAt) || 0),
    success: mission.success === true,
    allCompleted,
  };
}

function serializeMapObject(obj) {
  if (!obj) return null;
  return {
    id: String(obj.id || ''),
    kind: String(obj.kind || ''),
    spriteKey: String(obj.spriteKey || ''),
    x: Number(obj.x) || 0,
    y: Number(obj.y) || 0,
    w: Math.max(1, Number(obj.w) || 1),
    h: Math.max(1, Number(obj.h) || 1),
    collisionW: Math.max(1, Number(obj.collisionW) || Number(obj.w) || 1),
    collisionH: Math.max(1, Number(obj.collisionH) || Number(obj.h) || 1),
    collisionOffsetY: Number(obj.collisionOffsetY) || 0,
    collisionShape: String(obj.collisionShape || 'rect'),
    collisionPoints: Array.isArray(obj.collisionPoints)
      ? obj.collisionPoints.map((point) => (Array.isArray(point) ? [Number(point[0]) || 0, Number(point[1]) || 0] : [Number(point?.x) || 0, Number(point?.y) || 0]))
      : [],
    angle: Number(obj.angle) || 0,
    anchorY: Number(obj.anchorY) || 0.56,
    shadowScale: Number(obj.shadowScale) || 1,
    solid: Boolean(obj.solid),
    destructible: Boolean(obj.destructible),
    zombieBreakable: Boolean(obj.zombieBreakable),
    hideAfterDestroyed: Boolean(obj.hideAfterDestroyed),
    hp: Math.max(0, Number(obj.hp) || 0),
    maxHp: Math.max(1, Number(obj.maxHp) || 1),
    explosive: Boolean(obj.explosive),
    explosionRadius: Math.max(0, Number(obj.explosionRadius) || 0),
    destroyed: Boolean(obj.destroyed),
    destroyedAt: Math.max(0, Number(obj.destroyedAt) || 0),
    explodedAt: Math.max(0, Number(obj.explodedAt) || 0),
    lastHitAt: Math.max(0, Number(obj.lastHitAt) || 0),
    styleTag: String(obj.styleTag || ''),
  };
}

function serializeRoom(room, { includeDecor = true, compactRealtime = false } = {}) {
  const now = Date.now();
  const world = getRoomWorld(room);
  const difficulty = getRoomDifficulty(room, now);
  const nextPortal = room.bossPortals.length > 0 ? room.bossPortals[0] : null;
  const mission = buildRoomMissionState(room, now);
  const includeRealtimeDrops = true;
  const includeRealtimeXpOrbs = true;
  const includeRealtimeSkillOrbs = !compactRealtime || shouldIncludeRealtimeCollection(room, 'skillOrbs', now, {
    resendMs: REALTIME_STATIC_COLLECTION_RESEND_MS,
  });
  const realtimeXpAlwaysIncludeRadius = Math.max(
    PLAYER_PICKUP_RADIUS_BASE + 96,
    ...Array.from(room.players.values()).map((player) => Math.max(0, Number(player?.pickupRadius) || PLAYER_PICKUP_RADIUS_BASE) + 96),
  );
  const realtimeDrops = compactRealtime
    ? selectRealtimeEntitiesByInterest(room, room.drops, {
      radius: REALTIME_DROP_RADIUS,
      maxItems: REALTIME_DROP_LIMIT,
    })
    : room.drops;
  const realtimeBullets = compactRealtime
    ? selectRealtimeEntitiesByInterest(room, room.bullets, {
      alwaysIncludeRadius: Math.max(520, Math.round(REALTIME_BULLET_RADIUS * 0.55)),
      radius: REALTIME_BULLET_RADIUS,
      maxItems: REALTIME_BULLET_LIMIT,
      priorityFn: (bullet) => {
        const kind = String(bullet?.kind || '').toLowerCase();
        if (kind === 'rocket') return -4;
        if (bullet?.fromEnemy) return -3;
        if (bullet?.ownerPlayerId || bullet?.ownerId) return -1;
        return 0;
      },
    })
    : room.bullets;
  const realtimeXpOrbs = compactRealtime
    ? selectRealtimeEntitiesByInterest(room, room.xpOrbs, {
      alwaysIncludeRadius: realtimeXpAlwaysIncludeRadius,
      radius: REALTIME_XP_ORB_RADIUS,
      maxItems: REALTIME_XP_ORB_LIMIT,
      priorityFn: (orb) => ((Number(orb?.pullSpeed) || 0) > 1 ? -1 : 0),
    })
    : room.xpOrbs;
  const serializedPlayers = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    hp: p.hp,
    maxHp: Math.max(1, Math.round(Number(p.maxHp) || PLAYER_HP_MAX)),
    alive: p.alive,
    isOut: Boolean(p.isOut),
    canRespawn: Boolean(p.canRespawn),
    respawnAt: Math.max(0, Math.floor(Number(p.respawnAt) || 0)),
    livesTotal: Math.max(1, Math.floor(Number(p.livesTotal) || 1)),
    livesLeft: Math.max(0, Math.floor(Number(p.livesLeft) || 0)),
    reviveTokens: Math.max(0, Math.floor(Number(p.reviveTokens) || 0)),
    score: room.scores.get(p.id) || 0,
    kills: room.kills.get(p.id) || 0,
    weaponKey: p.weaponKey,
    weaponLabel: WEAPONS[p.weaponKey].label,
    ammo: p.weaponReserveAmmo,
    magazineAmmo: Math.max(0, Math.floor(Number(p.weaponMagazine) || 0)),
    magazineSize: Math.max(1, Math.floor(Number(WEAPONS[p.weaponKey]?.magazineSize) || 1)),
    reserveAmmo: p.weaponReserveAmmo,
    reloadLeftMs: Math.max(0, Math.round(Number(p.weaponReloadLeftMs) || 0)),
    reloadTotalMs: getWeaponReloadMs(p.weaponKey, p.reloadSpeedMul),
    aimX: Number(p.aimX) || p.x,
    aimY: Number(p.aimY) || p.y,
    shooting: Boolean(p.shooting),
    damageMul: Number(Math.max(0.2, Number(p.damageMul) || 1).toFixed(3)),
    fireRateMul: Number(Math.max(0.2, Number(p.fireRateMul) || 1).toFixed(3)),
    moveSpeedMul: Number(Math.max(0.2, Number(p.moveSpeedMul) || 1).toFixed(3)),
    pickupRadius: Math.max(0, Math.round(Number(p.pickupRadius) || PLAYER_PICKUP_RADIUS_BASE)),
    hpRegenPerSec: Number(Math.max(0, Number(p.hpRegenPerSec) || 0).toFixed(2)),
    shieldHp: Math.max(0, Math.round(Number(p.shieldHp) || 0)),
    shieldMax: Math.max(0, Math.round(Number(p.shieldMax) || 0)),
    shieldRestoreAt: Math.max(0, Math.round(Number(p.shieldRestoreAt) || 0)),
    shieldHitSeq: Math.max(0, Math.floor(Number(p.shieldHitSeq) || 0)),
    shieldHitDirX: Number((Number(p.shieldHitDirX) || 0).toFixed(3)),
    shieldHitDirY: Number((Number(p.shieldHitDirY) || -1).toFixed(3)),
    shieldLastAbsorbed: Math.max(0, Math.round(Number(p.shieldLastAbsorbed) || 0)),
    moveSpeed: Math.max(1, Math.round(PLAYER_SPEED * PLAYER_MOVE_SPEED_GLOBAL_MUL * Math.max(0.2, Number(p.moveSpeedMul) || 1))),
    shotDamage: Math.max(1, Math.round((WEAPONS[p.weaponKey]?.bulletDamage || WEAPONS.pistol.bulletDamage) * Math.max(0.2, Number(p.damageMul) || 1) * getPlayerBulletSkillStats(p).damageMul)),
    shotIntervalMs: Math.max(35, Math.round((WEAPONS[p.weaponKey]?.cooldownMs || WEAPONS.pistol.cooldownMs) / Math.max(0.2, Number(p.fireRateMul) || 1))),
    playerClass: p.playerClass || 'cyber',
    netQuality: p.netQuality || 0,
    netPingMs: p.netPingMs || 0,
    slowUntil: Number(p.slowUntil) || 0,
    dodgeCooldownMs: Math.max(0, Math.round(p.dodgeCooldownMs || 0)),
    dodgeCharges: Math.max(0, Math.round(p.dodgeCharges || 0)),
    dodgeChargesMax: Math.max(1, Math.round(p.dodgeChargesMax || PLAYER_DODGE_MAX_CHARGES)),
    dodgeRechargeMs: Math.max(0, Math.round(p.dodgeRechargeMs || 0)),
    dodgeRechargeTotalMs: PLAYER_DODGE_COOLDOWN_MS,
    dodgeInvulnUntil: Number(p.dodgeInvulnUntil) || 0,
    lastProcessedInputSeq: Math.max(0, Number(p.lastProcessedInputSeq) || 0),
    level: Math.max(1, Math.floor(Number(p.level) || 1)),
    xp: Math.max(0, Math.floor(Number(p.xp) || 0)),
    xpToNext: Math.max(1, Math.floor(Number(p.xpToNext) || getXpToNextLevel(p.level || 1))),
    xpChargeSeq: Math.max(0, Math.floor(Number(p.xpChargeSeq) || 0)),
    xpChargeXp: Math.max(0, Math.floor(Number(p.xpChargeXp) || 0)),
    pendingSkillChoices: [],
    enemyKills: Math.max(0, Math.floor(Number(p.enemyKills) || 0)),
    bossKills: Math.max(0, Math.floor(Number(p.bossKills) || 0)),
    pvpKills: Math.max(0, Math.floor(Number(p.pvpKills) || 0)),
    pvpDeaths: Math.max(0, Math.floor(Number(p.pvpDeaths) || 0)),
    skills: (p.skillOrder || []).map((sid) => {
      const st = p.skills?.[sid] || { level: 0, cooldownMs: 0, maxCooldownMs: 0 };
      const def = getCombatSkillDef(sid, p.playerClass) || { id: sid, name: sid, kind: 'passive', rarity: 'common', desc: '' };
      return {
        id: sid,
        name: def.name,
        kind: def.kind,
        rarity: def.rarity,
        desc: def.desc || '',
        level: Math.max(0, Math.floor(Number(st.level) || 0)),
        cooldownMs: Math.max(0, Math.round(Number(st.cooldownMs) || 0)),
        maxCooldownMs: Math.max(0, Math.round(Number(st.maxCooldownMs) || 0)),
      };
    }),
    quickSlots: getPlayerQuickSlotsState(p),
  }));
  const serializedCompanions = (room.companions || []).map((companion) => ({
    id: companion.id,
    name: '',
    x: companion.x,
    y: companion.y,
    hp: 1,
    maxHp: 1,
    alive: true,
    score: 0,
    kills: 0,
    weaponKey: companion.weaponKey,
    weaponLabel: WEAPONS[companion.weaponKey]?.label || companion.weaponKey || 'Pistol',
    ammo: null,
    magazineAmmo: Math.max(0, Math.floor(Number(companion.weaponMagazine) || 0)),
    magazineSize: getWeaponMagazineSize(companion.weaponKey),
    reserveAmmo: null,
    reloadLeftMs: Math.max(0, Math.round(Number(companion.weaponReloadLeftMs) || 0)),
    reloadTotalMs: getWeaponReloadMs(companion.weaponKey, companion.reloadSpeedMul),
    aimX: Number(companion.aimX) || companion.x,
    aimY: Number(companion.aimY) || companion.y,
    shooting: Number(companion.fireCooldownLeft) > 0 && now - Number(companion.lastShotAt || 0) < 120,
    damageMul: 1,
    fireRateMul: 1,
    moveSpeedMul: 1,
    pickupRadius: 0,
    hpRegenPerSec: 0,
    shieldHp: 0,
    shieldMax: 0,
    shieldRestoreAt: 0,
    shieldHitSeq: 0,
    shieldHitDirX: 0,
    shieldHitDirY: -1,
    shieldLastAbsorbed: 0,
    moveSpeed: Math.max(1, Math.round(Math.hypot(Number(companion.vx) || 0, Number(companion.vy) || 0))),
    shotDamage: Math.max(1, Math.round(WEAPONS[companion.weaponKey]?.bulletDamage || WEAPONS.pistol.bulletDamage)),
    shotIntervalMs: Math.max(35, Math.round(WEAPONS[companion.weaponKey]?.cooldownMs || WEAPONS.pistol.cooldownMs)),
    playerClass: companion.playerClass || 'cyber',
    netQuality: 0,
    netPingMs: 0,
    slowUntil: 0,
    dodgeCooldownMs: 0,
    dodgeCharges: 0,
    dodgeChargesMax: 0,
    dodgeRechargeMs: 0,
    dodgeRechargeTotalMs: PLAYER_DODGE_COOLDOWN_MS,
    dodgeInvulnUntil: 0,
    level: 1,
    xp: 0,
    xpToNext: 1,
    xpChargeSeq: 0,
    xpChargeXp: 0,
    pendingSkillChoices: [],
    skills: [],
    isCompanion: true,
    ownerId: companion.ownerId,
    skillId: companion.skillId,
  }));
  return {
    now,
    instanceId: room.instanceId || INSTANCE_ID,
    isShuttingDown,
    roomCode: room.code,
    runType: String(room.runType || 'free'),
    mapId: String(room.mapId || MAP_DEFS[0]?.id || 'mall_night'),
    campaignId: String(room.campaignId || ''),
    campaignLevelId: String(room.campaignLevelId || ''),
    gameMode: normalizeGameMode(room.gameMode || 'normal'),
    roomStartedAt: room.startedAt,
    spectators: Math.max(0, Number(room.spectators?.size) || 0),
    spectatorCount: Math.max(0, Number(room.spectators?.size) || 0),
    matchDurationSec: Math.max(0, Number(room.matchDurationSec) || 0),
    matchEndsAt: Math.max(0, Number(room.matchEndsAt) || 0),
    pvpMatchEnded: Boolean(room.pvpMatchEnded),
    totalEnemyKills: room.totalEnemyKills || 0,
    nextBossAtKills: room.nextBossAtKills || BOSS_KILL_INTERVAL,
    bossAlive: hasAliveBoss(room),
    bossMobId: room.bossMobId || 'boss',
    nextBossSpawnAt: nextPortal ? nextPortal.spawnAt : 0,
    roomDifficulty: {
      level: difficulty.level,
      hpMul: Number(difficulty.hpMul.toFixed(3)),
      speedMul: Number(difficulty.speedMul.toFixed(3)),
      damageMul: Number(difficulty.damageMul.toFixed(3)),
      attackRateMul: Number(difficulty.attackRateMul.toFixed(3)),
      spawnIntervalMs: Math.round(difficulty.spawnIntervalMs),
    },
    mission,
    mobCatalog: includeDecor ? cloneMobCatalog(room.mobCatalog || []) : undefined,
    world,
    sync: room.sync,
    players: serializedPlayers.concat(serializedCompanions),
    bullets: realtimeBullets.map((b) => {
      const radius = Math.max(2, Number(b.radius) || BULLET_RADIUS);
      const explosionRadius = Math.max(0, Number(b.explosionRadius) || 0);
      const ownerId = b.ownerId || '';
      const ownerPlayerId = b.ownerPlayerId || '';
      const weaponKey = b.weaponKey || '';
      const color = b.color || '';
      const kind = b.kind || 'bullet';
      const shooterType = b.shooterType || (b.fromEnemy ? 'enemy' : '');
      if (compactRealtime) {
        return [
          b.id,
          ownerId,
          ownerPlayerId,
          weaponKey,
          b.x,
          b.y,
          b.vx,
          b.vy,
          color,
          kind,
          radius,
          Boolean(b.fromEnemy) ? 1 : 0,
          shooterType,
          explosionRadius,
        ];
      }
      return {
        id: b.id,
        ownerId,
        ownerPlayerId,
        weaponKey,
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        color,
        kind,
        radius,
        fromEnemy: Boolean(b.fromEnemy),
        shooterType,
        explosionRadius,
      };
    }),
    shotEvents: Array.isArray(room.shotEvents) && room.shotEvents.length > 0 ? room.shotEvents.map((event) => ({
      id: event.id,
      bulletId: event.bulletId,
      ownerId: event.ownerId || '',
      ownerPlayerId: event.ownerPlayerId || '',
      shooterType: event.shooterType || 'player',
      weaponKey: event.weaponKey || 'pistol',
      kind: event.kind || 'bullet',
      x: event.x,
      y: event.y,
      vx: event.vx,
      vy: event.vy,
      color: event.color || '#f59e0b',
      radius: Math.max(2, Number(event.radius) || BULLET_RADIUS),
      at: Math.max(0, Number(event.at) || 0),
    })) : undefined,
    objectImpactEvents: Array.isArray(room.objectImpactEvents) && room.objectImpactEvents.length > 0 ? room.objectImpactEvents.map((event) => ({
      id: event.id,
      objectId: event.objectId || '',
      kind: event.kind || '',
      spriteKey: event.spriteKey || '',
      material: event.material || 'concrete',
      bulletKind: event.bulletKind || 'bullet',
      x: event.x,
      y: event.y,
      dirX: Number(event.dirX) || 0,
      dirY: Number(event.dirY) || 0,
      nx: Number(event.nx) || 0,
      ny: Number(event.ny) || 0,
      damage: Math.max(0, Number(event.damage) || 0),
      at: Math.max(0, Number(event.at) || 0),
    })) : undefined,
    enemies: room.enemies.map((e) => {
      const enemyType = e.type || 'normal';
      const radius = Math.max(ENEMY_RADIUS, Number(e.radius) || ENEMY_RADIUS);
      if (compactRealtime) {
        return [
          e.id,
          enemyType,
          e.x,
          e.y,
          e.hp,
          e.maxHp,
          radius,
          Boolean(e.faceLeft) ? 1 : 0,
          e.mobId || enemyType,
          e.behavior || getEnemyBehavior(e),
          e.color || '',
          Number(e.spriteScale) || 1,
          e.name || '',
          Math.max(0, Number(e.explosionRadius) || 0),
        ];
      }
      return {
        id: e.id,
        type: enemyType,
        mobId: e.mobId || enemyType,
        name: e.name || '',
        behavior: e.behavior || getEnemyBehavior(e),
        rarity: e.rarity || '',
        color: e.color || '',
        image: e.image || '',
        x: e.x,
        y: e.y,
        faceLeft: Boolean(e.faceLeft),
        hp: e.hp,
        maxHp: e.maxHp,
        radius,
        spriteScale: Number(e.spriteScale) || 1,
        explosionRadius: Math.max(0, Number(e.explosionRadius) || 0),
      };
    }),
    bossPortals: room.bossPortals.map((bp) => ({
      id: bp.id,
      x: bp.x,
      y: bp.y,
      spawnAt: bp.spawnAt,
      ttlMs: Math.max(0, bp.spawnAt - now),
    })),
    drops: includeRealtimeDrops ? realtimeDrops.map((d) => {
      const ttlMs = Math.max(0, Math.round(d.ttlMs || 0));
      const kind = d.kind || 'weapon';
      const weaponKey = d.weaponKey || null;
      if (compactRealtime) return [d.id, d.x, d.y, kind, weaponKey, ttlMs];
      return {
        id: d.id,
        x: d.x,
        y: d.y,
        kind,
        weaponKey,
        weaponLabel: kind === 'xp_vacuum' ? 'XP Surge' : (WEAPONS[d.weaponKey]?.label || 'Drop'),
        ttlMs,
        ttlMaxMs: DROP_LIFETIME_MS,
      };
    }) : undefined,
    xpOrbs: includeRealtimeXpOrbs ? realtimeXpOrbs.map((o) => {
      const ttlMs = Math.max(0, Math.round(o.ttlMs || 0));
      if (compactRealtime) return [o.id, o.x, o.y, ttlMs];
      return {
        id: o.id,
        x: o.x,
        y: o.y,
        xp: o.xp,
        ttlMs,
        ttlMaxMs: XP_ORB_LIFETIME_MS,
      };
    }) : undefined,
    skillOrbs: includeRealtimeSkillOrbs ? room.skillOrbs.map((o) => {
      const ttlMs = Math.max(0, Math.round(o.ttlMs || 0));
      if (compactRealtime) return [o.id, o.ownerId, o.skillId, o.x, o.y, ttlMs];
      return {
        id: o.id,
        ownerId: o.ownerId,
        skillId: o.skillId,
        x: o.x,
        y: o.y,
        ttlMs,
        ttlMaxMs: Math.max(1, Math.round(o.ttlMaxMs || SKILL_OFFER_TTL_MS)),
      };
    }) : undefined,
    decor: {
      trees: includeDecor ? room.trees : undefined,
      terrainZones: includeDecor ? room.terrainZones : undefined,
      theme: includeDecor ? room.sceneTheme : undefined,
      objectsVersion: Math.max(1, Number(room.mapObjectStateVersion) || 1),
      objects: (room.mapObjects || []).map(serializeMapObject).filter(Boolean),
    },
  };
}

function listLocalActiveRooms() {
  return Array.from(rooms.values()).filter((room) => room && room.players instanceof Map && room.players.size > 0);
}

function sortLandingLiveRooms(activeRooms) {
  return (Array.isArray(activeRooms) ? activeRooms.slice() : []).sort((a, b) =>
    (Number(a.startedAt) || 0) - (Number(b.startedAt) || 0)
    || (b.players.size - a.players.size)
    || String(a.code || '').localeCompare(String(b.code || '')));
}

function getFeaturedLandingLiveRoom(preferredCode = '') {
  const activeRooms = sortLandingLiveRooms(listLocalActiveRooms());
  if (activeRooms.length <= 0) return null;
  const normalizedPreferredCode = cleanRoomCodeForLookup(preferredCode);
  if (normalizedPreferredCode) {
    const picked = activeRooms.find((room) => cleanRoomCodeForLookup(room?.code) === normalizedPreferredCode);
    if (picked) return picked;
  }
  return activeRooms[0] || null;
}

function buildLandingLiveRoomPayload(room) {
  if (!room) return null;
  const serialized = serializeRoom(room);
  const players = Array.isArray(serialized.players)
    ? serialized.players.filter((player) => !player?.isCompanion)
    : [];

  return {
    code: room.code,
    startedAt: Math.max(0, Number(room.startedAt) || 0),
    liveForSec: Math.max(1, Math.floor((Date.now() - (Number(room.startedAt) || Date.now())) / 1000)),
    players: Math.max(0, room.players.size),
    spectators: Math.max(0, Number(room.spectators?.size) || 0),
    maxPlayers: Math.max(1, Number(room.maxPlayers) || getRoomMaxPlayers(room.gameMode)),
    gameMode: normalizeGameMode(room.gameMode || 'normal'),
    joinUrl: buildRoomRedirectUrl(PUBLIC_BASE_URL, room.code, 'join'),
    totalEnemyKills: Math.max(0, Number(room.totalEnemyKills) || 0),
    totalBossKills: Math.max(0, Number(room.totalBossKills) || 0),
    bossAlive: Boolean(serialized.bossAlive),
    roomDifficulty: serialized.roomDifficulty,
    preview: {
      now: serialized.now,
      roomCode: serialized.roomCode,
      world: serialized.world,
      roomStartedAt: serialized.roomStartedAt,
      gameMode: serialized.gameMode,
      totalEnemyKills: serialized.totalEnemyKills,
      spectators: serialized.spectators,
      spectatorCount: serialized.spectatorCount,
      nextBossAtKills: serialized.nextBossAtKills,
      bossAlive: serialized.bossAlive,
      nextBossSpawnAt: serialized.nextBossSpawnAt,
      roomDifficulty: serialized.roomDifficulty,
      decor: {
        trees: Array.isArray(serialized.decor?.trees) ? serialized.decor.trees.slice(0, 80) : [],
      },
      players: players.slice(0, 24),
      enemies: Array.isArray(serialized.enemies) ? serialized.enemies.slice(0, 120) : [],
      bullets: Array.isArray(serialized.bullets) ? serialized.bullets.slice(0, 140) : [],
      xpOrbs: Array.isArray(serialized.xpOrbs) ? serialized.xpOrbs.slice(0, 120) : [],
      bossPortals: Array.isArray(serialized.bossPortals) ? serialized.bossPortals.slice(0, 6) : [],
      drops: Array.isArray(serialized.drops) ? serialized.drops.slice(0, 40) : [],
      skillOrbs: Array.isArray(serialized.skillOrbs) ? serialized.skillOrbs.slice(0, 32) : [],
    },
  };
}

function buildLandingLiveRoomSummary(room) {
  if (!room) return null;
  return {
    code: room.code,
    startedAt: Math.max(0, Number(room.startedAt) || 0),
    liveForSec: Math.max(1, Math.floor((Date.now() - (Number(room.startedAt) || Date.now())) / 1000)),
    players: Math.max(0, room.players.size),
    spectators: Math.max(0, Number(room.spectators?.size) || 0),
    maxPlayers: Math.max(1, Number(room.maxPlayers) || getRoomMaxPlayers(room.gameMode)),
    gameMode: normalizeGameMode(room.gameMode || 'normal'),
  };
}

function getRoomDifficulty(room, now) {
  const elapsedSec = Math.max(0, (now - room.startedAt) / 1000);
  const level = Math.max(1, 1 + Math.floor(elapsedSec / DIFFICULTY_STEP_SEC));
  const hpMul = 1 + (level - 1) * DIFFICULTY_HP_PER_LEVEL;
  const speedMul = 1 + (level - 1) * DIFFICULTY_SPEED_PER_LEVEL;
  const damageMul = 1 + (level - 1) * DIFFICULTY_DAMAGE_PER_LEVEL;
  const attackRateMul = 1 + (level - 1) * DIFFICULTY_ATTACK_RATE_PER_LEVEL;
  const spawnIntervalMs = Math.max(
    DIFFICULTY_SPAWN_MIN_MS,
    ENEMY_SPAWN_INTERVAL_MS - (level - 1) * DIFFICULTY_SPAWN_REDUCTION_MS,
  );
  return {
    elapsedSec,
    level,
    hpMul,
    speedMul,
    damageMul,
    attackRateMul,
    spawnIntervalMs,
  };
}
function nearestAlivePlayer(room, x, y) {
  let target = null;
  let bestDistSq = Infinity;
  for (const p of room.players.values()) {
    if (!p.alive) continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      target = p;
    }
  }
  return target;
}

function chooseEnemyMob(room, difficulty = null) {
  const diffLevel = Math.max(1, Math.floor(Number(difficulty?.level) || 1));
  const catalog = room?.mobCatalogById instanceof Map ? room.mobCatalogById : buildMobCatalog(room?.mobCatalog || []).byId;
  const weights = room?.mobSpawnWeights && typeof room.mobSpawnWeights === 'object' ? room.mobSpawnWeights : {};
  const candidates = [];
  for (const [mobId, rawWeight] of Object.entries(weights)) {
    const mobDef = catalog.get(String(mobId || '')) || getMobDef(mobId);
    if (!mobDef || mobDef.enabled === false) continue;
    if (getMobBehaviorFromDef(mobDef) === 'boss') continue;
    if (diffLevel < Math.max(1, Math.floor(Number(mobDef.minDifficultyLevel) || 1))) continue;
    const weight = Math.max(0, Number(rawWeight) || 0);
    if (weight > 0) candidates.push({ mobDef, weight });
  }
  if (candidates.length <= 0) {
    const roll = Math.random();
    return getRoomMobDef(room, roll < 0.16 ? 'ranged' : (roll < 0.38 ? 'charger' : 'normal')) || { id: 'normal', behavior: 'melee' };
  }
  const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * Math.max(1, total);
  for (const entry of candidates) {
    roll -= entry.weight;
    if (roll <= 0) return entry.mobDef;
  }
  return candidates[candidates.length - 1].mobDef;
}

function hasAliveBoss(room) {
  return room.enemies.some((e) => e.type === 'boss' && e.hp > 0);
}

function scheduleBossPortal(room, now, spawnPos) {
  if (room.bossPortals.length > 0) return false;
  if (hasAliveBoss(room)) return false;
  const pos = spawnPos || randomSpawnEdge(room);
  room.bossPortals.push({
    id: room.nextPortalId++,
    x: pos.x,
    y: pos.y,
    spawnAt: now + BOSS_PORTAL_WARN_MS,
  });
  broadcastRoom(room, { type: 'system', message: 'A boss is approaching. Portal opened.' });
  return true;
}

function createEnemyFromMob(room, mobDef, pos, now, difficulty = null, overrides = {}) {
  const diff = difficulty || getRoomDifficulty(room, now || Date.now());
  const hpBase = ENEMY_HP_BASE + Math.floor(((now || Date.now()) - room.startedAt) / 25000) * 2;
  const hpMul = Math.max(1, Number(room.enemyHpMul) || 1);
  const def = mobDef || getRoomMobDef(room, 'normal') || {};
  const behavior = getMobBehaviorFromDef(def);
  const type = String(def.id || 'normal');
  const baseRadius = Math.max(8, Number(def.radius) || ENEMY_RADIUS);
  const hp = Math.max(4, Math.round(hpBase * diff.hpMul * hpMul * Math.max(0.05, Number(def.hpMul) || 1) * Math.max(0.05, Number(overrides.hpMul) || 1)));
  const speedMul = Math.max(0.05, Number(def.speedMul) || 1) * Math.max(0.05, Number(overrides.speedMul) || 1);
  return {
    id: room.nextEnemyId++,
    type,
    mobId: type,
    behavior,
    rarity: String(def.rarity || 'common'),
    color: String(def.color || '#ef4444'),
    image: String(def.image || '/assets/sprites/enemy_mummy.png'),
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    radius: Math.max(8, baseRadius * Math.max(0.05, Number(overrides.radiusMul) || 1)),
    spriteScale: Math.max(0.4, Number(def.spriteScale) || 1) * Math.max(0.05, Number(overrides.spriteScaleMul) || 1),
    speed: (ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN)) * speedMul * diff.speedMul,
    damageMul: diff.damageMul * Math.max(0.05, Number(def.damageMul) || 1) * Math.max(0.05, Number(overrides.damageMul) || 1),
    damageTakenMul: Math.max(0.05, Number(def.damageTakenMul) || 1),
    attackRateMul: diff.attackRateMul,
    attackCooldownMul: Math.max(0.1, Number(def.attackCooldownMul) || 1),
    attackWindupMs: 0,
    attackCooldownMs: 0,
    attackTargetId: null,
    hitStunMs: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    faceLeft: false,
    xpValue: Math.max(0, Math.round(Number(def.xpValue) || 0)),
    scoreValue: Math.max(0, Math.round(Number(def.scoreValue) || 0)),
    knockbackResist: Math.max(0.05, Number(def.knockbackResist) || 1),
    rangeMin: Math.max(0, Number(def.rangeMin) || ENEMY_RANGED_MIN_RANGE),
    rangeMax: Math.max(0, Number(def.rangeMax) || ENEMY_RANGED_MAX_RANGE),
    fireCooldownMs: Math.max(80, Math.round(Number(def.fireCooldownMs) || ENEMY_RANGED_FIRE_COOLDOWN_MS)),
    projectileDamage: Math.max(1, Math.round(ENEMY_RANGED_DAMAGE * Math.max(0.05, Number(def.projectileDamageMul) || 1))),
    projectileSpeed: Math.max(80, Math.round(ENEMY_RANGED_BULLET_SPEED * Math.max(0.1, Number(def.projectileSpeedMul) || 1))),
    projectileLifeMs: Math.max(100, Math.round(Number(def.projectileLifeMs) || ENEMY_RANGED_BULLET_LIFE_MS)),
    projectileColor: String(def.projectileColor || def.color || '#f87171'),
    healAmount: Math.max(0, Number(def.healAmount) || 0),
    healRadius: Math.max(0, Number(def.healRadius) || 0),
    healCooldownMs: Math.max(0, Math.round(Number(def.healCooldownMs) || 0)),
    healCooldownLeftMs: Math.max(250, Math.round(Number(def.healCooldownMs) || 0)),
    explosionRadius: Math.max(0, Number(def.explosionRadius) || 0),
    explosionDamage: Math.max(0, Number(def.explosionDamage) || 0),
    splitMobId: String(def.splitMobId || ''),
    splitCount: Math.max(0, Math.floor(Number(def.splitCount) || 0)),
  };
}

function spawnEnemy(room, now, difficulty = null, forcedMobId = '') {
  const pos = randomSpawnEdge(room);
  const mobDef = forcedMobId ? getRoomMobDef(room, forcedMobId) : chooseEnemyMob(room, difficulty);
  room.enemies.push(createEnemyFromMob(room, mobDef, pos, now || Date.now(), difficulty));
}
function spawnBossEnemy(room, x, y, now, difficulty = null, forcedBossMobId = '') {
  const diff = difficulty || getRoomDifficulty(room, now);
  const elapsedMul = 1 + Math.floor((now - room.startedAt) / 60000) * 0.18;
  const hpMul = Math.max(1, Number(room.enemyHpMul) || 1);
  const bossMobId = String(forcedBossMobId || room?.bossMobId || 'boss').trim() || 'boss';
  let bossDef = getRoomMobDef(room, bossMobId) || getRoomMobDef(room, 'boss') || {};
  if (getMobBehaviorFromDef(bossDef) !== 'boss') bossDef = getRoomMobDef(room, 'boss') || {};
  const bossId = String(bossDef.id || 'boss');
  const hp = Math.round(BOSS_HP_BASE * elapsedMul * (0.95 + diff.hpMul * 0.7) * hpMul * Math.max(0.05, Number(bossDef.hpMul) || 1));
  room.enemies.push({
    id: room.nextEnemyId++,
    type: 'boss',
    mobId: bossId,
    name: String(bossDef.name || 'BOSS'),
    behavior: 'boss',
    rarity: String(bossDef.rarity || 'boss'),
    color: String(bossDef.color || '#dc2626'),
    image: String(bossDef.image || '/assets/sprites/enemy_mummy.png'),
    x,
    y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    radius: Math.max(12, Number(bossDef.radius) || BOSS_RADIUS),
    spriteScale: Math.max(0.5, Number(bossDef.spriteScale) || BOSS_SPRITE_SCALE),
    speed: BOSS_SPEED * Math.max(1, diff.speedMul * 0.85) * Math.max(0.05, Number(bossDef.speedMul) || 1),
    damageMul: Math.max(1, diff.damageMul * 1.1) * Math.max(0.05, Number(bossDef.damageMul) || 1),
    damageTakenMul: Math.max(0.05, Number(bossDef.damageTakenMul) || 1),
    attackRateMul: Math.max(1, diff.attackRateMul * 1.05),
    attackCooldownMul: Math.max(0.1, Number(bossDef.attackCooldownMul) || 1),
    attackWindupMs: 0,
    attackCooldownMs: 500,
    attackTargetId: null,
    hitStunMs: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    faceLeft: false,
    xpValue: Math.max(1, Math.round(Number(bossDef.xpValue) || 220)),
    scoreValue: Math.max(1, Math.round(Number(bossDef.scoreValue) || 100)),
    knockbackResist: Math.max(0.05, Number(bossDef.knockbackResist) || ENEMY_KNOCKBACK_BOSS_RESIST),
    rangeMin: Math.max(0, Number(bossDef.rangeMin) || 0),
    rangeMax: Math.max(0, Number(bossDef.rangeMax) || 0),
    fireCooldownMs: Math.max(80, Math.round(Number(bossDef.fireCooldownMs) || ENEMY_RANGED_FIRE_COOLDOWN_MS)),
    projectileDamage: Math.max(1, Math.round(ENEMY_RANGED_DAMAGE * Math.max(0.05, Number(bossDef.projectileDamageMul) || 1))),
    projectileSpeed: Math.max(80, Math.round(ENEMY_RANGED_BULLET_SPEED * Math.max(0.1, Number(bossDef.projectileSpeedMul) || 1))),
    projectileLifeMs: Math.max(100, Math.round(Number(bossDef.projectileLifeMs) || ENEMY_RANGED_BULLET_LIFE_MS)),
    projectileColor: String(bossDef.projectileColor || bossDef.color || '#f87171'),
    healAmount: Math.max(0, Number(bossDef.healAmount) || 0),
    healRadius: Math.max(0, Number(bossDef.healRadius) || 0),
    healCooldownMs: Math.max(0, Math.round(Number(bossDef.healCooldownMs) || 0)),
    healCooldownLeftMs: Math.max(250, Math.round(Number(bossDef.healCooldownMs) || 0)),
    explosionRadius: Math.max(0, Number(bossDef.explosionRadius) || 0),
    explosionDamage: Math.max(0, Number(bossDef.explosionDamage) || 0),
    splitMobId: String(bossDef.splitMobId || ''),
    splitCount: Math.max(0, Math.floor(Number(bossDef.splitCount) || 0)),
  });
  broadcastRoom(room, { type: 'system', message: `${String(bossDef.name || 'BOSS')} arrived. Keep moving.` });
}


function maybeScheduleBossSpawn(room, now) {
  if (room.totalEnemyKills < room.nextBossAtKills) return;
  if (room.bossPortals.length > 0) return;
  if (hasAliveBoss(room)) return;
  if (scheduleBossPortal(room, now)) {
    room.nextBossAtKills += Math.max(4, Number(room.bossKillInterval) || BOSS_KILL_INTERVAL);
  }
}

function getEnemyAttackCooldownMs(enemy) {
  const rateMul = Math.max(0.35, Number(enemy?.attackRateMul) || 1);
  const cooldownMul = Math.max(0.1, Number(enemy?.attackCooldownMul) || 1);
  if (enemy?.type === 'boss') return Math.max(220, Math.round((BOSS_ATTACK_COOLDOWN_MS * cooldownMul) / rateMul));
  const castFrequency = Math.max(0, Number(ENEMY_ATTACK_CAST_FREQUENCY) || 0);
  const effective = (ENEMY_ATTACK_BASE_COOLDOWN_MS * cooldownMul) / (1 + castFrequency);
  return Math.max(ENEMY_ATTACK_MIN_COOLDOWN_MS, Math.round(effective / rateMul));
}

function maybeSpawnDrop(room, x, y) {
  const spawnPos = findNearestCollectibleSpawnPoint(room, x, y, { radius: Math.max(12, PLAYER_RADIUS * 0.82) });
  const bonusRoll = Math.random();
  if (bonusRoll <= 0.045) {
    room.drops.push({
      id: room.nextDropId++,
      kind: 'xp_vacuum',
      x: spawnPos.x,
      y: spawnPos.y,
      weaponKey: null,
      ttlMs: DROP_LIFETIME_MS,
    });
    bumpRealtimeCollectionVersion(room, 'drops');
    return;
  }

  if (Math.random() > 0.22) return;
  const weaponKey = DROP_WEAPON_KEYS[Math.floor(Math.random() * DROP_WEAPON_KEYS.length)];
  room.drops.push({
    id: room.nextDropId++,
    kind: 'weapon',
    x: spawnPos.x,
    y: spawnPos.y,
    weaponKey,
    ttlMs: DROP_LIFETIME_MS,
  });
  bumpRealtimeCollectionVersion(room, 'drops');
}

function setPlayerWeapon(player, weaponKey) {
  const weapon = WEAPONS[weaponKey] || WEAPONS.pistol;
  const key = WEAPONS[weaponKey] ? weaponKey : 'pistol';
  player.weaponKey = key;
  player.weaponMagazine = Math.max(1, Math.floor(Number(weapon.magazineSize) || 1));
  player.weaponReserveAmmo = weapon.reserveAmmo === null ? null : Math.max(0, Math.floor(Number(weapon.reserveAmmo) || 0));
  player.weaponReloadLeftMs = 0;
  player.weaponAmmo = player.weaponReserveAmmo;
}

function refillPlayerWeapon(player, weaponKey) {
  const weapon = WEAPONS[weaponKey] || WEAPONS.pistol;
  const key = WEAPONS[weaponKey] ? weaponKey : 'pistol';
  const magazineSize = Math.max(1, Math.floor(Number(weapon.magazineSize) || 1));
  const pickupAmmo = weapon.pickupAmmo === null ? null : Math.max(0, Math.floor(Number(weapon.pickupAmmo) || 0));
  if (player.weaponKey !== key) {
    setPlayerWeapon(player, key);
    return { switched: true, addedAmmo: player.weaponReserveAmmo, magazineSize };
  }
  player.weaponMagazine = Math.min(magazineSize, Math.max(0, Math.floor(Number(player.weaponMagazine) || 0)) + magazineSize);
  if (pickupAmmo === null) {
    player.weaponReserveAmmo = null;
  } else {
    player.weaponReserveAmmo = Math.max(0, Math.floor(Number(player.weaponReserveAmmo) || 0)) + pickupAmmo;
  }
  player.weaponAmmo = player.weaponReserveAmmo;
  if (Number(player.weaponReloadLeftMs) > 0 && player.weaponMagazine > 0) player.weaponReloadLeftMs = 0;
  return { switched: false, addedAmmo: pickupAmmo, magazineSize };
}

function getPlayerWeaponAmmoLabel(player) {
  const magazine = Math.max(0, Math.floor(Number(player.weaponMagazine) || 0));
  const reserve = player.weaponReserveAmmo === null ? '∞' : String(Math.max(0, Math.floor(Number(player.weaponReserveAmmo) || 0)));
  return `${magazine}/${reserve}`;
}

function startPlayerReload(player, weapon, { force = false } = {}) {
  if (!player || !weapon) return false;
  if (Number(player.weaponReloadLeftMs) > 0) return true;
  const magazineSize = Math.max(1, Math.floor(Number(weapon.magazineSize) || 1));
  const magazine = Math.max(0, Math.floor(Number(player.weaponMagazine) || 0));
  if (!force && magazine >= magazineSize) return false;
  if (player.weaponReserveAmmo !== null && Math.max(0, Math.floor(Number(player.weaponReserveAmmo) || 0)) <= 0) return false;
  player.weaponReloadLeftMs = getWeaponReloadMs(player.weaponKey, player.reloadSpeedMul);
  player.fireCooldownLeft = Math.max(player.fireCooldownLeft || 0, player.weaponReloadLeftMs);
  return true;
}

function completePlayerReload(player, weapon) {
  const magazineSize = Math.max(1, Math.floor(Number(weapon.magazineSize) || 1));
  const magazine = Math.max(0, Math.floor(Number(player.weaponMagazine) || 0));
  const need = Math.max(0, magazineSize - magazine);
  if (need <= 0) return false;
  if (player.weaponReserveAmmo === null) {
    player.weaponMagazine = magazineSize;
    player.weaponAmmo = null;
    return true;
  }
  const reserve = Math.max(0, Math.floor(Number(player.weaponReserveAmmo) || 0));
  const load = Math.min(need, reserve);
  if (load <= 0) return false;
  player.weaponMagazine = magazine + load;
  player.weaponReserveAmmo = reserve - load;
  player.weaponAmmo = player.weaponReserveAmmo;
  return true;
}

function fallbackToPistolIfOut(player) {
  if (!player || player.weaponKey === 'pistol') return false;
  const magazine = Math.max(0, Math.floor(Number(player.weaponMagazine) || 0));
  const reserve = Math.max(0, Math.floor(Number(player.weaponReserveAmmo) || 0));
  if (magazine > 0 || reserve > 0) return false;
  setPlayerWeapon(player, 'pistol');
  sendTo(player.ws, { type: 'system', message: 'Ammo ended. Back to pistol.' });
  return true;
}

function updatePlayerReload(player, dtMs) {
  if (!player) return;
  const weapon = WEAPONS[player.weaponKey] || WEAPONS.pistol;
  if (!Number.isFinite(Number(player.weaponMagazine))) {
    player.weaponMagazine = Math.max(1, Math.floor(Number(weapon.magazineSize) || 1));
  }
  if (player.weaponReserveAmmo === undefined) {
    player.weaponReserveAmmo = weapon.reserveAmmo === null ? null : Math.max(0, Math.floor(Number(weapon.reserveAmmo) || 0));
  }
  if (Number(player.weaponReloadLeftMs) > 0) {
    player.weaponReloadLeftMs = Math.max(0, Number(player.weaponReloadLeftMs) - dtMs);
    if (player.weaponReloadLeftMs <= 0) completePlayerReload(player, weapon);
  }
  fallbackToPistolIfOut(player);
}

function getWeaponMuzzleOrigin(shooter, angle, radius = BULLET_RADIUS) {
  const forward = Math.max(18, PLAYER_RADIUS + Math.max(0, Number(radius) || BULLET_RADIUS) * 0.5);
  return {
    x: (Number(shooter?.x) || 0) + Math.cos(angle) * forward,
    y: (Number(shooter?.y) || 0) + Math.sin(angle) * forward,
  };
}

function fireFromPlayer(room, player, now = Date.now()) {
  const weapon = WEAPONS[player.weaponKey] || WEAPONS.pistol;
  if (Number(player.weaponReloadLeftMs) > 0) return;
  if (Math.max(0, Math.floor(Number(player.weaponMagazine) || 0)) <= 0) {
    if (startPlayerReload(player, weapon, { force: true })) return;
    if (fallbackToPistolIfOut(player)) return;
  }
  const activeWeapon = WEAPONS[player.weaponKey] || WEAPONS.pistol;
  if (Math.max(0, Math.floor(Number(player.weaponMagazine) || 0)) <= 0) return;
  const dx = player.aimX - player.x;
  const dy = player.aimY - player.y;
  const baseAngle = Math.atan2(dy, dx);

  const damageMul = Math.max(0.2, Number(player.damageMul) || 1);
  const fireRateMul = Math.max(0.2, Number(player.fireRateMul) || 1);
  const bulletSkill = getPlayerBulletSkillStats(player);
  const firstBulletId = room.nextBulletId;
  const eventSpeed = Math.max(120, Number(activeWeapon.bulletSpeed) || 920);
  const bulletRadius = Math.max(2, Number(activeWeapon.radius) || BULLET_RADIUS);
  const muzzle = getWeaponMuzzleOrigin(player, baseAngle, bulletRadius);
  pushRoomShotEvent(room, {
    bulletId: firstBulletId,
    ownerId: player.id,
    ownerPlayerId: player.ownerId || '',
    shooterType: player.isCompanion ? 'companion' : 'player',
    weaponKey: String(player.weaponKey || 'pistol').toLowerCase(),
    kind: 'bullet',
    x: muzzle.x,
    y: muzzle.y,
    vx: Math.cos(baseAngle) * eventSpeed,
    vy: Math.sin(baseAngle) * eventSpeed,
    color: activeWeapon.color || '#f59e0b',
    radius: bulletRadius,
    at: now,
  });

  for (let i = 0; i < activeWeapon.pellets; i += 1) {
    const spread = (Math.random() - 0.5) * (activeWeapon.spreadDeg * Math.PI / 180);
    const angle = baseAngle + spread;
    const speedVariance = Math.max(0, Number(activeWeapon.bulletSpeedVariance) || 0);
    const speedMul = 1 + ((Math.random() * 2) - 1) * speedVariance;
    const bulletSpeed = Math.max(120, activeWeapon.bulletSpeed * speedMul);
    room.bullets.push({
      id: room.nextBulletId++,
      ownerId: player.id,
      fromEnemy: false,
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(angle) * bulletSpeed,
      vy: Math.sin(angle) * bulletSpeed,
      lifeMs: activeWeapon.bulletLifeMs,
      damage: Math.max(1, Math.round(activeWeapon.bulletDamage * damageMul * bulletSkill.damageMul)),
      color: activeWeapon.color,
      weaponKey: String(player.weaponKey || 'pistol').toLowerCase(),
      segmentHit: String(player.weaponKey || '').toLowerCase() === 'sniper',
      pierceRemaining: bulletSkill.pierce,
      hitEnemyIds: bulletSkill.pierce > 0 ? [] : undefined,
      homingRange: bulletSkill.homingRange,
      homingTurnRate: bulletSkill.homingTurnRate,
      homingDelayMs: 45,
      shooterType: player.isCompanion ? 'companion' : 'player',
    });
  }

  player.fireCooldownLeft = Math.max(35, activeWeapon.cooldownMs / fireRateMul);
  player.weaponMagazine = Math.max(0, Math.floor(Number(player.weaponMagazine) || 0) - 1);
  if (player.weaponMagazine <= 0) {
    if (!startPlayerReload(player, activeWeapon, { force: true })) fallbackToPistolIfOut(player);
  }
}

function fireEnemyProjectile(room, enemy, target) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const damageMul = Math.max(1, Number(enemy?.damageMul) || 1);
  const speed = Math.max(80, Number(enemy?.projectileSpeed) || ENEMY_RANGED_BULLET_SPEED);
  room.bullets.push({
    id: room.nextBulletId++,
    ownerId: null,
    fromEnemy: true,
    x: enemy.x,
    y: enemy.y,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    lifeMs: Math.max(100, Number(enemy?.projectileLifeMs) || ENEMY_RANGED_BULLET_LIFE_MS),
    damage: Math.max(1, Math.round(Math.max(1, Number(enemy?.projectileDamage) || ENEMY_RANGED_DAMAGE) * damageMul)),
    color: enemy?.projectileColor || enemy?.color || '#f87171',
    shooterType: 'enemy',
  });
}

function performPlayerDodge(player, now) {
  if (!player.alive) return;
  const room = rooms.get(player.roomCode);
  const world = getRoomWorld(room);
  const charges = Math.max(0, Number(player.dodgeCharges) || 0);
  if (charges <= 0) return;

  let dx = Number(player.moveX) || 0;
  let dy = Number(player.moveY) || 0;
  if (Math.hypot(dx, dy) < 0.05) {
    dx = (Number(player.aimX) || player.x) - player.x;
    dy = (Number(player.aimY) || player.y) - player.y;
  }
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;

  const moved = moveActorWithSceneCollision(
    room,
    player.x,
    player.y,
    nx * PLAYER_DODGE_DISTANCE,
    ny * PLAYER_DODGE_DISTANCE,
    PLAYER_RADIUS,
    {
      minX: PLAYER_RADIUS,
      maxX: world.width - PLAYER_RADIUS,
      minY: PLAYER_RADIUS,
      maxY: world.height - PLAYER_RADIUS,
    },
  );
  player.x = moved.x;
  player.y = moved.y;
  player.dodgeCharges = Math.max(0, charges - 1);
  if (player.dodgeCharges < (player.dodgeChargesMax || PLAYER_DODGE_MAX_CHARGES) && (player.dodgeRechargeMs || 0) <= 0) {
    player.dodgeRechargeMs = PLAYER_DODGE_COOLDOWN_MS;
  }
  player.dodgeCooldownMs = Math.max(0, player.dodgeRechargeMs || 0);
  player.dodgeInvulnUntil = now + PLAYER_DODGE_INVULN_MS;
}

function updatePlayerDodgeRecharge(player, dtMs) {
  const maxCharges = Math.max(1, Number(player.dodgeChargesMax) || PLAYER_DODGE_MAX_CHARGES);
  player.dodgeCharges = Math.max(0, Math.min(maxCharges, Number(player.dodgeCharges) || 0));
  player.dodgeRechargeMs = Math.max(0, Number(player.dodgeRechargeMs) || 0);

  if (player.dodgeCharges >= maxCharges) {
    player.dodgeRechargeMs = 0;
    player.dodgeCooldownMs = 0;
    return;
  }

  player.dodgeRechargeMs -= dtMs;
  while (player.dodgeRechargeMs <= 0 && player.dodgeCharges < maxCharges) {
    player.dodgeCharges += 1;
    if (player.dodgeCharges < maxCharges) {
      player.dodgeRechargeMs += PLAYER_DODGE_COOLDOWN_MS;
    } else {
      player.dodgeRechargeMs = 0;
    }
  }

  player.dodgeCooldownMs = Math.max(0, player.dodgeRechargeMs);
}

function applyEnemyHitToPlayer(room, target, damage, now, applySlow = true) {
  if (!target || !target.alive) return;
  if (target.godMode) return;
  if ((Number(target.dodgeInvulnUntil) || 0) > now) return;
  const options = typeof applySlow === 'object' && applySlow ? applySlow : {};
  const shouldSlow = typeof applySlow === 'boolean' ? applySlow : options.applySlow !== false;
  const amount = applyPlayerForceShield(target, Math.max(1, Math.round(Number(damage) || 1)), now, options);
  if (amount > 0) target.hp -= amount;
  if (shouldSlow) target.slowUntil = Math.max(target.slowUntil || 0, now + PLAYER_SLOW_DURATION_MS);
  if (target.hp <= 0) {
    downPlayer(room, target, now);
  }
}

function getPlayerForceShieldConfig(player) {
  if (!player || !player.skills || typeof player.skills !== 'object') return null;
  let maxShield = 0;
  let absorb = 0;
  let restoreMs = 30000;
  for (const skillId of Object.keys(player.skills)) {
    const def = getCombatSkillDef(skillId, player.playerClass);
    if (!def) continue;
    const lvl = getSkillRank(player, def.id);
    if (lvl <= 0) continue;
    const base = Math.max(0, Number(def.shieldMaxBase) || 0);
    const perLevel = Math.max(0, Number(def.shieldMaxPerLevel) || 0);
    const skillShield = base > 0 ? (base + perLevel * Math.max(0, lvl - 1)) : perLevel * lvl;
    if (skillShield > 0) {
      maxShield += skillShield;
      absorb = Math.max(absorb, (Number(def.shieldAbsorbBase) || 0) + (Number(def.shieldAbsorbPerLevel) || 0) * Math.max(0, lvl - 1));
      restoreMs = Math.min(restoreMs, Math.max(3000, Number(def.shieldRestoreMs) || 30000));
    }
  }
  if (maxShield <= 0 || absorb <= 0) return null;
  return {
    maxShield: Math.max(1, Math.round(maxShield)),
    absorb: Math.max(0.05, Math.min(0.9, absorb)),
    restoreMs,
  };
}

function refreshPlayerForceShieldStats(player, now = Date.now()) {
  if (!player) return;
  const prevMax = Math.max(0, Number(player.shieldMax) || 0);
  const prevHp = Math.max(0, Number(player.shieldHp) || 0);
  const cfg = getPlayerForceShieldConfig(player);
  if (!cfg) {
    player.shieldMax = 0;
    player.shieldHp = 0;
    player.shieldAbsorbMul = 0;
    player.shieldRestoreMs = 0;
    player.shieldRestoreAt = 0;
    return;
  }

  player.shieldMax = cfg.maxShield;
  player.shieldAbsorbMul = cfg.absorb;
  player.shieldRestoreMs = cfg.restoreMs;
  if (prevMax <= 0) {
    player.shieldHp = cfg.maxShield;
    player.shieldRestoreAt = 0;
    return;
  }
  const restoring = prevHp <= 0 && Math.max(0, Number(player.shieldRestoreAt) || 0) > now;
  if (restoring) {
    player.shieldHp = 0;
    return;
  }
  player.shieldHp = clamp(prevHp + Math.max(0, cfg.maxShield - prevMax), 0, cfg.maxShield);
  if (player.shieldHp > 0) player.shieldRestoreAt = 0;
}

function tickPlayerForceShield(player, now) {
  if (!player || Math.max(0, Number(player.shieldMax) || 0) <= 0) return;
  if (Math.max(0, Number(player.shieldHp) || 0) > 0) return;
  const restoreAt = Math.max(0, Number(player.shieldRestoreAt) || 0);
  if (restoreAt > 0 && now >= restoreAt) {
    player.shieldHp = Math.max(1, Math.round(Number(player.shieldMax) || 0));
    player.shieldRestoreAt = 0;
  }
}

function applyPlayerForceShield(player, damage, now, options = {}) {
  const amount = Math.max(1, Math.round(Number(damage) || 1));
  if (!player || Math.max(0, Number(player.shieldMax) || 0) <= 0) return amount;
  tickPlayerForceShield(player, now);
  const shieldHp = Math.max(0, Number(player.shieldHp) || 0);
  if (shieldHp <= 0) return amount;
  const absorbMul = Math.max(0.05, Math.min(0.9, Number(player.shieldAbsorbMul) || 0));
  const absorbed = Math.min(shieldHp, Math.max(1, Math.round(amount * absorbMul)));
  if (absorbed <= 0) return amount;

  player.shieldHp = Math.max(0, shieldHp - absorbed);
  if (player.shieldHp <= 0) {
    player.shieldRestoreAt = now + Math.max(3000, Number(player.shieldRestoreMs) || 30000);
  }

  const sourceX = Number(options.sourceX);
  const sourceY = Number(options.sourceY);
  let dirX = Number.isFinite(sourceX) ? (sourceX - (Number(player.x) || 0)) : Number(options.dirX);
  let dirY = Number.isFinite(sourceY) ? (sourceY - (Number(player.y) || 0)) : Number(options.dirY);
  if (Math.hypot(dirX || 0, dirY || 0) < 0.001) {
    dirX = 0;
    dirY = -1;
  }
  const len = Math.hypot(dirX, dirY) || 1;
  player.shieldHitDirX = dirX / len;
  player.shieldHitDirY = dirY / len;
  player.shieldLastHitAt = now;
  player.shieldLastAbsorbed = absorbed;
  player.shieldHitSeq = Math.max(0, Number(player.shieldHitSeq) || 0) + 1;

  return Math.max(0, amount - absorbed);
}


function getXpToNextLevel(level) {
  const lv = Math.max(1, Math.floor(Number(level) || 1));
  return Math.round(28 + (lv - 1) * 14 + ((lv - 1) ** 2) * 3);
}

function getSkillRank(player, skillId) {
  const st = player.skills?.[skillId];
  return Math.max(0, Math.floor(Number(st?.level) || 0));
}

function getPlayerBulletSkillStats(player) {
  const out = {
    pierce: 0,
    damageMul: 1,
    homingRange: 0,
    homingTurnRate: 0,
  };
  if (!player || !player.skills || typeof player.skills !== 'object') return out;
  for (const skillId of Object.keys(player.skills)) {
    const def = getCombatSkillDef(skillId, player.playerClass);
    if (!def) continue;
    const lvl = getSkillRank(player, def.id);
    if (lvl <= 0) continue;
    out.pierce += Math.max(0, Number(def.bulletPierceFlat) || 0);
    out.pierce += Math.max(0, Number(def.bulletPiercePerLevel) || 0) * lvl;
    out.damageMul += Math.max(0, Number(def.bulletDamageMulPerLevel) || 0) * lvl;
    const homingBase = Math.max(0, Number(def.bulletHomingRangeBase) || 0);
    const homingPerLevel = Math.max(0, Number(def.bulletHomingRangePerLevel) || 0);
    const homingRange = homingBase > 0 ? (homingBase + homingPerLevel * Math.max(0, lvl - 1)) : homingPerLevel * lvl;
    if (homingRange > 0) {
      out.homingRange = Math.max(out.homingRange, homingRange);
      out.homingTurnRate = Math.max(
        out.homingTurnRate,
        (Number(def.bulletHomingTurnBase) || 0) + (Number(def.bulletHomingTurnPerLevel) || 0) * Math.max(0, lvl - 1),
      );
    }
  }
  out.pierce = Math.max(0, Math.min(24, Math.floor(out.pierce)));
  out.damageMul = Math.max(0.2, Number(out.damageMul) || 1);
  out.homingRange = Math.max(0, Math.min(1400, Number(out.homingRange) || 0));
  out.homingTurnRate = Math.max(0, Math.min(12, Number(out.homingTurnRate) || 0));
  return out;
}

function ensureSkillState(player, skillId) {
  if (!player.skills) player.skills = {};
  if (!player.skills[skillId]) player.skills[skillId] = { level: 0, cooldownMs: 0, maxCooldownMs: 0 };
  return player.skills[skillId];
}

function applyPersistentHeroSkillsToPlayer(player) {
  if (!player || !player.accountProgression || !player.playerClass) return;
  const runtimeSkills = accountProgressionStore.getHeroRuntimeSkills(player.accountProgression, player.playerClass);
  const skillIds = Object.keys(runtimeSkills || {});
  if (skillIds.length <= 0) return;
  if (!player.skills || typeof player.skills !== 'object') player.skills = {};
  if (!Array.isArray(player.skillOrder)) player.skillOrder = [];
  for (const skillId of skillIds) {
    const level = Math.max(1, Number(runtimeSkills[skillId]) || 1);
    const st = ensureSkillState(player, skillId);
    st.level = level;
    const def = getCombatSkillDef(skillId, player.playerClass);
    if (def?.kind === 'active') {
      st.maxCooldownMs = Math.max(0, Math.round(Number(def.cooldownMs) || 0));
      st.cooldownMs = 0;
    }
    if (!player.skillOrder.includes(skillId)) player.skillOrder.push(skillId);
  }
}

function rebuildPlayerDerivedStats(player) {
  player.damageMul = 1;
  player.fireRateMul = 1;
  player.reloadSpeedMul = 1;
  player.moveSpeedMul = 1;
  player.maxHpBonus = 0;
  player.hpRegenPerSec = 0;
  player.pickupRadius = PLAYER_PICKUP_RADIUS_BASE;
  player.extraDodgeCharges = 0;

  const skillIds = player.skills && typeof player.skills === 'object'
    ? Object.keys(player.skills)
    : [];
  for (const skillId of skillIds) {
    const def = getCombatSkillDef(skillId, player.playerClass);
    if (!def) continue;
    const lvl = getSkillRank(player, def.id);
    if (lvl <= 0) continue;
    player.damageMul += (Number(def.damageMulPerLevel) || 0) * lvl;
    player.fireRateMul += (Number(def.fireRateMulPerLevel) || 0) * lvl;
    player.reloadSpeedMul += (Number(def.reloadSpeedMulPerLevel) || 0) * lvl;
    player.moveSpeedMul += (Number(def.moveSpeedMulPerLevel) || 0) * lvl;
    player.maxHpBonus += (Number(def.maxHpFlatPerLevel) || 0) * lvl;
    player.hpRegenPerSec += (Number(def.hpRegenPerSecPerLevel) || 0) * lvl;
    player.pickupRadius += (Number(def.pickupRadiusPerLevel) || 0) * lvl;
    player.extraDodgeCharges += (Number(def.extraDodgeChargesPerLevel) || 0) * lvl;
  }

  const accountBonuses = player.accountHeroBonuses && typeof player.accountHeroBonuses === 'object'
    ? player.accountHeroBonuses
    : null;
  if (accountBonuses) {
    player.damageMul += Number(accountBonuses.damageMul) || 0;
    player.fireRateMul += Number(accountBonuses.fireRateMul) || 0;
    player.reloadSpeedMul += Number(accountBonuses.reloadSpeedMul) || 0;
    player.moveSpeedMul += Number(accountBonuses.moveSpeedMul) || 0;
    player.maxHpBonus += Number(accountBonuses.maxHpFlat) || 0;
    player.hpRegenPerSec += Number(accountBonuses.hpRegenPerSec) || 0;
    player.pickupRadius += Number(accountBonuses.pickupRadius) || 0;
    player.extraDodgeCharges += Number(accountBonuses.extraDodgeCharges) || 0;
  }

  const activeConsumableBuffs = Array.isArray(player.activeConsumableBuffs) ? player.activeConsumableBuffs : [];
  if (activeConsumableBuffs.length > 0) {
    const now = Date.now();
    player.activeConsumableBuffs = activeConsumableBuffs.filter((buff) => Math.max(0, Number(buff?.expiresAt) || 0) > now);
    for (const buff of player.activeConsumableBuffs) {
      player.damageMul += Number(buff.damageMul) || 0;
      player.fireRateMul += Number(buff.fireRateMul) || 0;
      player.reloadSpeedMul += Number(buff.reloadSpeedMul) || 0;
      player.moveSpeedMul += Number(buff.moveSpeedMul) || 0;
      player.hpRegenPerSec += Number(buff.hpRegenPerSec) || 0;
    }
  } else {
    player.activeConsumableBuffs = [];
  }

  player.reloadSpeedMul = normalizeReloadSpeedMul(player.reloadSpeedMul);

  const nextMaxHp = PLAYER_HP_MAX + Math.max(0, Math.round(player.maxHpBonus));
  if (!Number.isFinite(player.maxHp) || player.maxHp <= 0) player.maxHp = PLAYER_HP_MAX;
  if (nextMaxHp !== player.maxHp) {
    const ratio = player.maxHp > 0 ? (player.hp / player.maxHp) : 1;
    player.maxHp = nextMaxHp;
    player.hp = clamp(Math.round(player.maxHp * ratio), 0, player.maxHp);
  } else {
    player.maxHp = nextMaxHp;
    player.hp = clamp(Number(player.hp) || player.maxHp, 0, player.maxHp);
  }

  const baseCharges = PLAYER_DODGE_MAX_CHARGES + Math.max(0, Math.floor(player.extraDodgeCharges || 0));
  player.dodgeChargesMax = baseCharges;
  player.dodgeCharges = Math.max(0, Math.min(player.dodgeChargesMax, Number(player.dodgeCharges) || player.dodgeChargesMax));
  refreshPlayerForceShieldStats(player);
}

const QUICK_CONSUMABLE_SLOT_KEYS = Object.freeze(['quick_1', 'quick_2', 'quick_3']);

function getQuickSlotHotkey(slotKey) {
  const match = /^quick_(\d+)$/.exec(String(slotKey || '').trim());
  return match ? Math.max(1, Math.floor(Number(match[1]) || 1)) : 0;
}

function getEmptyPlayerQuickSlotState(slotKey) {
  return {
    slotKey,
    hotkey: getQuickSlotHotkey(slotKey),
    itemUid: '',
    itemId: '',
    name: '',
    rarity: 'common',
    quantity: 0,
    level: 1,
    combatUse: null,
    empty: true,
  };
}

function getPlayerQuickSlotState(player, slotKey) {
  const progression = player?.accountProgression;
  const heroId = String(player?.playerClass || '').trim();
  const heroEquipment = progression?.heroEquipment?.[heroId];
  const itemUid = String(heroEquipment?.[slotKey] || '').trim();
  if (!itemUid) return getEmptyPlayerQuickSlotState(slotKey);
  const inventoryItems = Array.isArray(progression?.inventoryItems) ? progression.inventoryItems : [];
  const item = inventoryItems.find((entry) => String(entry?.uid || '').trim() === itemUid);
  if (!item) return getEmptyPlayerQuickSlotState(slotKey);
  const itemDef = itemDefsById[String(item.itemId || '').trim()] || null;
  if (!itemDef) return getEmptyPlayerQuickSlotState(slotKey);
  return {
    slotKey,
    hotkey: getQuickSlotHotkey(slotKey),
    itemUid,
    itemId: String(item.itemId || '').trim(),
    name: String(itemDef.name || item.itemId || slotKey),
    rarity: String(itemDef.rarity || 'common'),
    quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
    level: Math.max(1, Math.floor(Number(item.level) || 1)),
    combatUse: itemDef.combatUse && typeof itemDef.combatUse === 'object' ? { ...itemDef.combatUse } : null,
    empty: false,
  };
}

function getPlayerQuickSlotsState(player) {
  return QUICK_CONSUMABLE_SLOT_KEYS.map((slotKey) => getPlayerQuickSlotState(player, slotKey));
}

function scaleConsumableMagnitude(base, level, step = 0.22) {
  return Number(base || 0) * (1 + Math.max(0, Math.floor(Number(level) || 1) - 1) * step);
}

function roundReplayCoord(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function buildReplayMapObjectStates(room) {
  const states = [];
  for (const obj of Array.isArray(room?.mapObjects) ? room.mapObjects : []) {
    if (!obj || !obj.destructible) continue;
    const maxHp = Math.max(1, Math.round(Number(obj.maxHp) || 1));
    const hp = Math.max(0, Math.round(Number(obj.hp) || 0));
    const destroyed = Boolean(obj.destroyed);
    const lastHitAt = Math.max(0, Number(obj.lastHitAt) || 0);
    const destroyedAt = Math.max(0, Number(obj.destroyedAt) || 0);
    const explodedAt = Math.max(0, Number(obj.explodedAt) || 0);
    if (hp >= maxHp && !destroyed && lastHitAt <= 0 && destroyedAt <= 0 && explodedAt <= 0) continue;
    states.push({
      id: String(obj.id || ''),
      hp,
      maxHp,
      destroyed,
      solid: Boolean(obj.solid),
      lastHitAt,
      destroyedAt,
      explodedAt,
      hideAfterDestroyed: Boolean(obj.hideAfterDestroyed),
      explosive: Boolean(obj.explosive),
    });
  }
  return states;
}

function createRunReplay(room, player, now) {
  return {
    version: 2,
    captureIntervalMs: REPLAY_CAPTURE_INTERVAL_MS,
    startedAt: now,
    endedAt: now,
    durationSec: 0,
    roomCode: room.code,
    roomStartedAt: room.startedAt,
    playerId: player.id,
    playerName: player.name,
    playerClass: player.playerClass || 'cyber',
    runType: String(room.runType || 'free'),
    mapId: String(room.mapId || ''),
    campaignId: String(room.campaignId || ''),
    campaignLevelId: String(room.campaignLevelId || ''),
    mission: buildRoomMissionState(room, now),
    mobCatalog: cloneMobCatalog(room.mobCatalog || []),
    world: getRoomWorld(room),
    decor: {
      trees: (room.trees || []).map((tree) => ({
        x: roundReplayCoord(tree?.x),
        y: roundReplayCoord(tree?.y),
        scale: Math.max(0.1, Number(tree?.scale) || 1),
      })),
      terrainZones: (room.terrainZones || []).map((zone) => ({
        id: String(zone?.id || ''),
        material: String(zone?.material || 'asphalt_wet'),
        shape: String(zone?.shape || 'ellipse'),
        x: roundReplayCoord(zone?.x),
        y: roundReplayCoord(zone?.y),
        w: Math.max(1, Math.round(Number(zone?.w) || 1)),
        h: Math.max(1, Math.round(Number(zone?.h) || 1)),
        alpha: Math.max(0.05, Number(zone?.alpha) || 0.65),
        feather: Math.max(0.04, Number(zone?.feather) || 0.18),
        angle: Number(zone?.angle) || 0,
        centerStripe: zone?.centerStripe === true,
      })),
      theme: room.sceneTheme ? { ...room.sceneTheme } : null,
      objects: (room.mapObjects || []).map((obj) => {
        const serialized = serializeMapObject(obj);
        if (!serialized) return null;
        return {
          ...serialized,
          x: roundReplayCoord(serialized.x),
          y: roundReplayCoord(serialized.y),
          w: Math.max(1, Math.round(serialized.w)),
          h: Math.max(1, Math.round(serialized.h)),
        };
      }).filter(Boolean),
    },
    meta: {
      tickRate: room.sync?.tickRate || DEFAULT_ROOM_SYNC.tickRate,
      stateSendHz: room.sync?.stateSendHz || DEFAULT_ROOM_SYNC.stateSendHz,
    },
    chat: [],
    frames: [],
    truncated: false,
    lastCaptureAt: 0,
  };
}

function appendReplayChatMessage(replay, payload, now = Date.now()) {
  if (!replay || !payload) return;
  const text = String(payload.text || '').trim();
  if (!text) return;
  if (!Array.isArray(replay.chat)) replay.chat = [];

  const at = Math.max(0, Number(payload.at) || now);
  const startedAt = Math.max(0, Number(replay.startedAt) || at);
  replay.chat.push({
    t: Math.max(0, at - startedAt),
    at,
    id: String(payload.id || ''),
    name: String(payload.name || 'Player').slice(0, 32),
    playerId: String(payload.playerId || ''),
    text,
  });
  if (replay.chat.length > REPLAY_CHAT_LIMIT) {
    replay.chat.splice(0, replay.chat.length - REPLAY_CHAT_LIMIT);
  }
}

function applyPlayerHitToPlayer(room, attacker, target, damage, now, options = {}) {
  if (!attacker || !target || attacker.id === target.id) return false;
  if (!target.alive) return false;
  const allowDeadAttacker = options?.allowDeadAttacker === true;
  if (!allowDeadAttacker && !attacker.alive) return false;
  if (target.godMode) return false;
  if ((Number(target.dodgeInvulnUntil) || 0) > now) return false;
  const amount = applyPlayerForceShield(target, Math.max(1, Math.round(Number(damage) || 1)), now, {
    sourceX: options.sourceX ?? attacker.x,
    sourceY: options.sourceY ?? attacker.y,
    dirX: options.dirX,
    dirY: options.dirY,
  });
  if (amount > 0) target.hp -= amount;
  if (target.hp <= 0) {
    downPlayer(room, target, now, { killerId: attacker.id });
  }
  return true;
}

function shouldCaptureReplayFrame(replay, now, force = false, effectiveIntervalMs = null) {
  if (!replay || replay.truncated) return false;
  if (force) return true;
  const intervalMs = Math.max(100, Number(effectiveIntervalMs) || Number(replay.captureIntervalMs) || REPLAY_CAPTURE_INTERVAL_MS);
  return !(replay.frames.length > 0 && now - replay.lastCaptureAt < intervalMs);
}

function buildReplayFrameBase(room, now) {
  const players = Array.from(room.players.values()).map((p) => {
    const skills = [];
    if (p.skills && typeof p.skills === 'object') {
      for (const sid of p.skillOrder || Object.keys(p.skills)) {
        const st = p.skills[sid];
        if (!st) continue;
        const def = getCombatSkillDef(sid, p.playerClass);
        skills.push([
          sid,
          Math.max(0, Math.floor(Number(st.level) || 0)),
          Math.max(0, Math.round(Number(st.cooldownMs) || 0)),
          Math.max(0, Math.round(Number(st.maxCooldownMs) || 0)),
          def?.kind || 'passive',
          def?.rarity || 'common',
          def?.name || sid,
        ]);
      }
    }

    return [
      p.id,
      roundReplayCoord(p.x),
      roundReplayCoord(p.y),
      Math.max(0, Math.round(Number(p.hp) || 0)),
      p.alive ? 1 : 0,
      p.weaponKey || 'pistol',
      p.playerClass || 'cyber',
      Math.max(0, Number(room.kills.get(p.id)) || 0),
      Math.max(0, Number(room.scores.get(p.id)) || 0),
      skills,
      Math.max(0, Math.round(Number(p.dodgeCharges) || 0)),
      Math.max(1, Math.round(Number(p.dodgeChargesMax) || PLAYER_DODGE_MAX_CHARGES)),
      Math.max(0, Math.round(Number(p.dodgeRechargeMs ?? p.dodgeCooldownMs) || 0)),
      PLAYER_DODGE_COOLDOWN_MS,
      Math.max(1, Math.floor(Number(p.level) || 1)),
      Math.max(0, Math.floor(Number(p.xp) || 0)),
      Math.max(1, Math.floor(Number(p.xpToNext) || getXpToNextLevel(p.level || 1))),
      Math.max(1, Math.round(Number(p.maxHp) || PLAYER_HP_MAX)),
      Math.max(0, Math.floor(Number(p.bossKills) || 0)),
      Math.max(0, Math.round((Number(p.dodgeInvulnUntil) || 0) - now)),
      roundReplayCoord(Number(p.aimX) || p.x),
      roundReplayCoord(Number(p.aimY) || p.y),
      Math.max(0, Math.floor(Number(p.weaponMagazine) || 0)),
      Math.max(1, Math.floor(Number(WEAPONS[p.weaponKey]?.magazineSize) || 1)),
      Number.isFinite(Number(p.weaponReserveAmmo)) ? Math.max(0, Math.floor(Number(p.weaponReserveAmmo) || 0)) : -1,
      Math.max(0, Math.round(Number(p.weaponReloadLeftMs) || 0)),
      getWeaponReloadMs(p.weaponKey, p.reloadSpeedMul),
    ];
  });
  const companions = (room.companions || []).map((companion) => ([
    companion.id,
    roundReplayCoord(companion.x),
    roundReplayCoord(companion.y),
    companion.weaponKey || 'pistol',
    companion.ownerId || '',
    roundReplayCoord(Number(companion.aimX) || companion.x),
    roundReplayCoord(Number(companion.aimY) || companion.y),
    Math.max(0, Math.floor(Number(companion.weaponMagazine) || 0)),
    getWeaponMagazineSize(companion.weaponKey),
    Math.max(0, Math.round(Number(companion.weaponReloadLeftMs) || 0)),
    getWeaponReloadMs(companion.weaponKey, companion.reloadSpeedMul),
  ]));
  const enemies = room.enemies.map((e) => ([
    e.id,
    e.type || 'normal',
    roundReplayCoord(e.x),
    roundReplayCoord(e.y),
    Math.max(0, Math.round(Number(e.hp) || 0)),
    Math.max(1, Math.round(Number(e.maxHp) || 1)),
    Math.max(ENEMY_RADIUS, Math.round(Number(e.radius) || ENEMY_RADIUS)),
  ]));
  const replayBullets = sampleReplayBullets(room, REPLAY_BULLET_SAMPLE_LIMIT);
  const bullets = replayBullets.map((b) => ([
    b.id || '',
    roundReplayCoord(b.x),
    roundReplayCoord(b.y),
    Math.round(Number(b.vx) || 0),
    Math.round(Number(b.vy) || 0),
    b.color || '',
    b.kind || 'bullet',
    b.fromEnemy ? 1 : 0,
    Math.max(2, Math.round(Number(b.radius) || BULLET_RADIUS)),
    b.ownerId || '',
    b.weaponKey || '',
    b.ownerPlayerId || '',
    b.shooterType || '',
  ]));
  const replayDrops = sampleReplayDrops(room, REPLAY_DROP_SAMPLE_LIMIT);
  const replayXpOrbs = sampleReplayXpOrbs(room, REPLAY_XP_ORB_SAMPLE_LIMIT);
  const drops = replayDrops.map((d) => ([
    roundReplayCoord(d.x),
    roundReplayCoord(d.y),
    d.weaponKey || 'pistol',
    d.kind || 'weapon',
    Math.max(0, Number(d.id) || 0),
    Math.max(0, Math.round(Number(d.ttlMs) || 0)),
  ]));
  const xpOrbs = replayXpOrbs.map((o) => ([
    Math.max(0, Math.floor(Number(o.id) || 0)),
    roundReplayCoord(o.x),
    roundReplayCoord(o.y),
    Math.max(1, Math.round(Number(o.xp) || 1)),
    Math.max(0, Math.round(Number(o.pullSpeed) || 0)),
  ]));
  const bossPortals = room.bossPortals.map((bp) => ([
    roundReplayCoord(bp.x),
    roundReplayCoord(bp.y),
    Math.max(0, Math.round((Number(bp.spawnAt) || now) - now)),
  ]));
  const mapObjects = buildReplayMapObjectStates(room);

  return {
    players,
    companions,
    enemies,
    bullets,
    drops,
    xpOrbs,
    bossPortals,
    mapObjects,
    replayShotEvents: Array.isArray(room.replayShotEvents) ? room.replayShotEvents : [],
    replayObjectImpactEvents: Array.isArray(room.replayObjectImpactEvents) ? room.replayObjectImpactEvents : [],
    totalEnemyKills: Math.max(0, Number(room.totalEnemyKills) || 0),
    totalBossKills: Math.max(0, Number(room.totalBossKills) || 0),
    bossAlive: hasAliveBoss(room) ? 1 : 0,
  };
}

function captureReplayFrame(room, replay, now, options = {}) {
  const force = options.force === true;
  const effectiveIntervalMs = Math.max(100, Number(options.effectiveIntervalMs) || 0);
  if (!shouldCaptureReplayFrame(replay, now, force, effectiveIntervalMs || null)) return;
  if (replay.frames.length >= REPLAY_FRAME_LIMIT) {
    replay.truncated = true;
    replay.endedAt = now;
    replay.durationSec = Math.max(1, Math.floor((now - replay.startedAt) / 1000));
    return;
  }
  const baseFrame = options.baseFrame || buildReplayFrameBase(room, now);
  const shotEvents = (Array.isArray(baseFrame.replayShotEvents) ? baseFrame.replayShotEvents : [])
    .filter((event) => {
      const at = Math.max(0, Number(event?.at) || 0);
      return at >= Math.max(0, Number(replay.startedAt) || 0)
        && at > Math.max(0, Number(replay.lastCaptureAt) || 0)
        && at <= now;
    })
    .map((event) => ([
      Math.max(0, Number(event.id) || 0),
      event.bulletId || '',
      event.ownerId || '',
      event.ownerPlayerId || '',
      event.shooterType || 'player',
      event.weaponKey || 'pistol',
      roundReplayCoord(event.x),
      roundReplayCoord(event.y),
      Math.round(Number(event.vx) || 0),
      Math.round(Number(event.vy) || 0),
      event.color || '#f59e0b',
      Math.max(2, Math.round(Number(event.radius) || BULLET_RADIUS)),
      Math.max(0, Math.round((Number(event.at) || now) - replay.startedAt)),
      event.kind || 'bullet',
    ]));
  const objectImpactEvents = (Array.isArray(baseFrame.replayObjectImpactEvents) ? baseFrame.replayObjectImpactEvents : [])
    .filter((event) => {
      const at = Math.max(0, Number(event?.at) || 0);
      return at >= Math.max(0, Number(replay.startedAt) || 0)
        && at > Math.max(0, Number(replay.lastCaptureAt) || 0)
        && at <= now;
    })
    .map((event) => ([
      Math.max(0, Number(event.id) || 0),
      event.objectId || '',
      event.kind || '',
      event.spriteKey || '',
      event.material || 'concrete',
      event.bulletKind || 'bullet',
      roundReplayCoord(event.x),
      roundReplayCoord(event.y),
      Number((Number(event.dirX) || 0).toFixed(3)),
      Number((Number(event.dirY) || 0).toFixed(3)),
      Number((Number(event.nx) || 0).toFixed(3)),
      Number((Number(event.ny) || 0).toFixed(3)),
      Math.max(0, Math.round(Number(event.damage) || 0)),
      Math.max(0, Math.round((Number(event.at) || now) - replay.startedAt)),
    ]));
  const replayStartedAt = Math.max(0, Number(replay.startedAt) || now);
  const replayOffsetMs = (at) => {
    const value = Math.max(0, Number(at) || 0);
    return value > 0 ? Math.max(0, Math.round(value - replayStartedAt)) : 0;
  };
  const mapObjectStates = (Array.isArray(baseFrame.mapObjects) ? baseFrame.mapObjects : [])
    .filter((obj) => obj && obj.id)
    .map((obj) => ([
      obj.id,
      Math.max(0, Math.round(Number(obj.hp) || 0)),
      Math.max(1, Math.round(Number(obj.maxHp) || 1)),
      obj.destroyed ? 1 : 0,
      obj.solid ? 1 : 0,
      replayOffsetMs(obj.lastHitAt),
      replayOffsetMs(obj.destroyedAt),
      replayOffsetMs(obj.explodedAt),
      obj.hideAfterDestroyed ? 1 : 0,
      obj.explosive ? 1 : 0,
    ]));

  replay.frames.push({
    t: Math.max(0, now - replay.startedAt),
    te: baseFrame.totalEnemyKills,
    tb: baseFrame.totalBossKills,
    ba: baseFrame.bossAlive,
    p: baseFrame.players,
    c: baseFrame.companions,
    e: baseFrame.enemies,
    b: baseFrame.bullets,
    se: shotEvents,
    oe: objectImpactEvents,
    mo: mapObjectStates,
    d: baseFrame.drops,
    x: baseFrame.xpOrbs,
    bp: baseFrame.bossPortals,
  });
  replay.lastCaptureAt = now;
  replay.endedAt = now;
  replay.durationSec = Math.max(1, Math.floor((now - replay.startedAt) / 1000));
}

function finalizeRunReplay(room, replay, now) {
  if (!replay) return null;
  captureReplayFrame(room, replay, now, { force: true });
  if (replay.frames.length <= 0) return null;

  return {
    version: replay.version,
    captureIntervalMs: replay.captureIntervalMs,
    startedAt: replay.startedAt,
    endedAt: replay.endedAt,
    durationSec: replay.durationSec,
    roomCode: replay.roomCode,
    roomStartedAt: replay.roomStartedAt,
    playerId: replay.playerId,
    playerName: replay.playerName,
    playerClass: replay.playerClass,
    runType: replay.runType || 'free',
    mapId: replay.mapId || '',
    campaignId: replay.campaignId || '',
    campaignLevelId: replay.campaignLevelId || '',
    mission: replay.mission || null,
    mobCatalog: Array.isArray(replay.mobCatalog) ? replay.mobCatalog.slice() : [],
    world: replay.world,
    decor: replay.decor,
    meta: replay.meta,
    chat: Array.isArray(replay.chat) ? replay.chat.slice() : [],
    truncated: Boolean(replay.truncated),
    frames: replay.frames.slice(),
  };
}

function weightedSkillPick(pool) {
  let total = 0;
  for (const s of pool) total += Math.max(0.01, Number(s.weight) || 1);
  let r = Math.random() * total;
  for (const s of pool) {
    r -= Math.max(0.01, Number(s.weight) || 1);
    if (r <= 0) return s;
  }
  return pool[pool.length - 1] || null;
}

function rollSkillChoices(player, count = SKILL_PICK_OPTIONS) {
  const defs = skillsStore.getList();
  const candidates = defs.filter((def) => getSkillRank(player, def.id) < (Number(def.maxLevel) || 1));
  if (candidates.length === 0) return [];
  const out = [];
  const tmp = [...candidates];
  while (tmp.length > 0 && out.length < count) {
    const picked = weightedSkillPick(tmp);
    if (!picked) break;
    out.push(picked.id);
    const idx = tmp.findIndex((x) => x.id === picked.id);
    if (idx >= 0) tmp.splice(idx, 1);
  }
  return out;
}

function hasActiveSkillOffer(room, playerId) {
  if (!room || !playerId) return false;
  return room.skillOrbs.some((orb) => orb.ownerId === playerId);
}

function clearSkillOffersForOwner(room, playerId) {
  if (!room || !playerId) return 0;
  const before = room.skillOrbs.length;
  room.skillOrbs = room.skillOrbs.filter((orb) => orb.ownerId !== playerId);
  const removed = Math.max(0, before - room.skillOrbs.length);
  if (removed > 0) bumpRealtimeCollectionVersion(room, 'skillOrbs');
  return removed;
}

function randomSkillOfferPosition(room, player, used = []) {
  const world = getRoomWorld(room);
  const minDist = Math.max(40, Number(SKILL_OFFER_SPAWN_MIN_DIST) || 120);
  const maxDist = Math.max(minDist + 20, Number(SKILL_OFFER_SPAWN_MAX_DIST) || 420);
  for (let i = 0; i < 28; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const pos = findNearestCollectibleSpawnPoint(
      room,
      clamp(player.x + Math.cos(angle) * dist, PLAYER_RADIUS + 16, world.width - PLAYER_RADIUS - 16),
      clamp(player.y + Math.sin(angle) * dist, PLAYER_RADIUS + 16, world.height - PLAYER_RADIUS - 16),
      { radius: Math.max(12, PLAYER_RADIUS * 0.82) },
    );
    const tooClose = used.some((usedPos) => ((usedPos.x - pos.x) ** 2 + (usedPos.y - pos.y) ** 2) <= (84 * 84));
    if (!tooClose) return pos;
  }
  return findNearestCollectibleSpawnPoint(
    room,
    clamp(player.x + (Math.random() - 0.5) * 260, PLAYER_RADIUS + 16, world.width - PLAYER_RADIUS - 16),
    clamp(player.y + (Math.random() - 0.5) * 260, PLAYER_RADIUS + 16, world.height - PLAYER_RADIUS - 16),
    { radius: Math.max(12, PLAYER_RADIUS * 0.82) },
  );
}

function ensureSkillOffer(room, player, now = Date.now()) {
  if (!room || !player || !player.alive) return false;
  if ((Number(player.unspentLevelUps) || 0) <= 0) return false;
  if (hasActiveSkillOffer(room, player.id)) return false;
  const picks = rollSkillChoices(player, SKILL_PICK_OPTIONS);
  if (!Array.isArray(picks) || picks.length <= 0) return false;

  const used = [];
  for (const skillId of picks) {
    const pos = randomSkillOfferPosition(room, player, used);
    used.push(pos);
    room.skillOrbs.push({
      id: room.nextSkillOrbId++,
      ownerId: player.id,
      skillId,
      x: pos.x,
      y: pos.y,
      ttlMs: SKILL_OFFER_TTL_MS,
      ttlMaxMs: SKILL_OFFER_TTL_MS,
      createdAt: now,
    });
  }
  bumpRealtimeCollectionVersion(room, 'skillOrbs');
  return true;
}

function registerPlayerXpCharge(player, amount, now) {
  if (!player || !player.alive) return;
  const xp = Math.max(1, Math.round(Number(amount) || 0));
  player.xpChargeSeq = Math.max(0, Math.floor(Number(player.xpChargeSeq) || 0)) + 1;
  player.xpChargeXp = Math.max(0, Math.floor(Number(player.xpChargeXp) || 0)) + xp;
  player.xpChargeLastAt = now;
}

function gainPlayerXp(room, player, amount, now, options = {}) {
  if (!player || !player.alive) return;
  let xp = Math.max(0, Math.round(Number(amount) || 0));
  if (xp <= 0) return;
  if (!Number.isFinite(player.xp)) player.xp = 0;
  if (!Number.isFinite(player.xpToNext) || player.xpToNext <= 0) player.xpToNext = getXpToNextLevel(player.level || 1);

  if (options?.source === 'xp_orb' || options?.fromXpOrb === true) {
    registerPlayerXpCharge(player, xp, now);
  }

  player.xp += xp;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level = Math.max(1, Math.floor(Number(player.level) || 1) + 1);
    player.unspentLevelUps = Math.max(0, Math.floor(Number(player.unspentLevelUps) || 0) + 1);
    player.xpToNext = getXpToNextLevel(player.level);
    const offerCreated = ensureSkillOffer(room, player, now);
    sendTo(player.ws, { type: 'system', message: offerCreated ? ('Level up ' + player.level + '! Collect a skill orb.') : ('Level up ' + player.level + '!') });
  }
}

function spawnXpOrbs(room, x, y, amount) {
  const total = Math.max(0, Math.round(Number(amount) || 0));
  if (total <= 0) return;
  let left = total;
  while (left > 0) {
    const chunk = Math.max(1, Math.min(left, 3 + Math.floor(Math.random() * 6)));
    left -= chunk;
    const pos = findNearestCollectibleSpawnPoint(room, x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, {
      radius: Math.max(10, PLAYER_RADIUS * 0.68),
    });
    room.xpOrbs.push({
      id: room.nextXpOrbId++,
      x: pos.x,
      y: pos.y,
      xp: chunk,
      ttlMs: XP_ORB_LIFETIME_MS,
    });
  }
  bumpRealtimeCollectionVersion(room, 'xpOrbs');
}

function getEnemyXpValue(enemy) {
  if (!enemy) return 6;
  if (Number(enemy.xpValue) > 0) return Math.max(1, Math.round(Number(enemy.xpValue) || 0));
  if (enemy.type === 'boss') return 220;
  if (enemy.type === 'charger') return 12;
  if (enemy.type === 'ranged') return 10;
  return 8;
}

function getEnemyScoreValue(enemy) {
  if (!enemy) return 10;
  if (Number(enemy.scoreValue) > 0) return Math.max(1, Math.round(Number(enemy.scoreValue) || 0));
  if (enemy.type === 'boss') return 100;
  return 10;
}

function getEnemyKnockbackResist(enemy) {
  if (!enemy) return 1;
  if (Number(enemy.knockbackResist) > 0) return Math.max(0.05, Number(enemy.knockbackResist) || 1);
  if (enemy.type === 'boss') return ENEMY_KNOCKBACK_BOSS_RESIST;
  if (enemy.type === 'charger') return ENEMY_KNOCKBACK_CHARGER_RESIST;
  return 1;
}

function normalizeKnockDirection(enemy, options = {}, owner = null) {
  const optDirX = Number(options?.dirX);
  const optDirY = Number(options?.dirY);
  if (Number.isFinite(optDirX) || Number.isFinite(optDirY)) {
    const len = Math.hypot(optDirX || 0, optDirY || 0) || 1;
    return { x: (optDirX || 0) / len, y: (optDirY || 0) / len };
  }

  const sourceX = Number(options?.sourceX ?? options?.fromX);
  const sourceY = Number(options?.sourceY ?? options?.fromY);
  if (Number.isFinite(sourceX) && Number.isFinite(sourceY)) {
    const dx = enemy.x - sourceX;
    const dy = enemy.y - sourceY;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  if (owner) {
    const dx = enemy.x - owner.x;
    const dy = enemy.y - owner.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  const rnd = Math.random() * Math.PI * 2;
  return { x: Math.cos(rnd), y: Math.sin(rnd) };
}

function applyEnemyHitReaction(room, enemy, ownerId, options = {}) {
  if (!enemy || enemy.hp <= 0) return;
  const owner = ownerId ? room.players.get(ownerId) : null;
  const resist = Math.max(0.05, getEnemyKnockbackResist(enemy));
  const stunMs = Math.max(0, Number(options?.stunMs));
  const knockback = Math.max(0, Number(options?.knockback));
  if (stunMs <= 0 && knockback <= 0) return;

  if (stunMs > 0) {
    enemy.hitStunMs = Math.max(Number(enemy.hitStunMs) || 0, stunMs * resist);
  }

  if (knockback > 0) {
    const dir = normalizeKnockDirection(enemy, options, owner);
    const push = knockback * resist;
    enemy.knockbackVx = (Number(enemy.knockbackVx) || 0) + dir.x * push;
    enemy.knockbackVy = (Number(enemy.knockbackVy) || 0) + dir.y * push;
    const maxVec = Math.max(90, push * 1.9);
    const len = Math.hypot(enemy.knockbackVx, enemy.knockbackVy);
    if (len > maxVec) {
      enemy.knockbackVx = (enemy.knockbackVx / len) * maxVec;
      enemy.knockbackVy = (enemy.knockbackVy / len) * maxVec;
    }
  }
}

function explodeEnemyMob(room, enemy, now, options = {}) {
  if (!room || !enemy || Number(enemy.explodedAt) > 0) return false;
  const radius = Math.max(0, Number(enemy.explosionRadius) || 0);
  const damage = Math.max(0, Number(enemy.explosionDamage) || 0);
  if (radius <= 0 || damage <= 0) return false;
  enemy.explodedAt = now;
  for (const player of room.players.values()) {
    if (!player || !player.alive) continue;
    const reach = radius + PLAYER_RADIUS;
    const dist = Math.hypot((Number(player.x) || 0) - enemy.x, (Number(player.y) || 0) - enemy.y);
    if (dist > reach) continue;
    const falloff = 1 - Math.min(0.5, (dist / Math.max(1, reach)) * 0.5);
    applyEnemyHitToPlayer(room, player, Math.max(1, Math.round(damage * falloff)), now, {
      applySlow: true,
      sourceX: enemy.x,
      sourceY: enemy.y,
    });
  }
  damageSceneObjectsInRadius(room, enemy.x, enemy.y, radius * 0.82, damage * 0.72, String(options.ownerId || enemy.id || 'enemy'), now, {
    cause: 'enemy_explosion',
  });
  return true;
}

function spawnEnemySplitChildren(room, enemy, now) {
  const splitMobId = String(enemy?.splitMobId || '').trim();
  const splitCount = Math.max(0, Math.min(12, Math.floor(Number(enemy?.splitCount) || 0)));
  if (!room || !enemy || !splitMobId || splitCount <= 0) return 0;
  const mobDef = getRoomMobDef(room, splitMobId);
  if (!mobDef || mobDef.enabled === false) return 0;
  const difficulty = getRoomDifficulty(room, now);
  const world = getRoomWorld(room);
  let spawned = 0;
  for (let i = 0; i < splitCount; i += 1) {
    const angle = (Math.PI * 2 * i) / splitCount + Math.random() * 0.5;
    const dist = Math.max(22, Number(enemy.radius) || ENEMY_RADIUS);
    const child = createEnemyFromMob(room, mobDef, {
      x: clamp(enemy.x + Math.cos(angle) * dist, ENEMY_RADIUS, world.width - ENEMY_RADIUS),
      y: clamp(enemy.y + Math.sin(angle) * dist, ENEMY_RADIUS, world.height - ENEMY_RADIUS),
    }, now, difficulty, {
      hpMul: 0.55,
      damageMul: 0.82,
      radiusMul: 0.78,
      spriteScaleMul: 0.78,
      speedMul: 1.12,
    });
    child.attackCooldownMs = 260 + Math.random() * 220;
    room.enemies.push(child);
    spawned += 1;
  }
  return spawned;
}

function enemyTakeDamage(room, enemy, damage, ownerId, now, options = {}) {
  if (!enemy) return false;
  const amount = Math.max(1, Math.round((Number(damage) || 1) * Math.max(0.05, Number(enemy.damageTakenMul) || 1)));
  enemy.hp -= amount;
  const damageSource = String(options?.damageSource || '').toLowerCase();
  const skipControlFromBulletOnBoss = enemy.type === 'boss' && damageSource === 'bullet';
  if (!skipControlFromBulletOnBoss) {
    const hitStunMs = Math.max(0, Number(options?.stunMs ?? ENEMY_HIT_STUN_MS) || 0);
    const hitKnockback = Math.max(0, Number(options?.knockback ?? ENEMY_HIT_KNOCKBACK_SPEED) || 0);
    applyEnemyHitReaction(room, enemy, ownerId, { ...options, stunMs: hitStunMs, knockback: hitKnockback });
  }
  if (enemy.hp > 0) return false;

  const idx = room.enemies.findIndex((e) => e.id === enemy.id);
  if (idx >= 0) room.enemies.splice(idx, 1);

  if (ownerId && room.players.has(ownerId)) {
    room.scores.set(ownerId, (room.scores.get(ownerId) || 0) + getEnemyScoreValue(enemy));
    const killer = room.players.get(ownerId);
    if (killer) {
      if (normalizeGameMode(room.gameMode) !== 'pvp') {
        room.kills.set(ownerId, (room.kills.get(ownerId) || 0) + 1);
      }
      if (enemy.type === 'boss') killer.bossKills = Math.max(0, Number(killer.bossKills) || 0) + 1;
      else killer.enemyKills = Math.max(0, Number(killer.enemyKills) || 0) + 1;
      gainPlayerXp(room, killer, getEnemyXpValue(enemy), now);
    }
  }

  room.totalEnemyKills = (room.totalEnemyKills || 0) + 1;
  if (enemy.type === 'boss') room.totalBossKills = (room.totalBossKills || 0) + 1;
  explodeEnemyMob(room, enemy, now, { ownerId });
  spawnEnemySplitChildren(room, enemy, now);
  maybeScheduleBossSpawn(room, now);
  spawnXpOrbs(room, enemy.x, enemy.y, getEnemyXpValue(enemy));
  maybeSpawnDrop(room, enemy.x, enemy.y);
  return true;
}

function applyConsumableAreaDamage(room, player, centerX, centerY, damage, radius, now, options = {}) {
  const targets = collectEnemiesInRadius(room, centerX, centerY, radius, player.id);
  let hitCount = 0;
  for (const target of targets) {
    enemyTakeDamage(room, target.enemy, damage, player.id, now, {
      damageSource: 'consumable',
      sourceX: centerX,
      sourceY: centerY,
      stunMs: Math.max(0, Number(options.stunMs) || 0),
      knockback: Math.max(0, Number(options.knockback) || (ENEMY_HIT_KNOCKBACK_SPEED * 1.35)),
    });
    hitCount += 1;
  }
  return hitCount;
}

function getConsumableAimPoint(room, player) {
  const world = getRoomWorld(room);
  const rawX = Number(player?.aimX);
  const rawY = Number(player?.aimY);
  return {
    x: clamp(Number.isFinite(rawX) ? rawX : Number(player?.x) || 0, 0, world.width),
    y: clamp(Number.isFinite(rawY) ? rawY : Number(player?.y) || 0, 0, world.height),
  };
}

function createQuickItemFxEvent(player, slotKey, usedItem, itemName, combatUse, now, extra = {}) {
  const useType = String(combatUse?.type || '').trim().toLowerCase();
  return {
    id: `${player.id || 'player'}:${slotKey}:${usedItem.itemId}:${now}:${Math.random().toString(36).slice(2, 7)}`,
    at: now,
    playerId: player.id || '',
    playerName: player.name || '',
    slotKey,
    itemId: usedItem.itemId || '',
    itemName,
    level: Math.max(1, Math.floor(Number(usedItem.level) || 1)),
    useType,
    x: Math.round(Number(player.x) || 0),
    y: Math.round(Number(player.y) || 0),
    targetX: Math.round(Number(extra.targetX) || Number(player.x) || 0),
    targetY: Math.round(Number(extra.targetY) || Number(player.y) || 0),
    radius: Math.max(0, Math.round(Number(extra.radius) || 0)),
    damage: Math.max(0, Math.round(Number(extra.damage) || 0)),
    heal: Math.max(0, Math.round(Number(extra.heal) || 0)),
    durationMs: Math.max(0, Math.round(Number(extra.durationMs) || 0)),
    stunMs: Math.max(0, Math.round(Number(extra.stunMs) || 0)),
    hitCount: Math.max(0, Math.round(Number(extra.hitCount) || 0)),
    waves: Array.isArray(extra.waves) ? extra.waves.map((wave, index) => ({
      x: Math.round(Number(wave?.x) || Number(extra.targetX) || Number(player.x) || 0),
      y: Math.round(Number(wave?.y) || Number(extra.targetY) || Number(player.y) || 0),
      delayMs: Math.max(0, Math.round(Number(wave?.delayMs) || index * 130)),
      hitCount: Math.max(0, Math.round(Number(wave?.hitCount) || 0)),
    })) : [],
  };
}

function usePlayerQuickConsumable(room, player, slotKey, now = Date.now()) {
  if (!room || !player || !player.alive || !player.playerAccountId) {
    return { ok: false, code: 403, message: 'Consumable is unavailable right now' };
  }
  const consumed = accountProgressionStore.consumeEquippedItemInMemory(player.accountProgression, player.playerClass, slotKey);
  if (!consumed?.ok || !consumed.usedItem) return consumed || { ok: false, code: 400, message: 'Failed to use consumable' };

  player.accountProgression = consumed.progression || player.accountProgression;
  const usedItem = consumed.usedItem;
  const itemDef = itemDefsById[String(usedItem.itemId || '').trim()] || null;
  const combatUse = usedItem.combatUse && typeof usedItem.combatUse === 'object' ? usedItem.combatUse : {};
  const level = Math.max(1, Number(usedItem.level) || 1);
  const itemName = String(itemDef?.name || usedItem.itemId || slotKey);
  let resultMessage = `${itemName} used.`;
  let fxEvent = createQuickItemFxEvent(player, slotKey, usedItem, itemName, combatUse, now);

  switch (String(combatUse.type || '').trim().toLowerCase()) {
    case 'heal': {
      const healAmount = Math.max(1, Math.round(scaleConsumableMagnitude(combatUse.healFlat, level, 0.3)));
      player.hp = clamp((Number(player.hp) || 0) + healAmount, 0, player.maxHp || PLAYER_HP_MAX);
      resultMessage = `${itemName}: +${healAmount} HP.`;
      fxEvent = createQuickItemFxEvent(player, slotKey, usedItem, itemName, combatUse, now, {
        heal: healAmount,
        radius: 92,
      });
      break;
    }
    case 'grenade': {
      const target = getConsumableAimPoint(room, player);
      const damage = Math.max(1, Math.round(scaleConsumableMagnitude(combatUse.damage, level, 0.26)));
      const radius = Math.max(40, Math.round(scaleConsumableMagnitude(combatUse.radius, level, 0.08)));
      const stunMs = Math.max(0, Math.round(scaleConsumableMagnitude(combatUse.stunMs, level, 0.14)));
      const hitCount = applyConsumableAreaDamage(room, player, target.x, target.y, damage, radius, now, { stunMs });
      resultMessage = `${itemName}: ${hitCount} target(s) hit.`;
      fxEvent = createQuickItemFxEvent(player, slotKey, usedItem, itemName, combatUse, now, {
        targetX: target.x,
        targetY: target.y,
        damage,
        radius,
        stunMs,
        hitCount,
      });
      break;
    }
    case 'artillery': {
      const target = getConsumableAimPoint(room, player);
      const waves = Math.max(1, Math.round(Number(combatUse.waves) || 1));
      const damage = Math.max(1, Math.round(scaleConsumableMagnitude(combatUse.damage, level, 0.24)));
      const radius = Math.max(70, Math.round(scaleConsumableMagnitude(combatUse.radius, level, 0.09)));
      const world = getRoomWorld(room);
      let totalHits = 0;
      const fxWaves = [];
      for (let i = 0; i < waves; i += 1) {
        const waveX = clamp(target.x + (Math.random() - 0.5) * 56, 0, world.width);
        const waveY = clamp(target.y + (Math.random() - 0.5) * 56, 0, world.height);
        const hitCount = applyConsumableAreaDamage(room, player, waveX, waveY, damage, radius, now, { stunMs: 220 });
        totalHits += hitCount;
        fxWaves.push({ x: waveX, y: waveY, delayMs: i * 145, hitCount });
      }
      resultMessage = `${itemName}: artillery barrage hit ${totalHits} target(s).`;
      fxEvent = createQuickItemFxEvent(player, slotKey, usedItem, itemName, combatUse, now, {
        targetX: target.x,
        targetY: target.y,
        damage,
        radius,
        stunMs: 220,
        hitCount: totalHits,
        waves: fxWaves,
      });
      break;
    }
    case 'satellite': {
      const target = getConsumableAimPoint(room, player);
      const damage = Math.max(1, Math.round(scaleConsumableMagnitude(combatUse.damage, level, 0.28)));
      const radius = Math.max(90, Math.round(scaleConsumableMagnitude(combatUse.radius, level, 0.08)));
      const stunMs = Math.max(240, Math.round(scaleConsumableMagnitude(combatUse.stunMs || 900, level, 0.12)));
      const hitCount = applyConsumableAreaDamage(room, player, target.x, target.y, damage, radius, now, { stunMs, knockback: ENEMY_HIT_KNOCKBACK_SPEED * 2.1 });
      resultMessage = `${itemName}: orbital strike hit ${hitCount} target(s).`;
      fxEvent = createQuickItemFxEvent(player, slotKey, usedItem, itemName, combatUse, now, {
        targetX: target.x,
        targetY: target.y,
        damage,
        radius,
        stunMs,
        hitCount,
      });
      break;
    }
    case 'buff':
    case 'regen': {
      if (!Array.isArray(player.activeConsumableBuffs)) player.activeConsumableBuffs = [];
      const durationMs = Math.max(1000, Math.round(scaleConsumableMagnitude(combatUse.durationMs, level, 0.06)));
      player.activeConsumableBuffs.push({
        id: `${usedItem.itemId}:${now}:${Math.random().toString(36).slice(2, 6)}`,
        itemId: usedItem.itemId,
        damageMul: Number(scaleConsumableMagnitude(combatUse.damageMul, level, 0.16).toFixed(3)) || 0,
        fireRateMul: Number(scaleConsumableMagnitude(combatUse.fireRateMul, level, 0.16).toFixed(3)) || 0,
        moveSpeedMul: Number(scaleConsumableMagnitude(combatUse.moveSpeedMul, level, 0.14).toFixed(3)) || 0,
        hpRegenPerSec: Number(scaleConsumableMagnitude(combatUse.hpRegenPerSec, level, 0.18).toFixed(3)) || 0,
        expiresAt: now + durationMs,
      });
      rebuildPlayerDerivedStats(player);
      resultMessage = `${itemName}: buff active for ${Math.max(1, Math.round(durationMs / 1000))}s.`;
      fxEvent = createQuickItemFxEvent(player, slotKey, usedItem, itemName, combatUse, now, {
        durationMs,
        radius: String(combatUse.type || '').trim().toLowerCase() === 'regen' ? 110 : 98,
      });
      break;
    }
    default:
      resultMessage = `${itemName} used.`;
      break;
  }

  if (fxEvent) {
    broadcastRoom(room, { type: 'quickItemFx', event: fxEvent });
  }
  sendTo(player.ws, {
    type: 'quickItemConsumed',
    slotKey,
    usedItem: {
      uid: String(usedItem.uid || ''),
      itemId: String(usedItem.itemId || ''),
      remainingQuantity: Math.max(0, Math.floor(Number(usedItem.remainingQuantity) || 0)),
    },
  });
  sendTo(player.ws, { type: 'system', message: resultMessage });
  return {
    ok: true,
    progression: player.accountProgression,
    usedItem,
    message: resultMessage,
  };
}

function tickPlayerSkills(room, player, dtSec, now) {
  if (!player || !player.alive) return;
  if (Array.isArray(player.activeConsumableBuffs) && player.activeConsumableBuffs.length > 0) {
    const before = player.activeConsumableBuffs.length;
    player.activeConsumableBuffs = player.activeConsumableBuffs.filter((buff) => Math.max(0, Number(buff?.expiresAt) || 0) > now);
    if (player.activeConsumableBuffs.length !== before) rebuildPlayerDerivedStats(player);
  }
  if (player.hpRegenPerSec > 0) {
    player.hp = clamp(player.hp + player.hpRegenPerSec * dtSec, 0, player.maxHp || PLAYER_HP_MAX);
  }
  tickPlayerForceShield(player, now);
  if (!player.skills) return;

  for (const skillId of player.skillOrder || []) {
    const st = player.skills[skillId];
    if (!st || st.level <= 0) continue;
    const def = getCombatSkillDef(skillId, player.playerClass);
    if (!def || def.kind !== 'active') continue;
    st.cooldownMs = Math.max(0, (Number(st.cooldownMs) || 0) - dtSec * 1000);
    if (st.cooldownMs > 0) continue;
    const casted = castPlayerActiveSkill(room, player, def, st, now);
    if (!casted) continue;

    const baseCd = Math.max(300, Number(def.cooldownMs) || 1000);
    const cdMul = Math.max(0, Number(def.cooldownMulPerLevel) || 0);
    const lvlCdMul = Math.max(0.2, 1 - cdMul * (Math.max(1, Number(st.level) || 1) - 1));
    st.maxCooldownMs = Math.max(220, Math.round(baseCd * lvlCdMul));
    st.cooldownMs = st.maxCooldownMs;
  }
}


function playerSelectSkill(room, player, skillId, now = Date.now()) {
  if (!room || !player) return false;
  const pickId = (skillId || '').toString().trim().toLowerCase();
  if (!pickId) return false;
  const options = room.skillOrbs.filter((orb) => orb.ownerId === player.id).map((orb) => String(orb.skillId || '').toLowerCase());
  if (!options.includes(pickId)) return false;
  const def = skillsStore.getById(pickId);
  if (!def) return false;
  const st = ensureSkillState(player, pickId);
  const nextLevel = Math.min(Number(def.maxLevel) || 1, (Number(st.level) || 0) + 1);
  st.level = nextLevel;
  st.maxCooldownMs = Math.max(0, Number(st.maxCooldownMs) || 0);
  if (!Array.isArray(player.skillOrder)) player.skillOrder = [];
  if (!player.skillOrder.includes(pickId)) player.skillOrder.push(pickId);

  clearSkillOffersForOwner(room, player.id);
  player.pendingSkillChoices = [];
  player.unspentLevelUps = Math.max(0, (Number(player.unspentLevelUps) || 0) - 1);
  if (player.unspentLevelUps > 0) ensureSkillOffer(room, player, now);
  rebuildPlayerDerivedStats(player);
  if (isBuddySkillDef(def)) {
    syncRoomCompanions(room);
    room.lastCompanionSyncAt = now;
  }
  return true;
}

function buildRunDetails(room, target, now) {
  const shotIntervalMs = Math.max(1, Math.round(Number(target.fireIntervalMs) || Number(WEAPONS[target.weaponKey]?.cooldownMs) || 1));
  const skills = [];
  if (target && target.skills && typeof target.skills === 'object') {
    for (const skillId of Object.keys(target.skills)) {
      const st = target.skills[skillId];
      const level = Math.max(0, Number(st?.level) || 0);
      if (level <= 0) continue;
      const def = getCombatSkillDef(skillId, target.playerClass);
      skills.push({
        id: skillId,
        name: def?.name || skillId,
        kind: def?.kind || 'passive',
        rarity: def?.rarity || 'common',
        level,
      });
    }
  }

  return {
    runType: String(room?.runType || 'free'),
    mapId: String(room?.mapId || ''),
    campaignId: String(room?.campaignId || ''),
    campaignLevelId: String(room?.campaignLevelId || ''),
    gameMode: normalizeGameMode(room?.gameMode || 'normal'),
    playerClass: (target.playerClass || 'cyber').toString(),
    level: Math.max(1, Number(target.level) || 1),
    xp: Math.max(0, Number(target.xp) || 0),
    xpToNext: Math.max(1, Number(target.xpToNext) || 1),
    hp: Math.max(0, Math.round(Number(target.hp) || 0)),
    maxHp: Math.max(1, Math.round(Number(target.maxHp) || PLAYER_HP_MAX)),
    weaponKey: target.weaponKey,
    weaponLabel: WEAPONS[target.weaponKey]?.label || target.weaponKey || 'Unknown',
    shotDamage: Math.max(1, Math.round(Number(target.shotDamage) || 1)),
    shotIntervalMs,
    moveSpeed: Math.max(0, Math.round(Number(target.moveSpeed) || PLAYER_SPEED)),
    pickupRadius: Math.max(0, Math.round(Number(target.pickupRadius) || PLAYER_PICKUP_RADIUS_BASE)),
    hpRegenPerSec: Math.max(0, Number(target.hpRegenPerSec) || 0),
    dodgeChargesMax: Math.max(1, Number(target.dodgeChargesMax) || PLAYER_DODGE_MAX_CHARGES),
    damageMul: Math.max(0.1, Number(target.damageMul) || 1),
    fireRateMul: Math.max(0.1, Number(target.fireRateMul) || 1),
    moveSpeedMul: Math.max(0.1, Number(target.moveSpeedMul) || 1),
    enemyKills: Math.max(0, Number(target.enemyKills) || 0),
    bossKills: Math.max(0, Number(target.bossKills) || 0),
    pvpKills: Math.max(0, Number(target.pvpKills) || 0),
    pvpDeaths: Math.max(0, Number(target.pvpDeaths) || 0),
    totalEnemyKills: Math.max(0, Number(room.totalEnemyKills) || 0),
    totalBossKills: Math.max(0, Number(room.totalBossKills) || 0),
    matchDurationSec: Math.max(0, Number(room.matchDurationSec) || 0),
    roomAlivePlayers: Math.max(0, Number(room.players?.size) || 0),
    survivedSec: Math.max(1, Math.floor((now - (target.joinedAt || now)) / 1000)),
    skills,
  };
}

function completeCampaignRoom(room, now) {
  if (!room || room.completedAt) return false;
  room.completedAt = now;
  room.missionSuccess = true;
  if (room.mission && typeof room.mission === 'object') {
    room.mission.completedAt = now;
    room.mission.success = true;
  }
  const missionState = buildRoomMissionState(room, now);
  const roomPlayers = Array.from(room.players.values()).filter(Boolean);
  const squadSize = Math.max(1, roomPlayers.length);
  const survivors = Math.max(0, roomPlayers.filter((player) => !player.isOut).length);
  const teamScore = Array.from(room.scores.values()).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);

  for (const target of room.players.values()) {
    if (!target) continue;
    if (target.isOut) continue;
    target.shooting = false;
    target.moveX = 0;
    target.moveY = 0;
    target.jumpQueued = false;
    const runReplay = finalizeRunReplay(room, target.runReplay, now);
    const runDetails = buildRunDetails(room, target, now);
    const kills = room.kills.get(target.id) || 0;
    const score = room.scores.get(target.id) || 0;
    const survivalSec = Math.max(1, Math.floor((now - (target.joinedAt || now)) / 1000));
    let rewardResult = null;
    const recordEntry = {
      name: target.name,
      kills,
      score,
      roomCode: room.code,
      durationSec: survivalSec,
      at: now,
      runDetails,
      runReplay,
    };

    if (typeof recordsStore.pushRecordMemory === 'function') {
      recordsStore.pushRecordMemory(recordEntry);
    }

    if (target.playerAccountId) {
      rewardResult = accountProgressionStore.grantRunRewardsInMemory(target.playerAccountId, {
        score,
        kills,
        bossKills: Math.max(0, Number(target.bossKills) || 0),
        survivalSec,
        heroId: target.playerClass,
        level: Math.max(1, Number(target.level) || 1),
        campaignId: String(room.campaignId || ''),
        campaignLevelId: String(room.campaignLevelId || ''),
        campaignSuccess: true,
      }, { progression: target.accountProgression });
      if (rewardResult?.progression) {
        target.accountProgression = rewardResult.progression;
        target.accountHeroBonuses = accountProgressionStore.computeHeroBonuses(target.accountProgression, target.playerClass);
        sendTo(target.ws, {
          type: 'accountProgression',
          progression: rewardResult.progression,
          rewards: rewardResult.rewards,
        });
      }
    }

    queueRunPersistence({
      record: recordEntry,
      playerAccountId: target.playerAccountId || null,
      progression: rewardResult?.progression || null,
    });

    sendTo(target.ws, {
      type: 'runComplete',
      reason: 'campaign',
      title: room.mission?.title || 'Mission complete',
      message: room.mission?.brief || 'Campaign mission complete.',
      result: {
        victory: true,
        headline: 'ВЫЖИЛИ. НАГЛЕЕМ.',
        runType: String(room.runType || 'campaign'),
        campaignId: String(room.campaignId || ''),
        campaignLevelId: String(room.campaignLevelId || ''),
        campaignName: String(missionState?.campaignName || room.mission?.campaignName || ''),
        campaignShortName: String(missionState?.campaignShortName || room.mission?.campaignShortName || ''),
        levelTitle: String(missionState?.title || room.mission?.title || ''),
        mission: missionState ? {
          runType: 'campaign',
          campaignId: String(missionState.campaignId || ''),
          campaignName: String(missionState.campaignName || ''),
          campaignShortName: String(missionState.campaignShortName || ''),
          levelId: String(missionState.levelId || ''),
          levelIndex: Math.max(0, Number(missionState.levelIndex) || 0),
          title: String(missionState.title || ''),
          brief: String(missionState.brief || ''),
          scenario: String(missionState.scenario || ''),
          goals: Array.isArray(missionState.goals) ? missionState.goals.map((goal) => ({ ...goal })) : [],
          completedGoals: Math.max(0, Number(missionState.completedGoals) || 0),
          totalGoals: Math.max(0, Number(missionState.totalGoals) || 0),
          completedAt: Math.max(0, Number(missionState.completedAt) || 0),
          success: true,
        } : null,
        completedGoals: Math.max(0, Number(missionState?.completedGoals) || 0),
        totalGoals: Math.max(0, Number(missionState?.totalGoals) || 0),
        gameMode: normalizeGameMode(room.gameMode || 'normal'),
        kills: Math.max(0, Number(kills) || 0),
        score: Math.max(0, Number(score) || 0),
        enemyKills: Math.max(0, Number(target.enemyKills) || Number(kills) || 0),
        bossKills: Math.max(0, Number(target.bossKills) || 0),
        teamEnemyKills: Math.max(0, Number(room.totalEnemyKills) || 0),
        teamBossKills: Math.max(0, Number(room.totalBossKills) || 0),
        teamScore: Math.max(0, Number(teamScore) || 0),
        survivors,
        squadSize,
        pvpKills: Math.max(0, Number(target.pvpKills) || 0),
        pvpDeaths: Math.max(0, Number(target.pvpDeaths) || 0),
        deaths: 0,
        heroLevel: Math.max(1, Number(target.level) || 1),
        heroXp: Math.max(0, Number(target.xp) || 0),
        heroXpToNext: Math.max(1, Number(target.xpToNext) || 1),
        roomCode: room.code,
        survivalSec,
      },
    });
  }

  room.bullets = [];
  room.enemies = [];
  room.bossPortals = [];
  room.drops = [];
  room.skillOrbs = [];
  room.hasMovingXpOrbs = false;
  bumpRealtimeCollectionVersion(room, 'drops');
  bumpRealtimeCollectionVersion(room, 'skillOrbs');

  broadcastRoom(room, {
    type: 'system',
    message: `Campaign clear: ${room.mission?.title || room.code}. Survivors may now brag irresponsibly.`,
  });
  return true;
}

function buildPvpRewardRunStats(room, target, placement = null) {
  const pvpKills = Math.max(0, Number(target?.pvpKills) || 0);
  const enemyKills = Math.max(0, Number(target?.enemyKills) || 0);
  const survivalSec = Math.max(1, Math.floor((Date.now() - (target?.joinedAt || Date.now())) / 1000));
  const totalPlayers = Math.max(1, Number(room?.players?.size) || 1);
  const place = placement && Number.isFinite(Number(placement.place)) ? Math.max(1, Number(placement.place)) : null;
  const placeBonusByRank = { 1: 360, 2: 220, 3: 140 };
  const bonusScore = place ? (placeBonusByRank[place] || 0) : 0;
  const score = Math.max(0, pvpKills * PVP_PLAYER_SCORE_KILL + enemyKills * 14 + bonusScore);
  const weightedKills = Math.max(0, Math.round(pvpKills * 3 + enemyKills * 0.7 + (place ? Math.max(0, totalPlayers - place) * 0.8 : 0)));
  return {
    score,
    kills: weightedKills,
    bossKills: 0,
    survivalSec,
  };
}

function downPlayer(room, target, now, options = {}) {
  if (!target || target.isOut) return;
  const forceFinal = options?.forceFinal === true;
  const killerId = options?.killerId ? String(options.killerId) : '';

  const weaponKeyBeforeDown = target.weaponKey;
  target.hp = 0;
  target.alive = false;
  target.shooting = false;
  target.slowUntil = 0;
  target.dodgeCooldownMs = 0;
  target.dodgeCharges = target.dodgeChargesMax || PLAYER_DODGE_MAX_CHARGES;
  target.dodgeRechargeMs = 0;
  target.dodgeInvulnUntil = 0;
  target.jumpQueued = false;

  let willRespawn = false;
  if (!forceFinal && normalizeGameMode(room?.gameMode) === 'pvp') {
    willRespawn = true;
  } else if (RESPAWN_MODE === 'lives') {
    const left = Math.max(0, Math.floor(Number(target.livesLeft) || 0));
    if (left > 0) {
      target.livesLeft = left - 1;
      willRespawn = true;
    }
  } else if (RESPAWN_MODE === 'token') {
    const tokens = Math.max(0, Math.floor(Number(target.reviveTokens) || 0));
    if (tokens > 0) {
      target.reviveTokens = tokens - 1;
      willRespawn = true;
    }
  }

  target.canRespawn = willRespawn;
  target.isOut = !willRespawn;
  const respawnDelayMs = normalizeGameMode(room?.gameMode) === 'pvp' ? PVP_RESPAWN_DELAY_MS : RESPAWN_DELAY_MS;
  target.respawnAt = willRespawn ? (now + respawnDelayMs) : 0;

  if (willRespawn) {
    if (normalizeGameMode(room?.gameMode) === 'pvp') {
      target.pvpDeaths = Math.max(0, Number(target.pvpDeaths) || 0) + 1;
      const killer = killerId ? room.players.get(killerId) : null;
      if (killer && killer.id !== target.id) {
        const nextKills = Math.max(0, Number(killer.pvpKills) || 0) + 1;
        killer.pvpKills = nextKills;
        room.kills.set(killer.id, nextKills);
        room.scores.set(killer.id, (room.scores.get(killer.id) || 0) + PVP_PLAYER_SCORE_KILL);
      }
      broadcastRoom(room, {
        type: 'system',
        message: `${target.name} was eliminated${killer && killer.id !== target.id ? ` by ${killer.name}` : ''} and will respawn in ${Math.max(0, Math.ceil(respawnDelayMs / 1000))}s.`,
      });
      return;
    }
    setPlayerWeapon(target, 'pistol');
    const suffix = RESPAWN_MODE === 'lives'
      ? ` (${Math.max(0, Number(target.livesLeft) || 0)} lives left)`
      : ` (${Math.max(0, Number(target.reviveTokens) || 0)} revive tokens left)`;
    broadcastRoom(room, { type: 'system', message: `${target.name} was downed and will respawn in ${Math.max(0, Math.ceil(respawnDelayMs / 1000))}s${suffix}.` });
    return;
  }

  const runReplay = finalizeRunReplay(room, target.runReplay, now);
  const runDetails = buildRunDetails(room, { ...target, weaponKey: weaponKeyBeforeDown }, now);
  setPlayerWeapon(target, 'pistol');

  const isPvpMode = normalizeGameMode(room?.gameMode) === 'pvp';
  const pvpStats = isPvpMode ? buildPvpRewardRunStats(room, target, options?.pvpPlacement || null) : null;
  const kills = isPvpMode ? pvpStats.kills : (room.kills.get(target.id) || 0);
  const score = isPvpMode ? pvpStats.score : (room.scores.get(target.id) || 0);
  const survivalSec = Math.max(1, Math.floor((now - (target.joinedAt || now)) / 1000));
  let rewardResult = null;
  const recordEntry = {
    name: target.name,
    kills,
    score,
    roomCode: room.code,
    durationSec: survivalSec,
    at: now,
    runDetails,
    runReplay,
  };

  if (typeof recordsStore.pushRecordMemory === 'function') {
    recordsStore.pushRecordMemory(recordEntry);
  }

  if (target.playerAccountId) {
    rewardResult = accountProgressionStore.grantRunRewardsInMemory(target.playerAccountId, {
      score,
      kills,
      bossKills: isPvpMode ? 0 : target.bossKills,
      survivalSec: isPvpMode ? (pvpStats?.survivalSec || survivalSec) : survivalSec,
      heroId: target.playerClass,
      level: Math.max(1, Number(target.level) || 1),
      campaignId: String(room?.campaignId || ''),
      campaignLevelId: String(room?.campaignLevelId || ''),
      campaignSuccess: false,
    }, { progression: target.accountProgression });
    if (rewardResult?.progression) {
      target.accountProgression = rewardResult.progression;
      target.accountHeroBonuses = accountProgressionStore.computeHeroBonuses(target.accountProgression, target.playerClass);
      sendTo(target.ws, {
        type: 'accountProgression',
        progression: rewardResult.progression,
        rewards: rewardResult.rewards,
      });
    }
  }

  queueRunPersistence({
    record: recordEntry,
    playerAccountId: target.playerAccountId || null,
    progression: rewardResult?.progression || null,
  });

  if (target.partnerRunContext) {
    const completionPayload = {
      event: 'crimson-wars.run.completed',
      sentAt: new Date().toISOString(),
      partnerRunId: target.partnerRunContext.partnerRunId,
      externalPlayerId: target.partnerRunContext.externalPlayerId,
      integrationToken: target.partnerRunContext.integrationToken,
      roomCode: room.code,
      player: {
        name: target.name,
        accountId: target.playerAccountId || null,
        heroId: target.playerClass || ACCOUNT_BASE_HERO_ID,
      },
      stats: {
        gameMode: normalizeGameMode(room?.gameMode || 'normal'),
        score,
        kills,
        bossKills: isPvpMode ? 0 : Math.max(0, Number(target.bossKills) || 0),
        survivalSec: isPvpMode ? (pvpStats?.survivalSec || survivalSec) : survivalSec,
        enemyKills: Math.max(0, Number(target.enemyKills) || 0),
        pvpKills: Math.max(0, Number(target.pvpKills) || 0),
        pvpDeaths: Math.max(0, Number(target.pvpDeaths) || 0),
      },
      rewards: rewardResult?.rewards || null,
      progression: rewardResult?.progression || null,
      run: {
        startedAt: new Date(Math.max(0, Number(target.joinedAt) || now)).toISOString(),
        finishedAt: new Date(now).toISOString(),
        durationSec: survivalSec,
        details: runDetails,
      },
      metadata: target.partnerRunContext.metadata || {},
    };
    void sendPartnerRunCompletion(target, completionPayload);
  }

  broadcastRoom(room, { type: 'system', message: `${target.name} was downed.` });
}

function sendDevConsole(player, text, ok = true) {
  if (!player?.ws) return;
  sendTo(player.ws, { type: 'devConsole', ok: Boolean(ok), text: String(text || '') });
}

function sendDevConsoleWs(ws, text, ok = true) {
  if (!ws) return;
  sendTo(ws, { type: 'devConsole', ok: Boolean(ok), text: String(text || '') });
}

function normalizeDevConsoleCommand(rawCommand) {
  return String(rawCommand || '')
    .trim()
    .replace(/^>+\s*/, '')
    .trim();
}

function applyGlobalDevCommand(ws, rawCommand) {
  const command = normalizeDevConsoleCommand(rawCommand);
  if (!command) {
    sendDevConsoleWs(ws, 'Empty command.', false);
    return true;
  }

  const parts = command.split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase();
  const args = parts;

  if (cmd === 'help') {
    sendDevConsoleWs(ws, 'Console help:');
    sendDevConsoleWs(ws, 'help - show this help. Example: help');
    sendDevConsoleWs(ws, 'playerpass <nickname> <newpassword> - change player password (admin only).');
    sendDevConsoleWs(ws, 'Example: playerpass Fighter123 NewStrongPass');
    sendDevConsoleWs(ws, 'Join a room for gameplay commands.');
    return true;
  }

  if (cmd === 'playerpass') {
    if (!isConsoleAdmin(ws)) {
      sendDevConsoleWs(ws, 'Forbidden. Admin access required.', false);
      return true;
    }
    const nickname = String(args[0] || '').trim();
    const nextPassword = args.slice(1).join(' ').trim();
    if (!nickname || !nextPassword) {
      sendDevConsoleWs(ws, 'Usage: playerpass <nickname> <newpassword>', false);
      return true;
    }
    const result = playerAuthStore.updatePassword(nickname, nextPassword);
    if (!result?.ok) {
      sendDevConsoleWs(ws, result?.message || 'Failed to update password.', false);
      return true;
    }
    sendDevConsoleWs(ws, result.message || `Password updated for ${nickname}.`);
    return true;
  }

  sendDevConsoleWs(ws, 'Join a room first for gameplay console commands. Type help.', false);
  return true;
}

function isBuddySkillDef(def) {
  return Boolean(def && String(def.companionWeaponKey || '').trim());
}

function grantPlayerSkillLevels(player, skillId, levels = 1, options = {}) {
  const sid = (skillId || '').toString().trim().toLowerCase();
  const def = skillsStore.getById(sid);
  if (!def) return 0;
  const st = ensureSkillState(player, sid);
  const before = st.level;
  const add = Math.max(1, Math.floor(Number(levels) || 1));
  const maxLevel = Math.max(1, Number(def.maxLevel) || 1);
  if (options.ignoreMax === true) st.level = Math.max(0, Number(st.level) || 0) + add;
  else st.level = Math.min(maxLevel, Math.max(0, Number(st.level) || 0) + add);
  if (!Array.isArray(player.skillOrder)) player.skillOrder = [];
  if (!player.skillOrder.includes(sid)) player.skillOrder.push(sid);
  rebuildPlayerDerivedStats(player);
  return Math.max(0, st.level - before);
}

function clearPlayerBuddySkills(player) {
  if (!player?.skills || typeof player.skills !== 'object') return 0;
  const buddySkillIds = ['pistol_buddy', 'smg_buddy', 'shotgun_buddy', 'sniper_buddy'];
  let removed = 0;
  for (const skillId of buddySkillIds) {
    const st = player.skills[skillId];
    if (!st || Number(st.level) <= 0) continue;
    removed += Math.max(0, Number(st.level) || 0);
    delete player.skills[skillId];
  }
  if (Array.isArray(player.skillOrder)) {
    player.skillOrder = player.skillOrder.filter((skillId) => !buddySkillIds.includes(String(skillId || '').toLowerCase()));
  }
  rebuildPlayerDerivedStats(player);
  return removed;
}

function applyDevCheatCommand(room, player, rawCommand, now = Date.now()) {
  const command = normalizeDevConsoleCommand(rawCommand);
  if (!command) {
    sendDevConsole(player, 'Empty command.', false);
    return;
  }

  const parts = command.split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase();
  const args = parts;

  if (cmd === 'help') {
    sendDevConsole(player, 'Gameplay commands (unlock hidden in help):');
    sendDevConsole(player, 'help - show this list. Example: help');
    sendDevConsole(player, 'room | roomcode - show room code. Example: roomcode');
    sendDevConsole(player, 'killme | suicide - kill your character. Example: killme');
    sendDevConsole(player, 'status - show stats and weapon. Example: status');
    sendDevConsole(player, '');
    sendDevConsole(player, 'Commands below require cheats unlocked for your player:');
    sendDevConsole(player, 'lock - lock cheats. Example: lock');
    sendDevConsole(player, 'god [on|off] - invulnerability. Example: god on');
    sendDevConsole(player, 'weapon <pistol|smg|shotgun|sniper> [reserve]. Example: weapon shotgun 40');
    sendDevConsole(player, 'ammo <reserve> [magazine] - set ammo. Example: ammo 120 8');
    sendDevConsole(player, 'heal [n] - heal hp. Example: heal 50');
    sendDevConsole(player, 'hp <n> - set hp. Example: hp 200');
    sendDevConsole(player, 'xp <n> - add xp. Example: xp 500');
    sendDevConsole(player, 'levelup [n] - force levelups. Example: levelup 3');
    sendDevConsole(player, 'skills - list skills. Example: skills');
    sendDevConsole(player, 'skill <id> [levels]. Example: skill weapon_mastery 2');
    sendDevConsole(player, 'bots | buddies [levels]. Example: bots 2');
    sendDevConsole(player, 'nobots | clearbots. Example: clearbots');
    sendDevConsole(player, 'spawn <mob-id|boss> [count]. Example: spawn sniper 3');
    sendDevConsole(player, 'killall - kill all enemies. Example: killall');
    sendDevConsole(player, 'playerpass <nickname> <newpassword> (admin only). Example: playerpass Fighter123 NewPass');
    return;
  }

  if (cmd === 'unlock') {
    if (!DEV_CHEATS_ENABLED) {
      sendDevConsole(player, 'Cheats disabled on server.', false);
      return;
    }
    if (!DEV_CHEAT_SECRET) {
      sendDevConsole(player, 'Cheat secret is not configured.', false);
      return;
    }
    const provided = String(args[0] || '').trim().toLowerCase();
    const expected = `${String(room.code || '').toLowerCase()}-${DEV_CHEAT_SECRET.toLowerCase()}`;
    if (!provided || provided !== expected) {
      sendDevConsole(player, 'Unlock failed.', false);
      return;
    }
    player.devUnlocked = true;
    sendDevConsole(player, `Dev cheats unlocked for room ${room.code}.`);
    return;
  }

  if (cmd === 'room' || cmd === 'roomcode') {
    sendDevConsole(player, 'Room code: ' + String(room.code || '-'));
    return;
  }

  if (cmd === 'killme' || cmd === 'suicide') {
    if (!player.alive) {
      sendDevConsole(player, 'You are already down.', false);
      return;
    }
    // Voluntary exit should always finalize the run immediately, without respawn.
    player.livesLeft = 0;
    player.reviveTokens = 0;
    downPlayer(room, player, now, { forceFinal: true });
    sendDevConsole(player, 'Self-destruct executed.');
    return;
  }
  if (cmd === 'lock') {
    player.devUnlocked = false;
    player.godMode = false;
    sendDevConsole(player, 'Dev cheats locked.');
    return;
  }

  if (!player.devUnlocked) {
    sendDevConsole(player, 'Cheats are locked. Use: unlock <roomCode-secret>', false);
    return;
  }

  if (cmd === 'god') {
    const mode = String(args[0] || '').toLowerCase();
    if (mode === 'on' || mode === '1' || mode === 'true') player.godMode = true;
    else if (mode === 'off' || mode === '0' || mode === 'false') player.godMode = false;
    else player.godMode = !player.godMode;
    sendDevConsole(player, `God mode: ${player.godMode ? 'ON' : 'OFF'}`);
    return;
  }

  if (cmd === 'weapon') {
    const key = String(args[0] || '').toLowerCase();
    if (!WEAPONS[key]) {
      sendDevConsole(player, 'Unknown weapon key.', false);
      return;
    }
    setPlayerWeapon(player, key);
    if (player.weaponReserveAmmo !== null && args[1] !== undefined) {
      player.weaponReserveAmmo = Math.max(0, Math.floor(Number(args[1]) || 0));
      player.weaponAmmo = player.weaponReserveAmmo;
    }
    sendDevConsole(player, `Weapon set: ${WEAPONS[key].label} ${getPlayerWeaponAmmoLabel(player)}`);
    return;
  }

  if (cmd === 'ammo') {
    if (player.weaponReserveAmmo !== null) {
      player.weaponReserveAmmo = Math.max(0, Math.floor(Number(args[0]) || 0));
      player.weaponAmmo = player.weaponReserveAmmo;
    }
    if (args[1] !== undefined) {
      const weapon = WEAPONS[player.weaponKey] || WEAPONS.pistol;
      player.weaponMagazine = Math.max(0, Math.min(Math.max(1, Number(weapon.magazineSize) || 1), Math.floor(Number(args[1]) || 0)));
    }
    sendDevConsole(player, `Ammo: ${getPlayerWeaponAmmoLabel(player)}`);
    return;
  }

  if (cmd === 'heal') {
    const add = Math.max(1, Math.floor(Number(args[0]) || 30));
    player.hp = Math.min(player.maxHp, Math.max(0, Number(player.hp) || 0) + add);
    sendDevConsole(player, `HP: ${Math.round(player.hp)}/${Math.round(player.maxHp)}`);
    return;
  }

  if (cmd === 'hp') {
    const hp = Math.max(1, Math.floor(Number(args[0]) || player.maxHp));
    player.hp = Math.min(hp, player.maxHp);
    sendDevConsole(player, `HP set: ${Math.round(player.hp)}/${Math.round(player.maxHp)}`);
    return;
  }

  if (cmd === 'xp') {
    const amount = Math.max(0, Math.floor(Number(args[0]) || 0));
    if (amount <= 0) {
      sendDevConsole(player, 'Usage: xp <amount>', false);
      return;
    }
    gainPlayerXp(room, player, amount, now);
    sendDevConsole(player, `XP +${amount} -> Lv ${player.level} (${player.xp}/${player.xpToNext})`);
    return;
  }

  if (cmd === 'levelup') {
    const count = Math.max(1, Math.min(50, Math.floor(Number(args[0]) || 1)));
    for (let i = 0; i < count; i += 1) {
      const need = Math.max(1, Number(player.xpToNext) - Number(player.xp) + 1);
      gainPlayerXp(room, player, need, now);
    }
    sendDevConsole(player, `Level up x${count} -> Lv ${player.level}`);
    return;
  }

  if (cmd === 'skills') {
    const defs = skillsStore.getList();
    if (defs.length === 0) {
      sendDevConsole(player, 'No skills in active collection.', false);
      return;
    }
    sendDevConsole(player, `Skills in active collection: ${defs.length}`);
    for (const def of defs) {
      sendDevConsole(
        player,
        `${def.id} | ${def.name} | ${def.kind || 'passive'} | ${def.rarity || 'common'} | max ${Math.max(1, Number(def.maxLevel) || 1)}`
      );
    }
    return;
  }

  if (cmd === 'skill') {
    const sid = String(args[0] || '').toLowerCase();
    const lv = Math.max(1, Math.floor(Number(args[1]) || 1));
    if (!sid) {
      sendDevConsole(player, 'Usage: skill <id> [levels]', false);
      return;
    }
    const def = skillsStore.getById(sid);
    const gained = grantPlayerSkillLevels(player, sid, lv, { ignoreMax: isBuddySkillDef(def) });
    if (gained <= 0) {
      sendDevConsole(player, 'Skill not changed (already max or unknown).', false);
      return;
    }
    sendDevConsole(player, `Skill ${sid} +${gained}`);
    return;
  }

  if (cmd === 'bots' || cmd === 'buddies') {
    const levels = Math.max(1, Math.floor(Number(args[0]) || 1));
    const granted = [
      grantPlayerSkillLevels(player, 'pistol_buddy', levels, { ignoreMax: true }),
      grantPlayerSkillLevels(player, 'smg_buddy', levels, { ignoreMax: true }),
      grantPlayerSkillLevels(player, 'shotgun_buddy', levels, { ignoreMax: true }),
      grantPlayerSkillLevels(player, 'sniper_buddy', levels, { ignoreMax: true }),
    ];
    const totalGranted = granted.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    syncRoomCompanions(room);
    if (totalGranted <= 0) {
      sendDevConsole(player, 'Bots not changed (already maxed or unavailable).', false);
      return;
    }
    sendDevConsole(player, `Bots granted: pistol +${granted[0]}, smg +${granted[1]}, shotgun +${granted[2]}, sniper +${granted[3]}.`);
    return;
  }

  if (cmd === 'nobots' || cmd === 'clearbots') {
    const removed = clearPlayerBuddySkills(player);
    syncRoomCompanions(room);
    if (removed <= 0) {
      sendDevConsole(player, 'No bots to remove.', false);
      return;
    }
    sendDevConsole(player, `Removed all bots (${removed} levels).`);
    return;
  }

  if (cmd === 'spawn') {
    const typeRaw = String(args[0] || 'normal').toLowerCase();
    const mobDef = getRoomMobDef(room, typeRaw);
    const type = mobDef?.id || 'normal';
    const isBossMob = getMobBehaviorFromDef(mobDef) === 'boss';
    const count = Math.max(1, Math.min(isBossMob ? 2 : 40, Math.floor(Number(args[1]) || 1)));
    for (let i = 0; i < count; i += 1) {
      if (isBossMob) {
        const pos = randomSpawnEdge(room);
        spawnBossEnemy(room, pos.x, pos.y, now, getRoomDifficulty(room, now), type);
      } else {
        spawnEnemy(room, now, getRoomDifficulty(room, now), type);
      }
    }
    sendDevConsole(player, `Spawned ${count} ${type}.`);
    return;
  }

  if (cmd === 'killall') {
    let killed = 0;
    for (const e of [...room.enemies]) {
      if (e.hp > 0) {
        enemyTakeDamage(room, e, e.hp + 9999, player.id, now);
        killed += 1;
      }
    }
    sendDevConsole(player, `Killed ${killed} enemies.`);
    return;
  }

  if (cmd === 'playerpass') {
    if (!isConsoleAdmin(player?.ws, player)) {
      sendDevConsole(player, 'Forbidden. Admin access required.', false);
      return;
    }
    const nickname = String(args[0] || '').trim();
    const nextPassword = args.slice(1).join(' ').trim();
    if (!nickname || !nextPassword) {
      sendDevConsole(player, 'Usage: playerpass <nickname> <newpassword>', false);
      return;
    }
    const result = playerAuthStore.updatePassword(nickname, nextPassword);
    if (!result?.ok) {
      sendDevConsole(player, result?.message || 'Failed to update password.', false);
      return;
    }
    sendDevConsole(player, result.message || `Password updated for ${nickname}.`);
    return;
  }

  if (cmd === 'status') {
    const txt = `God:${player.godMode ? 'ON' : 'OFF'} | Weapon:${player.weaponKey} | HP:${Math.round(player.hp)}/${Math.round(player.maxHp)} | Lv:${player.level} | XP:${player.xp}/${player.xpToNext}`;
    sendDevConsole(player, txt);
    return;
  }

  sendDevConsole(player, 'Unknown command. Type help', false);
}
function joinRoom(ws, join) {
  if (isShuttingDown) {
    sendTo(ws, {
      type: 'joinError',
      message: 'Server is restarting. Please reconnect in a moment.',
      code: 503,
      retryAfterMs: RESTART_RETRY_MS,
      instanceId: INSTANCE_ID,
    });
    return null;
  }
  const requestedCode = cleanRoomCodeForLookup(join?.roomCode);
  if (requestedCode) {
    const routedRoom = runtimeRegistryStore.getRoomByCode(requestedCode);
    if (routedRoom && routedRoom.instanceId && routedRoom.instanceId !== INSTANCE_ID) {
      sendTo(ws, {
        type: 'joinError',
        message: `Room ${requestedCode} is hosted on another server. Redirecting...`,
        code: 409,
        roomCode: requestedCode,
        redirectUrl: buildRoomRedirectUrl(routedRoom.publicBaseUrl, requestedCode, 'join'),
        instanceId: routedRoom.instanceId,
      });
      return null;
    }
  }
  const spectating = Boolean(join?.spectate || join?.spectator || join?.watch);
  const resumeOnly = Boolean(join?.resumeOnly || join?.resume);
  const sessionAccountId = Math.max(0, Number(ws.playerSession?.player?.id) || 0);
  if (spectating) {
    const room = requestedCode ? rooms.get(requestedCode) : null;
    if (!room) {
      sendTo(ws, {
        type: 'joinError',
        message: requestedCode ? `Live room ${requestedCode} is no longer active.` : 'Spectate mode needs an active room code.',
        code: 404,
        roomCode: requestedCode,
      });
      return null;
    }
    const roomMaxPlayers = Math.max(1, Number(room.maxPlayers) || getRoomMaxPlayers(room.gameMode));
    const spectatorId = `spec_${Math.random().toString(36).slice(2, 10)}`;
    const spectator = {
      id: spectatorId,
      ws,
      roomCode: room.code,
      kind: 'spectator',
      joinedAt: Date.now(),
    };
    room.spectators.set(spectatorId, spectator);
    publishRuntimeRegistry();
    sendTo(ws, {
      type: 'welcome',
      id: null,
      roomCode: room.code,
      instanceId: room.instanceId || INSTANCE_ID,
      runType: String(room.runType || 'free'),
      mapId: String(room.mapId || ''),
      campaignId: String(room.campaignId || ''),
      campaignLevelId: String(room.campaignLevelId || ''),
      spectators: Math.max(0, Number(room.spectators?.size) || 0),
      spectatorCount: Math.max(0, Number(room.spectators?.size) || 0),
      tickRate: room.sync.tickRate,
      sync: room.sync,
      maxPlayers: roomMaxPlayers,
      gameMode: normalizeGameMode(room.gameMode || 'normal'),
      spectator: true,
      skillCatalog: skillsStore.getList(),
      chatHistory: Array.isArray(room.chatHistory) ? room.chatHistory.slice(-CHAT_WELCOME_LIMIT) : [],
    });
    sendTo(ws, { type: 'state', payload: serializeRoom(room) });
    sendTo(ws, {
      type: 'system',
      message: `Spectating room ${room.code} (${room.players.size}/${roomMaxPlayers})`,
    });
    return spectator;
  }
  let resumable = sessionAccountId
    ? (findRoomPlayerByAccount(sessionAccountId, requestedCode) || findRoomPlayerByAccount(sessionAccountId))
    : null;
  if (resumable?.room?.completedAt) {
    removeRoomClient(resumable.player, { force: true });
    resumable = null;
  }
  if (resumable?.room && resumable?.player) {
    const currentPlayer = resumable.player;
    const currentRoom = resumable.room;
    const canResume = resumeOnly
      || isPlayerReconnectPending(currentPlayer)
      || !isSocketOpen(currentPlayer.ws);
    if (canResume) {
      const previousWs = currentPlayer.ws;
      if (previousWs && previousWs !== ws && isSocketOpen(previousWs)) {
        sendTo(previousWs, {
          type: 'system',
          message: 'Session resumed in another tab.',
        });
        try {
          previousWs.close(4001, 'session resumed');
        } catch {
          // ignore socket handoff race
        }
      }
      currentPlayer.ws = ws;
      currentPlayer.moveX = 0;
      currentPlayer.moveY = 0;
      currentPlayer.shooting = false;
      currentPlayer.jumpQueued = false;
      currentPlayer.netQuality = 0;
      currentPlayer.netPingMs = 0;
      currentPlayer.disconnectedAt = 0;
      currentPlayer.resumeExpiresAt = 0;
      publishRuntimeRegistry();
      const roomMaxPlayers = Math.max(1, Number(currentRoom.maxPlayers) || getRoomMaxPlayers(currentRoom.gameMode));
      sendTo(ws, {
        type: 'welcome',
        id: currentPlayer.id,
        roomCode: currentRoom.code,
        instanceId: currentRoom.instanceId || INSTANCE_ID,
        runType: String(currentRoom.runType || 'free'),
        mapId: String(currentRoom.mapId || ''),
        campaignId: String(currentRoom.campaignId || ''),
        campaignLevelId: String(currentRoom.campaignLevelId || ''),
        gameMode: normalizeGameMode(currentRoom.gameMode || 'normal'),
        spectators: Math.max(0, Number(currentRoom.spectators?.size) || 0),
        spectatorCount: Math.max(0, Number(currentRoom.spectators?.size) || 0),
        tickRate: currentRoom.sync.tickRate,
        sync: currentRoom.sync,
        maxPlayers: roomMaxPlayers,
        skillCatalog: skillsStore.getList(),
        me: {
          name: currentPlayer.name,
          playerAccountId: currentPlayer.playerAccountId,
          isRegisteredNickname: currentPlayer.isRegisteredNickname,
          activeHero: currentPlayer.playerClass,
        },
        progression: currentPlayer.accountProgression,
        progressionCatalog,
        chatHistory: Array.isArray(currentRoom.chatHistory) ? currentRoom.chatHistory.slice(-CHAT_WELCOME_LIMIT) : [],
        resumed: true,
      });
      sendTo(ws, { type: 'state', payload: serializeRoom(currentRoom) });
      broadcastRoom(currentRoom, {
        type: 'system',
        message: `${currentPlayer.name} reconnected to room ${currentRoom.code}.`,
      });
      return currentPlayer;
    }
  }
  if (resumeOnly) {
    sendTo(ws, {
      type: 'joinError',
      message: requestedCode
        ? `Active run in room ${requestedCode} was not found or can no longer be resumed.`
        : 'Active run was not found or can no longer be resumed.',
      code: 404,
      roomCode: requestedCode,
    });
    return null;
  }

  let targetRoomCode = requestedCode;
  if (!targetRoomCode) {
    do {
      targetRoomCode = randomRoomCode();
    } while (rooms.has(targetRoomCode));
  }
  const requestedIntegrationToken = String(join?.integrationToken || '').trim();
  const partnerRunSession = consumePartnerRunSession(requestedIntegrationToken, targetRoomCode);
  if (requestedIntegrationToken && !partnerRunSession) {
    sendTo(ws, { type: 'joinError', message: 'Integration session is invalid, expired, or already used.', code: 410 });
    return null;
  }
  const requestedName = partnerRunSession?.playerName || join?.name;
  const identity = resolveJoinIdentity(ws, requestedName);
  if (!identity.ok) {
    sendTo(ws, { type: 'joinError', message: identity.message, code: identity.code });
    return null;
  }

  const id = Math.random().toString(36).slice(2, 10);
  const name = identity.name;
  const requestedHeroId = partnerRunSession?.heroId || join?.playerClass;
  const joinHero = resolveJoinHeroForPlayer(identity.playerAccountId, requestedHeroId);
  const room = getOrCreateRoom(targetRoomCode, join?.sync, join?.gameMode, join?.pvpDurationMin, {
    runType: join?.runType,
    mapId: join?.mapId,
    campaignId: join?.campaignId,
    campaignLevelId: join?.campaignLevelId,
    progression: joinHero.progression,
  });
  if (!room?.code) {
    sendTo(ws, {
      type: 'joinError',
      message: room?.message || 'Failed to prepare room.',
      code: room?.code || 400,
      roomCode: targetRoomCode,
    });
    return null;
  }
  const roomMaxPlayers = Math.max(1, Number(room.maxPlayers) || getRoomMaxPlayers(room.gameMode));
  if (room.players.size >= roomMaxPlayers) {
    sendTo(ws, { type: 'joinError', message: `Room ${room.code} is full (${roomMaxPlayers}/${roomMaxPlayers}).` });
    return null;
  }
  const playerClass = joinHero.heroId;
  const spawn = randomPlayerSpawn(room, room.gameMode);

  const player = {
    id,
    ws,
    roomCode: room.code,
    name,
    x: spawn.x,
    y: spawn.y,
    aimX: spawn.x + 1,
    aimY: spawn.y,
    moveX: 0,
    moveY: 0,
    shooting: false,
    hp: PLAYER_HP_MAX,
    maxHp: PLAYER_HP_MAX,
    alive: true,
    fireCooldownLeft: 0,
    respawnAt: 0,
    isOut: false,
    canRespawn: false,
    slowUntil: 0,
    dodgeCooldownMs: 0,
    dodgeChargesMax: PLAYER_DODGE_MAX_CHARGES,
    dodgeCharges: PLAYER_DODGE_MAX_CHARGES,
    dodgeRechargeMs: 0,
    dodgeInvulnUntil: 0,
    jumpQueued: false,
    lastReceivedInputSeq: 0,
    lastProcessedInputSeq: 0,
    weaponKey: 'pistol',
    weaponAmmo: null,
    weaponMagazine: Math.max(1, Math.floor(Number(WEAPONS.pistol.magazineSize) || 12)),
    weaponReserveAmmo: null,
    weaponReloadLeftMs: 0,
    playerClass,
    netQuality: 0,
    netPingMs: 0,
    level: 1,
    xp: 0,
    xpToNext: getXpToNextLevel(1),
    xpChargeSeq: 0,
    xpChargeXp: 0,
    xpChargeLastAt: 0,
    xpPullTargetSpeed: 0,
    unspentLevelUps: 0,
    pendingSkillChoices: [],
    skills: {},
    skillOrder: [],
    damageMul: 1,
    fireRateMul: 1,
    reloadSpeedMul: 1,
    moveSpeedMul: 1,
    hpRegenPerSec: 0,
    shieldHp: 0,
    shieldMax: 0,
    shieldAbsorbMul: 0,
    shieldRestoreMs: 0,
    shieldRestoreAt: 0,
    shieldHitSeq: 0,
    shieldHitDirX: 0,
    shieldHitDirY: -1,
    shieldLastAbsorbed: 0,
    pickupRadius: PLAYER_PICKUP_RADIUS_BASE,
    enemyKills: 0,
    bossKills: 0,
    pvpKills: 0,
    pvpDeaths: 0,
    activeConsumableBuffs: [],
    extraDodgeCharges: 0,
    joinedAt: Date.now(),
    devUnlocked: false,
    livesTotal: RESPAWN_MODE === 'lives' ? (1 + RESPAWN_EXTRA_LIVES) : 1,
    livesLeft: RESPAWN_MODE === 'lives' ? RESPAWN_EXTRA_LIVES : 0,
    reviveTokens: RESPAWN_MODE === 'token' ? RESPAWN_START_TOKENS : 0,
    godMode: false,
    chatRecentAt: [],
    chatMutedUntil: 0,
    playerAccountId: identity.playerAccountId || null,
    isRegisteredNickname: !!identity.isRegistered,
    runReplay: null,
    accountProgression: joinHero.progression ? accountProgressionStore.toPublicProgression(joinHero.progression) : null,
    accountHeroBonuses: joinHero.progression ? accountProgressionStore.computeHeroBonuses(joinHero.progression, playerClass) : null,
    partnerRunContext: partnerRunSession ? {
      integrationToken: partnerRunSession.token,
      partnerRunId: partnerRunSession.partnerRunId,
      externalPlayerId: partnerRunSession.externalPlayerId,
      callbackPath: partnerRunSession.callbackPath,
      metadata: partnerRunSession.metadata,
      requestedBy: partnerRunSession.requestedBy,
      claimedAt: Date.now(),
      callbackSentAt: 0,
    } : null,
    disconnectedAt: 0,
    resumeExpiresAt: 0,
  };

  applyPersistentHeroSkillsToPlayer(player);
  rebuildPlayerDerivedStats(player);
  player.runReplay = createRunReplay(room, player, Date.now());
  room.players.set(id, player);
  captureReplayFrame(room, player.runReplay, Date.now());
  room.scores.set(id, 0);
  room.kills.set(id, 0);
  publishRuntimeRegistry();

  sendTo(ws, {
    type: 'welcome',
    id,
    roomCode: room.code,
    instanceId: room.instanceId || INSTANCE_ID,
    runType: String(room.runType || 'free'),
    mapId: String(room.mapId || ''),
    campaignId: String(room.campaignId || ''),
    campaignLevelId: String(room.campaignLevelId || ''),
    gameMode: normalizeGameMode(room.gameMode || 'normal'),
    spectators: Math.max(0, Number(room.spectators?.size) || 0),
    spectatorCount: Math.max(0, Number(room.spectators?.size) || 0),
    tickRate: room.sync.tickRate,
    sync: room.sync,
    maxPlayers: roomMaxPlayers,
    skillCatalog: skillsStore.getList(),
    me: {
      name,
      playerAccountId: player.playerAccountId,
      isRegisteredNickname: player.isRegisteredNickname,
      activeHero: player.playerClass,
    },
    progression: player.accountProgression,
    progressionCatalog,
    chatHistory: Array.isArray(room.chatHistory) ? room.chatHistory.slice(-CHAT_WELCOME_LIMIT) : [],
  });
  sendTo(ws, { type: 'state', payload: serializeRoom(room) });

  broadcastRoom(room, {
    type: 'system',
    message: `${name} joined room ${room.code} (${room.players.size}/${roomMaxPlayers})`,
  });

  return player;
}

function removeRoomClient(client, options = {}) {
  if (!client) return;
  const room = rooms.get(client.roomCode);
  if (!room) return;
  if (client.kind === 'spectator') {
    room.spectators.delete(client.id);
    if (room.players.size === 0 && room.spectators.size === 0) {
      rooms.delete(room.code);
    }
    publishRuntimeRegistry();
    return;
  }

  const preserveForReconnect = !options.force
    && !isShuttingDown
    && Math.max(0, Number(client.playerAccountId) || 0) > 0;
  if (preserveForReconnect) {
    const now = Date.now();
    client.moveX = 0;
    client.moveY = 0;
    client.shooting = false;
    client.jumpQueued = false;
    client.disconnectedAt = now;
    client.resumeExpiresAt = now + PLAYER_RECONNECT_GRACE_MS;
    publishRuntimeRegistry();
    return;
  }

  room.players.delete(client.id);
  clearSkillOffersForOwner(room, client.id);
  room.companions = (room.companions || []).filter((companion) => companion.ownerId !== client.id);
  room.scores.delete(client.id);
  room.kills.delete(client.id);

  broadcastRoom(room, { type: 'system', message: `${client.name} left room ${room.code}.` });

  if (room.players.size === 0 && room.spectators.size === 0) {
    rooms.delete(room.code);
  }
  publishRuntimeRegistry();
  flushRunPersistenceQueue();
}

function notifyClientsAboutRestart(reason = 'restart') {
  const payload = {
    type: 'serverRestart',
    reason,
    retryAfterMs: RESTART_RETRY_MS,
    instanceId: INSTANCE_ID,
    now: Date.now(),
  };
  for (const ws of activeSockets) {
    sendTo(ws, payload);
  }
}

function closeActiveSocketsGracefully() {
  for (const ws of activeSockets) {
    try {
      ws.close(1012, 'server restarting');
    } catch {
      // ignore close race
    }
  }
}

function beginGracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  shutdownStartedAt = Date.now();
  console.log(`Graceful shutdown started (${signal}) on ${INSTANCE_ID}`);
  publishRuntimeRegistry();
  flushRunPersistenceQueue({ force: true });
  notifyClientsAboutRestart(signal);

  if (forceShutdownTimer) clearTimeout(forceShutdownTimer);
  forceShutdownTimer = setTimeout(() => {
    runtimeRegistryStore.unregisterInstance();
    for (const ws of activeSockets) {
      try {
        ws.terminate();
      } catch {
        // ignore terminate race
      }
    }
    process.exit(0);
  }, SHUTDOWN_GRACE_MS);
  if (typeof forceShutdownTimer.unref === 'function') forceShutdownTimer.unref();

  try {
    wss.close();
  } catch {
    // ignore server close race
  }
  try {
    server.close((err) => {
      runtimeRegistryStore.unregisterInstance();
      if (err) {
        console.error('HTTP server close failed:', err);
        process.exit(1);
        return;
      }
      process.exit(0);
    });
  } catch (err) {
    console.error('Graceful shutdown failed:', err);
    process.exit(1);
  }

  setTimeout(() => {
    closeActiveSocketsGracefully();
  }, Math.min(400, Math.max(50, Math.floor(RESTART_RETRY_MS / 4))));
}

wss.on('connection', (ws, req) => {
  if (isShuttingDown) {
    sendTo(ws, {
      type: 'serverRestart',
      reason: 'restart',
      retryAfterMs: RESTART_RETRY_MS,
      instanceId: INSTANCE_ID,
      now: Date.now(),
    });
    try {
      ws.close(1013, 'server restarting');
    } catch {
      // ignore close race
    }
    return;
  }
  activeSockets.add(ws);
  publishRuntimeRegistry();
  ws.adminSession = readAdminSession(req);
  ws.playerSession = readPlayerSession(req);
  let client = null;

  ws.on('message', (msgRaw) => {
    let msg;
    try {
      msg = JSON.parse(msgRaw.toString());
    } catch {
      return;
    }
    if (msg.type === 'netPing') {
      sendTo(ws, { type: 'netPong', seq: Number(msg.seq) || 0, serverNow: Date.now() });
      return;
    }

    if (msg.type === 'join' && client) {
      removeRoomClient(client, { force: true });
      client = null;
    }

    if (msg.type === 'join' && !client) {
      client = joinRoom(ws, msg);
      return;
    }

    if (msg.type === 'devCheat' && !client) {
      applyGlobalDevCommand(ws, msg.command);
      return;
    }

    if (!client) return;
    if (client.kind === 'spectator') {
      if (msg.type === 'leave') {
        removeRoomClient(client);
        client = null;
      }
      return;
    }
    const room = rooms.get(client.roomCode);
    if (!room) return;
    const current = room.players.get(client.id);
    if (!current) return;

    if (msg.type === 'netStats') {
      current.netQuality = parseNetQualityLevel(msg);
      current.netPingMs = parseNetPingMs(msg);
      return;
    }

    if (msg.type === 'input') {
      const world = getRoomWorld(room);
      current.lastReceivedInputSeq = Math.max(0, Number(msg.seq) || current.lastReceivedInputSeq || 0);
      current.moveX = clamp(Number(msg.moveX) || 0, -1, 1);
      current.moveY = clamp(Number(msg.moveY) || 0, -1, 1);
      current.aimX = clamp(Number(msg.aimX) || current.x, 0, world.width);
      current.aimY = clamp(Number(msg.aimY) || current.y, 0, world.height);
      current.shooting = Boolean(msg.shooting);
      if (msg.jump) current.jumpQueued = true;
    }

    if (msg.type === 'weaponSwitch') {
      const key = msg.weaponKey;
      if (!WEAPONS[key]) return;
      if (key === 'pistol' || current.weaponKey === key) {
        if (key === 'pistol') setPlayerWeapon(current, key);
        else startPlayerReload(current, WEAPONS[key], { force: true });
      }
    }

    if (msg.type === 'useQuickItem') {
      const slotKey = String(msg.slotKey || '').trim();
      usePlayerQuickConsumable(room, current, slotKey, Date.now());
      return;
    }

    

    if (msg.type === 'chatSend') {
      handleRoomChatMessage(room, current, msg, Date.now());
      return;
    }

    if (msg.type === 'devCheat') {
      applyDevCheatCommand(room, current, msg.command, Date.now());
      return;
    }

    if (msg.type === 'leave') {
      removeRoomClient(current, { force: true });
      client = null;
    }
  });

  ws.on('close', () => {
    activeSockets.delete(ws);
    publishRuntimeRegistry();
    if (!client) return;
    if (client.ws !== ws) return;
    const clientRoom = rooms.get(client.roomCode);
    removeRoomClient(client, { force: Boolean(clientRoom?.completedAt) });
  });
});

function tickRoom(room, dtSec, now) {
  for (const player of Array.from(room.players.values())) {
    if (!player?.resumeExpiresAt) continue;
    if (Math.max(0, Number(player.resumeExpiresAt) || 0) > now) continue;
    removeRoomClient(player, { force: true });
  }
  if (!rooms.has(room.code)) return;
  const world = getRoomWorld(room);
  const tickDiag = RUNTIME_DIAG_ENABLED ? {
    systemMs: 0,
    playersMs: 0,
    companionsMs: 0,
    bulletsMs: 0,
    enemiesMs: 0,
    xpOrbsMs: 0,
    dropsMs: 0,
    skillOrbsMs: 0,
    replayMs: 0,
    movingXpOrbs: 0,
  } : null;
  const phaseStart = () => (tickDiag ? process.hrtime.bigint() : 0n);
  const phaseEnd = (key, startedNs) => {
    if (!tickDiag || !startedNs) return;
    tickDiag[key] = (Number(tickDiag[key]) || 0) + (Number(process.hrtime.bigint() - startedNs) / 1e6);
  };
  const finishTickDiag = () => {
    if (tickDiag) room.lastTickDiag = tickDiag;
  };
  if (room.completedAt) {
    finishTickDiag();
    return;
  }
  if (normalizeGameMode(room.gameMode) === 'pvp' && !room.pvpMatchEnded) {
    const matchEndsAt = Math.max(0, Number(room.matchEndsAt) || 0);
    if (matchEndsAt > 0 && now >= matchEndsAt) {
      room.pvpMatchEnded = true;
      const ranked = Array.from(room.players.values())
        .sort((a, b) =>
          (Math.max(0, Number(b.pvpKills) || 0) - Math.max(0, Number(a.pvpKills) || 0))
          || ((room.scores.get(b.id) || 0) - (room.scores.get(a.id) || 0))
          || ((b.joinedAt || 0) - (a.joinedAt || 0)));
      broadcastRoom(room, { type: 'system', message: 'PvP match ended. Calculating results...' });
      ranked.forEach((player, index) => {
        downPlayer(room, player, now, {
          forceFinal: true,
          pvpPlacement: { place: index + 1, total: ranked.length },
        });
      });
      finishTickDiag();
      return;
    }
  }

  let phaseStartedNs = phaseStart();
  if (!room.lastCompanionSyncAt || now - room.lastCompanionSyncAt >= COMPANION_SYNC_INTERVAL_MS) {
    syncRoomCompanions(room);
    room.lastCompanionSyncAt = now;
  }
  const roomDifficulty = getRoomDifficulty(room, now);
  const dtMs = dtSec * 1000;
  if (!room.pvpMatchEnded && room.players.size > 0 && now - room.lastEnemySpawnAt >= roomDifficulty.spawnIntervalMs) {
    room.lastEnemySpawnAt = now;
    const spawnMul = Math.max(1, Number(room.enemySpawnMul) || 1);
    for (let i = 0; i < spawnMul; i += 1) {
      if (normalizeGameMode(room.gameMode) === 'pvp' && Math.random() > Math.max(0.03, Math.min(1, PVP_ENEMY_SPAWN_MUL))) continue;
      spawnEnemy(room, now, roomDifficulty);
    }
  }

  if (normalizeGameMode(room.gameMode) !== 'pvp' && room.players.size > 0) {
    maybeScheduleBossSpawn(room, now);
  }

  for (let i = room.bossPortals.length - 1; i >= 0; i -= 1) {
    const portal = room.bossPortals[i];
    if (now >= portal.spawnAt) {
      spawnBossEnemy(room, portal.x, portal.y, now, roomDifficulty);
      room.bossPortals.splice(i, 1);
    }
  }
  phaseEnd('systemMs', phaseStartedNs);

  phaseStartedNs = phaseStart();
  for (const p of room.players.values()) {
    p.lastProcessedInputSeq = Math.max(
      Math.max(0, Number(p.lastProcessedInputSeq) || 0),
      Math.max(0, Number(p.lastReceivedInputSeq) || 0),
    );
    if (!p.alive) {
      p.xpPullTargetSpeed = 0;
      if (!p.isOut && p.canRespawn && now >= p.respawnAt) {
        const spawn = randomPlayerSpawn(room, room.gameMode);
        p.x = spawn.x;
        p.y = spawn.y;
        p.hp = p.maxHp || PLAYER_HP_MAX;
        p.alive = true;
        p.canRespawn = false;
        p.respawnAt = 0;
        p.slowUntil = 0;
        p.dodgeCooldownMs = 0;
        p.dodgeCharges = p.dodgeChargesMax || PLAYER_DODGE_MAX_CHARGES;
        p.dodgeRechargeMs = 0;
        p.dodgeInvulnUntil = 0;
        p.jumpQueued = false;
        if (Math.max(0, Number(p.shieldMax) || 0) > 0) {
          p.shieldHp = Math.max(1, Math.round(Number(p.shieldMax) || 0));
          p.shieldRestoreAt = 0;
        }
      }
      continue;
    }

    const previousX = Number(p.x) || 0;
    const previousY = Number(p.y) || 0;
    updatePlayerReload(p, dtMs);
    updatePlayerDodgeRecharge(p, dtMs);
    if (p.jumpQueued) {
      performPlayerDodge(p, now);
      p.jumpQueued = false;
    }

    const moveLen = Math.hypot(p.moveX, p.moveY);
    const nx = moveLen > 0 ? p.moveX / moveLen : 0;
    const ny = moveLen > 0 ? p.moveY / moveLen : 0;
    const slowed = Number(p.slowUntil) > now;
    const speedMul = (slowed ? PLAYER_SLOW_FACTOR : 1) * Math.max(0.2, Number(p.moveSpeedMul) || 1);

    const movedPlayer = moveActorWithSceneCollision(
      room,
      p.x,
      p.y,
      nx * PLAYER_SPEED * PLAYER_MOVE_SPEED_GLOBAL_MUL * speedMul * dtSec,
      ny * PLAYER_SPEED * PLAYER_MOVE_SPEED_GLOBAL_MUL * speedMul * dtSec,
      PLAYER_RADIUS,
      {
        minX: PLAYER_RADIUS,
        maxX: world.width - PLAYER_RADIUS,
        minY: PLAYER_RADIUS,
        maxY: world.height - PLAYER_RADIUS,
      },
    );
    p.x = movedPlayer.x;
    p.y = movedPlayer.y;
    p.xpPullTargetSpeed = Math.min(
      XP_ORB_TARGET_SPEED_CAP,
      Math.max(0, Math.hypot((Number(p.x) || 0) - previousX, (Number(p.y) || 0) - previousY) / Math.max(0.001, dtSec)),
    );

    p.fireCooldownLeft = Math.max(0, p.fireCooldownLeft - dtMs);

    if (p.shooting && p.fireCooldownLeft <= 0) {
      fireFromPlayer(room, p, now);
    }

    tickPlayerSkills(room, p, dtSec, now);
  }
  phaseEnd('playersMs', phaseStartedNs);

  phaseStartedNs = phaseStart();
  tickCompanions(room, dtSec, now);
  phaseEnd('companionsMs', phaseStartedNs);

  phaseStartedNs = phaseStart();
  for (let i = room.bullets.length - 1; i >= 0; i -= 1) {
    const b = room.bullets[i];
    if (b.kind === 'rocket' && !b.fromEnemy) {
      let target = null;
      if (String(b.targetKind || 'enemy') === 'player') {
        const p = room.players.get(String(b.targetId || ''));
        if (p && p.alive && String(p.id) !== String(b.ownerId || '')) {
          target = { kind: 'player', id: p.id, x: p.x, y: p.y, player: p };
        }
      } else {
        const enemy = room.enemies.find((e) => e.id === b.targetId && e.hp > 0);
        if (enemy) target = { kind: 'enemy', id: enemy.id, x: enemy.x, y: enemy.y, enemy };
      }
      if (!target) {
        target = nearestEnemyTo(room, b.x, b.y, Math.max(140, Number(b.retargetRange) || 520), { excludePlayerId: String(b.ownerId || '') });
      }
      if (target) {
        b.targetId = target.id;
        b.targetKind = target.kind || 'enemy';
      }

      const speed = Math.max(120, Number(b.speed) || Math.hypot(Number(b.vx) || 0, Number(b.vy) || 0) || 120);
      let angle = Math.atan2(Number(b.vy) || 0, Number(b.vx) || speed);
      if (target) {
        const desiredAngle = Math.atan2(target.y - b.y, target.x - b.x);
        const turnRate = Math.max(0.6, Number(b.turnRate) || 4.5);
        const turnAccel = Math.max(8, Number(b.turnAccel) || turnRate * 4.6);
        const desiredTurnSpeed = clamp(wrapAngleDelta(desiredAngle - angle) / Math.max(0.001, dtSec), -turnRate, turnRate);
        const prevTurnSpeed = Math.max(-turnRate, Math.min(turnRate, Number(b.turnSpeed) || 0));
        const nextTurnSpeed = prevTurnSpeed + clamp(desiredTurnSpeed - prevTurnSpeed, -turnAccel * dtSec, turnAccel * dtSec);
        b.turnSpeed = nextTurnSpeed;
        angle += nextTurnSpeed * dtSec;
      } else if (Number(b.turnSpeed) || 0) {
        b.turnSpeed = Number(b.turnSpeed) * Math.pow(0.08, dtSec);
        angle += Number(b.turnSpeed) * dtSec;
      }
      const ageSec = Math.max(0, now - (Number(b.spawnAt) || now)) / 1000;
      angle += Math.sin(ageSec * (Number(b.wobbleFreq) || 8) + (Number(b.wobblePhase) || 0)) * Math.max(0, Number(b.wobbleAmp) || 0) * dtSec;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    } else if (!b.fromEnemy && Math.max(0, Number(b.homingTurnRate) || 0) > 0) {
      b.homingAgeMs = Math.max(0, Number(b.homingAgeMs) || 0) + dtSec * 1000;
      if (b.homingAgeMs >= Math.max(0, Number(b.homingDelayMs) || 0)) {
        const target = findBulletHomingTarget(room, b, Math.max(0, Number(b.homingRange) || 0));
        if (target) {
          const speed = Math.max(120, Math.hypot(Number(b.vx) || 0, Number(b.vy) || 0) || 120);
          let angle = Math.atan2(Number(b.vy) || 0, Number(b.vx) || speed);
          const desiredAngle = Math.atan2((Number(target.y) || 0) - (Number(b.y) || 0), (Number(target.x) || 0) - (Number(b.x) || 0));
          const maxTurn = Math.max(0.1, Number(b.homingTurnRate) || 0) * dtSec;
          angle += clamp(wrapAngleDelta(desiredAngle - angle), -maxTurn, maxTurn);
          b.vx = Math.cos(angle) * speed;
          b.vy = Math.sin(angle) * speed;
        }
      }
    }

    const prevX = b.x;
    const prevY = b.y;
    b.x += b.vx * dtSec;
    b.y += b.vy * dtSec;
    b.lifeMs -= dtSec * 1000;

    if (b.lifeMs <= 0 || b.x < 0 || b.y < 0 || b.x > world.width || b.y > world.height) {
      room.bullets.splice(i, 1);
      continue;
    }

    const bulletR = Math.max(BULLET_RADIUS, Number(b.radius) || BULLET_RADIUS);
    const useSegmentHit = Boolean(b.segmentHit);
    let hit = false;
    if (b.fromEnemy) {
      let playerHit = null;
      for (const p of room.players.values()) {
        if (!p.alive) continue;
        const rr = PLAYER_RADIUS + bulletR;
        const playerImpact = getSegmentCircleHit(prevX, prevY, b.x, b.y, p.x, p.y, rr);
        if (playerImpact && (!playerHit || Number(playerImpact.t) < Number(playerHit.hit.t))) {
          playerHit = { player: p, hit: playerImpact };
        }
      }
      const objectImpact = findBulletObjectImpact(room, prevX, prevY, b.x, b.y, bulletR);
      if (objectImpact && (!playerHit || Number(objectImpact.hit.t) <= Number(playerHit.hit.t))) {
        hit = applyBulletObjectImpact(room, b, objectImpact, now);
      } else if (playerHit?.player) {
        applyEnemyHitToPlayer(room, playerHit.player, Math.max(1, Number(b.damage) || ENEMY_RANGED_DAMAGE), now, {
          applySlow: true,
          sourceX: prevX,
          sourceY: prevY,
          dirX: Number(b.vx) || 0,
          dirY: Number(b.vy) || 0,
        });
        hit = true;
      }
    } else {
      const owner = room.players.get(b.ownerPlayerId || b.ownerId);
      if (normalizeGameMode(room.gameMode) === 'pvp' && owner) {
        for (const p of room.players.values()) {
          if (p.id === owner.id || !p.alive) continue;
          const rr = PLAYER_RADIUS + bulletR;
          const collides = useSegmentHit
            ? segmentIntersectsCircle(prevX, prevY, b.x, b.y, p.x, p.y, rr)
            : (((p.x - b.x) ** 2 + (p.y - b.y) ** 2) <= rr * rr);
          if (!collides) continue;
          if (applyPlayerHitToPlayer(room, owner, p, b.damage, now, {
            allowDeadAttacker: true,
            sourceX: prevX,
            sourceY: prevY,
            dirX: Number(b.vx) || 0,
            dirY: Number(b.vy) || 0,
          })) {
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (let ei = room.enemies.length - 1; ei >= 0; ei -= 1) {
          const e = room.enemies[ei];
          if (Array.isArray(b.hitEnemyIds) && b.hitEnemyIds.includes(e.id)) continue;
          const rr = (Number(e.radius) || ENEMY_RADIUS) + bulletR;
          const collides = useSegmentHit
            ? segmentIntersectsCircle(prevX, prevY, b.x, b.y, e.x, e.y, rr)
            : (((e.x - b.x) ** 2 + (e.y - b.y) ** 2) <= rr * rr);
          if (collides) {
            if (b.kind === 'rocket') {
              hit = true;
              explodeRocket(room, b, now);
            } else {
              if (!Array.isArray(b.hitEnemyIds)) b.hitEnemyIds = [];
              b.hitEnemyIds.push(e.id);
              enemyTakeDamage(room, e, b.damage, b.ownerPlayerId || b.ownerId, now, {
                fromX: prevX,
                fromY: prevY,
                dirX: b.vx,
                dirY: b.vy,
                damageSource: 'bullet',
              });
              const pierceLeft = Math.max(0, Math.floor(Number(b.pierceRemaining) || 0));
              if (pierceLeft > 0) {
                b.pierceRemaining = pierceLeft - 1;
                hit = false;
              } else {
                hit = true;
              }
            }
            break;
          }
        }
      }

      if (!hit) {
        const objectImpact = findBulletObjectImpact(room, prevX, prevY, b.x, b.y, bulletR);
        if (objectImpact) {
          hit = applyBulletObjectImpact(room, b, objectImpact, now);
        }
      }
    }
    if (hit) {
      room.bullets.splice(i, 1);
    }
  }
  phaseEnd('bulletsMs', phaseStartedNs);

  const enemyWorldBounds = getEnemyWorldBounds(room);
  phaseStartedNs = phaseStart();
  for (const e of room.enemies) {
    if (e.attackCooldownMs > 0) e.attackCooldownMs = Math.max(0, e.attackCooldownMs - dtSec * 1000);

    const er = Math.max(ENEMY_RADIUS, Number(e.radius) || ENEMY_RADIUS);
    e.hitStunMs = Math.max(0, Number(e.hitStunMs) || 0);
    e.knockbackVx = Number(e.knockbackVx) || 0;
    e.knockbackVy = Number(e.knockbackVy) || 0;
    if (e.hitStunMs > 0) {
      e.hitStunMs = Math.max(0, e.hitStunMs - dtSec * 1000);
    }
    if (Math.abs(e.knockbackVx) > 0.2 || Math.abs(e.knockbackVy) > 0.2) {
      const knocked = moveActorWithSceneCollision(
        room,
        e.x,
        e.y,
        e.knockbackVx * dtSec,
        e.knockbackVy * dtSec,
        er,
        enemyWorldBounds,
      );
      e.x = knocked.x;
      e.y = knocked.y;
      const decay = Math.max(0, 1 - dtSec * ENEMY_HIT_KNOCKBACK_FRICTION);
      e.knockbackVx *= decay;
      e.knockbackVy *= decay;
      if (Math.abs(e.knockbackVx) < 0.2) e.knockbackVx = 0;
      if (Math.abs(e.knockbackVy) < 0.2) e.knockbackVy = 0;
    }
    if (e.hitStunMs > 0) {
      e.vx = 0;
      e.vy = 0;
      e.attackWindupMs = 0;
      e.attackTargetId = null;
      e.attackTargetKind = '';
      continue;
    }

    const speed = Number(e.speed) || ENEMY_SPEED_MIN;
    const target = nearestAlivePlayer(room, e.x, e.y);
    if (!target) {
      e.vx = 0;
      e.vy = 0;
      e.attackWindupMs = 0;
      e.attackTargetId = null;
      e.attackTargetKind = '';
      continue;
    }

    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const rr = er + PLAYER_RADIUS;
    const steerTarget = getEnemySteerTarget(room, e, target, er, now, enemyWorldBounds);
    const steerDx = steerTarget.x - e.x;
    const steerDy = steerTarget.y - e.y;
    const steerDist = Math.hypot(steerDx, steerDy) || 1;
    const targetBlocked = steerTarget.targetBlocked === true;
    const breakObject = steerTarget.breakObjectId ? findRoomMapObjectById(room, steerTarget.breakObjectId) : null;
    const canBreakObject = canEnemyBreakMapObject(breakObject);
    const behavior = getEnemyBehavior(e);

    if (behavior === 'healer' || (e.type === 'boss' && Number(e.healAmount) > 0 && Number(e.healRadius) > 0)) {
      e.healCooldownLeftMs = Math.max(0, Number(e.healCooldownLeftMs) || 0) - dtSec * 1000;
      if (e.healCooldownLeftMs <= 0 && Number(e.healAmount) > 0 && Number(e.healRadius) > 0) {
        const healRadius = Math.max(1, Number(e.healRadius) || 0);
        const healAmount = Math.max(1, Math.round(Number(e.healAmount) || 0));
        let healed = 0;
        for (const ally of room.enemies) {
          if (!ally || ally.id === e.id || Number(ally.hp) <= 0) continue;
          if (Number(ally.hp) >= Number(ally.maxHp)) continue;
          const reach = healRadius + Math.max(ENEMY_RADIUS, Number(ally.radius) || ENEMY_RADIUS);
          const dist = Math.hypot((Number(ally.x) || 0) - e.x, (Number(ally.y) || 0) - e.y);
          if (dist > reach) continue;
          ally.hp = Math.min(Number(ally.maxHp) || ally.hp, (Number(ally.hp) || 0) + healAmount);
          healed += 1;
          if (healed >= 4) break;
        }
        e.healCooldownLeftMs = Math.max(450, Number(e.healCooldownMs) || 1400);
      }
    }

    if (e.type === 'boss' && Number(e.rangeMax) > 0 && Number(e.fireCooldownMs) > 0) {
      const rangeMin = Math.max(0, Number(e.rangeMin) || 0);
      const rangeMax = Math.max(rangeMin + 40, Number(e.rangeMax) || 0);
      if (e.attackCooldownMs <= 0 && target.alive && !targetBlocked && d >= rangeMin && d <= rangeMax) {
        fireEnemyProjectile(room, e, target);
        e.attackCooldownMs = Math.max(160, Number(e.fireCooldownMs) || ENEMY_RANGED_FIRE_COOLDOWN_MS);
      }
    }

    if (behavior === 'exploder' && Number(e.explosionRadius) > 0 && !targetBlocked && d <= Math.max(rr + 8, Number(e.explosionRadius) * 0.46)) {
      explodeEnemyMob(room, e, now);
      enemyTakeDamage(room, e, (Number(e.hp) || 0) + 99999, null, now, {
        damageSource: 'self_destruct',
        stunMs: 0,
        knockback: 0,
      });
      continue;
    }

    if (behavior === 'ranged' || behavior === 'sniper') {
      const targetDist = d;
      const rangeMin = Math.max(0, Number(e.rangeMin) || ENEMY_RANGED_MIN_RANGE);
      const rangeMax = Math.max(rangeMin + 20, Number(e.rangeMax) || ENEMY_RANGED_MAX_RANGE);
      if (targetBlocked) {
        e.vx = (steerDx / steerDist) * speed;
        e.vy = (steerDy / steerDist) * speed;
      } else if (targetDist < rangeMin) {
        e.vx = -(dx / d) * speed;
        e.vy = -(dy / d) * speed;
      } else if (targetDist > rangeMax) {
        e.vx = (dx / d) * speed;
        e.vy = (dy / d) * speed;
      } else {
        e.vx = 0;
        e.vy = 0;
      }
      if (Math.abs(Number(e.vx) || 0) > 0.15) e.faceLeft = (Number(e.vx) || 0) < 0;
      else e.faceLeft = dx < 0;

      const moved = moveActorWithSceneCollision(room, e.x, e.y, e.vx * dtSec, e.vy * dtSec, er, enemyWorldBounds);
      e.x = moved.x;
      e.y = moved.y;

      if (e.attackCooldownMs <= 0 && target.alive && !targetBlocked && targetDist <= rangeMax * 1.1) {
        fireEnemyProjectile(room, e, target);
        e.attackCooldownMs = Math.max(80, Number(e.fireCooldownMs) || ENEMY_RANGED_FIRE_COOLDOWN_MS);
      }
      continue;
    }

    if (e.attackWindupMs > 0) {
      e.vx = 0;
      e.vy = 0;
      e.attackWindupMs -= dtSec * 1000;

      if (e.attackWindupMs <= 0) {
        if (String(e.attackTargetKind || 'player') === 'object') {
          const lockedObject = findRoomMapObjectById(room, e.attackTargetId);
          if (canEnemyBreakMapObject(lockedObject) && isEnemyInMapObjectAttackRange(e, lockedObject, er)) {
            e.faceLeft = (Number(lockedObject.x) || e.x) < e.x;
            applyEnemyHitToMapObject(room, e, lockedObject, now);
          }
        } else {
          const lockedTarget = room.players.get(e.attackTargetId);
          if (lockedTarget && lockedTarget.alive) {
            e.faceLeft = (lockedTarget.x - e.x) < 0;
            if (behavior === 'charger' || e.type === 'boss') {
              const cdx = lockedTarget.x - e.x;
              const cdy = lockedTarget.y - e.y;
              const cd = Math.hypot(cdx, cdy) || 1;
              const dashBase = e.type === 'boss' ? BOSS_DASH_DISTANCE : ENEMY_CHARGER_DASH_DISTANCE;
              const dash = Math.min(dashBase, Math.max(0, cd - 1));
              const dashed = moveActorWithSceneCollision(
                room,
                e.x,
                e.y,
                (cdx / cd) * dash,
                (cdy / cd) * dash,
                er,
                enemyWorldBounds,
              );
              e.x = dashed.x;
              e.y = dashed.y;
            }

            const adx = e.x - lockedTarget.x;
            const ady = e.y - lockedTarget.y;
            const bonusRange = e.type === 'boss' ? 20 : (behavior === 'charger' ? 8 : (behavior === 'brute' || behavior === 'shield' ? 5 : 0));
            const hitRange = rr + bonusRange;
            const baseDamage = e.type === 'boss' ? BOSS_ATTACK_DAMAGE : ENEMY_ATTACK_DAMAGE;
            const damage = Math.max(1, Math.round(baseDamage * Math.max(1, Number(e.damageMul) || 1)));
            if (adx * adx + ady * ady <= hitRange * hitRange) {
              applyEnemyHitToPlayer(room, lockedTarget, damage, now, {
                applySlow: true,
                sourceX: e.x,
                sourceY: e.y,
              });
            }
          }
        }
        e.attackWindupMs = 0;
        e.attackCooldownMs = getEnemyAttackCooldownMs(e);
        e.attackTargetId = null;
        e.attackTargetKind = '';
      }
      continue;
    }
    if (canBreakObject && e.attackCooldownMs <= 0 && isEnemyInMapObjectAttackRange(e, breakObject, er)) {
      e.vx = 0;
      e.vy = 0;
      e.faceLeft = (Number(breakObject.x) || e.x) < e.x;
      e.attackWindupMs = e.type === 'boss' ? BOSS_ATTACK_WINDUP_MS : ENEMY_ATTACK_WINDUP_MS;
      e.attackTargetId = String(breakObject.id || '');
      e.attackTargetKind = 'object';
      continue;
    }
    const attackTriggerRange = e.type === 'boss' ? (rr * 3) : rr;
    if (e.attackCooldownMs <= 0 && !targetBlocked && (e.x - target.x) ** 2 + (e.y - target.y) ** 2 <= attackTriggerRange * attackTriggerRange && target.alive) {
      e.vx = 0;
      e.vy = 0;
      e.faceLeft = dx < 0;
      e.attackWindupMs = e.type === 'boss' ? BOSS_ATTACK_WINDUP_MS : ENEMY_ATTACK_WINDUP_MS;
      e.attackTargetId = target.id;
      e.attackTargetKind = 'player';
      continue;
    }

    if (behavior === 'flanker' && !targetBlocked && d > rr * 1.2) {
      if (!e.flankSign) e.flankSign = Math.random() < 0.5 ? -1 : 1;
      if (!e.flankSwapAt || now > e.flankSwapAt) {
        if (Math.random() < 0.35) e.flankSign *= -1;
        e.flankSwapAt = now + 1800 + Math.random() * 1800;
      }
      const sideX = -dy / d;
      const sideY = dx / d;
      const flankX = (dx / d) * 0.78 + sideX * e.flankSign * 0.52;
      const flankY = (dy / d) * 0.78 + sideY * e.flankSign * 0.52;
      const flankLen = Math.hypot(flankX, flankY) || 1;
      e.vx = (flankX / flankLen) * speed;
      e.vy = (flankY / flankLen) * speed;
    } else {
      e.vx = (steerDx / steerDist) * speed;
      e.vy = (steerDy / steerDist) * speed;
    }
    if (Math.abs(Number(e.vx) || 0) > 0.15) e.faceLeft = (Number(e.vx) || 0) < 0;
    const moved = moveActorWithSceneCollision(room, e.x, e.y, e.vx * dtSec, e.vy * dtSec, er, enemyWorldBounds);
    e.x = moved.x;
    e.y = moved.y;
  }
  phaseEnd('enemiesMs', phaseStartedNs);


  let magnetTarget = null;
  let magnetPullMul = 1;
  if (Number(room.xpMagnetUntil) > now) {
    const candidate = room.players.get(room.xpMagnetPlayerId);
    if (candidate && candidate.alive) {
      magnetTarget = candidate;
      const startedAt = Number(room.xpMagnetStartedAt) || now;
      const progress = Math.max(0, Math.min(1, (now - startedAt) / XP_SURGE_DURATION_MS));
      const eased = progress * progress * (3 - 2 * progress);
      magnetPullMul = XP_SURGE_PULL_MIN_MUL + (XP_SURGE_PULL_MAX_MUL - XP_SURGE_PULL_MIN_MUL) * eased;
    } else {
      room.xpMagnetPlayerId = '';
      room.xpMagnetUntil = 0;
      room.xpMagnetStartedAt = 0;
    }
  }

  let xpOrbsChanged = false;
  let movingXpOrbs = 0;
  phaseStartedNs = phaseStart();
  for (let i = room.xpOrbs.length - 1; i >= 0; i -= 1) {
    const orb = room.xpOrbs[i];
    orb.ttlMs -= dtSec * 1000;
    if (orb.ttlMs <= 0) {
      room.xpOrbs.splice(i, 1);
      xpOrbsChanged = true;
      continue;
    }

    let target = magnetTarget;
    let bestD2 = Infinity;

    if (target) {
      const dx = target.x - orb.x;
      const dy = target.y - orb.y;
      bestD2 = dx * dx + dy * dy;
    } else {
      for (const p of room.players.values()) {
        if (!p.alive) continue;
        const dx = p.x - orb.x;
        const dy = p.y - orb.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          target = p;
        }
      }
    }

    if (!target) continue;

    const pickupR = Math.max(30, Number(target.pickupRadius) || PLAYER_PICKUP_RADIUS_BASE);
    const collectR = XP_ORB_COLLECT_RADIUS;
    const collectR2 = collectR * collectR;
    const dist = Math.sqrt(bestD2);
    if (dist <= collectR) {
      gainPlayerXp(room, target, orb.xp, now, { source: 'xp_orb' });
      room.xpOrbs.splice(i, 1);
      xpOrbsChanged = true;
      continue;
    }

    const pullAll = target === magnetTarget;
    if (pullAll || dist <= pickupR) {
      const nx = dist > 0.001 ? (target.x - orb.x) / dist : 0;
      const ny = dist > 0.001 ? (target.y - orb.y) / dist : 0;
      const speedMul = pullAll ? magnetPullMul : 1;
      const targetSpeed = Math.max(0, Math.min(XP_ORB_TARGET_SPEED_CAP, Number(target.xpPullTargetSpeed) || 0));
      const fastTargetBonus = Math.min(
        XP_ORB_TARGET_SPEED_MAX_BONUS,
        Math.max(0, targetSpeed - XP_ORB_TARGET_SPEED_GRACE) * XP_ORB_TARGET_SPEED_BONUS_MUL,
      );
      const desiredSpeed = ((XP_ORB_PULL_SPEED * XP_ORB_PULL_SPEED_MUL) + fastTargetBonus) * speedMul;

      const prevPullSpeed = Math.max(0, Number(orb.pullSpeed) || 0);
      const startSpeed = Math.min(desiredSpeed * 0.32, desiredSpeed);
      const accel = Math.max(0.08, Math.min(1, dtSec * 8));
      const nextPullSpeed = prevPullSpeed > 0
        ? (prevPullSpeed + (desiredSpeed - prevPullSpeed) * accel)
        : startSpeed;
      orb.pullSpeed = nextPullSpeed;

      const moveStep = nextPullSpeed * dtSec;
      const distanceToCollect = Math.max(0, dist - collectR);
      if (moveStep + XP_ORB_COLLECT_FINISH_MARGIN >= distanceToCollect) {
        gainPlayerXp(room, target, orb.xp, now, { source: 'xp_orb' });
        room.xpOrbs.splice(i, 1);
        xpOrbsChanged = true;
        continue;
      }

      const maxNoOvershoot = distanceToCollect;
      const step = Math.min(moveStep, maxNoOvershoot);
      if (step > 0) {
        orb.x += nx * step;
        orb.y += ny * step;
      }
      if (step > 0 || nextPullSpeed > 1) movingXpOrbs += 1;

      const dxAfter = target.x - orb.x;
      const dyAfter = target.y - orb.y;
      if (dxAfter * dxAfter + dyAfter * dyAfter <= collectR2) {
        gainPlayerXp(room, target, orb.xp, now, { source: 'xp_orb' });
        room.xpOrbs.splice(i, 1);
        xpOrbsChanged = true;
        continue;
      }
    } else {
      orb.pullSpeed = 0;
    }
  }
  room.hasMovingXpOrbs = movingXpOrbs > 0;
  if (tickDiag) tickDiag.movingXpOrbs = movingXpOrbs;
  if (xpOrbsChanged) bumpRealtimeCollectionVersion(room, 'xpOrbs');
  phaseEnd('xpOrbsMs', phaseStartedNs);

  let dropsChanged = false;
  phaseStartedNs = phaseStart();
  for (let i = room.drops.length - 1; i >= 0; i -= 1) {
    const drop = room.drops[i];
    drop.ttlMs -= dtSec * 1000;
    if (drop.ttlMs <= 0) {
      room.drops.splice(i, 1);
      dropsChanged = true;
      continue;
    }

    let picked = false;
    for (const p of room.players.values()) {
      if (!p.alive) continue;
      const dx = p.x - drop.x;
      const dy = p.y - drop.y;
      const rr = PLAYER_RADIUS + DROP_RADIUS;
      if (dx * dx + dy * dy <= rr * rr) {
        if (drop.kind === 'xp_vacuum') {
          room.xpMagnetPlayerId = p.id;
          room.xpMagnetStartedAt = now;
          room.xpMagnetUntil = now + XP_SURGE_DURATION_MS;
          sendTo(p.ws, { type: 'system', message: 'XP Surge: all XP crystals are flying to you!' });
          broadcastRoom(room, { type: 'system', message: `${p.name} activated XP Surge.` });
        } else {
          const refill = refillPlayerWeapon(p, drop.weaponKey);
          const weaponLabel = WEAPONS[drop.weaponKey]?.label || 'Weapon';
          const ammoLabel = getPlayerWeaponAmmoLabel(p);
          sendTo(p.ws, { type: 'system', message: `${refill.switched ? 'Picked' : 'Refilled'} ${weaponLabel}: ${ammoLabel}` });
          broadcastRoom(room, { type: 'system', message: `${p.name} picked ${weaponLabel}.` });
        }
        room.drops.splice(i, 1);
        dropsChanged = true;
        picked = true;
        break;
      }
    }

    if (picked) continue;
  }
  if (dropsChanged) bumpRealtimeCollectionVersion(room, 'drops');
  phaseEnd('dropsMs', phaseStartedNs);

  let skillOrbsChanged = false;
  phaseStartedNs = phaseStart();
  for (let i = room.skillOrbs.length - 1; i >= 0; i -= 1) {
    const orb = room.skillOrbs[i];
    orb.ttlMs -= dtSec * 1000;
    if (orb.ttlMs <= 0) {
      room.skillOrbs.splice(i, 1);
      skillOrbsChanged = true;
    }
  }

  const pickupReach = PLAYER_RADIUS + Math.max(6, Number(SKILL_OFFER_PICKUP_RADIUS) || 22);
  const pickupReachSq = pickupReach * pickupReach;
  for (const p of room.players.values()) {
    if (!p.alive) continue;
    let pickOrb = null;
    let bestD2 = Infinity;
    for (const orb of room.skillOrbs) {
      if (orb.ownerId !== p.id) continue;
      const dx = p.x - orb.x;
      const dy = p.y - orb.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        pickOrb = orb;
      }
    }
    if (!pickOrb || bestD2 > pickupReachSq) continue;
    const picked = playerSelectSkill(room, p, pickOrb.skillId, now);
    if (picked) sendTo(p.ws, { type: 'system', message: 'Skill upgraded.' });
  }

  for (const p of room.players.values()) {
    if (!p.alive) continue;
    if ((Number(p.unspentLevelUps) || 0) > 0) ensureSkillOffer(room, p, now);
  }
  if (skillOrbsChanged) bumpRealtimeCollectionVersion(room, 'skillOrbs');
  phaseEnd('skillOrbsMs', phaseStartedNs);

  if (room.runType === 'campaign' && !room.completedAt) {
    const missionState = buildRoomMissionState(room, now);
    if (missionState?.allCompleted) {
      completeCampaignRoom(room, now);
      finishTickDiag();
      return;
    }
  }

  phaseStartedNs = phaseStart();
  let sharedReplayBase = null;
  for (const p of room.players.values()) {
    const effectiveCaptureMs = getEffectiveReplayCaptureIntervalMs(p.runReplay, room);
    if (!shouldCaptureReplayFrame(p.runReplay, now, false, effectiveCaptureMs)) continue;
    if (!sharedReplayBase) sharedReplayBase = buildReplayFrameBase(room, now);
    captureReplayFrame(room, p.runReplay, now, { baseFrame: sharedReplayBase, effectiveIntervalMs: effectiveCaptureMs });
  }
  if (Array.isArray(room.replayShotEvents) && room.replayShotEvents.length > 0) {
    const oldestKeepAt = Math.max(0, now - 8000);
    room.replayShotEvents = room.replayShotEvents.filter((event) => Math.max(0, Number(event?.at) || 0) >= oldestKeepAt);
  }
  if (Array.isArray(room.replayObjectImpactEvents) && room.replayObjectImpactEvents.length > 0) {
    const oldestKeepAt = Math.max(0, now - 8000);
    room.replayObjectImpactEvents = room.replayObjectImpactEvents.filter((event) => Math.max(0, Number(event?.at) || 0) >= oldestKeepAt);
  }
  phaseEnd('replayMs', phaseStartedNs);
  finishTickDiag();
}

let lastLoopAt = Date.now();
setInterval(() => {
  const now = Date.now();
  const elapsedMs = Math.min(150, now - lastLoopAt);
  lastLoopAt = now;

  for (const room of rooms.values()) {
    const roomLoopStartedNs = process.hrtime.bigint();
    let tickWorkMs = 0;
    let accumulatorClamped = false;
    room.accumulatorMs = (room.accumulatorMs || 0) + elapsedMs;
    const tickMs = room.tickMs || (1000 / DEFAULT_ROOM_SYNC.tickRate);

    let steps = 0;
    while (room.accumulatorMs >= tickMs && steps < 8) {
      const tickStartedNs = process.hrtime.bigint();
      tickRoom(room, tickMs / 1000, now);
      tickWorkMs += Number(process.hrtime.bigint() - tickStartedNs) / 1e6;
      room.accumulatorMs -= tickMs;
      steps += 1;
    }

    if (room.accumulatorMs > tickMs * 8) {
      room.accumulatorMs = tickMs * 2;
      accumulatorClamped = true;
    }

    room.stateAccumulatorMs = (room.stateAccumulatorMs || 0) + elapsedMs;
    const stateSendHz = getAdaptiveStateSendHz(room);
    const stateIntervalMs = 1000 / Math.max(1, stateSendHz);
    if (room.players.size > 0 && room.stateAccumulatorMs >= stateIntervalMs) {
      room.stateAccumulatorMs %= stateIntervalMs;
      const serializeStartedNs = process.hrtime.bigint();
      const payload = serializeRoom(room, { includeDecor: false, compactRealtime: true });
      const serializeMs = Number(process.hrtime.bigint() - serializeStartedNs) / 1e6;
      const payloadStats = collectSerializedStatePayloadStats(payload);
      const message = { type: 'state', payload };
      const jsonStartedNs = process.hrtime.bigint();
      const raw = JSON.stringify(message);
      const jsonMs = Number(process.hrtime.bigint() - jsonStartedNs) / 1e6;
      const broadcastStartedNs = process.hrtime.bigint();
      const sendStats = broadcastRoom(room, message, { raw, isRealtimeState: true });
      const broadcastMs = Number(process.hrtime.bigint() - broadcastStartedNs) / 1e6;
      room.lastRuntimeDiagState = {
        at: now,
        stateSendHz,
        bytes: sendStats.rawBytes,
        recipients: sendStats.recipients,
        sent: sendStats.sent,
        skipped: sendStats.skipped,
        maxBufferedAmount: sendStats.maxBufferedAmount,
        totalBufferedAmount: sendStats.totalBufferedAmount,
        serializeMs,
        jsonMs,
        broadcastMs,
        playersSent: payloadStats.players,
        enemiesSent: payloadStats.enemies,
        bulletsSent: payloadStats.bullets,
        xpOrbsSent: payloadStats.xpOrbs,
        dropsSent: payloadStats.drops,
        skillOrbsSent: payloadStats.skillOrbs,
        shotEventsSent: payloadStats.shotEvents,
        objectImpactEventsSent: payloadStats.objectImpactEvents,
      };
      room.shotEvents = [];
      room.objectImpactEvents = [];
    }

    const roomLoopMs = Number(process.hrtime.bigint() - roomLoopStartedNs) / 1e6;
    maybeLogRoomRuntime(room, now, {
      loopMs: roomLoopMs,
      tickWorkMs,
      steps,
      tickMs,
      accumulatorClamped,
    });
  }
}, MAIN_LOOP_MS);

setInterval(() => {
  publishRuntimeRegistry();
  flushRunPersistenceQueue();
}, 1000);

process.on('SIGTERM', () => {
  beginGracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  beginGracefulShutdown('SIGINT');
});

server.listen(PORT, () => {
  publishRuntimeRegistry();
  console.log(`Server started: http://localhost:${PORT}`);
  console.log(`Instance ID: ${INSTANCE_ID}`);
  console.log(`Admin login enabled: ${ADMIN_BOOTSTRAP_LOGIN}`);
  if (!IS_PROD) {
    console.log(`Bootstrap admin password: ${ADMIN_BOOTSTRAP_PASSWORD}`);
  }
});
