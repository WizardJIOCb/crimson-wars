const fs = require('fs');
const Database = require('better-sqlite3');

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

function createAccountProgressionStore({
  dataDir,
  dbPath,
  baseHeroId,
  heroDefs,
  heroSkillTreeDefs,
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
}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  const heroes = Array.isArray(heroDefs) ? heroDefs.map((h) => ({ ...h })) : [];
  const heroMap = Object.fromEntries(heroes.map((hero) => [hero.id, hero]));
  const skillTrees = heroSkillTreeDefs && typeof heroSkillTreeDefs === 'object' ? heroSkillTreeDefs : {};

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
    '  created_at INTEGER NOT NULL,',
    '  updated_at INTEGER NOT NULL,',
    '  FOREIGN KEY(player_id) REFERENCES player_accounts(id) ON DELETE CASCADE',
    ');',
  ].join('\n'));

  const columns = db.prepare('PRAGMA table_info(account_progression)').all();
  if (!columns.some((col) => col.name === 'hero_cards_json')) {
    db.exec('ALTER TABLE account_progression ADD COLUMN hero_cards_json TEXT NOT NULL DEFAULT "{}"');
  }

  const stmtGet = db.prepare('SELECT * FROM account_progression WHERE player_id = ? LIMIT 1');
  const stmtInsert = db.prepare([
    'INSERT INTO account_progression (',
    '  player_id, account_xp, account_level, account_skill_points, shards, active_hero, unlocked_heroes_json, hero_nodes_json, hero_cards_json, created_at, updated_at',
    ') VALUES (',
    '  @playerId, @accountXp, @accountLevel, @accountSkillPoints, @shards, @activeHero, @unlockedHeroesJson, @heroNodesJson, @heroCardsJson, @createdAt, @updatedAt',
    ')',
  ].join('\n'));
  const stmtUpdate = db.prepare([
    'UPDATE account_progression SET',
    '  account_xp=@accountXp,',
    '  account_level=@accountLevel,',
    '  account_skill_points=@accountSkillPoints,',
    '  shards=@shards,',
    '  active_hero=@activeHero,',
    '  unlocked_heroes_json=@unlockedHeroesJson,',
    '  hero_nodes_json=@heroNodesJson,',
    '  hero_cards_json=@heroCardsJson,',
    '  updated_at=@updatedAt',
    'WHERE player_id=@playerId',
  ].join('\n'));

  const fallbackHeroId = heroMap[baseHeroId] ? baseHeroId : (heroes[0]?.id || 'cyber');

  function xpToNextLevel(level) {
    const lv = Math.max(1, clampInt(level, 1));
    return Math.max(1, Math.round(Number(xpBase) + (lv - 1) * Number(xpPerLevel) + ((lv - 1) ** 2) * Number(xpQuad)));
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

  function normalizeProgressionRow(row) {
    if (!row) return null;
    const unlockedHeroes = normalizeUnlockedHeroes(safeJsonParse(row.unlocked_heroes_json, []));
    const heroNodes = normalizeHeroNodes(safeJsonParse(row.hero_nodes_json, {}));
    const heroCards = normalizeHeroCards(safeJsonParse(row.hero_cards_json, {}));
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
      createdAt: clampInt(progression.createdAt || nowMs(), 0),
      updatedAt: nowMs(),
    };

    const exists = stmtGet.get(payload.playerId);
    if (exists) stmtUpdate.run(payload);
    else stmtInsert.run(payload);
    return normalizeProgressionRow(stmtGet.get(payload.playerId));
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
      })),
      cards: cardDefs.map((card) => ({ ...card })),
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
      activeHero: progression.activeHero,
      unlockedHeroes: progression.unlockedHeroes.slice(),
      heroNodes: progression.heroNodes,
      heroCards: progression.heroCards,
      accountXpToNext: xpToNextLevel(progression.accountLevel),
    };
  }

  function getHeroNodeLevel(progression, heroId, nodeId) {
    return clampInt(progression?.heroNodes?.[heroId]?.[nodeId], 0);
  }

  function getHeroCardCount(progression, cardId) {
    return clampInt(progression?.heroCards?.[cardId], 0);
  }

  function computeHeroBonuses(progression, heroId) {
    const id = heroMap[heroId] ? heroId : fallbackHeroId;
    const tree = Array.isArray(skillTrees[id]) ? skillTrees[id] : [];
    const bonuses = {
      damageMul: 0,
      fireRateMul: 0,
      moveSpeedMul: 0,
      maxHpFlat: 0,
      hpRegenPerSec: 0,
      pickupRadius: 0,
      extraDodgeCharges: 0,
    };
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
    return bonuses;
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

    const pool = lockedHeroes.length > 0 ? lockedHeroes : heroes.filter((hero) => String(hero.unlockCardId || '').trim());
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

  function grantRunRewards(playerId, runStats) {
    const progression = getOrCreateProgression(playerId);
    if (!progression) return null;

    const score = clampInt(runStats?.score, 0);
    const kills = clampInt(runStats?.kills, 0);
    const bossKills = clampInt(runStats?.bossKills, 0);
    const survivalSec = clampInt(runStats?.survivalSec, 0);

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
    const gainedCards = grantHeroCardsForRun(progression, runStats);

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
        gainedCards,
      },
    };
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

  return {
    getCatalogPayload,
    getOrCreateProgression,
    toPublicProgression,
    grantRunRewards,
    unlockHero,
    selectActiveHero,
    upgradeHeroNode,
    computeHeroBonuses,
  };
}

module.exports = {
  createAccountProgressionStore,
};
