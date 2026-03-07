
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const roomMetaEl = document.getElementById('room-meta');
const weaponMetaEl = document.getElementById('weapon-meta');
const fpsMetaEl = document.getElementById('fps-meta');
const scoreboardEl = document.getElementById('scoreboard');
const joinOverlay = document.getElementById('join-overlay');
const joinForm = document.getElementById('join-form');
const nameInput = document.getElementById('name');
const roomCodeInput = document.getElementById('room-code');
ctx.imageSmoothingEnabled = false;

const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${wsProto}://${location.host}`);

const input = { up: false, down: false, left: false, right: false, shooting: false, pointerX: 0, pointerY: 0 };
const game = { myId: null, roomCode: null, connected: false, world: { width: 2400, height: 1400 }, state: null };
const camera = { x: 0, y: 0 };
let joinMode = 'create';
let lastFrameTs = performance.now();
let fpsFrameCount = 0;
let fpsAccumSec = 0;
let fpsShown = 0;

const visuals = { blood: [], muzzle: [], enemyHp: new Map(), bulletIds: new Set(), groundPattern: null };

function loadImage(src) { const img = new Image(); img.src = src; return img; }
const sprites = {
  player: loadImage('/assets/sprites/player_dude.png'),
  enemy: loadImage('/assets/sprites/enemy_mummy.png'),
  tree: loadImage('/assets/sprites/tree.png'),
  ground: loadImage('/assets/tiles/ground_grass.jpg'),
};

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

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
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) return;
  joinMode = target.dataset.mode || 'create';
});

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (ws.readyState !== WebSocket.OPEN) return;
  const name = nameInput.value.trim() || 'Fighter';
  const roomCode = joinMode === 'create' ? '' : roomCodeInput.value.trim();
  ws.send(JSON.stringify({ type: 'join', name, roomCode }));
  joinOverlay.style.display = 'none';
});

ws.addEventListener('open', () => { game.connected = true; statusEl.textContent = 'Connected. Create room or join code.'; });
ws.addEventListener('close', () => { game.connected = false; statusEl.textContent = 'Disconnected'; });
ws.addEventListener('message', (ev) => {
  let msg;
  try { msg = JSON.parse(ev.data); } catch { return; }

  if (msg.type === 'welcome') {
    game.myId = msg.id;
    game.roomCode = msg.roomCode;
    roomMetaEl.textContent = `Room: ${msg.roomCode}`;
    statusEl.textContent = `Online as ${msg.id}`;
  }
  if (msg.type === 'joinError') {
    statusEl.textContent = msg.message;
    joinOverlay.style.display = 'grid';
  }
  if (msg.type === 'system') statusEl.textContent = msg.message;

  if (msg.type === 'state') {
    processStateFx(msg.payload);
    game.state = msg.payload;
    game.world = msg.payload.world;
    roomMetaEl.textContent = `Room: ${msg.payload.roomCode}`;
  }
});

function sendInput() {
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) return;
  const me = game.state.players.find((p) => p.id === game.myId);
  if (!me) return;

  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const aimX = input.pointerX + camera.x;
  const aimY = input.pointerY + camera.y;
  ws.send(JSON.stringify({ type: 'input', moveX, moveY, aimX, aimY, shooting: input.shooting }));
}

function processStateFx(nextState) {
  const hpMap = new Map();
  for (const e of nextState.enemies) {
    hpMap.set(e.id, e.hp);
    const prevHp = visuals.enemyHp.get(e.id);
    if (typeof prevHp === 'number' && e.hp < prevHp) spawnBlood(e.x, e.y, Math.max(3, Math.floor((prevHp - e.hp) * 0.5)));
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
        visuals.muzzle.push({ x: owner.x + Math.cos(a) * 20, y: owner.y + Math.sin(a) * 20, a, c: b.color || '#ffd166', life: 0.06, ttl: 0.06 });
      }
    }
  }
  visuals.bulletIds = ids;
}

function spawnBlood(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const sp = 30 + Math.random() * 210;
    visuals.blood.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25 + Math.random() * 0.6, ttl: 0.25 + Math.random() * 0.6, s: 1.5 + Math.random() * 3.5 });
  }
}

function updateFx(dt) {
  for (let i = visuals.blood.length - 1; i >= 0; i -= 1) {
    const p = visuals.blood[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.95; p.vy *= 0.95;
    if (p.life <= 0) visuals.blood.splice(i, 1);
  }
  for (let i = visuals.muzzle.length - 1; i >= 0; i -= 1) {
    visuals.muzzle[i].life -= dt;
    if (visuals.muzzle[i].life <= 0) visuals.muzzle.splice(i, 1);
  }
}

function drawGround() {
  if (sprites.ground.complete && sprites.ground.naturalWidth > 0) {
    if (!visuals.groundPattern) visuals.groundPattern = ctx.createPattern(sprites.ground, 'repeat');
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.fillStyle = visuals.groundPattern;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, game.world.width, game.world.height);

    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(8,10,14,0.78)';
    ctx.fillRect(0, 0, game.world.width, game.world.height);

    const lavaGlow = ctx.createRadialGradient(
      game.world.width * 0.5,
      game.world.height * 0.55,
      120,
      game.world.width * 0.5,
      game.world.height * 0.55,
      Math.max(game.world.width, game.world.height) * 0.7
    );
    lavaGlow.addColorStop(0, 'rgba(120,35,20,0.16)');
    lavaGlow.addColorStop(1, 'rgba(25,8,8,0.03)');
    ctx.fillStyle = lavaGlow;
    ctx.fillRect(0, 0, game.world.width, game.world.height);

    ctx.restore();
  } else {
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawCircle(x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x - camera.x, y - camera.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawHpBar(x, y, ratio) {
  const sx = x - camera.x - 19;
  const sy = y - camera.y - 36;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(sx, sy, 38, 5);
  ctx.fillStyle = ratio > 0.35 ? '#84cc16' : '#ef4444';
  ctx.fillRect(sx, sy, 38 * ratio, 5);
}
function drawPlayer(p, t) {
  const x = p.x - camera.x;
  const y = p.y - camera.y;
  const fw = 32;
  const fh = 48;
  if (sprites.player.complete && sprites.player.naturalWidth >= fw * 3) {
    const moving = input.up || input.down || input.left || input.right;
    const frame = moving ? Math.floor(t * 10) % 3 : 1;
    ctx.save();
    ctx.translate(x, y + 2);
    if (input.pointerX < x) ctx.scale(-1, 1);
    ctx.drawImage(sprites.player, frame * fw, 0, fw, fh, -18, -30, 36, 54);
    ctx.restore();
  } else {
    drawCircle(p.x, p.y, 18, '#22d3ee', '#fff');
  }
}

function drawEnemy(e, t) {
  const x = e.x - camera.x;
  const y = e.y - camera.y;
  const fw = 37;
  const fh = 45;
  if (sprites.enemy.complete && sprites.enemy.naturalWidth >= fw * 2) {
    const frames = Math.max(2, Math.floor(sprites.enemy.naturalWidth / fw));
    const frame = Math.floor(t * 12) % frames;
    ctx.drawImage(sprites.enemy, frame * fw, 0, fw, fh, x - 21, y - 24, 42, 50);
  } else {
    drawCircle(e.x, e.y, 18, '#ef4444', 'rgba(255,255,255,0.2)');
  }
}

function drawTrees() {
  const trees = game.state?.decor?.trees || [];
  const sorted = [...trees].sort((a, b) => a.y - b.y);
  for (const tr of sorted) {
    const x = tr.x - camera.x;
    const y = tr.y - camera.y;
    const s = tr.scale || 1;

    ctx.save();
    ctx.translate(x, y);

    // Trunk
    ctx.fillStyle = '#2a211c';
    ctx.beginPath();
    ctx.moveTo(-2 * s, 10 * s);
    ctx.lineTo(6 * s, -18 * s);
    ctx.lineTo(12 * s, -16 * s);
    ctx.lineTo(3 * s, 12 * s);
    ctx.closePath();
    ctx.fill();

    // Canopy layers (dark, non-neon)
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

    // Slight top highlight to keep shape readable on dark floor
    ctx.fillStyle = 'rgba(92, 140, 100, 0.18)';
    ctx.beginPath();
    ctx.arc(-2 * s, -30 * s, 12 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawDrop(drop) {
  const x = drop.x - camera.x;
  const y = drop.y - camera.y;
  ctx.beginPath();
  ctx.moveTo(x, y - 12); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 10, y);
  ctx.closePath();
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.fillText(drop.weaponLabel, x, y - 16);
}

function drawFx() {
  for (const p of visuals.blood) {
    const a = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(180,16,28,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of visuals.muzzle) {
    const a = Math.max(0, f.life / f.ttl);
    ctx.save();
    ctx.translate(f.x - camera.x, f.y - camera.y);
    ctx.rotate(f.a);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.c;
    ctx.beginPath();
    ctx.moveTo(0, -2); ctx.lineTo(18, 0); ctx.lineTo(0, 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function render(ts) {
  const dt = Math.min(0.05, (ts - lastFrameTs) / 1000);
  fpsFrameCount += 1;
  fpsAccumSec += dt;
  if (fpsAccumSec >= 0.25) {
    fpsShown = Math.round(fpsFrameCount / fpsAccumSec);
    if (fpsMetaEl) fpsMetaEl.textContent = `FPS: ${fpsShown}`;
    fpsFrameCount = 0;
    fpsAccumSec = 0;
  }
  lastFrameTs = ts;
  updateFx(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!game.state) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText('Waiting for state from server...', 24, 40);
    requestAnimationFrame(render);
    return;
  }

  const now = ts / 1000;
  const me = game.state.players.find((p) => p.id === game.myId) || game.state.players[0];
  if (me) {
    camera.x = Math.max(0, Math.min(me.x - canvas.width / 2, game.world.width - canvas.width));
    camera.y = Math.max(0, Math.min(me.y - canvas.height / 2, game.world.height - canvas.height));
    weaponMetaEl.textContent = `Weapon: ${me.weaponLabel} | Ammo: ${me.ammo === null ? 'inf' : me.ammo}`;
  }

  drawGround();
  for (const d of game.state.drops || []) drawDrop(d);
  drawTrees();
  for (const b of game.state.bullets) drawCircle(b.x, b.y, 3, b.color || '#f59e0b');

  for (const e of game.state.enemies) {
    drawEnemy(e, now);
    drawHpBar(e.x, e.y, Math.max(0, e.hp / e.maxHp));
  }

  for (const p of game.state.players) {
    const isMe = p.id === game.myId;
    if (!p.alive) drawCircle(p.x, p.y, 18, '#6b7280', 'rgba(255,255,255,0.2)');
    else if (isMe) drawPlayer(p, now);
    else drawCircle(p.x, p.y, 18, '#a78bfa', 'rgba(255,255,255,0.2)');

    drawHpBar(p.x, p.y, Math.max(0, p.hp / p.maxHp));
    ctx.fillStyle = '#f8fafc';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x - camera.x, p.y - camera.y - 42);
  }

  drawFx();

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-camera.x, -camera.y, game.world.width, game.world.height);

  const sorted = [...game.state.players].sort((a, b) => b.score - a.score);
  scoreboardEl.innerHTML = sorted.map((p) => {
    const line = `${p.name}: ${p.score} (${p.weaponLabel} ${p.ammo === null ? 'inf' : p.ammo})`;
    return p.id === game.myId ? `<b>${line}</b>` : line;
  }).join('<br>');

  requestAnimationFrame(render);
}

setInterval(sendInput, 1000 / 30);
requestAnimationFrame(render);






