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

function spawnRocketTrailFx(x, y, vx, vy, color = '#fb923c') {
  const speed = Math.hypot(Number(vx) || 0, Number(vy) || 0) || 1;
  const dirX = (Number(vx) || 0) / speed;
  const dirY = (Number(vy) || 0) / speed;
  const tailX = x - dirX * 10;
  const tailY = y - dirY * 10;

  visuals.rocketFire.push({
    x: tailX + (Math.random() * 3 - 1.5),
    y: tailY + (Math.random() * 3 - 1.5),
    vx: -dirX * (40 + Math.random() * 55) + (Math.random() * 16 - 8),
    vy: -dirY * (40 + Math.random() * 55) + (Math.random() * 16 - 8),
    r: 4 + Math.random() * 3,
    life: 0.12 + Math.random() * 0.06,
    ttl: 0.12 + Math.random() * 0.06,
    color,
  });
  visuals.rocketSmoke.push({
    x: tailX + (Math.random() * 5 - 2.5),
    y: tailY + (Math.random() * 5 - 2.5),
    vx: -dirX * (18 + Math.random() * 28) + (Math.random() * 10 - 5),
    vy: -dirY * (18 + Math.random() * 28) + (Math.random() * 10 - 5),
    r: 7 + Math.random() * 5,
    life: 0.38 + Math.random() * 0.18,
    ttl: 0.38 + Math.random() * 0.18,
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

function spawnRocketExplosionFx(x, y) {
  spawnSkillBurstFx(x, y, '#fb923c', 88);
  spawnRocketNovaFx(x, y);
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

function psiBlastFxRadius(skill) {
  const def = game.skillCatalog?.psi_blast || {};
  const lvl = Math.max(1, Number(skill?.level) || 1);
  const base = Math.max(120, Number(def.radius) || 760);
  const perLevel = Math.max(0, Number(def.radiusPerLevel) || 48);
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

function spawnBladeOrbitFx(x, y) {
  const bladeCount = 5;
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
      color: Math.random() > 0.4 ? '#fde68a' : '#fca5a5',
    });
  }
  if (visuals.skillArcs.length > 140) visuals.skillArcs.splice(0, visuals.skillArcs.length - 140);
}

function spawnChainLightningFx(caster, nextState) {
  const enemies = Array.isArray(nextState?.enemies) ? nextState.enemies : [];
  const targets = enemies
    .map((e) => {
      const dx = e.x - caster.x;
      const dy = e.y - caster.y;
      return { e, d2: dx * dx + dy * dy };
    })
    .filter((it) => it.d2 <= 430 * 430)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, 5);

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
      color: '#67e8f9',
      phase: Math.random() * Math.PI * 2,
    });
    spawnHitFx(t.e.x, t.e.y, 6, false);
  }
  spawnSkillBurstFx(caster.x, caster.y, '#67e8f9', 132);
  if (visuals.skillLinks.length > 60) visuals.skillLinks.splice(0, visuals.skillLinks.length - 60);
}

function spawnLaserStrikeFx(caster, nextState, skill) {
  const def = game.skillCatalog?.laser_strike || {};
  const lvl = Math.max(1, Number(skill?.level) || 1);
  const radius = Math.max(90, (Number(def.radius) || 320) + (Number(def.radiusPerLevel) || 0) * (lvl - 1));
  const maxTargets = Math.max(1, Math.round((Number(def.targets) || 1) + (Number(def.targetsPerLevel) || 0) * (lvl - 1)));
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

  spawnSkillBurstFx(caster.x, caster.y, '#f9a8d4', Math.min(170, 80 + maxTargets * 14));
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
      color: '#f472b6',
      phase: Math.random() * Math.PI * 2,
    });
    spawnHitFx(t.e.x, t.e.y, 8, false);
  }
  if (visuals.skillLinks.length > 90) visuals.skillLinks.splice(0, visuals.skillLinks.length - 90);
}

function shockwaveFxRadius(skill) {
  const def = game.skillCatalog?.shockwave || {};
  const lvl = Math.max(1, Number(skill?.level) || 1);
  const base = Math.max(40, Number(def.radius) || 170);
  const perLevel = Math.max(0, Number(def.radiusPerLevel) || 14);
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
  const sid = String(skillId || '').toLowerCase();
  if (sid === 'shockwave') {
    const radius = shockwaveFxRadius(skill);
    spawnSkillBurstFx(caster.x, caster.y, '#86efac', radius, {
      style: 'shockwave',
      startRadius: 10,
      growSpeed: Math.max(880, radius * 6.2),
      trailRings: 4,
      spikeCount: Math.max(10, Math.min(20, Math.round(radius / 18))),
      life: 0.42,
      accentColor: '#dcfce7',
      innerColor: '#bbf7d0',
    });
    spawnRadialHitFx(caster.x, caster.y, radius * 0.9, {
      count: Math.max(8, Math.min(18, Math.round(radius / 16))),
      severity: 5,
      color: '#bbf7d0',
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
    spawnSkillLabel(trFx('skill.shockwave.name', 'Shockwave'), caster.x, caster.y - 12);
    return;
  }
  if (sid === 'blade_orbit') {
    spawnBladeOrbitFx(caster.x, caster.y);
    registerImpactSource({
      x: caster.x,
      y: caster.y,
      radius: 340,
      strength: 1.34,
      ttlMs: 340,
      radial: true,
      target: 'enemy',
    });
    spawnSkillLabel(trFx('skill.blade_orbit.name', 'Blade Orbit'), caster.x, caster.y - 10);
    return;
  }
  if (sid === 'chain_lightning') {
    spawnChainLightningFx(caster, nextState);
    spawnSkillLabel(trFx('skill.chain_lightning.name', 'Chain Lightning'), caster.x, caster.y - 10);
    return;
  }
  if (sid === 'laser_strike') {
    spawnLaserStrikeFx(caster, nextState, skill);
    spawnSkillLabel(trFx('skill.laser_strike.name', 'Laser Strike'), caster.x, caster.y - 10);
    return;
  }
  if (sid === 'homing_missiles') {
    spawnSkillBurstFx(caster.x, caster.y, '#fb923c', 102);
    spawnSkillLabel(trFx('skill.homing_missiles.name', 'Homing Missiles'), caster.x, caster.y - 10);
    return;
  }
  if (sid === 'psi_blast') {
    const radius = psiBlastFxRadius(skill);
    spawnSkillBurstFx(caster.x, caster.y, '#60a5fa', radius, {
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
    spawnSkillLabel(trFx('skill.psi_blast.name', 'Psi Blast'), caster.x, caster.y - 12);
    return;
  }

  spawnSkillBurstFx(caster.x, caster.y, '#a5b4fc', 120);
  const skillName = game.skillCatalog[sid]?.name || sid || 'Skill';
  spawnSkillLabel(skillName, caster.x, caster.y - 10);
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
          spawnSkillCastFx(sid, p, nextState, s);
          window.cwPlaySfx?.('skill', { x: p.x, y: p.y, key: `skill:${p.id}:${sid}`, skillId: sid, minGapMs: 140, volume: p.id === game.myId ? 1.1 : 0.72 });
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
    nextEnemyMap.set(e.id, { x: e.x, y: e.y, hp: e.hp, type: e.type });
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
    });
    const prev = prevMapObjectMap.get(obj.id);
    if (prev && !obj.destroyed && Number(obj.hp) < Number(prev.hp)) {
      const severity = Math.max(3, Math.round((Math.max(1, Number(prev.hp) - Number(obj.hp))) * 0.24));
      spawnHitFx(obj.x, obj.y, severity, false);
    }
    if (prev && !prev.destroyed && obj.destroyed) {
      if (obj.explosive) {
        spawnRocketExplosionFx(obj.x, obj.y);
        spawnRadialHitFx(obj.x, obj.y, Math.max(Number(obj.w) || 40, Number(obj.h) || 40) * 0.7, {
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
      isCompanion: Boolean(p.isCompanion),
      ownerId: p.ownerId || '',
    });
    const prev = prevPlayerMap.get(p.id);
    if (prev && Math.max(0, Number(p.shieldHitSeq) || 0) > Math.max(0, Number(prev.shieldHitSeq) || 0)) {
      spawnForceShieldFx(p, prev);
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
    nextRocketMap.set(bullet.id, { x: bullet.x, y: bullet.y });
    const trailVisible = typeof isVisibleWorld !== 'function' || isVisibleWorld(fxX, fxY, 160);
    const lastTrailAt = Math.max(0, Number(rocketTrailLastAt.get(bullet.id)) || 0);
    if (!replayFxActive && trailVisible && nowMs - lastTrailAt >= 70) {
      rocketTrailLastAt.set(bullet.id, nowMs);
      spawnRocketTrailFx(fxX, fxY, bullet.vx, bullet.vy, bullet.color || '#fb923c');
    }
  }
  for (const [id, prev] of visuals.rocketPrev.entries()) {
    if (!nextRocketMap.has(id)) {
      registerImpactSource({
        x: prev.x,
        y: prev.y,
        radius: 138,
        strength: 1.62,
        ttlMs: 280,
        radial: true,
        target: 'both',
      });
      spawnRocketExplosionFx(prev.x, prev.y);
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
        const isCompanionShot = Boolean(owner.isCompanion) || bulletShooterType === 'companion';
        const weaponKey = String(b.weaponKey || owner.weaponKey || '').toLowerCase();
        const spectatorSmoothing = typeof isSpectatorSmoothingView === 'function' && isSpectatorSmoothingView();
        if (game.bulletTracersEnabled && !spectatorSmoothing) {
          visuals.muzzle.push({ x: owner.x + Math.cos(a) * 20, y: owner.y + Math.sin(a) * 20, a, c: b.color || '#ffd166', life: 0.05, ttl: 0.05 });
          visuals.muzzleGroundFlashes.push({
            x: owner.x + Math.cos(a) * 23,
            y: owner.y + Math.sin(a) * 23 + 8,
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
          x: owner.x,
          y: owner.y,
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
    spawnRocketExplosionFx(x, y);
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
