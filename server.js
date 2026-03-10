const path = require('path');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');

const { WebSocketServer } = WebSocket;

const config = require('./server/config');
const { createRecordsStore } = require('./server/records-store');
const { createSkillsStore } = require('./server/skills-store');
const PORT = process.env.PORT || 8080;
const SKILLS_ADMIN_TOKEN = process.env.SKILLS_ADMIN_TOKEN || '';
const DEV_CHEATS_ENABLED = (process.env.DEV_CHEATS_ENABLED || '1') !== '0';
const DEV_CHEAT_SECRET = (process.env.DEV_CHEAT_SECRET || 'bloodmoon').toString().trim();

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
  PLAYER_SLOW_FACTOR,
  PLAYER_SLOW_DURATION_MS,
  DROP_LIFETIME_MS,
  TREE_COUNT,
  LEADERBOARD_LIMIT,
  LEADERBOARD_PAGE_SIZE,
  DATA_DIR,
  RECORDS_DB_PATH,
  SKILLS_CONFIG_PATH,
  DEFAULT_ROOM_SYNC,
  WEAPONS,
  DROP_WEAPON_KEYS,
  DEFAULT_SKILL_DEFS,
} = config;

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map();
const activeSockets = new Set();
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
  adminToken: SKILLS_ADMIN_TOKEN,
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

app.get('/admin/skills', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-skills.html'));
});

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

app.get('/api/skills', (_req, res) => {
  res.json({ skills: skillsStore.getList(), now: Date.now() });
});

app.get('/api/admin/skills', (req, res) => {
  if (!skillsStore.checkAdminToken(req)) {
    res.status(403).json({ ok: false, message: 'Forbidden' });
    return;
  }
  res.json({ ok: true, skills: skillsStore.getList() });
});

app.put('/api/admin/skills/:id', (req, res) => {
  if (!skillsStore.checkAdminToken(req)) {
    res.status(403).json({ ok: false, message: 'Forbidden' });
    return;
  }
  const id = (req.params.id || '').toString().trim().toLowerCase();
  const existing = skillsStore.getById(id);
  if (!existing) {
    res.status(404).json({ ok: false, message: 'Skill not found' });
    return;
  }
  const patch = req.body && typeof req.body === 'object' ? req.body : {};
  const result = skillsStore.updateSkill(id, patch);
  if (!result.ok) {
    res.status(result.code).json({ ok: false, message: result.message });
    return;
  }
  res.json({ ok: true, skill: result.skill });
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
      xpOrbs: [],
      scores: new Map(),
      kills: new Map(),
      nextEnemyId: 1,
      nextBulletId: 1,
      nextDropId: 1,
      nextXpOrbId: 1,
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
  const now = Date.now();
  const difficulty = getRoomDifficulty(room, now);
  const nextPortal = room.bossPortals.length > 0 ? room.bossPortals[0] : null;
  return {
    now,
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
    players: Array.from(room.players.values()).map((p) => ({
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
      level: Math.max(1, Math.floor(Number(p.level) || 1)),
      xp: Math.max(0, Math.floor(Number(p.xp) || 0)),
      xpToNext: Math.max(1, Math.floor(Number(p.xpToNext) || getXpToNextLevel(p.level || 1))),
      pendingSkillChoices: Array.isArray(p.pendingSkillChoices) ? p.pendingSkillChoices.slice(0, SKILL_PICK_OPTIONS) : [],
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
    room.bullets.push({
      id: room.nextBulletId++,
      ownerId: player.id,
      fromEnemy: false,
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * weapon.bulletSpeed,
      vy: Math.sin(angle) * weapon.bulletSpeed,
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

function queueSkillChoices(player) {
  if ((player.pendingSkillChoices?.length || 0) > 0) return;
  const picks = rollSkillChoices(player, SKILL_PICK_OPTIONS);
  player.pendingSkillChoices = picks;
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
    queueSkillChoices(player);
    sendTo(player.ws, { type: 'system', message: `Level up ${player.level}! Choose a skill.` });
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
  if (enemy.type === 'boss') return 130;
  if (enemy.type === 'charger') return 12;
  if (enemy.type === 'ranged') return 10;
  return 8;
}

function enemyTakeDamage(room, enemy, damage, ownerId, now) {
  if (!enemy) return false;
  enemy.hp -= Math.max(1, Math.round(Number(damage) || 1));
  if (enemy.hp > 0) return false;

  const idx = room.enemies.findIndex((e) => e.id === enemy.id);
  if (idx >= 0) room.enemies.splice(idx, 1);

  if (ownerId && room.players.has(ownerId)) {
    room.scores.set(ownerId, (room.scores.get(ownerId) || 0) + 10);
    room.kills.set(ownerId, (room.kills.get(ownerId) || 0) + 1);
    const killer = room.players.get(ownerId);
    if (killer) gainPlayerXp(room, killer, getEnemyXpValue(enemy), now);
  }

  room.totalEnemyKills = (room.totalEnemyKills || 0) + 1;
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

    const lvl = st.level;
    const radius = Math.max(40, (Number(def.radius) || 120) + (Number(def.radiusPerLevel) || 0) * (lvl - 1));
    const damage = Math.max(1, (Number(def.damage) || 10) + (Number(def.damagePerLevel) || 0) * (lvl - 1));
    const maxTargets = Math.max(1, Math.round((Number(def.targets) || 1) + (Number(def.targetsPerLevel) || 0) * (lvl - 1)));

    const targets = room.enemies
      .map((e) => ({ e, d2: (e.x - player.x) ** 2 + (e.y - player.y) ** 2 }))
      .filter((x) => x.d2 <= radius * radius)
      .sort((a, b) => a.d2 - b.d2)
      .slice(0, maxTargets)
      .map((x) => x.e);

    for (const enemy of targets) {
      enemyTakeDamage(room, enemy, damage * player.damageMul, player.id, now);
    }

    const baseCd = Math.max(300, Number(def.cooldownMs) || 1000);
    const cdMul = Math.max(0, Number(def.cooldownMulPerLevel) || 0);
    const lvlCdMul = Math.max(0.2, 1 - cdMul * (lvl - 1));
    st.maxCooldownMs = Math.max(220, Math.round(baseCd * lvlCdMul));
    st.cooldownMs = st.maxCooldownMs;
  }
}


function playerSelectSkill(player, skillId) {
  const pickId = (skillId || '').toString().trim().toLowerCase();
  if (!pickId) return false;
  const options = Array.isArray(player.pendingSkillChoices) ? player.pendingSkillChoices : [];
  if (!options.includes(pickId)) return false;
  const def = skillsStore.getById(pickId);
  if (!def) return false;
  const st = ensureSkillState(player, pickId);
  const nextLevel = Math.min(Number(def.maxLevel) || 1, (Number(st.level) || 0) + 1);
  st.level = nextLevel;
  st.maxCooldownMs = Math.max(0, Number(st.maxCooldownMs) || 0);
  if (!Array.isArray(player.skillOrder)) player.skillOrder = [];
  if (!player.skillOrder.includes(pickId)) player.skillOrder.push(pickId);
  player.pendingSkillChoices = [];
  player.unspentLevelUps = Math.max(0, (Number(player.unspentLevelUps) || 0) - 1);
  if (player.unspentLevelUps > 0) queueSkillChoices(player);
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
    totalEnemyKills: Math.max(0, Number(room.totalEnemyKills) || 0),
    roomAlivePlayers: Math.max(0, Number(room.players?.size) || 0),
    survivedSec: Math.max(1, Math.floor((now - (target.joinedAt || now)) / 1000)),
    skills,
  };
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
  recordsStore.pushRecord({
    name: target.name,
    kills: room.kills.get(target.id) || 0,
    score: room.scores.get(target.id) || 0,
    roomCode: room.code,
    durationSec: Math.max(1, Math.floor((now - (target.joinedAt || now)) / 1000)),
    at: now,
    runDetails: buildRunDetails(room, target, now),
  });
  broadcastRoom(room, { type: 'system', message: `${target.name} was downed.` });
}

function sendDevConsole(player, text, ok = true) {
  if (!player?.ws) return;
  sendTo(player.ws, { type: 'devConsole', ok: Boolean(ok), text: String(text || '') });
}

function grantPlayerSkillLevels(player, skillId, levels = 1) {
  const sid = (skillId || '').toString().trim().toLowerCase();
  const def = skillsStore.getById(sid);
  if (!def) return 0;
  const st = ensureSkillState(player, sid);
  const before = st.level;
  const maxLevel = Math.max(1, Number(def.maxLevel) || 1);
  st.level = Math.min(maxLevel, st.level + Math.max(1, Math.floor(Number(levels) || 1)));
  if (!Array.isArray(player.skillOrder)) player.skillOrder = [];
  if (!player.skillOrder.includes(sid)) player.skillOrder.push(sid);
  rebuildPlayerDerivedStats(player);
  return Math.max(0, st.level - before);
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
    sendDevConsole(player, 'Commands: room|roomcode, unlock <room-secret>, lock, god [on|off], weapon <pistol|smg|shotgun|sniper> [ammo], ammo <n>, heal [n], hp <n>, xp <n>, levelup [n], skill <id> [levels], spawn <normal|charger|ranged|boss> [count], killall, status');
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
    addXpAndMaybeLevel(player, amount, now);
    sendDevConsole(player, `XP +${amount} -> Lv ${player.level} (${player.xp}/${player.xpToNext})`);
    return;
  }

  if (cmd === 'levelup') {
    const count = Math.max(1, Math.min(50, Math.floor(Number(args[0]) || 1)));
    for (let i = 0; i < count; i += 1) {
      const need = Math.max(1, Number(player.xpToNext) - Number(player.xp) + 1);
      addXpAndMaybeLevel(player, need, now);
    }
    sendDevConsole(player, `Level up x${count} -> Lv ${player.level}`);
    return;
  }

  if (cmd === 'skill') {
    const sid = String(args[0] || '').toLowerCase();
    const lv = Math.max(1, Math.min(20, Math.floor(Number(args[1]) || 1)));
    if (!sid) {
      sendDevConsole(player, 'Usage: skill <id> [levels]', false);
      return;
    }
    const gained = grantPlayerSkillLevels(player, sid, lv);
    if (gained <= 0) {
      sendDevConsole(player, 'Skill not changed (already max or unknown).', false);
      return;
    }
    sendDevConsole(player, `Skill ${sid} +${gained}`);
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
    for (const e of room.enemies) {
      if (e.hp > 0) {
        enemyTakeDamage(room, e, e.hp + 9999, player.id, now);
        killed += 1;
      }
    }
    sendDevConsole(player, `Killed ${killed} enemies.`);
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
    extraDodgeCharges: 0,
    joinedAt: Date.now(),
    devUnlocked: false,
    godMode: false,
  };

  rebuildPlayerDerivedStats(player);
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
    skillCatalog: skillsStore.getList(),
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

    if (msg.type === 'skillPick') {
      const picked = playerSelectSkill(current, msg.skillId);
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
    if (!player) return;
    removePlayer(player);
  });
});

function tickRoom(room, dtSec, now) {
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
          hit = true;
          enemyTakeDamage(room, e, b.damage, b.ownerId, now);
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


