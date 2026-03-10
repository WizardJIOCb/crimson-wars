const fs = require('fs');
const Database = require('better-sqlite3');

const INSTANCE_STALE_MS = 15000;
const ROOM_STALE_MS = 15000;

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
  };
}

function createRuntimeRegistryStore({ dataDir, dbPath, instanceId }) {
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
    '  room_count INTEGER NOT NULL DEFAULT 0',
    ');',
    'CREATE TABLE IF NOT EXISTS room_registry (',
    '  room_code TEXT PRIMARY KEY,',
    '  instance_id TEXT NOT NULL,',
    '  player_count INTEGER NOT NULL DEFAULT 0,',
    '  max_players INTEGER NOT NULL DEFAULT 0,',
    '  started_at INTEGER NOT NULL,',
    '  updated_at INTEGER NOT NULL,',
    '  is_shutting_down INTEGER NOT NULL DEFAULT 0',
    ');',
    'CREATE INDEX IF NOT EXISTS idx_room_registry_instance ON room_registry(instance_id);',
    'CREATE INDEX IF NOT EXISTS idx_room_registry_updated ON room_registry(updated_at);',
  ].join('\n'));

  const stmtUpsertInstance = db.prepare([
    'INSERT INTO instance_registry (instance_id, started_at, heartbeat_at, is_shutting_down, online_sockets, in_game_players, in_menu_sockets, room_count)',
    'VALUES (@instanceId, @startedAt, @heartbeatAt, @isShuttingDown, @onlineSockets, @inGamePlayers, @inMenuSockets, @roomCount)',
    'ON CONFLICT(instance_id) DO UPDATE SET',
    '  started_at=excluded.started_at,',
    '  heartbeat_at=excluded.heartbeat_at,',
    '  is_shutting_down=excluded.is_shutting_down,',
    '  online_sockets=excluded.online_sockets,',
    '  in_game_players=excluded.in_game_players,',
    '  in_menu_sockets=excluded.in_menu_sockets,',
    '  room_count=excluded.room_count',
  ].join('\n'));
  const stmtDeleteRoomsByInstance = db.prepare('DELETE FROM room_registry WHERE instance_id = ?');
  const stmtInsertRoom = db.prepare([
    'INSERT INTO room_registry (room_code, instance_id, player_count, max_players, started_at, updated_at, is_shutting_down)',
    'VALUES (@roomCode, @instanceId, @playerCount, @maxPlayers, @startedAt, @updatedAt, @isShuttingDown)',
    'ON CONFLICT(room_code) DO UPDATE SET',
    '  instance_id=excluded.instance_id,',
    '  player_count=excluded.player_count,',
    '  max_players=excluded.max_players,',
    '  started_at=excluded.started_at,',
    '  updated_at=excluded.updated_at,',
    '  is_shutting_down=excluded.is_shutting_down',
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
  const stmtDeleteStaleRooms = db.prepare('DELETE FROM room_registry WHERE updated_at < ?');
  const stmtDeleteStaleInstances = db.prepare('DELETE FROM instance_registry WHERE heartbeat_at < ?');
  const stmtDeleteRoomsForStaleInstances = db.prepare([
    'DELETE FROM room_registry',
    'WHERE instance_id IN (SELECT instance_id FROM instance_registry WHERE heartbeat_at < ?)',
  ].join('\n'));
  const stmtDeleteInstance = db.prepare('DELETE FROM instance_registry WHERE instance_id = ?');

  const txPublishRooms = db.transaction((rooms, shuttingDown) => {
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
    });
  }

  function publishRooms(rooms, { isShuttingDown = false } = {}) {
    pruneStale();
    txPublishRooms(Array.isArray(rooms) ? rooms : [], isShuttingDown);
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
