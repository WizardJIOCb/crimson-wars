const MENU_IDLE_FRAME_MS = 180;
const FPS_UI_UPDATE_SEC = 0.75;
const minimapCtx = minimapCanvasEl?.getContext('2d');
if (minimapCtx) minimapCtx.imageSmoothingEnabled = false;

const renderDiag = {
  frames: 0,
  totals: { frame: 0, fx: 0, indicators: 0, minimap: 0 },
};

function isRenderDiagEnabled() {
  return Boolean(game?.showFpsEnabled && fpsCornerEl);
}

function renderDiagStart() {
  return isRenderDiagEnabled() ? performance.now() : 0;
}

function renderDiagEnd(key, startedAt) {
  if (!isRenderDiagEnabled() || !startedAt) return;
  renderDiag.totals[key] = (Number(renderDiag.totals[key]) || 0) + (performance.now() - startedAt);
}

function renderDiagBuildText() {
  if (!isRenderDiagEnabled() || renderDiag.frames <= 0) return '';
  const f = Math.max(1, renderDiag.frames);
  const frameMs = (renderDiag.totals.frame / f).toFixed(2);
  const fxMs = (renderDiag.totals.fx / f).toFixed(2);
  const indMs = (renderDiag.totals.indicators / f).toFixed(2);
  const mapMs = (renderDiag.totals.minimap / f).toFixed(2);
  return ` | R ${frameMs}ms (fx ${fxMs} ind ${indMs} map ${mapMs})`;
}

function renderDiagReset() {
  renderDiag.frames = 0;
  renderDiag.totals.frame = 0;
  renderDiag.totals.fx = 0;
  renderDiag.totals.indicators = 0;
  renderDiag.totals.minimap = 0;
}

function hexToRgba(hex, alpha = 1) {
  const raw = String(hex || '').replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return `rgba(255,255,255,${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}
function scheduleNextFrame(delayMs = 0) {
  if (delayMs > 0) {
    setTimeout(() => requestAnimationFrame(render), delayMs);
    return;
  }
  requestAnimationFrame(render);
}

function getSceneTheme() {
  return game.state?.decor?.theme && typeof game.state.decor.theme === 'object'
    ? game.state.decor.theme
    : { baseMaterial: 'asphalt_wet', accent: '#f97316', glow: 'rgba(249, 115, 22, 0.22)' };
}

function getGroundFallbackColor(material) {
  if (material === 'grass') return '#173224';
  if (material === 'dirt') return '#2a1e16';
  if (material === 'concrete') return '#2a3640';
  if (material === 'toxic') return '#233718';
  if (material === 'asphalt') return '#161c26';
  return '#121821';
}

function getGroundTileForMaterial(material) {
  return visuals.groundTiles?.[material] || visuals.groundTileCanvas || null;
}

function drawMaterialTileField(tileCanvas, startX, startY, endX, endY) {
  if (!tileCanvas) return;
  const t = visuals.groundTileSize || tileCanvas.width || 128;
  const tileStartX = Math.floor(startX / t) * t;
  const tileStartY = Math.floor(startY / t) * t;
  for (let y = tileStartY; y < endY; y += t) {
    for (let x = tileStartX; x < endX; x += t) {
      ctx.drawImage(tileCanvas, x - camera.x, y - camera.y, t, t);
    }
  }
}

function buildTerrainZonePath(zone, scaleMul = 1) {
  const halfW = Math.max(10, (Number(zone?.w) || 0) * 0.5 * scaleMul);
  const halfH = Math.max(10, (Number(zone?.h) || 0) * 0.5 * scaleMul);
  const shape = String(zone?.shape || 'ellipse');
  ctx.beginPath();
  if (shape === 'rect' || shape === 'band') {
    ctx.rect(-halfW, -halfH, halfW * 2, halfH * 2);
    return;
  }
  ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
}

function isTerrainZoneVisible(zone) {
  const halfW = Math.max(10, (Number(zone?.w) || 0) * 0.5);
  const halfH = Math.max(10, (Number(zone?.h) || 0) * 0.5);
  return isVisibleWorld(Number(zone?.x) || 0, Number(zone?.y) || 0, Math.max(halfW, halfH) + 48);
}

function drawTerrainZone(zone) {
  if (!zone || !isTerrainZoneVisible(zone)) return;
  const tile = getGroundTileForMaterial(zone.material);
  const worldX = Number(zone.x) || 0;
  const worldY = Number(zone.y) || 0;
  const blurPx = Math.max(10, Math.min(42, Math.min(Number(zone.w) || 0, Number(zone.h) || 0) * Math.max(0.04, Number(zone.feather) || 0.18) * 0.12));
  const alpha = Math.max(0.08, Math.min(1, Number(zone.alpha) || 0.65));
  const halfW = Math.max(18, (Number(zone.w) || 0) * 0.5);
  const halfH = Math.max(18, (Number(zone.h) || 0) * 0.5);

  ctx.save();
  ctx.translate(worldX - camera.x, worldY - camera.y);
  ctx.rotate(Number(zone.angle) || 0);
  buildTerrainZonePath(zone, 1);
  ctx.clip();
  ctx.globalAlpha = alpha;
  if (tile) {
    const t = visuals.groundTileSize || tile.width || 128;
    const startX = Math.floor((worldX - halfW - blurPx) / t) * t;
    const startY = Math.floor((worldY - halfH - blurPx) / t) * t;
    const endX = worldX + halfW + blurPx;
    const endY = worldY + halfH + blurPx;
    for (let y = startY; y < endY; y += t) {
      for (let x = startX; x < endX; x += t) {
        ctx.drawImage(tile, x - worldX, y - worldY, t, t);
      }
    }
  } else {
    ctx.fillStyle = getGroundFallbackColor(zone.material);
    ctx.fillRect(-halfW - blurPx, -halfH - blurPx, (halfW + blurPx) * 2, (halfH + blurPx) * 2);
  }
  ctx.restore();

  ctx.save();
  ctx.translate(worldX - camera.x, worldY - camera.y);
  ctx.rotate(Number(zone.angle) || 0);
  ctx.filter = `blur(${blurPx}px)`;
  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = getGroundFallbackColor(zone.material);
  buildTerrainZonePath(zone, 1.1 + Math.max(0.04, Number(zone.feather) || 0.18));
  ctx.fill();
  ctx.restore();
}

function drawGround() {
  const q = getQ();
  const theme = getSceneTheme();
  const baseMaterial = String(theme.baseMaterial || 'asphalt_wet');
  ctx.fillStyle = getGroundFallbackColor(baseMaterial);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (q.groundTexture) {
    const tile = getGroundTileForMaterial(baseMaterial);
    if (tile) {
      const pad = visuals.groundTileSize || tile.width || 128;
      drawMaterialTileField(tile, camera.x - pad, camera.y - pad, camera.x + canvas.width + pad, camera.y + canvas.height + pad);
    }
  }

  const terrainZones = Array.isArray(game.state?.decor?.terrainZones) ? game.state.decor.terrainZones : [];
  for (const zone of terrainZones) {
    drawTerrainZone(zone);
  }

  if (q.overlays) {
    const g = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.55, 70, canvas.width * 0.5, canvas.height * 0.55, Math.max(canvas.width, canvas.height) * 0.8);
    g.addColorStop(0, hexToRgba(theme.accent || '#f97316', 0.13));
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

function getProjectilePalette(projectile, fallback = '#f59e0b') {
  const weaponKey = String(projectile?.weaponKey || '').toLowerCase();
  const base = projectile?.color || fallback;
  if (weaponKey.includes('sniper')) return { core: '#ffffff', hot: '#e0f2fe', edge: '#93c5fd', glow: '#38bdf8' };
  if (weaponKey.includes('smg')) return { core: '#ecfeff', hot: '#a5f3fc', edge: '#22d3ee', glow: '#0891b2' };
  if (weaponKey.includes('shotgun')) return { core: '#fff7ed', hot: '#fed7aa', edge: '#fb923c', glow: '#ef4444' };
  return { core: '#fff7d6', hot: '#fde68a', edge: base, glow: '#fb923c' };
}

function drawEnergyProjectile(projectile) {
  const speed = Math.hypot(Number(projectile.vx) || 0, Number(projectile.vy) || 0);
  const dirX = speed > 0.001 ? (Number(projectile.vx) || 0) / speed : 1;
  const dirY = speed > 0.001 ? (Number(projectile.vy) || 0) / speed : 0;
  const sx = (Number(projectile.x) || 0) - camera.x;
  const sy = (Number(projectile.y) || 0) - camera.y;
  const radius = Math.max(2, Number(projectile.radius) || 3);
  const palette = getProjectilePalette(projectile, projectile.color || '#f59e0b');
  const weaponKey = String(projectile.weaponKey || '').toLowerCase();
  const tracerLen = game.bulletTracersEnabled
    ? Math.min(48, Math.max(18, speed * (weaponKey.includes('sniper') ? 0.018 : 0.034)))
    : Math.max(8, radius * 2.4);
  const tailX = sx - dirX * tracerLen;
  const tailY = sy - dirY * tracerLen;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  if (game.bulletTracersEnabled) {
    const beam = ctx.createLinearGradient(tailX, tailY, sx, sy);
    beam.addColorStop(0, hexToRgba(palette.glow, 0));
    beam.addColorStop(0.42, hexToRgba(palette.edge, 0.22));
    beam.addColorStop(0.78, hexToRgba(palette.hot, 0.62));
    beam.addColorStop(1, hexToRgba(palette.core, 0.95));

    ctx.strokeStyle = hexToRgba(palette.glow, 0.18);
    ctx.lineWidth = Math.max(4, radius * 2.4);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    ctx.strokeStyle = beam;
    ctx.lineWidth = Math.max(2.2, radius * 1.25);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba('#ffffff', weaponKey.includes('sniper') ? 0.75 : 0.52);
    ctx.lineWidth = Math.max(0.9, radius * 0.42);
    ctx.beginPath();
    ctx.moveTo(sx - dirX * tracerLen * 0.36, sy - dirY * tracerLen * 0.36);
    ctx.lineTo(sx + dirX * radius * 1.2, sy + dirY * radius * 1.2);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(8, radius * 4.2));
  glow.addColorStop(0, hexToRgba(palette.core, 0.72));
  glow.addColorStop(0.42, hexToRgba(palette.edge, 0.3));
  glow.addColorStop(1, hexToRgba(palette.glow, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, Math.max(8, radius * 4.2), 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(sx, sy);
  ctx.rotate(Math.atan2(dirY, dirX));
  ctx.fillStyle = palette.core;
  ctx.beginPath();
  ctx.moveTo(radius * 2.15, 0);
  ctx.lineTo(-radius * 0.55, -radius * 0.78);
  ctx.lineTo(-radius * 1.38, 0);
  ctx.lineTo(-radius * 0.55, radius * 0.78);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.hot;
  ctx.fillRect(-radius * 0.65, -Math.max(0.7, radius * 0.22), radius * 1.9, Math.max(1.4, radius * 0.44));
  ctx.restore();
}

function drawRocketProjectile(projectile) {
  const angle = Math.atan2(Number(projectile.vy) || 0, Number(projectile.vx) || 1);
  const sx = (Number(projectile.x) || 0) - camera.x;
  const sy = (Number(projectile.y) || 0) - camera.y;
  const color = projectile.color || '#fb923c';
  drawShadowAtScreen(sx, sy + 5, 8, 3.5, 0.22);

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);

  ctx.globalCompositeOperation = 'lighter';
  const flame = ctx.createLinearGradient(-22, 0, 0, 0);
  flame.addColorStop(0, 'rgba(248,113,113,0)');
  flame.addColorStop(0.45, hexToRgba(color, 0.3));
  flame.addColorStop(1, 'rgba(255,245,180,0.82)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-23, 0);
  ctx.lineTo(-8, -5.2);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-8, 5.2);
  ctx.closePath();
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.lineTo(6, -3.5);
  ctx.lineTo(11, 0);
  ctx.lineTo(6, 3.5);
  ctx.lineTo(-9, 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillRect(-5.5, -2.2, 9.5, 4.4);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(4, -3.1);
  ctx.lineTo(11, 0);
  ctx.lineTo(4, 3.1);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = hexToRgba('#ffffff', 0.42);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -2.5);
  ctx.lineTo(5.5, -2);
  ctx.stroke();
  ctx.restore();
}

function drawShadowAtScreen(sx, sy, rx, ry, alpha = 0.28) {
  if (!game.shadowsEnabled) return;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
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
function drawJumpChargesIndicator(p, sx, sy, offsetY = -72) {
  if (!p || !p.alive) return;
  const fallbackCharges = typeof PLAYER_DODGE_MAX_CHARGES === 'number' ? PLAYER_DODGE_MAX_CHARGES : 2;
  const maxCharges = Math.max(1, Number(p.dodgeChargesMax) || fallbackCharges);
  const charges = Math.max(0, Math.min(maxCharges, Number(p.dodgeCharges ?? maxCharges) || 0));
  const cdMs = Math.max(0, Number(p.dodgeRechargeMs ?? p.dodgeCooldownMs) || 0);
  const cdTotalMs = Math.max(1, Number(p.dodgeRechargeTotalMs) || 1200);
  const recharging = charges < maxCharges && cdMs > 0;
  const recoveringIndex = recharging ? charges : -1;

  const radius = 4;
  const gap = 4;
  const y = sy + offsetY;
  const totalWidth = maxCharges * (radius * 2) + (maxCharges - 1) * gap;
  const startX = sx - totalWidth / 2 + radius;

  ctx.save();
  ctx.lineWidth = 2;
  for (let i = 0; i < maxCharges; i += 1) {
    const cx = startX + i * (radius * 2 + gap);
    const ready = i < charges;
    const grad = ctx.createRadialGradient(cx - 1.5, y - 1.5, 0.5, cx, y, radius + 2);
    grad.addColorStop(0, ready ? 'rgba(224, 251, 255, 0.98)' : 'rgba(30, 41, 59, 0.9)');
    grad.addColorStop(0.48, ready ? 'rgba(56, 189, 248, 0.95)' : 'rgba(15, 23, 42, 0.86)');
    grad.addColorStop(1, ready ? 'rgba(37, 99, 235, 0.96)' : 'rgba(2, 6, 23, 0.82)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = ready ? 'rgba(56, 189, 248, 0.85)' : 'transparent';
    ctx.shadowBlur = ready ? 7 : 0;
    ctx.strokeStyle = ready ? 'rgba(186, 230, 253, 0.96)' : 'rgba(71, 85, 105, 0.74)';
    ctx.beginPath();
    ctx.arc(cx, y, radius + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (i === recoveringIndex) {
      const progress = 1 - Math.max(0, Math.min(1, cdMs / cdTotalMs));
      ctx.strokeStyle = '#67e8f9';
      ctx.beginPath();
      ctx.arc(cx, y, radius + 2.5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
      ctx.stroke();
    }
  }

  if (recharging) {
    ctx.fillStyle = '#bae6fd';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((cdMs / 1000).toFixed(1) + 's', sx, y + 17);
  }
  ctx.restore();
}

function drawPlayerWeaponAmmoBadge(p, sx, sy, offsetY = -52) {
  if (!p || !p.alive) return;
  const weaponKey = String(p.weaponKey || 'pistol').toLowerCase();
  const fallbackMagSize = weaponKey === 'sniper' ? 5 : (weaponKey === 'shotgun' ? 8 : (weaponKey === 'smg' ? 36 : 12));
  const magSize = Math.max(1, Math.floor(Number(p.magazineSize) || fallbackMagSize));
  const mag = Math.max(0, Math.floor(Number(p.magazineAmmo ?? p.magazine ?? magSize) || 0));
  const ammoRatio = Math.max(0, Math.min(1, mag / magSize));
  const reserveRaw = p.reserveAmmo ?? p.ammo;
  const reserve = reserveRaw === null || reserveRaw === undefined ? '∞' : String(Math.max(0, Math.floor(Number(reserveRaw) || 0)));
  const reloadLeft = Math.max(0, Number(p.reloadLeftMs) || 0);
  const reloadTotal = Math.max(1, Number(p.reloadTotalMs) || 1);
  const reloadProgress = reloadLeft > 0 ? (1 - Math.max(0, Math.min(1, reloadLeft / reloadTotal))) : 0;
  const barRatio = reloadLeft > 0
    ? Math.max(ammoRatio, Math.min(1, ammoRatio + ((1 - ammoRatio) * reloadProgress)))
    : ammoRatio;
  const label = `${mag}/${reserve}`;
  const y = sy + offsetY;
  const w = Math.max(74, 42 + label.length * 6);
  const h = 18;
  const x = sx - w / 2;
  const accent = weaponKey === 'sniper' ? '#e5e7eb'
    : weaponKey === 'shotgun' ? '#fb923c'
      : weaponKey === 'smg' ? '#38bdf8'
        : '#f59e0b';

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = 'rgba(8, 13, 20, 0.82)';
  ctx.strokeStyle = reloadLeft > 0 ? 'rgba(250, 204, 21, 0.92)' : 'rgba(148, 163, 184, 0.72)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 7);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.translate(x + 15, y + h / 2);
  ctx.scale(0.92, 0.92);
  ctx.fillStyle = accent;
  drawWeaponIcon(0, 0, weaponKey);
  ctx.restore();

  ctx.fillStyle = reloadLeft > 0 ? '#fde68a' : '#f8fafc';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 28, y + h / 2 + 0.5);

  const barColor = `rgb(${Math.round(239 - (107 * barRatio))}, ${Math.round(68 + (172 * barRatio))}, ${Math.round(68 + (49 * barRatio))})`;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.fillRect(x + 5, y + h - 4, w - 10, 2);
  ctx.fillStyle = barColor;
  ctx.fillRect(x + 5, y + h - 4, Math.max(1, (w - 10) * barRatio), 2);
  ctx.restore();
}

function hashCompanionLabelSeed(value) {
  const str = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getCompanionDisplayName(p) {
  const seed = hashCompanionLabelSeed(`${p?.ownerId || ''}:${p?.skillId || ''}:${p?.id || ''}:${p?.weaponKey || ''}`);
  const lang = typeof window.cwI18nGetLanguage === 'function' ? window.cwI18nGetLanguage() : 'ru';
  const weaponKey = String(p?.weaponKey || 'pistol').toLowerCase();
  const pick = (list, shift = 0) => list[(seed >>> shift) % list.length];

  if (lang === 'en') {
    const prefixes = ['Tactical', 'Rowdy', 'Greasy', 'Lucky', 'Sneaky', 'Chaotic', 'Turbo', 'Certified'];
    const byWeapon = {
      pistol: ['Clickster', 'Magboy', 'Poppler', 'Snapdad'],
      smg: ['Brrrtson', 'Sprinkles', 'Buzzman', 'Tape Deck'],
      shotgun: ['Boomkins', 'Clapper', 'Big Snack', 'Doorbell'],
      sniper: ['Zoomer', 'Long Ping', 'Blinkshot', 'Scope Dad'],
    };
    const suffixes = byWeapon[weaponKey] || ['Maglin', 'Gremlin', 'Blaster', 'Ammo Goblin'];
    return `${pick(prefixes)} ${pick(suffixes, 3)}`;
  }

  const prefixes = ['Тактический', 'Шальной', 'Ржавый', 'Суетной', 'Бодрый', 'Лютый', 'Секретный', 'Легендарный'];
  const byWeapon = {
    pistol: ['Щелкун', 'Пулькин', 'Магазиныч', 'Бздынь'],
    smg: ['Трррынь', 'Очередыч', 'Пыщыч', 'Шушпан'],
    shotgun: ['Бабахыч', 'Дробыш', 'Хлопун', 'Вышибала'],
    sniper: ['Прищур', 'Дальнобой', 'Тыкыч', 'Линза'],
  };
  const suffixes = byWeapon[weaponKey] || ['Патроныч', 'Пыхтун', 'Щелкун', 'Магазиныч'];
  return `${pick(prefixes)} ${pick(suffixes, 3)}`;
}

function drawCompanionNameAmmoBadge(p, sx, sy) {
  if (!p || !p.alive || !p.isCompanion) return;
  if (!game.showCompanionNamesEnabled) return;
  const displayName = String(p.name || '').trim() || getCompanionDisplayName(p);
  const width = Math.max(62, Math.min(132, 18 + displayName.length * 6));
  const height = 16;
  const x = sx - width / 2;
  const y = sy - 84;

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(5, 10, 18, 0.74)';
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.36)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayName, sx, y + (height / 2) + 0.5);
  ctx.restore();
}

function drawPlayerNameHpBadge(p, sx, sy) {
  if (!p || !p.alive) return;
  const name = String(p.name || '').trim();
  const hp = Math.max(0, Math.ceil(Number(p.hp) || 0));
  const maxHp = Math.max(1, Math.ceil(Number(p.maxHp) || 1));
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const hpText = `${hp}/${maxHp}`;
  const label = name || 'Player';
  const width = Math.max(92, Math.min(150, 42 + Math.max(label.length, hpText.length) * 6.4));
  const x = sx - width / 2;
  const y = sy - 91;

  ctx.save();
  ctx.globalAlpha = 0.99;
  ctx.fillStyle = 'rgba(4, 9, 15, 0.28)';
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 25, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, sx, y + 7);

  const barX = x + 6;
  const barY = y + 13;
  const barW = width - 12;
  const barH = 9;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = ratio > 0.45 ? '#84cc16' : (ratio > 0.2 ? '#facc15' : '#ef4444');
  ctx.fillRect(barX, barY, barW * ratio, barH);
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.78)';
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = '#052e16';
  ctx.fillText(hpText, sx, barY + barH / 2 + 1.5);
  ctx.restore();
}

function drawCompanionReloadBar(p, sx, sy) {
  if (!p || !p.alive || !p.isCompanion) return;
  const reloadLeft = Math.max(0, Number(p.reloadLeftMs) || 0);
  const reloadTotal = Math.max(1, Number(p.reloadTotalMs) || 1);
  if (reloadLeft <= 0 || reloadTotal <= 1) return;

  const progress = 1 - Math.max(0, Math.min(1, reloadLeft / reloadTotal));
  const width = 34;
  const height = 5;
  const x = sx - width / 2;
  const y = sy - 35;

  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = 'rgba(5, 10, 18, 0.72)';
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.78)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 3);
  ctx.fill();
  ctx.stroke();

  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.55, '#67e8f9');
  grad.addColorStop(1, '#facc15');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, Math.max(1, (width - 2) * progress), height - 2, 2);
  ctx.fill();

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('reload', sx, y - 2);
  ctx.restore();
}

function drawPlayerOverheadUi(p, sx, sy, isMe) {
  if (!p || !p.alive || p.isCompanion) return;
  const stackY = sy + 14;
  drawPlayerWeaponAmmoBadge(p, sx, stackY, -113);
  drawPlayerNameHpBadge(p, sx, stackY);
  drawJumpChargesIndicator(p, sx, stackY, -56);
}

function drawTrees() {
  for (const tr of game.sortedTrees) {
    if (!isVisibleWorld(tr.x, tr.y - 36, 90)) continue;
    const x = tr.x - camera.x;
    const y = tr.y - camera.y;
    const s = (tr.scale || 1) * 1.6;

    drawShadowAtScreen(x + 8 * s, y + 12 * s, 14 * s, 6 * s, 0.24);

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

function drawMapObjectHpBar(obj, screenX, screenY) {
  if (!obj?.destructible || obj.destroyed) return;
  const maxHp = Math.max(1, Number(obj.maxHp) || 1);
  const hp = Math.max(0, Number(obj.hp) || 0);
  if (hp >= maxHp) return;
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const width = Math.max(28, Math.min(88, (Number(obj.w) || 64) * 0.48));
  const barY = screenY - Math.max(16, (Number(obj.h) || 64) * 0.58);
  ctx.save();
  ctx.fillStyle = 'rgba(6, 10, 16, 0.85)';
  ctx.fillRect(screenX - width * 0.5, barY, width, 5);
  ctx.fillStyle = ratio > 0.45 ? '#22c55e' : (ratio > 0.18 ? '#f59e0b' : '#ef4444');
  ctx.fillRect(screenX - width * 0.5 + 1, barY + 1, Math.max(2, (width - 2) * ratio), 3);
  ctx.restore();
}

function drawMapObjects(nowMs = Date.now()) {
  const objects = Array.isArray(game.sortedMapObjects) ? game.sortedMapObjects : [];
  for (const obj of objects) {
    const radius = Math.max(Number(obj.w) || 0, Number(obj.h) || 0) * 0.55;
    if (!isVisibleWorld(Number(obj.x) || 0, Number(obj.y) || 0, radius + 40)) continue;
    const screenX = (Number(obj.x) || 0) - camera.x;
    const screenY = (Number(obj.y) || 0) - camera.y;
    const width = Math.max(22, Number(obj.w) || 22);
    const height = Math.max(22, Number(obj.h) || 22);
    const anchorY = Math.max(0.45, Math.min(0.72, Number(obj.anchorY) || 0.56));
    const sprite = sprites.mapProps?.[obj.spriteKey] || null;
    const damaged = obj.destructible && (Number(obj.hp) || 0) < Math.max(1, Number(obj.maxHp) || 1);
    const recentlyHit = Math.max(0, Number(obj.lastHitAt) || 0) > 0 && (nowMs - Number(obj.lastHitAt) <= 120);

    if (obj.destroyed) {
      drawShadowAtScreen(screenX, screenY + 10, Math.max(18, width * 0.22), Math.max(6, height * 0.09), 0.14);
      ctx.save();
      ctx.fillStyle = 'rgba(18, 10, 8, 0.58)';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY + 8, Math.max(16, width * 0.26), Math.max(7, height * 0.12), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      drawShadowAtScreen(screenX, screenY + 10, Math.max(16, width * 0.22 * (Number(obj.shadowScale) || 1)), Math.max(6, height * 0.1), 0.22);
    }

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(Number(obj.angle) || 0);
    if (recentlyHit) ctx.filter = 'brightness(1.18) saturate(1.2)';
    else if (obj.destroyed) ctx.filter = 'grayscale(0.65) brightness(0.48) saturate(0.4)';
    else if (damaged) ctx.filter = 'brightness(0.94) saturate(0.92)';

    if (sprite?.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -width * 0.5, -height * anchorY, width, height);
    } else {
      ctx.fillStyle = obj.destroyed ? '#3f3f46' : '#64748b';
      ctx.fillRect(-width * 0.5, -height * 0.5, width, height);
    }

    if (damaged && !obj.destroyed) {
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-width * 0.18, -height * 0.06);
      ctx.lineTo(width * 0.12, height * 0.16);
      ctx.moveTo(width * 0.06, -height * 0.2);
      ctx.lineTo(width * 0.18, height * 0.08);
      ctx.stroke();
    }

    if (obj.destroyed && obj.explosive) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(251, 146, 60, 0.16)';
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(10, width * 0.15), Math.max(10, height * 0.12), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    drawMapObjectHpBar(obj, screenX, screenY);
  }
}

function drawWeaponIcon(sx, sy, weaponKey) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#f8fafc';
  ctx.fillStyle = '#f8fafc';
  if (weaponKey === 'smg') {
    ctx.fillRect(-6, -1, 10, 2);
    ctx.fillRect(2, -3, 2, 5);
    ctx.fillRect(-1, 1, 2, 4);
  } else if (weaponKey === 'shotgun') {
    ctx.fillRect(-7, -1, 12, 2);
    ctx.fillRect(-2, 1, 2, 5);
  } else if (weaponKey === 'sniper') {
    ctx.fillRect(-8, -1, 14, 2);
    ctx.fillRect(-2, -4, 4, 2);
    ctx.strokeRect(4, -2, 2, 3);
  } else {
    ctx.fillRect(-5, -1, 8, 2);
    ctx.fillRect(1, -3, 2, 5);
  }
  ctx.restore();
}

function drawPlayer(p, t, isMe, rx, ry, drawUi = true) {
  if (!isVisibleWorld(rx, ry, 50)) return;
  const x = rx - camera.x;
  const y = ry - camera.y;
  const isCompanion = Boolean(p.isCompanion);
  const displayPlayer = p;

  if (!p.alive) {
    return;
  }

  const variant = getPlayerVariant(p.playerClass || (isMe ? selectedPlayerClass : 'cyber'));
  const playerSprite = sprites.players[variant.id];
  const fw = Math.max(8, Number(variant.frameW) || 32);
  const fh = Math.max(8, Number(variant.frameH) || 48);
  const scale = Math.max(0.5, Number(variant.scale) || 1) * (isCompanion ? 0.84 : 1);

  const dw = fw * scale;
  const dh = fh * scale;
  drawShadowAtScreen(x, y + dh * 0.34, Math.max(10, dw * 0.33), Math.max(4, dh * 0.1), 0.3);

  if (playerSprite?.complete && playerSprite.naturalWidth >= fw && playerSprite.naturalHeight >= fh) {
    const rv = game.renderPlayers.get(p.id);
    const keyMoving = input.up || input.down || input.left || input.right;
    const mobileMoving = mobile.enabled && mobile.moveStrength > 0.08;
    const velMoving = Math.hypot(rv?.vx || 0, rv?.vy || 0) > 10;
    const moving = isMe ? (keyMoving || mobileMoving || velMoving) : velMoving;
    const phase = isMe ? 0 : (p.id.charCodeAt(0) % 3);

    const frameCount = Math.max(1, Math.floor(playerSprite.naturalWidth / fw));
    const rowCount = Math.max(1, Math.floor(playerSprite.naturalHeight / fh));
    const fps = Math.max(2, Number(variant.fps) || 9);
    const idleFrame = Math.max(0, Math.min(frameCount - 1, Number(variant.idleFrame) || 1));
    const frame = moving ? (Math.floor(t * fps + phase) % frameCount) : idleFrame;

    const aimDx = (Number(displayPlayer.aimX) || rx) - rx;
    const aimDy = (Number(displayPlayer.aimY) || ry) - ry;
    const hasAim = Math.hypot(aimDx, aimDy) > 0.001;
    const useLocalPointerLook = isMe && !replayGame.active;
    const lookDx = hasAim ? aimDx : (useLocalPointerLook ? (input.pointerX - x) : (rv?.vx || 0));
    const lookDy = hasAim ? aimDy : (useLocalPointerLook ? (input.pointerY - y) : (rv?.vy || 0));
    let dir = 'down';
    if (Math.abs(lookDx) > Math.abs(lookDy)) dir = lookDx < 0 ? 'left' : 'right';
    else if (Math.abs(lookDy) > 0.0001) dir = lookDy < 0 ? 'up' : 'down';

    const rows = variant.rows || { down: 0, left: 1, right: 2, up: 3 };
    const selectedRow = Number(rows[dir]);
    const row = Number.isFinite(selectedRow) ? Math.max(0, Math.min(rowCount - 1, selectedRow)) : 0;

    ctx.save();
    ctx.translate(x, y + 2);
    ctx.drawImage(playerSprite, frame * fw, row * fh, fw, fh, -dw / 2, -dh * 0.6, dw, dh);
    ctx.restore();
  } else {
    drawCircle(rx, ry, 18, isMe ? '#22d3ee' : '#a78bfa');
  }

  if (!drawUi) return;
  if (isCompanion) drawCompanionNameAmmoBadge(displayPlayer, x, y);
  if (isCompanion && game.showCompanionReserveAmmoEnabled) drawPlayerWeaponAmmoBadge(displayPlayer, x, y, -54);
  drawPlayerOverheadUi(displayPlayer, x, y, isMe);
}

function drawPlayerUiLayer(playersByDepth) {
  if (!Array.isArray(playersByDepth) || playersByDepth.length <= 0) return;
  let myItem = null;

  for (const item of playersByDepth) {
    const p = item?.p;
    const rp = item?.rp;
    if (!p?.alive || p.isCompanion) continue;
    if (p.id === game.myId) {
      myItem = item;
      continue;
    }
    drawPlayerOverheadUi(p, (Number(rp?.x) || 0) - camera.x, (Number(rp?.y) || 0) - camera.y, false);
  }

  if (myItem?.p?.alive) {
    drawPlayerOverheadUi(
      myItem.p,
      (Number(myItem.rp?.x) || 0) - camera.x,
      (Number(myItem.rp?.y) || 0) - camera.y,
      true,
    );
  }
}
function drawBossPortals(portals, nowMs) {
  if (!Array.isArray(portals)) return;
  for (const bp of portals) {
    if (!isVisibleWorld(bp.x, bp.y, 120)) continue;
    const x = bp.x - camera.x;
    const y = bp.y - camera.y;
    const leftMs = Math.max(0, Number(bp.spawnAt) - nowMs);
    const ttl = Math.max(1, Number(bp.ttlMs) || leftMs || 1);
    const progress = 1 - Math.max(0, Math.min(1, leftMs / ttl));
    const pulse = 0.8 + Math.sin(nowMs * 0.012 + bp.id) * 0.2;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(220, 38, 38, ${(0.5 + progress * 0.4).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 30 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(248, 113, 113, ${(0.35 + progress * 0.35).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 46 + pulse * 9, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i += 1) {
      const ang = nowMs * 0.003 + i * (Math.PI * 2 / 12);
      const pr = 24 + ((i % 3) * 8) + Math.sin(nowMs * 0.006 + i) * 4;
      const px = x + Math.cos(ang) * pr;
      const py = y + Math.sin(ang) * pr;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(239,68,68,0.82)' : 'rgba(251,113,133,0.75)';
      ctx.beginPath();
      ctx.arc(px, py, 2.2 + (i % 3) * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`BOSS in ${(leftMs / 1000).toFixed(1)}s`, x, y - 54);
    ctx.restore();
  }
}

function drawEnemies(enemies, t) {
  const fw = 37;
  const fh = 45;
  const frames = Math.max(2, Math.floor((sprites.enemy.naturalWidth || (fw * 2)) / fw));

  for (const e of enemies) {
    const re = getEnemyRenderPos(e);
    const er = Math.max(18, Number(e.radius) || 18);
    if (!isVisibleWorld(re.x, re.y, Math.max(60, er + 24))) continue;
    const x = re.x - camera.x;
    const y = re.y - camera.y;
    const isBoss = e.type === 'boss';
    const scale = isBoss ? Math.max(2.2, Number(e.spriteScale) || 2.6) : Math.max(0.9, Number(e.spriteScale) || 1);
    const sw = 42 * scale;
    const sh = 50 * scale;

    drawShadowAtScreen(x, y + (isBoss ? 48 : 29), 14 * scale, 6 * scale, isBoss ? 0.42 : 0.3);

    if (sprites.enemy.complete && sprites.enemy.naturalWidth >= fw * 2) {
      const frame = Math.floor(t * (isBoss ? 9 : 12)) % frames;
      const hasFaceLeft = typeof re.faceLeft === 'boolean' || typeof e.faceLeft === 'boolean';
      const faceLeft = hasFaceLeft
        ? Boolean(re.faceLeft ?? e.faceLeft)
        : ((Math.abs(Number(re.vx) || 0) > 0.15) ? ((Number(re.vx) || 0) < 0) : false);

      ctx.save();
      ctx.translate(x, y + (isBoss ? 6 : 2));
      if (faceLeft) ctx.scale(-1, 1);
      if (isBoss) ctx.filter = 'contrast(1.12) saturate(0.82)';
      ctx.drawImage(sprites.enemy, frame * fw, 0, fw, fh, -sw * 0.5, -sh * 0.52, sw, sh);
      ctx.restore();

      if (isBoss) {
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', x, y - sh * 0.62 - 10);
      }
    } else {
      drawCircle(re.x, re.y, isBoss ? 34 : 18, isBoss ? '#b91c1c' : '#ef4444');
    }

    if (game.enemyHpBarsEnabled) {
      const ratio = Math.max(0, e.hp / e.maxHp);
      const hpY = isBoss ? (re.y - 20) : re.y;
      drawHpBar(re.x, hpY, ratio);
    }
  }
}


function drawXpOrbs(orbs, nowMs) {
  if (!Array.isArray(orbs)) return;
  for (const o of orbs) {
    const ro = getXpOrbRenderPos(o);
    if (!isVisibleWorld(ro.x, ro.y, 20)) continue;
    const x = ro.x - camera.x;
    const y = ro.y - camera.y;
    const left = Math.max(0, Number(o.ttlMs) || 0);
    const blink = left < 3000 && Math.sin(nowMs / 80) < 0;
    if (blink) continue;
    const pulse = 1 + Math.sin(nowMs / 140 + o.id) * 0.2;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y, 7 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

const trRender = (key, fallback = key) => {
  if (typeof window.cwI18nT !== 'function') return fallback;
  const out = window.cwI18nT(key);
  return out === key ? fallback : out;
};

function skillOrbDisplayData(skillId) {
  const sid = String(skillId || '').toLowerCase();
  const def = game.skillCatalog?.[sid] || game.skillCatalog?.[skillId] || {};
  const rarity = String(def.rarity || 'common').toLowerCase();
  const fallbackName = String(def.name || sid || 'Skill');
  return {
    name: trRender(`skill.${sid}.name`, fallbackName),
    rarity,
  };
}
function drawSkillOfferOrbs(orbs, nowMs) {
  if (!Array.isArray(orbs)) return;
  for (const orb of orbs) {
    if (!isVisibleWorld(orb.x, orb.y, 80)) continue;
    const own = orb.ownerId === game.myId;
    const info = skillOrbDisplayData(orb.skillId);
    const baseColor = own ? rarityColor(info.rarity) : '#9ca3af';
    const ttlMs = Math.max(0, Number(orb.ttlMs) || 0);
    const ttlMaxMs = Math.max(1, Number(orb.ttlMaxMs) || 15000);
    const lowTtl = ttlMs <= 3500;
    const blinkHidden = lowTtl && Math.sin(nowMs / 85 + (Number(orb.id) || 0)) < -0.28;
    if (blinkHidden) continue;
    const sx = orb.x - camera.x;
    const sy = orb.y - camera.y;
    const pulse = 1 + Math.sin((nowMs / 170) + (Number(orb.id) || 0)) * 0.16;
    const auraR = 18 * pulse;
    ctx.save();
    if (!own) ctx.globalAlpha = 0.52;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `${baseColor}55`;
    ctx.beginPath();
    ctx.arc(sx, sy, auraR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = own ? (baseColor + 'cc') : '#9ca3af';
    ctx.beginPath();
    ctx.arc(sx, sy, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 12.5, 0, Math.PI * 2);
    ctx.stroke();
    const progress = Math.max(0, Math.min(1, ttlMs / ttlMaxMs));
    ctx.strokeStyle = lowTtl ? '#f87171' : (baseColor + 'cc');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 15.5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
    ctx.stroke();
    const label = info.name;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(7, 12, 20, 0.88)';
    ctx.lineWidth = 3;
    ctx.strokeText(label, sx, sy - 22);
    ctx.fillStyle = own ? (baseColor + 'cc') : '#9ca3af';
    ctx.fillText(label, sx, sy - 22);
    ctx.restore();
  }
}
function drawBossPortalEdgeIndicator(portals, nowMs) {
  const enemies = Array.isArray(game.state?.enemies) ? game.state.enemies : [];
  const aliveBoss = enemies.find((e) => e && e.type === 'boss' && Number(e.hp) > 0);

  let targetX = null;
  let targetY = null;
  let text = 'BOSS';

  if (aliveBoss) {
    const rb = getEnemyRenderPos(aliveBoss);
    targetX = rb.x;
    targetY = rb.y;
    text = 'BOSS';
  } else if (Array.isArray(portals) && portals.length > 0) {
    const portal = portals[0];
    targetX = Number(portal.x);
    targetY = Number(portal.y);
    const leftSec = Math.max(0, (Number(portal.spawnAt) - nowMs) / 1000);
    text = `BOSS ${leftSec.toFixed(1)}s`;
  }

  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;

  const sx = targetX - camera.x;
  const sy = targetY - camera.y;
  const margin = 18;
  if (sx >= margin && sx <= canvas.width - margin && sy >= margin && sy <= canvas.height - margin) return;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const pad = 44;
  const boundX = Math.max(20, cx - pad);
  const boundY = Math.max(20, cy - pad);
  const dx = sx - cx;
  const dy = sy - cy;
  const absDx = Math.max(0.001, Math.abs(dx));
  const absDy = Math.max(0.001, Math.abs(dy));
  const t = Math.min(boundX / absDx, boundY / absDy);
  const ax = cx + dx * t;
  const ay = cy + dy * t;
  const ang = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const textX = ax - Math.cos(ang) * 40;
  const textY = ay - Math.sin(ang) * 40;
  ctx.save();
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(2, 6, 14, 0.9)';
  ctx.lineWidth = 3;
  ctx.strokeText(text, textX, textY);
  ctx.fillStyle = '#fca5a5';
  ctx.fillText(text, textX, textY);
  ctx.restore();
}
function drawSkillOrbEdgeIndicators(orbs) {
  if (!Array.isArray(orbs) || orbs.length <= 0) return;
  const ownOrbs = [];
  for (const orb of orbs) {
    if (orb?.ownerId === game.myId) ownOrbs.push(orb);
  }
  if (ownOrbs.length <= 0) return;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const pad = 46;
  const boundX = Math.max(20, cx - pad);
  const boundY = Math.max(20, cy - pad);

  const offscreen = [];
  for (const orb of ownOrbs) {
    const sx = orb.x - camera.x;
    const sy = orb.y - camera.y;
    if (sx >= 0 && sx <= canvas.width && sy >= 0 && sy <= canvas.height) continue;
    const dx = sx - cx;
    const dy = sy - cy;
    offscreen.push({ orb, sx, sy, d2: dx * dx + dy * dy });
  }
  if (offscreen.length <= 0) return;

  // Draw only nearest indicators to avoid expensive text rendering spikes when many orbs exist.
  offscreen.sort((a, b) => a.d2 - b.d2);
  const maxIndicators = 4;
  const visibleCount = Math.min(maxIndicators, offscreen.length);

  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(2, 6, 14, 0.9)';
  ctx.lineWidth = 3;

  for (let i = 0; i < visibleCount; i += 1) {
    const item = offscreen[i];
    const orb = item.orb;
    const sx = item.sx;
    const sy = item.sy;
    const dx = sx - cx;
    const dy = sy - cy;
    const absDx = Math.max(0.001, Math.abs(dx));
    const absDy = Math.max(0.001, Math.abs(dy));
    const t = Math.min(boundX / absDx, boundY / absDy);
    const ax = cx + dx * t;
    const ay = cy + dy * t;
    const ang = Math.atan2(dy, dx);
    const info = skillOrbDisplayData(orb.skillId);
    const color = rarityColor(info.rarity);

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-9, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Text is one of the most expensive canvas operations; keep labels only for closest 2.
    if (i < 2) {
      const textX = ax - Math.cos(ang) * 34;
      const textY = ay - Math.sin(ang) * 34;
      ctx.strokeText(info.name, textX, textY);
      ctx.fillStyle = color;
      ctx.fillText(info.name, textX, textY);
    }
  }

  if (offscreen.length > visibleCount) {
    const more = offscreen.length - visibleCount;
    const txt = `+${more}`;
    const x = canvas.width - 24;
    const y = 28;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(txt, x, y);
  }
}
function drawBloodPuddles() {
  for (const p of visuals.bloodPuddles) {
    if (!isVisibleWorld(p.x, p.y, 34)) continue;
    const a = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(120, 10, 18, ${(a * 0.6).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(p.x - camera.x, p.y - camera.y, p.r, p.r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFx() {
  for (const b of visuals.bossBlast) {
    if (!isVisibleWorld(b.x, b.y, b.maxR + 12)) continue;
    const t = Math.max(0, b.life / b.ttl);
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const ringAlpha = 0.55 * t;
    const fillAlpha = 0.38 * t;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(sx, sy, Math.max(4, b.r * 0.1), sx, sy, b.r);
    grad.addColorStop(0, `rgba(255,140,140,${Math.min(0.5, fillAlpha).toFixed(3)})`);
    grad.addColorStop(0.35, `rgba(210,30,38,${fillAlpha.toFixed(3)})`);
    grad.addColorStop(1, 'rgba(90,8,12,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = `rgba(255,170,170,${ringAlpha.toFixed(3)})`;
    ctx.lineWidth = 4 + (1 - t) * 5;
    ctx.beginPath();
    ctx.arc(sx, sy, b.r * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const m of visuals.bloodMist) {
    if (!isVisibleWorld(m.x, m.y, m.r + 8)) continue;
    const a = Math.max(0, m.life / m.ttl);
    const sx = m.x - camera.x;
    const sy = m.y - camera.y;
    ctx.fillStyle = `rgba(170,18,30,${(a * 0.42).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, m.r * (1 + (1 - a) * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  for (const s of visuals.rocketSmoke) {
    if (!isVisibleWorld(s.x, s.y, s.r + 16)) continue;
    const a = Math.max(0, s.life / s.ttl);
    ctx.fillStyle = `rgba(148,163,184,${(a * 0.3).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x - camera.x, s.y - camera.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const f of visuals.rocketFire) {
    if (!isVisibleWorld(f.x, f.y, f.r + 10)) continue;
    const a = Math.max(0, f.life / f.ttl);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = f.color || '#fb923c';
    ctx.beginPath();
    ctx.arc(f.x - camera.x, f.y - camera.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const p of visuals.rocketBlast) {
    if (!isVisibleWorld(p.ox, p.oy, p.r + 10)) continue;
    const a = Math.max(0, p.life / p.ttl);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = p.color || '#fb923c';
    ctx.beginPath();
    ctx.arc(p.ox - camera.x, p.oy - camera.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const s of visuals.skillBursts) {
    if (!isVisibleWorld(s.x, s.y, s.maxR + 12)) continue;
    const a = Math.max(0, s.life / s.ttl);
    const sx = s.x - camera.x;
    const sy = s.y - camera.y;
    const style = String(s.style || 'default').toLowerCase();
    if (style === 'shockwave') {
      const radius = Math.max(1, Number(s.r) || 1);
      const trailRings = Math.max(3, Math.round(Number(s.trailRings) || 4));
      const spikeCount = Math.max(8, Math.round(Number(s.spikeCount) || 12));
      const accentColor = s.accentColor || '#dcfce7';
      const innerColor = s.innerColor || '#bbf7d0';
      const pulsePhase = (performance.now() / 42) + radius * 0.04;
      const fillGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      fillGrad.addColorStop(0, `rgba(240, 253, 244, ${(a * 0.16).toFixed(3)})`);
      fillGrad.addColorStop(0.34, `rgba(187, 247, 208, ${(a * 0.14).toFixed(3)})`);
      fillGrad.addColorStop(1, 'rgba(22, 163, 74, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = Math.min(1, a * 0.96);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 5.8 + (1 - a) * 3.4;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = Math.min(1, a * 0.82);
      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 2.2 + (1 - a) * 1.6;
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 0.74, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([Math.max(10, radius * 0.075), Math.max(7, radius * 0.05)]);
      ctx.lineDashOffset = -pulsePhase * 6.4;
      ctx.globalAlpha = Math.min(1, a * 0.58);
      ctx.strokeStyle = 'rgba(236, 253, 245, 0.95)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 0.88, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = Math.min(1, a * 0.72);
      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 2.1;
      for (let i = 0; i < trailRings; i += 1) {
        const k = (i + 1) / (trailRings + 1);
        const rr = radius * (0.28 + k * 0.52);
        const ringA = a * (0.34 - k * 0.06);
        if (ringA <= 0) continue;
        ctx.globalAlpha = Math.min(1, Math.max(0, ringA));
        ctx.beginPath();
        ctx.arc(sx, sy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = Math.min(1, a * 0.9);
      ctx.strokeStyle = 'rgba(236, 253, 245, 0.95)';
      ctx.lineWidth = 2;
      for (let i = 0; i < spikeCount; i += 1) {
        const angle = ((Math.PI * 2 * i) / spikeCount) + pulsePhase * 0.14;
        const innerR = Math.max(8, radius - 18 - (1 - a) * 10);
        const outerR = radius + 12 + Math.sin(pulsePhase + i * 1.35) * 4;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(angle) * innerR, sy + Math.sin(angle) * innerR);
        ctx.lineTo(sx + Math.cos(angle) * outerR, sy + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }
    if (style === 'psi_blast') {
      const radius = Math.max(1, Number(s.r) || 1);
      const trailRings = Math.max(2, Math.round(Number(s.trailRings) || 6));
      const fillGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      fillGrad.addColorStop(0, `rgba(147, 234, 255, ${(a * 0.22).toFixed(3)})`);
      fillGrad.addColorStop(0.38, `rgba(96, 165, 250, ${(a * 0.2).toFixed(3)})`);
      fillGrad.addColorStop(1, 'rgba(31, 111, 235, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = Math.min(1, a * 0.9);
      ctx.strokeStyle = 'rgba(168, 240, 255, 0.95)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < trailRings; i += 1) {
        const k = (i + 1) / (trailRings + 1);
        const rr = radius * (1 - k * 0.88);
        if (rr <= 1) continue;
        const ringA = a * (0.34 - k * 0.26);
        if (ringA <= 0) continue;
        ctx.globalAlpha = Math.min(1, Math.max(0, ringA));
        ctx.strokeStyle = 'rgba(147, 210, 255, 0.95)';
        ctx.lineWidth = Math.max(0.9, 2.4 - k * 1.25);
        ctx.beginPath();
        ctx.arc(sx, sy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, a * 0.85);
    ctx.strokeStyle = s.color || '#7dd3fc';
    ctx.beginPath();
    ctx.lineWidth = 3 + (1 - a) * 4;
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const a of visuals.skillArcs) {
    if (!isVisibleWorld(a.x, a.y, a.radius + 24)) continue;
    const t = Math.max(0, a.life / a.ttl);
    const cx = a.x + Math.cos(a.ang) * a.radius;
    const cy = a.y + Math.sin(a.ang) * a.radius;
    const sx = cx - camera.x;
    const sy = cy - camera.y;
    const tangent = a.ang + Math.PI * 0.5 * (a.orbitDir || 1);
    const bladeRot = tangent + (a.bladeRot || 0);
    const bladeLength = Number(a.bladeLength) || 28;
    const bladeWidth = Number(a.bladeWidth) || 12;
    const trailSpan = Number(a.trailSpan) || 0.46;
    const alpha = Math.min(1, t * 0.95);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.38;
    ctx.strokeStyle = a.color || '#fde68a';
    ctx.lineWidth = Math.max(4, bladeWidth * 0.42);
    ctx.beginPath();
    ctx.arc(a.x - camera.x, a.y - camera.y, a.radius, a.ang - trailSpan, a.ang + trailSpan);
    ctx.stroke();

    ctx.translate(sx, sy);
    ctx.rotate(bladeRot);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, bladeLength * 1.3);
    glow.addColorStop(0, `rgba(255,245,200,${(alpha * 0.95).toFixed(3)})`);
    glow.addColorStop(0.5, `rgba(253,224,71,${(alpha * 0.34).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, bladeLength * 1.15, 0, Math.PI * 2);
    ctx.fill();

    const bladeGradient = ctx.createLinearGradient(-bladeLength * 0.7, 0, bladeLength, 0);
    bladeGradient.addColorStop(0, `rgba(255,255,255,${(alpha * 0.96).toFixed(3)})`);
    bladeGradient.addColorStop(0.28, `rgba(254,240,138,${(alpha * 0.98).toFixed(3)})`);
    bladeGradient.addColorStop(0.72, `rgba(251,191,36,${(alpha * 0.9).toFixed(3)})`);
    bladeGradient.addColorStop(1, `rgba(248,113,113,${(alpha * 0.68).toFixed(3)})`);

    ctx.fillStyle = bladeGradient;
    ctx.beginPath();
    ctx.moveTo(bladeLength, 0);
    ctx.lineTo(-bladeLength * 0.12, -bladeWidth * 0.72);
    ctx.lineTo(-bladeLength * 0.68, -bladeWidth * 0.34);
    ctx.lineTo(-bladeLength * 0.45, 0);
    ctx.lineTo(-bladeLength * 0.68, bladeWidth * 0.34);
    ctx.lineTo(-bladeLength * 0.12, bladeWidth * 0.72);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.75).toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-bladeLength * 0.48, 0);
    ctx.lineTo(bladeLength * 0.84, 0);
    ctx.stroke();

    ctx.fillStyle = `rgba(120, 24, 28, ${(alpha * 0.7).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(-bladeLength * 0.42, 0, bladeWidth * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const l of visuals.skillLinks) {
    if (!isVisibleWorld((l.x1 + l.x2) * 0.5, (l.y1 + l.y2) * 0.5, 220)) continue;
    const t = Math.max(0, l.life / l.ttl);
    const sx1 = l.x1 - camera.x;
    const sy1 = l.y1 - camera.y;
    const sx2 = l.x2 - camera.x;
    const sy2 = l.y2 - camera.y;
    const mx = (sx1 + sx2) * 0.5;
    const my = (sy1 + sy2) * 0.5;
    const nx = sy1 - sy2;
    const ny = sx2 - sx1;
    const nlen = Math.hypot(nx, ny) || 1;
    const amp = (6 + Math.sin((performance.now() / 70) + l.phase) * 3) * t;
    const kx = mx + (nx / nlen) * amp;
    const ky = my + (ny / nlen) * amp;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(103,232,249,${(t * 0.9).toFixed(3)})`;
    ctx.lineWidth = 2 + t * 1.6;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(kx, ky);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
    ctx.restore();
  }

  for (const t of visuals.skillLabels) {
    if (!isVisibleWorld(t.x, t.y, 70)) continue;
    const a = Math.max(0, t.life / t.ttl);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.2);
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c4f1ff';
    ctx.strokeStyle = 'rgba(5, 15, 28, 0.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x - camera.x, t.y - camera.y - 26);
    ctx.fillText(t.text, t.x - camera.x, t.y - camera.y - 26);
    ctx.restore();
  }
  for (const g of visuals.gore) {
    if (!isVisibleWorld(g.x, g.y, 26)) continue;
    if (game.shadowsEnabled && g.z > 0) {
      drawShadowAtScreen(g.x - camera.x, g.y - camera.y + 4, g.s * 1.25, g.s * 0.6, 0.2);
    }

    const a = Math.max(0, g.life / g.ttl);
    ctx.fillStyle = `rgba(150, 12, 20, ${Math.min(1, a + 0.2).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(g.x - camera.x, g.y - camera.y - g.z, g.s, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of visuals.blood) {
    if (!isVisibleWorld(p.x, p.y, 20)) continue;
    const a = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(180,16,28,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }


  for (const w of visuals.dodgeWind) {
    if (!isVisibleWorld(w.x, w.y, 22)) continue;
    const a = Math.max(0, w.life / w.ttl) * Math.max(0, Number(w.alpha) || 0.4);
    if (a <= 0.01) continue;
    const sx = w.x - camera.x;
    const sy = w.y - camera.y;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = w.color || '#cbd5e1';
    ctx.beginPath();
    ctx.ellipse(sx, sy, Math.max(1, w.r * 1.6), Math.max(0.7, w.r * 0.85), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const h of visuals.hitFx) {
    if (!isVisibleWorld(h.x, h.y, 24)) continue;
    const a = Math.max(0, h.life / h.ttl);
    const r = h.r + (1 - a) * 9;
    ctx.strokeStyle = `rgba(255,230,230,${(a * 0.85).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x - camera.x, h.y - camera.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = h.color;
    ctx.globalAlpha = Math.min(1, a + 0.15);
    ctx.fillRect(h.x - camera.x - 2, h.y - camera.y - r * 0.45, 4, 4);
    ctx.globalAlpha = 1;
  }

  for (const f of visuals.muzzleGroundFlashes) {
    if (!game.bulletTracersEnabled) continue;
    if (!isVisibleWorld(f.x, f.y, 72)) continue;
    const t = Math.max(0, f.life / f.ttl);
    const sx = f.x - camera.x;
    const sy = f.y - camera.y;
    const size = Math.max(0.4, Number(f.size) || 1);
    const intensity = Math.max(0.12, Math.min(1.4, Number(f.intensity) || 1));
    const pulse = 1 + (1 - t) * 0.75;
    const rx = 18 * size * pulse;
    const ry = 6 * size * pulse;
    const alpha = Math.min(1, t * 1.45) * intensity;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Number(f.a) || 0);
    ctx.globalCompositeOperation = 'lighter';

    ctx.save();
    ctx.rotate(-(Number(f.a) || 0));
    const groundR = 34 * size * (1 + (1 - t) * 1.2);
    const groundGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, groundR);
    groundGlow.addColorStop(0, hexToRgba(f.c1 || '#facc15', alpha * 0.22));
    groundGlow.addColorStop(0.38, hexToRgba(f.c2 || '#fb923c', alpha * 0.12));
    groundGlow.addColorStop(0.72, hexToRgba(f.c2 || '#fb923c', alpha * 0.045));
    groundGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, groundR * 1.18, groundR * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.45);
    glow.addColorStop(0, `rgba(255,255,255,${(alpha * 0.45).toFixed(3)})`);
    glow.addColorStop(0.2, hexToRgba(f.c1 || '#facc15', alpha * 0.48));
    glow.addColorStop(0.62, hexToRgba(f.c2 || '#fb923c', alpha * 0.16));
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.2, ry * 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexToRgba(f.c1 || '#facc15', alpha * 0.72);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.72).toFixed(3)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.45, 0);
    ctx.lineTo(rx * 1.25, 0);
    ctx.moveTo(rx * 0.12, -ry * 1.25);
    ctx.lineTo(rx * 0.68, ry * 1.25);
    ctx.stroke();
    ctx.restore();
  }

  for (const f of visuals.muzzle) {
    if (!game.bulletTracersEnabled) continue;
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

function drawMinimap() {
  if (!minimapCanvasEl || !minimapCtx || !game.showMinimapEnabled || !game.state) return;
  const cssWidth = Math.max(96, Math.round(minimapCanvasEl.clientWidth || 0));
  const cssHeight = Math.max(96, Math.round(minimapCanvasEl.clientHeight || 0));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const targetWidth = Math.max(96, Math.round(cssWidth * dpr));
  const targetHeight = Math.max(96, Math.round(cssHeight * dpr));
  if (minimapCanvasEl.width !== targetWidth || minimapCanvasEl.height !== targetHeight) {
    minimapCanvasEl.width = targetWidth;
    minimapCanvasEl.height = targetHeight;
  }

  const w = minimapCanvasEl.width;
  const h = minimapCanvasEl.height;
  const pad = Math.max(6, Math.round(8 * dpr));
  const mapX = pad;
  const mapY = pad;
  const mapW = Math.max(20, w - pad * 2);
  const mapH = Math.max(20, h - pad * 2);
  const worldW = Math.max(1, Number(game.world?.width) || 1);
  const worldH = Math.max(1, Number(game.world?.height) || 1);
  const me = Array.isArray(game.state?.players)
    ? game.state.players.find((player) => player && player.id === game.myId)
    : null;
  const focusX = Math.max(0, Math.min(worldW, Number(me?.x) || (camera.x + canvas.width * 0.5)));
  const focusY = Math.max(0, Math.min(worldH, Number(me?.y) || (camera.y + canvas.height * 0.5)));
  const mapAspect = mapW / Math.max(1, mapH);
  let viewW = Math.min(worldW, Math.max(1150, worldW * 0.34));
  let viewH = viewW / Math.max(0.65, mapAspect);
  if (viewH > worldH) {
    viewH = worldH;
    viewW = Math.min(worldW, viewH * mapAspect);
  }
  if (viewH < 860) {
    viewH = Math.min(worldH, 860);
    viewW = Math.min(worldW, viewH * mapAspect);
  }
  const viewX = Math.max(0, Math.min(worldW - viewW, focusX - viewW * 0.5));
  const viewY = Math.max(0, Math.min(worldH - viewH, focusY - viewH * 0.5));
  const sx = mapW / Math.max(1, viewW);
  const sy = mapH / Math.max(1, viewH);

  function toMapX(x) { return mapX + (Number(x || 0) - viewX) * sx; }
  function toMapY(y) { return mapY + (Number(y || 0) - viewY) * sy; }
  function isVisibleInMini(x, y, margin = 0) {
    return Number(x || 0) >= (viewX - margin)
      && Number(x || 0) <= (viewX + viewW + margin)
      && Number(y || 0) >= (viewY - margin)
      && Number(y || 0) <= (viewY + viewH + margin);
  }
  function dot(x, y, r, color) {
    if (!isVisibleInMini(x, y, 0)) return;
    minimapCtx.fillStyle = color;
    minimapCtx.beginPath();
    minimapCtx.arc(toMapX(x), toMapY(y), r, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  minimapCtx.clearRect(0, 0, w, h);

  const bg = minimapCtx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, 'rgba(11, 18, 28, 0.96)');
  bg.addColorStop(1, 'rgba(5, 9, 15, 0.96)');
  minimapCtx.fillStyle = bg;
  minimapCtx.fillRect(0, 0, w, h);

  minimapCtx.strokeStyle = 'rgba(255,255,255,0.16)';
  minimapCtx.lineWidth = Math.max(1, dpr);
  minimapCtx.strokeRect(mapX, mapY, mapW, mapH);

  minimapCtx.fillStyle = 'rgba(34, 197, 94, 0.06)';
  minimapCtx.fillRect(mapX, mapY, mapW, mapH);
  minimapCtx.save();
  minimapCtx.beginPath();
  minimapCtx.rect(mapX, mapY, mapW, mapH);
  minimapCtx.clip();

  const miniTileWorld = Math.max(180, Math.round(Math.min(worldW, worldH) / 18));
  const tileStartX = Math.floor(viewX / miniTileWorld) - 1;
  const tileEndX = Math.ceil((viewX + viewW) / miniTileWorld) + 1;
  const tileStartY = Math.floor(viewY / miniTileWorld) - 1;
  const tileEndY = Math.ceil((viewY + viewH) / miniTileWorld) + 1;
  const tileStroke = 'rgba(255,255,255,0.04)';

  for (let tx = tileStartX; tx <= tileEndX; tx += 1) {
    for (let ty = tileStartY; ty <= tileEndY; ty += 1) {
      const worldTileX = tx * miniTileWorld;
      const worldTileY = ty * miniTileWorld;
      const tileScreenX = toMapX(worldTileX);
      const tileScreenY = toMapY(worldTileY);
      const tileScreenW = miniTileWorld * sx;
      const tileScreenH = miniTileWorld * sy;
      const evenTile = ((tx + ty) & 1) === 0;

      minimapCtx.fillStyle = evenTile ? 'rgba(74, 222, 128, 0.065)' : 'rgba(15, 118, 110, 0.075)';
      minimapCtx.fillRect(tileScreenX, tileScreenY, tileScreenW, tileScreenH);

      minimapCtx.strokeStyle = tileStroke;
      minimapCtx.lineWidth = Math.max(1, dpr * 0.7);
      minimapCtx.strokeRect(tileScreenX, tileScreenY, tileScreenW, tileScreenH);
    }
  }

  minimapCtx.restore();

  for (const obj of game.state.decor?.objects || []) {
    if (!isVisibleInMini(obj.x, obj.y, Math.max(Number(obj.w) || 0, Number(obj.h) || 0))) continue;
    const objW = Math.max(2, (Number(obj.w) || 20) * sx);
    const objH = Math.max(2, (Number(obj.h) || 20) * sy);
    minimapCtx.save();
    minimapCtx.translate(toMapX(obj.x), toMapY(obj.y));
    minimapCtx.rotate(Number(obj.angle) || 0);
    minimapCtx.fillStyle = obj.destroyed ? 'rgba(120, 113, 108, 0.55)' : 'rgba(226, 232, 240, 0.4)';
    minimapCtx.fillRect(-objW * 0.5, -objH * 0.5, objW, objH);
    minimapCtx.restore();
  }

  for (const orb of game.state.xpOrbs || []) {
    dot(orb.x, orb.y, Math.max(1.6 * dpr, 1.5), '#38bdf8');
  }

  for (const orb of game.state.skillOrbs || []) {
    if (!isVisibleInMini(orb.x, orb.y, 40)) continue;
    const own = orb.ownerId === game.myId;
    const sx = toMapX(orb.x);
    const sy = toMapY(orb.y);
    const core = own ? '#ff3ea5' : '#fbbf24';
    const glow = own ? 'rgba(255, 62, 165, 0.38)' : 'rgba(251, 191, 36, 0.34)';
    const coreR = own ? Math.max(3.4 * dpr, 3) : Math.max(2.7 * dpr, 2.4);
    const glowR = coreR + Math.max(1.8 * dpr, 1.6);

    minimapCtx.fillStyle = glow;
    minimapCtx.beginPath();
    minimapCtx.arc(sx, sy, glowR, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.fillStyle = core;
    minimapCtx.beginPath();
    minimapCtx.arc(sx, sy, coreR, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.strokeStyle = 'rgba(255,255,255,0.92)';
    minimapCtx.lineWidth = Math.max(1, dpr * 0.9);
    minimapCtx.beginPath();
    minimapCtx.arc(sx, sy, Math.max(1.5, coreR - Math.max(0.8, dpr * 0.45)), 0, Math.PI * 2);
    minimapCtx.stroke();
  }

  for (const drop of game.state.drops || []) {
    const dotColor = drop.kind === 'xp_vacuum' ? '#a78bfa' : '#f59e0b';
    dot(drop.x, drop.y, Math.max(1.8 * dpr, 1.6), dotColor);
  }

  for (const portal of game.state.bossPortals || []) {
    if (!isVisibleInMini(portal.x, portal.y, 90)) continue;
    const mx = toMapX(portal.x);
    const my = toMapY(portal.y);
    const coreR = Math.max(3.6 * dpr, 3.2);

    minimapCtx.fillStyle = '#ef4444';
    minimapCtx.beginPath();
    minimapCtx.arc(mx, my, coreR, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.strokeStyle = 'rgba(254, 202, 202, 0.95)';
    minimapCtx.lineWidth = Math.max(1.1, dpr);
    minimapCtx.beginPath();
    minimapCtx.arc(mx, my, coreR + Math.max(2, dpr * 1.8), 0, Math.PI * 2);
    minimapCtx.stroke();
  }

  for (const enemy of game.state.enemies || []) {
    if (!isVisibleInMini(enemy.x, enemy.y, 70)) continue;
    const isBoss = enemy.type === 'boss';
    dot(enemy.x, enemy.y, isBoss ? Math.max(4.2 * dpr, 3.8) : Math.max(2.2 * dpr, 2), isBoss ? '#fb7185' : '#ef4444');
    if (isBoss) {
      minimapCtx.strokeStyle = 'rgba(254, 202, 202, 0.92)';
      minimapCtx.lineWidth = Math.max(1, dpr);
      minimapCtx.beginPath();
      minimapCtx.arc(toMapX(enemy.x), toMapY(enemy.y), Math.max(6 * dpr, 5.5), 0, Math.PI * 2);
      minimapCtx.stroke();
    }
  }

  for (const player of game.state.players || []) {
    if (player.isCompanion) continue;
    if (!isVisibleInMini(player.x, player.y, 60)) continue;
    const isMe = player.id === game.myId;
    dot(player.x, player.y, isMe ? Math.max(3.4 * dpr, 3) : Math.max(2.3 * dpr, 2), isMe ? '#22d3ee' : '#a5f3fc');
  }

  minimapCtx.strokeStyle = 'rgba(255,255,255,0.14)';
  minimapCtx.lineWidth = Math.max(1, dpr * 0.9);
  minimapCtx.strokeRect(mapX, mapY, mapW, mapH);
}

function render(ts) {
  const dt = Math.min(0.05, (ts - lastFrameTs) / 1000);
  lastFrameTs = ts;
  const simDt = replayGame.active ? (dt * Math.max(1, Number(replayGame.speed) || 1)) : dt;
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';

  if (overlayOpen) {
    fpsFrameCount = 0;
    fpsAccumSec = 0;
    renderDiagReset();
    scheduleNextFrame(MENU_IDLE_FRAME_MS);
    return;
  }

  if (!game.state) {
    fpsFrameCount = 0;
    fpsAccumSec = 0;
    renderDiagReset();
    scheduleNextFrame();
    return;
  }

  if (replayGame.active) {
    tickReplayGame(ts);
  }

  const frameDiagStartedAt = renderDiagStart();

  fpsFrameCount += 1;
  fpsAccumSec += dt;
  if (fpsAccumSec >= FPS_UI_UPDATE_SEC) {
    if (fpsCornerEl && game.showFpsEnabled) {
      const fpsText = `FPS: ${Math.round(fpsFrameCount / fpsAccumSec)}`;
      const pingMs = Math.max(0, Math.round(Number(netStats?.rttMs) || 0));
      const pingText = ` | Ping: ${pingMs}ms`;
      fpsCornerEl.textContent = fpsText + pingText + renderDiagBuildText();
    }
    updateNetMetaUi();
    fpsFrameCount = 0;
    fpsAccumSec = 0;
    renderDiagReset();
  }

  game.sampledNet = isSpectatorSmoothingView() ? sampleBufferedState() : sampleLiveEntityTargets();
  updateFx(simDt);
  updatePlayerInterpolation(simDt);
  updateEnemyInterpolation(simDt);
  updateBulletInterpolation(simDt);
  updateXpOrbInterpolation(simDt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateTopCenterHud(Number(game.state.now) || Date.now());
  updateBottomHud();

  const deathCamLock = game.deathCameraLock;
  if (deathCamLock?.active) {
    const worldMaxX = Math.max(0, (Number(game.world?.width) || canvas.width) - canvas.width);
    const worldMaxY = Math.max(0, (Number(game.world?.height) || canvas.height) - canvas.height);
    camera.x = Math.max(0, Math.min(Number(deathCamLock.x) || 0, worldMaxX));
    camera.y = Math.max(0, Math.min(Number(deathCamLock.y) || 0, worldMaxY));
  } else {
    const me = game.state.players.find((p) => p.id === game.myId) || game.state.players[0];
    if (me) {
      const m = getPlayerRenderPos(me);
      const targetCamX = Math.max(0, Math.min(m.x - canvas.width / 2, game.world.width - canvas.width));
      const targetCamY = Math.max(0, Math.min(m.y - canvas.height / 2, game.world.height - canvas.height));
      const camDx = targetCamX - camera.x;
      const camDy = targetCamY - camera.y;
      const camDist = Math.hypot(camDx, camDy);

      if (camDist >= CLIENT_CAMERA_SNAP_DIST) {
        camera.x = targetCamX;
        camera.y = targetCamY;
      } else {
        const k = 1 - Math.exp(-CLIENT_CAMERA_FOLLOW_RATE * dt);
        camera.x += camDx * k;
        camera.y += camDy * k;
      }
    }
  }
  drawGround();
  drawBloodPuddles();
  drawMapObjects(Number(game.state.now) || Date.now());
  drawXpOrbs(game.state.xpOrbs || [], Number(game.state.now) || Date.now());
  drawBossPortals(game.state.bossPortals || [], Number(game.state.now) || Date.now());
  drawSkillOfferOrbs(game.state.skillOrbs || [], Number(game.state.now) || Date.now());

  for (const d of game.state.drops || []) {
    if (!isVisibleWorld(d.x, d.y, 50)) continue;
    const x = d.x - camera.x;
    const y = d.y - camera.y;
    const isXpVacuum = d.kind === 'xp_vacuum';
    const glow = isXpVacuum
      ? '#a78bfa'
      : (d.weaponKey === 'sniper' ? '#e5e7eb' : (d.weaponKey === 'shotgun' ? '#f97316' : (d.weaponKey === 'smg' ? '#38bdf8' : '#22c55e')));

    const ttlMs = Math.max(0, Number(d.ttlMs) || 0);
    const blink = ttlMs > 0 && ttlMs <= 5000;
    const blinkOn = !blink || (Math.sin(ts / 90) > 0);
    if (!blinkOn) continue;

    drawShadowAtScreen(x, y + 10, 9, 4, blink ? 0.14 : 0.24);

    ctx.fillStyle = blink ? 'rgba(40,10,10,0.84)' : 'rgba(8,12,18,0.78)';
    ctx.fillRect(x - 26, y - 28, 52, 12);
    ctx.strokeStyle = blink ? 'rgba(248,113,113,0.9)' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 26, y - 28, 52, 12);

    if (isXpVacuum) {
      ctx.fillStyle = '#ddd6fe';
      ctx.beginPath();
      ctx.arc(x - 14, y - 21, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x - 14, y - 21, 5.6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      drawWeaponIcon(x - 17, y - 22, d.weaponKey);
    }

    ctx.fillStyle = blink ? '#fecaca' : '#e2e8f0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    const label = d.weaponLabel || (isXpVacuum ? 'XP Surge' : 'Weapon');
    const warnSec = blink ? Math.max(0, Math.ceil(ttlMs / 1000)) : 0;
    ctx.fillText(blink ? `${label} ${warnSec}s` : label, x - 10, y - 18);

    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x - 10, y);
    ctx.closePath();
    ctx.fillStyle = blink ? '#ef4444' : glow;
    ctx.fill();
  }
  for (const b of getBulletsForRender()) {
    if (b?.replayHidden) continue;
    const rb = getBulletRenderPos(b);
    if (!rb) continue;
    const isRocket = String(rb.kind || b.kind || '').toLowerCase() === 'rocket';
    if (!isVisibleWorld(rb.x, rb.y, isRocket ? 24 : 12)) continue;
    if (isRocket) {
      drawRocketProjectile({ ...b, ...rb, color: rb.color || b.color || '#fb923c' });
    } else {
      drawEnergyProjectile({ ...b, ...rb, color: rb.color || b.color || '#f59e0b' });
    }
  }
  drawEnemies(game.state.enemies, ts / 1000);

  const playersByDepth = (game.state.players || [])
    .map((p) => ({ p, rp: getPlayerRenderPos(p) }))
    .sort((a, b) => (Number(a.rp.y) || 0) - (Number(b.rp.y) || 0));
  for (const item of playersByDepth) {
    const p = item.p;
    const rp = item.rp;
    drawPlayer(p, ts / 1000, p.id === game.myId, rp.x, rp.y, Boolean(p.isCompanion));
  }
  drawPlayerUiLayer(playersByDepth);

  drawTrees();

  let diagStartedAt = renderDiagStart();
  drawFx();
  renderDiagEnd('fx', diagStartedAt);

  diagStartedAt = renderDiagStart();
  drawBossPortalEdgeIndicator(game.state.bossPortals || [], Number(game.state.now) || Date.now());
  drawSkillOrbEdgeIndicators(game.state.skillOrbs || []);
  renderDiagEnd('indicators', diagStartedAt);

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-camera.x, -camera.y, game.world.width, game.world.height);

  diagStartedAt = renderDiagStart();
  drawMinimap();
  renderDiagEnd('minimap', diagStartedAt);

  renderDiagEnd('frame', frameDiagStartedAt);
  if (isRenderDiagEnabled()) renderDiag.frames += 1;

  scheduleNextFrame();
}
startInputSender();
setInterval(sendNetPing, NET_PING_INTERVAL_MS);
setInterval(sendNetStatsReport, 1500);
scheduleNextFrame();
