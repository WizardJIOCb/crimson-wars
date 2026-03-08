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

  for (let i = visuals.bossBlast.length - 1; i >= 0; i -= 1) {
    const b = visuals.bossBlast[i];
    b.life -= dt;
    const grow = Math.max(0, b.maxR - b.r);
    b.r += Math.min(grow, 520 * dt);
    if (b.life <= 0 || b.r >= b.maxR - 1) visuals.bossBlast.splice(i, 1);
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
