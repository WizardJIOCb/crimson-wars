const path = require('path');
const http = require('http');
const fs = require('fs');
const express = require('express');
const WebSocket = require('ws');
const Database = require('better-sqlite3');

const { WebSocketServer } = WebSocket;

const PORT = process.env.PORT || 8080;
const TICK_RATE = 45;
const TICK_MS = 1000 / TICK_RATE;
const MAX_PLAYERS = 8;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1400;
const PLAYER_RADIUS = 18;
const ENEMY_RADIUS = 18;
const BULLET_RADIUS = 4;
const DROP_RADIUS = 16;

const PLAYER_SPEED = 340;
const PLAYER_HP_MAX = 100;
const ENEMY_SPEED_MIN = 75;
const ENEMY_SPEED_MAX = 135;
const ENEMY_HP_BASE = 22;
const ENEMY_SPAWN_INTERVAL_MS = 760;
const DROP_LIFETIME_MS = 15000;
const TREE_COUNT = 65;
const LEADERBOARD_LIMIT = 500;
const LEADERBOARD_PAGE_SIZE = 10;
const DATA_DIR = path.join(__dirname, 'data');
const RECORDS_DB_PATH = path.join(DATA_DIR, 'records.db');

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
const wss = new WebSocketServer({ server });

const rooms = new Map();
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

function getOrCreateRoom(requestedCode) {
  const provided = cleanRoomCode(requestedCode);
  let code = provided;

  if (!code) {
    do {
      code = randomRoomCode();
    } while (rooms.has(code));
  }

  if (!rooms.has(code)) {
    rooms.set(code, {
      code,
      players: new Map(),
      bullets: [],
      enemies: [],
      drops: [],
      scores: new Map(),
      kills: new Map(),
      nextEnemyId: 1,
      nextBulletId: 1,
      nextDropId: 1,
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
    })),
    bullets: room.bullets.map((b) => ({
      id: b.id,
      ownerId: b.ownerId,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      color: b.color,
    })),
    enemies: room.enemies.map((e) => ({
      id: e.id,
      x: e.x,
      y: e.y,
      hp: e.hp,
      maxHp: e.maxHp,
    })),
    drops: room.drops.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      weaponKey: d.weaponKey,
      weaponLabel: WEAPONS[d.weaponKey].label,
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

function spawnEnemy(room) {
  const pos = randomSpawnEdge();
  const hp = ENEMY_HP_BASE + Math.floor((Date.now() - room.startedAt) / 25000) * 2;
  room.enemies.push({
    id: room.nextEnemyId++,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    speed: ENEMY_SPEED_MIN + Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN),
  });
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

function joinRoom(ws, join) {
  const room = getOrCreateRoom(join?.roomCode);

  if (room.players.size >= MAX_PLAYERS) {
    sendTo(ws, { type: 'joinError', message: `Room ${room.code} is full (8/8).` });
    return null;
  }

  const id = Math.random().toString(36).slice(2, 10);
  const name = (join?.name || 'Fighter').toString().trim().slice(0, 18) || 'Fighter';
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
    weaponKey: 'pistol',
    weaponAmmo: null,
    joinedAt: Date.now(),
  };

  room.players.set(id, player);
  room.scores.set(id, 0);
  room.kills.set(id, 0);

  sendTo(ws, {
    type: 'welcome',
    id,
    roomCode: room.code,
    tickRate: TICK_RATE,
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

    if (msg.type === 'input') {
      current.moveX = clamp(Number(msg.moveX) || 0, -1, 1);
      current.moveY = clamp(Number(msg.moveY) || 0, -1, 1);
      current.aimX = clamp(Number(msg.aimX) || current.x, 0, WORLD_WIDTH);
      current.aimY = clamp(Number(msg.aimY) || current.y, 0, WORLD_HEIGHT);
      current.shooting = Boolean(msg.shooting);
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
    if (!player) return;
    removePlayer(player);
  });
});

function tickRoom(room, dtSec, now) {
  if (room.players.size > 0 && now - room.lastEnemySpawnAt >= ENEMY_SPAWN_INTERVAL_MS) {
    room.lastEnemySpawnAt = now;
    spawnEnemy(room);
  }

  for (const p of room.players.values()) {
    if (!p.alive) {
      if (now >= p.respawnAt) {
        const spawn = randomPlayerSpawn();
        p.x = spawn.x;
        p.y = spawn.y;
        p.hp = PLAYER_HP_MAX;
        p.alive = true;
      }
      continue;
    }

    const moveLen = Math.hypot(p.moveX, p.moveY);
    const nx = moveLen > 0 ? p.moveX / moveLen : 0;
    const ny = moveLen > 0 ? p.moveY / moveLen : 0;

    p.x = clamp(p.x + nx * PLAYER_SPEED * dtSec, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    p.y = clamp(p.y + ny * PLAYER_SPEED * dtSec, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

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
    for (let ei = room.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = room.enemies[ei];
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const rr = ENEMY_RADIUS + BULLET_RADIUS;
      if (dx * dx + dy * dy <= rr * rr) {
        e.hp -= b.damage;
        hit = true;
        if (e.hp <= 0) {
          room.enemies.splice(ei, 1);
          room.scores.set(b.ownerId, (room.scores.get(b.ownerId) || 0) + 10);
          room.kills.set(b.ownerId, (room.kills.get(b.ownerId) || 0) + 1);
          maybeSpawnDrop(room, e.x, e.y);
        }
        break;
      }
    }

    if (hit) {
      room.bullets.splice(i, 1);
    }
  }

  for (const e of room.enemies) {
    const target = nearestAlivePlayer(room, e.x, e.y);
    if (!target) continue;

    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const d = Math.hypot(dx, dy) || 1;

    e.vx = (dx / d) * e.speed;
    e.vy = (dy / d) * e.speed;
    e.x = clamp(e.x + e.vx * dtSec, ENEMY_RADIUS, WORLD_WIDTH - ENEMY_RADIUS);
    e.y = clamp(e.y + e.vy * dtSec, ENEMY_RADIUS, WORLD_HEIGHT - ENEMY_RADIUS);

    const rr = ENEMY_RADIUS + PLAYER_RADIUS;
    if ((e.x - target.x) ** 2 + (e.y - target.y) ** 2 <= rr * rr && target.alive) {
      target.hp -= 30 * dtSec;
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        target.respawnAt = now + 3000;
        target.shooting = false;
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

  broadcastRoom(room, { type: 'state', payload: serializeRoom(room) });
}

let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const dtSec = Math.min(0.05, (now - lastTick) / 1000);
  lastTick = now;

  for (const room of rooms.values()) {
    tickRoom(room, dtSec, now);
  }
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
