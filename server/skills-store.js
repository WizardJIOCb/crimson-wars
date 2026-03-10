const fs = require('fs');

function cloneJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createSkillsStore({ dataDir, skillsConfigPath, defaultSkillDefs, adminToken }) {
  let skillDefs = null;

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

  function loadSkillDefs() {
    const merged = cloneJson(defaultSkillDefs);
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      if (fs.existsSync(skillsConfigPath)) {
        const raw = fs.readFileSync(skillsConfigPath, 'utf8');
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
        for (const item of list) {
          const norm = normalizeSkillDef(item, item?.id);
          if (!norm) continue;
          merged[norm.id] = { ...(merged[norm.id] || {}), ...norm };
        }
      } else {
        fs.writeFileSync(skillsConfigPath, JSON.stringify(Object.values(merged), null, 2), 'utf8');
      }
    } catch (err) {
      console.error('Skills config load failed, using defaults:', err.message);
    }
    skillDefs = merged;
  }

  function saveSkillDefs() {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(skillsConfigPath, JSON.stringify(Object.values(skillDefs || {}), null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Skills config write failed:', err.message);
      return false;
    }
  }

  function getMap() {
    if (!skillDefs) loadSkillDefs();
    return skillDefs;
  }

  function getList() {
    return Object.values(getMap());
  }

  function getById(id) {
    return getMap()[id] || null;
  }

  function checkAdminToken(req) {
    if (!adminToken) return false;
    const token = (req.query.token || req.headers['x-admin-token'] || '').toString();
    return token && token === adminToken;
  }

  function updateSkill(id, patch) {
    const existing = getById(id);
    if (!existing) {
      return { ok: false, code: 404, message: 'Skill not found' };
    }

    const merged = normalizeSkillDef({ ...existing, ...patch, id }, id);
    if (!merged) {
      return { ok: false, code: 400, message: 'Invalid payload' };
    }

    skillDefs[id] = merged;
    if (!saveSkillDefs()) {
      return { ok: false, code: 500, message: 'Save failed' };
    }

    return { ok: true, skill: merged };
  }

  loadSkillDefs();

  return {
    getMap,
    getList,
    getById,
    normalizeSkillDef,
    checkAdminToken,
    updateSkill,
  };
}

module.exports = {
  createSkillsStore,
};
