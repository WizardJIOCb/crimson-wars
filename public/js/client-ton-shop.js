'use strict';

(() => {
  const state = {
    busy: false,
    message: '',
    messageKind: '',
    tonUi: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function html(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function getShop() {
    return game?.playerAuth?.tonShop || null;
  }

  function getProgression() {
    return game?.playerAuth?.progression || null;
  }

  function formatTon(nanoTon) {
    const value = Number(nanoTon || 0) / 1000000000;
    return `${value.toFixed(value >= 1 ? 2 : 3).replace(/0+$/, '').replace(/\.$/, '')} TON`;
  }

  function getHeroSkinCatalog() {
    const shop = getShop();
    return Array.isArray(shop?.cosmetics?.heroSkins) ? shop.cosmetics.heroSkins : [];
  }

  function getItemSkinCatalog() {
    const shop = getShop();
    return Array.isArray(shop?.cosmetics?.itemSkins) ? shop.cosmetics.itemSkins : [];
  }

  function getHeroSkin(skinId) {
    const id = String(skinId || '').trim();
    return getHeroSkinCatalog().find((skin) => String(skin?.id || '').trim() === id) || null;
  }

  function getItemSkin(skinId) {
    const id = String(skinId || '').trim();
    return getItemSkinCatalog().find((skin) => String(skin?.id || '').trim() === id) || null;
  }

  function getSelectedHeroSkin(heroId) {
    const id = String(heroId || '').trim();
    const skinId = String(getProgression()?.selectedCosmetics?.heroSkins?.[id] || '').trim();
    return skinId ? getHeroSkin(skinId) : null;
  }

  function getCosmeticVisual(kind, id) {
    if (!id || id === 'default') return null;
    return kind === 'item_skin' ? getItemSkin(id) : getHeroSkin(id);
  }

  function getOwnedHeroSkinSet() {
    return new Set(Array.isArray(getProgression()?.cosmeticEntitlements?.ownedHeroSkins)
      ? getProgression().cosmeticEntitlements.ownedHeroSkins
      : []);
  }

  function getOwnedItemSkinSet() {
    return new Set(Array.isArray(getProgression()?.cosmeticEntitlements?.ownedItemSkins)
      ? getProgression().cosmeticEntitlements.ownedItemSkins
      : []);
  }

  function setMessage(message, kind = '') {
    state.message = String(message || '').trim();
    state.messageKind = String(kind || '').trim();
    const feedback = $('ton-shop-feedback');
    if (!feedback) return;
    feedback.textContent = state.message;
    feedback.className = `ton-shop-feedback${state.messageKind ? ` ${state.messageKind}` : ''}${state.message ? '' : ' hidden'}`;
  }

  function applyPlayerPayload(payload) {
    if (payload?.progression) game.playerAuth.progression = payload.progression;
    if (payload?.tonShop) game.playerAuth.tonShop = payload.tonShop;
    if (typeof globalThis.renderBattleHubPlayerBadge === 'function') globalThis.renderBattleHubPlayerBadge();
    if (typeof globalThis.renderCharacterPicker === 'function') globalThis.renderCharacterPicker();
    render();
  }

  async function refreshShop() {
    try {
      const payload = await apiJson('/api/ton/shop', { method: 'GET' });
      if (payload?.tonShop) game.playerAuth.tonShop = payload.tonShop;
      render();
    } catch (err) {
      setMessage(err.message || 'Failed to refresh TON shop.', 'err');
    }
  }

  async function ensureTonUi() {
    const shop = getShop();
    if (state.tonUi) return state.tonUi;
    if (!window.TON_CONNECT_UI?.TonConnectUI) {
      throw new Error('TON Connect UI is not loaded yet.');
    }
    const manifestRaw = String(shop?.manifestUrl || '/tonconnect-manifest.json').trim();
    const manifestUrl = /^https?:\/\//i.test(manifestRaw) ? manifestRaw : `${window.location.origin}${manifestRaw.startsWith('/') ? '' : '/'}${manifestRaw}`;
    state.tonUi = new window.TON_CONNECT_UI.TonConnectUI({
      manifestUrl,
      buttonRootId: 'ton-connect-button',
    });
    return state.tonUi;
  }

  async function buyProduct(productId) {
    if (state.busy) return;
    const product = (getShop()?.products || []).find((entry) => String(entry?.id || '') === String(productId || ''));
    if (!product) {
      setMessage('Product not found.', 'err');
      return;
    }
    if (!game.playerAuth?.player) {
      setMessage('Log in before buying TON cosmetics.', 'err');
      return;
    }
    if (!getShop()?.enabled) {
      setMessage('TON receiver is not configured on the server yet.', 'err');
      return;
    }
    state.busy = true;
    render();
    try {
      setMessage('Preparing TON order...', '');
      const tonUi = await ensureTonUi();
      if (!tonUi.account) {
        await tonUi.openModal();
      }
      const orderPayload = await apiJson('/api/ton/orders', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      if (orderPayload.alreadyOwned) {
        applyPlayerPayload(orderPayload);
        setMessage('Already owned.', 'ok');
        return;
      }
      const order = orderPayload.order;
      if (!order?.receiverAddress || !order?.amountNanoTon) {
        throw new Error('TON order is incomplete.');
      }
      setMessage('Confirm the transaction in your wallet.', '');
      const tx = await tonUi.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        network: String(order.networkId || getShop()?.networkId || ''),
        messages: [{
          address: order.receiverAddress,
          amount: String(order.amountNanoTon),
          payload: order.payload || undefined,
        }],
      });
      setMessage('Transaction submitted. Waiting for server verification...', '');
      const submitted = await apiJson(`/api/ton/orders/${encodeURIComponent(order.id)}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          boc: tx?.boc || '',
          walletAddress: tonUi.account?.address || '',
        }),
      });
      applyPlayerPayload(submitted);
      if (submitted?.order?.status === 'paid') {
        setMessage('TON purchase unlocked.', 'ok');
      } else {
        setMessage('Payment submitted. Enable the production verifier or dev auto-confirm to unlock it.', 'warn');
      }
    } catch (err) {
      setMessage(err?.message || 'TON purchase failed.', 'err');
    } finally {
      state.busy = false;
      render();
    }
  }

  async function selectCosmetic(kind, payload) {
    if (!game.playerAuth?.player) {
      setMessage('Log in to equip cosmetics.', 'err');
      return;
    }
    state.busy = true;
    render();
    try {
      const data = await apiJson('/api/player/progression/select-cosmetic', {
        method: 'POST',
        body: JSON.stringify({ kind, ...payload }),
      });
      applyPlayerPayload(data);
      setMessage('Cosmetic equipped.', 'ok');
    } catch (err) {
      setMessage(err?.message || 'Failed to equip cosmetic.', 'err');
    } finally {
      state.busy = false;
      render();
    }
  }

  function renderProduct(product) {
    const owned = Boolean(product?.owned);
    const featured = product?.featured ? ' is-featured' : '';
    const disabled = state.busy || owned || !game.playerAuth?.player || !getShop()?.enabled;
    const action = owned ? 'Owned' : (getShop()?.enabled ? `Buy ${formatTon(product.priceNanoTon)}` : 'TON setup needed');
    return `<article class="ton-product-card${featured} ton-product-${html(product.type || 'item')}">
      <div class="ton-product-art"><img src="${html(product.image || '/assets/ui/ton-crimson-icon.png')}" alt="" loading="lazy" decoding="async"></div>
      <div class="ton-product-copy">
        <span class="ton-product-kicker">${html(String(product.type || '').replace(/_/g, ' '))}</span>
        <strong>${html(product.title || product.id)}</strong>
        <p>${html(product.subtitle || '')}</p>
      </div>
      <button type="button" class="ton-buy-btn" data-ton-buy="${html(product.id)}" ${disabled ? 'disabled' : ''}>${html(action)}</button>
    </article>`;
  }

  function renderHeroSkin(skin, ownedSet) {
    const selected = getProgression()?.selectedCosmetics?.heroSkins?.[skin.heroId] === skin.id;
    const owned = ownedSet.has(skin.id);
    const disabled = state.busy || !owned;
    return `<article class="ton-wardrobe-card${selected ? ' selected' : ''}${owned ? '' : ' locked'}">
      <img src="${html(skin.image)}" alt="" loading="lazy" decoding="async">
      <div><b>${html(skin.name)}</b><span>${html(skin.heroId)} | ${html(skin.rarity || 'premium')}</span></div>
      <button type="button" data-ton-equip-hero="${html(skin.id)}" data-hero-id="${html(skin.heroId)}" ${disabled || selected ? 'disabled' : ''}>${selected ? 'Equipped' : (owned ? 'Equip' : 'Locked')}</button>
    </article>`;
  }

  function renderItemSkin(skin, ownedSet) {
    const selected = getProgression()?.selectedCosmetics?.itemSkins?.[skin.target] === skin.id;
    const owned = ownedSet.has(skin.id);
    const disabled = state.busy || !owned;
    return `<article class="ton-wardrobe-card${selected ? ' selected' : ''}${owned ? '' : ' locked'}">
      <img src="${html(skin.image)}" alt="" loading="lazy" decoding="async">
      <div><b>${html(skin.name)}</b><span>${html(skin.target)} | ${html(skin.rarity || 'premium')}</span></div>
      <button type="button" data-ton-equip-item="${html(skin.id)}" data-target="${html(skin.target)}" ${disabled || selected ? 'disabled' : ''}>${selected ? 'Equipped' : (owned ? 'Equip' : 'Locked')}</button>
    </article>`;
  }

  function bind(root) {
    for (const btn of root.querySelectorAll('[data-ton-buy]')) {
      btn.addEventListener('click', () => buyProduct(btn.getAttribute('data-ton-buy')));
    }
    for (const btn of root.querySelectorAll('[data-ton-equip-hero]')) {
      btn.addEventListener('click', () => selectCosmetic('hero_skin', {
        heroId: btn.getAttribute('data-hero-id') || '',
        skinId: btn.getAttribute('data-ton-equip-hero') || '',
      }));
    }
    for (const btn of root.querySelectorAll('[data-ton-equip-item]')) {
      btn.addEventListener('click', () => selectCosmetic('item_skin', {
        target: btn.getAttribute('data-target') || '',
        skinId: btn.getAttribute('data-ton-equip-item') || '',
      }));
    }
    root.querySelector('[data-ton-refresh]')?.addEventListener('click', () => refreshShop());
  }

  function render() {
    const root = $('ton-shop-root');
    if (!root) return;
    const shop = getShop();
    const products = Array.isArray(shop?.products) ? shop.products : [];
    const ownedHeroSkins = getOwnedHeroSkinSet();
    const ownedItemSkins = getOwnedItemSkinSet();
    root.innerHTML = `<div class="ton-shop-shell">
      <section class="ton-shop-head">
        <div>
          <span class="cw-kicker">TON Store</span>
          <strong>Premium cosmetics and character contracts</strong>
          <p>Hero skins, item skins and instant character unlocks paid in TON. Combat math stays server-side.</p>
        </div>
        <div class="ton-wallet-panel">
          <div id="ton-connect-button" class="ton-connect-button"></div>
          <button type="button" class="mini" data-ton-refresh>Refresh</button>
        </div>
      </section>
      <div id="ton-shop-feedback" class="ton-shop-feedback${state.message ? '' : ' hidden'} ${html(state.messageKind)}">${html(state.message)}</div>
      ${shop?.enabled ? '' : '<div class="ton-shop-warning">Server TON receiver is not configured yet. Set TON_RECEIVER_ADDRESS to enable checkout.</div>'}
      ${shop?.devAutoConfirm ? '<div class="ton-shop-warning ok">Dev auto-confirm is enabled: submitted orders unlock immediately.</div>' : ''}
      <section class="ton-product-grid">${products.map(renderProduct).join('') || '<div class="profile-card">TON shop catalog is loading...</div>'}</section>
      <section class="ton-wardrobe">
        <div class="ton-wardrobe-column">
          <div class="ton-wardrobe-title"><b>Character skins</b><span>${ownedHeroSkins.size}/${getHeroSkinCatalog().length}</span></div>
          <div class="ton-wardrobe-list">${getHeroSkinCatalog().map((skin) => renderHeroSkin(skin, ownedHeroSkins)).join('')}</div>
        </div>
        <div class="ton-wardrobe-column">
          <div class="ton-wardrobe-title"><b>Item skins</b><span>${ownedItemSkins.size}/${getItemSkinCatalog().length}</span></div>
          <div class="ton-wardrobe-list">${getItemSkinCatalog().map((skin) => renderItemSkin(skin, ownedItemSkins)).join('')}</div>
        </div>
      </section>
    </div>`;
    bind(root);
    if (shop && window.TON_CONNECT_UI?.TonConnectUI) {
      ensureTonUi().catch(() => {});
    }
  }

  globalThis.CWTonShop = {
    render,
    refresh: refreshShop,
    getSelectedHeroSkin,
    getCosmeticVisual,
    getHeroSkin,
    getItemSkin,
  };

  function bootRender() {
    render();
    window.setTimeout(render, 0);
    window.setTimeout(render, 750);
    window.setTimeout(render, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootRender, { once: true });
  } else {
    bootRender();
  }
})();
