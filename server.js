const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const WebSocket = require('ws');

const { WebSocketServer } = WebSocket;

const config = require('./server/config');
const { createAdminAuthStore } = require('./server/admin-auth-store');
const { createPlayerAuthStore, normalizeNickname } = require('./server/player-auth-store');
const { createRecordsStore } = require('./server/records-store');
const { createRuntimeRegistryStore } = require('./server/runtime-registry-store');
const { createSkillsStore } = require('./server/skills-store');
const PORT = process.env.PORT || 8080;
const IS_PROD = process.env.NODE_ENV === 'production';
const DEV_CHEATS_ENABLED = (process.env.DEV_CHEATS_ENABLED || '1') !== '0';
const DEV_CHEAT_SECRET = (process.env.DEV_CHEAT_SECRET || 'bloodmoon').toString().trim();
const ADMIN_BOOTSTRAP_LOGIN = process.env.ADMIN_BOOTSTRAP_LOGIN || 'WizardJIOCb';
const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || (IS_PROD ? '' : 'WizardJIOCb-local');
const ADMIN_SESSION_COOKIE = 'crimson_admin_session';
const PLAYER_SESSION_COOKIE = 'crimson_player_session';
const INSTANCE_ID = (process.env.INSTANCE_ID || `${require('os').hostname()}-${process.pid}`).toString().trim();
const SHUTDOWN_GRACE_MS = Math.max(1000, Number(process.env.SHUTDOWN_GRACE_MS) || 8000);
const RESTART_RETRY_MS = Math.max(1000, Number(process.env.RESTART_RETRY_MS) || 2500);
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || (IS_PROD ? '' : `http://localhost:${PORT}`)).toString().trim().replace(/\/+$/, '');
const SESSION_COOKIE_DOMAIN = (process.env.SESSION_COOKIE_DOMAIN || (IS_PROD ? '.rodion.pro' : '')).toString().trim();

const {
  MAIN_LOOP_RATE,
  MAIN_LOOP_MS,
  MAX_PLAYERS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_RADIUS,
  ENEMY_RADIUS,
  BULLET_RADIUS,
  DROP_RADIUS,
  PLAYER_SPEED,
  PLAYER_HP_MAX,
  PLAYER_DODGE_DISTANCE,
  PLAYER_DODGE_COOLDOWN_MS,
  PLAYER_DODGE_MAX_CHARGES,
  PLAYER_DODGE_INVULN_MS,
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
  ADMIN_AUTH_DB_PATH,
  PLAYER_AUTH_DB_PATH,
  RUNTIME_REGISTRY_DB_PATH,
  DEFAULT_ROOM_SYNC,
  WEAPONS,
  DROP_WEAPON_KEYS,
  DEFAULT_SKILL_DEFS,
} = config;

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Crimson-Instance', INSTANCE_ID);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map();
const activeSockets = new Set();
let isShuttingDown = false;
let shutdownStartedAt = 0;
let forceShutdownTimer = null;
const processStartedAt = Date.now();
const REPLAY_CAPTURE_INTERVAL_MS = 200;
const REPLAY_FRAME_LIMIT = 7200;
const adminAuthStore = createAdminAuthStore({
  dataDir: DATA_DIR,
  dbPath: ADMIN_AUTH_DB_PATH,
  bootstrapLogin: ADMIN_BOOTSTRAP_LOGIN,
  bootstrapPassword: ADMIN_BOOTSTRAP_PASSWORD,
  isProd: IS_PROD,
});
const playerAuthStore = createPlayerAuthStore({
  dataDir: DATA_DIR,
  dbPath: PLAYER_AUTH_DB_PATH,
});
const runtimeRegistryStore = createRuntimeRegistryStore({
  dataDir: DATA_DIR,
  dbPath: RUNTIME_REGISTRY_DB_PATH,
  instanceId: INSTANCE_ID,
});
const recordsStore = createRecordsStore({
  dataDir: DATA_DIR,
  dbPath: RECORDS_DB_PATH,
  leaderboardLimit: LEADERBOARD_LIMIT,
  leaderboardPageSize: LEADERBOARD_PAGE_SIZE,
});
const skillsStore = createSkillsStore({
  dataDir: DATA_DIR,
  skillsConfigPath: SKILLS_CONFIG_PATH,
  defaultSkillDefs: DEFAULT_SKILL_DEFS,
});

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

function publishRuntimeRegistry() {
  const localRooms = Array.from(rooms.values())
    .filter((room) => room.players.size > 0)
    .map((room) => ({
      code: room.code,
      players: room.players.size,
      maxPlayers: MAX_PLAYERS,
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
  runtimeRegistryStore.publishRooms(localRooms, { isShuttingDown, publicBaseUrl: PUBLIC_BASE_URL });
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

function buildRoomRedirectUrl(baseUrl, roomCode, mode = 'join') {
  const base = (baseUrl || '').toString().trim().replace(/\/+$/, '');
  if (!base) return '';
  const url = new URL(base);
  if (roomCode) url.searchParams.set('room', cleanRoomCodeForLookup(roomCode));
  if (mode) url.searchParams.set('mode', mode);
  return url.toString();
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
  const session = readAdminSession(req);
  req.adminSession = session;
  req.adminUser = session?.user || null;
  next();
}

function attachPlayerAuth(req, _res, next) {
  const session = readPlayerSession(req);
  req.playerSession = session;
  req.playerUser = session?.player || null;
  next();
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

function setAdminSessionCookie(res, token) {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor((1000 * 60 * 60 * 24 * 14) / 1000)}`,
  ];
  if (SESSION_COOKIE_DOMAIN) parts.push(`Domain=${SESSION_COOKIE_DOMAIN}`);
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAdminSessionCookie(res) {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (SESSION_COOKIE_DOMAIN) parts.push(`Domain=${SESSION_COOKIE_DOMAIN}`);
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function setPlayerSessionCookie(res, token) {
  const parts = [
    `${PLAYER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor((1000 * 60 * 60 * 24 * 30) / 1000)}`,
  ];
  if (SESSION_COOKIE_DOMAIN) parts.push(`Domain=${SESSION_COOKIE_DOMAIN}`);
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearPlayerSessionCookie(res) {
  const parts = [
    `${PLAYER_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (SESSION_COOKIE_DOMAIN) parts.push(`Domain=${SESSION_COOKIE_DOMAIN}`);
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
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

app.get('/api/room-route', (req, res) => {
  const mode = (req.query.mode || 'join').toString().trim().toLowerCase() === 'create' ? 'create' : 'join';
  const roomCode = cleanRoomCodeForLookup(req.query.roomCode || req.query.room_code || '');

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
          publicBaseUrl: PUBLIC_BASE_URL,
          redirectUrl: buildRoomRedirectUrl(PUBLIC_BASE_URL, roomCode, mode),
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
        redirectUrl: buildRoomRedirectUrl(room.publicBaseUrl || PUBLIC_BASE_URL, room.code, mode),
        isCurrentInstance: room.instanceId === INSTANCE_ID,
      },
    });
    return;
  }

  const target = runtimeRegistryStore.chooseTargetInstance() || {
    instanceId: INSTANCE_ID,
    publicBaseUrl: PUBLIC_BASE_URL,
  };
  res.json({
    ok: true,
    mode,
    target: {
      instanceId: target.instanceId,
      publicBaseUrl: target.publicBaseUrl || PUBLIC_BASE_URL,
      redirectUrl: buildRoomRedirectUrl(target.publicBaseUrl || PUBLIC_BASE_URL, '', mode),
      isCurrentInstance: target.instanceId === INSTANCE_ID,
    },
  });
});

app.get('/api/player/me', (req, res) => {
  if (!req.playerUser) {
    res.json({
      ok: true,
      authenticated: false,
      player: null,
      identities: [],
      providers: ['google', 'vk', 'mailru'],
    });
    return;
  }
  res.json({
    ok: true,
    authenticated: true,
    player: req.playerUser,
    identities: req.playerSession?.identities || [],
    providers: ['google', 'vk', 'mailru'],
  });
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
  setPlayerSessionCookie(res, result.token);
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
  setPlayerSessionCookie(res, result.token);
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
  clearPlayerSessionCookie(res);
  res.json({ ok: true });
});

app.get('/admin/skills', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-skills.html'));
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
  setAdminSessionCookie(res, result.token);
  res.json({ ok: true, user: result.user });
});

app.post('/api/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  adminAuthStore.deleteSession(cookies[ADMIN_SESSION_COOKIE] || '');
  clearAdminSessionCookie(res);
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

app.get('/api/records', (req, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.page_size) || LEADERBOARD_PAGE_SIZE;
  const payload = recordsStore.listRecordsForLobby(page, pageSize);

  res.json({
    records: payload.items,
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
    totalPages: payload.totalPages,
    now: Date.now(),
  });
});

app.get('/api/records/:id/replay', (req, res) => {
  const payload = recordsStore.getRecordReplay(req.params.id);
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomSpawnEdge() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * WORLD_WIDTH, y: 0 };
  if (side === 1) return { x: WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT };
  if (side === 2) return { x: Math.random() * WORLD_WIDTH, y: WORLD_HEIGHT };
  return { x: 0, y: Math.random() * WORLD_HEIGHT };
}

function randomPlayerSpawn() {
  return {
    x: WORLD_WIDTH / 2 + (Math.random() - 0.5) * 260,
    y: WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 200,
  };
}

function generateTrees() {
  const trees = [];
  let attempts = 0;
  while (trees.length < TREE_COUNT && attempts < TREE_COUNT * 8) {
    attempts += 1;
    const x = 120 + Math.random() * (WORLD_WIDTH - 240);
    const y = 120 + Math.random() * (WORLD_HEIGHT - 240);
    const dx = x - WORLD_WIDTH / 2;
    const dy = y - WORLD_HEIGHT / 2;
    if (dx * dx + dy * dy < 260 * 260) continue;
    trees.push({ x, y, scale: 0.7 + Math.random() * 0.6 });
  }
  return trees;
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

function getOrCreateRoom(requestedCode, requestedSync) {
  const provided = cleanRoomCode(requestedCode);
  let code = provided;

  if (!code) {
    do {
      code = randomRoomCode();
    } while (rooms.has(code));
  }

  if (!rooms.has(code)) {
    const sync = normalizeRoomSync(requestedSync || DEFAULT_ROOM_SYNC);
    rooms.set(code, {
      code,
      instanceId: INSTANCE_ID,
      sync,
      tickMs: 1000 / sync.tickRate,
      stateIntervalMs: 1000 / sync.stateSendHz,
      stateAccumulatorMs: 0,
      accumulatorMs: 0,
      players: new Map(),
      companions: [],
      bullets: [],
      enemies: [],
      drops: [],
      xpOrbs: [],
      skillOrbs: [],
      scores: new Map(),
      kills: new Map(),
      nextEnemyId: 1,
      nextCompanionId: 1,
      nextBulletId: 1,
      nextDropId: 1,
      nextXpOrbId: 1,
      nextSkillOrbId: 1,
      nextPortalId: 1,
      bossPortals: [],
      totalEnemyKills: 0,
      totalBossKills: 0,
      nextBossAtKills: BOSS_KILL_INTERVAL,
      lastEnemySpawnAt: 0,
      startedAt: Date.now(),
      trees: generateTrees(),
    });
    publishRuntimeRegistry();
  }

  return rooms.get(code);
}
function sendTo(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room, payload) {
  const raw = JSON.stringify(payload);
  for (const p of room.players.values()) {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(raw);
    }
  }
}

function getCompanionSkillDefs() {
  return skillsStore.getList().filter((def) => String(def?.companionWeaponKey || '').trim());
}

function createCompanion(room, owner, def, ordinal = 0) {
  const spawnX = Number(owner?.x) || WORLD_WIDTH / 2;
  const spawnY = Number(owner?.y) || WORLD_HEIGHT / 2;
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

  const used = new Set();
  const nextCompanions = [];
  for (const entry of desired) {
    const matchIndex = room.companions.findIndex((companion, index) => {
      if (used.has(index)) return false;
      return companion.ownerId === entry.ownerId
        && companion.skillId === entry.skillId
        && companion.ordinal === entry.ordinal;
    });
    if (matchIndex >= 0) {
      used.add(matchIndex);
      const companion = room.companions[matchIndex];
      companion.weaponKey = String(entry.def.companionWeaponKey || companion.weaponKey || 'pistol').toLowerCase();
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

function fireCompanionWeapon(room, companion, owner, now) {
  const weapon = WEAPONS[companion.weaponKey] || WEAPONS.pistol;
  const dx = companion.aimX - companion.x;
  const dy = companion.aimY - companion.y;
  const baseAngle = Math.atan2(dy, dx);
  const damageMul = Math.max(0.2, Number(owner?.damageMul) || 1);
  const fireRateMul = Math.max(0.2, Number(owner?.fireRateMul) || 1);

  for (let i = 0; i < weapon.pellets; i += 1) {
    const spread = (Math.random() - 0.5) * (weapon.spreadDeg * Math.PI / 180);
    const angle = baseAngle + spread;
    const speedVariance = Math.max(0, Number(weapon.bulletSpeedVariance) || 0);
    const speedMul = 1 + ((Math.random() * 2) - 1) * speedVariance;
    const bulletSpeed = Math.max(120, weapon.bulletSpeed * speedMul);
    room.bullets.push({
      id: room.nextBulletId++,
      ownerId: owner?.id || companion.ownerId,
      fromEnemy: false,
      x: companion.x,
      y: companion.y,
      vx: Math.cos(angle) * bulletSpeed,
      vy: Math.sin(angle) * bulletSpeed,
      lifeMs: weapon.bulletLifeMs,
      damage: Math.max(1, Math.round(weapon.bulletDamage * damageMul)),
      color: weapon.color,
    });
  }

  companion.fireCooldownLeft = Math.max(35, weapon.cooldownMs / fireRateMul);
  companion.lastShotAt = now;
}

function tickCompanions(room, dtSec, now) {
  if (!room || !Array.isArray(room.companions) || room.companions.length === 0) return;
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
    desiredX = clamp(desiredX, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    desiredY = clamp(desiredY, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

    const followDx = desiredX - companion.x;
    const followDy = desiredY - companion.y;
    const followDist = Math.hypot(followDx, followDy) || 1;
    const followSpeed = PLAYER_SPEED * 0.86;
    const desiredSpeed = Math.min(followSpeed, followDist * (moving ? 6.4 : 5.1));
    companion.vx = followDist > 2 ? (followDx / followDist) * desiredSpeed : 0;
    companion.vy = followDist > 2 ? (followDy / followDist) * desiredSpeed : 0;

    if (!owner.alive) {
      companion.x = clamp(companion.x + companion.vx * dtSec, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
      companion.y = clamp(companion.y + companion.vy * dtSec, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
      companion.aimX = owner.x;
      companion.aimY = owner.y;
      continue;
    }

    const range = getCompanionWeaponRange(companion.weaponKey);
    const target = nearestEnemyTo(room, companion.x, companion.y, range);
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
    companion.x = clamp(companion.x + companion.vx * dtSec, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    companion.y = clamp(companion.y + companion.vy * dtSec, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
  }
}

function nearestEnemyTo(room, x, y, maxRange = Infinity) {
  let best = null;
  let bestD2 = maxRange * maxRange;
  for (const enemy of room.enemies) {
    if (!enemy || enemy.hp <= 0) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      best = enemy;
      bestD2 = d2;
    }
  }
  return best;
}

function wrapAngleDelta(delta) {
  let next = Number(delta) || 0;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function collectSkillTargets(room, player, maxTargets, radius) {
  return room.enemies
    .map((e) => ({ e, d2: (e.x - player.x) ** 2 + (e.y - player.y) ** 2 }))
    .filter((x) => x.d2 <= radius * radius)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, maxTargets)
    .map((x) => x.e);
}

function collectEnemiesInRadius(room, x, y, radius) {
  return room.enemies
    .map((enemy) => ({ enemy, d2: (enemy.x - x) ** 2 + (enemy.y - y) ** 2 }))
    .filter((item) => item.d2 <= radius * radius)
    .sort((a, b) => a.d2 - b.d2)
    .map((item) => item.enemy);
}

function castHomingMissiles(room, player, def, st, now) {
  const lvl = Math.max(1, Number(st?.level) || 1);
  const radius = Math.max(80, (Number(def.radius) || 520) + (Number(def.radiusPerLevel) || 0) * (lvl - 1));
  const rocketCount = Math.max(1, Math.round((Number(def.targets) || 5) + (Number(def.targetsPerLevel) || 0) * (lvl - 1)));
  const targets = collectSkillTargets(room, player, rocketCount, radius);
  if (targets.length <= 0) return false;

  const damage = Math.max(1, Math.round(((Number(def.damage) || 34) + (Number(def.damagePerLevel) || 0) * (lvl - 1)) * Math.max(0.2, Number(player.damageMul) || 1)));
  const missileSpeed = Math.max(160, (Number(def.missileSpeed) || 320) + (Number(def.missileSpeedPerLevel) || 0) * (lvl - 1));
  const turnRate = Math.max(1.8, (Number(def.turnRate) || 5.8) + (Number(def.turnRatePerLevel) || 0) * (lvl - 1));
  const explosionRadius = Math.max(24, (Number(def.explosionRadius) || 58) + (Number(def.explosionRadiusPerLevel) || 0) * (lvl - 1));
  const lifeMs = Math.max(900, Number(def.lifeMs) || 2600);
  const baseAngle = Math.random() * Math.PI * 2;

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const angle = baseAngle + ((Math.PI * 2 * i) / Math.max(1, targets.length)) + ((Math.random() - 0.5) * 0.26);
    const spawnDist = PLAYER_RADIUS + 12 + ((i % 2) * 7);
    room.bullets.push({
      id: room.nextBulletId++,
      kind: 'rocket',
      ownerId: player.id,
      fromEnemy: false,
      x: clamp(player.x + Math.cos(angle) * spawnDist, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS),
      y: clamp(player.y + Math.sin(angle) * spawnDist, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS),
      vx: Math.cos(angle) * missileSpeed * 0.78,
      vy: Math.sin(angle) * missileSpeed * 0.78,
      speed: missileSpeed,
      lifeMs,
      damage,
      radius: 6,
      color: '#fb923c',
      targetId: target.id,
      turnRate,
      wobbleAmp: 0.28 + Math.random() * 0.16,
      wobbleFreq: 7 + Math.random() * 3.5,
      wobblePhase: Math.random() * Math.PI * 2,
      retargetRange: radius * 1.15,
      explosionRadius,
      spawnAt: now,
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

  for (const enemy of targets) {
    enemyTakeDamage(room, enemy, damage, player.id, now);
  }
  return true;
}

function explodeRocket(room, bullet, now) {
  const radius = Math.max(18, Number(bullet.explosionRadius) || 54);
  const enemies = room.enemies.slice();
  for (const enemy of enemies) {
    const dx = enemy.x - bullet.x;
    const dy = enemy.y - bullet.y;
    const reach = radius + Math.max(ENEMY_RADIUS, Number(enemy.radius) || ENEMY_RADIUS);
    const dist = Math.hypot(dx, dy);
    if (dist > reach) continue;
    const falloff = 1 - Math.min(0.45, (dist / Math.max(1, reach)) * 0.45);
    enemyTakeDamage(room, enemy, Math.max(1, Math.round((Number(bullet.damage) || 1) * falloff)), bullet.ownerId, now);
  }
}

function castPlayerActiveSkill(room, player, def, st, now) {
  const skillId = String(def?.id || '').toLowerCase();
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
    const targets = collectEnemiesInRadius(room, player.x, player.y, radius);
    if (targets.length <= 0) return false;
    for (const enemy of targets) {
      enemyTakeDamage(room, enemy, damage * player.damageMul, player.id, now);
    }
    return true;
  }

  const maxTargets = Math.max(1, Math.round((Number(def.targets) || 1) + (Number(def.targetsPerLevel) || 0) * (lvl - 1)));
  const targets = collectSkillTargets(room, player, maxTargets, radius);
  if (targets.length <= 0) return false;

  for (const enemy of targets) {
    enemyTakeDamage(room, enemy, damage * player.damageMul, player.id, now);
  }
  return true;
}

function serializeRoom(room) {
  const now = Date.now();
  const difficulty = getRoomDifficulty(room, now);
  const nextPortal = room.bossPortals.length > 0 ? room.bossPortals[0] : null;
  const serializedPlayers = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    hp: p.hp,
    maxHp: Math.max(1, Math.round(Number(p.maxHp) || PLAYER_HP_MAX)),
    alive: p.alive,
    score: room.scores.get(p.id) || 0,
    kills: room.kills.get(p.id) || 0,
    weaponKey: p.weaponKey,
    weaponLabel: WEAPONS[p.weaponKey].label,
    ammo: p.weaponAmmo,
    aimX: Number(p.aimX) || p.x,
    aimY: Number(p.aimY) || p.y,
    shooting: Boolean(p.shooting),
    damageMul: Number(Math.max(0.2, Number(p.damageMul) || 1).toFixed(3)),
    fireRateMul: Number(Math.max(0.2, Number(p.fireRateMul) || 1).toFixed(3)),
    moveSpeedMul: Number(Math.max(0.2, Number(p.moveSpeedMul) || 1).toFixed(3)),
    pickupRadius: Math.max(0, Math.round(Number(p.pickupRadius) || PLAYER_PICKUP_RADIUS_BASE)),
    hpRegenPerSec: Number(Math.max(0, Number(p.hpRegenPerSec) || 0).toFixed(2)),
    moveSpeed: Math.max(1, Math.round(PLAYER_SPEED * Math.max(0.2, Number(p.moveSpeedMul) || 1))),
    shotDamage: Math.max(1, Math.round((WEAPONS[p.weaponKey]?.bulletDamage || WEAPONS.pistol.bulletDamage) * Math.max(0.2, Number(p.damageMul) || 1))),
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
    pendingSkillChoices: [],
    enemyKills: Math.max(0, Math.floor(Number(p.enemyKills) || 0)),
    bossKills: Math.max(0, Math.floor(Number(p.bossKills) || 0)),
    skills: (p.skillOrder || []).map((sid) => {
      const st = p.skills?.[sid] || { level: 0, cooldownMs: 0, maxCooldownMs: 0 };
      const def = skillsStore.getById(sid) || { id: sid, name: sid, kind: 'passive', rarity: 'common', desc: '' };
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
    aimX: Number(companion.aimX) || companion.x,
    aimY: Number(companion.aimY) || companion.y,
    shooting: Number(companion.fireCooldownLeft) > 0 && now - Number(companion.lastShotAt || 0) < 120,
    damageMul: 1,
    fireRateMul: 1,
    moveSpeedMul: 1,
    pickupRadius: 0,
    hpRegenPerSec: 0,
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
    roomStartedAt: room.startedAt,
    totalEnemyKills: room.totalEnemyKills || 0,
    nextBossAtKills: room.nextBossAtKills || BOSS_KILL_INTERVAL,
    bossAlive: hasAliveBoss(room),
    nextBossSpawnAt: nextPortal ? nextPortal.spawnAt : 0,
    roomDifficulty: {
      level: difficulty.level,
      hpMul: Number(difficulty.hpMul.toFixed(3)),
      speedMul: Number(difficulty.speedMul.toFixed(3)),
      damageMul: Number(difficulty.damageMul.toFixed(3)),
      attackRateMul: Number(difficulty.attackRateMul.toFixed(3)),
      spawnIntervalMs: Math.round(difficulty.spawnIntervalMs),
    },
    world: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    sync: room.sync,
    players: serializedPlayers.concat(serializedCompanions),
    bullets: room.bullets.map((b) => ({
      id: b.id,
      ownerId: b.ownerId,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      color: b.color,
      kind: b.kind || 'bullet',
      radius: Math.max(2, Number(b.radius) || BULLET_RADIUS),
      fromEnemy: Boolean(b.fromEnemy),
    })),
    enemies: room.enemies.map((e) => ({
      id: e.id,
      type: e.type || 'normal',
      x: e.x,
      y: e.y,
      hp: e.hp,
      maxHp: e.maxHp,
      radius: Math.max(ENEMY_RADIUS, Number(e.radius) || ENEMY_RADIUS),
      spriteScale: Number(e.spriteScale) || 1,
    })),
    bossPortals: room.bossPortals.map((bp) => ({
      id: bp.id,
      x: bp.x,
      y: bp.y,
      spawnAt: bp.spawnAt,
      ttlMs: Math.max(0, bp.spawnAt - now),
    })),
    drops: room.drops.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      weaponKey: d.weaponKey,
      weaponLabel: WEAPONS[d.weaponKey].label,
      ttlMs: Math.max(0, Math.round(d.ttlMs || 0)),
      ttlMaxMs: DROP_LIFETIME_MS,
    })),
    xpOrbs: room.xpOrbs.map((o) => ({
      id: o.id,
      x: o.x,
      y: o.y,
      xp: o.xp,
      ttlMs: Math.max(0, Math.round(o.ttlMs || 0)),
      ttlMaxMs: XP_ORB_LIFETIME_MS,
    })),
    skillOrbs: room.skillOrbs.map((o) => ({
      id: o.id,
      ownerId: o.ownerId,
      skillId: o.skillId,
      x: o.x,
      y: o.y,
      ttlMs: Math.max(0, Math.round(o.ttlMs || 0)),
      ttlMaxMs: Math.max(1, Math.round(o.ttlMaxMs || SKILL_OFFER_TTL_MS)),
    })),
    decor: {
      trees: room.trees,
    },
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

function chooseEnemyType() {
  const roll = Math.random();
  if (roll < 0.16) return 'ranged';
  if (roll < 0.38) return 'charger';
  return 'normal';
}

function hasAliveBoss(room) {
  return room.enemies.some((e) => e.type === 'boss' && e.hp > 0);
}

function scheduleBossPortal(room, now, spawnPos) {
  if (room.bossPortals.length > 0) return false;
  if (hasAliveBoss(room)) return false;
  const pos = spawnPos || randomSpawnEdge();
  room.bossPortals.push({
    id: room.nextPortalId++,
    x: pos.x,
    y: pos.y,
    spawnAt: now + BOSS_PORTAL_WARN_MS,
  });
  broadcastRoom(room, { type: 'system', message: 'A boss is approaching. Portal opened.' });
  return true;
}

function spawnEnemy(room, now, difficulty = null) {
  const pos = randomSpawnEdge();
  const diff = difficulty || getRoomDifficulty(room, now || Date.now());
  const hpBase = ENEMY_HP_BASE + Math.floor(((now || Date.now()) - room.startedAt) / 25000) * 2;
  const hp = Math.max(10, Math.round(hpBase * diff.hpMul));
  const enemyType = chooseEnemyType();
  const speedMul = enemyType === 'charger' ? 1.22 : (enemyType === 'ranged' ? 0.9 : 1);
  room.enemies.push({
    id: room.nextEnemyId++,
    type: enemyType,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    radius: ENEMY_RADIUS,
    spriteScale: 1,
    speed: (ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN)) * speedMul * diff.speedMul,
    damageMul: diff.damageMul,
    attackRateMul: diff.attackRateMul,
    attackWindupMs: 0,
    attackCooldownMs: 0,
    attackTargetId: null,
  });
}
function spawnBossEnemy(room, x, y, now, difficulty = null) {
  const diff = difficulty || getRoomDifficulty(room, now);
  const elapsedMul = 1 + Math.floor((now - room.startedAt) / 60000) * 0.18;
  const hp = Math.round(BOSS_HP_BASE * elapsedMul * (0.95 + diff.hpMul * 0.7));
  room.enemies.push({
    id: room.nextEnemyId++,
    type: 'boss',
    x,
    y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    radius: BOSS_RADIUS,
    spriteScale: BOSS_SPRITE_SCALE,
    speed: BOSS_SPEED * Math.max(1, diff.speedMul * 0.85),
    damageMul: Math.max(1, diff.damageMul * 1.1),
    attackRateMul: Math.max(1, diff.attackRateMul * 1.05),
    attackWindupMs: 0,
    attackCooldownMs: 500,
    attackTargetId: null,
  });
  broadcastRoom(room, { type: 'system', message: 'BOSS arrived. Keep moving.' });
}


function maybeScheduleBossSpawn(room, now) {
  if (room.totalEnemyKills < room.nextBossAtKills) return;
  if (room.bossPortals.length > 0) return;
  if (hasAliveBoss(room)) return;
  if (scheduleBossPortal(room, now)) {
    room.nextBossAtKills += BOSS_KILL_INTERVAL;
  }
}

function getEnemyAttackCooldownMs(enemy) {
  const rateMul = Math.max(0.35, Number(enemy?.attackRateMul) || 1);
  if (enemy?.type === 'boss') return Math.max(220, Math.round(BOSS_ATTACK_COOLDOWN_MS / rateMul));
  const castFrequency = Math.max(0, Number(ENEMY_ATTACK_CAST_FREQUENCY) || 0);
  const effective = ENEMY_ATTACK_BASE_COOLDOWN_MS / (1 + castFrequency);
  return Math.max(ENEMY_ATTACK_MIN_COOLDOWN_MS, Math.round(effective / rateMul));
}

function maybeSpawnDrop(room, x, y) {
  if (Math.random() > 0.22) return;
  const weaponKey = DROP_WEAPON_KEYS[Math.floor(Math.random() * DROP_WEAPON_KEYS.length)];
  room.drops.push({
    id: room.nextDropId++,
    x,
    y,
    weaponKey,
    ttlMs: DROP_LIFETIME_MS,
  });
}

function setPlayerWeapon(player, weaponKey) {
  const weapon = WEAPONS[weaponKey] || WEAPONS.pistol;
  player.weaponKey = weaponKey;
  player.weaponAmmo = weapon.ammo;
}

function fireFromPlayer(room, player) {
  const weapon = WEAPONS[player.weaponKey] || WEAPONS.pistol;
  const dx = player.aimX - player.x;
  const dy = player.aimY - player.y;
  const baseAngle = Math.atan2(dy, dx);

  const damageMul = Math.max(0.2, Number(player.damageMul) || 1);
  const fireRateMul = Math.max(0.2, Number(player.fireRateMul) || 1);

  for (let i = 0; i < weapon.pellets; i += 1) {
    const spread = (Math.random() - 0.5) * (weapon.spreadDeg * Math.PI / 180);
    const angle = baseAngle + spread;
    const speedVariance = Math.max(0, Number(weapon.bulletSpeedVariance) || 0);
    const speedMul = 1 + ((Math.random() * 2) - 1) * speedVariance;
    const bulletSpeed = Math.max(120, weapon.bulletSpeed * speedMul);
    room.bullets.push({
      id: room.nextBulletId++,
      ownerId: player.id,
      fromEnemy: false,
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * bulletSpeed,
      vy: Math.sin(angle) * bulletSpeed,
      lifeMs: weapon.bulletLifeMs,
      damage: Math.max(1, Math.round(weapon.bulletDamage * damageMul)),
      color: weapon.color,
    });
  }

  player.fireCooldownLeft = Math.max(35, weapon.cooldownMs / fireRateMul);

  if (weapon.ammo !== null) {
    player.weaponAmmo -= 1;
    if (player.weaponAmmo <= 0) {
      setPlayerWeapon(player, 'pistol');
      sendTo(player.ws, { type: 'system', message: 'Ammo ended. Back to pistol.' });
    }
  }
}

function fireEnemyProjectile(room, enemy, target) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const damageMul = Math.max(1, Number(enemy?.damageMul) || 1);
  room.bullets.push({
    id: room.nextBulletId++,
    ownerId: null,
    fromEnemy: true,
    x: enemy.x,
    y: enemy.y,
    vx: (dx / d) * ENEMY_RANGED_BULLET_SPEED,
    vy: (dy / d) * ENEMY_RANGED_BULLET_SPEED,
    lifeMs: ENEMY_RANGED_BULLET_LIFE_MS,
    damage: Math.max(1, Math.round(ENEMY_RANGED_DAMAGE * damageMul)),
    color: '#f87171',
  });
}

function performPlayerDodge(player, now) {
  if (!player.alive) return;
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

  player.x = clamp(player.x + nx * PLAYER_DODGE_DISTANCE, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
  player.y = clamp(player.y + ny * PLAYER_DODGE_DISTANCE, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
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
  target.hp -= damage;
  if (applySlow) target.slowUntil = Math.max(target.slowUntil || 0, now + PLAYER_SLOW_DURATION_MS);
  if (target.hp <= 0) {
    downPlayer(room, target, now);
  }
}


function getXpToNextLevel(level) {
  const lv = Math.max(1, Math.floor(Number(level) || 1));
  return Math.round(28 + (lv - 1) * 14 + ((lv - 1) ** 2) * 3);
}

function getSkillRank(player, skillId) {
  const st = player.skills?.[skillId];
  return Math.max(0, Math.floor(Number(st?.level) || 0));
}

function ensureSkillState(player, skillId) {
  if (!player.skills) player.skills = {};
  if (!player.skills[skillId]) player.skills[skillId] = { level: 0, cooldownMs: 0, maxCooldownMs: 0 };
  return player.skills[skillId];
}

function rebuildPlayerDerivedStats(player) {
  player.damageMul = 1;
  player.fireRateMul = 1;
  player.moveSpeedMul = 1;
  player.maxHpBonus = 0;
  player.hpRegenPerSec = 0;
  player.pickupRadius = PLAYER_PICKUP_RADIUS_BASE;
  player.extraDodgeCharges = 0;

  for (const def of skillsStore.getList()) {
    const lvl = getSkillRank(player, def.id);
    if (lvl <= 0) continue;
    player.damageMul += (Number(def.damageMulPerLevel) || 0) * lvl;
    player.fireRateMul += (Number(def.fireRateMulPerLevel) || 0) * lvl;
    player.moveSpeedMul += (Number(def.moveSpeedMulPerLevel) || 0) * lvl;
    player.maxHpBonus += (Number(def.maxHpFlatPerLevel) || 0) * lvl;
    player.hpRegenPerSec += (Number(def.hpRegenPerSecPerLevel) || 0) * lvl;
    player.pickupRadius += (Number(def.pickupRadiusPerLevel) || 0) * lvl;
    player.extraDodgeCharges += (Number(def.extraDodgeChargesPerLevel) || 0) * lvl;
  }

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
}

function roundReplayCoord(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function createRunReplay(room, player, now) {
  return {
    version: 1,
    captureIntervalMs: REPLAY_CAPTURE_INTERVAL_MS,
    startedAt: now,
    endedAt: now,
    durationSec: 0,
    roomCode: room.code,
    roomStartedAt: room.startedAt,
    playerId: player.id,
    playerName: player.name,
    playerClass: player.playerClass || 'cyber',
    world: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    meta: {
      tickRate: room.sync?.tickRate || DEFAULT_ROOM_SYNC.tickRate,
      stateSendHz: room.sync?.stateSendHz || DEFAULT_ROOM_SYNC.stateSendHz,
    },
    frames: [],
    truncated: false,
    lastCaptureAt: 0,
  };
}

function captureReplayFrame(room, replay, now, options = {}) {
  const force = options.force === true;
  if (!replay || replay.truncated) return;
  if (!force && replay.frames.length > 0 && now - replay.lastCaptureAt < replay.captureIntervalMs) return;
  if (replay.frames.length >= REPLAY_FRAME_LIMIT) {
    replay.truncated = true;
    replay.endedAt = now;
    replay.durationSec = Math.max(1, Math.floor((now - replay.startedAt) / 1000));
    return;
  }

  const players = Array.from(room.players.values()).map((p) => {
    const skills = [];
    if (p.skills && typeof p.skills === 'object') {
      for (const sid of p.skillOrder || Object.keys(p.skills)) {
        const st = p.skills[sid];
        if (!st) continue;
        const def = skillsStore.getById(sid);
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
    ];
  });
  const companions = (room.companions || []).map((companion) => ([
    companion.id,
    roundReplayCoord(companion.x),
    roundReplayCoord(companion.y),
    companion.weaponKey || 'pistol',
    companion.ownerId || '',
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
  const bullets = room.bullets.map((b) => ([
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
  ]));
  const drops = room.drops.map((d) => ([
    roundReplayCoord(d.x),
    roundReplayCoord(d.y),
    d.weaponKey || 'pistol',
  ]));
  const xpOrbs = room.xpOrbs.map((o) => ([
    roundReplayCoord(o.x),
    roundReplayCoord(o.y),
    Math.max(1, Math.round(Number(o.xp) || 1)),
  ]));
  const bossPortals = room.bossPortals.map((bp) => ([
    roundReplayCoord(bp.x),
    roundReplayCoord(bp.y),
    Math.max(0, Math.round((Number(bp.spawnAt) || now) - now)),
  ]));

  replay.frames.push({
    t: Math.max(0, now - replay.startedAt),
    te: Math.max(0, Number(room.totalEnemyKills) || 0),
    tb: Math.max(0, Number(room.totalBossKills) || 0),
    ba: hasAliveBoss(room) ? 1 : 0,
    p: players,
    c: companions,
    e: enemies,
    b: bullets,
    d: drops,
    x: xpOrbs,
    bp: bossPortals,
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
    world: replay.world,
    meta: replay.meta,
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
  return Math.max(0, before - room.skillOrbs.length);
}

function randomSkillOfferPosition(player, used = []) {
  const minDist = Math.max(40, Number(SKILL_OFFER_SPAWN_MIN_DIST) || 120);
  const maxDist = Math.max(minDist + 20, Number(SKILL_OFFER_SPAWN_MAX_DIST) || 420);
  for (let i = 0; i < 28; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    const x = clamp(player.x + Math.cos(angle) * dist, PLAYER_RADIUS + 16, WORLD_WIDTH - PLAYER_RADIUS - 16);
    const y = clamp(player.y + Math.sin(angle) * dist, PLAYER_RADIUS + 16, WORLD_HEIGHT - PLAYER_RADIUS - 16);
    const tooClose = used.some((pos) => ((pos.x - x) ** 2 + (pos.y - y) ** 2) <= (84 * 84));
    if (!tooClose) return { x, y };
  }
  return {
    x: clamp(player.x + (Math.random() - 0.5) * 260, PLAYER_RADIUS + 16, WORLD_WIDTH - PLAYER_RADIUS - 16),
    y: clamp(player.y + (Math.random() - 0.5) * 260, PLAYER_RADIUS + 16, WORLD_HEIGHT - PLAYER_RADIUS - 16),
  };
}

function ensureSkillOffer(room, player, now = Date.now()) {
  if (!room || !player || !player.alive) return false;
  if ((Number(player.unspentLevelUps) || 0) <= 0) return false;
  if (hasActiveSkillOffer(room, player.id)) return false;
  const picks = rollSkillChoices(player, SKILL_PICK_OPTIONS);
  if (!Array.isArray(picks) || picks.length <= 0) return false;

  const used = [];
  for (const skillId of picks) {
    const pos = randomSkillOfferPosition(player, used);
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
  return true;
}

function gainPlayerXp(room, player, amount, now) {
  if (!player || !player.alive) return;
  let xp = Math.max(0, Math.round(Number(amount) || 0));
  if (xp <= 0) return;
  if (!Number.isFinite(player.xp)) player.xp = 0;
  if (!Number.isFinite(player.xpToNext) || player.xpToNext <= 0) player.xpToNext = getXpToNextLevel(player.level || 1);

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
    room.xpOrbs.push({
      id: room.nextXpOrbId++,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      xp: chunk,
      ttlMs: XP_ORB_LIFETIME_MS,
    });
  }
}

function getEnemyXpValue(enemy) {
  if (!enemy) return 6;
  if (enemy.type === 'boss') return 220;
  if (enemy.type === 'charger') return 12;
  if (enemy.type === 'ranged') return 10;
  return 8;
}

function getEnemyScoreValue(enemy) {
  if (!enemy) return 10;
  if (enemy.type === 'boss') return 100;
  return 10;
}

function enemyTakeDamage(room, enemy, damage, ownerId, now) {
  if (!enemy) return false;
  enemy.hp -= Math.max(1, Math.round(Number(damage) || 1));
  if (enemy.hp > 0) return false;

  const idx = room.enemies.findIndex((e) => e.id === enemy.id);
  if (idx >= 0) room.enemies.splice(idx, 1);

  if (ownerId && room.players.has(ownerId)) {
    room.scores.set(ownerId, (room.scores.get(ownerId) || 0) + getEnemyScoreValue(enemy));
    room.kills.set(ownerId, (room.kills.get(ownerId) || 0) + 1);
    const killer = room.players.get(ownerId);
    if (killer) {
      if (enemy.type === 'boss') killer.bossKills = Math.max(0, Number(killer.bossKills) || 0) + 1;
      else killer.enemyKills = Math.max(0, Number(killer.enemyKills) || 0) + 1;
      gainPlayerXp(room, killer, getEnemyXpValue(enemy), now);
    }
  }

  room.totalEnemyKills = (room.totalEnemyKills || 0) + 1;
  if (enemy.type === 'boss') room.totalBossKills = (room.totalBossKills || 0) + 1;
  maybeScheduleBossSpawn(room, now);
  spawnXpOrbs(room, enemy.x, enemy.y, getEnemyXpValue(enemy));
  maybeSpawnDrop(room, enemy.x, enemy.y);
  return true;
}

function tickPlayerSkills(room, player, dtSec, now) {
  if (!player || !player.alive || !player.skills) return;
  if (player.hpRegenPerSec > 0) {
    player.hp = clamp(player.hp + player.hpRegenPerSec * dtSec, 0, player.maxHp || PLAYER_HP_MAX);
  }

  const defs = skillsStore.getMap();
  for (const skillId of player.skillOrder || []) {
    const st = player.skills[skillId];
    if (!st || st.level <= 0) continue;
    const def = defs[skillId];
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
      const def = skillsStore.getById(skillId);
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
    totalEnemyKills: Math.max(0, Number(room.totalEnemyKills) || 0),
    totalBossKills: Math.max(0, Number(room.totalBossKills) || 0),
    roomAlivePlayers: Math.max(0, Number(room.players?.size) || 0),
    survivedSec: Math.max(1, Math.floor((now - (target.joinedAt || now)) / 1000)),
    skills,
  };
}

function downPlayer(room, target, now) {
  const weaponKeyBeforeDown = target.weaponKey;
  target.hp = 0;
  target.alive = false;
  target.respawnAt = now + 3000;
  target.shooting = false;
  target.slowUntil = 0;
  target.dodgeCooldownMs = 0;
  target.dodgeCharges = target.dodgeChargesMax || PLAYER_DODGE_MAX_CHARGES;
  target.dodgeRechargeMs = 0;
  target.dodgeInvulnUntil = 0;
  target.jumpQueued = false;
  const runReplay = finalizeRunReplay(room, target.runReplay, now);
  const runDetails = buildRunDetails(room, { ...target, weaponKey: weaponKeyBeforeDown }, now);
  setPlayerWeapon(target, 'pistol');
  recordsStore.pushRecord({
    name: target.name,
    kills: room.kills.get(target.id) || 0,
    score: room.scores.get(target.id) || 0,
    roomCode: room.code,
    durationSec: Math.max(1, Math.floor((now - (target.joinedAt || now)) / 1000)),
    at: now,
    runDetails,
    runReplay,
  });
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

function applyGlobalDevCommand(ws, rawCommand) {
  const command = String(rawCommand || '').trim();
  if (!command) {
    sendDevConsoleWs(ws, 'Empty command.', false);
    return true;
  }

  const parts = command.split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase();
  const args = parts;

  if (cmd === 'help') {
    sendDevConsoleWs(ws, 'Menu commands: help, playerpass <nickname> <newpassword>. Join a room for gameplay cheats.');
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
  const command = String(rawCommand || '').trim();
  if (!command) {
    sendDevConsole(player, 'Empty command.', false);
    return;
  }

  const parts = command.split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase();
  const args = parts;

  if (cmd === 'help') {
    sendDevConsole(player, 'Commands: room|roomcode, unlock <room-secret>, lock, god [on|off], weapon <pistol|smg|shotgun|sniper> [ammo], ammo <n>, heal [n], hp <n>, xp <n>, levelup [n], skills, skill <id> [levels], bots|buddies [levels], nobots|clearbots, spawn <normal|charger|ranged|boss> [count], killall, playerpass <nickname> <newpassword>, status');
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
    if (player.weaponAmmo !== null && args[1] !== undefined) {
      player.weaponAmmo = Math.max(0, Math.floor(Number(args[1]) || 0));
    }
    sendDevConsole(player, `Weapon set: ${WEAPONS[key].label}${player.weaponAmmo === null ? ' (inf)' : ` (${player.weaponAmmo})`}`);
    return;
  }

  if (cmd === 'ammo') {
    if (player.weaponAmmo === null) {
      sendDevConsole(player, 'Current weapon has infinite ammo.', false);
      return;
    }
    const ammo = Math.max(0, Math.floor(Number(args[0]) || 0));
    player.weaponAmmo = ammo;
    sendDevConsole(player, `Ammo: ${ammo}`);
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
    const type = typeRaw === 'boss' ? 'boss' : (typeRaw === 'charger' ? 'charger' : (typeRaw === 'ranged' ? 'ranged' : 'normal'));
    const count = Math.max(1, Math.min(type === 'boss' ? 2 : 40, Math.floor(Number(args[1]) || 1)));
    for (let i = 0; i < count; i += 1) spawnEnemy(room, type, now);
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
  const room = getOrCreateRoom(join?.roomCode, join?.sync);

  if (room.players.size >= MAX_PLAYERS) {
    sendTo(ws, { type: 'joinError', message: `Room ${room.code} is full (8/8).` });
    return null;
  }

  const identity = resolveJoinIdentity(ws, join?.name);
  if (!identity.ok) {
    sendTo(ws, { type: 'joinError', message: identity.message, code: identity.code });
    return null;
  }

  const id = Math.random().toString(36).slice(2, 10);
  const name = identity.name;
  const playerClass = (join?.playerClass || 'cyber').toString().trim().slice(0, 24) || 'cyber';
  const spawn = randomPlayerSpawn();

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
    playerClass,
    netQuality: 0,
    netPingMs: 0,
    level: 1,
    xp: 0,
    xpToNext: getXpToNextLevel(1),
    unspentLevelUps: 0,
    pendingSkillChoices: [],
    skills: {},
    skillOrder: [],
    damageMul: 1,
    fireRateMul: 1,
    moveSpeedMul: 1,
    hpRegenPerSec: 0,
    pickupRadius: PLAYER_PICKUP_RADIUS_BASE,
    enemyKills: 0,
    bossKills: 0,
    extraDodgeCharges: 0,
    joinedAt: Date.now(),
    devUnlocked: false,
    godMode: false,
    playerAccountId: identity.playerAccountId || null,
    isRegisteredNickname: !!identity.isRegistered,
    runReplay: null,
  };

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
    tickRate: room.sync.tickRate,
    sync: room.sync,
    maxPlayers: MAX_PLAYERS,
    skillCatalog: skillsStore.getList(),
    me: {
      name,
      playerAccountId: player.playerAccountId,
      isRegisteredNickname: player.isRegisteredNickname,
    },
  });

  broadcastRoom(room, {
    type: 'system',
    message: `${name} joined room ${room.code} (${room.players.size}/${MAX_PLAYERS})`,
  });

  return player;
}

function removePlayer(player) {
  const room = rooms.get(player.roomCode);
  if (!room) return;
  room.players.delete(player.id);
  clearSkillOffersForOwner(room, player.id);
  room.companions = (room.companions || []).filter((companion) => companion.ownerId !== player.id);
  room.scores.delete(player.id);
  room.kills.delete(player.id);

  broadcastRoom(room, { type: 'system', message: `${player.name} left room ${room.code}.` });

  if (room.players.size === 0) {
    rooms.delete(room.code);
  }
  publishRuntimeRegistry();
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
  let player = null;

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

    if (msg.type === 'join' && !player) {
      player = joinRoom(ws, msg);
      return;
    }

    if (msg.type === 'devCheat' && !player) {
      applyGlobalDevCommand(ws, msg.command);
      return;
    }

    if (!player) return;
    const room = rooms.get(player.roomCode);
    if (!room) return;
    const current = room.players.get(player.id);
    if (!current) return;

    if (msg.type === 'netStats') {
      current.netQuality = parseNetQualityLevel(msg);
      current.netPingMs = parseNetPingMs(msg);
      return;
    }

    if (msg.type === 'input') {
      current.lastReceivedInputSeq = Math.max(0, Number(msg.seq) || current.lastReceivedInputSeq || 0);
      current.moveX = clamp(Number(msg.moveX) || 0, -1, 1);
      current.moveY = clamp(Number(msg.moveY) || 0, -1, 1);
      current.aimX = clamp(Number(msg.aimX) || current.x, 0, WORLD_WIDTH);
      current.aimY = clamp(Number(msg.aimY) || current.y, 0, WORLD_HEIGHT);
      current.shooting = Boolean(msg.shooting);
      if (msg.jump) current.jumpQueued = true;
    }

    if (msg.type === 'weaponSwitch') {
      const key = msg.weaponKey;
      if (!WEAPONS[key]) return;
      if (key === 'pistol' || current.weaponKey === key) {
        setPlayerWeapon(current, key);
      }
    }

    if (msg.type === 'skillPick') {
      const picked = playerSelectSkill(room, current, msg.skillId, Date.now());
      if (picked) sendTo(current.ws, { type: 'system', message: 'Skill upgraded.' });
      return;
    }

    if (msg.type === 'devCheat') {
      applyDevCheatCommand(room, current, msg.command, Date.now());
      return;
    }

    if (msg.type === 'leave') {
      removePlayer(current);
      player = null;
    }
  });

  ws.on('close', () => {
    activeSockets.delete(ws);
    publishRuntimeRegistry();
    if (!player) return;
    removePlayer(player);
  });
});

function tickRoom(room, dtSec, now) {
  syncRoomCompanions(room);
  const roomDifficulty = getRoomDifficulty(room, now);
  if (room.players.size > 0 && now - room.lastEnemySpawnAt >= roomDifficulty.spawnIntervalMs) {
    room.lastEnemySpawnAt = now;
    spawnEnemy(room, now, roomDifficulty);
  }

  if (room.players.size > 0) {
    maybeScheduleBossSpawn(room, now);
  }

  for (let i = room.bossPortals.length - 1; i >= 0; i -= 1) {
    const portal = room.bossPortals[i];
    if (now >= portal.spawnAt) {
      spawnBossEnemy(room, portal.x, portal.y, now, roomDifficulty);
      room.bossPortals.splice(i, 1);
    }
  }

  for (const p of room.players.values()) {
    p.lastProcessedInputSeq = Math.max(
      Math.max(0, Number(p.lastProcessedInputSeq) || 0),
      Math.max(0, Number(p.lastReceivedInputSeq) || 0),
    );
    if (!p.alive) {
      if (now >= p.respawnAt) {
        const spawn = randomPlayerSpawn();
        p.x = spawn.x;
        p.y = spawn.y;
        p.hp = p.maxHp || PLAYER_HP_MAX;
        p.alive = true;
        p.slowUntil = 0;
        p.dodgeCooldownMs = 0;
        p.dodgeCharges = p.dodgeChargesMax || PLAYER_DODGE_MAX_CHARGES;
        p.dodgeRechargeMs = 0;
        p.dodgeInvulnUntil = 0;
        p.jumpQueued = false;
      }
      continue;
    }

    updatePlayerDodgeRecharge(p, dtSec * 1000);
    if (p.jumpQueued) {
      performPlayerDodge(p, now);
      p.jumpQueued = false;
    }

    const moveLen = Math.hypot(p.moveX, p.moveY);
    const nx = moveLen > 0 ? p.moveX / moveLen : 0;
    const ny = moveLen > 0 ? p.moveY / moveLen : 0;
    const slowed = Number(p.slowUntil) > now;
    const speedMul = (slowed ? PLAYER_SLOW_FACTOR : 1) * Math.max(0.2, Number(p.moveSpeedMul) || 1);

    p.x = clamp(p.x + nx * PLAYER_SPEED * speedMul * dtSec, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    p.y = clamp(p.y + ny * PLAYER_SPEED * speedMul * dtSec, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

    p.fireCooldownLeft = Math.max(0, p.fireCooldownLeft - dtSec * 1000);

    if (p.shooting && p.fireCooldownLeft <= 0) {
      fireFromPlayer(room, p);
    }

    tickPlayerSkills(room, p, dtSec, now);
  }

  tickCompanions(room, dtSec, now);

  for (let i = room.bullets.length - 1; i >= 0; i -= 1) {
    const b = room.bullets[i];
    if (b.kind === 'rocket' && !b.fromEnemy) {
      const target = room.enemies.find((enemy) => enemy.id === b.targetId && enemy.hp > 0)
        || nearestEnemyTo(room, b.x, b.y, Math.max(140, Number(b.retargetRange) || 520));
      if (target) b.targetId = target.id;

      const speed = Math.max(120, Number(b.speed) || Math.hypot(Number(b.vx) || 0, Number(b.vy) || 0) || 120);
      let angle = Math.atan2(Number(b.vy) || 0, Number(b.vx) || speed);
      if (target) {
        const desiredAngle = Math.atan2(target.y - b.y, target.x - b.x);
        const maxTurn = Math.max(0.6, Number(b.turnRate) || 5.8) * dtSec;
        angle += clamp(wrapAngleDelta(desiredAngle - angle), -maxTurn, maxTurn);
      }
      const ageSec = Math.max(0, now - (Number(b.spawnAt) || now)) / 1000;
      angle += Math.sin(ageSec * (Number(b.wobbleFreq) || 8) + (Number(b.wobblePhase) || 0)) * Math.max(0, Number(b.wobbleAmp) || 0) * dtSec;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    }

    b.x += b.vx * dtSec;
    b.y += b.vy * dtSec;
    b.lifeMs -= dtSec * 1000;

    if (b.lifeMs <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_WIDTH || b.y > WORLD_HEIGHT) {
      room.bullets.splice(i, 1);
      continue;
    }

    let hit = false;
    if (b.fromEnemy) {
      for (const p of room.players.values()) {
        if (!p.alive) continue;
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const rr = PLAYER_RADIUS + BULLET_RADIUS;
        if (dx * dx + dy * dy <= rr * rr) {
          applyEnemyHitToPlayer(room, p, Math.max(1, Number(b.damage) || ENEMY_RANGED_DAMAGE), now, true);
          hit = true;
          break;
        }
      }
    } else {
      for (let ei = room.enemies.length - 1; ei >= 0; ei -= 1) {
        const e = room.enemies[ei];
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = (Number(e.radius) || ENEMY_RADIUS) + Math.max(BULLET_RADIUS, Number(b.radius) || BULLET_RADIUS);
        if (dx * dx + dy * dy <= rr * rr) {
          hit = true;
          if (b.kind === 'rocket') explodeRocket(room, b, now);
          else enemyTakeDamage(room, e, b.damage, b.ownerId, now);
          break;
        }
      }
    }

    if (hit) {
      room.bullets.splice(i, 1);
    }
  }

  for (const e of room.enemies) {
    if (e.attackCooldownMs > 0) e.attackCooldownMs = Math.max(0, e.attackCooldownMs - dtSec * 1000);

    const er = Math.max(ENEMY_RADIUS, Number(e.radius) || ENEMY_RADIUS);
    const speed = Number(e.speed) || ENEMY_SPEED_MIN;
    const target = nearestAlivePlayer(room, e.x, e.y);
    if (!target) {
      e.vx = 0;
      e.vy = 0;
      e.attackWindupMs = 0;
      e.attackTargetId = null;
      continue;
    }

    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const rr = er + PLAYER_RADIUS;

    if (e.type === 'ranged') {
      const targetDist = d;
      if (targetDist < ENEMY_RANGED_MIN_RANGE) {
        e.vx = -(dx / d) * speed;
        e.vy = -(dy / d) * speed;
      } else if (targetDist > ENEMY_RANGED_MAX_RANGE) {
        e.vx = (dx / d) * speed;
        e.vy = (dy / d) * speed;
      } else {
        e.vx = 0;
        e.vy = 0;
      }

      e.x = clamp(e.x + e.vx * dtSec, er, WORLD_WIDTH - er);
      e.y = clamp(e.y + e.vy * dtSec, er, WORLD_HEIGHT - er);

      if (e.attackCooldownMs <= 0 && target.alive && targetDist <= ENEMY_RANGED_MAX_RANGE * 1.1) {
        fireEnemyProjectile(room, e, target);
        e.attackCooldownMs = ENEMY_RANGED_FIRE_COOLDOWN_MS;
      }
      continue;
    }

    if (e.attackWindupMs > 0) {
      e.vx = 0;
      e.vy = 0;
      e.attackWindupMs -= dtSec * 1000;

      if (e.attackWindupMs <= 0) {
        const lockedTarget = room.players.get(e.attackTargetId);
        if (lockedTarget && lockedTarget.alive) {
          if (e.type === 'charger' || e.type === 'boss') {
            const cdx = lockedTarget.x - e.x;
            const cdy = lockedTarget.y - e.y;
            const cd = Math.hypot(cdx, cdy) || 1;
            const dashBase = e.type === 'boss' ? BOSS_DASH_DISTANCE : ENEMY_CHARGER_DASH_DISTANCE;
            const dash = Math.min(dashBase, Math.max(0, cd - 1));
            e.x = clamp(e.x + (cdx / cd) * dash, er, WORLD_WIDTH - er);
            e.y = clamp(e.y + (cdy / cd) * dash, er, WORLD_HEIGHT - er);
          }

          const adx = e.x - lockedTarget.x;
          const ady = e.y - lockedTarget.y;
          const bonusRange = e.type === 'boss' ? 20 : (e.type === 'charger' ? 8 : 0);
          const hitRange = rr + bonusRange;
          const baseDamage = e.type === 'boss' ? BOSS_ATTACK_DAMAGE : ENEMY_ATTACK_DAMAGE;
          const damage = Math.max(1, Math.round(baseDamage * Math.max(1, Number(e.damageMul) || 1)));
          if (adx * adx + ady * ady <= hitRange * hitRange) {
            applyEnemyHitToPlayer(room, lockedTarget, damage, now, true);
          }
        }
        e.attackWindupMs = 0;
        e.attackCooldownMs = getEnemyAttackCooldownMs(e);
        e.attackTargetId = null;
      }
      continue;
    }

    if (e.attackCooldownMs <= 0 && (e.x - target.x) ** 2 + (e.y - target.y) ** 2 <= rr * rr && target.alive) {
      e.vx = 0;
      e.vy = 0;
      e.attackWindupMs = e.type === 'boss' ? BOSS_ATTACK_WINDUP_MS : ENEMY_ATTACK_WINDUP_MS;
      e.attackTargetId = target.id;
      continue;
    }

    e.vx = (dx / d) * speed;
    e.vy = (dy / d) * speed;
    e.x = clamp(e.x + e.vx * dtSec, er, WORLD_WIDTH - er);
    e.y = clamp(e.y + e.vy * dtSec, er, WORLD_HEIGHT - er);
  }


  for (let i = room.xpOrbs.length - 1; i >= 0; i -= 1) {
    const orb = room.xpOrbs[i];
    orb.ttlMs -= dtSec * 1000;
    if (orb.ttlMs <= 0) {
      room.xpOrbs.splice(i, 1);
      continue;
    }

    let target = null;
    let bestD2 = Infinity;
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
    if (!target) continue;

    const pickupR = Math.max(30, Number(target.pickupRadius) || PLAYER_PICKUP_RADIUS_BASE);
    const dist = Math.sqrt(bestD2);
    if (dist <= PLAYER_RADIUS + 8) {
      gainPlayerXp(room, target, orb.xp, now);
      room.xpOrbs.splice(i, 1);
      continue;
    }

    if (dist <= pickupR) {
      const nx = dist > 0.001 ? (target.x - orb.x) / dist : 0;
      const ny = dist > 0.001 ? (target.y - orb.y) / dist : 0;
      orb.x += nx * XP_ORB_PULL_SPEED * dtSec;
      orb.y += ny * XP_ORB_PULL_SPEED * dtSec;
    }
  }

  for (let i = room.drops.length - 1; i >= 0; i -= 1) {
    const drop = room.drops[i];
    drop.ttlMs -= dtSec * 1000;
    if (drop.ttlMs <= 0) {
      room.drops.splice(i, 1);
      continue;
    }

    let picked = false;
    for (const p of room.players.values()) {
      if (!p.alive) continue;
      const dx = p.x - drop.x;
      const dy = p.y - drop.y;
      const rr = PLAYER_RADIUS + DROP_RADIUS;
      if (dx * dx + dy * dy <= rr * rr) {
        setPlayerWeapon(p, drop.weaponKey);
        sendTo(p.ws, { type: 'system', message: `Picked ${WEAPONS[drop.weaponKey].label}` });
        broadcastRoom(room, { type: 'system', message: `${p.name} picked ${WEAPONS[drop.weaponKey].label}.` });
        room.drops.splice(i, 1);
        picked = true;
        break;
      }
    }

    if (picked) continue;
  }

  for (let i = room.skillOrbs.length - 1; i >= 0; i -= 1) {
    const orb = room.skillOrbs[i];
    orb.ttlMs -= dtSec * 1000;
    if (orb.ttlMs <= 0) room.skillOrbs.splice(i, 1);
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

  for (const p of room.players.values()) {
    captureReplayFrame(room, p.runReplay, now);
  }
}

let lastLoopAt = Date.now();
setInterval(() => {
  const now = Date.now();
  const elapsedMs = Math.min(150, now - lastLoopAt);
  lastLoopAt = now;

  for (const room of rooms.values()) {
    room.accumulatorMs = (room.accumulatorMs || 0) + elapsedMs;
    const tickMs = room.tickMs || (1000 / DEFAULT_ROOM_SYNC.tickRate);

    let steps = 0;
    while (room.accumulatorMs >= tickMs && steps < 8) {
      tickRoom(room, tickMs / 1000, now);
      room.accumulatorMs -= tickMs;
      steps += 1;
    }

    if (room.accumulatorMs > tickMs * 8) {
      room.accumulatorMs = tickMs * 2;
    }

    room.stateAccumulatorMs = (room.stateAccumulatorMs || 0) + elapsedMs;
    const stateIntervalMs = room.stateIntervalMs || (1000 / DEFAULT_ROOM_SYNC.stateSendHz);
    if (room.players.size > 0 && room.stateAccumulatorMs >= stateIntervalMs) {
      room.stateAccumulatorMs %= stateIntervalMs;
      broadcastRoom(room, { type: 'state', payload: serializeRoom(room) });
    }
  }
}, MAIN_LOOP_MS);

setInterval(() => {
  publishRuntimeRegistry();
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
