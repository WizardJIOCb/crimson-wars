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
function drawJumpChargesIndicator(p, sx, sy) {
  if (!p || !p.alive) return;
  const maxCharges = Math.max(1, Number(p.dodgeChargesMax) || 1);
  const charges = Math.max(0, Math.min(maxCharges, Number(p.dodgeCharges) || 0));
  const cdMs = Math.max(0, Number(p.dodgeRechargeMs ?? p.dodgeCooldownMs) || 0);
  const cdTotalMs = Math.max(1, Number(p.dodgeRechargeTotalMs) || 1200);
  const recharging = charges < maxCharges && cdMs > 0;
  const recoveringIndex = recharging ? charges : -1;

  const radius = 7;
  const gap = 6;
  const y = sy - 72;
  const totalWidth = maxCharges * (radius * 2) + (maxCharges - 1) * gap;
  const startX = sx - totalWidth / 2 + radius;

  ctx.save();
  ctx.lineWidth = 2;
  for (let i = 0; i < maxCharges; i += 1) {
    const cx = startX + i * (radius * 2 + gap);
    ctx.fillStyle = i < charges ? 'rgba(34,197,94,0.95)' : 'rgba(17,24,39,0.85)';
    ctx.beginPath();
    ctx.arc(cx, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = i < charges ? 'rgba(187,247,208,0.95)' : 'rgba(148,163,184,0.7)';
    ctx.beginPath();
    ctx.arc(cx, y, radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    if (i === recoveringIndex) {
      const progress = 1 - Math.max(0, Math.min(1, cdMs / cdTotalMs));
      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cx, y, radius + 3, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
      ctx.stroke();
    }
  }

  if (recharging) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((cdMs / 1000).toFixed(1) + 's', sx, y - 13);
  }
  ctx.restore();
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

function drawVariantAccents(x, y, variant) {
  ctx.fillStyle = variant.accent;
  ctx.fillRect(x - 7, y - 22, 14, 3);
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

function drawPlayer(p, t, isMe, rx, ry) {
  if (!isVisibleWorld(rx, ry, 50)) return;
  const x = rx - camera.x;
  const y = ry - camera.y;

  if (!p.alive) {
    drawCircle(rx, ry, 18, '#6b7280');
    return;
  }

  const variant = getPlayerVariant(p.playerClass || (isMe ? selectedPlayerClass : 'cyber'));
  const playerSprite = sprites.players[variant.id];
  const fw = Math.max(8, Number(variant.frameW) || 32);
  const fh = Math.max(8, Number(variant.frameH) || 48);
  const scale = Math.max(0.5, Number(variant.scale) || 1);

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

    const lookDx = isMe ? (input.pointerX - x) : (rv?.vx || 0);
    const lookDy = isMe ? (input.pointerY - y) : (rv?.vy || 0);
    let dir = 'down';
    if (Math.abs(lookDx) > Math.abs(lookDy)) dir = lookDx < 0 ? 'left' : 'right';
    else if (Math.abs(lookDy) > 0.0001) dir = lookDy < 0 ? 'up' : 'down';

    const rows = variant.rows || { down: 0, left: 1, right: 2, up: 3 };
    const selectedRow = Number(rows[dir]);
    const row = Number.isFinite(selectedRow) ? Math.max(0, Math.min(rowCount - 1, selectedRow)) : 0;

    ctx.save();
    ctx.translate(x, y + 2);
    ctx.drawImage(playerSprite, frame * fw, row * fh, fw, fh, -dw / 2, -dh * 0.6, dw, dh);
    drawVariantAccents(0, 0, variant);
    ctx.restore();
  } else {
    drawCircle(rx, ry, 18, isMe ? '#22d3ee' : '#a78bfa');
  }

  if (isMe) drawJumpChargesIndicator(p, x, y);
  drawHpBar(rx, ry, Math.max(0, p.hp / p.maxHp));
  ctx.fillStyle = '#f8fafc';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.name, x, y - 42);
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
      if (Math.abs(re.vx || 0) > 0.15) re.faceLeft = (re.vx || 0) < 0;
      const faceLeft = Boolean(re.faceLeft);

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
    if (!isVisibleWorld(o.x, o.y, 20)) continue;
    const x = o.x - camera.x;
    const y = o.y - camera.y;
    const ttl = Math.max(1, Number(o.ttlMaxMs) || 22000);
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

  for (const s of visuals.skillBursts) {
    if (!isVisibleWorld(s.x, s.y, s.maxR + 12)) continue;
    const a = Math.max(0, s.life / s.ttl);
    const sx = s.x - camera.x;
    const sy = s.y - camera.y;
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
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(252,211,77,${(t * 0.85).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy);
    ctx.lineTo(sx - 6, sy - 4);
    ctx.lineTo(sx - 2, sy + 7);
    ctx.closePath();
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
    if (fpsCornerEl) fpsCornerEl.textContent = `FPS: ${Math.round(fpsFrameCount / fpsAccumSec)}`;
    updateNetMetaUi();
    fpsFrameCount = 0;
    fpsAccumSec = 0;
  }
  game.sampledNet = sampleBufferedState();
  updateFx(dt);
  updatePlayerInterpolation(dt);
  updateEnemyInterpolation(dt);
  updateBulletInterpolation(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!game.state) {
    updateTopCenterHud(Date.now());
    updateBottomHud();
    const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
    const waitingElapsed = performance.now() - waitingForFirstStateSince;
    if (waitingForFirstState && !overlayOpen && waitingElapsed >= 250) {
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Waiting for state from server...', 24, 40);
    }
    requestAnimationFrame(render);
    return;
  }

  updateTopCenterHud(Number(game.state.now) || Date.now());
  updateBottomHud();

  const me = game.state.players.find((p) => p.id === game.myId) || game.state.players[0];
  if (me) {
    const m = getPlayerRenderPos(me);
    camera.x = Math.max(0, Math.min(m.x - canvas.width / 2, game.world.width - canvas.width));
    camera.y = Math.max(0, Math.min(m.y - canvas.height / 2, game.world.height - canvas.height));
  }

  drawGround();
  drawBloodPuddles();
  drawXpOrbs(game.state.xpOrbs || [], Number(game.state.now) || Date.now());
  drawBossPortals(game.state.bossPortals || [], Number(game.state.now) || Date.now());

  for (const d of game.state.drops || []) {
    if (!isVisibleWorld(d.x, d.y, 50)) continue;
    const x = d.x - camera.x;
    const y = d.y - camera.y;
    const glow = d.weaponKey === 'sniper' ? '#e5e7eb' : (d.weaponKey === 'shotgun' ? '#f97316' : (d.weaponKey === 'smg' ? '#38bdf8' : '#22c55e'));

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

    drawWeaponIcon(x - 17, y - 22, d.weaponKey);
    ctx.fillStyle = blink ? '#fecaca' : '#e2e8f0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    const label = d.weaponLabel || 'Weapon';
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
  for (const b of game.state.bullets) {
    const rb = getBulletRenderPos(b);
    if (!isVisibleWorld(rb.x, rb.y, 12)) continue;
    drawShadowAtScreen(rb.x - camera.x, rb.y - camera.y + 3, 3, 1.8, 0.18);
    drawCircle(rb.x, rb.y, 3, rb.color || b.color || '#f59e0b');
  }

  drawEnemies(game.state.enemies, ts / 1000);

  for (const p of game.state.players) {
    const rp = getPlayerRenderPos(p);
    drawPlayer(p, ts / 1000, p.id === game.myId, rp.x, rp.y);
  }

  drawTrees();
  drawFx();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-camera.x, -camera.y, game.world.width, game.world.height);

  requestAnimationFrame(render);
}

startInputSender();
setInterval(sendNetPing, NET_PING_INTERVAL_MS);
setInterval(sendNetStatsReport, 1500);
requestAnimationFrame(render);

