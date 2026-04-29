const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let mysqlSyncMonitor = null;

function isMysqlStoreEnabled() {
  const raw = (process.env.DATA_STORE || process.env.STORAGE_BACKEND || process.env.MYSQL_ENABLED || '').toString().trim().toLowerCase();
  return raw === 'mysql' || raw === '1' || raw === 'true' || raw === 'yes';
}

function getMysqlConfig(overrides = {}) {
  return {
    host: overrides.host || process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(overrides.port || process.env.MYSQL_PORT || 3306) || 3306,
    user: overrides.user || process.env.MYSQL_USER || 'crimson_wars_app',
    password: overrides.password ?? process.env.MYSQL_PASSWORD ?? '',
    database: overrides.database || process.env.MYSQL_DATABASE || 'crimson_wars',
    command: overrides.command || process.env.MYSQL_CLI || 'mysql',
  };
}

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
    .replace(/'/g, "\\'")}'`;
}

function applyParams(sql, params = []) {
  let index = 0;
  return String(sql || '').replace(/\?/g, () => {
    const value = params[index];
    index += 1;
    return escapeSql(value);
  });
}

function parseMysqlValue(value) {
  if (value === undefined || value === '\\N' || value === 'NULL') return null;
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function parseTsv(raw) {
  const lines = String(raw || '').replace(/\r\n/g, '\n').split('\n').filter((line) => line.length > 0);
  if (lines.length <= 0) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = parseMysqlValue(cells[index]);
    });
    return row;
  });
}

function cleanMysqlOption(value) {
  return String(value ?? '').replace(/[\r\n]/g, '');
}

function createDefaultsFile(config) {
  const defaultsPath = path.join(
    os.tmpdir(),
    `cw-mysql-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.cnf`,
  );
  const contents = [
    '[client]',
    'protocol=TCP',
    `host=${cleanMysqlOption(config.host)}`,
    `port=${cleanMysqlOption(config.port)}`,
    `user=${cleanMysqlOption(config.user)}`,
    `password=${cleanMysqlOption(config.password)}`,
    `database=${cleanMysqlOption(config.database)}`,
    'default-character-set=utf8mb4',
    'max_allowed_packet=256M',
    '',
  ].join('\n');
  fs.writeFileSync(defaultsPath, contents, { encoding: 'utf8', mode: 0o600 });
  return defaultsPath;
}

function normalizeMysqlSyncMonitor(overrides = {}) {
  if (!overrides || overrides.enabled === false) return null;
  const thresholdMs = Math.max(0, Number(overrides.thresholdMs) || 25);
  const previewLimit = Math.max(120, Number(overrides.previewLimit) || 360);
  const logPath = String(overrides.logPath || '').trim();
  return {
    enabled: true,
    thresholdMs,
    previewLimit,
    logPath,
    instanceId: String(overrides.instanceId || process.env.INSTANCE_ID || '').trim(),
    shouldLog: typeof overrides.shouldLog === 'function' ? overrides.shouldLog : null,
    logger: typeof overrides.logger === 'function' ? overrides.logger : null,
  };
}

function setMysqlSyncMonitor(overrides = null) {
  mysqlSyncMonitor = normalizeMysqlSyncMonitor(overrides);
}

function compactSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim();
}

function sanitizeSqlPreview(sql, limit = 360) {
  let compact = compactSql(sql);
  if (!compact) return '';
  compact = compact
    .replace(/'(?:\\.|[^'])*'/g, "'?'")
    .replace(/\b\d+\b/g, '?');
  if (compact.length > limit) return `${compact.slice(0, Math.max(1, limit - 3))}...`;
  return compact;
}

function extractSqlOperation(sql) {
  const match = compactSql(sql).match(/^([a-z]+)/i);
  return match ? String(match[1] || '').toUpperCase() : 'UNKNOWN';
}

function extractSqlTarget(sql) {
  const compact = compactSql(sql);
  const patterns = [
    /^\s*SELECT\b.*?\bFROM\s+`?([a-z0-9_]+)`?/i,
    /^\s*INSERT\s+INTO\s+`?([a-z0-9_]+)`?/i,
    /^\s*UPDATE\s+`?([a-z0-9_]+)`?/i,
    /^\s*DELETE\s+FROM\s+`?([a-z0-9_]+)`?/i,
  ];
  for (const pattern of patterns) {
    const match = compact.match(pattern);
    if (match?.[1]) return String(match[1]);
  }
  return '';
}

function emitMysqlSyncMonitorEntry(monitor, entry) {
  const line = `[mysql-sync-slow] ${JSON.stringify(entry)}`;
  if (typeof monitor?.logger === 'function') {
    try {
      monitor.logger(line, entry);
    } catch (_) {
      // Falling back to stderr keeps the main query path observable.
      console.warn(line);
    }
  } else {
    console.warn(line);
  }
  if (!monitor?.logPath) return;
  try {
    fs.appendFileSync(monitor.logPath, `${line}\n`, 'utf8');
  } catch (err) {
    console.warn(`[mysql-sync-slow] failed to append ${monitor.logPath}: ${err?.message || err}`);
  }
}

function maybeLogMysqlSyncCall(sql, elapsedMs, meta = {}, error = null) {
  const monitor = mysqlSyncMonitor;
  if (!monitor?.enabled) return;
  if (!error && elapsedMs < monitor.thresholdMs) return;
  if (typeof monitor.shouldLog === 'function') {
    try {
      if (!monitor.shouldLog({ elapsedMs, error, sql, ...meta })) return;
    } catch (_) {
      return;
    }
  }
  emitMysqlSyncMonitorEntry(monitor, {
    ts: new Date().toISOString(),
    pid: process.pid,
    instanceId: monitor.instanceId || undefined,
    wallMs: Number(elapsedMs.toFixed(3)),
    thresholdMs: monitor.thresholdMs,
    operation: String(meta.operation || 'run'),
    columnNames: Boolean(meta.columnNames),
    sqlType: extractSqlOperation(sql),
    target: extractSqlTarget(sql) || undefined,
    sqlBytes: Buffer.byteLength(String(sql || ''), 'utf8'),
    sqlPreview: sanitizeSqlPreview(sql, monitor.previewLimit),
    error: error ? String(error?.message || error) : undefined,
  });
}

function createMysqlSyncClient(overrides = {}) {
  const config = getMysqlConfig(overrides);

  function run(sql, { columnNames = false, operation = 'run' } = {}) {
    const defaultsPath = createDefaultsFile(config);
    const baseArgs = [
      `--defaults-file=${defaultsPath}`,
      '--batch',
      '--raw',
    ];
    const args = columnNames ? baseArgs : baseArgs.concat(['--skip-column-names']);
    const startedNs = process.hrtime.bigint();
    let queryError = null;
    try {
      return execFileSync(config.command, args, {
        input: `${String(sql || '').trim()};\n`,
        encoding: 'utf8',
        env: process.env,
        maxBuffer: 1024 * 1024 * 256,
      });
    } catch (err) {
      queryError = err;
      throw err;
    } finally {
      try {
        fs.unlinkSync(defaultsPath);
      } catch (_) {
        // The query result is more important than cleanup failures in temp.
      }
      const elapsedMs = Number(process.hrtime.bigint() - startedNs) / 1e6;
      maybeLogMysqlSyncCall(sql, elapsedMs, { columnNames, operation }, queryError);
    }
  }

  function execute(sql) {
    run(sql, { operation: 'execute' });
  }

  function queryRows(sql) {
    return parseTsv(run(sql, { columnNames: true, operation: 'queryRows' }));
  }

  function queryOne(sql) {
    return queryRows(sql)[0] || null;
  }

  function queryJsonRows(sql) {
    return run(sql, { operation: 'queryJsonRows' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  function queryJsonOne(sql) {
    return queryJsonRows(sql)[0] || null;
  }

  function insert(sql) {
    const raw = run(`${String(sql || '').trim()}; SELECT LAST_INSERT_ID() AS id`, { operation: 'insert' });
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return Math.max(0, Number(lines[lines.length - 1]) || 0);
  }

  function prepare(sql) {
    return {
      get: (...params) => queryOne(applyParams(sql, params)),
      all: (...params) => queryRows(applyParams(sql, params)),
      run: (...params) => execute(applyParams(sql, params)),
    };
  }

  return {
    config,
    escape: escapeSql,
    applyParams,
    execute,
    insert,
    queryRows,
    queryOne,
    queryJsonRows,
    queryJsonOne,
    prepare,
  };
}

function jsonObjectSql(map) {
  return `JSON_OBJECT(${Object.entries(map).map(([key, expr]) => `${escapeSql(key)}, ${expr}`).join(', ')})`;
}

module.exports = {
  isMysqlStoreEnabled,
  getMysqlConfig,
  createMysqlSyncClient,
  setMysqlSyncMonitor,
  escapeSql,
  applyParams,
  jsonObjectSql,
};
