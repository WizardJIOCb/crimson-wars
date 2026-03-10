const fs = require('fs');

function cloneJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createSkillsStore({ dataDir, skillsConfigPath, defaultSkillDefs }) {
  let state = null;

  function normalizeSkillDef(raw, fallbackId = '') {
    const id = ((raw?.id || fallbackId || '').toString().trim().toLowerCase().replace(/[^a-z0-9_]/g, '')).slice(0, 40);
    if (!id) return null;
    const base = defaultSkillDefs[id] || {};
    return {
      ...base,
      ...raw,
      id,
      name: (raw?.name || base.name || id).toString().slice(0, 40),
      kind: (raw?.kind || base.kind || 'passive') === 'active' ? 'active' : 'passive',
      rarity: (raw?.rarity || base.rarity || 'common').toString().slice(0, 12),
      maxLevel: Math.max(1, Math.min(12, Math.floor(Number(raw?.maxLevel ?? base.maxLevel ?? 5) || 5))),
      weight: Math.max(0.05, Number(raw?.weight ?? base.weight ?? 1) || 1),
      desc: (raw?.desc || base.desc || '').toString().slice(0, 80),
    };
  }

  function defaultCollectionId() {
    return 'default';
  }

  function isDefaultCollectionId(collectionId) {
    return normalizeCollectionId(collectionId, defaultCollectionId()) === defaultCollectionId();
  }

  function normalizeCollectionId(raw, fallback = 'variant') {
    const value = (raw || fallback || 'variant').toString().trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    return value || fallback || 'variant';
  }

  function makeCollectionBase(id, name, skillsMap, updatedAt = Date.now()) {
    return {
      id: normalizeCollectionId(id),
      name: (name || id || 'Collection').toString().trim().slice(0, 50) || 'Collection',
      updatedAt: Math.max(0, Number(updatedAt) || Date.now()),
      skills: Object.values(skillsMap),
    };
  }

  function buildDefaultSkillsMap() {
    const merged = cloneJson(defaultSkillDefs);
    const out = {};
    for (const skill of Object.values(merged)) {
      const norm = normalizeSkillDef(skill, skill.id);
      if (norm) out[norm.id] = norm;
    }
    return out;
  }

  function normalizeCollection(raw, fallbackId = '', fallbackName = '') {
    const map = buildDefaultSkillsMap();
    const list = Array.isArray(raw?.skills) ? raw.skills : Array.isArray(raw) ? raw : [];
    for (const item of list) {
      const norm = normalizeSkillDef(item, item?.id);
      if (!norm) continue;
      map[norm.id] = { ...(map[norm.id] || {}), ...norm };
    }
    const id = normalizeCollectionId(raw?.id || fallbackId || defaultCollectionId(), defaultCollectionId());
    return makeCollectionBase(id, raw?.name || fallbackName || id, map, raw?.updatedAt);
  }

  function normalizeState(raw) {
    if (Array.isArray(raw)) {
      const collection = normalizeCollection({ id: defaultCollectionId(), name: 'Default', skills: raw }, defaultCollectionId(), 'Default');
      return {
        activeCollectionId: collection.id,
        collections: [collection],
      };
    }

    const collectionsRaw = Array.isArray(raw?.collections) ? raw.collections : [];
    const collections = collectionsRaw.length
      ? collectionsRaw.map((item, index) => normalizeCollection(item, item?.id || `variant-${index + 1}`, item?.name || `Variant ${index + 1}`))
      : [normalizeCollection({ id: defaultCollectionId(), name: 'Default', skills: raw?.skills || Object.values(defaultSkillDefs) }, defaultCollectionId(), 'Default')];

    const seen = new Set();
    const deduped = [];
    for (const collection of collections) {
      let nextId = collection.id;
      let suffix = 2;
      while (seen.has(nextId)) {
        nextId = `${collection.id}-${suffix}`;
        suffix += 1;
      }
      seen.add(nextId);
      deduped.push({
        ...collection,
        id: nextId,
      });
    }

    const activeCollectionId = deduped.some((x) => x.id === raw?.activeCollectionId)
      ? raw.activeCollectionId
      : deduped[0].id;

    return {
      activeCollectionId,
      collections: deduped,
    };
  }

  function saveState() {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(skillsConfigPath, JSON.stringify(state, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Skills config write failed:', err.message);
      return false;
    }
  }

  function loadState() {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      if (fs.existsSync(skillsConfigPath)) {
        const raw = JSON.parse(fs.readFileSync(skillsConfigPath, 'utf8'));
        state = normalizeState(raw);
      } else {
        state = normalizeState({
          activeCollectionId: defaultCollectionId(),
          collections: [
            {
              id: defaultCollectionId(),
              name: 'Default',
              skills: Object.values(buildDefaultSkillsMap()),
            },
          ],
        });
        saveState();
      }
    } catch (err) {
      console.error('Skills config load failed, using defaults:', err.message);
      state = normalizeState({
        activeCollectionId: defaultCollectionId(),
        collections: [
          {
            id: defaultCollectionId(),
            name: 'Default',
            skills: Object.values(buildDefaultSkillsMap()),
          },
        ],
      });
    }
  }

  function ensureState() {
    if (!state) loadState();
    return state;
  }

  function getCollectionById(collectionId) {
    const current = ensureState();
    const id = normalizeCollectionId(collectionId || current.activeCollectionId, current.activeCollectionId);
    return current.collections.find((x) => x.id === id) || current.collections.find((x) => x.id === current.activeCollectionId) || current.collections[0];
  }

  function getActiveCollection() {
    return getCollectionById(ensureState().activeCollectionId);
  }

  function getMap(collectionId) {
    const collection = getCollectionById(collectionId);
    const out = {};
    for (const skill of collection?.skills || []) {
      out[skill.id] = skill;
    }
    return out;
  }

  function getList(collectionId) {
    return Object.values(getMap(collectionId));
  }

  function getById(id, collectionId) {
    return getMap(collectionId)[id] || null;
  }

  function listCollections() {
    const current = ensureState();
    return current.collections.map((item) => ({
      id: item.id,
      name: item.name,
      updatedAt: item.updatedAt,
      skillCount: Array.isArray(item.skills) ? item.skills.length : 0,
      isActive: item.id === current.activeCollectionId,
    }));
  }

  function updateCollectionSkills(collectionId, skills) {
    const current = ensureState();
    const idx = current.collections.findIndex((x) => x.id === collectionId);
    if (idx < 0) return false;
    current.collections[idx] = normalizeCollection({
      ...current.collections[idx],
      skills,
      updatedAt: Date.now(),
    }, current.collections[idx].id, current.collections[idx].name);
    return saveState();
  }

  function updateSkill(id, patch, collectionId) {
    const collection = getCollectionById(collectionId);
    const existing = getById(id, collection?.id);
    if (!existing || !collection) {
      return { ok: false, code: 404, message: 'Skill not found' };
    }
    if (isDefaultCollectionId(collection.id)) {
      return { ok: false, code: 400, message: 'Default collection is read-only' };
    }
    const merged = normalizeSkillDef({ ...existing, ...patch, id }, id);
    if (!merged) {
      return { ok: false, code: 400, message: 'Invalid payload' };
    }
    const skills = collection.skills.map((skill) => (skill.id === id ? merged : skill));
    if (!updateCollectionSkills(collection.id, skills)) {
      return { ok: false, code: 500, message: 'Save failed' };
    }
    return { ok: true, skill: merged, collection: getCollectionById(collection.id) };
  }

  function createCollection({ name, sourceCollectionId }) {
    const current = ensureState();
    const source = getCollectionById(sourceCollectionId || current.activeCollectionId);
    const baseName = (name || `${source.name} Copy`).toString().trim().slice(0, 50) || `${source.name} Copy`;
    const baseId = normalizeCollectionId(baseName, 'variant');
    let nextId = baseId;
    let suffix = 2;
    while (current.collections.some((x) => x.id === nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    const collection = normalizeCollection({
      id: nextId,
      name: baseName,
      skills: cloneJson(source.skills),
      updatedAt: Date.now(),
    }, nextId, baseName);
    current.collections.push(collection);
    if (!saveState()) {
      current.collections.pop();
      return { ok: false, code: 500, message: 'Save failed' };
    }
    return { ok: true, collection };
  }

  function renameCollection(collectionId, name) {
    const current = ensureState();
    const collection = getCollectionById(collectionId);
    if (!collection) return { ok: false, code: 404, message: 'Collection not found' };
    if (isDefaultCollectionId(collection.id)) {
      return { ok: false, code: 400, message: 'Default collection cannot be renamed' };
    }
    collection.name = (name || '').toString().trim().slice(0, 50) || collection.name;
    collection.updatedAt = Date.now();
    if (!saveState()) return { ok: false, code: 500, message: 'Save failed' };
    return { ok: true, collection };
  }

  function activateCollection(collectionId) {
    const current = ensureState();
    const collection = getCollectionById(collectionId);
    if (!collection) return { ok: false, code: 404, message: 'Collection not found' };
    current.activeCollectionId = collection.id;
    if (!saveState()) return { ok: false, code: 500, message: 'Save failed' };
    return { ok: true, collection };
  }

  function deleteCollection(collectionId) {
    const current = ensureState();
    if (isDefaultCollectionId(collectionId)) {
      return { ok: false, code: 400, message: 'Default collection cannot be deleted' };
    }
    if (current.collections.length <= 1) {
      return { ok: false, code: 400, message: 'At least one collection is required' };
    }
    const idx = current.collections.findIndex((x) => x.id === normalizeCollectionId(collectionId));
    if (idx < 0) return { ok: false, code: 404, message: 'Collection not found' };
    const [removed] = current.collections.splice(idx, 1);
    if (current.activeCollectionId === removed.id) {
      current.activeCollectionId = current.collections[0].id;
    }
    if (!saveState()) {
      current.collections.splice(idx, 0, removed);
      return { ok: false, code: 500, message: 'Save failed' };
    }
    return { ok: true, activeCollectionId: current.activeCollectionId };
  }

  function getAdminPayload(collectionId) {
    const current = ensureState();
    const selected = getCollectionById(collectionId || current.activeCollectionId);
    return {
      activeCollectionId: current.activeCollectionId,
      selectedCollectionId: selected?.id || current.activeCollectionId,
      collections: listCollections(),
      skills: getList(selected?.id),
    };
  }

  loadState();

  return {
    getMap,
    getList,
    getById,
    normalizeSkillDef,
    getActiveCollection,
    listCollections,
    getAdminPayload,
    updateSkill,
    createCollection,
    renameCollection,
    activateCollection,
    deleteCollection,
  };
}

module.exports = {
  createSkillsStore,
};
