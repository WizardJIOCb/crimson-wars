const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
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

function createPlayerAuthStore({ dataDir, dbPath }) {
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
  const stmtInsertAccount = db.prepare([
    'INSERT INTO player_accounts (nickname, nickname_key, password_hash, is_active, created_at, updated_at, last_login_at)',
    'VALUES (@nickname, @nicknameKey, @passwordHash, 1, @createdAt, @updatedAt, 0)',
  ].join('\n'));
  const stmtUpdateLastLogin = db.prepare('UPDATE player_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?');
  const stmtUpdatePasswordHash = db.prepare('UPDATE player_accounts SET password_hash = ?, updated_at = ? WHERE id = ?');
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

  function createProviderPlaceholder(playerId, provider, providerUserId, providerEmail = '') {
    const normalizedProvider = (provider || '').toString().trim().toLowerCase();
    if (!PROVIDERS.has(normalizedProvider)) {
      return { ok: false, code: 400, message: 'Unsupported provider' };
    }
    if (!getAccountById(playerId)) {
      return { ok: false, code: 404, message: 'Player not found' };
    }
    const stmtInsertIdentity = db.prepare([
      'INSERT INTO player_identities (player_account_id, provider, provider_user_id, provider_email, created_at)',
      'VALUES (?, ?, ?, ?, ?)',
    ].join('\n'));
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

  return {
    validateNickname,
    getAccountById,
    getAccountByNickname,
    getNicknameStatus,
    getSession,
    deleteSession,
    register,
    authenticate,
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
