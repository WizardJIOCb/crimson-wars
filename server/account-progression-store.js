const fs = require('fs');
const Database = require('better-sqlite3');
const { createMysqlSyncClient, escapeSql, jsonObjectSql } = require('./mysql-sync');

function nowMs() {
  return Date.now();
}

function clampInt(value, min = 0) {
  return Math.max(min, Math.floor(Number(value) || 0));
}

function safeJsonParse(raw, fallback) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function pickWeightedRandom(items, weightGetter) {
  if (!Array.isArray(items) || items.length <= 0) return null;
  let total = 0;
  for (const item of items) total += Math.max(0.0001, Number(weightGetter(item)) || 0.0001);
  let point = Math.random() * total;
  for (const item of items) {
    point -= Math.max(0.0001, Number(weightGetter(item)) || 0.0001);
    if (point <= 0) return item;
  }
  return items[items.length - 1] || null;
}

function makeUid(prefix = 'id') {
  return `${String(prefix || 'id').slice(0, 3)}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function createAccountProgressionStore({
  dataDir,
  dbPath,
  baseHeroId,
  heroDefs,
  heroSkillTreeDefs,
  heroUniqueSkillDefs,
  heroLevelCap,
  heroXpBase,
  heroXpPerLevel,
  heroXpQuad,
  itemSalvageStart,
  itemSlotDefs,
  itemDefs,
  xpBase,
  xpPerLevel,
  xpQuad,
  xpFromScoreMul,
  xpFromKillsMul,
  xpFromBossKillsMul,
  xpFromSurvivalSecMul,
  shardsFromScoreMul,
  shardsFromKillsMul,
  shardsFromBossKillsMul,
  shardsFromSurvivalSecMul,
  mysql,
}) {
  const useMysql = !!mysql?.enabled;
  const mysqlClient = useMysql ? createMysqlSyncClient(mysql) : null;
  if (!useMysql) fs.mkdirSync(dataDir, { recursive: true });
  const db = useMysql ? null : new Database(dbPath);
  if (!useMysql) {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }

  const heroes = Array.isArray(heroDefs) ? heroDefs.map((h) => ({ ...h })) : [];
  const heroMap = Object.fromEntries(heroes.map((hero) => [hero.id, hero]));
  const skillTrees = heroSkillTreeDefs && typeof heroSkillTreeDefs === 'object' ? heroSkillTreeDefs : {};
  const uniqueHeroSkills = heroUniqueSkillDefs && typeof heroUniqueSkillDefs === 'object' ? heroUniqueSkillDefs : {};
  const itemSlots = Array.isArray(itemSlotDefs) ? itemSlotDefs.map((slot) => ({ ...slot })) : [];
  const itemSlotMap = Object.fromEntries(itemSlots.map((slot) => [slot.key, slot]));
  const items = Array.isArray(itemDefs) ? itemDefs.map((item) => ({ ...item })) : [];
  const itemMap = Object.fromEntries(items.map((item) => [item.id, item]));

  const cardDefs = [];
  for (const hero of heroes) {
    const cardId = String(hero.unlockCardId || '').trim();
    if (!cardId) continue;
    if (!cardDefs.some((c) => c.id === cardId)) {
      cardDefs.push({
        id: cardId,
        name: String(hero.unlockCardName || hero.name || cardId).trim(),
      });
    }
  }
  const cardDefMap = Object.fromEntries(cardDefs.map((card) => [card.id, card]));

  if (!useMysql) {
    db.exec([
    'CREATE TABLE IF NOT EXISTS account_progression (',
    '  player_id INTEGER PRIMARY KEY,',
    '  account_xp INTEGER NOT NULL DEFAULT 0,',
    '  account_level INTEGER NOT NULL DEFAULT 1,',
    '  account_skill_points INTEGER NOT NULL DEFAULT 0,',
    '  shards INTEGER NOT NULL DEFAULT 0,',
    '  active_hero TEXT NOT NULL,',
    '  unlocked_heroes_json TEXT NOT NULL,',
    '  hero_nodes_json TEXT NOT NULL,',
    '  hero_cards_json TEXT NOT NULL DEFAULT "{}",',
    '  hero_levels_json TEXT NOT NULL DEFAULT "{}",',
    '  hero_xp_json TEXT NOT NULL DEFAULT "{}",',
    '  hero_skill_levels_json TEXT NOT NULL DEFAULT "{}",',
    '  salvage INTEGER NOT NULL DEFAULT 0,',
    '  inventory_items_json TEXT NOT NULL DEFAULT "[]" ,',
    '  hero_equipment_json TEXT NOT NULL DEFAULT "{}",',
    '  total_runs INTEGER NOT NULL DEFAULT 0,',
    '  hero_runs_json TEXT NOT NULL DEFAULT "{}",',
    '  created_at INTEGER NOT NULL,',
    '  updated_at INTEGER NOT NULL,',
    '  FOREIGN KEY(player_id) REFERENCES player_accounts(id) ON DELETE CASCADE',
    ');',
    ].join('\n'));

    const columns = db.prepare('PRAGMA table_info(account_progression)').all();
    if (!columns.some((col) => col.name === 'hero_cards_json')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN hero_cards_json TEXT NOT NULL DEFAULT "{}"');
    }
    if (!columns.some((col) => col.name === 'total_runs')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN total_runs INTEGER NOT NULL DEFAULT 0');
    }
    if (!columns.some((col) => col.name === 'hero_runs_json')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN hero_runs_json TEXT NOT NULL DEFAULT "{}"');
    }
    if (!columns.some((col) => col.name === 'hero_levels_json')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN hero_levels_json TEXT NOT NULL DEFAULT "{}"');
    }
    if (!columns.some((col) => col.name === 'hero_xp_json')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN hero_xp_json TEXT NOT NULL DEFAULT "{}"');
    }
    if (!columns.some((col) => col.name === 'hero_skill_levels_json')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN hero_skill_levels_json TEXT NOT NULL DEFAULT "{}"');
    }
    if (!columns.some((col) => col.name === 'salvage')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN salvage INTEGER NOT NULL DEFAULT 0');
    }
    if (!columns.some((col) => col.name === 'inventory_items_json')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN inventory_items_json TEXT NOT NULL DEFAULT "[]"');
    }
    if (!columns.some((col) => col.name === 'hero_equipment_json')) {
      db.exec('ALTER TABLE account_progression ADD COLUMN hero_equipment_json TEXT NOT NULL DEFAULT "{}"');
    }
  }

  const progressionJsonSql = jsonObjectSql({
    player_id: 'player_id',
    account_xp: 'account_xp',
    account_level: 'account_level',
    account_skill_points: 'account_skill_points',
    shards: 'shards',
    active_hero: 'active_hero',
    unlocked_heroes_json: 'unlocked_heroes_json',
    hero_nodes_json: 'hero_nodes_json',
    hero_cards_json: 'hero_cards_json',
    hero_levels_json: 'hero_levels_json',
    hero_xp_json: 'hero_xp_json',
    hero_skill_levels_json: 'hero_skill_levels_json',
    salvage: 'salvage',
    inventory_items_json: 'inventory_items_json',
    hero_equipment_json: 'hero_equipment_json',
    total_runs: 'total_runs',
    hero_runs_json: 'hero_runs_json',
    created_at: 'created_at',
    updated_at: 'updated_at',
  });
  const stmtGet = useMysql
    ? {
      get(playerId) {
        return mysqlClient.queryJsonOne(`SELECT ${progressionJsonSql} FROM account_progression WHERE player_id = ${escapeSql(Number(playerId) || 0)} LIMIT 1`);
      },
    }
    : db.prepare('SELECT * FROM account_progression WHERE player_id = ? LIMIT 1');
  const stmtInsert = useMysql ? {
    run(payload) {
      mysqlClient.execute([
        'INSERT INTO account_progression (',
        '  player_id, account_xp, account_level, account_skill_points, shards, active_hero, unlocked_heroes_json, hero_nodes_json, hero_cards_json, hero_levels_json, hero_xp_json, hero_skill_levels_json, salvage, inventory_items_json, hero_equipment_json, total_runs, hero_runs_json, created_at, updated_at',
        ') VALUES (',
        `  ${[
          payload.playerId,
          payload.accountXp,
          payload.accountLevel,
          payload.accountSkillPoints,
          payload.shards,
          payload.activeHero,
          payload.unlockedHeroesJson,
          payload.heroNodesJson,
          payload.heroCardsJson,
          payload.heroLevelsJson,
          payload.heroXpJson,
          payload.heroSkillLevelsJson,
          payload.salvage,
          payload.inventoryItemsJson,
          payload.heroEquipmentJson,
          payload.totalRuns,
          payload.heroRunsJson,
          payload.createdAt,
          payload.updatedAt,
        ].map(escapeSql).join(', ')}`,
        ')',
      ].join('\n'));
    },
  } : db.prepare([
    'INSERT INTO account_progression (',
    '  player_id, account_xp, account_level, account_skill_points, shards, active_hero, unlocked_heroes_json, hero_nodes_json, hero_cards_json, hero_levels_json, hero_xp_json, hero_skill_levels_json, salvage, inventory_items_json, hero_equipment_json, total_runs, hero_runs_json, created_at, updated_at',
    ') VALUES (',
    '  @playerId, @accountXp, @accountLevel, @accountSkillPoints, @shards, @activeHero, @unlockedHeroesJson, @heroNodesJson, @heroCardsJson, @heroLevelsJson, @heroXpJson, @heroSkillLevelsJson, @salvage, @inventoryItemsJson, @heroEquipmentJson, @totalRuns, @heroRunsJson, @createdAt, @updatedAt',
    ')',
  ].join('\n'));
  const stmtUpdate = useMysql ? {
    run(payload) {
      mysqlClient.execute([
        'UPDATE account_progression SET',
        `  account_xp=${escapeSql(payload.accountXp)},`,
        `  account_level=${escapeSql(payload.accountLevel)},`,
        `  account_skill_points=${escapeSql(payload.accountSkillPoints)},`,
        `  shards=${escapeSql(payload.shards)},`,
        `  active_hero=${escapeSql(payload.activeHero)},`,
        `  unlocked_heroes_json=${escapeSql(payload.unlockedHeroesJson)},`,
        `  hero_nodes_json=${escapeSql(payload.heroNodesJson)},`,
        `  hero_cards_json=${escapeSql(payload.heroCardsJson)},`,
        `  hero_levels_json=${escapeSql(payload.heroLevelsJson)},`,
        `  hero_xp_json=${escapeSql(payload.heroXpJson)},`,
        `  hero_skill_levels_json=${escapeSql(payload.heroSkillLevelsJson)},`,
        `  salvage=${escapeSql(payload.salvage)},`,
        `  inventory_items_json=${escapeSql(payload.inventoryItemsJson)},`,
        `  hero_equipment_json=${escapeSql(payload.heroEquipmentJson)},`,
        `  total_runs=${escapeSql(payload.totalRuns)},`,
        `  hero_runs_json=${escapeSql(payload.heroRunsJson)},`,
        `  updated_at=${escapeSql(payload.updatedAt)}`,
        `WHERE player_id=${escapeSql(payload.playerId)}`,
      ].join('\n'));
    },
  } : db.prepare([
    'UPDATE account_progression SET',
    '  account_xp=@accountXp,',
    '  account_level=@accountLevel,',
    '  account_skill_points=@accountSkillPoints,',
    '  shards=@shards,',
    '  active_hero=@activeHero,',
    '  unlocked_heroes_json=@unlockedHeroesJson,',
    '  hero_nodes_json=@heroNodesJson,',
    '  hero_cards_json=@heroCardsJson,',
    '  hero_levels_json=@heroLevelsJson,',
    '  hero_xp_json=@heroXpJson,',
    '  hero_skill_levels_json=@heroSkillLevelsJson,',
    '  salvage=@salvage,',
    '  inventory_items_json=@inventoryItemsJson,',
    '  hero_equipment_json=@heroEquipmentJson,',
    '  total_runs=@totalRuns,',
    '  hero_runs_json=@heroRunsJson,',
    '  updated_at=@updatedAt',
    'WHERE player_id=@playerId',
  ].join('\n'));

  const fallbackHeroId = heroMap[baseHeroId] ? baseHeroId : (heroes[0]?.id || 'cyber');

  function xpToNextLevel(level) {
    const lv = Math.max(1, clampInt(level, 1));
    return Math.max(1, Math.round(Number(xpBase) + (lv - 1) * Number(xpPerLevel) + ((lv - 1) ** 2) * Number(xpQuad)));
  }

  function heroXpToNextLevel(level) {
    const cap = Math.max(1, clampInt(heroLevelCap || 999, 1));
    const lv = Math.max(1, Math.min(cap, clampInt(level, 1)));
    if (lv >= cap) return 0;
    return Math.max(1, Math.round(Number(heroXpBase || 90) + (lv - 1) * Number(heroXpPerLevel || 32) + ((lv - 1) ** 2) * Number(heroXpQuad || 2.4)));
  }

  function getHeroUniqueSkillList(heroId) {
    return Array.isArray(uniqueHeroSkills[heroId]) ? uniqueHeroSkills[heroId] : [];
  }

  function getHeroUniqueSkillMap(heroId) {
    return Object.fromEntries(getHeroUniqueSkillList(heroId).map((skill) => [skill.id, skill]));
  }

  function createDefaultProgression(playerId) {
    const now = nowMs();
    return {
      playerId: clampInt(playerId, 1),
      accountXp: 0,
      accountLevel: 1,
      accountSkillPoints: 0,
      shards: 0,
      activeHero: fallbackHeroId,
      unlockedHeroes: [fallbackHeroId],
      heroNodes: {},
      heroCards: {},
      heroLevels: { [fallbackHeroId]: 1 },
      heroXp: {},
      heroSkillLevels: {},
      salvage: clampInt(itemSalvageStart, 0),
      inventoryItems: [],
      heroEquipment: {},
      totalRuns: 0,
      heroRuns: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  function normalizeUnlockedHeroes(raw) {
    const source = Array.isArray(raw) ? raw : [];
    const out = [];
    for (const heroId of source) {
      const id = String(heroId || '').trim();
      if (!heroMap[id]) continue;
      if (!out.includes(id)) out.push(id);
    }
    if (!out.includes(fallbackHeroId)) out.unshift(fallbackHeroId);
    return out;
  }

  function normalizeHeroNodes(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    for (const heroId of Object.keys(source)) {
      if (!heroMap[heroId]) continue;
      const heroTree = Array.isArray(skillTrees[heroId]) ? skillTrees[heroId] : [];
      const nodeMap = Object.fromEntries(heroTree.map((node) => [node.id, node]));
      const srcHero = source[heroId] && typeof source[heroId] === 'object' ? source[heroId] : {};
      const nextHero = {};
      for (const nodeId of Object.keys(srcHero)) {
        const nodeDef = nodeMap[nodeId];
        if (!nodeDef) continue;
        const maxLevel = Math.max(1, clampInt(nodeDef.maxLevel, 1));
        const value = clampInt(srcHero[nodeId], 0);
        if (value <= 0) continue;
        nextHero[nodeId] = Math.min(maxLevel, value);
      }
      if (Object.keys(nextHero).length > 0) out[heroId] = nextHero;
    }
    return out;
  }

  function normalizeHeroCards(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    for (const cardId of Object.keys(source)) {
      if (!cardDefMap[cardId]) continue;
      const count = clampInt(source[cardId], 0);
      if (count > 0) out[cardId] = count;
    }
    return out;
  }

  function normalizeHeroRuns(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    for (const heroId of Object.keys(source)) {
      if (!heroMap[heroId]) continue;
      const runs = clampInt(source[heroId], 0);
      if (runs > 0) out[heroId] = runs;
    }
    return out;
  }

  function normalizeHeroLevels(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    const cap = Math.max(1, clampInt(heroLevelCap || 999, 1));
    for (const hero of heroes) {
      out[hero.id] = Math.max(1, Math.min(cap, clampInt(source[hero.id], 1) || 1));
    }
    return out;
  }

  function normalizeHeroXp(raw, heroLevels = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    const cap = Math.max(1, clampInt(heroLevelCap || 999, 1));
    for (const hero of heroes) {
      const level = Math.max(1, Math.min(cap, clampInt(heroLevels[hero.id], 1) || 1));
      const next = heroXpToNextLevel(level);
      const maxXp = next > 0 ? Math.max(0, next - 1) : 0;
      out[hero.id] = Math.max(0, Math.min(maxXp, clampInt(source[hero.id], 0)));
    }
    return out;
  }

  function normalizeHeroSkillLevels(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    for (const hero of heroes) {
      const heroId = hero.id;
      const defs = getHeroUniqueSkillMap(heroId);
      const srcHero = source[heroId] && typeof source[heroId] === 'object' ? source[heroId] : {};
      const nextHero = {};
      for (const skillId of Object.keys(srcHero)) {
        const def = defs[skillId];
        if (!def) continue;
        const level = clampInt(srcHero[skillId], 0);
        if (level <= 0) continue;
        nextHero[skillId] = Math.min(Math.max(1, clampInt(def.maxLevel, 1)), level);
      }
      if (Object.keys(nextHero).length > 0) out[heroId] = nextHero;
    }
    return out;
  }

  function getItemDef(itemId) {
    return itemMap[String(itemId || '').trim()] || null;
  }

  function getRarityRank(rarity) {
    switch (String(rarity || '').trim().toLowerCase()) {
      case 'uncommon': return 2;
      case 'rare': return 3;
      case 'epic': return 4;
      case 'legendary': return 5;
      default: return 1;
    }
  }

  function normalizeInventoryItems(raw) {
    const source = Array.isArray(raw) ? raw : [];
    const out = [];
    for (const entry of source) {
      const itemId = String(entry?.itemId || entry?.id || '').trim();
      const def = getItemDef(itemId);
      if (!def) continue;
      const uid = String(entry?.uid || '').trim() || makeUid(itemId);
      const level = Math.max(1, Math.min(10, clampInt(entry?.level, 1) || 1));
      const quantityRaw = clampInt(entry?.quantity, 0);
      const quantity = def.stackable ? Math.max(1, Math.min(clampInt(def.maxStack, 999), quantityRaw || 1)) : 1;
      out.push({
        uid,
        itemId,
        level,
        quantity,
      });
    }
    return out;
  }

  function normalizeHeroEquipment(raw, inventoryItems) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const inventoryUidSet = new Set((Array.isArray(inventoryItems) ? inventoryItems : []).map((item) => item.uid));
    const out = {};
    for (const heroId of Object.keys(source)) {
      if (!heroMap[heroId]) continue;
      const srcHero = source[heroId] && typeof source[heroId] === 'object' ? source[heroId] : {};
      const nextHero = {};
      for (const slotKey of Object.keys(srcHero)) {
        if (!itemSlotMap[slotKey]) continue;
        const uid = String(srcHero[slotKey] || '').trim();
        if (!uid || !inventoryUidSet.has(uid)) continue;
        nextHero[slotKey] = uid;
      }
      if (Object.keys(nextHero).length > 0) out[heroId] = nextHero;
    }
    return out;
  }

  function getInventoryItem(progression, uid) {
    const targetUid = String(uid || '').trim();
    if (!targetUid) return null;
    const inventoryItems = Array.isArray(progression?.inventoryItems) ? progression.inventoryItems : [];
    return inventoryItems.find((item) => item.uid === targetUid) || null;
  }

  function getHeroEquipmentSlots(progression, heroId) {
    if (!heroMap[heroId]) return {};
    const source = progression?.heroEquipment?.[heroId];
    return source && typeof source === 'object' ? source : {};
  }

  function removeItemFromEquipment(progression, uid) {
    const targetUid = String(uid || '').trim();
    if (!targetUid) return;
    const heroEquipment = progression?.heroEquipment && typeof progression.heroEquipment === 'object'
      ? progression.heroEquipment
      : {};
    for (const heroId of Object.keys(heroEquipment)) {
      const slots = heroEquipment[heroId];
      if (!slots || typeof slots !== 'object') continue;
      for (const slotKey of Object.keys(slots)) {
        if (String(slots[slotKey] || '').trim() !== targetUid) continue;
        delete slots[slotKey];
      }
      if (Object.keys(slots).length <= 0) delete heroEquipment[heroId];
    }
  }

  function getItemUpgradeCost(item, itemDef) {
    const level = Math.max(1, clampInt(item?.level, 1) || 1);
    return Math.max(1,
      clampInt(itemDef?.upgradeSalvageBase, 8)
      + Math.max(0, level - 1) * clampInt(itemDef?.upgradeSalvageStep, 4));
  }

  function getItemSellValue(item, itemDef) {
    const base = clampInt(itemDef?.sellSalvage, 0);
    const bonus = Math.max(0, (Math.max(1, clampInt(item?.level, 1) || 1) - 1) * Math.max(1, Math.round(base * 0.45)));
    return base + bonus;
  }

  function buildInventoryPublicItems(inventoryItems) {
    const normalized = normalizeInventoryItems(inventoryItems);
    return normalized.map((item) => {
      const def = getItemDef(item.itemId) || {};
      return {
        uid: item.uid,
        itemId: item.itemId,
        level: item.level,
        quantity: item.quantity,
        rarity: String(def.rarity || 'common'),
        slotCategory: String(def.slotCategory || ''),
        stackable: !!def.stackable,
        maxStack: clampInt(def.maxStack, 0),
        sellValue: getItemSellValue(item, def),
        upgradeCost: def.combatUse ? 0 : getItemUpgradeCost(item, def),
      };
    });
  }

  function normalizeProgressionRow(row) {
    if (!row) return null;
    const unlockedHeroes = normalizeUnlockedHeroes(safeJsonParse(row.unlocked_heroes_json, []));
    const heroNodes = normalizeHeroNodes(safeJsonParse(row.hero_nodes_json, {}));
    const heroCards = normalizeHeroCards(safeJsonParse(row.hero_cards_json, {}));
    const heroLevels = normalizeHeroLevels(safeJsonParse(row.hero_levels_json, {}));
    const heroXp = normalizeHeroXp(safeJsonParse(row.hero_xp_json, {}), heroLevels);
    const heroSkillLevels = normalizeHeroSkillLevels(safeJsonParse(row.hero_skill_levels_json, {}));
    const inventoryItems = normalizeInventoryItems(safeJsonParse(row.inventory_items_json, []));
    const heroEquipment = normalizeHeroEquipment(safeJsonParse(row.hero_equipment_json, {}), inventoryItems);
    const heroRuns = normalizeHeroRuns(safeJsonParse(row.hero_runs_json, {}));
    const activeHeroRaw = String(row.active_hero || '').trim();
    const activeHero = unlockedHeroes.includes(activeHeroRaw) ? activeHeroRaw : unlockedHeroes[0];
    return {
      playerId: clampInt(row.player_id, 1),
      accountXp: clampInt(row.account_xp, 0),
      accountLevel: Math.max(1, clampInt(row.account_level, 1)),
      accountSkillPoints: clampInt(row.account_skill_points, 0),
      shards: clampInt(row.shards, 0),
      activeHero,
      unlockedHeroes,
      heroNodes,
      heroCards,
      heroLevels,
      heroXp,
      heroSkillLevels,
      salvage: clampInt(row.salvage, 0),
      inventoryItems,
      heroEquipment,
      totalRuns: clampInt(row.total_runs, 0),
      heroRuns,
      createdAt: clampInt(row.created_at, 0),
      updatedAt: clampInt(row.updated_at, 0),
    };
  }

  function saveProgression(progression) {
    const payload = {
      playerId: clampInt(progression.playerId, 1),
      accountXp: clampInt(progression.accountXp, 0),
      accountLevel: Math.max(1, clampInt(progression.accountLevel, 1)),
      accountSkillPoints: clampInt(progression.accountSkillPoints, 0),
      shards: clampInt(progression.shards, 0),
      activeHero: String(progression.activeHero || fallbackHeroId).trim(),
      unlockedHeroesJson: JSON.stringify(normalizeUnlockedHeroes(progression.unlockedHeroes)),
      heroNodesJson: JSON.stringify(normalizeHeroNodes(progression.heroNodes)),
      heroCardsJson: JSON.stringify(normalizeHeroCards(progression.heroCards)),
      heroLevelsJson: JSON.stringify(normalizeHeroLevels(progression.heroLevels)),
      heroXpJson: JSON.stringify(normalizeHeroXp(progression.heroXp, progression.heroLevels)),
      heroSkillLevelsJson: JSON.stringify(normalizeHeroSkillLevels(progression.heroSkillLevels)),
      salvage: clampInt(progression.salvage, 0),
      inventoryItemsJson: JSON.stringify(normalizeInventoryItems(progression.inventoryItems)),
      heroEquipmentJson: JSON.stringify(normalizeHeroEquipment(progression.heroEquipment, progression.inventoryItems)),
      totalRuns: clampInt(progression.totalRuns, 0),
      heroRunsJson: JSON.stringify(normalizeHeroRuns(progression.heroRuns)),
      createdAt: clampInt(progression.createdAt || nowMs(), 0),
      updatedAt: nowMs(),
    };

    const exists = stmtGet.get(payload.playerId);
    if (exists) stmtUpdate.run(payload);
    else stmtInsert.run(payload);
    return normalizeProgressionRow(stmtGet.get(payload.playerId));
  }

  function cloneProgressionState(raw, fallbackPlayerId = 0) {
    const pid = clampInt(raw?.playerId || fallbackPlayerId, 1);
    const base = createDefaultProgression(pid);
    const inventoryItems = normalizeInventoryItems(raw?.inventoryItems || base.inventoryItems);
    const unlockedHeroes = normalizeUnlockedHeroes(raw?.unlockedHeroes || base.unlockedHeroes);
    const heroLevels = normalizeHeroLevels(raw?.heroLevels || base.heroLevels);
    const activeHeroRaw = String(raw?.activeHero || base.activeHero || fallbackHeroId).trim();
    return {
      ...base,
      accountXp: clampInt(raw?.accountXp, 0),
      accountLevel: Math.max(1, clampInt(raw?.accountLevel, 1)),
      accountSkillPoints: clampInt(raw?.accountSkillPoints, 0),
      shards: clampInt(raw?.shards, 0),
      activeHero: unlockedHeroes.includes(activeHeroRaw) ? activeHeroRaw : unlockedHeroes[0],
      unlockedHeroes,
      heroNodes: normalizeHeroNodes(raw?.heroNodes || base.heroNodes),
      heroCards: normalizeHeroCards(raw?.heroCards || base.heroCards),
      heroLevels,
      heroXp: normalizeHeroXp(raw?.heroXp || base.heroXp, heroLevels),
      heroSkillLevels: normalizeHeroSkillLevels(raw?.heroSkillLevels || base.heroSkillLevels),
      salvage: clampInt(raw?.salvage, 0),
      inventoryItems,
      heroEquipment: normalizeHeroEquipment(raw?.heroEquipment || base.heroEquipment, inventoryItems),
      totalRuns: clampInt(raw?.totalRuns, 0),
      heroRuns: normalizeHeroRuns(raw?.heroRuns || base.heroRuns),
      createdAt: clampInt(raw?.createdAt || base.createdAt, 0),
      updatedAt: clampInt(raw?.updatedAt || base.updatedAt, 0),
    };
  }

  function getOrCreateProgression(playerId) {
    const pid = clampInt(playerId, 1);
    if (!pid) return null;
    const found = normalizeProgressionRow(stmtGet.get(pid));
    if (found) return found;
    return saveProgression(createDefaultProgression(pid));
  }

  function getCatalogPayload() {
    return {
      baseHeroId: fallbackHeroId,
      heroLevelCap: Math.max(1, clampInt(heroLevelCap || 999, 1)),
      heroes: heroes.map((hero) => ({
        id: hero.id,
        name: hero.name,
        accent: hero.accent,
        sprite: hero.sprite,
        frameW: hero.frameW,
        frameH: hero.frameH,
        rows: hero.rows,
        scale: hero.scale,
        fps: hero.fps,
        idleFrame: hero.idleFrame,
        unlockLevel: clampInt(hero.unlockLevel, 1),
        unlockShardCost: clampInt(hero.unlockShardCost ?? hero.unlockCost, 0),
        unlockCardId: String(hero.unlockCardId || '').trim(),
        unlockCardName: String(hero.unlockCardName || hero.name || '').trim(),
        unlockCardNeed: clampInt(hero.unlockCardNeed, 0),
        tagline: String(hero.tagline || '').trim(),
        baseStats: hero.baseStats && typeof hero.baseStats === 'object' ? { ...hero.baseStats } : {},
        levelGrowth: hero.levelGrowth && typeof hero.levelGrowth === 'object' ? { ...hero.levelGrowth } : {},
        uniqueSkills: getHeroUniqueSkillList(hero.id).map((skill) => ({ ...skill })),
      })),
      cards: cardDefs.map((card) => ({ ...card })),
      itemSlots: itemSlots.map((slot) => ({ ...slot })),
      items: items.map((item) => ({
        ...item,
        sellSalvage: clampInt(item.sellSalvage, 0),
        upgradeSalvageBase: clampInt(item.upgradeSalvageBase, 0),
        upgradeSalvageStep: clampInt(item.upgradeSalvageStep, 0),
      })),
      trees: skillTrees,
    };
  }

  function toPublicProgression(progression) {
    if (!progression) return null;
    return {
      playerId: progression.playerId,
      accountXp: progression.accountXp,
      accountLevel: progression.accountLevel,
      accountSkillPoints: progression.accountSkillPoints,
      shards: progression.shards,
      salvage: clampInt(progression.salvage, 0),
      activeHero: progression.activeHero,
      unlockedHeroes: progression.unlockedHeroes.slice(),
      heroNodes: progression.heroNodes,
      heroCards: progression.heroCards,
      heroLevels: normalizeHeroLevels(progression.heroLevels),
      heroXp: normalizeHeroXp(progression.heroXp, progression.heroLevels),
      heroSkillLevels: normalizeHeroSkillLevels(progression.heroSkillLevels),
      inventoryItems: buildInventoryPublicItems(progression.inventoryItems),
      heroEquipment: normalizeHeroEquipment(progression.heroEquipment, progression.inventoryItems),
      totalRuns: clampInt(progression.totalRuns, 0),
      heroRuns: normalizeHeroRuns(progression.heroRuns),
      accountXpToNext: xpToNextLevel(progression.accountLevel),
      heroXpToNext: Object.fromEntries(heroes.map((hero) => [hero.id, heroXpToNextLevel(Math.max(1, clampInt(progression?.heroLevels?.[hero.id], 1) || 1))])),
    };
  }

  function getHeroNodeLevel(progression, heroId, nodeId) {
    return clampInt(progression?.heroNodes?.[heroId]?.[nodeId], 0);
  }

  function getHeroLevel(progression, heroId) {
    return Math.max(1, clampInt(progression?.heroLevels?.[heroId], 1) || 1);
  }

  function getHeroXp(progression, heroId) {
    return clampInt(progression?.heroXp?.[heroId], 0);
  }

  function getHeroSkillLevel(progression, heroId, skillId) {
    return clampInt(progression?.heroSkillLevels?.[heroId]?.[skillId], 0);
  }

  function getHeroRuntimeSkills(progression, heroId) {
    const out = {};
    for (const def of getHeroUniqueSkillList(heroId)) {
      const level = getHeroSkillLevel(progression, heroId, def.id);
      if (level > 0) out[def.id] = level;
    }
    return out;
  }

  function getHeroUniqueSkillDef(heroId, skillId) {
    return getHeroUniqueSkillMap(heroId)[skillId] || null;
  }

  function getHeroCardCount(progression, cardId) {
    return clampInt(progression?.heroCards?.[cardId], 0);
  }

  function getEquippedItemForHeroSlot(progression, heroId, slotKey) {
    const uid = String(getHeroEquipmentSlots(progression, heroId)?.[slotKey] || '').trim();
    if (!uid) return null;
    const item = getInventoryItem(progression, uid);
    if (!item) return null;
    const itemDef = getItemDef(item.itemId);
    if (!itemDef) return null;
    return { uid, item, itemDef };
  }

  function computeHeroBonuses(progression, heroId) {
    const id = heroMap[heroId] ? heroId : fallbackHeroId;
    const tree = Array.isArray(skillTrees[id]) ? skillTrees[id] : [];
    const hero = heroMap[id] || {};
    const heroLevel = getHeroLevel(progression, id);
    const bonuses = {
      damageMul: 0,
      fireRateMul: 0,
      moveSpeedMul: 0,
      maxHpFlat: 0,
      hpRegenPerSec: 0,
      pickupRadius: 0,
      extraDodgeCharges: 0,
      heroLevel,
      heroXp: getHeroXp(progression, id),
      heroXpToNext: heroXpToNextLevel(heroLevel),
      baseStats: hero.baseStats && typeof hero.baseStats === 'object' ? { ...hero.baseStats } : {},
    };
    const levelGrowth = hero.levelGrowth && typeof hero.levelGrowth === 'object' ? hero.levelGrowth : {};
    const levelFactor = Math.max(0, heroLevel - 1);

    bonuses.damageMul += ((Number(hero.baseStats?.power) || 0) * 0.012) + ((Number(levelGrowth.power) || 0) * levelFactor);
    bonuses.fireRateMul += ((Number(hero.baseStats?.agility) || 0) * 0.008) + ((Number(levelGrowth.agility) || 0) * levelFactor * 0.52);
    bonuses.moveSpeedMul += ((Number(hero.baseStats?.agility) || 0) * 0.01) + ((Number(levelGrowth.agility) || 0) * levelFactor);
    bonuses.maxHpFlat += ((Number(hero.baseStats?.vitality) || 0) * 9) + (((Number(levelGrowth.vitality) || 0) * levelFactor) * 28);
    bonuses.hpRegenPerSec += ((Number(hero.baseStats?.vitality) || 0) * 0.035) + (((Number(levelGrowth.vitality) || 0) * levelFactor) * 0.18);
    bonuses.pickupRadius += ((Number(hero.baseStats?.tech) || 0) * 2.8) + (((Number(levelGrowth.tech) || 0) * levelFactor) * 12);

    for (const node of tree) {
      const level = getHeroNodeLevel(progression, id, node.id);
      if (level <= 0) continue;
      bonuses.damageMul += (Number(node.damageMulPerLevel) || 0) * level;
      bonuses.fireRateMul += (Number(node.fireRateMulPerLevel) || 0) * level;
      bonuses.moveSpeedMul += (Number(node.moveSpeedMulPerLevel) || 0) * level;
      bonuses.maxHpFlat += (Number(node.maxHpFlatPerLevel) || 0) * level;
      bonuses.hpRegenPerSec += (Number(node.hpRegenPerSecPerLevel) || 0) * level;
      bonuses.pickupRadius += (Number(node.pickupRadiusPerLevel) || 0) * level;
      bonuses.extraDodgeCharges += (Number(node.extraDodgeChargesPerLevel) || 0) * level;
    }

    for (const skill of getHeroUniqueSkillList(id)) {
      const level = getHeroSkillLevel(progression, id, skill.id);
      if (level <= 0 || skill.kind !== 'passive' || skill.globalAura) continue;
      bonuses.damageMul += (Number(skill.damageMulPerLevel) || 0) * level;
      bonuses.fireRateMul += (Number(skill.fireRateMulPerLevel) || 0) * level;
      bonuses.moveSpeedMul += (Number(skill.moveSpeedMulPerLevel) || 0) * level;
      bonuses.maxHpFlat += (Number(skill.maxHpFlatPerLevel) || 0) * level;
      bonuses.hpRegenPerSec += (Number(skill.hpRegenPerSecPerLevel) || 0) * level;
      bonuses.pickupRadius += (Number(skill.pickupRadiusPerLevel) || 0) * level;
      bonuses.extraDodgeCharges += (Number(skill.extraDodgeChargesPerLevel) || 0) * level;
    }

    for (const sourceHero of heroes) {
      if (sourceHero.id === id) continue;
      for (const skill of getHeroUniqueSkillList(sourceHero.id)) {
        if (skill.kind !== 'passive' || !skill.globalAura) continue;
        const level = getHeroSkillLevel(progression, sourceHero.id, skill.id);
        if (level <= 0) continue;
        bonuses.damageMul += (Number(skill.globalDamageMulPerLevel) || 0) * level;
        bonuses.fireRateMul += (Number(skill.globalFireRateMulPerLevel) || 0) * level;
        bonuses.moveSpeedMul += (Number(skill.globalMoveSpeedMulPerLevel) || 0) * level;
        bonuses.maxHpFlat += (Number(skill.globalMaxHpFlatPerLevel) || 0) * level;
        bonuses.hpRegenPerSec += (Number(skill.globalHpRegenPerSecPerLevel) || 0) * level;
        bonuses.pickupRadius += (Number(skill.globalPickupRadiusPerLevel) || 0) * level;
      }
    }

    const equipmentSlots = getHeroEquipmentSlots(progression, id);
    for (const slotKey of Object.keys(equipmentSlots)) {
      const slotDef = itemSlotMap[slotKey];
      if (!slotDef || slotDef.kind !== 'gear') continue;
      const item = getInventoryItem(progression, equipmentSlots[slotKey]);
      const def = getItemDef(item?.itemId);
      const stats = def?.stats && typeof def.stats === 'object' ? def.stats : null;
      if (!item || !stats) continue;
      const scale = 1 + Math.max(0, item.level - 1) * 0.22;
      bonuses.damageMul += (Number(stats.damageMul) || 0) * scale;
      bonuses.fireRateMul += (Number(stats.fireRateMul) || 0) * scale;
      bonuses.moveSpeedMul += (Number(stats.moveSpeedMul) || 0) * scale;
      bonuses.maxHpFlat += (Number(stats.maxHpFlat) || 0) * scale;
      bonuses.hpRegenPerSec += (Number(stats.hpRegenPerSec) || 0) * scale;
      bonuses.pickupRadius += (Number(stats.pickupRadius) || 0) * scale;
    }

    return bonuses;
  }

  function grantItemDropsForRun(progression, runStats) {
    const bossKills = clampInt(runStats?.bossKills, 0);
    const kills = clampInt(runStats?.kills, 0);
    const survivalSec = clampInt(runStats?.survivalSec, 0);
    const rolls = Math.max(0, Math.min(6, bossKills + Math.floor(kills / 90) + (survivalSec >= 480 ? 1 : 0)));
    if (rolls <= 0) return [];

    const gainedItems = [];
    const itemPool = items.filter((item) => {
      if (!item || !item.id) return false;
      if (item.slotCategory === 'quick') return true;
      return Boolean(item.stats && typeof item.stats === 'object');
    });
    if (itemPool.length <= 0) return gainedItems;

    for (let i = 0; i < rolls; i += 1) {
      const difficultyBias = bossKills * 0.8 + i * 0.55 + Math.min(2, survivalSec / 300);
      const picked = pickWeightedRandom(itemPool, (item) => {
        const rarityRank = getRarityRank(item.rarity);
        const rarityBase = [1.8, 1.15, 0.72, 0.42, 0.18][Math.max(0, Math.min(4, rarityRank - 1))] || 0.2;
        const rarityBonus = Math.max(0.15, difficultyBias - rarityRank * 0.7);
        const consumableBias = item.slotCategory === 'quick' ? 1.25 : 0.92;
        return (rarityBase + rarityBonus) * consumableBias;
      });
      if (!picked) continue;
      const quantity = picked.stackable ? Math.max(1, Math.min(clampInt(picked.maxStack, 20), 1 + Math.floor((bossKills + i) / 2))) : 1;
      progression.inventoryItems.push({
        uid: makeUid(picked.id),
        itemId: picked.id,
        level: 1,
        quantity,
      });
      gainedItems.push({
        itemId: picked.id,
        quantity,
        level: 1,
      });
    }

    progression.inventoryItems = normalizeInventoryItems(progression.inventoryItems);
    progression.heroEquipment = normalizeHeroEquipment(progression.heroEquipment, progression.inventoryItems);
    return gainedItems;
  }

  function grantHeroCardsForRun(progression, runStats) {
    const kills = clampInt(runStats?.kills, 0);
    const bossKills = clampInt(runStats?.bossKills, 0);
    const survivalSec = clampInt(runStats?.survivalSec, 0);

    let rolls = 0;
    if (kills >= 10 || survivalSec >= 60) rolls += 1;
    rolls += Math.min(2, Math.floor(kills / 55));
    rolls += Math.min(2, bossKills);
    rolls = Math.max(0, Math.min(4, rolls));

    if (rolls <= 0) return {};

    const lockedHeroes = heroes.filter((hero) => {
      if (progression.unlockedHeroes.includes(hero.id)) return false;
      const cardId = String(hero.unlockCardId || '').trim();
      return Boolean(cardId && cardDefMap[cardId]);
    });

    const sequentialLocked = lockedHeroes
      .slice()
      .sort((a, b) =>
        (clampInt(a.unlockLevel, 1) - clampInt(b.unlockLevel, 1))
        || (heroes.findIndex((hero) => hero.id === a.id) - heroes.findIndex((hero) => hero.id === b.id)));
    const nextHero = sequentialLocked[0] || null;
    const pool = nextHero ? [nextHero] : heroes.filter((hero) => String(hero.unlockCardId || '').trim());
    if (pool.length <= 0) return {};

    const gainedCards = {};
    for (let i = 0; i < rolls; i += 1) {
      const pickedHero = pickWeightedRandom(pool, (hero) => {
        const need = clampInt(hero.unlockCardNeed, 0);
        const have = getHeroCardCount(progression, String(hero.unlockCardId || '').trim());
        const deficit = Math.max(1, need - have);
        const levelGate = Math.max(1, clampInt(hero.unlockLevel, 1));
        const earlyBias = 1 / Math.max(1, levelGate);
        return deficit * (1 + earlyBias);
      });
      if (!pickedHero) continue;
      const cardId = String(pickedHero.unlockCardId || '').trim();
      if (!cardId) continue;
      progression.heroCards[cardId] = getHeroCardCount(progression, cardId) + 1;
      gainedCards[cardId] = clampInt(gainedCards[cardId], 0) + 1;
    }

    return gainedCards;
  }

  function grantRunRewards(playerId, runStats, options = {}) {
    const progression = options?.progression
      ? cloneProgressionState(options.progression, playerId)
      : getOrCreateProgression(playerId);
    if (!progression) return null;

    const score = clampInt(runStats?.score, 0);
    const kills = clampInt(runStats?.kills, 0);
    const bossKills = clampInt(runStats?.bossKills, 0);
    const survivalSec = clampInt(runStats?.survivalSec, 0);
    const runHeroIdRaw = String(runStats?.heroId || progression.activeHero || fallbackHeroId).trim();
    const runHeroId = heroMap[runHeroIdRaw] ? runHeroIdRaw : fallbackHeroId;

    const gainedXp = Math.max(0, Math.round(
      score * Number(xpFromScoreMul)
      + kills * Number(xpFromKillsMul)
      + bossKills * Number(xpFromBossKillsMul)
      + survivalSec * Number(xpFromSurvivalSecMul)
    ));

    const gainedShards = Math.max(0, Math.round(
      score * Number(shardsFromScoreMul)
      + kills * Number(shardsFromKillsMul)
      + bossKills * Number(shardsFromBossKillsMul)
      + survivalSec * Number(shardsFromSurvivalSecMul)
    ));

    progression.accountXp += gainedXp;
    progression.shards += gainedShards;
    progression.salvage = clampInt(progression.salvage, 0);
    progression.totalRuns = clampInt(progression.totalRuns, 0) + 1;
    progression.heroRuns = normalizeHeroRuns(progression.heroRuns);
    progression.heroRuns[runHeroId] = clampInt(progression.heroRuns[runHeroId], 0) + 1;
    progression.heroLevels = normalizeHeroLevels(progression.heroLevels);
    progression.heroXp = normalizeHeroXp(progression.heroXp, progression.heroLevels);
    const heroXpGain = Math.max(1, Math.round(gainedXp * 0.82 + kills * 2 + bossKills * 18 + survivalSec * 0.15));
    progression.heroXp[runHeroId] = clampInt(progression.heroXp[runHeroId], 0) + heroXpGain;
    const gainedCards = grantHeroCardsForRun(progression, runStats);
    const gainedItems = grantItemDropsForRun(progression, runStats);
    let heroLevelsGained = 0;
    let heroLevel = getHeroLevel(progression, runHeroId);
    let heroXpToNext = heroXpToNextLevel(heroLevel);
    while (heroXpToNext > 0 && progression.heroXp[runHeroId] >= heroXpToNext && heroLevel < Math.max(1, clampInt(heroLevelCap || 999, 1))) {
      progression.heroXp[runHeroId] -= heroXpToNext;
      heroLevel += 1;
      progression.heroLevels[runHeroId] = heroLevel;
      heroLevelsGained += 1;
      heroXpToNext = heroXpToNextLevel(heroLevel);
    }
    if (heroXpToNext <= 0) progression.heroXp[runHeroId] = 0;

    let levelsGained = 0;
    let xpToNext = xpToNextLevel(progression.accountLevel);
    while (progression.accountXp >= xpToNext) {
      progression.accountXp -= xpToNext;
      progression.accountLevel += 1;
      progression.accountSkillPoints += 1;
      levelsGained += 1;
      xpToNext = xpToNextLevel(progression.accountLevel);
    }

    const saved = saveProgression(progression);
    return {
      progression: toPublicProgression(saved),
      rewards: {
        gainedXp,
        gainedShards,
        levelsGained,
        heroXpGain,
        heroLevelsGained,
        heroId: runHeroId,
        gainedCards,
        gainedItems,
      },
    };
  }

  function equipItem(playerId, heroId, itemUid, slotKey) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };

    const targetHero = String(heroId || '').trim();
    const targetSlot = String(slotKey || '').trim();
    const targetUid = String(itemUid || '').trim();
    if (!heroMap[targetHero]) return { ok: false, code: 400, message: 'Unknown hero' };
    if (!progression.unlockedHeroes.includes(targetHero)) return { ok: false, code: 403, message: 'Hero is locked' };
    const slot = itemSlotMap[targetSlot];
    if (!slot) return { ok: false, code: 400, message: 'Unknown slot' };
    const item = getInventoryItem(progression, targetUid);
    if (!item) return { ok: false, code: 404, message: 'Item not found' };
    const itemDef = getItemDef(item.itemId);
    if (!itemDef) return { ok: false, code: 404, message: 'Item definition not found' };
    if (String(itemDef.slotCategory || '') !== String(slot.category || '')) {
      return { ok: false, code: 403, message: 'Item does not fit this slot' };
    }
    if (slot.kind === 'consumable' && clampInt(item.quantity, 0) <= 0) {
      return { ok: false, code: 403, message: 'Consumable is empty' };
    }

    removeItemFromEquipment(progression, targetUid);
    if (!progression.heroEquipment[targetHero]) progression.heroEquipment[targetHero] = {};
    progression.heroEquipment[targetHero][targetSlot] = targetUid;
    progression.heroEquipment = normalizeHeroEquipment(progression.heroEquipment, progression.inventoryItems);

    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  function unequipItem(playerId, heroId, slotKey) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };
    const targetHero = String(heroId || '').trim();
    const targetSlot = String(slotKey || '').trim();
    if (!heroMap[targetHero]) return { ok: false, code: 400, message: 'Unknown hero' };
    if (!itemSlotMap[targetSlot]) return { ok: false, code: 400, message: 'Unknown slot' };
    if (progression.heroEquipment?.[targetHero]?.[targetSlot]) {
      delete progression.heroEquipment[targetHero][targetSlot];
      if (Object.keys(progression.heroEquipment[targetHero]).length <= 0) delete progression.heroEquipment[targetHero];
    }
    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  function sellItem(playerId, itemUid) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };
    const targetUid = String(itemUid || '').trim();
    const item = getInventoryItem(progression, targetUid);
    if (!item) return { ok: false, code: 404, message: 'Item not found' };
    const itemDef = getItemDef(item.itemId);
    if (!itemDef) return { ok: false, code: 404, message: 'Item definition not found' };

    progression.salvage = clampInt(progression.salvage, 0) + getItemSellValue(item, itemDef);
    progression.inventoryItems = normalizeInventoryItems(progression.inventoryItems).filter((entry) => entry.uid !== targetUid);
    removeItemFromEquipment(progression, targetUid);
    progression.heroEquipment = normalizeHeroEquipment(progression.heroEquipment, progression.inventoryItems);

    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  function upgradeItem(playerId, itemUid) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };
    const item = getInventoryItem(progression, itemUid);
    if (!item) return { ok: false, code: 404, message: 'Item not found' };
    const itemDef = getItemDef(item.itemId);
    if (!itemDef) return { ok: false, code: 404, message: 'Item definition not found' };
    if (itemDef.combatUse) return { ok: false, code: 403, message: 'Consumables cannot be upgraded' };
    if (Math.max(1, clampInt(item.level, 1)) >= 10) return { ok: false, code: 409, message: 'Item maxed out' };

    const cost = getItemUpgradeCost(item, itemDef);
    if (clampInt(progression.salvage, 0) < cost) return { ok: false, code: 403, message: `Need ${cost} salvage` };

    progression.salvage -= cost;
    item.level = Math.max(1, clampInt(item.level, 1)) + 1;
    progression.inventoryItems = normalizeInventoryItems(progression.inventoryItems);
    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  function consumeEquippedItemFromProgression(progression, heroId, slotKey) {
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };
    const targetHero = String(heroId || '').trim();
    const targetSlot = String(slotKey || '').trim();
    if (!heroMap[targetHero]) return { ok: false, code: 400, message: 'Unknown hero' };
    const slotDef = itemSlotMap[targetSlot];
    if (!slotDef || slotDef.kind !== 'consumable') return { ok: false, code: 400, message: 'Unknown consumable slot' };
    const equipped = getEquippedItemForHeroSlot(progression, targetHero, targetSlot);
    if (!equipped) return { ok: false, code: 404, message: 'Consumable not equipped' };
    const { item, itemDef } = equipped;
    if (!itemDef?.combatUse) return { ok: false, code: 403, message: 'Equipped item is not consumable' };
    if (clampInt(item.quantity, 0) <= 0) return { ok: false, code: 409, message: 'Consumable is empty' };

    item.quantity = Math.max(0, clampInt(item.quantity, 0) - 1);
    if (item.quantity <= 0) {
      progression.inventoryItems = normalizeInventoryItems(progression.inventoryItems).filter((entry) => entry.uid !== item.uid);
      removeItemFromEquipment(progression, item.uid);
    } else {
      progression.inventoryItems = normalizeInventoryItems(progression.inventoryItems);
    }
    progression.heroEquipment = normalizeHeroEquipment(progression.heroEquipment, progression.inventoryItems);

    return {
      ok: true,
      progression,
      usedItem: {
        uid: item.uid,
        itemId: item.itemId,
        level: Math.max(1, clampInt(item.level, 1) || 1),
        remainingQuantity: Math.max(0, clampInt(item.quantity, 0)),
        combatUse: itemDef.combatUse && typeof itemDef.combatUse === 'object' ? { ...itemDef.combatUse } : null,
      },
    };
  }

  function consumeEquippedItem(playerId, heroId, slotKey) {
    const progression = getOrCreateProgression(playerId);
    const result = consumeEquippedItemFromProgression(progression, heroId, slotKey);
    if (!result?.ok) return result;
    const saved = saveProgression(result.progression);
    return { ...result, progression: toPublicProgression(saved) };
  }

  function consumeEquippedItemInMemory(progression, heroId, slotKey) {
    const state = cloneProgressionState(progression, progression?.playerId || 0);
    const result = consumeEquippedItemFromProgression(state, heroId, slotKey);
    if (!result?.ok) return result;
    return { ...result, progression: toPublicProgression(result.progression) };
  }

  function selectActiveHero(playerId, heroId) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };
    const targetHero = String(heroId || '').trim();
    if (!heroMap[targetHero]) return { ok: false, code: 400, message: 'Unknown hero' };
    if (!progression.unlockedHeroes.includes(targetHero)) return { ok: false, code: 403, message: 'Hero is locked' };
    progression.activeHero = targetHero;
    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  function unlockHero(playerId, heroId) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };

    const targetHero = String(heroId || '').trim();
    const hero = heroMap[targetHero];
    if (!hero) return { ok: false, code: 400, message: 'Unknown hero' };
    if (progression.unlockedHeroes.includes(targetHero)) {
      return { ok: true, progression: toPublicProgression(progression), alreadyUnlocked: true };
    }

    const needLevel = clampInt(hero.unlockLevel, 1);
    const needShards = clampInt(hero.unlockShardCost ?? hero.unlockCost, 0);
    const needCardId = String(hero.unlockCardId || '').trim();
    const needCards = clampInt(hero.unlockCardNeed, 0);
    const haveCards = needCardId ? getHeroCardCount(progression, needCardId) : needCards;

    if (progression.accountLevel < needLevel) {
      return { ok: false, code: 403, message: `Requires account level ${needLevel}` };
    }
    if (haveCards < needCards) {
      return { ok: false, code: 403, message: `Need ${needCards} cards (${haveCards}/${needCards})` };
    }
    if (progression.shards < needShards) {
      return { ok: false, code: 403, message: `Need ${needShards} shards` };
    }

    progression.shards -= needShards;
    if (needCardId && needCards > 0) {
      progression.heroCards[needCardId] = Math.max(0, haveCards - needCards);
    }
    progression.unlockedHeroes = normalizeUnlockedHeroes(progression.unlockedHeroes.concat([targetHero]));
    progression.heroLevels = normalizeHeroLevels(progression.heroLevels);
    progression.heroXp = normalizeHeroXp(progression.heroXp, progression.heroLevels);
    progression.heroLevels[targetHero] = Math.max(1, clampInt(progression.heroLevels[targetHero], 1) || 1);
    progression.heroXp[targetHero] = clampInt(progression.heroXp[targetHero], 0);
    progression.activeHero = targetHero;
    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  function upgradeHeroNode(playerId, heroId, nodeId) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };

    const targetHero = String(heroId || '').trim();
    const targetNode = String(nodeId || '').trim();
    if (!heroMap[targetHero]) return { ok: false, code: 400, message: 'Unknown hero' };
    if (!progression.unlockedHeroes.includes(targetHero)) return { ok: false, code: 403, message: 'Hero is locked' };

    const tree = Array.isArray(skillTrees[targetHero]) ? skillTrees[targetHero] : [];
    const node = tree.find((entry) => entry.id === targetNode);
    if (!node) return { ok: false, code: 400, message: 'Unknown node' };

    const currentLevel = getHeroNodeLevel(progression, targetHero, targetNode);
    const maxLevel = Math.max(1, clampInt(node.maxLevel, 1));
    if (currentLevel >= maxLevel) return { ok: false, code: 409, message: 'Node maxed out' };

    const nodeCost = Math.max(1, clampInt(node.cost, 1));
    if (progression.accountSkillPoints < nodeCost) {
      return { ok: false, code: 403, message: `Need ${nodeCost} skill point${nodeCost > 1 ? 's' : ''}` };
    }

    progression.accountSkillPoints -= nodeCost;
    if (!progression.heroNodes[targetHero]) progression.heroNodes[targetHero] = {};
    progression.heroNodes[targetHero][targetNode] = currentLevel + 1;

    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  function unlockHeroSkill(playerId, heroId, skillId) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };

    const targetHero = String(heroId || '').trim();
    const targetSkill = String(skillId || '').trim();
    if (!heroMap[targetHero]) return { ok: false, code: 400, message: 'Unknown hero' };
    if (!progression.unlockedHeroes.includes(targetHero)) return { ok: false, code: 403, message: 'Hero is locked' };
    const def = getHeroUniqueSkillDef(targetHero, targetSkill);
    if (!def) return { ok: false, code: 400, message: 'Unknown hero skill' };
    if (getHeroSkillLevel(progression, targetHero, targetSkill) > 0) {
      return { ok: true, progression: toPublicProgression(progression), alreadyUnlocked: true };
    }
    const cost = Math.max(1, clampInt(def.unlockCostShards, 1));
    if (progression.shards < cost) return { ok: false, code: 403, message: `Need ${cost} shards` };

    progression.shards -= cost;
    if (!progression.heroSkillLevels[targetHero]) progression.heroSkillLevels[targetHero] = {};
    progression.heroSkillLevels[targetHero][targetSkill] = 1;
    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  function upgradeHeroSkill(playerId, heroId, skillId) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return { ok: false, code: 404, message: 'Progression not found' };

    const targetHero = String(heroId || '').trim();
    const targetSkill = String(skillId || '').trim();
    if (!heroMap[targetHero]) return { ok: false, code: 400, message: 'Unknown hero' };
    if (!progression.unlockedHeroes.includes(targetHero)) return { ok: false, code: 403, message: 'Hero is locked' };
    const def = getHeroUniqueSkillDef(targetHero, targetSkill);
    if (!def) return { ok: false, code: 400, message: 'Unknown hero skill' };

    const currentLevel = getHeroSkillLevel(progression, targetHero, targetSkill);
    if (currentLevel <= 0) return { ok: false, code: 403, message: 'Skill is not unlocked' };
    const maxLevel = Math.max(1, clampInt(def.maxLevel, 1));
    if (currentLevel >= maxLevel) return { ok: false, code: 409, message: 'Skill maxed out' };

    const cost = Math.max(1, clampInt(def.upgradeCostShardsBase, 1) + clampInt(def.upgradeCostShardsStep, 0) * Math.max(0, currentLevel - 1));
    if (progression.shards < cost) return { ok: false, code: 403, message: `Need ${cost} shards` };

    progression.shards -= cost;
    if (!progression.heroSkillLevels[targetHero]) progression.heroSkillLevels[targetHero] = {};
    progression.heroSkillLevels[targetHero][targetSkill] = currentLevel + 1;
    const saved = saveProgression(progression);
    return { ok: true, progression: toPublicProgression(saved) };
  }

  return {
    getCatalogPayload,
    getOrCreateProgression,
    toPublicProgression,
    grantRunRewards,
    unlockHero,
    selectActiveHero,
    upgradeHeroNode,
    unlockHeroSkill,
    upgradeHeroSkill,
    equipItem,
    unequipItem,
    sellItem,
    upgradeItem,
    consumeEquippedItem,
    consumeEquippedItemInMemory,
    computeHeroBonuses,
    getHeroRuntimeSkills,
    getHeroUniqueSkillDef,
  };
}

module.exports = {
  createAccountProgressionStore,
};
