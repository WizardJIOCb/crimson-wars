'use strict';

function createLeaderboardService({
  Database,
  createMysqlSyncClient,
  useMysqlStore,
  mysqlStore,
  playerAuthDbPath,
  recordsDbPath,
  leaderboardLimit,
  playerAuthStore,
  recordsStore,
  accountProgressionStore,
  normalizeNickname,
}) {
  const LEADERBOARD_CATEGORIES = {
    best_kills_run: { key: 'best_kills_run', title: '\u0423\u0431\u0438\u0442\u043e \u0437\u0430 \u0437\u0430\u0431\u0435\u0433', source: 'runs', unit: 'kills' },
    best_pvp_kills_run: { key: 'best_pvp_kills_run', title: 'Best PvP kills run', source: 'runs', unit: 'pvp_kills' },
    runs_count: { key: 'runs_count', title: '\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0437\u0430\u0431\u0435\u0433\u043e\u0432', source: 'account', unit: 'runs' },
    best_score_run: { key: 'best_score_run', title: '\u041b\u0443\u0447\u0448\u0438\u0439 \u0437\u0430\u0431\u0435\u0433 \u043f\u043e pts', source: 'runs', unit: 'pts' },
    best_dps_run: { key: 'best_dps_run', title: '\u041b\u0443\u0447\u0448\u0438\u0439 DPS \u0437\u0430 \u0437\u0430\u0431\u0435\u0433', source: 'runs', unit: 'dps' },
    total_pts: { key: 'total_pts', title: '\u0421\u0443\u043c\u043c\u0430 pts (\u0432\u0441\u0435 \u0437\u0430\u0431\u0435\u0433\u0438)', source: 'runs', unit: 'pts' },
    best_time_run: { key: 'best_time_run', title: '\u0412\u0440\u0435\u043c\u044f \u0437\u0430\u0431\u0435\u0433\u0430 (\u043b\u0443\u0447\u0448\u0435\u0435)', source: 'runs', unit: 'sec' },
    profile_level: { key: 'profile_level', title: '\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044f', source: 'account', unit: 'level' },
    total_kills: { key: 'total_kills', title: '\u0412\u0441\u0435\u0433\u043e \u0443\u0431\u0438\u0439\u0441\u0442\u0432', source: 'runs', unit: 'kills' },
    shards_balance: { key: 'shards_balance', title: '\u0428\u0430\u0440\u0434\u044b \u043d\u0430 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0435', source: 'account', unit: 'shards' },
    heroes_unlocked: { key: 'heroes_unlocked', title: '\u041e\u0442\u043a\u0440\u044b\u0442\u043e \u0433\u0435\u0440\u043e\u0435\u0432', source: 'account', unit: 'heroes' },
  };
  const LEADERBOARD_MODES = {
    all: { key: 'all', title: 'Все режимы' },
    normal: { key: 'normal', title: 'Обычный' },
    hardcore: { key: 'hardcore', title: 'Хард-кор' },
    pvp: { key: 'pvp', title: 'PvP' },
  };

  const LEADERBOARD_RESPONSE_CACHE_MS = 10000;
  const leaderboardResponseCache = new Map();

  let leaderboardAuthDb = null;
  let leaderboardRecordsDb = null;
  let leaderboardMysqlDb = null;

  function getLeaderboardMysqlDb() {
    if (!useMysqlStore) return null;
    if (!leaderboardMysqlDb) leaderboardMysqlDb = createMysqlSyncClient(mysqlStore);
    return leaderboardMysqlDb;
  }

  function getLeaderboardAuthDb() {
    if (useMysqlStore) return getLeaderboardMysqlDb();
    if (leaderboardAuthDb) return leaderboardAuthDb;
    try { leaderboardAuthDb = new Database(playerAuthDbPath, { readonly: true }); } catch { leaderboardAuthDb = null; }
    return leaderboardAuthDb;
  }

  function getLeaderboardRecordsDb() {
    if (useMysqlStore) return getLeaderboardMysqlDb();
    if (leaderboardRecordsDb) return leaderboardRecordsDb;
    try { leaderboardRecordsDb = new Database(recordsDbPath, { readonly: true }); } catch { leaderboardRecordsDb = null; }
    return leaderboardRecordsDb;
  }

  function normalizeLeaderboardMode(rawMode) {
    const mode = String(rawMode || '').trim().toLowerCase();
    if (mode === 'normal' || mode === 'hardcore' || mode === 'pvp') return mode;
    return 'all';
  }

  function buildLeaderboardModeWhere(modeKey) {
    if (modeKey === 'normal') return "WHERE run_details LIKE '%\"gameMode\":\"normal\"%'";
    if (modeKey === 'hardcore') return "WHERE run_details LIKE '%\"gameMode\":\"hardcore\"%'";
    if (modeKey === 'pvp') return "WHERE run_details LIKE '%\"gameMode\":\"pvp\"%'";
    return '';
  }


  function parseLeaderboardRunDetails(raw) {
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

  function buildLeaderboardReplayOrderSql(categoryKey) {
    if (categoryKey === 'best_kills_run') return 'kills DESC, score DESC, duration_sec DESC, at DESC, id DESC';
    if (categoryKey === 'best_score_run') return 'score DESC, kills DESC, duration_sec DESC, at DESC, id DESC';
    if (categoryKey === 'best_pvp_kills_run') return 'at DESC, score DESC, kills DESC, id DESC';
    if (categoryKey === 'best_dps_run') return '(CASE WHEN duration_sec > 0 THEN (score * 1.0 / duration_sec) ELSE 0 END) DESC, score DESC, kills DESC, at DESC, id DESC';
    if (categoryKey === 'best_time_run') return 'duration_sec DESC, score DESC, kills DESC, at DESC, id DESC';
    return 'at DESC, score DESC, kills DESC, id DESC';
  }

  function getLeaderboardReplayRun(db, nameKey, categoryKey, modeKey) {
    if (categoryKey === 'best_pvp_kills_run') return getLeaderboardReplayRunForPvpCategory(db, nameKey, modeKey);
    if (!db) return null;
    const normalizedNameKey = String(nameKey || '').trim().toLowerCase();
    if (!normalizedNameKey) return null;
    const whereParts = ['name_key = ?'];
    if (modeKey === 'normal') whereParts.push("run_details LIKE '%\"gameMode\":\"normal\"%'");
    if (modeKey === 'hardcore') whereParts.push("run_details LIKE '%\"gameMode\":\"hardcore\"%'");
    if (modeKey === 'pvp') whereParts.push("run_details LIKE '%\"gameMode\":\"pvp\"%'");
    const sql = [
      'SELECT id, name, kills, score, room_code AS roomCode, duration_sec AS durationSec, at, run_details AS runDetails',
      'FROM player_runs',
      'WHERE ' + whereParts.join(' AND '),
      'ORDER BY ' + buildLeaderboardReplayOrderSql(categoryKey),
      'LIMIT 1',
    ].join('\n');
    try {
      const row = db.prepare(sql).get(normalizedNameKey);
      if (!row) return null;
      return {
        id: Math.max(0, Number(row.id) || 0),
        name: String(row.name || 'Unknown').slice(0, 18),
        kills: Math.max(0, Number(row.kills) || 0),
        score: Math.max(0, Number(row.score) || 0),
        roomCode: String(row.roomCode || '-').slice(0, 12),
        durationSec: Math.max(1, Number(row.durationSec) || 1),
        at: Math.max(0, Number(row.at) || 0),
        runDetails: parseLeaderboardRunDetails(row.runDetails),
      };
    } catch {
      return null;
    }
  }

  function extractPvpKillsFromRunDetails(runDetails) {
    const parsed = parseLeaderboardRunDetails(runDetails);
    return Math.max(0, Number(parsed?.pvpKills) || 0);
  }

  function getLeaderboardReplayRunForPvpCategory(db, nameKey, modeKey) {
    if (!db) return null;
    const normalizedNameKey = String(nameKey || '').trim().toLowerCase();
    if (!normalizedNameKey) return null;
    const whereParts = ['name_key = ?'];
    if (modeKey === 'normal') whereParts.push("run_details LIKE '%\"gameMode\":\"normal\"%'");
    if (modeKey === 'hardcore') whereParts.push("run_details LIKE '%\"gameMode\":\"hardcore\"%'");
    if (modeKey === 'pvp') whereParts.push("run_details LIKE '%\"gameMode\":\"pvp\"%'");
    const sql = [
      'SELECT id, name, kills, score, room_code AS roomCode, duration_sec AS durationSec, at, run_details AS runDetails',
      'FROM player_runs',
      'WHERE ' + whereParts.join(' AND '),
      'ORDER BY at DESC, id DESC',
    ].join('\n');
    try {
      const rows = db.prepare(sql).all(normalizedNameKey);
      let best = null;
      for (const row of rows) {
        const pvpKills = extractPvpKillsFromRunDetails(row?.runDetails);
        if (pvpKills <= 0) continue;
        if (!best || pvpKills > best.pvpKills || (pvpKills === best.pvpKills && Number(row?.at || 0) > Number(best.at || 0))) {
          best = { row, pvpKills };
        }
      }
      if (!best) return null;
      const row = best.row;
      return {
        id: Math.max(0, Number(row.id) || 0),
        name: String(row.name || 'Unknown').slice(0, 18),
        kills: Math.max(0, Number(row.kills) || 0),
        score: Math.max(0, Number(row.score) || 0),
        roomCode: String(row.roomCode || '-').slice(0, 12),
        durationSec: Math.max(1, Number(row.durationSec) || 1),
        at: Math.max(0, Number(row.at) || 0),
        runDetails: parseLeaderboardRunDetails(row.runDetails),
      };
    } catch {
      return null;
    }
  }

  function listBestPvpKillsRunLeaderboardRows(db, page, pageSize, modeKey = 'all') {
    if (!db) return { page: 1, pageSize, total: 0, totalPages: 1, items: [] };
    const whereClause = buildLeaderboardModeWhere(modeKey);
    const rows = db.prepare([
      'SELECT name_key AS nameKey, name, run_details AS runDetails, at, kills, score, duration_sec AS durationSec',
      'FROM player_runs',
      whereClause,
      'ORDER BY at DESC, id DESC',
    ].filter(Boolean).join('\n')).all();

    const bestByName = new Map();
    for (const row of rows) {
      const nameKey = String(row?.nameKey || '').trim().toLowerCase();
      if (!nameKey) continue;
      const pvpKills = extractPvpKillsFromRunDetails(row?.runDetails);
      if (pvpKills <= 0) continue;
      const prev = bestByName.get(nameKey);
      if (!prev || pvpKills > prev.value || (pvpKills === prev.value && Number(row?.at || 0) > Number(prev.at || 0))) {
        bestByName.set(nameKey, {
          nameKey,
          nickname: String(row?.name || 'Unknown').slice(0, 18),
          value: pvpKills,
          at: Math.max(0, Number(row?.at) || 0),
        });
      }
    }

    const allItems = Array.from(bestByName.values()).sort((a, b) => (b.value - a.value) || (b.at - a.at));
    const total = allItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
    const offset = (currentPage - 1) * pageSize;
    const pageItems = allItems.slice(offset, offset + pageSize);

    const authDb = getLeaderboardAuthDb();
    const authStmt = authDb ? authDb.prepare('SELECT id, nickname FROM player_accounts WHERE nickname_key = ? LIMIT 1') : null;

    const items = pageItems.map((item) => {
      const a = authStmt ? authStmt.get(item.nameKey) : null;
      const replayRun = getLeaderboardReplayRunForPvpCategory(db, item.nameKey, modeKey);
      return {
        playerId: Math.max(0, Number(a?.id) || 0),
        nickname: String(a?.nickname || item.nickname || 'Unknown').slice(0, 18),
        value: Math.max(0, Number(item.value) || 0),
        runs: 0,
        bestKills: 0,
        bestScore: 0,
        bestDurationSec: 0,
        at: Math.max(0, Number(item.at) || 0),
        replayRunId: Math.max(0, Number(replayRun?.id) || 0),
        replayRun: replayRun ? {
          id: replayRun.id,
          name: replayRun.name,
          kills: replayRun.kills,
          score: replayRun.score,
          roomCode: replayRun.roomCode,
          durationSec: replayRun.durationSec,
          at: replayRun.at,
          runDetails: replayRun.runDetails,
        } : null,
      };
    });

    return { page: currentPage, pageSize, total, totalPages, items };
  }

  function listRunLeaderboardRows(categoryKey, page, pageSize, modeKey = 'all') {
    const db = getLeaderboardRecordsDb();
    if (!db) return { page: 1, pageSize, total: 0, totalPages: 1, items: [] };
    if (categoryKey === 'best_pvp_kills_run') return listBestPvpKillsRunLeaderboardRows(db, page, pageSize, modeKey);
    const metricSqlMap = {
      best_kills_run: { metric: 'MAX(kills)', order: 'metric DESC, tieAt DESC' },
      best_score_run: { metric: 'MAX(score)', order: 'metric DESC, tieAt DESC' },
      best_dps_run: { metric: 'MAX(CASE WHEN duration_sec > 0 THEN (score * 1.0 / duration_sec) ELSE 0 END)', order: 'metric DESC, tieAt DESC' },
      best_time_run: { metric: 'MAX(duration_sec)', order: 'metric DESC, tieAt DESC' },
      total_pts: { metric: 'SUM(score)', order: 'metric DESC, tieAt DESC' },
      total_kills: { metric: 'SUM(kills)', order: 'metric DESC, tieAt DESC' },
      runs_count: { metric: 'COUNT(1)', order: 'metric DESC, tieAt DESC' },
    };
    const metric = metricSqlMap[categoryKey];
    if (!metric) return { page: 1, pageSize, total: 0, totalPages: 1, items: [] };
    const whereClause = buildLeaderboardModeWhere(modeKey);
    const totalSql = [
      'SELECT COUNT(1) AS total',
      'FROM (SELECT name_key FROM player_runs',
      whereClause,
      'GROUP BY name_key) t',
    ].filter(Boolean).join(' ');
    const total = Math.max(0, Number(db.prepare(totalSql).get()?.total) || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
    const offset = (currentPage - 1) * pageSize;
    const rows = db.prepare([
      'SELECT name_key AS nameKey, MAX(name) AS nickname, ' + metric.metric + ' AS metric, COUNT(1) AS runs, MAX(kills) AS bestKills, MAX(score) AS bestScore, MAX(duration_sec) AS bestDurationSec, MAX(at) AS tieAt',
      'FROM player_runs',
      whereClause,
      'GROUP BY name_key ORDER BY ' + metric.order + ' LIMIT ? OFFSET ?',
    ].filter(Boolean).join('\n')).all(pageSize, offset);
    const authDb = getLeaderboardAuthDb();
    const authStmt = authDb ? authDb.prepare('SELECT id, nickname FROM player_accounts WHERE nickname_key = ? LIMIT 1') : null;
    const items = rows.map((r) => {
      const nameKey = String(r?.nameKey || '');
      const a = authStmt ? authStmt.get(nameKey) : null;
      const replayRun = getLeaderboardReplayRun(db, nameKey, categoryKey, modeKey);
      return {
        playerId: Math.max(0, Number(a?.id) || 0),
        nickname: String(a?.nickname || r?.nickname || 'Unknown').slice(0, 18),
        value: Math.max(0, Number(r?.metric) || 0),
        runs: Math.max(0, Number(r?.runs) || 0),
        bestKills: Math.max(0, Number(r?.bestKills) || 0),
        bestScore: Math.max(0, Number(r?.bestScore) || 0),
        bestDurationSec: Math.max(0, Number(r?.bestDurationSec) || 0),
        at: Math.max(0, Number(r?.tieAt) || 0),
        replayRunId: Math.max(0, Number(replayRun?.id) || 0),
        replayRun: replayRun ? {
          id: replayRun.id,
          name: replayRun.name,
          kills: replayRun.kills,
          score: replayRun.score,
          roomCode: replayRun.roomCode,
          durationSec: replayRun.durationSec,
          at: replayRun.at,
          runDetails: replayRun.runDetails,
        } : null,
      };
    });
    return { page: currentPage, pageSize, total, totalPages, items };
  }

  function listAccountLeaderboardRows(categoryKey, page, pageSize) {
    const db = getLeaderboardAuthDb();
    if (!db) return { page: 1, pageSize, total: 0, totalPages: 1, items: [] };
    const rows = db.prepare([
      'SELECT pa.id AS playerId, pa.nickname AS nickname, ap.account_level AS accountLevel, ap.account_xp AS accountXp, ap.total_runs AS totalRuns, ap.shards AS shards, ap.unlocked_heroes_json AS unlockedHeroesJson, ap.updated_at AS updatedAt',
      'FROM account_progression ap JOIN player_accounts pa ON pa.id = ap.player_id WHERE pa.is_active = 1'
    ].join('\n')).all().map((r) => {
      let heroesUnlocked = 0;
      try { const p = JSON.parse(String(r?.unlockedHeroesJson || '[]')); if (Array.isArray(p)) heroesUnlocked = p.length; } catch {}
      return {
        playerId: Math.max(0, Number(r?.playerId) || 0),
        nickname: String(r?.nickname || 'Unknown').slice(0, 18),
        accountLevel: Math.max(1, Number(r?.accountLevel) || 1),
        accountXp: Math.max(0, Number(r?.accountXp) || 0),
        totalRuns: Math.max(0, Number(r?.totalRuns) || 0),
        shards: Math.max(0, Number(r?.shards) || 0),
        heroesUnlocked: Math.max(0, Number(heroesUnlocked) || 0),
        updatedAt: Math.max(0, Number(r?.updatedAt) || 0),
      };
    });
    rows.sort((a, b) => {
      if (categoryKey === 'profile_level') return (b.accountLevel - a.accountLevel) || (b.accountXp - a.accountXp) || (b.updatedAt - a.updatedAt);
      if (categoryKey === 'runs_count') return (b.totalRuns - a.totalRuns) || (b.accountLevel - a.accountLevel) || (b.updatedAt - a.updatedAt);
      if (categoryKey === 'shards_balance') return (b.shards - a.shards) || (b.accountLevel - a.accountLevel) || (b.updatedAt - a.updatedAt);
      if (categoryKey === 'heroes_unlocked') return (b.heroesUnlocked - a.heroesUnlocked) || (b.accountLevel - a.accountLevel) || (b.updatedAt - a.updatedAt);
      return b.updatedAt - a.updatedAt;
    });
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
    const offset = (currentPage - 1) * pageSize;
    const items = rows.slice(offset, offset + pageSize).map((r) => ({
      playerId: r.playerId,
      nickname: r.nickname,
      value: categoryKey === 'profile_level' ? r.accountLevel : categoryKey === 'runs_count' ? r.totalRuns : categoryKey === 'shards_balance' ? r.shards : r.heroesUnlocked,
      accountLevel: r.accountLevel,
      accountXp: r.accountXp,
      totalRuns: r.totalRuns,
      shards: r.shards,
      heroesUnlocked: r.heroesUnlocked,
      at: r.updatedAt,
    }));
    return { page: currentPage, pageSize, total, totalPages, items };
  }

  function paginateLeaderboardItems(items, page, pageSize) {
    const safeItems = Array.isArray(items) ? items : [];
    const total = safeItems.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
    const offset = (currentPage - 1) * pageSize;
    return {
      page: currentPage,
      pageSize,
      total,
      totalPages,
      items: safeItems.slice(offset, offset + pageSize),
    };
  }

  function runMatchesLeaderboardMode(run, modeKey) {
    if (modeKey === 'all') return true;
    const details = parseLeaderboardRunDetails(run?.runDetails);
    const runMode = String(details?.gameMode || 'normal').trim().toLowerCase();
    return runMode === modeKey;
  }

  function makeLeaderboardReplayRun(run) {
    if (!run) return null;
    return {
      id: Math.max(0, Number(run.id) || 0),
      name: String(run.name || 'Unknown').slice(0, 18),
      kills: Math.max(0, Number(run.kills) || 0),
      score: Math.max(0, Number(run.score) || 0),
      roomCode: String(run.roomCode || '-').slice(0, 12),
      durationSec: Math.max(1, Number(run.durationSec) || 1),
      at: Math.max(0, Number(run.at) || 0),
      runDetails: parseLeaderboardRunDetails(run.runDetails),
    };
  }

  function getFastLeaderboardPlayer(name) {
    const nickname = normalizeNickname(name || 'Unknown') || 'Unknown';
    const account = playerAuthStore.getAccountByNickname(nickname);
    return {
      playerId: Math.max(0, Number(account?.id) || 0),
      nickname: String(account?.nickname || nickname || 'Unknown').slice(0, 18),
    };
  }

  function listRunLeaderboardRowsFast(categoryKey, page, pageSize, modeKey = 'all') {
    const sourcePayload = typeof recordsStore.listLatestPlayerRunsMemory === 'function'
      ? recordsStore.listLatestPlayerRunsMemory(1, 300)
      : recordsStore.listRecordsForLobby(1, leaderboardLimit);
    const runs = (Array.isArray(sourcePayload?.items) ? sourcePayload.items : [])
      .filter((run) => runMatchesLeaderboardMode(run, modeKey));
    const byName = new Map();

    for (const run of runs) {
      const player = getFastLeaderboardPlayer(run?.name);
      const nameKey = normalizeNickname(player.nickname).toLowerCase();
      if (!nameKey) continue;
      const kills = Math.max(0, Number(run?.kills) || 0);
      const score = Math.max(0, Number(run?.score) || 0);
      const durationSec = Math.max(1, Number(run?.durationSec) || 1);
      const details = parseLeaderboardRunDetails(run?.runDetails);
      const pvpKills = extractPvpKillsFromRunDetails(details);
      let entry = byName.get(nameKey);
      if (!entry) {
        entry = {
          playerId: player.playerId,
          nickname: player.nickname,
          value: 0,
          runs: 0,
          bestKills: 0,
          bestScore: 0,
          bestDurationSec: 0,
          at: 0,
          replayRun: null,
        };
        byName.set(nameKey, entry);
      }

      entry.runs += 1;
      entry.bestKills = Math.max(entry.bestKills, kills);
      entry.bestScore = Math.max(entry.bestScore, score);
      entry.bestDurationSec = Math.max(entry.bestDurationSec, durationSec);
      entry.at = Math.max(entry.at, Math.max(0, Number(run?.at) || 0));

      const dps = durationSec > 0 ? score / durationSec : 0;
      let candidateValue = 0;
      if (categoryKey === 'best_kills_run') candidateValue = kills;
      else if (categoryKey === 'best_score_run') candidateValue = score;
      else if (categoryKey === 'best_dps_run') candidateValue = dps;
      else if (categoryKey === 'best_time_run') candidateValue = durationSec;
      else if (categoryKey === 'best_pvp_kills_run') candidateValue = pvpKills;
      else if (categoryKey === 'total_pts') {
        entry.value += score;
        if (!entry.replayRun || Number(run?.at || 0) > Number(entry.replayRun?.at || 0)) entry.replayRun = makeLeaderboardReplayRun(run);
        continue;
      } else if (categoryKey === 'total_kills') {
        entry.value += kills;
        if (!entry.replayRun || Number(run?.at || 0) > Number(entry.replayRun?.at || 0)) entry.replayRun = makeLeaderboardReplayRun(run);
        continue;
      } else if (categoryKey === 'runs_count') {
        entry.value = entry.runs;
        if (!entry.replayRun || Number(run?.at || 0) > Number(entry.replayRun?.at || 0)) entry.replayRun = makeLeaderboardReplayRun(run);
        continue;
      } else {
        continue;
      }

      if (candidateValue > entry.value || (candidateValue === entry.value && Number(run?.at || 0) > Number(entry.replayRun?.at || 0))) {
        entry.value = candidateValue;
        entry.replayRun = makeLeaderboardReplayRun(run);
      }
    }

    const items = Array.from(byName.values())
      .filter((item) => Math.max(0, Number(item.value) || 0) > 0)
      .sort((a, b) => (b.value - a.value) || (b.at - a.at))
      .map((item) => ({
        ...item,
        value: Math.round(Math.max(0, Number(item.value) || 0) * 100) / 100,
        replayRunId: Math.max(0, Number(item.replayRun?.id) || 0),
      }));
    return paginateLeaderboardItems(items, page, pageSize);
  }

  function listAccountLeaderboardRowsFast(categoryKey, page, pageSize) {
    const progressions = typeof accountProgressionStore.listCachedProgressions === 'function'
      ? accountProgressionStore.listCachedProgressions()
      : [];
    const items = progressions.map((progression) => {
      const account = playerAuthStore.getAccountById(progression.playerId);
      const heroesUnlocked = Array.isArray(progression.unlockedHeroes) ? progression.unlockedHeroes.length : 0;
      return {
        playerId: Math.max(0, Number(progression.playerId) || 0),
        nickname: String(account?.nickname || 'Unknown').slice(0, 18),
        value: categoryKey === 'profile_level'
          ? Math.max(1, Number(progression.accountLevel) || 1)
          : categoryKey === 'runs_count'
            ? Math.max(0, Number(progression.totalRuns) || 0)
            : categoryKey === 'shards_balance'
              ? Math.max(0, Number(progression.shards) || 0)
              : heroesUnlocked,
        accountLevel: Math.max(1, Number(progression.accountLevel) || 1),
        accountXp: Math.max(0, Number(progression.accountXp) || 0),
        totalRuns: Math.max(0, Number(progression.totalRuns) || 0),
        shards: Math.max(0, Number(progression.shards) || 0),
        heroesUnlocked,
        at: Math.max(0, Number(progression.updatedAt) || 0),
      };
    }).filter((item) => item.playerId > 0);

    items.sort((a, b) => {
      if (categoryKey === 'profile_level') return (b.accountLevel - a.accountLevel) || (b.accountXp - a.accountXp) || (b.at - a.at);
      return (b.value - a.value) || (b.accountLevel - a.accountLevel) || (b.at - a.at);
    });
    return paginateLeaderboardItems(items, page, pageSize);
  }

  function listLeaderboardRowsFast(category, page, pageSize, modeKey) {
    if (category?.source === 'account') return listAccountLeaderboardRowsFast(category.key, page, pageSize);
    return listRunLeaderboardRowsFast(category?.key || 'best_kills_run', page, pageSize, modeKey);
  }

  function buildLeaderboardResponse(query = {}, options = {}) {
    const modeKey = normalizeLeaderboardMode(query.mode);
    const availableCategories = Object.values(LEADERBOARD_CATEGORIES)
      .filter((x) => modeKey === 'all' || x.source === 'runs');
    const fallbackCategory = availableCategories.find((x) => x.key === 'best_kills_run') || availableCategories[0] || LEADERBOARD_CATEGORIES.best_kills_run;
    const categoryKey = String(query.category || fallbackCategory?.key || 'best_kills_run').trim();
    const category = availableCategories.find((x) => x.key === categoryKey) || fallbackCategory;
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(30, Number(query.page_size) || 10));
    const cacheKey = [category.key, modeKey, page, pageSize].join('|');
    const cached = leaderboardResponseCache.get(cacheKey);
    if (cached && (useMysqlStore || Date.now() - cached.at < LEADERBOARD_RESPONSE_CACHE_MS)) {
      return { ...cached.payload, now: Date.now() };
    }

    if (options.activeGameplay) {
      const stalePayload = cached?.payload || {
        ok: true,
        category: { key: category.key, title: category.title, source: category.source, unit: category.unit },
        mode: LEADERBOARD_MODES[modeKey] || LEADERBOARD_MODES.all,
        modes: Object.values(LEADERBOARD_MODES),
        categories: availableCategories.map((x) => ({ key: x.key, title: x.title, source: x.source, unit: x.unit })),
        items: [],
        page,
        pageSize,
        total: 0,
        totalPages: 1,
        lowLatencyMode: true,
      };
      return { ...stalePayload, lowLatencyMode: true, now: Date.now() };
    }

    const payload = useMysqlStore
      ? listLeaderboardRowsFast(category, page, pageSize, modeKey)
      : category.source === 'account'
        ? listAccountLeaderboardRows(category.key, page, pageSize)
        : listRunLeaderboardRows(category.key, page, pageSize, modeKey);
    const responsePayload = {
      ok: true,
      category: { key: category.key, title: category.title, source: category.source, unit: category.unit },
      mode: LEADERBOARD_MODES[modeKey] || LEADERBOARD_MODES.all,
      modes: Object.values(LEADERBOARD_MODES),
      categories: availableCategories.map((x) => ({ key: x.key, title: x.title, source: x.source, unit: x.unit })),
      items: Array.isArray(payload.items) ? payload.items : [],
      page: payload.page,
      pageSize: payload.pageSize,
      total: payload.total,
      totalPages: payload.totalPages,
    };
    leaderboardResponseCache.set(cacheKey, { at: Date.now(), payload: responsePayload });
    if (leaderboardResponseCache.size > 80) {
      const oldestKey = leaderboardResponseCache.keys().next().value;
      if (oldestKey) leaderboardResponseCache.delete(oldestKey);
    }
    return { ...responsePayload, now: Date.now() };
  }

  return {
    categories: LEADERBOARD_CATEGORIES,
    modes: LEADERBOARD_MODES,
    normalizeMode: normalizeLeaderboardMode,
    buildResponse: buildLeaderboardResponse,
  };
}

module.exports = {
  createLeaderboardService,
};
