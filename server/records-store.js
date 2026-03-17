const fs = require('fs');
const Database = require('better-sqlite3');

function parseRecordRunDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function parseRecordReplay(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeRecordEntry(entry) {
  return {
    id: Math.max(0, Number(entry?.id) || 0),
    name: (entry?.name || 'Unknown').toString().slice(0, 18),
    attempts: Math.max(1, Number(entry?.attempts) || 1),
    kills: Math.max(0, Number(entry?.kills) || 0),
    score: Math.max(0, Number(entry?.score) || 0),
    roomCode: (entry?.roomCode || '-').toString().slice(0, 12),
    durationSec: Math.max(1, Number(entry?.durationSec) || 1),
    at: Math.max(0, Number(entry?.at) || Date.now()),
    runDetails: parseRecordRunDetails(entry?.runDetails),
    runReplay: parseRecordReplay(entry?.runReplay),
  };
}

function publicRecordEntry(entry) {
  return {
    id: Math.max(0, Number(entry?.id) || 0),
    name: (entry?.name || 'Unknown').toString(),
    attempts: Math.max(1, Number(entry?.attempts) || 1),
    kills: Math.max(0, Number(entry?.kills) || 0),
    score: Math.max(0, Number(entry?.score) || 0),
    roomCode: (entry?.roomCode || '-').toString(),
    durationSec: Math.max(1, Number(entry?.durationSec) || 1),
    at: Math.max(0, Number(entry?.at) || 0),
    runDetails: parseRecordRunDetails(entry?.runDetails),
  };
}

function recordNameKey(name) {
  return (name || '').toString().trim().toLowerCase();
}

function isBetterRecord(next, prev) {
  const nk = Math.max(0, Number(next?.kills) || 0);
  const pk = Math.max(0, Number(prev?.kills) || 0);
  if (nk !== pk) return nk > pk;

  const ns = Math.max(0, Number(next?.score) || 0);
  const ps = Math.max(0, Number(prev?.score) || 0);
  if (ns !== ps) return ns > ps;

  const nt = Math.max(0, Number(next?.at) || 0);
  const pt = Math.max(0, Number(prev?.at) || 0);
  return nt > pt;
}

function createRecordsStore({ dataDir, dbPath, leaderboardLimit, leaderboardPageSize }) {
  const records = [];
  const runHistory = [];
  let recordsDb = null;
  let stmtInsertRecord = null;
  let stmtPruneRecords = null;
  let stmtTopRecords = null;
  let stmtDeleteRecordByName = null;
  let stmtReplayById = null;
  let stmtInsertPlayerRun = null;
  let stmtListPlayerRuns = null;
  let stmtCountPlayerRuns = null;
  let stmtPrunePlayerRuns = null;
  let stmtPlayerRunReplayById = null;

  const PLAYER_RUN_HISTORY_LIMIT = 50000;
  const PLAYER_RUN_HISTORY_PAGE_SIZE = 20;
  const MEMORY_RUN_HISTORY_LIMIT = 300;

  function loadRecordsFromDb() {
    if (!recordsDb || !stmtTopRecords) return;
    const rows = stmtTopRecords.all(leaderboardLimit * 5);
    records.length = 0;
    const seen = new Set();
    for (const row of rows) {
      const normalized = normalizeRecordEntry({
        id: row.id,
        name: row.name,
        attempts: row.attempts,
        kills: row.kills,
        score: row.score,
        roomCode: row.roomCode,
        durationSec: row.durationSec,
        at: row.at,
        runDetails: row.runDetails,
        runReplay: row.runReplay,
      });
      const key = recordNameKey(normalized.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      records.push(normalized);
      if (records.length >= leaderboardLimit) break;
    }
  }

  function init() {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      recordsDb = new Database(dbPath);
      recordsDb.pragma('journal_mode = WAL');
      recordsDb.pragma('synchronous = NORMAL');

      recordsDb.exec([
        'CREATE TABLE IF NOT EXISTS records (',
        '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
        '  name TEXT NOT NULL,',
        '  attempts INTEGER NOT NULL DEFAULT 1,',
        '  kills INTEGER NOT NULL,',
        '  score INTEGER NOT NULL,',
        '  room_code TEXT NOT NULL,',
        '  duration_sec INTEGER NOT NULL,',
        '  at INTEGER NOT NULL,',
        '  run_details TEXT NULL,',
        '  run_replay TEXT NULL',
        ');',
        'CREATE INDEX IF NOT EXISTS idx_records_rank ON records (kills DESC, score DESC, at DESC);',
        'CREATE TABLE IF NOT EXISTS player_runs (',
        '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
        '  name TEXT NOT NULL,',
        '  name_key TEXT NOT NULL,',
        '  kills INTEGER NOT NULL,',
        '  score INTEGER NOT NULL,',
        '  room_code TEXT NOT NULL,',
        '  duration_sec INTEGER NOT NULL,',
        '  at INTEGER NOT NULL,',
        '  run_details TEXT NULL,',
        '  run_replay TEXT NULL',
        ');',
        'CREATE INDEX IF NOT EXISTS idx_player_runs_name_at ON player_runs (name_key, at DESC);',
      ].join('\n'));

      const columns = recordsDb.prepare('PRAGMA table_info(records)').all();
      if (!columns.some((c) => c.name === 'run_details')) {
        recordsDb.exec('ALTER TABLE records ADD COLUMN run_details TEXT NULL');
      }
      if (!columns.some((c) => c.name === 'attempts')) {
        recordsDb.exec('ALTER TABLE records ADD COLUMN attempts INTEGER NOT NULL DEFAULT 1');
      }
      if (!columns.some((c) => c.name === 'run_replay')) {
        recordsDb.exec('ALTER TABLE records ADD COLUMN run_replay TEXT NULL');
      }

      const playerRunColumns = recordsDb.prepare('PRAGMA table_info(player_runs)').all();
      if (!playerRunColumns.some((c) => c.name === 'run_details')) {
        recordsDb.exec('ALTER TABLE player_runs ADD COLUMN run_details TEXT NULL');
      }
      if (!playerRunColumns.some((c) => c.name === 'run_replay')) {
        recordsDb.exec('ALTER TABLE player_runs ADD COLUMN run_replay TEXT NULL');
      }

      stmtInsertRecord = recordsDb.prepare([
        'INSERT INTO records (name, attempts, kills, score, room_code, duration_sec, at, run_details, run_replay)',
        'VALUES (@name, @attempts, @kills, @score, @roomCode, @durationSec, @at, @runDetailsJson, @runReplayJson)',
      ].join('\n'));

      stmtPruneRecords = recordsDb.prepare([
        'DELETE FROM records',
        'WHERE id NOT IN (',
        '  SELECT id FROM records',
        '  ORDER BY kills DESC, score DESC, at DESC',
        '  LIMIT ?',
        ')',
      ].join('\n'));
      stmtDeleteRecordByName = recordsDb.prepare('DELETE FROM records WHERE LOWER(name)=LOWER(?)');

      stmtTopRecords = recordsDb.prepare([
        'SELECT',
        '  id,',
        '  name,',
        '  attempts,',
        '  kills,',
        '  score,',
        '  room_code AS roomCode,',
        '  duration_sec AS durationSec,',
        '  at,',
        '  run_details AS runDetails,',
        '  run_replay AS runReplay',
        'FROM records',
        'ORDER BY kills DESC, score DESC, at DESC',
        'LIMIT ?',
      ].join('\n'));

      stmtReplayById = recordsDb.prepare([
        'SELECT',
        '  id,',
        '  name,',
        '  kills,',
        '  score,',
        '  room_code AS roomCode,',
        '  duration_sec AS durationSec,',
        '  at,',
        '  run_replay AS runReplay',
        'FROM records',
        'WHERE id = ?',
        'LIMIT 1',
      ].join('\n'));

      stmtInsertPlayerRun = recordsDb.prepare([
        'INSERT INTO player_runs (name, name_key, kills, score, room_code, duration_sec, at, run_details, run_replay)',
        'VALUES (@name, @nameKey, @kills, @score, @roomCode, @durationSec, @at, @runDetailsJson, @runReplayJson)',
      ].join('\n'));

      stmtListPlayerRuns = recordsDb.prepare([
        'SELECT',
        '  id,',
        '  name,',
        '  kills,',
        '  score,',
        '  room_code AS roomCode,',
        '  duration_sec AS durationSec,',
        '  at,',
        '  run_details AS runDetails',
        'FROM player_runs',
        'WHERE name_key = ?',
        'ORDER BY at DESC',
        'LIMIT ? OFFSET ?',
      ].join('\n'));

      stmtCountPlayerRuns = recordsDb.prepare('SELECT COUNT(1) AS total FROM player_runs WHERE name_key = ?');
      stmtPrunePlayerRuns = recordsDb.prepare([
        'DELETE FROM player_runs',
        'WHERE id NOT IN (',
        '  SELECT id FROM player_runs',
        '  ORDER BY at DESC',
        '  LIMIT ?',
        ')',
      ].join('\n'));

      stmtPlayerRunReplayById = recordsDb.prepare([
        'SELECT',
        '  id,',
        '  name,',
        '  kills,',
        '  score,',
        '  room_code AS roomCode,',
        '  duration_sec AS durationSec,',
        '  at,',
        '  run_replay AS runReplay',
        'FROM player_runs',
        'WHERE id = ? AND name_key = ?',
        'LIMIT 1',
      ].join('\n'));

      loadRecordsFromDb();
      console.log(`Records DB ready: ${dbPath} (loaded ${records.length})`);
    } catch (err) {
      recordsDb = null;
      stmtInsertRecord = null;
      stmtPruneRecords = null;
      stmtTopRecords = null;
      stmtDeleteRecordByName = null;
      stmtReplayById = null;
      stmtInsertPlayerRun = null;
      stmtListPlayerRuns = null;
      stmtCountPlayerRuns = null;
      stmtPrunePlayerRuns = null;
      stmtPlayerRunReplayById = null;
      console.error('Records DB init failed, using in-memory records only:', err.message);
    }
  }

  function listRecordsForLobby(page = 1, pageSize = leaderboardPageSize) {
    // Multiple production instances write to the same SQLite DB, so refresh
    // the in-memory leaderboard before serving the lobby list.
    if (recordsDb && stmtTopRecords) loadRecordsFromDb();

    const total = records.length;
    const size = Math.max(1, Math.min(50, Math.floor(pageSize) || leaderboardPageSize));
    const totalPages = Math.max(1, Math.ceil(total / size));
    const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
    const start = (currentPage - 1) * size;
    const items = records.slice(start, start + size).map((entry) => publicRecordEntry(entry));

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

    runHistory.unshift(normalized);
    if (runHistory.length > MEMORY_RUN_HISTORY_LIMIT) {
      runHistory.length = MEMORY_RUN_HISTORY_LIMIT;
    }

    const key = recordNameKey(normalized.name);
    const existingIndex = records.findIndex((x) => recordNameKey(x.name) === key);

    if (existingIndex >= 0) {
      const existing = records[existingIndex];
      const attempts = Math.max(1, Number(existing?.attempts) || 1) + 1;
      if (isBetterRecord(normalized, existing)) {
        records[existingIndex] = { ...normalized, attempts };
      } else {
        records[existingIndex] = { ...existing, attempts };
      }
    } else {
      records.push(normalized);
    }

    records.sort((a, b) => (b.kills - a.kills) || (b.score - a.score) || (b.at - a.at));
    if (records.length > leaderboardLimit) records.length = leaderboardLimit;
    const persistedRecord = records.find((x) => recordNameKey(x.name) === key) || normalized;

    if (!recordsDb || !stmtInsertRecord || !stmtPruneRecords || !stmtDeleteRecordByName) return;
    try {
      if (stmtInsertPlayerRun) {
        stmtInsertPlayerRun.run({
          ...normalized,
          nameKey: recordNameKey(normalized.name),
          runDetailsJson: normalized.runDetails ? JSON.stringify(normalized.runDetails) : null,
          runReplayJson: normalized.runReplay ? JSON.stringify(normalized.runReplay) : null,
        });
      }
      stmtDeleteRecordByName.run(normalized.name);
      stmtInsertRecord.run({
        ...persistedRecord,
        runDetailsJson: persistedRecord.runDetails ? JSON.stringify(persistedRecord.runDetails) : null,
        runReplayJson: persistedRecord.runReplay ? JSON.stringify(persistedRecord.runReplay) : null,
      });
      stmtPruneRecords.run(leaderboardLimit);
      if (stmtPrunePlayerRuns) stmtPrunePlayerRuns.run(PLAYER_RUN_HISTORY_LIMIT);
    } catch (err) {
      console.error('Records DB write failed:', err.message);
    }
  }

  function listPlayerRunsByName(name, page = 1, pageSize = PLAYER_RUN_HISTORY_PAGE_SIZE) {
    const normalizedNameKey = recordNameKey(name);
    if (!normalizedNameKey) {
      return {
        page: 1,
        pageSize: PLAYER_RUN_HISTORY_PAGE_SIZE,
        total: 0,
        totalPages: 1,
        items: [],
      };
    }

    const size = Math.max(1, Math.min(50, Math.floor(pageSize) || PLAYER_RUN_HISTORY_PAGE_SIZE));

    if (recordsDb && stmtListPlayerRuns && stmtCountPlayerRuns) {
      try {
        const total = Math.max(0, Number(stmtCountPlayerRuns.get(normalizedNameKey)?.total) || 0);
        const totalPages = Math.max(1, Math.ceil(total / size));
        const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
        const offset = (currentPage - 1) * size;
        const rows = stmtListPlayerRuns.all(normalizedNameKey, size, offset);
        return {
          page: currentPage,
          pageSize: size,
          total,
          totalPages,
          items: rows.map((row) => publicRecordEntry(row)),
        };
      } catch (err) {
        console.error('Records DB player run history read failed:', err.message);
      }
    }

    const localRuns = runHistory.filter((entry) => recordNameKey(entry.name) === normalizedNameKey);
    const total = localRuns.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
    const start = (currentPage - 1) * size;
    return {
      page: currentPage,
      pageSize: size,
      total,
      totalPages,
      items: localRuns.slice(start, start + size).map((entry) => publicRecordEntry(entry)),
    };
  }

  function getPlayerRunReplayByNameAndId(name, runId) {
    const id = Math.max(0, Number(runId) || 0);
    const nameKey = recordNameKey(name);
    if (!id || !nameKey) return null;

    if (recordsDb && stmtPlayerRunReplayById) {
      try {
        const row = stmtPlayerRunReplayById.get(id, nameKey);
        if (!row) return null;
        return {
          id: row.id,
          name: row.name,
          kills: row.kills,
          score: row.score,
          roomCode: row.roomCode,
          durationSec: row.durationSec,
          at: row.at,
          replay: parseRecordReplay(row.runReplay),
        };
      } catch (err) {
        console.error('Records DB player run replay read failed:', err.message);
        return null;
      }
    }

    const local = runHistory.find((entry) => entry.id === id && recordNameKey(entry.name) === nameKey);
    if (!local) return null;
    return {
      id: local.id,
      name: local.name,
      kills: local.kills,
      score: local.score,
      roomCode: local.roomCode,
      durationSec: local.durationSec,
      at: local.at,
      replay: parseRecordReplay(local.runReplay),
    };
  }

  function getRecordReplay(recordId) {
    const id = Math.max(0, Number(recordId) || 0);
    if (id <= 0 || !recordsDb || !stmtReplayById) return null;
    try {
      const row = stmtReplayById.get(id);
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        kills: row.kills,
        score: row.score,
        roomCode: row.roomCode,
        durationSec: row.durationSec,
        at: row.at,
        replay: parseRecordReplay(row.runReplay),
      };
    } catch (err) {
      console.error('Records DB replay read failed:', err.message);
      return null;
    }
  }

  init();

  return {
    listRecordsForLobby,
    listPlayerRunsByName,
    pushRecord,
    getRecordReplay,
    getPlayerRunReplayByNameAndId,
  };
}

module.exports = {
  createRecordsStore,
};
