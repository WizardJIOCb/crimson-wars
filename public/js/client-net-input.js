function resetMobileStick(kind) {
  if (kind === 'move') {
    mobile.moveId = null;
    mobile.moveX = 0;
    mobile.moveY = 0;
    mobile.moveStrength = 0;
    if (moveStickEl) {
      moveStickEl.classList.remove('dynamic-active');
      moveStickEl.style.removeProperty('left');
      moveStickEl.style.removeProperty('top');
      moveStickEl.style.removeProperty('right');
      moveStickEl.style.removeProperty('bottom');
    }
    if (moveKnobEl) moveKnobEl.style.transform = 'translate(-50%, -50%)';
    return;
  }
  mobile.aimId = null;
  mobile.aimStrength = 0;
  if (aimStickEl) {
    aimStickEl.classList.remove('dynamic-active');
    aimStickEl.style.removeProperty('left');
    aimStickEl.style.removeProperty('top');
    aimStickEl.style.removeProperty('right');
    aimStickEl.style.removeProperty('bottom');
  }
  if (aimKnobEl) aimKnobEl.style.transform = 'translate(-50%, -50%)';
}

function updateMobileStick(kind, clientX, clientY) {
  const stickEl = kind === 'move' ? moveStickEl : aimStickEl;
  const knobEl = kind === 'move' ? moveKnobEl : aimKnobEl;
  if (!stickEl || !knobEl) return;

  const rect = stickEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = Math.max(20, rect.width * 0.38);

  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) {
    dx = (dx / dist) * radius;
    dy = (dy / dist) * radius;
  }

  knobEl.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;

  const nx = dx / radius;
  const ny = dy / radius;
  const strength = Math.min(1, Math.hypot(nx, ny));

  if (kind === 'move') {
    mobile.moveX = nx;
    mobile.moveY = ny;
    mobile.moveStrength = strength;
  } else {
    if (strength > 0.02) {
      const len = Math.hypot(nx, ny) || 1;
      mobile.aimX = nx / len;
      mobile.aimY = ny / len;
      mobile.lastAimX = mobile.aimX;
      mobile.lastAimY = mobile.aimY;
    }
    mobile.aimStrength = strength;
  }
}

function getTouchById(touchList, id) {
  for (let i = 0; i < touchList.length; i += 1) {
    if (touchList[i].identifier === id) return touchList[i];
  }
  return null;
}


function canUseDynamicStickStart(kind, targetEl) {
  const isMove = kind === 'move';
  const stickEl = isMove ? moveStickEl : aimStickEl;
  if (!mobile.enabled || !stickEl || !mobileControlsEl) return false;
  if (isMove ? (mobile.moveId !== null) : (mobile.aimId !== null)) return false;
  if (!mobileControlsEl.classList.contains('active')) return false;
  if (!game.dynamicSticksEnabled) return false;
  if (!isMove && (!game.showAimStickEnabled || aimStickEl?.hidden)) return false;
  if (!(targetEl instanceof Element)) return false;
  if (targetEl.closest('#join-overlay') || targetEl.closest('#stats-panel') || targetEl.closest('#dev-console')) return false;
  if (targetEl.closest('#move-stick') || targetEl.closest('#aim-stick') || targetEl.closest('#jump-btn')) return false;
  if (targetEl.closest('button, input, select, textarea, details, summary, a, label')) return false;
  return true;
}

function placeStickAt(kind, clientX, clientY) {
  const stickEl = kind === 'move' ? moveStickEl : aimStickEl;
  if (!stickEl) return;
  const currentRect = stickEl.getBoundingClientRect();
  const radius = Math.max(42, currentRect.width / 2);
  const margin = 6;
  const x = Math.max(radius + margin, Math.min(window.innerWidth - radius - margin, clientX));
  const y = Math.max(radius + margin, Math.min(window.innerHeight - radius - margin, clientY));
  stickEl.classList.add('dynamic-active');
  stickEl.style.setProperty('left', x.toFixed(1) + 'px', 'important');
  stickEl.style.setProperty('top', y.toFixed(1) + 'px', 'important');
  stickEl.style.setProperty('right', 'auto', 'important');
  stickEl.style.setProperty('bottom', 'auto', 'important');
}
function initMobileControls() {
  if (!mobile.enabled || !moveStickEl || !aimStickEl) {
    setMobileControlsVisible(false);
    return;
  }

  const onStart = (kind, e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;

    if (kind === 'move' && mobile.moveId === null) {
      if (game.dynamicSticksEnabled) placeStickAt('move', touch.clientX, touch.clientY);
      mobile.moveId = touch.identifier;
      updateMobileStick('move', touch.clientX, touch.clientY);
    }
    if (kind === 'aim' && mobile.aimId === null) {
      if (game.dynamicSticksEnabled) placeStickAt('aim', touch.clientX, touch.clientY);
      mobile.aimId = touch.identifier;
      updateMobileStick('aim', touch.clientX, touch.clientY);
    }
  };

  moveStickEl.addEventListener('touchstart', (e) => onStart('move', e), { passive: false });
  aimStickEl.addEventListener('touchstart', (e) => onStart('aim', e), { passive: false });

  const onGlobalStart = (e) => {
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    const isMove = touch.clientX >= window.innerWidth * 0.5;
    const kind = isMove ? 'move' : 'aim';
    if (!canUseDynamicStickStart(kind, e.target)) return;
    if (kind === 'move') mobile.moveId = touch.identifier;
    else mobile.aimId = touch.identifier;
    placeStickAt(kind, touch.clientX, touch.clientY);
    updateMobileStick(kind, touch.clientX, touch.clientY);
    if (kind === 'aim') {
      input.shooting = mobile.aimStrength > 0.2;
      requestImmediateInputSend();
    }
    e.preventDefault();
  };
  window.addEventListener('touchstart', onGlobalStart, { passive: false, capture: true });

  const onMove = (e) => {
    if (mobile.moveId === null && mobile.aimId === null) return;
    const mt = mobile.moveId === null ? null : getTouchById(e.touches, mobile.moveId);
    const at = mobile.aimId === null ? null : getTouchById(e.touches, mobile.aimId);

    if (mt || at) e.preventDefault();
    if (mt) updateMobileStick('move', mt.clientX, mt.clientY);
    if (at) updateMobileStick('aim', at.clientX, at.clientY);
  };

  const onEnd = (e) => {
    let changed = false;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const t = e.changedTouches[i];
      if (mobile.moveId === t.identifier) {
        resetMobileStick('move');
        changed = true;
      }
      if (mobile.aimId === t.identifier) {
        resetMobileStick('aim');
        changed = true;
      }
    }
    if (changed) {
      e.preventDefault();
    }
  };

  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd, { passive: false });
  window.addEventListener('touchcancel', onEnd, { passive: false });

  updateMobileControlsVisibility();
}

initMobileControls();
updateMobileControlsVisibility();

jumpBtnEl?.addEventListener('touchstart', (e) => { e.preventDefault(); queueJump(); }, { passive: false });
jumpBtnEl?.addEventListener('mousedown', (e) => { e.preventDefault(); queueJump(); });

const joinToggleInfoBtn = document.getElementById('join-toggle-info');

function applyMenuButtonGlyph(buttonEl) {
  if (!(buttonEl instanceof HTMLElement)) return;
  const burger = buttonEl.querySelector('.menu-burger');
  const label = buttonEl.querySelector('.menu-label');
  if (burger) burger.textContent = '\u2630';
  if (label) label.textContent = 'Menu';
  buttonEl.setAttribute('aria-label', 'Show menu');
  buttonEl.title = 'Show menu';
}

function setInfoPanelHidden(hidden) {
  infoPanelHidden = Boolean(hidden);
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
  if (infoPanelEl) infoPanelEl.classList.toggle('is-hidden', infoPanelHidden);

  applyMenuButtonGlyph(toggleInfoBtn);
  applyMenuButtonGlyph(joinToggleInfoBtn);

  if (toggleInfoBtn) {
    toggleInfoBtn.classList.toggle('hidden', !infoPanelHidden || overlayOpen);
  }
  if (joinToggleInfoBtn) {
    joinToggleInfoBtn.classList.toggle('hidden', !overlayOpen || !infoPanelHidden);
  }

  if (devConsoleToggleBtn) {
    devConsoleToggleBtn.classList.toggle('hidden', !mobile.enabled || overlayOpen || !infoPanelHidden);
  }

  updateHudVisibility(overlayOpen);
  localStorage.setItem('cw:infoPanelHidden', infoPanelHidden ? '1' : '0');
}

if (toggleInfoBtn) {
  toggleInfoBtn.addEventListener('click', () => {
    setInfoPanelHidden(!infoPanelHidden);
  });
}

if (joinToggleInfoBtn) {
  joinToggleInfoBtn.addEventListener('click', () => {
    setInfoPanelHidden(!infoPanelHidden);
  });
}

if (infoPanelCloseBtn) {
  infoPanelCloseBtn.addEventListener('click', () => {
    setInfoPanelHidden(true);
  });
}

setInfoPanelHidden(infoPanelHidden);

function getPlayerVariant(id) {
  return PLAYER_VARIANTS.find((x) => x.id === id) || PLAYER_VARIANTS[0];
}

function sanitizePlayerClass(id) {
  const key = (id || '').toString().trim();
  return getPlayerVariant(key).id;
}

function drawCharacterPreview(previewCanvas, variant) {
  const c = previewCanvas;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;

  const sprite = sprites.players[variant.id];
  const fw = Math.max(8, Number(variant.frameW) || 32);
  const fh = Math.max(8, Number(variant.frameH) || 48);
  const scale = Math.max(0.5, Number(variant.scale) || 1);
  const frameCount = sprite?.naturalWidth ? Math.max(1, Math.floor(sprite.naturalWidth / fw)) : 1;
  const idleFrame = Math.max(0, Math.min(frameCount - 1, Number(variant.idleFrame) || 1));

  if (!(sprite?.complete && sprite.naturalWidth >= fw && sprite.naturalHeight >= fh)) {
    g.fillStyle = variant.accent;
    g.beginPath();
    g.arc(c.width / 2, c.height / 2, 12, 0, Math.PI * 2);
    g.fill();
    return;
  }

  const dw = fw * scale;
  const dh = fh * scale;
  const dx = Math.round((c.width - dw) / 2);
  const dy = Math.round(c.height - dh - 1);
  g.drawImage(sprite, idleFrame * fw, (variant.rows?.down || 0) * fh, fw, fh, dx, dy, dw, dh);

  g.fillStyle = variant.accent;
  g.fillRect(c.width - 14, 4, 10, 3);
}
function renderCharacterPicker() {
  if (!characterSelectEl) return;
  characterSelectEl.innerHTML = '';
  selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);

  for (const variant of PLAYER_VARIANTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'char-option' + (variant.id === selectedPlayerClass ? ' active' : '');
    btn.dataset.classId = variant.id;

    const preview = document.createElement('canvas');
    preview.width = 48;
    preview.height = 52;
    preview.className = 'char-preview';
    drawCharacterPreview(preview, variant);

    const label = document.createElement('span');
    label.className = 'char-label';
    label.textContent = variant.name;

    btn.appendChild(preview);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      selectedPlayerClass = variant.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      renderCharacterPicker();
    });
    characterSelectEl.appendChild(btn);
  }
}


const storedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
if (nameInput && storedNickname && storedNickname.trim() && !game.playerAuth?.player) {
  nameInput.value = storedNickname.trim().slice(0, 18);
}
if (!game.playerAuth?.player) {
  void updateNicknameStatus(nameInput?.value || '');
}
selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);
renderCharacterPicker();

applyPresetToUi('normal');
applyRoomSync(configFromSyncUi());

syncPresetEl?.addEventListener('change', () => {
  const key = syncPresetEl.value;
  if (key === 'custom') return;
  applyPresetToUi(key);
  applyRoomSync(configFromSyncUi());
});

for (const el of [syncTickrateEl, syncStateRateEl, syncRenderDelayEl, syncMaxExtrapolationEl, syncEntityInterpEl, syncBulletCorrectionEl, syncInputRateEl]) {
  el?.addEventListener('change', () => {
    if (syncPresetEl) syncPresetEl.value = 'custom';
    applyRoomSync(configFromSyncUi());
  });
}

async function sendJoinRequest(roomCode, joinSync = null, options = {}) {
  const mode = joinSync ? 'create' : 'join';
  const skipRouting = options?.skipRouting === true;
  const source = options?.source || 'menu';
  if (typeof window.cwSetPendingJoinAnalytics === 'function') {
    window.cwSetPendingJoinAnalytics(mode, roomCode, source);
  }
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal(mode === 'create' ? 'create_room_attempt' : 'join_room_attempt', {
      source,
      room_code: String(roomCode || '').trim().toUpperCase() || 'AUTO',
      sync_preset: joinSync ? String(syncPresetEl?.value || 'custom') : 'none',
    });
    window.cwTrackMetrikaGoal('game_start_attempt', {
      mode,
      source,
      room_code: String(roomCode || '').trim().toUpperCase() || 'AUTO',
    });
  }
  clearJoinFeedback();
  if (!skipRouting) {
    try {
      const route = await resolveRoomRoute(mode, roomCode);
      if (mode === 'join' && route?.found && route?.room?.isFull) {
        const message = `Room ${route.room.code} is full (${route.room.players}/${route.room.maxPlayers}).`;
        statusEl.textContent = message;
        setJoinFeedback(message);
        joinOverlay.style.display = 'grid';
        joinOverlay.classList.remove('death-mode');
        setDeathCinematicActive(false);
        updateMobileControlsVisibility();
        return;
      }
      const workerOrigin = normalizeOrigin(route?.target?.publicBaseUrl || APP_ORIGIN);
      await connectGameSocket(workerOrigin);
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to resolve room route.';
      setJoinFeedback(err.message || 'Failed to resolve room route.');
      return;
    }
  } else {
    try {
      await connectGameSocket(currentWorkerOrigin || APP_ORIGIN);
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to connect to game server.';
      setJoinFeedback(err.message || 'Failed to connect to game server.');
      return;
    }
  }
  if (ws.readyState !== WebSocket.OPEN) return;
  const name = (game.playerAuth?.player?.nickname || nameInput.value.trim() || 'Fighter').trim();
  localStorage.setItem(NICKNAME_STORAGE_KEY, name);
  if (authLoginNicknameEl && !authLoginNicknameEl.value) authLoginNicknameEl.value = name;
  if (authRegisterNicknameEl && !authRegisterNicknameEl.value) authRegisterNicknameEl.value = name;
  waitingForFirstState = true;
  resetNetStats();
  waitingForFirstStateSince = performance.now();
  sendJson({
    type: 'join',
    name,
    playerClass: selectedPlayerClass,
    roomCode,
    sync: joinSync || undefined,
  });
  joinOverlay.style.display = 'none';
  joinOverlay.classList.remove('death-mode');
  setDeathCinematicActive(false);
  updateMobileControlsVisibility();
}


async function copyRoomCodeToClipboard(roomCode, { silent = false } = {}) {
  const code = String(roomCode || '').trim();
  if (!code) return false;
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    if (!silent) statusEl.textContent = `Room code: ${code} (clipboard unavailable)`;
    return false;
  }
  try {
    await navigator.clipboard.writeText(code);
    if (!silent) statusEl.textContent = `Room code copied: ${code}`;
    return true;
  } catch {
    if (!silent) statusEl.textContent = `Room code: ${code} (click Room to copy)`;
    return false;
  }
}

if (roomMetaEl) { roomMetaEl.style.cursor = 'pointer'; roomMetaEl.title = 'Click to copy room code'; }
roomMetaEl?.addEventListener('click', () => {
  if (!game.roomCode) return;
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('room_code_copy', { room_code: game.roomCode });
  }
  copyRoomCodeToClipboard(game.roomCode, { silent: false });
});
function renderPresence(presence) {
  if (!presenceMetaEl) return;
  const online = Number(presence?.online) || 0;
  const inGame = Number(presence?.inGame) || 0;
  const inMenu = Number(presence?.inMenu) || 0;
  const hasRegistered = Number.isFinite(Number(presence?.registered));
  const registered = hasRegistered ? Math.max(0, Number(presence?.registered) || 0) : null;
  const renderCount = (value) => {
    if (value === null) return '<span class="presence-count">--</span>';
    const cls = value > 0 ? 'presence-count hot' : 'presence-count';
    return `<span class="${cls}">${value}</span>`;
  };
  presenceMetaEl.innerHTML = `Online: ${renderCount(online)} | In game: ${renderCount(inGame)} | In menu: ${renderCount(inMenu)} | Registered: ${renderCount(registered)}`;
}

function renderRoomsList(rooms) {
  if (!roomsListEl) return;

  if (!rooms.length) {
    roomsListEl.textContent = 'No active rooms yet.';
    return;
  }

  roomsListEl.innerHTML = '';
  for (const room of rooms) {
    const row = document.createElement('div');
    row.className = 'room-row';

    const code = document.createElement('div');
    code.className = 'room-code';
    code.textContent = room.code;

    const meta = document.createElement('div');
    meta.className = 'room-meta';
    meta.textContent = `${room.players}/${room.maxPlayers}`;

    const joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.className = 'room-join';
    joinBtn.textContent = 'Join';
    joinBtn.disabled = room.players >= room.maxPlayers;
    joinBtn.addEventListener('click', () => {
      roomCodeInput.value = room.code;
      joinMode = 'join';
      if (typeof window.cwTrackMetrikaGoal === 'function') {
        window.cwTrackMetrikaGoal('room_search_result_click', {
          room_code: room.code,
          players: Number(room.players) || 0,
        });
      }
      void sendJoinRequest(room.code, null, { source: 'rooms_list' });
    });

    row.appendChild(code);
    row.appendChild(meta);
    row.appendChild(joinBtn);
    roomsListEl.appendChild(row);
  }
}

async function requestRoomsList() {
  if (!roomsListEl) return;
  try {
    const res = await fetch('/api/rooms', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (payload?.isShuttingDown) {
      statusEl.textContent = 'Server restarting. New rooms are temporarily unavailable.';
    }
    renderPresence(payload.presence);
    renderRoomsList(Array.isArray(payload.rooms) ? payload.rooms : []);
  } catch {
    if (presenceMetaEl) presenceMetaEl.textContent = 'Online: -- | In game: -- | In menu: -- | Registered: --';
    roomsListEl.textContent = 'Failed to load rooms.';
  }
}


function updateRecordsPager() {
  if (recordsPageEl) recordsPageEl.textContent = `Page ${recordsUi.page}/${recordsUi.totalPages}`;
  if (recordsTotalEl) recordsTotalEl.textContent = `(Total: ${recordsUi.total})`;
  if (recordsPrevBtn) recordsPrevBtn.disabled = recordsUi.page <= 1;
  if (recordsNextBtn) recordsNextBtn.disabled = recordsUi.page >= recordsUi.totalPages;
}

function buildReplayShareUrl(recordId, startSec = 0) {
  const id = Math.max(0, Number(recordId) || 0);
  const at = Math.max(0, Number(startSec) || 0);
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  url.searchParams.delete('mode');
  url.searchParams.delete('routed');
  if (id > 0) url.searchParams.set('replay', String(id));
  else url.searchParams.delete('replay');
  if (at > 0) url.searchParams.set('replayAt', String(at));
  else url.searchParams.delete('replayAt');
  url.searchParams.delete('t');
  return url.toString();
}

function formatReplayClock(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatReplayBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function describeReplayLoadProgress(info) {
  const received = Math.max(0, Number(info?.received) || 0);
  const total = Math.max(0, Number(info?.total) || 0);
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((received / total) * 100))) : null;
  if (total > 0) return `${formatReplayBytes(received)} / ${formatReplayBytes(total)}${percent !== null ? ` (${percent}%)` : ''}`;
  if (received > 0) return `${formatReplayBytes(received)} loaded`;
  return 'Preparing replay data...';
}

function showReplayLoadOverlay(label, meta = 'Preparing replay data...') {
  if (replayLoadLabelEl) replayLoadLabelEl.textContent = label || 'Loading replay...';
  if (replayLoadMetaEl) replayLoadMetaEl.textContent = meta;
  if (replayLoadFillEl) {
    replayLoadFillEl.style.width = '0%';
    replayLoadFillEl.classList.add('indeterminate');
  }
  if (replayLoadOverlayEl) replayLoadOverlayEl.classList.remove('hidden');
}

function updateReplayLoadOverlay(info) {
  if (replayLoadMetaEl) replayLoadMetaEl.textContent = describeReplayLoadProgress(info);
  if (!replayLoadFillEl) return;
  const total = Math.max(0, Number(info?.total) || 0);
  const received = Math.max(0, Math.min(total || Number.MAX_SAFE_INTEGER, Number(info?.received) || 0));
  if (total > 0) {
    const percent = Math.max(0, Math.min(100, (received / total) * 100));
    replayLoadFillEl.classList.remove('indeterminate');
    replayLoadFillEl.style.width = `${percent.toFixed(1)}%`;
    return;
  }
  replayLoadFillEl.style.width = '35%';
  replayLoadFillEl.classList.add('indeterminate');
}

function hideReplayLoadOverlay() {
  if (replayLoadOverlayEl) replayLoadOverlayEl.classList.add('hidden');
}

function updateRecordReplayStageButton() {
  if (!recordReplayStageLoadBtn) return;
  const shouldShow = recordReplay.recordId > 0 && !recordReplay.loaded;
  recordReplayStageLoadBtn.classList.toggle('hidden', !shouldShow);
  recordReplayStageLoadBtn.disabled = recordReplay.loading;
  recordReplayStageLoadBtn.textContent = recordReplay.loading ? 'Loading...' : 'Load Replay';
}

function stopRecordReplayPlayback(resetElapsed = false) {
  if (recordReplay.rafId) cancelAnimationFrame(recordReplay.rafId);
  recordReplay.rafId = 0;
  recordReplay.playing = false;
  if (resetElapsed) recordReplay.elapsedMs = 0;
  if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = recordReplay.loaded ? 'Play Replay' : 'Load Replay';
  updateRecordReplayButtons();
  updateRecordReplayStageButton();
}

function setRecordReplaySpeed(speed) {
  const nextSpeed = Math.max(1, Number(speed) || 1);
  recordReplay.speed = nextSpeed;
  const buttons = recordReplaySpeedsEl ? Array.from(recordReplaySpeedsEl.querySelectorAll('[data-replay-speed]')) : [];
  for (const btn of buttons) {
    btn.classList.toggle('active', Number(btn.dataset.replaySpeed) === nextSpeed);
  }
  if (recordReplayMetaEl && recordReplay.loaded && !recordReplay.playing) {
    const replayDurationMs = getReplayDurationMs(recordReplay.payload);
    recordReplayMetaEl.textContent = `Ready. ${formatReplayClock(replayDurationMs)} total | speed x${recordReplay.speed}`;
  }
}

function updateRecordReplayButtons() {
  if (recordReplayToggleBtn) recordReplayToggleBtn.textContent = recordReplay.playing ? 'Pause' : 'Continue';
}

function seekRecordReplay(elapsedMs, { keepPaused = null } = {}) {
  const totalMs = getReplayDurationMs(recordReplay.payload);
  recordReplay.elapsedMs = Math.max(0, Math.min(totalMs, Number(elapsedMs) || 0));
  recordReplay.startedAt = performance.now() - (recordReplay.elapsedMs / Math.max(1, recordReplay.speed || 1));
  if (typeof keepPaused === 'boolean') recordReplay.playing = !keepPaused;
  drawRecordReplay();
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
  }
  if (recordReplayProgressEl && !recordReplay.seeking) {
    const value = totalMs > 0 ? Math.round((recordReplay.elapsedMs / totalMs) * 1000) : 0;
    recordReplayProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
  updateRecordReplayButtons();
}

function resizeRecordReplayCanvas() {
  if (!recordReplayCanvasEl) return null;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const cssWidth = Math.max(280, Math.round(recordReplayCanvasEl.clientWidth || 520));
  const cssHeight = Math.max(180, Math.round(cssWidth / 1.625));
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);
  if (recordReplayCanvasEl.width !== width || recordReplayCanvasEl.height !== height) {
    recordReplayCanvasEl.width = width;
    recordReplayCanvasEl.height = height;
  }
  const replayCtx = recordReplayCanvasEl.getContext('2d');
  if (!replayCtx) return null;
  replayCtx.setTransform(1, 0, 0, 1, 0, 0);
  replayCtx.scale(dpr, dpr);
  return { ctx: replayCtx, width: cssWidth, height: cssHeight };
}

function pickReplayFramePair(frames, elapsedMs) {
  if (!Array.isArray(frames) || frames.length <= 0) return { current: null, next: null, alpha: 0 };
  if (frames.length === 1 || elapsedMs <= Number(frames[0]?.t || 0)) return { current: frames[0], next: frames[0], alpha: 0 };
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (Number(frames[mid]?.t || 0) <= elapsedMs) lo = mid;
    else hi = mid - 1;
  }
  const current = frames[lo] || frames[frames.length - 1];
  const next = frames[Math.min(frames.length - 1, lo + 1)] || current;
  const currentT = Number(current?.t || 0);
  const nextT = Math.max(currentT, Number(next?.t || currentT));
  const alpha = nextT > currentT ? Math.max(0, Math.min(1, (elapsedMs - currentT) / (nextT - currentT))) : 0;
  return { current, next, alpha, index: lo };
}

function frameEntityMap(frameList) {
  const map = new Map();
  for (const item of Array.isArray(frameList) ? frameList : []) {
    map.set(item[0], item);
  }
  return map;
}

function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}

function getReplayDurationMs(payload) {
  const secondsMs = Math.max(0, Number(payload?.durationSec || 0) * 1000);
  const lastFrameMs = Math.max(0, Number(payload?.frames?.at(-1)?.t || 0));
  return Math.max(secondsMs, lastFrameMs);
}

function updateReplayGameButtons() {
  if (replayGameToggleBtn) replayGameToggleBtn.textContent = replayGame.playing ? 'Pause' : 'Continue';
}

function seekReplayGame(elapsedMs, { keepPaused = null } = {}) {
  const totalMs = getReplayDurationMs(replayGame.payload);
  replayGame.elapsedMs = Math.max(0, Math.min(totalMs, Number(elapsedMs) || 0));
  replayGame.startedAt = performance.now() - (replayGame.elapsedMs / Math.max(1, replayGame.speed || 1));
  if (typeof keepPaused === 'boolean') replayGame.playing = !keepPaused;
  visuals.enemyPrev = new Map();
  visuals.playerPrev = new Map();
  visuals.rocketPrev = new Map();
  visuals.bulletIds = new Set();
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  visuals.blood = [];
  visuals.bloodPuddles = [];
  visuals.gore = [];
  visuals.hitFx = [];
  visuals.muzzle = [];
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  replayGame.fxFrameIndex = -1;
  tickReplayGame(performance.now());
  updateReplayGameButtons();
}

function makeReplayBulletId(kind, fromEnemy, x, y, matchIndex) {
  return `${kind}:${fromEnemy ? 1 : 0}:${Math.round(x / 8)}:${Math.round(y / 8)}:${matchIndex}`;
}

function isNewReplayBulletTuple(bullet) {
  return Array.isArray(bullet) && (typeof bullet[0] === 'string' || typeof bullet[0] === 'number') && bullet.length >= 8;
}

function buildReplayCollisionTargets(enemiesRaw, playersRaw, bullet) {
  const targets = [];
  const hitPlayers = Boolean(bullet?.[7]);
  if (hitPlayers) {
    for (const player of Array.isArray(playersRaw) ? playersRaw : []) {
      if (!player?.[4]) continue;
      targets.push({
        x: Number(player[1]) || 0,
        y: Number(player[2]) || 0,
        r: 18,
      });
    }
    return targets;
  }

  for (const enemy of Array.isArray(enemiesRaw) ? enemiesRaw : []) {
    targets.push({
      x: Number(enemy[2]) || 0,
      y: Number(enemy[3]) || 0,
      r: Math.max(18, Number(enemy[6]) || 18),
    });
  }
  return targets;
}

function findReplayBulletImpactPoint(bullet, dtSec, enemiesRaw, playersRaw) {
  const x1 = Number(bullet?.[1]) || 0;
  const y1 = Number(bullet?.[2]) || 0;
  const vx = Number(bullet?.[3]) || 0;
  const vy = Number(bullet?.[4]) || 0;
  const bulletRadius = Math.max(2, Number(bullet?.[8]) || 3);
  const x2 = x1 + vx * dtSec;
  const y2 = y1 + vy * dtSec;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segLenSq = dx * dx + dy * dy;
  if (segLenSq <= 0.0001) return { x: x1, y: y1 };

  const targets = buildReplayCollisionTargets(enemiesRaw, playersRaw, bullet);
  let bestT = 1;
  for (const target of targets) {
    const rr = Math.max(4, bulletRadius + Math.max(8, Number(target.r) || 0));
    const tx = Number(target.x) || 0;
    const ty = Number(target.y) || 0;
    const proj = ((tx - x1) * dx + (ty - y1) * dy) / segLenSq;
    const t = Math.max(0, Math.min(1, proj));
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const ddx = tx - px;
    const ddy = ty - py;
    if ((ddx * ddx + ddy * ddy) <= rr * rr) {
      bestT = Math.min(bestT, Math.max(0, t - 0.06));
    }
  }

  return {
    x: x1 + dx * bestT,
    y: y1 + dy * bestT,
  };
}

function interpolateReplayBullets(currentBullets, nextBullets, alpha, currentT, nextT, currentEnemies, nextEnemies, currentPlayers, nextPlayers) {
  const source = Array.isArray(currentBullets) ? currentBullets : [];
  const target = Array.isArray(nextBullets) ? nextBullets : [];
  if (source.some(isNewReplayBulletTuple)) {
    const targetById = new Map();
    for (const nextBullet of target) {
      if (!isNewReplayBulletTuple(nextBullet)) continue;
      targetById.set(String(nextBullet[0]), nextBullet);
    }
    const dtSec = Math.max(0.001, (Math.max(currentT, nextT) - currentT) / 1000 || 0.2);
    return source.map((bullet, index) => {
      if (!isNewReplayBulletTuple(bullet)) {
        return {
          id: `legacy-${index}`,
          ownerId: '',
          x: Number(bullet?.[0]) || 0,
          y: Number(bullet?.[1]) || 0,
          vx: 0,
          vy: 0,
          color: bullet?.[3] ? '#fb7185' : ((bullet?.[2] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc'),
          kind: bullet?.[2] || 'bullet',
          radius: (bullet?.[2] || 'bullet') === 'rocket' ? 6 : 3,
          fromEnemy: Boolean(bullet?.[3]),
        };
      }
      const nextBullet = targetById.get(String(bullet[0])) || bullet;
      const x1 = Number(bullet[1]) || 0;
      const y1 = Number(bullet[2]) || 0;
      let x2 = Number(nextBullet[1]) || 0;
      let y2 = Number(nextBullet[2]) || 0;
      if (targetById.has(String(bullet[0]))) {
        x2 = Number(nextBullet[1]) || x1;
        y2 = Number(nextBullet[2]) || y1;
      } else {
        const impact = findReplayBulletImpactPoint(
          bullet,
          dtSec,
          Array.isArray(currentEnemies) && currentEnemies.length ? currentEnemies : nextEnemies,
          Array.isArray(currentPlayers) && currentPlayers.length ? currentPlayers : nextPlayers,
        );
        x2 = impact.x;
        y2 = impact.y;
      }
      return {
        id: String(bullet[0]),
        ownerId: bullet[9] || '',
        x: lerp(x1, x2, alpha),
        y: lerp(y1, y2, alpha),
        vx: Number(bullet[3]) || 0,
        vy: Number(bullet[4]) || 0,
        color: bullet[5] || (bullet[7] ? '#fb7185' : ((bullet[6] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc')),
        kind: bullet[6] || 'bullet',
        radius: Math.max(2, Number(bullet[8]) || ((bullet[6] || 'bullet') === 'rocket' ? 6 : 3)),
        fromEnemy: Boolean(bullet[7]),
      };
    });
  }
  const used = new Set();
  const out = [];
  const dtSec = Math.max(0.001, (Math.max(currentT, nextT) - currentT) / 1000 || 0.2);

  for (let i = 0; i < source.length; i += 1) {
    const bullet = source[i];
    let bestIndex = -1;
    let bestScore = Infinity;
    for (let j = 0; j < target.length; j += 1) {
      if (used.has(j)) continue;
      const nextBullet = target[j];
      if ((bullet?.[2] || 'bullet') !== (nextBullet?.[2] || 'bullet')) continue;
      if ((bullet?.[3] ? 1 : 0) !== (nextBullet?.[3] ? 1 : 0)) continue;
      const dx = (Number(nextBullet?.[0]) || 0) - (Number(bullet?.[0]) || 0);
      const dy = (Number(nextBullet?.[1]) || 0) - (Number(bullet?.[1]) || 0);
      const score = dx * dx + dy * dy;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = j;
      }
    }

    const nextBullet = bestIndex >= 0 ? target[bestIndex] : null;
    if (bestIndex >= 0) used.add(bestIndex);
    const x1 = Number(bullet?.[0]) || 0;
    const y1 = Number(bullet?.[1]) || 0;
    const x2 = Number(nextBullet?.[0]) || x1;
    const y2 = Number(nextBullet?.[1]) || y1;
    out.push({
      id: makeReplayBulletId(bullet?.[2] || 'bullet', Boolean(bullet?.[3]), x1, y1, bestIndex >= 0 ? bestIndex : i),
      ownerId: '',
      x: lerp(x1, x2, alpha),
      y: lerp(y1, y2, alpha),
      vx: (x2 - x1) / dtSec,
      vy: (y2 - y1) / dtSec,
      color: bullet?.[3] ? '#fb7185' : ((bullet?.[2] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc'),
      kind: bullet?.[2] || 'bullet',
      radius: (bullet?.[2] || 'bullet') === 'rocket' ? 6 : 3,
      fromEnemy: Boolean(bullet?.[3]),
    });
  }

  return out;
}

function updateReplayGameSpeed(speed) {
  const nextSpeed = Math.max(1, Number(speed) || 1);
  replayGame.speed = nextSpeed;
  const buttons = replayGameSpeedsEl ? Array.from(replayGameSpeedsEl.querySelectorAll('[data-replay-game-speed]')) : [];
  for (const btn of buttons) {
    btn.classList.toggle('active', Number(btn.dataset.replayGameSpeed) === nextSpeed);
  }
  if (replayGameMetaEl && replayGame.active) {
    const totalMs = getReplayDurationMs(replayGame.payload);
    replayGameMetaEl.textContent = `Replay ${formatReplayClock(replayGame.elapsedMs)} / ${formatReplayClock(totalMs)} | x${replayGame.speed}`;
  }
}

function buildReplayState(payload, elapsedMs) {
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  const pair = pickReplayFramePair(frames, elapsedMs);
  const { current, next, alpha, index } = pair;
  if (!current) return null;

  const nowMs = Number(payload?.startedAt || Date.now()) + Math.max(0, Number(elapsedMs) || 0);
  const nextPlayers = frameEntityMap(next?.p);
  const nextEnemies = frameEntityMap(next?.e);
  const nextCompanions = frameEntityMap(next?.c);
  const playerList = [];

  for (const player of Array.isArray(current.p) ? current.p : []) {
    const nextPlayer = nextPlayers.get(player[0]) || player;
    const x = lerp(player[1], nextPlayer[1], alpha);
    const y = lerp(player[2], nextPlayer[2], alpha);
    const level = Math.max(1, Math.floor(Number(player[14]) || 1));
    const xpToNext = Math.max(1, Math.floor(Number(player[16]) || 1));
    const aimX = lerp(x, nextPlayer[1], 0.65);
    const aimY = lerp(y, nextPlayer[2], 0.65);
    const skills = (Array.isArray(player[9]) ? player[9] : []).map((skill) => ({
      id: skill[0] || '',
      level: Math.max(0, Number(skill[1]) || 0),
      cooldownMs: Math.max(0, Number(skill[2]) || 0),
      maxCooldownMs: Math.max(0, Number(skill[3]) || 0),
      kind: skill[4] || 'passive',
      rarity: skill[5] || 'common',
      name: skill[6] || skill[0] || 'Skill',
      desc: '',
    }));
    playerList.push({
      id: player[0],
      name: player[0] === payload?.playerId ? (payload?.playerName || 'Replay') : `Player ${String(player[0]).slice(0, 4)}`,
      x,
      y,
      hp: Math.max(0, Number(player[3]) || 0),
      maxHp: Math.max(1, Number(player[17]) || 100),
      alive: Boolean(player[4]),
      score: Math.max(0, Number(player[8]) || 0),
      kills: Math.max(0, Number(player[7]) || 0),
      weaponKey: player[5] || 'pistol',
      weaponLabel: player[5] || 'pistol',
      ammo: null,
      aimX,
      aimY,
      shooting: false,
      damageMul: 1,
      fireRateMul: 1,
      moveSpeedMul: 1,
      pickupRadius: 0,
      hpRegenPerSec: 0,
      moveSpeed: 0,
      shotDamage: 1,
      shotIntervalMs: 170,
      playerClass: player[6] || 'cyber',
      netQuality: 0,
      netPingMs: 0,
      slowUntil: 0,
      dodgeCooldownMs: 0,
      dodgeCharges: Math.max(0, Number(player[10]) || 0),
      dodgeChargesMax: Math.max(1, Number(player[11]) || 1),
      dodgeRechargeMs: Math.max(0, Number(player[12]) || 0),
      dodgeRechargeTotalMs: Math.max(1, Number(player[13]) || 1200),
      dodgeInvulnUntil: 0,
      level,
      xp: Math.max(0, Math.floor(Number(player[15]) || 0)),
      xpToNext,
      pendingSkillChoices: [],
      enemyKills: Math.max(0, Number(player[7]) || 0),
      bossKills: Math.max(0, Math.floor(Number(player[18]) || 0)),
      skills,
    });
  }

  for (const companion of Array.isArray(current.c) ? current.c : []) {
    const nextCompanion = nextCompanions.get(companion[0]) || companion;
    playerList.push({
      id: companion[0],
      name: '',
      x: lerp(companion[1], nextCompanion[1], alpha),
      y: lerp(companion[2], nextCompanion[2], alpha),
      hp: 1,
      maxHp: 1,
      alive: true,
      score: 0,
      kills: 0,
      weaponKey: companion[3] || 'pistol',
      weaponLabel: companion[3] || 'pistol',
      ammo: null,
      aimX: lerp(companion[1], nextCompanion[1], alpha) + 10,
      aimY: lerp(companion[2], nextCompanion[2], alpha),
      shooting: false,
      damageMul: 1,
      fireRateMul: 1,
      moveSpeedMul: 1,
      pickupRadius: 0,
      hpRegenPerSec: 0,
      moveSpeed: 0,
      shotDamage: 1,
      shotIntervalMs: 170,
      playerClass: payload?.playerClass || 'cyber',
      netQuality: 0,
      netPingMs: 0,
      slowUntil: 0,
      dodgeCooldownMs: 0,
      dodgeCharges: 0,
      dodgeChargesMax: 0,
      dodgeRechargeMs: 0,
      dodgeRechargeTotalMs: 1200,
      dodgeInvulnUntil: 0,
      level: 1,
      xp: 0,
      xpToNext: 1,
      pendingSkillChoices: [],
      skills: [],
      isCompanion: true,
      ownerId: companion[4] || '',
    });
  }

  const enemies = (Array.isArray(current.e) ? current.e : []).map((enemy) => {
    const nextEnemy = nextEnemies.get(enemy[0]) || enemy;
    return {
      id: enemy[0],
      type: enemy[1] || 'normal',
      x: lerp(enemy[2], nextEnemy[2], alpha),
      y: lerp(enemy[3], nextEnemy[3], alpha),
      hp: Math.max(0, Number(enemy[4]) || 0),
      maxHp: Math.max(1, Number(enemy[5]) || 1),
      radius: Math.max(18, Number(enemy[6]) || 18),
      spriteScale: enemy[1] === 'boss' ? 1.8 : 1,
    };
  });

  const bullets = interpolateReplayBullets(
    current.b,
    next?.b,
    alpha,
    Number(current?.t || 0),
    Number(next?.t || current?.t || 0),
    current.e,
    next?.e,
    current.p,
    next?.p,
  );

  const drops = (Array.isArray(current.d) ? current.d : []).map((drop, index) => {
    const kind = drop[3] || 'weapon';
    const weaponKey = drop[2] || 'pistol';
    return {
      id: `rd-${index}`,
      x: Number(drop[0]) || 0,
      y: Number(drop[1]) || 0,
      kind,
      weaponKey: kind === 'xp_vacuum' ? null : weaponKey,
      weaponLabel: kind === 'xp_vacuum' ? 'XP Surge' : weaponKey,
      ttlMs: 999999,
      ttlMaxMs: 999999,
    };
  });

  const xpOrbs = (Array.isArray(current.x) ? current.x : []).map((orb, index) => ({
    id: `rx-${index}`,
    x: Number(orb[0]) || 0,
    y: Number(orb[1]) || 0,
    xp: Math.max(1, Number(orb[2]) || 1),
    ttlMs: 999999,
    ttlMaxMs: 999999,
  }));

  const bossPortals = (Array.isArray(current.bp) ? current.bp : []).map((portal, index) => ({
    id: `rp-${index}`,
    x: Number(portal[0]) || 0,
    y: Number(portal[1]) || 0,
    spawnAt: nowMs + Math.max(0, Number(portal[2]) || 0),
    ttlMs: Math.max(0, Number(portal[2]) || 0),
  }));

  return {
    replayFrameIndex: index,
    now: nowMs,
    roomCode: payload?.roomCode || 'REPLAY',
    roomStartedAt: Number(payload?.roomStartedAt || payload?.startedAt || nowMs),
    totalEnemyKills: Math.max(0, Number(current.te) || 0),
    nextBossAtKills: Math.max(50, Math.max(0, Number(current.te) || 0) + 25),
    bossAlive: Boolean(current.ba),
    nextBossSpawnAt: 0,
    roomDifficulty: {
      level: 1 + Math.floor(Math.max(0, Number(elapsedMs) || 0) / 60000),
      hpMul: 1,
      speedMul: 1,
      damageMul: 1,
      attackRateMul: 1,
      spawnIntervalMs: Number(payload?.captureIntervalMs) || 200,
    },
    world: payload?.world || { width: 2400, height: 1400 },
    sync: { tickRate: 45, stateSendHz: 30, netRenderDelayMs: 0 },
    players: playerList,
    bullets,
    enemies,
    bossPortals,
    drops,
    xpOrbs,
    decor: { trees: game.sortedTrees || [] },
  };
}

function stopReplayGame({ showMenu = true } = {}) {
  replayGame.active = false;
  replayGame.recordId = 0;
  replayGame.payload = null;
  replayGame.playing = true;
  replayGame.startedAt = 0;
  replayGame.elapsedMs = 0;
  replayGame.fxFrameIndex = -1;
  replayGame.seeking = false;
  if (replayGameControlsEl) replayGameControlsEl.classList.add('hidden');
  if (replayGameMetaEl) replayGameMetaEl.textContent = 'Replay';
  if (replayGameProgressEl) replayGameProgressEl.value = '0';
  updateReplayGameButtons();
  if (showMenu) {
    clearLocalSessionState();
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
  }
  document.body.classList.remove('replay-game-active');
}

function tickReplayGame(ts) {
  if (!replayGame.active || !replayGame.payload) return;
  if (replayGame.playing) {
    if (!replayGame.startedAt) replayGame.startedAt = ts - (replayGame.elapsedMs / replayGame.speed);
    const totalMs = getReplayDurationMs(replayGame.payload);
    replayGame.elapsedMs = Math.max(0, (ts - replayGame.startedAt) * replayGame.speed);
    if (replayGame.elapsedMs >= totalMs) {
      replayGame.elapsedMs = totalMs;
      replayGame.playing = false;
      updateReplayGameButtons();
    }
  }
  const totalMs = getReplayDurationMs(replayGame.payload);
  const nextState = buildReplayState(replayGame.payload, replayGame.elapsedMs);
  if (nextState) {
    if (nextState.replayFrameIndex !== replayGame.fxFrameIndex) {
      processStateFx(nextState);
      replayGame.fxFrameIndex = nextState.replayFrameIndex;
    }
    game.state = nextState;
    game.world = nextState.world;
    game.roomCode = nextState.roomCode;
    game.roomStartedAt = nextState.roomStartedAt;
    game.totalEnemyKills = nextState.totalEnemyKills;
    game.nextBossAtKills = nextState.nextBossAtKills;
    game.nextBossSpawnAt = nextState.nextBossSpawnAt;
    game.bossAlive = nextState.bossAlive;
    game.roomDifficulty = nextState.roomDifficulty;
    game.sortedTrees = Array.isArray(nextState.decor?.trees) ? nextState.decor.trees.slice().sort((a, b) => a.y - b.y) : [];
    updateScoreboard(nextState.players || []);
    updateStatsPanel((nextState.players || []).find((p) => p.id === game.myId) || (nextState.players || [])[0] || null);
    updateJumpButtonUi((nextState.players || []).find((p) => p.id === game.myId) || null);
    roomMetaEl.textContent = `Replay: ${nextState.roomCode}`;
    weaponMetaEl.textContent = 'Replay mode';
    if (movementMetaEl) movementMetaEl.textContent = 'Controls disabled';
  }
  if (replayGameMetaEl) {
    replayGameMetaEl.textContent = `Replay ${formatReplayClock(replayGame.elapsedMs)} / ${formatReplayClock(totalMs)} | x${replayGame.speed}`;
  }
  if (replayGameProgressEl && !replayGame.seeking) {
    const value = totalMs > 0 ? Math.round((replayGame.elapsedMs / totalMs) * 1000) : 0;
    replayGameProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
}

function startReplayGame(payload, record) {
  if (!payload || !Array.isArray(payload.frames) || payload.frames.length <= 0) return false;
  if (game.myId || game.connected) leaveActiveRoom();
  clearLocalSessionState();
  closeRecordDetailsModal();
  replayGame.active = true;
  replayGame.recordId = Math.max(0, Number(record?.id) || 0);
  replayGame.payload = payload;
  replayGame.playing = true;
  replayGame.startedAt = 0;
  replayGame.elapsedMs = 0;
  replayGame.fxFrameIndex = -1;
  game.connected = false;
  game.myId = payload.playerId || 'replay-player';
  game.roomCode = payload.roomCode || 'REPLAY';
  visuals.enemyPrev = new Map();
  visuals.playerPrev = new Map();
  visuals.rocketPrev = new Map();
  visuals.bulletIds = new Set();
  visuals.blood = [];
  visuals.bloodPuddles = [];
  visuals.gore = [];
  visuals.hitFx = [];
  visuals.muzzle = [];
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  joinOverlay.style.display = 'none';
  document.body.classList.add('replay-game-active');
  if (replayGameControlsEl) replayGameControlsEl.classList.remove('hidden');
  if (replayGameProgressEl) replayGameProgressEl.value = '0';
  updateReplayGameSpeed(replayGame.speed || 1);
  updateReplayGameButtons();
  updateMobileControlsVisibility();
  tickReplayGame(performance.now());
  return true;
}

function startReplayGameAt(payload, record, startSec = 0) {
  const started = startReplayGame(payload, record);
  if (!started) return false;
  const atMs = Math.max(0, Math.round((Number(startSec) || 0) * 1000));
  if (atMs > 0) {
    replayGame.playing = false;
    seekReplayGame(atMs, { keepPaused: true });
  }
  return true;
}

async function maybeStartReplayFromUrl() {
  const recordId = Math.max(0, Number(pendingReplayRecordId) || 0);
  const startSec = Math.max(0, Number(pendingReplayStartSec) || 0);
  if (recordId <= 0) return;
  pendingReplayRecordId = 0;
  pendingReplayStartSec = 0;
  try {
    statusEl.textContent = 'Loading replay...';
    showReplayLoadOverlay(`Loading replay #${recordId}`, 'Preparing replay data...');
    const payload = await fetchReplayPayloadByRecordId(recordId, {
      onProgress(info) {
        const text = describeReplayLoadProgress(info);
        updateReplayLoadOverlay(info);
        statusEl.textContent = `Loading replay... ${text}`;
      },
    });
    const replay = payload?.replay || null;
    const record = payload?.record || { id: recordId };
    if (!replay || !Array.isArray(replay.frames) || replay.frames.length <= 0) {
      throw new Error('Replay not found.');
    }
    startReplayGameAt(replay, record, startSec);
    statusEl.textContent = `Replay loaded: ${record?.name || 'Record'} #${recordId}${startSec > 0 ? ` from ${startSec}s` : ''}`;
  } catch (err) {
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
    statusEl.textContent = err?.message || 'Failed to load replay.';
  } finally {
    hideReplayLoadOverlay();
  }
}

function drawRecordReplay() {
  if (!recordReplayCanvasEl) return;
  const sized = resizeRecordReplayCanvas();
  if (!sized) return;
  const replayCtx = sized.ctx;
  const width = sized.width;
  const height = sized.height;
  replayCtx.clearRect(0, 0, width, height);
  replayCtx.fillStyle = '#08131d';
  replayCtx.fillRect(0, 0, width, height);

  const payload = recordReplay.payload;
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  const world = payload?.world || { width: 2400, height: 1400 };
  const worldW = Math.max(1, Number(world.width) || 2400);
  const worldH = Math.max(1, Number(world.height) || 1400);
  const scale = Math.min(width / worldW, height / worldH);
  const offsetX = (width - worldW * scale) * 0.5;
  const offsetY = (height - worldH * scale) * 0.5;
  const toScreenX = (x) => offsetX + (Number(x) || 0) * scale;
  const toScreenY = (y) => offsetY + (Number(y) || 0) * scale;

  replayCtx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  replayCtx.lineWidth = 1;
  const gridStep = 240;
  for (let x = 0; x <= worldW; x += gridStep) {
    const sx = toScreenX(x);
    replayCtx.beginPath();
    replayCtx.moveTo(sx, offsetY);
    replayCtx.lineTo(sx, offsetY + worldH * scale);
    replayCtx.stroke();
  }
  for (let y = 0; y <= worldH; y += gridStep) {
    const sy = toScreenY(y);
    replayCtx.beginPath();
    replayCtx.moveTo(offsetX, sy);
    replayCtx.lineTo(offsetX + worldW * scale, sy);
    replayCtx.stroke();
  }

  const { current, next, alpha } = pickReplayFramePair(frames, recordReplay.elapsedMs);
  if (!current) {
    replayCtx.fillStyle = '#94a3b8';
    replayCtx.font = '14px Segoe UI';
    replayCtx.fillText('Replay has no frames.', 18, 24);
    return;
  }

  const nextPlayers = frameEntityMap(next?.p);
  const nextEnemies = frameEntityMap(next?.e);
  const nextCompanions = frameEntityMap(next?.c);
  const previewBullets = interpolateReplayBullets(
    current.b,
    next?.b,
    alpha,
    Number(current?.t || 0),
    Number(next?.t || current?.t || 0),
    current.e,
    next?.e,
    current.p,
    next?.p,
  );

  for (const portal of Array.isArray(current.bp) ? current.bp : []) {
    const sx = toScreenX(portal[0]);
    const sy = toScreenY(portal[1]);
    replayCtx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 16, 0, Math.PI * 2);
    replayCtx.fill();
    replayCtx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    replayCtx.stroke();
  }

  for (const drop of Array.isArray(current.d) ? current.d : []) {
    const sx = toScreenX(drop[0]);
    const sy = toScreenY(drop[1]);
    replayCtx.fillStyle = '#f59e0b';
    replayCtx.fillRect(sx - 4, sy - 4, 8, 8);
  }

  for (const orb of Array.isArray(current.x) ? current.x : []) {
    const sx = toScreenX(orb[0]);
    const sy = toScreenY(orb[1]);
    replayCtx.fillStyle = '#60a5fa';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const bullet of previewBullets) {
    const sx = toScreenX(bullet.x);
    const sy = toScreenY(bullet.y);
    replayCtx.fillStyle = bullet.fromEnemy ? '#fb7185' : (bullet.kind === 'rocket' ? '#f59e0b' : '#f8fafc');
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, bullet.kind === 'rocket' ? 4 : 2.2, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const enemy of Array.isArray(current.e) ? current.e : []) {
    const nextEnemy = nextEnemies.get(enemy[0]) || enemy;
    const sx = toScreenX(lerp(enemy[2], nextEnemy[2], alpha));
    const sy = toScreenY(lerp(enemy[3], nextEnemy[3], alpha));
    const radius = Math.max(5, (Number(enemy[6]) || 18) * scale * 0.55);
    replayCtx.fillStyle = enemy[1] === 'boss' ? '#dc2626' : (enemy[1] === 'ranged' ? '#fb7185' : (enemy[1] === 'charger' ? '#f97316' : '#ef4444'));
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, radius, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const companion of Array.isArray(current.c) ? current.c : []) {
    const nextCompanion = nextCompanions.get(companion[0]) || companion;
    const sx = toScreenX(lerp(companion[1], nextCompanion[1], alpha));
    const sy = toScreenY(lerp(companion[2], nextCompanion[2], alpha));
    replayCtx.fillStyle = '#22c55e';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 5.5, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const player of Array.isArray(current.p) ? current.p : []) {
    const nextPlayer = nextPlayers.get(player[0]) || player;
    const sx = toScreenX(lerp(player[1], nextPlayer[1], alpha));
    const sy = toScreenY(lerp(player[2], nextPlayer[2], alpha));
    const isTracked = player[0] === payload?.playerId;
    replayCtx.fillStyle = isTracked ? '#22d3ee' : '#e2e8f0';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, isTracked ? 8 : 6, 0, Math.PI * 2);
    replayCtx.fill();
    if (!player[4]) {
      replayCtx.strokeStyle = 'rgba(248, 113, 113, 0.95)';
      replayCtx.lineWidth = 2;
      replayCtx.beginPath();
      replayCtx.moveTo(sx - 7, sy - 7);
      replayCtx.lineTo(sx + 7, sy + 7);
      replayCtx.moveTo(sx + 7, sy - 7);
      replayCtx.lineTo(sx - 7, sy + 7);
      replayCtx.stroke();
    }
  }

  replayCtx.fillStyle = '#e2e8f0';
  replayCtx.font = '12px Segoe UI';
  replayCtx.fillText(`Time ${formatReplayClock(recordReplay.elapsedMs)}`, 14, 20);
  replayCtx.fillText(`Kills ${Math.max(0, Number(current.te) || 0)} | Bosses ${Math.max(0, Number(current.tb) || 0)}`, 14, 38);
  if (payload?.truncated) replayCtx.fillText('Truncated', width - 72, 20);
}

function tickRecordReplayFrame(ts) {
  if (!recordReplay.playing || !recordReplay.payload) return;
  if (!recordReplay.startedAt) recordReplay.startedAt = ts - (recordReplay.elapsedMs / recordReplay.speed);
  const totalMs = getReplayDurationMs(recordReplay.payload);
  recordReplay.elapsedMs = Math.max(0, (ts - recordReplay.startedAt) * recordReplay.speed);
  if (recordReplay.elapsedMs >= totalMs) {
    recordReplay.elapsedMs = totalMs;
    stopRecordReplayPlayback(false);
  }
  drawRecordReplay();
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
  }
  if (recordReplayProgressEl && !recordReplay.seeking) {
    const value = totalMs > 0 ? Math.round((recordReplay.elapsedMs / totalMs) * 1000) : 0;
    recordReplayProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
  if (recordReplay.playing) {
    recordReplay.rafId = requestAnimationFrame(tickRecordReplayFrame);
  }
}

function startRecordReplayPlayback() {
  if (!recordReplay.payload) return;
  if (recordReplay.elapsedMs >= getReplayDurationMs(recordReplay.payload)) {
    recordReplay.elapsedMs = 0;
  }
  recordReplay.playing = true;
  recordReplay.startedAt = 0;
  if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Pause Replay';
  updateRecordReplayButtons();
  recordReplay.rafId = requestAnimationFrame(tickRecordReplayFrame);
}

function resetRecordReplayUi(recordId = 0) {
  stopRecordReplayPlayback(true);
  recordReplay.recordId = Math.max(0, Number(recordId) || 0);
  recordReplay.record = null;
  recordReplay.loading = false;
  recordReplay.loaded = false;
  recordReplay.payload = null;
  recordReplay.startedAt = 0;
  recordReplay.seeking = false;
  if (recordReplayPanelEl) recordReplayPanelEl.classList.toggle('hidden', recordReplay.recordId <= 0);
  if (recordReplaySpeedsEl) recordReplaySpeedsEl.classList.add('hidden');
  if (recordReplayControlsEl) recordReplayControlsEl.classList.add('hidden');
  if (recordReplayProgressEl) recordReplayProgressEl.value = '0';
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = recordReplay.recordId > 0
      ? 'Replay is available on demand.'
      : 'Replay is unavailable for this record.';
  }
  drawRecordReplay();
  setRecordReplaySpeed(1);
  updateRecordReplayButtons();
  updateRecordReplayStageButton();
}

async function loadRecordReplay(recordId, options = {}) {
  const id = Math.max(0, Number(recordId) || 0);
  if (id <= 0) return false;
  const autoPlay = options?.autoPlay === true;
  recordReplay.loading = true;
  if (recordReplayPlayBtn) {
    recordReplayPlayBtn.disabled = true;
    recordReplayPlayBtn.textContent = 'Loading...';
  }
  if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Loading replay data...';
  showReplayLoadOverlay(`Loading replay #${id}`, 'Preparing replay data...');
  updateRecordReplayStageButton();
  try {
    const payload = await fetchReplayPayloadByRecordId(id, {
      onProgress(info) {
        const text = describeReplayLoadProgress(info);
        updateReplayLoadOverlay(info);
        if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Loading replay data... ${text}`;
      },
    });
    recordReplay.payload = payload?.replay || null;
    recordReplay.loaded = Boolean(recordReplay.payload && Array.isArray(recordReplay.payload.frames) && recordReplay.payload.frames.length > 0);
    recordReplay.elapsedMs = 0;
    drawRecordReplay();
    if (!recordReplay.loaded) throw new Error('empty replay');
    if (recordReplaySpeedsEl) recordReplaySpeedsEl.classList.remove('hidden');
    if (recordReplayControlsEl) recordReplayControlsEl.classList.remove('hidden');
    if (recordReplayProgressEl) recordReplayProgressEl.value = '0';
    const totalMs = getReplayDurationMs(recordReplay.payload);
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Replay loaded. ${formatReplayClock(totalMs)} total | speed x${recordReplay.speed}`;
    if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Play Replay';
    updateRecordReplayButtons();
    updateRecordReplayStageButton();
    if (autoPlay) startRecordReplayPlayback();
    return true;
  } catch {
    recordReplay.payload = null;
    recordReplay.loaded = false;
    if (recordReplayControlsEl) recordReplayControlsEl.classList.add('hidden');
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Replay is not available for this record.';
    if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Replay Unavailable';
    updateRecordReplayButtons();
    updateRecordReplayStageButton();
    return false;
  } finally {
    recordReplay.loading = false;
    hideReplayLoadOverlay();
    if (recordReplayPlayBtn) recordReplayPlayBtn.disabled = false;
    updateRecordReplayStageButton();
  }
}

async function fetchReplayPayloadByRecordId(recordId, options = {}) {
  const id = Math.max(0, Number(recordId) || 0);
  if (id <= 0) return null;
  const onProgress = typeof options?.onProgress === 'function' ? options.onProgress : null;
  const res = await fetch(`/api/records/${id}/replay`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Math.max(0, Number(res.headers.get('content-length')) || 0);
  if (!res.body || typeof res.body.getReader !== 'function') {
    onProgress?.({ received: total, total, done: true });
    return res.json();
  }

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  onProgress?.({ received, total, done: false });
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value?.length) {
      chunks.push(value);
      received += value.length;
      onProgress?.({ received, total, done: false });
    }
  }
  onProgress?.({ received: total > 0 ? total : received, total, done: true });

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

async function copyReplayLink(recordId) {
  const id = Math.max(0, Number(recordId) || 0);
  if (id <= 0 || !navigator.clipboard?.writeText) {
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Replay link is unavailable.';
    return false;
  }
  const startSec = Math.max(0, Math.floor((Number(recordReplay.elapsedMs) || 0) / 1000));
  try {
    await navigator.clipboard.writeText(buildReplayShareUrl(id, startSec));
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Replay link copied${startSec > 0 ? ` from ${startSec}s` : ''}.`;
    return true;
  } catch {
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Failed to copy replay link.';
    return false;
  }
}

function closeRecordDetailsModal() {
  if (!recordDetailsModalEl) return;
  resetRecordReplayUi(0);
  recordDetailsModalEl.classList.add('hidden');
}

function formatRecordDateTime(ts) {
  const value = Math.max(0, Number(ts) || 0);
  if (value <= 0) return '--';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

function renderRunDetailsHtml(details) {
  if (!details || typeof details !== 'object') {
    return '<div class="record-details-empty">No detailed run stats for this record.</div>';
  }

  const shotIntervalMs = Math.max(1, Number(details.shotIntervalMs) || 1);
  const fireRate = (1000 / shotIntervalMs).toFixed(2);
  const list = [
    ['Character', details.playerClass || '--'],
    ['Level', Math.max(1, Number(details.level) || 1)],
    ['Monsters killed', Math.max(0, Number(details.enemyKills) || 0)],
    ['Bosses killed', Math.max(0, Number(details.bossKills) || 0)],
    ['XP', `${Math.max(0, Number(details.xp) || 0)} / ${Math.max(1, Number(details.xpToNext) || 1)}`],
    ['HP', `${Math.max(0, Number(details.hp) || 0)} / ${Math.max(1, Number(details.maxHp) || 1)}`],
    ['Weapon', details.weaponLabel || details.weaponKey || '--'],
    ['Damage / shot', Math.max(1, Number(details.shotDamage) || 1)],
    ['Fire rate', `${fireRate} shots/s`],
    ['Move speed', Math.max(0, Math.round(Number(details.moveSpeed) || 0))],
    ['Pickup radius', Math.max(0, Math.round(Number(details.pickupRadius) || 0))],
    ['HP regen', `${Math.max(0, Number(details.hpRegenPerSec) || 0).toFixed(2)}/s`],
    ['Jump charges', Math.max(1, Number(details.dodgeChargesMax) || 1)],
    ['Damage multiplier', `x${Math.max(0.1, Number(details.damageMul) || 1).toFixed(2)}`],
    ['Fire-rate multiplier', `x${Math.max(0.1, Number(details.fireRateMul) || 1).toFixed(2)}`],
    ['Speed multiplier', `x${Math.max(0.1, Number(details.moveSpeedMul) || 1).toFixed(2)}`],
    ['Room kills at death', Math.max(0, Number(details.totalEnemyKills) || 0)],
    ['Bosses killed in room', Math.max(0, Number(details.totalBossKills) || 0)],
    ['Survived', `${Math.max(1, Number(details.survivedSec) || 1)}s`],
  ];

  const rows = list.map(([k, v]) => `<div class="rd-row"><span>${k}</span><b>${v}</b></div>`).join('');
  const skills = Array.isArray(details.skills) ? details.skills : [];
  const skillsHtml = skills.length
    ? `<div class="rd-skills">${skills.map((s) => `<span class="rd-skill">${s.name || s.id} Lv${Math.max(1, Number(s.level) || 1)}</span>`).join('')}</div>`
    : '<div class="record-details-empty">No skills picked.</div>';

  return `<div class="rd-grid">${rows}</div><div class="rd-subtitle">Skills</div>${skillsHtml}`;
}

function openRecordDetailsModal(record, rankLabel) {
  if (!recordDetailsModalEl || !recordDetailsTitleEl || !recordDetailsBodyEl) return;
  const name = record?.name || 'Unknown';
  const kills = Number(record?.kills) || 0;
  const score = Number(record?.score) || 0;
  const durationSec = Number(record?.durationSec) || 0;
  const roomCode = (record?.roomCode || '-').toString();
  const playedAt = formatRecordDateTime(record?.at);

  recordDetailsTitleEl.textContent = `${rankLabel} ${name} | ${kills} kills | ${score} pts`;
  const summary = `<div class="rd-summary">${playedAt} | Room ${roomCode} | ${durationSec}s</div>`;
  recordDetailsBodyEl.innerHTML = summary + renderRunDetailsHtml(record?.runDetails || null);
  resetRecordReplayUi(record?.id);
  recordReplay.record = record || null;
  recordDetailsModalEl.classList.remove('hidden');
}

function renderRecordsList(items, page = 1, totalPages = 1, total = 0) {
  if (!recordsListEl) return;
  recordsUi.page = page;
  recordsUi.totalPages = totalPages;
  recordsUi.total = total;
  updateRecordsPager();

  if (!items.length) {
    recordsListEl.textContent = 'No records yet.';
    return;
  }

  const rankOffset = (recordsUi.page - 1) * recordsUi.pageSize;
  recordsListEl.innerHTML = '';
  for (let i = 0; i < items.length; i += 1) {
    const r = items[i];
    const rankNumber = rankOffset + i + 1;
    const rankLabel = `#${rankNumber}`;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'record-row';

    const rank = document.createElement('div');
    rank.className = 'record-rank';
    rank.textContent = rankLabel;

    const name = document.createElement('div');
    name.className = 'record-name';
    const attempts = Math.max(1, Number(r.attempts) || 1);
    name.textContent = (r.name || 'Unknown') + ' [' + attempts + ']';

    const kills = Number(r.kills) || 0;
    const score = Number(r.score) || 0;

    const meta = document.createElement('div');
    meta.className = 'record-meta';
    meta.textContent = `${kills} kills / ${score} pts`;

    row.addEventListener('click', () => {
      openRecordDetailsModal(r, rankLabel);
    });

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(meta);
    recordsListEl.appendChild(row);
  }
}

recordDetailsCloseBtn?.addEventListener('click', () => {
  closeRecordDetailsModal();
});

recordDetailsModalEl?.addEventListener('click', (e) => {
  if (e.target === recordDetailsModalEl) closeRecordDetailsModal();
});
recordReplayPlayBtn?.addEventListener('click', async () => {
  if (recordReplay.loading) return;
  if (!recordReplay.loaded) {
    await loadRecordReplay(recordReplay.recordId, { autoPlay: true });
    return;
  }
  if (recordReplay.playing) {
    stopRecordReplayPlayback(false);
    drawRecordReplay();
    if (recordReplayMetaEl) {
      const totalMs = getReplayDurationMs(recordReplay.payload);
      recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
    }
    return;
  }
  startRecordReplayPlayback();
});
recordReplayInGameBtn?.addEventListener('click', async () => {
  if (recordReplay.loading) return;
  if (!recordReplay.loaded) {
    const ok = await loadRecordReplay(recordReplay.recordId);
    if (!ok) return;
  }
  startReplayGame(recordReplay.payload, recordReplay.record);
});
recordReplayCopyLinkBtn?.addEventListener('click', async () => {
  await copyReplayLink(recordReplay.recordId);
});
recordReplayStageLoadBtn?.addEventListener('click', async () => {
  if (recordReplay.loading || recordReplay.loaded) return;
  await loadRecordReplay(recordReplay.recordId, { autoPlay: true });
});
recordReplaySpeedsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-replay-speed]');
  if (!btn) return;
  const nextSpeed = Math.max(1, Number(btn.dataset.replaySpeed) || 1);
  const prevElapsed = recordReplay.elapsedMs;
  setRecordReplaySpeed(nextSpeed);
  if (recordReplay.playing) {
    const nowTs = performance.now();
    recordReplay.startedAt = nowTs - (prevElapsed / nextSpeed);
  } else {
    drawRecordReplay();
  }
});
recordReplayStartBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(0, { keepPaused: true });
});
recordReplayBackBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(recordReplay.elapsedMs - 5000, { keepPaused: true });
});
recordReplayToggleBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = !recordReplay.playing;
  recordReplay.startedAt = performance.now() - (recordReplay.elapsedMs / Math.max(1, recordReplay.speed || 1));
  updateRecordReplayButtons();
  if (recordReplay.playing) tickRecordReplayFrame(performance.now());
});
recordReplayForwardBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(recordReplay.elapsedMs + 5000, { keepPaused: true });
});
recordReplayEndBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(getReplayDurationMs(recordReplay.payload), { keepPaused: true });
});
recordReplayProgressEl?.addEventListener('input', () => {
  if (!recordReplay.payload) return;
  recordReplay.seeking = true;
  const totalMs = getReplayDurationMs(recordReplay.payload);
  const ratio = Math.max(0, Math.min(1, (Number(recordReplayProgressEl.value) || 0) / 1000));
  recordReplay.playing = false;
  seekRecordReplay(totalMs * ratio, { keepPaused: true });
});
recordReplayProgressEl?.addEventListener('change', () => {
  recordReplay.seeking = false;
});
replayGameExitBtn?.addEventListener('click', () => {
  stopReplayGame({ showMenu: true });
});
replayGameStartBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(0, { keepPaused: true });
});
replayGameBackBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(replayGame.elapsedMs - 5000, { keepPaused: true });
});
replayGameToggleBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = !replayGame.playing;
  replayGame.startedAt = performance.now() - (replayGame.elapsedMs / Math.max(1, replayGame.speed || 1));
  updateReplayGameButtons();
  tickReplayGame(performance.now());
});
replayGameForwardBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(replayGame.elapsedMs + 5000, { keepPaused: true });
});
replayGameEndBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(getReplayDurationMs(replayGame.payload), { keepPaused: true });
});
replayGameSpeedsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-replay-game-speed]');
  if (!btn) return;
  const nextSpeed = Math.max(1, Number(btn.dataset.replayGameSpeed) || 1);
  const prevElapsed = replayGame.elapsedMs;
  updateReplayGameSpeed(nextSpeed);
  if (replayGame.active) {
    replayGame.startedAt = performance.now() - (prevElapsed / nextSpeed);
    tickReplayGame(performance.now());
  }
});
replayGameProgressEl?.addEventListener('input', () => {
  if (!replayGame.payload) return;
  replayGame.seeking = true;
  const totalMs = getReplayDurationMs(replayGame.payload);
  const ratio = Math.max(0, Math.min(1, (Number(replayGameProgressEl.value) || 0) / 1000));
  replayGame.playing = false;
  seekReplayGame(totalMs * ratio, { keepPaused: true });
});
replayGameProgressEl?.addEventListener('change', () => {
  replayGame.seeking = false;
});
window.addEventListener('resize', () => {
  if (!recordReplayPanelEl || recordReplayPanelEl.classList.contains('hidden')) return;
  drawRecordReplay();
});
async function requestRecordsList(page = recordsUi.page) {
  if (!recordsListEl) return;
  try {
    const params = new URLSearchParams({
      page: String(Math.max(1, page)),
      page_size: String(recordsUi.pageSize),
    });
    const res = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    renderRecordsList(
      Array.isArray(payload.records) ? payload.records : [],
      Number(payload.page) || 1,
      Number(payload.totalPages) || 1,
      Number(payload.total) || 0,
    );
  } catch {
    recordsUi.total = 0;
    updateRecordsPager();
    recordsListEl.textContent = 'Failed to load records.';
  }
}
function updatePlayerInterpolation(dt) {
  if (!game.state) return;
  const liveMap = mapById(game.state.players);
  const targetMap = game.sampledNet?.players ? new Map(game.sampledNet.players) : new Map(liveMap);
  if (game.myId && liveMap.has(game.myId)) {
    targetMap.set(game.myId, liveMap.get(game.myId));
  }
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt);
  const alive = new Set();

  for (const [id, p] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderPlayers.get(id);
    if (!r) {
      r = { x: p.x, y: p.y, vx: 0, vy: 0 };
      game.renderPlayers.set(id, r);
      continue;
    }

    const nx = r.x + (p.x - r.x) * alpha;
    const ny = r.y + (p.y - r.y) * alpha;
    r.vx = (nx - r.x) / Math.max(0.001, dt);
    r.vy = (ny - r.y) / Math.max(0.001, dt);
    r.x = nx;
    r.y = ny;
  }

  for (const id of Array.from(game.renderPlayers.keys())) {
    if (!alive.has(id)) game.renderPlayers.delete(id);
  }
}

function getPlayerRenderPos(player) {
  return game.renderPlayers.get(player.id) || player;
}

function updateEnemyInterpolation(dt) {
  if (!game.state) return;
  const targetMap = game.sampledNet?.enemies || mapById(game.state.enemies);
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt);
  const alive = new Set();

  for (const [id, e] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderEnemies.get(id);
    if (!r) {
      r = { x: e.x, y: e.y, vx: 0, vy: 0 };
      game.renderEnemies.set(id, r);
      continue;
    }

    const nx = r.x + (e.x - r.x) * alpha;
    const ny = r.y + (e.y - r.y) * alpha;
    r.vx = (nx - r.x) / Math.max(0.001, dt);
    r.vy = (ny - r.y) / Math.max(0.001, dt);
    r.x = nx;
    r.y = ny;
  }

  for (const id of Array.from(game.renderEnemies.keys())) {
    if (!alive.has(id)) game.renderEnemies.delete(id);
  }
}

function syncBulletsFromState(nextState) {
  const alive = new Set();

  for (const b of nextState.bullets) {
    const id = b.id;
    if (!id) continue;
    alive.add(id);

    let r = game.renderBullets.get(id);
    if (!r) {
      r = {
        x: b.x,
        y: b.y,
        serverX: b.x,
        serverY: b.y,
        vx: b.vx || 0,
        vy: b.vy || 0,
        color: b.color,
        kind: b.kind || 'bullet',
        radius: b.radius || 3,
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = b.x;
    r.serverY = b.y;
    r.vx = (r.vx * 0.3) + ((b.vx || 0) * 0.7);
    r.vy = (r.vy * 0.3) + ((b.vy || 0) * 0.7);
    r.color = b.color;
    r.kind = b.kind || 'bullet';
    r.radius = b.radius || 3;
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
}

function updateBulletInterpolation(dt) {
  const targets = game.sampledNet?.bullets || mapById(game.state?.bullets || []);
  const alive = new Set();

  for (const [id, tb] of targets.entries()) {
    alive.add(id);

    let r = game.renderBullets.get(id);
    if (!r) {
      r = {
        x: tb.x,
        y: tb.y,
        serverX: tb.x,
        serverY: tb.y,
        vx: tb.vx || 0,
        vy: tb.vy || 0,
        color: tb.color,
        kind: tb.kind || 'bullet',
        radius: tb.radius || 3,
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = tb.x;
    r.serverY = tb.y;
    const isRocket = String(tb.kind || r.kind || '').toLowerCase() === 'rocket';
    const velBlend = isRocket ? 0.45 : 0.65;
    r.vx = (r.vx * (1 - velBlend)) + ((tb.vx || 0) * velBlend);
    r.vy = (r.vy * (1 - velBlend)) + ((tb.vy || 0) * velBlend);
    r.color = tb.color;
    r.kind = tb.kind || 'bullet';
    r.radius = tb.radius || 3;

    if (replayGame.active) {
      r.x = tb.x;
      r.y = tb.y;
      continue;
    }

    r.x += r.vx * dt;
    r.y += r.vy * dt;

    const dx = r.serverX - r.x;
    const dy = r.serverY - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      const speed = Math.hypot(r.vx, r.vy);
      const maxStep = Math.max(isRocket ? 5 : 8, speed * dt * (isRocket ? 1.05 : 1.4));
      const correction = Math.min(dist, maxStep);
      const corrRate = roomSync.bulletCorrectionRate * (isRocket ? 0.58 : 1);
      const k = (correction / dist) * Math.min(1, corrRate * dt);
      r.x += dx * k;
      r.y += dy * k;
    }
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
}

function updateXpOrbInterpolation(dt) {
  if (!game.state) return;
  const targetMap = game.sampledNet?.xpOrbs || mapById(game.state.xpOrbs || []);
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt * 0.9);
  const alive = new Set();
  for (const [id, o] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderXpOrbs.get(id);
    if (!r) {
      r = { x: o.x, y: o.y };
      game.renderXpOrbs.set(id, r);
      continue;
    }
    r.x += (o.x - r.x) * alpha;
    r.y += (o.y - r.y) * alpha;
  }
  for (const id of Array.from(game.renderXpOrbs.keys())) {
    if (!alive.has(id)) game.renderXpOrbs.delete(id);
  }
}
function getXpOrbRenderPos(orb) {
  return game.renderXpOrbs.get(orb.id) || orb;
}

function getEnemyRenderPos(enemy) {
  return game.renderEnemies.get(enemy.id) || enemy;
}

function getBulletRenderPos(bullet) {
  const id = bullet.id;
  return (id && game.renderBullets.get(id)) || bullet;
}
function pushNetSnapshot(state) {
  const snap = {
    t: performance.now(),
    players: state.players.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    enemies: state.enemies.map((e) => ({ id: e.id, x: e.x, y: e.y })),
    bullets: state.bullets.map((b) => ({
      id: b.id ?? `${b.x.toFixed(1)}:${b.y.toFixed(1)}`,
      x: b.x,
      y: b.y,
      vx: b.vx || 0,
      vy: b.vy || 0,
      color: b.color,
      kind: b.kind || 'bullet',
      radius: b.radius || 3,
    })),
    xpOrbs: state.xpOrbs.map((o) => ({ id: o.id, x: o.x, y: o.y })),
  };

  game.netSnapshots.push(snap);
  if (game.netSnapshots.length > 30) game.netSnapshots.shift();
}

function mapById(list) {
  const out = new Map();
  for (const item of list) out.set(item.id, item);
  return out;
}

function sampleBufferedState() {
  const snaps = game.netSnapshots;
  if (snaps.length === 0) return null;

  const target = performance.now() - roomSync.netRenderDelayMs;
  let a = snaps[0];
  let b = snaps[snaps.length - 1];

  for (let i = 0; i < snaps.length - 1; i += 1) {
    if (snaps[i].t <= target && target <= snaps[i + 1].t) {
      a = snaps[i];
      b = snaps[i + 1];
      break;
    }
  }

  if (target >= snaps[snaps.length - 1].t) {
    const latest = snaps[snaps.length - 1];
    const extraMs = Math.min(roomSync.maxExtrapolationMs, target - latest.t);
    const extraSec = Math.max(0, extraMs / 1000);

    const bullets = latest.bullets.map((x) => ({
      ...x,
      x: x.x + x.vx * extraSec,
      y: x.y + x.vy * extraSec,
    }));

    return {
      players: mapById(latest.players),
      enemies: mapById(latest.enemies),
      bullets: mapById(bullets),
      xpOrbs: mapById(latest.xpOrbs || []),
    };
  }

  const dt = Math.max(1, b.t - a.t);
  const k = Math.max(0, Math.min(1, (target - a.t) / dt));

  const lerpMap = (la, lb, withVel) => {
    const ma = mapById(la);
    const mb = mapById(lb);
    const ids = new Set([...ma.keys(), ...mb.keys()]);
    const out = new Map();

    for (const id of ids) {
      const pa = ma.get(id);
      const pb = mb.get(id);
      if (pa && pb) {
        out.set(id, {
          id,
          x: pa.x + (pb.x - pa.x) * k,
          y: pa.y + (pb.y - pa.y) * k,
          vx: withVel ? (pb.vx ?? pa.vx ?? 0) : 0,
          vy: withVel ? (pb.vy ?? pa.vy ?? 0) : 0,
          color: pb.color ?? pa.color,
          kind: pb.kind ?? pa.kind,
          radius: pb.radius ?? pa.radius,
        });
      } else {
        out.set(id, pb || pa);
      }
    }

    return out;
  };

  return {
    players: lerpMap(a.players, b.players, false),
    enemies: lerpMap(a.enemies, b.enemies, false),
    bullets: lerpMap(a.bullets, b.bullets, true),
    xpOrbs: lerpMap(a.xpOrbs || [], b.xpOrbs || [], false),
  };
}
function isVisibleWorld(x, y, pad = 0) {
  const sx = x - camera.x;
  const sy = y - camera.y;
  return sx >= -pad && sx <= canvas.width + pad && sy >= -pad && sy <= canvas.height + pad;
}

function updateScoreboard(players) {
  const sorted = [...players].filter((p) => !p.isCompanion).sort((a, b) => b.score - a.score);
  const titleText = scoreboardMinimized ? `Players: ${sorted.length}` : 'Players';
  const toggleLabel = scoreboardMinimized ? 'Expand players list' : 'Minimize players list';
  const toggleIcon = scoreboardMinimized ? '+' : '&minus;';
  const rows = sorted.map((p) => {
    const kills = Number(p.kills) || 0;
    const ammo = p.ammo === null ? 'inf' : p.ammo;
    const meClass = p.id === game.myId ? ' me' : '';
    const conn = getConnectionIndicatorData(p);
    const connIcon = game.connectionIndicatorEnabled
      ? `<span class="conn-wrap" aria-label="${conn.title}"><span class="conn-indicator conn-lvl-${conn.level}"></span><span class="conn-meta">${conn.shortText}</span></span>`
      : '';
    return `<div class="score-row${meClass}">${connIcon}<span class="score-player-text">${p.name} - Kills: ${kills} (${p.weaponLabel} ${ammo})</span></div>`;
  });

  const nextHtml = scoreboardMinimized
    ? `<div class="score-head"><div class="score-title">${titleText}</div><button type="button" class="panel-close panel-close-sm scoreboard-toggle" aria-label="${toggleLabel}" title="${toggleLabel}">${toggleIcon}</button></div>`
    : `<div class="score-head"><div class="score-title">${titleText}</div><button type="button" class="panel-close panel-close-sm scoreboard-toggle" aria-label="${toggleLabel}" title="${toggleLabel}">${toggleIcon}</button></div>${rows.join('')}`;
  const allowPinnedHover = !replayGame.active && !mobile.enabled;
  if (allowPinnedHover && scoreboardEl.matches(':hover')) return;
  if (nextHtml === lastScoreboardHtml) return;
  lastScoreboardHtml = nextHtml;
  scoreboardEl.innerHTML = nextHtml;
}

function keyStateFromCode(code, isDown) {
  if (code === 'KeyW' || code === 'ArrowUp') input.up = isDown;
  if (code === 'KeyS' || code === 'ArrowDown') input.down = isDown;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = isDown;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = isDown;
}

function queueJump() {
  input.jumpQueued = true;
  requestImmediateInputSend();
}

function updateSyncSettingsVisibility() {
  if (!syncSettingsEl) return;
  syncSettingsEl.style.display = joinMode === 'create' ? '' : 'none';
}

let immediateInputSendQueued = false;

function requestImmediateInputSend() {
  if (immediateInputSendQueued) return;
  immediateInputSendQueued = true;
  setTimeout(() => {
    immediateInputSendQueued = false;
    sendInput();
  }, 0);
}


window.addEventListener('keydown', (e) => {
  if (e.code === 'Backquote') {
    e.preventDefault();
    toggleDevConsole();
    return;
  }

  if (isDevConsoleOpen()) return;

  const t = e.target;
  const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';

  if (!typing && e.code === 'KeyH') {
    setInfoPanelHidden(!infoPanelHidden);
    return;
  }

  if (!typing && !overlayOpen && !e.repeat && runBoundDevCommand(e.code)) {
    e.preventDefault();
    return;
  }

  if (!typing && e.code === 'Space') {
    e.preventDefault();
    queueJump();
    return;
  }

  const digitMatch = !typing ? /^Digit([1-3])$/.exec(e.code) : null;
  if (digitMatch) {
    const idx = Number(digitMatch[1]);
    if (chooseSkillByIndex(idx)) {
      e.preventDefault();
      return;
    }
  }

  const before = `${input.up}:${input.down}:${input.left}:${input.right}`;
  keyStateFromCode(e.code, true);
  const after = `${input.up}:${input.down}:${input.left}:${input.right}`;
  if (before !== after) requestImmediateInputSend();
  if (e.code === 'Digit1' && ws.readyState === WebSocket.OPEN) {
    sendJson({ type: 'weaponSwitch', weaponKey: 'pistol' });
  }
});
window.addEventListener('keyup', (e) => {
  if (isDevConsoleOpen()) return;
  const before = `${input.up}:${input.down}:${input.left}:${input.right}`;
  keyStateFromCode(e.code, false);
  const after = `${input.up}:${input.down}:${input.left}:${input.right}`;
  if (before !== after) requestImmediateInputSend();
});

function setPointerFromClient(clientX, clientY) {
  input.pointerX = clientX;
  input.pointerY = clientY;
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  input.shooting = true;
  setPointerFromClient(e.clientX, e.clientY);
  requestImmediateInputSend();
});
window.addEventListener('mouseup', () => {
  if (!input.shooting) return;
  input.shooting = false;
  requestImmediateInputSend();
});
canvas.addEventListener('mousemove', (e) => {
  setPointerFromClient(e.clientX, e.clientY);
  if (input.shooting) requestImmediateInputSend();
});

let mobileShootTouchId = null;
canvas.addEventListener('touchstart', (e) => {
  if (!mobile.enabled) return;
  const t = e.changedTouches[0];
  if (!t) return;
  if (t.identifier === mobile.moveId || t.identifier === mobile.aimId) return;
  mobileShootTouchId = t.identifier;
  input.shooting = true;
  setPointerFromClient(t.clientX, t.clientY);
  requestImmediateInputSend();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!mobile.enabled || mobileShootTouchId === null) return;
  const t = getTouchById(e.touches, mobileShootTouchId);
  if (!t) return;
  setPointerFromClient(t.clientX, t.clientY);
  requestImmediateInputSend();
  e.preventDefault();
}, { passive: false });

const stopMobileTapShoot = (e) => {
  if (!mobile.enabled || mobileShootTouchId === null) return;
  const ended = getTouchById(e.changedTouches, mobileShootTouchId);
  if (!ended) return;
  mobileShootTouchId = null;
  input.shooting = false;
  requestImmediateInputSend();
  e.preventDefault();
};
canvas.addEventListener('touchend', stopMobileTapShoot, { passive: false });
canvas.addEventListener('touchcancel', stopMobileTapShoot, { passive: false });

joinForm.addEventListener('click', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLButtonElement)) return;
  if (!t.dataset.mode) return;
  joinMode = t.dataset.mode;
  updateSyncSettingsVisibility();
});

updateSyncSettingsVisibility();

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (ws.readyState !== WebSocket.OPEN) return;
  const roomCode = joinMode === 'create' ? '' : roomCodeInput.value.trim();
  const joinSync = joinMode === 'create' ? configFromSyncUi() : null;
  void sendJoinRequest(roomCode, joinSync, { source: 'join_form' });
});

function handleSkillOptionInteract(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const card = t.closest('.skill-option');
  if (!(card instanceof HTMLElement)) return;
  const sid = card.dataset.skillId;
  if (!sid || ws.readyState !== WebSocket.OPEN || !game.myId) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('skill_pick', { skill_id: sid });
  }
  sendJson({ type: 'skillPick', skillId: sid });
}

levelupOptionsEl?.addEventListener('pointerdown', handleSkillOptionInteract);
levelupOptionsEl?.addEventListener('click', handleSkillOptionInteract);



function clearLocalSessionState() {
  game.myId = null;
  game.roomCode = null;
  game.state = null;
  game.netSnapshots = [];
  game.sampledNet = null;
  game.nextInputSeq = 0;
  game.renderPlayers.clear();
  game.renderEnemies.clear();
  game.renderBullets.clear();
  game.renderXpOrbs.clear();
  game.roomStartedAt = 0;
  game.totalEnemyKills = 0;
  game.nextBossAtKills = 50;
  game.nextBossSpawnAt = 0;
  game.bossAlive = false;
  game.roomDifficulty = { level: 1, hpMul: 1, speedMul: 1, damageMul: 1, attackRateMul: 1, spawnIntervalMs: 760 };
  game.mySkillChoices = [];
  prevMyAlive = null;
  sessionStartedAt = 0;
  waitingForFirstState = false;
  waitingForFirstStateSince = 0;
  netStats.pendingPings.clear();
  netStats.rttSamples = [];
  netStats.rttMs = 0;
  netStats.jitterMs = 0;
  netStats.stateDelayMs = 0;
  roomMetaEl.textContent = '';
  weaponMetaEl.textContent = '';
  if (movementMetaEl) movementMetaEl.textContent = '';
  input.jumpQueued = false;
  scoreboardEl.innerHTML = '';
  lastScoreboardHtml = '';
  lastLevelupHtml = '';
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  visuals.rocketPrev = new Map();
  updateTopCenterHud(Date.now());
  updateBottomHud();
  updateStatsPanel(null);
  updateJumpButtonUi(null);
  immediateInputSendQueued = false;
}

function leaveActiveRoom() {
  if (ws.readyState === WebSocket.OPEN && game.myId) {
    sendJson({ type: 'leave' });
  }
  clearLocalSessionState();
}

function renderDeathResult(result) {
  if (!deathResultEl) return;
  if (!result) {
    deathResultEl.textContent = 'Last result: --';
    return;
  }
  deathResultEl.textContent = `Last result: ${result.kills} kills | ${result.score} pts | ${result.survivalSec}s | room ${result.roomCode}`;
}

function setDeathCinematicActive(active) {
  const on = Boolean(active);
  if (on) {
    joinOverlay.classList.remove('death-cinematic-active');
    if (deathCinematicEl) {
      deathCinematicEl.setAttribute('aria-hidden', 'true');
      void deathCinematicEl.offsetWidth;
      deathCinematicEl.setAttribute('aria-hidden', 'false');
    }
    joinOverlay.classList.add('death-cinematic-active');
    return;
  }
  joinOverlay.classList.remove('death-cinematic-active');
  if (deathCinematicEl) deathCinematicEl.setAttribute('aria-hidden', 'true');
}

function openDeathMenuAfterCinematic() {
  setDeathCinematicActive(false);
  joinOverlay.classList.add('death-mode');
  statusEl.textContent = 'You died. Last result is shown below.';
  updateMobileControlsVisibility();
  requestRoomsList();
  requestRecordsList(recordsUi.page);
}

function openDeathOverlay(result) {
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('player_death', {
      room_code: result?.roomCode || '-',
      kills: Number(result?.kills) || 0,
      score: Number(result?.score) || 0,
      survival_sec: Number(result?.survivalSec) || 0,
    });
  }
  leaveActiveRoom();
  joinOverlay.style.display = 'grid';
  joinOverlay.classList.add('death-mode');
  renderDeathResult(result);
  setDeathCinematicActive(true);
}

deathContinueBtn?.addEventListener('click', () => {
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('death_overlay_continue', { source: 'death_cinematic' });
  }
  openDeathMenuAfterCinematic();
});


refreshRoomsBtn?.addEventListener('click', () => {
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('room_search_manual', { source: 'refresh_button' });
  }
  requestRoomsList();
});
refreshRecordsBtn?.addEventListener('click', () => {
  requestRecordsList(recordsUi.page);
});
recordsPrevBtn?.addEventListener('click', () => {
  if (recordsUi.page > 1) requestRecordsList(recordsUi.page - 1);
});
recordsNextBtn?.addEventListener('click', () => {
  if (recordsUi.page < recordsUi.totalPages) requestRecordsList(recordsUi.page + 1);
});

setInterval(() => {
  if (!game.myId && game.connected) {
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }
}, 5000);
registerSocketHandlers({
open: () => {
  game.connected = true;
  statusEl.textContent = 'Connected. Create room or join code.';
  game.runtimeInstance.publicBaseUrl = currentWorkerOrigin || APP_ORIGIN;
  renderInstanceMeta();
  void refreshPlayerAuthSession({ silent: true });
  requestRoomsList();
  requestRecordsList(1);
  sendNetPing();
  if (pendingAutoJoin && roomCodeInput?.value) {
    pendingAutoJoin = false;
    joinMode = 'join';
    void sendJoinRequest(roomCodeInput.value.trim(), null, { skipRouting: true });
  } else if (pendingAutoCreate) {
    pendingAutoCreate = false;
    joinMode = 'create';
    void sendJoinRequest('', configFromSyncUi(), { skipRouting: true });
  }
},
close: () => {
  game.connected = false;
  netStats.pendingPings.clear();
  if (!restartReloadTimer) {
    statusEl.textContent = 'Disconnected';
  }
},
message: (ev) => {
  const rawSize = typeof ev.data === 'string' ? ev.data.length : 0;
  if (rawSize > 0) markRxBytes(rawSize);

  let msg;
  try { msg = JSON.parse(ev.data); } catch { return; }

  if (msg.type === 'netPong') {
    handleNetPong(msg);
    return;
  }

  if (msg.type === 'devConsole') {
    onDevConsoleServerMessage(msg);
    return;
  }

  if (msg.type === 'serverRestart') {
    handleServerRestartNotice(msg);
    return;
  }

  if (msg.type === 'welcome') {
    clearJoinFeedback();
    game.myId = msg.id;
    game.runtimeInstance.instanceId = String(msg.instanceId || '');
    game.runtimeInstance.publicBaseUrl = currentWorkerOrigin || APP_ORIGIN;
    renderInstanceMeta();
    resetNetStats();
    prevMyAlive = true;
    sessionStartedAt = Date.now();
    if (msg.sync) applyRoomSync(msg.sync);
    game.roomCode = msg.roomCode;
    game.skillCatalog = {};
    const catalog = Array.isArray(msg.skillCatalog) ? msg.skillCatalog : [];
    for (const sk of catalog) { if (sk && sk.id) game.skillCatalog[sk.id] = sk; }
    game.renderPlayers.clear();
    game.renderEnemies.clear();
    game.renderBullets.clear();
    game.renderXpOrbs.clear();
    game.netSnapshots = [];
    game.sampledNet = null;
    game.nextInputSeq = 0;
    visuals.enemyPrev = new Map();
    visuals.playerPrev = new Map();
    visuals.blood = [];
    visuals.bloodPuddles = [];
    visuals.gore = [];
    visuals.hitFx = [];
    visuals.muzzle = [];
    visuals.bossBlast = [];
    visuals.bloodMist = [];
    visuals.rocketSmoke = [];
    visuals.rocketFire = [];
    visuals.rocketBlast = [];
    visuals.skillBursts = [];
    visuals.skillArcs = [];
    visuals.skillLinks = [];
    visuals.skillLabels = [];
    visuals.skillCdPrev = new Map();
    visuals.skillOfferPrev = new Map();
    visuals.rocketPrev = new Map();
    roomMetaEl.textContent = `Room: ${msg.roomCode}`;
    copyRoomCodeToClipboard(msg.roomCode, { silent: true });
    statusEl.textContent = `Online as ${msg.id} | tick ${roomSync.tickRate}`;
    const pendingJoin = game.analytics?.pendingJoin || null;
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      const mode = pendingJoin?.mode || (joinMode === 'create' ? 'create' : 'join');
      const source = pendingJoin?.source || 'unknown';
      window.cwTrackMetrikaGoal('room_connected', {
        mode,
        source,
        room_code: msg.roomCode,
      });
      window.cwTrackMetrikaGoal('game_start_success', {
        mode,
        source,
        room_code: msg.roomCode,
      });
      if (mode === 'create') {
        window.cwTrackMetrikaGoal('room_created', {
          source,
          room_code: msg.roomCode,
        });
      } else {
        window.cwTrackMetrikaGoal('room_join_success', {
          source,
          room_code: msg.roomCode,
        });
      }
    }
    if (typeof window.cwClearPendingJoinAnalytics === 'function') {
      window.cwClearPendingJoinAnalytics();
    }
    if (msg.me?.name && !game.playerAuth?.player) {
      game.playerAuth.nicknameStatus = {
        nickname: msg.me.name,
        isRegistered: !!msg.me.isRegisteredNickname,
        isOccupied: false,
      };
      renderPlayerAuthUi();
    }
  }

  if (msg.type === 'joinError') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    statusEl.textContent = msg.message;
    setJoinFeedback(msg.message);
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      const pendingJoin = game.analytics?.pendingJoin || null;
      window.cwTrackMetrikaGoal('room_join_error', {
        mode: pendingJoin?.mode || joinMode || 'unknown',
        source: pendingJoin?.source || 'unknown',
        room_code: msg.roomCode || pendingJoin?.roomCode || roomCodeInput?.value?.trim()?.toUpperCase() || 'AUTO',
        error_code: String(msg.code || 'unknown'),
      });
    }
    if (!msg.redirectUrl && typeof window.cwClearPendingJoinAnalytics === 'function') {
      window.cwClearPendingJoinAnalytics();
    }
    if (msg.redirectUrl) {
      try {
        const redirectedOrigin = normalizeOrigin(msg.redirectUrl);
        currentWorkerOrigin = redirectedOrigin;
        void sendJoinRequest(msg.roomCode || roomCodeInput?.value || '', null, { skipRouting: true });
      } catch {
        statusEl.textContent = msg.message || 'Failed to switch game server.';
        setJoinFeedback(msg.message || 'Failed to switch game server.');
      }
      return;
    }
    if (Number(msg.retryAfterMs) > 0) {
      scheduleClientReload(Number(msg.retryAfterMs), msg.message || 'Server restarting. Reconnecting...');
    }
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
    joinFeedbackEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }

  if (msg.type === 'system') statusEl.textContent = msg.message;

  if (msg.type === 'state') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    const s = msg.payload;
    onStateNetSample(s.now);
    pushNetSnapshot(s);
    syncBulletsFromState(s);
    processStateFx(s);
    game.state = s;
    game.world = s.world;
    game.roomCode = s.roomCode;
    game.roomStartedAt = Number(s.roomStartedAt) || game.roomStartedAt || Date.now();
    game.totalEnemyKills = Number(s.totalEnemyKills) || 0;
    game.nextBossAtKills = Number(s.nextBossAtKills) || game.nextBossAtKills || 50;
    game.nextBossSpawnAt = Number(s.nextBossSpawnAt) || 0;
    game.bossAlive = Boolean(s.bossAlive);
    if (game.bossAlive && typeof window.cwTrackMetrikaGoalOnce === 'function') {
      window.cwTrackMetrikaGoalOnce(`boss_encounter:${s.roomCode}`, 'boss_encounter', {
        room_code: s.roomCode,
        total_enemy_kills: Number(s.totalEnemyKills) || 0,
      });
    }
    game.roomDifficulty = s.roomDifficulty || game.roomDifficulty;
    if (s.sync) applyRoomSync(s.sync);
    roomMetaEl.textContent = `Room: ${s.roomCode}`;

    game.sortedTrees = (s.decor?.trees || []).slice().sort((a, b) => a.y - b.y);
    updateScoreboard(s.players);

    const me = s.players.find((p) => p.id === game.myId);
    if (me) {
      updateStatsPanel(me);
      updateJumpButtonUi(me);
      const dodgeCdMeta = Math.max(0, Number(me.dodgeCooldownMs) || 0);
      const jumpMeta = dodgeCdMeta > 0 ? (dodgeCdMeta / 1000).toFixed(1) + 's' : 'ready';
      weaponMetaEl.textContent = `Weapon: ${me.weaponLabel} | Ammo: ${me.ammo === null ? 'inf' : me.ammo} | Jump: ${jumpMeta}`;
      if (movementMetaEl) {
        const nowMs = Date.now();
        const slowed = (Number(me.slowUntil) || 0) > nowMs;
        const slowLeft = Math.max(0, (Number(me.slowUntil) || 0) - nowMs);
        const dodgeCd = Math.max(0, Number(me.dodgeCooldownMs) || 0);
        const invuln = (Number(me.dodgeInvulnUntil) || 0) > nowMs;
        const dodgeText = dodgeCd > 0 ? (dodgeCd / 1000).toFixed(1) + 's' : 'ready';
        const slowText = slowed ? ('SLOWED ' + (slowLeft / 1000).toFixed(1) + 's') : 'normal';
        movementMetaEl.textContent = `Move: ${slowText} | Jump: ${dodgeText}${invuln ? ' | i-frames' : ''}`;
      }
      if (prevMyAlive === true && !me.alive) {
        const deathResult = {
          kills: Number(me.kills) || 0,
          score: Number(me.score) || 0,
          roomCode: game.roomCode || s.roomCode || '-',
          survivalSec: Math.max(1, Math.floor((Date.now() - (sessionStartedAt || Date.now())) / 1000)),
        };
        openDeathOverlay(deathResult);
        return;
      }
      prevMyAlive = Boolean(me.alive);
    } else {
      updateStatsPanel(null);
      updateJumpButtonUi(null);
      prevMyAlive = null;
      if (movementMetaEl) movementMetaEl.textContent = '';
    }
  }
},
});

void connectGameSocket(APP_ORIGIN);

function buildCurrentInputPayload(includeJump = true) {
  if (!game.connected || !game.myId || !game.state) return null;
  const me = game.state.players.find((p) => p.id === game.myId);
  if (!me) return null;

  let moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  let aimX = input.pointerX + camera.x;
  let aimY = input.pointerY + camera.y;
  let shooting = input.shooting;

  if (mobile.enabled) {
    if (mobile.moveStrength > 0.05) {
      moveX = mobile.moveX * Math.min(1, mobile.moveStrength * 1.15);
      moveY = mobile.moveY * Math.min(1, mobile.moveStrength * 1.15);
    }

    const sx = me.x - camera.x;
    const sy = me.y - camera.y;
    const aimDistWorld = 240;
    const aimDistScreen = 120;

    if (mobile.aimStrength > 0.08) {
      aimX = me.x + mobile.aimX * aimDistWorld;
      aimY = me.y + mobile.aimY * aimDistWorld;
      shooting = mobile.aimStrength > 0.2;
      input.pointerX = sx + mobile.aimX * aimDistScreen;
      input.pointerY = sy + mobile.aimY * aimDistScreen;
    }
  }
  const manualAimOverride = Boolean(input.shooting || (mobile.enabled && mobile.aimStrength > 0.2));

  if (game.autoFireEnabled && !manualAimOverride) {
    let nearest = null;
    let bestD2 = Infinity;
    for (const e of game.state.enemies || []) {
      const dx = e.x - me.x;
      const dy = e.y - me.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = e;
      }
    }
    if (nearest) {
      aimX = nearest.x;
      aimY = nearest.y;
      shooting = true;
    } else {
      shooting = false;
    }
  }

  return {
    moveX,
    moveY,
    aimX,
    aimY,
    shooting,
    jump: includeJump ? input.jumpQueued : false,
  };
}

function sendInput() {
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) return;
  const payload = buildCurrentInputPayload(true);
  if (!payload) return;
  const seq = game.nextInputSeq + 1;
  game.nextInputSeq = seq;

  sendJson({
    type: 'input',
    seq,
    ...payload,
  });

  input.jumpQueued = false;
}

void maybeStartReplayFromUrl();





