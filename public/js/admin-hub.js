(function () {
  const $ = (id) => document.getElementById(id);
  const SECTION_META = {
    overview: {
      title: 'Обзор',
      copy: 'Центр управления проектом: короткие сводки, переходы к legacy-редакторам и общий контроль над картами и кампаниями.',
    },
    maps: {
      title: 'Карты',
      copy: 'Редактор геометрии, поверхности и декора карт. Всё, что тут сохраняется, уходит в каталог для новых комнат и новых забегов.',
    },
    campaigns: {
      title: 'Кампании',
      copy: 'Сюжетные цепочки, уровни, цели миссий и привязка карт. Меняем структуру кампании без ручной правки world-content.js.',
    },
    news: {
      title: 'Новости',
      copy: 'Старый news-editor встроен прямо в Admin Hub и использует ту же админ-сессию.',
    },
    skills: {
      title: 'Навыки',
      copy: 'Legacy-редактор навыков и админ-аккаунтов теперь тоже живёт в одном shell-е.',
    },
  };
  const MATERIAL_COLORS = {
    asphalt_wet: '#2b3138',
    asphalt: '#3a3f45',
    concrete: '#727780',
    concrete_tiles: '#666f79',
    dirt: '#68543b',
    grass: '#56773e',
    toxic: '#4e7a28',
  };
  const PROP_COLORS = {
    red_hatchback: '#d55b47',
    burnt_sedan: '#5f6671',
    yellow_bus: '#d1a137',
    ambulance_van: '#e7ebe9',
    concrete_barrier: '#9ca3af',
    road_shack: '#8b6f4a',
    mall_block: '#3ea9a1',
    clinic_block: '#7fd3c5',
    industrial_tank: '#9ecb64',
    reactor_block: '#b3c244',
  };
  const PROP_META = {
    red_hatchback: { label: 'Красная тачка', w: 104, h: 62, hp: 78, destructible: true, explosive: true },
    burnt_sedan: { label: 'Сгоревший седан', w: 110, h: 64, hp: 88, destructible: true, explosive: false },
    yellow_bus: { label: 'Жёлтый автобус', w: 194, h: 78, hp: 184, destructible: true, explosive: true },
    ambulance_van: { label: 'Скорая', w: 128, h: 72, hp: 112, destructible: true, explosive: true },
    concrete_barrier: { label: 'Бетонный блок', w: 120, h: 42, hp: 104, destructible: true, explosive: false },
    road_shack: { label: 'Хибара', w: 170, h: 128, hp: 1, destructible: false, explosive: false },
    mall_block: { label: 'ТЦ-блок', w: 720, h: 280, hp: 1, destructible: false, explosive: false },
    clinic_block: { label: 'Клиника', w: 520, h: 232, hp: 1, destructible: false, explosive: false },
    industrial_tank: { label: 'Промышленный бак', w: 246, h: 198, hp: 1, destructible: false, explosive: false },
    reactor_block: { label: 'Реакторный блок', w: 436, h: 256, hp: 1, destructible: false, explosive: false },
  };

  const ZOMBIE_BREAKABLE_PROP_HP = {
    road_shack: 168,
    mall_block: 720,
    clinic_block: 560,
    industrial_tank: 320,
    reactor_block: 620,
  };

  const dom = {
    loginView: $('admin-login'),
    loginName: $('login-name'),
    loginPassword: $('login-password'),
    loginBtn: $('login-btn'),
    loginStatus: $('login-status'),
    app: $('admin-app'),
    navButtons: Array.from(document.querySelectorAll('.nav-btn')),
    sectionTitle: $('section-title'),
    sectionCopy: $('section-copy'),
    userName: $('admin-user-name'),
    userRole: $('admin-user-role'),
    reloadBtn: $('reload-btn'),
    logoutBtn: $('logout-btn'),
    saveWorldBtn: $('save-world-btn'),
    resetWorldBtn: $('reset-world-btn'),
    openPlayBtn: $('open-play-btn'),
    globalStatus: $('global-status'),
    worldDirtyPill: $('world-dirty-pill'),
    mapsNavCount: $('maps-nav-count'),
    campaignsNavCount: $('campaigns-nav-count'),
    metricMaps: $('metric-maps'),
    metricCampaigns: $('metric-campaigns'),
    metricLevels: $('metric-levels'),
    sections: {
      overview: $('section-overview'),
      maps: $('section-maps'),
      campaigns: $('section-campaigns'),
      news: $('section-news'),
      skills: $('section-skills'),
    },
    newsFrame: $('news-frame'),
    skillsFrame: $('skills-frame'),
    mapList: $('map-list'),
    mapId: $('map-id'),
    mapName: $('map-name'),
    mapSubtitle: $('map-subtitle'),
    mapTheme: $('map-theme'),
    mapWidth: $('map-width'),
    mapHeight: $('map-height'),
    mapTreeDensity: $('map-tree-density'),
    mapBaseMaterial: $('map-base-material'),
    mapDescription: $('map-description'),
    mapCoverFrom: $('map-cover-from'),
    mapCoverTo: $('map-cover-to'),
    mapCoverAccent: $('map-cover-accent'),
    mapCoverGlow: $('map-cover-glow'),
    zoneAddBtn: $('zone-add-btn'),
    propAddBtn: $('prop-add-btn'),
    mapZonesBody: $('map-zones-body'),
    mapPropsBody: $('map-props-body'),
    randomCountMin: $('random-count-min'),
    randomCountMax: $('random-count-max'),
    randomKindChips: $('random-kind-chips'),
    mapAddBtn: $('map-add-btn'),
    mapCloneBtn: $('map-clone-btn'),
    mapDeleteBtn: $('map-delete-btn'),
    mapPreviewCanvas: $('map-preview-canvas'),
    mapUsage: $('map-usage'),
    objectPalette: $('object-palette'),
    mapObjectList: $('map-object-list'),
    mapZoneList: $('map-zone-list'),
    mapZoneTemplateButtons: Array.from(document.querySelectorAll('[data-add-zone-template]')),
    mapPanelSelect: $('map-panel-select'),
    mapTabPanels: Array.from(document.querySelectorAll('[data-map-tab-panel]')),
    mapContextMenu: $('map-context-menu'),
    mapActiveToolLabel: $('map-active-tool-label'),
    mapZoomLabel: $('map-zoom-label'),
    mapToolButtons: Array.from(document.querySelectorAll('[data-map-tool]')),
    mapZoomButtons: Array.from(document.querySelectorAll('[data-map-zoom]')),
    mapClearSelectionBtn: document.querySelector('[data-map-clear-selection]'),
    propModal: $('prop-properties-modal'),
    propModalClose: $('prop-modal-close'),
    propModalSave: $('prop-modal-save'),
    propModalDelete: $('prop-modal-delete'),
    propModalId: $('prop-modal-id'),
    propModalName: $('prop-modal-name'),
    propModalKind: $('prop-modal-kind'),
    propModalStyle: $('prop-modal-style'),
    propModalX: $('prop-modal-x'),
    propModalY: $('prop-modal-y'),
    propModalScale: $('prop-modal-scale'),
    propModalAngle: $('prop-modal-angle'),
    propModalHpMul: $('prop-modal-hp-mul'),
    propModalZombieBreakable: $('prop-modal-zombie-breakable'),
    propModalTemplate: $('prop-modal-template'),
    zoneModal: $('zone-properties-modal'),
    zoneModalClose: $('zone-modal-close'),
    zoneModalSave: $('zone-modal-save'),
    zoneModalDelete: $('zone-modal-delete'),
    zoneModalId: $('zone-modal-id'),
    zoneModalMaterial: $('zone-modal-material'),
    zoneModalShape: $('zone-modal-shape'),
    zoneModalStripe: $('zone-modal-stripe'),
    zoneModalX: $('zone-modal-x'),
    zoneModalY: $('zone-modal-y'),
    zoneModalW: $('zone-modal-w'),
    zoneModalH: $('zone-modal-h'),
    zoneModalFeather: $('zone-modal-feather'),
    zoneModalAlpha: $('zone-modal-alpha'),
    zoneModalAngle: $('zone-modal-angle'),
    campaignList: $('campaign-list'),
    campaignId: $('campaign-id'),
    campaignName: $('campaign-name'),
    campaignShortName: $('campaign-short-name'),
    campaignTagline: $('campaign-tagline'),
    campaignDescription: $('campaign-description'),
    campaignCoverFrom: $('campaign-cover-from'),
    campaignCoverTo: $('campaign-cover-to'),
    campaignCoverAccent: $('campaign-cover-accent'),
    campaignCoverGlow: $('campaign-cover-glow'),
    campaignCoverArt: $('campaign-cover-art'),
    campaignAddBtn: $('campaign-add-btn'),
    campaignCloneBtn: $('campaign-clone-btn'),
    campaignDeleteBtn: $('campaign-delete-btn'),
    campaignLevelList: $('campaign-level-list'),
    levelAddBtn: $('level-add-btn'),
    levelCloneBtn: $('level-clone-btn'),
    levelDeleteBtn: $('level-delete-btn'),
    levelUpBtn: $('level-up-btn'),
    levelDownBtn: $('level-down-btn'),
    levelId: $('level-id'),
    levelMapId: $('level-map-id'),
    levelTitle: $('level-title'),
    levelBrief: $('level-brief'),
    levelScenario: $('level-scenario'),
    goalAddBtn: $('goal-add-btn'),
    levelGoalsBody: $('level-goals-body'),
    modifierEnemySpawn: $('modifier-enemy-spawn'),
    modifierEnemyHp: $('modifier-enemy-hp'),
    modifierBossInterval: $('modifier-boss-interval'),
    jumpButtons: Array.from(document.querySelectorAll('[data-jump]')),
  };

  const state = {
    me: null,
    section: 'overview',
    world: null,
    dirty: false,
    selectedMapId: '',
    selectedCampaignId: '',
    selectedLevelId: '',
    framesLoaded: {
      news: false,
      skills: false,
    },
    mapEditor: {
      activeTab: 'objects',
      activeTool: 'place',
      selectedKind: 'red_hatchback',
      selectedPropIndex: -1,
      selectedZoneIndex: -1,
      contextPropIndex: -1,
      contextZoneIndex: -1,
      contextKind: '',
      modalPropIndex: -1,
      modalZoneIndex: -1,
      cameraX: 0.5,
      cameraY: 0.5,
      zoom: 1,
      pointerDown: false,
      pointerButton: 0,
      pointerStartX: 0,
      pointerStartY: 0,
      cameraStartX: 0.5,
      cameraStartY: 0.5,
      dragPropIndex: -1,
      dragPropStartX: 0.5,
      dragPropStartY: 0.5,
      dragZoneIndex: -1,
      dragZoneStartX: 0.5,
      dragZoneStartY: 0.5,
      didPan: false,
      didDragProp: false,
      didDragZone: false,
    },
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
    }
    return data;
  }

  function setStatus(target, text, kind = '') {
    if (!target) return;
    target.textContent = String(text || '');
    target.className = `status-line ${kind}`.trim();
  }

  function slugify(value, fallback) {
    const slug = String(value || fallback || 'entry')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return slug || fallback || 'entry';
  }

  function uniqueId(existingIds, base) {
    const used = new Set(existingIds);
    const stem = slugify(base, 'entry');
    let next = stem;
    let index = 2;
    while (used.has(next)) {
      next = `${stem}_${index}`;
      index += 1;
    }
    return next;
  }

  function getWorld() {
    return state.world || { maps: [], campaigns: [], enums: null, summary: null };
  }

  function getSelectedMap() {
    return getWorld().maps.find((map) => map.id === state.selectedMapId) || null;
  }

  function getSelectedCampaign() {
    return getWorld().campaigns.find((campaign) => campaign.id === state.selectedCampaignId) || null;
  }

  function getSelectedLevel() {
    const campaign = getSelectedCampaign();
    return campaign?.levels?.find((level) => level.id === state.selectedLevelId) || null;
  }

  function getMapLevelUsage(mapId) {
    const usage = [];
    for (const campaign of getWorld().campaigns) {
      for (const level of campaign.levels || []) {
        if (level.mapId === mapId) {
          usage.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            levelId: level.id,
            levelTitle: level.title,
          });
        }
      }
    }
    return usage;
  }

  function ensureSelections() {
    const world = getWorld();
    if (!world.maps.some((map) => map.id === state.selectedMapId)) {
      state.selectedMapId = world.maps[0]?.id || '';
    }
    if (!world.campaigns.some((campaign) => campaign.id === state.selectedCampaignId)) {
      state.selectedCampaignId = world.campaigns[0]?.id || '';
    }
    const campaign = getSelectedCampaign();
    const levels = Array.isArray(campaign?.levels) ? campaign.levels : [];
    if (!levels.some((level) => level.id === state.selectedLevelId)) {
      state.selectedLevelId = levels[0]?.id || '';
    }
  }

  function setDirty(flag = true) {
    state.dirty = !!flag;
    dom.worldDirtyPill.classList.toggle('hidden', !state.dirty);
    dom.worldDirtyPill.classList.toggle('pill--dirty', state.dirty);
    dom.saveWorldBtn.disabled = !state.dirty;
  }

  function optionTags(items, selected) {
    return items.map((item) => {
      const value = typeof item === 'string' ? item : item.value;
      const label = typeof item === 'string' ? item : item.label;
      return `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function clamp(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  function clamp01(value) {
    return clamp(value, 0, 1);
  }

  function radToDeg(value) {
    return ((Number(value) || 0) * 180) / Math.PI;
  }

  function degToRad(value) {
    return ((Number(value) || 0) * Math.PI) / 180;
  }

  function getPropMeta(kind) {
    return PROP_META[String(kind || '')] || { label: String(kind || 'object'), w: 110, h: 70, hp: 1, destructible: false, explosive: false };
  }

  function getEditorFieldValue(input) {
    if (!input) return '';
    if (input.type === 'checkbox') return !!input.checked;
    if (input.type === 'number') return Number(input.value);
    return input.value;
  }

  function ensureMapScene(map) {
    if (!map) return null;
    map.scene = map.scene && typeof map.scene === 'object' ? map.scene : {};
    map.scene.terrainZones = Array.isArray(map.scene.terrainZones) ? map.scene.terrainZones : [];
    map.scene.plannedObjects = Array.isArray(map.scene.plannedObjects) ? map.scene.plannedObjects : [];
    map.scene.randomProps = map.scene.randomProps && typeof map.scene.randomProps === 'object'
      ? map.scene.randomProps
      : { countMin: 0, countMax: 0, kinds: [] };
    return map.scene;
  }

  function getMapViewport() {
    const map = getSelectedMap();
    const canvas = dom.mapPreviewCanvas;
    const worldWidth = Math.max(100, Number(map?.worldWidth) || 3200);
    const worldHeight = Math.max(100, Number(map?.worldHeight) || 2000);
    const canvasWidth = Math.max(320, canvas?.width || 1280);
    const canvasHeight = Math.max(240, canvas?.height || 760);
    const zoom = clamp(state.mapEditor.zoom, 0.35, 4);
    state.mapEditor.zoom = zoom;
    const scale = Math.min(canvasWidth / worldWidth, canvasHeight / worldHeight) * zoom * 0.92;
    const cameraX = clamp01(state.mapEditor.cameraX);
    const cameraY = clamp01(state.mapEditor.cameraY);
    const centerX = cameraX * worldWidth;
    const centerY = cameraY * worldHeight;
    return {
      map,
      canvasWidth,
      canvasHeight,
      worldWidth,
      worldHeight,
      scale,
      originX: canvasWidth * 0.5 - centerX * scale,
      originY: canvasHeight * 0.5 - centerY * scale,
    };
  }

  function resizeMapCanvas() {
    const canvas = dom.mapPreviewCanvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width || 0);
    const height = Math.round(rect.height || 0);
    if (width < 40 || height < 40) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function screenToNorm(clientX, clientY) {
    const canvas = dom.mapPreviewCanvas;
    const rect = canvas.getBoundingClientRect();
    const viewport = getMapViewport();
    const sx = (clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
    const sy = (clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
    const wx = (sx - viewport.originX) / viewport.scale;
    const wy = (sy - viewport.originY) / viewport.scale;
    return {
      x: clamp01(wx / viewport.worldWidth),
      y: clamp01(wy / viewport.worldHeight),
      sx,
      sy,
    };
  }

  function normToScreen(x, y) {
    const viewport = getMapViewport();
    return {
      x: viewport.originX + (Number(x) || 0) * viewport.worldWidth * viewport.scale,
      y: viewport.originY + (Number(y) || 0) * viewport.worldHeight * viewport.scale,
    };
  }

  function getPropDisplaySize(prop) {
    const meta = getPropMeta(prop?.kind);
    const scale = Math.max(0.1, Number(prop?.scale) || 1);
    const viewport = getMapViewport();
    return {
      w: Math.max(18, meta.w * scale * viewport.scale),
      h: Math.max(14, meta.h * scale * viewport.scale),
    };
  }

  function hitTestMapProp(clientX, clientY) {
    const map = getSelectedMap();
    const props = map?.scene?.plannedObjects || [];
    const point = screenToNorm(clientX, clientY);
    for (let index = props.length - 1; index >= 0; index -= 1) {
      const prop = props[index];
      const screen = normToScreen(prop.x, prop.y);
      const size = getPropDisplaySize(prop);
      if (Math.abs(point.sx - screen.x) <= size.w * 0.5 + 8 && Math.abs(point.sy - screen.y) <= size.h * 0.5 + 8) {
        return index;
      }
    }
    return -1;
  }

  function hitTestMapZone(clientX, clientY) {
    const map = getSelectedMap();
    const zones = map?.scene?.terrainZones || [];
    const point = screenToNorm(clientX, clientY);
    const viewport = getMapViewport();
    const mapW = viewport.worldWidth * viewport.scale;
    const mapH = viewport.worldHeight * viewport.scale;
    for (let index = zones.length - 1; index >= 0; index -= 1) {
      const zone = zones[index];
      const screen = normToScreen(zone.x, zone.y);
      const halfW = Math.max(8, (Number(zone.w) || 0.2) * mapW * 0.5);
      const halfH = Math.max(8, (Number(zone.h) || 0.2) * mapH * 0.5);
      const angle = -(Number(zone.angle) || 0);
      const dx = point.sx - screen.x;
      const dy = point.sy - screen.y;
      const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const shape = String(zone.shape || 'ellipse');
      if (shape === 'rect' || shape === 'band') {
        if (Math.abs(localX) <= halfW + 8 && Math.abs(localY) <= halfH + 8) return index;
      } else if (((localX * localX) / ((halfW + 8) * (halfW + 8))) + ((localY * localY) / ((halfH + 8) * (halfH + 8))) <= 1) {
        return index;
      }
    }
    return -1;
  }

  function selectedProp() {
    const props = getSelectedMap()?.scene?.plannedObjects || [];
    return props[state.mapEditor.selectedPropIndex] || null;
  }

  function applyWorldPayload(payload) {
    state.world = {
      maps: Array.isArray(payload?.maps) ? clone(payload.maps) : [],
      campaigns: Array.isArray(payload?.campaigns) ? clone(payload.campaigns) : [],
      enums: payload?.enums || getWorld().enums || null,
      summary: payload?.summary || null,
    };
    ensureSelections();
    renderAllWorldSections();
  }

  function renderTopbar() {
    const meta = SECTION_META[state.section] || SECTION_META.overview;
    dom.sectionTitle.textContent = meta.title;
    dom.sectionCopy.textContent = meta.copy;
  }

  function renderOverview() {
    const world = getWorld();
    const levels = world.campaigns.reduce((sum, campaign) => sum + (campaign.levels?.length || 0), 0);
    dom.metricMaps.textContent = String(world.maps.length || 0);
    dom.metricCampaigns.textContent = String(world.campaigns.length || 0);
    dom.metricLevels.textContent = String(levels);
    dom.mapsNavCount.textContent = String(world.maps.length || 0);
    dom.campaignsNavCount.textContent = String(world.campaigns.length || 0);
  }

  function renderMapList() {
    const maps = getWorld().maps;
    dom.mapList.innerHTML = maps.map((map) => {
      const usage = getMapLevelUsage(map.id);
      return `
        <button class="list-item ${map.id === state.selectedMapId ? 'active' : ''}" data-map-id="${escapeHtml(map.id)}">
          <div class="list-item-title">${escapeHtml(map.name || map.id)}</div>
          <div class="list-item-meta mono">${escapeHtml(map.id)}</div>
          <div class="list-item-meta">${Math.round(Number(map.worldWidth) || 0)} x ${Math.round(Number(map.worldHeight) || 0)} • ${usage.length} level(s)</div>
        </button>
      `;
    }).join('');
  }

  function renderObjectPalette() {
    if (!dom.objectPalette) return;
    const propKinds = getWorld().enums?.propKinds || Object.keys(PROP_COLORS);
    if (!propKinds.includes(state.mapEditor.selectedKind)) {
      state.mapEditor.selectedKind = propKinds[0] || 'red_hatchback';
    }
    dom.objectPalette.innerHTML = propKinds.map((kind) => {
      const meta = getPropMeta(kind);
      const active = kind === state.mapEditor.selectedKind ? 'active' : '';
      const color = PROP_COLORS[kind] || '#f8fafc';
      return `
        <button class="object-tile ${active}" type="button" draggable="true" data-prop-kind="${escapeHtml(kind)}">
          <i class="object-swatch" style="background:${escapeHtml(color)}"></i>
          <span>${escapeHtml(meta.label)}</span>
          <span class="list-item-meta mono">${escapeHtml(kind)}</span>
        </button>
      `;
    }).join('');
  }

  function renderObjectList() {
    if (!dom.mapObjectList) return;
    const props = getSelectedMap()?.scene?.plannedObjects || [];
    if (props.length <= 0) {
      dom.mapObjectList.innerHTML = '<div class="list-item-meta">Объектов пока нет. Выберите шаблон выше и кликните по карте.</div>';
      return;
    }
    dom.mapObjectList.innerHTML = props.map((prop, index) => {
      const meta = getPropMeta(prop.kind);
      const active = index === state.mapEditor.selectedPropIndex ? 'active' : '';
      return `
        <button class="object-row ${active}" type="button" data-object-index="${index}">
          <i class="object-swatch" style="background:${escapeHtml(PROP_COLORS[prop.kind] || '#f8fafc')}"></i>
          <span>
            <strong>${escapeHtml(prop.name || meta.label)}</strong>
            <span class="list-item-meta mono">${escapeHtml(prop.id || `prop_${index + 1}`)}${prop.zombieBreakable ? ' • break' : ''}</span>
          </span>
          <span class="list-item-meta">${Math.round((Number(prop.x) || 0) * 100)}%</span>
        </button>
      `;
    }).join('');
  }

  function selectMapProp(index) {
    const props = getSelectedMap()?.scene?.plannedObjects || [];
    state.mapEditor.selectedPropIndex = index >= 0 && index < props.length ? index : -1;
    if (state.mapEditor.selectedPropIndex >= 0) state.mapEditor.selectedZoneIndex = -1;
    renderObjectList();
    renderZoneList();
    renderMapPreview();
  }

  function clearMapPropSelection() {
    state.mapEditor.selectedPropIndex = -1;
    state.mapEditor.selectedZoneIndex = -1;
    renderObjectList();
    renderZoneList();
    renderMapPreview();
  }

  function buildNewProp(kind, x, y) {
    const map = getSelectedMap();
    const scene = ensureMapScene(map);
    const props = scene?.plannedObjects || [];
    return {
      id: uniqueId(props.map((prop) => prop.id || ''), 'prop'),
      kind: kind || state.mapEditor.selectedKind,
      x: clamp01(x),
      y: clamp01(y),
      scale: 1,
      angle: 0,
      hpMul: 1,
      zombieBreakable: false,
      name: '',
      styleTag: '',
    };
  }

  function addMapPropAt(kind, x, y) {
    const map = getSelectedMap();
    const scene = ensureMapScene(map);
    if (!scene) return;
    const prop = buildNewProp(kind, x, y);
    scene.plannedObjects.push(prop);
    state.mapEditor.selectedPropIndex = scene.plannedObjects.length - 1;
    state.mapEditor.selectedZoneIndex = -1;
    setDirty(true);
    renderMapProps();
    renderObjectList();
    renderZoneList();
    renderMapPreview();
  }

  function addMapPropAtCamera(kind) {
    addMapPropAt(kind || state.mapEditor.selectedKind, state.mapEditor.cameraX, state.mapEditor.cameraY);
  }

  function buildZoneTemplate(template) {
    const idBase = template === 'road' || template === 'road_wide' ? 'road' : 'zone';
    const wide = template === 'road_wide';
    if (template === 'road' || template === 'road_wide') {
      return {
        id: idBase,
        material: 'asphalt_wet',
        shape: 'band',
        x: state.mapEditor.cameraX,
        y: state.mapEditor.cameraY,
        w: wide ? 0.82 : 0.54,
        h: wide ? 0.16 : 0.08,
        feather: 0.08,
        alpha: 1,
        angle: 0,
        centerStripe: true,
      };
    }
    if (template === 'light_spot') {
      return {
        id: 'light_spot',
        material: 'concrete',
        shape: 'ellipse',
        x: state.mapEditor.cameraX,
        y: state.mapEditor.cameraY,
        w: 0.18,
        h: 0.1,
        feather: 0.24,
        alpha: 0.32,
        angle: 0,
        centerStripe: false,
      };
    }
    return {
      id: 'dirt_spot',
      material: 'dirt',
      shape: 'ellipse',
      x: state.mapEditor.cameraX,
      y: state.mapEditor.cameraY,
      w: 0.2,
      h: 0.14,
      feather: 0.28,
      alpha: 0.42,
      angle: 0,
      centerStripe: false,
    };
  }

  function addTerrainZoneAtCamera(template) {
    const map = getSelectedMap();
    const scene = ensureMapScene(map);
    if (!scene) return;
    const zone = buildZoneTemplate(template);
    zone.id = uniqueId(scene.terrainZones.map((entry) => entry.id || ''), zone.id);
    scene.terrainZones.push(zone);
    state.mapEditor.selectedZoneIndex = scene.terrainZones.length - 1;
    state.mapEditor.selectedPropIndex = -1;
    setDirty(true);
    renderMapZones();
    renderObjectList();
    renderZoneList();
    renderMapPreview();
  }

  function selectTerrainZone(index) {
    const zones = getSelectedMap()?.scene?.terrainZones || [];
    state.mapEditor.selectedZoneIndex = index >= 0 && index < zones.length ? index : -1;
    if (state.mapEditor.selectedZoneIndex >= 0) state.mapEditor.selectedPropIndex = -1;
    renderObjectList();
    renderZoneList();
    renderMapPreview();
  }

  function deleteMapProp(index) {
    const props = getSelectedMap()?.scene?.plannedObjects || [];
    if (index < 0 || index >= props.length) return;
    props.splice(index, 1);
    state.mapEditor.selectedPropIndex = Math.min(props.length - 1, index);
    state.mapEditor.contextPropIndex = -1;
    setDirty(true);
    renderMapProps();
    renderObjectList();
    renderMapPreview();
  }

  function deleteTerrainZone(index) {
    const zones = getSelectedMap()?.scene?.terrainZones || [];
    if (index < 0 || index >= zones.length) return;
    zones.splice(index, 1);
    state.mapEditor.selectedZoneIndex = Math.min(zones.length - 1, index);
    state.mapEditor.contextZoneIndex = -1;
    setDirty(true);
    renderMapZones();
    renderZoneList();
    renderMapPreview();
  }

  function cloneMapProp(index) {
    const props = getSelectedMap()?.scene?.plannedObjects || [];
    const prop = props[index];
    if (!prop) return;
    const copy = clone(prop);
    copy.id = uniqueId(props.map((entry) => entry.id || ''), `${prop.id || 'prop'}_copy`);
    copy.x = clamp01((Number(prop.x) || 0.5) + 0.025);
    copy.y = clamp01((Number(prop.y) || 0.5) + 0.025);
    props.push(copy);
    state.mapEditor.selectedPropIndex = props.length - 1;
    state.mapEditor.selectedZoneIndex = -1;
    setDirty(true);
    renderMapProps();
    renderObjectList();
    renderZoneList();
    renderMapPreview();
  }

  function cloneTerrainZone(index) {
    const zones = getSelectedMap()?.scene?.terrainZones || [];
    const zone = zones[index];
    if (!zone) return;
    const copy = clone(zone);
    copy.id = uniqueId(zones.map((entry) => entry.id || ''), `${zone.id || 'zone'}_copy`);
    copy.x = clamp01((Number(zone.x) || 0.5) + 0.025);
    copy.y = clamp01((Number(zone.y) || 0.5) + 0.025);
    zones.push(copy);
    state.mapEditor.selectedZoneIndex = zones.length - 1;
    state.mapEditor.selectedPropIndex = -1;
    setDirty(true);
    renderMapZones();
    renderObjectList();
    renderZoneList();
    renderMapPreview();
  }

  function deleteSelectedMapEntity() {
    if (state.mapEditor.selectedPropIndex >= 0) {
      deleteMapProp(state.mapEditor.selectedPropIndex);
      return true;
    }
    if (state.mapEditor.selectedZoneIndex >= 0) {
      deleteTerrainZone(state.mapEditor.selectedZoneIndex);
      return true;
    }
    return false;
  }

  function updateMapToolUi() {
    for (const btn of dom.mapToolButtons || []) {
      btn.classList.toggle('active', btn.dataset.mapTool === state.mapEditor.activeTool);
    }
    if (dom.mapActiveToolLabel) {
      dom.mapActiveToolLabel.textContent = state.mapEditor.activeTool === 'select'
        ? 'Выбор объектов'
        : 'Постановка объектов';
    }
    if (dom.mapZoomLabel) {
      dom.mapZoomLabel.textContent = `${Math.round(state.mapEditor.zoom * 100)}%`;
    }
  }

  function setMapSideTab(tabName) {
    state.mapEditor.activeTab = tabName || 'objects';
    if (dom.mapPanelSelect) dom.mapPanelSelect.value = state.mapEditor.activeTab;
    for (const panel of dom.mapTabPanels || []) {
      panel.classList.toggle('active', panel.dataset.mapTabPanel === state.mapEditor.activeTab);
    }
  }

  function fillMapBasics() {
    const map = getSelectedMap();
    const materials = getWorld().enums?.terrainMaterials || [];
    dom.mapBaseMaterial.innerHTML = optionTags(materials, map?.scene?.baseMaterial || 'grass');
    if (!map) return;
    dom.mapId.value = map.id || '';
    dom.mapName.value = map.name || '';
    dom.mapSubtitle.value = map.subtitle || '';
    dom.mapTheme.value = map.scene?.themeId || '';
    dom.mapWidth.value = String(map.worldWidth || '');
    dom.mapHeight.value = String(map.worldHeight || '');
    dom.mapTreeDensity.value = String(map.treeDensityMul ?? 1);
    dom.mapBaseMaterial.value = map.scene?.baseMaterial || 'grass';
    dom.mapDescription.value = map.description || '';
    dom.mapCoverFrom.value = map.cover?.from || '';
    dom.mapCoverTo.value = map.cover?.to || '';
    dom.mapCoverAccent.value = map.cover?.accent || '';
    dom.mapCoverGlow.value = map.cover?.glow || '';
  }

  function renderMapZones() {
    const map = getSelectedMap();
    const materials = getWorld().enums?.terrainMaterials || [];
    const shapes = getWorld().enums?.zoneShapes || [];
    const zones = Array.isArray(map?.scene?.terrainZones) ? map.scene.terrainZones : [];
    dom.mapZonesBody.innerHTML = zones.map((zone, index) => `
      <tr data-zone-index="${index}">
        <td><select data-field="material">${optionTags(materials, zone.material)}</select></td>
        <td><select data-field="shape">${optionTags(shapes, zone.shape)}</select></td>
        <td><input data-field="x" type="number" step="0.01" value="${zone.x ?? 0.5}" /></td>
        <td><input data-field="y" type="number" step="0.01" value="${zone.y ?? 0.5}" /></td>
        <td><input data-field="w" type="number" step="0.01" value="${zone.w ?? 0.2}" /></td>
        <td><input data-field="h" type="number" step="0.01" value="${zone.h ?? 0.2}" /></td>
        <td><input data-field="feather" type="number" step="0.01" value="${zone.feather ?? 0.12}" /></td>
        <td><input data-field="alpha" type="number" step="0.01" value="${zone.alpha ?? 0.5}" /></td>
        <td><input data-field="angle" type="number" step="0.01" value="${zone.angle ?? 0}" /></td>
        <td><input data-field="centerStripe" type="checkbox" ${zone.centerStripe ? 'checked' : ''} /></td>
        <td><button class="btn btn-danger" data-action="delete-zone">✕</button></td>
      </tr>
    `).join('');
  }

  function renderMapProps() {
    const map = getSelectedMap();
    const propKinds = getWorld().enums?.propKinds || [];
    const props = Array.isArray(map?.scene?.plannedObjects) ? map.scene.plannedObjects : [];
    dom.mapPropsBody.innerHTML = props.map((prop, index) => `
      <tr data-prop-index="${index}">
        <td><select data-field="kind">${optionTags(propKinds, prop.kind)}</select></td>
        <td><input data-field="x" type="number" step="0.01" value="${prop.x ?? 0.5}" /></td>
        <td><input data-field="y" type="number" step="0.01" value="${prop.y ?? 0.5}" /></td>
        <td><input data-field="scale" type="number" step="0.01" value="${prop.scale ?? 1}" /></td>
        <td><input data-field="angle" type="number" step="0.01" value="${prop.angle ?? 0}" /></td>
        <td><input data-field="zombieBreakable" type="checkbox" ${prop.zombieBreakable ? 'checked' : ''} /></td>
        <td><button class="btn btn-danger" data-action="delete-prop">✕</button></td>
      </tr>
    `).join('');
  }

  function renderRandomKinds() {
    const map = getSelectedMap();
    const propKinds = getWorld().enums?.propKinds || [];
    const selectedKinds = new Set(map?.scene?.randomProps?.kinds || []);
    dom.randomCountMin.value = String(map?.scene?.randomProps?.countMin ?? 0);
    dom.randomCountMax.value = String(map?.scene?.randomProps?.countMax ?? 0);
    dom.randomKindChips.innerHTML = propKinds.map((kind) => `
      <button class="chip ${selectedKinds.has(kind) ? 'active' : ''}" data-kind="${escapeHtml(kind)}" type="button">${escapeHtml(kind)}</button>
    `).join('');
  }

  function renderMapUsage() {
    const map = getSelectedMap();
    if (!map) {
      dom.mapUsage.innerHTML = '<div>Нет выбранной карты.</div>';
      return;
    }
    const usage = getMapLevelUsage(map.id);
    if (usage.length <= 0) {
      dom.mapUsage.innerHTML = '<div>Карта пока не привязана к уровням кампаний. Можно использовать в свободных забегах или повесить на новые миссии.</div>';
      return;
    }
    dom.mapUsage.innerHTML = usage.map((item) => `
      <div><strong>${escapeHtml(item.campaignName)}</strong> • ${escapeHtml(item.levelTitle)} <span class="mono">(${escapeHtml(item.levelId)})</span></div>
    `).join('');
  }

  function getZoneLabel(zone) {
    if (zone?.shape === 'band' && (zone.material === 'asphalt' || zone.material === 'asphalt_wet')) return 'Дорога';
    if (zone?.shape === 'ellipse' && zone.material === 'concrete') return 'Овальное пятно / свет';
    if (zone?.shape === 'ellipse' && zone.material === 'dirt') return 'Пятно земли';
    return `${zone?.material || 'material'} ${zone?.shape || 'zone'}`;
  }

  function renderZoneList() {
    if (!dom.mapZoneList) return;
    const zones = getSelectedMap()?.scene?.terrainZones || [];
    if (zones.length <= 0) {
      dom.mapZoneList.innerHTML = '<div class="list-item-meta">Зон пока нет. Добавьте дорогу или овальное пятно выше.</div>';
      return;
    }
    dom.mapZoneList.innerHTML = zones.map((zone, index) => `
      <button class="object-row ${index === state.mapEditor.selectedZoneIndex ? 'active' : ''}" type="button" data-zone-card-index="${index}">
        <i class="object-swatch" style="background:${escapeHtml(MATERIAL_COLORS[zone.material] || '#64748b')}"></i>
        <span>
          <strong>${escapeHtml(getZoneLabel(zone))}</strong>
          <span class="list-item-meta mono">${escapeHtml(zone.id || `zone_${index + 1}`)}</span>
        </span>
        <span class="list-item-meta">${Math.round((Number(zone.w) || 0) * 100)}%</span>
      </button>
    `).join('');
  }

  function hideMapContextMenu() {
    dom.mapContextMenu?.classList.add('hidden');
    state.mapEditor.contextPropIndex = -1;
    state.mapEditor.contextZoneIndex = -1;
    state.mapEditor.contextKind = '';
  }

  function showMapContextMenu(clientX, clientY, kind, index) {
    if (!dom.mapContextMenu) return;
    state.mapEditor.contextKind = kind;
    state.mapEditor.contextPropIndex = kind === 'prop' ? index : -1;
    state.mapEditor.contextZoneIndex = kind === 'zone' ? index : -1;
    dom.mapContextMenu.style.left = `${Math.min(window.innerWidth - 196, clientX)}px`;
    dom.mapContextMenu.style.top = `${Math.min(window.innerHeight - 132, clientY)}px`;
    dom.mapContextMenu.classList.remove('hidden');
  }

  function openPropModal(index) {
    const props = getSelectedMap()?.scene?.plannedObjects || [];
    const prop = props[index];
    if (!prop || !dom.propModal) return;
    state.mapEditor.modalPropIndex = index;
    const propKinds = getWorld().enums?.propKinds || Object.keys(PROP_COLORS);
    dom.propModalKind.innerHTML = optionTags(propKinds, prop.kind);
    dom.propModalId.value = prop.id || `prop_${index + 1}`;
    dom.propModalName.value = prop.name || '';
    dom.propModalKind.value = prop.kind || propKinds[0] || '';
    dom.propModalStyle.value = prop.styleTag || '';
    dom.propModalX.value = String(Number(prop.x ?? 0.5).toFixed(3));
    dom.propModalY.value = String(Number(prop.y ?? 0.5).toFixed(3));
    dom.propModalScale.value = String(prop.scale ?? 1);
    dom.propModalAngle.value = String(Number(radToDeg(prop.angle)).toFixed(1));
    dom.propModalHpMul.value = String(prop.hpMul ?? 1);
    if (dom.propModalZombieBreakable) dom.propModalZombieBreakable.checked = prop.zombieBreakable === true;
    const meta = getPropMeta(prop.kind);
    const baseHp = prop.zombieBreakable ? (Number(ZOMBIE_BREAKABLE_PROP_HP[prop.kind]) || Number(meta.hp) || 1) : (Number(meta.hp) || 1);
    const hp = Math.round(baseHp * Math.max(0.1, Number(prop.hpMul) || 1));
    dom.propModalTemplate.textContent = `${meta.destructible ? 'Разрушаемый' : 'Неразрушаемый'} • HP ${hp}${meta.explosive ? ' • взрывается' : ''}`;
    if (prop.zombieBreakable) dom.propModalTemplate.textContent = `Zombie break • HP ${hp} • explodes, disappears`;
    dom.propModal.classList.remove('hidden');
  }

  function closePropModal() {
    dom.propModal?.classList.add('hidden');
    state.mapEditor.modalPropIndex = -1;
  }

  function openZoneModal(index) {
    const zones = getSelectedMap()?.scene?.terrainZones || [];
    const zone = zones[index];
    if (!zone || !dom.zoneModal) return;
    state.mapEditor.modalZoneIndex = index;
    dom.zoneModalMaterial.innerHTML = optionTags(getWorld().enums?.terrainMaterials || [], zone.material);
    dom.zoneModalShape.innerHTML = optionTags(getWorld().enums?.zoneShapes || [], zone.shape);
    dom.zoneModalId.value = zone.id || `zone_${index + 1}`;
    dom.zoneModalMaterial.value = zone.material || 'grass';
    dom.zoneModalShape.value = zone.shape || 'ellipse';
    dom.zoneModalStripe.checked = zone.centerStripe === true;
    dom.zoneModalX.value = String(Number(zone.x ?? 0.5).toFixed(3));
    dom.zoneModalY.value = String(Number(zone.y ?? 0.5).toFixed(3));
    dom.zoneModalW.value = String(Number(zone.w ?? 0.2).toFixed(3));
    dom.zoneModalH.value = String(Number(zone.h ?? 0.2).toFixed(3));
    dom.zoneModalFeather.value = String(zone.feather ?? 0.12);
    dom.zoneModalAlpha.value = String(zone.alpha ?? 0.5);
    dom.zoneModalAngle.value = String(zone.angle ?? 0);
    dom.zoneModal.classList.remove('hidden');
  }

  function closeZoneModal() {
    dom.zoneModal?.classList.add('hidden');
    state.mapEditor.modalZoneIndex = -1;
  }

  function saveZoneModal() {
    const zones = getSelectedMap()?.scene?.terrainZones || [];
    const zone = zones[state.mapEditor.modalZoneIndex];
    if (!zone) return;
    zone.id = slugify(dom.zoneModalId.value, zone.id || 'zone');
    zone.material = dom.zoneModalMaterial.value || zone.material || 'grass';
    zone.shape = dom.zoneModalShape.value || zone.shape || 'ellipse';
    zone.centerStripe = !!dom.zoneModalStripe.checked;
    zone.x = clamp01(Number(dom.zoneModalX.value));
    zone.y = clamp01(Number(dom.zoneModalY.value));
    zone.w = clamp(Number(dom.zoneModalW.value), 0.01, 2.5);
    zone.h = clamp(Number(dom.zoneModalH.value), 0.01, 2.5);
    zone.feather = clamp(Number(dom.zoneModalFeather.value), 0, 0.5);
    zone.alpha = clamp(Number(dom.zoneModalAlpha.value), 0, 1);
    zone.angle = clamp(Number(dom.zoneModalAngle.value), -Math.PI * 2, Math.PI * 2);
    setDirty(true);
    renderMapZones();
    renderZoneList();
    renderMapPreview();
    closeZoneModal();
  }

  function savePropModal() {
    const props = getSelectedMap()?.scene?.plannedObjects || [];
    const prop = props[state.mapEditor.modalPropIndex];
    if (!prop) return;
    prop.id = slugify(dom.propModalId.value, prop.id || 'prop');
    prop.name = dom.propModalName.value.trim();
    prop.kind = dom.propModalKind.value || prop.kind;
    prop.styleTag = dom.propModalStyle.value.trim();
    prop.x = clamp01(Number(dom.propModalX.value));
    prop.y = clamp01(Number(dom.propModalY.value));
    prop.scale = clamp(Number(dom.propModalScale.value), 0.1, 4);
    prop.angle = clamp(degToRad(dom.propModalAngle.value), -Math.PI * 2, Math.PI * 2);
    prop.hpMul = clamp(Number(dom.propModalHpMul.value), 0.1, 5);
    prop.zombieBreakable = !!dom.propModalZombieBreakable?.checked;
    setDirty(true);
    renderMapProps();
    renderObjectList();
    renderMapPreview();
    closePropModal();
  }

  function isTypingTarget(target) {
    const tagName = String(target?.tagName || '').toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable === true;
  }

  function renderMapPreview() {
    const map = getSelectedMap();
    const canvas = dom.mapPreviewCanvas;
    if (!canvas) return;
    resizeMapCanvas();
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateMapToolUi();
    if (!map) return;
    const viewport = getMapViewport();
    const mapX = viewport.originX;
    const mapY = viewport.originY;
    const mapW = viewport.worldWidth * viewport.scale;
    const mapH = viewport.worldHeight * viewport.scale;

    const baseMaterial = map.scene?.baseMaterial || 'grass';
    ctx.fillStyle = '#060a10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapX, mapY, mapW, mapH);
    ctx.clip();

    ctx.fillStyle = MATERIAL_COLORS[baseMaterial] || '#334155';
    ctx.fillRect(mapX, mapY, mapW, mapH);

    const grid = 240 * viewport.scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.055)';
    ctx.lineWidth = 1;
    if (grid > 18) {
      for (let x = mapX; x <= mapX + mapW; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, mapY);
        ctx.lineTo(x, mapY + mapH);
        ctx.stroke();
      }
      for (let y = mapY; y <= mapY + mapH; y += grid) {
        ctx.beginPath();
        ctx.moveTo(mapX, y);
        ctx.lineTo(mapX + mapW, y);
        ctx.stroke();
      }
    }

    const cover = map.cover || {};
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, cover.from || 'rgba(0,0,0,0)');
    grad.addColorStop(1, cover.to || 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = grad;
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.globalAlpha = 1;

    const drawZone = (zone, index) => {
      ctx.save();
      ctx.translate(mapX + zone.x * mapW, mapY + zone.y * mapH);
      ctx.rotate(Number(zone.angle) || 0);
      ctx.globalAlpha = Math.max(0.05, Math.min(0.9, Number(zone.alpha) || 0.5));
      ctx.fillStyle = MATERIAL_COLORS[zone.material] || '#64748b';
      const w = Math.max(8, zone.w * mapW);
      const h = Math.max(8, zone.h * mapH);
      if (zone.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
      }
      if (zone.centerStripe) {
        ctx.strokeStyle = 'rgba(255, 241, 214, 0.4)';
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 12]);
        ctx.beginPath();
        ctx.moveTo(-w * 0.5 + 16, 0);
        ctx.lineTo(w * 0.5 - 16, 0);
        ctx.stroke();
      }
      if (index === state.mapEditor.selectedZoneIndex) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#6ce0b3';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        if (zone.shape === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(0, 0, w * 0.5 + 6, h * 0.5 + 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(-w * 0.5 - 6, -h * 0.5 - 6, w + 12, h + 12);
        }
      }
      ctx.restore();
    };

    for (const [index, zone] of (map.scene?.terrainZones || []).entries()) drawZone(zone, index);

    for (const [index, prop] of (map.scene?.plannedObjects || []).entries()) {
      const point = normToScreen(prop.x, prop.y);
      const x = point.x;
      const y = point.y;
      const color = PROP_COLORS[prop.kind] || '#f8fafc';
      const size = getPropDisplaySize(prop);
      const selected = index === state.mapEditor.selectedPropIndex;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Number(prop.angle) || 0);
      if (selected) {
        ctx.strokeStyle = '#ffcc73';
        ctx.lineWidth = 3;
        ctx.strokeRect(-size.w * 0.5 - 5, -size.h * 0.5 - 5, size.w + 10, size.h + 10);
      }
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.88;
      ctx.fillRect(-size.w * 0.5, -size.h * 0.5, size.w, size.h);
      if (prop.zombieBreakable) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(-size.w * 0.5 + 3, -size.h * 0.5 + 3, size.w - 6, size.h - 6);
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#061018';
      ctx.font = '12px Bahnschrift';
      ctx.fillText((prop.name || prop.kind).replace(/_.*/, ''), -size.w * 0.45, -size.h * 0.5 - 7);
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapW, mapH);
    ctx.restore();

    ctx.fillStyle = 'rgba(11, 16, 24, 0.74)';
    ctx.fillRect(14, canvas.height - 48, 240, 30);
    ctx.fillStyle = '#f7efe6';
    ctx.font = '13px Bahnschrift';
    ctx.fillText(`${map.name || map.id} • ${Math.round(map.worldWidth)} x ${Math.round(map.worldHeight)}`, 24, canvas.height - 28);
  }

  function renderMapSection() {
    renderMapList();
    fillMapBasics();
    renderMapZones();
    renderMapProps();
    renderRandomKinds();
    renderObjectPalette();
    renderObjectList();
    renderZoneList();
    renderMapPreview();
    renderMapUsage();
  }

  function renderCampaignList() {
    const campaigns = getWorld().campaigns;
    dom.campaignList.innerHTML = campaigns.map((campaign) => `
      <button class="list-item ${campaign.id === state.selectedCampaignId ? 'active' : ''}" data-campaign-id="${escapeHtml(campaign.id)}">
        <div class="list-item-title">${escapeHtml(campaign.name || campaign.id)}</div>
        <div class="list-item-meta mono">${escapeHtml(campaign.id)}</div>
        <div class="list-item-meta">${campaign.levels?.length || 0} level(s) • ${escapeHtml(campaign.shortName || '')}</div>
      </button>
    `).join('');
  }

  function renderCampaignBasics() {
    const campaign = getSelectedCampaign();
    if (!campaign) {
      [
        dom.campaignId,
        dom.campaignName,
        dom.campaignShortName,
        dom.campaignTagline,
        dom.campaignDescription,
        dom.campaignCoverFrom,
        dom.campaignCoverTo,
        dom.campaignCoverAccent,
        dom.campaignCoverGlow,
        dom.campaignCoverArt,
      ].forEach((input) => { if (input) input.value = ''; });
      dom.campaignLevelList.innerHTML = '';
      dom.levelGoalsBody.innerHTML = '';
      return;
    }
    dom.campaignId.value = campaign.id || '';
    dom.campaignName.value = campaign.name || '';
    dom.campaignShortName.value = campaign.shortName || '';
    dom.campaignTagline.value = campaign.tagline || '';
    dom.campaignDescription.value = campaign.description || '';
    dom.campaignCoverFrom.value = campaign.cover?.from || '';
    dom.campaignCoverTo.value = campaign.cover?.to || '';
    dom.campaignCoverAccent.value = campaign.cover?.accent || '';
    dom.campaignCoverGlow.value = campaign.cover?.glow || '';
    dom.campaignCoverArt.value = campaign.cover?.artLabel || '';
  }

  function renderLevelList() {
    const campaign = getSelectedCampaign();
    const levels = Array.isArray(campaign?.levels) ? campaign.levels : [];
    dom.campaignLevelList.innerHTML = levels.map((level, index) => `
      <button class="level-card ${level.id === state.selectedLevelId ? 'active' : ''}" data-level-id="${escapeHtml(level.id)}">
        <strong>${index + 1}. ${escapeHtml(level.title || level.id)}</strong>
        <div class="list-item-meta mono">${escapeHtml(level.id)}</div>
        <div class="list-item-meta">${escapeHtml(level.mapId || '')}</div>
      </button>
    `).join('');
  }

  function renderLevelEditor() {
    const level = getSelectedLevel();
    const mapOptions = getWorld().maps.map((map) => ({ value: map.id, label: `${map.name} (${map.id})` }));
    dom.levelMapId.innerHTML = optionTags(mapOptions, level?.mapId || '');
    if (!level) {
      [dom.levelId, dom.levelTitle, dom.levelBrief, dom.levelScenario, dom.modifierEnemySpawn, dom.modifierEnemyHp, dom.modifierBossInterval].forEach((input) => {
        if (input) input.value = '';
      });
      dom.levelGoalsBody.innerHTML = '';
      return;
    }
    dom.levelId.value = level.id || '';
    dom.levelMapId.value = level.mapId || '';
    dom.levelTitle.value = level.title || '';
    dom.levelBrief.value = level.brief || '';
    dom.levelScenario.value = level.scenario || '';
    dom.modifierEnemySpawn.value = String(level.modifiers?.enemySpawnMul ?? 1);
    dom.modifierEnemyHp.value = String(level.modifiers?.enemyHpMul ?? 1);
    dom.modifierBossInterval.value = String(level.modifiers?.bossKillInterval ?? 40);
    const goalTypes = getWorld().enums?.goalTypes || [];
    dom.levelGoalsBody.innerHTML = (level.goals || []).map((goal, index) => `
      <tr data-goal-index="${index}">
        <td><select data-field="type">${optionTags(goalTypes, goal.type)}</select></td>
        <td><input data-field="target" type="number" value="${goal.target ?? 1}" /></td>
        <td><input data-field="label" value="${escapeHtml(goal.label || '')}" /></td>
        <td><button class="btn btn-danger" data-action="delete-goal">✕</button></td>
      </tr>
    `).join('');
  }

  function renderCampaignSection() {
    renderCampaignList();
    renderCampaignBasics();
    renderLevelList();
    renderLevelEditor();
  }

  function renderAllWorldSections() {
    ensureSelections();
    renderOverview();
    renderMapSection();
    renderCampaignSection();
  }

  function updateSelectedMap(mutator) {
    const map = getSelectedMap();
    if (!map) return;
    mutator(map);
    ensureSelections();
    setDirty(true);
    renderOverview();
    renderMapList();
    renderCampaignSection();
    renderObjectList();
    renderMapPreview();
    renderMapUsage();
  }

  function updateSelectedCampaign(mutator) {
    const campaign = getSelectedCampaign();
    if (!campaign) return;
    mutator(campaign);
    ensureSelections();
    setDirty(true);
    renderOverview();
    renderCampaignList();
    renderLevelList();
    renderLevelEditor();
    renderMapUsage();
  }

  function updateSelectedLevel(mutator) {
    const level = getSelectedLevel();
    if (!level) return;
    mutator(level);
    ensureSelections();
    setDirty(true);
    renderOverview();
    renderCampaignList();
    renderLevelList();
  }

  function setSection(section) {
    state.section = SECTION_META[section] ? section : 'overview';
    for (const [key, node] of Object.entries(dom.sections)) {
      node.classList.toggle('hidden', key !== state.section);
    }
    for (const btn of dom.navButtons) {
      btn.classList.toggle('active', btn.dataset.section === state.section);
    }
    renderTopbar();
    maybeLoadLegacyFrame(state.section);
    if (state.section === 'maps') {
      window.requestAnimationFrame(() => renderMapPreview());
    }
  }

  function resizeFrame(frame) {
    if (!frame) return;
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc?.body) return;
      const nextHeight = Math.max(doc.body.scrollHeight, doc.documentElement?.scrollHeight || 0, 1200);
      frame.style.height = `${nextHeight + 24}px`;
    } catch {
      // same-origin only; ignore otherwise
    }
  }

  function maybeLoadLegacyFrame(section) {
    if (section === 'news' && !state.framesLoaded.news) {
      dom.newsFrame.src = '/admin/news';
      dom.newsFrame.addEventListener('load', () => resizeFrame(dom.newsFrame), { once: true });
      state.framesLoaded.news = true;
    }
    if (section === 'skills' && !state.framesLoaded.skills) {
      dom.skillsFrame.src = '/admin/skills';
      dom.skillsFrame.addEventListener('load', () => resizeFrame(dom.skillsFrame), { once: true });
      state.framesLoaded.skills = true;
    }
    if (section === 'news') resizeFrame(dom.newsFrame);
    if (section === 'skills') resizeFrame(dom.skillsFrame);
  }

  async function loadSessionAndWorld() {
    const [meData, worldData] = await Promise.all([
      fetchJson('/api/admin/me'),
      fetchJson('/api/admin/world-content'),
    ]);
    state.me = meData.user || null;
    dom.userName.textContent = state.me?.login || '-';
    dom.userRole.textContent = state.me?.canManageAdmins ? 'manager' : 'editor';
    applyWorldPayload(worldData);
    setDirty(false);
  }

  async function saveWorldContent() {
    if (!state.world) return;
    try {
      setStatus(dom.globalStatus, 'Сохраняем карты и кампании...', 'warn');
      const payload = {
        maps: clone(getWorld().maps),
        campaigns: clone(getWorld().campaigns),
      };
      const data = await fetchJson('/api/admin/world-content', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      applyWorldPayload(data);
      setDirty(false);
      setStatus(dom.globalStatus, 'Карты и кампании сохранены. Новые комнаты уже будут использовать свежую версию.', 'ok');
    } catch (err) {
      setStatus(dom.globalStatus, err.message, 'err');
    }
  }

  async function resetWorldContent() {
    if (!confirm('Сбросить карты и кампании к дефолтному состоянию? Это перетрёт текущие несохранённые правки.')) return;
    try {
      const data = await fetchJson('/api/admin/world-content/reset', { method: 'POST' });
      applyWorldPayload(data);
      setDirty(false);
      setStatus(dom.globalStatus, 'Каталог карт и кампаний сброшен к дефолту.', 'ok');
    } catch (err) {
      setStatus(dom.globalStatus, err.message, 'err');
    }
  }

  async function login() {
    try {
      await fetchJson('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          login: dom.loginName.value.trim(),
          password: dom.loginPassword.value,
        }),
      });
      dom.loginView.classList.add('hidden');
      dom.app.classList.remove('hidden');
      await loadSessionAndWorld();
      setSection('overview');
      setStatus(dom.globalStatus, 'Admin Hub загружен.', 'ok');
    } catch (err) {
      setStatus(dom.loginStatus, err.message, 'err');
    }
  }

  async function logout() {
    await fetchJson('/api/admin/logout', { method: 'POST' }).catch(() => {});
    window.location.reload();
  }

  async function reloadAll() {
    try {
      await loadSessionAndWorld();
      setStatus(dom.globalStatus, 'Данные админки обновлены.', 'ok');
    } catch (err) {
      setStatus(dom.globalStatus, err.message, 'err');
    }
  }

  function addMap() {
    const world = getWorld();
    const id = uniqueId(world.maps.map((map) => map.id), 'new_map');
    const template = clone(world.maps[0] || {
      name: 'New Map',
      subtitle: '',
      description: '',
      worldWidth: 3200,
      worldHeight: 2000,
      treeDensityMul: 1,
      cover: { from: '#1f2937', to: '#0f172a', accent: '#ff8f53', glow: 'rgba(255, 143, 83, 0.22)', artLabel: '' },
      scene: { themeId: 'new_map', baseMaterial: 'grass', terrainZones: [], plannedObjects: [], randomProps: { countMin: 0, countMax: 0, kinds: [] } },
    });
    template.id = id;
    template.name = `${template.name || 'New Map'} Copy`;
    template.scene = template.scene || {};
    template.scene.themeId = id;
    world.maps.push(template);
    state.selectedMapId = id;
    setDirty(true);
    renderAllWorldSections();
  }

  function cloneMap() {
    const map = getSelectedMap();
    if (!map) return;
    const world = getWorld();
    const copy = clone(map);
    copy.id = uniqueId(world.maps.map((entry) => entry.id), `${map.id}_copy`);
    copy.name = `${map.name || map.id} Copy`;
    copy.scene.themeId = copy.id;
    world.maps.push(copy);
    state.selectedMapId = copy.id;
    setDirty(true);
    renderAllWorldSections();
  }

  function deleteMap() {
    const world = getWorld();
    const map = getSelectedMap();
    if (!map) return;
    if (world.maps.length <= 1) {
      setStatus(dom.globalStatus, 'Нельзя удалить последнюю карту.', 'err');
      return;
    }
    const usage = getMapLevelUsage(map.id);
    if (usage.length > 0) {
      setStatus(dom.globalStatus, `Карта ${map.id} привязана к ${usage.length} уровню(ям). Сначала перевесьте эти уровни на другие карты.`, 'err');
      return;
    }
    if (!confirm(`Удалить карту ${map.name || map.id}?`)) return;
    const index = world.maps.findIndex((entry) => entry.id === map.id);
    if (index >= 0) world.maps.splice(index, 1);
    state.selectedMapId = world.maps[Math.max(0, index - 1)]?.id || world.maps[0]?.id || '';
    setDirty(true);
    renderAllWorldSections();
  }

  function addCampaign() {
    const world = getWorld();
    const id = uniqueId(world.campaigns.map((campaign) => campaign.id), 'new_campaign');
    const firstMapId = world.maps[0]?.id || '';
    const campaign = {
      id,
      name: 'New Campaign',
      shortName: 'Новая кампания',
      tagline: '',
      description: '',
      cover: {
        from: '#2a1810',
        to: '#111720',
        accent: '#ff8f53',
        glow: 'rgba(255, 143, 83, 0.22)',
        artLabel: 'NEW // CHAOS',
      },
      levels: [
        {
          id: 'level_1',
          title: 'Первый уровень',
          brief: '',
          scenario: '',
          mapId: firstMapId,
          goals: [{ id: 'goal_1', type: 'survive', target: 90, label: 'Выжить 90 секунд' }],
          modifiers: { enemySpawnMul: 1, enemyHpMul: 1, bossKillInterval: 40 },
        },
      ],
    };
    world.campaigns.push(campaign);
    state.selectedCampaignId = id;
    state.selectedLevelId = campaign.levels[0].id;
    setDirty(true);
    renderAllWorldSections();
  }

  function cloneCampaign() {
    const campaign = getSelectedCampaign();
    if (!campaign) return;
    const world = getWorld();
    const copy = clone(campaign);
    copy.id = uniqueId(world.campaigns.map((entry) => entry.id), `${campaign.id}_copy`);
    copy.name = `${campaign.name || campaign.id} Copy`;
    const levelIds = new Set();
    copy.levels = (copy.levels || []).map((level, index) => {
      const nextId = uniqueId(levelIds, `${level.id || 'level'}_${index + 1}`);
      levelIds.add(nextId);
      return { ...level, id: nextId };
    });
    world.campaigns.push(copy);
    state.selectedCampaignId = copy.id;
    state.selectedLevelId = copy.levels[0]?.id || '';
    setDirty(true);
    renderAllWorldSections();
  }

  function deleteCampaign() {
    const world = getWorld();
    const campaign = getSelectedCampaign();
    if (!campaign) return;
    if (!confirm(`Удалить кампанию ${campaign.name || campaign.id}?`)) return;
    const index = world.campaigns.findIndex((entry) => entry.id === campaign.id);
    if (index >= 0) world.campaigns.splice(index, 1);
    state.selectedCampaignId = world.campaigns[Math.max(0, index - 1)]?.id || world.campaigns[0]?.id || '';
    ensureSelections();
    setDirty(true);
    renderAllWorldSections();
  }

  function addLevel() {
    const campaign = getSelectedCampaign();
    if (!campaign) return;
    const mapId = getWorld().maps[0]?.id || '';
    const level = {
      id: uniqueId((campaign.levels || []).map((entry) => entry.id), 'level'),
      title: 'Новый уровень',
      brief: '',
      scenario: '',
      mapId,
      goals: [{ id: 'goal_1', type: 'survive', target: 90, label: 'Выжить 90 секунд' }],
      modifiers: { enemySpawnMul: 1, enemyHpMul: 1, bossKillInterval: 40 },
    };
    campaign.levels = Array.isArray(campaign.levels) ? campaign.levels : [];
    campaign.levels.push(level);
    state.selectedLevelId = level.id;
    setDirty(true);
    renderCampaignSection();
    renderOverview();
  }

  function cloneLevel() {
    const campaign = getSelectedCampaign();
    const level = getSelectedLevel();
    if (!campaign || !level) return;
    const copy = clone(level);
    copy.id = uniqueId((campaign.levels || []).map((entry) => entry.id), `${level.id}_copy`);
    copy.title = `${level.title || level.id} Copy`;
    campaign.levels.push(copy);
    state.selectedLevelId = copy.id;
    setDirty(true);
    renderCampaignSection();
    renderOverview();
  }

  function deleteLevel() {
    const campaign = getSelectedCampaign();
    const level = getSelectedLevel();
    if (!campaign || !level) return;
    if (!confirm(`Удалить уровень ${level.title || level.id}?`)) return;
    const index = campaign.levels.findIndex((entry) => entry.id === level.id);
    if (index >= 0) campaign.levels.splice(index, 1);
    state.selectedLevelId = campaign.levels[Math.max(0, index - 1)]?.id || campaign.levels[0]?.id || '';
    setDirty(true);
    renderCampaignSection();
    renderOverview();
  }

  function moveLevel(direction) {
    const campaign = getSelectedCampaign();
    const level = getSelectedLevel();
    if (!campaign || !level) return;
    const index = campaign.levels.findIndex((entry) => entry.id === level.id);
    if (index < 0) return;
    const nextIndex = direction < 0 ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= campaign.levels.length) return;
    const [moved] = campaign.levels.splice(index, 1);
    campaign.levels.splice(nextIndex, 0, moved);
    setDirty(true);
    renderCampaignSection();
  }

  function addGoal() {
    const level = getSelectedLevel();
    if (!level) return;
    level.goals = Array.isArray(level.goals) ? level.goals : [];
    level.goals.push({
      id: uniqueId((level.goals || []).map((goal) => goal.id), 'goal'),
      type: 'survive',
      target: 90,
      label: 'Выжить 90 секунд',
    });
    setDirty(true);
    renderLevelEditor();
    renderOverview();
  }

  function bindStaticFieldHandlers() {
    dom.mapId.addEventListener('input', () => {
      const map = getSelectedMap();
      if (!map) return;
      const oldId = map.id;
      const nextId = slugify(dom.mapId.value, oldId);
      map.id = nextId;
      map.scene = map.scene || {};
      if (!map.scene.themeId || map.scene.themeId === oldId) map.scene.themeId = nextId;
      state.selectedMapId = nextId;
      setDirty(true);
      if (oldId !== nextId) {
        for (const campaign of getWorld().campaigns) {
          for (const level of campaign.levels || []) {
            if (level.mapId === oldId) level.mapId = nextId;
          }
        }
      }
      renderAllWorldSections();
    });
    dom.mapName.addEventListener('input', () => updateSelectedMap((map) => { map.name = dom.mapName.value; }));
    dom.mapSubtitle.addEventListener('input', () => updateSelectedMap((map) => { map.subtitle = dom.mapSubtitle.value; }));
    dom.mapTheme.addEventListener('input', () => updateSelectedMap((map) => { map.scene.themeId = slugify(dom.mapTheme.value, map.id); }));
    dom.mapWidth.addEventListener('input', () => updateSelectedMap((map) => { map.worldWidth = Number(dom.mapWidth.value) || map.worldWidth; }));
    dom.mapHeight.addEventListener('input', () => updateSelectedMap((map) => { map.worldHeight = Number(dom.mapHeight.value) || map.worldHeight; }));
    dom.mapTreeDensity.addEventListener('input', () => updateSelectedMap((map) => { map.treeDensityMul = Number(dom.mapTreeDensity.value) || 0; }));
    dom.mapBaseMaterial.addEventListener('change', () => updateSelectedMap((map) => { map.scene.baseMaterial = dom.mapBaseMaterial.value; }));
    dom.mapDescription.addEventListener('input', () => updateSelectedMap((map) => { map.description = dom.mapDescription.value; }));
    dom.mapCoverFrom.addEventListener('input', () => updateSelectedMap((map) => { map.cover.from = dom.mapCoverFrom.value; renderMapPreview(); }));
    dom.mapCoverTo.addEventListener('input', () => updateSelectedMap((map) => { map.cover.to = dom.mapCoverTo.value; renderMapPreview(); }));
    dom.mapCoverAccent.addEventListener('input', () => updateSelectedMap((map) => { map.cover.accent = dom.mapCoverAccent.value; }));
    dom.mapCoverGlow.addEventListener('input', () => updateSelectedMap((map) => { map.cover.glow = dom.mapCoverGlow.value; }));
    dom.randomCountMin.addEventListener('input', () => updateSelectedMap((map) => { map.scene.randomProps.countMin = Number(dom.randomCountMin.value) || 0; }));
    dom.randomCountMax.addEventListener('input', () => updateSelectedMap((map) => { map.scene.randomProps.countMax = Number(dom.randomCountMax.value) || 0; }));

    dom.campaignId.addEventListener('input', () => {
      const campaign = getSelectedCampaign();
      if (!campaign) return;
      const oldId = campaign.id;
      campaign.id = slugify(dom.campaignId.value, oldId);
      state.selectedCampaignId = campaign.id;
      setDirty(true);
      renderCampaignSection();
      renderOverview();
    });
    dom.campaignName.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.name = dom.campaignName.value; }));
    dom.campaignShortName.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.shortName = dom.campaignShortName.value; }));
    dom.campaignTagline.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.tagline = dom.campaignTagline.value; }));
    dom.campaignDescription.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.description = dom.campaignDescription.value; }));
    dom.campaignCoverFrom.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.cover.from = dom.campaignCoverFrom.value; }));
    dom.campaignCoverTo.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.cover.to = dom.campaignCoverTo.value; }));
    dom.campaignCoverAccent.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.cover.accent = dom.campaignCoverAccent.value; }));
    dom.campaignCoverGlow.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.cover.glow = dom.campaignCoverGlow.value; }));
    dom.campaignCoverArt.addEventListener('input', () => updateSelectedCampaign((campaign) => { campaign.cover.artLabel = dom.campaignCoverArt.value; }));

    dom.levelId.addEventListener('input', () => {
      const level = getSelectedLevel();
      if (!level) return;
      const oldId = level.id;
      level.id = slugify(dom.levelId.value, oldId);
      state.selectedLevelId = level.id;
      setDirty(true);
      renderCampaignSection();
      renderOverview();
    });
    dom.levelMapId.addEventListener('change', () => updateSelectedLevel((level) => { level.mapId = dom.levelMapId.value; }));
    dom.levelTitle.addEventListener('input', () => updateSelectedLevel((level) => { level.title = dom.levelTitle.value; }));
    dom.levelBrief.addEventListener('input', () => updateSelectedLevel((level) => { level.brief = dom.levelBrief.value; }));
    dom.levelScenario.addEventListener('input', () => updateSelectedLevel((level) => { level.scenario = dom.levelScenario.value; }));
    dom.modifierEnemySpawn.addEventListener('input', () => updateSelectedLevel((level) => { level.modifiers.enemySpawnMul = Number(dom.modifierEnemySpawn.value) || 1; }));
    dom.modifierEnemyHp.addEventListener('input', () => updateSelectedLevel((level) => { level.modifiers.enemyHpMul = Number(dom.modifierEnemyHp.value) || 1; }));
    dom.modifierBossInterval.addEventListener('input', () => updateSelectedLevel((level) => { level.modifiers.bossKillInterval = Number(dom.modifierBossInterval.value) || 40; }));
  }

  function bindDynamicHandlers() {
    dom.mapList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-map-id]');
      if (!btn) return;
      state.selectedMapId = btn.dataset.mapId || '';
      state.mapEditor.selectedPropIndex = -1;
      state.mapEditor.selectedZoneIndex = -1;
      state.mapEditor.cameraX = 0.5;
      state.mapEditor.cameraY = 0.5;
      renderMapSection();
    });

    dom.mapPanelSelect?.addEventListener('change', () => {
      setMapSideTab(dom.mapPanelSelect.value || 'objects');
    });

    dom.objectPalette?.addEventListener('click', (event) => {
      const tile = event.target.closest('[data-prop-kind]');
      if (!tile) return;
      state.mapEditor.selectedKind = tile.dataset.propKind || state.mapEditor.selectedKind;
      state.mapEditor.activeTool = 'place';
      renderObjectPalette();
      updateMapToolUi();
    });

    dom.objectPalette?.addEventListener('dblclick', (event) => {
      const tile = event.target.closest('[data-prop-kind]');
      if (!tile) return;
      state.mapEditor.selectedKind = tile.dataset.propKind || state.mapEditor.selectedKind;
      renderObjectPalette();
      addMapPropAtCamera(state.mapEditor.selectedKind);
    });

    dom.objectPalette?.addEventListener('dragstart', (event) => {
      const tile = event.target.closest('[data-prop-kind]');
      if (!tile) return;
      event.dataTransfer.setData('text/plain', tile.dataset.propKind || '');
      event.dataTransfer.effectAllowed = 'copy';
    });

    dom.mapObjectList?.addEventListener('click', (event) => {
      const row = event.target.closest('[data-object-index]');
      if (!row) return;
      selectMapProp(Number(row.dataset.objectIndex));
    });

    dom.mapObjectList?.addEventListener('dblclick', (event) => {
      const row = event.target.closest('[data-object-index]');
      if (!row) return;
      openPropModal(Number(row.dataset.objectIndex));
    });

    dom.mapZoneList?.addEventListener('click', (event) => {
      const row = event.target.closest('[data-zone-card-index]');
      if (!row) return;
      selectTerrainZone(Number(row.dataset.zoneCardIndex));
    });
    dom.mapZoneList?.addEventListener('dblclick', (event) => {
      const row = event.target.closest('[data-zone-card-index]');
      if (!row) return;
      openZoneModal(Number(row.dataset.zoneCardIndex));
    });

    for (const btn of dom.mapZoneTemplateButtons || []) {
      btn.addEventListener('click', () => {
        addTerrainZoneAtCamera(btn.dataset.addZoneTemplate || 'road');
      });
    }

    dom.mapPreviewCanvas?.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });

    dom.mapPreviewCanvas?.addEventListener('drop', (event) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData('text/plain') || state.mapEditor.selectedKind;
      const point = screenToNorm(event.clientX, event.clientY);
      state.mapEditor.selectedKind = kind;
      renderObjectPalette();
      addMapPropAt(kind, point.x, point.y);
    });

    dom.mapPreviewCanvas?.addEventListener('pointerdown', (event) => {
      if (event.button === 2) return;
      hideMapContextMenu();
      state.mapEditor.pointerDown = true;
      state.mapEditor.pointerButton = event.button;
      state.mapEditor.pointerStartX = event.clientX;
      state.mapEditor.pointerStartY = event.clientY;
      state.mapEditor.cameraStartX = state.mapEditor.cameraX;
      state.mapEditor.cameraStartY = state.mapEditor.cameraY;
      state.mapEditor.didPan = false;
      state.mapEditor.didDragProp = false;
      state.mapEditor.didDragZone = false;
      const downPropIndex = hitTestMapProp(event.clientX, event.clientY);
      state.mapEditor.dragPropIndex = downPropIndex === state.mapEditor.selectedPropIndex ? downPropIndex : -1;
      state.mapEditor.dragZoneIndex = -1;
      const dragProp = getSelectedMap()?.scene?.plannedObjects?.[state.mapEditor.dragPropIndex];
      if (dragProp) {
        state.mapEditor.dragPropStartX = Number(dragProp.x) || 0.5;
        state.mapEditor.dragPropStartY = Number(dragProp.y) || 0.5;
      } else {
        const downZoneIndex = hitTestMapZone(event.clientX, event.clientY);
        state.mapEditor.dragZoneIndex = downZoneIndex === state.mapEditor.selectedZoneIndex ? downZoneIndex : -1;
        const dragZone = getSelectedMap()?.scene?.terrainZones?.[state.mapEditor.dragZoneIndex];
        if (dragZone) {
          state.mapEditor.dragZoneStartX = Number(dragZone.x) || 0.5;
          state.mapEditor.dragZoneStartY = Number(dragZone.y) || 0.5;
        }
      }
      dom.mapPreviewCanvas.setPointerCapture?.(event.pointerId);
    });

    dom.mapPreviewCanvas?.addEventListener('pointermove', (event) => {
      if (!state.mapEditor.pointerDown || state.mapEditor.pointerButton !== 0) return;
      const dx = event.clientX - state.mapEditor.pointerStartX;
      const dy = event.clientY - state.mapEditor.pointerStartY;
      if (Math.abs(dx) + Math.abs(dy) < 5) return;
      const viewport = getMapViewport();
      const dragProp = getSelectedMap()?.scene?.plannedObjects?.[state.mapEditor.dragPropIndex];
      if (dragProp) {
        state.mapEditor.didDragProp = true;
        dragProp.x = clamp01(state.mapEditor.dragPropStartX + dx / Math.max(1, viewport.scale * viewport.worldWidth));
        dragProp.y = clamp01(state.mapEditor.dragPropStartY + dy / Math.max(1, viewport.scale * viewport.worldHeight));
        renderMapProps();
        renderObjectList();
        renderMapPreview();
        return;
      }
      const dragZone = getSelectedMap()?.scene?.terrainZones?.[state.mapEditor.dragZoneIndex];
      if (dragZone) {
        state.mapEditor.didDragZone = true;
        dragZone.x = clamp01(state.mapEditor.dragZoneStartX + dx / Math.max(1, viewport.scale * viewport.worldWidth));
        dragZone.y = clamp01(state.mapEditor.dragZoneStartY + dy / Math.max(1, viewport.scale * viewport.worldHeight));
        renderMapZones();
        renderZoneList();
        renderMapPreview();
        return;
      }
      state.mapEditor.didPan = true;
      dom.mapPreviewCanvas.classList.add('is-panning');
      state.mapEditor.cameraX = clamp01(state.mapEditor.cameraStartX - dx / Math.max(1, viewport.scale * viewport.worldWidth));
      state.mapEditor.cameraY = clamp01(state.mapEditor.cameraStartY - dy / Math.max(1, viewport.scale * viewport.worldHeight));
      renderMapPreview();
    });

    dom.mapPreviewCanvas?.addEventListener('pointerup', (event) => {
      if (!state.mapEditor.pointerDown) return;
      state.mapEditor.pointerDown = false;
      dom.mapPreviewCanvas.classList.remove('is-panning');
      dom.mapPreviewCanvas.releasePointerCapture?.(event.pointerId);
      if (state.mapEditor.didDragProp) {
        state.mapEditor.dragPropIndex = -1;
        setDirty(true);
        renderMapProps();
        renderObjectList();
        renderMapPreview();
        return;
      }
      state.mapEditor.dragPropIndex = -1;
      if (state.mapEditor.didDragZone) {
        state.mapEditor.dragZoneIndex = -1;
        setDirty(true);
        renderMapZones();
        renderZoneList();
        renderMapPreview();
        return;
      }
      state.mapEditor.dragZoneIndex = -1;
      if (state.mapEditor.didPan) return;
      const hit = hitTestMapProp(event.clientX, event.clientY);
      if (state.mapEditor.activeTool === 'select' || hit >= 0) {
        if (hit >= 0) {
          selectMapProp(hit);
          return;
        }
        const zoneHit = hitTestMapZone(event.clientX, event.clientY);
        if (zoneHit >= 0) {
          selectTerrainZone(zoneHit);
          return;
        }
        clearMapPropSelection();
        return;
      }
      const point = screenToNorm(event.clientX, event.clientY);
      addMapPropAt(state.mapEditor.selectedKind, point.x, point.y);
    });

    dom.mapPreviewCanvas?.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const hit = hitTestMapProp(event.clientX, event.clientY);
      const zoneHit = hit < 0 ? hitTestMapZone(event.clientX, event.clientY) : -1;
      if (hit < 0) {
        if (zoneHit >= 0) {
          selectTerrainZone(zoneHit);
          showMapContextMenu(event.clientX, event.clientY, 'zone', zoneHit);
          return;
        }
        hideMapContextMenu();
        clearMapPropSelection();
        return;
      }
      selectMapProp(hit);
      showMapContextMenu(event.clientX, event.clientY, 'prop', hit);
    });

    window.addEventListener('click', (event) => {
      if (event.target.closest('#map-context-menu')) return;
      hideMapContextMenu();
    });

    dom.mapContextMenu?.addEventListener('click', (event) => {
      const action = event.target.closest('[data-context-action]')?.dataset.contextAction;
      const kind = state.mapEditor.contextKind;
      const index = kind === 'zone' ? state.mapEditor.contextZoneIndex : state.mapEditor.contextPropIndex;
      hideMapContextMenu();
      if (action === 'properties' && kind === 'prop') openPropModal(index);
      if (action === 'properties' && kind === 'zone') openZoneModal(index);
      if (action === 'clone' && kind === 'prop') cloneMapProp(index);
      if (action === 'clone' && kind === 'zone') cloneTerrainZone(index);
      if (action === 'delete' && kind === 'prop') deleteMapProp(index);
      if (action === 'delete' && kind === 'zone') deleteTerrainZone(index);
    });

    dom.propModalClose?.addEventListener('click', closePropModal);
    dom.propModalSave?.addEventListener('click', savePropModal);
    dom.propModalDelete?.addEventListener('click', () => {
      const index = state.mapEditor.modalPropIndex;
      closePropModal();
      deleteMapProp(index);
    });
    dom.propModal?.addEventListener('click', (event) => {
      if (event.target === dom.propModal) closePropModal();
    });
    dom.zoneModalClose?.addEventListener('click', closeZoneModal);
    dom.zoneModalSave?.addEventListener('click', saveZoneModal);
    dom.zoneModalDelete?.addEventListener('click', () => {
      const index = state.mapEditor.modalZoneIndex;
      closeZoneModal();
      deleteTerrainZone(index);
    });
    dom.zoneModal?.addEventListener('click', (event) => {
      if (event.target === dom.zoneModal) closeZoneModal();
    });

    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Delete') return;
      if (state.section !== 'maps') return;
      if (isTypingTarget(event.target)) return;
      if (state.mapEditor.selectedPropIndex < 0 && state.mapEditor.selectedZoneIndex < 0) return;
      event.preventDefault();
      hideMapContextMenu();
      deleteSelectedMapEntity();
    });

    for (const btn of dom.mapToolButtons || []) {
      btn.addEventListener('click', () => {
        state.mapEditor.activeTool = btn.dataset.mapTool || 'place';
        updateMapToolUi();
      });
    }

    dom.mapClearSelectionBtn?.addEventListener('click', () => {
      hideMapContextMenu();
      clearMapPropSelection();
    });

    for (const btn of dom.mapZoomButtons || []) {
      btn.addEventListener('click', () => {
        const action = btn.dataset.mapZoom;
        if (action === 'in') state.mapEditor.zoom = clamp(state.mapEditor.zoom * 1.18, 0.35, 4);
        if (action === 'out') state.mapEditor.zoom = clamp(state.mapEditor.zoom / 1.18, 0.35, 4);
        if (action === 'reset') {
          state.mapEditor.zoom = 1;
          state.mapEditor.cameraX = 0.5;
          state.mapEditor.cameraY = 0.5;
        }
        renderMapPreview();
      });
    }

    dom.mapZonesBody.addEventListener('input', (event) => {
      const row = event.target.closest('tr[data-zone-index]');
      if (!row) return;
      const zone = getSelectedMap()?.scene?.terrainZones?.[Number(row.dataset.zoneIndex)];
      if (!zone) return;
      const field = event.target.dataset.field;
      zone[field] = event.target.type === 'checkbox' ? !!event.target.checked : (event.target.type === 'number' ? Number(event.target.value) : event.target.value);
      setDirty(true);
      renderZoneList();
      renderMapPreview();
    });
    dom.mapZonesBody.addEventListener('change', (event) => {
      const row = event.target.closest('tr[data-zone-index]');
      if (!row) return;
      const zone = getSelectedMap()?.scene?.terrainZones?.[Number(row.dataset.zoneIndex)];
      if (!zone) return;
      const field = event.target.dataset.field;
      zone[field] = event.target.type === 'checkbox' ? !!event.target.checked : (event.target.type === 'number' ? Number(event.target.value) : event.target.value);
      setDirty(true);
      renderZoneList();
      renderMapPreview();
    });
    dom.mapZonesBody.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="delete-zone"]');
      if (!btn) return;
      const row = event.target.closest('tr[data-zone-index]');
      const map = getSelectedMap();
      if (!map || !row) return;
      map.scene.terrainZones.splice(Number(row.dataset.zoneIndex), 1);
      state.mapEditor.selectedZoneIndex = Math.min(map.scene.terrainZones.length - 1, state.mapEditor.selectedZoneIndex);
      setDirty(true);
      renderMapZones();
      renderZoneList();
      renderMapPreview();
    });

    dom.mapPropsBody.addEventListener('input', (event) => {
      const row = event.target.closest('tr[data-prop-index]');
      if (!row) return;
      const prop = getSelectedMap()?.scene?.plannedObjects?.[Number(row.dataset.propIndex)];
      if (!prop) return;
      const field = event.target.dataset.field;
      prop[field] = getEditorFieldValue(event.target);
      setDirty(true);
      if (field === 'zombieBreakable') renderObjectList();
      renderMapPreview();
    });
    dom.mapPropsBody.addEventListener('change', (event) => {
      const row = event.target.closest('tr[data-prop-index]');
      if (!row) return;
      const prop = getSelectedMap()?.scene?.plannedObjects?.[Number(row.dataset.propIndex)];
      if (!prop) return;
      const field = event.target.dataset.field;
      prop[field] = getEditorFieldValue(event.target);
      setDirty(true);
      if (field === 'zombieBreakable') renderObjectList();
      renderMapPreview();
    });
    dom.mapPropsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="delete-prop"]');
      if (!btn) return;
      const row = event.target.closest('tr[data-prop-index]');
      const map = getSelectedMap();
      if (!map || !row) return;
      map.scene.plannedObjects.splice(Number(row.dataset.propIndex), 1);
      setDirty(true);
      renderMapProps();
      renderMapPreview();
    });

    dom.randomKindChips.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-kind]');
      if (!chip) return;
      updateSelectedMap((map) => {
        const kinds = new Set(map.scene.randomProps.kinds || []);
        if (kinds.has(chip.dataset.kind)) kinds.delete(chip.dataset.kind);
        else kinds.add(chip.dataset.kind);
        map.scene.randomProps.kinds = Array.from(kinds);
      });
      renderRandomKinds();
    });

    dom.campaignList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-campaign-id]');
      if (!btn) return;
      state.selectedCampaignId = btn.dataset.campaignId || '';
      ensureSelections();
      renderCampaignSection();
    });

    dom.campaignLevelList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-level-id]');
      if (!btn) return;
      state.selectedLevelId = btn.dataset.levelId || '';
      renderLevelList();
      renderLevelEditor();
    });

    dom.levelGoalsBody.addEventListener('input', (event) => {
      const row = event.target.closest('tr[data-goal-index]');
      if (!row) return;
      const goal = getSelectedLevel()?.goals?.[Number(row.dataset.goalIndex)];
      if (!goal) return;
      const field = event.target.dataset.field;
      goal[field] = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
      setDirty(true);
      renderLevelList();
      renderOverview();
    });
    dom.levelGoalsBody.addEventListener('change', (event) => {
      const row = event.target.closest('tr[data-goal-index]');
      if (!row) return;
      const goal = getSelectedLevel()?.goals?.[Number(row.dataset.goalIndex)];
      if (!goal) return;
      const field = event.target.dataset.field;
      goal[field] = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
      setDirty(true);
      renderLevelList();
      renderOverview();
    });
    dom.levelGoalsBody.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="delete-goal"]');
      if (!btn) return;
      const row = event.target.closest('tr[data-goal-index]');
      const level = getSelectedLevel();
      if (!level || !row) return;
      level.goals.splice(Number(row.dataset.goalIndex), 1);
      setDirty(true);
      renderLevelEditor();
      renderOverview();
    });
  }

  function bindButtons() {
    dom.loginBtn.addEventListener('click', login);
    dom.loginPassword.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') login();
    });
    dom.reloadBtn.addEventListener('click', reloadAll);
    dom.logoutBtn.addEventListener('click', logout);
    dom.saveWorldBtn.addEventListener('click', saveWorldContent);
    dom.resetWorldBtn.addEventListener('click', resetWorldContent);
    dom.openPlayBtn.addEventListener('click', () => {
      window.open('/play', '_blank', 'noopener');
    });
    for (const btn of dom.navButtons) {
      btn.addEventListener('click', () => setSection(btn.dataset.section));
    }
    for (const btn of dom.jumpButtons) {
      btn.addEventListener('click', () => setSection(btn.dataset.jump));
    }

    dom.mapAddBtn.addEventListener('click', addMap);
    dom.mapCloneBtn.addEventListener('click', cloneMap);
    dom.mapDeleteBtn.addEventListener('click', deleteMap);
    dom.zoneAddBtn.addEventListener('click', () => {
      const map = getSelectedMap();
      if (!map) return;
      map.scene.terrainZones.push({ id: uniqueId(map.scene.terrainZones.map((zone) => zone.id || ''), 'zone'), material: 'grass', shape: 'ellipse', x: 0.5, y: 0.5, w: 0.2, h: 0.2, feather: 0.12, alpha: 0.5, angle: 0, centerStripe: false });
      state.mapEditor.selectedZoneIndex = map.scene.terrainZones.length - 1;
      setDirty(true);
      renderMapZones();
      renderZoneList();
      renderMapPreview();
    });
    dom.propAddBtn.addEventListener('click', () => {
      addMapPropAtCamera(state.mapEditor.selectedKind);
    });

    dom.campaignAddBtn.addEventListener('click', addCampaign);
    dom.campaignCloneBtn.addEventListener('click', cloneCampaign);
    dom.campaignDeleteBtn.addEventListener('click', deleteCampaign);
    dom.levelAddBtn.addEventListener('click', addLevel);
    dom.levelCloneBtn.addEventListener('click', cloneLevel);
    dom.levelDeleteBtn.addEventListener('click', deleteLevel);
    dom.levelUpBtn.addEventListener('click', () => moveLevel(-1));
    dom.levelDownBtn.addEventListener('click', () => moveLevel(1));
    dom.goalAddBtn.addEventListener('click', addGoal);
  }

  function wireBeforeUnloadGuard() {
    window.addEventListener('beforeunload', (event) => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  function startFrameResizeLoop() {
    window.setInterval(() => {
      if (state.framesLoaded.news) resizeFrame(dom.newsFrame);
      if (state.framesLoaded.skills) resizeFrame(dom.skillsFrame);
    }, 1500);
  }

  async function boot() {
    bindButtons();
    bindStaticFieldHandlers();
    bindDynamicHandlers();
    wireBeforeUnloadGuard();
    startFrameResizeLoop();
    try {
      await fetchJson('/api/admin/me');
      dom.loginView.classList.add('hidden');
      dom.app.classList.remove('hidden');
      await loadSessionAndWorld();
      setSection('overview');
      setStatus(dom.globalStatus, 'Admin Hub готов.', 'ok');
    } catch {
      setSection('overview');
    }
  }

  boot().catch((err) => {
    setStatus(dom.loginStatus, err?.message || 'Failed to boot admin hub', 'err');
  });
}());
