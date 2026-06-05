const MENU_IDLE_FRAME_MS = 180;
const FPS_UI_UPDATE_SEC = 0.75;
const minimapCtx = minimapCanvasEl?.getContext('2d');
if (minimapCtx) minimapCtx.imageSmoothingEnabled = false;

const renderDiag = {
  frames: 0,
  totals: {
    frame: 0,
    prep: 0,
    world: 0,
    items: 0,
    projectiles: 0,
    actors: 0,
    ui: 0,
    fx: 0,
    indicators: 0,
    minimap: 0,
  },
};
const RENDER_DIAG_ORDER = ['world', 'fx', 'ui', 'actors', 'projectiles', 'items', 'prep', 'minimap', 'indicators'];
const RENDER_DIAG_SHORT = {
  world: 'w',
  fx: 'fx',
  ui: 'ui',
  actors: 'act',
  projectiles: 'pr',
  items: 'it',
  prep: 'pre',
  minimap: 'map',
  indicators: 'ind',
};
const renderScratch = {
  playersByDepth: [],
  playersByDepthPool: [],
  actorOcclusionMarkers: [],
  actorOcclusionPool: [],
  groundDecals: [],
  rocketTrailPoints: [],
  rocketTrailPointPool: [],
  projectile: {},
  projectileItems: [],
  energyProjectiles: [],
  rocketProjectiles: [],
  fastXpOrbs: [],
  fastXpOrbItems: [],
  occlusionOverlay: [],
  occlusionSeen: new Set(),
  occlusionGrid: new Map(),
  hudLastAt: 0,
  renderLoadLevel: 0,
  renderLoadLastChangeAt: 0,
  renderLoadScore: 0,
  renderFpsSample: 0,
  renderFrameMsSample: 0,
  mapPropShadowMasks: new Map(),
};
const GROUND_CHUNK_SIZE = 512;
const GROUND_CHUNK_CACHE_LIMIT = 220;
const OCCLUSION_GRID_SIZE = 260;
const MINIMAP_RENDER_INTERVAL_MS = 120;
const MAP_PROP_SHADOW_CACHE_LIMIT = 96;
const MAP_PROP_SHADOW_SUN = Object.freeze({
  offsetX: 0.15,
  offsetY: 0.09,
  skewX: -0.36,
  scaleY: 0.34,
});
const mapObjectGeometryCache = new WeakMap();
const renderImageCache = new Map();

function getMapObjectRenderAngle(obj) {
  return Number(obj?.angle) || 0;
}

function ensureMapPropDirectionImage(meta) {
  if (!meta || typeof meta !== 'object') return null;
  if (meta.image) return meta.image;
  const src = String(meta.src || '').trim();
  if (!src || typeof Image === 'undefined') return null;
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  meta.image = img;
  return img;
}

function getMapPropDirectionFrame(obj) {
  const key = String(obj?.spriteKey || '').trim();
  if (!key) return null;
  const meta = sprites.mapPropDirections?.[key];
  const image = ensureMapPropDirectionImage(meta);
  if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return null;
  const frames = Math.max(1, Math.floor(Number(meta.frames) || 1));
  const columns = Math.max(1, Math.min(frames, Math.floor(Number(meta.columns) || frames)));
  const rows = Math.max(1, Math.ceil(frames / columns));
  const frameW = Math.floor(image.naturalWidth / columns);
  const frameH = Math.floor(image.naturalHeight / rows);
  if (frameW <= 0 || frameH <= 0) return null;
  const fullTurn = Math.PI * 2;
  const direction = Number(meta.direction) || 1;
  const angle = ((getMapObjectRenderAngle(obj) * direction + (Number(meta.angleOffset) || 0)) % fullTurn + fullTurn) % fullTurn;
  const frame = Math.round((angle / fullTurn) * frames) % frames;
  return {
    image,
    sx: (frame % columns) * frameW,
    sy: Math.floor(frame / columns) * frameH,
    sw: frameW,
    sh: frameH,
  };
}

function getMapPropImageFrame(sprite) {
  if (!sprite?.complete || sprite.naturalWidth <= 0 || sprite.naturalHeight <= 0) return null;
  return {
    image: sprite,
    sx: 0,
    sy: 0,
    sw: sprite.naturalWidth,
    sh: sprite.naturalHeight,
  };
}

function getMapPropShadowMask(frame) {
  if (!frame?.image || frame.sw <= 0 || frame.sh <= 0) return null;
  const src = String(frame.image.currentSrc || frame.image.src || '');
  const key = `${src}:${frame.sx}:${frame.sy}:${frame.sw}:${frame.sh}`;
  const cache = renderScratch.mapPropShadowMasks;
  const cached = cache.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(frame.sw));
  c.height = Math.max(1, Math.floor(frame.sh));
  const g = c.getContext('2d');
  if (!g) return null;
  g.drawImage(frame.image, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  cache.set(key, c);
  if (cache.size > MAP_PROP_SHADOW_CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  return c;
}

function drawProjectedMapObjectShadow(frame, screenX, screenY, width, height, anchorY, obj) {
  if (!game.shadowsEnabled) return false;
  const mask = getMapPropShadowMask(frame);
  if (!mask) return false;
  const shadowScale = Math.max(0.2, Number(obj?.shadowScale) || 1);
  const alpha = obj?.destroyed ? 0.11 : Math.max(0.12, Math.min(0.34, 0.23 * shadowScale));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = 'blur(2px)';
  ctx.translate(
    screenX + width * MAP_PROP_SHADOW_SUN.offsetX,
    screenY + height * MAP_PROP_SHADOW_SUN.offsetY,
  );
  ctx.transform(1, 0, MAP_PROP_SHADOW_SUN.skewX, MAP_PROP_SHADOW_SUN.scaleY, 0, 0);
  ctx.drawImage(mask, -width * 0.5, -height * anchorY, width, height);
  ctx.restore();
  return true;
}

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
  const hot = RENDER_DIAG_ORDER
    .map((key) => ({ key, ms: (Number(renderDiag.totals[key]) || 0) / f }))
    .filter((item) => item.ms >= 0.04)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 4)
    .map((item) => `${RENDER_DIAG_SHORT[item.key] || item.key}${item.ms.toFixed(1)}`);
  const lod = Math.max(0, Math.min(2, Math.round(Number(renderScratch.renderLoadLevel) || 0)));
  return ` | R ${frameMs}ms${hot.length ? ` (${hot.join(' ')})` : ''}${lod ? ` L${lod}` : ''}`;
}

function renderDiagReset() {
  renderDiag.frames = 0;
  for (const key of Object.keys(renderDiag.totals)) {
    renderDiag.totals[key] = 0;
  }
}

function countRenderArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function getRenderLoadScore() {
  const state = game.state || {};
  const bulletCount = Array.isArray(state.bullets)
    ? state.bullets.length
    : (game.renderBullets instanceof Map ? game.renderBullets.size : 0);
  return (
    countRenderArray(state.enemies) * 1.35
    + bulletCount * 1.15
    + countRenderArray(state.drops) * 1.7
    + countRenderArray(state.xpOrbs) * 0.32
    + countRenderArray(state.skillOrbs) * 2.2
    + countRenderArray(visuals.blood) * 0.18
    + countRenderArray(visuals.bloodMist) * 0.9
    + countRenderArray(visuals.gore) * 0.48
    + countRenderArray(visuals.rocketSmoke) * 0.95
    + countRenderArray(visuals.rocketFire) * 1.05
    + countRenderArray(visuals.rocketBlast) * 0.82
    + countRenderArray(visuals.skillBursts) * 4.2
    + countRenderArray(visuals.skillArcs) * 3.1
    + countRenderArray(visuals.skillLinks) * 3.4
    + countRenderArray(visuals.skillLabels) * 3.2
    + countRenderArray(visuals.muzzleGroundFlashes) * 2.4
    + countRenderArray(visuals.muzzle) * 0.8
    + countRenderArray(visuals.objectImpactFx) * 1.0
    + countRenderArray(visuals.hitFx) * 0.6
    + countRenderArray(visuals.dodgeWind) * 0.65
  );
}

function updateRenderLoadLevel(nowMs = performance.now(), fpsSample = renderScratch.renderFpsSample) {
  const score = getRenderLoadScore();
  const frameMs = Number(renderScratch.renderFrameMsSample) || 0;
  const qKey = String(game.qualityKey || 'medium').toLowerCase();
  let target = 0;
  if (score >= 560) target = 2;
  else if (score >= 330) target = 1;
  if (fpsSample > 0 && fpsSample < 42) target = Math.max(target, 2);
  else if (fpsSample > 0 && fpsSample < 56) target = Math.max(target, 1);
  if (frameMs >= 15) target = Math.max(target, 2);
  else if (frameMs >= 9) target = Math.max(target, 1);
  if (qKey === 'low') target = Math.max(target, 1);
  if (qKey === 'high' && target === 1 && score < 420 && (fpsSample <= 0 || fpsSample >= 70) && frameMs < 7) {
    target = 0;
  }

  const current = Math.max(0, Math.min(2, Math.round(Number(renderScratch.renderLoadLevel) || 0)));
  const elapsed = Math.max(0, Number(nowMs) - (Number(renderScratch.renderLoadLastChangeAt) || 0));
  if (target > current || elapsed >= 1600) {
    renderScratch.renderLoadLevel = target;
    renderScratch.renderLoadLastChangeAt = Number(nowMs) || performance.now();
  }
  renderScratch.renderLoadScore = score;
  return renderScratch.renderLoadLevel;
}

function getRenderLoadLevel() {
  return Math.max(0, Math.min(2, Math.round(Number(renderScratch.renderLoadLevel) || 0)));
}

function getRenderFxStride(kind = 'minor', level = getRenderLoadLevel()) {
  if (level <= 0) return 1;
  if (kind === 'major') return level >= 2 ? 2 : 1;
  if (kind === 'medium') return level >= 2 ? 3 : 2;
  return level >= 2 ? 4 : 2;
}

function shouldDrawRenderLodItem(index, kind = 'minor', level = getRenderLoadLevel()) {
  const stride = getRenderFxStride(kind, level);
  return stride <= 1 || (index % stride) === 0;
}

function shouldDrawPickupLabelText(x, y, blink = false) {
  if (blink) return true;
  const level = getRenderLoadLevel();
  if (level <= 0) return true;
  const dx = Math.abs((Number(x) || 0) - canvas.width * 0.5);
  const dy = Math.abs((Number(y) || 0) - canvas.height * 0.5);
  const maxDx = canvas.width * (level >= 2 ? 0.26 : 0.38);
  const maxDy = canvas.height * (level >= 2 ? 0.26 : 0.38);
  return dx <= maxDx && dy <= maxDy;
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

function isWebRendererDisabled() {
  return window.cwDisableWebRenderer === true;
}

function getSceneTheme() {
  return game.state?.decor?.theme && typeof game.state.decor.theme === 'object'
    ? game.state.decor.theme
    : { baseMaterial: 'asphalt_wet', accent: '#f97316', glow: 'rgba(249, 115, 22, 0.22)' };
}

function getGroundFallbackColor(material) {
  if (material === 'grass') return '#21371d';
  if (material === 'dirt') return '#3a2a1f';
  if (material === 'concrete') return '#616a73';
  if (material === 'concrete_tiles') return '#616a73';
  if (material === 'toxic') return '#304421';
  if (material === 'asphalt') return '#3a4047';
  if (material === 'asphalt_wet') return '#2e353c';
  return '#2e353c';
}

function getGroundTileSetForMaterial(material) {
  const set = visuals.groundTiles?.[material];
  if (set && Array.isArray(set.variants) && set.variants.length > 0) return set;
  if (visuals.groundTileCanvas) {
    return { salt: 0, variants: [visuals.groundTileCanvas], macroStamps: [] };
  }
  return null;
}

function hashGroundCell(x, y, salt = 0) {
  let hash = Math.imul((Number(x) || 0) ^ 0x9e3779b9, 374761393);
  hash = Math.imul(hash ^ ((Number(y) || 0) + 0x85ebca6b), 668265263);
  hash ^= Number(salt) || 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function drawMaterialTileField(material, startX, startY, endX, endY, options = {}) {
  const tileSet = getGroundTileSetForMaterial(material);
  const variants = Array.isArray(tileSet?.variants) ? tileSet.variants.filter(Boolean) : [];
  if (variants.length <= 0) return;
  const t = visuals.groundTileSize || variants[0].width || 128;
  const organic = material === 'grass' || material === 'dirt' || material === 'toxic';
  const overlapPx = organic ? Math.max(10, Math.min(26, Math.round(t * 0.16))) : 0;
  const tileStartX = Math.floor((startX - overlapPx) / t) * t;
  const tileStartY = Math.floor((startY - overlapPx) / t) * t;
  const offsetX = Number.isFinite(Number(options.offsetX)) ? Number(options.offsetX) : camera.x;
  const offsetY = Number.isFinite(Number(options.offsetY)) ? Number(options.offsetY) : camera.y;
  const salt = Number(tileSet?.salt) || 0;
  for (let y = tileStartY; y < endY + overlapPx; y += t) {
    const cellY = Math.floor(y / t);
    for (let x = tileStartX; x < endX + overlapPx; x += t) {
      const hash = hashGroundCell(Math.floor(x / t), cellY, salt);
      const tileCanvas = variants[hash % variants.length] || variants[0];
      const drawX = x - offsetX - overlapPx * 0.5;
      const drawY = y - offsetY - overlapPx * 0.5;
      ctx.drawImage(tileCanvas, drawX, drawY, t + overlapPx, t + overlapPx);
    }
  }
}

function drawMaterialMacroField(material, startX, startY, endX, endY, options = {}) {
  const tileSet = getGroundTileSetForMaterial(material);
  const stamps = Array.isArray(tileSet?.macroStamps) ? tileSet.macroStamps.filter(Boolean) : [];
  if (stamps.length <= 0) return;
  const offsetX = Number.isFinite(Number(options.offsetX)) ? Number(options.offsetX) : camera.x;
  const offsetY = Number.isFinite(Number(options.offsetY)) ? Number(options.offsetY) : camera.y;
  const salt = (Number(tileSet?.salt) || 0) ^ 0x9e3779b9;
  const cellSize = Math.max(220, Math.round((visuals.groundTileSize || stamps[0].width || 128) * 3.35));
  const cellStartX = Math.floor(startX / cellSize) - 1;
  const cellEndX = Math.ceil(endX / cellSize) + 1;
  const cellStartY = Math.floor(startY / cellSize) - 1;
  const cellEndY = Math.ceil(endY / cellSize) + 1;
  for (let gy = cellStartY; gy <= cellEndY; gy += 1) {
    for (let gx = cellStartX; gx <= cellEndX; gx += 1) {
      const hash = hashGroundCell(gx, gy, salt);
      if ((hash & 7) < 3) continue;
      const stamp = stamps[(hash >>> 3) % stamps.length] || stamps[0];
      const centerX = (gx + 0.5) * cellSize + ((((hash >>> 11) & 255) / 255) - 0.5) * cellSize * 0.5;
      const centerY = (gy + 0.5) * cellSize + ((((hash >>> 19) & 255) / 255) - 0.5) * cellSize * 0.5;
      const scale = 0.9 + ((((hash >>> 7) & 255) / 255) * 0.9);
      const alpha = 0.045 + ((((hash >>> 15) & 255) / 255) * 0.08);
      const rotation = ((hash >>> 23) / 511) * Math.PI * 2;
      const drawW = stamp.width * scale;
      const drawH = stamp.height * scale;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(centerX - offsetX, centerY - offsetY);
      ctx.rotate(rotation);
      ctx.drawImage(stamp, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
      ctx.restore();
    }
  }
}

function drawMaterialTileFieldToContext(g, material, startX, startY, endX, endY, options = {}) {
  const tileSet = getGroundTileSetForMaterial(material);
  const variants = Array.isArray(tileSet?.variants) ? tileSet.variants.filter(Boolean) : [];
  if (!g || variants.length <= 0) return;
  const t = visuals.groundTileSize || variants[0].width || 128;
  const organic = material === 'grass' || material === 'dirt' || material === 'toxic';
  const overlapPx = organic ? Math.max(10, Math.min(26, Math.round(t * 0.16))) : 0;
  const tileStartX = Math.floor((startX - overlapPx) / t) * t;
  const tileStartY = Math.floor((startY - overlapPx) / t) * t;
  const offsetX = Number.isFinite(Number(options.offsetX)) ? Number(options.offsetX) : camera.x;
  const offsetY = Number.isFinite(Number(options.offsetY)) ? Number(options.offsetY) : camera.y;
  const salt = Number(tileSet?.salt) || 0;
  for (let y = tileStartY; y < endY + overlapPx; y += t) {
    const cellY = Math.floor(y / t);
    for (let x = tileStartX; x < endX + overlapPx; x += t) {
      const hash = hashGroundCell(Math.floor(x / t), cellY, salt);
      const tileCanvas = variants[hash % variants.length] || variants[0];
      g.drawImage(
        tileCanvas,
        x - offsetX - overlapPx * 0.5,
        y - offsetY - overlapPx * 0.5,
        t + overlapPx,
        t + overlapPx,
      );
    }
  }
}

function drawMaterialMacroFieldToContext(g, material, startX, startY, endX, endY, options = {}) {
  const tileSet = getGroundTileSetForMaterial(material);
  const stamps = Array.isArray(tileSet?.macroStamps) ? tileSet.macroStamps.filter(Boolean) : [];
  if (!g || stamps.length <= 0) return;
  const offsetX = Number.isFinite(Number(options.offsetX)) ? Number(options.offsetX) : camera.x;
  const offsetY = Number.isFinite(Number(options.offsetY)) ? Number(options.offsetY) : camera.y;
  const salt = (Number(tileSet?.salt) || 0) ^ 0x9e3779b9;
  const cellSize = Math.max(220, Math.round((visuals.groundTileSize || stamps[0].width || 128) * 3.35));
  const cellStartX = Math.floor(startX / cellSize) - 1;
  const cellEndX = Math.ceil(endX / cellSize) + 1;
  const cellStartY = Math.floor(startY / cellSize) - 1;
  const cellEndY = Math.ceil(endY / cellSize) + 1;
  for (let gy = cellStartY; gy <= cellEndY; gy += 1) {
    for (let gx = cellStartX; gx <= cellEndX; gx += 1) {
      const hash = hashGroundCell(gx, gy, salt);
      if ((hash & 7) < 3) continue;
      const stamp = stamps[(hash >>> 3) % stamps.length] || stamps[0];
      const centerX = (gx + 0.5) * cellSize + ((((hash >>> 11) & 255) / 255) - 0.5) * cellSize * 0.5;
      const centerY = (gy + 0.5) * cellSize + ((((hash >>> 19) & 255) / 255) - 0.5) * cellSize * 0.5;
      const scale = 0.9 + ((((hash >>> 7) & 255) / 255) * 0.9);
      const alpha = 0.045 + ((((hash >>> 15) & 255) / 255) * 0.08);
      const rotation = ((hash >>> 23) / 511) * Math.PI * 2;
      const drawW = stamp.width * scale;
      const drawH = stamp.height * scale;
      g.save();
      g.globalAlpha *= alpha;
      g.translate(centerX - offsetX, centerY - offsetY);
      g.rotate(rotation);
      g.drawImage(stamp, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
      g.restore();
    }
  }
}

function buildTerrainZonePathOnContext(g, zone, scaleMul = 1) {
  const halfW = Math.max(10, (Number(zone?.w) || 0) * 0.5 * scaleMul);
  const halfH = Math.max(10, (Number(zone?.h) || 0) * 0.5 * scaleMul);
  const shape = String(zone?.shape || 'ellipse');
  g.beginPath();
  if (shape === 'rect' || shape === 'band') {
    g.rect(-halfW, -halfH, halfW * 2, halfH * 2);
    return;
  }
  g.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
}

function drawTerrainZoneToContext(g, zone, chunkX, chunkY, chunkSize) {
  if (!g || !zone) return;
  const worldX = Number(zone.x) || 0;
  const worldY = Number(zone.y) || 0;
  const halfW = Math.max(18, (Number(zone.w) || 0) * 0.5);
  const halfH = Math.max(18, (Number(zone.h) || 0) * 0.5);
  const radius = Math.max(halfW, halfH) + 64;
  if (
    worldX + radius < chunkX
    || worldX - radius > chunkX + chunkSize
    || worldY + radius < chunkY
    || worldY - radius > chunkY + chunkSize
  ) {
    return;
  }

  const tileSet = getGroundTileSetForMaterial(zone.material);
  const blurPx = Math.max(10, Math.min(42, Math.min(Number(zone.w) || 0, Number(zone.h) || 0) * Math.max(0.04, Number(zone.feather) || 0.18) * 0.12));
  const alpha = Math.max(0.08, Math.min(1, Number(zone.alpha) || 0.65));
  const startX = worldX - halfW - blurPx;
  const startY = worldY - halfH - blurPx;
  const endX = worldX + halfW + blurPx;
  const endY = worldY + halfH + blurPx;

  g.save();
  g.translate(worldX - chunkX, worldY - chunkY);
  g.rotate(Number(zone.angle) || 0);
  buildTerrainZonePathOnContext(g, zone, 1);
  g.clip();
  g.globalAlpha = alpha;
  if (tileSet) {
    drawMaterialTileFieldToContext(g, zone.material, startX, startY, endX, endY, { offsetX: worldX, offsetY: worldY });
    drawMaterialMacroFieldToContext(g, zone.material, startX, startY, endX, endY, { offsetX: worldX, offsetY: worldY });
  } else {
    g.fillStyle = getGroundFallbackColor(zone.material);
    g.fillRect(-halfW - blurPx, -halfH - blurPx, (halfW + blurPx) * 2, (halfH + blurPx) * 2);
  }
  g.restore();

  g.save();
  g.translate(worldX - chunkX, worldY - chunkY);
  g.rotate(Number(zone.angle) || 0);
  g.filter = `blur(${blurPx}px)`;
  g.globalAlpha = alpha * 0.22;
  g.fillStyle = getGroundFallbackColor(zone.material);
  buildTerrainZonePathOnContext(g, zone, 1.1 + Math.max(0.04, Number(zone.feather) || 0.18));
  g.fill();
  g.restore();

  if (zone.centerStripe === true && (zone.material === 'asphalt' || zone.material === 'asphalt_wet') && zone.shape === 'band') {
    const stripeWidth = Math.max(2, Math.min(6, halfH * 0.08));
    const dash = Math.max(16, Math.round(Math.min(42, halfW * 0.12)));
    const gap = Math.max(10, Math.round(dash * 0.72));
    g.save();
    g.translate(worldX - chunkX, worldY - chunkY);
    g.rotate(Number(zone.angle) || 0);
    buildTerrainZonePathOnContext(g, zone, 1);
    g.clip();
    g.strokeStyle = zone.material === 'asphalt_wet' ? 'rgba(237, 229, 190, 0.34)' : 'rgba(237, 229, 190, 0.42)';
    g.lineWidth = stripeWidth;
    g.lineCap = 'round';
    g.setLineDash([dash, gap]);
    g.beginPath();
    g.moveTo(-halfW * 0.9, 0);
    g.lineTo(halfW * 0.9, 0);
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }
}

function buildGroundChunkSignature() {
  const theme = getSceneTheme();
  const terrainZones = Array.isArray(game.state?.decor?.terrainZones) ? game.state.decor.terrainZones : [];
  const zoneSig = terrainZones.map((zone) => [
    zone.material,
    zone.shape,
    Number(zone.x) || 0,
    Number(zone.y) || 0,
    Number(zone.w) || 0,
    Number(zone.h) || 0,
    Number(zone.angle) || 0,
    Number(zone.alpha) || 0,
    zone.centerStripe === true ? 1 : 0,
  ].join(':')).join('|');
  return [
    game.roomCode || '',
    game.mapId || '',
    Number(game.world?.width) || 0,
    Number(game.world?.height) || 0,
    game.qualityKey || '',
    getQ().groundTexture ? 1 : 0,
    visuals.groundTileSize || 0,
    String(theme.baseMaterial || 'asphalt_wet'),
    zoneSig,
  ].join('~');
}

function getGroundChunk(chunkX, chunkY, signature) {
  if (!(visuals.groundChunkCache instanceof Map)) visuals.groundChunkCache = new Map();
  const key = `${signature}:${chunkX}:${chunkY}`;
  const cached = visuals.groundChunkCache.get(key);
  if (cached) {
    cached.usedAt = performance.now();
    return cached;
  }

  const theme = getSceneTheme();
  const baseMaterial = String(theme.baseMaterial || 'asphalt_wet');
  const c = document.createElement('canvas');
  c.width = GROUND_CHUNK_SIZE;
  c.height = GROUND_CHUNK_SIZE;
  c.__cwWebglVersion = 1;
  const g = c.getContext('2d');
  if (g) {
    g.imageSmoothingEnabled = false;
    g.fillStyle = getGroundFallbackColor(baseMaterial);
    g.fillRect(0, 0, c.width, c.height);
    if (getQ().groundTexture && getGroundTileSetForMaterial(baseMaterial)) {
      drawMaterialTileFieldToContext(g, baseMaterial, chunkX, chunkY, chunkX + GROUND_CHUNK_SIZE, chunkY + GROUND_CHUNK_SIZE, { offsetX: chunkX, offsetY: chunkY });
      drawMaterialMacroFieldToContext(g, baseMaterial, chunkX, chunkY, chunkX + GROUND_CHUNK_SIZE, chunkY + GROUND_CHUNK_SIZE, { offsetX: chunkX, offsetY: chunkY });
    }
    const terrainZones = Array.isArray(game.state?.decor?.terrainZones) ? game.state.decor.terrainZones : [];
    for (const zone of terrainZones) drawTerrainZoneToContext(g, zone, chunkX, chunkY, GROUND_CHUNK_SIZE);
  }

  const entry = { x: chunkX, y: chunkY, canvas: c, usedAt: performance.now() };
  visuals.groundChunkCache.set(key, entry);
  if (visuals.groundChunkCache.size > GROUND_CHUNK_CACHE_LIMIT) {
    let oldestKey = '';
    let oldestAt = Infinity;
    for (const [cacheKey, item] of visuals.groundChunkCache.entries()) {
      const usedAt = Number(item?.usedAt) || 0;
      if (usedAt < oldestAt) {
        oldestAt = usedAt;
        oldestKey = cacheKey;
      }
    }
    if (oldestKey) visuals.groundChunkCache.delete(oldestKey);
  }
  return entry;
}

function getGroundChunksForRender() {
  const viewportScale = typeof getRunStartViewportScale === 'function' ? getRunStartViewportScale() : 1;
  const safeScale = Math.max(0.12, Math.min(1, viewportScale || 1));
  const viewportW = canvas.width / safeScale;
  const viewportH = canvas.height / safeScale;
  const introPad = typeof getRunStartViewportWorldPad === 'function' ? getRunStartViewportWorldPad() : 0;
  const pad = GROUND_CHUNK_SIZE + introPad;
  const signature = buildGroundChunkSignature();
  if (visuals.groundChunkCacheSignature !== signature) {
    if (visuals.groundChunkCache instanceof Map) visuals.groundChunkCache.clear();
    visuals.groundChunkCacheSignature = signature;
    globalThis.CWWebGLWorld?.clearTextureCache?.();
  }
  const startX = Math.floor((camera.x - pad) / GROUND_CHUNK_SIZE) * GROUND_CHUNK_SIZE;
  const startY = Math.floor((camera.y - pad) / GROUND_CHUNK_SIZE) * GROUND_CHUNK_SIZE;
  const endX = Math.ceil((camera.x + viewportW + pad) / GROUND_CHUNK_SIZE) * GROUND_CHUNK_SIZE;
  const endY = Math.ceil((camera.y + viewportH + pad) / GROUND_CHUNK_SIZE) * GROUND_CHUNK_SIZE;
  const chunks = [];
  for (let y = startY; y <= endY; y += GROUND_CHUNK_SIZE) {
    for (let x = startX; x <= endX; x += GROUND_CHUNK_SIZE) {
      chunks.push(getGroundChunk(x, y, signature));
    }
  }
  return chunks;
}

function drawGroundOverlay() {
  if (!getQ().overlays) return;
  const theme = getSceneTheme();
  const g = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.55, 70, canvas.width * 0.5, canvas.height * 0.55, Math.max(canvas.width, canvas.height) * 0.8);
  g.addColorStop(0, hexToRgba(theme.accent || '#f97316', 0.13));
  g.addColorStop(1, 'rgba(16,8,8,0.02)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawChunkedGround() {
  const chunks = getGroundChunksForRender();
  for (const chunk of chunks) {
    ctx.drawImage(chunk.canvas, chunk.x - camera.x, chunk.y - camera.y);
  }
  drawGroundOverlay();
}

globalThis.CWGetGroundChunksForRender = getGroundChunksForRender;

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
  const tileSet = getGroundTileSetForMaterial(zone.material);
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
  const startX = worldX - halfW - blurPx;
  const startY = worldY - halfH - blurPx;
  const endX = worldX + halfW + blurPx;
  const endY = worldY + halfH + blurPx;
  if (tileSet) {
    drawMaterialTileField(zone.material, startX, startY, endX, endY, { offsetX: worldX, offsetY: worldY });
    drawMaterialMacroField(zone.material, startX, startY, endX, endY, { offsetX: worldX, offsetY: worldY });
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

  if (zone.centerStripe === true && (zone.material === 'asphalt' || zone.material === 'asphalt_wet') && zone.shape === 'band') {
    const stripeWidth = Math.max(2, Math.min(6, halfH * 0.08));
    const dash = Math.max(16, Math.round(Math.min(42, halfW * 0.12)));
    const gap = Math.max(10, Math.round(dash * 0.72));
    ctx.save();
    ctx.translate(worldX - camera.x, worldY - camera.y);
    ctx.rotate(Number(zone.angle) || 0);
    buildTerrainZonePath(zone, 1);
    ctx.clip();
    ctx.strokeStyle = zone.material === 'asphalt_wet' ? 'rgba(237, 229, 190, 0.34)' : 'rgba(237, 229, 190, 0.42)';
    ctx.lineWidth = stripeWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash([dash, gap]);
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.9, 0);
    ctx.lineTo(halfW * 0.9, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawGround() {
  drawChunkedGround();
  return;

  const q = getQ();
  const theme = getSceneTheme();
  const baseMaterial = String(theme.baseMaterial || 'asphalt_wet');
  const viewportScale = typeof getRunStartViewportScale === 'function' ? getRunStartViewportScale() : 1;
  const safeScale = Math.max(0.12, Math.min(1, viewportScale || 1));
  const viewportW = canvas.width / safeScale;
  const viewportH = canvas.height / safeScale;
  const introPad = typeof getRunStartViewportWorldPad === 'function' ? getRunStartViewportWorldPad() : 0;
  const edgePad = 32 / safeScale + introPad;
  ctx.fillStyle = getGroundFallbackColor(baseMaterial);
  ctx.fillRect(-edgePad, -edgePad, viewportW + edgePad * 2, viewportH + edgePad * 2);

  if (q.groundTexture) {
    const tileSet = getGroundTileSetForMaterial(baseMaterial);
    if (tileSet) {
      const pad = visuals.groundTileSize || tileSet.variants?.[0]?.width || 128;
      const startX = camera.x - pad - introPad;
      const startY = camera.y - pad - introPad;
      const endX = camera.x + viewportW + pad + introPad;
      const endY = camera.y + viewportH + pad + introPad;
      drawMaterialTileField(baseMaterial, startX, startY, endX, endY);
      drawMaterialMacroField(baseMaterial, startX, startY, endX, endY);
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

function drawRocketTrailRibbon(projectile, color = '#fb923c') {
  const id = String(projectile?.id || '').trim();
  if (!id) return;
  const trailMap = typeof getRocketTrailMap === 'function'
    ? getRocketTrailMap()
    : (visuals.rocketTrails instanceof Map ? visuals.rocketTrails : null);
  const trail = trailMap?.get(id);
  const points = Array.isArray(trail?.points) ? trail.points : [];
  if (points.length < 2) return;

  const drawPoints = renderScratch.rocketTrailPoints;
  const pool = renderScratch.rocketTrailPointPool;
  drawPoints.length = 0;
  let sxSmooth = Number(points[0]?.x) || 0;
  let sySmooth = Number(points[0]?.y) || 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const weight = i <= 1 ? 0.72 : 0.48;
    sxSmooth += ((Number(p?.x) || sxSmooth) - sxSmooth) * weight;
    sySmooth += ((Number(p?.y) || sySmooth) - sySmooth) * weight;
    const out = pool[i] || { x: 0, y: 0, age: 0, ttl: 0, size: 1, seed: 0 };
    pool[i] = out;
    out.x = sxSmooth;
    out.y = sySmooth;
    out.age = Math.max(0, Number(p?.age) || 0);
    out.ttl = Math.max(0.08, Number(p?.ttl) || (typeof ROCKET_TRAIL_TTL === 'number' ? ROCKET_TRAIL_TTL : 0.38));
    out.size = Number(p?.size) || 1;
    out.seed = Number(p?.seed) || 0;
    drawPoints.push(out);
  }
  if (drawPoints.length < 2) return;

  const trailLife = drawPoints.reduce((sum, p) => sum + Math.max(0, 1 - p.age / Math.max(0.08, p.ttl)), 0) / drawPoints.length;
  if (trailLife <= 0.01) return;

  const drawSmoothPath = (list, startIndex = 0, endIndex = list.length - 1) => {
    const start = Math.max(0, Math.min(list.length - 1, startIndex));
    const end = Math.max(start, Math.min(list.length - 1, endIndex));
    const count = end - start + 1;
    if (count <= 0) return;
    const first = list[start];
    ctx.beginPath();
    ctx.moveTo(first.x - camera.x, first.y - camera.y);
    if (count === 1) return;
    if (count === 2) {
      const second = list[end];
      ctx.lineTo(second.x - camera.x, second.y - camera.y);
      return;
    }
    for (let i = start; i < end; i += 1) {
      const p0 = list[Math.max(start, i - 1)];
      const p1 = list[i];
      const p2 = list[i + 1];
      const p3 = list[Math.min(end, i + 2)];
      const tension = 0.18;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      ctx.bezierCurveTo(cp1x - camera.x, cp1y - camera.y, cp2x - camera.x, cp2y - camera.y, p2.x - camera.x, p2.y - camera.y);
    }
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = `rgba(105, 116, 130, ${Math.min(0.18, trailLife * 0.14).toFixed(3)})`;
  ctx.lineWidth = Math.max(10, 22 * Math.min(1.1, 0.75 + trailLife * 0.5));
  drawSmoothPath(drawPoints);
  ctx.stroke();

  ctx.strokeStyle = `rgba(214, 221, 230, ${Math.min(0.1, trailLife * 0.06).toFixed(3)})`;
  ctx.lineWidth = 6;
  drawSmoothPath(drawPoints, 0, Math.max(1, drawPoints.length - 3));
  ctx.stroke();

  for (let i = 0; i < drawPoints.length; i += 5) {
    const p = drawPoints[i];
    const ttl = Math.max(0.08, Number(p.ttl) || 0.38);
    const age = Math.max(0, Number(p.age) || 0);
    const t = Math.max(0, Math.min(1, age / ttl));
    const life = Math.max(0, 1 - t);
    const smokeAlpha = Math.min(0.2, life * Math.min(1, t * 2.8) * 0.18);
    if (smokeAlpha <= 0.008 || !isVisibleWorld(p.x, p.y, 48)) continue;
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    const r = (8 + t * 24) * (Number(p.size) || 1);
    const wobble = Math.sin((Number(p.seed) || 0) + performance.now() * 0.004) * 0.35;
    ctx.fillStyle = `rgba(142, 151, 164, ${smokeAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * (1.16 + wobble * 0.1), r * (0.74 - wobble * 0.08), wobble, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'lighter';
  const trailTtlFallback = typeof ROCKET_TRAIL_TTL === 'number' ? ROCKET_TRAIL_TTL : 0.38;
  const hotStart = Math.max(0, drawPoints.length - 5);
  let hotLife = 0;
  let hotCount = 0;
  for (let i = hotStart; i < drawPoints.length; i += 1) {
    const p = drawPoints[i];
    const ttl = Math.max(0.1, Number(p.ttl) || trailTtlFallback);
    hotLife += Math.max(0, Math.min(1, 1 - (Number(p.age) || 0) / ttl));
    hotCount += 1;
  }
  hotLife /= Math.max(1, hotCount);
  if (hotLife > 0.02) {
    ctx.strokeStyle = hexToRgba(color, hotLife * 0.34);
    ctx.lineWidth = Math.max(2, 6.2 * hotLife);
    drawSmoothPath(drawPoints, hotStart, drawPoints.length - 1);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 250, 220, ${(hotLife * 0.68).toFixed(3)})`;
    ctx.lineWidth = Math.max(0.9, 2.2 * hotLife);
    drawSmoothPath(drawPoints, Math.max(0, drawPoints.length - 4), drawPoints.length - 1);
    ctx.stroke();
  }
  ctx.restore();
}

function getRocketRenderAngle(projectile, desiredAngle) {
  const id = String(projectile?.id || '').trim();
  if (!id) return desiredAngle;
  if (!(visuals.rocketRenderAngles instanceof Map)) visuals.rocketRenderAngles = new Map();
  const nowMs = performance.now();
  const prev = visuals.rocketRenderAngles.get(id);
  if (!prev) {
    visuals.rocketRenderAngles.set(id, { angle: desiredAngle, at: nowMs });
    return desiredAngle;
  }
  const dt = Math.max(0.001, Math.min(0.05, (nowMs - (Number(prev.at) || nowMs)) / 1000));
  const delta = Math.atan2(Math.sin(desiredAngle - prev.angle), Math.cos(desiredAngle - prev.angle));
  const maxTurn = 8.4 * dt;
  const easedDelta = delta * (1 - Math.exp(-14 * dt));
  const angle = prev.angle + Math.max(-maxTurn, Math.min(maxTurn, easedDelta));
  prev.angle = angle;
  prev.at = nowMs;
  return angle;
}

function drawRocketProjectile(projectile) {
  const desiredAngle = Math.atan2(Number(projectile.vy) || 0, Number(projectile.vx) || 1);
  const angle = getRocketRenderAngle(projectile, desiredAngle);
  const sx = (Number(projectile.x) || 0) - camera.x;
  const sy = (Number(projectile.y) || 0) - camera.y;
  const color = projectile.color || '#fb923c';
  if (typeof addRocketTrailSample === 'function') {
    addRocketTrailSample(projectile.id, projectile.x, projectile.y, projectile.vx, projectile.vy, color, performance.now(), { fromRender: true });
  }
  drawRocketTrailRibbon(projectile, color);
  const scale = Math.max(0.72, Math.min(1.08, (Number(projectile.radius) || 6) / 6)) * 0.82;
  const pulse = 0.94 + Math.sin(performance.now() / 38 + sx * 0.03 + sy * 0.015) * 0.06;
  drawShadowAtScreen(sx - Math.cos(angle) * 2, sy + 6, 12 * scale, 4.5 * scale, 0.28);

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);

  ctx.globalCompositeOperation = 'lighter';
  const engineGlow = ctx.createRadialGradient(-15 * scale, 0, 0, -15 * scale, 0, 24 * scale * pulse);
  engineGlow.addColorStop(0, 'rgba(255, 252, 210, 0.72)');
  engineGlow.addColorStop(0.34, hexToRgba('#fb923c', 0.42));
  engineGlow.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = engineGlow;
  ctx.beginPath();
  ctx.ellipse(-17 * scale, 0, 23 * scale * pulse, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const flame = ctx.createLinearGradient(-39 * scale, 0, -7 * scale, 0);
  flame.addColorStop(0, 'rgba(248, 113, 113, 0)');
  flame.addColorStop(0.36, hexToRgba(color, 0.34));
  flame.addColorStop(0.72, 'rgba(251, 146, 60, 0.86)');
  flame.addColorStop(1, 'rgba(255, 250, 205, 0.98)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-39 * scale * pulse, 0);
  ctx.bezierCurveTo(-28 * scale, -8.5 * scale, -16 * scale, -7.2 * scale, -8 * scale, -3.2 * scale);
  ctx.lineTo(-5.5 * scale, 0);
  ctx.bezierCurveTo(-16 * scale, 7.2 * scale, -28 * scale, 8.5 * scale, -39 * scale * pulse, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 235, 0.92)';
  ctx.beginPath();
  ctx.moveTo(-25 * scale * pulse, 0);
  ctx.bezierCurveTo(-17 * scale, -3.2 * scale, -11 * scale, -2.9 * scale, -7 * scale, -1.2 * scale);
  ctx.lineTo(-5.2 * scale, 0);
  ctx.bezierCurveTo(-11 * scale, 2.9 * scale, -17 * scale, 3.2 * scale, -25 * scale * pulse, 0);
  ctx.closePath();
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(-15 * scale, -4.6 * scale);
  ctx.lineTo(-23 * scale, -9.6 * scale);
  ctx.lineTo(-19 * scale, -1.2 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-15 * scale, 4.6 * scale);
  ctx.lineTo(-23 * scale, 9.6 * scale);
  ctx.lineTo(-19 * scale, 1.2 * scale);
  ctx.closePath();
  ctx.fill();

  const body = ctx.createLinearGradient(-16 * scale, -5 * scale, 18 * scale, 5 * scale);
  body.addColorStop(0, '#1f2937');
  body.addColorStop(0.22, '#64748b');
  body.addColorStop(0.58, '#cbd5e1');
  body.addColorStop(1, '#f8fafc');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-16 * scale, -5 * scale);
  ctx.bezierCurveTo(-7 * scale, -6.4 * scale, 10 * scale, -5 * scale, 18 * scale, 0);
  ctx.bezierCurveTo(10 * scale, 5 * scale, -7 * scale, 6.4 * scale, -16 * scale, 5 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.lineWidth = 1.25 * scale;
  ctx.stroke();

  ctx.fillStyle = hexToRgba(color, 0.92);
  ctx.fillRect(-8.8 * scale, -2.7 * scale, 13 * scale, 5.4 * scale);

  const nose = ctx.createLinearGradient(5 * scale, -3.5 * scale, 19 * scale, 3.5 * scale);
  nose.addColorStop(0, '#e2e8f0');
  nose.addColorStop(0.48, '#ffffff');
  nose.addColorStop(1, '#bae6fd');
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(4.6 * scale, -4.2 * scale);
  ctx.lineTo(19.2 * scale, 0);
  ctx.lineTo(4.6 * scale, 4.2 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.beginPath();
  ctx.ellipse(-13.2 * scale, 0, 2.4 * scale, 3.3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
  ctx.lineWidth = Math.max(0.8, 1.15 * scale);
  ctx.beginPath();
  ctx.moveTo(-11 * scale, -3.4 * scale);
  ctx.bezierCurveTo(-2 * scale, -4.2 * scale, 8 * scale, -3.2 * scale, 14 * scale, -1 * scale);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  ctx.ellipse(2 * scale, 0, 8.5 * scale, 2.1 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
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
    const treeSprite = sprites.tree;

    if (treeSprite?.complete && treeSprite.naturalWidth > 0 && treeSprite.naturalHeight > 0) {
      const drawH = 86 * s;
      const drawW = drawH * (treeSprite.naturalWidth / treeSprite.naturalHeight);
      drawShadowAtScreen(x + 5 * s, y - 10 * s, 16 * s, 6.5 * s, 0.31);
      ctx.save();
      ctx.translate(x, y);
      ctx.drawImage(treeSprite, -drawW * 0.5, -drawH * 0.93, drawW, drawH);
      ctx.restore();
      continue;
    }

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

function getMapObjectBaseY(obj) {
  return getMapObjectGeometry(obj).baseY;
}

function getMapObjectCollisionPolygon(obj) {
  return getMapObjectGeometry(obj).polygon;
}

function getMapObjectCollisionBounds(obj) {
  return getMapObjectGeometry(obj).bounds;
}

function getMapObjectOcclusionBaseY(obj) {
  return getMapObjectGeometry(obj).occlusionBaseY;
}

function getMapObjectFrontYAtX(obj, actorX) {
  const polygon = getMapObjectCollisionPolygon(obj);
  if (!polygon) return getMapObjectBaseY(obj);
  const x = Number(actorX) || 0;
  let frontY = -Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    if (x < minX - 0.001 || x > maxX + 0.001) continue;
    const dx = b.x - a.x;
    const t = Math.abs(dx) <= 0.000001 ? 0 : (x - a.x) / dx;
    if (t < -0.001 || t > 1.001) continue;
    const y = a.y + (b.y - a.y) * Math.max(0, Math.min(1, t));
    frontY = Math.max(frontY, y);
  }
  return Number.isFinite(frontY) ? frontY : null;
}

function getMapObjectTopY(obj) {
  return getMapObjectGeometry(obj).topY;
}

function drawSingleMapObject(obj, nowMs = Date.now(), options = {}) {
  if (!obj) return;
  if (obj.destroyed && obj.hideAfterDestroyed) return;
  const drawShadow = options.drawShadow !== false;
  const drawHp = options.drawHp !== false;
  const radius = Math.max(Number(obj.w) || 0, Number(obj.h) || 0) * 0.55;
  if (!isVisibleWorld(Number(obj.x) || 0, Number(obj.y) || 0, radius + 40)) return;
  const screenX = (Number(obj.x) || 0) - camera.x;
  const screenY = (Number(obj.y) || 0) - camera.y;
  const width = Math.max(22, Number(obj.w) || 22);
  const height = Math.max(22, Number(obj.h) || 22);
  const anchorY = Math.max(0.45, Math.min(0.72, Number(obj.anchorY) || 0.56));
  const directionalFrame = getMapPropDirectionFrame(obj);
  const sprite = sprites.mapProps?.[obj.spriteKey] || null;
  const spriteFrame = directionalFrame || getMapPropImageFrame(sprite);
  const damaged = obj.destructible && (Number(obj.hp) || 0) < Math.max(1, Number(obj.maxHp) || 1);
  const recentlyHit = Math.max(0, Number(obj.lastHitAt) || 0) > 0 && (nowMs - Number(obj.lastHitAt) <= 120);

  if (drawShadow) {
    if (obj.destroyed) {
      if (!drawProjectedMapObjectShadow(spriteFrame, screenX, screenY, width, height, anchorY, obj)) {
        drawShadowAtScreen(screenX, screenY + 10, Math.max(18, width * 0.22), Math.max(6, height * 0.09), 0.14);
      }
      ctx.save();
      ctx.fillStyle = 'rgba(18, 10, 8, 0.58)';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY + 8, Math.max(16, width * 0.26), Math.max(7, height * 0.12), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      if (!drawProjectedMapObjectShadow(spriteFrame, screenX, screenY, width, height, anchorY, obj)) {
        drawShadowAtScreen(screenX, screenY + 10, Math.max(16, width * 0.22 * (Number(obj.shadowScale) || 1)), Math.max(6, height * 0.1), 0.22);
      }
    }
  }

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(directionalFrame ? 0 : getMapObjectRenderAngle(obj));
  if (recentlyHit) ctx.filter = 'brightness(1.18) saturate(1.2)';
  else if (obj.destroyed) ctx.filter = 'grayscale(0.65) brightness(0.48) saturate(0.4)';
  else if (damaged) ctx.filter = 'brightness(0.94) saturate(0.92)';

  if (directionalFrame) {
    ctx.drawImage(
      directionalFrame.image,
      directionalFrame.sx,
      directionalFrame.sy,
      directionalFrame.sw,
      directionalFrame.sh,
      -width * 0.5,
      -height * anchorY,
      width,
      height,
    );
  } else if (sprite?.complete && sprite.naturalWidth > 0) {
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
  if (drawHp) drawMapObjectHpBar(obj, screenX, screenY);
}

function drawMapObjects(nowMs = Date.now()) {
  const objects = Array.isArray(game.sortedMapObjects) ? game.sortedMapObjects : [];
  for (const obj of objects) drawSingleMapObject(obj, nowMs, { drawShadow: true, drawHp: true });
}

function drawMapObjectHpBars(nowMs = Date.now()) {
  void nowMs;
  const objects = Array.isArray(game.sortedMapObjects) ? game.sortedMapObjects : [];
  for (const obj of objects) {
    if (!obj || (obj.destroyed && obj.hideAfterDestroyed)) continue;
    const radius = Math.max(Number(obj.w) || 0, Number(obj.h) || 0) * 0.55;
    if (!isVisibleWorld(Number(obj.x) || 0, Number(obj.y) || 0, radius + 40)) continue;
    drawMapObjectHpBar(obj, (Number(obj.x) || 0) - camera.x, (Number(obj.y) || 0) - camera.y);
  }
}

function getMapObjectGeometrySignature(obj) {
  const points = Array.isArray(obj?.collisionPoints) ? obj.collisionPoints : [];
  return [
    Number(obj?.x) || 0,
    Number(obj?.y) || 0,
    Number(obj?.w) || 0,
    Number(obj?.h) || 0,
    Number(obj?.collisionW) || 0,
    Number(obj?.collisionH) || 0,
    Number(obj?.collisionOffsetY) || 0,
    Number(obj?.anchorY) || 0,
    getMapObjectRenderAngle(obj),
    points.length,
  ].join(':');
}

function buildMapObjectGeometry(obj) {
  const centerX = Number(obj?.x) || 0;
  const centerY = (Number(obj?.y) || 0) + (Number(obj?.collisionOffsetY) || 0);
  const width = Math.max(16, Number(obj?.collisionW) || Number(obj?.w) || 0);
  const height = Math.max(16, Number(obj?.collisionH) || Number(obj?.h) || 0);
  const anchorY = Math.max(0.45, Math.min(0.72, Number(obj?.anchorY) || 0.56));
  const baseY = (Number(obj?.y) || 0) + Math.max(22, Number(obj?.h) || 22) * (1 - anchorY);
  const topY = (Number(obj?.y) || 0) - Math.max(22, Number(obj?.h) || 22) * anchorY;
  const points = Array.isArray(obj?.collisionPoints) ? obj.collisionPoints : [];
  const angle = getMapObjectRenderAngle(obj);
  const cos = angle ? Math.cos(angle) : 1;
  const sin = angle ? Math.sin(angle) : 0;
  const polygon = [];
  const pushLocalPoint = (localX, localY) => {
    polygon.push({
      x: centerX + localX * cos - localY * sin,
      y: centerY + localX * sin + localY * cos,
    });
  };
  if (points.length >= 3) {
    for (const point of points) {
      const px = Array.isArray(point) ? Number(point[0]) : Number(point?.x);
      const py = Array.isArray(point) ? Number(point[1]) : Number(point?.y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      pushLocalPoint(px * width, py * height);
    }
  } else if (angle) {
    pushLocalPoint(-width * 0.5, -height * 0.5);
    pushLocalPoint(width * 0.5, -height * 0.5);
    pushLocalPoint(width * 0.5, height * 0.5);
    pushLocalPoint(-width * 0.5, height * 0.5);
  }
  let bounds = null;
  if (polygon.length >= 3) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of polygon) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
      bounds = { minX, minY, maxX, maxY };
    }
  }
  return {
    signature: getMapObjectGeometrySignature(obj),
    polygon: polygon.length >= 3 ? polygon : null,
    bounds,
    baseY,
    topY,
    occlusionBaseY: bounds ? bounds.maxY : baseY,
  };
}

function getMapObjectGeometry(obj) {
  if (!obj) return buildMapObjectGeometry(obj);
  const signature = getMapObjectGeometrySignature(obj);
  const cached = mapObjectGeometryCache.get(obj);
  if (cached?.signature === signature) return cached;
  const geometry = buildMapObjectGeometry(obj);
  mapObjectGeometryCache.set(obj, geometry);
  return geometry;
}

function shouldObjectOccludeActor(obj, actor) {
  if (!obj || obj.destroyed || !actor) return false;
  const actorX = Number(actor.x) || 0;
  const actorY = Number(actor.y) || 0;
  const topY = getMapObjectTopY(obj);
  const frontY = getMapObjectFrontYAtX(obj, actorX);
  if (frontY === null || actorY <= topY + 4 || actorY >= frontY - 4) return false;
  const bounds = getMapObjectCollisionBounds(obj);
  if (bounds && (actorX < bounds.minX - 8 || actorX > bounds.maxX + 8)) return false;
  const halfW = Math.max(
    14,
    ((bounds ? (bounds.maxX - bounds.minX) : Math.max(Number(obj.collisionW) || 0, Number(obj.w) || 0)) * 0.5) + 10,
  );
  const centerX = bounds ? (bounds.minX + bounds.maxX) * 0.5 : (Number(obj.x) || 0);
  return actorX >= centerX - halfW && actorX <= centerX + halfW;
}

function drawMapObjectOcclusionOverlay(actors, nowMs = Date.now()) {
  const objects = Array.isArray(game.sortedMapObjects) ? game.sortedMapObjects : [];
  if (objects.length <= 0 || !Array.isArray(actors) || actors.length <= 0) return;
  const overlay = renderScratch.occlusionOverlay;
  const seen = renderScratch.occlusionSeen;
  const grid = renderScratch.occlusionGrid;
  overlay.length = 0;
  seen.clear();
  grid.clear();

  const addToGrid = (obj) => {
    const geometry = getMapObjectGeometry(obj);
    const bounds = geometry.bounds || {
      minX: (Number(obj.x) || 0) - Math.max(20, (Number(obj.w) || 40) * 0.5),
      maxX: (Number(obj.x) || 0) + Math.max(20, (Number(obj.w) || 40) * 0.5),
      minY: getMapObjectTopY(obj) - 8,
      maxY: getMapObjectOcclusionBaseY(obj) + 8,
    };
    const minCellX = Math.floor((bounds.minX - 12) / OCCLUSION_GRID_SIZE);
    const maxCellX = Math.floor((bounds.maxX + 12) / OCCLUSION_GRID_SIZE);
    const minCellY = Math.floor((bounds.minY - 12) / OCCLUSION_GRID_SIZE);
    const maxCellY = Math.floor((bounds.maxY + 12) / OCCLUSION_GRID_SIZE);
    for (let cy = minCellY; cy <= maxCellY; cy += 1) {
      for (let cx = minCellX; cx <= maxCellX; cx += 1) {
        const key = `${cx}:${cy}`;
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(obj);
      }
    }
  };

  for (const obj of objects) {
    if (!obj || obj.destroyed) continue;
    const radius = Math.max(Number(obj.w) || 0, Number(obj.h) || 0) * 0.55;
    if (!isVisibleWorld(Number(obj.x) || 0, Number(obj.y) || 0, radius + 72)) continue;
    addToGrid(obj);
  }

  for (const actor of actors) {
    if (!actor) continue;
    if (!isVisibleWorld(Number(actor.x) || 0, Number(actor.y) || 0, 80)) continue;
    const cellX = Math.floor((Number(actor.x) || 0) / OCCLUSION_GRID_SIZE);
    const cellY = Math.floor((Number(actor.y) || 0) / OCCLUSION_GRID_SIZE);
    for (let cy = cellY - 1; cy <= cellY + 1; cy += 1) {
      for (let cx = cellX - 1; cx <= cellX + 1; cx += 1) {
        const bucket = grid.get(`${cx}:${cy}`);
        if (!bucket) continue;
        for (const obj of bucket) {
          if (seen.has(obj)) continue;
          if (!shouldObjectOccludeActor(obj, actor)) continue;
          seen.add(obj);
          overlay.push(obj);
        }
      }
    }
  }

  overlay.sort((a, b) => getMapObjectOcclusionBaseY(a) - getMapObjectOcclusionBaseY(b));
  for (const obj of overlay) drawSingleMapObject(obj, nowMs, { drawShadow: false, drawHp: false });
  overlay.length = 0;
  seen.clear();
  grid.clear();
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

function weaponPickupColor(weaponKey) {
  if (weaponKey === 'sniper') return '#e5e7eb';
  if (weaponKey === 'shotgun') return '#fb923c';
  if (weaponKey === 'smg') return '#38bdf8';
  return '#22c55e';
}

function normalizeWeaponPickupKey(weaponKey) {
  const key = String(weaponKey || '').toLowerCase();
  if (key.includes('sniper')) return 'sniper';
  if (key.includes('shotgun')) return 'shotgun';
  if (key.includes('smg')) return 'smg';
  return 'pistol';
}

function getWeaponPickupImage(weaponKey) {
  const key = normalizeWeaponPickupKey(weaponKey);
  return getRenderCachedImage(`/assets/weapon-pickups/${key}.png`);
}

function getWeaponPickupDrawWidth(weaponKey) {
  const key = normalizeWeaponPickupKey(weaponKey);
  if (key === 'sniper') return 76;
  if (key === 'shotgun') return 70;
  if (key === 'smg') return 62;
  return 50;
}

function drawPickupLabel(x, y, label, blink, ttlMs, color) {
  if (!shouldDrawPickupLabelText(x, y, blink)) return;
  const warnSec = blink ? Math.max(0, Math.ceil(ttlMs / 1000)) : 0;
  const text = blink ? `${label} ${warnSec}s` : label;
  ctx.save();
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  const w = Math.max(44, Math.min(86, ctx.measureText(text).width + 14));
  ctx.fillStyle = blink ? 'rgba(48, 12, 18, 0.88)' : 'rgba(7, 12, 20, 0.82)';
  ctx.fillRect(x - w * 0.5, y - 33, w, 14);
  ctx.strokeStyle = blink ? 'rgba(248, 113, 113, 0.92)' : hexToRgba(color, 0.58);
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w * 0.5, y - 33, w, 14);
  ctx.fillStyle = blink ? '#fecaca' : '#e2e8f0';
  ctx.fillText(text, x, y - 23);
  ctx.restore();
}

function drawWeaponPickupImage(x, y, weaponKey, color, nowMs) {
  const img = getWeaponPickupImage(weaponKey);
  if (!isRenderImageReady(img)) return false;
  const bob = Math.sin(nowMs / 360) * 1.5;
  const dw = getWeaponPickupDrawWidth(weaponKey);
  const dh = dw * (img.naturalHeight / Math.max(1, img.naturalWidth));
  ctx.save();
  ctx.translate(x, y - 2 + bob);
  ctx.rotate(Math.sin(nowMs / 520) * 0.025);
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(img, -dw * 0.5, -dh * 0.5, dw, dh);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexToRgba(color, 0.55);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(dw * 0.18, -dh * 0.12);
  ctx.lineTo(dw * 0.32, -dh * 0.18);
  ctx.stroke();
  ctx.restore();
  return true;
}

function drawWeaponPickupSilhouette(x, y, weaponKey, color, nowMs) {
  const wobble = Math.sin(nowMs / 420) * 0.06;
  ctx.save();
  ctx.translate(x, y - 2);
  ctx.rotate(-0.16 + wobble);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(2, 6, 12, 0.92)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  if (weaponKey === 'sniper') {
    ctx.moveTo(-24, 0);
    ctx.lineTo(24, 0);
    ctx.moveTo(-11, -5);
    ctx.lineTo(3, -5);
    ctx.moveTo(0, 3);
    ctx.lineTo(6, 13);
    ctx.moveTo(-21, 0);
    ctx.lineTo(-29, 8);
  } else if (weaponKey === 'shotgun') {
    ctx.moveTo(-22, -2);
    ctx.lineTo(18, -2);
    ctx.moveTo(-20, 2);
    ctx.lineTo(18, 2);
    ctx.moveTo(-3, 4);
    ctx.lineTo(3, 14);
    ctx.moveTo(-18, 0);
    ctx.lineTo(-27, 8);
  } else if (weaponKey === 'smg') {
    ctx.moveTo(-16, -1);
    ctx.lineTo(18, -1);
    ctx.moveTo(7, -6);
    ctx.lineTo(12, 7);
    ctx.moveTo(-4, 3);
    ctx.lineTo(-1, 14);
    ctx.moveTo(-13, 0);
    ctx.lineTo(-20, 7);
  } else {
    ctx.moveTo(-15, -1);
    ctx.lineTo(13, -1);
    ctx.moveTo(7, -6);
    ctx.lineTo(11, 7);
    ctx.moveTo(-2, 3);
    ctx.lineTo(2, 13);
  }
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = weaponKey === 'shotgun' ? 3.4 : 3;
  ctx.beginPath();
  if (weaponKey === 'sniper') {
    ctx.moveTo(-24, 0);
    ctx.lineTo(24, 0);
    ctx.moveTo(-11, -5);
    ctx.lineTo(3, -5);
    ctx.moveTo(0, 3);
    ctx.lineTo(6, 13);
    ctx.moveTo(-21, 0);
    ctx.lineTo(-29, 8);
  } else if (weaponKey === 'shotgun') {
    ctx.moveTo(-22, -2);
    ctx.lineTo(18, -2);
    ctx.moveTo(-20, 2);
    ctx.lineTo(18, 2);
    ctx.moveTo(-3, 4);
    ctx.lineTo(3, 14);
    ctx.moveTo(-18, 0);
    ctx.lineTo(-27, 8);
  } else if (weaponKey === 'smg') {
    ctx.moveTo(-16, -1);
    ctx.lineTo(18, -1);
    ctx.moveTo(7, -6);
    ctx.lineTo(12, 7);
    ctx.moveTo(-4, 3);
    ctx.lineTo(-1, 14);
    ctx.moveTo(-13, 0);
    ctx.lineTo(-20, 7);
  } else {
    ctx.moveTo(-15, -1);
    ctx.lineTo(13, -1);
    ctx.moveTo(7, -6);
    ctx.lineTo(11, 7);
    ctx.moveTo(-2, 3);
    ctx.lineTo(2, 13);
  }
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  if (weaponKey === 'sniper') {
    ctx.fillRect(3, -7, 8, 3);
    ctx.fillRect(20, -1, 8, 2);
  } else if (weaponKey === 'shotgun') {
    ctx.fillRect(15, -4, 7, 3);
    ctx.fillRect(15, 1, 7, 3);
  } else if (weaponKey === 'smg') {
    ctx.fillRect(0, -5, 6, 3);
    ctx.fillRect(10, -2, 8, 2);
  } else {
    ctx.fillRect(7, -7, 5, 3);
  }
  ctx.restore();
}

function drawXpVacuumPickup(x, y, blink, ttlMs, nowMs, drop = null) {
  const color = blink ? '#fca5a5' : '#a855f7';
  const coreColor = '#f5d0fe';
  const tetherColor = '#67e8f9';
  const idText = String(drop?.id || '');
  const seed = (Number(drop?.id) || idText.length * 17 || 11) * 0.13;
  const pulse = 1 + Math.sin(nowMs / 150 + seed) * 0.13;
  const spin = nowMs * 0.0022 + seed;
  const hover = Math.sin(nowMs / 230 + seed) * 2.4;
  const cx = x;
  const cy = y + hover;

  drawShadowAtScreen(x, y + 16, 18, 6.5, blink ? 0.16 : 0.3);

  const xpOrbs = Array.isArray(game.state?.xpOrbs) ? game.state.xpOrbs : [];
  const nearby = xpOrbs
    .map((orb) => {
      const rp = typeof getXpOrbRenderPos === 'function' ? getXpOrbRenderPos(orb) : orb;
      const sx = (Number(rp?.x) || 0) - camera.x;
      const sy = (Number(rp?.y) || 0) - camera.y;
      const dx = sx - cx;
      const dy = sy - cy;
      return { sx, sy, d2: dx * dx + dy * dy };
    })
    .filter((orb) => orb.d2 > 16 && orb.d2 < 360 * 360)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, 9);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < nearby.length; i += 1) {
    const orb = nearby[i];
    const dist = Math.sqrt(Math.max(1, orb.d2));
    const alpha = Math.max(0.05, Math.min(0.24, (1 - dist / 380) * 0.22));
    const midX = (orb.sx + cx) * 0.5 + Math.sin(nowMs / 240 + i + seed) * 12;
    const midY = (orb.sy + cy) * 0.5 + Math.cos(nowMs / 260 + i * 0.7 + seed) * 12;
    ctx.strokeStyle = hexToRgba(i % 2 ? tetherColor : color, alpha);
    ctx.lineWidth = 1.1 + (i % 3) * 0.25;
    ctx.beginPath();
    ctx.moveTo(orb.sx, orb.sy);
    ctx.quadraticCurveTo(midX, midY, cx, cy);
    ctx.stroke();
  }

  const aura = ctx.createRadialGradient(cx, cy, 2, cx, cy, 42 * pulse);
  aura.addColorStop(0, hexToRgba(coreColor, 0.62));
  aura.addColorStop(0.28, hexToRgba(color, 0.38));
  aura.addColorStop(0.66, hexToRgba(tetherColor, 0.13));
  aura.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, 42 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(cx, cy);
  ctx.rotate(spin * 0.34);

  ctx.setLineDash([6, 7]);
  ctx.strokeStyle = hexToRgba(tetherColor, blink ? 0.62 : 0.42);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30 * pulse, 14 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([3, 9]);
  ctx.strokeStyle = hexToRgba(color, blink ? 0.8 : 0.56);
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18 * pulse, 31 * pulse, Math.PI / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 7; i += 1) {
    const a = (Math.PI * 2 * i) / 7 - spin * 0.62;
    const r = 24 + Math.sin(nowMs / 120 + i) * 2.5;
    ctx.fillStyle = hexToRgba(i % 2 ? tetherColor : coreColor, 0.8);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r - 2.5);
    ctx.lineTo(Math.cos(a + 0.12) * (r + 4), Math.sin(a + 0.12) * (r + 4));
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + 2.5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  const crystalGrad = ctx.createLinearGradient(-12, -18, 12, 18);
  crystalGrad.addColorStop(0, '#ffffff');
  crystalGrad.addColorStop(0.2, coreColor);
  crystalGrad.addColorStop(0.55, color);
  crystalGrad.addColorStop(1, '#4c1d95');
  ctx.fillStyle = crystalGrad;
  ctx.strokeStyle = blink ? '#fecdd3' : '#d8b4fe';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.lineTo(12, -6);
  ctx.lineTo(8, 12);
  ctx.lineTo(0, 20);
  ctx.lineTo(-8, 12);
  ctx.lineTo(-12, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexToRgba('#ffffff', 0.68);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(0, 18);
  ctx.moveTo(-11, -6);
  ctx.lineTo(0, 1);
  ctx.lineTo(12, -6);
  ctx.moveTo(-7, 12);
  ctx.lineTo(0, 1);
  ctx.lineTo(8, 12);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-4, -9, 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawPickupLabel(x, y, 'XP Surge', blink, ttlMs, color);
}

function drawWeaponPickup(d, x, y, blink, ttlMs, nowMs) {
  const color = blink ? '#ef4444' : weaponPickupColor(d.weaponKey);
  const pulse = 1 + Math.sin(nowMs / 180 + (Number(d.id) || 0)) * 0.12;
  const spin = nowMs * 0.003 + (Number(d.id) || 0);
  drawShadowAtScreen(x, y + 12, 17, 6, blink ? 0.16 : 0.28);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(x, y, 4, x, y, 31 * pulse);
  aura.addColorStop(0, hexToRgba(color, 0.42));
  aura.addColorStop(0.55, hexToRgba(color, 0.2));
  aura.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, 31 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = hexToRgba(color, blink ? 0.88 : 0.62);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 27, 15, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if (!drawWeaponPickupImage(x, y, d.weaponKey, color, nowMs)) {
    drawWeaponPickupSilhouette(x, y, d.weaponKey, color, nowMs);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexToRgba(color, 0.65);
  ctx.lineWidth = 2;
  const flash = 13 + Math.sin(nowMs / 90) * 3;
  ctx.beginPath();
  ctx.moveTo(x + 15, y - 3);
  ctx.lineTo(x + flash + 13, y - 6);
  ctx.stroke();
  ctx.restore();

  const label = d.weaponLabel || 'Weapon';
  drawPickupLabel(x, y, label, blink, ttlMs, color);
}

function drawDropPickup(d, nowMs) {
  if (!d || !isVisibleWorld(d.x, d.y, 56)) return;
  const ttlMs = Math.max(0, Number(d.ttlMs) || 0);
  const blink = ttlMs > 0 && ttlMs <= 5000;
  if (blink && Math.sin(nowMs / 90) <= 0) return;
  const x = d.x - camera.x;
  const y = d.y - camera.y;
  if (d.kind === 'xp_vacuum') {
    drawXpVacuumPickup(x, y, blink, ttlMs, nowMs, d);
  } else {
    drawWeaponPickup(d, x, y, blink, ttlMs, nowMs);
  }
}

const cosmeticPlayerFrameCache = new Map();

function getPlayerCosmeticSkinId(player) {
  return String(player?.visualLoadout?.heroSkinId || player?.visualLoadout?.skin || '').trim();
}

function getCosmeticVisual(kind, id) {
  return globalThis.CWTonShop?.getCosmeticVisual?.(kind, id) || null;
}

function getTintedPlayerFrame(sprite, fw, fh, frame, row, tint) {
  const color = String(tint || '').trim();
  if (!color || !sprite?.complete) return null;
  const srcKey = String(sprite.currentSrc || sprite.src || 'player');
  const key = `${srcKey}:${sprite.naturalWidth}x${sprite.naturalHeight}:${fw}:${fh}:${frame}:${row}:${color}`;
  const cached = cosmeticPlayerFrameCache.get(key);
  if (cached) return cached;
  if (cosmeticPlayerFrameCache.size > 120) cosmeticPlayerFrameCache.clear();
  const canvasEl = document.createElement('canvas');
  canvasEl.width = fw;
  canvasEl.height = fh;
  const g = canvasEl.getContext('2d');
  if (!g) return null;
  g.imageSmoothingEnabled = false;
  g.drawImage(sprite, frame * fw, row * fh, fw, fh, 0, 0, fw, fh);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.38;
  g.fillStyle = color;
  g.fillRect(0, 0, fw, fh);
  g.globalAlpha = 0.18;
  g.globalCompositeOperation = 'lighter';
  g.fillRect(0, 0, fw, fh);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  cosmeticPlayerFrameCache.set(key, canvasEl);
  return canvasEl;
}

function drawCosmeticLoadoutFx(player, x, y, t, scale) {
  const loadout = player?.visualLoadout || {};
  const heroVisual = getCosmeticVisual('hero_skin', getPlayerCosmeticSkinId(player));
  const itemSkins = loadout.itemSkins && typeof loadout.itemSkins === 'object' ? loadout.itemSkins : {};
  if (heroVisual?.glow) {
    const pulse = 0.55 + Math.sin(t * 4.2) * 0.16;
    ctx.save();
    ctx.globalAlpha = 0.24 * pulse;
    ctx.strokeStyle = heroVisual.glow;
    ctx.lineWidth = Math.max(1.5, 2.4 * scale);
    ctx.beginPath();
    ctx.ellipse(x, y + 16 * scale, 25 * scale, 9 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const ringVisual = getCosmeticVisual('item_skin', itemSkins.ring);
  if (ringVisual?.glow) {
    const a = t * 2.1;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = ringVisual.glow;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y - 20 * scale, 19 * scale, 6 * scale, a * 0.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ringVisual.tint || ringVisual.glow;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 19 * scale, y - 20 * scale + Math.sin(a) * 6 * scale, 2.4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const armorVisual = getCosmeticVisual('item_skin', itemSkins.armor);
  if (armorVisual?.glow) {
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.max(0, Math.sin(t * 5.8)) * 0.18;
    ctx.fillStyle = armorVisual.glow;
    ctx.beginPath();
    ctx.arc(x, y - 16 * scale, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const legsVisual = getCosmeticVisual('item_skin', itemSkins.legs);
  if (legsVisual?.glow) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = legsVisual.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8 * scale, y + 24 * scale);
    ctx.lineTo(x - 18 * scale, y + 34 * scale);
    ctx.moveTo(x + 8 * scale, y + 24 * scale);
    ctx.lineTo(x + 18 * scale, y + 34 * scale);
    ctx.stroke();
    ctx.restore();
  }
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
  const heroSkinVisual = getCosmeticVisual('hero_skin', getPlayerCosmeticSkinId(p));
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
    const tintedFrame = heroSkinVisual?.tint ? getTintedPlayerFrame(playerSprite, fw, fh, frame, row, heroSkinVisual.tint) : null;
    if (tintedFrame) ctx.drawImage(tintedFrame, -dw / 2, -dh * 0.6, dw, dh);
    else ctx.drawImage(playerSprite, frame * fw, row * fh, fw, fh, -dw / 2, -dh * 0.6, dw, dh);
    ctx.restore();
  } else {
    drawCircle(rx, ry, 18, isMe ? '#22d3ee' : '#a78bfa');
  }

  drawCosmeticLoadoutFx(p, x, y, t, scale);

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

function drawCompanionUiLayer(playersByDepth) {
  if (!Array.isArray(playersByDepth) || playersByDepth.length <= 0) return;
  for (const item of playersByDepth) {
    const p = item?.p;
    const rp = item?.rp;
    if (!p?.alive || !p.isCompanion) continue;
    const sx = (Number(rp?.x) || 0) - camera.x;
    const sy = (Number(rp?.y) || 0) - camera.y;
    drawCompanionNameAmmoBadge(p, sx, sy);
    if (game.showCompanionReserveAmmoEnabled) drawPlayerWeaponAmmoBadge(p, sx, sy, -54);
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

const FALLBACK_MOB_RENDER = {
  normal: { color: '#9ca3af', spriteScale: 1, behavior: 'melee' },
  runner: { color: '#ef4444', spriteScale: 0.92, behavior: 'flanker' },
  charger: { color: '#f97316', spriteScale: 1.12, behavior: 'charger' },
  ranged: { color: '#fb7185', spriteScale: 0.98, behavior: 'ranged' },
  brute: { color: '#64748b', spriteScale: 1.48, behavior: 'brute' },
  splitter: { color: '#a855f7', spriteScale: 1.12, behavior: 'splitter' },
  medic: { color: '#22c55e', spriteScale: 1.02, behavior: 'healer' },
  sniper: { color: '#38bdf8', spriteScale: 1, behavior: 'sniper' },
  exploder: { color: '#facc15', spriteScale: 1.04, behavior: 'exploder' },
  shield: { color: '#e5e7eb', spriteScale: 1.32, behavior: 'shield' },
  boss: { color: '#dc2626', spriteScale: 2.6, behavior: 'boss' },
  boss_hellmart: { color: '#f97316', spriteScale: 2.82, behavior: 'boss' },
  boss_chief_surgeon: { color: '#22c55e', spriteScale: 2.66, behavior: 'boss' },
  boss_road_titan: { color: '#ef4444', spriteScale: 2.48, behavior: 'boss' },
  boss_reactor_apostle: { color: '#84cc16', spriteScale: 2.72, behavior: 'boss' },
};

function getMobRenderDef(type) {
  const id = String(type || 'normal').trim();
  const catalog = Array.isArray(game.mobCatalog) ? game.mobCatalog : [];
  return catalog.find((mob) => String(mob?.id || '') === id) || FALLBACK_MOB_RENDER[id] || FALLBACK_MOB_RENDER.normal;
}

function getEnemyRenderColor(enemy) {
  return enemy?.color || getMobRenderDef(enemy?.mobId || enemy?.type)?.color || '#ef4444';
}

function getEnemyRenderBehavior(enemy) {
  return enemy?.behavior || getMobRenderDef(enemy?.mobId || enemy?.type)?.behavior || 'melee';
}

const enemyTintFrameCache = new Map();

function getTintedEnemyFrame(frame, tint, isBoss, fw, fh) {
  if (!sprites.enemy.complete || sprites.enemy.naturalWidth < fw * 2) return null;
  const color = String(tint || '').trim().toLowerCase() || '#ef4444';
  const alpha = isBoss ? 0.18 : 0.42;
  const key = `${sprites.enemy.src || 'enemy'}:${sprites.enemy.naturalWidth}x${sprites.enemy.naturalHeight}:${frame}:${color}:${alpha}`;
  const cached = enemyTintFrameCache.get(key);
  if (cached) return cached;

  const canvasEl = document.createElement('canvas');
  canvasEl.width = fw;
  canvasEl.height = fh;
  const spriteCtx = canvasEl.getContext('2d');
  if (!spriteCtx) return null;
  spriteCtx.imageSmoothingEnabled = false;
  spriteCtx.drawImage(sprites.enemy, frame * fw, 0, fw, fh, 0, 0, fw, fh);
  spriteCtx.globalCompositeOperation = 'source-atop';
  spriteCtx.fillStyle = hexToRgba(color, alpha);
  spriteCtx.fillRect(0, 0, fw, fh);
  spriteCtx.globalCompositeOperation = 'source-over';

  enemyTintFrameCache.set(key, canvasEl);
  if (enemyTintFrameCache.size > 96) {
    enemyTintFrameCache.delete(enemyTintFrameCache.keys().next().value);
  }
  return canvasEl;
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
    const mobRender = getMobRenderDef(e.mobId || e.type);
    const behavior = getEnemyRenderBehavior(e);
    const tint = getEnemyRenderColor(e);
    const scaleBase = Number(e.spriteScale) || Number(mobRender?.spriteScale) || (isBoss ? 2.6 : 1);
    const scale = isBoss ? Math.max(2.2, scaleBase) : Math.max(0.65, scaleBase);
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
      const tintedFrame = getTintedEnemyFrame(frame, tint, isBoss, fw, fh);
      if (tintedFrame) ctx.drawImage(tintedFrame, -sw * 0.5, -sh * 0.52, sw, sh);
      else ctx.drawImage(sprites.enemy, frame * fw, 0, fw, fh, -sw * 0.5, -sh * 0.52, sw, sh);
      ctx.restore();

      if (isBoss) {
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(e.name || 'BOSS').slice(0, 22).toUpperCase(), x, y - sh * 0.62 - 10);
      }
      if (behavior === 'healer' || behavior === 'shield' || behavior === 'exploder') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = hexToRgba(tint, behavior === 'exploder' ? 0.5 : 0.34);
        ctx.lineWidth = behavior === 'shield' ? 3 : 2;
        ctx.beginPath();
        ctx.arc(x, y + 7, Math.max(16, er * (behavior === 'exploder' ? 1.25 : 1.05)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      drawCircle(re.x, re.y, isBoss ? 34 : 18, tint);
    }

    if (game.enemyHpBarsEnabled) {
      const ratio = Math.max(0, e.hp / e.maxHp);
      const hpY = isBoss ? (re.y - 20) : re.y;
      drawHpBar(re.x, hpY, ratio);
    }
  }
}

function drawEnemyOverlayLayer(enemies, t) {
  void t;
  for (const e of enemies) {
    const re = getEnemyRenderPos(e);
    const er = Math.max(18, Number(e.radius) || 18);
    if (!isVisibleWorld(re.x, re.y, Math.max(60, er + 24))) continue;
    const x = re.x - camera.x;
    const y = re.y - camera.y;
    const isBoss = e.type === 'boss';
    const mobRender = getMobRenderDef(e.mobId || e.type);
    const behavior = getEnemyRenderBehavior(e);
    const tint = getEnemyRenderColor(e);
    const scaleBase = Number(e.spriteScale) || Number(mobRender?.spriteScale) || (isBoss ? 2.6 : 1);
    const scale = isBoss ? Math.max(2.2, scaleBase) : Math.max(0.65, scaleBase);
    const sh = 50 * scale;

    if (isBoss) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(e.name || 'BOSS').slice(0, 22).toUpperCase(), x, y - sh * 0.62 - 10);
    }
    if (behavior === 'healer' || behavior === 'shield' || behavior === 'exploder') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexToRgba(tint, behavior === 'exploder' ? 0.5 : 0.34);
      ctx.lineWidth = behavior === 'shield' ? 3 : 2;
      ctx.beginPath();
      ctx.arc(x, y + 7, Math.max(16, er * (behavior === 'exploder' ? 1.25 : 1.05)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
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
  const skillForIcon = def?.id || def?.icon || def?.iconPath ? def : { id: sid, name: fallbackName, rarity };
  const iconPath = typeof getBattleHubHeroSkillIconPath === 'function'
    ? getBattleHubHeroSkillIconPath(skillForIcon)
    : '';
  const badge = typeof skillBadgeLabel === 'function'
    ? skillBadgeLabel(skillForIcon)
    : fallbackName.replace(/[^A-Za-z0-9]+/g, ' ').trim().slice(0, 3).toUpperCase();
  return {
    name: trRender(`skill.${sid}.name`, fallbackName),
    rarity,
    color: skillOrbAccentColor(sid, def, rarity),
    fxKind: skillOrbFxKind(sid, def),
    iconPath,
    badge: badge || '?',
  };
}

function getRenderCachedImage(path) {
  const key = String(path || '').trim();
  if (!key) return null;
  let img = renderImageCache.get(key);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.onload = () => { img.__cwFailed = false; };
    img.onerror = () => { img.__cwFailed = true; };
    img.src = key;
    renderImageCache.set(key, img);
  }
  return img.__cwFailed ? null : img;
}

function isRenderImageReady(img) {
  return Boolean(img?.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
}

function skillOrbAccentColor(skillId, def, rarity) {
  const text = `${skillId} ${def?.name || ''} ${def?.desc || ''}`.toLowerCase();
  if (/(regen|vital|heal|aid|triage|shield|plating|sterile|support)/.test(text)) return '#34d399';
  if (/(chain|lightning|shock|storm|arc|ion|pulse|electric)/.test(text)) return '#67e8f9';
  if (/(laser|beam|lance|psi|void|shadow|eclipse|night|umbral|ghost)/.test(text)) return '#c084fc';
  if (/(rocket|missile|explosive|barrage|shrapnel|stomp|slap)/.test(text)) return '#fb923c';
  if (/(blood|rage|berserk|fang|blade|assassin)/.test(text)) return '#fb7185';
  if (/(haste|speed|reload|stride|trail|dodge|jump|drink)/.test(text)) return '#facc15';
  if (/(magnet|gps|seeker|homing|mark|sync|frame)/.test(text)) return '#60a5fa';
  return rarityColor(rarity);
}

function skillOrbFxKind(skillId, def) {
  const text = `${skillId} ${def?.name || ''} ${def?.desc || ''}`.toLowerCase();
  if (/(chain|lightning|shock|storm|arc|ion|electric)/.test(text)) return 'electric';
  if (/(regen|vital|heal|aid|triage|shield|plating|sterile|support)/.test(text)) return 'support';
  if (/(laser|beam|lance|psi|void|shadow|eclipse|night|umbral|ghost)/.test(text)) return 'void';
  if (/(rocket|missile|explosive|barrage|shrapnel|weapon|gun|smg|shotgun|sniper|pistol)/.test(text)) return 'weapon';
  if (/(haste|speed|reload|stride|trail|dodge|jump|drink)/.test(text)) return 'speed';
  return 'core';
}

function drawSkillOrbCore(info, sx, sy, baseColor, pulse) {
  const icon = getRenderCachedImage(info.iconPath);
  const coreR = 10.5 * pulse;
  ctx.save();
  const coreGrad = ctx.createRadialGradient(sx - 3, sy - 4, 1, sx, sy, coreR + 3);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.38, hexToRgba(baseColor, 0.9));
  coreGrad.addColorStop(1, 'rgba(6, 10, 18, 0.94)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(sx, sy, coreR - 1.5, 0, Math.PI * 2);
  ctx.clip();
  if (isRenderImageReady(icon)) {
    const side = (coreR - 1.5) * 2;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(icon, sx - side * 0.5, sy - side * 0.5, side, side);
  } else {
    ctx.fillStyle = 'rgba(3, 7, 18, 0.48)';
    ctx.fillRect(sx - coreR, sy - coreR, coreR * 2, coreR * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(info.badge || '?').slice(0, 3), sx, sy + 0.4);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = hexToRgba(baseColor, 0.96);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, coreR + 2.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSkillOrbFx(sx, sy, info, baseColor, nowMs, seed, progress, own) {
  const phase = nowMs / 1000 + seed * 0.41;
  const pulse = 1 + Math.sin(nowMs / 170 + seed) * 0.12;
  const auraR = own ? 27 * pulse : 21 * pulse;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(sx, sy, 4, sx, sy, auraR);
  aura.addColorStop(0, hexToRgba(baseColor, own ? 0.42 : 0.2));
  aura.addColorStop(0.55, hexToRgba(baseColor, own ? 0.22 : 0.12));
  aura.addColorStop(1, hexToRgba(baseColor, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(sx, sy, auraR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexToRgba(baseColor, own ? 0.8 : 0.42);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i += 1) {
    const r = 15.5 + i * 6 + Math.sin(phase * 3 + i) * 1.6;
    const a0 = phase * (i ? -1.35 : 1.2) + i * 1.6;
    const span = Math.PI * (info.fxKind === 'speed' ? 1.05 : 0.72);
    ctx.beginPath();
    ctx.arc(sx, sy, r, a0, a0 + span);
    ctx.stroke();
  }

  const sparks = info.fxKind === 'core' ? 4 : 6;
  for (let i = 0; i < sparks; i += 1) {
    const a = phase * (info.fxKind === 'void' ? -1.7 : 1.9) + (i / sparks) * Math.PI * 2;
    const inner = 13 + (i % 2) * 2;
    const outer = 21 + ((i + seed) % 3) * 2;
    const mx = sx + Math.cos(a + 0.18) * ((inner + outer) * 0.5);
    const my = sy + Math.sin(a - 0.12) * ((inner + outer) * 0.5);
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * inner, sy + Math.sin(a) * inner);
    if (info.fxKind === 'electric') {
      ctx.lineTo(mx + Math.sin(phase * 8 + i) * 4, my + Math.cos(phase * 7 + i) * 4);
    } else if (info.fxKind === 'support') {
      ctx.quadraticCurveTo(mx, my - 7, sx + Math.cos(a + 0.28) * outer, sy + Math.sin(a + 0.28) * outer);
    } else {
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(sx + Math.cos(a + 0.06) * outer, sy + Math.sin(a + 0.06) * outer);
    ctx.stroke();
  }

  if (info.fxKind === 'weapon') {
    ctx.strokeStyle = hexToRgba('#ffffff', own ? 0.68 : 0.32);
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const a = -0.6 + i * 0.18 + Math.sin(phase * 4 + i) * 0.04;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * 12, sy + Math.sin(a) * 12);
      ctx.lineTo(sx + Math.cos(a) * 24, sy + Math.sin(a) * 24);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = progress < 0.24 ? '#f87171' : hexToRgba(baseColor, own ? 0.86 : 0.46);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, 18.5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
  ctx.stroke();
  ctx.restore();
}

function drawSkillOfferOrbs(orbs, nowMs) {
  if (!Array.isArray(orbs)) return;
  for (const orb of orbs) {
    if (!isVisibleWorld(orb.x, orb.y, 80)) continue;
    const own = orb.ownerId === game.myId;
    const info = skillOrbDisplayData(orb.skillId);
    const baseColor = own ? info.color : '#9ca3af';
    const ttlMs = Math.max(0, Number(orb.ttlMs) || 0);
    const ttlMaxMs = Math.max(1, Number(orb.ttlMaxMs) || 15000);
    const sx = orb.x - camera.x;
    const sy = orb.y - camera.y;
    const seed = Number(orb.id) || 0;
    const pulse = 1 + Math.sin((nowMs / 170) + seed) * 0.12;
    const progress = Math.max(0, Math.min(1, ttlMs / ttlMaxMs));
    ctx.save();
    if (!own) ctx.globalAlpha = 0.52;
    drawSkillOrbFx(sx, sy, info, baseColor, nowMs, seed, progress, own);
    drawSkillOrbCore(info, sx, sy, baseColor, pulse);
    const label = info.name;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(7, 12, 20, 0.88)';
    ctx.lineWidth = 3;
    ctx.strokeText(label, sx, sy - 22);
    ctx.fillStyle = own ? baseColor : '#cbd5e1';
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
  const lodLevel = getRenderLoadLevel();
  for (let i = 0; i < visuals.bloodPuddles.length; i += 1) {
    if (lodLevel >= 2 && (i % 2) !== 0) continue;
    const p = visuals.bloodPuddles[i];
    if (!isVisibleWorld(p.x, p.y, 34)) continue;
    const a = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(120, 10, 18, ${(a * 0.6).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(p.x - camera.x, p.y - camera.y, p.r, p.r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getExplosionScarPalette(material) {
  const key = String(material || 'asphalt_wet').toLowerCase();
  if (key === 'grass') {
    return {
      rim: 'rgba(103, 78, 42, 0.7)',
      core0: 'rgba(7, 10, 7, 0.84)',
      core1: 'rgba(48, 33, 19, 0.62)',
      soot: 'rgba(12, 15, 10, 0.42)',
      crack: 'rgba(12, 11, 8, 0.5)',
      chips: ['#5b4a2c', '#6f5d34', '#2f4a25', '#1f351d'],
      glint: 'rgba(118, 142, 62, 0.38)',
    };
  }
  if (key === 'dirt') {
    return {
      rim: 'rgba(128, 82, 44, 0.72)',
      core0: 'rgba(17, 10, 7, 0.86)',
      core1: 'rgba(76, 45, 24, 0.62)',
      soot: 'rgba(20, 12, 8, 0.42)',
      crack: 'rgba(24, 15, 10, 0.5)',
      chips: ['#7a5230', '#5b3a24', '#8b6a3c', '#3b271b'],
      glint: 'rgba(180, 129, 72, 0.34)',
    };
  }
  if (key === 'concrete' || key === 'concrete_tiles') {
    return {
      rim: 'rgba(134, 145, 158, 0.58)',
      core0: 'rgba(18, 22, 26, 0.84)',
      core1: 'rgba(66, 74, 84, 0.56)',
      soot: 'rgba(15, 19, 25, 0.36)',
      crack: 'rgba(18, 22, 28, 0.5)',
      chips: ['#aeb6bf', '#7b8794', '#5f6b76', '#d1d5db'],
      glint: 'rgba(226, 232, 240, 0.34)',
    };
  }
  if (key === 'toxic') {
    return {
      rim: 'rgba(90, 113, 34, 0.62)',
      core0: 'rgba(7, 11, 6, 0.82)',
      core1: 'rgba(48, 72, 17, 0.62)',
      soot: 'rgba(9, 18, 7, 0.42)',
      crack: 'rgba(10, 18, 6, 0.48)',
      chips: ['#617326', '#a3e635', '#2f451b', '#566b22'],
      glint: 'rgba(190, 242, 100, 0.38)',
    };
  }
  return {
    rim: 'rgba(78, 88, 101, 0.6)',
    core0: 'rgba(5, 8, 12, 0.86)',
    core1: 'rgba(31, 38, 48, 0.6)',
    soot: 'rgba(8, 11, 16, 0.38)',
    crack: 'rgba(5, 8, 12, 0.5)',
    chips: ['#4b5563', '#2f3843', '#697386', '#111827'],
    glint: 'rgba(203, 213, 225, 0.28)',
  };
}

function drawExplosionScarPath(points, fallbackRadius = 24, g = ctx) {
  const list = Array.isArray(points) ? points : [];
  const count = list.length;
  g.beginPath();
  if (count <= 0) {
    g.arc(0, 0, fallbackRadius, 0, Math.PI * 2);
    return;
  }
  for (let i = 0; i < count; i += 1) {
    const p = list[i];
    const a = Number(p?.a) || 0;
    const r = Math.max(1, Number(p?.r) || fallbackRadius);
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

function buildExplosionScarStamp(scar) {
  if (scar?.stamp?.canvas) return scar.stamp;
  const r = Math.max(8, Number(scar?.r) || 28);
  const halfW = Math.ceil(r * 1.78);
  const halfH = Math.ceil(r * 1.28);
  const c = document.createElement('canvas');
  c.width = Math.max(32, halfW * 2);
  c.height = Math.max(24, halfH * 2);
  c.__cwWebglVersion = 1;
  c.__cwWebglLinear = true;
  const g = c.getContext('2d');
  if (!g) return null;
  const palette = getExplosionScarPalette(scar.material);
  g.translate(halfW, halfH);
  g.rotate(Number(scar.rot) || 0);
  g.scale(1, 0.72);

  const soot = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.28);
  soot.addColorStop(0, palette.soot);
  soot.addColorStop(0.4, 'rgba(9, 12, 17, 0.28)');
  soot.addColorStop(0.78, 'rgba(0, 0, 0, 0.12)');
  soot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = soot;
  g.beginPath();
  g.arc(0, 0, r * 1.28, 0, Math.PI * 2);
  g.fill();

  drawExplosionScarPath(scar.outer, r, g);
  g.fillStyle = palette.rim;
  g.fill();

  g.save();
  drawExplosionScarPath(scar.outer, r, g);
  g.clip();
  const torn = g.createRadialGradient(-r * 0.18, -r * 0.18, r * 0.1, 0, 0, r * 1.02);
  torn.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  torn.addColorStop(0.24, 'rgba(0, 0, 0, 0)');
  torn.addColorStop(0.58, 'rgba(0, 0, 0, 0.18)');
  torn.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  g.fillStyle = torn;
  g.fillRect(-r * 1.25, -r * 1.25, r * 2.5, r * 2.5);

  const speckles = Math.max(22, Math.min(72, Math.round(r * 1.15)));
  for (let i = 0; i < speckles; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * r * 0.96;
    const px = Math.cos(a) * d;
    const py = Math.sin(a) * d;
    const s = Math.max(0.8, r * (0.012 + Math.random() * 0.018));
    g.globalAlpha = 0.08 + Math.random() * 0.18;
    g.fillStyle = Math.random() > 0.45 ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.62)';
    g.beginPath();
    g.ellipse(px, py, s * (1.2 + Math.random()), s * 0.55, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  g.restore();

  const pit = g.createRadialGradient(-r * 0.08, -r * 0.12, r * 0.03, 0, 0, r * 0.82);
  pit.addColorStop(0, 'rgba(0, 0, 0, 0.86)');
  pit.addColorStop(0.34, palette.core0);
  pit.addColorStop(0.66, palette.core1);
  pit.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = pit;
  drawExplosionScarPath(scar.inner, r * 0.52, g);
  g.fill();

  g.fillStyle = 'rgba(0, 0, 0, 0.66)';
  g.beginPath();
  g.ellipse(-r * 0.07, -r * 0.08, r * 0.24, r * 0.17, -0.12, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = palette.glint;
  g.globalAlpha = 0.42;
  g.lineWidth = Math.max(1.4, r * 0.035);
  g.beginPath();
  g.arc(-r * 0.06, -r * 0.07, r * 0.36, Math.PI * 1.08, Math.PI * 1.78);
  g.stroke();
  g.globalAlpha = 1;

  g.strokeStyle = palette.crack;
  g.lineCap = 'round';
  for (const crack of Array.isArray(scar.cracks) ? scar.cracks : []) {
    const a = Number(crack?.a) || 0;
    const start = Math.max(1, Number(crack?.start) || r * 0.45);
    const end = Math.max(start + 2, Number(crack?.end) || r);
    const bend = Number(crack?.bend) || 0;
    const mid = (start + end) * 0.5;
    g.globalAlpha = 0.72;
    g.lineWidth = Math.max(0.8, Number(crack?.width) || 1);
    g.beginPath();
    g.moveTo(Math.cos(a) * start, Math.sin(a) * start);
    g.quadraticCurveTo(
      Math.cos(a + bend) * mid,
      Math.sin(a + bend) * mid,
      Math.cos(a + bend * 0.45) * end,
      Math.sin(a + bend * 0.45) * end,
    );
    g.stroke();
  }
  g.globalAlpha = 1;

  const chips = Array.isArray(scar.chips) ? scar.chips : [];
  for (let i = 0; i < chips.length; i += 1) {
    const chip = chips[i];
    const chipAlpha = Math.max(0, Math.min(1, Number(chip?.alpha) || 0.45));
    if (chipAlpha <= 0.02) continue;
    const a = Number(chip?.a) || 0;
    const d = Number(chip?.d) || r;
    const w = Math.max(1, Number(chip?.w) || 3);
    const h = Math.max(0.7, Number(chip?.h) || 1.5);
    const chipColor = palette.chips[i % palette.chips.length] || '#64748b';
    g.save();
    g.translate(Math.cos(a) * d, Math.sin(a) * d);
    g.rotate((Number(chip?.rot) || 0) + a * 0.3);
    g.globalAlpha = chipAlpha;
    g.fillStyle = chipColor;
    g.fillRect(-w * 0.5, -h * 0.5, w, h);
    if (i % 3 === 0) {
      g.globalAlpha = chipAlpha * 0.62;
      g.fillStyle = palette.glint;
      g.fillRect(-w * 0.36, -h * 0.4, w * 0.5, Math.max(0.5, h * 0.42));
    }
    g.restore();
  }

  scar.stamp = { canvas: c, halfW, halfH };
  return scar.stamp;
}

function drawExplosionScars() {
  if (!Array.isArray(visuals.explosionScars)) return;
  for (const scar of visuals.explosionScars) {
    const x = Number(scar?.x) || 0;
    const y = Number(scar?.y) || 0;
    const r = Math.max(8, Number(scar?.r) || 28);
    if (!isVisibleWorld(x, y, r * 1.9 + 24)) continue;
    const ttl = Math.max(0.001, Number(scar?.ttl) || 1);
    const life = Math.max(0, Number(scar?.life) || 0);
    const age = Math.max(0, ttl - life);
    const fadeIn = Math.min(1, age * 4.2);
    const fadeOut = Math.min(1, life / 8);
    const alpha = Math.max(0, Math.min(1, fadeIn * fadeOut));
    if (alpha <= 0.01) continue;
    const stamp = buildExplosionScarStamp(scar);
    if (!stamp?.canvas) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(stamp.canvas, x - camera.x - stamp.halfW, y - camera.y - stamp.halfH);
    ctx.restore();
  }
}

function getExplosionScarAlpha(scar) {
  const ttl = Math.max(0.001, Number(scar?.ttl) || 1);
  const life = Math.max(0, Number(scar?.life) || 0);
  const age = Math.max(0, ttl - life);
  const fadeIn = Math.min(1, age * 4.2);
  const fadeOut = Math.min(1, life / 8);
  return Math.max(0, Math.min(1, fadeIn * fadeOut));
}

function buildGroundFragmentStamp(frag) {
  if (frag?.stamp?.canvas) return frag.stamp;
  const size = Math.max(1.5, Number(frag?.size) || 4);
  const pad = Math.ceil(size * 1.7);
  const c = document.createElement('canvas');
  c.width = Math.max(12, pad * 2);
  c.height = Math.max(12, pad * 2);
  c.__cwWebglVersion = 1;
  c.__cwWebglLinear = true;
  const g = c.getContext('2d');
  if (!g) return null;
  g.translate(pad, pad);
  g.rotate(Number(frag.rot) || 0);

  const base = frag.color || '#94a3b8';
  g.fillStyle = base;
  g.beginPath();
  g.moveTo(size * 0.95, -size * 0.2);
  g.lineTo(size * 0.24, size * 0.66);
  g.lineTo(-size * 0.9, size * 0.32);
  g.lineTo(-size * 0.58, -size * 0.56);
  g.closePath();
  g.fill();

  g.globalAlpha = 0.34;
  g.fillStyle = 'rgba(255, 255, 255, 0.9)';
  g.beginPath();
  g.moveTo(-size * 0.56, -size * 0.48);
  g.lineTo(size * 0.8, -size * 0.17);
  g.lineTo(size * 0.14, size * 0.12);
  g.closePath();
  g.fill();

  g.globalAlpha = 0.22;
  g.fillStyle = 'rgba(0, 0, 0, 0.8)';
  g.beginPath();
  g.moveTo(size * 0.2, size * 0.1);
  g.lineTo(size * 0.26, size * 0.64);
  g.lineTo(-size * 0.84, size * 0.3);
  g.closePath();
  g.fill();

  frag.stamp = { canvas: c, halfW: pad, halfH: pad };
  return frag.stamp;
}

function getGroundDecalsForRender() {
  const out = renderScratch.groundDecals;
  out.length = 0;
  if (Array.isArray(visuals.explosionScars)) {
    for (const scar of visuals.explosionScars) {
      const x = Number(scar?.x) || 0;
      const y = Number(scar?.y) || 0;
      const r = Math.max(8, Number(scar?.r) || 28);
      if (!isVisibleWorld(x, y, r * 1.9 + 24)) continue;
      const alpha = getExplosionScarAlpha(scar);
      if (alpha <= 0.01) continue;
      const stamp = buildExplosionScarStamp(scar);
      if (!stamp?.canvas) continue;
      out.push({ canvas: stamp.canvas, x, y, halfW: stamp.halfW, halfH: stamp.halfH, alpha });
    }
  }
  if (Array.isArray(visuals.groundFragments)) {
    for (const frag of visuals.groundFragments) {
      const x = Number(frag?.x) || 0;
      const y = Number(frag?.y) || 0;
      const size = Math.max(1.5, Number(frag?.size) || 4);
      if (!isVisibleWorld(x, y, size + 14)) continue;
      const lifeRatio = Math.max(0, Math.min(1, (Number(frag?.life) || 0) / Math.max(0.001, Number(frag?.ttl) || 1)));
      const alpha = Math.min(1, lifeRatio * (Number(frag.alpha) || 0.82));
      if (alpha <= 0.01) continue;
      const stamp = buildGroundFragmentStamp(frag);
      if (!stamp?.canvas) continue;
      out.push({ canvas: stamp.canvas, x, y, halfW: stamp.halfW, halfH: stamp.halfH, alpha });
    }
  }
  return out;
}

function drawGroundFragments() {
  if (!Array.isArray(visuals.groundFragments)) return;
  for (const frag of visuals.groundFragments) {
    const x = Number(frag?.x) || 0;
    const y = Number(frag?.y) || 0;
    const size = Math.max(1.5, Number(frag?.size) || 4);
    if (!isVisibleWorld(x, y, size + 14)) continue;
    const lifeRatio = Math.max(0, Math.min(1, (Number(frag?.life) || 0) / Math.max(0.001, Number(frag?.ttl) || 1)));
    if (lifeRatio <= 0.01) continue;
    const stamp = buildGroundFragmentStamp(frag);
    if (stamp?.canvas) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, lifeRatio * (Number(frag.alpha) || 0.82));
      ctx.drawImage(stamp.canvas, x - camera.x - stamp.halfW, y - camera.y - stamp.halfH);
      ctx.restore();
      continue;
    }
    const sx = x - camera.x;
    const sy = y - camera.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Number(frag.rot) || 0);
    ctx.globalAlpha = Math.min(1, lifeRatio * (Number(frag.alpha) || 0.82));
    ctx.fillStyle = frag.color || '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(size * 0.9, -size * 0.2);
    ctx.lineTo(size * 0.24, size * 0.62);
    ctx.lineTo(-size * 0.82, size * 0.34);
    ctx.lineTo(-size * 0.56, -size * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = Math.min(1, lifeRatio * 0.32);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fillRect(-size * 0.36, -size * 0.32, size * 0.54, Math.max(0.7, size * 0.16));
    ctx.restore();
  }
}

function drawGroundDebrisFx() {
  if (!Array.isArray(visuals.groundDebris)) return;
  for (const d of visuals.groundDebris) {
    const x = Number(d?.x) || 0;
    const y = Number(d?.y) || 0;
    const z = Math.max(0, Number(d?.z) || 0);
    const radius = d.kind === 'dust' ? Math.max(8, Number(d?.r) || 12) : Math.max(8, Number(d?.size) || 4) + z * 0.08;
    if (!isVisibleWorld(x, y, radius + z + 28)) continue;
    const lifeRatio = Math.max(0, Math.min(1, (Number(d?.life) || 0) / Math.max(0.001, Number(d?.ttl) || 1)));
    if (lifeRatio <= 0.01) continue;
    const sx = x - camera.x;
    const groundY = y - camera.y;
    const sy = groundY - z;

    if (d.kind === 'dust') {
      const r = Math.max(2, Number(d.r) || 8);
      ctx.save();
      ctx.globalAlpha = lifeRatio * 0.34;
      ctx.fillStyle = hexToRgba(d.color || '#94a3b8', 0.8);
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 1.25, r * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    const size = Math.max(1.8, Number(d.size) || 4);
    if (game.shadowsEnabled && z > 2) {
      const shadowAlpha = Math.max(0.05, Math.min(0.22, lifeRatio * (1 - Math.min(0.8, z / 260))));
      drawShadowAtScreen(sx, groundY + 2, size * (1.7 + z * 0.01), size * 0.65, shadowAlpha);
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Number(d.rot) || 0);
    ctx.globalAlpha = Math.min(1, lifeRatio * 1.08);
    ctx.fillStyle = d.color || '#64748b';
    ctx.beginPath();
    ctx.moveTo(size * 1.05, -size * 0.2);
    ctx.lineTo(size * 0.28, size * 0.7);
    ctx.lineTo(-size * 0.92, size * 0.36);
    ctx.lineTo(-size * 0.64, -size * 0.58);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = Math.min(1, lifeRatio * 0.42);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.beginPath();
    ctx.moveTo(-size * 0.58, -size * 0.5);
    ctx.lineTo(size * 0.88, -size * 0.18);
    ctx.lineTo(size * 0.16, size * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = Math.min(1, lifeRatio * 0.26);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.beginPath();
    ctx.moveTo(size * 0.15, size * 0.1);
    ctx.lineTo(size * 0.28, size * 0.68);
    ctx.lineTo(-size * 0.88, size * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawConsumableProjectilesFx() {
  if (!Array.isArray(visuals.consumableProjectiles)) return;
  for (const p of visuals.consumableProjectiles) {
    if ((Number(p.delay) || 0) > 0) continue;
    const ttl = Math.max(0.001, Number(p.ttl) || 0.3);
    const lifeRatio = Math.max(0, Math.min(1, (Number(p.life) || 0) / ttl));
    if (lifeRatio <= 0.01) continue;
    const progress = Math.max(0, Math.min(1, 1 - lifeRatio));
    const fromX = Number(p.fromX) || 0;
    const fromY = Number(p.fromY) || 0;
    const toX = Number(p.toX) || 0;
    const toY = Number(p.toY) || 0;
    const color = p.color || '#fca5a5';
    const radius = Math.max(42, Math.min(260, Number(p.radius) || 86));

    if (p.kind === 'beam') {
      if (!isVisibleWorld(toX, toY, radius + 96) && !isVisibleWorld((fromX + toX) * 0.5, (fromY + toY) * 0.5, 180)) continue;
      const sx1 = fromX - camera.x;
      const sy1 = fromY - camera.y;
      const sx2 = toX - camera.x;
      const sy2 = toY - camera.y;
      const alpha = Math.min(1, lifeRatio * 1.35);
      const pulse = 0.84 + Math.sin(performance.now() / 34) * 0.16;
      const beamWidth = Math.max(9, Math.min(32, radius * 0.15)) * pulse;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexToRgba(color, alpha * 0.22);
      ctx.lineWidth = beamWidth * 2.4;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(color, alpha * 0.82);
      ctx.lineWidth = beamWidth;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.9).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.5, beamWidth * 0.22);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      const ringR = Math.max(18, radius * (0.28 + progress * 0.18));
      ctx.strokeStyle = hexToRgba(color, alpha * 0.85);
      ctx.lineWidth = 2.2 + progress * 2;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -performance.now() / 28;
      ctx.beginPath();
      ctx.arc(sx2, sy2, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const glow = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, Math.max(1, radius * 0.55));
      glow.addColorStop(0, `rgba(255,255,255,${(alpha * 0.32).toFixed(3)})`);
      glow.addColorStop(0.34, hexToRgba(color, alpha * 0.28));
      glow.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx2, sy2, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    const eased = 1 - Math.pow(1 - progress, 2.4);
    const x = fromX + (toX - fromX) * eased;
    const y = fromY + (toY - fromY) * eased;
    const lift = Math.sin(Math.PI * eased) * (Number(p.arc) || 68);
    if (!isVisibleWorld(x, y, radius * 0.4 + lift + 34)) continue;
    const prevT = Math.max(0, eased - 0.16);
    const tx = fromX + (toX - fromX) * prevT;
    const ty = fromY + (toY - fromY) * prevT - Math.sin(Math.PI * prevT) * (Number(p.arc) || 68);
    const sx = x - camera.x;
    const sy = y - camera.y - lift;

    if (game.shadowsEnabled) {
      drawShadowAtScreen(x - camera.x, y - camera.y + 3, 10 + radius * 0.04, 4 + radius * 0.018, 0.22 * lifeRatio);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = hexToRgba(color, lifeRatio * 0.5);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tx - camera.x, ty - camera.y);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    const orbR = Math.max(5, Math.min(13, radius * 0.085));
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, orbR * 3.8);
    glow.addColorStop(0, `rgba(255,255,255,${(lifeRatio * 0.82).toFixed(3)})`);
    glow.addColorStop(0.25, hexToRgba(color, lifeRatio * 0.72));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, orbR * 3.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, orbR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${(lifeRatio * 0.85).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx - orbR * 0.28, sy - orbR * 0.34, Math.max(1.5, orbR * 0.32), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawConsumableAuraFx() {
  if (!Array.isArray(visuals.consumableAuras)) return;
  for (const aura of visuals.consumableAuras) {
    const ttl = Math.max(0.001, Number(aura.ttl) || 1);
    const alpha = Math.max(0, Math.min(1, (Number(aura.life) || 0) / ttl));
    if (alpha <= 0.01) continue;
    const x = Number(aura.x) || 0;
    const y = Number(aura.y) || 0;
    const radius = Math.max(34, Math.min(140, Number(aura.radius) || 82));
    if (!isVisibleWorld(x, y, radius + 24)) continue;
    const sx = x - camera.x;
    const sy = y - camera.y;
    const color = aura.color || '#86efac';
    const spin = Number(aura.spin) || 0;
    const pulse = 0.86 + Math.sin(performance.now() / 110 + spin) * 0.14;
    const outerR = radius * pulse;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, outerR);
    glow.addColorStop(0, `rgba(255,255,255,${(alpha * 0.12).toFixed(3)})`);
    glow.addColorStop(0.34, hexToRgba(color, alpha * 0.2));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexToRgba(color, alpha * 0.82);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(sx, sy, radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([11, 9]);
    ctx.lineDashOffset = -spin * 16;
    ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.48).toFixed(3)})`;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(sx, sy, radius * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = hexToRgba(color, alpha * 0.68);
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 6; i += 1) {
      const angle = spin + (Math.PI * 2 * i) / 6;
      const innerR = radius * 0.28;
      const outerSegR = radius * 0.5;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(angle) * innerR, sy + Math.sin(angle) * innerR);
      ctx.lineTo(sx + Math.cos(angle) * outerSegR, sy + Math.sin(angle) * outerSegR);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawMeleeSwingsFx() {
  if (!Array.isArray(visuals.meleeSwings)) return;
  for (const s of visuals.meleeSwings) {
    const ttl = Math.max(0.001, Number(s.ttl) || 0.3);
    const alpha = Math.max(0, Math.min(1, (Number(s.life) || 0) / ttl));
    if (alpha <= 0.01) continue;
    const progress = Math.max(0, Math.min(1, 1 - alpha));
    const x = Number(s.x) || 0;
    const y = Number(s.y) || 0;
    const impactX = Number(s.impactX) || x;
    const impactY = Number(s.impactY) || y;
    const range = Math.max(28, Number(s.range) || 100);
    const width = Math.max(18, Number(s.width) || 52);
    if (!isVisibleWorld(x, y, range + width + 36) && !isVisibleWorld(impactX, impactY, width + 84)) continue;

    const sx = x - camera.x;
    const sy = y - camera.y;
    const ix = impactX - camera.x;
    const iy = impactY - camera.y;
    const angle = Number(s.angle) || 0;
    const style = String(s.style || 'sword').toLowerCase();
    const color = s.color || '#fda4af';
    const secondaryColor = s.secondaryColor || '#ffffff';
    const pulse = 0.84 + Math.sin(performance.now() / 32 + (Number(s.phase) || 0)) * 0.16;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (style === 'hammer') {
      const handleX = sx + Math.cos(angle) * range * 0.34;
      const handleY = sy + Math.sin(angle) * range * 0.34;
      const ringR = Math.max(18, width * (0.34 + progress * 0.44));
      ctx.globalAlpha = Math.min(1, alpha * 0.58);
      ctx.strokeStyle = hexToRgba(secondaryColor, 0.74);
      ctx.lineWidth = Math.max(10, width * 0.12);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(handleX, handleY);
      ctx.lineTo(ix, iy);
      ctx.stroke();

      ctx.globalAlpha = Math.min(1, alpha * 0.86);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(4, width * 0.045);
      ctx.beginPath();
      ctx.arc(ix, iy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = hexToRgba(secondaryColor, alpha * 0.82);
      for (let i = 0; i < 7; i += 1) {
        const crack = angle + Math.PI + (i - 3) * 0.34;
        const inner = ringR * 0.36;
        const outer = ringR * (0.9 + (i % 2) * 0.28);
        ctx.lineWidth = 1.4 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(crack) * inner, iy + Math.sin(crack) * inner);
        ctx.lineTo(ix + Math.cos(crack) * outer, iy + Math.sin(crack) * outer);
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    if (style === 'whip') {
      const wave = Math.sin(progress * Math.PI) * width * 0.58;
      const midX = sx + Math.cos(angle) * range * 0.52 + Math.cos(angle + Math.PI / 2) * wave;
      const midY = sy + Math.sin(angle) * range * 0.52 + Math.sin(angle + Math.PI / 2) * wave;
      const endX = sx + Math.cos(angle) * range;
      const endY = sy + Math.sin(angle) * range;
      ctx.globalAlpha = Math.min(1, alpha * 0.34);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(10, width * 0.32);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = Math.max(1.6, width * 0.08);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const halfArc = Math.max(0.16, Math.min(Math.PI, (Number(s.arcDeg) || 90) * Math.PI / 360));
    const radius = range * (0.58 + progress * 0.34);
    const start = angle - halfArc;
    const end = angle + halfArc;
    const glowWidth = Math.max(12, width * (style === 'chainsaw' ? 0.34 : 0.24)) * pulse;

    ctx.globalAlpha = Math.min(1, alpha * 0.22);
    const glow = ctx.createRadialGradient(sx, sy, Math.max(4, radius * 0.28), sx, sy, range + width);
    glow.addColorStop(0, hexToRgba(color, 0));
    glow.addColorStop(0.5, hexToRgba(color, 0.18));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, range + width * 0.24, start, end);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = Math.min(1, alpha * 0.82);
    ctx.strokeStyle = color;
    ctx.lineWidth = glowWidth;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, start, end);
    ctx.stroke();

    ctx.globalAlpha = Math.min(1, alpha * 0.95);
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = Math.max(1.8, glowWidth * 0.24);
    ctx.beginPath();
    ctx.arc(sx, sy, radius + glowWidth * 0.18, start + 0.04, end - 0.04);
    ctx.stroke();

    if (style === 'chainsaw') {
      ctx.globalAlpha = Math.min(1, alpha * 0.9);
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i += 1) {
        const t = i / 8;
        const a = start + (end - start) * t + Math.sin(performance.now() / 22 + i) * 0.03;
        const r1 = radius - glowWidth * 0.48;
        const r2 = radius + glowWidth * 0.46;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
        ctx.lineTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2);
        ctx.stroke();
      }
    } else if (style === 'bat' || style === 'baton') {
      ctx.globalAlpha = Math.min(1, alpha * 0.72);
      ctx.strokeStyle = style === 'baton' ? '#f8fafc' : '#fed7aa';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 5; i += 1) {
        const sparkAngle = angle + (i - 2) * 0.22;
        const sparkR = range * (0.72 + i * 0.035);
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(sparkAngle) * sparkR, sy + Math.sin(sparkAngle) * sparkR);
        ctx.lineTo(sx + Math.cos(sparkAngle) * (sparkR + 14), sy + Math.sin(sparkAngle) * (sparkR + 14));
        ctx.stroke();
      }
    } else if (style === 'cryo') {
      ctx.globalAlpha = Math.min(1, alpha * 0.72);
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 6; i += 1) {
        const shardAngle = start + (end - start) * (i / 5);
        const shardR = radius + 8 + (i % 2) * 8;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(shardAngle) * (shardR - 12), sy + Math.sin(shardAngle) * (shardR - 12));
        ctx.lineTo(sx + Math.cos(shardAngle) * (shardR + 8), sy + Math.sin(shardAngle) * (shardR + 8));
        ctx.stroke();
      }
    } else if (style === 'glaive' || style === 'scythe') {
      ctx.globalAlpha = Math.min(1, alpha * 0.38);
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = Math.max(5, glowWidth * 0.42);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(4, radius - glowWidth * 0.5), start + 0.1, end - 0.1);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawFx() {
  const lodLevel = getRenderLoadLevel();
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

  for (let i = 0; i < visuals.bloodMist.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'minor', lodLevel)) continue;
    const m = visuals.bloodMist[i];
    if (!isVisibleWorld(m.x, m.y, m.r + 8)) continue;
    const a = Math.max(0, m.life / m.ttl);
    const sx = m.x - camera.x;
    const sy = m.y - camera.y;
    ctx.fillStyle = `rgba(170,18,30,${(a * 0.42).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, m.r * (1 + (1 - a) * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  drawGroundDebrisFx();

  for (let i = 0; i < visuals.rocketSmoke.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'medium', lodLevel)) continue;
    const s = visuals.rocketSmoke[i];
    if (!isVisibleWorld(s.x, s.y, s.r + 16)) continue;
    const a = Math.max(0, s.life / s.ttl);
    ctx.fillStyle = `rgba(148,163,184,${(a * 0.3).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x - camera.x, s.y - camera.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < visuals.rocketFire.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'medium', lodLevel)) continue;
    const f = visuals.rocketFire[i];
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

  for (let i = 0; i < visuals.rocketBlast.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'medium', lodLevel)) continue;
    const p = visuals.rocketBlast[i];
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

  drawConsumableProjectilesFx();
  drawConsumableAuraFx();
  drawMeleeSwingsFx();

  for (let i = 0; i < visuals.skillBursts.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'major', lodLevel)) continue;
    const s = visuals.skillBursts[i];
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

  if (Array.isArray(visuals.xpCharge)) {
    for (const c of visuals.xpCharge) {
      const energy = Math.max(0, Math.min(7, Number(c.energy) || 0));
      const particles = Array.isArray(c.particles) ? c.particles : [];
      if (energy <= 0.02 && particles.length <= 0) continue;
      const radius = 30 + Math.min(54, energy * 8.4);
      if (!isVisibleWorld(c.x, c.y, radius + 34)) continue;
      const a = Math.max(0, Math.min(1, (Number(c.life) || 0) / Math.max(0.001, Number(c.ttl) || 1)));
      const pulseAge = Math.max(0, performance.now() - Math.max(0, Number(c.pulseAt) || 0));
      const pulse = Math.max(0, 1 - pulseAge / 260);
      const sx = c.x - camera.x;
      const sy = c.y - camera.y;
      const coreR = 16 + energy * 3.2 + pulse * 7;
      const ringR = radius + pulse * 18;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, ringR));
      glow.addColorStop(0, `rgba(236, 254, 255, ${(0.24 + energy * 0.025).toFixed(3)})`);
      glow.addColorStop(0.38, `rgba(34, 211, 238, ${(a * 0.22).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, ringR, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = Math.min(1, 0.58 * a + pulse * 0.24);
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.96)';
      ctx.lineWidth = 2.2 + energy * 0.42 + pulse * 2.2;
      ctx.beginPath();
      ctx.arc(sx, sy, ringR * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = Math.min(1, 0.46 * a + pulse * 0.2);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.92)';
      ctx.lineWidth = 1.4 + pulse * 1.2;
      ctx.setLineDash([7 + energy, 9]);
      ctx.lineDashOffset = -(Number(c.spin) || 0) * 12;
      ctx.beginPath();
      ctx.arc(sx, sy, ringR * 0.98, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = Math.min(1, 0.72 * a + pulse * 0.18);
      ctx.fillStyle = 'rgba(236, 254, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(4, coreR * 0.34), 0, Math.PI * 2);
      ctx.fill();

      for (const p of particles) {
        const lifeRatio = Math.max(0, Math.min(1, (Number(p.life) || 0) / Math.max(0.001, Number(p.ttl) || 1)));
        if (lifeRatio <= 0.01) continue;
        const px = sx + Math.cos(p.angle) * p.r;
        const py = sy + Math.sin(p.angle) * p.r;
        const tailR = Math.max(0, Number(p.r) || 0) + 8 + energy * 0.8;
        const tx = sx + Math.cos(p.angle) * tailR;
        const ty = sy + Math.sin(p.angle) * tailR;
        ctx.globalAlpha = Math.min(1, lifeRatio * 0.86);
        ctx.strokeStyle = hexToRgba(p.color || '#67e8f9', 0.82);
        ctx.lineWidth = Math.max(1, Number(p.size) || 2);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.fillStyle = p.color || '#67e8f9';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, (Number(p.size) || 2) * 0.58), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  for (let i = 0; i < visuals.skillArcs.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'major', lodLevel)) continue;
    const a = visuals.skillArcs[i];
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

  for (let i = 0; i < visuals.skillLinks.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'medium', lodLevel)) continue;
    const l = visuals.skillLinks[i];
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

  const skillLabelBudget = lodLevel >= 2 ? 6 : (lodLevel >= 1 ? 12 : Infinity);
  let skillLabelsDrawn = 0;
  for (let i = visuals.skillLabels.length - 1; i >= 0; i -= 1) {
    if (skillLabelsDrawn >= skillLabelBudget) break;
    const t = visuals.skillLabels[i];
    if (!isVisibleWorld(t.x, t.y, 70)) continue;
    skillLabelsDrawn += 1;
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
  for (let i = 0; i < visuals.gore.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'minor', lodLevel)) continue;
    const g = visuals.gore[i];
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

  for (let i = 0; i < visuals.blood.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'minor', lodLevel)) continue;
    const p = visuals.blood[i];
    if (!isVisibleWorld(p.x, p.y, 20)) continue;
    const a = Math.max(0, p.life / p.ttl);
    ctx.fillStyle = `rgba(180,16,28,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  }


  for (let i = 0; i < visuals.dodgeWind.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'minor', lodLevel)) continue;
    const w = visuals.dodgeWind[i];
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

  if (Array.isArray(visuals.forceShield)) {
    for (const s of visuals.forceShield) {
      if (!isVisibleWorld(s.x, s.y, 96)) continue;
      const a = Math.max(0, Math.min(1, (Number(s.life) || 0) / Math.max(0.001, Number(s.ttl) || 1)));
      if (a <= 0.01) continue;
      const sx = s.x - camera.x;
      const sy = s.y - camera.y;
      const dirX = Number(s.dirX) || 0;
      const dirY = Number(s.dirY) || -1;
      const angle = Math.atan2(dirY, dirX);
      const radius = Math.max(18, Number(s.radius) || 42);
      const arcWidth = s.broken ? 1.5 : 1.18;
      const start = angle - arcWidth;
      const end = angle + arcWidth;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(125, 211, 252, ${(a * 0.92).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.2, Number(s.width) || 5);
      ctx.beginPath();
      ctx.arc(sx, sy, radius, start, end);
      ctx.stroke();

      ctx.strokeStyle = `rgba(191, 219, 254, ${(a * 0.58).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, (Number(s.width) || 5) * 0.38);
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 7, start + 0.08, end - 0.08);
      ctx.stroke();

      const glow = ctx.createRadialGradient(sx, sy, Math.max(4, radius * 0.55), sx, sy, radius + 16);
      glow.addColorStop(0, 'rgba(14, 165, 233, 0)');
      glow.addColorStop(0.62, `rgba(56, 189, 248, ${(a * 0.16).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(147, 197, 253, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, radius + 16, start, end);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < visuals.hitFx.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'minor', lodLevel)) continue;
    const h = visuals.hitFx[i];
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

  if (Array.isArray(visuals.objectImpactFx)) {
    for (let i = 0; i < visuals.objectImpactFx.length; i += 1) {
      if (!shouldDrawRenderLodItem(i, 'medium', lodLevel)) continue;
      const fx = visuals.objectImpactFx[i];
      if (!isVisibleWorld(fx.x, fx.y, 72)) continue;
      const lifeRatio = Math.max(0, Math.min(1, (Number(fx.life) || 0) / Math.max(0.001, Number(fx.ttl) || 1)));
      const sx = fx.x - camera.x;
      const sy = fx.y - camera.y;
      if (fx.kind === 'spark') {
        const vx = Number(fx.vx) || 0;
        const vy = Number(fx.vy) || 0;
        const len = Math.max(3, Number(fx.len) || 10) * (0.5 + lifeRatio * 0.7);
        const angle = Math.atan2(vy, vx);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, lifeRatio * 1.15);
        ctx.strokeStyle = fx.color || '#fde68a';
        ctx.lineWidth = Math.max(1, Number(fx.r) || 1.4);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - Math.cos(angle) * len, sy - Math.sin(angle) * len);
        ctx.stroke();
        ctx.restore();
      } else if (fx.kind === 'smoke') {
        const r = Math.max(2, Number(fx.r) || 6);
        ctx.save();
        ctx.globalAlpha = Math.min(0.48, lifeRatio * 0.42);
        ctx.fillStyle = hexToRgba(fx.color || '#94a3b8', 1);
        ctx.beginPath();
        ctx.ellipse(sx, sy, r * 1.35, r * 0.82, (Number(fx.vx) || 0) * 0.004, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const r = Math.max(3, Number(fx.r) || 10) * (0.35 + (1 - lifeRatio) * 0.9);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.75, lifeRatio * 0.75);
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        glow.addColorStop(0, hexToRgba(fx.color || '#facc15', 0.9));
        glow.addColorStop(1, hexToRgba(fx.color || '#facc15', 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  for (let i = 0; i < visuals.muzzleGroundFlashes.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'medium', lodLevel)) continue;
    const f = visuals.muzzleGroundFlashes[i];
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

  for (let i = 0; i < visuals.muzzle.length; i += 1) {
    if (!shouldDrawRenderLodItem(i, 'minor', lodLevel)) continue;
    const f = visuals.muzzle[i];
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

function buildMinimapStaticSignature(params) {
  const objects = Array.isArray(game.state?.decor?.objects) ? game.state.decor.objects : [];
  let objectVersion = Number(game.state?.decor?.objectsVersion) || 0;
  if (!objectVersion) {
    objectVersion = objects.length;
    for (let i = 0; i < objects.length; i += 1) {
      const obj = objects[i];
      objectVersion += (Number(obj?.destroyedAt) || 0)
        + (obj?.destroyed ? 13 : 0)
        + Math.round(getMapObjectRenderAngle(obj) * 1000)
        + Math.round(Number(obj?.collisionW) || 0)
        + Math.round(Number(obj?.collisionH) || 0);
    }
  }
  return [
    params.w,
    params.h,
    Math.round(params.viewX),
    Math.round(params.viewY),
    Math.round(params.viewW),
    Math.round(params.viewH),
    Math.round(params.worldW),
    Math.round(params.worldH),
    params.dpr,
    objectVersion,
  ].join(':');
}

function getMinimapStaticLayer(params) {
  const state = visuals.minimapRenderState || (visuals.minimapRenderState = {});
  const signature = buildMinimapStaticSignature(params);
  if (state.staticCanvas && state.staticSignature === signature) return state.staticCanvas;

  const c = document.createElement('canvas');
  c.width = params.w;
  c.height = params.h;
  const g = c.getContext('2d');
  if (!g) return null;

  const toMapX = (x) => params.mapX + (Number(x || 0) - params.viewX) * params.sx;
  const toMapY = (y) => params.mapY + (Number(y || 0) - params.viewY) * params.sy;
  const isVisibleInMini = (x, y, margin = 0) => Number(x || 0) >= (params.viewX - margin)
    && Number(x || 0) <= (params.viewX + params.viewW + margin)
    && Number(y || 0) >= (params.viewY - margin)
    && Number(y || 0) <= (params.viewY + params.viewH + margin);

  const bg = g.createLinearGradient(0, 0, 0, params.h);
  bg.addColorStop(0, 'rgba(11, 18, 28, 0.96)');
  bg.addColorStop(1, 'rgba(5, 9, 15, 0.96)');
  g.fillStyle = bg;
  g.fillRect(0, 0, params.w, params.h);

  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = Math.max(1, params.dpr);
  g.strokeRect(params.mapX, params.mapY, params.mapW, params.mapH);

  g.fillStyle = 'rgba(34, 197, 94, 0.06)';
  g.fillRect(params.mapX, params.mapY, params.mapW, params.mapH);
  g.save();
  g.beginPath();
  g.rect(params.mapX, params.mapY, params.mapW, params.mapH);
  g.clip();

  const miniTileWorld = Math.max(180, Math.round(Math.min(params.worldW, params.worldH) / 18));
  const tileStartX = Math.floor(params.viewX / miniTileWorld) - 1;
  const tileEndX = Math.ceil((params.viewX + params.viewW) / miniTileWorld) + 1;
  const tileStartY = Math.floor(params.viewY / miniTileWorld) - 1;
  const tileEndY = Math.ceil((params.viewY + params.viewH) / miniTileWorld) + 1;
  const tileStroke = 'rgba(255,255,255,0.04)';

  for (let tx = tileStartX; tx <= tileEndX; tx += 1) {
    for (let ty = tileStartY; ty <= tileEndY; ty += 1) {
      const worldTileX = tx * miniTileWorld;
      const worldTileY = ty * miniTileWorld;
      const tileScreenX = toMapX(worldTileX);
      const tileScreenY = toMapY(worldTileY);
      const tileScreenW = miniTileWorld * params.sx;
      const tileScreenH = miniTileWorld * params.sy;
      const evenTile = ((tx + ty) & 1) === 0;
      g.fillStyle = evenTile ? 'rgba(74, 222, 128, 0.065)' : 'rgba(15, 118, 110, 0.075)';
      g.fillRect(tileScreenX, tileScreenY, tileScreenW, tileScreenH);
      g.strokeStyle = tileStroke;
      g.lineWidth = Math.max(1, params.dpr * 0.7);
      g.strokeRect(tileScreenX, tileScreenY, tileScreenW, tileScreenH);
    }
  }
  g.restore();

  const drawMiniObjectPolygon = (points) => {
    if (!Array.isArray(points) || points.length < 3) return false;
    g.beginPath();
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const sx = toMapX(point.x);
      const sy = toMapY(point.y);
      if (i === 0) g.moveTo(sx, sy);
      else g.lineTo(sx, sy);
    }
    g.closePath();
    g.fill();
    return true;
  };

  for (const obj of game.state.decor?.objects || []) {
    if (obj?.destroyed && obj?.hideAfterDestroyed) continue;
    if (!isVisibleInMini(obj.x, obj.y, Math.max(Number(obj.w) || 0, Number(obj.h) || 0))) continue;
    const geometry = getMapObjectGeometry(obj);
    const polygon = geometry?.polygon;
    const rectW = Math.max(2, (Number(obj.collisionW) || Number(obj.w) || 20) * params.sx);
    const rectH = Math.max(2, (Number(obj.collisionH) || Number(obj.h) || 20) * params.sy);
    g.fillStyle = obj.destroyed ? 'rgba(120, 113, 108, 0.55)' : 'rgba(226, 232, 240, 0.4)';
    if (polygon && polygon.length >= 3) {
      drawMiniObjectPolygon(polygon);
    } else {
      g.save();
      g.translate(toMapX(obj.x), toMapY(obj.y));
      g.fillRect(-rectW * 0.5, -rectH * 0.5, rectW, rectH);
      g.restore();
    }
  }

  state.staticSignature = signature;
  state.staticCanvas = c;
  return c;
}

function drawMinimap() {
  if (!minimapCanvasEl || !minimapCtx || !game.showMinimapEnabled || !game.state) return;
  const cssWidth = Math.max(96, Math.round(minimapCanvasEl.clientWidth || 0));
  const cssHeight = Math.max(96, Math.round(minimapCanvasEl.clientHeight || 0));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const targetWidth = Math.max(96, Math.round(cssWidth * dpr));
  const targetHeight = Math.max(96, Math.round(cssHeight * dpr));
  const miniState = visuals.minimapRenderState || (visuals.minimapRenderState = { lastAt: 0, width: 0, height: 0 });
  const nowPerf = performance.now();
  const sizeChanged = minimapCanvasEl.width !== targetWidth || minimapCanvasEl.height !== targetHeight;
  if (!sizeChanged && nowPerf - (Number(miniState.lastAt) || 0) < MINIMAP_RENDER_INTERVAL_MS) return;
  miniState.lastAt = nowPerf;
  if (minimapCanvasEl.width !== targetWidth || minimapCanvasEl.height !== targetHeight) {
    minimapCanvasEl.width = targetWidth;
    minimapCanvasEl.height = targetHeight;
    miniState.width = targetWidth;
    miniState.height = targetHeight;
    miniState.staticSignature = '';
    miniState.staticCanvas = null;
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
  const staticLayer = getMinimapStaticLayer({
    w,
    h,
    dpr,
    mapX,
    mapY,
    mapW,
    mapH,
    worldW,
    worldH,
    viewX,
    viewY,
    viewW,
    viewH,
    sx,
    sy,
  });
  if (staticLayer) minimapCtx.drawImage(staticLayer, 0, 0);

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
    dot(enemy.x, enemy.y, isBoss ? Math.max(4.2 * dpr, 3.8) : Math.max(2.2 * dpr, 2), getEnemyRenderColor(enemy));
    if (isBoss) {
      minimapCtx.strokeStyle = 'rgba(254, 202, 202, 0.92)';
      minimapCtx.lineWidth = Math.max(1, dpr);
      minimapCtx.beginPath();
      minimapCtx.arc(toMapX(enemy.x), toMapY(enemy.y), Math.max(6 * dpr, 5.5), 0, Math.PI * 2);
      minimapCtx.stroke();
    }
  }

  const minimapPlayers = Array.isArray(game.state.players) ? game.state.players : [];
  for (const player of minimapPlayers) {
    if (!player || player.id === game.myId || player.alive === false) continue;
    if (!isVisibleInMini(player.x, player.y, 60)) continue;
    const isCompanion = Boolean(player.isCompanion);
    dot(
      player.x,
      player.y,
      isCompanion ? Math.max(2.5 * dpr, 2.2) : Math.max(2.3 * dpr, 2),
      isCompanion ? '#4ade80' : '#a5f3fc',
    );
  }

  if (me && me.alive !== false && isVisibleInMini(me.x, me.y, 60)) {
    const mx = toMapX(me.x);
    const my = toMapY(me.y);
    const coreR = Math.max(3.6 * dpr, 3.2);
    minimapCtx.fillStyle = 'rgba(34, 197, 94, 0.36)';
    minimapCtx.beginPath();
    minimapCtx.arc(mx, my, coreR + Math.max(2.4 * dpr, 2), 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.fillStyle = '#22c55e';
    minimapCtx.beginPath();
    minimapCtx.arc(mx, my, coreR, 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.strokeStyle = 'rgba(220, 252, 231, 0.95)';
    minimapCtx.lineWidth = Math.max(1, dpr * 0.85);
    minimapCtx.beginPath();
    minimapCtx.arc(mx, my, Math.max(1.8, coreR - Math.max(0.8, dpr * 0.35)), 0, Math.PI * 2);
    minimapCtx.stroke();
  }

  minimapCtx.strokeStyle = 'rgba(255,255,255,0.14)';
  minimapCtx.lineWidth = Math.max(1, dpr * 0.9);
  minimapCtx.strokeRect(mapX, mapY, mapW, mapH);
}

function renderWebGLWorldLayer(playersByDepth, t, options = {}) {
  const renderer = globalThis.CWWebGLWorld;
  if (!game.webglWorldEnabled || !renderer?.renderWorld || options.sceneTransformActive) {
    renderer?.clear?.();
    return { used: false, actors: false };
  }
  const actorSpritesReady = Boolean(sprites.enemy?.complete && sprites.enemy.naturalWidth > 0)
    && playersByDepth.every((item) => {
      const p = item?.p;
      if (!p?.alive) return true;
      const variant = getPlayerVariant(p.playerClass || (p.id === game.myId ? selectedPlayerClass : 'cyber'));
      const sprite = sprites.players?.[variant.id];
      return Boolean(sprite?.complete && sprite.naturalWidth > 0);
    });
  const drawActors = actorSpritesReady && localStorage.getItem('cw:webglActorsEnabled') !== '0';
  const sceneTheme = getSceneTheme();
  const used = renderer.renderWorld({
    enabled: true,
    width: canvas.width,
    height: canvas.height,
    camera,
    game,
    sprites,
    shadowsEnabled: game.shadowsEnabled,
    groundChunks: getGroundChunksForRender(),
    groundDecals: getGroundDecalsForRender(),
    mapObjects: game.sortedMapObjects || [],
    groundOverlayEnabled: getQ().overlays,
    groundOverlayAccent: sceneTheme.accent || '#f97316',
    enemies: drawActors ? (game.state.enemies || []) : [],
    playersByDepth: drawActors ? playersByDepth : [],
    t,
    input,
    mobile,
    myId: game.myId,
    selectedPlayerClass,
    replayActive: replayGame.active,
    isVisibleWorld,
    getEnemyRenderPos,
    getMobRenderDef,
    getEnemyRenderColor,
    getTintedEnemyFrame,
    getPlayerVariant,
  });
  return { used: Boolean(used), actors: drawActors && Boolean(used) };
}

function renderWebGLFastFxLayer(projectiles, xpOrbs, nowMs, options = {}) {
  const renderer = globalThis.CWWebGLWorld;
  if (
    !game.webglWorldEnabled
    || !options.webglWorldUsed
    || !renderer?.renderFastFx
    || localStorage.getItem('cw:webglFastFxEnabled') === '0'
  ) {
    return { used: false, projectiles: false, xpOrbs: false };
  }
  return renderer.renderFastFx({
    enabled: true,
    camera,
    projectiles,
    xpOrbs,
    nowMs,
    bulletTracersEnabled: game.bulletTracersEnabled,
  }) || { used: false, projectiles: false, xpOrbs: false };
}

function pushActorOcclusionMarker(out, x, y) {
  const pool = renderScratch.actorOcclusionPool;
  const index = out.length;
  let marker = pool[index];
  if (!marker) {
    marker = { x: 0, y: 0 };
    pool[index] = marker;
  }
  marker.x = x;
  marker.y = y;
  out.push(marker);
}

function pushPlayerDepthItem(out, p, rp) {
  const pool = renderScratch.playersByDepthPool;
  const index = out.length;
  let item = pool[index];
  if (!item) {
    item = { p: null, rp: null };
    pool[index] = item;
  }
  item.p = p;
  item.rp = rp;
  out.push(item);
}

function pushProjectileRenderItem(out, source) {
  const pool = renderScratch.projectileItems;
  const index = renderScratch.energyProjectiles.length + renderScratch.rocketProjectiles.length;
  let item = pool[index];
  if (!item) {
    item = {
      id: '',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: '',
      kind: '',
      radius: 0,
      weaponKey: '',
      ownerId: '',
      ownerPlayerId: '',
      shooterType: '',
    };
    pool[index] = item;
  }
  item.id = source.id || '';
  item.x = source.x;
  item.y = source.y;
  item.vx = source.vx;
  item.vy = source.vy;
  item.color = source.color;
  item.kind = source.kind;
  item.radius = source.radius;
  item.weaponKey = source.weaponKey;
  item.ownerId = source.ownerId;
  item.ownerPlayerId = source.ownerPlayerId;
  item.shooterType = source.shooterType;
  out.push(item);
}

function buildProjectileRenderLists(bullets) {
  const energyProjectiles = renderScratch.energyProjectiles;
  const rocketProjectiles = renderScratch.rocketProjectiles;
  energyProjectiles.length = 0;
  rocketProjectiles.length = 0;
  const projectile = renderScratch.projectile;
  for (const b of Array.isArray(bullets) ? bullets : []) {
    if (b?.replayHidden) continue;
    const rb = getBulletRenderPos(b);
    if (!rb) continue;
    const isRocket = String(rb.kind || b.kind || '').toLowerCase() === 'rocket';
    if (!isVisibleWorld(rb.x, rb.y, isRocket ? 24 : 12)) continue;
    projectile.id = b.id;
    projectile.x = rb.x;
    projectile.y = rb.y;
    projectile.vx = rb.vx ?? b.vx;
    projectile.vy = rb.vy ?? b.vy;
    projectile.color = rb.color || b.color || (isRocket ? '#fb923c' : '#f59e0b');
    projectile.kind = rb.kind || b.kind || 'bullet';
    projectile.radius = rb.radius || b.radius || 3;
    projectile.weaponKey = rb.weaponKey || b.weaponKey || '';
    projectile.ownerId = rb.ownerId || b.ownerId || '';
    projectile.ownerPlayerId = rb.ownerPlayerId || b.ownerPlayerId || '';
    projectile.shooterType = rb.shooterType || b.shooterType || '';
    pushProjectileRenderItem(isRocket ? rocketProjectiles : energyProjectiles, projectile);
  }
  return { energyProjectiles, rocketProjectiles };
}

function buildFastXpOrbRenderList(orbs, nowMs) {
  const out = renderScratch.fastXpOrbs;
  const pool = renderScratch.fastXpOrbItems;
  out.length = 0;
  if (!Array.isArray(orbs)) return out;
  for (const o of orbs) {
    const ro = getXpOrbRenderPos(o);
    if (!isVisibleWorld(ro.x, ro.y, 20)) continue;
    const left = Math.max(0, Number(o.ttlMs) || 0);
    if (left < 3000 && Math.sin(nowMs / 80) < 0) continue;
    const index = out.length;
    let item = pool[index];
    if (!item) {
      item = { x: 0, y: 0, seed: 0 };
      pool[index] = item;
    }
    item.x = ro.x;
    item.y = ro.y;
    item.seed = Number(o.id) || index;
    out.push(item);
  }
  return out;
}

function render(ts) {
  if (isWebRendererDisabled()) return;

  const dt = Math.min(0.05, (ts - lastFrameTs) / 1000);
  lastFrameTs = ts;
  const simDt = replayGame.active ? (dt * Math.max(1, Number(replayGame.speed) || 1)) : dt;
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';

  if (window.cwNativeRendererActive) {
    fpsFrameCount = 0;
    fpsAccumSec = 0;
    renderDiagReset();
    scheduleNextFrame(MENU_IDLE_FRAME_MS);
    return;
  }

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
    const fpsSample = fpsFrameCount / Math.max(0.001, fpsAccumSec);
    renderScratch.renderFpsSample = fpsSample;
    renderScratch.renderFrameMsSample = renderDiag.frames > 0
      ? (Number(renderDiag.totals.frame) || 0) / Math.max(1, renderDiag.frames)
      : 0;
    updateRenderLoadLevel(ts, fpsSample);
    if (fpsCornerEl && game.showFpsEnabled) {
      const fpsText = `FPS: ${Math.round(fpsSample)}`;
      const pingMs = Math.max(0, Math.round(Number(netStats?.rttMs) || 0));
      const pingText = ` | Ping: ${pingMs}ms`;
      fpsCornerEl.textContent = fpsText + pingText + renderDiagBuildText();
    }
    updateNetMetaUi();
    fpsFrameCount = 0;
    fpsAccumSec = 0;
    renderDiagReset();
  }

  let diagStartedAt = renderDiagStart();
  game.sampledNet = isSpectatorSmoothingView() ? sampleBufferedState() : sampleLiveEntityTargets();
  updateFx(simDt);
  updateRenderLoadLevel(ts, renderScratch.renderFpsSample);
  updatePlayerInterpolation(simDt);
  updateEnemyInterpolation(simDt);
  updateBulletInterpolation(simDt);
  updateXpOrbInterpolation(simDt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (ts - renderScratch.hudLastAt >= 100) {
    renderScratch.hudLastAt = ts;
    updateTopCenterHud(Number(game.state.now) || Date.now());
    updateBottomHud();
  }

  if (!Number.isFinite(Number(camera.x))) camera.x = 0;
  if (!Number.isFinite(Number(camera.y))) camera.y = 0;

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
      const viewportScale = typeof getRunStartViewportScale === 'function' ? getRunStartViewportScale(ts) : 1;
      const safeScale = Math.max(0.12, Math.min(1, viewportScale || 1));
      const viewportW = canvas.width / safeScale;
      const viewportH = canvas.height / safeScale;
      const worldW = Math.max(canvas.width, Number(game.world?.width) || canvas.width);
      const worldH = Math.max(canvas.height, Number(game.world?.height) || canvas.height);
      const clampCameraCenter = (center, viewport, world) => (
        viewport >= world
          ? -((viewport - world) * 0.5)
          : Math.max(0, Math.min(center - viewport * 0.5, world - viewport))
      );
      const mapCamX = clampCameraCenter(worldW * 0.5, viewportW, worldW);
      const mapCamY = clampCameraCenter(worldH * 0.5, viewportH, worldH);
      const playerCamX = clampCameraCenter(Number(m.x) || worldW * 0.5, viewportW, worldW);
      const playerCamY = clampCameraCenter(Number(m.y) || worldH * 0.5, viewportH, worldH);
      const introFocus = typeof getRunStartCameraFocusProgress === 'function' ? getRunStartCameraFocusProgress(ts) : 1;
      const targetCamX = mapCamX + (playerCamX - mapCamX) * introFocus;
      const targetCamY = mapCamY + (playerCamY - mapCamY) * introFocus;
      const camDx = targetCamX - camera.x;
      const camDy = targetCamY - camera.y;
      const camDist = Math.hypot(camDx, camDy);

      if (introFocus < 1 || camDist >= CLIENT_CAMERA_SNAP_DIST) {
        camera.x = targetCamX;
        camera.y = targetCamY;
      } else {
        const k = 1 - Math.exp(-CLIENT_CAMERA_FOLLOW_RATE * dt);
        camera.x += camDx * k;
        camera.y += camDy * k;
      }
    }
  }
  const sceneTransform = typeof getRunStartSceneTransform === 'function'
    ? getRunStartSceneTransform(ts)
    : { active: false, scale: 1, rotation: 0, shakeX: 0, shakeY: 0 };
  const sceneScale = Number(sceneTransform.scale) || 1;
  const sceneRotation = Number(sceneTransform.rotation) || 0;
  const sceneTransformActive = Boolean(sceneTransform?.active && (Math.abs(sceneScale - 1) > 0.001 || Math.abs(sceneRotation) > 0.001));
  if (sceneTransformActive) {
    ctx.save();
    ctx.translate(canvas.width * 0.5 + (Number(sceneTransform.shakeX) || 0), canvas.height * 0.5 + (Number(sceneTransform.shakeY) || 0));
    if (sceneRotation) ctx.rotate(sceneRotation);
    ctx.translate(-canvas.width * 0.5, -canvas.height * 0.5);
    ctx.scale(sceneScale, sceneScale);
  }
  const playersByDepth = renderScratch.playersByDepth;
  playersByDepth.length = 0;
  for (const p of game.state.players || []) {
    pushPlayerDepthItem(playersByDepth, p, getPlayerRenderPos(p));
  }
  playersByDepth.sort((a, b) => (Number(a.rp.y) || 0) - (Number(b.rp.y) || 0));
  renderDiagEnd('prep', diagStartedAt);

  const stateNowMs = Number(game.state.now) || Date.now();
  diagStartedAt = renderDiagStart();
  const webglWorld = renderWebGLWorldLayer(playersByDepth, ts / 1000, { sceneTransformActive });
  if (webglWorld.used) {
    drawBloodPuddles();
    drawMapObjectHpBars(stateNowMs);
  } else {
    drawGround();
    drawExplosionScars();
    drawGroundFragments();
    drawBloodPuddles();
    drawMapObjects(stateNowMs);
  }
  renderDiagEnd('world', diagStartedAt);

  const xpOrbs = game.state.xpOrbs || [];
  const bulletsForRender = getBulletsForRender();
  const { energyProjectiles, rocketProjectiles } = buildProjectileRenderLists(bulletsForRender);
  const fastXpOrbs = buildFastXpOrbRenderList(xpOrbs, stateNowMs);

  diagStartedAt = renderDiagStart();
  const webglFastFx = renderWebGLFastFxLayer(energyProjectiles, fastXpOrbs, stateNowMs, { webglWorldUsed: webglWorld.used });
  if (!webglFastFx.xpOrbs) drawXpOrbs(xpOrbs, stateNowMs);
  drawBossPortals(game.state.bossPortals || [], Number(game.state.now) || Date.now());
  drawSkillOfferOrbs(game.state.skillOrbs || [], Number(game.state.now) || Date.now());

  for (const d of game.state.drops || []) {
    drawDropPickup(d, ts);
  }
  renderDiagEnd('items', diagStartedAt);

  diagStartedAt = renderDiagStart();
  if (!webglFastFx.projectiles) {
    for (const projectile of energyProjectiles) {
      drawEnergyProjectile(projectile);
    }
  }
  for (const projectile of rocketProjectiles) {
    drawRocketProjectile(projectile);
  }
  renderDiagEnd('projectiles', diagStartedAt);

  diagStartedAt = renderDiagStart();
  if (!webglWorld.actors) {
    drawEnemies(game.state.enemies, ts / 1000);
    for (const item of playersByDepth) {
      const p = item.p;
      const rp = item.rp;
      drawPlayer(p, ts / 1000, p.id === game.myId, rp.x, rp.y, false);
    }
  } else {
    drawEnemyOverlayLayer(game.state.enemies, ts / 1000);
  }
  renderDiagEnd('actors', diagStartedAt);

  diagStartedAt = renderDiagStart();
  const actorOcclusionMarkers = renderScratch.actorOcclusionMarkers;
  actorOcclusionMarkers.length = 0;
  for (const e of game.state.enemies || []) {
    const re = getEnemyRenderPos(e);
    if (!re || !isVisibleWorld(re.x, re.y, 120)) continue;
    pushActorOcclusionMarker(actorOcclusionMarkers, re.x, re.y);
  }
  for (const item of playersByDepth) {
    if (!item?.p?.alive) continue;
    const x = Number(item.rp?.x) || 0;
    const y = Number(item.rp?.y) || 0;
    if (!isVisibleWorld(x, y, 120)) continue;
    pushActorOcclusionMarker(actorOcclusionMarkers, x, y);
  }
  drawMapObjectOcclusionOverlay(actorOcclusionMarkers, Number(game.state.now) || Date.now());
  drawCompanionUiLayer(playersByDepth);
  drawPlayerUiLayer(playersByDepth);

  drawTrees();
  renderDiagEnd('ui', diagStartedAt);

  diagStartedAt = renderDiagStart();
  drawFx();
  renderDiagEnd('fx', diagStartedAt);

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-camera.x, -camera.y, game.world.width, game.world.height);
  if (sceneTransformActive) ctx.restore();

  if (typeof drawRunStartCinematicOverlay === 'function') drawRunStartCinematicOverlay(ts);

  diagStartedAt = renderDiagStart();
  drawBossPortalEdgeIndicator(game.state.bossPortals || [], Number(game.state.now) || Date.now());
  drawSkillOrbEdgeIndicators(game.state.skillOrbs || []);
  renderDiagEnd('indicators', diagStartedAt);

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
if (!isWebRendererDisabled()) scheduleNextFrame();
