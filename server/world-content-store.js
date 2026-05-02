const fs = require('fs');
const { createMysqlSyncClient, escapeSql } = require('./mysql-sync');
const {
  replaceWorldContent,
  getWorldContentSnapshot,
  getDefaultWorldContentSnapshot,
} = require('./world-content');

const DOC_KEY = 'world_content';
const TERRAIN_MATERIALS = ['asphalt_wet', 'asphalt', 'concrete', 'concrete_tiles', 'dirt', 'grass', 'toxic'];
const ZONE_SHAPES = ['rect', 'ellipse', 'band'];
const PROP_KINDS = [
  'red_hatchback',
  'burnt_sedan',
  'yellow_bus',
  'ambulance_van',
  'concrete_barrier',
  'road_shack',
  'mall_block',
  'clinic_block',
  'industrial_tank',
  'reactor_block',
];
const GOAL_TYPES = ['survive', 'enemy_kills', 'boss_kills', 'player_level'];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function clampNum(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function clampInt(value, min, max, fallback) {
  return Math.round(clampNum(value, min, max, fallback));
}

function normalizeText(value, maxLen, fallback = '') {
  const text = String(value ?? fallback).trim();
  return text.slice(0, maxLen);
}

function normalizeId(value, fallback = 'entry') {
  const normalized = String(value ?? fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return normalized || fallback;
}

function normalizeColor(value, fallback = '') {
  return normalizeText(value, 64, fallback);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildError(message, code = 400) {
  return { ok: false, code, message };
}

function normalizeTerrainZone(raw, index = 0) {
  const material = TERRAIN_MATERIALS.includes(String(raw?.material || '').trim())
    ? String(raw.material).trim()
    : 'grass';
  const shape = ZONE_SHAPES.includes(String(raw?.shape || '').trim())
    ? String(raw.shape).trim()
    : 'ellipse';
  return {
    material,
    shape,
    x: clampNum(raw?.x, -0.5, 1.5, 0.5),
    y: clampNum(raw?.y, -0.5, 1.5, 0.5),
    w: clampNum(raw?.w, 0.01, 2.5, 0.2),
    h: clampNum(raw?.h, 0.01, 2.5, 0.2),
    feather: clampNum(raw?.feather, 0, 0.5, 0.12),
    alpha: clampNum(raw?.alpha, 0, 1, 0.5),
    angle: clampNum(raw?.angle, -Math.PI * 2, Math.PI * 2, 0),
    centerStripe: !!raw?.centerStripe,
    id: normalizeId(raw?.id, `zone_${index + 1}`),
  };
}

function normalizePlannedProp(raw, index = 0) {
  const kind = PROP_KINDS.includes(String(raw?.kind || '').trim())
    ? String(raw.kind).trim()
    : PROP_KINDS[0];
  return {
    kind,
    x: clampNum(raw?.x, -0.5, 1.5, 0.5),
    y: clampNum(raw?.y, -0.5, 1.5, 0.5),
    scale: clampNum(raw?.scale, 0.1, 4, 1),
    angle: clampNum(raw?.angle, -Math.PI * 2, Math.PI * 2, 0),
    hpMul: clampNum(raw?.hpMul, 0.1, 5, 1),
    zombieBreakable: raw?.zombieBreakable === true,
    name: String(raw?.name || '').trim().slice(0, 80),
    styleTag: String(raw?.styleTag || '').trim().slice(0, 80),
    id: normalizeId(raw?.id, `prop_${index + 1}`),
  };
}

function ensureUniqueIds(entries, label) {
  const seen = new Set();
  for (const entry of entries) {
    if (!entry?.id) return buildError(`${label} id is required.`);
    if (seen.has(entry.id)) return buildError(`Duplicate ${label} id: ${entry.id}`);
    seen.add(entry.id);
  }
  return { ok: true };
}

function normalizeMapDef(raw, index = 0) {
  const id = normalizeId(raw?.id, `map_${index + 1}`);
  const terrainZones = safeArray(raw?.scene?.terrainZones).map((zone, zoneIndex) => normalizeTerrainZone(zone, zoneIndex));
  const plannedObjects = safeArray(raw?.scene?.plannedObjects).map((obj, objIndex) => normalizePlannedProp(obj, objIndex));
  const randomKinds = safeArray(raw?.scene?.randomProps?.kinds)
    .map((kind) => String(kind || '').trim())
    .filter((kind) => PROP_KINDS.includes(kind));
  return {
    id,
    name: normalizeText(raw?.name, 80, id),
    subtitle: normalizeText(raw?.subtitle, 160, ''),
    description: normalizeText(raw?.description, 600, ''),
    worldWidth: clampInt(raw?.worldWidth, 1200, 12000, 3200),
    worldHeight: clampInt(raw?.worldHeight, 900, 9000, 2000),
    treeDensityMul: clampNum(raw?.treeDensityMul, 0, 4, 1),
    cover: {
      from: normalizeColor(raw?.cover?.from, '#1f2937'),
      to: normalizeColor(raw?.cover?.to, '#0f172a'),
      accent: normalizeColor(raw?.cover?.accent, '#f97316'),
      glow: normalizeColor(raw?.cover?.glow, 'rgba(249, 115, 22, 0.22)'),
      artLabel: normalizeText(raw?.cover?.artLabel, 64, ''),
    },
    scene: {
      themeId: normalizeId(raw?.scene?.themeId, id),
      baseMaterial: TERRAIN_MATERIALS.includes(String(raw?.scene?.baseMaterial || '').trim())
        ? String(raw.scene.baseMaterial).trim()
        : 'grass',
      terrainZones,
      plannedObjects,
      randomProps: {
        countMin: clampInt(raw?.scene?.randomProps?.countMin, 0, 120, 0),
        countMax: clampInt(
          raw?.scene?.randomProps?.countMax,
          0,
          160,
          Math.max(0, clampInt(raw?.scene?.randomProps?.countMin, 0, 120, 0)),
        ),
        kinds: randomKinds,
      },
    },
  };
}

function normalizeGoal(raw, index = 0) {
  const type = GOAL_TYPES.includes(String(raw?.type || '').trim())
    ? String(raw.type).trim()
    : GOAL_TYPES[0];
  return {
    id: normalizeId(raw?.id, `goal_${index + 1}`),
    type,
    target: clampInt(raw?.target, 1, 100000, 1),
    label: normalizeText(raw?.label, 140, `${type} ${Math.max(1, clampInt(raw?.target, 1, 100000, 1))}`),
  };
}

function normalizeCampaignLevel(raw, index = 0, mapIds = new Set()) {
  const id = normalizeId(raw?.id, `level_${index + 1}`);
  const mapId = normalizeId(raw?.mapId, '');
  if (!mapIds.has(mapId)) {
    return buildError(`Campaign level ${id} references unknown map: ${mapId || '(empty)'}`);
  }
  return {
    id,
    title: normalizeText(raw?.title, 100, id),
    brief: normalizeText(raw?.brief, 220, ''),
    scenario: normalizeText(raw?.scenario, 800, ''),
    mapId,
    goals: safeArray(raw?.goals).map((goal, goalIndex) => normalizeGoal(goal, goalIndex)),
    modifiers: {
      enemySpawnMul: clampNum(raw?.modifiers?.enemySpawnMul, 0.25, 6, 1),
      enemyHpMul: clampNum(raw?.modifiers?.enemyHpMul, 0.25, 6, 1),
      bossKillInterval: clampInt(raw?.modifiers?.bossKillInterval, 4, 400, 40),
    },
  };
}

function normalizeCampaignDef(raw, index = 0, mapIds = new Set()) {
  const id = normalizeId(raw?.id, `campaign_${index + 1}`);
  const levels = [];
  for (const [levelIndex, levelRaw] of safeArray(raw?.levels).entries()) {
    const normalizedLevel = normalizeCampaignLevel(levelRaw, levelIndex, mapIds);
    if (!normalizedLevel?.ok && normalizedLevel?.message) return normalizedLevel;
    levels.push(normalizedLevel);
  }
  const uniqueLevels = ensureUniqueIds(levels, `level in campaign ${id}`);
  if (!uniqueLevels.ok) return uniqueLevels;
  return {
    id,
    name: normalizeText(raw?.name, 100, id),
    shortName: normalizeText(raw?.shortName, 100, ''),
    tagline: normalizeText(raw?.tagline, 180, ''),
    description: normalizeText(raw?.description, 1200, ''),
    cover: {
      from: normalizeColor(raw?.cover?.from, '#1f2937'),
      to: normalizeColor(raw?.cover?.to, '#0f172a'),
      accent: normalizeColor(raw?.cover?.accent, '#f97316'),
      glow: normalizeColor(raw?.cover?.glow, 'rgba(249, 115, 22, 0.22)'),
      artLabel: normalizeText(raw?.cover?.artLabel, 64, ''),
    },
    levels,
  };
}

function normalizeWorldContentPayload(raw) {
  const maps = safeArray(raw?.maps).map((mapDef, mapIndex) => normalizeMapDef(mapDef, mapIndex));
  if (maps.length <= 0) return buildError('At least one map is required.');
  const uniqueMaps = ensureUniqueIds(maps, 'map');
  if (!uniqueMaps.ok) return uniqueMaps;
  const mapIds = new Set(maps.map((mapDef) => mapDef.id));
  const campaigns = [];
  for (const [campaignIndex, campaignRaw] of safeArray(raw?.campaigns).entries()) {
    const normalizedCampaign = normalizeCampaignDef(campaignRaw, campaignIndex, mapIds);
    if (!normalizedCampaign?.ok && normalizedCampaign?.message) return normalizedCampaign;
    campaigns.push(normalizedCampaign);
  }
  const uniqueCampaigns = ensureUniqueIds(campaigns, 'campaign');
  if (!uniqueCampaigns.ok) return uniqueCampaigns;
  return { ok: true, maps, campaigns };
}

function createWorldContentStore({ dataDir, filePath, mysql, onAfterSave } = {}) {
  const useMysql = !!mysql?.enabled;
  const mysqlClient = useMysql ? createMysqlSyncClient(mysql) : null;
  let state = null;

  function applyState(nextState) {
    state = {
      maps: cloneJson(nextState?.maps || []),
      campaigns: cloneJson(nextState?.campaigns || []),
    };
    replaceWorldContent(state);
    if (typeof onAfterSave === 'function') {
      onAfterSave(getSnapshot());
    }
  }

  function getSnapshot() {
    return {
      maps: cloneJson(state?.maps || []),
      campaigns: cloneJson(state?.campaigns || []),
    };
  }

  function saveState() {
    try {
      if (useMysql) {
        mysqlClient.execute([
          'INSERT INTO app_documents (doc_key, content_json, updated_at)',
          `VALUES (${escapeSql(DOC_KEY)}, ${escapeSql(JSON.stringify(state))}, ${escapeSql(Date.now())})`,
          'ON DUPLICATE KEY UPDATE content_json=VALUES(content_json), updated_at=VALUES(updated_at)',
        ].join('\n'));
      } else {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
      }
      return true;
    } catch (err) {
      console.error('World content save failed:', err?.message || err);
      return false;
    }
  }

  function loadState() {
    try {
      let raw = null;
      if (useMysql) {
        const row = mysqlClient.queryOne(`SELECT content_json FROM app_documents WHERE doc_key = ${escapeSql(DOC_KEY)} LIMIT 1`);
        raw = row?.content_json ? JSON.parse(row.content_json) : null;
      } else if (filePath && fs.existsSync(filePath)) {
        raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      if (raw && typeof raw === 'object') {
        const normalized = normalizeWorldContentPayload(raw);
        if (normalized.ok) {
          applyState(normalized);
          return;
        }
      }
    } catch (err) {
      console.error('World content load failed, using defaults:', err?.message || err);
    }
    const defaults = getDefaultWorldContentSnapshot();
    applyState(defaults);
    saveState();
  }

  function ensureState() {
    if (!state) loadState();
    return state;
  }

  function getAdminPayload() {
    ensureState();
    return {
      ...getSnapshot(),
      enums: {
        terrainMaterials: TERRAIN_MATERIALS.slice(),
        zoneShapes: ZONE_SHAPES.slice(),
        propKinds: PROP_KINDS.slice(),
        goalTypes: GOAL_TYPES.slice(),
      },
      summary: {
        mapCount: state.maps.length,
        campaignCount: state.campaigns.length,
        levelCount: state.campaigns.reduce((sum, campaign) => sum + safeArray(campaign?.levels).length, 0),
      },
    };
  }

  function saveAdminPayload(payload) {
    const normalized = normalizeWorldContentPayload(payload);
    if (!normalized.ok) return normalized;
    const previous = getSnapshot();
    applyState(normalized);
    if (!saveState()) {
      applyState(previous);
      return buildError('Failed to save world content.', 500);
    }
    return { ok: true, ...getAdminPayload() };
  }

  function resetToDefaults() {
    const defaults = getDefaultWorldContentSnapshot();
    applyState(defaults);
    if (!saveState()) return buildError('Failed to reset world content.', 500);
    return { ok: true, ...getAdminPayload() };
  }

  function reload() {
    state = null;
    loadState();
    return getAdminPayload();
  }

  loadState();

  return {
    getAdminPayload,
    saveAdminPayload,
    resetToDefaults,
    reload,
    getSnapshot,
    getPublicSnapshot: () => getWorldContentSnapshot(),
  };
}

module.exports = {
  createWorldContentStore,
};
