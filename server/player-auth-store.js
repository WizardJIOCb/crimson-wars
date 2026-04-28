const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { createMysqlSyncClient, escapeSql, jsonObjectSql } = require('./mysql-sync');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const SESSION_CACHE_TTL_MS = 30000;
const SESSION_TOUCH_INTERVAL_MS = 1000 * 60 * 5;
const SESSION_PRUNE_INTERVAL_MS = 1000 * 60;
const ACCOUNT_COUNT_CACHE_MS = 15000;
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 18;
const PASSWORD_MIN_LENGTH = 6;
const PROVIDERS = new Set(['google', 'vk', 'mailru']);

function nowMs() {
  return Date.now();
}

function normalizeNickname(value) {
  return (value || '').toString().trim().replace(/\s+/g, ' ').slice(0, NICKNAME_MAX_LENGTH);
}

function normalizeNicknameKey(value) {
  return normalizeNickname(value).toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const normalized = (password || '').toString();
  const hash = crypto.scryptSync(normalized, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const value = (storedHash || '').toString();
  const parts = value.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const actual = crypto.scryptSync((password || '').toString(), salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update((token || '').toString()).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function parsePlayerRow(row) {
  if (!row) return null;
  return {
    id: Math.max(0, Number(row.id) || 0),
    nickname: normalizeNickname(row.nickname),
    nicknameKey: normalizeNicknameKey(row.nickname),
    isActive: !!row.is_active,
    createdAt: Math.max(0, Number(row.created_at) || 0),
    updatedAt: Math.max(0, Number(row.updated_at) || 0),
    lastLoginAt: Math.max(0, Number(row.last_login_at) || 0),
  };
}

function parseIdentityRow(row) {
  if (!row) return null;
  return {
    id: Math.max(0, Number(row.id) || 0),
    playerAccountId: Math.max(0, Number(row.player_account_id) || 0),
    provider: (row.provider || '').toString(),
    providerUserId: (row.provider_user_id || '').toString(),
    providerEmail: (row.provider_email || '').toString(),
    createdAt: Math.max(0, Number(row.created_at) || 0),
  };
}

function validateNickname(nickname) {
  const normalized = normalizeNickname(nickname);
  if (normalized.length < NICKNAME_MIN_LENGTH) {
    return { ok: false, message: `Nickname must be at least ${NICKNAME_MIN_LENGTH} chars` };
  }
  if (!/^[\p{L}\p{N} _-]+$/u.test(normalized)) {
    return { ok: false, message: 'Nickname may use letters, numbers, space, _ and -' };
  }
  if (!/[\p{L}\p{N}]/u.test(normalized)) {
    return { ok: false, message: 'Nickname must contain letters or numbers' };
  }
  return { ok: true, nickname: normalized, nicknameKey: normalizeNicknameKey(normalized) };
}

function sanitizeNicknameSeed(value, fallback = 'Player') {
  const raw = (value || '').toString().trim();
  const cleaned = raw
    .replace(/[^\p{L}\p{N} _-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalized = normalizeNickname(cleaned || fallback);
  if (!normalized) return fallback;
  if (!/[\p{L}\p{N}]/u.test(normalized)) return fallback;
  return normalized;
}

function createMysqlPlayerAuthStore({ mysql }) {
  const client = createMysqlSyncClient(mysql);
  const sessionCache = new Map();
  let lastPruneAt = 0;
  let cachedAccountCount = null;
  let cachedAccountCountUntil = 0;
  const playerJson = jsonObjectSql({
    id: 'id',
    nickname: 'nickname',
    nickname_key: 'nickname_key',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    last_login_at: 'last_login_at',
  });
  const playerSecretJson = jsonObjectSql({
    id: 'id',
    nickname: 'nickname',
    nickname_key: 'nickname_key',
    password_hash: 'password_hash',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
    last_login_at: 'last_login_at',
  });
  const identityJson = jsonObjectSql({
    id: 'id',
    player_account_id: 'player_account_id',
    provider: 'provider',
    provider_user_id: 'provider_user_id',
    provider_email: 'provider_email',
    created_at: 'created_at',
  });
  const sessionJson = jsonObjectSql({
    session_id: 's.id',
    session_player_id: 's.player_id',
    session_created_at: 's.created_at',
    session_expires_at: 's.expires_at',
    session_last_seen_at: 's.last_seen_at',
    id: 'p.id',
    nickname: 'p.nickname',
    nickname_key: 'p.nickname_key',
    is_active: 'p.is_active',
    created_at: 'p.created_at',
    updated_at: 'p.updated_at',
    last_login_at: 'p.last_login_at',
  });

  function pruneExpiredSessions() {
    const now = nowMs();
    if (now - lastPruneAt < SESSION_PRUNE_INTERVAL_MS) return;
    lastPruneAt = now;
    client.execute(`DELETE FROM player_sessions WHERE expires_at < ${escapeSql(nowMs())}`);
  }

  function cacheSession(tokenHash, row, identities) {
    const now = nowMs();
    const session = {
      sessionId: row.session_id,
      player: parsePlayerRow(row),
      identities,
    };
    sessionCache.set(tokenHash, {
      session,
      expiresAt: Math.max(0, Number(row.session_expires_at) || 0),
      lastSeenAt: Math.max(0, Number(row.session_last_seen_at) || 0),
      cacheUntil: now + SESSION_CACHE_TTL_MS,
    });
    return session;
  }

  function invalidateAccountCount() {
    cachedAccountCount = null;
    cachedAccountCountUntil = 0;
  }

  function getAccountRowByNicknameKey(nicknameKey, withSecret = false) {
    return client.queryJsonOne(`SELECT ${withSecret ? playerSecretJson : playerJson} FROM player_accounts WHERE nickname_key = ${escapeSql(nicknameKey)} LIMIT 1`);
  }

  function getAccountRowById(id, withSecret = false) {
    return client.queryJsonOne(`SELECT ${withSecret ? playerSecretJson : playerJson} FROM player_accounts WHERE id = ${escapeSql(Number(id) || 0)} LIMIT 1`);
  }

  function listIdentities(playerId) {
    return client.queryJsonRows([
      `SELECT ${identityJson}`,
      'FROM player_identities',
      `WHERE player_account_id = ${escapeSql(Number(playerId) || 0)}`,
      'ORDER BY provider ASC',
    ].join('\n')).map(parseIdentityRow);
  }

  function getIdentityByProviderUserId(provider, providerUserId) {
    return parseIdentityRow(client.queryJsonOne([
      `SELECT ${identityJson}`,
      'FROM player_identities',
      `WHERE provider = ${escapeSql(provider)} AND provider_user_id = ${escapeSql(providerUserId)}`,
      'LIMIT 1',
    ].join('\n')));
  }

  function createSession(playerId) {
    pruneExpiredSessions();
    const token = randomToken(32);
    const now = nowMs();
    client.execute([
      'INSERT INTO player_sessions (player_id, token_hash, created_at, expires_at, last_seen_at)',
      `VALUES (${escapeSql(playerId)}, ${escapeSql(hashSessionToken(token))}, ${escapeSql(now)}, ${escapeSql(now + SESSION_TTL_MS)}, ${escapeSql(now)})`,
    ].join('\n'));
    client.execute(`UPDATE player_accounts SET last_login_at = ${escapeSql(now)}, updated_at = ${escapeSql(now)} WHERE id = ${escapeSql(playerId)}`);
    return token;
  }

  function getAccountById(id) {
    return parsePlayerRow(getAccountRowById(id));
  }

  function getAccountByNickname(nickname) {
    const validation = validateNickname(nickname);
    if (!validation.ok) return null;
    return parsePlayerRow(getAccountRowByNicknameKey(validation.nicknameKey));
  }

  function getAccountWithSecretByNickname(nickname) {
    const validation = validateNickname(nickname);
    if (!validation.ok) return null;
    return getAccountRowByNicknameKey(validation.nicknameKey, true);
  }

  function getSession(token) {
    if (!token) return null;
    const tokenHash = hashSessionToken(token);
    const now = nowMs();
    const cached = sessionCache.get(tokenHash);
    if (cached && cached.cacheUntil > now && cached.expiresAt > now) {
      return cached.session;
    }
    pruneExpiredSessions();
    const row = client.queryJsonOne([
      `SELECT ${sessionJson}`,
      'FROM player_sessions s',
      'JOIN player_accounts p ON p.id = s.player_id',
      `WHERE s.token_hash = ${escapeSql(tokenHash)}`,
      'LIMIT 1',
    ].join('\n'));
    if (!row) return null;
    if (!row.is_active) {
      sessionCache.delete(tokenHash);
      client.execute(`DELETE FROM player_sessions WHERE player_id = ${escapeSql(row.session_player_id)}`);
      return null;
    }
    if (Number(row.session_expires_at) < now) {
      sessionCache.delete(tokenHash);
      client.execute(`DELETE FROM player_sessions WHERE token_hash = ${escapeSql(tokenHash)}`);
      return null;
    }
    if (now - Math.max(0, Number(row.session_last_seen_at) || 0) > SESSION_TOUCH_INTERVAL_MS) {
      client.execute(`UPDATE player_sessions SET last_seen_at = ${escapeSql(now)}, expires_at = ${escapeSql(now + SESSION_TTL_MS)} WHERE id = ${escapeSql(row.session_id)}`);
      row.session_last_seen_at = now;
      row.session_expires_at = now + SESSION_TTL_MS;
    }
    return cacheSession(tokenHash, row, listIdentities(row.id));
  }

  function deleteSession(token) {
    if (!token) return;
    const tokenHash = hashSessionToken(token);
    sessionCache.delete(tokenHash);
    client.execute(`DELETE FROM player_sessions WHERE token_hash = ${escapeSql(tokenHash)}`);
  }

  function register(nickname, password) {
    const validation = validateNickname(nickname);
    if (!validation.ok) return { ok: false, code: 400, message: validation.message };
    const normalizedPassword = (password || '').toString();
    if (normalizedPassword.length < PASSWORD_MIN_LENGTH) {
      return { ok: false, code: 400, message: `Password must be at least ${PASSWORD_MIN_LENGTH} chars` };
    }
    if (getAccountRowByNicknameKey(validation.nicknameKey)) {
      return { ok: false, code: 409, message: 'Nickname is already registered' };
    }
    const now = nowMs();
    const id = client.insert([
      'INSERT INTO player_accounts (nickname, nickname_key, password_hash, is_active, created_at, updated_at, last_login_at)',
      `VALUES (${escapeSql(validation.nickname)}, ${escapeSql(validation.nicknameKey)}, ${escapeSql(hashPassword(normalizedPassword))}, 1, ${escapeSql(now)}, ${escapeSql(now)}, 0)`,
    ].join('\n'));
    invalidateAccountCount();
    const account = getAccountById(id);
    const token = createSession(account.id);
    return { ok: true, player: account, token, identities: [] };
  }

  function authenticate(nickname, password) {
    const row = getAccountWithSecretByNickname(nickname);
    if (!row || !row.is_active) return { ok: false, code: 401, message: 'Invalid nickname or password' };
    if (!verifyPassword(password, row.password_hash)) return { ok: false, code: 401, message: 'Invalid nickname or password' };
    const token = createSession(row.id);
    return {
      ok: true,
      token,
      player: parsePlayerRow(row),
      identities: listIdentities(row.id),
    };
  }

  function updatePassword(nickname, password) {
    const validation = validateNickname(nickname);
    if (!validation.ok) return { ok: false, code: 400, message: validation.message };
    const normalizedPassword = (password || '').toString();
    if (normalizedPassword.length < PASSWORD_MIN_LENGTH) {
      return { ok: false, code: 400, message: `Password must be at least ${PASSWORD_MIN_LENGTH} chars` };
    }
    const row = getAccountWithSecretByNickname(validation.nickname);
    if (!row || !row.is_active) return { ok: false, code: 404, message: 'Player not found' };
    const now = nowMs();
    client.execute(`UPDATE player_accounts SET password_hash = ${escapeSql(hashPassword(normalizedPassword))}, updated_at = ${escapeSql(now)} WHERE id = ${escapeSql(row.id)}`);
    client.execute(`DELETE FROM player_sessions WHERE player_id = ${escapeSql(row.id)}`);
    return {
      ok: true,
      player: parsePlayerRow({ ...row, updated_at: now }),
      message: `Password updated for ${validation.nickname}`,
    };
  }

  function getNicknameStatus(nickname) {
    const validation = validateNickname(nickname);
    if (!validation.ok) {
      return {
        ok: false,
        code: 400,
        message: validation.message,
        nickname: normalizeNickname(nickname),
        nicknameKey: normalizeNicknameKey(nickname),
        isRegistered: false,
      };
    }
    const account = parsePlayerRow(getAccountRowByNicknameKey(validation.nicknameKey));
    return {
      ok: true,
      nickname: validation.nickname,
      nicknameKey: validation.nicknameKey,
      isRegistered: !!account,
      player: account,
    };
  }

  function countAccounts() {
    const now = nowMs();
    if (cachedAccountCount !== null && cachedAccountCountUntil > now) return cachedAccountCount;
    const row = client.queryOne('SELECT COUNT(*) AS total FROM player_accounts WHERE is_active = 1');
    cachedAccountCount = Math.max(0, Number(row?.total) || 0);
    cachedAccountCountUntil = now + ACCOUNT_COUNT_CACHE_MS;
    return cachedAccountCount;
  }

  function createProviderPlaceholder(playerId, provider, providerUserId, providerEmail = '') {
    const normalizedProvider = (provider || '').toString().trim().toLowerCase();
    if (!PROVIDERS.has(normalizedProvider)) return { ok: false, code: 400, message: 'Unsupported provider' };
    if (!getAccountById(playerId)) return { ok: false, code: 404, message: 'Player not found' };
    try {
      client.execute([
        'INSERT INTO player_identities (player_account_id, provider, provider_user_id, provider_email, created_at)',
        `VALUES (${escapeSql(Number(playerId) || 0)}, ${escapeSql(normalizedProvider)}, ${escapeSql((providerUserId || '').toString().trim())}, ${escapeSql((providerEmail || '').toString().trim().slice(0, 200))}, ${escapeSql(nowMs())})`,
      ].join('\n'));
    } catch (err) {
      return { ok: false, code: 409, message: err?.message || 'Identity already exists' };
    }
    return { ok: true, identities: listIdentities(playerId) };
  }

  function createUniqueExternalNickname(provider, nicknameBase) {
    const providerPrefixMap = { google: 'Google', vk: 'VK', mailru: 'Mail' };
    const prefix = providerPrefixMap[(provider || '').toString().trim().toLowerCase()] || 'Player';
    const seed = sanitizeNicknameSeed(nicknameBase, prefix);
    const variants = [seed];
    if (!seed.toLowerCase().startsWith(prefix.toLowerCase())) variants.push(sanitizeNicknameSeed(`${prefix} ${seed}`, prefix));
    variants.push(prefix);
    for (const baseVariant of variants) {
      const base = sanitizeNicknameSeed(baseVariant, prefix).slice(0, NICKNAME_MAX_LENGTH);
      const initialValidation = validateNickname(base);
      if (initialValidation.ok && !getAccountRowByNicknameKey(initialValidation.nicknameKey)) return initialValidation.nickname;
      for (let attempt = 1; attempt <= 200; attempt += 1) {
        const suffix = ` ${1000 + attempt}`;
        const trimmedBase = base.slice(0, Math.max(1, NICKNAME_MAX_LENGTH - suffix.length)).trim();
        const candidate = normalizeNickname(`${trimmedBase}${suffix}`);
        const validation = validateNickname(candidate);
        if (!validation.ok) continue;
        if (!getAccountRowByNicknameKey(validation.nicknameKey)) return validation.nickname;
      }
    }
    return normalizeNickname(`Player ${Date.now().toString().slice(-6)}`);
  }

  function isGenericExternalNickname(nickname, provider) {
    const normalizedNickname = normalizeNickname(nickname).toLowerCase();
    const normalizedProvider = (provider || '').toString().trim().toLowerCase();
    const providerPrefixMap = {
      google: ['google', 'google player'],
      vk: ['vk', 'vk player', 'vk id', 'vk user', 'vk игрок'],
      mailru: ['mail', 'mail ru', 'mail player'],
    };
    const prefixes = providerPrefixMap[normalizedProvider] || ['player'];
    return prefixes.some((prefix) => normalizedNickname === prefix || normalizedNickname.startsWith(`${prefix} `));
  }

  function maybeRefreshExternalNickname(player, provider, nicknameBase) {
    if (!player || !player.id || !nicknameBase) return player;
    if (!isGenericExternalNickname(player.nickname, provider)) return player;
    const seed = sanitizeNicknameSeed(nicknameBase, player.nickname);
    if (!seed || isGenericExternalNickname(seed, provider)) return player;
    const validation = validateNickname(seed);
    let nextNickname = '';
    if (validation.ok && validation.nicknameKey === normalizeNicknameKey(player.nickname)) return player;
    if (validation.ok && !getAccountRowByNicknameKey(validation.nicknameKey)) nextNickname = validation.nickname;
    else nextNickname = createUniqueExternalNickname(provider, seed);
    if (!nextNickname || normalizeNicknameKey(nextNickname) === normalizeNicknameKey(player.nickname)) return player;
    const nextValidation = validateNickname(nextNickname);
    if (!nextValidation.ok) return player;
    const now = nowMs();
    client.execute(`UPDATE player_accounts SET nickname = ${escapeSql(nextValidation.nickname)}, nickname_key = ${escapeSql(nextValidation.nicknameKey)}, updated_at = ${escapeSql(now)} WHERE id = ${escapeSql(player.id)}`);
    return getAccountById(player.id) || player;
  }

  function needsNicknameSetup(playerId) {
    const player = getAccountById(playerId);
    if (!player || !player.isActive) return false;
    const identities = listIdentities(player.id);
    return identities.some((identity) => isGenericExternalNickname(player.nickname, identity.provider));
  }

  function renamePlayer(playerId, nickname, { requireNicknameSetup = false } = {}) {
    const player = getAccountById(playerId);
    if (!player || !player.isActive) return { ok: false, code: 404, message: 'Player not found' };
    if (requireNicknameSetup && !needsNicknameSetup(player.id)) return { ok: false, code: 400, message: 'Nickname setup is not required' };
    const validation = validateNickname(nickname);
    if (!validation.ok) return { ok: false, code: 400, message: validation.message };
    const existing = parsePlayerRow(getAccountRowByNicknameKey(validation.nicknameKey));
    if (existing && existing.id !== player.id) return { ok: false, code: 409, message: 'Nickname is already registered' };
    const now = nowMs();
    client.execute(`UPDATE player_accounts SET nickname = ${escapeSql(validation.nickname)}, nickname_key = ${escapeSql(validation.nicknameKey)}, updated_at = ${escapeSql(now)} WHERE id = ${escapeSql(player.id)}`);
    const updatedPlayer = getAccountById(player.id);
    return {
      ok: true,
      player: updatedPlayer,
      identities: listIdentities(player.id),
      needsNicknameSetup: needsNicknameSetup(player.id),
    };
  }

  function authenticateExternal({ provider, providerUserId, providerEmail = '', nicknameBase = '' }) {
    const normalizedProvider = (provider || '').toString().trim().toLowerCase();
    const externalUserId = (providerUserId || '').toString().trim();
    const externalEmail = (providerEmail || '').toString().trim().slice(0, 200);
    if (!PROVIDERS.has(normalizedProvider)) return { ok: false, code: 400, message: 'Unsupported provider' };
    if (!externalUserId) return { ok: false, code: 400, message: 'Provider user id is required' };
    const existingIdentity = getIdentityByProviderUserId(normalizedProvider, externalUserId);
    if (existingIdentity) {
      let player = getAccountById(existingIdentity.playerAccountId || 0);
      if (!player || !player.isActive) return { ok: false, code: 404, message: 'Player account is unavailable' };
      player = maybeRefreshExternalNickname(player, normalizedProvider, nicknameBase);
      const token = createSession(player.id);
      return { ok: true, token, player, identities: listIdentities(player.id), createdAccount: false };
    }

    let player = null;
    try {
      const nickname = createUniqueExternalNickname(normalizedProvider, nicknameBase);
      const validation = validateNickname(nickname);
      if (!validation.ok) throw new Error(validation.message || 'Failed to generate nickname');
      const now = nowMs();
      const playerId = client.insert([
        'INSERT INTO player_accounts (nickname, nickname_key, password_hash, is_active, created_at, updated_at, last_login_at)',
        `VALUES (${escapeSql(validation.nickname)}, ${escapeSql(validation.nicknameKey)}, ${escapeSql(hashPassword(randomToken(24)))}, 1, ${escapeSql(now)}, ${escapeSql(now)}, 0)`,
      ].join('\n'));
      invalidateAccountCount();
      client.execute([
        'INSERT INTO player_identities (player_account_id, provider, provider_user_id, provider_email, created_at)',
        `VALUES (${escapeSql(playerId)}, ${escapeSql(normalizedProvider)}, ${escapeSql(externalUserId)}, ${escapeSql(externalEmail)}, ${escapeSql(now)})`,
      ].join('\n'));
      player = getAccountById(playerId);
    } catch (err) {
      return { ok: false, code: 500, message: err?.message || 'Failed to create external account' };
    }
    if (!player) return { ok: false, code: 500, message: 'Failed to create external account' };
    const token = createSession(player.id);
    return { ok: true, token, player, identities: listIdentities(player.id), createdAccount: true };
  }

  return {
    validateNickname,
    getAccountById,
    getAccountByNickname,
    getNicknameStatus,
    countAccounts,
    getSession,
    deleteSession,
    register,
    authenticate,
    authenticateExternal,
    renamePlayer,
    needsNicknameSetup,
    updatePassword,
    createProviderPlaceholder,
  };
}

function createPlayerAuthStore({ dataDir, dbPath, mysql }) {
  if (mysql?.enabled) return createMysqlPlayerAuthStore({ mysql });
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec([
    'CREATE TABLE IF NOT EXISTS player_accounts (',
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  nickname TEXT NOT NULL,',
    '  nickname_key TEXT NOT NULL UNIQUE,',
    '  password_hash TEXT NOT NULL,',
    '  is_active INTEGER NOT NULL DEFAULT 1,',
    '  created_at INTEGER NOT NULL,',
    '  updated_at INTEGER NOT NULL,',
    '  last_login_at INTEGER NOT NULL DEFAULT 0',
    ');',
    'CREATE TABLE IF NOT EXISTS player_sessions (',
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  player_id INTEGER NOT NULL,',
    '  token_hash TEXT NOT NULL UNIQUE,',
    '  created_at INTEGER NOT NULL,',
    '  expires_at INTEGER NOT NULL,',
    '  last_seen_at INTEGER NOT NULL,',
    '  FOREIGN KEY(player_id) REFERENCES player_accounts(id) ON DELETE CASCADE',
    ');',
    'CREATE TABLE IF NOT EXISTS player_identities (',
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  player_account_id INTEGER NOT NULL,',
    '  provider TEXT NOT NULL,',
    '  provider_user_id TEXT NOT NULL,',
    '  provider_email TEXT NOT NULL DEFAULT \'\',',
    '  created_at INTEGER NOT NULL,',
    '  UNIQUE(provider, provider_user_id),',
    '  FOREIGN KEY(player_account_id) REFERENCES player_accounts(id) ON DELETE CASCADE',
    ');',
    'CREATE INDEX IF NOT EXISTS idx_player_sessions_hash ON player_sessions(token_hash);',
    'CREATE INDEX IF NOT EXISTS idx_player_sessions_player ON player_sessions(player_id);',
    'CREATE INDEX IF NOT EXISTS idx_player_identities_player ON player_identities(player_account_id);',
  ].join('\n'));

  const stmtGetByNicknameKey = db.prepare('SELECT * FROM player_accounts WHERE nickname_key = ?');
  const stmtGetById = db.prepare('SELECT * FROM player_accounts WHERE id = ?');
  const stmtCountAccounts = db.prepare('SELECT COUNT(*) AS total FROM player_accounts WHERE is_active = 1');
  const stmtInsertAccount = db.prepare([
    'INSERT INTO player_accounts (nickname, nickname_key, password_hash, is_active, created_at, updated_at, last_login_at)',
    'VALUES (@nickname, @nicknameKey, @passwordHash, 1, @createdAt, @updatedAt, 0)',
  ].join('\n'));
  const stmtUpdateLastLogin = db.prepare('UPDATE player_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?');
  const stmtUpdatePasswordHash = db.prepare('UPDATE player_accounts SET password_hash = ?, updated_at = ? WHERE id = ?');
  const stmtUpdateNickname = db.prepare('UPDATE player_accounts SET nickname = ?, nickname_key = ?, updated_at = ? WHERE id = ?');
  const stmtInsertSession = db.prepare([
    'INSERT INTO player_sessions (player_id, token_hash, created_at, expires_at, last_seen_at)',
    'VALUES (@playerId, @tokenHash, @createdAt, @expiresAt, @lastSeenAt)',
  ].join('\n'));
  const stmtGetSessionByHash = db.prepare([
    'SELECT s.id AS session_id, s.player_id AS session_player_id, s.created_at AS session_created_at, s.expires_at AS session_expires_at, s.last_seen_at AS session_last_seen_at, p.*',
    'FROM player_sessions s',
    'JOIN player_accounts p ON p.id = s.player_id',
    'WHERE s.token_hash = ?',
  ].join('\n'));
  const stmtDeleteSessionByHash = db.prepare('DELETE FROM player_sessions WHERE token_hash = ?');
  const stmtDeleteSessionsByPlayerId = db.prepare('DELETE FROM player_sessions WHERE player_id = ?');
  const stmtTouchSession = db.prepare('UPDATE player_sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?');
  const stmtPruneExpiredSessions = db.prepare('DELETE FROM player_sessions WHERE expires_at < ?');
  const stmtListIdentitiesByPlayerId = db.prepare('SELECT * FROM player_identities WHERE player_account_id = ? ORDER BY provider ASC');
  const stmtGetIdentityByProviderUserId = db.prepare('SELECT * FROM player_identities WHERE provider = ? AND provider_user_id = ?');
  const stmtInsertIdentity = db.prepare([
    'INSERT INTO player_identities (player_account_id, provider, provider_user_id, provider_email, created_at)',
    'VALUES (?, ?, ?, ?, ?)',
  ].join('\n'));

  function pruneExpiredSessions() {
    stmtPruneExpiredSessions.run(nowMs());
  }

  function listIdentities(playerId) {
    return stmtListIdentitiesByPlayerId.all(Number(playerId) || 0).map(parseIdentityRow);
  }

  function createSession(playerId) {
    pruneExpiredSessions();
    const token = randomToken(32);
    const now = nowMs();
    stmtInsertSession.run({
      playerId,
      tokenHash: hashSessionToken(token),
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      lastSeenAt: now,
    });
    stmtUpdateLastLogin.run(now, now, playerId);
    return token;
  }

  function getAccountById(id) {
    return parsePlayerRow(stmtGetById.get(Number(id) || 0));
  }

  function getAccountByNickname(nickname) {
    const validation = validateNickname(nickname);
    if (!validation.ok) return null;
    return parsePlayerRow(stmtGetByNicknameKey.get(validation.nicknameKey));
  }

  function getAccountWithSecretByNickname(nickname) {
    const validation = validateNickname(nickname);
    if (!validation.ok) return null;
    return stmtGetByNicknameKey.get(validation.nicknameKey) || null;
  }

  function getSession(token) {
    if (!token) return null;
    pruneExpiredSessions();
    const row = stmtGetSessionByHash.get(hashSessionToken(token));
    if (!row) return null;
    if (!row.is_active) {
      stmtDeleteSessionsByPlayerId.run(row.session_player_id);
      return null;
    }
    const now = nowMs();
    if (Number(row.session_expires_at) < now) {
      stmtDeleteSessionByHash.run(hashSessionToken(token));
      return null;
    }
    stmtTouchSession.run(now, now + SESSION_TTL_MS, row.session_id);
    return {
      sessionId: row.session_id,
      player: parsePlayerRow(row),
      identities: listIdentities(row.id),
    };
  }

  function deleteSession(token) {
    if (!token) return;
    stmtDeleteSessionByHash.run(hashSessionToken(token));
  }

  function register(nickname, password) {
    const validation = validateNickname(nickname);
    if (!validation.ok) {
      return { ok: false, code: 400, message: validation.message };
    }
    const normalizedPassword = (password || '').toString();
    if (normalizedPassword.length < PASSWORD_MIN_LENGTH) {
      return { ok: false, code: 400, message: `Password must be at least ${PASSWORD_MIN_LENGTH} chars` };
    }
    if (stmtGetByNicknameKey.get(validation.nicknameKey)) {
      return { ok: false, code: 409, message: 'Nickname is already registered' };
    }
    const now = nowMs();
    const result = stmtInsertAccount.run({
      nickname: validation.nickname,
      nicknameKey: validation.nicknameKey,
      passwordHash: hashPassword(normalizedPassword),
      createdAt: now,
      updatedAt: now,
    });
    const account = getAccountById(result.lastInsertRowid);
    const token = createSession(account.id);
    return { ok: true, player: account, token, identities: [] };
  }

  function authenticate(nickname, password) {
    const row = getAccountWithSecretByNickname(nickname);
    if (!row || !row.is_active) {
      return { ok: false, code: 401, message: 'Invalid nickname or password' };
    }
    if (!verifyPassword(password, row.password_hash)) {
      return { ok: false, code: 401, message: 'Invalid nickname or password' };
    }
    const token = createSession(row.id);
    return {
      ok: true,
      token,
      player: parsePlayerRow(row),
      identities: listIdentities(row.id),
    };
  }

  function updatePassword(nickname, password) {
    const validation = validateNickname(nickname);
    if (!validation.ok) {
      return { ok: false, code: 400, message: validation.message };
    }
    const normalizedPassword = (password || '').toString();
    if (normalizedPassword.length < PASSWORD_MIN_LENGTH) {
      return { ok: false, code: 400, message: `Password must be at least ${PASSWORD_MIN_LENGTH} chars` };
    }
    const row = getAccountWithSecretByNickname(validation.nickname);
    if (!row || !row.is_active) {
      return { ok: false, code: 404, message: 'Player not found' };
    }
    const now = nowMs();
    stmtUpdatePasswordHash.run(hashPassword(normalizedPassword), now, row.id);
    stmtDeleteSessionsByPlayerId.run(row.id);
    return {
      ok: true,
      player: parsePlayerRow({ ...row, updated_at: now }),
      message: `Password updated for ${validation.nickname}`,
    };
  }

  function getNicknameStatus(nickname) {
    const validation = validateNickname(nickname);
    if (!validation.ok) {
      return {
        ok: false,
        code: 400,
        message: validation.message,
        nickname: normalizeNickname(nickname),
        nicknameKey: normalizeNicknameKey(nickname),
        isRegistered: false,
      };
    }
    const account = parsePlayerRow(stmtGetByNicknameKey.get(validation.nicknameKey));
    return {
      ok: true,
      nickname: validation.nickname,
      nicknameKey: validation.nicknameKey,
      isRegistered: !!account,
      player: account,
    };
  }

  function countAccounts() {
    const row = stmtCountAccounts.get();
    return Math.max(0, Number(row?.total) || 0);
  }

  function createProviderPlaceholder(playerId, provider, providerUserId, providerEmail = '') {
    const normalizedProvider = (provider || '').toString().trim().toLowerCase();
    if (!PROVIDERS.has(normalizedProvider)) {
      return { ok: false, code: 400, message: 'Unsupported provider' };
    }
    if (!getAccountById(playerId)) {
      return { ok: false, code: 404, message: 'Player not found' };
    }
    try {
      stmtInsertIdentity.run(
        Number(playerId) || 0,
        normalizedProvider,
        (providerUserId || '').toString().trim(),
        (providerEmail || '').toString().trim().slice(0, 200),
        nowMs(),
      );
    } catch (err) {
      return { ok: false, code: 409, message: err?.message || 'Identity already exists' };
    }
    return { ok: true, identities: listIdentities(playerId) };
  }

  function createUniqueExternalNickname(provider, nicknameBase) {
    const providerPrefixMap = {
      google: 'Google',
      vk: 'VK',
      mailru: 'Mail',
    };
    const prefix = providerPrefixMap[(provider || '').toString().trim().toLowerCase()] || 'Player';
    const seed = sanitizeNicknameSeed(nicknameBase, prefix);
    const variants = [seed];
    if (!seed.toLowerCase().startsWith(prefix.toLowerCase())) {
      variants.push(sanitizeNicknameSeed(`${prefix} ${seed}`, prefix));
    }
    variants.push(prefix);
    for (const baseVariant of variants) {
      const base = sanitizeNicknameSeed(baseVariant, prefix).slice(0, NICKNAME_MAX_LENGTH);
      const initialValidation = validateNickname(base);
      if (initialValidation.ok && !stmtGetByNicknameKey.get(initialValidation.nicknameKey)) {
        return initialValidation.nickname;
      }
      for (let attempt = 1; attempt <= 200; attempt += 1) {
        const suffix = ` ${1000 + attempt}`;
        const trimmedBase = base.slice(0, Math.max(1, NICKNAME_MAX_LENGTH - suffix.length)).trim();
        const candidate = normalizeNickname(`${trimmedBase}${suffix}`);
        const validation = validateNickname(candidate);
        if (!validation.ok) continue;
        if (!stmtGetByNicknameKey.get(validation.nicknameKey)) {
          return validation.nickname;
        }
      }
    }
    return normalizeNickname(`Player ${Date.now().toString().slice(-6)}`);
  }

  function isGenericExternalNickname(nickname, provider) {
    const normalizedNickname = normalizeNickname(nickname).toLowerCase();
    const normalizedProvider = (provider || '').toString().trim().toLowerCase();
    const providerPrefixMap = {
      google: ['google', 'google player'],
      vk: ['vk', 'vk player', 'vk id', 'vk user', 'vk игрок'],
      mailru: ['mail', 'mail ru', 'mail player'],
    };
    const prefixes = providerPrefixMap[normalizedProvider] || ['player'];
    return prefixes.some((prefix) => normalizedNickname === prefix || normalizedNickname.startsWith(`${prefix} `));
  }

  function maybeRefreshExternalNickname(player, provider, nicknameBase) {
    if (!player || !player.id || !nicknameBase) return player;
    if (!isGenericExternalNickname(player.nickname, provider)) return player;
    const seed = sanitizeNicknameSeed(nicknameBase, player.nickname);
    if (!seed || isGenericExternalNickname(seed, provider)) return player;
    const validation = validateNickname(seed);
    let nextNickname = '';
    if (validation.ok && validation.nicknameKey === normalizeNicknameKey(player.nickname)) {
      return player;
    }
    if (validation.ok && !stmtGetByNicknameKey.get(validation.nicknameKey)) {
      nextNickname = validation.nickname;
    } else {
      nextNickname = createUniqueExternalNickname(provider, seed);
    }
    if (!nextNickname || normalizeNicknameKey(nextNickname) === normalizeNicknameKey(player.nickname)) {
      return player;
    }
    const nextValidation = validateNickname(nextNickname);
    if (!nextValidation.ok) return player;
    const now = nowMs();
    stmtUpdateNickname.run(nextValidation.nickname, nextValidation.nicknameKey, now, player.id);
    return getAccountById(player.id) || player;
  }

  function needsNicknameSetup(playerId) {
    const player = getAccountById(playerId);
    if (!player || !player.isActive) return false;
    const identities = listIdentities(player.id);
    return identities.some((identity) => isGenericExternalNickname(player.nickname, identity.provider));
  }

  function renamePlayer(playerId, nickname, { requireNicknameSetup = false } = {}) {
    const player = getAccountById(playerId);
    if (!player || !player.isActive) {
      return { ok: false, code: 404, message: 'Player not found' };
    }
    if (requireNicknameSetup && !needsNicknameSetup(player.id)) {
      return { ok: false, code: 400, message: 'Nickname setup is not required' };
    }
    const validation = validateNickname(nickname);
    if (!validation.ok) {
      return { ok: false, code: 400, message: validation.message };
    }
    const existing = parsePlayerRow(stmtGetByNicknameKey.get(validation.nicknameKey));
    if (existing && existing.id !== player.id) {
      return { ok: false, code: 409, message: 'Nickname is already registered' };
    }
    const now = nowMs();
    stmtUpdateNickname.run(validation.nickname, validation.nicknameKey, now, player.id);
    const updatedPlayer = getAccountById(player.id);
    return {
      ok: true,
      player: updatedPlayer,
      identities: listIdentities(player.id),
      needsNicknameSetup: needsNicknameSetup(player.id),
    };
  }

  function authenticateExternal({ provider, providerUserId, providerEmail = '', nicknameBase = '' }) {
    const normalizedProvider = (provider || '').toString().trim().toLowerCase();
    const externalUserId = (providerUserId || '').toString().trim();
    const externalEmail = (providerEmail || '').toString().trim().slice(0, 200);
    if (!PROVIDERS.has(normalizedProvider)) {
      return { ok: false, code: 400, message: 'Unsupported provider' };
    }
    if (!externalUserId) {
      return { ok: false, code: 400, message: 'Provider user id is required' };
    }
    const existingIdentity = parseIdentityRow(stmtGetIdentityByProviderUserId.get(normalizedProvider, externalUserId));
    if (existingIdentity) {
      let player = getAccountById(existingIdentity.playerAccountId || 0);
      if (!player || !player.isActive) {
        return { ok: false, code: 404, message: 'Player account is unavailable' };
      }
      player = maybeRefreshExternalNickname(player, normalizedProvider, nicknameBase);
      const token = createSession(player.id);
      return {
        ok: true,
        token,
        player,
        identities: listIdentities(player.id),
        createdAccount: false,
      };
    }

    const createExternalAccountTx = db.transaction(() => {
      const nickname = createUniqueExternalNickname(normalizedProvider, nicknameBase);
      const validation = validateNickname(nickname);
      if (!validation.ok) {
        throw new Error(validation.message || 'Failed to generate nickname');
      }
      const now = nowMs();
      const result = stmtInsertAccount.run({
        nickname: validation.nickname,
        nicknameKey: validation.nicknameKey,
        passwordHash: hashPassword(randomToken(24)),
        createdAt: now,
        updatedAt: now,
      });
      const playerId = Number(result.lastInsertRowid) || 0;
      stmtInsertIdentity.run(
        playerId,
        normalizedProvider,
        externalUserId,
        externalEmail,
        now,
      );
      return getAccountById(playerId);
    });

    let player = null;
    try {
      player = createExternalAccountTx();
    } catch (err) {
      return { ok: false, code: 500, message: err?.message || 'Failed to create external account' };
    }
    if (!player) {
      return { ok: false, code: 500, message: 'Failed to create external account' };
    }
    const token = createSession(player.id);
    return {
      ok: true,
      token,
      player,
      identities: listIdentities(player.id),
      createdAccount: true,
    };
  }

  return {
    validateNickname,
    getAccountById,
    getAccountByNickname,
    getNicknameStatus,
    countAccounts,
    getSession,
    deleteSession,
    register,
    authenticate,
    authenticateExternal,
    renamePlayer,
    needsNicknameSetup,
    updatePassword,
    createProviderPlaceholder,
  };
}

module.exports = {
  createPlayerAuthStore,
  normalizeNickname,
  normalizeNicknameKey,
  validateNickname,
};
