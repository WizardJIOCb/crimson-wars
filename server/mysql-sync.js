const { execFileSync } = require('child_process');

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

function createMysqlSyncClient(overrides = {}) {
  const config = getMysqlConfig(overrides);
  const baseArgs = [
    '--protocol=TCP',
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    `--database=${config.database}`,
    '--default-character-set=utf8mb4',
    '--batch',
    '--raw',
  ];
  const baseEnv = { ...process.env, MYSQL_PWD: config.password };

  function run(sql, { columnNames = false } = {}) {
    const args = columnNames ? baseArgs : baseArgs.concat(['--skip-column-names']);
    return execFileSync(config.command, args, {
      input: `${String(sql || '').trim()};\n`,
      encoding: 'utf8',
      env: baseEnv,
      maxBuffer: 1024 * 1024 * 64,
    });
  }

  function execute(sql) {
    run(sql);
  }

  function queryRows(sql) {
    return parseTsv(run(sql, { columnNames: true }));
  }

  function queryOne(sql) {
    return queryRows(sql)[0] || null;
  }

  function queryJsonRows(sql) {
    return run(sql)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  function queryJsonOne(sql) {
    return queryJsonRows(sql)[0] || null;
  }

  function insert(sql) {
    const raw = run(`${String(sql || '').trim()}; SELECT LAST_INSERT_ID() AS id`);
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
  escapeSql,
  applyParams,
  jsonObjectSql,
};
