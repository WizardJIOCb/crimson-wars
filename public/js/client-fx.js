function spawnBlood(x, y, count, dirX = 0, dirY = 0, dirBias = 0.58) {
  const q = getQ();
  const n = Math.floor(count * q.bloodMult);
  const len = Math.hypot(Number(dirX) || 0, Number(dirY) || 0);
  const hasDir = len > 0.0001;
  const ndx = hasDir ? (Number(dirX) || 0) / len : 0;
  const ndy = hasDir ? (Number(dirY) || 0) / len : 0;
  const bias = hasDir ? Math.max(0, Math.min(0.95, Number(dirBias) || 0.58)) : 0;
  const baseDirAngle = hasDir ? Math.atan2(ndy, ndx) : 0;
  const cone = 0.34 + (1 - bias) * 0.22;
  for (let i = 0; i < n; i += 1) {
    const randA = Math.random() * Math.PI * 2;
    const a = hasDir ? (baseDirAngle + (Math.random() - 0.5) * cone * 2) : randA;
    const rx = Math.cos(a);
    const ry = Math.sin(a);
    let ox = rx;
    let oy = ry;
    if (hasDir) {
      ox = rx * (1 - bias * 0.25) + ndx * (bias * 0.25);
      oy = ry * (1 - bias * 0.25) + ndy * (bias * 0.25);
      const olen = Math.hypot(ox, oy) || 1;
      ox /= olen;
      oy /= olen;
    }
    const sp = hasDir
      ? (95 + Math.random() * 220 + bias * 90)
      : (30 + Math.random() * 170);
    visuals.blood.push({ x, y, vx: ox * sp, vy: oy * sp, life: 0.2 + Math.random() * 0.45, ttl: 0.2 + Math.random() * 0.45, s: 1.2 + Math.random() * 2.4 });
  }
  if (visuals.blood.length > q.maxBlood) visuals.blood.splice(0, visuals.blood.length - q.maxBlood);
}

function spawnBloodPuddle(x, y, intensity = 1) {
  visuals.bloodPuddles.push({
    x: x + (Math.random() * 10 - 5),
    y: y + (Math.random() * 10 - 5),
    r: 14 + Math.random() * 10 * intensity,
    life: 1.2 + Math.random() * 0.6,
    ttl: 1.2 + Math.random() * 0.6,
  });
  if (visuals.bloodPuddles.length > 60) visuals.bloodPuddles.splice(0, visuals.bloodPuddles.length - 60);
}

function spawnGoreBurst(x, y, damage = 10, dirX = 0, dirY = 0, dirBias = 0.44) {
  if (!game.extraBloodEnabled) return;
  const chunks = Math.max(3, Math.min(14, Math.floor(damage * 0.45)));
  const len = Math.hypot(Number(dirX) || 0, Number(dirY) || 0);
  const hasDir = len > 0.0001;
  const ndx = hasDir ? (Number(dirX) || 0) / len : 0;
  const ndy = hasDir ? (Number(dirY) || 0) / len : 0;
  const bias = hasDir ? Math.max(0, Math.min(0.9, Number(dirBias) || 0.44)) : 0;
  const baseDirAngle = hasDir ? Math.atan2(ndy, ndx) : 0;
  const cone = 0.5 + (1 - bias) * 0.24;
  for (let i = 0; i < chunks; i += 1) {
    const angle = hasDir ? (baseDirAngle + (Math.random() - 0.5) * cone * 2) : (Math.random() * Math.PI * 2);
    const rx = Math.cos(angle);
    const ry = Math.sin(angle);
    let ox = rx;
    let oy = ry;
    if (hasDir) {
      ox = rx * (1 - bias * 0.22) + ndx * (bias * 0.22);
      oy = ry * (1 - bias * 0.22) + ndy * (bias * 0.22);
      const olen = Math.hypot(ox, oy) || 1;
      ox /= olen;
      oy /= olen;
    }
    const speed = hasDir
      ? (80 + Math.random() * 150 + bias * 55)
      : (26 + Math.random() * 120);
    const lift = 45 + Math.random() * 120;
    visuals.gore.push({
      x,
      y,
      z: 4 + Math.random() * 8,
      vx: ox * speed,
      vy: oy * speed,
      vz: lift,
      life: 0.45 + Math.random() * 0.55,
      ttl: 0.45 + Math.random() * 0.55,
      s: 1.4 + Math.random() * 1.8,
      splat: false,
    });
  }
  if (visuals.gore.length > 260) visuals.gore.splice(0, visuals.gore.length - 260);
}

function spawnBossDeathExplosion(x, y) {
  spawnGroundExplosionFx(x, y, 210, { kind: 'boss', intensity: 1.35 });
  visuals.bossBlast.push({
    x,
    y,
    r: 16,
    maxR: 240,
    life: 0.7,
    ttl: 0.7,
  });
  if (visuals.bossBlast.length > 8) visuals.bossBlast.splice(0, visuals.bossBlast.length - 8);

  spawnBlood(x, y, 88);
  spawnGoreBurst(x, y, 56);
  spawnHitFx(x, y, 28, false);

  for (let i = 0; i < 12; i += 1) {
    spawnBloodPuddle(x + (Math.random() * 54 - 27), y + (Math.random() * 44 - 22), 1.4 + Math.random() * 0.8);
  }

  if (game.extraBloodEnabled) {
    for (let i = 0; i < 26; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      const lift = 120 + Math.random() * 170;
      visuals.gore.push({
        x: x + (Math.random() * 20 - 10),
        y: y + (Math.random() * 16 - 8),
        z: 9 + Math.random() * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: lift,
        life: 0.95 + Math.random() * 0.8,
        ttl: 0.95 + Math.random() * 0.8,
        s: 2.6 + Math.random() * 3.8,
        splat: false,
      });
    }

    for (let i = 0; i < 44; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 58 + Math.random() * 150;
      visuals.bloodMist.push({
        x: x + (Math.random() * 16 - 8),
        y: y + (Math.random() * 10 - 5),
        vx: Math.cos(angle) * speed * 0.9,
        vy: Math.sin(angle) * speed * 0.65 - (35 + Math.random() * 80),
        r: 7 + Math.random() * 16,
        life: 0.45 + Math.random() * 0.55,
        ttl: 0.45 + Math.random() * 0.55,
      });
    }
  }

  if (visuals.gore.length > 360) visuals.gore.splice(0, visuals.gore.length - 360);
  if (visuals.bloodMist.length > 160) visuals.bloodMist.splice(0, visuals.bloodMist.length - 160);
}

function getHitScreenOverlayEl() {
  if (visuals.hitScreenOverlayEl && document.body.contains(visuals.hitScreenOverlayEl)) {
    return visuals.hitScreenOverlayEl;
  }
  visuals.hitScreenOverlayEl = document.getElementById('hit-screen-overlay');
  return visuals.hitScreenOverlayEl;
}

function spawnHitScreenSplat(dirX = 0, dirY = 0, severity = 1) {
  const overlay = getHitScreenOverlayEl();
  if (!overlay) return;
  const len = Math.hypot(Number(dirX) || 0, Number(dirY) || 0) || 1;
  const nx = (Number(dirX) || 0) / len;
  const ny = (Number(dirY) || 0) / len;
  const dist = 90 + Math.random() * 220 + Math.min(140, severity * 8);
  const sideJitter = (Math.random() - 0.5) * 120;
  const px = -ny;
  const py = nx;
  const sx = nx * dist + px * sideJitter;
  const sy = ny * dist + py * sideJitter;
  const splat = document.createElement('div');
  splat.className = 'hit-screen-splat';
  splat.style.setProperty('--sx', `${Math.round(sx)}px`);
  splat.style.setProperty('--sy', `${Math.round(sy)}px`);
  splat.style.setProperty('--rot', `${Math.round(Math.random() * 360)}deg`);
  splat.style.setProperty('--splat-size', `${Math.round(58 + Math.random() * 64 + Math.min(54, severity * 2.2))}px`);
  splat.style.setProperty('--fade', `${Math.round(1100 + Math.random() * 900 + Math.min(900, severity * 12))}ms`);
  overlay.appendChild(splat);
  splat.addEventListener('animationend', () => {
    if (splat.parentNode === overlay) overlay.removeChild(splat);
  }, { once: true });
  if (overlay.childElementCount > 36) {
    while (overlay.childElementCount > 30) overlay.removeChild(overlay.firstChild);
  }
}

function triggerHitScreenFx(severity = 1, dirX = 0, dirY = 0) {
  const overlay = getHitScreenOverlayEl();
  if (!overlay) return;
  const menuOpen = getComputedStyle(document.getElementById('join-overlay')).display !== 'none';
  if (menuOpen) return;
  const boost = Math.max(0.06, Math.min(0.55, 0.11 + Number(severity || 0) * 0.012));
  const current = Math.max(0, Math.min(1, Number(overlay.dataset.hitFlash || 0)));
  const next = Math.max(current, Math.min(0.9, current + boost));
  overlay.dataset.hitFlash = String(next);
  overlay.style.setProperty('--hit-flash', next.toFixed(3));
  const splats = Math.max(1, Math.min(5, Math.round(1 + Number(severity || 0) / 14)));
  for (let i = 0; i < splats; i += 1) {
    const jitterX = (Math.random() - 0.5) * 0.7;
    const jitterY = (Math.random() - 0.5) * 0.7;
    spawnHitScreenSplat(dirX + jitterX, dirY + jitterY, severity);
  }
}

const ROCKET_TRAIL_TTL = 0.38;
const ROCKET_TRAIL_MAX_POINTS = 24;
const ROCKET_TRAIL_MIN_DIST = 8.5;

function getRocketTrailMap() {
  if (!(visuals.rocketTrails instanceof Map)) visuals.rocketTrails = new Map();
  return visuals.rocketTrails;
}

function addRocketTrailSample(id, x, y, vx, vy, color = '#fb923c', nowMs = performance.now(), options = {}) {
  const key = String(id || '').trim();
  if (!key) return null;
  const px = Number(x) || 0;
  const py = Number(y) || 0;
  const rvx = Number(vx) || 0;
  const rvy = Number(vy) || 0;
  const speed = Math.hypot(rvx, rvy) || 1;
  const dirX = rvx / speed;
  const dirY = rvy / speed;
  const tailOffset = Math.max(12, Math.min(22, speed * 0.019));
  const map = getRocketTrailMap();
  let trail = map.get(key);
  if (!trail) {
    const tailX = px - dirX * tailOffset;
    const tailY = py - dirY * tailOffset;
    trail = {
      id: key,
      color,
      points: [],
      lastX: tailX,
      lastY: tailY,
      lastAt: nowMs,
      seenAt: nowMs,
      vx: rvx,
      vy: rvy,
      dirX,
      dirY,
      seed: Math.random() * Math.PI * 2,
      dying: false,
    };
    map.set(key, trail);
  }

  trail.color = color || trail.color || '#fb923c';
  trail.vx = rvx;
  trail.vy = rvy;
  trail.seenAt = nowMs;
  trail.dying = false;
  const dirBlend = options.fromState ? 0.44 : 0.34;
  const prevDirX = Number(trail.dirX) || dirX;
  const prevDirY = Number(trail.dirY) || dirY;
  let smoothDirX = prevDirX + (dirX - prevDirX) * dirBlend;
  let smoothDirY = prevDirY + (dirY - prevDirY) * dirBlend;
  const smoothDirLen = Math.hypot(smoothDirX, smoothDirY) || 1;
  smoothDirX /= smoothDirLen;
  smoothDirY /= smoothDirLen;
  trail.dirX = smoothDirX;
  trail.dirY = smoothDirY;
  const sideSmoothX = -smoothDirY;
  const sideSmoothY = smoothDirX;
  const tailX = px - smoothDirX * tailOffset;
  const tailY = py - smoothDirY * tailOffset;

  const points = Array.isArray(trail.points) ? trail.points : [];
  trail.points = points;
  const last = points[points.length - 1] || null;
  const fromX = Number(last?.x ?? trail.lastX ?? tailX) || tailX;
  const fromY = Number(last?.y ?? trail.lastY ?? tailY) || tailY;
  const dist = Math.hypot(tailX - fromX, tailY - fromY);
  const elapsed = Math.max(0, nowMs - (Number(trail.lastAt) || 0));
  const renderSample = Boolean(options.fromRender);
  if (renderSample && nowMs - (Number(trail.lastRenderSampleAt) || 0) < 28) return trail;
  if (dist < ROCKET_TRAIL_MIN_DIST && elapsed < (renderSample ? 34 : 28)) return trail;
  if (renderSample) trail.lastRenderSampleAt = nowMs;

  const stateSample = Boolean(options.fromState);
  const steps = Math.min(4, Math.max(1, Math.ceil(dist / (stateSample ? 26 : 22))));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const sx = fromX + (tailX - fromX) * t;
    const sy = fromY + (tailY - fromY) * t;
    const wave = Math.sin(nowMs * 0.017 + trail.seed + i * 1.73);
    const jitter = (wave * 0.65 + (Math.random() - 0.5) * 1.15) * (stateSample ? 0.24 : 0.42);
    points.push({
      x: sx + sideSmoothX * jitter,
      y: sy + sideSmoothY * jitter,
      vx: rvx * 0.12 - smoothDirX * (9 + Math.random() * 13) + sideSmoothX * (Math.random() * 10 - 5),
      vy: rvy * 0.12 - smoothDirY * (9 + Math.random() * 13) + sideSmoothY * (Math.random() * 10 - 5),
      age: 0,
      ttl: ROCKET_TRAIL_TTL * (0.86 + Math.random() * 0.24),
      size: 0.9 + Math.random() * 0.34,
      seed: Math.random() * Math.PI * 2,
    });
  }
  if (points.length > ROCKET_TRAIL_MAX_POINTS) points.splice(0, points.length - ROCKET_TRAIL_MAX_POINTS);
  trail.lastX = tailX;
  trail.lastY = tailY;
  trail.lastAt = nowMs;
  return trail;
}

function finishRocketTrail(id) {
  const key = String(id || '').trim();
  if (!key) return;
  if (visuals.rocketRenderAngles instanceof Map) visuals.rocketRenderAngles.delete(key);
  if (!(visuals.rocketTrails instanceof Map)) return;
  const trail = visuals.rocketTrails.get(key);
  if (!trail) return;
  trail.dying = true;
  trail.seenAt = performance.now() - 180;
}

function updateRocketTrails(dt) {
  if (!(visuals.rocketTrails instanceof Map)) return;
  const nowMs = performance.now();
  for (const [id, trail] of visuals.rocketTrails.entries()) {
    const points = Array.isArray(trail.points) ? trail.points : [];
    const stale = nowMs - (Number(trail.seenAt) || 0) > 140;
    if (stale) trail.dying = true;
    const ageMul = trail.dying ? 1.55 : 1;
    for (let i = points.length - 1; i >= 0; i -= 1) {
      const p = points[i];
      p.age = (Number(p.age) || 0) + dt * ageMul;
      p.x += (Number(p.vx) || 0) * dt;
      p.y += (Number(p.vy) || 0) * dt;
      p.vx = (Number(p.vx) || 0) * Math.pow(0.36, dt);
      p.vy = (Number(p.vy) || 0) * Math.pow(0.36, dt);
      if (p.age >= Math.max(0.08, Number(p.ttl) || ROCKET_TRAIL_TTL)) points.splice(i, 1);
    }
    if (points.length <= 0 && stale) visuals.rocketTrails.delete(id);
  }
}

function spawnRocketTrailFx(x, y, vx, vy, color = '#fb923c') {
  const speed = Math.hypot(Number(vx) || 0, Number(vy) || 0) || 1;
  const dirX = (Number(vx) || 0) / speed;
  const dirY = (Number(vy) || 0) / speed;
  const tailX = x - dirX * 14;
  const tailY = y - dirY * 14;

  visuals.rocketFire.push({
    x: tailX + (Math.random() * 3 - 1.5),
    y: tailY + (Math.random() * 3 - 1.5),
    vx: (Number(vx) || 0) * 0.18 - dirX * (52 + Math.random() * 70) + (Math.random() * 26 - 13),
    vy: (Number(vy) || 0) * 0.18 - dirY * (52 + Math.random() * 70) + (Math.random() * 26 - 13),
    r: 5.5 + Math.random() * 4.5,
    life: 0.1 + Math.random() * 0.08,
    ttl: 0.1 + Math.random() * 0.08,
    color,
  });
  visuals.rocketSmoke.push({
    x: tailX + (Math.random() * 5 - 2.5),
    y: tailY + (Math.random() * 5 - 2.5),
    vx: (Number(vx) || 0) * 0.16 - dirX * (20 + Math.random() * 30) + (Math.random() * 16 - 8),
    vy: (Number(vy) || 0) * 0.16 - dirY * (20 + Math.random() * 30) + (Math.random() * 16 - 8),
    r: 8 + Math.random() * 7,
    life: 0.22 + Math.random() * 0.16,
    ttl: 0.22 + Math.random() * 0.16,
  });

  if (visuals.rocketFire.length > 90) visuals.rocketFire.splice(0, visuals.rocketFire.length - 90);
  if (visuals.rocketSmoke.length > 120) visuals.rocketSmoke.splice(0, visuals.rocketSmoke.length - 120);
}

function spawnRocketNovaFx(x, y) {
  const count = 40;
  for (let i = 0; i < count; i += 1) {
    const ang = (Math.PI * 2 * i) / count + (Math.random() * 0.12 - 0.06);
    const targetR = 330 + Math.random() * 320;
    const startR = 14 + Math.random() * 24;
    visuals.rocketBlast.push({
      x,
      y,
      ox: x + Math.cos(ang) * startR,
      oy: y + Math.sin(ang) * startR,
      tx: x + Math.cos(ang) * targetR,
      ty: y + Math.sin(ang) * targetR,
      vx: Math.cos(ang) * (140 + Math.random() * 200),
      vy: Math.sin(ang) * (140 + Math.random() * 200),
      spring: 8.2 + Math.random() * 3.4,
      friction: 0.83 + Math.random() * 0.09,
      r: 12.8 + Math.random() * 8.4,
      rDecay: 0.94 + Math.random() * 0.025,
      life: 0.55 + Math.random() * 0.4,
      ttl: 0.55 + Math.random() * 0.4,
      color: Math.random() > 0.35 ? '#fb923c' : '#fde68a',
    });
  }
  if (visuals.rocketBlast.length > 520) visuals.rocketBlast.splice(0, visuals.rocketBlast.length - 520);
}

function getExplosionSurfacePalette(material) {
  const key = String(material || 'asphalt_wet').toLowerCase();
  if (key === 'grass') {
    return {
      debris: ['#8a6a3d', '#5b4a2c', '#6f7f34', '#2f4a25'],
      dust: ['#6b5b34', '#4d4028', '#263b20'],
    };
  }
  if (key === 'dirt') {
    return {
      debris: ['#b77942', '#7a5230', '#d09a54', '#5b3a24'],
      dust: ['#8b6a3c', '#6b4a2c', '#4b3321'],
    };
  }
  if (key === 'concrete' || key === 'concrete_tiles') {
    return {
      debris: ['#d1d5db', '#aeb6bf', '#8f9aa7', '#5f6b76'],
      dust: ['#b6bec7', '#8f99a5', '#6b7280'],
    };
  }
  if (key === 'toxic') {
    return {
      debris: ['#c9f45c', '#a3e635', '#617326', '#2f451b'],
      dust: ['#84cc16', '#536326', '#233514'],
    };
  }
  return {
    debris: ['#cbd5e1', '#94a3b8', '#64748b', '#334155'],
    dust: ['#7b8490', '#535d6b', '#2f3742'],
  };
}

function resolveExplosionGroundMaterial(x, y) {
  const theme = game.state?.decor?.theme && typeof game.state.decor.theme === 'object'
    ? game.state.decor.theme
    : null;
  const baseMaterial = String(theme?.baseMaterial || 'asphalt_wet').toLowerCase();
  const zones = Array.isArray(game.state?.decor?.terrainZones) ? game.state.decor.terrainZones : [];
  for (let i = zones.length - 1; i >= 0; i -= 1) {
    const zone = zones[i];
    const material = String(zone?.material || '').toLowerCase();
    if (!material) continue;
    const cx = Number(zone?.x) || 0;
    const cy = Number(zone?.y) || 0;
    const halfW = Math.max(10, (Number(zone?.w) || 0) * 0.5);
    const halfH = Math.max(10, (Number(zone?.h) || 0) * 0.5);
    const angle = -(Number(zone?.angle) || 0);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = (Number(x) || 0) - cx;
    const dy = (Number(y) || 0) - cy;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const shape = String(zone?.shape || 'ellipse').toLowerCase();
    if (shape === 'rect' || shape === 'band') {
      if (Math.abs(lx) <= halfW * 1.08 && Math.abs(ly) <= halfH * 1.08) return material;
      continue;
    }
    const nx = lx / Math.max(1, halfW);
    const ny = ly / Math.max(1, halfH);
    if ((nx * nx) + (ny * ny) <= 1.12) return material;
  }
  return baseMaterial;
}

function buildExplosionScarShape(radius) {
  const outerCount = 17 + Math.floor(Math.random() * 8);
  const innerCount = 14 + Math.floor(Math.random() * 7);
  const cracks = [];
  const chips = [];
  const outer = [];
  const inner = [];

  for (let i = 0; i < outerCount; i += 1) {
    const step = (Math.PI * 2) / outerCount;
    outer.push({
      a: i * step + (Math.random() - 0.5) * step * 0.42,
      r: radius * (0.84 + Math.random() * 0.34),
    });
  }

  for (let i = 0; i < innerCount; i += 1) {
    const step = (Math.PI * 2) / innerCount;
    inner.push({
      a: i * step + (Math.random() - 0.5) * step * 0.34,
      r: radius * (0.34 + Math.random() * 0.2),
    });
  }

  const crackCount = Math.max(4, Math.min(12, Math.round(radius / 9) + Math.floor(Math.random() * 4)));
  for (let i = 0; i < crackCount; i += 1) {
    const a = Math.random() * Math.PI * 2;
    cracks.push({
      a,
      start: radius * (0.4 + Math.random() * 0.22),
      end: radius * (0.86 + Math.random() * 0.52),
      bend: (Math.random() - 0.5) * 0.28,
      width: 0.7 + Math.random() * 1.5,
    });
  }

  const chipCount = Math.max(8, Math.min(28, Math.round(radius / 3.8)));
  for (let i = 0; i < chipCount; i += 1) {
    const a = Math.random() * Math.PI * 2;
    chips.push({
      a,
      d: radius * (0.62 + Math.random() * 0.72),
      w: 2 + Math.random() * Math.max(2, radius * 0.08),
      h: 1.2 + Math.random() * Math.max(1.2, radius * 0.04),
      rot: Math.random() * Math.PI,
      alpha: 0.32 + Math.random() * 0.42,
    });
  }

  return { outer, inner, cracks, chips };
}

function spawnGroundExplosionFx(x, y, radius = 90, options = {}) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return;
  if (!Array.isArray(visuals.explosionScars)) visuals.explosionScars = [];
  if (!Array.isArray(visuals.groundDebris)) visuals.groundDebris = [];
  if (!Array.isArray(visuals.groundFragments)) visuals.groundFragments = [];

  const impactRadius = Math.max(42, Math.min(320, Number(radius) || 90));
  const intensity = Math.max(0.45, Math.min(1.8, Number(options?.intensity) || 1));
  const scarRadius = Math.max(16, Math.min(72, impactRadius * (0.28 + intensity * 0.038)));
  const material = String(options?.material || resolveExplosionGroundMaterial(x, y) || 'asphalt_wet').toLowerCase();
  const palette = getExplosionSurfacePalette(material);
  const life = Math.max(34, Math.min(180, 82 + scarRadius * 0.72 + Math.random() * 34));
  const shape = buildExplosionScarShape(scarRadius);

  visuals.explosionScars.push({
    x: Number(x) || 0,
    y: Number(y) || 0,
    r: scarRadius,
    material,
    kind: String(options?.kind || 'explosion').toLowerCase(),
    rot: Math.random() * Math.PI * 2,
    life,
    ttl: life,
    outer: shape.outer,
    inner: shape.inner,
    cracks: shape.cracks,
    chips: shape.chips,
  });
  if (visuals.explosionScars.length > 96) visuals.explosionScars.splice(0, visuals.explosionScars.length - 96);

  const q = typeof getQ === 'function' ? getQ() : {};
  const qualityMul = q.overlays === false ? 0.58 : 1;
  const debrisCount = Math.max(10, Math.min(42, Math.round((11 + scarRadius * 0.3) * intensity * qualityMul)));
  for (let i = 0; i < debrisCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (78 + Math.random() * 210) * (0.72 + intensity * 0.28);
    const lift = (210 + Math.random() * 330) * (0.75 + intensity * 0.28);
    const startDist = Math.random() * scarRadius * 0.34;
    const color = palette.debris[Math.floor(Math.random() * palette.debris.length)] || '#64748b';
    const ttl = 1.05 + Math.random() * 0.72 + intensity * 0.18;
    visuals.groundDebris.push({
      kind: 'chunk',
      x: Number(x) + Math.cos(angle) * startDist,
      y: Number(y) + Math.sin(angle) * startDist,
      z: 8 + Math.random() * 18,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 28,
      vy: Math.sin(angle) * speed * 0.72 + (Math.random() - 0.5) * 24,
      vz: lift,
      size: Math.max(3.8, Math.min(12.5, scarRadius * (0.065 + Math.random() * 0.06))),
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 14,
      color,
      edge: palette.debris[(Math.floor(Math.random() * palette.debris.length) + 1) % palette.debris.length] || '#111827',
      life: ttl,
      ttl,
      bounced: false,
      material,
    });
  }

  const dustCount = Math.max(4, Math.min(18, Math.round((5 + scarRadius * 0.11) * qualityMul)));
  for (let i = 0; i < dustCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (18 + Math.random() * 82) * intensity;
    const color = palette.dust[Math.floor(Math.random() * palette.dust.length)] || '#64748b';
    const ttl = 0.5 + Math.random() * 0.42;
    visuals.groundDebris.push({
      kind: 'dust',
      x: Number(x) + (Math.random() - 0.5) * scarRadius * 0.42,
      y: Number(y) + (Math.random() - 0.5) * scarRadius * 0.26,
      z: 2 + Math.random() * 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.62,
      vz: 30 + Math.random() * 85,
      r: 6 + Math.random() * Math.max(6, scarRadius * 0.22),
      grow: 18 + Math.random() * 36,
      color,
      life: ttl,
      ttl,
    });
  }

  if (visuals.groundDebris.length > 260) visuals.groundDebris.splice(0, visuals.groundDebris.length - 260);
}

function spawnRocketExplosionFx(x, y, radius = 96, options = {}) {
  spawnGroundExplosionFx(x, y, radius, {
    kind: options?.kind || 'rocket',
    intensity: Math.max(1, Number(options?.intensity) || 1.08),
    material: options?.material,
  });
  spawnSkillBurstFx(x, y, '#fb923c', 88);
  spawnRocketNovaFx(x, y);
}

function settleGroundDebrisChunk(chunk) {
  if (!chunk || chunk.settled) return;
  if (!Array.isArray(visuals.groundFragments)) visuals.groundFragments = [];
  const ttl = 2.1 + Math.random() * 1.8;
  visuals.groundFragments.push({
    x: Number(chunk.x) || 0,
    y: Number(chunk.y) || 0,
    size: Math.max(2.5, Number(chunk.size) || 4) * (0.86 + Math.random() * 0.38),
    rot: Number(chunk.rot) || 0,
    color: chunk.color || '#94a3b8',
    edge: chunk.edge || '#111827',
    alpha: 0.76 + Math.random() * 0.24,
    life: ttl,
    ttl,
  });
  if (visuals.groundFragments.length > 220) visuals.groundFragments.splice(0, visuals.groundFragments.length - 220);
  chunk.settled = true;
}

function spawnHitFx(x, y, severity = 1, isPlayerHit = false) {
  if (!game.hitEffectsEnabled) return;
  const count = Math.max(1, Math.min(6, Math.floor(1 + severity * 0.2 + (isPlayerHit ? 1.2 : 0))));
  const color = isPlayerHit ? '#fb7185' : '#fca5a5';
  for (let i = 0; i < count; i += 1) {
    visuals.hitFx.push({
      x: x + (Math.random() * 10 - 5),
      y: y + (Math.random() * 10 - 5),
      r: 5 + Math.random() * 5 + severity * 0.12,
      life: 0.14 + Math.random() * 0.1,
      ttl: 0.14 + Math.random() * 0.1,
      color,
    });
  }
  if (visuals.hitFx.length > 220) visuals.hitFx.splice(0, visuals.hitFx.length - 220);
}

function spawnRadialHitFx(x, y, radius, options = {}) {
  if (!game.hitEffectsEnabled) return;
  const count = Math.max(6, Math.min(24, Math.round(Number(options.count) || 12)));
  const color = options.color || '#bbf7d0';
  const severity = Math.max(1, Number(options.severity) || 4);
  for (let i = 0; i < count; i += 1) {
    const angle = ((Math.PI * 2 * i) / count) + ((Math.random() - 0.5) * 0.18);
    const dist = Math.max(12, Number(radius) || 0) * (0.86 + Math.random() * 0.18);
    visuals.hitFx.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      r: 5 + Math.random() * 6 + severity * 0.16,
      life: 0.16 + Math.random() * 0.12,
      ttl: 0.16 + Math.random() * 0.12,
      color,
    });
  }
  if (visuals.hitFx.length > 220) visuals.hitFx.splice(0, visuals.hitFx.length - 220);
}

function spawnObjectImpactFx(event) {
  if (!game.hitEffectsEnabled) return;
  if (!Array.isArray(visuals.objectImpactFx)) visuals.objectImpactFx = [];
  const x = Number(event?.x) || 0;
  const y = Number(event?.y) || 0;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const material = String(event?.material || 'concrete').toLowerCase();
  const dirX = Number(event?.dirX) || 0;
  const dirY = Number(event?.dirY) || -1;
  const backX = -dirX;
  const backY = -dirY;
  const hitNudgeX = (Number(event?.nx) || backX) * 3;
  const hitNudgeY = (Number(event?.ny) || backY) * 3;
  const damage = Math.max(1, Number(event?.damage) || 1);
  const isRocket = String(event?.bulletKind || '').toLowerCase() === 'rocket';
  const sparkCount = material === 'metal' ? 8 : (material === 'wood' ? 3 : 2);
  const dustCount = material === 'metal' ? 5 : (material === 'wood' ? 8 : 10);
  const burst = Math.max(0.8, Math.min(1.85, 0.85 + damage * 0.015 + (isRocket ? 0.55 : 0)));

  for (let i = 0; i < sparkCount; i += 1) {
    const spread = (Math.random() - 0.5) * 1.35;
    const speed = (130 + Math.random() * 260) * burst;
    const angle = Math.atan2(backY, backX) + spread;
    const vx = (Math.cos(angle) + (Math.random() - 0.5) * 0.5) * speed;
    const vy = (Math.sin(angle) + (Math.random() - 0.5) * 0.5) * speed;
    visuals.objectImpactFx.push({
      kind: 'spark',
      x: x + hitNudgeX + (Math.random() * 6 - 3),
      y: y + hitNudgeY + (Math.random() * 6 - 3),
      vx,
      vy,
      len: 8 + Math.random() * 15,
      r: 1.2 + Math.random() * 1.8,
      color: material === 'wood' ? '#fbbf24' : '#fde68a',
      life: 0.16 + Math.random() * 0.18,
      ttl: 0.16 + Math.random() * 0.18,
    });
  }

  for (let i = 0; i < dustCount; i += 1) {
    const angle = Math.atan2(backY, backX) + (Math.random() - 0.5) * 1.65;
    const speed = (24 + Math.random() * 76) * burst;
    const color = material === 'wood'
      ? (Math.random() > 0.45 ? '#a16207' : '#d6a56a')
      : (material === 'metal' ? '#64748b' : '#9ca3af');
    visuals.objectImpactFx.push({
      kind: 'smoke',
      x: x + hitNudgeX + (Math.random() * 10 - 5),
      y: y + hitNudgeY + (Math.random() * 10 - 5),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 18,
      r: (4 + Math.random() * 8) * (material === 'concrete' ? 1.25 : 1),
      grow: 10 + Math.random() * 20,
      color,
      life: 0.42 + Math.random() * 0.38,
      ttl: 0.42 + Math.random() * 0.38,
    });
  }

  visuals.objectImpactFx.push({
    kind: 'flash',
    x: x + hitNudgeX,
    y: y + hitNudgeY,
    r: (12 + Math.random() * 10) * burst,
    color: material === 'metal' ? '#facc15' : '#e5e7eb',
    life: 0.07,
    ttl: 0.07,
  });

  if (visuals.objectImpactFx.length > 360) visuals.objectImpactFx.splice(0, visuals.objectImpactFx.length - 360);
}

const trFx = (key, fallback = key) => {
  if (typeof window.cwI18nT !== 'function') return fallback;
  const out = window.cwI18nT(key);
  return out === key ? fallback : out;
};

function spawnSkillLabel(skillName, x, y) {
  visuals.skillLabels.push({
    text: String(skillName || 'Skill'),
    x,
    y,
    vy: -38,
    life: 0.65,
    ttl: 0.65,
  });
  if (visuals.skillLabels.length > 24) visuals.skillLabels.splice(0, visuals.skillLabels.length - 24);
}

function spawnSkillBurstFx(x, y, color = '#7dd3fc', radius = 100, options = {}) {
  const life = Math.max(0.16, Number(options?.life) || 0.5);
  visuals.skillBursts.push({
    x,
    y,
    r: Math.max(0, Number(options?.startRadius) || 18),
    maxR: radius,
    color,
    style: String(options?.style || 'default').toLowerCase(),
    growSpeed: Math.max(120, Number(options?.growSpeed) || 420),
    trailRings: Math.max(0, Math.round(Number(options?.trailRings) || 0)),
    accentColor: options?.accentColor || '',
    innerColor: options?.innerColor || '',
    spikeCount: Math.max(0, Math.round(Number(options?.spikeCount) || 0)),
    life,
    ttl: life,
  });
  if (visuals.skillBursts.length > 36) visuals.skillBursts.splice(0, visuals.skillBursts.length - 36);
}

function spawnMeleeFx(event = {}) {
  const x = Number(event?.x) || 0;
  const y = Number(event?.y) || 0;
  const impactX = Number(event?.impactX) || x;
  const impactY = Number(event?.impactY) || y;
  let angle = Number(event?.angle);
  if (!Number.isFinite(angle)) angle = 0;
  const range = Math.max(28, Number(event?.range) || 120);
  const width = Math.max(18, Number(event?.width) || 48);
  const arcDeg = Math.max(18, Math.min(180, Number(event?.arcDeg) || 78));
  const style = String(event?.style || 'slash').trim().toLowerCase();
  const hitCount = Math.max(0, Math.round(Number(event?.hitCount) || 0));
  const color = String(event?.color || '').trim() || (style === 'cryo_axe' ? '#67e8f9' : (style === 'void_scythe' ? '#c084fc' : '#fda4af'));
  const secondaryColor = String(event?.secondaryColor || '').trim() || (style === 'hammer' ? '#facc15' : '#ffffff');
  const life = style === 'hammer' ? 0.44 : (style === 'chainsaw' ? 0.36 : 0.3);
  const key = `melee:${String(event?.playerId || '')}:${String(event?.id || Date.now())}`;
  window.cwPlaySfx?.('melee', {
    x,
    y,
    key,
    minGapMs: 70,
    radius: 900,
    volume: Math.min(0.92, 0.38 + hitCount * 0.08),
    rateMin: style === 'hammer' ? 0.82 : 0.94,
    rateMax: style === 'chainsaw' ? 1.18 : 1.06,
  });

  if (!game.hitEffectsEnabled) return;
  if (!Array.isArray(visuals.meleeSwings)) visuals.meleeSwings = [];
  visuals.meleeSwings.push({
    id: String(event?.id || `${Date.now()}:${Math.random()}`),
    playerId: String(event?.playerId || ''),
    itemId: String(event?.itemId || ''),
    style,
    x,
    y,
    impactX,
    impactY,
    angle,
    range,
    width,
    arcDeg,
    hitCount,
    color,
    secondaryColor,
    phase: Math.random() * Math.PI * 2,
    life,
    ttl: life,
  });
  if (visuals.meleeSwings.length > 70) visuals.meleeSwings.splice(0, visuals.meleeSwings.length - 70);

  if (style === 'hammer') {
    spawnSkillBurstFx(impactX, impactY, color, Math.max(width * 1.35, range * 0.46), {
      style: 'shockwave',
      life: 0.32,
      growSpeed: 620,
      trailRings: 3,
      accentColor: secondaryColor,
      innerColor: color,
      spikeCount: 10,
    });
    spawnRadialHitFx(impactX, impactY, Math.max(36, width * 0.72), { color: secondaryColor, count: 14, severity: 6 });
  } else if (style === 'glaive' || style === 'scythe' || style === 'void_scythe') {
    spawnSkillBurstFx(impactX, impactY, color, Math.max(42, width * 0.9), {
      style: 'default',
      life: 0.24,
      growSpeed: 520,
      accentColor: secondaryColor,
    });
  } else if (hitCount > 0) {
    spawnRadialHitFx(impactX, impactY, Math.max(26, width * 0.44), { color, count: 8 + Math.min(8, hitCount * 2), severity: 4 });
  }

  if (hitCount > 0) {
    const label = String(event?.skillName || event?.itemName || '').trim();
    if (label) spawnSkillLabel(label, impactX, impactY - 12);
  }
}

function spawnXpChargeFx(player, options = {}) {
  if (!player || player.alive === false) return;
  if (!Array.isArray(visuals.xpCharge)) visuals.xpCharge = [];
  const q = getQ();
  const isMe = player.id === game.myId;
  const count = Math.max(1, Math.min(80, Math.round(Number(options.count) || 1)));
  const xp = Math.max(0, Math.min(240, Math.round(Number(options.xp) || 0)));
  const intensity = Math.max(0.75, Math.min(4.8, 0.72 + Math.sqrt(count) * 0.42 + Math.min(2.1, xp * 0.018)));
  const renderPos = typeof getPlayerRenderPos === 'function' ? getPlayerRenderPos(player) : null;
  const x = Number(renderPos?.x) || Number(player.x) || 0;
  const y = Number(renderPos?.y) || Number(player.y) || 0;
  const now = performance.now();

  let fx = visuals.xpCharge.find((item) => item.playerId === player.id && item.life > 0);
  if (!fx) {
    fx = {
      playerId: player.id,
      x,
      y,
      energy: 0,
      spin: Math.random() * Math.PI * 2,
      pulseAt: 0,
      life: 0.42,
      ttl: 0.42,
      isMe,
      particles: [],
    };
    visuals.xpCharge.push(fx);
  }

  fx.x = x;
  fx.y = y;
  fx.isMe = isMe;
  fx.energy = Math.min(7, Math.max(Number(fx.energy) || 0, intensity) + intensity * 0.52);
  fx.life = Math.min(0.74, Math.max(Number(fx.life) || 0, 0.32 + intensity * 0.075));
  fx.ttl = Math.max(Number(fx.ttl) || 0.42, fx.life);
  fx.pulseAt = now;

  const qualityMul = q.overlays === false ? 0.58 : 1;
  const particleCount = Math.max(4, Math.min(isMe ? 34 : 22, Math.round((4 + Math.sqrt(count) * 5.2 + intensity * 2.5) * qualityMul)));
  for (let i = 0; i < particleCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const startR = 20 + Math.random() * 34 + intensity * 5;
    const inward = 62 + Math.random() * 118 + intensity * 20;
    const ttl = 0.22 + Math.random() * 0.22 + Math.min(0.12, intensity * 0.025);
    fx.particles.push({
      angle,
      r: startR,
      vr: -inward,
      orbit: (Math.random() - 0.5) * (5.2 + intensity * 0.5),
      size: 2.2 + Math.random() * 3.8 + intensity * 0.35,
      life: ttl,
      ttl,
      color: Math.random() > 0.32 ? '#67e8f9' : '#fef08a',
    });
  }

  const maxParticles = isMe ? 96 : 58;
  if (fx.particles.length > maxParticles) fx.particles.splice(0, fx.particles.length - maxParticles);
  if (visuals.xpCharge.length > 12) visuals.xpCharge.splice(0, visuals.xpCharge.length - 12);
}

function getConsumableFxColor(event = {}) {
  const itemId = String(event.itemId || '').trim().toLowerCase();
  const useType = String(event.useType || '').trim().toLowerCase();
  if (useType === 'heal') return '#86efac';
  if (useType === 'regen') return '#34d399';
  if (useType === 'buff') return itemId.includes('adrenaline') ? '#fb7185' : '#facc15';
  if (useType === 'satellite') return itemId.includes('orbital') ? '#67e8f9' : '#a78bfa';
  if (useType === 'artillery') return itemId.includes('drone') ? '#93c5fd' : '#f97316';
  if (itemId.includes('shock')) return '#60a5fa';
  if (itemId.includes('incendiary')) return '#fb923c';
  if (itemId.includes('cluster')) return '#fde047';
  return '#fca5a5';
}

function getConsumableFxLabel(event = {}) {
  const itemId = String(event.itemId || '').trim().toLowerCase();
  const fallback = String(event.itemName || itemId || 'Item');
  if (itemId && typeof window.cwI18nT === 'function') {
    const translated = window.cwI18nT(`item.${itemId}.name`);
    if (translated && translated !== `item.${itemId}.name`) return translated;
  }
  return fallback;
}

function pushConsumableProjectile(projectile) {
  if (!Array.isArray(visuals.consumableProjectiles)) visuals.consumableProjectiles = [];
  visuals.consumableProjectiles.push(projectile);
  if (visuals.consumableProjectiles.length > 72) {
    visuals.consumableProjectiles.splice(0, visuals.consumableProjectiles.length - 72);
  }
}

function spawnConsumableAura(event, color) {
  if (!Array.isArray(visuals.consumableAuras)) visuals.consumableAuras = [];
  const durationSec = Math.max(0.8, Math.min(16, (Number(event.durationMs) || 1800) / 1000));
  const playerId = String(event.playerId || '');
  visuals.consumableAuras.push({
    playerId,
    x: Number(event.x) || 0,
    y: Number(event.y) || 0,
    color,
    kind: String(event.useType || '').trim().toLowerCase(),
    spin: Math.random() * Math.PI * 2,
    radius: Math.max(42, Math.min(130, Number(event.radius) || 92)),
    life: durationSec,
    ttl: durationSec,
  });
  if (visuals.consumableAuras.length > 16) visuals.consumableAuras.splice(0, visuals.consumableAuras.length - 16);
}

function spawnConsumableImpactFx(event, x, y, radius, color, options = {}) {
  const useType = String(event.useType || '').trim().toLowerCase();
  const itemId = String(event.itemId || '').trim().toLowerCase();
  const r = Math.max(54, Math.min(280, Number(radius) || Number(event.radius) || 90));
  const isShock = itemId.includes('shock');
  const isSatellite = useType === 'satellite';
  const style = isSatellite ? 'psi_blast' : (isShock ? 'shockwave' : 'default');
  const burstColor = color || getConsumableFxColor(event);

  spawnSkillBurstFx(x, y, burstColor, r, {
    style,
    startRadius: isSatellite ? 22 : 12,
    growSpeed: isSatellite ? Math.max(980, r * 6.4) : Math.max(520, r * 4.4),
    trailRings: isSatellite || isShock ? 5 : 2,
    spikeCount: isShock ? Math.max(10, Math.min(18, Math.round(r / 16))) : 0,
    life: isSatellite ? 0.58 : 0.42,
    accentColor: isShock ? '#bfdbfe' : burstColor,
    innerColor: isShock ? '#dbeafe' : burstColor,
  });
  spawnGroundExplosionFx(x, y, r, {
    kind: useType || itemId || 'consumable',
    intensity: isSatellite ? 1.18 : (useType === 'artillery' ? 1.12 : 0.95),
  });
  spawnRadialHitFx(x, y, r * 0.78, {
    count: Math.max(8, Math.min(22, Math.round(r / 13))),
    severity: isSatellite ? 8 : 5,
    color: burstColor,
  });
  registerImpactSource({
    x,
    y,
    radius: r,
    strength: isSatellite ? 2.35 : (useType === 'artillery' ? 1.9 : 1.55),
    ttlMs: isSatellite ? 620 : 430,
    radial: true,
    target: 'enemy',
  });

  if (itemId.includes('cluster')) {
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.42;
      const dist = r * (0.32 + Math.random() * 0.24);
      spawnSkillBurstFx(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, '#fde047', r * 0.32, {
        startRadius: 8,
        growSpeed: 460,
        life: 0.32,
      });
      spawnGroundExplosionFx(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, r * 0.32, {
        kind: 'cluster',
        intensity: 0.62,
      });
    }
  }

  if (options.label !== false) {
    spawnSkillLabel(getConsumableFxLabel(event), x, y - 8);
  }
}

function detonateConsumableProjectile(projectile) {
  if (!projectile || projectile.detonated) return;
  projectile.detonated = true;
  const event = projectile.event || {};
  const x = Number(projectile.toX) || Number(event.targetX) || 0;
  const y = Number(projectile.toY) || Number(event.targetY) || 0;
  const radius = Math.max(50, Number(projectile.radius) || Number(event.radius) || 90);
  const color = projectile.color || getConsumableFxColor(event);
  spawnConsumableImpactFx(event, x, y, radius, color, { label: projectile.label !== false });
}

function spawnQuickItemFx(event = {}) {
  const useType = String(event.useType || '').trim().toLowerCase();
  const color = getConsumableFxColor(event);
  const x = Number(event.x) || 0;
  const y = Number(event.y) || 0;
  const targetX = Number(event.targetX) || x;
  const targetY = Number(event.targetY) || y;
  const radius = Math.max(48, Number(event.radius) || 86);
  const label = getConsumableFxLabel(event);

  if (useType === 'heal' || useType === 'buff' || useType === 'regen') {
    spawnSkillBurstFx(x, y, color, radius, {
      startRadius: 14,
      growSpeed: 520,
      trailRings: useType === 'heal' ? 3 : 5,
      life: 0.5,
      accentColor: color,
      innerColor: '#f8fafc',
    });
    spawnRadialHitFx(x, y, radius * 0.55, {
      count: useType === 'heal' ? 10 : 14,
      severity: 3,
      color,
    });
    spawnConsumableAura(event, color);
    spawnSkillLabel(label, x, y - 10);
    return;
  }

  if (useType === 'satellite') {
    if (!Array.isArray(visuals.skillLinks)) visuals.skillLinks = [];
    visuals.skillLinks.push({
      x1: targetX,
      y1: targetY - 720,
      x2: targetX,
      y2: targetY,
      life: 0.24,
      ttl: 0.24,
      color,
      phase: Math.random() * Math.PI * 2,
    });
    pushConsumableProjectile({
      kind: 'beam',
      event,
      fromX: targetX,
      fromY: targetY - 720,
      toX: targetX,
      toY: targetY,
      radius,
      color,
      delay: 0.05,
      life: 0.18,
      ttl: 0.18,
    });
    return;
  }

  if (useType === 'artillery') {
    const waves = Array.isArray(event.waves) && event.waves.length
      ? event.waves
      : [{ x: targetX, y: targetY, delayMs: 0 }];
    waves.slice(0, 7).forEach((wave, index) => {
      const wx = Number(wave?.x) || targetX;
      const wy = Number(wave?.y) || targetY;
      const delay = Math.max(0, Number(wave?.delayMs) || index * 140) / 1000;
      pushConsumableProjectile({
        kind: 'beam',
        event,
        fromX: wx + (Math.random() - 0.5) * 26,
        fromY: wy - 620 - Math.random() * 80,
        toX: wx,
        toY: wy,
        radius,
        color,
        delay,
        life: 0.16,
        ttl: 0.16,
        label: index === 0,
      });
    });
    spawnSkillLabel(label, x, y - 10);
    return;
  }

  pushConsumableProjectile({
    kind: 'lob',
    event,
    fromX: x,
    fromY: y,
    toX: targetX,
    toY: targetY,
    radius,
    color,
    delay: 0,
    life: 0.34,
    ttl: 0.34,
    arc: 72,
  });
  spawnSkillLabel(label, x, y - 10);
}

function spawnWorldFx(event = {}) {
  const kind = String(event?.kind || '').trim().toLowerCase();
  const x = Number(event?.x) || 0;
  const y = Number(event?.y) || 0;
  const color = String(event?.color || '').trim() || '#c084fc';
  const secondaryColor = String(event?.secondaryColor || '').trim() || '#67e8f9';
  const radius = Math.max(140, Math.min(1200, Number(event?.radius) || 520));

  if (kind === 'xp_surge_pull') {
    window.cwPlaySfx?.('xpSurge', {
      x,
      y,
      key: `worldFx:${String(event?.id || Date.now())}`,
      minGapMs: 180,
      radius: 1400,
      volume: 0.78,
      rateMin: 0.94,
      rateMax: 1.04,
    });

    spawnSkillBurstFx(x, y, color, Math.min(520, radius * 0.36), {
      style: 'psi_blast',
      startRadius: 20,
      growSpeed: 980,
      trailRings: 7,
      spikeCount: 18,
      life: 0.74,
      accentColor: secondaryColor,
      innerColor: '#f5d0fe',
    });
    spawnRadialHitFx(x, y, Math.min(280, radius * 0.2), {
      color: secondaryColor,
      count: 24,
      severity: 4,
    });

    const fakePlayer = {
      id: String(event?.playerId || 'xp-surge'),
      x,
      y,
      alive: true,
    };
    spawnXpChargeFx(fakePlayer, { count: 64, xp: 180 });
    spawnSkillLabel('XP Surge', x, y - 18);
  }
}

window.spawnQuickItemFx = spawnQuickItemFx;
window.spawnMeleeFx = spawnMeleeFx;
window.spawnWorldFx = spawnWorldFx;

function getSkillCatalogDefForFx(skill, castType = '') {
  const sid = String(skill?.id || '').toLowerCase();
  const fxCastType = String(castType || skill?.castType || skill?.fx?.castType || '').toLowerCase();
  return game.skillCatalog?.[sid] || game.skillCatalog?.[fxCastType] || {};
}

function getSkillFxNumber(skill, castType, key, fallback = 0) {
  const def = getSkillCatalogDefForFx(skill, castType);
  const direct = Number(skill?.[key]);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const fromDef = Number(def?.[key]);
  if (Number.isFinite(fromDef) && fromDef > 0) return fromDef;
  return fallback;
}

function getSkillFxColor(skill, castType, fallback = '#a5b4fc') {
  const def = getSkillCatalogDefForFx(skill, castType);
  return skill?.fx?.color || def?.fx?.colors?.primary || def?.fx?.color || fallback;
}

function getSkillFxSecondaryColor(skill, castType, fallback = '#f8fafc') {
  const def = getSkillCatalogDefForFx(skill, castType);
  return skill?.fx?.secondaryColor || def?.fx?.colors?.secondary || def?.fx?.secondaryColor || fallback;
}

function getSkillFxLabel(skill, castType, fallback = 'Skill') {
  const sid = String(skill?.id || '').toLowerCase();
  const fxCastType = String(castType || skill?.castType || skill?.fx?.castType || '').toLowerCase();
  const def = getSkillCatalogDefForFx(skill, fxCastType);
  const fallbackName = String(skill?.name || def?.name || fallback || sid || fxCastType || 'Skill');
  if (sid) {
    const translated = trFx(`skill.${sid}.name`, fallbackName);
    if (translated && translated !== `skill.${sid}.name`) return translated;
  }
  return fxCastType ? trFx(`skill.${fxCastType}.name`, fallbackName) : fallbackName;
}

function psiBlastFxRadius(skill) {
  const lvl = Math.max(1, Number(skill?.level) || 1);
  const base = Math.max(120, getSkillFxNumber(skill, 'psi_blast', 'radius', 760));
  const perLevel = Math.max(0, getSkillFxNumber(skill, 'psi_blast', 'radiusPerLevel', 48));
  return Math.max(220, base + perLevel * (lvl - 1));
}

function spawnDodgeWindFx(x, y, dirX = 1, dirY = 0, isMe = false) {
  const len = Math.hypot(Number(dirX) || 0, Number(dirY) || 0) || 1;
  const nx = (Number(dirX) || 0) / len;
  const ny = (Number(dirY) || 0) / len;
  const px = -ny;
  const py = nx;
  const count = isMe ? 14 : 10;

  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    const back = 8 + t * (isMe ? 36 : 28) + Math.random() * 8;
    const side = (Math.random() - 0.5) * (isMe ? 14 : 10);
    const sx = x - nx * back + px * side;
    const sy = y - ny * back + py * side;
    const drift = 18 + Math.random() * 42;

    visuals.dodgeWind.push({
      x: sx,
      y: sy,
      vx: -nx * drift + px * (Math.random() * 24 - 12),
      vy: -ny * drift + py * (Math.random() * 24 - 12),
      r: 2.5 + Math.random() * (isMe ? 3.4 : 2.8),
      life: 0.16 + Math.random() * 0.12,
      ttl: 0.16 + Math.random() * 0.12,
      alpha: isMe ? 0.52 : 0.4,
      color: isMe ? '#bfdbfe' : '#cbd5e1',
    });
  }

  if (visuals.dodgeWind.length > 220) visuals.dodgeWind.splice(0, visuals.dodgeWind.length - 220);
}

function spawnForceShieldFx(player, previous = null) {
  if (!game.hitEffectsEnabled) return;
  if (!Array.isArray(visuals.forceShield)) visuals.forceShield = [];
  const renderPos = typeof getPlayerRenderPos === 'function' ? getPlayerRenderPos(player) : null;
  const x = Number(renderPos?.x) || Number(player?.x) || 0;
  const y = Number(renderPos?.y) || Number(player?.y) || 0;
  let dirX = Number(player?.shieldHitDirX) || 0;
  let dirY = Number(player?.shieldHitDirY) || -1;
  if (Math.hypot(dirX, dirY) < 0.001 && previous) {
    dirX = (Number(previous.x) || x) - x;
    dirY = (Number(previous.y) || y) - y;
  }
  if (Math.hypot(dirX, dirY) < 0.001) {
    dirX = 0;
    dirY = -1;
  }
  const len = Math.hypot(dirX, dirY) || 1;
  const absorbed = Math.max(1, Number(player?.shieldLastAbsorbed) || 1);
  visuals.forceShield.push({
    x,
    y: y - 8,
    dirX: dirX / len,
    dirY: dirY / len,
    radius: Math.max(34, Math.min(68, 38 + absorbed * 0.42)),
    width: Math.max(5, Math.min(12, 5 + absorbed * 0.08)),
    life: 0.46,
    ttl: 0.46,
    isMe: player?.id === game.myId,
    broken: Math.max(0, Number(player?.shieldHp) || 0) <= 0,
  });
  if (visuals.forceShield.length > 80) visuals.forceShield.splice(0, visuals.forceShield.length - 80);
}

function spawnBladeOrbitFx(x, y, skill = null) {
  const bladeCount = 5;
  const primaryColor = getSkillFxColor(skill, 'blade_orbit', '#fde68a');
  const secondaryColor = getSkillFxSecondaryColor(skill, 'blade_orbit', '#fca5a5');
  for (let i = 0; i < bladeCount; i += 1) {
    const radius = 92 + Math.random() * 34;
    const life = 0.62 + Math.random() * 0.12;
    const orbitDir = Math.random() > 0.5 ? 1 : -1;
    visuals.skillArcs.push({
      x,
      y,
      ang: (Math.PI * 2 * i) / bladeCount,
      spin: (5.8 + Math.random() * 2.6) * orbitDir,
      radius,
      baseRadius: radius,
      orbitDir,
      bladeRot: Math.random() * Math.PI * 2,
      bladeRotSpeed: (15 + Math.random() * 7) * orbitDir,
      bladeLength: 26 + Math.random() * 8,
      bladeWidth: 11 + Math.random() * 4,
      trailSpan: 0.42 + Math.random() * 0.18,
      pulseAmp: 10 + Math.random() * 7,
      pulseSpeed: 7.5 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      life,
      ttl: life,
      color: Math.random() > 0.4 ? primaryColor : secondaryColor,
    });
  }
  if (visuals.skillArcs.length > 140) visuals.skillArcs.splice(0, visuals.skillArcs.length - 140);
}

function spawnChainLightningFx(caster, nextState, skill = null) {
  const lvl = Math.max(1, Number(skill?.level) || 1);
  const radius = Math.max(90, getSkillFxNumber(skill, 'chain_lightning', 'radius', 430) + getSkillFxNumber(skill, 'chain_lightning', 'radiusPerLevel', 0) * (lvl - 1));
  const maxTargets = Math.max(1, Math.round(getSkillFxNumber(skill, 'chain_lightning', 'targets', 5) + getSkillFxNumber(skill, 'chain_lightning', 'targetsPerLevel', 0) * (lvl - 1)));
  const color = getSkillFxColor(skill, 'chain_lightning', '#67e8f9');
  const enemies = Array.isArray(nextState?.enemies) ? nextState.enemies : [];
  const targets = enemies
    .map((e) => {
      const dx = e.x - caster.x;
      const dy = e.y - caster.y;
      return { e, d2: dx * dx + dy * dy };
    })
    .filter((it) => it.d2 <= radius * radius)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, maxTargets);

  for (const t of targets) {
    const dx = t.e.x - caster.x;
    const dy = t.e.y - caster.y;
    registerImpactSource({
      x: t.e.x,
      y: t.e.y,
      dirX: dx,
      dirY: dy,
      radial: false,
      radius: 150,
      strength: 1.28,
      ttlMs: 260,
      target: 'enemy',
    });
    visuals.skillLinks.push({
      x1: caster.x,
      y1: caster.y - 8,
      x2: t.e.x,
      y2: t.e.y - 10,
      life: 0.2,
      ttl: 0.2,
      color,
      phase: Math.random() * Math.PI * 2,
    });
    spawnHitFx(t.e.x, t.e.y, 6, false);
  }
  spawnSkillBurstFx(caster.x, caster.y, color, Math.min(180, 108 + maxTargets * 12));
  if (visuals.skillLinks.length > 60) visuals.skillLinks.splice(0, visuals.skillLinks.length - 60);
}

function spawnLaserStrikeFx(caster, nextState, skill) {
  const lvl = Math.max(1, Number(skill?.level) || 1);
  const radius = Math.max(90, getSkillFxNumber(skill, 'laser_strike', 'radius', 320) + getSkillFxNumber(skill, 'laser_strike', 'radiusPerLevel', 0) * (lvl - 1));
  const maxTargets = Math.max(1, Math.round(getSkillFxNumber(skill, 'laser_strike', 'targets', 1) + getSkillFxNumber(skill, 'laser_strike', 'targetsPerLevel', 0) * (lvl - 1)));
  const color = getSkillFxColor(skill, 'laser_strike', '#f472b6');
  const secondaryColor = getSkillFxSecondaryColor(skill, 'laser_strike', '#f9a8d4');
  const enemies = Array.isArray(nextState?.enemies) ? nextState.enemies : [];
  const targets = enemies
    .map((e) => {
      const dx = e.x - caster.x;
      const dy = e.y - caster.y;
      return { e, d2: dx * dx + dy * dy };
    })
    .filter((it) => it.d2 <= radius * radius)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, maxTargets);

  spawnSkillBurstFx(caster.x, caster.y, secondaryColor, Math.min(170, 80 + maxTargets * 14));
  for (const t of targets) {
    const dx = t.e.x - caster.x;
    const dy = t.e.y - caster.y;
    registerImpactSource({
      x: t.e.x,
      y: t.e.y,
      dirX: dx,
      dirY: dy,
      radial: false,
      radius: 170,
      strength: 1.45,
      ttlMs: 280,
      target: 'enemy',
    });
    visuals.skillLinks.push({
      x1: caster.x,
      y1: caster.y - 7,
      x2: t.e.x,
      y2: t.e.y - 10,
      life: 0.14,
      ttl: 0.14,
      color,
      phase: Math.random() * Math.PI * 2,
    });
    spawnHitFx(t.e.x, t.e.y, 8, false);
  }
  if (visuals.skillLinks.length > 90) visuals.skillLinks.splice(0, visuals.skillLinks.length - 90);
}

function shockwaveFxRadius(skill) {
  const lvl = Math.max(1, Number(skill?.level) || 1);
  const base = Math.max(40, getSkillFxNumber(skill, 'shockwave', 'radius', 170));
  const perLevel = Math.max(0, getSkillFxNumber(skill, 'shockwave', 'radiusPerLevel', 14));
  return Math.max(70, base + perLevel * (lvl - 1));
}

function registerImpactSource(options = {}) {
  if (!Array.isArray(visuals.recentImpactSources)) visuals.recentImpactSources = [];
  visuals.recentImpactSources.push({
    x: Number(options.x) || 0,
    y: Number(options.y) || 0,
    dirX: Number(options.dirX) || 0,
    dirY: Number(options.dirY) || 0,
    radial: options.radial !== false,
    target: String(options.target || 'enemy').toLowerCase(),
    radius: Math.max(36, Number(options.radius) || 36),
    strength: Math.max(0.25, Math.min(3.2, Number(options.strength) || 1)),
    expireAt: Date.now() + Math.max(100, Number(options.ttlMs) || 300),
  });
  if (visuals.recentImpactSources.length > 48) {
    visuals.recentImpactSources.splice(0, visuals.recentImpactSources.length - 48);
  }
}

function spawnSkillCastFx(skillId, caster, nextState, skill) {
  const sid = String(skillId || skill?.castType || skill?.fx?.castType || skill?.id || '').toLowerCase();
  if (sid === 'shockwave') {
    const radius = shockwaveFxRadius(skill);
    const color = getSkillFxColor(skill, sid, '#86efac');
    const secondaryColor = getSkillFxSecondaryColor(skill, sid, '#bbf7d0');
    spawnSkillBurstFx(caster.x, caster.y, color, radius, {
      style: 'shockwave',
      startRadius: 10,
      growSpeed: Math.max(880, radius * 6.2),
      trailRings: 4,
      spikeCount: Math.max(10, Math.min(20, Math.round(radius / 18))),
      life: 0.42,
      accentColor: secondaryColor,
      innerColor: secondaryColor,
    });
    spawnRadialHitFx(caster.x, caster.y, radius * 0.9, {
      count: Math.max(8, Math.min(18, Math.round(radius / 16))),
      severity: 5,
      color: secondaryColor,
    });
    registerImpactSource({
      x: caster.x,
      y: caster.y,
      radius,
      strength: 1.45,
      ttlMs: 340,
      radial: true,
      target: 'enemy',
    });
    spawnHitFx(caster.x, caster.y, 12, caster.id === game.myId);
    spawnSkillLabel(getSkillFxLabel(skill, sid, 'Shockwave'), caster.x, caster.y - 12);
    return;
  }
  if (sid === 'blade_orbit') {
    spawnBladeOrbitFx(caster.x, caster.y, skill);
    registerImpactSource({
      x: caster.x,
      y: caster.y,
      radius: 340,
      strength: 1.34,
      ttlMs: 340,
      radial: true,
      target: 'enemy',
    });
    spawnSkillLabel(getSkillFxLabel(skill, sid, 'Blade Orbit'), caster.x, caster.y - 10);
    return;
  }
  if (sid === 'chain_lightning') {
    spawnChainLightningFx(caster, nextState, skill);
    spawnSkillLabel(getSkillFxLabel(skill, sid, 'Chain Lightning'), caster.x, caster.y - 10);
    return;
  }
  if (sid === 'laser_strike') {
    spawnLaserStrikeFx(caster, nextState, skill);
    spawnSkillLabel(getSkillFxLabel(skill, sid, 'Laser Strike'), caster.x, caster.y - 10);
    return;
  }
  if (sid === 'homing_missiles') {
    spawnSkillBurstFx(caster.x, caster.y, getSkillFxColor(skill, sid, '#fb923c'), 102);
    spawnSkillLabel(getSkillFxLabel(skill, sid, 'Homing Missiles'), caster.x, caster.y - 10);
    return;
  }
  if (sid === 'psi_blast') {
    const radius = psiBlastFxRadius(skill);
    spawnSkillBurstFx(caster.x, caster.y, getSkillFxColor(skill, sid, '#60a5fa'), radius, {
      style: 'psi_blast',
      growSpeed: 3900,
      trailRings: 6,
    });
    registerImpactSource({
      x: caster.x,
      y: caster.y,
      radius,
      strength: 2.15,
      ttlMs: 460,
      radial: true,
      target: 'enemy',
    });
    spawnSkillLabel(getSkillFxLabel(skill, sid, 'Psi Blast'), caster.x, caster.y - 12);
    return;
  }

  spawnSkillBurstFx(caster.x, caster.y, getSkillFxColor(skill, sid, '#a5b4fc'), 120);
  spawnSkillLabel(getSkillFxLabel(skill, sid, 'Skill'), caster.x, caster.y - 10);
}

function processSkillCastFx(nextState) {
  const seen = new Set();
  for (const p of nextState.players || []) {
    const skills = Array.isArray(p.skills) ? p.skills : [];
    for (const s of skills) {
      if ((s?.kind || '') !== 'active') continue;
      const sid = String(s.id || '').toLowerCase();
      if (!sid) continue;
      const key = `${p.id}:${sid}`;
      const cur = Math.max(0, Number(s.cooldownMs) || 0);
      const prev = visuals.skillCdPrev.get(key);
      seen.add(key);

      if (Number.isFinite(prev)) {
        const casted = cur > 180 && (prev <= 120 || (cur - prev) > 220);
        if (casted) {
          const castType = String(s.castType || s.fx?.castType || game.skillCatalog?.[sid]?.castType || sid).toLowerCase();
          spawnSkillCastFx(castType, p, nextState, s);
          window.cwPlaySfx?.('skill', { x: p.x, y: p.y, key: `skill:${p.id}:${sid}`, skillId: sid, castType, minGapMs: 140, volume: p.id === game.myId ? 1.1 : 0.72 });
        }
      }
      visuals.skillCdPrev.set(key, cur);
    }
  }

  for (const key of Array.from(visuals.skillCdPrev.keys())) {
    if (!seen.has(key)) visuals.skillCdPrev.delete(key);
  }
}

function processStateFx(nextState) {
  processSkillCastFx(nextState);

  const nowMs = Date.now();
  if (!Array.isArray(visuals.recentImpactSources)) visuals.recentImpactSources = [];
  visuals.recentImpactSources = visuals.recentImpactSources.filter((src) => Number(src?.expireAt) > nowMs);
  if (!(visuals.objectImpactEventIds instanceof Map)) visuals.objectImpactEventIds = new Map();
  for (const [key, seenAt] of Array.from(visuals.objectImpactEventIds.entries())) {
    if (nowMs - Number(seenAt || 0) > 5000) visuals.objectImpactEventIds.delete(key);
  }
  for (const event of nextState.objectImpactEvents || []) {
    const eventKey = `${event?.id ?? ''}:${event?.objectId || ''}:${Math.round(Number(event?.at) || 0)}`;
    if (visuals.objectImpactEventIds.has(eventKey)) continue;
    visuals.objectImpactEventIds.set(eventKey, nowMs);
    spawnObjectImpactFx(event);
  }

  const prevBulletsForImpact = visuals.prevBulletsForImpact instanceof Map ? visuals.prevBulletsForImpact : new Map();
  const currentBulletIds = new Set((nextState.bullets || []).map((b) => b.id));
  const vanishedBullets = [];
  for (const [id, bullet] of prevBulletsForImpact.entries()) {
    if (!currentBulletIds.has(id)) vanishedBullets.push(bullet);
  }

  const resolveImpactDir = (x, y, targetIsPlayer = false) => {
    let best = null;
    let bestScore = Infinity;

    for (const b of vanishedBullets) {
      if (!b) continue;
      const fromEnemy = Boolean(b.fromEnemy);
      if (targetIsPlayer && !fromEnemy) continue;
      if (!targetIsPlayer && fromEnemy) continue;
      const dx = x - (Number(b.x) || 0);
      const dy = y - (Number(b.y) || 0);
      const d2 = dx * dx + dy * dy;
      if (d2 > (190 * 190)) continue;
      const bulletStrength = 1;
      const score = d2 / (bulletStrength * bulletStrength);
      if (score < bestScore) {
        bestScore = score;
        best = { x: Number(b.vx) || dx, y: Number(b.vy) || dy, strength: bulletStrength };
      }
    }

    for (const src of visuals.recentImpactSources) {
      if (!src) continue;
      const target = String(src.target || 'enemy');
      if (targetIsPlayer && target === 'enemy') continue;
      if (!targetIsPlayer && target === 'player') continue;
      const sx = Number(src.x) || 0;
      const sy = Number(src.y) || 0;
      const dx = x - sx;
      const dy = y - sy;
      const d2 = dx * dx + dy * dy;
      const r = Math.max(36, Number(src.radius) || 36);
      if (d2 > (r * r)) continue;
      const strength = Math.max(0.25, Math.min(3.2, Number(src.strength) || 1));
      const score = d2 / (strength * strength);
      const dirX = src.radial === false ? (Number(src.dirX) || dx) : dx;
      const dirY = src.radial === false ? (Number(src.dirY) || dy) : dy;
      if (Math.hypot(dirX, dirY) < 0.0001) continue;
      if (score < bestScore) {
        bestScore = score;
        best = { x: dirX, y: dirY, strength };
      }
    }

    if (!best) return { x: 0, y: 0, strength: 0 };
    const len = Math.hypot(best.x, best.y) || 1;
    return { x: best.x / len, y: best.y / len, strength: best.strength || 1 };
  };

  const prevEnemyMap = visuals.enemyPrev;
  const nextEnemyMap = new Map();

  for (const e of nextState.enemies) {
    nextEnemyMap.set(e.id, {
      x: e.x,
      y: e.y,
      hp: e.hp,
      type: e.type,
      mobId: e.mobId || e.type || '',
      behavior: e.behavior || '',
      radius: Math.max(18, Number(e.radius) || 18),
      explosionRadius: Math.max(0, Number(e.explosionRadius) || 0),
    });
    const prev = prevEnemyMap.get(e.id);
    if (prev && e.hp < prev.hp) {
      const hitDamage = Math.max(1, prev.hp - e.hp);
      const hitDir = resolveImpactDir(e.x, e.y, false);
      spawnBlood(e.x, e.y, Math.max(2, Math.floor(hitDamage * 0.45)), hitDir.x, hitDir.y, 0.92 * (hitDir.strength || 1));
      spawnGoreBurst(e.x, e.y, hitDamage, hitDir.x, hitDir.y, 0.78 * (hitDir.strength || 1));
      spawnHitFx(e.x, e.y, hitDamage, false);
    }
  }

  for (const [id, prev] of prevEnemyMap.entries()) {
    if (!nextEnemyMap.has(id)) {
      if (prev.type === 'boss') {
        spawnBossDeathExplosion(prev.x, prev.y);
        window.cwPlaySfx?.('bossDeath', { x: prev.x, y: prev.y, key: `bossDeath:${id}`, radius: 1600, volume: 1.35 });
      } else {
        const prevBehavior = String(prev.behavior || '').toLowerCase();
        const prevMobId = String(prev.mobId || prev.type || '').toLowerCase();
        const isExplosiveEnemy = prevBehavior === 'exploder' || prevMobId.includes('exploder') || Number(prev.explosionRadius) > 0;
        if (isExplosiveEnemy) {
          const blastRadius = Math.max(78, Number(prev.explosionRadius) || (Math.max(18, Number(prev.radius) || 18) * 4.4));
          spawnRocketExplosionFx(prev.x, prev.y, blastRadius, { kind: 'enemy_explosion', intensity: 0.96 });
          spawnRadialHitFx(prev.x, prev.y, blastRadius * 0.72, {
            count: 14,
            color: '#fde68a',
            severity: 7,
          });
        }
        const hitDir = resolveImpactDir(prev.x, prev.y, false);
        spawnBlood(prev.x, prev.y, 18, hitDir.x, hitDir.y, 0.96 * (hitDir.strength || 1));
        spawnGoreBurst(prev.x, prev.y, 18, hitDir.x, hitDir.y, 0.82 * (hitDir.strength || 1));
        spawnBloodPuddle(prev.x, prev.y, 1);
        spawnHitFx(prev.x, prev.y, 14, false);
        window.cwPlaySfx?.('enemyDeath', { x: prev.x, y: prev.y, enemyType: prev.type, key: `enemyDeath:${id}`, minGapMs: 28, radius: 920, volume: 0.92 });
      }
    }
  }
  visuals.enemyPrev = nextEnemyMap;

  const prevMapObjectMap = visuals.mapObjectPrev instanceof Map ? visuals.mapObjectPrev : new Map();
  const nextMapObjectMap = new Map();
  const mapObjects = Array.isArray(nextState.decor?.objects) ? nextState.decor.objects : [];
  for (const obj of mapObjects) {
    nextMapObjectMap.set(obj.id, {
      x: Number(obj.x) || 0,
      y: Number(obj.y) || 0,
      hp: Math.max(0, Number(obj.hp) || 0),
      maxHp: Math.max(1, Number(obj.maxHp) || 1),
      explosive: Boolean(obj.explosive),
      destroyed: Boolean(obj.destroyed),
      w: Math.max(1, Number(obj.w) || 1),
      h: Math.max(1, Number(obj.h) || 1),
      explosionRadius: Math.max(0, Number(obj.explosionRadius) || 0),
    });
    const prev = prevMapObjectMap.get(obj.id);
    if (prev && !obj.destroyed && Number(obj.hp) < Number(prev.hp)) {
      const severity = Math.max(3, Math.round((Math.max(1, Number(prev.hp) - Number(obj.hp))) * 0.24));
      spawnHitFx(obj.x, obj.y, severity, false);
    }
    if (prev && !prev.destroyed && obj.destroyed) {
      if (obj.explosive) {
        const propBlastRadius = Math.max(
          72,
          Number(obj.explosionRadius) || Number(prev.explosionRadius) || Math.max(Number(obj.w) || 40, Number(obj.h) || 40) * 0.7,
        );
        spawnRocketExplosionFx(obj.x, obj.y, propBlastRadius, { kind: 'prop_explosion', intensity: 1.08 });
        spawnRadialHitFx(obj.x, obj.y, propBlastRadius, {
          count: 16,
          color: '#fdba74',
          severity: 8,
        });
        window.cwPlaySfx?.('rocketExplosion', {
          x: obj.x,
          y: obj.y,
          key: `propExplosion:${obj.id}`,
          minGapMs: 120,
          radius: 1800,
          volume: 1.08,
        });
      } else {
        spawnSkillBurstFx(obj.x, obj.y, '#94a3b8', Math.max(44, (Math.max(Number(obj.w) || 0, Number(obj.h) || 0) * 0.38)));
        spawnHitFx(obj.x, obj.y, 8, false);
      }
    }
  }
  visuals.mapObjectPrev = nextMapObjectMap;

  const bossAlive = Boolean(nextState.bossAlive);
  const prevBossPortalMap = visuals.bossPortalPrev || new Map();
  const nextBossPortalMap = new Map();
  for (const portal of nextState.bossPortals || []) {
    nextBossPortalMap.set(portal.id, { x: portal.x, y: portal.y, spawnAt: Number(portal.spawnAt) || 0 });
    if (!prevBossPortalMap.has(portal.id)) {
      window.cwPlaySfx?.('bossPortal', {
        x: portal.x,
        y: portal.y,
        key: `bossPortal:${portal.id}`,
        minGapMs: 600,
        radius: 2200,
        volume: 1.12,
        rateMin: 0.78,
        rateMax: 0.98,
      });
    }
  }
  visuals.bossPortalPrev = nextBossPortalMap;
  if (!visuals.prevBossAlive && bossAlive) {
    const boss = (nextState.enemies || []).find((e) => e.type === 'boss') || null;
    window.cwPlaySfx?.('bossSpawn', { x: boss?.x, y: boss?.y, key: 'bossSpawn', minGapMs: 2500, radius: 1800, volume: 1.08, rateMin: 0.74, rateMax: 0.96 });
  }
  visuals.prevBossAlive = bossAlive;

  const prevPlayerMap = visuals.playerPrev;
  const nextPlayerMap = new Map();
  for (const p of nextState.players) {
    nextPlayerMap.set(p.id, {
      x: p.x,
      y: p.y,
      hp: p.hp,
      alive: Boolean(p.alive),
      level: Math.max(1, Number(p.level) || 1),
      dodgeInvulnUntil: Number(p.dodgeInvulnUntil) || 0,
      moveX: Number(p.moveX) || 0,
      moveY: Number(p.moveY) || 0,
      aimX: Number(p.aimX) || Number(p.x) || 0,
      aimY: Number(p.aimY) || Number(p.y) || 0,
      weaponKey: String(p.weaponKey || 'pistol').toLowerCase(),
      magazineAmmo: Math.max(0, Number(p.magazineAmmo) || 0),
      reloadLeftMs: Math.max(0, Number(p.reloadLeftMs) || 0),
      reloadTotalMs: Math.max(0, Number(p.reloadTotalMs) || 0),
      shieldHp: Math.max(0, Number(p.shieldHp) || 0),
      shieldMax: Math.max(0, Number(p.shieldMax) || 0),
      shieldHitSeq: Math.max(0, Number(p.shieldHitSeq) || 0),
      xpChargeSeq: Math.max(0, Number(p.xpChargeSeq) || 0),
      xpChargeXp: Math.max(0, Number(p.xpChargeXp) || 0),
      isCompanion: Boolean(p.isCompanion),
      ownerId: p.ownerId || '',
    });
    const prev = prevPlayerMap.get(p.id);
    if (prev && Math.max(0, Number(p.shieldHitSeq) || 0) > Math.max(0, Number(prev.shieldHitSeq) || 0)) {
      spawnForceShieldFx(p, prev);
    }
    const nextXpChargeSeq = Math.max(0, Number(p.xpChargeSeq) || 0);
    const prevXpChargeSeq = Math.max(0, Number(prev?.xpChargeSeq) || 0);
    if (prev && p.alive !== false && !p.isCompanion && nextXpChargeSeq > prevXpChargeSeq) {
      spawnXpChargeFx(p, {
        count: nextXpChargeSeq - prevXpChargeSeq,
        xp: Math.max(0, (Number(p.xpChargeXp) || 0) - (Number(prev.xpChargeXp) || 0)),
      });
    }
    if (prev && p.hp < prev.hp) {
      const hitDamage = Math.max(1, prev.hp - p.hp);
      const meBonus = p.id === game.myId ? 1.45 : 1.2;
      const bloodCount = Math.max(7, Math.floor(hitDamage * 0.95 * meBonus));
      const hitDir = resolveImpactDir(p.x, p.y, true);
      spawnBlood(p.x, p.y, bloodCount, hitDir.x, hitDir.y, 0.9 * (hitDir.strength || 1));
      if (game.extraBloodEnabled) spawnGoreBurst(p.x, p.y, Math.max(6, hitDamage * 0.9), hitDir.x, hitDir.y, 0.76 * (hitDir.strength || 1));
      spawnHitFx(p.x, p.y, hitDamage * meBonus, true);
      if (p.id === game.myId) window.cwPlaySfx?.('playerHit', { x: p.x, y: p.y, key: 'playerHit:me', minGapMs: 260, volume: 0.88 });
      if (p.id === game.myId) triggerHitScreenFx(hitDamage * meBonus, hitDir.x, hitDir.y);
    }
    if (prev && prev.alive && !p.alive) {
      const hitDir = resolveImpactDir(p.x, p.y, true);
      spawnBlood(p.x, p.y, 24, hitDir.x, hitDir.y, 0.96 * (hitDir.strength || 1));
      spawnBloodPuddle(p.x, p.y, 1.15);
      spawnGoreBurst(p.x, p.y, 20, hitDir.x, hitDir.y, 0.82 * (hitDir.strength || 1));
      spawnHitFx(p.x, p.y, 18, true);
      window.cwPlaySfx?.('playerDeath', { x: p.x, y: p.y, key: `playerDeath:${p.id}`, minGapMs: 900, radius: 1300, volume: p.id === game.myId ? 1.15 : 0.76 });
      if (p.id === game.myId) triggerHitScreenFx(22, hitDir.x, hitDir.y);
    }
    if (prev && !prev.alive && p.alive) {
      window.cwPlaySfx?.('playerRespawn', {
        x: p.x,
        y: p.y,
        key: `playerRespawn:${p.id}`,
        minGapMs: 900,
        radius: 1400,
        volume: p.id === game.myId ? 1.08 : 0.64,
        rateMin: 0.96,
        rateMax: 1.12,
      });
    }
    if (prev && Number(p.level) > Number(prev.level || 1)) {
      window.cwPlaySfx?.('levelup', {
        x: p.x,
        y: p.y,
        key: `levelup:${p.id}:${p.level}`,
        minGapMs: 180,
        radius: p.id === game.myId ? 2000 : 900,
        volume: p.id === game.myId ? 1.15 : 0.62,
        rateMin: 0.94,
        rateMax: 1.08,
      });
    }

    const prevReloadLeft = Math.max(0, Number(prev?.reloadLeftMs) || 0);
    const nextReloadLeft = Math.max(0, Number(p.reloadLeftMs) || 0);
    const reloadTotal = Math.max(0, Number(p.reloadTotalMs) || 0);
    if (prev && prevReloadLeft <= 0 && nextReloadLeft > 0 && reloadTotal > 0) {
      const isMe = p.id === game.myId;
      const isMyCompanion = Boolean(p.isCompanion) && p.ownerId === game.myId;
      window.cwPlaySfx?.('weaponReload', {
        x: p.x,
        y: p.y,
        weaponKey: p.weaponKey,
        key: `reload:${p.id}:${p.weaponKey || 'weapon'}`,
        minGapMs: 120,
        radius: isMe || isMyCompanion ? 1600 : 900,
        volume: isMe ? 0.72 : (isMyCompanion ? 0.52 : 0.29),
      });
    }

    const prevDodgeUntil = Number(prev?.dodgeInvulnUntil) || 0;
    const nextDodgeUntil = Number(p?.dodgeInvulnUntil) || 0;
    if (nextDodgeUntil > prevDodgeUntil + 80) {
      const spectatorSmoothing = typeof isSpectatorSmoothingView === 'function' && isSpectatorSmoothingView();
      const renderPos = spectatorSmoothing && typeof getPlayerRenderPos === 'function' ? getPlayerRenderPos(p) : null;
      const startX = spectatorSmoothing ? (Number(renderPos?.x) || Number(prev?.x) || Number(p.x) || 0) : (Number(prev?.x) || Number(p.x) || 0);
      const startY = spectatorSmoothing ? (Number(renderPos?.y) || Number(prev?.y) || Number(p.y) || 0) : (Number(prev?.y) || Number(p.y) || 0);
      const endX = Number(p.x) || startX;
      const endY = Number(p.y) || startY;

      let dirX = endX - startX;
      let dirY = endY - startY;
      if (Math.hypot(dirX, dirY) < 0.08) {
        dirX = Number(p.moveX) || 0;
        dirY = Number(p.moveY) || 0;
      }
      if (Math.hypot(dirX, dirY) < 0.08) {
        dirX = (Number(p.aimX) || endX) - endX;
        dirY = (Number(p.aimY) || endY) - endY;
      }

      const isMe = p.id === game.myId;
      // Phase 1: immediate gust at dodge start point.
      spawnDodgeWindFx(startX, startY, dirX, dirY, isMe);
      window.cwPlaySfx?.('skillDodge', {
        x: startX,
        y: startY,
        key: `dodge:${p.id}`,
        minGapMs: 160,
        volume: isMe ? 1 : 0.5,
      });
      // Phase 2: tiny delayed gust at dodge end point.
      visuals.dodgeWindScheduled.push({
        x: endX,
        y: endY,
        dirX,
        dirY,
        isMe,
        followPlayerId: spectatorSmoothing ? p.id : '',
        delay: spectatorSmoothing ? 0.16 : 0.045,
      });
      if (visuals.dodgeWindScheduled.length > 80) {
        visuals.dodgeWindScheduled.splice(0, visuals.dodgeWindScheduled.length - 80);
      }
    }
  }
  visuals.playerPrev = nextPlayerMap;

  if (typeof spawnSpectatorShotEventFx === 'function') {
    for (const event of nextState.shotEvents || []) {
      spawnSpectatorShotEventFx(event, nextState);
    }
  }

  const nextRocketMap = new Map();
  const rocketTrailLastAt = visuals.rocketTrailLastAt instanceof Map ? visuals.rocketTrailLastAt : new Map();
  visuals.rocketTrailLastAt = rocketTrailLastAt;
  const replayFxActive = Boolean(replayGame?.active);
  for (const bullet of nextState.bullets || []) {
    if (String(bullet.kind || '').toLowerCase() !== 'rocket') continue;
    const prevRocket = visuals.rocketPrev.get(bullet.id);
    const fxX = prevRocket ? prevRocket.x : bullet.x;
    const fxY = prevRocket ? prevRocket.y : bullet.y;
    nextRocketMap.set(bullet.id, {
      x: bullet.x,
      y: bullet.y,
      explosionRadius: Math.max(54, Number(bullet.explosionRadius) || 96),
    });
    const trailVisible = typeof isVisibleWorld !== 'function' || isVisibleWorld(fxX, fxY, 160);
    if (!replayFxActive && trailVisible) {
      addRocketTrailSample(bullet.id, bullet.x, bullet.y, bullet.vx, bullet.vy, bullet.color || '#fb923c', nowMs, { fromState: true });
    }
  }
  for (const [id, prev] of visuals.rocketPrev.entries()) {
    if (!nextRocketMap.has(id)) {
      finishRocketTrail(id);
      registerImpactSource({
        x: prev.x,
        y: prev.y,
        radius: 138,
        strength: 1.62,
        ttlMs: 280,
        radial: true,
        target: 'both',
      });
      spawnRocketExplosionFx(prev.x, prev.y, Math.max(54, Number(prev.explosionRadius) || 96));
      window.cwPlaySfx?.('rocketExplosion', {
        x: prev.x,
        y: prev.y,
        key: `rocketExplosion:${id}`,
        minGapMs: 90,
        radius: 1700,
        volume: 1.18,
      });
    }
  }
  for (const id of Array.from(rocketTrailLastAt.keys())) {
    if (!nextRocketMap.has(id)) rocketTrailLastAt.delete(id);
  }
  visuals.rocketPrev = nextRocketMap;

  const prevOfferMap = visuals.skillOfferPrev || new Map();
  const nextOfferMap = new Map();
  for (const orb of nextState.skillOrbs || []) {
    nextOfferMap.set(orb.id, { x: orb.x, y: orb.y, ownerId: orb.ownerId });
  }
  for (const [id, prev] of prevOfferMap.entries()) {
    if (!nextOfferMap.has(id)) {
      const color = prev.ownerId === game.myId ? '#86efac' : '#9ca3af';
      spawnSkillBurstFx(prev.x, prev.y, color, 92);
      window.cwPlaySfx?.('skill', { x: prev.x, y: prev.y, key: `skillOffer:${id}`, skillId: 'skill_offer', minGapMs: 120, volume: prev.ownerId === game.myId ? 1.05 : 0.65 });
    }
  }
  visuals.skillOfferPrev = nextOfferMap;

  const prevDropMap = visuals.dropPrev || new Map();
  const nextDropMap = new Map();
  for (const drop of nextState.drops || []) {
    nextDropMap.set(drop.id, { x: drop.x, y: drop.y, kind: drop.kind, weaponKey: drop.weaponKey });
    if (!prevDropMap.has(drop.id)) {
      const isWeapon = String(drop.kind || 'weapon') === 'weapon';
      window.cwPlaySfx?.(isWeapon ? 'uiOpen' : 'skill', {
        x: drop.x,
        y: drop.y,
        weaponKey: drop.weaponKey,
        skillId: String(drop.kind || ''),
        key: `dropSpawn:${drop.id}`,
        minGapMs: 80,
        radius: 1400,
        volume: isWeapon ? 0.48 : 0.58,
      });
    }
  }
  for (const [id, prev] of prevDropMap.entries()) {
    if (!nextDropMap.has(id)) {
      const isWeapon = String(prev.kind || 'weapon') === 'weapon';
      window.cwPlaySfx?.(isWeapon ? 'weaponPickup' : 'skill', {
        x: prev.x,
        y: prev.y,
        weaponKey: prev.weaponKey,
        skillId: String(prev.kind || ''),
        key: `drop:${id}`,
        minGapMs: 90,
        volume: isWeapon ? 0.95 : 1.05,
      });
    }
  }
  visuals.dropPrev = nextDropMap;

  const prevXpMap = visuals.xpOrbPrev || new Map();
  const nextXpMap = new Map();
  for (const orb of nextState.xpOrbs || []) {
    nextXpMap.set(orb.id, { x: orb.x, y: orb.y });
  }
  let crystalCount = 0;
  let crystalX = 0;
  let crystalY = 0;
  for (const [id, prev] of prevXpMap.entries()) {
    if (!nextXpMap.has(id)) {
      crystalCount += 1;
      crystalX += Number(prev.x) || 0;
      crystalY += Number(prev.y) || 0;
    }
  }
  if (crystalCount > 0) {
    window.cwPlaySfx?.('crystal', {
      x: crystalX / crystalCount,
      y: crystalY / crystalCount,
      key: 'crystalPickup',
      minGapMs: crystalCount > 4 ? 55 : 85,
      volume: Math.min(1.35, 0.68 + crystalCount * 0.08),
    });
  }
  visuals.xpOrbPrev = nextXpMap;

  const playersById = new Map(nextState.players.map((p) => [p.id, p]));
  const enemyShooters = new Map((nextState.enemies || []).map((e) => [e.id, e]));
  const ids = new Set();
  const shotgunBurstKeys = new Set();
  const replayShotEventsActive = Boolean(replayGame?.active && Array.isArray(nextState.shotEvents) && nextState.shotEvents.length > 0);
  for (const b of nextState.bullets) {
    ids.add(b.id);
    if (!visuals.bulletIds.has(b.id)) {
      if (replayGame?.active && (b.replayHidden || b.replaySyntheticShot)) continue;
      let owner = playersById.get(b.ownerId) || playersById.get(b.ownerPlayerId);
      const bulletShooterType = String(b.shooterType || '').toLowerCase();
      if (!owner && bulletShooterType === 'companion') {
        owner = {
          id: b.ownerId || `companion:${b.ownerPlayerId || 'unknown'}`,
          ownerId: b.ownerPlayerId || '',
          x: Number(b.x) || 0,
          y: Number(b.y) || 0,
          weaponKey: b.weaponKey || 'pistol',
          isCompanion: true,
        };
      }
      if (owner) {
        if (replayShotEventsActive && !b.fromEnemy) continue;
        const bvx = Number(b.vx) || 0;
        const bvy = Number(b.vy) || 0;
        const dx = Math.abs(bvx) + Math.abs(bvy) > 0.001 ? bvx : ((Number(b.x) || owner.x) - owner.x);
        const dy = Math.abs(bvx) + Math.abs(bvy) > 0.001 ? bvy : ((Number(b.y) || owner.y) - owner.y);
        const a = Math.atan2(dy, dx || 1);
        const ownerFx = (typeof getPlayerRenderPos === 'function') ? getPlayerRenderPos(owner) : owner;
        const ownerFxX = Number(ownerFx?.x) || Number(owner.x) || 0;
        const ownerFxY = Number(ownerFx?.y) || Number(owner.y) || 0;
        const isCompanionShot = Boolean(owner.isCompanion) || bulletShooterType === 'companion';
        const weaponKey = String(b.weaponKey || owner.weaponKey || '').toLowerCase();
        const spectatorSmoothing = typeof isSpectatorSmoothingView === 'function' && isSpectatorSmoothingView();
        if (game.bulletTracersEnabled && !spectatorSmoothing) {
          visuals.muzzle.push({ x: ownerFxX + Math.cos(a) * 20, y: ownerFxY + Math.sin(a) * 20, a, c: b.color || '#ffd166', life: 0.05, ttl: 0.05 });
          visuals.muzzleGroundFlashes.push({
            x: ownerFxX + Math.cos(a) * 23,
            y: ownerFxY + Math.sin(a) * 23 + 8,
            a,
            c1: (isCompanionShot || owner.id === game.myId) ? '#facc15' : '#60a5fa',
            c2: (isCompanionShot || owner.id === game.myId) ? '#fb923c' : '#93c5fd',
            life: 0.13,
            ttl: 0.13,
          size: isCompanionShot ? 0.9 : (weaponKey === 'shotgun' ? 1.72 : (weaponKey === 'sniper' ? 1.55 : 1)),
          intensity: isCompanionShot ? 0.62 : (weaponKey === 'shotgun' ? 0.46 : 1),
        });
        }
        const isMyCompanionShot = isCompanionShot && (owner.ownerId === game.myId || b.ownerPlayerId === game.myId);
        if (weaponKey === 'shotgun') {
          const burstKey = `${isCompanionShot ? 'companion' : 'player'}:${owner.id}:${weaponKey}`;
          if (shotgunBurstKeys.has(burstKey)) continue;
          shotgunBurstKeys.add(burstKey);
        }
        window.cwPlaySfx?.('shot', {
          x: ownerFxX,
          y: ownerFxY,
          weaponKey,
          key: `shot:${isCompanionShot ? 'companion' : 'player'}:${owner.id}:${weaponKey || 'weapon'}:${b.id}`,
          minGapMs: 0,
          radius: isMyCompanionShot ? 1800 : 1100,
          volume: owner.id === game.myId ? 1.08 : (isMyCompanionShot ? 0.44 : 0.26),
        });
      } else if (b.fromEnemy) {
        const shooter = enemyShooters.get(b.ownerId) || null;
        const vx = Number(b.vx) || 1;
        const vy = Number(b.vy) || 0;
        const a = Math.atan2(vy, vx);
        const sx = shooter ? Number(shooter.x) || b.x : Number(b.x) || 0;
        const sy = shooter ? Number(shooter.y) || b.y : Number(b.y) || 0;
        if (game.bulletTracersEnabled) {
          visuals.muzzleGroundFlashes.push({
            x: sx + Math.cos(a) * 24,
            y: sy + Math.sin(a) * 24 + 8,
            a,
            c1: '#fb7185',
            c2: '#ef4444',
            life: 0.15,
            ttl: 0.15,
            size: 0.82,
            intensity: 0.68,
            npcShot: true,
          });
        }
        // Monster shots are temporarily muted while we tune player weapon audio.
      }
    }
  }
  visuals.bulletIds = ids;
  const nextBulletsForImpact = new Map();
  for (const b of nextState.bullets || []) {
    nextBulletsForImpact.set(b.id, {
      x: Number(b.x) || 0,
      y: Number(b.y) || 0,
      vx: Number(b.vx) || 0,
      vy: Number(b.vy) || 0,
      fromEnemy: Boolean(b.fromEnemy),
    });
  }
  visuals.prevBulletsForImpact = nextBulletsForImpact;

  const maxM = getQ().maxMuzzle;
  if (visuals.muzzle.length > maxM) visuals.muzzle.splice(0, visuals.muzzle.length - maxM);
  if (visuals.muzzleGroundFlashes.length > maxM) visuals.muzzleGroundFlashes.splice(0, visuals.muzzleGroundFlashes.length - maxM);
}

function processReplayInterpolatedFx(previousState, nextState) {
  if (!replayGame?.active || replayGame.seeking || !previousState || !nextState) return;
  const prevBullets = Array.isArray(previousState.bullets) ? previousState.bullets : [];
  if (prevBullets.length <= 0) return;
  const nextBulletIds = new Set(
    (Array.isArray(nextState.bullets) ? nextState.bullets : [])
      .map((bullet) => String(bullet?.id ?? ''))
      .filter(Boolean),
  );
  for (const bullet of prevBullets) {
    if (!bullet) continue;
    if (String(bullet.kind || '').toLowerCase() !== 'rocket') continue;
    const id = String(bullet.id ?? '');
    if (!id || nextBulletIds.has(id)) continue;
    if (visuals.rocketPrev instanceof Map) visuals.rocketPrev.delete(id);
    if (visuals.rocketTrailLastAt instanceof Map) visuals.rocketTrailLastAt.delete(id);
    finishRocketTrail(id);
    const x = Number(bullet.x) || 0;
    const y = Number(bullet.y) || 0;
    registerImpactSource({
      x,
      y,
      radius: 138,
      strength: 1.62,
      ttlMs: 280,
      radial: true,
      target: 'both',
    });
    spawnRocketExplosionFx(x, y, Math.max(54, Number(bullet.explosionRadius) || 96));
    window.cwPlaySfx?.('rocketExplosion', {
      x,
      y,
      key: `replayRocketExplosion:${id}`,
      minGapMs: 0,
      radius: 1700,
      volume: 1.18,
      replay: true,
    });
  }
}

function updateFx(dt) {
  const hitOverlay = getHitScreenOverlayEl();
  if (hitOverlay) {
    let flash = Math.max(0, Math.min(1, Number(hitOverlay.dataset.hitFlash || 0)));
    flash = Math.max(0, flash - dt * 0.9);
    hitOverlay.dataset.hitFlash = String(flash);
    hitOverlay.style.setProperty('--hit-flash', flash.toFixed(3));
    const menuOpen = getComputedStyle(document.getElementById('join-overlay')).display !== 'none';
    if (menuOpen) {
      hitOverlay.dataset.hitFlash = '0';
      hitOverlay.style.setProperty('--hit-flash', '0');
      if (hitOverlay.childElementCount > 0) hitOverlay.replaceChildren();
    }
  }

  for (let i = visuals.blood.length - 1; i >= 0; i -= 1) {
    const p = visuals.blood[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    if (p.life <= 0) visuals.blood.splice(i, 1);
  }

  for (let i = visuals.gore.length - 1; i >= 0; i -= 1) {
    const g = visuals.gore[i];
    g.life -= dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vx *= 0.985;
    g.vy *= 0.985;
    g.vz -= 280 * dt;
    g.z += g.vz * dt;

    if (g.z <= 0 && !g.splat) {
      g.z = 0;
      g.splat = true;
      spawnBlood(g.x, g.y, 2);
      spawnBloodPuddle(g.x, g.y, 0.35);
    }

    if (g.life <= 0 || (g.splat && g.life < g.ttl * 0.35)) {
      visuals.gore.splice(i, 1);
    }
  }

  for (let i = visuals.bloodMist.length - 1; i >= 0; i -= 1) {
    const m = visuals.bloodMist[i];
    m.life -= dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.vx *= 0.965;
    m.vy *= 0.96;
    if (m.life <= 0) visuals.bloodMist.splice(i, 1);
  }

  if (Array.isArray(visuals.explosionScars)) {
    for (let i = visuals.explosionScars.length - 1; i >= 0; i -= 1) {
      const scar = visuals.explosionScars[i];
      scar.life -= dt;
      if (scar.life <= 0) visuals.explosionScars.splice(i, 1);
    }
  }

  if (Array.isArray(visuals.groundFragments)) {
    for (let i = visuals.groundFragments.length - 1; i >= 0; i -= 1) {
      const frag = visuals.groundFragments[i];
      frag.life -= dt;
      if (frag.life <= 0) visuals.groundFragments.splice(i, 1);
    }
  }

  if (Array.isArray(visuals.groundDebris)) {
    for (let i = visuals.groundDebris.length - 1; i >= 0; i -= 1) {
      const d = visuals.groundDebris[i];
      d.life -= dt;
      d.x += (Number(d.vx) || 0) * dt;
      d.y += (Number(d.vy) || 0) * dt;
      d.z = Math.max(0, (Number(d.z) || 0) + (Number(d.vz) || 0) * dt);

      if (d.kind === 'dust') {
        d.vx = (Number(d.vx) || 0) * Math.pow(0.08, dt);
        d.vy = (Number(d.vy) || 0) * Math.pow(0.1, dt);
        d.vz = (Number(d.vz) || 0) - 210 * dt;
        d.r += (Number(d.grow) || 0) * dt;
      } else {
        d.vx = (Number(d.vx) || 0) * Math.pow(d.z > 0.5 ? 0.56 : 0.08, dt);
        d.vy = (Number(d.vy) || 0) * Math.pow(d.z > 0.5 ? 0.6 : 0.1, dt);
        d.vz = (Number(d.vz) || 0) - 560 * dt;
        d.rot += (Number(d.spin) || 0) * dt;
        if (d.z <= 0.5 && d.vz < -80 && !d.bounced) {
          d.z = 0;
          d.vz = -d.vz * 0.18;
          d.vx *= 0.42;
          d.vy *= 0.42;
          d.spin *= 0.38;
          d.bounced = true;
        } else if (d.z <= 0.5 && d.vz < 0) {
          settleGroundDebrisChunk(d);
          visuals.groundDebris.splice(i, 1);
          continue;
        } else if (d.z <= 0.5 && d.bounced && Math.abs(d.vx) + Math.abs(d.vy) < 18) {
          settleGroundDebrisChunk(d);
          visuals.groundDebris.splice(i, 1);
          continue;
        } else if (d.z <= 0.5 && d.life <= 0.18) {
          settleGroundDebrisChunk(d);
          visuals.groundDebris.splice(i, 1);
          continue;
        } else if (d.z <= 0.5) {
          d.z = 0;
          d.vz = 0;
          d.spin *= 0.18;
        }
      }

      if (d.life <= 0) visuals.groundDebris.splice(i, 1);
    }
  }

  updateRocketTrails(dt);

  for (let i = visuals.rocketSmoke.length - 1; i >= 0; i -= 1) {
    const s = visuals.rocketSmoke[i];
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.96;
    s.vy *= 0.96;
    s.r += 12 * dt;
    if (s.life <= 0) visuals.rocketSmoke.splice(i, 1);
  }

  for (let i = visuals.rocketFire.length - 1; i >= 0; i -= 1) {
    const f = visuals.rocketFire[i];
    f.life -= dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= 0.92;
    f.vy *= 0.92;
    f.r *= 0.98;
    if (f.life <= 0 || f.r <= 0.8) visuals.rocketFire.splice(i, 1);
  }

  for (let i = visuals.rocketBlast.length - 1; i >= 0; i -= 1) {
    const p = visuals.rocketBlast[i];
    p.life -= dt;
    const ax = (p.tx - p.ox) * p.spring;
    const ay = (p.ty - p.oy) * p.spring;
    p.vx = (p.vx + ax * dt) * p.friction;
    p.vy = (p.vy + ay * dt) * p.friction;
    p.ox += p.vx * dt;
    p.oy += p.vy * dt;
    p.r *= p.rDecay;
    if (p.life <= 0 || p.r <= 0.45) visuals.rocketBlast.splice(i, 1);
  }

  if (Array.isArray(visuals.consumableProjectiles)) {
    for (let i = visuals.consumableProjectiles.length - 1; i >= 0; i -= 1) {
      const p = visuals.consumableProjectiles[i];
      p.delay = Math.max(0, (Number(p.delay) || 0) - dt);
      if (p.delay > 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        detonateConsumableProjectile(p);
        visuals.consumableProjectiles.splice(i, 1);
      }
    }
  }

  for (let i = visuals.bossBlast.length - 1; i >= 0; i -= 1) {
    const b = visuals.bossBlast[i];
    b.life -= dt;
    const grow = Math.max(0, b.maxR - b.r);
    b.r += Math.min(grow, 520 * dt);
    if (b.life <= 0 || b.r >= b.maxR - 1) visuals.bossBlast.splice(i, 1);
  }

  for (let i = visuals.skillBursts.length - 1; i >= 0; i -= 1) {
    const s = visuals.skillBursts[i];
    s.life -= dt;
    const grow = Math.max(0, s.maxR - s.r);
    const growSpeed = Math.max(120, Number(s.growSpeed) || 420);
    s.r += Math.min(grow, growSpeed * dt);
    if (s.life <= 0 || s.r >= s.maxR - 1) visuals.skillBursts.splice(i, 1);
  }

  if (Array.isArray(visuals.meleeSwings)) {
    for (let i = visuals.meleeSwings.length - 1; i >= 0; i -= 1) {
      const s = visuals.meleeSwings[i];
      s.life -= dt;
      if (s.life <= 0) visuals.meleeSwings.splice(i, 1);
    }
  }

  if (Array.isArray(visuals.xpCharge)) {
    const playersById = new Map((game.state?.players || []).map((p) => [p.id, p]));
    for (let i = visuals.xpCharge.length - 1; i >= 0; i -= 1) {
      const c = visuals.xpCharge[i];
      c.life -= dt;
      c.spin += dt * (3.2 + Math.min(4, Number(c.energy) || 0));
      c.energy = Math.max(0, (Number(c.energy) || 0) * Math.pow(0.12, dt));

      const player = playersById.get(c.playerId);
      if (player && player.alive !== false) {
        const renderPos = typeof getPlayerRenderPos === 'function' ? getPlayerRenderPos(player) : null;
        c.x = Number(renderPos?.x) || Number(player.x) || c.x;
        c.y = Number(renderPos?.y) || Number(player.y) || c.y;
      }

      const particles = Array.isArray(c.particles) ? c.particles : [];
      for (let j = particles.length - 1; j >= 0; j -= 1) {
        const p = particles[j];
        p.life -= dt;
        p.angle += (Number(p.orbit) || 0) * dt;
        p.r = Math.max(1, (Number(p.r) || 0) + (Number(p.vr) || 0) * dt);
        p.size = Math.max(0.5, (Number(p.size) || 2) * Math.pow(0.28, dt));
        if (p.life <= 0 || p.r <= 1.2) particles.splice(j, 1);
      }
      if (c.life <= 0 && particles.length <= 0) visuals.xpCharge.splice(i, 1);
    }
  }

  if (Array.isArray(visuals.consumableAuras)) {
    const playersById = new Map((game.state?.players || []).map((p) => [p.id, p]));
    for (let i = visuals.consumableAuras.length - 1; i >= 0; i -= 1) {
      const aura = visuals.consumableAuras[i];
      aura.life -= dt;
      aura.spin += dt * (aura.kind === 'regen' ? 2.8 : 4.6);
      const player = playersById.get(aura.playerId);
      if (player && player.alive !== false) {
        const renderPos = typeof getPlayerRenderPos === 'function' ? getPlayerRenderPos(player) : null;
        aura.x = Number(renderPos?.x) || Number(player.x) || aura.x;
        aura.y = Number(renderPos?.y) || Number(player.y) || aura.y;
      }
      if (aura.life <= 0) visuals.consumableAuras.splice(i, 1);
    }
  }

  for (let i = visuals.skillArcs.length - 1; i >= 0; i -= 1) {
    const a = visuals.skillArcs[i];
    a.life -= dt;
    a.ang += a.spin * dt;
    a.bladeRot += a.bladeRotSpeed * dt;
    a.radius = a.baseRadius + Math.sin((performance.now() / 1000) * a.pulseSpeed + a.phase) * a.pulseAmp;
    if (a.life <= 0) visuals.skillArcs.splice(i, 1);
  }

  for (let i = visuals.skillLinks.length - 1; i >= 0; i -= 1) {
    visuals.skillLinks[i].life -= dt;
    if (visuals.skillLinks[i].life <= 0) visuals.skillLinks.splice(i, 1);
  }

  for (let i = visuals.skillLabels.length - 1; i >= 0; i -= 1) {
    const l = visuals.skillLabels[i];
    l.life -= dt;
    l.y += l.vy * dt;
    if (l.life <= 0) visuals.skillLabels.splice(i, 1);
  }

  for (let i = visuals.bloodPuddles.length - 1; i >= 0; i -= 1) {
    visuals.bloodPuddles[i].life -= dt;
    if (visuals.bloodPuddles[i].life <= 0) visuals.bloodPuddles.splice(i, 1);
  }

  for (let i = visuals.muzzle.length - 1; i >= 0; i -= 1) {
    visuals.muzzle[i].life -= dt;
    if (visuals.muzzle[i].life <= 0) visuals.muzzle.splice(i, 1);
  }

  for (let i = visuals.muzzleGroundFlashes.length - 1; i >= 0; i -= 1) {
    visuals.muzzleGroundFlashes[i].life -= dt;
    if (visuals.muzzleGroundFlashes[i].life <= 0) visuals.muzzleGroundFlashes.splice(i, 1);
  }

  for (let i = visuals.dodgeWind.length - 1; i >= 0; i -= 1) {
    const w = visuals.dodgeWind[i];
    w.life -= dt;
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    w.vx *= 0.92;
    w.vy *= 0.92;
    w.r *= 0.985;
    if (w.life <= 0 || w.r <= 0.6) visuals.dodgeWind.splice(i, 1);
  }

  if (Array.isArray(visuals.forceShield)) {
    for (let i = visuals.forceShield.length - 1; i >= 0; i -= 1) {
      const s = visuals.forceShield[i];
      s.life -= dt;
      s.radius += 24 * dt;
      s.width = Math.max(1, (Number(s.width) || 6) - 7 * dt);
      if (s.life <= 0) visuals.forceShield.splice(i, 1);
    }
  }

  for (let i = visuals.dodgeWindScheduled.length - 1; i >= 0; i -= 1) {
    const s = visuals.dodgeWindScheduled[i];
    s.delay -= dt;
    if (s.delay <= 0) {
      let fxX = s.x;
      let fxY = s.y;
      if (s.followPlayerId && typeof isSpectatorSmoothingView === 'function' && isSpectatorSmoothingView()) {
        const renderPos = game.renderPlayers?.get(s.followPlayerId);
        if (renderPos) {
          fxX = Number(renderPos.x) || fxX;
          fxY = Number(renderPos.y) || fxY;
        }
      }
      spawnDodgeWindFx(fxX, fxY, s.dirX, s.dirY, s.isMe);
      visuals.dodgeWindScheduled.splice(i, 1);
    }
  }

  for (let i = visuals.hitFx.length - 1; i >= 0; i -= 1) {
    visuals.hitFx[i].life -= dt;
    if (visuals.hitFx[i].life <= 0) visuals.hitFx.splice(i, 1);
  }

  if (Array.isArray(visuals.objectImpactFx)) {
    for (let i = visuals.objectImpactFx.length - 1; i >= 0; i -= 1) {
      const fx = visuals.objectImpactFx[i];
      fx.life -= dt;
      fx.x += (Number(fx.vx) || 0) * dt;
      fx.y += (Number(fx.vy) || 0) * dt;
      fx.vx = (Number(fx.vx) || 0) * Math.pow(0.045, dt);
      fx.vy = (Number(fx.vy) || 0) * Math.pow(0.08, dt) - (fx.kind === 'smoke' ? 6 : 0) * dt;
      if (fx.kind === 'smoke') fx.r += (Number(fx.grow) || 0) * dt;
      if (fx.life <= 0) visuals.objectImpactFx.splice(i, 1);
    }
  }
}
