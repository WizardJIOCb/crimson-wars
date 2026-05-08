'use strict';

(() => {
  const HERO_EQUIP_SLOT_FX_MS = 1500;
  const HERO_LOADOUT_SWAP_FX_MS = 1350;
  const HERO_SKILL_UPGRADE_FX_MS = 1550;
  const HERO_TALENT_UPGRADE_FX_MS = 1350;
  const HERO_PROGRESSION_MODAL_CLOSE_MS = 360;
  const HERO_PROGRESSION_MODAL_PULSE_MS = 620;
  const HERO_ROSTER_DESELECT_FX_MS = 680;
  const HERO_ROSTER_MODE_STORAGE_KEY = 'cwHeroRosterMode';
  let heroEquipSlotFx = null;
  let heroEquipSlotFxTimer = 0;
  let heroLoadoutSwapFx = null;
  let heroLoadoutSwapFxTimer = 0;
  let heroSkillUpgradeFx = null;
  let heroSkillUpgradeFxTimer = 0;
  let heroTalentUpgradeFx = null;
  let heroTalentUpgradeFxTimer = 0;
  let heroProgressionModalEl = null;
  let heroProgressionModalState = null;
  let heroProgressionModalCloseTimer = 0;
  let heroProgressionModalPulseTimer = 0;
  let heroRosterDeselectFx = null;
  let heroRosterDeselectFxTimer = 0;
  let lastHeroLoadoutRenderId = '';

  function getPlayerVariant(id) {
    return PLAYER_VARIANTS.find((x) => x.id === id) || PLAYER_VARIANTS[0];
  }
  function sanitizePlayerClass(id) {
    const key = (id || '').toString().trim();
    return getPlayerVariant(key).id;
  }
  function getProgressionCatalog() {
    const fallbackHeroes = PLAYER_VARIANTS.map((variant) => ({
      ...variant,
      unlockLevel: variant.id === 'cyber' ? 1 : 999,
      unlockShardCost: variant.id === 'cyber' ? 0 : 9999,
      unlockCardId: variant.id === 'cyber' ? '' : (variant.id + '_core_card'),
      unlockCardName: variant.name + ' Core Card',
      unlockCardNeed: variant.id === 'cyber' ? 0 : 99,
      tagline: '',
    }));
    const catalog = game.playerAuth?.progressionCatalog || null;
    return {
      baseHeroId: catalog?.baseHeroId || 'cyber',
      heroLevelCap: Math.max(1, Number(catalog?.heroLevelCap) || 999),
      heroes: Array.isArray(catalog?.heroes) && catalog.heroes.length > 0 ? catalog.heroes : fallbackHeroes,
      cards: Array.isArray(catalog?.cards) ? catalog.cards : [],
      itemSlots: Array.isArray(catalog?.itemSlots) ? catalog.itemSlots : [],
      items: Array.isArray(catalog?.items) ? catalog.items : [],
      trees: catalog?.trees && typeof catalog.trees === 'object' ? catalog.trees : {},
    };
  }
  function getProgressionState() {
    return game.playerAuth?.progression || null;
  }
  function normalizeHeroEquipFxKey(value) {
    return String(value || '').trim().toLowerCase();
  }
  function getHeroEquipFxNow() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }
  function getInventoryRarityFxColor(rarity) {
    switch (String(rarity || '').trim().toLowerCase()) {
      case 'legendary': return '#f59e0b';
      case 'epic': return '#a855f7';
      case 'rare': return '#38bdf8';
      case 'uncommon': return '#22c55e';
      default: return '#d1d5db';
    }
  }
  function getInventoryItemFxColorByUid(itemUid) {
    const uid = String(itemUid || '').trim();
    if (!uid) return '';
    const progression = getProgressionState();
    const catalog = getProgressionCatalog();
    const itemMap = getCatalogItemMap(catalog);
    const item = (Array.isArray(progression?.inventoryItems) ? progression.inventoryItems : [])
      .find((entry) => String(entry?.uid || '') === uid);
    return getInventoryRarityFxColor(itemMap[item?.itemId]?.rarity);
  }
  function getEquippedSlotFxColor(heroId, slotKey) {
    const catalog = getProgressionCatalog();
    const progression = getProgressionState();
    const equippedItems = getHeroEquipmentItemMap(catalog, progression, heroId);
    const item = equippedItems[String(slotKey || '').trim()] || null;
    const itemMap = getCatalogItemMap(catalog);
    return getInventoryRarityFxColor(itemMap[item?.itemId]?.rarity);
  }
  function markHeroEquipSlotFx(heroId, slotKey, kind, color = '') {
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    const nextSlotKey = normalizeHeroEquipFxKey(slotKey);
    if (!nextHeroId || !nextSlotKey) return;
    heroEquipSlotFx = {
      heroId: nextHeroId,
      slotKey: nextSlotKey,
      kind: kind === 'unequip' ? 'unequip' : 'equip',
      color: String(color || '').trim() || (kind === 'unequip' ? '#fb7185' : '#38bdf8'),
      at: getHeroEquipFxNow(),
    };
    if (heroEquipSlotFxTimer) clearTimeout(heroEquipSlotFxTimer);
    heroEquipSlotFxTimer = setTimeout(() => {
      heroEquipSlotFx = null;
      heroEquipSlotFxTimer = 0;
    }, HERO_EQUIP_SLOT_FX_MS);
  }
  function getHeroEquipSlotFx(heroId, slotKey) {
    if (!heroEquipSlotFx) return { className: '', color: '' };
    const active = normalizeHeroEquipFxKey(heroId) === heroEquipSlotFx.heroId
      && normalizeHeroEquipFxKey(slotKey) === heroEquipSlotFx.slotKey
      && (getHeroEquipFxNow() - Number(heroEquipSlotFx.at || 0)) < HERO_EQUIP_SLOT_FX_MS;
    if (!active) return { className: '', color: '' };
    return {
      className: heroEquipSlotFx.kind === 'unequip' ? 'is-unequip-flash' : 'is-equip-flash',
      color: heroEquipSlotFx.color || '',
    };
  }
  function markHeroLoadoutSwapFx(heroId, color = '') {
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    if (!nextHeroId) return;
    heroLoadoutSwapFx = {
      heroId: nextHeroId,
      color: String(color || '').trim() || '#38bdf8',
      at: getHeroEquipFxNow(),
    };
    if (heroLoadoutSwapFxTimer) clearTimeout(heroLoadoutSwapFxTimer);
    heroLoadoutSwapFxTimer = setTimeout(() => {
      heroLoadoutSwapFx = null;
      heroLoadoutSwapFxTimer = 0;
    }, HERO_LOADOUT_SWAP_FX_MS);
  }
  function getHeroLoadoutSwapFx(heroId) {
    if (!heroLoadoutSwapFx) return { active: false, color: '' };
    const active = normalizeHeroEquipFxKey(heroId) === heroLoadoutSwapFx.heroId
      && (getHeroEquipFxNow() - Number(heroLoadoutSwapFx.at || 0)) < HERO_LOADOUT_SWAP_FX_MS;
    return active
      ? { active: true, color: heroLoadoutSwapFx.color || '' }
      : { active: false, color: '' };
  }
  function markHeroRosterDeselectFx(heroId, color = '') {
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    if (!nextHeroId) return;
    heroRosterDeselectFx = {
      heroId: nextHeroId,
      color: String(color || '').trim() || '#38bdf8',
      at: getHeroEquipFxNow(),
    };
    if (heroRosterDeselectFxTimer) clearTimeout(heroRosterDeselectFxTimer);
    heroRosterDeselectFxTimer = setTimeout(() => {
      heroRosterDeselectFx = null;
      heroRosterDeselectFxTimer = 0;
    }, HERO_ROSTER_DESELECT_FX_MS);
  }
  function getHeroRosterDeselectFx(heroId) {
    if (!heroRosterDeselectFx) return { active: false, color: '' };
    const active = normalizeHeroEquipFxKey(heroId) === heroRosterDeselectFx.heroId
      && (getHeroEquipFxNow() - Number(heroRosterDeselectFx.at || 0)) < HERO_ROSTER_DESELECT_FX_MS;
    return active
      ? { active: true, color: heroRosterDeselectFx.color || '' }
      : { active: false, color: '' };
  }
  function getHeroSkillFxColor(heroId, skillId) {
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    const nextSkillId = String(skillId || '').trim();
    const catalog = getProgressionCatalog();
    const hero = (Array.isArray(catalog?.heroes) ? catalog.heroes : [])
      .find((entry) => normalizeHeroEquipFxKey(entry?.id) === nextHeroId);
    const skill = (Array.isArray(hero?.uniqueSkills) ? hero.uniqueSkills : [])
      .find((entry) => String(entry?.id || '').trim() === nextSkillId);
    if (skill) return getInventoryRarityFxColor(skill.rarity);
    return String(hero?.accent || '').trim() || '#38bdf8';
  }
  function markHeroSkillUpgradeFx(heroId, skillId, kind = 'upgrade', color = '') {
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    const nextSkillId = String(skillId || '').trim();
    if (!nextHeroId || !nextSkillId) return;
    heroSkillUpgradeFx = {
      heroId: nextHeroId,
      skillId: nextSkillId,
      kind: kind === 'unlock' ? 'unlock' : 'upgrade',
      color: String(color || '').trim() || getHeroSkillFxColor(nextHeroId, nextSkillId),
      at: getHeroEquipFxNow(),
    };
    if (heroSkillUpgradeFxTimer) clearTimeout(heroSkillUpgradeFxTimer);
    heroSkillUpgradeFxTimer = setTimeout(() => {
      heroSkillUpgradeFx = null;
      heroSkillUpgradeFxTimer = 0;
    }, HERO_SKILL_UPGRADE_FX_MS);
    globalThis.markBattleHubHeroSkillFx?.(nextHeroId, nextSkillId);
  }
  function getHeroSkillUpgradeFx(heroId, skillId) {
    if (!heroSkillUpgradeFx) return { className: '', color: '' };
    const active = normalizeHeroEquipFxKey(heroId) === heroSkillUpgradeFx.heroId
      && String(skillId || '').trim() === heroSkillUpgradeFx.skillId
      && (getHeroEquipFxNow() - Number(heroSkillUpgradeFx.at || 0)) < HERO_SKILL_UPGRADE_FX_MS;
    if (!active) return { className: '', color: '' };
    return {
      className: heroSkillUpgradeFx.kind === 'unlock' ? 'is-skill-unlock-flash' : 'is-skill-upgrade-flash',
      color: heroSkillUpgradeFx.color || '',
    };
  }
  function getHeroTalentNodeVisual(hero, node) {
    const probe = [
      node?.id,
      node?.name,
      node?.desc,
      ...Object.keys(node || {}),
    ].join(' ').toLowerCase();
    if (/regen|recovery|aid|heal/.test(probe)) return { key: 'regen', color: '#fb7185' };
    if (/hp|maxhp|vital|armor|barrier|skin|plating/.test(probe)) return { key: 'guard', color: '#22c55e' };
    if (/dodge|roll|charge/.test(probe)) return { key: 'dodge', color: '#a78bfa' };
    if (/fire|reload|tempo|overclock|hands|rate/.test(probe)) return { key: 'rate', color: '#f59e0b' };
    if (/damage|killer|rage|shot|burst|sting|core/.test(probe)) return { key: 'damage', color: '#f43f5e' };
    if (/move|speed|stride|haste|blink/.test(probe)) return { key: 'speed', color: '#38bdf8' };
    if (/pickup|magnet|sweep|aura/.test(probe)) return { key: 'field', color: '#14b8a6' };
    return { key: 'core', color: String(hero?.accent || '').trim() || '#38bdf8' };
  }
  function getHeroTalentIconPath(node) {
    const explicit = String(node?.icon || node?.iconPath || '').trim();
    if (explicit) {
      if (/^(?:https?:)?\/\//.test(explicit) || explicit.startsWith('/') || explicit.startsWith('data:')) return explicit;
      return `/assets/hero-talents/${explicit}`;
    }
    return '';
  }
  function renderHeroTalentIconHtml(talentVisual, imagePath, options = {}) {
    const path = String(imagePath || '').trim();
    const className = [
      'hero-talent-icon',
      `hero-talent-icon-${talentVisual.key}`,
      path ? 'has-image' : '',
      options.detail ? 'hero-detail-icon-button' : '',
    ].filter(Boolean).join(' ');
    const content = path
      ? `<img src="${escapeHtml(path)}" alt="" loading="lazy" decoding="async"><span class="hero-talent-icon-core"></span>`
      : '<span class="hero-talent-icon-core"></span>';
    if (options.detail) {
      const title = String(options.title || '').trim();
      const detailLabel = `${getInventoryUiText('\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435', 'Details')}: ${title || String(options.nodeId || '')}`;
      return `<button type="button" class="${escapeHtml(className)}" data-hero-detail-kind="talent" data-hero-detail-hero="${escapeHtml(options.heroId || '')}" data-hero-detail-id="${escapeHtml(options.nodeId || '')}" title="${escapeHtml(detailLabel)}" aria-label="${escapeHtml(detailLabel)}">${content}</button>`;
    }
    if (path) {
      return `<span class="${escapeHtml(className)}" aria-hidden="true">${content}</span>`;
    }
    return `<span class="${escapeHtml(className)}" aria-hidden="true">${content}</span>`;
  }
  function getHeroUniqueSkillIconPath(hero, skill) {
    const explicit = String(skill?.icon || skill?.iconPath || '').trim();
    if (explicit) {
      if (/^(?:https?:)?\/\//.test(explicit) || explicit.startsWith('/') || explicit.startsWith('data:')) return explicit;
      return `/assets/hero-skills/${explicit}`;
    }
    const skillId = String(skill?.id || '').trim();
    if (!skillId) return '';
    const heroId = String(skill?.heroId || skill?.sourceHeroId || hero?.id || '').trim().toLowerCase();
    return heroId ? `/assets/hero-skills/${heroId}_${skillId}.webp` : `/assets/hero-skills/${skillId}.webp`;
  }
  function getHeroUniqueSkillGlyph(skill) {
    const id = String(skill?.id || '').toLowerCase();
    const named = {
      pulse_wave: 'PW',
      ion_lance: 'IL',
      arc_matrix: 'AM',
      seeker_protocol: 'SP',
      adaptive_frame: 'AF',
      combat_firmware: 'CF',
      sync_link: 'SL',
      razor_wind: 'RW',
      hunter_mark: 'HM',
      storm_net: 'SN',
      sky_chasers: 'SK',
      long_stride: 'LS',
      vital_sight: 'VS',
      trailblazer: 'TB',
      energy_drink_iv: 'IV',
    };
    if (named[id]) return named[id];
    const name = String(skill?.name || id || '?').replace(/[^A-Za-z0-9]+/g, ' ').trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 3).toUpperCase();
  }
  function renderHeroUniqueSkillDetailIconHtml(hero, skill, title) {
    const imagePath = getHeroUniqueSkillIconPath(hero, skill);
    const className = [
      'battle-hub-hero-skill-icon',
      imagePath ? 'has-image' : '',
      'hero-unique-skill-icon',
      'hero-detail-icon-button',
    ].filter(Boolean).join(' ');
    const detailLabel = `${getInventoryUiText('\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435', 'Details')}: ${title || String(skill?.id || '')}`;
    if (imagePath) {
      return `<button type="button" class="${escapeHtml(className)}" data-hero-detail-kind="skill" data-hero-detail-hero="${escapeHtml(hero?.id || '')}" data-hero-detail-id="${escapeHtml(skill?.id || '')}" title="${escapeHtml(detailLabel)}" aria-label="${escapeHtml(detailLabel)}"><img src="${escapeHtml(imagePath)}" alt="" loading="lazy" decoding="async"></button>`;
    }
    return `<button type="button" class="${escapeHtml(className)}" data-hero-detail-kind="skill" data-hero-detail-hero="${escapeHtml(hero?.id || '')}" data-hero-detail-id="${escapeHtml(skill?.id || '')}" title="${escapeHtml(detailLabel)}" aria-label="${escapeHtml(detailLabel)}">${escapeHtml(getHeroUniqueSkillGlyph(skill))}</button>`;
  }
  function getHeroTalentFxColor(heroId, nodeId) {
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    const nextNodeId = String(nodeId || '').trim();
    const catalog = getProgressionCatalog();
    const hero = (Array.isArray(catalog?.heroes) ? catalog.heroes : [])
      .find((entry) => normalizeHeroEquipFxKey(entry?.id) === nextHeroId);
    const node = (Array.isArray(catalog?.trees?.[hero?.id]) ? catalog.trees[hero.id] : [])
      .find((entry) => String(entry?.id || '').trim() === nextNodeId);
    return getHeroTalentNodeVisual(hero, node).color;
  }
  function markHeroTalentUpgradeFx(heroId, nodeId, color = '') {
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    const nextNodeId = String(nodeId || '').trim();
    if (!nextHeroId || !nextNodeId) return;
    heroTalentUpgradeFx = {
      heroId: nextHeroId,
      nodeId: nextNodeId,
      color: String(color || '').trim() || getHeroTalentFxColor(nextHeroId, nextNodeId),
      at: getHeroEquipFxNow(),
    };
    if (heroTalentUpgradeFxTimer) clearTimeout(heroTalentUpgradeFxTimer);
    heroTalentUpgradeFxTimer = setTimeout(() => {
      heroTalentUpgradeFx = null;
      heroTalentUpgradeFxTimer = 0;
    }, HERO_TALENT_UPGRADE_FX_MS);
  }
  function getHeroTalentUpgradeFx(heroId, nodeId) {
    if (!heroTalentUpgradeFx) return { className: '', color: '' };
    const active = normalizeHeroEquipFxKey(heroId) === heroTalentUpgradeFx.heroId
      && String(nodeId || '').trim() === heroTalentUpgradeFx.nodeId
      && (getHeroEquipFxNow() - Number(heroTalentUpgradeFx.at || 0)) < HERO_TALENT_UPGRADE_FX_MS;
    if (!active) return { className: '', color: '' };
    return {
      className: 'is-talent-upgrade-flash',
      color: heroTalentUpgradeFx.color || '',
    };
  }
  function getHeroProgressionSkillTypeLabel(skill) {
    if (skill?.kind === 'active') return trWithFallback('ui.hero.skill_type_active', 'Active');
    if (skill?.globalAura) return trWithFallback('ui.hero.skill_type_passive_aura', 'Passive Aura');
    return trWithFallback('ui.hero.skill_type_passive', 'Passive');
  }
  function formatHeroProgressionCurrency(kind, amount) {
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    if (kind === 'points') {
      return `${value} ${getInventoryUiText('\u043e\u0447\u043a.', 'pts')}`;
    }
    return `${value} ${trWithFallback('ui.profile.shards', 'Shards').toLowerCase()}`;
  }
  function formatHeroProgressionPercent(value) {
    const pct = (Number(value) || 0) * 100;
    if (Math.abs(pct) < 0.05) return '';
    const decimals = Math.abs(pct) > 0 && Math.abs(pct) < 10 ? 1 : 0;
    return `${pct > 0 ? '+' : ''}${formatInventoryNumber(pct, decimals)}%`;
  }
  function formatHeroProgressionFlat(value, decimals = 0, suffix = '') {
    const n = Number(value) || 0;
    if (Math.abs(n) < 0.001) return '';
    return `${n > 0 ? '+' : ''}${formatInventoryNumber(n, decimals)}${suffix}`;
  }
  function getHeroProgressionStatRows(def, level) {
    const lvl = Math.max(0, Number(level) || 0);
    if (!def || lvl <= 0) return [];
    const rows = [];
    const add = (label, value) => {
      const text = String(value || '').trim();
      if (!text) return;
      rows.push({ label, value: text });
    };
    const addActive = (labelRu, labelEn, baseKey, perKey, decimals = 0, suffix = '') => {
      const base = Number(def?.[baseKey]) || 0;
      const per = Number(def?.[perKey]) || 0;
      const value = base + per * Math.max(0, lvl - 1);
      if (Math.abs(value) < 0.001) return;
      add(getInventoryUiText(labelRu, labelEn), `${formatInventoryNumber(value, decimals)}${suffix}`);
    };
    const addPassivePct = (label, key) => add(label, formatHeroProgressionPercent((Number(def?.[key]) || 0) * lvl));
    const addPassiveFlat = (label, key, decimals = 0, suffix = '') => add(label, formatHeroProgressionFlat((Number(def?.[key]) || 0) * lvl, decimals, suffix));

    if (def?.kind === 'active') {
      addActive('\u0423\u0440\u043e\u043d', 'Damage', 'damage', 'damagePerLevel', 0);
      addActive('\u0420\u0430\u0434\u0438\u0443\u0441', 'Radius', 'radius', 'radiusPerLevel', 0);
      addActive('\u0426\u0435\u043b\u0438', 'Targets', 'targets', 'targetsPerLevel', 0);
      const cooldownMs = Math.max(0, Number(def?.cooldownMs) || 0);
      if (cooldownMs > 0) {
        const cooldownMul = Math.max(0, Number(def?.cooldownMulPerLevel) || 0);
        const currentCd = Math.max(220, Math.round(cooldownMs * Math.max(0.2, 1 - cooldownMul * Math.max(0, lvl - 1))));
        add(getInventoryUiText('\u041f\u0435\u0440\u0435\u0437\u0430\u0440\u044f\u0434\u043a\u0430', 'Cooldown'), `${formatInventoryNumber(currentCd / 1000, 2)}s`);
      }
      addActive('\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u0441\u043d\u0430\u0440\u044f\u0434\u0430', 'Missile speed', 'missileSpeed', 'missileSpeedPerLevel', 0);
      addActive('\u0420\u0430\u0434\u0438\u0443\u0441 \u0432\u0437\u0440\u044b\u0432\u0430', 'Explosion radius', 'explosionRadius', 'explosionRadiusPerLevel', 0);
      addActive('\u041f\u043e\u0432\u043e\u0440\u043e\u0442', 'Turn rate', 'turnRate', 'turnRatePerLevel', 1);
      if (Number(def?.knockbackMul) > 0) add(getInventoryUiText('\u041e\u0442\u0431\u0440\u043e\u0441', 'Knockback'), `x${formatInventoryNumber(Number(def.knockbackMul), 1)}`);
      if (Number(def?.stunMs) > 0) add(getInventoryUiText('\u0421\u0442\u0430\u043d', 'Stun'), `${formatInventoryNumber(Number(def.stunMs) / 1000, 1)}s`);
      if (Number(def?.lifeMs) > 0) add(getInventoryUiText('\u0412\u0440\u0435\u043c\u044f \u0436\u0438\u0437\u043d\u0438', 'Lifetime'), `${formatInventoryNumber(Number(def.lifeMs) / 1000, 1)}s`);
      return rows;
    }

    addPassivePct(heroProfileText('damage', 'Damage'), 'damageMulPerLevel');
    addPassivePct(heroProfileText('fireRate', 'Fire rate'), 'fireRateMulPerLevel');
    addPassivePct(heroProfileText('reload', 'Reload'), 'reloadSpeedMulPerLevel');
    addPassivePct(heroProfileText('moveSpeed', 'Move speed'), 'moveSpeedMulPerLevel');
    addPassiveFlat(heroProfileText('maxHp', 'Max HP'), 'maxHpFlatPerLevel', 0);
    addPassiveFlat(heroProfileText('regen', 'Regen'), 'hpRegenPerSecPerLevel', 2, '/s');
    addPassiveFlat(heroProfileText('pickup', 'Pickup'), 'pickupRadiusPerLevel', 0);
    addPassiveFlat(heroProfileText('dodge', 'Dodge'), 'extraDodgeChargesPerLevel', 0);

    addPassivePct(`${heroProfileText('rosterAuras', 'Roster auras')}: ${heroProfileText('damage', 'Damage')}`, 'globalDamageMulPerLevel');
    addPassivePct(`${heroProfileText('rosterAuras', 'Roster auras')}: ${heroProfileText('fireRate', 'Fire rate')}`, 'globalFireRateMulPerLevel');
    addPassivePct(`${heroProfileText('rosterAuras', 'Roster auras')}: ${heroProfileText('reload', 'Reload')}`, 'globalReloadSpeedMulPerLevel');
    addPassivePct(`${heroProfileText('rosterAuras', 'Roster auras')}: ${heroProfileText('moveSpeed', 'Move speed')}`, 'globalMoveSpeedMulPerLevel');
    addPassiveFlat(`${heroProfileText('rosterAuras', 'Roster auras')}: ${heroProfileText('maxHp', 'Max HP')}`, 'globalMaxHpFlatPerLevel', 0);
    addPassiveFlat(`${heroProfileText('rosterAuras', 'Roster auras')}: ${heroProfileText('regen', 'Regen')}`, 'globalHpRegenPerSecPerLevel', 2, '/s');
    addPassiveFlat(`${heroProfileText('rosterAuras', 'Roster auras')}: ${heroProfileText('pickup', 'Pickup')}`, 'globalPickupRadiusPerLevel', 0);
    return rows;
  }
  function formatHeroTalentCurrentEffectText(node, level) {
    const rows = getHeroProgressionStatRows(node, level);
    if (!rows.length) return '';
    const valueText = rows.length === 1
      ? rows[0].value
      : rows.map((row) => `${row.label} ${row.value}`).join(' \u00b7 ');
    return `${getInventoryUiText('\u0441\u0435\u0439\u0447\u0430\u0441', 'now')} ${valueText}`;
  }
  function formatHeroUniqueSkillInlineEffectText(skill, level) {
    const currentLevel = Math.max(0, Number(level) || 0);
    const previewLevel = currentLevel > 0 ? currentLevel : 1;
    const rows = getHeroProgressionStatRows(skill, previewLevel);
    if (!rows.length) return '';
    const visibleRows = rows.slice(0, 4);
    const valueText = visibleRows.length === 1
      ? visibleRows[0].value
      : visibleRows.map((row) => `${row.label} ${row.value}`).join(' \u00b7 ');
    const suffix = rows.length > visibleRows.length ? ' ...' : '';
    const prefix = currentLevel > 0
      ? getInventoryUiText('\u0441\u0435\u0439\u0447\u0430\u0441', 'now')
      : getInventoryUiText('\u0443\u0440. 1', 'lv. 1');
    return `${prefix} ${valueText}${suffix}`;
  }
  function getHeroProgressionModalData(kind, heroId, itemId) {
    const normalizedKind = String(kind || '').trim().toLowerCase();
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    const nextItemId = String(itemId || '').trim();
    if (!nextHeroId || !nextItemId) return null;
    const catalog = getProgressionCatalog();
    const progression = getProgressionState();
    const catalogHero = (Array.isArray(catalog?.heroes) ? catalog.heroes : [])
      .find((entry) => normalizeHeroEquipFxKey(entry?.id) === nextHeroId);
    if (!catalogHero) return null;
    const hero = { ...getPlayerVariant(catalogHero.id), ...catalogHero };
    const unlocked = getUnlockedHeroSet(catalog, progression).has(hero.id);
    const loggedIn = Boolean(game.playerAuth?.player);
    const heroName = trHeroName(hero.id, hero.name || hero.id);

    if (normalizedKind === 'talent') {
      const node = (Array.isArray(catalog?.trees?.[hero.id]) ? catalog.trees[hero.id] : [])
        .find((entry) => String(entry?.id || '').trim() === nextItemId);
      if (!node) return null;
      const level = getNodeLevel(progression, hero.id, node.id);
      const maxLevel = Math.max(1, Number(node.maxLevel) || 1);
      const cost = Math.max(1, Number(node.cost) || 1);
      const points = Math.max(0, Number(progression?.accountSkillPoints) || 0);
      const visual = getHeroTalentNodeVisual(hero, node);
      const title = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.name`, node.name || node.id);
      return {
        kind: 'talent',
        hero,
        heroName,
        item: node,
        itemId: node.id,
        title,
        desc: trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.desc`, node.desc || ''),
        subtitle: trWithFallback('ui.hero.talent_tree', 'Hero talents'),
        level,
        maxLevel,
        nextLevel: Math.min(maxLevel, level + 1),
        cost,
        resourceKind: 'points',
        resourceValue: points,
        action: level >= maxLevel ? 'maxed' : 'upgrade',
        canUse: loggedIn && unlocked && level < maxLevel && points >= cost,
        loggedIn,
        unlocked,
        color: visual.color,
        imagePath: getHeroTalentIconPath(node),
        glyph: getHeroUniqueSkillGlyph(node),
      };
    }

    if (normalizedKind === 'skill') {
      const skill = (Array.isArray(hero?.uniqueSkills) ? hero.uniqueSkills : [])
        .find((entry) => String(entry?.id || '').trim() === nextItemId);
      if (!skill) return null;
      const level = getHeroSkillLevel(progression, hero.id, skill.id);
      const maxLevel = Math.max(1, Number(skill.maxLevel) || 1);
      const shards = Math.max(0, Number(progression?.shards) || 0);
      const action = level >= maxLevel ? 'maxed' : (level > 0 ? 'upgrade' : 'unlock');
      const cost = action === 'unlock'
        ? Math.max(1, Number(skill.unlockCostShards) || 1)
        : action === 'upgrade'
          ? Math.max(1, (Number(skill.upgradeCostShardsBase) || 1) + (Math.max(0, level - 1) * Math.max(0, Number(skill.upgradeCostShardsStep) || 0)))
          : 0;
      const title = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.name`, skill.name || skill.id);
      return {
        kind: 'skill',
        hero,
        heroName,
        item: skill,
        itemId: skill.id,
        title,
        desc: trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.desc`, skill.desc || ''),
        subtitle: getHeroProgressionSkillTypeLabel(skill),
        level,
        maxLevel,
        nextLevel: action === 'unlock' ? 1 : Math.min(maxLevel, level + 1),
        cost,
        resourceKind: 'shards',
        resourceValue: shards,
        action,
        canUse: loggedIn && unlocked && action !== 'maxed' && shards >= cost,
        loggedIn,
        unlocked,
        color: getInventoryRarityFxColor(skill.rarity),
        imagePath: getHeroUniqueSkillIconPath(hero, skill),
        glyph: getHeroUniqueSkillGlyph(skill),
        rarity: String(skill.rarity || 'common').trim().toLowerCase(),
      };
    }

    return null;
  }
  function renderHeroProgressionStatSection(title, rows, emptyText) {
    const list = Array.isArray(rows) ? rows : [];
    const body = list.length
      ? list.map((row) => `<span class="hero-progression-stat-row"><b>${escapeHtml(row.label)}</b><strong>${escapeHtml(row.value)}</strong></span>`).join('')
      : `<span>${escapeHtml(emptyText)}</span>`;
    return `<section><b>${escapeHtml(title)}</b><div>${body}</div></section>`;
  }
  function renderHeroProgressionModalArt(data) {
    const imagePath = String(data?.imagePath || '').trim();
    const className = `battle-hub-skill-modal-art hero-progression-modal-art ${data?.kind === 'talent' ? 'is-talent' : 'is-skill'}${imagePath ? ' has-image' : ''}`;
    if (imagePath) {
      return `<div class="${escapeHtml(className)}"><img src="${escapeHtml(imagePath)}" alt="" loading="eager" decoding="async" fetchpriority="high"></div>`;
    }
    return `<div class="${escapeHtml(className)}"><span>${escapeHtml(data?.glyph || '?')}</span></div>`;
  }
  function ensureHeroProgressionModalElement() {
    if (heroProgressionModalEl) return heroProgressionModalEl;
    const el = document.createElement('div');
    el.className = 'battle-hub-skill-modal hero-progression-modal hidden';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="battle-hub-skill-modal-backdrop" data-hero-progression-modal-close="1"></div>'
      + '<div class="battle-hub-skill-modal-card hero-progression-modal-card" role="document">'
      + `<button class="battle-hub-skill-modal-close" type="button" data-hero-progression-modal-close="1" aria-label="${escapeHtml(trWithFallback('ui.skill_modal.close_aria', 'Close skill details'))}"></button>`
      + '<div class="battle-hub-skill-modal-content"></div>'
      + '</div>';
    el.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-hero-progression-modal-close]')) closeHeroProgressionModal();
    });
    document.body.appendChild(el);
    heroProgressionModalEl = el;
    return el;
  }
  function closeHeroProgressionModal() {
    if (!heroProgressionModalEl) return;
    if (heroProgressionModalEl.classList.contains('hidden') || heroProgressionModalEl.classList.contains('is-closing')) return;
    if (heroProgressionModalCloseTimer) clearTimeout(heroProgressionModalCloseTimer);
    if (heroProgressionModalPulseTimer) clearTimeout(heroProgressionModalPulseTimer);
    heroProgressionModalEl.classList.remove('is-open', 'is-busy', 'is-purchased');
    heroProgressionModalEl.classList.add('is-closing');
    heroProgressionModalCloseTimer = setTimeout(() => {
      if (!heroProgressionModalEl) return;
      heroProgressionModalEl.classList.add('hidden');
      heroProgressionModalEl.classList.remove('is-open', 'is-closing', 'is-purchased', 'is-busy');
      heroProgressionModalState = null;
      heroProgressionModalCloseTimer = 0;
      heroProgressionModalPulseTimer = 0;
    }, HERO_PROGRESSION_MODAL_CLOSE_MS);
  }
  function renderHeroProgressionModal() {
    if (!heroProgressionModalState) return;
    const data = getHeroProgressionModalData(
      heroProgressionModalState.kind,
      heroProgressionModalState.heroId,
      heroProgressionModalState.itemId,
    );
    const modal = ensureHeroProgressionModalElement();
    const content = modal.querySelector('.battle-hub-skill-modal-content');
    if (!(content instanceof HTMLElement) || !data) {
      closeHeroProgressionModal();
      return;
    }

    const currentRows = data.level > 0
      ? getHeroProgressionStatRows(data.item, data.level)
      : [];
    const nextRows = data.action !== 'maxed'
      ? getHeroProgressionStatRows(data.item, data.nextLevel)
      : [];
    const emptyCurrent = data.level > 0
      ? getInventoryUiText('\u0425\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a\u0438 \u043d\u0435 \u0437\u0430\u0434\u0430\u043d\u044b', 'No stats configured')
      : getInventoryUiText('\u0415\u0449\u0435 \u043d\u0435 \u0438\u0437\u0443\u0447\u0435\u043d\u043e', 'Not learned yet');
    const emptyNext = getInventoryUiText('\u041f\u0440\u0438\u0440\u043e\u0441\u0442 \u0443\u0436\u0435 \u043d\u0430 \u043c\u0430\u043a\u0441\u0438\u043c\u0443\u043c\u0435', 'Already at maximum');
    const levelText = data.level > 0
      ? `Lv ${data.level}/${data.maxLevel}`
      : `${trWithFallback('ui.hero.locked', 'Locked')} / ${data.maxLevel}`;
    const nextTitle = data.action === 'unlock'
      ? getInventoryUiText('\u041f\u043e\u0441\u043b\u0435 \u043e\u0442\u043a\u0440\u044b\u0442\u0438\u044f', 'After unlock')
      : getInventoryUiText('\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c', 'Next level');
    const levelPct = Math.max(0, Math.min(100, (data.level / Math.max(1, data.maxLevel)) * 100));
    const afterValue = data.action === 'maxed' ? data.resourceValue : Math.max(0, data.resourceValue - data.cost);
    const actionLabel = data.action === 'unlock'
      ? `${trWithFallback('ui.hero.unlock', 'Unlock')} | ${formatHeroProgressionCurrency(data.resourceKind, data.cost)}`
      : data.action === 'upgrade'
        ? `${trWithFallback('ui.inventory.action_upgrade', 'Upgrade')} | ${formatHeroProgressionCurrency(data.resourceKind, data.cost)}`
        : trWithFallback('ui.common.max', 'MAX');
    const statusText = !data.loggedIn
      ? trWithFallback('ui.profile.login_required', 'Login required.')
      : !data.unlocked
        ? trWithFallback('ui.hero.locked', 'Hero locked')
        : data.action === 'maxed'
          ? trWithFallback('ui.skill_modal.maxed', 'Maxed')
          : data.resourceValue >= data.cost
            ? getInventoryUiText('\u0413\u043e\u0442\u043e\u0432\u043e \u043a \u043f\u0440\u043e\u043a\u0430\u0447\u043a\u0435', 'Ready to upgrade')
            : `${getInventoryUiText('\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442', 'Need more')}: ${formatHeroProgressionCurrency(data.resourceKind, Math.max(0, data.cost - data.resourceValue))}`;
    const desc = String(data.desc || '').trim() || data.subtitle;
    const rarityLabel = data.kind === 'skill' ? ` | ${getItemRarityLabel(data.rarity || 'common')}` : '';

    modal.style.setProperty('--avatar-accent', String(data.hero?.accent || data.color || '#38bdf8'));
    modal.style.setProperty('--skill-color', String(data.color || data.hero?.accent || '#38bdf8'));
    modal.setAttribute('aria-label', data.title);
    content.innerHTML = '<div class="battle-hub-skill-modal-hero hero-progression-modal-hero">'
      + renderHeroProgressionModalArt(data)
      + '<div class="battle-hub-skill-modal-head hero-progression-modal-head">'
      + `<span class="battle-hub-skill-modal-kicker">${escapeHtml(data.subtitle)}${escapeHtml(rarityLabel)}</span>`
      + `<strong>${escapeHtml(data.title)}</strong>`
      + `<small>${escapeHtml(data.heroName)} | ${escapeHtml(levelText)}</small>`
      + `<div class="hero-progression-level-track" style="--progress:${levelPct.toFixed(1)}%"><i></i></div>`
      + '</div>'
      + '</div>'
      + `<p class="battle-hub-skill-modal-desc">${escapeHtml(desc)}</p>`
      + '<div class="battle-hub-skill-modal-stats hero-progression-modal-stats">'
      + renderHeroProgressionStatSection(getInventoryUiText('\u0421\u0435\u0439\u0447\u0430\u0441', 'Current'), currentRows, emptyCurrent)
      + (data.action !== 'maxed' ? renderHeroProgressionStatSection(nextTitle, nextRows, emptyNext) : '')
      + '</div>'
      + '<div class="battle-hub-skill-modal-economy">'
      + `<span><b>${escapeHtml(trWithFallback('ui.skill_modal.cost', 'Cost'))}</b><strong>${escapeHtml(data.action === 'maxed' ? trWithFallback('ui.skill_modal.done', 'Done') : formatHeroProgressionCurrency(data.resourceKind, data.cost))}</strong></span>`
      + `<span class="${data.resourceValue > 0 ? 'has-value' : ''}"><b>${escapeHtml(getInventoryUiText('\u0423 \u0432\u0430\u0441', 'You have'))}</b><strong>${escapeHtml(formatHeroProgressionCurrency(data.resourceKind, data.resourceValue))}</strong></span>`
      + `<span><b>${escapeHtml(trWithFallback('ui.skill_modal.after', 'After'))}</b><strong>${escapeHtml(formatHeroProgressionCurrency(data.resourceKind, afterValue))}</strong></span>`
      + '</div>'
      + `<div class="battle-hub-skill-modal-status ${data.canUse ? 'ok' : 'warn'}">${escapeHtml(statusText)}</div>`
      + `<button class="battle-hub-skill-modal-action hero-progression-modal-action" type="button" data-hero-progression-modal-action="${escapeHtml(data.action)}"${data.canUse ? '' : ' disabled'}>${escapeHtml(actionLabel)}</button>`;

    const actionBtn = content.querySelector('.hero-progression-modal-action');
    actionBtn?.addEventListener('click', () => {
      void purchaseHeroProgressionDetail();
    }, { once: true });
  }
  function openHeroProgressionModal(kind, heroId, itemId) {
    const nextKind = String(kind || '').trim().toLowerCase();
    const nextHeroId = normalizeHeroEquipFxKey(heroId);
    const nextItemId = String(itemId || '').trim();
    if (!nextKind || !nextHeroId || !nextItemId) return;
    heroProgressionModalState = { kind: nextKind, heroId: nextHeroId, itemId: nextItemId };
    const modal = ensureHeroProgressionModalElement();
    if (heroProgressionModalCloseTimer) {
      clearTimeout(heroProgressionModalCloseTimer);
      heroProgressionModalCloseTimer = 0;
    }
    renderHeroProgressionModal();
    modal.classList.remove('hidden', 'is-closing', 'is-purchased', 'is-busy');
    void modal.offsetWidth;
    modal.classList.add('is-open');
  }
  async function purchaseHeroProgressionDetail() {
    if (!heroProgressionModalState || !heroProgressionModalEl) return;
    const data = getHeroProgressionModalData(
      heroProgressionModalState.kind,
      heroProgressionModalState.heroId,
      heroProgressionModalState.itemId,
    );
    if (!data || !data.canUse || data.action === 'maxed') return;
    heroProgressionModalEl.classList.add('is-busy');
    try {
      if (data.kind === 'talent') {
        await upgradeHeroNodeForAccount(data.hero.id, data.item.id);
      } else if (data.action === 'unlock') {
        await unlockHeroSkillForAccount(data.hero.id, data.item.id);
      } else {
        await upgradeHeroSkillForAccount(data.hero.id, data.item.id);
      }
      setHeroActionFeedback(`${data.heroName}: ${data.title} ${data.action === 'unlock' ? 'unlocked' : 'upgraded'}`, 'ok');
      renderCharacterPicker();
      renderHeroProgressionModal();
      heroProgressionModalEl.classList.remove('is-busy');
      heroProgressionModalEl.classList.add('is-purchased');
      if (heroProgressionModalPulseTimer) clearTimeout(heroProgressionModalPulseTimer);
      heroProgressionModalPulseTimer = setTimeout(() => {
        heroProgressionModalEl?.classList?.remove('is-purchased');
        heroProgressionModalPulseTimer = 0;
      }, HERO_PROGRESSION_MODAL_PULSE_MS);
    } catch (err) {
      const msg = humanizeHeroApiError(err, 'Failed to upgrade.');
      heroProgressionModalEl.classList.remove('is-busy');
      renderHeroProgressionModal();
      const status = heroProgressionModalEl.querySelector('.battle-hub-skill-modal-status');
      if (status instanceof HTMLElement) {
        status.textContent = msg;
        status.className = 'battle-hub-skill-modal-status warn';
      }
      setHeroActionFeedback(msg, 'err');
    }
  }
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const detailBtn = target.closest('[data-hero-detail-kind]');
    if (!(detailBtn instanceof HTMLElement)) return;
    event.preventDefault();
    event.stopPropagation();
    openHeroProgressionModal(
      detailBtn.getAttribute('data-hero-detail-kind') || '',
      detailBtn.getAttribute('data-hero-detail-hero') || '',
      detailBtn.getAttribute('data-hero-detail-id') || '',
    );
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!heroProgressionModalEl || heroProgressionModalEl.classList.contains('hidden')) return;
    closeHeroProgressionModal();
  });
  function getUnlockedHeroSet(catalog, progression) {
    if (progression?.unlockedHeroes && Array.isArray(progression.unlockedHeroes)) {
      return new Set(progression.unlockedHeroes.map((id) => String(id || '').trim()).filter(Boolean));
    }
    return new Set([catalog.baseHeroId || 'cyber']);
  }
  function setHeroActionFeedback(message, kind = '') {
    if (!heroActionFeedbackEl) return;
    const text = String(message || '').trim();
    if (!text) {
      heroActionFeedbackEl.textContent = '';
      heroActionFeedbackEl.className = 'hero-action-feedback hidden';
      return;
    }
    heroActionFeedbackEl.textContent = text;
    heroActionFeedbackEl.className = `hero-action-feedback ${kind}`.trim();
    heroActionFeedbackEl.classList.remove('hidden');
  }
  function getHeroInventoryScrollEl() {
    return heroCharacterPanelEl?.querySelector?.('.hero-inventory-panel .inventory-category-list')
      || heroTreePanelEl?.querySelector?.('.hero-inventory-panel .inventory-category-list')
      || document.querySelector('#menu-panel-characters .hero-inventory-panel .inventory-category-list')
      || null;
  }
  function captureHeroInventoryScrollState() {
    const el = getHeroInventoryScrollEl();
    const joinFormEl = document.getElementById('join-form');
    const pageScrollEl = document.scrollingElement || document.documentElement || document.body;
    return {
      inventoryLeft: Math.max(0, Number(el?.scrollLeft) || 0),
      inventoryTop: Math.max(0, Number(el?.scrollTop) || 0),
      joinFormLeft: Math.max(0, Number(joinFormEl?.scrollLeft) || 0),
      joinFormTop: Math.max(0, Number(joinFormEl?.scrollTop) || 0),
      pageLeft: Math.max(0, Number(pageScrollEl?.scrollLeft ?? globalThis.scrollX) || 0),
      pageTop: Math.max(0, Number(pageScrollEl?.scrollTop ?? globalThis.scrollY) || 0),
    };
  }
  function restoreHeroInventoryScrollState(state) {
    if (!state) return;
    const apply = () => {
      const el = getHeroInventoryScrollEl();
      const joinFormEl = document.getElementById('join-form');
      const pageScrollEl = document.scrollingElement || document.documentElement || document.body;
      if (el) {
        const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
        const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
        el.scrollTop = Math.min(Math.max(0, Number(state.inventoryTop) || 0), maxTop);
        el.scrollLeft = Math.min(Math.max(0, Number(state.inventoryLeft) || 0), maxLeft);
      }
      if (joinFormEl) {
        const maxTop = Math.max(0, joinFormEl.scrollHeight - joinFormEl.clientHeight);
        const maxLeft = Math.max(0, joinFormEl.scrollWidth - joinFormEl.clientWidth);
        joinFormEl.scrollTop = Math.min(Math.max(0, Number(state.joinFormTop) || 0), maxTop);
        joinFormEl.scrollLeft = Math.min(Math.max(0, Number(state.joinFormLeft) || 0), maxLeft);
      }
      if (pageScrollEl) {
        pageScrollEl.scrollTop = Math.max(0, Number(state.pageTop) || 0);
        pageScrollEl.scrollLeft = Math.max(0, Number(state.pageLeft) || 0);
      }
    };
    apply();
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() => {
        apply();
        globalThis.requestAnimationFrame(apply);
      });
    } else {
      setTimeout(apply, 0);
    }
    setTimeout(apply, 90);
    setTimeout(apply, 220);
  }
  function humanizeHeroApiError(err, fallback) {
    const msg = String(err?.message || '').trim();
    if (msg.includes('404')) {
      return 'Progression API not found on server. Restart server to apply updates.';
    }
    return msg || fallback;
  }
  async function beginBattleHubHeroSwap(heroId) {
    if (typeof globalThis.beginBattleHubPlayerSwapFx !== 'function') return false;
    try {
      return Boolean(await globalThis.beginBattleHubPlayerSwapFx(heroId));
    } catch {
      return false;
    }
  }
  function endBattleHubHeroSwap(started) {
    if (!started || typeof globalThis.endBattleHubPlayerSwapFx !== 'function') return;
    globalThis.endBattleHubPlayerSwapFx();
  }
  async function selectHeroForAccount(heroId) {
    if (!game.playerAuth?.player) return;
    const data = await apiJson('/api/player/progression/select-hero', {
      method: 'POST',
      body: JSON.stringify({ heroId }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
  }
  async function unlockHeroForAccount(heroId) {
    if (!game.playerAuth?.player) return;
    const data = await apiJson('/api/player/progression/unlock-hero', {
      method: 'POST',
      body: JSON.stringify({ heroId }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
  }
  async function upgradeHeroNodeForAccount(heroId, nodeId) {
    if (!game.playerAuth?.player) return;
    const fxColor = getHeroTalentFxColor(heroId, nodeId);
    const data = await apiJson('/api/player/progression/upgrade-node', {
      method: 'POST',
      body: JSON.stringify({ heroId, nodeId }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
    markHeroTalentUpgradeFx(heroId, nodeId, fxColor);
  }
  async function unlockHeroSkillForAccount(heroId, skillId) {
    if (!game.playerAuth?.player) return;
    const data = await apiJson('/api/player/progression/unlock-hero-skill', {
      method: 'POST',
      body: JSON.stringify({ heroId, skillId }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
    markHeroSkillUpgradeFx(heroId, skillId, 'unlock');
  }
  async function upgradeHeroSkillForAccount(heroId, skillId) {
    if (!game.playerAuth?.player) return;
    const data = await apiJson('/api/player/progression/upgrade-hero-skill', {
      method: 'POST',
      body: JSON.stringify({ heroId, skillId }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
    markHeroSkillUpgradeFx(heroId, skillId, 'upgrade');
  }
  async function equipItemForAccount(heroId, itemUid, slotKey) {
    if (!game.playerAuth?.player) return;
    const fxColor = getInventoryItemFxColorByUid(itemUid);
    const data = await apiJson('/api/player/progression/equip-item', {
      method: 'POST',
      body: JSON.stringify({ heroId, itemUid, slotKey }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
    markHeroEquipSlotFx(heroId, slotKey, 'equip', fxColor);
  }
  async function unequipItemForAccount(heroId, slotKey) {
    if (!game.playerAuth?.player) return;
    const fxColor = getEquippedSlotFxColor(heroId, slotKey);
    const data = await apiJson('/api/player/progression/unequip-item', {
      method: 'POST',
      body: JSON.stringify({ heroId, slotKey }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
    markHeroEquipSlotFx(heroId, slotKey, 'unequip', fxColor);
  }
  async function sellInventoryItemForAccount(itemUid) {
    if (!game.playerAuth?.player) return;
    const data = await apiJson('/api/player/progression/sell-item', {
      method: 'POST',
      body: JSON.stringify({ itemUid }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
  }
  async function upgradeInventoryItemForAccount(itemUid) {
    if (!game.playerAuth?.player) return;
    const data = await apiJson('/api/player/progression/upgrade-item', {
      method: 'POST',
      body: JSON.stringify({ itemUid }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
  }
  function useQuickItemInRun(slotKey) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const key = String(slotKey || '').trim();
    if (!key) return false;
    sendJson({ type: 'useQuickItem', slotKey: key });
    return true;
  }
  function getCatalogItemMap(catalog) {
    const out = {};
    for (const item of Array.isArray(catalog?.items) ? catalog.items : []) {
      if (!item?.id) continue;
      out[item.id] = item;
    }
    return out;
  }
  function getItemDisplayName(itemDef) {
    const id = String(itemDef?.id || '').trim().toLowerCase();
    return trWithFallback(`item.${id}.name`, itemDef?.name || itemDef?.id || '-');
  }
  function getItemRarityLabel(rarity) {
    const key = String(rarity || 'common').trim().toLowerCase();
    return trWithFallback(`ui.inventory.rarity.${key}`, key);
  }
  function getItemSlotLabel(slot) {
    return trWithFallback(`ui.inventory.slot.${String(slot?.key || '').toLowerCase()}`, slot?.name || slot?.key || '-');
  }
  function getItemCategoryLabel(category) {
    const key = String(category || '').trim().toLowerCase();
    const fallbackMap = {
      head: 'Шапка',
      armor: 'Броня',
      legs: 'Штаны',
      hand: 'Рука',
      ring: 'Кольцо',
      quick: 'Быстрый слот',
    };
    return trWithFallback(`ui.inventory.category.${key}`, fallbackMap[key] || key || '-');
  }
  function getInventoryUiText(ruText, enText) {
    const lang = typeof globalThis.cwI18nGetLanguage === 'function'
      ? String(globalThis.cwI18nGetLanguage() || '').trim().toLowerCase()
      : 'ru';
    return lang === 'ru' ? ruText : enText;
  }
  function formatInventoryNumber(value, decimals = 1) {
    const n = Number(value) || 0;
    const fixed = n.toFixed(decimals);
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }
  function formatInventorySignedNumber(value, decimals = 1) {
    const n = Number(value) || 0;
    const sign = n > 0 ? '+' : '';
    return `${sign}${formatInventoryNumber(n, decimals)}`;
  }
  function formatInventorySignedPercent(value) {
    const pct = (Number(value) || 0) * 100;
    if (Math.abs(pct) < 0.05) return '';
    return `${pct > 0 ? '+' : ''}${formatInventoryNumber(pct, Math.abs(pct) < 10 ? 1 : 0)}%`;
  }
  function scaleInventoryConsumableMagnitude(base, item, step = 0.22) {
    const level = Math.max(1, Number(item?.level) || 1);
    return Number(base || 0) * (1 + Math.max(0, Math.floor(level) - 1) * step);
  }
  function formatInventoryItemEffectText(itemDef, item = null) {
    if (!itemDef || typeof itemDef !== 'object') return '';
    const isRu = (typeof globalThis.cwI18nGetLanguage !== 'function')
      || String(globalThis.cwI18nGetLanguage() || 'ru').trim().toLowerCase() === 'ru';
    const parts = [];
    const addPart = (labelRu, labelEn, value) => {
      const text = String(value || '').trim();
      if (!text) return;
      parts.push(`${getInventoryUiText(labelRu, labelEn)} ${text}`);
    };
    const addPct = (labelRu, labelEn, value) => addPart(labelRu, labelEn, formatInventorySignedPercent(value));
    const addFlat = (labelRu, labelEn, value, decimals = 0) => {
      if (Math.abs(Number(value) || 0) < 0.001) return;
      addPart(labelRu, labelEn, formatInventorySignedNumber(value, decimals));
    };
    const combatUse = itemDef.combatUse && typeof itemDef.combatUse === 'object' ? itemDef.combatUse : null;
    if (combatUse) {
      const type = String(combatUse.type || '').trim().toLowerCase();
      const secSuffix = isRu ? 'с' : 's';
      if (type === 'heal') {
        parts.push(`${getInventoryUiText('Лечение', 'Heal')} +${Math.round(scaleInventoryConsumableMagnitude(combatUse.healFlat, item, 0.3))} HP`);
      } else if (type === 'grenade') {
        parts.push(`${getInventoryUiText('Урон', 'Damage')} ${Math.round(scaleInventoryConsumableMagnitude(combatUse.damage, item, 0.26))}`);
        parts.push(`${getInventoryUiText('Радиус', 'Radius')} ${Math.round(scaleInventoryConsumableMagnitude(combatUse.radius, item, 0.08))}`);
        const stunMs = Math.round(scaleInventoryConsumableMagnitude(combatUse.stunMs, item, 0.14));
        if (stunMs > 0) parts.push(`${getInventoryUiText('Стан', 'Stun')} ${formatInventoryNumber(stunMs / 1000, 1)}${secSuffix}`);
      } else if (type === 'artillery') {
        parts.push(`${getInventoryUiText('Залпы', 'Waves')} ${Math.max(1, Math.round(Number(combatUse.waves) || 1))}`);
        parts.push(`${getInventoryUiText('Урон', 'Damage')} ${Math.round(scaleInventoryConsumableMagnitude(combatUse.damage, item, 0.24))}`);
        parts.push(`${getInventoryUiText('Радиус', 'Radius')} ${Math.round(scaleInventoryConsumableMagnitude(combatUse.radius, item, 0.09))}`);
      } else if (type === 'satellite') {
        parts.push(`${getInventoryUiText('Орбитальный удар', 'Orbital strike')} ${Math.round(scaleInventoryConsumableMagnitude(combatUse.damage, item, 0.28))}`);
        parts.push(`${getInventoryUiText('Радиус', 'Radius')} ${Math.round(scaleInventoryConsumableMagnitude(combatUse.radius, item, 0.08))}`);
        const stunMs = Math.max(240, Math.round(scaleInventoryConsumableMagnitude(combatUse.stunMs || 900, item, 0.12)));
        parts.push(`${getInventoryUiText('Стан', 'Stun')} ${formatInventoryNumber(stunMs / 1000, 1)}${secSuffix}`);
      } else if (type === 'buff') {
        addPct('Урон', 'Damage', scaleInventoryConsumableMagnitude(combatUse.damageMul, item, 0.16));
        addPct('Скорострельность', 'Fire rate', scaleInventoryConsumableMagnitude(combatUse.fireRateMul, item, 0.16));
        addPct('Скорость', 'Move speed', scaleInventoryConsumableMagnitude(combatUse.moveSpeedMul, item, 0.14));
        const durationSec = Math.round(scaleInventoryConsumableMagnitude(combatUse.durationMs, item, 0.06) / 1000);
        if (durationSec > 0) parts.push(`${getInventoryUiText('Длительность', 'Duration')} ${durationSec}${secSuffix}`);
      } else if (type === 'regen') {
        addPart('Реген', 'Regen', `${formatInventorySignedNumber(scaleInventoryConsumableMagnitude(combatUse.hpRegenPerSec, item, 0.18), 1)}/s`);
        const durationSec = Math.round(scaleInventoryConsumableMagnitude(combatUse.durationMs, item, 0.06) / 1000);
        if (durationSec > 0) parts.push(`${getInventoryUiText('Длительность', 'Duration')} ${durationSec}${secSuffix}`);
      }
      return parts.length
        ? `${getInventoryUiText('Эффект:', 'Effect:')} ${parts.join(' · ')}`
        : '';
    }

    const stats = itemDef.stats && typeof itemDef.stats === 'object' ? itemDef.stats : null;
    if (!stats) return '';
    const levelScale = 1 + Math.max(0, (Math.max(1, Number(item?.level) || 1) - 1)) * 0.22;
    addPct('Урон', 'Damage', (Number(stats.damageMul) || 0) * levelScale);
    addPct('Скорострельность', 'Fire rate', (Number(stats.fireRateMul) || 0) * levelScale);
    addPct('Перезарядка', 'Reload', (Number(stats.reloadSpeedMul) || 0) * levelScale);
    addPct('Скорость', 'Move speed', (Number(stats.moveSpeedMul) || 0) * levelScale);
    addFlat('HP', 'HP', (Number(stats.maxHpFlat) || 0) * levelScale, 0);
    const regen = (Number(stats.hpRegenPerSec) || 0) * levelScale;
    if (Math.abs(regen) >= 0.001) addPart('Реген', 'Regen', `${formatInventorySignedNumber(regen, 2)}/s`);
    addFlat('Подбор', 'Pickup', (Number(stats.pickupRadius) || 0) * levelScale, 0);
    return parts.length
      ? `${getInventoryUiText('Даёт:', 'Gives:')} ${parts.join(' · ')}`
      : '';
  }
  function getItemIconPath(itemDef) {
    const icon = String(itemDef?.icon || itemDef?.iconPath || '').trim();
    if (!icon) {
      const id = String(itemDef?.id || '').trim();
      return id ? `/assets/items/${id}.webp` : '';
    }
    if (/^(?:https?:)?\/\//.test(icon) || icon.startsWith('/') || icon.startsWith('data:')) return icon;
    return `/assets/items/${icon}`;
  }
  function getInventoryItemIconMeta(itemDef, equipTargets) {
    const imagePath = getItemIconPath(itemDef);
    const withImage = (meta) => ({ ...meta, imagePath });
    if (itemDef?.combatUse) {
      return withImage({ glyph: 'FX', className: 'consumable' });
    }
    const slotCategory = String(itemDef?.slotCategory || '').trim().toLowerCase();
    if (slotCategory === 'head') return withImage({ glyph: 'HD', className: 'head' });
    if (slotCategory === 'armor') return withImage({ glyph: 'AR', className: 'armor' });
    if (slotCategory === 'legs') return withImage({ glyph: 'LG', className: 'legs' });
    if (slotCategory === 'ring') return withImage({ glyph: 'RG', className: 'ring' });
    const hasLeftHand = equipTargets.some((slot) => String(slot?.key || '').trim().toLowerCase() === 'left_hand');
    const hasRightHand = equipTargets.some((slot) => String(slot?.key || '').trim().toLowerCase() === 'right_hand');
    if (hasLeftHand && hasRightHand) return withImage({ glyph: 'WP', className: 'hands' });
    if (hasLeftHand) return withImage({ glyph: 'LH', className: 'hands' });
    if (hasRightHand) return withImage({ glyph: 'RH', className: 'hands' });
    return withImage({ glyph: 'IT', className: 'other' });
  }
  function renderInventoryItemIconHtml(iconMeta, extraClass = '') {
    const imagePath = String(iconMeta?.imagePath || '').trim();
    const className = `inventory-item-icon inventory-item-icon-${escapeHtml(iconMeta?.className || 'other')}${imagePath ? ' has-image' : ''}${extraClass ? ` ${escapeHtml(extraClass)}` : ''}`;
    if (imagePath) {
      return `<div class="${className}"><img src="${escapeHtml(imagePath)}" alt="" loading="lazy" decoding="async" /></div>`;
    }
    return `<div class="${className}">${escapeHtml(iconMeta?.glyph || 'IT')}</div>`;
  }
  function getItemRaritySortWeight(rarity) {
    switch (String(rarity || '').trim().toLowerCase()) {
      case 'legendary': return 5;
      case 'epic': return 4;
      case 'rare': return 3;
      case 'uncommon': return 2;
      default: return 1;
    }
  }
  function getInventorySlotTargets(catalog, itemDef) {
    const slotCategory = String(itemDef?.slotCategory || '').trim();
    return (Array.isArray(catalog?.itemSlots) ? catalog.itemSlots : []).filter((slot) => String(slot?.category || '').trim() === slotCategory);
  }
  function getHeroEquipmentItemMap(catalog, progression, heroId) {
    const inventoryItems = Array.isArray(progression?.inventoryItems) ? progression.inventoryItems : [];
    const inventoryByUid = Object.fromEntries(inventoryItems.map((item) => [String(item.uid || ''), item]));
    const heroEquipment = progression?.heroEquipment?.[heroId] && typeof progression.heroEquipment[heroId] === 'object'
      ? progression.heroEquipment[heroId]
      : {};
    const out = {};
    for (const slotKey of Object.keys(heroEquipment)) {
      const item = inventoryByUid[String(heroEquipment[slotKey] || '').trim()];
      if (item) out[slotKey] = item;
    }
    return out;
  }
  const heroPreviewImageCache = new Map();
  function getHeroPreviewImage(heroId) {
    const key = String(heroId || '').trim().toLowerCase() || 'cyber';
    if (heroPreviewImageCache.has(key)) return heroPreviewImageCache.get(key);
    const img = new Image();
    img.src = getHeroCardImagePath(key);
    heroPreviewImageCache.set(key, img);
    return img;
  }
  function drawCharacterPreview(previewCanvas, variant) {
    const c = previewCanvas;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    const portrait = getHeroPreviewImage(variant.id);
    if (portrait?.complete && portrait.naturalWidth > 0 && portrait.naturalHeight > 0) {
      g.imageSmoothingEnabled = true;
      const srcRatio = portrait.naturalWidth / Math.max(1, portrait.naturalHeight);
      const dstRatio = c.width / Math.max(1, c.height);
      let sx = 0;
      let sy = 0;
      let sw = portrait.naturalWidth;
      let sh = portrait.naturalHeight;
      if (srcRatio > dstRatio) {
        sw = Math.round(sh * dstRatio);
        sx = Math.round((portrait.naturalWidth - sw) * 0.5);
      } else {
        sh = Math.round(sw / dstRatio);
        sy = Math.round((portrait.naturalHeight - sh) * 0.18);
        sy = Math.max(0, Math.min(sy, portrait.naturalHeight - sh));
      }
      g.drawImage(portrait, sx, sy, sw, sh, 0, 0, c.width, c.height);
      g.fillStyle = variant.accent;
      g.fillRect(c.width - 14, 4, 10, 3);
      return;
    }
    const sprite = sprites.players[variant.id];
    const fw = Math.max(8, Number(variant.frameW) || 32);
    const fh = Math.max(8, Number(variant.frameH) || 48);
    const baseScale = Math.max(0.5, Number(variant.scale) || 1);
    const frameCount = sprite?.naturalWidth ? Math.max(1, Math.floor(sprite.naturalWidth / fw)) : 1;
    const idleFrame = Math.max(0, Math.min(frameCount - 1, Number(variant.idleFrame) || 1));
    if (!(sprite?.complete && sprite.naturalWidth >= fw && sprite.naturalHeight >= fh)) {
      g.fillStyle = variant.accent;
      g.beginPath();
      g.arc(c.width / 2, c.height / 2, 12, 0, Math.PI * 2);
      g.fill();
      return;
    }
    const fitScale = Math.min(
      baseScale,
      Math.max(0.2, (c.width - 8) / fw),
      Math.max(0.2, (c.height - 8) / fh),
    );
    const dw = fw * fitScale;
    const dh = fh * fitScale;
    const dx = Math.round((c.width - dw) / 2);
    const dy = Math.round((c.height - dh) / 2) + 1;
    g.drawImage(sprite, idleFrame * fw, (variant.rows?.down || 0) * fh, fw, fh, dx, dy, dw, dh);
    const tint = String(variant.tint || variant.accent || '').trim();
    if (tint) {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = 0.34;
      g.fillStyle = tint;
      g.fillRect(dx, dy, dw, dh);
      g.restore();
    }
    g.fillStyle = variant.accent;
    g.fillRect(c.width - 14, 4, 10, 3);
  }
  function renderAccountSummary(catalog, progression) {
    if (!accountProgressSummaryEl) return;
    if (!game.playerAuth?.player || !progression) {
      accountProgressSummaryEl.innerHTML = '<b>' + trWithFallback('ui.profile.guest_mode', 'Guest mode:') + '</b> ' + trWithFallback('ui.profile.guest_progression_hint', 'account progression, heroes and talents are saved only for logged in players.') ;
      return;
    }
    const level = Math.max(1, Number(progression.accountLevel) || 1);
    const xp = Math.max(0, Number(progression.accountXp) || 0);
    const xpToNext = Math.max(1, Number(progression.accountXpToNext) || 1);
    const points = Math.max(0, Number(progression.accountSkillPoints) || 0);
    const shards = Math.max(0, Number(progression.shards) || 0);
    const salvage = Math.max(0, Number(progression.salvage) || 0);
    accountProgressSummaryEl.innerHTML = `${trWithFallback('ui.profile.account', 'Account')} Lv${level} | XP ${xp}/${xpToNext} | ${trWithFallback('ui.profile.skill_points', 'Skill points')}: <b>${points}</b> | ${trWithFallback('ui.profile.shards', 'Shards')}: <b>${shards}</b> | ${trWithFallback('ui.inventory.salvage', 'Лом')}: <b>${salvage}</b>`;
  }
  function getNodeLevel(progression, heroId, nodeId) {
    return Math.max(0, Number(progression?.heroNodes?.[heroId]?.[nodeId]) || 0);
  }
  function getHeroSkillLevel(progression, heroId, skillId) {
    return Math.max(0, Number(progression?.heroSkillLevels?.[heroId]?.[skillId]) || 0);
  }
  const HERO_PROFILE_RU = {
    dossier: '\u0422\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0434\u043e\u0441\u044c\u0435',
    level: '\u0423\u0440\u043e\u0432\u0435\u043d\u044c',
    xp: '\u041e\u043f\u044b\u0442',
    max: '\u041c\u0430\u043a\u0441',
    unlocked: '\u041e\u0442\u043a\u0440\u044b\u0442',
    locked: '\u0417\u0430\u043a\u0440\u044b\u0442',
    attributes: '\u0425\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a\u0438',
    bonuses: '\u0411\u043e\u0435\u0432\u044b\u0435 \u0431\u043e\u043d\u0443\u0441\u044b',
    sources: '\u041e\u0442\u043a\u0443\u0434\u0430 \u0438\u0434\u0443\u0442 \u0431\u043e\u043d\u0443\u0441\u044b',
    power: '\u0421\u0438\u043b\u0430',
    agility: '\u041b\u043e\u0432\u043a\u043e\u0441\u0442\u044c',
    vitality: '\u0416\u0438\u0432\u0443\u0447\u0435\u0441\u0442\u044c',
    tech: '\u0422\u0435\u0445\u043d\u0438\u043a\u0430',
    damage: '\u0423\u0440\u043e\u043d',
    fireRate: '\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u0440\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c',
    reload: '\u041f\u0435\u0440\u0435\u0437\u0430\u0440\u044f\u0434\u043a\u0430',
    moveSpeed: '\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c',
    maxHp: '\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435',
    regen: '\u0420\u0435\u0433\u0435\u043d',
    pickup: '\u041f\u043e\u0434\u0431\u043e\u0440',
    dodge: '\u0420\u044b\u0432\u043a\u0438',
    heroLevel: '\u0413\u0435\u0440\u043e\u0439 + \u0443\u0440\u043e\u0432\u0435\u043d\u044c',
    talents: '\u0422\u0430\u043b\u0430\u043d\u0442\u044b',
    passiveSkills: '\u041f\u0430\u0441\u0441\u0438\u0432\u043d\u044b\u0435 \u043d\u0430\u0432\u044b\u043a\u0438',
    rosterAuras: '\u0410\u0443\u0440\u044b \u043e\u0442\u0440\u044f\u0434\u0430',
    gear: '\u0421\u043d\u0430\u0440\u044f\u0436\u0435\u043d\u0438\u0435',
    none: '\u043d\u0435\u0442',
  };
  function heroProfileText(key, enText) {
    return getInventoryUiText(HERO_PROFILE_RU[key] || enText, enText);
  }
  function createHeroBonusBucket() {
    return {
      damageMul: 0,
      fireRateMul: 0,
      reloadSpeedMul: 0,
      moveSpeedMul: 0,
      maxHpFlat: 0,
      hpRegenPerSec: 0,
      pickupRadius: 0,
      extraDodgeCharges: 0,
    };
  }
  function addHeroBonusValue(bucket, key, value) {
    if (!bucket || !(key in bucket)) return;
    const n = Number(value) || 0;
    if (Math.abs(n) < 0.0001) return;
    bucket[key] += n;
  }
  function addHeroLevelBonusDef(bucket, def, level, prefix = '') {
    const lvl = Math.max(0, Number(level) || 0);
    if (!bucket || !def || lvl <= 0) return;
    const prop = (name) => {
      if (!prefix) return name;
      return prefix + name.charAt(0).toUpperCase() + name.slice(1);
    };
    addHeroBonusValue(bucket, 'damageMul', (Number(def[prop('damageMulPerLevel')]) || 0) * lvl);
    addHeroBonusValue(bucket, 'fireRateMul', (Number(def[prop('fireRateMulPerLevel')]) || 0) * lvl);
    addHeroBonusValue(bucket, 'reloadSpeedMul', (Number(def[prop('reloadSpeedMulPerLevel')]) || 0) * lvl);
    addHeroBonusValue(bucket, 'moveSpeedMul', (Number(def[prop('moveSpeedMulPerLevel')]) || 0) * lvl);
    addHeroBonusValue(bucket, 'maxHpFlat', (Number(def[prop('maxHpFlatPerLevel')]) || 0) * lvl);
    addHeroBonusValue(bucket, 'hpRegenPerSec', (Number(def[prop('hpRegenPerSecPerLevel')]) || 0) * lvl);
    addHeroBonusValue(bucket, 'pickupRadius', (Number(def[prop('pickupRadiusPerLevel')]) || 0) * lvl);
    addHeroBonusValue(bucket, 'extraDodgeCharges', (Number(def[prop('extraDodgeChargesPerLevel')]) || 0) * lvl);
  }
  function addHeroGearStats(bucket, stats, scale = 1) {
    if (!bucket || !stats) return;
    const mul = Number(scale) || 1;
    addHeroBonusValue(bucket, 'damageMul', (Number(stats.damageMul) || 0) * mul);
    addHeroBonusValue(bucket, 'fireRateMul', (Number(stats.fireRateMul) || 0) * mul);
    addHeroBonusValue(bucket, 'reloadSpeedMul', (Number(stats.reloadSpeedMul) || 0) * mul);
    addHeroBonusValue(bucket, 'moveSpeedMul', (Number(stats.moveSpeedMul) || 0) * mul);
    addHeroBonusValue(bucket, 'maxHpFlat', (Number(stats.maxHpFlat) || 0) * mul);
    addHeroBonusValue(bucket, 'hpRegenPerSec', (Number(stats.hpRegenPerSec) || 0) * mul);
    addHeroBonusValue(bucket, 'pickupRadius', (Number(stats.pickupRadius) || 0) * mul);
  }
  function sumHeroBonusBuckets(buckets) {
    const total = createHeroBonusBucket();
    for (const bucket of Object.values(buckets || {})) {
      for (const key of Object.keys(total)) addHeroBonusValue(total, key, bucket?.[key]);
    }
    return total;
  }
  function formatHeroProfilePercent(value) {
    const pct = (Number(value) || 0) * 100;
    const decimals = Math.abs(pct) > 0 && Math.abs(pct) < 10 ? 1 : 0;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${formatInventoryNumber(pct, decimals)}%`;
  }
  function formatHeroProfileFlat(value, decimals = 0, suffix = '') {
    const n = Number(value) || 0;
    const sign = n > 0 ? '+' : '';
    return `${sign}${formatInventoryNumber(n, decimals)}${suffix}`;
  }
  function getHeroProfileBonusDefs(bucket) {
    return [
      { key: 'damageMul', label: heroProfileText('damage', 'Damage'), value: formatHeroProfilePercent(bucket?.damageMul), tone: 'damage' },
      { key: 'fireRateMul', label: heroProfileText('fireRate', 'Fire rate'), value: formatHeroProfilePercent(bucket?.fireRateMul), tone: 'rate' },
      { key: 'reloadSpeedMul', label: heroProfileText('reload', 'Reload'), value: formatHeroProfilePercent(bucket?.reloadSpeedMul), tone: 'reload' },
      { key: 'moveSpeedMul', label: heroProfileText('moveSpeed', 'Move speed'), value: formatHeroProfilePercent(bucket?.moveSpeedMul), tone: 'speed' },
      { key: 'maxHpFlat', label: heroProfileText('maxHp', 'Max HP'), value: formatHeroProfileFlat(bucket?.maxHpFlat, 0), tone: 'guard' },
      { key: 'hpRegenPerSec', label: heroProfileText('regen', 'Regen'), value: formatHeroProfileFlat(bucket?.hpRegenPerSec, 2, '/s'), tone: 'regen' },
      { key: 'pickupRadius', label: heroProfileText('pickup', 'Pickup'), value: formatHeroProfileFlat(bucket?.pickupRadius, 0), tone: 'field' },
      { key: 'extraDodgeCharges', label: heroProfileText('dodge', 'Dodge'), value: formatHeroProfileFlat(bucket?.extraDodgeCharges, 0), tone: 'dodge' },
    ];
  }
  function summarizeHeroBonusBucket(bucket) {
    const parts = getHeroProfileBonusDefs(bucket)
      .filter((def) => Math.abs(Number(bucket?.[def.key]) || 0) >= 0.001)
      .slice(0, 3)
      .map((def) => `${def.label} ${def.value}`);
    return parts.length ? parts.join(' | ') : heroProfileText('none', 'none');
  }
  function computeHeroProfileBonuses(catalog, progression, hero, equippedItems, itemMap) {
    const bySource = {
      heroLevel: createHeroBonusBucket(),
      talents: createHeroBonusBucket(),
      passiveSkills: createHeroBonusBucket(),
      rosterAuras: createHeroBonusBucket(),
      gear: createHeroBonusBucket(),
    };
    const heroId = String(hero?.id || '').trim();
    const heroLevel = Math.max(1, Number(progression?.heroLevels?.[heroId]) || 1);
    const levelFactor = Math.max(0, heroLevel - 1);
    const baseStats = hero?.baseStats && typeof hero.baseStats === 'object' ? hero.baseStats : {};
    const levelGrowth = hero?.levelGrowth && typeof hero.levelGrowth === 'object' ? hero.levelGrowth : {};
    addHeroBonusValue(bySource.heroLevel, 'damageMul', ((Number(baseStats.power) || 0) * 0.012) + ((Number(levelGrowth.power) || 0) * levelFactor));
    addHeroBonusValue(bySource.heroLevel, 'fireRateMul', ((Number(baseStats.agility) || 0) * 0.008) + ((Number(levelGrowth.agility) || 0) * levelFactor * 0.52));
    addHeroBonusValue(bySource.heroLevel, 'moveSpeedMul', ((Number(baseStats.agility) || 0) * 0.01) + ((Number(levelGrowth.agility) || 0) * levelFactor));
    addHeroBonusValue(bySource.heroLevel, 'maxHpFlat', ((Number(baseStats.vitality) || 0) * 9) + (((Number(levelGrowth.vitality) || 0) * levelFactor) * 28));
    addHeroBonusValue(bySource.heroLevel, 'hpRegenPerSec', ((Number(baseStats.vitality) || 0) * 0.035) + (((Number(levelGrowth.vitality) || 0) * levelFactor) * 0.18));
    addHeroBonusValue(bySource.heroLevel, 'pickupRadius', ((Number(baseStats.tech) || 0) * 2.8) + (((Number(levelGrowth.tech) || 0) * levelFactor) * 12));

    const tree = Array.isArray(catalog?.trees?.[heroId]) ? catalog.trees[heroId] : [];
    for (const node of tree) addHeroLevelBonusDef(bySource.talents, node, getNodeLevel(progression, heroId, node?.id));

    for (const skill of (Array.isArray(hero?.uniqueSkills) ? hero.uniqueSkills : [])) {
      const level = getHeroSkillLevel(progression, heroId, skill?.id);
      if (level <= 0 || skill?.kind !== 'passive' || skill?.globalAura) continue;
      addHeroLevelBonusDef(bySource.passiveSkills, skill, level);
    }

    for (const sourceHero of (Array.isArray(catalog?.heroes) ? catalog.heroes : [])) {
      const sourceHeroId = String(sourceHero?.id || '').trim();
      if (!sourceHeroId || sourceHeroId === heroId) continue;
      for (const skill of (Array.isArray(sourceHero?.uniqueSkills) ? sourceHero.uniqueSkills : [])) {
        const level = getHeroSkillLevel(progression, sourceHeroId, skill?.id);
        if (level <= 0 || skill?.kind !== 'passive' || !skill?.globalAura) continue;
        addHeroLevelBonusDef(bySource.rosterAuras, skill, level, 'global');
      }
    }

    for (const item of Object.values(equippedItems || {})) {
      const itemDef = itemMap?.[item?.itemId] || null;
      const stats = itemDef?.stats && typeof itemDef.stats === 'object' ? itemDef.stats : null;
      if (!item || !stats) continue;
      const scale = 1 + Math.max(0, (Math.max(1, Number(item.level) || 1) - 1)) * 0.22;
      addHeroGearStats(bySource.gear, stats, scale);
    }

    return {
      bySource,
      total: sumHeroBonusBuckets(bySource),
    };
  }
  function renderHeroProfileCard(catalog, progression, hero, options = {}) {
    const heroId = String(hero?.id || '').trim();
    const heroLevel = Math.max(1, Number(options.heroLevel) || Number(progression?.heroLevels?.[heroId]) || 1);
    const heroLevelCap = Math.max(1, Number(options.heroLevelCap) || Number(catalog?.heroLevelCap) || 999);
    const heroXpValue = Math.max(0, Number(options.heroXpValue) || 0);
    const heroXpNeed = Math.max(0, Number(options.heroXpNeed) || 0);
    const xpPct = heroXpNeed > 0 ? Math.max(0, Math.min(100, (heroXpValue / heroXpNeed) * 100)) : 100;
    const baseStats = hero?.baseStats && typeof hero.baseStats === 'object' ? hero.baseStats : {};
    const levelGrowth = hero?.levelGrowth && typeof hero.levelGrowth === 'object' ? hero.levelGrowth : {};
    const levelFactor = Math.max(0, heroLevel - 1);
    const attrs = [
      { key: 'power', short: 'POW', label: heroProfileText('power', 'Power') },
      { key: 'agility', short: 'AGI', label: heroProfileText('agility', 'Agility') },
      { key: 'vitality', short: 'VIT', label: heroProfileText('vitality', 'Vitality') },
      { key: 'tech', short: 'TEC', label: heroProfileText('tech', 'Tech') },
    ].map((attr) => ({
      ...attr,
      value: (Number(baseStats[attr.key]) || 0) + ((Number(levelGrowth[attr.key]) || 0) * levelFactor),
      growth: Number(levelGrowth[attr.key]) || 0,
    }));
    const attrMax = Math.max(10, ...attrs.map((attr) => attr.value));
    const bonuses = computeHeroProfileBonuses(catalog, progression, hero, options.equippedItems || {}, options.itemMap || {});
    const bonusHtml = getHeroProfileBonusDefs(bonuses.total).map((def) => (
      `<div class="hero-profile-bonus hero-profile-bonus-${escapeHtml(def.tone)}"><span>${escapeHtml(def.label)}</span><strong>${escapeHtml(def.value)}</strong></div>`
    )).join('');
    const sourceRows = [
      ['heroLevel', heroProfileText('heroLevel', 'Hero + level'), '#60a5fa'],
      ['talents', heroProfileText('talents', 'Talents'), '#f97316'],
      ['passiveSkills', heroProfileText('passiveSkills', 'Passive skills'), '#a855f7'],
      ['rosterAuras', heroProfileText('rosterAuras', 'Roster auras'), '#22d3ee'],
      ['gear', heroProfileText('gear', 'Gear'), '#facc15'],
    ].map(([key, label, color]) => (
      `<div class="hero-profile-source" style="--source-color:${escapeHtml(color)}"><span>${escapeHtml(label)}</span><b>${escapeHtml(summarizeHeroBonusBucket(bonuses.bySource[key]))}</b></div>`
    )).join('');
    const tree = Array.isArray(catalog?.trees?.[heroId]) ? catalog.trees[heroId] : [];
    const uniqueSkills = Array.isArray(hero?.uniqueSkills) ? hero.uniqueSkills : [];
    const talentUnlocked = tree.reduce((sum, node) => sum + (getNodeLevel(progression, heroId, node?.id) > 0 ? 1 : 0), 0);
    const skillUnlocked = uniqueSkills.reduce((sum, skill) => sum + (getHeroSkillLevel(progression, heroId, skill?.id) > 0 ? 1 : 0), 0);
    const gearSlots = Array.isArray(options.gearSlots) ? options.gearSlots : [];
    const equippedGear = gearSlots.reduce((sum, slot) => sum + (options.equippedItems?.[slot?.key] ? 1 : 0), 0);
    const statusLabel = options.unlocked ? heroProfileText('unlocked', 'Unlocked') : heroProfileText('locked', 'Locked');
    const xpLabel = heroLevel >= heroLevelCap
      ? heroProfileText('max', 'MAX')
      : `${heroXpValue}/${heroXpNeed || 0} XP`;
    const attrHtml = attrs.map((attr) => {
      const pct = Math.max(0, Math.min(100, (attr.value / attrMax) * 100));
      const value = formatInventoryNumber(attr.value, Math.abs(attr.value - Math.round(attr.value)) < 0.05 ? 0 : 1);
      return `<div class="hero-profile-attr" style="--attr-pct:${pct.toFixed(1)}%"><span>${escapeHtml(attr.short)}</span><strong>${escapeHtml(value)}</strong><b>${escapeHtml(attr.label)}</b></div>`;
    }).join('');
    const summaryChips = [
      [heroProfileText('talents', 'Talents'), `${talentUnlocked}/${tree.length}`],
      ['Hero Skills', `${skillUnlocked}/${uniqueSkills.length}`],
      [heroProfileText('gear', 'Gear'), `${equippedGear}/${gearSlots.length}`],
    ].map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`).join('');
    const extraClass = String(options.extraClass || '').trim();
    const panelEnterIndex = Number.isFinite(Number(options.panelEnterIndex)) ? Math.max(0, Number(options.panelEnterIndex)) : 0;
    const panelEnterDelay = Math.min(320, Math.round(panelEnterIndex * 70));
    return `<div class="hero-loadout-card hero-profile-card${extraClass ? ` ${escapeHtml(extraClass)}` : ''}" style="--hero-accent:${escapeHtml(options.heroAccent || '#38bdf8')};--hero-xp:${xpPct.toFixed(1)}%;--panel-enter-delay:${panelEnterDelay}ms">`
      + '<div class="hero-profile-head">'
      + `<div class="hero-profile-portrait"><img src="${escapeHtml(getHeroCardImagePath(heroId))}" alt="${escapeHtml(options.heroDisplayName || hero?.name || heroId)}" /></div>`
      + '<div class="hero-profile-main">'
      + `<div class="hero-profile-kicker">${escapeHtml(heroProfileText('dossier', 'Tactical dossier'))}</div>`
      + `<div class="hero-profile-title"><strong>${escapeHtml(options.heroDisplayName || hero?.name || heroId)}</strong><span class="${options.unlocked ? 'ok' : 'locked'}">${escapeHtml(statusLabel)}</span></div>`
      + `<div class="hero-profile-tagline">${escapeHtml(options.heroTagline || '')}</div>`
      + `<div class="hero-profile-level"><span>${escapeHtml(heroProfileText('level', 'Level'))} ${heroLevel}/${heroLevelCap}</span><b>${escapeHtml(xpLabel)}</b></div>`
      + '<div class="hero-profile-xp"><i aria-hidden="true"></i></div>'
      + '</div></div>'
      + `<div class="hero-profile-summary-chips">${summaryChips}</div>`
      + `<div class="hero-profile-section-title">${escapeHtml(heroProfileText('attributes', 'Attributes'))}</div>`
      + `<div class="hero-profile-attr-grid">${attrHtml}</div>`
      + `<div class="hero-profile-section-title">${escapeHtml(heroProfileText('bonuses', 'Combat bonuses'))}</div>`
      + `<div class="hero-profile-bonus-grid">${bonusHtml}</div>`
      + `<div class="hero-profile-section-title">${escapeHtml(heroProfileText('sources', 'Bonus sources'))}</div>`
      + `<div class="hero-profile-source-list">${sourceRows}</div>`
      + (!options.unlocked ? `<div class="hero-profile-unlock-meta">${options.unlockMeta || ''}</div>` : '')
      + (options.actionBtn ? `<div class="hero-profile-action-row">${options.actionBtn}</div>` : '')
      + '</div>';
  }
  function heroRequirementMeta(need, have, formatter) {
    const enough = Math.max(0, Number(have) || 0) >= Math.max(0, Number(need) || 0);
    return {
      enough,
      text: formatter(Math.max(0, Number(need) || 0), Math.max(0, Number(have) || 0)),
    };
  }
  function renderHeroUniqueSkillRow(hero, skill, progression, shards, unlocked) {
    const lvl = getHeroSkillLevel(progression, hero.id, skill.id);
    const maxLevel = Math.max(1, Number(skill.maxLevel) || 1);
    const unlockedSkill = lvl > 0;
    const maxedSkill = lvl >= maxLevel;
    const unlockCost = Math.max(1, Number(skill.unlockCostShards) || 1);
    const upgradeCost = Math.max(1, (Number(skill.upgradeCostShardsBase) || 1) + (Math.max(0, lvl - 1) * Math.max(0, Number(skill.upgradeCostShardsStep) || 0)));
    const shardWord = trWithFallback('ui.profile.shards', 'Shards').toLowerCase();
    const costReq = heroRequirementMeta(unlockedSkill ? upgradeCost : unlockCost, shards, (need, have) => {
      const tpl = unlockedSkill ? 'ui.hero.skill_upgrade_cost' : 'ui.hero.skill_unlock_cost';
      const fb = unlockedSkill ? 'Upgrade: {cost} shards' : 'Unlock: {cost} shards';
      return trWithFallback(tpl, fb, { cost: need, currency: shardWord }) + ' | ' + `${trWithFallback('ui.hero.have_label', 'You have')}: ${have}`;
    });
    const canUnlockSkill = Boolean(game.playerAuth?.player && unlocked && !unlockedSkill && costReq.enough);
    const canUpgradeSkill = Boolean(game.playerAuth?.player && unlocked && unlockedSkill && !maxedSkill && costReq.enough);
    const canUseAction = unlockedSkill ? canUpgradeSkill : canUnlockSkill;
    const skillName = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.name`, skill.name || skill.id);
    const skillDesc = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.desc`, skill.desc || '');
    const skillEffectText = formatHeroUniqueSkillInlineEffectText(skill, lvl);
    const skillDescHtml = `${escapeHtml(skillDesc)}${skillEffectText ? ` <span class="hero-node-current-effect">${escapeHtml(skillEffectText)}</span>` : ''}`;
    const skillType = skill.kind === 'active'
      ? trWithFallback('ui.hero.skill_type_active', 'Active')
      : (skill.globalAura ? trWithFallback('ui.hero.skill_type_passive_aura', 'Passive Aura') : trWithFallback('ui.hero.skill_type_passive', 'Passive'));
    const requirementLabel = unlockedSkill
      ? (maxedSkill ? trWithFallback('ui.common.max', 'MAX') : costReq.text)
      : costReq.text;
    const requirementClass = (costReq.enough || maxedSkill) ? 'ok' : 'lack';
    const skillIconHtml = renderHeroUniqueSkillDetailIconHtml(hero, skill, skillName);
    const skillFx = getHeroSkillUpgradeFx(hero.id, skill.id);
    const skillColor = skillFx.color || getInventoryRarityFxColor(skill.rarity);
    const rowClasses = [
      'hero-node',
      'hero-unique-skill',
      unlockedSkill ? 'is-unlocked' : 'is-locked',
      maxedSkill ? 'is-maxed' : '',
      canUseAction ? 'can-upgrade' : '',
      (!costReq.enough && !maxedSkill) ? 'hero-node-lack' : '',
      skillFx.className,
    ].filter(Boolean).join(' ');
    const buttonClasses = [
      'hero-node-up',
      'hero-skill-upgrade-action',
      canUseAction ? 'is-ready' : '',
      (!costReq.enough && !maxedSkill) ? 'hero-node-up-lack' : '',
      unlockedSkill ? 'is-upgrade' : 'is-unlock',
      maxedSkill ? 'is-maxed' : '',
    ].filter(Boolean).join(' ');
    const actionVerb = maxedSkill
      ? trWithFallback('ui.common.max', 'MAX')
      : (unlockedSkill ? trWithFallback('ui.inventory.action_upgrade', 'Upgrade') : trWithFallback('ui.hero.unlock', 'Unlock'));
    const levelLabel = `${lvl}/${maxLevel}`;
    const actionTitle = `${actionVerb}: ${skillName}. ${levelLabel}. ${requirementLabel}`;
    const detailTitle = `${getInventoryUiText('\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435', 'Details')}: ${skillName}`;
    const actionMarkHtml = maxedSkill ? '' : '<span class="hero-skill-upgrade-action-mark" aria-hidden="true">+</span>';
    return `<div class="${escapeHtml(rowClasses)}" data-hero-skill-row="${escapeHtml(skill.id)}" style="--skill-color:${escapeHtml(skillColor)}">${skillIconHtml}<div class="hero-unique-skill-copy"><button type="button" class="hero-node-detail-hit" data-hero-detail-kind="skill" data-hero-detail-hero="${escapeHtml(hero.id)}" data-hero-detail-id="${escapeHtml(skill.id)}" title="${escapeHtml(detailTitle)}" aria-label="${escapeHtml(detailTitle)}"><span class="hero-node-name">${escapeHtml(skillName)} <span class="muted">(${escapeHtml(skillType)})</span></span><span class="hero-node-desc">${skillDescHtml}</span></button><div class="hero-node-desc hero-req ${requirementClass}">${escapeHtml(requirementLabel)}</div></div><button type="button" class="${escapeHtml(buttonClasses)}" data-hero-skill-id="${escapeHtml(skill.id)}" data-hero-skill-action="${unlockedSkill ? 'upgrade' : 'unlock'}" title="${escapeHtml(actionTitle)}" aria-label="${escapeHtml(actionTitle)}" ${canUseAction ? '' : 'disabled'}><span class="hero-skill-upgrade-action-frame" aria-hidden="true"></span><span class="hero-skill-upgrade-action-level">${escapeHtml(levelLabel)}</span>${actionMarkHtml}</button></div>`;
  }
  function renderHeroTalentNodeRow(hero, node, progression, points, unlocked) {
    const lvl = getNodeLevel(progression, hero.id, node.id);
    const maxLevel = Math.max(1, Number(node.maxLevel) || 1);
    const maxedNode = lvl >= maxLevel;
    const cost = Math.max(1, Number(node.cost) || 1);
    const pointReq = heroRequirementMeta(cost, points, (need, have) => trWithFallback('ui.hero.need_have_points', 'Skill points: need {need} • you have {have}', { need, have }));
    const canUpgrade = Boolean(game.playerAuth?.player && unlocked && !maxedNode && pointReq.enough);
    const nodeName = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.name`, node.name || node.id);
    const nodeDesc = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.desc`, node.desc || '');
    const currentEffectText = formatHeroTalentCurrentEffectText(node, lvl);
    const nodeDescHtml = `${escapeHtml(nodeDesc)}${currentEffectText ? ` <span class="hero-node-current-effect">${escapeHtml(currentEffectText)}</span>` : ''}`;
    const requirementLabel = maxedNode ? trWithFallback('ui.common.max', 'MAX') : pointReq.text;
    const requirementClass = (pointReq.enough || maxedNode) ? 'ok' : 'lack';
    const talentVisual = getHeroTalentNodeVisual(hero, node);
    const talentFx = getHeroTalentUpgradeFx(hero.id, node.id);
    const talentColor = talentFx.color || talentVisual.color;
    const talentIconHtml = renderHeroTalentIconHtml(talentVisual, getHeroTalentIconPath(node), {
      detail: true,
      heroId: hero.id,
      nodeId: node.id,
      title: nodeName,
    });
    const rowClasses = [
      'hero-node',
      'hero-talent-node',
      `hero-talent-${talentVisual.key}`,
      maxedNode ? 'is-maxed' : '',
      canUpgrade ? 'can-upgrade' : '',
      (!pointReq.enough && !maxedNode) ? 'hero-node-lack' : '',
      talentFx.className,
    ].filter(Boolean).join(' ');
    const buttonClasses = [
      'hero-node-up',
      'hero-skill-upgrade-action',
      'hero-talent-upgrade-action',
      canUpgrade ? 'is-ready' : '',
      (!pointReq.enough && !maxedNode) ? 'hero-node-up-lack' : '',
      maxedNode ? 'is-maxed' : '',
    ].filter(Boolean).join(' ');
    const actionVerb = maxedNode ? trWithFallback('ui.common.max', 'MAX') : trWithFallback('ui.inventory.action_upgrade', 'Upgrade');
    const levelLabel = `${lvl}/${maxLevel}`;
    const actionTitle = `${actionVerb}: ${nodeName}. ${levelLabel}. ${requirementLabel}`;
    const detailTitle = `${getInventoryUiText('\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435', 'Details')}: ${nodeName}`;
    const actionMarkHtml = maxedNode ? '' : '<span class="hero-skill-upgrade-action-mark" aria-hidden="true">+</span>';
    return `<div class="${escapeHtml(rowClasses)}" data-hero-talent-row="${escapeHtml(node.id)}" style="--skill-color:${escapeHtml(talentColor)};--talent-color:${escapeHtml(talentColor)}">${talentIconHtml}<div class="hero-talent-copy"><button type="button" class="hero-node-detail-hit" data-hero-detail-kind="talent" data-hero-detail-hero="${escapeHtml(hero.id)}" data-hero-detail-id="${escapeHtml(node.id)}" title="${escapeHtml(detailTitle)}" aria-label="${escapeHtml(detailTitle)}"><span class="hero-node-name">${escapeHtml(nodeName)}</span><span class="hero-node-desc">${nodeDescHtml}</span></button><div class="hero-node-desc hero-req ${requirementClass}">${escapeHtml(requirementLabel)}</div></div><button type="button" class="${escapeHtml(buttonClasses)}" data-node-id="${escapeHtml(node.id)}" title="${escapeHtml(actionTitle)}" aria-label="${escapeHtml(actionTitle)}" ${canUpgrade ? '' : 'disabled'}><span class="hero-skill-upgrade-action-frame" aria-hidden="true"></span><span class="hero-skill-upgrade-action-level">${escapeHtml(levelLabel)}</span>${actionMarkHtml}</button></div>`;
  }
  function bindHeroUnlockButton(targetEl, hero) {
    const unlockBtn = targetEl?.querySelector?.('[data-hero-unlock="1"]');
    unlockBtn?.addEventListener('click', async () => {
      try {
        await unlockHeroForAccount(hero.id);
        setHeroActionFeedback(trWithFallback('ui.hero.unlocked_msg', `${hero.name} unlocked.`, { hero: trHeroName(hero.id, hero.name) }), 'ok');
        const swapStarted = await beginBattleHubHeroSwap(hero.id);
        selectedPlayerClass = hero.id;
        localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
        renderCharacterPicker();
        endBattleHubHeroSwap(swapStarted);
        try {
          await selectHeroForAccount(hero.id);
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to select hero.'), 'err');
        }
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unlock hero.'), 'err');
        globalThis.cancelBattleHubPlayerSwapFx?.();
      }
    });
  }
  function bindHeroProgressionButtons(targetEl, hero) {
    for (const btn of targetEl?.querySelectorAll?.('.hero-node-up') || []) {
      btn.addEventListener('click', async () => {
        const heroSkillId = btn.getAttribute('data-hero-skill-id') || '';
        const heroSkillAction = btn.getAttribute('data-hero-skill-action') || '';
        if (heroSkillId) {
          try {
            if (heroSkillAction === 'unlock') await unlockHeroSkillForAccount(hero.id, heroSkillId);
            else await upgradeHeroSkillForAccount(hero.id, heroSkillId);
            setHeroActionFeedback(`${hero.name}: ${heroSkillId} ${heroSkillAction === 'unlock' ? 'unlocked' : 'upgraded'}`, 'ok');
            renderCharacterPicker();
          } catch (err) {
            setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to update hero skill.'), 'err');
          }
          return;
        }
        const nodeId = btn.getAttribute('data-node-id') || '';
        if (!nodeId) return;
        try {
          await upgradeHeroNodeForAccount(hero.id, nodeId);
          setHeroActionFeedback(`Upgraded ${hero.name}: ${nodeId}`, 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade node.'), 'err');
        }
      });
    }
  }
  function bindHeroInventoryButtons(targetEl, hero) {
    for (const btn of targetEl?.querySelectorAll?.('[data-inventory-filter]') || []) {
      btn.addEventListener('click', () => {
        selectedInventoryFilterKey = String(btn.getAttribute('data-inventory-filter') || 'all');
        renderCharacterPicker();
      });
    }
    for (const btn of targetEl?.querySelectorAll?.('[data-open-slot-equip]') || []) {
      btn.addEventListener('click', () => {
        globalThis.CWHeroEquipModal?.open?.(hero, btn.getAttribute('data-open-slot-equip') || '');
      });
    }
    for (const btn of targetEl?.querySelectorAll?.('[data-unequip-slot]') || []) {
      btn.addEventListener('click', async () => {
        try {
          await unequipItemForAccount(hero.id, btn.getAttribute('data-unequip-slot') || '');
          setHeroActionFeedback(trWithFallback('ui.inventory.unequipped', 'Предмет снят.'), 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unequip item.'), 'err');
        }
      });
    }
    for (const btn of targetEl?.querySelectorAll?.('[data-item-equip]') || []) {
      btn.addEventListener('click', async () => {
        try {
          await equipItemForAccount(hero.id, btn.getAttribute('data-item-equip') || '', btn.getAttribute('data-slot-key') || '');
          setHeroActionFeedback(trWithFallback('ui.inventory.equipped', 'Предмет экипирован.'), 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to equip item.'), 'err');
        }
      });
    }
    for (const btn of targetEl?.querySelectorAll?.('[data-item-sell]') || []) {
      btn.addEventListener('click', async () => {
        try {
          const inventoryScrollState = captureHeroInventoryScrollState();
          await sellInventoryItemForAccount(btn.getAttribute('data-item-sell') || '');
          setHeroActionFeedback(trWithFallback('ui.inventory.sold', 'Предмет продан.'), 'ok');
          renderCharacterPicker();
          restoreHeroInventoryScrollState(inventoryScrollState);
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to sell item.'), 'err');
        }
      });
    }
    for (const btn of targetEl?.querySelectorAll?.('[data-item-upgrade]') || []) {
      btn.addEventListener('click', async () => {
        try {
          await upgradeInventoryItemForAccount(btn.getAttribute('data-item-upgrade') || '');
          setHeroActionFeedback(trWithFallback('ui.inventory.upgraded', 'Предмет улучшен.'), 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade item.'), 'err');
        }
      });
    }
  }
  function splitHeroPanelsBetweenMenus(hero) {
    if (!heroTreePanelEl || !heroCharacterPanelEl) return;
    const shell = heroTreePanelEl.querySelector('.hero-loadout-shell');
    if (!shell) {
      heroCharacterPanelEl.innerHTML = '';
      return;
    }
    const cards = Array.from(shell.children);
    const headerCard = cards[0] || null;
    const layoutCard = cards[1] || null;
    const layoutChildren = Array.from(layoutCard?.children || []);
    const stageCard = layoutChildren[0] || null;
    const talentCard = layoutChildren[1] || null;
    const uniqueCard = layoutChildren[2] || null;
    const useArenaRoster = getHeroRosterMode() === 'arena';
    const rosterEl = heroGalleryV2El || null;
    const charactersPanel = heroCharacterPanelEl.closest('#menu-panel-characters');
    const directSubpanels = Array.from(charactersPanel?.children || []).filter((el) => el?.classList?.contains('cw-subpanel'));
    const rosterPanelEl = directSubpanels.find((el) => !el.contains(heroCharacterPanelEl)) || null;
    if (rosterPanelEl) rosterPanelEl.classList.toggle('hero-roster-panel-collapsed', useArenaRoster);
    if (rosterEl && heroCharacterPanelEl.contains(rosterEl)) {
      rosterEl.remove();
    }
    if (!useArenaRoster && rosterEl) {
      if (rosterPanelEl && rosterEl.parentNode !== rosterPanelEl) {
        rosterPanelEl.appendChild(rosterEl);
      } else if (!rosterPanelEl && heroCharacterPanelEl.parentNode && rosterEl.parentNode !== heroCharacterPanelEl.parentNode) {
        heroCharacterPanelEl.parentNode.insertBefore(rosterEl, heroCharacterPanelEl);
      }
    }
    heroCharacterPanelEl.innerHTML = '';
    const characterShell = document.createElement('div');
    characterShell.className = 'hero-loadout-shell hero-character-shell';
    if (useArenaRoster && rosterEl) characterShell.appendChild(rosterEl);
    const characterTopRow = document.createElement('div');
    characterTopRow.className = 'hero-character-top-row';
    const characterDossierStack = document.createElement('div');
    characterDossierStack.className = 'hero-character-dossier-stack';
    if (headerCard) characterDossierStack.appendChild(headerCard.cloneNode(true));
    if (talentCard) characterDossierStack.appendChild(talentCard.cloneNode(true));
    if (characterDossierStack.children.length) characterTopRow.appendChild(characterDossierStack);
    if (stageCard) characterTopRow.appendChild(stageCard.cloneNode(true));
    if (uniqueCard) characterTopRow.appendChild(uniqueCard.cloneNode(true));
    if (characterTopRow.children.length) characterShell.appendChild(characterTopRow);
    heroCharacterPanelEl.appendChild(characterShell);
    shell.innerHTML = '';
    if (headerCard) shell.appendChild(headerCard);
    const skillsRow = document.createElement('div');
    skillsRow.className = 'hero-skill-panels-row';
    if (talentCard) skillsRow.appendChild(talentCard);
    if (uniqueCard) skillsRow.appendChild(uniqueCard);
    shell.appendChild(skillsRow);
    bindHeroUnlockButton(heroCharacterPanelEl, hero);
    bindHeroProgressionButtons(heroCharacterPanelEl, hero);
    bindHeroInventoryButtons(heroCharacterPanelEl, hero);
    bindHeroUnlockButton(heroTreePanelEl, hero);
    bindHeroProgressionButtons(heroTreePanelEl, hero);
  }
  function renderHeroTreePanel(catalog, progression, hero, unlocked) {
    if (!heroTreePanelEl) return;
    if (!hero) {
      heroTreePanelEl.innerHTML = '';
      return;
    }
    const points = Math.max(0, Number(progression?.accountSkillPoints) || 0);
    const shards = Math.max(0, Number(progression?.shards) || 0);
    const accountLevel = Math.max(1, Number(progression?.accountLevel) || 1);
    const needLevel = Math.max(1, Number(hero.unlockLevel) || 1);
    const needShardCost = Math.max(0, Number(hero.unlockShardCost ?? hero.unlockCost) || 0);
    const needCardId = String(hero.unlockCardId || '').trim();
    const needCards = Math.max(0, Number(hero.unlockCardNeed) || 0);
    const cardName = trWithFallback(`hero.${String(hero.id || '').toLowerCase()}.card`, String(hero.unlockCardName || hero.name || trWithFallback('ui.hero.card', 'Hero Card')));
    const haveCards = needCardId ? Math.max(0, Number(progression?.heroCards?.[needCardId]) || 0) : needCards;
    const accountLevelReq = heroRequirementMeta(needLevel, accountLevel, (need, have) => trWithFallback('ui.hero.need_have_level', 'Required level: {need} • You have: {have}', { need, have }));
    const shardsReq = heroRequirementMeta(needShardCost, shards, (need, have) => trWithFallback('ui.hero.need_have', 'Need: {need} • You have: {have}', { need, have }));
    const cardsReq = heroRequirementMeta(needCards, haveCards, (need, have) => trWithFallback('ui.hero.need_have_cards', '{card}: need {need} • you have {have}', { card: cardName, need, have }));
    const canUnlock = game.playerAuth?.player
      && !unlocked
      && accountLevelReq.enough
      && shardsReq.enough
      && cardsReq.enough;
    const tree = Array.isArray(catalog.trees?.[hero.id]) ? catalog.trees[hero.id] : [];
    const uniqueSkills = Array.isArray(hero.uniqueSkills) ? hero.uniqueSkills : [];
    const heroLevels = progression?.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
    const heroXp = progression?.heroXp && typeof progression.heroXp === 'object' ? progression.heroXp : {};
    const heroXpToNext = progression?.heroXpToNext && typeof progression.heroXpToNext === 'object' ? progression.heroXpToNext : {};
    const heroLevelCap = Math.max(1, Number(catalog?.heroLevelCap) || 999);
    const heroLevel = Math.max(1, Number(heroLevels[hero.id]) || 1);
    const heroXpValue = Math.max(0, Number(heroXp[hero.id]) || 0);
    const heroXpNeed = Math.max(0, Number(heroXpToNext[hero.id]) || 0);
    const rows = [];
    for (const node of tree) {
      rows.push(renderHeroTalentNodeRow(hero, node, progression, points, unlocked));
    }
    const skillRows = uniqueSkills.map((skill) => renderHeroUniqueSkillRow(hero, skill, progression, shards, unlocked)).join('');
    const unlockMeta = !unlocked
      ? `<div class="hero-lock-meta"><span class="hero-req ${accountLevelReq.enough ? 'ok' : 'lack'}">${escapeHtml(accountLevelReq.text)}</span><span class="hero-req ${cardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(cardsReq.text)}</span><span class="hero-req ${shardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(shardsReq.text)}</span></div>`
      : '<div class="hero-lock-meta unlocked">' + trWithFallback('ui.hero.unlocked', 'Unlocked') + '</div>';
    const actionBtn = !game.playerAuth?.player
      ? '<button type="button" class="hero-main-action" disabled>' + trWithFallback('ui.auth.login_required_unlock', 'Login to unlock/progress') + '</button>'
      : (!unlocked
        ? `<button type="button" class="hero-main-action" data-hero-unlock="1" ${canUnlock ? '' : 'disabled'}>${trWithFallback('ui.hero.unlock_btn', 'Unlock hero')}</button>`
        : '');
    const heroDisplayName = trHeroName(hero.id, hero.name);
    const heroTagline = trWithFallback(`hero.${String(hero.id || '').toLowerCase()}.tagline`, hero.tagline || '');
    const heroStats = hero.baseStats && typeof hero.baseStats === 'object'
      ? `POW ${Math.max(0, Number(hero.baseStats.power) || 0)} | AGI ${Math.max(0, Number(hero.baseStats.agility) || 0)} | VIT ${Math.max(0, Number(hero.baseStats.vitality) || 0)} | TEC ${Math.max(0, Number(hero.baseStats.tech) || 0)}`
      : '';
    const heroXpLabel = heroLevel >= heroLevelCap
      ? `Lv ${heroLevel}/${heroLevelCap} MAX`
      : `Lv ${heroLevel}/${heroLevelCap} | XP ${heroXpValue}/${heroXpNeed}`;
    heroTreePanelEl.innerHTML = `<div class="hero-tree-head"><div><b>${escapeHtml(heroDisplayName)}</b><div class="hero-tagline">${escapeHtml(heroTagline)}</div><div class="hero-tagline">${escapeHtml(heroXpLabel)}</div><div class="hero-tagline">${escapeHtml(heroStats)}</div></div>${unlockMeta}</div>${actionBtn}<div class="hero-tree-list">${rows.join('')}</div><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.hero.unique_skills', 'Unique skills'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.unique_skills_hint', 'Active skills and passive effects for the selected hero.'))}</div></div></div><div class="hero-tree-list">${skillRows || `<div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.no_unique_skills', 'No unique skills.'))}</div>`}</div>`;
    const unlockBtn = heroTreePanelEl.querySelector('[data-hero-unlock="1"]');
    unlockBtn?.addEventListener('click', async () => {
      try {
        await unlockHeroForAccount(hero.id);
        setHeroActionFeedback(trWithFallback('ui.hero.unlocked_msg', `${hero.name} unlocked.`, { hero: trHeroName(hero.id, hero.name) }), 'ok');
        selectedPlayerClass = hero.id;
        localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
        await selectHeroForAccount(hero.id);
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unlock hero.'), 'err');
      }
    });
    for (const btn of heroTreePanelEl.querySelectorAll('.hero-node-up')) {
      btn.addEventListener('click', async () => {
        const heroSkillId = btn.getAttribute('data-hero-skill-id') || '';
        const heroSkillAction = btn.getAttribute('data-hero-skill-action') || '';
        if (heroSkillId) {
          try {
            if (heroSkillAction === 'unlock') await unlockHeroSkillForAccount(hero.id, heroSkillId);
            else await upgradeHeroSkillForAccount(hero.id, heroSkillId);
            setHeroActionFeedback(`${hero.name}: ${heroSkillId} ${heroSkillAction === 'unlock' ? 'unlocked' : 'upgraded'}`, 'ok');
            renderCharacterPicker();
          } catch (err) {
            setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to update hero skill.'), 'err');
          }
          return;
        }
        const nodeId = btn.getAttribute('data-node-id') || '';
        if (!nodeId) return;
        try {
          await upgradeHeroNodeForAccount(hero.id, nodeId);
          setHeroActionFeedback(`Upgraded ${hero.name}: ${nodeId}`, 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade node.'), 'err');
        }
      });
    }
  }
  function renderHeroTreePanelV2(catalog, progression, hero, unlocked) {
    if (!heroTreePanelEl) return;
    if (!hero) {
      heroTreePanelEl.innerHTML = '';
      return;
    }
    const points = Math.max(0, Number(progression?.accountSkillPoints) || 0);
    const shards = Math.max(0, Number(progression?.shards) || 0);
    const salvage = Math.max(0, Number(progression?.salvage) || 0);
    const accountLevel = Math.max(1, Number(progression?.accountLevel) || 1);
    const needLevel = Math.max(1, Number(hero.unlockLevel) || 1);
    const needShardCost = Math.max(0, Number(hero.unlockShardCost ?? hero.unlockCost) || 0);
    const needCardId = String(hero.unlockCardId || '').trim();
    const needCards = Math.max(0, Number(hero.unlockCardNeed) || 0);
    const cardName = trWithFallback(`hero.${String(hero.id || '').toLowerCase()}.card`, String(hero.unlockCardName || hero.name || trWithFallback('ui.hero.card', 'Hero Card')));
    const haveCards = needCardId ? Math.max(0, Number(progression?.heroCards?.[needCardId]) || 0) : needCards;
    const accountLevelReq = heroRequirementMeta(needLevel, accountLevel, (need, have) => trWithFallback('ui.hero.need_have_level', 'Required level: {need} • You have: {have}', { need, have }));
    const shardsReq = heroRequirementMeta(needShardCost, shards, (need, have) => trWithFallback('ui.hero.need_have', 'Need: {need} • You have: {have}', { need, have }));
    const cardsReq = heroRequirementMeta(needCards, haveCards, (need, have) => trWithFallback('ui.hero.need_have_cards', '{card}: need {need} • you have {have}', { card: cardName, need, have }));
    const canUnlock = game.playerAuth?.player && !unlocked && accountLevelReq.enough && shardsReq.enough && cardsReq.enough;
    const tree = Array.isArray(catalog.trees?.[hero.id]) ? catalog.trees[hero.id] : [];
    const uniqueSkills = Array.isArray(hero.uniqueSkills) ? hero.uniqueSkills : [];
    const itemMap = getCatalogItemMap(catalog);
    const inventoryItems = Array.isArray(progression?.inventoryItems) ? progression.inventoryItems : [];
    const equippedItems = getHeroEquipmentItemMap(catalog, progression, hero.id);
    const heroLevels = progression?.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
    const heroXp = progression?.heroXp && typeof progression.heroXp === 'object' ? progression.heroXp : {};
    const heroXpToNext = progression?.heroXpToNext && typeof progression.heroXpToNext === 'object' ? progression.heroXpToNext : {};
    const heroLevelCap = Math.max(1, Number(catalog?.heroLevelCap) || 999);
    const heroLevel = Math.max(1, Number(heroLevels[hero.id]) || 1);
    const heroXpValue = Math.max(0, Number(heroXp[hero.id]) || 0);
    const heroXpNeed = Math.max(0, Number(heroXpToNext[hero.id]) || 0);
    const rows = [];
    for (const node of tree) {
      rows.push(renderHeroTalentNodeRow(hero, node, progression, points, unlocked));
    }
    const skillRows = uniqueSkills.map((skill) => renderHeroUniqueSkillRow(hero, skill, progression, shards, unlocked)).join('');
    const gearSlots = (Array.isArray(catalog.itemSlots) ? catalog.itemSlots : []).filter((slot) => slot?.kind === 'gear');
    const quickSlots = (Array.isArray(catalog.itemSlots) ? catalog.itemSlots : []).filter((slot) => slot?.kind === 'consumable');
    const heroAccent = String(hero?.accent || '').trim() || '#e11d2e';
    const loadoutSwapFx = getHeroLoadoutSwapFx(hero.id);
    const loadoutSwapClass = loadoutSwapFx.active ? ' is-loadout-enter' : '';
    let heroLoadoutSlotEnterIndex = 0;
    const renderEquipSlotCard = (slot, extraMeta = '') => {
      const item = equippedItems[slot.key] || null;
      const itemDef = item ? itemMap[item.itemId] : null;
      const iconMeta = itemDef
        ? getInventoryItemIconMeta(itemDef, getInventorySlotTargets(catalog, itemDef))
        : getInventoryItemIconMeta(
          {
            slotCategory: slot?.category,
            combatUse: slot?.kind === 'consumable',
          },
          [slot],
        );
      const itemName = itemDef ? getItemDisplayName(itemDef) : trWithFallback('ui.inventory.empty_slot', 'Пусто');
      const itemMeta = itemDef
        ? `${getItemRarityLabel(itemDef.rarity)} • Lv ${Math.max(1, Number(item.level) || 1)}${Math.max(1, Number(item.quantity) || 1) > 1 ? ` • x${Math.max(1, Number(item.quantity) || 1)}` : ''}`
        : (slot?.kind === 'consumable' ? '' : trWithFallback('ui.inventory.empty_slot_hint', 'Выберите предмет из инвентаря'));
      const itemStats = itemDef ? formatInventoryItemEffectText(itemDef, item) : '';
      const slotFx = getHeroEquipSlotFx(hero.id, slot.key);
      const loadoutSlotEnter = loadoutSwapFx.active && !slotFx.className;
      const slotEnterIndex = heroLoadoutSlotEnterIndex++;
      const slotFxColor = slotFx.color || (itemDef ? getInventoryRarityFxColor(itemDef.rarity) : (loadoutSlotEnter ? heroAccent : ''));
      const slotEnterClass = loadoutSlotEnter ? ' is-equip-flash is-loadout-enter-slot' : '';
      const slotClass = `hero-equip-slot ${item ? `filled rarity-${escapeHtml(String(itemDef?.rarity || 'common').toLowerCase())}` : 'empty'}${slotFx.className ? ` ${slotFx.className}` : ''}${slotEnterClass}`;
      const slotStyleVars = [];
      if (slotFxColor) slotStyleVars.push(`--skill-color:${escapeHtml(slotFxColor)}`);
      if (loadoutSlotEnter) slotStyleVars.push(`--slot-enter-index:${slotEnterIndex}`);
      const slotStyle = slotStyleVars.length ? ` style="${slotStyleVars.join(';')}"` : '';
      const openSlotLabel = `${trWithFallback('ui.inventory.equip_slot_title', 'Снарядить слот')}: ${getItemSlotLabel(slot)}`;
      const slotIconButton = `<button type="button" class="hero-equip-slot-icon-button" data-open-slot-equip="${escapeHtml(slot.key)}" title="${escapeHtml(openSlotLabel)}" aria-label="${escapeHtml(openSlotLabel)}">${renderInventoryItemIconHtml(iconMeta, 'hero-equip-slot-icon')}</button>`;
      const emptyAction = `<button type="button" class="hero-equip-action hero-equip-slot-empty-cta" data-open-slot-equip="${escapeHtml(slot.key)}">${escapeHtml(trWithFallback('ui.inventory.equip', 'Снарядить'))}</button>`;
      return `<div class="${slotClass}" data-slot-key="${escapeHtml(slot.key)}"${slotStyle}><div class="hero-equip-slot-layout"><div class="hero-equip-slot-side">${slotIconButton}${item ? `<button type="button" class="hero-equip-action" data-unequip-slot="${escapeHtml(slot.key)}">${escapeHtml(trWithFallback('ui.inventory.unequip', 'Снять'))}</button>` : emptyAction}</div><div class="hero-equip-slot-copy"><div class="hero-equip-slot-label">${escapeHtml(getItemSlotLabel(slot))}${extraMeta ? `<span class="hero-equip-slot-hotkey">${escapeHtml(extraMeta)}</span>` : ''}</div><div class="hero-equip-slot-name">${escapeHtml(itemName)}</div><div class="hero-equip-slot-meta">${escapeHtml(itemMeta)}</div>${itemStats ? `<div class="hero-equip-slot-stats">${escapeHtml(itemStats)}</div>` : ''}</div></div></div>`;
    };
    const gearSlotsByGroup = {
      core: gearSlots.filter((slot) => ['head', 'armor', 'legs'].includes(String(slot.key || ''))),
      hands: gearSlots.filter((slot) => ['left_hand', 'right_hand'].includes(String(slot.key || ''))),
      rings: gearSlots.filter((slot) => String(slot.category || '') === 'ring'),
    };
    const quickSlotsHtml = quickSlots.map((slot, index) => renderEquipSlotCard(slot, `[${index + 1}]`)).join('');
    const slotByKey = new Map([...gearSlots, ...quickSlots].map((slot) => [String(slot?.key || ''), slot]));
    const renderPaperSlot = (slotKey, areaClass, extraMeta = '') => {
      const slot = slotByKey.get(slotKey);
      return slot
        ? `<div class="hero-paper-slot ${areaClass}">${renderEquipSlotCard(slot, extraMeta)}</div>`
        : '';
    };
    const ringSlotsHtml = gearSlotsByGroup.rings
      .map((slot) => `<div class="hero-paper-slot hero-paper-ring">${renderEquipSlotCard(slot)}</div>`)
      .join('');
    const heroDisplayName = trHeroName(hero.id, hero.name);
    const heroTagline = trWithFallback(`hero.${String(hero.id || '').toLowerCase()}.tagline`, hero.tagline || '');
    const heroXpLabel = heroLevel >= heroLevelCap ? `Lv ${heroLevel}/${heroLevelCap} MAX` : `Lv ${heroLevel}/${heroLevelCap} | XP ${heroXpValue}/${heroXpNeed}`;
    const heroPaperDollHtml = `<div class="hero-paper-doll${loadoutSwapClass}" style="--hero-accent:${escapeHtml(heroAccent)}"><div class="hero-paper-doll-grid">${renderPaperSlot('head', 'hero-paper-head')}${renderPaperSlot('left_hand', 'hero-paper-left-hand')}<div class="hero-paper-portrait${loadoutSwapClass}"><div class="hero-paper-portrait-ring"></div><img class="hero-loadout-portrait" src="${escapeHtml(getHeroCardImagePath(hero.id))}" alt="${escapeHtml(heroDisplayName)}" /><div class="hero-paper-portrait-name"><b>${escapeHtml(heroDisplayName)}</b><span>${escapeHtml(heroXpLabel)}</span></div></div>${renderPaperSlot('right_hand', 'hero-paper-right-hand')}${renderPaperSlot('armor', 'hero-paper-armor')}${renderPaperSlot('legs', 'hero-paper-legs')}<div class="hero-paper-rings">${ringSlotsHtml}</div></div></div>`;
    const quickBeltHtml = quickSlots.length
      ? `<div class="hero-quick-belt${loadoutSwapClass}"><div class="hero-slot-group-title">${escapeHtml(trWithFallback('ui.inventory.quick_slots', 'Combat consumables'))}</div><div class="hero-quick-belt-grid">${quickSlotsHtml}</div></div>`
      : '';
    const inventoryGroupOrder = [
      ['consumable', trWithFallback('ui.inventory.group_consumables', 'Расходники')],
      ['armor', trWithFallback('ui.inventory.group_armor', 'Броня')],
      ['hands', trWithFallback('ui.inventory.group_hands', 'Руки и оружие')],
      ['rings', trWithFallback('ui.inventory.group_rings', 'Кольца')],
      ['other', trWithFallback('ui.inventory.group_other', 'Прочее')],
    ];
    const inventoryFilterOptions = [
      ['all', trWithFallback('ui.inventory.filter_all', 'Все')],
      ['consumable', trWithFallback('ui.inventory.group_consumables', 'Расходники')],
      ['head', trWithFallback('ui.inventory.filter_head', 'Шапка')],
      ['weapon', trWithFallback('ui.inventory.filter_weapon', 'Оружие')],
      ['armor', trWithFallback('ui.inventory.filter_armor', 'Броня')],
      ['legs', trWithFallback('ui.inventory.filter_legs', 'Штаны')],
      ['ring', trWithFallback('ui.inventory.filter_ring', 'Кольца')],
      ['other', trWithFallback('ui.inventory.group_other', 'Прочее')],
    ];
    const getInventoryGroupKey = (itemDef, equipTargets) => {
      if (itemDef?.combatUse) return 'consumable';
      const slotCategory = String(itemDef?.slotCategory || '').trim().toLowerCase();
      if (['head', 'armor', 'legs'].includes(slotCategory)) return 'armor';
      if (slotCategory === 'ring') return 'rings';
      if (equipTargets.some((slot) => ['left_hand', 'right_hand'].includes(String(slot?.key || '').trim().toLowerCase()))) return 'hands';
      return 'other';
    };
    const inventoryCardsByGroup = new Map(inventoryGroupOrder.map(([key]) => [key, []]));
    const inventoryEntries = [];
    for (const item of inventoryItems) {
      const itemDef = itemMap[item.itemId] || {};
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const equipTargets = getInventorySlotTargets(catalog, itemDef);
      const iconMeta = getInventoryItemIconMeta(itemDef, equipTargets);
      const equippedIn = Object.keys(equippedItems).filter((slotKey) => equippedItems[slotKey]?.uid === item.uid);
      const upgradeCost = Math.max(0, Number(item.upgradeCost) || 0);
      const canUpgradeItem = !itemDef.combatUse && Math.max(1, Number(item.level) || 1) < 10 && salvage >= upgradeCost;
      const upgradeLabel = trWithFallback('ui.inventory.action_upgrade', 'Upgrade');
      const sellLabel = trWithFallback('ui.inventory.action_sell', 'Sell');
      const upgradeCostLabel = trWithFallback('ui.inventory.action_cost', '{action} • {cost}', { action: upgradeLabel, cost: upgradeCost });
      const sellCostLabel = trWithFallback('ui.inventory.action_cost', '{action} • {cost}', { action: sellLabel, cost: Math.max(0, Number(item.sellValue) || 0) });
      const equipButtons = equipTargets.map((slot, slotIndex) => `<button type="button" class="inventory-mini-btn inventory-text-action${equippedIn.includes(slot.key) ? ' active' : ''}" data-item-equip="${escapeHtml(item.uid)}" data-slot-key="${escapeHtml(slot.key)}" title="${escapeHtml(`${trWithFallback('ui.inventory.equip_to_slot', 'Снарядить в слот')}: ${getItemSlotLabel(slot)}`)}" aria-label="${escapeHtml(`${trWithFallback('ui.inventory.equip_to_slot', 'Снарядить в слот')}: ${getItemSlotLabel(slot)}`)}">${escapeHtml(`${trWithFallback('ui.inventory.slot_short', 'Slot')} ${slotIndex + 1}`)}</button>`).join('');
      const categoryLabel = getItemCategoryLabel(itemDef.slotCategory);
      const equippedMeta = equippedIn.length
        ? `<div class="inventory-item-chip inventory-item-chip-eq">${escapeHtml(equippedIn.map((slotKey) => getItemSlotLabel((catalog.itemSlots || []).find((slot) => slot.key === slotKey) || { key: slotKey })).join(', '))}</div>`
        : '';
      const itemStats = formatInventoryItemEffectText(itemDef, item);
      const actionButtonsHtml = `${equipButtons || ''}${!itemDef.combatUse ? `<button type="button" class="inventory-mini-btn inventory-text-action upgrade${canUpgradeItem ? '' : ' disabled-like'}" data-item-upgrade="${escapeHtml(item.uid)}" title="${escapeHtml(upgradeCostLabel)}" aria-label="${escapeHtml(upgradeCostLabel)}">${escapeHtml(upgradeLabel)}</button>` : ''}<button type="button" class="inventory-mini-btn inventory-text-action danger" data-item-sell="${escapeHtml(item.uid)}" title="${escapeHtml(sellCostLabel)}" aria-label="${escapeHtml(sellCostLabel)}">${escapeHtml(sellLabel)}</button>`;
      const cardHtml = `<div class="inventory-item-card inventory-item-card-compact rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="inventory-item-layout">${renderInventoryItemIconHtml(iconMeta)}<div class="inventory-item-main"><div class="inventory-item-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="inventory-item-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} • ${escapeHtml(categoryLabel)}</div><div class="inventory-item-chip-row"><div class="inventory-item-chip">Lv ${Math.max(1, Number(item.level) || 1)}</div>${quantity > 1 ? `<div class="inventory-item-chip">x${quantity}</div>` : ''}<div class="inventory-item-chip">${escapeHtml(trWithFallback('ui.inventory.sell_value_short', 'Продажа'))}: ${Math.max(0, Number(item.sellValue) || 0)}</div>${equippedMeta}</div>${itemStats ? `<div class="inventory-item-stats">${escapeHtml(itemStats)}</div>` : ''}${itemDef.combatUse ? `<div class="inventory-item-consumable">${escapeHtml(trWithFallback('ui.inventory.consumable_hint_keys', 'Клавиши 1/2/3 в бою'))}</div>` : ''}</div><div class="inventory-item-actions-compact">${actionButtonsHtml}</div></div></div>`;
      const groupKey = getInventoryGroupKey(itemDef, equipTargets);
      inventoryCardsByGroup.get(groupKey)?.push(cardHtml);
      const slotCategory = String(itemDef?.slotCategory || '').trim().toLowerCase();
      const filterTags = new Set(['all']);
      if (itemDef?.combatUse || equipTargets.some((slot) => String(slot?.kind || '').trim().toLowerCase() === 'consumable')) {
        filterTags.add('consumable');
      }
      if (slotCategory === 'head') filterTags.add('head');
      if (slotCategory === 'armor') filterTags.add('armor');
      if (slotCategory === 'legs') filterTags.add('legs');
      if (slotCategory === 'ring') filterTags.add('ring');
      if (equipTargets.some((slot) => ['left_hand', 'right_hand'].includes(String(slot?.key || '').trim().toLowerCase()))) {
        filterTags.add('weapon');
      }
      if (!itemDef?.combatUse && !filterTags.has('head') && !filterTags.has('armor') && !filterTags.has('legs') && !filterTags.has('ring') && !filterTags.has('weapon')) {
        filterTags.add('other');
      }
      inventoryEntries.push({ cardHtml, filterTags });
    }
    const inventoryFilterTabsHtml = `<div class="inventory-filter-tabs">${inventoryFilterOptions.map(([key, label]) => `<button type="button" class="inventory-filter-tab${selectedInventoryFilterKey === key ? ' active' : ''}" data-inventory-filter="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join('')}</div>`;
    const inventorySectionsHtml = selectedInventoryFilterKey === 'all'
      ? inventoryGroupOrder.map(([key, title]) => {
        const cards = inventoryCardsByGroup.get(key) || [];
        if (!cards.length) return '';
        return `<div class="inventory-category-group"><div class="inventory-category-title">${escapeHtml(title)}</div><div class="inventory-category-grid">${cards.join('')}</div></div>`;
      }).join('')
      : (() => {
        const filteredCards = inventoryEntries.filter((entry) => entry.filterTags.has(selectedInventoryFilterKey)).map((entry) => entry.cardHtml);
        return filteredCards.length
          ? `<div class="inventory-category-grid">${filteredCards.join('')}</div>`
          : `<div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.filter_empty', 'В этой категории пока нет предметов.'))}</div>`;
      })();
    const inventoryRows = inventoryItems
      .slice()
      .sort((a, b) => {
        const itemDefA = itemMap[a.itemId] || {};
        const itemDefB = itemMap[b.itemId] || {};
        const aEquipped = Object.values(equippedItems).some((entry) => entry?.uid === a.uid) ? 1 : 0;
        const bEquipped = Object.values(equippedItems).some((entry) => entry?.uid === b.uid) ? 1 : 0;
        return (bEquipped - aEquipped)
          || String(itemDefA.slotCategory || '').localeCompare(String(itemDefB.slotCategory || ''))
          || (getItemRaritySortWeight(itemDefB.rarity) - getItemRaritySortWeight(itemDefA.rarity))
          || String(getItemDisplayName(itemDefA)).localeCompare(String(getItemDisplayName(itemDefB)));
      })
      .map((item) => {
      const itemDef = itemMap[item.itemId] || {};
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const equipTargets = getInventorySlotTargets(catalog, itemDef);
      const equippedIn = Object.keys(equippedItems).filter((slotKey) => equippedItems[slotKey]?.uid === item.uid);
      const upgradeCost = Math.max(0, Number(item.upgradeCost) || 0);
      const canUpgradeItem = !itemDef.combatUse && Math.max(1, Number(item.level) || 1) < 10 && salvage >= upgradeCost;
      const equipButtons = equipTargets.map((slot) => `<button type="button" class="inventory-mini-btn${equippedIn.includes(slot.key) ? ' active' : ''}" data-item-equip="${escapeHtml(item.uid)}" data-slot-key="${escapeHtml(slot.key)}">${escapeHtml(getItemSlotLabel(slot))}</button>`).join('');
      const categoryLabel = getItemCategoryLabel(itemDef.slotCategory);
      return `<div class="inventory-item-card rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="inventory-item-head"><div><div class="inventory-item-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="inventory-item-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} • ${escapeHtml(categoryLabel)} • Lv ${Math.max(1, Number(item.level) || 1)}${quantity > 1 ? ` • x${quantity}` : ''}${equippedIn.length ? ` • ${escapeHtml(trWithFallback('ui.inventory.equipped_in', 'Equipped'))}: ${escapeHtml(equippedIn.map((slotKey) => getItemSlotLabel((catalog.itemSlots || []).find((slot) => slot.key === slotKey) || { key: slotKey })).join(', '))}` : ''}</div></div><div class="inventory-item-values">${escapeHtml(trWithFallback('ui.inventory.sell_value_short', 'Sell'))}: ${Math.max(0, Number(item.sellValue) || 0)}</div></div>${equipButtons ? `<div class="inventory-item-actions-line">${equipButtons}</div>` : ''}<div class="inventory-item-actions-line">${!itemDef.combatUse ? `<button type="button" class="inventory-mini-btn${canUpgradeItem ? '' : ' disabled-like'}" data-item-upgrade="${escapeHtml(item.uid)}">${escapeHtml(trWithFallback('ui.inventory.upgrade_cost_have', 'Upgrade: {cost} salvage • You have: {have}', { cost: upgradeCost, have: salvage }))}</button>` : `<span class="inventory-item-consumable">${escapeHtml(trWithFallback('ui.inventory.consumable_hint_keys', 'Keys 1/2/3 in battle'))}</span>`}<button type="button" class="inventory-mini-btn danger" data-item-sell="${escapeHtml(item.uid)}">${escapeHtml(trWithFallback('ui.inventory.sell_for', 'Sell for {value}', { value: Math.max(0, Number(item.sellValue) || 0) }))}</button></div></div>`;
    }).join('');
    const unlockMeta = !unlocked
      ? `<div class="hero-lock-meta"><span class="hero-req ${accountLevelReq.enough ? 'ok' : 'lack'}">${escapeHtml(accountLevelReq.text)}</span><span class="hero-req ${cardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(cardsReq.text)}</span><span class="hero-req ${shardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(shardsReq.text)}</span></div>`
      : '<div class="hero-lock-meta unlocked">' + trWithFallback('ui.hero.unlocked', 'Unlocked') + '</div>';
    const actionBtn = !game.playerAuth?.player
      ? '<button type="button" class="hero-main-action" disabled>' + trWithFallback('ui.auth.login_required_unlock', 'Login to unlock/progress') + '</button>'
      : (!unlocked
        ? `<button type="button" class="hero-main-action" data-hero-unlock="1" ${canUnlock ? '' : 'disabled'}>${trWithFallback('ui.hero.unlock_btn', 'Unlock hero')}</button>`
        : '');
    const heroProfileHtml = renderHeroProfileCard(catalog, progression, hero, {
      unlocked,
      heroDisplayName,
      heroTagline,
      heroAccent,
      heroLevel,
      heroLevelCap,
      heroXpValue,
      heroXpNeed,
      gearSlots,
      equippedItems,
      itemMap,
      unlockMeta,
      actionBtn,
      extraClass: loadoutSwapClass.trim(),
      panelEnterIndex: 0,
    });
    heroTreePanelEl.innerHTML = `<div class="hero-loadout-shell">${heroProfileHtml}<div class="hero-loadout-layout"><div class="hero-loadout-card hero-loadout-stage${loadoutSwapClass}" style="--panel-enter-delay:210ms"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.inventory.equipment', 'Equipment'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.equipment_hint', 'Equipment slots surround the hero. Inventory and combat consumables are below.'))}</div></div><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.salvage', 'Salvage'))}: ${salvage}</div></div><div class="hero-paper-loadout${loadoutSwapClass}">${heroPaperDollHtml}${quickBeltHtml}<div class="hero-inventory-panel${loadoutSwapClass}"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.inventory.items', 'Inventory'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.items_hint', 'Pick items, equip them into slots, upgrade or sell them right here.'))}</div></div><div class="hero-tagline">${inventoryItems.length}</div></div>${inventoryFilterTabsHtml}<div class="inventory-category-list">${inventorySectionsHtml || `<div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.empty', 'Inventory is empty.'))}</div>`}</div></div></div></div><div class="hero-loadout-card hero-talents-card${loadoutSwapClass}" style="--panel-enter-delay:70ms"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.hero.talent_tree', 'Hero talents'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.talent_tree_hint', 'Passive account upgrades for the selected hero.'))}</div></div></div><div class="hero-tree-list">${rows.join('')}</div></div><div class="hero-loadout-card hero-unique-skills-card${loadoutSwapClass}" style="--panel-enter-delay:140ms"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.hero.unique_skills', 'Unique skills'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.unique_skills_hint', 'Active skills and passive effects for the selected hero.'))}</div></div></div><div class="hero-tree-list">${skillRows || `<div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.no_unique_skills', 'No unique skills.'))}</div>`}</div></div></div>`;
    const unlockBtn = heroTreePanelEl.querySelector('[data-hero-unlock="1"]');
    unlockBtn?.addEventListener('click', async () => {
      try {
        await unlockHeroForAccount(hero.id);
        setHeroActionFeedback(trWithFallback('ui.hero.unlocked_msg', `${hero.name} unlocked.`, { hero: trHeroName(hero.id, hero.name) }), 'ok');
        selectedPlayerClass = hero.id;
        localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
        await selectHeroForAccount(hero.id);
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unlock hero.'), 'err');
      }
    });
    for (const btn of heroTreePanelEl.querySelectorAll('.hero-node-up')) {
      btn.addEventListener('click', async () => {
        const heroSkillId = btn.getAttribute('data-hero-skill-id') || '';
        const heroSkillAction = btn.getAttribute('data-hero-skill-action') || '';
        if (heroSkillId) {
          try {
            if (heroSkillAction === 'unlock') await unlockHeroSkillForAccount(hero.id, heroSkillId);
            else await upgradeHeroSkillForAccount(hero.id, heroSkillId);
            setHeroActionFeedback(`${hero.name}: ${heroSkillId} ${heroSkillAction === 'unlock' ? 'unlocked' : 'upgraded'}`, 'ok');
            renderCharacterPicker();
          } catch (err) {
            setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to update hero skill.'), 'err');
          }
          return;
        }
        const nodeId = btn.getAttribute('data-node-id') || '';
        if (!nodeId) return;
        try {
          await upgradeHeroNodeForAccount(hero.id, nodeId);
          setHeroActionFeedback(`Upgraded ${hero.name}: ${nodeId}`, 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade node.'), 'err');
        }
      });
    }
    for (const btn of heroTreePanelEl.querySelectorAll('[data-open-slot-equip]')) {
      btn.addEventListener('click', () => {
        globalThis.CWHeroEquipModal?.open?.(hero, btn.getAttribute('data-open-slot-equip') || '');
      });
    }
    for (const btn of heroTreePanelEl.querySelectorAll('[data-unequip-slot]')) {
      btn.addEventListener('click', async () => {
        try {
          await unequipItemForAccount(hero.id, btn.getAttribute('data-unequip-slot') || '');
          setHeroActionFeedback(trWithFallback('ui.inventory.unequipped', 'Предмет снят.'), 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unequip item.'), 'err');
        }
      });
    }
    for (const btn of heroTreePanelEl.querySelectorAll('[data-item-equip]')) {
      btn.addEventListener('click', async () => {
        try {
          await equipItemForAccount(hero.id, btn.getAttribute('data-item-equip') || '', btn.getAttribute('data-slot-key') || '');
          setHeroActionFeedback(trWithFallback('ui.inventory.equipped', 'Предмет экипирован.'), 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to equip item.'), 'err');
        }
      });
    }
    for (const btn of heroTreePanelEl.querySelectorAll('[data-item-sell]')) {
      btn.addEventListener('click', async () => {
        try {
          const inventoryScrollState = captureHeroInventoryScrollState();
          await sellInventoryItemForAccount(btn.getAttribute('data-item-sell') || '');
          setHeroActionFeedback(trWithFallback('ui.inventory.sold', 'Предмет продан.'), 'ok');
          renderCharacterPicker();
          restoreHeroInventoryScrollState(inventoryScrollState);
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to sell item.'), 'err');
        }
      });
    }
    for (const btn of heroTreePanelEl.querySelectorAll('[data-item-upgrade]')) {
      btn.addEventListener('click', async () => {
        try {
          await upgradeInventoryItemForAccount(btn.getAttribute('data-item-upgrade') || '');
          setHeroActionFeedback(trWithFallback('ui.inventory.upgraded', 'Предмет улучшен.'), 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade item.'), 'err');
        }
      });
    }
  }
  function renderCharacterPicker() {
    if (!characterSelectEl) return;
    const catalog = getProgressionCatalog();
    const progression = getProgressionState();
    const unlockedHeroes = getUnlockedHeroSet(catalog, progression);
    const heroes = catalog.heroes.map((hero) => ({ ...getPlayerVariant(hero.id), ...hero }));
    selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);
    if (!unlockedHeroes.has(selectedPlayerClass)) {
      selectedPlayerClass = progression?.activeHero && unlockedHeroes.has(progression.activeHero)
        ? progression.activeHero
        : (catalog.baseHeroId || 'cyber');
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
    }
    if (!heroFocusId || !heroes.some((hero) => hero.id === heroFocusId)) {
      heroFocusId = selectedPlayerClass;
    }
    characterSelectEl.innerHTML = '';
    if (heroGalleryV2El) heroGalleryV2El.innerHTML = '';
    const focusedHero = heroes.find((hero) => hero.id === heroFocusId) || heroes[0] || null;
    const focusedHeroId = String(focusedHero?.id || '');
    if (focusedHeroId && focusedHeroId !== lastHeroLoadoutRenderId) {
      markHeroLoadoutSwapFx(focusedHeroId, focusedHero?.accent || '#38bdf8');
    }
    lastHeroLoadoutRenderId = focusedHeroId;
    renderHeroRoster(heroes, progression, unlockedHeroes);
    globalThis.CWProfile?.render?.(heroes, progression, unlockedHeroes);
    renderAccountSummary(catalog, progression);
    renderHeroTreePanelV2(catalog, progression, focusedHero, focusedHero ? unlockedHeroes.has(focusedHero.id) : false);
    if (focusedHero) splitHeroPanelsBetweenMenus(focusedHero);
    globalThis.renderBattleHubPlayerBadge?.();
    globalThis.CWPageLoader?.mark?.('characters', 'Hero dossier assembled');
    globalThis.CWPageLoader?.requestReady?.();
  }
  function buildHeroUnlockHint(hero, progression) {
    const needLevel = Math.max(1, Number(hero.unlockLevel) || 1);
    const needShardCost = Math.max(0, Number(hero.unlockShardCost ?? hero.unlockCost) || 0);
    const cardId = String(hero.unlockCardId || '').trim();
    const cardNeed = Math.max(0, Number(hero.unlockCardNeed) || 0);
    const haveCards = cardId ? Math.max(0, Number(progression?.heroCards?.[cardId]) || 0) : cardNeed;
    if (cardNeed > 0) return `Lv${needLevel} | ${trWithFallback('ui.hero.cores', 'Cores')} ${haveCards}/${cardNeed} | ${needShardCost} ${trWithFallback('ui.profile.shards', 'Shards').toLowerCase()}`;
    return `Lv${needLevel} | ${needShardCost} ${trWithFallback('ui.profile.shards', 'Shards').toLowerCase()}`;
  }
  function getHeroCardImagePath(heroId) {
    const id = String(heroId || '').trim().toLowerCase();
    if (!id) return '/assets/characters/cyber.jpg';
    if (id === 'medic') return '/assets/characters/medis.jpg';
    return `/assets/characters/${id}.jpg`;
  }
  function getHeroRosterMode() {
    try {
      return String(localStorage.getItem(HERO_ROSTER_MODE_STORAGE_KEY) || '').trim().toLowerCase() === 'classic'
        ? 'classic'
        : 'arena';
    } catch (_) {
      return 'arena';
    }
  }
  function setHeroRosterMode(mode = 'arena') {
    const nextMode = String(mode || '').trim().toLowerCase() === 'classic' ? 'classic' : 'arena';
    try {
      localStorage.setItem(HERO_ROSTER_MODE_STORAGE_KEY, nextMode);
    } catch (_) {}
    renderCharacterPicker();
    return nextMode;
  }
  async function pickHeroFromRoster(hero, unlocked) {
    if (!hero) return;
    heroFocusId = hero.id;
    if (!unlocked) {
      renderCharacterPicker();
      return;
    }
    const changingActiveHero = hero.id !== selectedPlayerClass;
    if (changingActiveHero) {
      const previousHero = (Array.isArray(getProgressionCatalog()?.heroes) ? getProgressionCatalog().heroes : [])
        .find((entry) => String(entry?.id || '') === String(selectedPlayerClass || ''));
      markHeroRosterDeselectFx(selectedPlayerClass, previousHero?.accent || '#38bdf8');
    }
    const swapStarted = changingActiveHero ? await beginBattleHubHeroSwap(hero.id) : false;
    selectedPlayerClass = hero.id;
    localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
    renderCharacterPicker();
    endBattleHubHeroSwap(swapStarted);
    if (game.playerAuth?.player) {
      try {
        await selectHeroForAccount(hero.id);
        setHeroActionFeedback(trWithFallback('ui.hero.selected', `${hero.name} selected.`, { hero: trHeroName(hero.id, hero.name) }), 'ok');
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to select hero.'), 'err');
      }
    }
  }
  function renderHeroRoster(heroes, progression, unlockedHeroes) {
    if (getHeroRosterMode() === 'classic') {
      renderHeroGalleryV2(heroes, progression, unlockedHeroes);
      return;
    }
    renderHeroArenaRoster(heroes, progression, unlockedHeroes);
  }
  function renderHeroArenaRoster(heroes, progression, unlockedHeroes) {
    if (!heroGalleryV2El) return;
    heroGalleryV2El.className = 'hero-gallery-v2 hero-arena-roster';
    heroGalleryV2El.innerHTML = '';
    const heroLevels = progression?.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
    const focusedHero = heroes.find((hero) => hero.id === heroFocusId) || heroes[0] || null;
    const activeHero = heroes.find((hero) => hero.id === selectedPlayerClass) || focusedHero;
    const selectedHero = focusedHero || activeHero || null;
    const unlockedCount = heroes.reduce((sum, hero) => sum + (unlockedHeroes.has(hero.id) ? 1 : 0), 0);
    const accent = String(focusedHero?.accent || activeHero?.accent || '#38bdf8');
    const shell = document.createElement('div');
    shell.className = 'hero-arena-roster-shell';
    shell.style.setProperty('--arena-accent', accent);

    const head = document.createElement('div');
    head.className = 'hero-arena-roster-head';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.textContent = getInventoryUiText('\u0420\u043e\u0441\u0442\u0435\u0440', 'Roster');
    const title = document.createElement('strong');
    title.textContent = getInventoryUiText('\u041f\u0435\u0440\u0441\u043e\u043d\u0430\u0436\u0438 \u0430\u0440\u0435\u043d\u044b', 'Arena fighters');
    titleWrap.appendChild(kicker);
    titleWrap.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'hero-arena-roster-meta';
    const activeName = trHeroName(activeHero?.id, activeHero?.name || activeHero?.id || '');
    const activeLevel = Math.max(1, Number(heroLevels[activeHero?.id]) || 1);
    meta.innerHTML = `<b>${escapeHtml(activeName)} LV ${activeLevel}</b><span>${unlockedCount}/${heroes.length} ${escapeHtml(trWithFallback('ui.hero.unlocked', 'Unlocked').toLowerCase())}</span>`;
    head.appendChild(titleWrap);
    head.appendChild(meta);

    let spotlight = null;
    if (selectedHero) {
      const selectedHeroFx = getHeroLoadoutSwapFx(selectedHero.id);
      const selectedHeroName = trHeroName(selectedHero.id, selectedHero.name || selectedHero.id || '');
      const selectedHeroLevel = Math.max(1, Number(heroLevels[selectedHero.id]) || 1);
      const selectedHeroUnlocked = unlockedHeroes.has(selectedHero.id);
      const selectedHeroIsActive = selectedHero.id === selectedPlayerClass;
      const selectedHeroState = selectedHeroUnlocked
        ? (selectedHeroIsActive ? trWithFallback('ui.hero.selected_short', 'Selected') : trWithFallback('ui.hero.unlocked', 'Unlocked'))
        : trWithFallback('ui.hero.locked', 'Locked');
      const selectedHeroKicker = selectedHeroIsActive
        ? getInventoryUiText('\u0421\u0435\u0439\u0447\u0430\u0441 \u0432\u044b\u0431\u0440\u0430\u043d', 'Selected now')
        : getInventoryUiText('\u0412 \u0444\u043e\u043a\u0443\u0441\u0435', 'In focus');
      spotlight = document.createElement('div');
      spotlight.className = `hero-arena-selected-hero${selectedHeroFx.active ? ' is-name-reveal' : ''}`;
      spotlight.style.setProperty('--name-accent', selectedHeroFx.color || selectedHero.accent || accent);
      spotlight.setAttribute('aria-live', 'polite');

      const lineStart = document.createElement('span');
      lineStart.className = 'hero-arena-selected-line';
      lineStart.setAttribute('aria-hidden', 'true');
      const lineEnd = document.createElement('span');
      lineEnd.className = 'hero-arena-selected-line';
      lineEnd.setAttribute('aria-hidden', 'true');

      const copy = document.createElement('span');
      copy.className = 'hero-arena-selected-copy';
      const kickerEl = document.createElement('span');
      kickerEl.className = 'hero-arena-selected-kicker';
      kickerEl.textContent = selectedHeroKicker;
      const titleEl = document.createElement('strong');
      titleEl.className = 'hero-arena-selected-title';
      titleEl.textContent = selectedHeroName;
      titleEl.setAttribute('data-text', selectedHeroName);
      const subEl = document.createElement('span');
      subEl.className = 'hero-arena-selected-sub';
      subEl.textContent = `LV ${selectedHeroLevel} | ${selectedHeroState}`;

      copy.appendChild(kickerEl);
      copy.appendChild(titleEl);
      copy.appendChild(subEl);
      spotlight.appendChild(lineStart);
      spotlight.appendChild(copy);
      spotlight.appendChild(lineEnd);
    }

    const grid = document.createElement('div');
    grid.className = 'hero-arena-roster-grid';
    heroes.forEach((hero, index) => {
      const unlocked = unlockedHeroes.has(hero.id);
      const focused = hero.id === heroFocusId;
      const active = hero.id === selectedPlayerClass;
      const heroLevel = Math.max(1, Number(heroLevels[hero.id]) || 1);
      const rosterCardFx = focused ? getHeroLoadoutSwapFx(hero.id) : { active: false };
      const rosterDeselectFx = !active ? getHeroRosterDeselectFx(hero.id) : { active: false, color: '' };
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = [
        'hero-arena-slot',
        active ? 'active' : '',
        focused ? 'focused' : '',
        unlocked ? 'unlocked' : 'locked',
        rosterCardFx.active ? 'is-roster-select-flash' : '',
        rosterDeselectFx.active ? 'is-roster-deselect-flash' : '',
      ].filter(Boolean).join(' ');
      slot.style.setProperty('--accent', rosterDeselectFx.color || hero.accent || '#38bdf8');
      slot.style.setProperty('--slot-index', index);
      slot.setAttribute('aria-label', trWithFallback('ui.hero.aria', `Hero ${hero.name}`, { hero: trHeroName(hero.id, hero.name) }));

      const portraitWrap = document.createElement('span');
      portraitWrap.className = 'hero-arena-slot-portrait';
      const portrait = document.createElement('img');
      portrait.src = getHeroCardImagePath(hero.id);
      portrait.alt = '';
      portrait.loading = 'lazy';
      const preview = document.createElement('canvas');
      preview.width = 100;
      preview.height = 108;
      preview.className = 'hero-arena-slot-preview hidden';
      drawCharacterPreview(preview, hero);
      portrait.addEventListener('error', () => {
        portrait.classList.add('hidden');
        preview.classList.remove('hidden');
      }, { once: true });
      portraitWrap.appendChild(portrait);
      portraitWrap.appendChild(preview);

      const badge = document.createElement('span');
      badge.className = 'hero-arena-slot-badge';
      badge.textContent = String(index + 1).padStart(2, '0');

      const name = document.createElement('span');
      name.className = 'hero-arena-slot-name';
      name.innerHTML = `<b>${escapeHtml(trHeroName(hero.id, hero.name))}</b><small>LV ${heroLevel}</small>`;

      const status = document.createElement('span');
      status.className = 'hero-arena-slot-status';
      status.textContent = unlocked
        ? (active ? trWithFallback('ui.hero.selected_short', 'Selected') : trWithFallback('ui.hero.unlocked', 'Unlocked'))
        : buildHeroUnlockHint(hero, progression);

      slot.appendChild(portraitWrap);
      slot.appendChild(badge);
      slot.appendChild(name);
      slot.appendChild(status);
      slot.addEventListener('click', () => {
        pickHeroFromRoster(hero, unlocked);
      });
      grid.appendChild(slot);
    });

    shell.appendChild(head);
    if (spotlight) shell.appendChild(spotlight);
    shell.appendChild(grid);
    heroGalleryV2El.appendChild(shell);
  }
  function renderHeroGalleryV2(heroes, progression, unlockedHeroes) {
    if (!heroGalleryV2El) return;
    heroGalleryV2El.className = 'hero-gallery-v2 hero-roster-classic';
    heroGalleryV2El.innerHTML = '';
    const heroLevels = progression?.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
    for (const hero of heroes) {
      const unlocked = unlockedHeroes.has(hero.id);
      const focused = hero.id === heroFocusId;
      const active = hero.id === selectedPlayerClass;
      const rosterCardFx = focused ? getHeroLoadoutSwapFx(hero.id) : { active: false };
      const rosterDeselectFx = !active ? getHeroRosterDeselectFx(hero.id) : { active: false, color: '' };
      const cardBtn = document.createElement('button');
      cardBtn.type = 'button';
      cardBtn.className = `hero-v2-card${active ? ' active' : ''}${focused ? ' focused' : ''}${rosterCardFx.active ? ' is-roster-select-flash' : ''}${rosterDeselectFx.active ? ' is-roster-deselect-flash' : ''}${unlocked ? '' : ' locked'}`;
      cardBtn.style.setProperty('--accent', rosterDeselectFx.color || hero.accent || '#38bdf8');
      cardBtn.setAttribute('aria-label', trWithFallback('ui.hero.aria', `Hero ${hero.name}`, { hero: trHeroName(hero.id, hero.name) }));
      const inner = document.createElement('div');
      inner.className = 'hero-v2-inner';
      const portrait = document.createElement('img');
      portrait.className = 'hero-v2-portrait';
      portrait.src = getHeroCardImagePath(hero.id);
      portrait.alt = hero.name;
      const preview = document.createElement('canvas');
      preview.width = 100;
      preview.height = 108;
      preview.className = 'hero-v2-preview hidden';
      drawCharacterPreview(preview, hero);
      portrait.addEventListener('error', () => {
        portrait.classList.add('hidden');
        preview.classList.remove('hidden');
      }, { once: true });
      inner.appendChild(portrait);
      inner.appendChild(preview);
      if (!unlocked) {
        const lockBadge = document.createElement('img');
        lockBadge.className = 'hero-v2-lock';
        lockBadge.src = '/assets/ui/lock-overlay.svg';
        lockBadge.alt = trWithFallback('ui.hero.locked', 'Locked');
        inner.appendChild(lockBadge);
      }
      cardBtn.appendChild(inner);
      const name = document.createElement('div');
      name.className = 'hero-v2-name';
      const heroLevel = Math.max(1, Number(heroLevels[hero.id]) || 1);
      name.textContent = `${trHeroName(hero.id, hero.name)} [${heroLevel}]`;
      const status = document.createElement('div');
      status.className = `hero-v2-status ${active ? 'selected' : (unlocked ? 'unlocked' : 'locked')}`;
      status.textContent = unlocked ? (active ? trWithFallback('ui.hero.selected_short', 'Selected') : trWithFallback('ui.hero.unlocked', 'Unlocked')) : buildHeroUnlockHint(hero, progression);
      cardBtn.addEventListener('click', () => {
        pickHeroFromRoster(hero, unlocked);
      });
      const wrap = document.createElement('div');
      wrap.className = 'hero-v2-item';
      wrap.style.setProperty('--accent', hero.accent || '#38bdf8');
      wrap.appendChild(cardBtn);
      wrap.appendChild(name);
      wrap.appendChild(status);
      heroGalleryV2El.appendChild(wrap);
    }
  }

  const api = {
    render: renderCharacterPicker,
    getPlayerVariant,
    sanitizePlayerClass,
    getProgressionCatalog,
    getProgressionState,
    getUnlockedHeroSet,
    setHeroActionFeedback,
    humanizeHeroApiError,
    selectHeroForAccount,
    unlockHeroForAccount,
    upgradeHeroNodeForAccount,
    unlockHeroSkillForAccount,
    upgradeHeroSkillForAccount,
    equipItemForAccount,
    unequipItemForAccount,
    sellInventoryItemForAccount,
    upgradeInventoryItemForAccount,
    useQuickItemInRun,
    getCatalogItemMap,
    getItemDisplayName,
    getItemRarityLabel,
    getItemSlotLabel,
    getItemCategoryLabel,
    formatInventoryItemEffectText,
    getInventoryItemIconMeta,
    renderInventoryItemIconHtml,
    getItemRaritySortWeight,
    getInventorySlotTargets,
    getHeroEquipmentItemMap,
    getHeroPreviewImage,
    drawCharacterPreview,
    renderAccountSummary,
    getNodeLevel,
    getHeroSkillLevel,
    heroRequirementMeta,
    bindHeroUnlockButton,
    bindHeroProgressionButtons,
    bindHeroInventoryButtons,
    splitHeroPanelsBetweenMenus,
    renderHeroTreePanel,
    renderHeroTreePanelV2,
    renderCharacterPicker,
    buildHeroUnlockHint,
    getHeroCardImagePath,
    getHeroRosterMode,
    setHeroRosterMode,
    renderHeroRoster,
    renderHeroArenaRoster,
    renderHeroGalleryV2,
  };

  Object.assign(globalThis, {
    getPlayerVariant,
    sanitizePlayerClass,
    getProgressionCatalog,
    getProgressionState,
    getUnlockedHeroSet,
    setHeroActionFeedback,
    humanizeHeroApiError,
    selectHeroForAccount,
    unlockHeroForAccount,
    upgradeHeroNodeForAccount,
    unlockHeroSkillForAccount,
    upgradeHeroSkillForAccount,
    equipItemForAccount,
    unequipItemForAccount,
    sellInventoryItemForAccount,
    upgradeInventoryItemForAccount,
    useQuickItemInRun,
    getCatalogItemMap,
    getItemDisplayName,
    getItemRarityLabel,
    getItemSlotLabel,
    getItemCategoryLabel,
    formatInventoryItemEffectText,
    getInventoryItemIconMeta,
    renderInventoryItemIconHtml,
    getItemRaritySortWeight,
    getInventorySlotTargets,
    getHeroEquipmentItemMap,
    getHeroPreviewImage,
    drawCharacterPreview,
    renderAccountSummary,
    getNodeLevel,
    getHeroSkillLevel,
    heroRequirementMeta,
    bindHeroUnlockButton,
    bindHeroProgressionButtons,
    bindHeroInventoryButtons,
    splitHeroPanelsBetweenMenus,
    renderHeroTreePanel,
    renderHeroTreePanelV2,
    renderCharacterPicker,
    buildHeroUnlockHint,
    getHeroCardImagePath,
    getHeroRosterMode,
    setHeroRosterMode,
    renderHeroRoster,
    renderHeroArenaRoster,
    renderHeroGalleryV2,
  });
  globalThis.CWCharacters = api;
  globalThis.renderCharacterPicker = renderCharacterPicker;

  try {
    selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);
    renderCharacterPicker();
  } catch (err) {
    console.error('Failed to initialize character menu', err);
    globalThis.CWPageLoader?.mark?.('characters', 'Hero dossier fallback ready');
    globalThis.CWPageLoader?.requestReady?.({ force: true });
  }
})();
