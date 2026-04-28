const fs = require('fs');
const Database = require('better-sqlite3');
const { createMysqlSyncClient, escapeSql } = require('./mysql-sync');

const INSTANCE_STALE_MS = 15000;
const ROOM_STALE_MS = 15000;
const MYSQL_RUNTIME_PERSIST_INTERVAL_MS = 15000;

function nowMs() {
  return Date.now();
}

function parseRoomRow(row) {
  if (!row) return null;
  return {
    code: (row.room_code || '').toString(),
    players: Math.max(0, Number(row.player_count) || 0),
    maxPlayers: Math.max(0, Number(row.max_players) || 0),
    startedAt: Math.max(0, Number(row.started_at) || 0),
    updatedAt: Math.max(0, Number(row.updated_at) || 0),
    instanceId: (row.instance_id || '').toString(),
    isShuttingDown: !!row.is_shutting_down,
    publicBaseUrl: (row.public_base_url || '').toString(),
  };
}

function parseInstanceRow(row) {
  if (!row) return null;
  return {
    instanceId: (row.instance_id || '').toString(),
    startedAt: Math.max(0, Number(row.started_at) || 0),
    heartbeatAt: Math.max(0, Number(row.heartbeat_at) || 0),
    isShuttingDown: !!row.is_shutting_down,
    onlineSockets: Math.max(0, Number(row.online_sockets) || 0),
    inGamePlayers: Math.max(0, Number(row.in_game_players) || 0),
    inMenuSockets: Math.max(0, Number(row.in_menu_sockets) || 0),
    roomCount: Math.max(0, Number(row.room_count) || 0),
    publicBaseUrl: (row.public_base_url || '').toString(),
  };
}

function createMysqlRuntimeRegistryStore({ instanceId, mysql }) {
  const client = createMysqlSyncClient(mysql);
  let localInstance = null;
  let localRooms = [];
  let lastPersistAt = 0;
  let lastPruneAt = 0;
  let lastPersistErrorAt = 0;

  function pruneStale() {
    const now = nowMs();
    client.execute(`DELETE FROM room_registry WHERE instance_id IN (SELECT instance_id FROM instance_registry WHERE heartbeat_at < ${escapeSql(now - INSTANCE_STALE_MS)})`);
    client.execute(`DELETE FROM instance_registry WHERE heartbeat_at < ${escapeSql(now - INSTANCE_STALE_MS)}`);
    client.execute(`DELETE FROM room_registry WHERE updated_at < ${escapeSql(now - ROOM_STALE_MS)}`);
  }

  function publishInstance(payload) {
    const now = nowMs();
    localInstance = {
      instanceId,
      startedAt: Math.max(0, Number(payload.startedAt) || 0),
      heartbeatAt: now,
      isShuttingDown: !!payload.isShuttingDown,
      onlineSockets: Math.max(0, Number(payload.onlineSockets) || 0),
      inGamePlayers: Math.max(0, Number(payload.inGamePlayers) || 0),
      inMenuSockets: Math.max(0, Number(payload.inMenuSockets) || 0),
      roomCount: Math.max(0, Number(payload.roomCount) || 0),
      publicBaseUrl: String(payload.publicBaseUrl || '').trim(),
    };
  }

  function buildPersistSql(now) {
    if (!localInstance) return '';
    const sql = [];
    if (now - lastPruneAt >= INSTANCE_STALE_MS) {
      lastPruneAt = now;
      sql.push(`DELETE FROM room_registry WHERE instance_id IN (SELECT instance_id FROM instance_registry WHERE heartbeat_at < ${escapeSql(now - INSTANCE_STALE_MS)})`);
      sql.push(`DELETE FROM instance_registry WHERE heartbeat_at < ${escapeSql(now - INSTANCE_STALE_MS)}`);
      sql.push(`DELETE FROM room_registry WHERE updated_at < ${escapeSql(now - ROOM_STALE_MS)}`);
    }
    sql.push([
      'INSERT INTO instance_registry (instance_id, started_at, heartbeat_at, is_shutting_down, online_sockets, in_game_players, in_menu_sockets, room_count, public_base_url)',
      `VALUES (${[
        instanceId,
        localInstance.startedAt,
        localInstance.heartbeatAt,
        localInstance.isShuttingDown ? 1 : 0,
        localInstance.onlineSockets,
        localInstance.inGamePlayers,
        localInstance.inMenuSockets,
        localRooms.length,
        localInstance.publicBaseUrl,
      ].map(escapeSql).join(', ')})`,
      'ON DUPLICATE KEY UPDATE',
      'started_at=VALUES(started_at), heartbeat_at=VALUES(heartbeat_at), is_shutting_down=VALUES(is_shutting_down),',
      'online_sockets=VALUES(online_sockets), in_game_players=VALUES(in_game_players), in_menu_sockets=VALUES(in_menu_sockets),',
      'room_count=VALUES(room_count), public_base_url=VALUES(public_base_url)',
    ].join('\n'));
    sql.push(`DELETE FROM room_registry WHERE instance_id = ${escapeSql(instanceId)}`);
    for (const room of localRooms) {
      sql.push([
        'INSERT INTO room_registry (room_code, instance_id, player_count, max_players, started_at, updated_at, is_shutting_down, public_base_url)',
        `VALUES (${[
          room.code,
          instanceId,
          Math.max(0, Number(room.players) || 0),
          Math.max(0, Number(room.maxPlayers) || 0),
          Math.max(0, Number(room.startedAt) || 0),
          Math.max(0, Number(room.updatedAt) || now),
          room.isShuttingDown ? 1 : 0,
          room.publicBaseUrl || localInstance.publicBaseUrl || '',
        ].map(escapeSql).join(', ')})`,
      ].join('\n'));
    }
    return sql.join(';\n');
  }

  function persistRuntimeRegistry({ force = false } = {}) {
    const now = nowMs();
    if (!force && now - lastPersistAt < MYSQL_RUNTIME_PERSIST_INTERVAL_MS) return;
    lastPersistAt = now;
    const sql = buildPersistSql(now);
    if (!sql) return;
    try {
      client.execute(sql);
    } catch (err) {
      if (now - lastPersistErrorAt > 30000) {
        lastPersistErrorAt = now;
        console.error('Runtime registry MySQL persist failed:', err?.message || err);
      }
    }
  }

  function publishRooms(rooms, { isShuttingDown = false, publicBaseUrl = '' } = {}) {
    const updatedAt = nowMs();
    localRooms = (Array.isArray(rooms) ? rooms : []).map((room) => parseRoomRow({
      room_code: room.code,
      instance_id: instanceId,
      player_count: Math.max(0, Number(room.players) || 0),
      max_players: Math.max(0, Number(room.maxPlayers) || 0),
      started_at: Math.max(0, Number(room.startedAt) || 0),
      updated_at: updatedAt,
      is_shutting_down: isShuttingDown ? 1 : 0,
      public_base_url: String(publicBaseUrl || '').trim(),
    })).filter(Boolean);
    persistRuntimeRegistry({ force: isShuttingDown });
  }

  function getLiveInstances() {
    const now = nowMs();
    if (!localInstance || localInstance.heartbeatAt < now - INSTANCE_STALE_MS) return [];
    return [{ ...localInstance, roomCount: localRooms.length }];
  }

  function getLiveRooms() {
    const now = nowMs();
    const liveInstances = getLiveInstances();
    if (liveInstances.length === 0) return [];
    return localRooms
      .filter((room) => room.updatedAt >= now - ROOM_STALE_MS)
      .sort((a, b) => (b.players - a.players) || a.code.localeCompare(b.code))
      .slice(0, 40)
      .map((room) => ({ ...room }));
  }

  function listRooms() {
    return getLiveRooms();
  }

  function listInstances() {
    return getLiveInstances();
  }

  function getRoomByCode(roomCode) {
    const code = (roomCode || '').toString().trim().toUpperCase();
    if (!code) return null;
    return getLiveRooms().find((room) => room.code === code) || null;
  }

  function chooseTargetInstance() {
    const instances = listInstances().filter((instance) => !instance.isShuttingDown && instance.publicBaseUrl);
    if (instances.length === 0) return null;
    instances.sort((a, b) =>
      (a.roomCount - b.roomCount)
      || (a.inGamePlayers - b.inGamePlayers)
      || (a.onlineSockets - b.onlineSockets)
      || a.instanceId.localeCompare(b.instanceId));
    const first = instances[0];
    const candidatePool = instances.filter((instance) =>
      instance.roomCount === first.roomCount
      && instance.inGamePlayers === first.inGamePlayers
      && instance.onlineSockets === first.onlineSockets);
    return candidatePool[0];
  }

  function getPresence() {
    const instances = listInstances();
    return instances.reduce((acc, instance) => {
      acc.online += instance.onlineSockets;
      acc.inGame += instance.inGamePlayers;
      acc.inMenu += instance.inMenuSockets;
      return acc;
    }, { online: 0, inGame: 0, inMenu: 0 });
  }

  function unregisterInstance() {
    localRooms = [];
    if (localInstance) localInstance = { ...localInstance, isShuttingDown: true, heartbeatAt: nowMs(), roomCount: 0 };
    try {
      client.execute([
        `DELETE FROM room_registry WHERE instance_id = ${escapeSql(instanceId)}`,
        `DELETE FROM instance_registry WHERE instance_id = ${escapeSql(instanceId)}`,
      ].join(';\n'));
    } catch {}
  }

  return {
    publishInstance,
    publishRooms,
    listRooms,
    listInstances,
    getRoomByCode,
    chooseTargetInstance,
    getPresence,
    unregisterInstance,
    pruneStale,
  };
}

function createRuntimeRegistryStore({ dataDir, dbPath, instanceId, mysql }) {
  if (mysql?.enabled) return createMysqlRuntimeRegistryStore({ instanceId, mysql });
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec([
    'CREATE TABLE IF NOT EXISTS instance_registry (',
    '  instance_id TEXT PRIMARY KEY,',
    '  started_at INTEGER NOT NULL,',
    '  heartbeat_at INTEGER NOT NULL,',
    '  is_shutting_down INTEGER NOT NULL DEFAULT 0,',
    '  online_sockets INTEGER NOT NULL DEFAULT 0,',
    '  in_game_players INTEGER NOT NULL DEFAULT 0,',
    '  in_menu_sockets INTEGER NOT NULL DEFAULT 0,',
    '  room_count INTEGER NOT NULL DEFAULT 0,',
    '  public_base_url TEXT NOT NULL DEFAULT \'\'',
    ');',
    'CREATE TABLE IF NOT EXISTS room_registry (',
    '  room_code TEXT PRIMARY KEY,',
    '  instance_id TEXT NOT NULL,',
    '  player_count INTEGER NOT NULL DEFAULT 0,',
    '  max_players INTEGER NOT NULL DEFAULT 0,',
    '  started_at INTEGER NOT NULL,',
    '  updated_at INTEGER NOT NULL,',
    '  is_shutting_down INTEGER NOT NULL DEFAULT 0,',
    '  public_base_url TEXT NOT NULL DEFAULT \'\'',
    ');',
    'CREATE TABLE IF NOT EXISTS placement_state (',
    '  key TEXT PRIMARY KEY,',
    '  value_integer INTEGER NOT NULL DEFAULT 0',
    ');',
    'CREATE INDEX IF NOT EXISTS idx_room_registry_instance ON room_registry(instance_id);',
    'CREATE INDEX IF NOT EXISTS idx_room_registry_updated ON room_registry(updated_at);',
  ].join('\n'));

  try {
    db.exec('ALTER TABLE instance_registry ADD COLUMN public_base_url TEXT NOT NULL DEFAULT \'\'');
  } catch {}
  try {
    db.exec('ALTER TABLE room_registry ADD COLUMN public_base_url TEXT NOT NULL DEFAULT \'\'');
  } catch {}

  const stmtUpsertInstance = db.prepare([
    'INSERT INTO instance_registry (instance_id, started_at, heartbeat_at, is_shutting_down, online_sockets, in_game_players, in_menu_sockets, room_count, public_base_url)',
    'VALUES (@instanceId, @startedAt, @heartbeatAt, @isShuttingDown, @onlineSockets, @inGamePlayers, @inMenuSockets, @roomCount, @publicBaseUrl)',
    'ON CONFLICT(instance_id) DO UPDATE SET',
    '  started_at=excluded.started_at,',
    '  heartbeat_at=excluded.heartbeat_at,',
    '  is_shutting_down=excluded.is_shutting_down,',
    '  online_sockets=excluded.online_sockets,',
    '  in_game_players=excluded.in_game_players,',
    '  in_menu_sockets=excluded.in_menu_sockets,',
    '  room_count=excluded.room_count,',
    '  public_base_url=excluded.public_base_url',
  ].join('\n'));
  const stmtDeleteRoomsByInstance = db.prepare('DELETE FROM room_registry WHERE instance_id = ?');
  const stmtInsertRoom = db.prepare([
    'INSERT INTO room_registry (room_code, instance_id, player_count, max_players, started_at, updated_at, is_shutting_down, public_base_url)',
    'VALUES (@roomCode, @instanceId, @playerCount, @maxPlayers, @startedAt, @updatedAt, @isShuttingDown, @publicBaseUrl)',
    'ON CONFLICT(room_code) DO UPDATE SET',
    '  instance_id=excluded.instance_id,',
    '  player_count=excluded.player_count,',
    '  max_players=excluded.max_players,',
    '  started_at=excluded.started_at,',
    '  updated_at=excluded.updated_at,',
    '  is_shutting_down=excluded.is_shutting_down,',
    '  public_base_url=excluded.public_base_url',
  ].join('\n'));
  const stmtListRooms = db.prepare([
    'SELECT r.*',
    'FROM room_registry r',
    'JOIN instance_registry i ON i.instance_id = r.instance_id',
    'WHERE r.updated_at >= ? AND i.heartbeat_at >= ?',
    'ORDER BY r.player_count DESC, r.room_code ASC',
    'LIMIT 40',
  ].join('\n'));
  const stmtListInstances = db.prepare([
    'SELECT * FROM instance_registry',
    'WHERE heartbeat_at >= ?',
    'ORDER BY instance_id ASC',
  ].join('\n'));
  const stmtGetRoomByCode = db.prepare([
    'SELECT r.*',
    'FROM room_registry r',
    'JOIN instance_registry i ON i.instance_id = r.instance_id',
    'WHERE r.room_code = ? AND r.updated_at >= ? AND i.heartbeat_at >= ?',
    'LIMIT 1',
  ].join('\n'));
  const stmtGetPlacementCursor = db.prepare('SELECT value_integer FROM placement_state WHERE key = ?');
  const stmtUpsertPlacementCursor = db.prepare([
    'INSERT INTO placement_state (key, value_integer) VALUES (?, ?)',
    'ON CONFLICT(key) DO UPDATE SET value_integer=excluded.value_integer',
  ].join('\n'));
  const stmtDeleteStaleRooms = db.prepare('DELETE FROM room_registry WHERE updated_at < ?');
  const stmtDeleteStaleInstances = db.prepare('DELETE FROM instance_registry WHERE heartbeat_at < ?');
  const stmtDeleteRoomsForStaleInstances = db.prepare([
    'DELETE FROM room_registry',
    'WHERE instance_id IN (SELECT instance_id FROM instance_registry WHERE heartbeat_at < ?)',
  ].join('\n'));
  const stmtDeleteInstance = db.prepare('DELETE FROM instance_registry WHERE instance_id = ?');

  const txPublishRooms = db.transaction((rooms, shuttingDown, publicBaseUrl) => {
    stmtDeleteRoomsByInstance.run(instanceId);
    const updatedAt = nowMs();
    for (const room of rooms) {
      stmtInsertRoom.run({
        roomCode: room.code,
        instanceId,
        playerCount: Math.max(0, Number(room.players) || 0),
        maxPlayers: Math.max(0, Number(room.maxPlayers) || 0),
        startedAt: Math.max(0, Number(room.startedAt) || 0),
        updatedAt,
        isShuttingDown: shuttingDown ? 1 : 0,
        publicBaseUrl: String(publicBaseUrl || '').trim(),
      });
    }
  });

  function pruneStale() {
    const now = nowMs();
    stmtDeleteRoomsForStaleInstances.run(now - INSTANCE_STALE_MS);
    stmtDeleteStaleInstances.run(now - INSTANCE_STALE_MS);
    stmtDeleteStaleRooms.run(now - ROOM_STALE_MS);
  }

  function publishInstance(payload) {
    pruneStale();
    stmtUpsertInstance.run({
      instanceId,
      startedAt: Math.max(0, Number(payload.startedAt) || 0),
      heartbeatAt: nowMs(),
      isShuttingDown: payload.isShuttingDown ? 1 : 0,
      onlineSockets: Math.max(0, Number(payload.onlineSockets) || 0),
      inGamePlayers: Math.max(0, Number(payload.inGamePlayers) || 0),
      inMenuSockets: Math.max(0, Number(payload.inMenuSockets) || 0),
      roomCount: Math.max(0, Number(payload.roomCount) || 0),
      publicBaseUrl: String(payload.publicBaseUrl || '').trim(),
    });
  }

  function publishRooms(rooms, { isShuttingDown = false, publicBaseUrl = '' } = {}) {
    pruneStale();
    txPublishRooms(Array.isArray(rooms) ? rooms : [], isShuttingDown, publicBaseUrl);
  }

  function listRooms() {
    pruneStale();
    const threshold = nowMs() - ROOM_STALE_MS;
    const instanceThreshold = nowMs() - INSTANCE_STALE_MS;
    return stmtListRooms.all(threshold, instanceThreshold).map(parseRoomRow);
  }

  function listInstances() {
    pruneStale();
    return stmtListInstances.all(nowMs() - INSTANCE_STALE_MS).map(parseInstanceRow);
  }

  function getRoomByCode(roomCode) {
    const code = (roomCode || '').toString().trim().toUpperCase();
    if (!code) return null;
    pruneStale();
    return parseRoomRow(stmtGetRoomByCode.get(code, nowMs() - ROOM_STALE_MS, nowMs() - INSTANCE_STALE_MS));
  }

  function chooseTargetInstance() {
    const instances = listInstances()
      .filter((instance) => !instance.isShuttingDown && instance.publicBaseUrl);
    if (instances.length === 0) return null;
    instances.sort((a, b) =>
      (a.roomCount - b.roomCount)
      || (a.inGamePlayers - b.inGamePlayers)
      || (a.onlineSockets - b.onlineSockets)
      || a.instanceId.localeCompare(b.instanceId));

    const first = instances[0];
    const candidatePool = instances.filter((instance) =>
      instance.roomCount === first.roomCount
      && instance.inGamePlayers === first.inGamePlayers
      && instance.onlineSockets === first.onlineSockets);
    if (candidatePool.length === 1) return candidatePool[0];

    const key = 'create_room_cursor';
    const row = stmtGetPlacementCursor.get(key);
    const nextIndex = Math.max(0, Number(row?.value_integer) || 0);
    const picked = candidatePool[nextIndex % candidatePool.length];
    stmtUpsertPlacementCursor.run(key, nextIndex + 1);
    return picked;
  }

  function getPresence() {
    const instances = listInstances();
    return instances.reduce((acc, instance) => {
      acc.online += instance.onlineSockets;
      acc.inGame += instance.inGamePlayers;
      acc.inMenu += instance.inMenuSockets;
      return acc;
    }, { online: 0, inGame: 0, inMenu: 0 });
  }

  function unregisterInstance() {
    stmtDeleteRoomsByInstance.run(instanceId);
    stmtDeleteInstance.run(instanceId);
  }

  return {
    publishInstance,
    publishRooms,
    listRooms,
    listInstances,
    getRoomByCode,
    chooseTargetInstance,
    getPresence,
    unregisterInstance,
    pruneStale,
  };
}

module.exports = {
  createRuntimeRegistryStore,
  INSTANCE_STALE_MS,
  ROOM_STALE_MS,
};
