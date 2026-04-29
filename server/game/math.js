'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function segmentIntersectsCircle(x0, y0, x1, y1, cx, cy, radius) {
  const r = Math.max(0, Number(radius) || 0);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.000001) {
    const pdx = cx - x0;
    const pdy = cy - y0;
    return (pdx * pdx + pdy * pdy) <= r * r;
  }
  const t = clamp(((cx - x0) * dx + (cy - y0) * dy) / lenSq, 0, 1);
  const px = x0 + dx * t;
  const py = y0 + dy * t;
  const ddx = cx - px;
  const ddy = cy - py;
  return (ddx * ddx + ddy * ddy) <= r * r;
}

function wrapAngleDelta(delta) {
  let next = Number(delta) || 0;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

module.exports = {
  clamp,
  segmentIntersectsCircle,
  wrapAngleDelta,
};
