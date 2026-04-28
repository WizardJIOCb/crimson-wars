const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT_DIR, '.env.mysql.local'));
loadEnvFile(path.join(ROOT_DIR, '.env'));

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'crimson_wars_app',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'crimson_wars',
  charset: 'utf8mb4',
  namedPlaceholders: true,
  supportBigNumbers: true,
};

const TRUNCATE = process.argv.includes('--truncate') || process.env.MYSQL_MIGRATE_TRUNCATE === '1';

function requiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required source file not found: ${filePath}`);
  }
  return filePath;
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function openSqlite(fileName) {
  return new Database(requiredFile(path.join(DATA_DIR, fileName)), { readonly: true, fileMustExist: true });
}

async function createSchema(conn) {
  await conn.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGINT NOT NULL AUTO_INCREMENT,
      login VARCHAR(40) NOT NULL,
      login_key VARCHAR(40) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      can_manage_admins TINYINT NOT NULL DEFAULT 0,
      is_active TINYINT NOT NULL DEFAULT 1,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      last_login_at BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uq_admin_users_login_key (login_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id BIGINT NOT NULL AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      token_hash VARCHAR(128) NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      last_seen_at BIGINT NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_admin_sessions_token_hash (token_hash),
      KEY idx_admin_sessions_user (user_id),
      CONSTRAINT fk_admin_sessions_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS player_accounts (
      id BIGINT NOT NULL AUTO_INCREMENT,
      nickname VARCHAR(18) NOT NULL,
      nickname_key VARCHAR(18) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active TINYINT NOT NULL DEFAULT 1,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      last_login_at BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uq_player_accounts_nickname_key (nickname_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS player_sessions (
      id BIGINT NOT NULL AUTO_INCREMENT,
      player_id BIGINT NOT NULL,
      token_hash VARCHAR(128) NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      last_seen_at BIGINT NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_player_sessions_token_hash (token_hash),
      KEY idx_player_sessions_player (player_id),
      CONSTRAINT fk_player_sessions_player FOREIGN KEY (player_id) REFERENCES player_accounts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS player_identities (
      id BIGINT NOT NULL AUTO_INCREMENT,
      player_account_id BIGINT NOT NULL,
      provider VARCHAR(32) NOT NULL,
      provider_user_id VARCHAR(255) NOT NULL,
      provider_email VARCHAR(200) NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_player_identities_provider_user (provider, provider_user_id),
      KEY idx_player_identities_player (player_account_id),
      CONSTRAINT fk_player_identities_player FOREIGN KEY (player_account_id) REFERENCES player_accounts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS account_progression (
      player_id BIGINT NOT NULL,
      account_xp BIGINT NOT NULL DEFAULT 0,
      account_level BIGINT NOT NULL DEFAULT 1,
      account_skill_points BIGINT NOT NULL DEFAULT 0,
      shards BIGINT NOT NULL DEFAULT 0,
      active_hero VARCHAR(64) NOT NULL,
      unlocked_heroes_json LONGTEXT NOT NULL,
      hero_nodes_json LONGTEXT NOT NULL,
      hero_cards_json LONGTEXT NOT NULL,
      hero_levels_json LONGTEXT NOT NULL,
      hero_xp_json LONGTEXT NOT NULL,
      hero_skill_levels_json LONGTEXT NOT NULL,
      salvage BIGINT NOT NULL DEFAULT 0,
      inventory_items_json LONGTEXT NOT NULL,
      hero_equipment_json LONGTEXT NOT NULL,
      total_runs BIGINT NOT NULL DEFAULT 0,
      hero_runs_json LONGTEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (player_id),
      CONSTRAINT fk_account_progression_player FOREIGN KEY (player_id) REFERENCES player_accounts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS records (
      id BIGINT NOT NULL AUTO_INCREMENT,
      name VARCHAR(18) NOT NULL,
      attempts BIGINT NOT NULL DEFAULT 1,
      kills BIGINT NOT NULL,
      score BIGINT NOT NULL,
      room_code VARCHAR(12) NOT NULL,
      duration_sec BIGINT NOT NULL,
      at BIGINT NOT NULL,
      run_details LONGTEXT NULL,
      run_replay LONGTEXT NULL,
      PRIMARY KEY (id),
      KEY idx_records_rank (kills DESC, score DESC, at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS player_runs (
      id BIGINT NOT NULL AUTO_INCREMENT,
      name VARCHAR(18) NOT NULL,
      name_key VARCHAR(18) NOT NULL,
      kills BIGINT NOT NULL,
      score BIGINT NOT NULL,
      room_code VARCHAR(12) NOT NULL,
      duration_sec BIGINT NOT NULL,
      at BIGINT NOT NULL,
      run_details LONGTEXT NULL,
      run_replay LONGTEXT NULL,
      PRIMARY KEY (id),
      KEY idx_player_runs_name_at (name_key, at DESC),
      KEY idx_player_runs_at (at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS instance_registry (
      instance_id VARCHAR(191) NOT NULL,
      started_at BIGINT NOT NULL,
      heartbeat_at BIGINT NOT NULL,
      is_shutting_down TINYINT NOT NULL DEFAULT 0,
      online_sockets BIGINT NOT NULL DEFAULT 0,
      in_game_players BIGINT NOT NULL DEFAULT 0,
      in_menu_sockets BIGINT NOT NULL DEFAULT 0,
      room_count BIGINT NOT NULL DEFAULT 0,
      public_base_url VARCHAR(500) NOT NULL DEFAULT '',
      PRIMARY KEY (instance_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS room_registry (
      room_code VARCHAR(32) NOT NULL,
      instance_id VARCHAR(191) NOT NULL,
      player_count BIGINT NOT NULL DEFAULT 0,
      max_players BIGINT NOT NULL DEFAULT 0,
      started_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      is_shutting_down TINYINT NOT NULL DEFAULT 0,
      public_base_url VARCHAR(500) NOT NULL DEFAULT '',
      PRIMARY KEY (room_code),
      KEY idx_room_registry_instance (instance_id),
      KEY idx_room_registry_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS placement_state (
      state_key VARCHAR(64) NOT NULL,
      value_integer BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (state_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_documents (
      doc_key VARCHAR(64) NOT NULL,
      content_json LONGTEXT NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (doc_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function clearTables(conn) {
  const tables = [
    'admin_sessions',
    'admin_users',
    'account_progression',
    'player_identities',
    'player_sessions',
    'player_accounts',
    'records',
    'player_runs',
    'room_registry',
    'instance_registry',
    'placement_state',
    'app_documents',
  ];
  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  for (const table of tables) {
    await conn.query(`DELETE FROM ${table}`);
    await conn.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`).catch(() => {});
  }
  await conn.query('SET FOREIGN_KEY_CHECKS=1');
}

async function insertRows(conn, dbFile, table, columns, transform = (row) => row) {
  const db = openSqlite(dbFile);
  const count = db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total;
  const placeholders = columns.map((col) => `:${col}`).join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  let inserted = 0;
  for (const row of db.prepare(`SELECT * FROM ${table}`).iterate()) {
    const payload = transform(row);
    await conn.execute(sql, payload);
    inserted += 1;
    if (inserted % 100 === 0) console.log(`${table}: ${inserted}/${count}`);
  }
  db.close();
  console.log(`${table}: ${inserted}/${count}`);
}

async function migrateSqliteTables(conn) {
  await insertRows(conn, 'admin-auth.db', 'admin_users', [
    'id', 'login', 'login_key', 'password_hash', 'can_manage_admins', 'is_active', 'created_at', 'updated_at', 'last_login_at',
  ]);
  await insertRows(conn, 'admin-auth.db', 'admin_sessions', [
    'id', 'user_id', 'token_hash', 'created_at', 'expires_at', 'last_seen_at',
  ]);

  await insertRows(conn, 'player-auth.db', 'player_accounts', [
    'id', 'nickname', 'nickname_key', 'password_hash', 'is_active', 'created_at', 'updated_at', 'last_login_at',
  ]);
  await insertRows(conn, 'player-auth.db', 'player_sessions', [
    'id', 'player_id', 'token_hash', 'created_at', 'expires_at', 'last_seen_at',
  ]);
  await insertRows(conn, 'player-auth.db', 'player_identities', [
    'id', 'player_account_id', 'provider', 'provider_user_id', 'provider_email', 'created_at',
  ]);
  await insertRows(conn, 'player-auth.db', 'account_progression', [
    'player_id', 'account_xp', 'account_level', 'account_skill_points', 'shards', 'active_hero',
    'unlocked_heroes_json', 'hero_nodes_json', 'hero_cards_json', 'hero_levels_json', 'hero_xp_json',
    'hero_skill_levels_json', 'salvage', 'inventory_items_json', 'hero_equipment_json', 'total_runs',
    'hero_runs_json', 'created_at', 'updated_at',
  ], (row) => ({
    player_id: row.player_id,
    account_xp: row.account_xp,
    account_level: row.account_level,
    account_skill_points: row.account_skill_points,
    shards: row.shards,
    active_hero: row.active_hero,
    unlocked_heroes_json: row.unlocked_heroes_json,
    hero_nodes_json: row.hero_nodes_json,
    hero_cards_json: row.hero_cards_json || '{}',
    hero_levels_json: row.hero_levels_json || '{}',
    hero_xp_json: row.hero_xp_json || '{}',
    hero_skill_levels_json: row.hero_skill_levels_json || '{}',
    salvage: row.salvage || 0,
    inventory_items_json: row.inventory_items_json || '[]',
    hero_equipment_json: row.hero_equipment_json || '{}',
    total_runs: row.total_runs || 0,
    hero_runs_json: row.hero_runs_json || '{}',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  await insertRows(conn, 'records.db', 'records', [
    'id', 'name', 'attempts', 'kills', 'score', 'room_code', 'duration_sec', 'at', 'run_details', 'run_replay',
  ], (row) => ({
    id: row.id,
    name: row.name,
    attempts: row.attempts || 1,
    kills: row.kills,
    score: row.score,
    room_code: row.room_code,
    duration_sec: row.duration_sec,
    at: row.at,
    run_details: row.run_details,
    run_replay: row.run_replay,
  }));
  await insertRows(conn, 'records.db', 'player_runs', [
    'id', 'name', 'name_key', 'kills', 'score', 'room_code', 'duration_sec', 'at', 'run_details', 'run_replay',
  ]);

  await insertRows(conn, 'runtime-registry.db', 'instance_registry', [
    'instance_id', 'started_at', 'heartbeat_at', 'is_shutting_down', 'online_sockets', 'in_game_players',
    'in_menu_sockets', 'room_count', 'public_base_url',
  ]);
  await insertRows(conn, 'runtime-registry.db', 'room_registry', [
    'room_code', 'instance_id', 'player_count', 'max_players', 'started_at', 'updated_at', 'is_shutting_down', 'public_base_url',
  ]);
  await insertRows(conn, 'runtime-registry.db', 'placement_state', ['state_key', 'value_integer'], (row) => ({
    state_key: row.key,
    value_integer: row.value_integer,
  }));
}

async function migrateJsonDocuments(conn) {
  const now = Date.now();
  const docs = [
    ['news', readJsonFile(path.join(DATA_DIR, 'news.json'), [])],
    ['skills', readJsonFile(path.join(DATA_DIR, 'skills.json'), {})],
  ];
  for (const [docKey, content] of docs) {
    await conn.execute(
      'INSERT INTO app_documents (doc_key, content_json, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE content_json=VALUES(content_json), updated_at=VALUES(updated_at)',
      [docKey, JSON.stringify(content), now],
    );
    console.log(`app_documents.${docKey}: ok`);
  }
}

async function printSummary(conn) {
  const tables = [
    'admin_users',
    'admin_sessions',
    'player_accounts',
    'player_sessions',
    'player_identities',
    'account_progression',
    'records',
    'player_runs',
    'instance_registry',
    'room_registry',
    'placement_state',
    'app_documents',
  ];
  for (const table of tables) {
    const [rows] = await conn.query(`SELECT COUNT(*) AS total FROM ${table}`);
    console.log(`${table}: ${Number(rows[0].total) || 0}`);
  }
}

async function main() {
  if (!MYSQL_CONFIG.password) {
    throw new Error('MYSQL_PASSWORD is required');
  }
  const conn = await mysql.createConnection(MYSQL_CONFIG);
  try {
    await createSchema(conn);
    if (TRUNCATE) await clearTables(conn);
    await migrateSqliteTables(conn);
    await migrateJsonDocuments(conn);
    await printSummary(conn);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
