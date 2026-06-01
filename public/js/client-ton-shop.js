'use strict';

(() => {
  const state = {
    busy: false,
    message: '',
    messageKind: '',
    tonUi: null,
    manualOrder: null,
    manualProduct: null,
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

  function formatTonInput(nanoTon) {
    const value = Number(nanoTon || 0) / 1000000000;
    return value.toFixed(9).replace(/0+$/, '').replace(/\.$/, '');
  }

  function buildTonTransferLink(order) {
    if (!order?.receiverAddress || !order?.amountNanoTon) return '';
    const url = new URL(`ton://transfer/${encodeURIComponent(order.receiverAddress)}`);
    url.searchParams.set('amount', String(order.amountNanoTon));
    if (order.comment) url.searchParams.set('text', String(order.comment));
    return url.toString();
  }

  function getProductById(productId) {
    return (getShop()?.products || []).find((entry) => String(entry?.id || '') === String(productId || '')) || null;
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

  async function createTonOrder(productId) {
    const product = getProductById(productId);
    if (!product) throw new Error('Product not found.');
    if (!game.playerAuth?.player) throw new Error('Log in before buying TON cosmetics.');
    if (!getShop()?.enabled) throw new Error('TON receiver is not configured on the server yet.');
    const orderPayload = await apiJson('/api/ton/orders', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
    if (orderPayload.alreadyOwned) {
      applyPlayerPayload(orderPayload);
      return { alreadyOwned: true, product, payload: orderPayload };
    }
    const order = orderPayload.order;
    if (!order?.receiverAddress || !order?.amountNanoTon || !order?.comment) {
      throw new Error('TON order is incomplete.');
    }
    state.manualOrder = order;
    state.manualProduct = order.product || product;
    render();
    return { alreadyOwned: false, product, order, payload: orderPayload };
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function waitForOrderPaid(orderId) {
    let latest = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await sleep(attempt < 2 ? 2500 : 3500);
      latest = await apiJson(`/api/ton/orders/${encodeURIComponent(orderId)}/status`, { method: 'GET' });
      applyPlayerPayload(latest);
      if (latest?.order?.status === 'paid') return latest;
      setMessage('Payment submitted. Verifying on TON...', '');
    }
    return latest;
  }

  async function copyText(value, label) {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copied.`, 'ok');
    } catch (_) {
      window.prompt(`Copy ${label}`, text);
    }
  }

  function closeTonConnectModal() {
    try {
      if (typeof state.tonUi?.closeModal === 'function') state.tonUi.closeModal();
    } catch (_) {}
  }

  function withTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error(message || 'Operation timed out.')), ms);
      }),
    ]);
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
    const product = getProductById(productId);
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
    let order = null;
    try {
      setMessage('Preparing TON order...', '');
      const tonUi = await ensureTonUi();
      if (!tonUi.account) {
        await tonUi.openModal();
      }
      const orderPayload = await createTonOrder(productId);
      if (orderPayload.alreadyOwned) {
        setMessage('Already owned.', 'ok');
        return;
      }
      order = orderPayload.order;
      setMessage('Confirm the transaction in your wallet.', '');
      const tx = await withTimeout(tonUi.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        network: String(order.networkId || getShop()?.networkId || ''),
        messages: [{
          address: order.receiverAddress,
          amount: String(order.amountNanoTon),
          payload: order.payload || undefined,
        }],
      }), 45000, 'Wallet did not confirm the transaction. Use Manual transfer below.');
      setMessage('Transaction submitted. Waiting for server verification...', '');
      const submitted = await apiJson(`/api/ton/orders/${encodeURIComponent(order.id)}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          boc: tx?.boc || '',
          walletAddress: tonUi.account?.address || '',
        }),
      });
      let finalPayload = submitted;
      applyPlayerPayload(finalPayload);
      if (finalPayload?.order?.status !== 'paid') {
        finalPayload = await waitForOrderPaid(order.id);
      }
      if (finalPayload?.order?.status === 'paid') {
        setMessage('TON purchase unlocked.', 'ok');
      } else {
        setMessage('Payment submitted. Verification can take a little longer; refresh the shop in a minute.', 'warn');
      }
    } catch (err) {
      if (order) {
        closeTonConnectModal();
        state.manualOrder = order;
        state.manualProduct = order.product || product;
        setMessage(err?.message || 'Wallet returned an error. Manual TON transfer is available below.', 'warn');
      } else {
        setMessage(err?.message || 'TON purchase failed.', 'err');
      }
    } finally {
      state.busy = false;
      render();
    }
  }

  async function startManualPayment(productId) {
    if (state.busy) return;
    state.busy = true;
    render();
    try {
      setMessage('Preparing manual TON order...', '');
      const orderPayload = await createTonOrder(productId);
      if (orderPayload.alreadyOwned) {
        setMessage('Already owned.', 'ok');
        return;
      }
      setMessage('Send exact TON amount with the required comment, then check payment.', 'warn');
    } catch (err) {
      setMessage(err?.message || 'Failed to create manual TON order.', 'err');
    } finally {
      state.busy = false;
      render();
    }
  }

  async function checkManualOrder() {
    const orderId = state.manualOrder?.id;
    if (!orderId || state.busy) return;
    state.busy = true;
    render();
    try {
      const latest = await apiJson(`/api/ton/orders/${encodeURIComponent(orderId)}/status`, { method: 'GET' });
      applyPlayerPayload(latest);
      if (latest?.order?.status === 'paid') {
        state.manualOrder = null;
        state.manualProduct = null;
        setMessage('TON purchase unlocked.', 'ok');
      } else {
        state.manualOrder = latest?.order || state.manualOrder;
        setMessage('Payment is not visible on-chain yet. Try again in a minute.', 'warn');
      }
    } catch (err) {
      setMessage(err?.message || 'Failed to check TON payment.', 'err');
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
      <div class="ton-product-actions">
        <button type="button" class="ton-buy-btn" data-ton-buy="${html(product.id)}" ${disabled ? 'disabled' : ''}>${html(action)}</button>
        <button type="button" class="ton-manual-btn" data-ton-manual="${html(product.id)}" ${disabled ? 'disabled' : ''}>Manual</button>
      </div>
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
    for (const btn of root.querySelectorAll('[data-ton-manual]')) {
      btn.addEventListener('click', () => startManualPayment(btn.getAttribute('data-ton-manual')));
    }
    for (const btn of root.querySelectorAll('[data-ton-copy]')) {
      btn.addEventListener('click', () => copyText(btn.getAttribute('data-ton-copy') || '', btn.getAttribute('data-copy-label') || 'Value'));
    }
    root.querySelector('[data-ton-check-manual]')?.addEventListener('click', () => checkManualOrder());
    root.querySelector('[data-ton-close-manual]')?.addEventListener('click', () => {
      state.manualOrder = null;
      state.manualProduct = null;
      render();
    });
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
    const manualOrder = state.manualOrder;
    const manualProduct = state.manualProduct;
    const manualAmount = manualOrder ? formatTonInput(manualOrder.amountNanoTon) : '';
    const manualTransferLink = manualOrder ? buildTonTransferLink(manualOrder) : '';
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
      ${manualOrder ? `<section class="ton-manual-panel">
        <div>
          <span class="cw-kicker">Manual TON transfer</span>
          <strong>${html(manualProduct?.title || manualOrder.productId || 'TON order')}</strong>
          <p>Close the Wallet popup if it is stuck. Send the exact TON amount to the receiver address and include the required comment. The game unlocks the item when the payment appears on TON.</p>
        </div>
        <dl>
          <div><dt>Amount</dt><dd><code>${html(manualAmount)} TON</code><button type="button" data-ton-copy="${html(manualAmount)}" data-copy-label="Amount">Copy</button></dd></div>
          <div><dt>Receiver</dt><dd><code>${html(manualOrder.receiverAddress)}</code><button type="button" data-ton-copy="${html(manualOrder.receiverAddress)}" data-copy-label="Receiver">Copy</button></dd></div>
          <div><dt>Comment</dt><dd><code>${html(manualOrder.comment)}</code><button type="button" data-ton-copy="${html(manualOrder.comment)}" data-copy-label="Comment">Copy</button></dd></div>
        </dl>
        <div class="ton-manual-actions">
          ${manualTransferLink ? `<a class="ton-manual-open" href="${html(manualTransferLink)}">Open wallet</a>` : ''}
          <button type="button" data-ton-check-manual ${state.busy ? 'disabled' : ''}>Check payment</button>
          <button type="button" data-ton-close-manual ${state.busy ? 'disabled' : ''}>Close</button>
        </div>
      </section>` : ''}
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
