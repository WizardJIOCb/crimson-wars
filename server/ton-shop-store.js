const crypto = require('crypto');
const fs = require('fs');
const Database = require('better-sqlite3');
const { createMysqlSyncClient, escapeSql, jsonObjectSql } = require('./mysql-sync');

function nowMs() {
  return Date.now();
}

function randomOrderId() {
  return `ton_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function normalizeOrderRow(row) {
  if (!row) return null;
  return {
    id: String(row.id || '').trim(),
    playerId: Math.max(0, Number(row.player_id ?? row.playerId) || 0),
    productId: String((row.product_id ?? row.productId) || '').trim(),
    amountNanoTon: String((row.amount_nano_ton ?? row.amountNanoTon) || '0'),
    receiverAddress: String((row.receiver_address ?? row.receiverAddress) || '').trim(),
    network: String(row.network || '').trim(),
    networkId: String((row.network_id ?? row.networkId) || '').trim(),
    comment: String(row.comment || '').trim(),
    payloadBoc: String((row.payload_boc ?? row.payloadBoc) || '').trim(),
    walletAddress: String((row.wallet_address ?? row.walletAddress) || '').trim(),
    boc: String(row.boc || '').trim(),
    status: String(row.status || 'pending').trim(),
    createdAt: Math.max(0, Number(row.created_at ?? row.createdAt) || 0),
    updatedAt: Math.max(0, Number(row.updated_at ?? row.updatedAt) || 0),
    expiresAt: Math.max(0, Number(row.expires_at ?? row.expiresAt) || 0),
    submittedAt: Math.max(0, Number(row.submitted_at ?? row.submittedAt) || 0),
    confirmedAt: Math.max(0, Number(row.confirmed_at ?? row.confirmedAt) || 0),
  };
}

function createTonShopOrderStore({ dataDir, dbPath, mysql } = {}) {
  const useMysql = !!mysql?.enabled;
  const mysqlClient = useMysql ? createMysqlSyncClient(mysql) : null;
  if (!useMysql) fs.mkdirSync(dataDir, { recursive: true });
  const db = useMysql ? null : new Database(dbPath);
  if (!useMysql) {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }

  if (!useMysql) {
    db.exec([
      'CREATE TABLE IF NOT EXISTS ton_shop_orders (',
      '  id TEXT PRIMARY KEY,',
      '  player_id INTEGER NOT NULL,',
      '  product_id TEXT NOT NULL,',
      '  amount_nano_ton TEXT NOT NULL,',
      '  receiver_address TEXT NOT NULL,',
      '  network TEXT NOT NULL,',
      '  network_id TEXT NOT NULL,',
      '  comment TEXT NOT NULL,',
      '  payload_boc TEXT NOT NULL DEFAULT \'\',',
      '  wallet_address TEXT NOT NULL DEFAULT \'\',',
      '  boc TEXT NOT NULL DEFAULT \'\',',
      '  status TEXT NOT NULL,',
      '  created_at INTEGER NOT NULL,',
      '  updated_at INTEGER NOT NULL,',
      '  expires_at INTEGER NOT NULL,',
      '  submitted_at INTEGER NOT NULL DEFAULT 0,',
      '  confirmed_at INTEGER NOT NULL DEFAULT 0',
      ');',
      'CREATE INDEX IF NOT EXISTS idx_ton_shop_orders_player ON ton_shop_orders(player_id, created_at);',
      'CREATE INDEX IF NOT EXISTS idx_ton_shop_orders_status ON ton_shop_orders(status, created_at);',
    ].join('\n'));
  } else {
    mysqlClient.execute([
      'CREATE TABLE IF NOT EXISTS ton_shop_orders (',
      '  id VARCHAR(96) PRIMARY KEY,',
      '  player_id BIGINT NOT NULL,',
      '  product_id VARCHAR(128) NOT NULL,',
      '  amount_nano_ton VARCHAR(64) NOT NULL,',
      '  receiver_address VARCHAR(256) NOT NULL,',
      '  network VARCHAR(32) NOT NULL,',
      '  network_id VARCHAR(32) NOT NULL,',
      '  comment VARCHAR(512) NOT NULL,',
      '  payload_boc LONGTEXT NOT NULL,',
      '  wallet_address VARCHAR(256) NOT NULL DEFAULT \'\',',
      '  boc LONGTEXT NOT NULL,',
      '  status VARCHAR(32) NOT NULL,',
      '  created_at BIGINT NOT NULL,',
      '  updated_at BIGINT NOT NULL,',
      '  expires_at BIGINT NOT NULL,',
      '  submitted_at BIGINT NOT NULL DEFAULT 0,',
      '  confirmed_at BIGINT NOT NULL DEFAULT 0,',
      '  INDEX idx_ton_shop_orders_player (player_id, created_at),',
      '  INDEX idx_ton_shop_orders_status (status, created_at)',
      ') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    ].join('\n'));
  }

  const orderJsonSql = jsonObjectSql({
    id: 'id',
    player_id: 'player_id',
    product_id: 'product_id',
    amount_nano_ton: 'amount_nano_ton',
    receiver_address: 'receiver_address',
    network: 'network',
    network_id: 'network_id',
    comment: 'comment',
    payload_boc: 'payload_boc',
    wallet_address: 'wallet_address',
    boc: 'boc',
    status: 'status',
    created_at: 'created_at',
    updated_at: 'updated_at',
    expires_at: 'expires_at',
    submitted_at: 'submitted_at',
    confirmed_at: 'confirmed_at',
  });

  const stmtGet = useMysql
    ? {
      get(id) {
        return mysqlClient.queryJsonOne(`SELECT ${orderJsonSql} FROM ton_shop_orders WHERE id = ${escapeSql(id)} LIMIT 1`);
      },
    }
    : db.prepare('SELECT * FROM ton_shop_orders WHERE id = ? LIMIT 1');
  const stmtInsert = useMysql
    ? {
      run(order) {
        mysqlClient.execute([
          'INSERT INTO ton_shop_orders (id, player_id, product_id, amount_nano_ton, receiver_address, network, network_id, comment, payload_boc, wallet_address, boc, status, created_at, updated_at, expires_at, submitted_at, confirmed_at)',
          `VALUES (${[
            order.id,
            order.playerId,
            order.productId,
            order.amountNanoTon,
            order.receiverAddress,
            order.network,
            order.networkId,
            order.comment,
            order.payloadBoc,
            '',
            '',
            order.status,
            order.createdAt,
            order.updatedAt,
            order.expiresAt,
            0,
            0,
          ].map(escapeSql).join(', ')})`,
        ].join('\n'));
      },
    }
    : db.prepare([
      'INSERT INTO ton_shop_orders (id, player_id, product_id, amount_nano_ton, receiver_address, network, network_id, comment, payload_boc, wallet_address, boc, status, created_at, updated_at, expires_at, submitted_at, confirmed_at)',
      'VALUES (@id, @playerId, @productId, @amountNanoTon, @receiverAddress, @network, @networkId, @comment, @payloadBoc, \'\', \'\', @status, @createdAt, @updatedAt, @expiresAt, 0, 0)',
    ].join('\n'));
  const stmtSubmit = useMysql
    ? {
      run(payload) {
        mysqlClient.execute([
          'UPDATE ton_shop_orders SET',
          `  wallet_address=${escapeSql(payload.walletAddress)},`,
          `  boc=${escapeSql(payload.boc)},`,
          `  status=${escapeSql(payload.status)},`,
          `  submitted_at=${escapeSql(payload.submittedAt)},`,
          `  updated_at=${escapeSql(payload.updatedAt)}`,
          `WHERE id=${escapeSql(payload.id)}`,
        ].join('\n'));
      },
    }
    : db.prepare('UPDATE ton_shop_orders SET wallet_address=@walletAddress, boc=@boc, status=@status, submitted_at=@submittedAt, updated_at=@updatedAt WHERE id=@id');
  const stmtConfirm = useMysql
    ? {
      run(payload) {
        mysqlClient.execute([
          'UPDATE ton_shop_orders SET',
          `  status=${escapeSql(payload.status)},`,
          `  confirmed_at=${escapeSql(payload.confirmedAt)},`,
          `  updated_at=${escapeSql(payload.updatedAt)}`,
          `WHERE id=${escapeSql(payload.id)}`,
        ].join('\n'));
      },
    }
    : db.prepare('UPDATE ton_shop_orders SET status=@status, confirmed_at=@confirmedAt, updated_at=@updatedAt WHERE id=@id');

  function createOrder(payload = {}) {
    const createdAt = nowMs();
    const order = {
      id: String(payload.id || randomOrderId()).trim(),
      playerId: Math.max(0, Number(payload.playerId) || 0),
      productId: String(payload.productId || '').trim(),
      amountNanoTon: String(payload.amountNanoTon || '0'),
      receiverAddress: String(payload.receiverAddress || '').trim(),
      network: String(payload.network || '').trim(),
      networkId: String(payload.networkId || '').trim(),
      comment: String(payload.comment || '').trim(),
      payloadBoc: String(payload.payloadBoc || '').trim(),
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
      expiresAt: Math.max(createdAt + 60000, Number(payload.expiresAt) || createdAt + 1000 * 60 * 20),
    };
    stmtInsert.run(order);
    return normalizeOrderRow(stmtGet.get(order.id));
  }

  function getOrder(orderId) {
    return normalizeOrderRow(stmtGet.get(String(orderId || '').trim()));
  }

  function submitOrder(orderId, { walletAddress = '', boc = '' } = {}) {
    const order = getOrder(orderId);
    if (!order) return null;
    const now = nowMs();
    const status = order.status === 'paid' ? 'paid' : 'submitted';
    stmtSubmit.run({
      id: order.id,
      walletAddress: String(walletAddress || '').trim().slice(0, 256),
      boc: String(boc || '').trim(),
      status,
      submittedAt: order.submittedAt || now,
      updatedAt: now,
    });
    return getOrder(order.id);
  }

  function markOrderPaid(orderId) {
    const order = getOrder(orderId);
    if (!order) return null;
    if (order.status === 'paid') return order;
    const now = nowMs();
    stmtConfirm.run({
      id: order.id,
      status: 'paid',
      confirmedAt: now,
      updatedAt: now,
    });
    return getOrder(order.id);
  }

  return {
    createOrder,
    getOrder,
    submitOrder,
    markOrderPaid,
  };
}

module.exports = {
  createTonShopOrderStore,
};
