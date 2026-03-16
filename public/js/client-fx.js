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

function spawnGoreBurst(x, y, damage = 10) {
  if (!game.extraBloodEnabled) return;
  const chunks = Math.max(3, Math.min(14, Math.floor(damage * 0.45)));
  for (let i = 0; i < chunks; i += 1) {
    const angle = (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 26 + Math.random() * 120;
    const lift = 45 + Math.random() * 120;
    visuals.gore.push({
      x,
      y,
      z: 4 + Math.random() * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
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

function spawnSkillBurstFx(x, y, color = '#7dd3fc', radius = 100) {
  visuals.skillBursts.push({
    x,
    y,
    r: 18,
    maxR: radius,
    color,
    life: 0.5,
    ttl: 0.5,
  });
  if (visuals.skillBursts.length > 36) visuals.skillBursts.splice(0, visuals.skillBursts.length - 36);
}

function spawnBladeOrbitFx(x, y) {
  for (let i = 0; i < 3; i += 1) {
    visuals.skillArcs.push({
      x,
      y,
      ang: (Math.PI * 2 * i) / 3,
      spin: (4.5 + Math.random() * 2.4) * (Math.random() > 0.5 ? 1 : -1),
      radius: 34 + Math.random() * 12,
      life: 0.42 + Math.random() * 0.08,
      ttl: 0.42 + Math.random() * 0.08,
      color: '#fcd34d',
    });
  }
  if (visuals.skillArcs.length > 90) visuals.skillArcs.splice(0, visuals.skillArcs.length - 90);
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

function spawnSkillCastFx(skillId, caster, nextState, skill) {
  const sid = String(skillId || '').toLowerCase();
  if (sid === 'shockwave') {
    spawnSkillBurstFx(caster.x, caster.y, '#86efac', shockwaveFxRadius(skill));
    spawnHitFx(caster.x, caster.y, 12, caster.id === game.myId);
    spawnSkillLabel('Shockwave', caster.x, caster.y - 12);
    return;
  }
  if (sid === 'blade_orbit') {
    spawnBladeOrbitFx(caster.x, caster.y);
    spawnSkillLabel('Blade Orbit', caster.x, caster.y - 10);
    return;
  }
  if (sid === 'chain_lightning') {
    spawnChainLightningFx(caster, nextState);
    spawnSkillLabel('Chain Lightning', caster.x, caster.y - 10);
    return;
  }
  if (sid === 'laser_strike') {
    spawnLaserStrikeFx(caster, nextState, skill);
    spawnSkillLabel('Laser Strike', caster.x, caster.y - 10);
    return;
  }
  if (sid === 'homing_missiles') {
    spawnSkillBurstFx(caster.x, caster.y, '#fb923c', 102);
    spawnSkillLabel('Homing Missiles', caster.x, caster.y - 10);
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
        if (casted) spawnSkillCastFx(sid, p, nextState, s);
      }
      visuals.skillCdPrev.set(key, cur);
    }
  }

  for (const key of Array.from(visuals.skillCdPrev.keys())) {
    if (!seen.has(key)) visuals.skillCdPrev.delete(key);
  }
}

function processStateFx(nextState) {
  const prevEnemyMap = visuals.enemyPrev;
  const nextEnemyMap = new Map();

  for (const e of nextState.enemies) {
    nextEnemyMap.set(e.id, { x: e.x, y: e.y, hp: e.hp, type: e.type });
    const prev = prevEnemyMap.get(e.id);
    if (prev && e.hp < prev.hp) {
      const hitDamage = Math.max(1, prev.hp - e.hp);
      spawnBlood(e.x, e.y, Math.max(2, Math.floor(hitDamage * 0.45)));
      spawnGoreBurst(e.x, e.y, hitDamage);
      spawnHitFx(e.x, e.y, hitDamage, false);
    }
  }

  for (const [id, prev] of prevEnemyMap.entries()) {
    if (!nextEnemyMap.has(id)) {
      if (prev.type === 'boss') {
        spawnBossDeathExplosion(prev.x, prev.y);
      } else {
        spawnBlood(prev.x, prev.y, 18);
        spawnGoreBurst(prev.x, prev.y, 18);
        spawnBloodPuddle(prev.x, prev.y, 1);
        spawnHitFx(prev.x, prev.y, 14, false);
      }
    }
  }
  visuals.enemyPrev = nextEnemyMap;

  const prevPlayerMap = visuals.playerPrev;
  const nextPlayerMap = new Map();
  for (const p of nextState.players) {
    nextPlayerMap.set(p.id, { x: p.x, y: p.y, hp: p.hp, alive: Boolean(p.alive) });
    const prev = prevPlayerMap.get(p.id);
    if (prev && p.hp < prev.hp) {
      const hitDamage = Math.max(1, prev.hp - p.hp);
      const meBonus = p.id === game.myId ? 1.45 : 1.2;
      const bloodCount = Math.max(7, Math.floor(hitDamage * 0.95 * meBonus));
      spawnBlood(p.x, p.y, bloodCount);
      if (game.extraBloodEnabled) spawnGoreBurst(p.x, p.y, Math.max(6, hitDamage * 0.9));
      spawnHitFx(p.x, p.y, hitDamage * meBonus, true);
    }
    if (prev && prev.alive && !p.alive) {
      spawnBlood(p.x, p.y, 24);
      spawnBloodPuddle(p.x, p.y, 1.15);
      spawnGoreBurst(p.x, p.y, 20);
      spawnHitFx(p.x, p.y, 18, true);
    }
  }
  visuals.playerPrev = nextPlayerMap;

  processSkillCastFx(nextState);

  const nextRocketMap = new Map();
  for (const bullet of nextState.bullets || []) {
    if (String(bullet.kind || '').toLowerCase() !== 'rocket') continue;
    const prevRocket = visuals.rocketPrev.get(bullet.id);
    const fxX = prevRocket ? prevRocket.x : bullet.x;
    const fxY = prevRocket ? prevRocket.y : bullet.y;
    nextRocketMap.set(bullet.id, { x: bullet.x, y: bullet.y });
    spawnRocketTrailFx(fxX, fxY, bullet.vx, bullet.vy, bullet.color || '#fb923c');
  }
  for (const [id, prev] of visuals.rocketPrev.entries()) {
    if (!nextRocketMap.has(id)) spawnRocketExplosionFx(prev.x, prev.y);
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
    }
  }
  visuals.skillOfferPrev = nextOfferMap;

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
    s.r += Math.min(grow, 420 * dt);
    if (s.life <= 0 || s.r >= s.maxR - 1) visuals.skillBursts.splice(i, 1);
  }

  for (let i = visuals.skillArcs.length - 1; i >= 0; i -= 1) {
    const a = visuals.skillArcs[i];
    a.life -= dt;
    a.ang += a.spin * dt;
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

  for (let i = visuals.hitFx.length - 1; i >= 0; i -= 1) {
    visuals.hitFx[i].life -= dt;
    if (visuals.hitFx[i].life <= 0) visuals.hitFx.splice(i, 1);
  }
}






