const { Address, Cell } = require('@ton/core');

const TONCENTER_MAINNET_URL = 'https://toncenter.com/api/v2';
const TONCENTER_TESTNET_URL = 'https://testnet.toncenter.com/api/v2';

function envEnabled(name) {
  const value = String(process.env[name] || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function normalizeNetwork(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return value === 'mainnet' || value === '-239' ? 'mainnet' : 'testnet';
}

function getToncenterBaseUrl(network) {
  const override = String(process.env.TONCENTER_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (override) return override;
  return normalizeNetwork(network) === 'mainnet' ? TONCENTER_MAINNET_URL : TONCENTER_TESTNET_URL;
}

function normalizeAddressKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return Address.parse(raw).toRawString().toLowerCase();
  } catch (_) {
    return raw.toLowerCase();
  }
}

function normalizeAmount(value) {
  try {
    const raw = String(value ?? '').trim();
    if (!raw) return 0n;
    return BigInt(raw);
  } catch (_) {
    return 0n;
  }
}

function decodeTextCommentFromBody(body) {
  const raw = String(body || '').trim();
  if (!raw) return '';
  try {
    const cell = Cell.fromBase64(raw);
    const slice = cell.beginParse();
    if (slice.remainingBits < 32) return '';
    const opcode = slice.loadUint(32);
    if (opcode !== 0) return '';
    return slice.loadStringTail().trim();
  } catch (_) {
    return '';
  }
}

function extractMessageComment(message = {}) {
  const direct = String(message.message || '').trim();
  if (direct) return direct;
  const msgData = message.msg_data || message.msgData || {};
  const typedText = String(msgData.text || msgData.message || '').trim();
  if (typedText) return typedText;
  return decodeTextCommentFromBody(msgData.body);
}

function extractTransactionCandidate(tx = {}) {
  const inMsg = tx.in_msg || tx.inMessage || tx.in_msg_extended || null;
  if (!inMsg || typeof inMsg !== 'object') return null;
  const txId = tx.transaction_id || tx.transactionId || {};
  const hash = String(txId.hash || tx.hash || '').trim();
  const lt = String(txId.lt || tx.lt || '').trim();
  return {
    hash,
    lt,
    utime: Math.max(0, Number(tx.utime || tx.now) || 0),
    source: String(inMsg.source || '').trim(),
    destination: String(inMsg.destination || tx.account || tx.address?.account_address || '').trim(),
    amountNanoTon: normalizeAmount(inMsg.value),
    comment: extractMessageComment(inMsg),
  };
}

function isTxTimeAcceptable(order, candidate, { earlyMs, lateMs } = {}) {
  const txMs = Math.max(0, Number(candidate?.utime) || 0) * 1000;
  if (!txMs) return true;
  const createdAt = Math.max(0, Number(order?.createdAt) || 0);
  const expiresAt = Math.max(0, Number(order?.expiresAt) || 0);
  if (createdAt && txMs < createdAt - earlyMs) return false;
  if (expiresAt && txMs > expiresAt + lateMs) return false;
  return true;
}

function matchOrderTransaction(order, tx, options = {}) {
  const candidate = extractTransactionCandidate(tx);
  if (!candidate) return null;
  const expectedReceiver = normalizeAddressKey(order?.receiverAddress);
  const actualReceiver = normalizeAddressKey(candidate.destination);
  if (expectedReceiver && actualReceiver && expectedReceiver !== actualReceiver) return null;
  if (candidate.comment !== String(order?.comment || '').trim()) return null;
  if (candidate.amountNanoTon < normalizeAmount(order?.amountNanoTon)) return null;
  if (!isTxTimeAcceptable(order, candidate, options)) return null;

  if (options.strictSource && order?.walletAddress) {
    const expectedSource = normalizeAddressKey(order.walletAddress);
    const actualSource = normalizeAddressKey(candidate.source);
    if (expectedSource && actualSource && expectedSource !== actualSource) return null;
  }
  return candidate;
}

async function fetchReceiverTransactions({ receiverAddress, network, limit }) {
  const baseUrl = getToncenterBaseUrl(network);
  const url = new URL(`${baseUrl}/getTransactions`);
  url.searchParams.set('address', String(receiverAddress || '').trim());
  url.searchParams.set('limit', String(Math.max(1, Math.min(100, Number(limit) || 40))));
  url.searchParams.set('archival', 'false');
  const headers = { accept: 'application/json' };
  const apiKey = String(process.env.TONCENTER_API_KEY || process.env.TON_CENTER_API_KEY || '').trim();
  if (apiKey) headers['X-API-Key'] = apiKey;
  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok || !Array.isArray(payload.result)) {
    const code = payload?.code || response.status;
    const message = payload?.error || response.statusText || 'TON Center request failed';
    const err = new Error(`TON verifier request failed (${code}): ${message}`);
    err.statusCode = response.status;
    err.toncenterCode = code;
    throw err;
  }
  return payload.result;
}

function createTonPaymentVerifier({ orderStore, logger = console } = {}) {
  const txLimit = Math.max(5, Math.min(100, Number(process.env.TON_VERIFIER_TX_LIMIT) || 40));
  const earlyMs = Math.max(0, Number(process.env.TON_VERIFIER_EARLY_MS) || 5 * 60 * 1000);
  const lateMs = Math.max(0, Number(process.env.TON_VERIFIER_LATE_MS) || 10 * 60 * 1000);
  const cacheTtlMs = Math.max(0, Number(process.env.TON_VERIFIER_CACHE_TTL_MS) || 2500);
  const strictSource = envEnabled('TON_VERIFIER_STRICT_SOURCE');
  const cache = new Map();

  async function getTransactionsForOrder(order) {
    const key = `${normalizeNetwork(order?.network)}:${normalizeAddressKey(order?.receiverAddress)}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at <= cacheTtlMs) return cached.promise;
    const promise = fetchReceiverTransactions({
      receiverAddress: order.receiverAddress,
      network: order.network,
      limit: txLimit,
    });
    cache.set(key, { at: Date.now(), promise });
    return promise;
  }

  async function verifyOrder(order) {
    if (!order || order.status === 'paid') return { ok: true, order, verified: order?.status === 'paid' };
    if (!orderStore?.markOrderPaid) return { ok: false, order, verified: false, reason: 'store-unavailable' };
    if (!order.receiverAddress || !order.comment || !order.amountNanoTon) {
      return { ok: false, order, verified: false, reason: 'order-incomplete' };
    }
    let transactions;
    try {
      transactions = await getTransactionsForOrder(order);
    } catch (err) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn(`[ton-verifier] ${err?.message || err}`);
      }
      return { ok: false, order, verified: false, reason: 'api-error' };
    }
    for (const tx of transactions) {
      const match = matchOrderTransaction(order, tx, { earlyMs, lateMs, strictSource });
      if (!match) continue;
      const paid = orderStore.markOrderPaid(order.id, {
        paidTxHash: match.hash,
        paidTxLt: match.lt,
        paidTxUtime: match.utime,
        paidAmountNanoTon: match.amountNanoTon.toString(),
        verifier: 'toncenter-v2',
      });
      return {
        ok: true,
        order: paid,
        verified: true,
        transaction: {
          hash: match.hash,
          lt: match.lt,
          utime: match.utime,
          amountNanoTon: match.amountNanoTon.toString(),
        },
      };
    }
    return { ok: true, order, verified: false, reason: 'not-found' };
  }

  async function verifyOrders(orders = []) {
    const out = [];
    for (const order of Array.isArray(orders) ? orders : []) {
      out.push(await verifyOrder(order));
    }
    return out;
  }

  return {
    verifyOrder,
    verifyOrders,
    matchOrderTransaction,
  };
}

module.exports = {
  createTonPaymentVerifier,
  decodeTextCommentFromBody,
  extractMessageComment,
  matchOrderTransaction,
  normalizeAddressKey,
};
