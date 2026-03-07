
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const statusEl = document.getElementById('status');
const roomMetaEl = document.getElementById('room-meta');
const weaponMetaEl = document.getElementById('weapon-meta');
const fpsMetaEl = document.getElementById('fps-meta');
const qualitySelect = document.getElementById('quality-select');
const scoreboardEl = document.getElementById('scoreboard');
const joinOverlay = document.getElementById('join-overlay');
const joinForm = document.getElementById('join-form');
const nameInput = document.getElementById('name');
const roomCodeInput = document.getElementById('room-code');
const refreshRoomsBtn = document.getElementById('refresh-rooms');
const roomsListEl = document.getElementById('rooms-list');

ctx.imageSmoothingEnabled = false;

const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${wsProto}://${location.host}`);

const QUALITY = {
  low: { groundTexture: false, groundTileSize: 96, maxBlood: 120, maxMuzzle: 28, bloodMult: 0.55, overlays: false },
  medium: { groundTexture: true, groundTileSize: 128, maxBlood: 220, maxMuzzle: 50, bloodMult: 0.85, overlays: true },
  high: { groundTexture: true, groundTileSize: 160, maxBlood: 360, maxMuzzle: 90, bloodMult: 1, overlays: true },
};

const input = { up: false, down: false, left: false, right: false, shooting: false, pointerX: 0, pointerY: 0 };
const game = {
  myId: null,
  roomCode: null,
  connected: false,
  world: { width: 2400, height: 1400 },
  state: null,
  sortedTrees: [],
  qualityKey: 'medium',
  renderPlayers: new Map(),
  renderEnemies: new Map(),
  renderBullets: new Map(),
};

const camera = { x: 0, y: 0 };
const visuals = { blood: [], muzzle: [], enemyHp: new Map(), bulletIds: new Set(), groundTileCanvas: null, groundTileSize: 0 };

let joinMode = 'create';
let lastFrameTs = performance.now();
let fpsFrameCount = 0;
let fpsAccumSec = 0;

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const sprites = {
  player: loadImage('/assets/sprites/player_dude.png'),
  enemy: loadImage('/assets/sprites/enemy_mummy.png'),
  ground: loadImage('/assets/tiles/ground_grass.jpg'),
};

function getQ() {
  return QUALITY[game.qualityKey] || QUALITY.medium;
}

function rebuildGroundTile() {
  visuals.groundTileCanvas = null;
  if (!sprites.ground.complete || sprites.ground.naturalWidth <= 0 || !getQ().groundTexture) return;

  const size = getQ().groundTileSize;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');

  g.drawImage(sprites.ground, 0, 0, size, size);
  g.fillStyle = 'rgba(8,10,14,0.72)';
  g.fillRect(0, 0, size, size);

  visuals.groundTileCanvas = c;
  visuals.groundTileSize = size;
}

sprites.ground.addEventListener('load', rebuildGroundTile);

qualitySelect?.addEventListener('change', () => {
  const q = qualitySelect.value;
  if (!QUALITY[q]) return;
  game.qualityKey = q;
  rebuildGroundTile();
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
function sendJoinRequest(roomCode) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const name = nameInput.value.trim() || 'Fighter';
  ws.send(JSON.stringify({
    type: 'join',
    name,
    roomCode,
  }));
  joinOverlay.style.display = 'none';
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
      sendJoinRequest(room.code);
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
    renderRoomsList(Array.isArray(payload.rooms) ? payload.rooms : []);
  } catch {
    roomsListEl.textContent = 'Failed to load rooms.';
  }
}


function updatePlayerInterpolation(dt) {
  if (!game.state) return;
  const alpha = 1 - Math.exp(-14 * dt);
  const alive = new Set();

  for (const p of game.state.players) {
    alive.add(p.id);
    let r = game.renderPlayers.get(p.id);
    if (!r) {
      r = { x: p.x, y: p.y };
      game.renderPlayers.set(p.id, r);
      continue;
    }

    r.x += (p.x - r.x) * alpha;
    r.y += (p.y - r.y) * alpha;
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
  const alpha = 1 - Math.exp(-14 * dt);
  const alive = new Set();

  for (const e of game.state.enemies) {
    alive.add(e.id);
    let r = game.renderEnemies.get(e.id);
    if (!r) {
      r = { x: e.x, y: e.y };
      game.renderEnemies.set(e.id, r);
      continue;
    }

    r.x += (e.x - r.x) * alpha;
    r.y += (e.y - r.y) * alpha;
  }

  for (const id of Array.from(game.renderEnemies.keys())) {
    if (!alive.has(id)) game.renderEnemies.delete(id);
  }
}


function syncBulletsFromState(nextState) {
  const now = performance.now();
  const alive = new Set();

  for (const b of nextState.bullets) {
    const id = b.id ?? `${b.x.toFixed(1)}:${b.y.toFixed(1)}`;
    alive.add(id);

    let r = game.renderBullets.get(id);
    if (!r) {
      r = {
        x: b.x,
        y: b.y,
        serverX: b.x,
        serverY: b.y,
        vx: 0,
        vy: 0,
        color: b.color,
        lastServerAt: now,
      };
      game.renderBullets.set(id, r);
      continue;
    }

    const dt = Math.max(0.001, (now - r.lastServerAt) / 1000);
    const svx = (b.x - r.serverX) / dt;
    const svy = (b.y - r.serverY) / dt;

    r.vx = svx;
    r.vy = svy;
    r.serverX = b.x;
    r.serverY = b.y;
    r.color = b.color;
    r.lastServerAt = now;
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
}
function updateBulletInterpolation(dt) {
  for (const r of game.renderBullets.values()) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.x += (r.serverX - r.x) * 0.22;
    r.y += (r.serverY - r.y) * 0.22;
  }
}

function getEnemyRenderPos(enemy) {
  return game.renderEnemies.get(enemy.id) || enemy;
}

function getBulletRenderPos(bullet) {
  const id = bullet.id ?? `${bullet.x.toFixed(1)}:${bullet.y.toFixed(1)}`;
  return game.renderBullets.get(id) || bullet;
}
function isVisibleWorld(x, y, pad = 0) {
  const sx = x - camera.x;
  const sy = y - camera.y;
  return sx >= -pad && sx <= canvas.width + pad && sy >= -pad && sy <= canvas.height + pad;
}

function updateScoreboard(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  scoreboardEl.innerHTML = sorted.map((p) => {
    const line = `${p.name}: ${p.score} (${p.weaponLabel} ${p.ammo === null ? 'inf' : p.ammo})`;
    return p.id === game.myId ? `<b>${line}</b>` : line;
  }).join('<br>');
}

function keyStateFromCode(code, isDown) {
  if (code === 'KeyW' || code === 'ArrowUp') input.up = isDown;
  if (code === 'KeyS' || code === 'ArrowDown') input.down = isDown;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = isDown;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = isDown;
}

window.addEventListener('keydown', (e) => {
  keyStateFromCode(e.code, true);
  if (e.code === 'Digit1' && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'weaponSwitch', weaponKey: 'pistol' }));
  }
});
window.addEventListener('keyup', (e) => keyStateFromCode(e.code, false));
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) input.shooting = true; });
window.addEventListener('mouseup', () => { input.shooting = false; });
canvas.addEventListener('mousemove', (e) => { input.pointerX = e.clientX; input.pointerY = e.clientY; });

joinForm.addEventListener('click', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLButtonElement)) return;
  joinMode = t.dataset.mode || 'create';
});

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (ws.readyState !== WebSocket.OPEN) return;
  const roomCode = joinMode === 'create' ? '' : roomCodeInput.value.trim();
  sendJoinRequest(roomCode);
});


refreshRoomsBtn?.addEventListener('click', () => {
  requestRoomsList();
});

setInterval(() => {
  if (!game.myId && game.connected) requestRoomsList();
}, 5000);
ws.addEventListener('open', () => {
  game.connected = true;
  statusEl.textContent = 'Connected. Create room or join code.';
  requestRoomsList();
});

ws.addEventListener('close', () => {
  game.connected = false;
  statusEl.textContent = 'Disconnected';
});
ws.addEventListener('message', (ev) => {
  let msg;
  try { msg = JSON.parse(ev.data); } catch { return; }

  if (msg.type === 'welcome') {
    game.myId = msg.id;
    game.roomCode = msg.roomCode;
    game.renderPlayers.clear();
    game.renderEnemies.clear();
    game.renderBullets.clear();
    roomMetaEl.textContent = `Room: ${msg.roomCode}`;
    statusEl.textContent = `Online as ${msg.id}`;
  }

  if (msg.type === 'joinError') {
    statusEl.textContent = msg.message;
    joinOverlay.style.display = 'grid';
    requestRoomsList();
  }

  if (msg.type === 'system') statusEl.textContent = msg.message;

  if (msg.type === 'state') {
    const s = msg.payload;
    syncBulletsFromState(s);
    processStateFx(s);
    game.state = s;
    game.world = s.world;
    game.roomCode = s.roomCode;
    roomMetaEl.textContent = `Room: ${s.roomCode}`;

    game.sortedTrees = (s.decor?.trees || []).slice().sort((a, b) => a.y - b.y);
    updateScoreboard(s.players);

    const me = s.players.find((p) => p.id === game.myId);
    if (me) {
      weaponMetaEl.textContent = `Weapon: ${me.weaponLabel} | Ammo: ${me.ammo === null ? 'inf' : me.ammo}`;
    }
  }
});

function sendInput() {
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) return;
  const me = game.state.players.find((p) => p.id === game.myId);
  if (!me) return;

  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  ws.send(JSON.stringify({
    type: 'input',
    moveX,
    moveY,
    aimX: input.pointerX + camera.x,
    aimY: input.pointerY + camera.y,
    shooting: input.shooting,
  }));
}

function spawnBlood(x, y, count) {
  const q = getQ();
  const n = Math.floor(count * q.bloodMult);
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 170;
    visuals.blood.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.2 + Math.random() * 0.45, ttl: 0.2 + Math.random() * 0.45, s: 1.2 + Math.random() * 2.4 });
  }
  if (visuals.blood.length > q.maxBlood) visuals.blood.splice(0, visuals.blood.length - q.maxBlood);
}

function processStateFx(nextState) {
  const hpMap = new Map();
  for (const e of nextState.enemies) {
    hpMap.set(e.id, e.hp);
    const prevHp = visuals.enemyHp.get(e.id);
    if (typeof prevHp === 'number' && e.hp < prevHp) {
      spawnBlood(e.x, e.y, Math.max(2, Math.floor((prevHp - e.hp) * 0.45)));
    }
  }
  visuals.enemyHp = hpMap;

  const playersById = new Map(nextState.players.map((p) => [p.id, p]));
  const ids = new Set();
  for (const b of nextState.bullets) {
    ids.add(b.id);
    if (!visuals.bulletIds.has(b.id)) {
      const owner = playersById.get(b.ownerId);
      if (owner) {
        const a = Math.atan2(b.y - owner.y, b.x - owner.x);
        visuals.muzzle.push({ x: owner.x + Math.cos(a) * 20, y: owner.y + Math.sin(a) * 20, a, c: b.color || '#ffd166', life: 0.05, ttl: 0.05 });
      }
    }
  }
  visuals.bulletIds = ids;

  const maxM = getQ().maxMuzzle;
  if (visuals.muzzle.length > maxM) visuals.muzzle.splice(0, visuals.muzzle.length - maxM);
}

function updateFx(dt) {
  for (let i = visuals.blood.length - 1; i >= 0; i -= 1) {
    const p = visuals.blood[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    if (p.life <= 0) visuals.blood.splice(i, 1);
  }

  for (let i = visuals.muzzle.length - 1; i >= 0; i -= 1) {
    visuals.muzzle[i].life -= dt;
    if (visuals.muzzle[i].life <= 0) visuals.muzzle.splice(i, 1);
  }
}

function drawGround() {
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const q = getQ();
  if (q.groundTexture && visuals.groundTileCanvas) {
    const t = visuals.groundTileSize;
    const startX = Math.floor(camera.x / t) * t;
    const startY = Math.floor(camera.y / t) * t;
    const endX = camera.x + canvas.width + t;
    const endY = camera.y + canvas.height + t;

    for (let y = startY; y < endY; y += t) {
      for (let x = startX; x < endX; x += t) {
        ctx.drawImage(visuals.groundTileCanvas, x - camera.x, y - camera.y, t, t);
      }
    }
  }

  if (q.overlays) {
    const g = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.55, 70, canvas.width * 0.5, canvas.height * 0.55, Math.max(canvas.width, canvas.height) * 0.8);
    g.addColorStop(0, 'rgba(120,35,20,0.13)');
    g.addColorStop(1, 'rgba(16,8,8,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawCircle(x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x - camera.x, y - camera.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawHpBar(x, y, ratio) {
  const sx = x - camera.x - 19;
  const sy = y - camera.y - 36;
  if (sx < -40 || sx > canvas.width + 40 || sy < -20 || sy > canvas.height + 20) return;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(sx, sy, 38, 5);
  ctx.fillStyle = ratio > 0.35 ? '#84cc16' : '#ef4444';
  ctx.fillRect(sx, sy, 38 * ratio, 5);
}
function drawTrees() {
  for (const tr of game.sortedTrees) {
    if (!isVisibleWorld(tr.x, tr.y - 20, 60)) continue;
    const x = tr.x - camera.x;
    const y = tr.y - camera.y;
    const s = tr.scale || 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#2a211c';
    ctx.beginPath();
    ctx.moveTo(-2 * s, 10 * s);
    ctx.lineTo(6 * s, -18 * s);
    ctx.lineTo(12 * s, -16 * s);
    ctx.lineTo(3 * s, 12 * s);
    ctx.closePath();
    ctx.fill();

    const canopy = ['#132a1b', '#173221', '#1c3b27'];
    const blobs = [
      { x: -16, y: -24, r: 10 },
      { x: -6, y: -28, r: 11 },
      { x: 6, y: -28, r: 10 },
      { x: 16, y: -24, r: 9 },
      { x: -1, y: -21, r: 12 },
    ];

    for (let i = 0; i < blobs.length; i += 1) {
      const b = blobs[i];
      ctx.fillStyle = canopy[i % canopy.length];
      ctx.beginPath();
      ctx.arc(b.x * s, b.y * s, b.r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawPlayer(p, t, isMe, rx, ry) {
  if (!isVisibleWorld(rx, ry, 50)) return;
  const x = rx - camera.x;
  const y = ry - camera.y;

  if (!p.alive) {
    drawCircle(rx, ry, 18, '#6b7280');
    return;
  }

  const fw = 32;
  const fh = 48;
  if (sprites.player.complete && sprites.player.naturalWidth >= fw * 3) {
    const moving = isMe ? (input.up || input.down || input.left || input.right) : true;
    const phase = isMe ? 0 : (p.id.charCodeAt(0) % 3);
    const frame = moving ? (Math.floor(t * 9 + phase) % 3) : 1;

    ctx.save();
    ctx.translate(x, y + 2);
    const rv = game.renderPlayers.get(p.id);
    const faceLeft = isMe ? (input.pointerX > x) : ((rv?.vx || 0) < -0.2);
    if (faceLeft) ctx.scale(-1, 1);
    ctx.drawImage(sprites.player, frame * fw, 0, fw, fh, -18, -30, 36, 54);
    ctx.restore();
  } else {
    drawCircle(rx, ry, 18, isMe ? '#22d3ee' : '#a78bfa');
  }

  drawHpBar(rx, ry, Math.max(0, p.hp / p.maxHp));
  ctx.fillStyle = '#f8fafc';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, x, y - 42);
}

function drawEnemies(enemies, t) {
  const fw = 37;
  const fh = 45;
  const frames = Math.max(2, Math.floor((sprites.enemy.naturalWidth || (fw * 2)) / fw));

  for (const e of enemies) {
    const re = getEnemyRenderPos(e);
    if (!isVisibleWorld(re.x, re.y, 60)) continue;
    const x = re.x - camera.x;
    const y = re.y - camera.y;

    if (sprites.enemy.complete && sprites.enemy.naturalWidth >= fw * 2) {
      const frame = Math.floor(t * 12) % frames;
      ctx.drawImage(sprites.enemy, frame * fw, 0, fw, fh, x - 21, y - 24, 42, 50);
    } else {
      drawCircle(re.x, re.y, 18, '#ef4444');
    }

    drawHpBar(re.x, re.y, Math.max(0, e.hp / e.maxHp));
  }
}

function drawFx() {
  for (const p of visuals.blood) {
    if (!isVisibleWorld(p.x, p.y, 20)) continue;
    const a = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(180,16,28,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const f of visuals.muzzle) {
    if (!isVisibleWorld(f.x, f.y, 20)) continue;
    const a = Math.max(0, f.life / f.ttl);
    ctx.save();
    ctx.translate(f.x - camera.x, f.y - camera.y);
    ctx.rotate(f.a);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.c;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(18, 0);
    ctx.lineTo(0, 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function render(ts) {
  const dt = Math.min(0.05, (ts - lastFrameTs) / 1000);
  lastFrameTs = ts;

  fpsFrameCount += 1;
  fpsAccumSec += dt;
  if (fpsAccumSec >= 0.25) {
    if (fpsMetaEl) fpsMetaEl.textContent = `FPS: ${Math.round(fpsFrameCount / fpsAccumSec)}`;
    fpsFrameCount = 0;
    fpsAccumSec = 0;
  }

  updateFx(dt);
  updatePlayerInterpolation(dt);
  updateEnemyInterpolation(dt);
  updateBulletInterpolation(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!game.state) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText('Waiting for state from server...', 24, 40);
    requestAnimationFrame(render);
    return;
  }

  const me = game.state.players.find((p) => p.id === game.myId) || game.state.players[0];
  if (me) {
    const m = getPlayerRenderPos(me);
    camera.x = Math.max(0, Math.min(m.x - canvas.width / 2, game.world.width - canvas.width));
    camera.y = Math.max(0, Math.min(m.y - canvas.height / 2, game.world.height - canvas.height));
  }

  drawGround();

  for (const d of game.state.drops || []) {
    if (!isVisibleWorld(d.x, d.y, 30)) continue;
    const x = d.x - camera.x;
    const y = d.y - camera.y;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x - 10, y);
    ctx.closePath();
    ctx.fillStyle = '#22c55e';
    ctx.fill();
  }

  drawTrees();

  for (const b of game.state.bullets) {
    const rb = getBulletRenderPos(b);
    if (!isVisibleWorld(rb.x, rb.y, 12)) continue;
    drawCircle(rb.x, rb.y, 3, rb.color || b.color || '#f59e0b');
  }

  drawEnemies(game.state.enemies, ts / 1000);

  for (const p of game.state.players) {
    const rp = getPlayerRenderPos(p);
    drawPlayer(p, ts / 1000, p.id === game.myId, rp.x, rp.y);
  }

  drawFx();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-camera.x, -camera.y, game.world.width, game.world.height);

  requestAnimationFrame(render);
}

setInterval(sendInput, 1000 / 30);
requestAnimationFrame(render);








































