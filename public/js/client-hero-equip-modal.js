'use strict';

(() => {
  const HERO_EQUIP_MODAL_CLOSE_MS = 360;

  let heroEquipModalEl = null;
  let heroEquipModalTitleEl = null;
  let heroEquipModalSubtitleEl = null;
  let heroEquipModalIconEl = null;
  let heroEquipModalArtEl = null;
  let heroEquipModalBodyEl = null;
  let heroEquipModalCloseTimer = 0;

  const tr = (key, params = null) => {
    if (typeof window.cwI18nT === 'function') return window.cwI18nT(key, params);
    return String(key || '');
  };

  const trWithFallback = (key, fallback, params = null) => {
    const out = tr(key, params);
    return out === key ? String(fallback ?? key) : out;
  };

  const uiText = (ruText, enText) => {
    const lang = typeof globalThis.cwI18nGetLanguage === 'function'
      ? String(globalThis.cwI18nGetLanguage() || '').trim().toLowerCase()
      : 'ru';
    return lang === 'ru' ? String(ruText || '') : String(enText || ruText || '');
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
    modal.className = 'battle-hub-skill-modal hero-equip-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-live', 'polite');

    const backdrop = document.createElement('div');
    backdrop.className = 'battle-hub-skill-modal-backdrop hero-equip-modal-backdrop';
    backdrop.setAttribute('data-hero-equip-modal-close', '1');

    const card = document.createElement('div');
    card.className = 'battle-hub-skill-modal-card hero-equip-modal-card';
    card.setAttribute('role', 'document');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'battle-hub-skill-modal-close hero-equip-modal-close';
    closeBtn.setAttribute('data-hero-equip-modal-close', '1');
    closeBtn.setAttribute('aria-label', trWithFallback('ui.close', 'Close'));
    closeBtn.setAttribute('title', trWithFallback('ui.close', 'Close'));

    const content = document.createElement('div');
    content.className = 'battle-hub-skill-modal-content hero-equip-modal-content';

    const hero = document.createElement('div');
    hero.className = 'battle-hub-skill-modal-hero hero-equip-modal-hero';

    const art = document.createElement('div');
    art.className = 'battle-hub-skill-modal-art hero-equip-modal-art';

    const icon = document.createElement('span');
    icon.textContent = 'EQ';
    art.appendChild(icon);

    const head = document.createElement('div');
    head.className = 'battle-hub-skill-modal-head hero-equip-modal-head';

    const kicker = document.createElement('span');
    kicker.className = 'battle-hub-skill-modal-kicker';
    kicker.textContent = trWithFallback('ui.inventory.equipment', 'Equipment');

    const title = document.createElement('strong');
    title.id = 'hero-equip-modal-title';
    title.textContent = trWithFallback('ui.inventory.equip_slot_title', 'Equip slot');

    const subtitle = document.createElement('small');
    subtitle.id = 'hero-equip-modal-subtitle';
    subtitle.textContent = trWithFallback('ui.inventory.items', 'Inventory');

    const body = document.createElement('div');
    body.id = 'hero-equip-modal-body';
    body.className = 'hero-equip-modal-body';
    body.textContent = trWithFallback('ui.loading', 'Loading...');

    head.appendChild(kicker);
    head.appendChild(title);
    head.appendChild(subtitle);
    hero.appendChild(art);
    hero.appendChild(head);
    content.appendChild(hero);
    content.appendChild(body);
    card.appendChild(closeBtn);
    card.appendChild(content);
    modal.appendChild(backdrop);
    modal.appendChild(card);
    modal.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-hero-equip-modal-close]')) close();
    });

    document.body.appendChild(modal);
    heroEquipModalEl = modal;
    heroEquipModalTitleEl = title;
    heroEquipModalSubtitleEl = subtitle;
    heroEquipModalIconEl = icon;
    heroEquipModalArtEl = art;
    heroEquipModalBodyEl = body;
  }

  function showModal() {
    if (!heroEquipModalEl) return;
    if (heroEquipModalCloseTimer) {
      globalThis.clearTimeout(heroEquipModalCloseTimer);
      heroEquipModalCloseTimer = 0;
    }
    heroEquipModalEl.classList.remove('hidden', 'is-closing', 'is-purchased', 'is-busy');
    void heroEquipModalEl.offsetWidth;
    heroEquipModalEl.classList.add('is-open');
  }

  function close() {
    if (!heroEquipModalEl) return;
    if (heroEquipModalEl.classList.contains('hidden') || heroEquipModalEl.classList.contains('is-closing')) return;
    if (heroEquipModalCloseTimer) globalThis.clearTimeout(heroEquipModalCloseTimer);
    heroEquipModalEl.classList.remove('is-open', 'is-busy');
    heroEquipModalEl.classList.add('is-closing');
    heroEquipModalCloseTimer = globalThis.setTimeout(() => {
      if (!heroEquipModalEl) return;
      heroEquipModalEl.classList.add('hidden');
      heroEquipModalEl.classList.remove('is-open', 'is-closing', 'is-purchased', 'is-busy');
      heroEquipModalCloseTimer = 0;
    }, HERO_EQUIP_MODAL_CLOSE_MS);
  }

  function getSlotAccent(slot) {
    const key = String(slot?.key || '').trim().toLowerCase();
    const category = String(slot?.category || '').trim().toLowerCase();
    if (key === 'left_hand' || key === 'right_hand') return '#ef4444';
    if (category === 'ring') return '#f59e0b';
    if (category === 'head') return '#38bdf8';
    if (category === 'armor') return '#22c55e';
    if (category === 'legs') return '#a3e635';
    if (category === 'melee') return '#fb7185';
    if (category === 'quick') return '#fb7185';
    return '#39c1d9';
  }

  function getSlotGlyph(slot) {
    const key = String(slot?.key || '').trim().toLowerCase();
    const category = String(slot?.category || '').trim().toLowerCase();
    if (key === 'left_hand') return 'LH';
    if (key === 'right_hand') return 'RH';
    if (category === 'head') return 'HD';
    if (category === 'armor') return 'AR';
    if (category === 'legs') return 'LG';
    if (category === 'melee') return 'MW';
    if (category === 'ring') return 'RG';
    if (category === 'quick') return 'FX';
    return 'EQ';
  }

  function getHeroDisplayName(hero) {
    if (typeof trHeroName === 'function') return trHeroName(hero?.id, hero?.name || hero?.id || 'Hero');
    return String(hero?.name || hero?.id || 'Hero');
  }

  function setModalArt(iconMeta, fallbackGlyph) {
    if (!heroEquipModalIconEl) return;
    const imagePath = String(iconMeta?.imagePath || '').trim();
    heroEquipModalIconEl.classList.toggle('has-image', Boolean(imagePath));
    if (heroEquipModalArtEl) heroEquipModalArtEl.classList.toggle('has-item-image', Boolean(imagePath));
    if (imagePath) {
      heroEquipModalIconEl.innerHTML = `<img src="${escapeHtml(imagePath)}" alt="" loading="lazy" decoding="async" />`;
      return;
    }
    heroEquipModalIconEl.textContent = fallbackGlyph || 'EQ';
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
    const currentSlotItem = equippedItems[String(slotKey || '')] || null;
    const currentSlotItemDef = currentSlotItem ? (itemMap[currentSlotItem.itemId] || {}) : null;
    const currentSlotUid = String(currentSlotItem?.uid || '');
    const replacementItems = inventoryItems
      .filter((item) => {
        const itemDef = itemMap[item.itemId] || {};
        return String(item?.uid || '') !== currentSlotUid
          && getInventorySlotTargets(catalog, itemDef).some((target) => String(target?.key || '') === String(slotKey || ''));
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

    const slotAccent = getSlotAccent(slot);
    const heroAccent = String(hero?.accent || '').trim() || slotAccent;
    const titleText = `${trWithFallback('ui.inventory.equip_slot_title', 'Equip slot')}: ${getItemSlotLabel(slot)}`;
    heroEquipModalEl.style.setProperty('--avatar-accent', heroAccent);
    heroEquipModalEl.style.setProperty('--skill-color', slotAccent);
    heroEquipModalEl.setAttribute('aria-label', titleText);
    heroEquipModalTitleEl.textContent = titleText;
    if (heroEquipModalSubtitleEl) {
      heroEquipModalSubtitleEl.textContent = `${getHeroDisplayName(hero)} | ${replacementItems.length} ${uiText('замен', 'replacements')}`;
    }

    const currentIconMeta = currentSlotItemDef
      ? getInventoryItemIconMeta(currentSlotItemDef, getInventorySlotTargets(catalog, currentSlotItemDef))
      : getInventoryItemIconMeta(
        {
          slotCategory: slot?.category,
          combatUse: slot?.kind === 'consumable',
        },
        [slot],
      );
    setModalArt(currentIconMeta, getSlotGlyph(slot));
    const currentQuantity = Math.max(1, Number(currentSlotItem?.quantity) || 1);
    const currentStats = currentSlotItemDef && typeof globalThis.formatInventoryItemEffectText === 'function'
      ? globalThis.formatInventoryItemEffectText(currentSlotItemDef, currentSlotItem)
      : '';
    const currentMeta = currentSlotItemDef
      ? `${getItemRarityLabel(currentSlotItemDef.rarity)} | Lv ${Math.max(1, Number(currentSlotItem?.level) || 1)}${currentQuantity > 1 ? ` | x${currentQuantity}` : ''}`
      : trWithFallback('ui.inventory.empty_slot_hint', 'Choose an item from inventory');
    const currentName = currentSlotItemDef
      ? getItemDisplayName(currentSlotItemDef)
      : trWithFallback('ui.inventory.empty_slot', 'Empty');
    const currentCardClass = `hero-equip-current-card ${currentSlotItemDef ? `rarity-${escapeHtml(String(currentSlotItemDef.rarity || 'common').toLowerCase())}` : 'empty'}`;
    const currentSlotCard = `<div class="${currentCardClass}"><div class="hero-equip-current-copy"><div class="hero-equip-current-label">${escapeHtml(currentSlotItemDef ? uiText('Сейчас одето', 'Equipped now') : uiText('Слот пуст', 'Slot empty'))}</div><div class="hero-equip-current-name">${escapeHtml(currentName)}</div><div class="hero-equip-current-meta">${escapeHtml(currentMeta)}</div>${currentStats ? `<div class="hero-equip-current-stats">${escapeHtml(currentStats)}</div>` : ''}</div></div>`;
    const replacementTitle = `<div class="hero-equip-section-title">${escapeHtml(currentSlotItemDef ? uiText('Доступные замены', 'Available replacements') : uiText('Подходящие предметы', 'Suitable items'))}</div>`;

    if (!replacementItems.length) {
      const emptyText = currentSlotItemDef
        ? uiText('Других подходящих предметов для этого слота пока нет.', 'No replacement items for this slot yet.')
        : trWithFallback('ui.inventory.no_matching_items', 'No suitable items for this slot yet.');
      heroEquipModalBodyEl.innerHTML = `${currentSlotCard}${replacementTitle}<div class="hero-equip-modal-empty">${escapeHtml(emptyText)}</div>`;
      showModal();
      return;
    }

    const rowsHtml = replacementItems.map((item) => {
      const itemDef = itemMap[item.itemId] || {};
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const iconMeta = getInventoryItemIconMeta(itemDef, getInventorySlotTargets(catalog, itemDef));
      const iconHtml = typeof renderInventoryItemIconHtml === 'function'
        ? renderInventoryItemIconHtml(iconMeta, 'hero-equip-picker-icon')
        : '';
      const equippedIn = Object.keys(equippedItems).filter((key) => equippedItems[key]?.uid === item.uid);
      const equippedMeta = equippedIn.length
        ? `<div class="hero-equip-picker-meta hero-equip-picker-meta-eq">${escapeHtml(trWithFallback('ui.inventory.equipped_in', 'Equipped'))}: ${escapeHtml(equippedIn.map((key) => getItemSlotLabel((catalog.itemSlots || []).find((entry) => entry.key === key) || { key })).join(', '))}</div>`
        : '';
      const itemStats = typeof globalThis.formatInventoryItemEffectText === 'function'
        ? globalThis.formatInventoryItemEffectText(itemDef, item)
        : '';
      const actionLabel = currentSlotItemDef ? uiText('Заменить', 'Replace') : trWithFallback('ui.inventory.equip', 'Equip');
      return `<div class="hero-equip-picker-row rarity-${escapeHtml(String(itemDef.rarity || 'common').toLowerCase())}">${iconHtml}<div class="hero-equip-picker-copy"><div class="hero-equip-picker-name">${escapeHtml(getItemDisplayName(itemDef))}</div><div class="hero-equip-picker-meta">${escapeHtml(getItemRarityLabel(itemDef.rarity))} | Lv ${Math.max(1, Number(item.level) || 1)}${quantity > 1 ? ` | x${quantity}` : ''}</div>${itemStats ? `<div class="hero-equip-picker-stats">${escapeHtml(itemStats)}</div>` : ''}${equippedMeta}</div><button type="button" class="hero-equip-action" data-modal-item-equip="${escapeHtml(item.uid)}" data-slot-key="${escapeHtml(slot.key)}">${escapeHtml(actionLabel)}</button></div>`;
    }).join('');

    heroEquipModalBodyEl.innerHTML = `${currentSlotCard}${replacementTitle}<div class="hero-equip-picker-list">${rowsHtml}</div>`;
    for (const btn of heroEquipModalBodyEl.querySelectorAll('[data-modal-item-equip]')) {
      btn.addEventListener('click', async () => {
        try {
          heroEquipModalEl?.classList.add('is-busy');
          btn.disabled = true;
          await equipItemForAccount(hero.id, btn.getAttribute('data-modal-item-equip') || '', btn.getAttribute('data-slot-key') || '');
          close();
          setHeroActionFeedback(trWithFallback('ui.inventory.equipped', 'Item equipped.'), 'ok');
          renderCharacterPicker();
        } catch (err) {
          heroEquipModalEl?.classList.remove('is-busy');
          btn.disabled = false;
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to equip item.'), 'err');
        }
      });
    }

    showModal();
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!heroEquipModalEl || heroEquipModalEl.classList.contains('hidden')) return;
    close();
  });

  globalThis.CWHeroEquipModal = { open, close };
})();
