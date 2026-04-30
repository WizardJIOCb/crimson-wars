const fs = require('fs');
const path = require('path');

const config = require('./config');
const { createAccountProgressionStore } = require('./account-progression-store');
const { createRecordsStore } = require('./records-store');
const { isMysqlStoreEnabled } = require('./mysql-sync');

const LOG_PATH = path.join(config.DATA_DIR, 'run-persist-worker.log');

function log(message, err = null) {
  try {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
    const line = [
      new Date().toISOString(),
      message,
      err?.stack || err?.message || '',
    ].filter(Boolean).join(' ');
    fs.appendFileSync(LOG_PATH, `${line}\n`, 'utf8');
  } catch (_) {
    // The worker must never crash while trying to report its own crash.
  }
}

function createStores() {
  const mysql = isMysqlStoreEnabled() ? { enabled: true } : { enabled: false };
  const recordsStore = createRecordsStore({
    dataDir: config.DATA_DIR,
    dbPath: config.RECORDS_DB_PATH,
    leaderboardLimit: config.LEADERBOARD_LIMIT,
    leaderboardPageSize: config.LEADERBOARD_PAGE_SIZE,
    mysql,
  });
  const accountProgressionStore = createAccountProgressionStore({
    dataDir: config.DATA_DIR,
    dbPath: config.PLAYER_AUTH_DB_PATH,
    baseHeroId: config.ACCOUNT_BASE_HERO_ID,
    maps: config.MAP_DEFS,
    campaigns: config.CAMPAIGN_DEFS,
    heroDefs: config.HERO_DEFS,
    heroSkillTreeDefs: config.HERO_SKILL_TREE_DEFS,
    heroUniqueSkillDefs: config.HERO_UNIQUE_SKILL_DEFS,
    heroLevelCap: config.HERO_LEVEL_CAP,
    heroXpBase: config.HERO_XP_BASE,
    heroXpPerLevel: config.HERO_XP_PER_LEVEL,
    heroXpQuad: config.HERO_XP_QUAD,
    itemSalvageStart: config.ITEM_SALVAGE_START,
    itemSlotDefs: config.ITEM_SLOT_DEFS,
    itemDefs: config.ITEM_DEFS,
    xpBase: config.ACCOUNT_XP_BASE,
    xpPerLevel: config.ACCOUNT_XP_PER_LEVEL,
    xpQuad: config.ACCOUNT_XP_QUAD,
    xpFromScoreMul: config.ACCOUNT_XP_FROM_SCORE_MUL,
    xpFromKillsMul: config.ACCOUNT_XP_FROM_KILLS_MUL,
    xpFromBossKillsMul: config.ACCOUNT_XP_FROM_BOSS_KILLS_MUL,
    xpFromSurvivalSecMul: config.ACCOUNT_XP_FROM_SURVIVAL_SEC_MUL,
    shardsFromScoreMul: config.ACCOUNT_SHARDS_FROM_SCORE_MUL,
    shardsFromKillsMul: config.ACCOUNT_SHARDS_FROM_KILLS_MUL,
    shardsFromBossKillsMul: config.ACCOUNT_SHARDS_FROM_BOSS_KILLS_MUL,
    shardsFromSurvivalSecMul: config.ACCOUNT_SHARDS_FROM_SURVIVAL_SEC_MUL,
    mysql,
  });
  return { recordsStore, accountProgressionStore };
}

function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) throw new Error('Missing run persistence payload path');
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  const { recordsStore, accountProgressionStore } = createStores();

  if (payload.record) {
    if (typeof recordsStore.persistRecord === 'function') recordsStore.persistRecord(payload.record);
    else recordsStore.pushRecord(payload.record);
  }

  if (payload.playerAccountId && payload.progression) {
    accountProgressionStore.saveProgressionSnapshot(payload.playerAccountId, payload.progression);
  }

  fs.unlinkSync(payloadPath);
}

try {
  main();
} catch (err) {
  log('Run persistence worker failed:', err);
  process.exitCode = 1;
}
