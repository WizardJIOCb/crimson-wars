const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function nowMs() {
  return Date.now();
}

function normalizeLogin(login) {
  return (login || '').toString().trim().slice(0, 40);
}

function normalizeLoginKey(login) {
  return normalizeLogin(login).toLowerCase();
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

function parseAdminRow(row) {
  if (!row) return null;
  return {
    id: Math.max(0, Number(row.id) || 0),
    login: normalizeLogin(row.login),
    canManageAdmins: !!row.can_manage_admins,
    isActive: !!row.is_active,
    createdAt: Math.max(0, Number(row.created_at) || 0),
    updatedAt: Math.max(0, Number(row.updated_at) || 0),
    lastLoginAt: Math.max(0, Number(row.last_login_at) || 0),
  };
}

function createAdminAuthStore({ dataDir, dbPath, bootstrapLogin, bootstrapPassword, isProd }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec([
    'CREATE TABLE IF NOT EXISTS admin_users (',
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  login TEXT NOT NULL,',
    '  login_key TEXT NOT NULL UNIQUE,',
    '  password_hash TEXT NOT NULL,',
    '  can_manage_admins INTEGER NOT NULL DEFAULT 0,',
    '  is_active INTEGER NOT NULL DEFAULT 1,',
    '  created_at INTEGER NOT NULL,',
    '  updated_at INTEGER NOT NULL,',
    '  last_login_at INTEGER NOT NULL DEFAULT 0',
    ');',
    'CREATE TABLE IF NOT EXISTS admin_sessions (',
    '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  user_id INTEGER NOT NULL,',
    '  token_hash TEXT NOT NULL UNIQUE,',
    '  created_at INTEGER NOT NULL,',
    '  expires_at INTEGER NOT NULL,',
    '  last_seen_at INTEGER NOT NULL,',
    '  FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE',
    ');',
    'CREATE INDEX IF NOT EXISTS idx_admin_sessions_hash ON admin_sessions(token_hash);',
    'CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);',
  ].join('\n'));

  const stmtGetUserByLoginKey = db.prepare('SELECT * FROM admin_users WHERE login_key = ?');
  const stmtGetUserById = db.prepare('SELECT * FROM admin_users WHERE id = ?');
  const stmtListUsers = db.prepare('SELECT * FROM admin_users ORDER BY can_manage_admins DESC, login_key ASC');
  const stmtInsertUser = db.prepare([
    'INSERT INTO admin_users (login, login_key, password_hash, can_manage_admins, is_active, created_at, updated_at, last_login_at)',
    'VALUES (@login, @loginKey, @passwordHash, @canManageAdmins, @isActive, @createdAt, @updatedAt, 0)',
  ].join('\n'));
  const stmtUpdateUser = db.prepare([
    'UPDATE admin_users',
    'SET login=@login, login_key=@loginKey, password_hash=@passwordHash, can_manage_admins=@canManageAdmins, is_active=@isActive, updated_at=@updatedAt',
    'WHERE id=@id',
  ].join('\n'));
  const stmtDeleteUser = db.prepare('DELETE FROM admin_users WHERE id = ?');
  const stmtManagersCount = db.prepare('SELECT COUNT(*) AS count FROM admin_users WHERE can_manage_admins = 1 AND is_active = 1');
  const stmtInsertSession = db.prepare([
    'INSERT INTO admin_sessions (user_id, token_hash, created_at, expires_at, last_seen_at)',
    'VALUES (@userId, @tokenHash, @createdAt, @expiresAt, @lastSeenAt)',
  ].join('\n'));
  const stmtGetSessionByHash = db.prepare([
    'SELECT s.id AS session_id, s.user_id AS session_user_id, s.created_at AS session_created_at, s.expires_at AS session_expires_at, s.last_seen_at AS session_last_seen_at, u.*',
    'FROM admin_sessions s',
    'JOIN admin_users u ON u.id = s.user_id',
    'WHERE s.token_hash = ?',
  ].join('\n'));
  const stmtDeleteSessionByHash = db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?');
  const stmtDeleteSessionsByUserId = db.prepare('DELETE FROM admin_sessions WHERE user_id = ?');
  const stmtTouchSession = db.prepare('UPDATE admin_sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?');
  const stmtUpdateLastLogin = db.prepare('UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?');
  const stmtPruneExpiredSessions = db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?');

  function pruneExpiredSessions() {
    stmtPruneExpiredSessions.run(nowMs());
  }

  function ensureBootstrapAdmin() {
    const login = normalizeLogin(bootstrapLogin || 'WizardJIOCb');
    const loginKey = normalizeLoginKey(login);
    let row = stmtGetUserByLoginKey.get(loginKey);
    if (row) return parseAdminRow(row);

    const password = (bootstrapPassword || '').toString();
    if (!password && isProd) {
      throw new Error('Missing bootstrap admin password for production');
    }
    const finalPassword = password || 'WizardJIOCb-local';
    const now = nowMs();
    const result = stmtInsertUser.run({
      login,
      loginKey,
      passwordHash: hashPassword(finalPassword),
      canManageAdmins: 1,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    });
    row = stmtGetUserById.get(result.lastInsertRowid);
    console.log(`Bootstrap admin ready: ${login}`);
    if (!isProd) {
      console.log(`Bootstrap admin password: ${finalPassword}`);
    }
    return parseAdminRow(row);
  }

  function listUsers() {
    return stmtListUsers.all().map(parseAdminRow);
  }

  function getUserById(id) {
    return parseAdminRow(stmtGetUserById.get(Number(id) || 0));
  }

  function getUserWithSecretByLogin(login) {
    const key = normalizeLoginKey(login);
    if (!key) return null;
    return stmtGetUserByLoginKey.get(key) || null;
  }

  function createSession(userId) {
    pruneExpiredSessions();
    const token = randomToken(32);
    const now = nowMs();
    stmtInsertSession.run({
      userId,
      tokenHash: hashSessionToken(token),
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      lastSeenAt: now,
    });
    stmtUpdateLastLogin.run(now, now, userId);
    return token;
  }

  function getSession(token) {
    if (!token) return null;
    pruneExpiredSessions();
    const row = stmtGetSessionByHash.get(hashSessionToken(token));
    if (!row) return null;
    if (!row.is_active) {
      stmtDeleteSessionsByUserId.run(row.session_user_id);
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
      user: parseAdminRow(row),
    };
  }

  function deleteSession(token) {
    if (!token) return;
    stmtDeleteSessionByHash.run(hashSessionToken(token));
  }

  function authenticate(login, password) {
    const row = getUserWithSecretByLogin(login);
    if (!row || !row.is_active) {
      return { ok: false, code: 401, message: 'Invalid login or password' };
    }
    if (!verifyPassword(password, row.password_hash)) {
      return { ok: false, code: 401, message: 'Invalid login or password' };
    }
    const token = createSession(row.id);
    return {
      ok: true,
      token,
      user: parseAdminRow(row),
    };
  }

  function createUser(actorUser, payload) {
    if (!actorUser?.canManageAdmins) {
      return { ok: false, code: 403, message: 'Forbidden' };
    }
    const login = normalizeLogin(payload?.login);
    const loginKey = normalizeLoginKey(login);
    const password = (payload?.password || '').toString();
    if (!loginKey || password.length < 6) {
      return { ok: false, code: 400, message: 'Login and password are required' };
    }
    if (stmtGetUserByLoginKey.get(loginKey)) {
      return { ok: false, code: 409, message: 'Login already exists' };
    }
    const now = nowMs();
    const result = stmtInsertUser.run({
      login,
      loginKey,
      passwordHash: hashPassword(password),
      canManageAdmins: payload?.canManageAdmins ? 1 : 0,
      isActive: payload?.isActive === false ? 0 : 1,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, user: getUserById(result.lastInsertRowid) };
  }

  function updateUser(actorUser, userId, payload) {
    if (!actorUser?.canManageAdmins) {
      return { ok: false, code: 403, message: 'Forbidden' };
    }
    const existing = stmtGetUserById.get(Number(userId) || 0);
    if (!existing) {
      return { ok: false, code: 404, message: 'Admin not found' };
    }
    const nextLogin = normalizeLogin(payload?.login ?? existing.login);
    const nextLoginKey = normalizeLoginKey(nextLogin);
    const nextCanManage = payload?.canManageAdmins === undefined ? !!existing.can_manage_admins : !!payload.canManageAdmins;
    const nextIsActive = payload?.isActive === undefined ? !!existing.is_active : !!payload.isActive;
    const nextPasswordHash = (payload?.password || '').toString()
      ? hashPassword(payload.password)
      : existing.password_hash;

    if (!nextLoginKey) {
      return { ok: false, code: 400, message: 'Login is required' };
    }
    if ((payload?.password || '').toString() && String(payload.password).length < 6) {
      return { ok: false, code: 400, message: 'Password must be at least 6 chars' };
    }
    const duplicate = stmtGetUserByLoginKey.get(nextLoginKey);
    if (duplicate && Number(duplicate.id) !== Number(existing.id)) {
      return { ok: false, code: 409, message: 'Login already exists' };
    }
    if (Number(existing.id) === Number(actorUser.id)) {
      if (!nextIsActive) return { ok: false, code: 400, message: 'You cannot disable yourself' };
      if (!nextCanManage) return { ok: false, code: 400, message: 'You cannot remove your own admin-management access' };
    }
    if (existing.can_manage_admins && (!nextCanManage || !nextIsActive) && Number(stmtManagersCount.get().count) <= 1) {
      return { ok: false, code: 400, message: 'At least one active admin manager is required' };
    }

    stmtUpdateUser.run({
      id: existing.id,
      login: nextLogin,
      loginKey: nextLoginKey,
      passwordHash: nextPasswordHash,
      canManageAdmins: nextCanManage ? 1 : 0,
      isActive: nextIsActive ? 1 : 0,
      updatedAt: nowMs(),
    });
    if (!nextIsActive) {
      stmtDeleteSessionsByUserId.run(existing.id);
    }
    return { ok: true, user: getUserById(existing.id) };
  }

  function deleteUser(actorUser, userId) {
    if (!actorUser?.canManageAdmins) {
      return { ok: false, code: 403, message: 'Forbidden' };
    }
    const existing = stmtGetUserById.get(Number(userId) || 0);
    if (!existing) {
      return { ok: false, code: 404, message: 'Admin not found' };
    }
    if (Number(existing.id) === Number(actorUser.id)) {
      return { ok: false, code: 400, message: 'You cannot delete yourself' };
    }
    if (existing.can_manage_admins && Number(stmtManagersCount.get().count) <= 1) {
      return { ok: false, code: 400, message: 'At least one active admin manager is required' };
    }
    stmtDeleteSessionsByUserId.run(existing.id);
    stmtDeleteUser.run(existing.id);
    return { ok: true };
  }

  ensureBootstrapAdmin();

  return {
    authenticate,
    getSession,
    deleteSession,
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
  };
}

module.exports = {
  createAdminAuthStore,
};
