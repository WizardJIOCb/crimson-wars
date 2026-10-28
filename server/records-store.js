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
  let recordsDb = null;
  let stmtInsertRecord = null;
  let stmtPruneRecords = null;
  let stmtTopRecords = null;
  let stmtDeleteRecordByName = null;

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
        '  run_details TEXT NULL',
        ');',
        'CREATE INDEX IF NOT EXISTS idx_records_rank ON records (kills DESC, score DESC, at DESC);',
      ].join('\n'));

      const columns = recordsDb.prepare('PRAGMA table_info(records)').all();
      if (!columns.some((c) => c.name === 'run_details')) {
        recordsDb.exec('ALTER TABLE records ADD COLUMN run_details TEXT NULL');
      }
      if (!columns.some((c) => c.name === 'attempts')) {
        recordsDb.exec('ALTER TABLE records ADD COLUMN attempts INTEGER NOT NULL DEFAULT 1');
      }

      stmtInsertRecord = recordsDb.prepare([
        'INSERT INTO records (name, attempts, kills, score, room_code, duration_sec, at, run_details)',
        'VALUES (@name, @attempts, @kills, @score, @roomCode, @durationSec, @at, @runDetailsJson)',
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
        '  run_details AS runDetails',
        'FROM records',
        'ORDER BY kills DESC, score DESC, at DESC',
        'LIMIT ?',
      ].join('\n'));

      loadRecordsFromDb();
      console.log(`Records DB ready: ${dbPath} (loaded ${records.length})`);
    } catch (err) {
      recordsDb = null;
      stmtInsertRecord = null;
      stmtPruneRecords = null;
      stmtTopRecords = null;
      stmtDeleteRecordByName = null;
      console.error('Records DB init failed, using in-memory records only:', err.message);
    }
  }

  function listRecordsForLobby(page = 1, pageSize = leaderboardPageSize) {
    const total = records.length;
    const size = Math.max(1, Math.min(50, Math.floor(pageSize) || leaderboardPageSize));
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
      stmtDeleteRecordByName.run(normalized.name);
      stmtInsertRecord.run({
        ...persistedRecord,
        runDetailsJson: persistedRecord.runDetails ? JSON.stringify(persistedRecord.runDetails) : null,
      });
      stmtPruneRecords.run(leaderboardLimit);
    } catch (err) {
      console.error('Records DB write failed:', err.message);
    }
  }

  init();

  return {
    listRecordsForLobby,
    pushRecord,
  };
}

module.exports = {
  createRecordsStore,
};
