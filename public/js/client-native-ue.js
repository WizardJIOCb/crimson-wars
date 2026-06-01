'use strict';

(() => {
  const params = new URLSearchParams(window.location.search || '');
  if (String(params.get('native') || '').trim().toLowerCase() !== 'ue') return;

  const PLAYER_CLASS_STORAGE_KEY = 'cw:playerClass';

  document.documentElement.classList.add('cw-native-ue');
  window.cwNativeUeMode = true;
  window.cwDisableWebRenderer = true;
  window.cwNativeRendererActive = false;

  function suppressRunStartOverlay() {
    if (typeof window.cwCancelRunStartLoading === 'function') {
      window.cwCancelRunStartLoading();
    }
    const overlay = document.getElementById('run-start-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('is-intro', 'impact-active');
      overlay.style.display = 'none';
    }
    const impactImg = document.getElementById('run-start-impact-img');
    if (impactImg instanceof HTMLImageElement) impactImg.removeAttribute('src');
  }

  suppressRunStartOverlay();
  if (typeof window.cwBeginRunStartLoading === 'function') {
    window.cwBeginRunStartLoading = () => {
      suppressRunStartOverlay();
      return 0;
    };
  }

  function focusGameSurface() {
    const gameCanvas = document.getElementById('game');
    if (gameCanvas instanceof HTMLCanvasElement) {
      gameCanvas.tabIndex = 0;
      gameCanvas.focus({ preventScroll: true });
    }
    window.focus();
  }

  function shouldKeepWebControlFocus(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest([
      'input',
      'textarea',
      'select',
      '[contenteditable="true"]',
      '#join-overlay',
      '#cw-menu-root',
      '#join-form',
      '#info-panel',
      '#chat-wrap',
      '#dev-console',
      '.record-details-modal',
      '.battle-hub-skill-modal'
    ].join(',')));
  }

  function getSelectedHeroId() {
    const selector = [
      '.hero-arena-slot.focused[data-hero-id]',
      '.hero-arena-slot.active[data-hero-id]',
      '.hero-v2-card.focused[data-hero-id]',
      '.hero-v2-card.active[data-hero-id]',
    ].join(',');
    const selected = document.querySelector(selector);
    const fromDom = selected?.getAttribute('data-hero-id');
    if (fromDom) return String(fromDom).trim().toLowerCase();
    return String(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || 'cyber').trim().toLowerCase() || 'cyber';
  }

  function getCurrentRunRoomCode() {
    const game = window.cwGame || window.game || {};
    return String(game.roomCode || game.state?.roomCode || '').trim().toUpperCase();
  }

  function getCurrentRunMapId() {
    const game = window.cwGame || window.game || {};
    return String(game.mapId || game.state?.mapId || '').trim();
  }

  function getCurrentRunPlayer() {
    const game = window.cwGame || window.game || {};
    const myId = String(game.myId || '').trim();
    const players = Array.isArray(game.state?.players) ? game.state.players : [];
    return players.find((player) => String(player?.id || '').trim() === myId) || null;
  }

  function getCurrentRunPlayerId() {
    const game = window.cwGame || window.game || {};
    return String(game.myId || '').trim();
  }

  function getCurrentRunPlayerName() {
    const game = window.cwGame || window.game || {};
    const player = getCurrentRunPlayer();
    const nameInput = document.getElementById('player-name') || document.getElementById('name');
    return String(player?.name || game.playerAuth?.player?.nickname || nameInput?.value || 'Fighter').trim();
  }

  function getCurrentRunPlayerAccountId() {
    const game = window.cwGame || window.game || {};
    const player = getCurrentRunPlayer();
    const accountId = Number(player?.playerAccountId || game.playerAuth?.player?.id || 0) || 0;
    return accountId > 0 ? String(Math.floor(accountId)) : '';
  }

  function createHandoffToken() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 80);
  }

  const pendingNativeHandoffs = new Map();
  const NATIVE_HANDOFF_READY_TIMEOUT_MS = 900;

  window.addEventListener('cw-native-handoff-ready', (event) => {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const key = `${String(detail?.roomCode || '').trim().toUpperCase()}|${String(detail?.playerId || '').trim()}`;
    const pending = pendingNativeHandoffs.get(key);
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingNativeHandoffs.delete(key);
    pending.resolve(true);
  });

  function sendNativeHandoffPrepare(roomCode, playerId, token) {
    if (!roomCode || !playerId || !token) return false;
    try {
      const payload = { type: 'nativeHandoffPrepare', roomCode, playerId, token };
      if (typeof window.sendJson === 'function') return window.sendJson(payload) !== false;
      if (typeof sendJson === 'function') return sendJson(payload) !== false;
    } catch {
      // Native will fall back to a normal join if the web socket is unavailable.
    }
    return false;
  }

  function prepareNativeHandoff(roomCode, playerId, token) {
    const normalizedRoomCode = String(roomCode || '').trim().toUpperCase();
    const normalizedPlayerId = String(playerId || '').trim();
    const key = `${normalizedRoomCode}|${normalizedPlayerId}`;
    return new Promise((resolve) => {
      const sent = sendNativeHandoffPrepare(normalizedRoomCode, normalizedPlayerId, token);
      if (!sent) {
        resolve(false);
        return;
      }
      const previous = pendingNativeHandoffs.get(key);
      if (previous) {
        window.clearTimeout(previous.timer);
        previous.resolve(false);
      }
      const timer = window.setTimeout(() => {
        pendingNativeHandoffs.delete(key);
        resolve(false);
      }, NATIVE_HANDOFF_READY_TIMEOUT_MS);
      pendingNativeHandoffs.set(key, { resolve, timer });
    });
  }

  let lastNativeRunHash = '';
  let nativeRendererPausedByWebReturn = false;
  let nativeRoutePending = false;
  let nativeRendererRequested = false;

  function isWebRendererDisabled() {
    return window.cwDisableWebRenderer === true;
  }

  function setNativeRendererActive(active) {
    const isActive = Boolean(active);
    const hideWebCanvas = isWebRendererDisabled() || isActive;
    window.cwNativeRendererActive = isActive;
    if (typeof window.cwSetNativeAudioSuppressed === 'function') {
      window.cwSetNativeAudioSuppressed(hideWebCanvas);
    }
    document.documentElement.classList.toggle('cw-native-renderer-active', isActive);
    document.body?.classList.toggle('cw-native-renderer-active', isActive);

    ['game', 'game-webgl'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = hideWebCanvas;
      el.classList.toggle('hidden', hideWebCanvas);
      el.style.visibility = hideWebCanvas ? 'hidden' : 'visible';
      el.style.opacity = hideWebCanvas ? '0' : '1';
      el.style.pointerEvents = hideWebCanvas ? 'none' : '';
    });
  }

  setNativeRendererActive(false);

  async function syncNativeRunRoute(action = '') {
    if (!action && window.cwNativeRendererActive) return;
    if (!action && nativeRendererRequested) return;
    if (nativeRoutePending && action === 'native') return;
    if (action === 'native') nativeRendererPausedByWebReturn = false;

    const roomCode = getCurrentRunRoomCode();
    const heroId = getSelectedHeroId();
    const mapId = getCurrentRunMapId();
    const playerId = getCurrentRunPlayerId();
    const playerName = getCurrentRunPlayerName();
    const playerAccountId = getCurrentRunPlayerAccountId();
    if (action === 'native' && (!roomCode || !playerId)) return;

    const handoffToken = action === 'native' && roomCode && playerId ? createHandoffToken() : '';
    if (handoffToken) nativeRoutePending = true;
    if (action === 'native') nativeRendererRequested = true;

    const nextParams = new URLSearchParams();
    if (roomCode) nextParams.set('cw-native-room', roomCode);
    if (heroId) nextParams.set('hero', heroId);
    if (mapId) nextParams.set('map', mapId);
    if (playerId) nextParams.set('cw-native-player', playerId);
    if (playerName) nextParams.set('cw-native-name', playerName);
    if (playerAccountId) nextParams.set('cw-native-account', playerAccountId);
    if (handoffToken) nextParams.set('cw-native-token', handoffToken);
    if (action) {
      nextParams.set('cw-native-action', action);
      nextParams.set('t', String(Date.now()));
    }

    const nextHash = nextParams.toString();
    if (!nextHash || (!action && nextHash === lastNativeRunHash)) {
      if (handoffToken) nativeRoutePending = false;
      return;
    }
    lastNativeRunHash = nextHash;

    if (action) {
      if (handoffToken) {
        await prepareNativeHandoff(roomCode, playerId, handoffToken);
        setTimeout(() => {
          window.location.hash = nextHash;
          nativeRoutePending = false;
        }, 35);
      } else {
        window.location.hash = nextHash;
      }
      return;
    }

    const url = new URL(window.location.href);
    url.hash = nextHash;
    window.history.replaceState(null, '', url.toString());
  }

  function startNativeRunInsideUnreal() {
    localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, getSelectedHeroId());

    const roomInput = document.getElementById('room-code');
    const hasRoomCode = String(roomInput?.value || '').trim().length > 0;
    const mode = hasRoomCode ? 'join' : 'create';
    const submitButton = document.querySelector(`#menu-panel-play .actions button[type="submit"][data-mode="${mode}"]`);
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.click();
      setTimeout(focusGameSurface, 120);
      return;
    }

    const joinForm = document.getElementById('join-form');
    if (joinForm instanceof HTMLFormElement) {
      joinForm.requestSubmit();
      setTimeout(focusGameSurface, 120);
    }
  }

  function removeNativeChoiceControls() {
    document.querySelectorAll('[data-native-ue-run], [data-native-ue-render-toggle]').forEach((el) => el.remove());
  }

  function requestNativeRendererByDefault() {
    if (window.cwNativeRendererActive) return;
    if (nativeRendererRequested || nativeRoutePending) return;
    if (nativeRendererPausedByWebReturn) return;
    if (!getCurrentRunRoomCode() || !getCurrentRunPlayerId()) return;
    syncNativeRunRoute('native');
  }

  function showRunElement(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    el.classList.remove('hidden');
    el.style.display = '';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
  }

  function restoreWebRunSurface(options = {}) {
    const openMenu = options === true || Boolean(options?.openMenu);
    const forceWeb = Boolean(options?.forceWeb || options?.webSurface);
    const webRendererDisabled = isWebRendererDisabled();
    if (openMenu && !forceWeb) {
      openNativeBattleMenu();
      return;
    }
    setNativeRendererActive(false);
    nativeRendererRequested = false;
    nativeRendererPausedByWebReturn = !webRendererDisabled;

    const game = window.cwGame || window.game || {};
    const hasRunState = Boolean(game.state || getCurrentRunRoomCode() || getCurrentRunPlayerId());
    const overlay = document.getElementById('join-overlay');
    if (overlay && hasRunState) {
      overlay.style.display = 'none';
      overlay.classList.remove('death-mode', 'death-cinematic-active', 'death-rewards-visible');
    }

    if (!webRendererDisabled) {
      showRunElement('game');
      showRunElement('game-webgl');
    }
    showRunElement('top-center-hud');
    showRunElement('bottom-hud');
    showRunElement('minimap-wrap');
    showRunElement('chat-wrap');
    showRunElement('fps-corner');

    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('menu-hidden');
    document.body?.classList.remove('levelup-open');
    window.dispatchEvent(new Event('resize'));

    if (openMenu) {
      if (typeof window.cwOpenBattleInfoMenu === 'function') {
        window.cwOpenBattleInfoMenu();
      } else {
        document.getElementById('toggle-info')?.click();
      }
      requestAnimationFrame(() => {
        const closeBtn = document.getElementById('info-panel-close');
        if (closeBtn instanceof HTMLElement) closeBtn.focus({ preventScroll: true });
      });
      return;
    }

    focusGameSurface();
    requestAnimationFrame(focusGameSurface);
  }

  function focusBattleInfoMenu() {
    requestAnimationFrame(() => {
      const closeBtn = document.getElementById('info-panel-close');
      if (closeBtn instanceof HTMLElement) closeBtn.focus({ preventScroll: true });
    });
  }

  function openNativeBattleMenu() {
    setNativeRendererActive(true);
    nativeRendererRequested = false;
    nativeRendererPausedByWebReturn = false;

    const game = window.cwGame || window.game || {};
    const hasRunState = Boolean(game.state || getCurrentRunRoomCode() || getCurrentRunPlayerId());
    const overlay = document.getElementById('join-overlay');
    if (overlay && hasRunState) {
      overlay.style.display = 'none';
      overlay.classList.remove('death-mode', 'death-cinematic-active', 'death-rewards-visible');
    }

    if (typeof window.cwOpenBattleInfoMenu === 'function') {
      window.cwOpenBattleInfoMenu();
    } else {
      document.getElementById('toggle-info')?.click();
    }
    focusBattleInfoMenu();
  }

  let lastHandledNativeHash = '';

  function handleNativeHashAction() {
    const rawHash = String(window.location.hash || '').replace(/^#/, '');
    if (!rawHash || rawHash === lastHandledNativeHash) return;
    lastHandledNativeHash = rawHash;
    let action = '';
    try {
      const hashParams = new URLSearchParams(rawHash);
      action = String(hashParams.get('cw-native-action') || '').trim().toLowerCase();
    } catch {
      action = '';
    }
    if (action === 'menu' || action === 'native-menu' || action === 'open-menu' || action === 'web-menu') {
      openNativeBattleMenu();
    } else if (action === 'web' || action === 'webgl' || action === 'restore-web') {
      restoreWebRunSurface();
    }
  }

  document.addEventListener('pointerdown', (event) => {
    if (shouldKeepWebControlFocus(event.target)) return;
    setTimeout(focusGameSurface, 0);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (shouldKeepWebControlFocus(event.target)) return;

    if (event.code === 'F10') {
      event.preventDefault();
      nativeRendererPausedByWebReturn = false;
      nativeRendererRequested = false;
      syncNativeRunRoute('native');
      return;
    }

    if (event.code === 'F9' || ((event.ctrlKey || event.metaKey) && event.code === 'Enter')) {
      event.preventDefault();
      startNativeRunInsideUnreal();
    }
  });

  window.cwNativeStartRun = startNativeRunInsideUnreal;
  window.cwNativeGetSelectedHero = getSelectedHeroId;
  window.cwNativeFocusGameSurface = restoreWebRunSurface;
  window.cwNativeRestoreWebRunSurface = restoreWebRunSurface;
  window.cwNativeOpenMenu = openNativeBattleMenu;
  window.cwNativeOpenWebMenu = openNativeBattleMenu;
  window.cwNativeShowMenu = openNativeBattleMenu;
  window.cwNativeOpenWebSurfaceMenu = () => restoreWebRunSurface({ openMenu: true, forceWeb: true });
  window.cwNativeSetRendererActive = setNativeRendererActive;
  window.cwNativeRequestRenderer = () => {
    nativeRendererPausedByWebReturn = false;
    nativeRendererRequested = false;
    syncNativeRunRoute('native');
  };

  window.addEventListener('hashchange', handleNativeHashAction);

  window.addEventListener('DOMContentLoaded', () => {
    suppressRunStartOverlay();
    removeNativeChoiceControls();
    handleNativeHashAction();
    requestNativeRendererByDefault();
  });
  setInterval(() => {
    removeNativeChoiceControls();
    requestNativeRendererByDefault();
    syncNativeRunRoute();
  }, 350);
})();
