'use strict';

(() => {
  const root = document.getElementById('cw-page-loader');
  if (!root) {
    document.documentElement.classList.remove('cw-app-booting');
    return;
  }

  const stageEl = document.getElementById('cw-page-loader-stage');
  const fillEl = document.getElementById('cw-page-loader-fill');
  const consoleEl = document.getElementById('cw-page-loader-console');
  const stepEls = Array.from(root.querySelectorAll('[data-loader-step]'));
  const stepByKey = new Map(stepEls.map((el) => [String(el.getAttribute('data-loader-step') || ''), el]));
  const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  const minVisibleMs = 1450;
  const maxVisibleMs = 5600;
  const completed = new Set();
  const required = new Set(['dom', 'shell', 'core', 'route', 'profile']);
  const boltSets = Array.from(root.querySelectorAll('.cw-loader-bolt-set')).map((group, index) => ({
    group,
    index,
    mainPaths: Array.from(group.querySelectorAll('.cw-loader-bolt-halo, .cw-loader-bolt-line, .cw-loader-bolt-core')),
    branchPath: group.querySelector('.cw-loader-bolt-branch'),
  }));
  const bloodDrops = Array.from(root.querySelectorAll('.cw-loader-blood span'));
  const reducedMotion = Boolean(
    window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const moduleDefs = [
    { key: 'shell', label: 'Shell', start: 0.04, end: 0.32 },
    { key: 'core', label: 'Core', start: 0.32, end: 0.52 },
    { key: 'route', label: 'Route', start: 0.52, end: 0.64 },
    { key: 'profile', label: 'Profile', start: 0.64, end: 0.78 },
    { key: 'characters', label: 'Heroes', start: 0.78, end: 0.91 },
  ];
  const consoleRows = new Map();
  let currentProgress = 0.04;
  let displayedProgress = 0.04;
  let progressFrame = 0;
  let targetTab = getInitialTab();
  let dismissed = false;
  let readyTimer = 0;
  let burstTimer = 0;
  let lastBurstAt = 0;
  let lastBurstProgress = 0;
  let burstIndex = 0;
  const burstTypes = ['electric', 'muzzle', 'blood', 'electric', 'blood', 'muzzle'];

  const stageMeta = {
    dom: { progress: 0.16, label: 'Document channel open' },
    shell: { progress: 0.32, label: 'Shell assembled' },
    core: { progress: 0.52, label: 'Core runtime online' },
    route: { progress: 0.64, label: 'Route channel open' },
    profile: { progress: 0.78, label: 'Profile relay synced' },
    characters: { progress: 0.91, label: 'Hero dossier assembled' },
    assets: { progress: 0.97, label: 'Scene assets ready' },
  };

  createConsoleRows();

  if (!reducedMotion) {
    randomizeBolts();
    randomizeBloodDrops();
  }

  const boltFxTimer = !reducedMotion && boltSets.length
    ? window.setInterval(() => {
      if (!dismissed) randomizeBolts({ restart: true });
    }, 1180)
    : 0;
  const bloodFxTimer = !reducedMotion && bloodDrops.length
    ? window.setInterval(() => {
      if (!dismissed) randomizeBloodDrops({ ambient: true });
    }, 2850)
    : 0;

  setTargetTab(targetTab);
  renderProgress(displayedProgress);
  updateModuleStates();
  setProgress(currentProgress);

  const ambientTimer = window.setInterval(() => {
    if (dismissed) return;
    const cap = hasRequiredSteps() ? 0.96 : 0.84;
    const next = Math.min(cap, currentProgress + 0.006);
    setProgress(next);
  }, 110);

  const fallbackTimer = window.setTimeout(() => {
    ready({ force: true, label: 'Interface online' });
  }, maxVisibleMs);

  function nowMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  function getInitialTab() {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = String(params.get('tab') || '').trim().toLowerCase();
      return tab === 'play' ? 'run' : (tab || 'run');
    } catch {
      return 'run';
    }
  }

  function setTargetTab(tabId) {
    targetTab = String(tabId || '').trim().toLowerCase() || 'run';
    if (targetTab === 'play') targetTab = 'run';
    if (targetTab === 'characters') required.add('characters');
    else required.delete('characters');
    updateModuleStates();
  }

  function hasRequiredSteps() {
    for (const key of required) {
      if (!completed.has(key)) return false;
    }
    return true;
  }

  function hasVisibleModulesComplete() {
    return moduleDefs.every((moduleDef) => (
      completed.has(moduleDef.key)
      || (moduleDef.key === 'characters' && !required.has('characters'))
    ));
  }

  function shouldSnapCompleteProgress() {
    return completed.has('assets') && hasVisibleModulesComplete();
  }

  function setProgress(value) {
    const safe = Math.max(0, Math.min(1, Number(value) || 0));
    const previousProgress = currentProgress;
    currentProgress = Math.max(currentProgress, safe);
    maybeTriggerBurst(previousProgress, currentProgress);
    scheduleProgressRender();
  }

  function scheduleProgressRender() {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(animateProgress);
  }

  function animateProgress() {
    progressFrame = 0;
    const diff = currentProgress - displayedProgress;
    if (Math.abs(diff) <= 0.001) {
      displayedProgress = currentProgress;
      renderProgress(displayedProgress);
      return;
    }
    displayedProgress += diff * 0.16;
    renderProgress(displayedProgress);
    scheduleProgressRender();
  }

  function renderProgress(value) {
    const safe = Math.max(0, Math.min(1, Number(value) || 0));
    const pct = `${(safe * 100).toFixed(2)}%`;
    root.style.setProperty('--loader-progress', String(safe));
    root.style.setProperty('--loader-progress-pct', pct);
    if (fillEl) fillEl.style.width = pct;
    updateConsoleRows(safe);
  }

  function snapProgress(value = 1) {
    const safe = Math.max(0, Math.min(1, Number(value) || 0));
    currentProgress = Math.max(currentProgress, safe);
    displayedProgress = Math.max(displayedProgress, safe);
    if (progressFrame) {
      window.cancelAnimationFrame(progressFrame);
      progressFrame = 0;
    }
    renderProgress(displayedProgress);
  }

  function setStage(label, progress = null) {
    const text = String(label || '').trim();
    if (text && stageEl) stageEl.textContent = text;
    if (progress !== null) setProgress(progress);
  }

  function mark(key, label = '') {
    if (dismissed) return;
    const normalized = String(key || '').trim().toLowerCase();
    if (!normalized) return;
    completed.add(normalized);
    const meta = stageMeta[normalized] || null;
    if (label || meta) setStage(label || meta.label, meta ? meta.progress : null);
    if (shouldSnapCompleteProgress()) snapProgress(1);
    const stepEl = stepByKey.get(normalized);
    if (stepEl) updateModuleStates();
    else updateConsoleRows(displayedProgress);
    if (normalized === 'profile' || normalized === 'characters') triggerBurst('blood');
    else if (normalized === 'core' || normalized === 'assets') triggerBurst('electric');
    else triggerBurst('muzzle');
    requestReady();
  }

  function triggerBurst(type = 'electric') {
    if (dismissed) return;
    const safeType = type === 'blood' || type === 'muzzle' || type === 'electric'
      ? type
      : 'electric';
    root.classList.remove('is-loader-burst', 'is-electric-burst', 'is-blood-burst', 'is-muzzle-burst');
    if (!reducedMotion && safeType === 'electric') randomizeBolts({ restart: true });
    if (!reducedMotion && safeType === 'blood') randomizeBloodDrops({ burst: true });
    void root.offsetWidth;
    root.classList.add('is-loader-burst', `is-${safeType}-burst`);
    window.clearTimeout(burstTimer);
    const holdMs = safeType === 'blood' ? 940 : (safeType === 'electric' ? 680 : 540);
    burstTimer = window.setTimeout(() => {
      root.classList.remove('is-loader-burst', 'is-electric-burst', 'is-blood-burst', 'is-muzzle-burst');
    }, holdMs);
  }

  function maybeTriggerBurst(previousProgress, nextProgress) {
    if (dismissed || nextProgress <= previousProgress + 0.001) return;
    const t = nowMs();
    const movedEnough = nextProgress - lastBurstProgress >= 0.12;
    const waitedEnough = t - lastBurstAt >= 760;
    if (!movedEnough && !waitedEnough && nextProgress < 0.98) return;
    lastBurstAt = t;
    lastBurstProgress = nextProgress;
    const type = burstTypes[burstIndex % burstTypes.length];
    burstIndex += 1;
    triggerBurst(type);
  }

  function requestReady(options = {}) {
    if (dismissed) return;
    if (!options.force && !hasRequiredSteps()) return;
    if (readyTimer) return;
    const waitMs = Math.max(0, minVisibleMs - (nowMs() - startedAt));
    readyTimer = window.setTimeout(() => {
      ready(options);
    }, waitMs);
  }

  function ready(options = {}) {
    if (dismissed) return;
    if (!options.force && !hasRequiredSteps()) return;
    triggerBurst('muzzle');
    dismissed = true;
    window.clearInterval(ambientTimer);
    if (boltFxTimer) window.clearInterval(boltFxTimer);
    if (bloodFxTimer) window.clearInterval(bloodFxTimer);
    window.clearTimeout(fallbackTimer);
    if (readyTimer) window.clearTimeout(readyTimer);
    setStage(options.label || 'Interface online', 1);
    snapProgress(1);
    stepEls.forEach((el) => el.classList.add('is-complete'));
    updateModuleStates();
    document.documentElement.classList.remove('cw-app-booting');
    document.documentElement.classList.add('cw-app-ready');
    document.body?.classList.add('cw-hub-revealing');
    root.classList.add('is-dismissing');
    root.setAttribute('aria-hidden', 'true');
    window.dispatchEvent(new CustomEvent('cw:page-loader-ready', {
      detail: {
        targetTab,
        forced: Boolean(options.force),
        completed: Array.from(completed),
      },
    }));
    window.setTimeout(() => {
      root.classList.add('hidden');
      document.body?.classList.remove('cw-hub-revealing');
      window.dispatchEvent(new CustomEvent('cw:page-loader-hidden', {
        detail: { targetTab },
      }));
    }, 860);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mark('dom'), { once: true });
  } else {
    mark('dom');
  }

  window.addEventListener('load', () => {
    mark('assets');
    requestReady();
  }, { once: true });

  function createConsoleRows() {
    if (!consoleEl) return;
    consoleEl.textContent = '';
    moduleDefs.forEach((moduleDef) => {
      const line = document.createElement('div');
      line.className = 'cw-loader-console-line';
      line.setAttribute('data-loader-console', moduleDef.key);

      const status = document.createElement('span');
      status.className = 'cw-loader-console-status';
      status.textContent = '.';

      const name = document.createElement('span');
      name.className = 'cw-loader-console-name';
      name.textContent = moduleDef.label.toLowerCase();

      const bar = document.createElement('span');
      bar.className = 'cw-loader-console-bar';
      const barFill = document.createElement('i');
      bar.appendChild(barFill);

      const percent = document.createElement('span');
      percent.className = 'cw-loader-console-percent';
      percent.textContent = '0%';

      line.append(status, name, bar, percent);
      consoleEl.appendChild(line);
      consoleRows.set(moduleDef.key, { line, status, percent });
    });
  }

  function updateModuleStates() {
    const activeKey = getActiveModuleKey();
    const allDone = dismissed && currentProgress >= 0.99;
    stepEls.forEach((el) => {
      const key = String(el.getAttribute('data-loader-step') || '').trim().toLowerCase();
      const complete = allDone || completed.has(key);
      const loading = !complete && key === activeKey;
      el.classList.toggle('is-active', loading);
      el.classList.toggle('is-loading', loading);
      el.classList.toggle('is-complete', complete);
    });
    updateConsoleRows(displayedProgress);
  }

  function getActiveModuleKey() {
    const active = moduleDefs.find((moduleDef) => !completed.has(moduleDef.key));
    return active ? active.key : '';
  }

  function updateConsoleRows(progressValue) {
    if (!consoleRows.size) return;
    const allDone = dismissed && currentProgress >= 0.99;
    const activeKey = getActiveModuleKey();
    moduleDefs.forEach((moduleDef) => {
      const row = consoleRows.get(moduleDef.key);
      if (!row) return;
      const complete = allDone || completed.has(moduleDef.key);
      const loading = !complete && moduleDef.key === activeKey;
      const moduleProgress = complete
        ? 1
        : getModuleProgress(moduleDef, progressValue, loading);
      const pct = Math.round(moduleProgress * 100);
      row.line.style.setProperty('--row-progress', `${pct}%`);
      row.line.classList.toggle('is-loading', loading);
      row.line.classList.toggle('is-complete', complete);
      row.status.textContent = complete ? 'ok' : (loading ? '>' : '.');
      row.percent.textContent = `${pct}%`;
    });
  }

  function getModuleProgress(moduleDef, progressValue, loading) {
    const range = Math.max(0.01, moduleDef.end - moduleDef.start);
    const raw = (progressValue - moduleDef.start) / range;
    if (!loading && raw <= 0) return 0;
    const maxPending = loading ? 0.96 : 0.88;
    return clamp(raw, 0, maxPending);
  }

  function randomizeBolts(options = {}) {
    if (!boltSets.length) return;
    const flashPoint = { x: randomFloat(28, 72), y: randomFloat(24, 72) };
    root.style.setProperty('--electric-flash-x', `${flashPoint.x.toFixed(1)}%`);
    root.style.setProperty('--electric-flash-y', `${flashPoint.y.toFixed(1)}%`);
    boltSets.forEach((set) => {
      const bolt = buildBolt(set.index);
      set.mainPaths.forEach((path) => path.setAttribute('d', bolt.main));
      if (set.branchPath) set.branchPath.setAttribute('d', bolt.branch);
      const speed = randomFloat(0.86, 1.28);
      set.group.style.setProperty('--bolt-speed', `${speed.toFixed(2)}s`);
      set.group.style.setProperty('--bolt-halo-dash', `${randomInt(178, 236)} ${randomInt(760, 860)}`);
      set.group.style.setProperty('--bolt-line-dash', `${randomInt(136, 182)} ${randomInt(790, 890)}`);
      set.group.style.setProperty('--bolt-core-dash', `${randomInt(94, 138)} ${randomInt(850, 930)}`);
      set.group.style.setProperty('--bolt-branch-dash', `${randomInt(48, 82)} ${randomInt(218, 280)}`);
    });
    if (options.restart) restartFxElements(boltSets.map((set) => set.group));
  }

  function buildBolt(index = 0) {
    const presets = [
      {
        start: { x: -70, y: randomFloat(76, 190) },
        end: { x: 1070, y: randomFloat(48, 172) },
        jitter: randomFloat(34, 78),
        segments: randomInt(10, 15),
      },
      {
        start: { x: -70, y: randomFloat(350, 506) },
        end: { x: 1070, y: randomFloat(306, 474) },
        jitter: randomFloat(42, 92),
        segments: randomInt(10, 16),
      },
      {
        start: { x: randomFloat(120, 430), y: -62 },
        end: { x: randomFloat(210, 640), y: 682 },
        jitter: randomFloat(40, 96),
        segments: randomInt(9, 14),
      },
    ];
    const config = presets[index % presets.length];
    if (Math.random() < 0.28) {
      config.start.y = randomFloat(36, 584);
      config.end.y = randomFloat(36, 584);
      config.jitter = randomFloat(52, 108);
    }
    const points = buildBoltPoints(config);
    return {
      main: pointsToPath(points),
      branch: buildBranchPath(points, config),
    };
  }

  function buildBoltPoints(config) {
    const points = [];
    const dx = config.end.x - config.start.x;
    const dy = config.end.y - config.start.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / length;
    const uy = dy / length;
    const px = -uy;
    const py = ux;
    const phase = randomFloat(0, Math.PI * 2);
    for (let i = 0; i <= config.segments; i += 1) {
      const t = i / config.segments;
      const endpoint = i === 0 || i === config.segments;
      const wave = Math.sin((t * Math.PI * 3.2) + phase) * config.jitter * 0.34;
      const kink = endpoint ? 0 : randomFloat(-config.jitter, config.jitter) + wave;
      const along = endpoint ? 0 : randomFloat(-22, 22);
      points.push({
        x: round(lerp(config.start.x, config.end.x, t) + (px * kink) + (ux * along)),
        y: round(lerp(config.start.y, config.end.y, t) + (py * kink) + (uy * along)),
      });
    }
    return points;
  }

  function pointsToPath(points) {
    if (!points.length) return '';
    const [first, ...rest] = points;
    return `M${first.x} ${first.y} ${rest.map((point) => `L${point.x} ${point.y}`).join(' ')}`;
  }

  function buildBranchPath(points, config) {
    if (points.length < 5) return '';
    const dx = config.end.x - config.start.x;
    const dy = config.end.y - config.start.y;
    const baseAngle = Math.atan2(dy, dx);
    const branchCount = randomInt(3, 5);
    const segments = [];
    const used = new Set();
    for (let i = 0; i < branchCount; i += 1) {
      let pointIndex = randomInt(2, points.length - 3);
      while (used.has(pointIndex) && used.size < points.length - 4) {
        pointIndex = randomInt(2, points.length - 3);
      }
      used.add(pointIndex);
      const source = points[pointIndex];
      const side = Math.random() < 0.5 ? -1 : 1;
      const angle = baseAngle + (side * randomFloat(0.78, 1.42)) + randomFloat(-0.26, 0.26);
      const lengthA = randomFloat(42, 110);
      const lengthB = randomFloat(18, 74);
      const mid = {
        x: round(source.x + (Math.cos(angle) * lengthA)),
        y: round(source.y + (Math.sin(angle) * lengthA)),
      };
      const end = {
        x: round(mid.x + (Math.cos(angle + (side * randomFloat(0.42, 0.92))) * lengthB)),
        y: round(mid.y + (Math.sin(angle + (side * randomFloat(0.42, 0.92))) * lengthB)),
      };
      segments.push(`M${source.x} ${source.y} L${mid.x} ${mid.y} L${end.x} ${end.y}`);
      if (Math.random() < 0.5) {
        const forkAngle = angle - (side * randomFloat(0.58, 1.06));
        const forkLength = randomFloat(22, 58);
        segments.push(`M${mid.x} ${mid.y} L${round(mid.x + (Math.cos(forkAngle) * forkLength))} ${round(mid.y + (Math.sin(forkAngle) * forkLength))}`);
      }
    }
    return segments.join(' ');
  }

  function randomizeBloodDrops(options = {}) {
    if (!bloodDrops.length) return;
    const flashX = randomFloat(18, 84);
    const flashY = randomFloat(18, 78);
    root.style.setProperty('--blood-flash-x', `${flashX.toFixed(1)}%`);
    root.style.setProperty('--blood-flash-y', `${flashY.toFixed(1)}%`);
    bloodDrops.forEach((drop, index) => {
      let x = options.burst && index < 3
        ? clamp(flashX + randomFloat(-10, 10), 8, 92)
        : randomFloat(8, 92);
      let y = options.burst && index < 3
        ? clamp(flashY + randomFloat(-10, 10), 10, 86)
        : randomFloat(10, 86);
      if (!options.burst || index > 2) {
        const point = pickBloodImpactPoint();
        x = point.x;
        y = point.y;
      }
      const theta = randomFloat(0, Math.PI * 2);
      const distance = randomFloat(180, 390);
      const fromX = Math.cos(theta) * distance;
      const fromY = Math.sin(theta) * distance;
      const midRatio = randomFloat(0.18, 0.28);
      const size = randomFloat(options.burst ? 56 : 42, options.burst ? 96 : 76);
      const duration = randomFloat(options.burst ? 1650 : 2400, options.burst ? 2180 : 3600);
      const delay = options.burst
        ? index * randomInt(42, 92)
        : -randomFloat(0, duration);
      drop.style.setProperty('--blood-x', `${x.toFixed(1)}%`);
      drop.style.setProperty('--blood-y', `${y.toFixed(1)}%`);
      drop.style.setProperty('--blood-from-x', `${round(fromX)}px`);
      drop.style.setProperty('--blood-from-y', `${round(fromY)}px`);
      drop.style.setProperty('--blood-mid-x', `${round(fromX * midRatio)}px`);
      drop.style.setProperty('--blood-mid-y', `${round(fromY * midRatio)}px`);
      drop.style.setProperty('--blood-size', `${round(size)}px`);
      drop.style.setProperty('--blood-angle', `${round((Math.atan2(fromY, fromX) * 180 / Math.PI) + 90)}deg`);
      drop.style.setProperty('--blood-duration', `${round(duration)}ms`);
      drop.style.setProperty('--blood-delay', `${round(delay)}ms`);
    });
    if (options.burst) restartFxElements(bloodDrops);
  }

  function pickBloodImpactPoint() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const x = randomFloat(8, 92);
      const y = randomFloat(10, 86);
      const overPanel = x > 28 && x < 72 && y > 32 && y < 64;
      if (!overPanel) return { x, y };
    }
    return Math.random() < 0.5
      ? { x: randomFloat(8, 24), y: randomFloat(14, 82) }
      : { x: randomFloat(76, 92), y: randomFloat(14, 82) };
  }

  function restartFxElements(elements) {
    elements.forEach((el) => {
      el.style.animation = 'none';
    });
    void root.offsetWidth;
    elements.forEach((el) => {
      el.style.animation = '';
    });
  }

  function randomFloat(min, max) {
    return min + (Math.random() * (max - min));
  }

  function randomInt(min, max) {
    return Math.floor(randomFloat(min, max + 1));
  }

  function lerp(a, b, t) {
    return a + ((b - a) * t);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value) {
    return Math.round(value * 10) / 10;
  }

  globalThis.CWPageLoader = {
    mark,
    setStage,
    setTargetTab,
    requestReady,
    ready,
    isDone: () => dismissed,
    getState: () => ({
      targetTab,
      dismissed,
      progress: currentProgress,
      required: Array.from(required),
      completed: Array.from(completed),
    }),
  };
})();
