'use strict';

(() => {
  const HERO_EQUIP_SLOT_FX_MS = 1500;
  const HERO_LOADOUT_SWAP_FX_MS = 1350;
  let heroEquipSlotFx = null;
  let heroEquipSlotFxTimer = 0;
  let heroLoadoutSwapFx = null;
  let heroLoadoutSwapFxTimer = 0;
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
    const data = await apiJson('/api/player/progression/upgrade-node', {
      method: 'POST',
      body: JSON.stringify({ heroId, nodeId }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
  }
  async function unlockHeroSkillForAccount(heroId, skillId) {
    if (!game.playerAuth?.player) return;
    const data = await apiJson('/api/player/progression/unlock-hero-skill', {
      method: 'POST',
      body: JSON.stringify({ heroId, skillId }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
  }
  async function upgradeHeroSkillForAccount(heroId, skillId) {
    if (!game.playerAuth?.player) return;
    const data = await apiJson('/api/player/progression/upgrade-hero-skill', {
      method: 'POST',
      body: JSON.stringify({ heroId, skillId }),
    });
    if (data?.progression) game.playerAuth.progression = data.progression;
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
  function heroRequirementMeta(need, have, formatter) {
    const enough = Math.max(0, Number(have) || 0) >= Math.max(0, Number(need) || 0);
    return {
      enough,
      text: formatter(Math.max(0, Number(need) || 0), Math.max(0, Number(have) || 0)),
    };
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
    heroCharacterPanelEl.innerHTML = '';
    const characterShell = document.createElement('div');
    characterShell.className = 'hero-loadout-shell';
    if (stageCard) characterShell.appendChild(stageCard.cloneNode(true));
    const characterSkillsRow = document.createElement('div');
    characterSkillsRow.className = 'hero-skill-panels-row';
    if (talentCard) characterSkillsRow.appendChild(talentCard.cloneNode(true));
    if (uniqueCard) characterSkillsRow.appendChild(uniqueCard.cloneNode(true));
    if (characterSkillsRow.children.length) characterShell.appendChild(characterSkillsRow);
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
      const lvl = getNodeLevel(progression, hero.id, node.id);
      const maxLevel = Math.max(1, Number(node.maxLevel) || 1);
      const cost = Math.max(1, Number(node.cost) || 1);
      const pointReq = heroRequirementMeta(cost, points, (need, have) => trWithFallback('ui.hero.need_have_points', 'Skill points: need {need} • you have {have}', { need, have }));
      const canUpgrade = Boolean(game.playerAuth?.player && unlocked && lvl < maxLevel && pointReq.enough);
      const nodeName = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.name`, node.name || node.id);
      const nodeDesc = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.desc`, node.desc || '');
      const reqClass = pointReq.enough ? 'ok' : 'lack';
      rows.push(`<div class="hero-node ${pointReq.enough ? '' : 'hero-node-lack'}"><div><div class="hero-node-name">${escapeHtml(nodeName)}</div><div class="hero-node-desc">${escapeHtml(nodeDesc)}</div><div class="hero-node-desc hero-req ${reqClass}">${escapeHtml(pointReq.text)}</div></div><button type="button" class="hero-node-up ${pointReq.enough ? '' : 'hero-node-up-lack'}" data-node-id="${escapeHtml(node.id)}" ${canUpgrade ? '' : 'disabled'}>Lv ${lvl}/${maxLevel}</button></div>`);
    }
    const skillRows = uniqueSkills.map((skill) => {
      const lvl = getHeroSkillLevel(progression, hero.id, skill.id);
      const maxLevel = Math.max(1, Number(skill.maxLevel) || 1);
      const unlockedSkill = lvl > 0;
      const unlockCost = Math.max(1, Number(skill.unlockCostShards) || 1);
      const upgradeCost = Math.max(1, (Number(skill.upgradeCostShardsBase) || 1) + (Math.max(0, lvl - 1) * Math.max(0, Number(skill.upgradeCostShardsStep) || 0)));
      const shardWord = trWithFallback('ui.profile.shards', 'Shards').toLowerCase();
      const costReq = heroRequirementMeta(unlockedSkill ? upgradeCost : unlockCost, shards, (need, have) => {
        const tpl = unlockedSkill ? 'ui.hero.skill_upgrade_cost' : 'ui.hero.skill_unlock_cost';
        const fb = unlockedSkill ? 'Upgrade: {cost} shards' : 'Unlock: {cost} shards';
        return trWithFallback(tpl, fb, { cost: need, currency: shardWord })
          + ' • '
          + `${trWithFallback('ui.hero.have_label', 'У вас')}: ${have}`;
      });
      const canUnlockSkill = Boolean(game.playerAuth?.player && unlocked && !unlockedSkill && costReq.enough);
      const canUpgradeSkill = Boolean(game.playerAuth?.player && unlocked && unlockedSkill && lvl < maxLevel && costReq.enough);
      const skillName = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.name`, skill.name || skill.id);
      const skillDesc = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.desc`, skill.desc || '');
      const skillType = skill.kind === 'active'
        ? trWithFallback('ui.hero.skill_type_active', 'Active')
        : (skill.globalAura
          ? trWithFallback('ui.hero.skill_type_passive_aura', 'Passive Aura')
          : trWithFallback('ui.hero.skill_type_passive', 'Passive'));
      const requirementLabel = unlockedSkill
        ? (lvl >= maxLevel
          ? trWithFallback('ui.common.max', 'MAX')
          : costReq.text)
        : costReq.text;
      const requirementDisplayLabel = String(requirementLabel || '')
        .replace(/\s+[•·]\s+(Need|Нужно):\s*\d+\s+[•·]\s+/iu, ' • ')
        .replace(/\s+•\s+(Need|Нужно):\s*\d+\s+•\s+/iu, ' • ');
      const skillIconHtml = typeof globalThis.renderBattleHubHeroSkillIcon === 'function'
        ? globalThis.renderBattleHubHeroSkillIcon(skill, skill.kind === 'active' ? 'A' : 'P', 'hero-unique-skill-icon')
        : '';
      return `<div class="hero-node hero-unique-skill ${(!costReq.enough && lvl < maxLevel) ? 'hero-node-lack' : ''}">${skillIconHtml}<div><div class="hero-node-name">${escapeHtml(skillName)} <span class="muted">(${escapeHtml(skillType)})</span></div><div class="hero-node-desc">${escapeHtml(skillDesc)}</div><div class="hero-node-desc hero-req ${(costReq.enough || lvl >= maxLevel) ? 'ok' : 'lack'}">${escapeHtml(requirementDisplayLabel)}</div></div><button type="button" class="hero-node-up ${(!costReq.enough && lvl < maxLevel) ? 'hero-node-up-lack' : ''}" data-hero-skill-id="${escapeHtml(skill.id)}" data-hero-skill-action="${unlockedSkill ? 'upgrade' : 'unlock'}" ${(unlockedSkill ? canUpgradeSkill : canUnlockSkill) ? '' : 'disabled'}>Lv ${lvl}/${maxLevel}</button></div>`;
    }).join('');
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
      const lvl = getNodeLevel(progression, hero.id, node.id);
      const maxLevel = Math.max(1, Number(node.maxLevel) || 1);
      const cost = Math.max(1, Number(node.cost) || 1);
      const pointReq = heroRequirementMeta(cost, points, (need, have) => trWithFallback('ui.hero.need_have_points', 'Skill points: need {need} • you have {have}', { need, have }));
      const canUpgrade = Boolean(game.playerAuth?.player && unlocked && lvl < maxLevel && pointReq.enough);
      const nodeName = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.name`, node.name || node.id);
      const nodeDesc = trWithFallback(`hero.node.${String(node.id || '').toLowerCase()}.desc`, node.desc || '');
      const reqClass = pointReq.enough ? 'ok' : 'lack';
      rows.push(`<div class="hero-node ${pointReq.enough ? '' : 'hero-node-lack'}"><div><div class="hero-node-name">${escapeHtml(nodeName)}</div><div class="hero-node-desc">${escapeHtml(nodeDesc)}</div><div class="hero-node-desc hero-req ${reqClass}">${escapeHtml(pointReq.text)}</div></div><button type="button" class="hero-node-up ${pointReq.enough ? '' : 'hero-node-up-lack'}" data-node-id="${escapeHtml(node.id)}" ${canUpgrade ? '' : 'disabled'}>Lv ${lvl}/${maxLevel}</button></div>`);
    }
    const skillRows = uniqueSkills.map((skill) => {
      const lvl = getHeroSkillLevel(progression, hero.id, skill.id);
      const maxLevel = Math.max(1, Number(skill.maxLevel) || 1);
      const unlockedSkill = lvl > 0;
      const unlockCost = Math.max(1, Number(skill.unlockCostShards) || 1);
      const upgradeCost = Math.max(1, (Number(skill.upgradeCostShardsBase) || 1) + (Math.max(0, lvl - 1) * Math.max(0, Number(skill.upgradeCostShardsStep) || 0)));
      const shardWord = trWithFallback('ui.profile.shards', 'Shards').toLowerCase();
      const costReq = heroRequirementMeta(unlockedSkill ? upgradeCost : unlockCost, shards, (need, have) => {
        const tpl = unlockedSkill ? 'ui.hero.skill_upgrade_cost' : 'ui.hero.skill_unlock_cost';
        const fb = unlockedSkill ? 'Upgrade: {cost} shards' : 'Unlock: {cost} shards';
        return trWithFallback(tpl, fb, { cost: need, currency: shardWord }) + ' • ' + `${trWithFallback('ui.hero.have_label', 'У вас')}: ${have}`;
      });
      const canUnlockSkill = Boolean(game.playerAuth?.player && unlocked && !unlockedSkill && costReq.enough);
      const canUpgradeSkill = Boolean(game.playerAuth?.player && unlocked && unlockedSkill && lvl < maxLevel && costReq.enough);
      const skillName = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.name`, skill.name || skill.id);
      const skillDesc = trWithFallback(`skill.${String(skill.id || '').toLowerCase()}.desc`, skill.desc || '');
      const skillType = skill.kind === 'active'
        ? trWithFallback('ui.hero.skill_type_active', 'Active')
        : (skill.globalAura ? trWithFallback('ui.hero.skill_type_passive_aura', 'Passive Aura') : trWithFallback('ui.hero.skill_type_passive', 'Passive'));
      const requirementLabel = unlockedSkill ? (lvl >= maxLevel ? trWithFallback('ui.common.max', 'MAX') : costReq.text) : costReq.text;
      const skillIconHtml = typeof globalThis.renderBattleHubHeroSkillIcon === 'function'
        ? globalThis.renderBattleHubHeroSkillIcon(skill, skill.kind === 'active' ? 'A' : 'P', 'hero-unique-skill-icon')
        : '';
      return `<div class="hero-node hero-unique-skill ${(!costReq.enough && lvl < maxLevel) ? 'hero-node-lack' : ''}">${skillIconHtml}<div><div class="hero-node-name">${escapeHtml(skillName)} <span class="muted">(${escapeHtml(skillType)})</span></div><div class="hero-node-desc">${escapeHtml(skillDesc)}</div><div class="hero-node-desc hero-req ${(costReq.enough || lvl >= maxLevel) ? 'ok' : 'lack'}">${escapeHtml(requirementLabel)}</div></div><button type="button" class="hero-node-up ${(!costReq.enough && lvl < maxLevel) ? 'hero-node-up-lack' : ''}" data-hero-skill-id="${escapeHtml(skill.id)}" data-hero-skill-action="${unlockedSkill ? 'upgrade' : 'unlock'}" ${(unlockedSkill ? canUpgradeSkill : canUnlockSkill) ? '' : 'disabled'}>Lv ${lvl}/${maxLevel}</button></div>`;
    }).join('');
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
    const quickSlotsHtml = quickSlots.map((slot, index) => renderEquipSlotCard(slot, `[${index + 4}]`)).join('');
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
    const heroStats = hero.baseStats && typeof hero.baseStats === 'object'
      ? `POW ${Math.max(0, Number(hero.baseStats.power) || 0)} | AGI ${Math.max(0, Number(hero.baseStats.agility) || 0)} | VIT ${Math.max(0, Number(hero.baseStats.vitality) || 0)} | TEC ${Math.max(0, Number(hero.baseStats.tech) || 0)}`
      : '';
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
      const cardHtml = `<div class="inventory-item-card inventory-item-card-compact rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="inventory-item-layout">${renderInventoryItemIconHtml(iconMeta)}<div class="inventory-item-main"><div class="inventory-item-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="inventory-item-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} • ${escapeHtml(categoryLabel)}</div><div class="inventory-item-chip-row"><div class="inventory-item-chip">Lv ${Math.max(1, Number(item.level) || 1)}</div>${quantity > 1 ? `<div class="inventory-item-chip">x${quantity}</div>` : ''}<div class="inventory-item-chip">${escapeHtml(trWithFallback('ui.inventory.sell_value_short', 'Продажа'))}: ${Math.max(0, Number(item.sellValue) || 0)}</div>${equippedMeta}</div>${itemStats ? `<div class="inventory-item-stats">${escapeHtml(itemStats)}</div>` : ''}${itemDef.combatUse ? `<div class="inventory-item-consumable">${escapeHtml(trWithFallback('ui.inventory.consumable_hint_keys', 'Клавиши 4/5/6 в бою'))}</div>` : ''}</div><div class="inventory-item-actions-compact">${actionButtonsHtml}</div></div></div>`;
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
      return `<div class="inventory-item-card rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="inventory-item-head"><div><div class="inventory-item-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="inventory-item-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} • ${escapeHtml(categoryLabel)} • Lv ${Math.max(1, Number(item.level) || 1)}${quantity > 1 ? ` • x${quantity}` : ''}${equippedIn.length ? ` • ${escapeHtml(trWithFallback('ui.inventory.equipped_in', 'Equipped'))}: ${escapeHtml(equippedIn.map((slotKey) => getItemSlotLabel((catalog.itemSlots || []).find((slot) => slot.key === slotKey) || { key: slotKey })).join(', '))}` : ''}</div></div><div class="inventory-item-values">${escapeHtml(trWithFallback('ui.inventory.sell_value_short', 'Sell'))}: ${Math.max(0, Number(item.sellValue) || 0)}</div></div>${equipButtons ? `<div class="inventory-item-actions-line">${equipButtons}</div>` : ''}<div class="inventory-item-actions-line">${!itemDef.combatUse ? `<button type="button" class="inventory-mini-btn${canUpgradeItem ? '' : ' disabled-like'}" data-item-upgrade="${escapeHtml(item.uid)}">${escapeHtml(trWithFallback('ui.inventory.upgrade_cost_have', 'Upgrade: {cost} salvage • You have: {have}', { cost: upgradeCost, have: salvage }))}</button>` : `<span class="inventory-item-consumable">${escapeHtml(trWithFallback('ui.inventory.consumable_hint_keys', 'Keys 4/5/6 in battle'))}</span>`}<button type="button" class="inventory-mini-btn danger" data-item-sell="${escapeHtml(item.uid)}">${escapeHtml(trWithFallback('ui.inventory.sell_for', 'Sell for {value}', { value: Math.max(0, Number(item.sellValue) || 0) }))}</button></div></div>`;
    }).join('');
    const unlockMeta = !unlocked
      ? `<div class="hero-lock-meta"><span class="hero-req ${accountLevelReq.enough ? 'ok' : 'lack'}">${escapeHtml(accountLevelReq.text)}</span><span class="hero-req ${cardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(cardsReq.text)}</span><span class="hero-req ${shardsReq.enough ? 'ok' : 'lack'}">${escapeHtml(shardsReq.text)}</span></div>`
      : '<div class="hero-lock-meta unlocked">' + trWithFallback('ui.hero.unlocked', 'Unlocked') + '</div>';
    const actionBtn = !game.playerAuth?.player
      ? '<button type="button" class="hero-main-action" disabled>' + trWithFallback('ui.auth.login_required_unlock', 'Login to unlock/progress') + '</button>'
      : (!unlocked
        ? `<button type="button" class="hero-main-action" data-hero-unlock="1" ${canUnlock ? '' : 'disabled'}>${trWithFallback('ui.hero.unlock_btn', 'Unlock hero')}</button>`
        : '');
    heroTreePanelEl.innerHTML = `<div class="hero-loadout-shell"><div class="hero-loadout-card"><div class="hero-tree-head"><div><b>${escapeHtml(heroDisplayName)}</b><div class="hero-tagline">${escapeHtml(heroTagline)}</div><div class="hero-tagline">${escapeHtml(heroXpLabel)}</div><div class="hero-tagline">${escapeHtml(heroStats)}</div></div>${unlockMeta}</div>${actionBtn}</div><div class="hero-loadout-layout"><div class="hero-loadout-card hero-loadout-stage${loadoutSwapClass}"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.inventory.equipment', 'Equipment'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.equipment_hint', 'Equipment slots surround the hero. Inventory and combat consumables are below.'))}</div></div><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.salvage', 'Salvage'))}: ${salvage}</div></div><div class="hero-paper-loadout${loadoutSwapClass}">${heroPaperDollHtml}${quickBeltHtml}<div class="hero-inventory-panel${loadoutSwapClass}"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.inventory.items', 'Inventory'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.items_hint', 'Pick items, equip them into slots, upgrade or sell them right here.'))}</div></div><div class="hero-tagline">${inventoryItems.length}</div></div>${inventoryFilterTabsHtml}<div class="inventory-category-list">${inventorySectionsHtml || `<div class="hero-tagline">${escapeHtml(trWithFallback('ui.inventory.empty', 'Inventory is empty.'))}</div>`}</div></div></div></div><div class="hero-loadout-card"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.hero.talent_tree', 'Hero talents'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.talent_tree_hint', 'Passive account upgrades for the selected hero.'))}</div></div></div><div class="hero-tree-list">${rows.join('')}</div></div><div class="hero-loadout-card"><div class="hero-tree-head"><div><b>${escapeHtml(trWithFallback('ui.hero.unique_skills', 'Unique skills'))}</b><div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.unique_skills_hint', 'Active skills and passive effects for the selected hero.'))}</div></div></div><div class="hero-tree-list">${skillRows || `<div class="hero-tagline">${escapeHtml(trWithFallback('ui.hero.no_unique_skills', 'No unique skills.'))}</div>`}</div></div></div>`;
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
    renderHeroGalleryV2(heroes, progression, unlockedHeroes);
    globalThis.CWProfile?.render?.(heroes, progression, unlockedHeroes);
    renderAccountSummary(catalog, progression);
    renderHeroTreePanelV2(catalog, progression, focusedHero, focusedHero ? unlockedHeroes.has(focusedHero.id) : false);
    if (focusedHero) splitHeroPanelsBetweenMenus(focusedHero);
    globalThis.renderBattleHubPlayerBadge?.();
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
  function renderHeroGalleryV2(heroes, progression, unlockedHeroes) {
    if (!heroGalleryV2El) return;
    heroGalleryV2El.innerHTML = '';
    const heroLevels = progression?.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
    for (const hero of heroes) {
      const unlocked = unlockedHeroes.has(hero.id);
      const focused = hero.id === heroFocusId;
      const active = hero.id === selectedPlayerClass;
      const rosterCardFx = focused ? getHeroLoadoutSwapFx(hero.id) : { active: false };
      const cardBtn = document.createElement('button');
      cardBtn.type = 'button';
      cardBtn.className = `hero-v2-card${active ? ' active' : ''}${focused ? ' focused' : ''}${rosterCardFx.active ? ' is-roster-select-flash' : ''}${unlocked ? '' : ' locked'}`;
      cardBtn.style.setProperty('--accent', hero.accent || '#38bdf8');
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
      cardBtn.addEventListener('click', async () => {
        heroFocusId = hero.id;
        if (!unlocked) {
          renderCharacterPicker();
          return;
        }
        const changingActiveHero = hero.id !== selectedPlayerClass;
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
    renderHeroGalleryV2,
  });
  globalThis.CWCharacters = api;
  globalThis.renderCharacterPicker = renderCharacterPicker;

  try {
    selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);
    renderCharacterPicker();
  } catch (err) {
    console.error('Failed to initialize character menu', err);
  }
})();
