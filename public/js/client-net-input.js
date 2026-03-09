function resetMobileStick(kind) {
  if (kind === 'move') {
    mobile.moveId = null;
    mobile.moveX = 0;
    mobile.moveY = 0;
    mobile.moveStrength = 0;
    if (moveKnobEl) moveKnobEl.style.transform = 'translate(-50%, -50%)';
    return;
  }
  mobile.aimId = null;
  mobile.aimStrength = 0;
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
      mobile.moveId = touch.identifier;
      updateMobileStick('move', touch.clientX, touch.clientY);
    }
    if (kind === 'aim' && mobile.aimId === null) {
      mobile.aimId = touch.identifier;
      updateMobileStick('aim', touch.clientX, touch.clientY);
    }
  };

  moveStickEl.addEventListener('touchstart', (e) => onStart('move', e), { passive: false });
  aimStickEl.addEventListener('touchstart', (e) => onStart('aim', e), { passive: false });

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
    if (changed) e.preventDefault();
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

function setInfoPanelHidden(hidden) {
  infoPanelHidden = Boolean(hidden);
  if (infoPanelEl) infoPanelEl.classList.toggle('is-hidden', infoPanelHidden);
  if (toggleInfoBtn) {
    if (mobile.enabled) {
      toggleInfoBtn.textContent = '=';
      toggleInfoBtn.setAttribute('aria-label', infoPanelHidden ? 'Show menu' : 'Hide menu');
      toggleInfoBtn.title = infoPanelHidden ? 'Show menu' : 'Hide menu';
    } else {
      toggleInfoBtn.textContent = infoPanelHidden ? 'Show menu' : 'Hide menu';
      toggleInfoBtn.removeAttribute('aria-label');
      toggleInfoBtn.removeAttribute('title');
    }
  }
  localStorage.setItem('cw:infoPanelHidden', infoPanelHidden ? '1' : '0');
}

if (toggleInfoBtn) {
  toggleInfoBtn.addEventListener('click', () => {
    setInfoPanelHidden(!infoPanelHidden);
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
if (nameInput && storedNickname && storedNickname.trim()) {
  nameInput.value = storedNickname.trim().slice(0, 18);
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

function sendJoinRequest(roomCode, joinSync = null) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const name = nameInput.value.trim() || 'Fighter';
  localStorage.setItem(NICKNAME_STORAGE_KEY, name);
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
  copyRoomCodeToClipboard(game.roomCode, { silent: false });
});
function renderPresence(presence) {
  if (!presenceMetaEl) return;
  const online = Number(presence?.online) || 0;
  const inGame = Number(presence?.inGame) || 0;
  const inMenu = Number(presence?.inMenu) || 0;
  presenceMetaEl.textContent = `Online: ${online} | In game: ${inGame} | In menu: ${inMenu}`;
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
      sendJoinRequest(room.code, null);
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
    renderPresence(payload.presence);
    renderRoomsList(Array.isArray(payload.rooms) ? payload.rooms : []);
  } catch {
    if (presenceMetaEl) presenceMetaEl.textContent = 'Online: -- | In game: -- | In menu: --';
    roomsListEl.textContent = 'Failed to load rooms.';
  }
}


function updateRecordsPager() {
  if (recordsPageEl) recordsPageEl.textContent = `Page ${recordsUi.page}/${recordsUi.totalPages}`;
  if (recordsTotalEl) recordsTotalEl.textContent = `(Total: ${recordsUi.total})`;
  if (recordsPrevBtn) recordsPrevBtn.disabled = recordsUi.page <= 1;
  if (recordsNextBtn) recordsNextBtn.disabled = recordsUi.page >= recordsUi.totalPages;
}

function closeRecordDetailsModal() {
  if (!recordDetailsModalEl) return;
  recordDetailsModalEl.classList.add('hidden');
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

  recordDetailsTitleEl.textContent = `${rankLabel} ${name} | ${kills} K | ${score} pts`;
  const summary = `<div class="rd-summary">Room ${roomCode} | ${durationSec}s</div>`;
  recordDetailsBodyEl.innerHTML = summary + renderRunDetailsHtml(record?.runDetails || null);
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
    name.textContent = r.name || 'Unknown';

    const kills = Number(r.kills) || 0;
    const score = Number(r.score) || 0;

    const meta = document.createElement('div');
    meta.className = 'record-meta';
    meta.textContent = `${kills}K / ${score}pts`;

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
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = b.x;
    r.serverY = b.y;
    r.vx = (r.vx * 0.3) + ((b.vx || 0) * 0.7);
    r.vy = (r.vy * 0.3) + ((b.vy || 0) * 0.7);
    r.color = b.color;
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
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = tb.x;
    r.serverY = tb.y;
    r.vx = (r.vx * 0.35) + ((tb.vx || 0) * 0.65);
    r.vy = (r.vy * 0.35) + ((tb.vy || 0) * 0.65);
    r.color = tb.color;

    r.x += r.vx * dt;
    r.y += r.vy * dt;

    const dx = r.serverX - r.x;
    const dy = r.serverY - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      const correction = Math.min(dist, Math.max(8, Math.hypot(r.vx, r.vy) * dt * 1.4));
      const k = (correction / dist) * Math.min(1, roomSync.bulletCorrectionRate * dt);
      r.x += dx * k;
      r.y += dy * k;
    }
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
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
    })),
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
  };
}
function isVisibleWorld(x, y, pad = 0) {
  const sx = x - camera.x;
  const sy = y - camera.y;
  return sx >= -pad && sx <= canvas.width + pad && sy >= -pad && sy <= canvas.height + pad;
}

function updateScoreboard(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
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

  const nextHtml = `<div class="score-title">Players</div>${rows.join('')}`;
  if (scoreboardEl.matches(':hover')) return;
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
}

function updateSyncSettingsVisibility() {
  if (!syncSettingsEl) return;
  syncSettingsEl.style.display = joinMode === 'create' ? '' : 'none';
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

  if (!typing && e.code === 'KeyH') {
    setInfoPanelHidden(!infoPanelHidden);
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

  keyStateFromCode(e.code, true);
  if (e.code === 'Digit1' && ws.readyState === WebSocket.OPEN) {
    sendJson({ type: 'weaponSwitch', weaponKey: 'pistol' });
  }
});
window.addEventListener('keyup', (e) => {
  if (isDevConsoleOpen()) return;
  keyStateFromCode(e.code, false);
});
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { input.shooting = true; input.pointerX = e.clientX; input.pointerY = e.clientY; } });
window.addEventListener('mouseup', () => { input.shooting = false; });
canvas.addEventListener('mousemove', (e) => { input.pointerX = e.clientX; input.pointerY = e.clientY; });

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
  sendJoinRequest(roomCode, joinSync);
});

function handleSkillOptionInteract(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const card = t.closest('.skill-option');
  if (!(card instanceof HTMLElement)) return;
  const sid = card.dataset.skillId;
  if (!sid || ws.readyState !== WebSocket.OPEN || !game.myId) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
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
  game.renderPlayers.clear();
  game.renderEnemies.clear();
  game.renderBullets.clear();
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
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  visuals.skillCdPrev = new Map();
  updateTopCenterHud(Date.now());
  updateBottomHud();
  updateStatsPanel(null);
  updateJumpButtonUi(null);
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
  leaveActiveRoom();
  joinOverlay.style.display = 'grid';
  joinOverlay.classList.add('death-mode');
  renderDeathResult(result);
  setDeathCinematicActive(true);
}

deathContinueBtn?.addEventListener('click', () => {
  openDeathMenuAfterCinematic();
});


refreshRoomsBtn?.addEventListener('click', () => {
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
ws.addEventListener('open', () => {
  game.connected = true;
  statusEl.textContent = 'Connected. Create room or join code.';
  requestRoomsList();
  requestRecordsList(1);
  sendNetPing();
});

ws.addEventListener('close', () => {
  game.connected = false;
  netStats.pendingPings.clear();
  statusEl.textContent = 'Disconnected';
});
ws.addEventListener('message', (ev) => {
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

  if (msg.type === 'welcome') {
    game.myId = msg.id;
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
    game.netSnapshots = [];
    game.sampledNet = null;
    visuals.enemyPrev = new Map();
    visuals.playerPrev = new Map();
    visuals.blood = [];
    visuals.bloodPuddles = [];
    visuals.gore = [];
    visuals.hitFx = [];
    visuals.muzzle = [];
    visuals.bossBlast = [];
    visuals.bloodMist = [];
    visuals.skillBursts = [];
    visuals.skillArcs = [];
    visuals.skillLinks = [];
    visuals.skillLabels = [];
    visuals.skillCdPrev = new Map();
    roomMetaEl.textContent = `Room: ${msg.roomCode}`;
    copyRoomCodeToClipboard(msg.roomCode, { silent: true });
    statusEl.textContent = `Online as ${msg.id} | tick ${roomSync.tickRate}`;
  }

  if (msg.type === 'joinError') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    statusEl.textContent = msg.message;
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
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
});

function sendInput() {
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) return;
  const me = game.state.players.find((p) => p.id === game.myId);
  if (!me) return;

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

  const jump = input.jumpQueued;

  sendJson({
    type: 'input',
    moveX,
    moveY,
    aimX,
    aimY,
    shooting,
    jump,
  });

  input.jumpQueued = false;
}


