const path = require('path');
const http = require('http');
const fs = require('fs');
const express = require('express');
const WebSocket = require('ws');
const Database = require('better-sqlite3');

const { WebSocketServer } = WebSocket;

const PORT = process.env.PORT || 8080;
const MAIN_LOOP_RATE = 120;
const MAIN_LOOP_MS = 1000 / MAIN_LOOP_RATE;
const MAX_PLAYERS = 8;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1400;
const PLAYER_RADIUS = 18;
const ENEMY_RADIUS = 18;
const BULLET_RADIUS = 4;
const DROP_RADIUS = 16;

const PLAYER_SPEED = 340;
const PLAYER_HP_MAX = 100;
const PLAYER_DODGE_DISTANCE = 165;
const PLAYER_DODGE_COOLDOWN_MS = 1200;
const PLAYER_DODGE_MAX_CHARGES = 2;
const PLAYER_DODGE_INVULN_MS = 220;
const ENEMY_SPEED_MIN = 75;
const ENEMY_SPEED_MAX = 135;
const ENEMY_HP_BASE = 22;
const ENEMY_SPAWN_INTERVAL_MS = 760;
const ENEMY_ATTACK_WINDUP_MS = 500;
const ENEMY_ATTACK_DAMAGE = 16;
const ENEMY_ATTACK_BASE_COOLDOWN_MS = 1000;
const ENEMY_ATTACK_MIN_COOLDOWN_MS = 150;
const ENEMY_ATTACK_CAST_FREQUENCY = 0;
const ENEMY_CHARGER_DASH_DISTANCE = 120;
const ENEMY_RANGED_DAMAGE = 10;
const ENEMY_RANGED_BULLET_SPEED = 520;
const ENEMY_RANGED_BULLET_LIFE_MS = 1300;
const ENEMY_RANGED_FIRE_COOLDOWN_MS = 900;
const ENEMY_RANGED_MIN_RANGE = 170;
const ENEMY_RANGED_MAX_RANGE = 280;
const BOSS_KILL_INTERVAL = 50;
const BOSS_PORTAL_WARN_MS = 4200;
const BOSS_RADIUS = 42;
const BOSS_SPRITE_SCALE = 2.6;
const BOSS_HP_BASE = 520;
const BOSS_SPEED = 88;
const BOSS_ATTACK_DAMAGE = 30;
const BOSS_ATTACK_WINDUP_MS = 820;
const BOSS_ATTACK_COOLDOWN_MS = 1300;
const BOSS_DASH_DISTANCE = 180;
const PLAYER_SLOW_FACTOR = 0.8;
const PLAYER_SLOW_DURATION_MS = 600;
const DROP_LIFETIME_MS = 30000;
const TREE_COUNT = 65;
const LEADERBOARD_LIMIT = 500;
const LEADERBOARD_PAGE_SIZE = 10;
const DATA_DIR = path.join(__dirname, 'data');
const RECORDS_DB_PATH = path.join(DATA_DIR, 'records.db');

const DEFAULT_ROOM_SYNC = {
  tickRate: 45,
  stateSendHz: 30,
  netRenderDelayMs: 90,
  maxExtrapolationMs: 80,
  entityInterpRate: 16,
  bulletCorrectionRate: 18,
  inputSendHz: 30,
};

const WEAPONS = {
  pistol: {
    label: 'Pistol',
    cooldownMs: 170,
    pellets: 1,
    spreadDeg: 1.5,
    bulletSpeed: 920,
    bulletLifeMs: 1300,
    bulletDamage: 11,
    ammo: null,
    color: '#f59e0b',
  },
  smg: {
    label: 'SMG',
    cooldownMs: 85,
    pellets: 1,
    spreadDeg: 4,
    bulletSpeed: 860,
    bulletLifeMs: 950,
    bulletDamage: 8,
    ammo: 220,
    color: '#38bdf8',
  },
  shotgun: {
    label: 'Shotgun',
    cooldownMs: 430,
    pellets: 7,
    spreadDeg: 20,
    bulletSpeed: 770,
    bulletLifeMs: 470,
    bulletDamage: 7,
    ammo: 46,
    color: '#f97316',
  },
  sniper: {
    label: 'Sniper',
    cooldownMs: 700,
    pellets: 1,
    spreadDeg: 0.2,
    bulletSpeed: 1220,
    bulletLifeMs: 1700,
    bulletDamage: 44,
    ammo: 40,
    color: '#e5e7eb',
  },
};

const DROP_WEAPON_KEYS = ['smg', 'shotgun', 'sniper'];

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map();
const activeSockets = new Set();
const records = [];
let recordsDb = null;
let stmtInsertRecord = null;
let stmtPruneRecords = null;
let stmtTopRecords = null;

function normalizeRecordEntry(entry) {
  return {
    name: (entry?.name || 'Unknown').toString().slice(0, 18),
    kills: Math.max(0, Number(entry?.kills) || 0),
    score: Math.max(0, Number(entry?.score) || 0),
    roomCode: (entry?.roomCode || '-').toString().slice(0, 12),
    durationSec: Math.max(1, Number(entry?.durationSec) || 1),
    at: Math.max(0, Number(entry?.at) || Date.now()),
  };
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
function loadRecordsFromDb() {
  if (!recordsDb || !stmtTopRecords) return;
  const rows = stmtTopRecords.all(LEADERBOARD_LIMIT);
  records.length = 0;
  for (const row of rows) {
    records.push({
      name: row.name,
      kills: row.kills,
      score: row.score,
      roomCode: row.roomCode,
      durationSec: row.durationSec,
      at: row.at,
    });
  }
}

function initRecordsStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    recordsDb = new Database(RECORDS_DB_PATH);
    recordsDb.pragma('journal_mode = WAL');
    recordsDb.pragma('synchronous = NORMAL');

    recordsDb.exec([
      'CREATE TABLE IF NOT EXISTS records (',
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
      '  name TEXT NOT NULL,',
      '  kills INTEGER NOT NULL,',
      '  score INTEGER NOT NULL,',
      '  room_code TEXT NOT NULL,',
      '  duration_sec INTEGER NOT NULL,',
      '  at INTEGER NOT NULL',
      ');',
      'CREATE INDEX IF NOT EXISTS idx_records_rank ON records (kills DESC, score DESC, at DESC);',
    ].join('\n'));

    stmtInsertRecord = recordsDb.prepare([
      'INSERT INTO records (name, kills, score, room_code, duration_sec, at)',
      'VALUES (@name, @kills, @score, @roomCode, @durationSec, @at)',
    ].join('\n'));

    stmtPruneRecords = recordsDb.prepare([
      'DELETE FROM records',
      'WHERE id NOT IN (',
      '  SELECT id FROM records',
      '  ORDER BY kills DESC, score DESC, at DESC',
      '  LIMIT ?',
      ')',
    ].join('\n'));

    stmtTopRecords = recordsDb.prepare([
      'SELECT',
      '  name,',
      '  kills,',
      '  score,',
      '  room_code AS roomCode,',
      '  duration_sec AS durationSec,',
      '  at',
      'FROM records',
      'ORDER BY kills DESC, score DESC, at DESC',
      'LIMIT ?',
    ].join('\n'));

    loadRecordsFromDb();
    console.log(`Records DB ready: ${RECORDS_DB_PATH} (loaded ${records.length})`);
  } catch (err) {
    recordsDb = null;
    stmtInsertRecord = null;
    stmtPruneRecords = null;
    stmtTopRecords = null;
    console.error('Records DB init failed, using in-memory records only:', err.message);
  }
}
function listRecordsForLobby(page = 1, pageSize = LEADERBOARD_PAGE_SIZE) {
  const total = records.length;
  const size = Math.max(1, Math.min(50, Math.floor(pageSize) || LEADERBOARD_PAGE_SIZE));
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
  const start = (currentPage - 1) * size;
  const items = records.slice(start, start + size);

  return {
    page: currentPage,
    pageSize: size,
    total,
    totalPages,
    items,
  };
}

function pushRecord(entry) {
  const normalized = normalizeRecordEntry(entry);
  records.push(normalized);
  records.sort((a, b) => (b.kills - a.kills) || (b.score - a.score) || (b.at - a.at));
  if (records.length > LEADERBOARD_LIMIT) records.length = LEADERBOARD_LIMIT;

  if (!recordsDb || !stmtInsertRecord || !stmtPruneRecords) return;
  try {
    stmtInsertRecord.run(normalized);
    stmtPruneRecords.run(LEADERBOARD_LIMIT);
  } catch (err) {
    console.error('Records DB write failed:', err.message);
  }
}

initRecordsStore();


function getPresenceStats() {
  let inGame = 0;
  for (const room of rooms.values()) {
    inGame += room.players.size;
  }

  const online = activeSockets.size;
  const inMenu = Math.max(0, online - inGame);
  return { online, inGame, inMenu };
}

function listRoomsForLobby() {
  return Array.from(rooms.values())
    .filter((room) => room.players.size > 0)
    .sort((a, b) => (b.players.size - a.players.size) || a.code.localeCompare(b.code))
    .slice(0, 40)
    .map((room) => ({
      code: room.code,
      players: room.players.size,
      maxPlayers: MAX_PLAYERS,
      startedAt: room.startedAt,
    }));
}

app.get('/api/rooms', (_req, res) => {
  res.json({
    rooms: listRoomsForLobby(),
    presence: getPresenceStats(),
    now: Date.now(),
  });
});

app.get('/api/records', (req, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.page_size) || LEADERBOARD_PAGE_SIZE;
  const payload = listRecordsForLobby(page, pageSize);

  res.json({
    records: payload.items,
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
    totalPages: payload.totalPages,
    now: Date.now(),
  });
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
      sync,
      tickMs: 1000 / sync.tickRate,
      stateIntervalMs: 1000 / sync.stateSendHz,
      stateAccumulatorMs: 0,
      accumulatorMs: 0,
      players: new Map(),
      bullets: [],
      enemies: [],
      drops: [],
      scores: new Map(),
      kills: new Map(),
      nextEnemyId: 1,
      nextBulletId: 1,
      nextDropId: 1,
      nextPortalId: 1,
      bossPortals: [],
      totalEnemyKills: 0,
      nextBossAtKills: BOSS_KILL_INTERVAL,
      lastEnemySpawnAt: 0,
      startedAt: Date.now(),
      trees: generateTrees(),
    });
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

function serializeRoom(room) {
  return {
    now: Date.now(),
    roomCode: room.code,
    world: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    sync: room.sync,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      hp: p.hp,
      maxHp: PLAYER_HP_MAX,
      alive: p.alive,
      score: room.scores.get(p.id) || 0,
      kills: room.kills.get(p.id) || 0,
      weaponKey: p.weaponKey,
      weaponLabel: WEAPONS[p.weaponKey].label,
      ammo: p.weaponAmmo,
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
    })),
    bullets: room.bullets.map((b) => ({
      id: b.id,
      ownerId: b.ownerId,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      color: b.color,
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
      ttlMs: Math.max(0, bp.spawnAt - Date.now()),
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
    decor: {
      trees: room.trees,
    },
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

function spawnEnemy(room) {
  const pos = randomSpawnEdge();
  const hp = ENEMY_HP_BASE + Math.floor((Date.now() - room.startedAt) / 25000) * 2;
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
    speed: (ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN)) * speedMul,
    attackWindupMs: 0,
    attackCooldownMs: 0,
    attackTargetId: null,
  });
}

function spawnBossEnemy(room, x, y, now) {
  const elapsedMul = 1 + Math.floor((now - room.startedAt) / 60000) * 0.18;
  const hp = Math.round(BOSS_HP_BASE * elapsedMul);
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
    speed: BOSS_SPEED,
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
  if (enemy?.type === 'boss') return BOSS_ATTACK_COOLDOWN_MS;
  const castFrequency = Math.max(0, Number(ENEMY_ATTACK_CAST_FREQUENCY) || 0);
  const effective = ENEMY_ATTACK_BASE_COOLDOWN_MS / (1 + castFrequency);
  return Math.max(ENEMY_ATTACK_MIN_COOLDOWN_MS, Math.round(effective));
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

  for (let i = 0; i < weapon.pellets; i += 1) {
    const spread = (Math.random() - 0.5) * (weapon.spreadDeg * Math.PI / 180);
    const angle = baseAngle + spread;
    room.bullets.push({
      id: room.nextBulletId++,
      ownerId: player.id,
      fromEnemy: false,
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * weapon.bulletSpeed,
      vy: Math.sin(angle) * weapon.bulletSpeed,
      lifeMs: weapon.bulletLifeMs,
      damage: weapon.bulletDamage,
      color: weapon.color,
    });
  }

  player.fireCooldownLeft = weapon.cooldownMs;

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
  room.bullets.push({
    id: room.nextBulletId++,
    ownerId: null,
    fromEnemy: true,
    x: enemy.x,
    y: enemy.y,
    vx: (dx / d) * ENEMY_RANGED_BULLET_SPEED,
    vy: (dy / d) * ENEMY_RANGED_BULLET_SPEED,
    lifeMs: ENEMY_RANGED_BULLET_LIFE_MS,
    damage: ENEMY_RANGED_DAMAGE,
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
  if ((Number(target.dodgeInvulnUntil) || 0) > now) return;
  target.hp -= damage;
  if (applySlow) target.slowUntil = Math.max(target.slowUntil || 0, now + PLAYER_SLOW_DURATION_MS);
  if (target.hp <= 0) {
    downPlayer(room, target, now);
  }
}

function downPlayer(room, target, now) {
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
  setPlayerWeapon(target, 'pistol');
  pushRecord({
    name: target.name,
    kills: room.kills.get(target.id) || 0,
    score: room.scores.get(target.id) || 0,
    roomCode: room.code,
    durationSec: Math.max(1, Math.floor((now - (target.joinedAt || now)) / 1000)),
    at: now,
  });
  broadcastRoom(room, { type: 'system', message: `${target.name} was downed.` });
}

function joinRoom(ws, join) {
  const room = getOrCreateRoom(join?.roomCode, join?.sync);

  if (room.players.size >= MAX_PLAYERS) {
    sendTo(ws, { type: 'joinError', message: `Room ${room.code} is full (8/8).` });
    return null;
  }

  const id = Math.random().toString(36).slice(2, 10);
  const name = (join?.name || 'Fighter').toString().trim().slice(0, 18) || 'Fighter';
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
    weaponKey: 'pistol',
    weaponAmmo: null,
    playerClass,
    netQuality: 0,
    netPingMs: 0,
    joinedAt: Date.now(),
  };

  room.players.set(id, player);
  room.scores.set(id, 0);
  room.kills.set(id, 0);

  sendTo(ws, {
    type: 'welcome',
    id,
    roomCode: room.code,
    tickRate: room.sync.tickRate,
    sync: room.sync,
    maxPlayers: MAX_PLAYERS,
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
  room.scores.delete(player.id);
  room.kills.delete(player.id);

  broadcastRoom(room, { type: 'system', message: `${player.name} left room ${room.code}.` });

  if (room.players.size === 0) {
    rooms.delete(room.code);
  }
}

wss.on('connection', (ws) => {
  activeSockets.add(ws);
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

    if (msg.type === 'leave') {
      removePlayer(current);
      player = null;
    }
  });

  ws.on('close', () => {
    activeSockets.delete(ws);
    if (!player) return;
    removePlayer(player);
  });
});

function tickRoom(room, dtSec, now) {
  if (room.players.size > 0 && now - room.lastEnemySpawnAt >= ENEMY_SPAWN_INTERVAL_MS) {
    room.lastEnemySpawnAt = now;
    spawnEnemy(room);
  }

  if (room.players.size > 0) {
    maybeScheduleBossSpawn(room, now);
  }

  for (let i = room.bossPortals.length - 1; i >= 0; i -= 1) {
    const portal = room.bossPortals[i];
    if (now >= portal.spawnAt) {
      spawnBossEnemy(room, portal.x, portal.y, now);
      room.bossPortals.splice(i, 1);
    }
  }

  for (const p of room.players.values()) {
    if (!p.alive) {
      if (now >= p.respawnAt) {
        const spawn = randomPlayerSpawn();
        p.x = spawn.x;
        p.y = spawn.y;
        p.hp = PLAYER_HP_MAX;
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
    const speedMul = slowed ? PLAYER_SLOW_FACTOR : 1;

    p.x = clamp(p.x + nx * PLAYER_SPEED * speedMul * dtSec, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    p.y = clamp(p.y + ny * PLAYER_SPEED * speedMul * dtSec, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

    p.fireCooldownLeft = Math.max(0, p.fireCooldownLeft - dtSec * 1000);

    if (p.shooting && p.fireCooldownLeft <= 0) {
      fireFromPlayer(room, p);
    }
  }

  for (let i = room.bullets.length - 1; i >= 0; i -= 1) {
    const b = room.bullets[i];
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
        const rr = (Number(e.radius) || ENEMY_RADIUS) + BULLET_RADIUS;
        if (dx * dx + dy * dy <= rr * rr) {
          e.hp -= b.damage;
          hit = true;
          if (e.hp <= 0) {
            room.enemies.splice(ei, 1);
            room.scores.set(b.ownerId, (room.scores.get(b.ownerId) || 0) + 10);
            room.kills.set(b.ownerId, (room.kills.get(b.ownerId) || 0) + 1);
            room.totalEnemyKills = (room.totalEnemyKills || 0) + 1;
            maybeScheduleBossSpawn(room, now);
            maybeSpawnDrop(room, e.x, e.y);
          }
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
          const damage = e.type === 'boss' ? BOSS_ATTACK_DAMAGE : ENEMY_ATTACK_DAMAGE;
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
server.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});

