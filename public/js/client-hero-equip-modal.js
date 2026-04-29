'use strict';

(() => {
  let heroEquipModalEl = null;
  let heroEquipModalTitleEl = null;
  let heroEquipModalBodyEl = null;

  const tr = (key, params = null) => {
    if (typeof window.cwI18nT === 'function') return window.cwI18nT(key, params);
    return String(key || '');
  };

  const trWithFallback = (key, fallback, params = null) => {
    const out = tr(key, params);
    return out === key ? String(fallback ?? key) : out;
  };

  function escapeHtml(raw) {
    return String(raw ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function ensureModal() {
    if (heroEquipModalEl) return;
    const modal = document.createElement('div');
    modal.id = 'hero-equip-modal';
    modal.className = 'record-details-modal hidden';
    modal.setAttribute('aria-live', 'polite');

    const card = document.createElement('div');
    card.className = 'record-details-card hero-equip-modal-card';

    const head = document.createElement('div');
    head.className = 'record-details-head';

    const title = document.createElement('b');
    title.id = 'hero-equip-modal-title';
    title.textContent = trWithFallback('ui.inventory.equip_slot_title', 'Снарядить слот');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mini';
    closeBtn.textContent = trWithFallback('ui.close', 'Закрыть');
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    head.appendChild(title);
    head.appendChild(closeBtn);

    const body = document.createElement('div');
    body.id = 'hero-equip-modal-body';
    body.className = 'record-details-body hero-equip-modal-body';
    body.textContent = trWithFallback('ui.loading', 'Загрузка...');

    card.appendChild(head);
    card.appendChild(body);
    modal.appendChild(card);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    const modalHost = document.getElementById('join-overlay') || document.body;
    modalHost.appendChild(modal);
    heroEquipModalEl = modal;
    heroEquipModalTitleEl = title;
    heroEquipModalBodyEl = body;
  }

  function close() {
    heroEquipModalEl?.classList.add('hidden');
  }

  function open(hero, slotKey) {
    const catalog = getProgressionCatalog();
    const progression = getProgressionState();
    const slot = (Array.isArray(catalog?.itemSlots) ? catalog.itemSlots : []).find((entry) => String(entry?.key || '') === String(slotKey || ''));
    if (!slot) return;

    ensureModal();
    if (!heroEquipModalEl || !heroEquipModalTitleEl || !heroEquipModalBodyEl) return;

    const itemMap = getCatalogItemMap(catalog);
    const inventoryItems = Array.isArray(progression?.inventoryItems) ? progression.inventoryItems.slice() : [];
    const equippedItems = getHeroEquipmentItemMap(catalog, progression, hero.id);
    const matchingItems = inventoryItems
      .filter((item) => {
        const itemDef = itemMap[item.itemId] || {};
        return getInventorySlotTargets(catalog, itemDef).some((target) => String(target?.key || '') === String(slotKey || ''));
      })
      .sort((a, b) => {
        const itemDefA = itemMap[a.itemId] || {};
        const itemDefB = itemMap[b.itemId] || {};
        const aEquipped = Object.values(equippedItems).some((entry) => entry?.uid === a.uid) ? 1 : 0;
        const bEquipped = Object.values(equippedItems).some((entry) => entry?.uid === b.uid) ? 1 : 0;
        return (bEquipped - aEquipped)
          || (getItemRaritySortWeight(itemDefB.rarity) - getItemRaritySortWeight(itemDefA.rarity))
          || ((Number(b.level) || 0) - (Number(a.level) || 0))
          || String(getItemDisplayName(itemDefA)).localeCompare(String(getItemDisplayName(itemDefB)));
      });

    heroEquipModalTitleEl.textContent = `${trWithFallback('ui.inventory.equip_slot_title', 'Снарядить слот')}: ${getItemSlotLabel(slot)}`;
    if (!matchingItems.length) {
      heroEquipModalBodyEl.innerHTML = `<div class="hero-equip-modal-empty">${escapeHtml(trWithFallback('ui.inventory.no_matching_items', 'Для этого слота пока нет подходящих предметов.'))}</div>`;
      heroEquipModalEl.classList.remove('hidden');
      return;
    }

    const rowsHtml = matchingItems.map((item) => {
      const itemDef = itemMap[item.itemId] || {};
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const equippedIn = Object.keys(equippedItems).filter((key) => equippedItems[key]?.uid === item.uid);
      const equippedMeta = equippedIn.length
        ? `<div class="hero-equip-picker-meta hero-equip-picker-meta-eq">${escapeHtml(trWithFallback('ui.inventory.equipped_in', 'Экипировано'))}: ${escapeHtml(equippedIn.map((key) => getItemSlotLabel((catalog.itemSlots || []).find((entry) => entry.key === key) || { key })).join(', '))}</div>`
        : '';
      return `<div class="hero-equip-picker-row rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}"><div class="hero-equip-picker-copy"><div class="hero-equip-picker-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="hero-equip-picker-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} • Lv ${Math.max(1, Number(item.level) || 1)}${quantity > 1 ? ` • x${quantity}` : ''}</div>${equippedMeta}</div><button type="button" class="hero-equip-action" data-modal-item-equip="${escapeHtml(item.uid)}" data-slot-key="${escapeHtml(slot.key)}">${escapeHtml(trWithFallback('ui.inventory.equip', 'Снарядить'))}</button></div>`;
    }).join('');

    heroEquipModalBodyEl.innerHTML = `<div class="hero-equip-picker-list">${rowsHtml}</div>`;
    for (const btn of heroEquipModalBodyEl.querySelectorAll('[data-modal-item-equip]')) {
      btn.addEventListener('click', async () => {
        try {
          await equipItemForAccount(hero.id, btn.getAttribute('data-modal-item-equip') || '', btn.getAttribute('data-slot-key') || '');
          close();
          setHeroActionFeedback(trWithFallback('ui.inventory.equipped', 'Предмет экипирован.'), 'ok');
          renderCharacterPicker();
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to equip item.'), 'err');
        }
      });
    }

    heroEquipModalEl.classList.remove('hidden');
  }

  globalThis.CWHeroEquipModal = { open, close };
})();
