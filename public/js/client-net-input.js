function resetMobileStick(kind) {
  if (kind === 'move') {
    mobile.moveId = null;
    mobile.moveX = 0;
    mobile.moveY = 0;
    mobile.moveStrength = 0;
    if (moveStickEl) {
      moveStickEl.classList.remove('dynamic-active');
      moveStickEl.style.removeProperty('left');
      moveStickEl.style.removeProperty('top');
      moveStickEl.style.removeProperty('right');
      moveStickEl.style.removeProperty('bottom');
    }
    if (moveKnobEl) moveKnobEl.style.transform = 'translate(-50%, -50%)';
    return;
  }
  mobile.aimId = null;
  mobile.aimStrength = 0;
  if (aimStickEl) {
    aimStickEl.classList.remove('dynamic-active');
    aimStickEl.style.removeProperty('left');
    aimStickEl.style.removeProperty('top');
    aimStickEl.style.removeProperty('right');
    aimStickEl.style.removeProperty('bottom');
  }
  if (aimKnobEl) aimKnobEl.style.transform = 'translate(-50%, -50%)';
}

function updateMobileStick(kind, clientX, clientY) {
  const stickEl = kind === 'move' ? moveStickEl : aimStickEl;
  const knobEl = kind === 'move' ? moveKnobEl : aimKnobEl;
  if (!stickEl || !knobEl) return;

  const rect = stickEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = Math.max(20, rect.width * 0.38);

  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) {
    dx = (dx / dist) * radius;
    dy = (dy / dist) * radius;
  }

  knobEl.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;

  const nx = dx / radius;
  const ny = dy / radius;
  const strength = Math.min(1, Math.hypot(nx, ny));

  if (kind === 'move') {
    mobile.moveX = nx;
    mobile.moveY = ny;
    mobile.moveStrength = strength;
  } else {
    if (strength > 0.02) {
      const len = Math.hypot(nx, ny) || 1;
      mobile.aimX = nx / len;
      mobile.aimY = ny / len;
      mobile.lastAimX = mobile.aimX;
      mobile.lastAimY = mobile.aimY;
    }
    mobile.aimStrength = strength;
  }
}

function getTouchById(touchList, id) {
  for (let i = 0; i < touchList.length; i += 1) {
    if (touchList[i].identifier === id) return touchList[i];
  }
  return null;
}


function canUseDynamicStickStart(kind, targetEl) {
  const isMove = kind === 'move';
  const stickEl = isMove ? moveStickEl : aimStickEl;
  if (!mobile.enabled || !stickEl || !mobileControlsEl) return false;
  if (isMove ? (mobile.moveId !== null) : (mobile.aimId !== null)) return false;
  if (!mobileControlsEl.classList.contains('active')) return false;
  if (!game.dynamicSticksEnabled) return false;
  if (!isMove && (!game.showAimStickEnabled || aimStickEl?.hidden)) return false;
  if (!(targetEl instanceof Element)) return false;
  if (targetEl.closest('#join-overlay') || targetEl.closest('#stats-panel') || targetEl.closest('#dev-console')) return false;
  if (targetEl.closest('#move-stick') || targetEl.closest('#aim-stick') || targetEl.closest('#jump-btn')) return false;
  if (targetEl.closest('button, input, select, textarea, details, summary, a, label')) return false;
  return true;
}

function placeStickAt(kind, clientX, clientY) {
  const stickEl = kind === 'move' ? moveStickEl : aimStickEl;
  if (!stickEl) return;
  const currentRect = stickEl.getBoundingClientRect();
  const radius = Math.max(42, currentRect.width / 2);
  const margin = 6;
  const x = Math.max(radius + margin, Math.min(window.innerWidth - radius - margin, clientX));
  const y = Math.max(radius + margin, Math.min(window.innerHeight - radius - margin, clientY));
  stickEl.classList.add('dynamic-active');
  stickEl.style.setProperty('left', x.toFixed(1) + 'px', 'important');
  stickEl.style.setProperty('top', y.toFixed(1) + 'px', 'important');
  stickEl.style.setProperty('right', 'auto', 'important');
  stickEl.style.setProperty('bottom', 'auto', 'important');
}
function initMobileControls() {
  if (!mobile.enabled || !moveStickEl || !aimStickEl) {
    setMobileControlsVisible(false);
    return;
  }

  const onStart = (kind, e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;

    if (kind === 'move' && mobile.moveId === null) {
      if (game.dynamicSticksEnabled) placeStickAt('move', touch.clientX, touch.clientY);
      mobile.moveId = touch.identifier;
      updateMobileStick('move', touch.clientX, touch.clientY);
    }
    if (kind === 'aim' && mobile.aimId === null) {
      if (game.dynamicSticksEnabled) placeStickAt('aim', touch.clientX, touch.clientY);
      mobile.aimId = touch.identifier;
      updateMobileStick('aim', touch.clientX, touch.clientY);
    }
  };

  moveStickEl.addEventListener('touchstart', (e) => onStart('move', e), { passive: false });
  aimStickEl.addEventListener('touchstart', (e) => onStart('aim', e), { passive: false });

  const onGlobalStart = (e) => {
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    const isMove = touch.clientX >= window.innerWidth * 0.5;
    const kind = isMove ? 'move' : 'aim';
    if (!canUseDynamicStickStart(kind, e.target)) return;
    if (kind === 'move') mobile.moveId = touch.identifier;
    else mobile.aimId = touch.identifier;
    placeStickAt(kind, touch.clientX, touch.clientY);
    updateMobileStick(kind, touch.clientX, touch.clientY);
    if (kind === 'aim') {
      input.shooting = mobile.aimStrength > 0.2;
      requestImmediateInputSend();
    }
    e.preventDefault();
  };
  window.addEventListener('touchstart', onGlobalStart, { passive: false, capture: true });

  const onMove = (e) => {
    if (mobile.moveId === null && mobile.aimId === null) return;
    const mt = mobile.moveId === null ? null : getTouchById(e.touches, mobile.moveId);
    const at = mobile.aimId === null ? null : getTouchById(e.touches, mobile.aimId);

    if (mt || at) e.preventDefault();
    if (mt) updateMobileStick('move', mt.clientX, mt.clientY);
    if (at) updateMobileStick('aim', at.clientX, at.clientY);
  };

  const onEnd = (e) => {
    let changed = false;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const t = e.changedTouches[i];
      if (mobile.moveId === t.identifier) {
        resetMobileStick('move');
        changed = true;
      }
      if (mobile.aimId === t.identifier) {
        resetMobileStick('aim');
        changed = true;
      }
    }
    if (changed) {
      e.preventDefault();
    }
  };

  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd, { passive: false });
  window.addEventListener('touchcancel', onEnd, { passive: false });

  updateMobileControlsVisibility();
}

initMobileControls();
updateMobileControlsVisibility();

jumpBtnEl?.addEventListener('touchstart', (e) => { e.preventDefault(); queueJump(); }, { passive: false });
jumpBtnEl?.addEventListener('mousedown', (e) => { e.preventDefault(); queueJump(); });

const joinToggleInfoBtn = document.getElementById('join-toggle-info');

function applyMenuButtonGlyph(buttonEl) {
  if (!(buttonEl instanceof HTMLElement)) return;
  const burger = buttonEl.querySelector('.menu-burger');
  const label = buttonEl.querySelector('.menu-label');
  if (burger) burger.textContent = '\u2630';
  if (label) label.textContent = 'Menu';
  buttonEl.setAttribute('aria-label', 'Show menu');
  buttonEl.title = 'Show menu';
}

function setInfoPanelHidden(hidden) {
  infoPanelHidden = Boolean(hidden);
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';
  if (infoPanelEl) infoPanelEl.classList.toggle('is-hidden', infoPanelHidden);

  applyMenuButtonGlyph(toggleInfoBtn);
  applyMenuButtonGlyph(joinToggleInfoBtn);

  if (toggleInfoBtn) {
    toggleInfoBtn.classList.toggle('hidden', !infoPanelHidden || overlayOpen);
  }
  if (joinToggleInfoBtn) {
    joinToggleInfoBtn.classList.toggle('hidden', !overlayOpen || !infoPanelHidden);
  }

  if (devConsoleToggleBtn) {
    devConsoleToggleBtn.classList.toggle('hidden', !mobile.enabled || overlayOpen || !infoPanelHidden);
  }

  updateHudVisibility(overlayOpen);
  localStorage.setItem('cw:infoPanelHidden', infoPanelHidden ? '1' : '0');
}

if (toggleInfoBtn) {
  toggleInfoBtn.addEventListener('click', () => {
    setInfoPanelHidden(!infoPanelHidden);
  });
}

if (joinToggleInfoBtn) {
  joinToggleInfoBtn.addEventListener('click', () => {
    setInfoPanelHidden(!infoPanelHidden);
  });
}

if (infoPanelCloseBtn) {
  infoPanelCloseBtn.addEventListener('click', () => {
    setInfoPanelHidden(true);
  });
}

setInfoPanelHidden(infoPanelHidden);

const accountProgressSummaryEl = document.getElementById('account-progress-summary');
const heroTreePanelEl = document.getElementById('hero-tree-panel');
const heroActionFeedbackEl = document.getElementById('hero-action-feedback');
const heroGalleryV2El = document.getElementById('hero-gallery-v2');
const profileSummaryEl = document.getElementById('profile-summary');
const profileAchievementsEl = document.getElementById('profile-achievements');
const profileCharacterStatsEl = document.getElementById('profile-character-stats');
const profileRunHistoryEl = document.getElementById('profile-run-history');
const newsFeedEl = document.getElementById('news-feed');
const ratingBoardEl = document.getElementById('rating-board');
const deathScreenBloodOverlayEl = document.getElementById('death-screen-blood');
const mainMenuTabButtons = Array.from(document.querySelectorAll('#main-menu-tabs .main-menu-tab'));
const mainMenuPanels = Array.from(document.querySelectorAll('#join-form [data-menu-panel]'));
let heroFocusId = selectedPlayerClass;
let currentMainMenuTab = 'play';
const PROFILE_RUN_HISTORY_CACHE_MS = 12000;
const profileRunHistoryUi = {
  items: [],
  page: 1,
  totalPages: 1,
  pageSize: 8,
  total: 0,
  loading: false,
  error: '',
  loadedNickname: '',
  lastLoadedAt: 0,
  fetchToken: 0,
};

const newsUi = {
  items: [],
  activeId: '',
  activeItem: null,
  loading: false,
  loadingItem: false,
  postingComment: false,
  error: '',
  itemError: '',
  commentError: '',
  lastLoadedAt: 0,
  cacheMs: 15000,
  fetchToken: 0,
  itemFetchToken: 0,
  commentDraft: '',
  replyTargetId: '',
  replyDraftByParent: {},
  shareCopied: false,
};
let newsShareToastTimer = null;
const ratingUi = {
  categories: [],
  currentCategory: 'best_kills_run',
  modes: [
    { key: 'all', title: 'Все режимы' },
    { key: 'normal', title: 'Обычный' },
    { key: 'hardcore', title: 'Хард-кор' },
  ],
  currentMode: 'all',
  items: [],
  page: 1,
  totalPages: 1,
  total: 0,
  pageSize: 10,
  loading: false,
  error: '',
  fetchToken: 0,
};
const MENU_TAB_IDS = new Set(['play', 'characters', 'skills', 'profile', 'rating', 'news']);
const initialUrlParams = new URLSearchParams(window.location.search);
const initialMenuTabParam = String(initialUrlParams.get('tab') || '').trim().toLowerCase();
const initialNewsIdParam = String(initialUrlParams.get('news') || '').trim();
const initialMenuTab = MENU_TAB_IDS.has(initialMenuTabParam) ? initialMenuTabParam : 'play';


function escapeNewsHtml(raw) {
  const text = String(raw ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNewsDate(ts) {
  const ms = Math.max(0, Number(ts) || 0);
  if (!ms) return '--';
  try {
    return new Date(ms).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ms).toLocaleString();
  }
}

let authorProfileModalEl = null;
let authorProfileTitleEl = null;
let authorProfileBodyEl = null;
let authorProfileRuns = [];

function ensureAuthorProfileModal() {
  if (authorProfileModalEl) return;
  const modal = document.createElement('div');
  modal.id = 'author-profile-modal';
  modal.className = 'record-details-modal hidden';
  modal.setAttribute('aria-live', 'polite');

  const card = document.createElement('div');
  card.className = 'record-details-card';

  const head = document.createElement('div');
  head.className = 'record-details-head';

  const title = document.createElement('b');
  title.id = 'author-profile-title';
  title.textContent = '\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0438\u0433\u0440\u043e\u043a\u0430';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'mini';
  closeBtn.textContent = '\u0417\u0430\u043a\u0440\u044b\u0442\u044c';
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  head.appendChild(title);
  head.appendChild(closeBtn);

  const body = document.createElement('div');
  body.id = 'author-profile-body';
  body.className = 'record-details-body';
  body.textContent = '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...';

  card.appendChild(head);
  card.appendChild(body);
  modal.appendChild(card);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  const modalHost = document.getElementById('join-overlay') || document.body;
  modalHost.appendChild(modal);
  authorProfileModalEl = modal;
  authorProfileTitleEl = title;
  authorProfileBodyEl = body;
}

function formatPublicProfileDate(ts) {
  const ms = Math.max(0, Number(ts) || 0);
  if (!ms) return '--';
  try {
    return new Date(ms).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(ms).toLocaleString();
  }
}

function formatRunGameModeLabel(run) {
  const raw = String(run?.runDetails?.gameMode || '').trim().toLowerCase();
  if (raw === 'hardcore') return 'Хард-кор';
  if (raw === 'normal') return 'Обычный';
  return 'Неизвестно';
}

function renderAuthorProfileRunHistory(runPayload) {
  const runs = Array.isArray(runPayload?.runs) ? runPayload.runs : [];
  const total = Math.max(0, Number(runPayload?.total) || 0);
  if (!runs.length) {
    return '<div class="profile-card"><b>\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0437\u0430\u0431\u0435\u0433\u043e\u0432 (0)</b><div class="record-details-empty">\u0417\u0430\u0431\u0435\u0433\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.</div></div>';
  }

  const rows = runs.map((run, i) => {
    const kills = Math.max(0, Number(run?.kills) || 0);
    const score = Math.max(0, Number(run?.score) || 0);
    const durationSec = Math.max(1, Number(run?.durationSec) || 1);
    const heroXp = Math.max(0, Number(run?.runDetails?.xp) || 0);
    const roomCode = escapeNewsHtml(String(run?.roomCode || '-'));
    const gameMode = escapeNewsHtml(formatRunGameModeLabel(run));
    return ''
      + '<button type="button" class="profile-run-row" data-author-run-idx="' + i + '">'
      +   '<div class="profile-run-head"><span>' + formatRecordDateTime(run?.at) + '</span><span>Room ' + roomCode + ' | ' + gameMode + '</span></div>'
      +   '<div class="profile-run-main"><span>' + kills + ' kills</span><span>' + score + ' pts</span><span>' + durationSec + 's</span><span class="profile-run-meta">XP ' + heroXp + '</span></div>'
      + '</button>';
  }).join('');

  return '<div class="profile-card"><b>\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0437\u0430\u0431\u0435\u0433\u043e\u0432 (' + total + ')</b><div class="profile-run-list author-run-list">' + rows + '</div></div>';
}

function bindAuthorProfileRunHistoryRows() {
  if (!authorProfileBodyEl) return;
  const buttons = Array.from(authorProfileBodyEl.querySelectorAll('[data-author-run-idx]'));
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const idx = Math.max(0, Number(btn.getAttribute('data-author-run-idx')) || 0);
      const run = authorProfileRuns[idx];
      if (!run) return;
      const label = 'Run #' + (idx + 1);
      openRecordDetailsModal(run, label);
    });
  }
}

function renderAuthorProfileBody(profile, runPayload) {
  const heroRows = (Array.isArray(profile?.heroStats) ? profile.heroStats : []).map((hero) => {
    const heroName = escapeNewsHtml(hero?.name || hero?.id || '-');
    const heroLevel = Math.max(1, Number(hero?.level) || 1);
    const heroRuns = Math.max(0, Number(hero?.runs) || 0);
    const heroState = hero?.unlocked ? '\u041e\u0442\u043a\u0440\u044b\u0442' : '\u0417\u0430\u043a\u0440\u044b\u0442';
    return '<div class="profile-hero-row"><span>' + heroName + '</span><span>Lv' + heroLevel + ' | Runs: ' + heroRuns + '</span><span>' + heroState + '</span></div>';
  }).join('');

  return ''
    + '<div class="profile-card"><b>\u041f\u0440\u043e\u0444\u0438\u043b\u044c Lv' + Math.max(1, Number(profile?.accountLevel) || 1) + '</b><div>'
    + 'XP ' + Math.max(0, Number(profile?.accountXp) || 0) + '/' + Math.max(1, Number(profile?.accountXpToNext) || 1)
    + ' | Skill points: ' + Math.max(0, Number(profile?.accountSkillPoints) || 0)
    + ' | Shards: ' + Math.max(0, Number(profile?.shards) || 0)
    + ' | Heroes: ' + Math.max(0, Number(profile?.heroesUnlocked) || 0) + '/' + Math.max(0, Number(profile?.heroesTotal) || 0)
    + ' | Runs: ' + Math.max(0, Number(profile?.totalRuns) || 0)
    + '</div></div>'
    + '<div class="profile-card"><b>\u0418\u043d\u0444\u043e \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430</b><div>\u0421\u043e\u0437\u0434\u0430\u043d: ' + formatPublicProfileDate(profile?.createdAt) + ' | \u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u0432\u0445\u043e\u0434: ' + formatPublicProfileDate(profile?.lastLoginAt) + '</div></div>'
    + '<div class="profile-card"><b>\u0413\u0435\u0440\u043e\u0438</b><div class="profile-hero-list">' + (heroRows || '<div class="record-details-empty">\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u043f\u043e \u0433\u0435\u0440\u043e\u044f\u043c.</div>') + '</div></div>'
    + renderAuthorProfileRunHistory(runPayload);
}

async function openAuthorProfileModal(accountId, fallbackName = '') {
  const id = Math.max(0, Number(accountId) || 0);
  if (!id) return;
  ensureAuthorProfileModal();
  if (!authorProfileModalEl || !authorProfileBodyEl || !authorProfileTitleEl) return;

  authorProfileTitleEl.textContent = '\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0438\u0433\u0440\u043e\u043a\u0430';
  authorProfileBodyEl.innerHTML = '<div class="record-details-empty">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u0440\u043e\u0444\u0438\u043b\u044f...</div>';
  authorProfileModalEl.classList.remove('hidden');

  try {
    const [profileRes, runsRes] = await Promise.all([
      fetch('/api/player/public-profile/' + id, { cache: 'no-store' }),
      fetch('/api/player/public-profile/' + id + '/run-history?page=1&page_size=8', { cache: 'no-store' }),
    ]);

    const profilePayload = await profileRes.json().catch(() => ({}));
    if (!profileRes.ok || !profilePayload?.ok || !profilePayload?.profile) {
      throw new Error(profilePayload?.message || ('HTTP ' + profileRes.status));
    }

    const runsPayload = await runsRes.json().catch(() => ({}));
    const runData = runsRes.ok && runsPayload?.ok
      ? {
          runs: Array.isArray(runsPayload.runs) ? runsPayload.runs : [],
          total: Math.max(0, Number(runsPayload.total) || 0),
        }
      : { runs: [], total: 0 };

    authorProfileRuns = runData.runs;

    const profile = profilePayload.profile;
    authorProfileTitleEl.textContent = '\u041f\u0440\u043e\u0444\u0438\u043b\u044c: ' + String(profile?.nickname || fallbackName || ('ID ' + id));
    authorProfileBodyEl.innerHTML = renderAuthorProfileBody(profile, runData);
    bindAuthorProfileRunHistoryRows();
  } catch (err) {
    authorProfileRuns = [];
    authorProfileBodyEl.innerHTML = '<div class="record-details-empty">' + escapeNewsHtml(err?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c.') + '</div>';
  }
}


async function openAuthorProfileFromComment(authorAccountId, authorNameText) {
  const accountId = Math.max(0, Number(authorAccountId) || 0);
  const nickname = String(authorNameText || '').trim();
  if (accountId > 0) {
    await openAuthorProfileModal(accountId, nickname);
    return;
  }

  if (!nickname) return;

  ensureAuthorProfileModal();
  if (authorProfileModalEl && authorProfileBodyEl && authorProfileTitleEl) {
    authorProfileTitleEl.textContent = '\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0438\u0433\u0440\u043e\u043a\u0430';
    authorProfileBodyEl.innerHTML = '<div class="record-details-empty">\u041f\u043e\u0438\u0441\u043a \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430 \u043f\u043e \u043d\u0438\u043a\u0443...</div>';
    authorProfileModalEl.classList.remove('hidden');
  }

  try {
    const res = await fetch('/api/player/nickname-status?nickname=' + encodeURIComponent(nickname), { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    const foundId = Math.max(0, Number(payload?.player?.id) || 0);
    if (!res.ok || !payload?.ok || !payload?.isRegistered || !foundId) {
      throw new Error('\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0434\u043b\u044f \u044d\u0442\u043e\u0433\u043e \u043d\u0438\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.');
    }
    await openAuthorProfileModal(foundId, nickname);
  } catch (err) {
    if (authorProfileBodyEl) {
      authorProfileBodyEl.innerHTML = '<div class="record-details-empty">' + escapeNewsHtml(err?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c.') + '</div>';
    }
  }
}


function upsertNewsListCounters(item) {
  if (!item || !item.id) return;
  const idx = newsUi.items.findIndex((x) => x && x.id === item.id);
  if (idx < 0) return;
  newsUi.items[idx] = {
    ...newsUi.items[idx],
    title: item.title,
    summary: item.summary,
    publishedAt: item.publishedAt,
    views: Math.max(0, Number(item.views) || 0),
    commentsCount: Math.max(0, Number(item.commentsCount) || 0),
  };
}

function setNewsDetailItem(item) {
  if (!item || !item.id) return;
  newsUi.activeId = String(item.id);
  newsUi.activeItem = {
    ...item,
    views: Math.max(0, Number(item.views) || 0),
    commentsCount: Math.max(0, Number(item.commentsCount) || 0),
    comments: Array.isArray(item.comments) ? item.comments : [],
  };
  upsertNewsListCounters(newsUi.activeItem);
}

function updateMenuUrlState(tabId, newsId = '') {
  const url = new URL(window.location.href);
  const tab = String(tabId || '').trim().toLowerCase();
  if (tab && tab !== 'play') url.searchParams.set('tab', tab);
  else url.searchParams.delete('tab');
  const id = String(newsId || '').trim();
  if (tab === 'news' && id) url.searchParams.set('news', id);
  else url.searchParams.delete('news');
  window.history.replaceState({}, document.title, url.toString());
}

function buildNewsShareUrl(newsId) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'news');
  url.searchParams.set('news', String(newsId || '').trim());
  return url.toString();
}

function showNewsShareToast() {
  newsUi.shareCopied = true;
  if (newsShareToastTimer) {
    clearTimeout(newsShareToastTimer);
    newsShareToastTimer = null;
  }
  renderNewsFeed();
  newsShareToastTimer = setTimeout(() => {
    newsUi.shareCopied = false;
    newsShareToastTimer = null;
    renderNewsFeed();
  }, 2000);
}

async function shareNewsLink(newsId) {
  const id = String(newsId || '').trim();
  if (!id) return;
  const shareUrl = buildNewsShareUrl(id);
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(shareUrl);
    showNewsShareToast();
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = shareUrl;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (ok) showNewsShareToast();
}

async function deleteNewsComment(newsId, { commentId, parentId = '' } = {}) {
  const newsKey = String(newsId || '').trim();
  const commentKey = String(commentId || '').trim();
  if (!newsKey || !commentKey || newsUi.postingComment) return;
  newsUi.postingComment = true;
  newsUi.commentError = '';
  renderNewsFeed();
  try {
    const query = parentId ? ('?parentId=' + encodeURIComponent(String(parentId || '').trim())) : '';
    const res = await fetch('/api/news/' + encodeURIComponent(newsKey) + '/comments/' + encodeURIComponent(commentKey) + query, {
      method: 'DELETE',
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok || !payload?.item) {
      throw new Error(payload?.message || ('HTTP ' + res.status));
    }
    setNewsDetailItem(payload.item);
    updateMenuUrlState('news', newsKey);
    newsUi.replyTargetId = '';
  } catch (err) {
    newsUi.commentError = err?.message || 'Failed to delete comment.';
  } finally {
    newsUi.postingComment = false;
    renderNewsFeed();
  }
}

async function submitNewsComment(newsId, { text, parentId = '' } = {}) {
  const bodyText = String(text || '').trim();
  if (!bodyText || newsUi.postingComment) return;
  newsUi.postingComment = true;
  newsUi.commentError = '';
  renderNewsFeed();
  try {
    const res = await fetch('/api/news/' + encodeURIComponent(newsId) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: bodyText, parentId: String(parentId || '').trim() }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok || !payload?.item) {
      throw new Error(payload?.message || ('HTTP ' + res.status));
    }
    setNewsDetailItem(payload.item);
    updateMenuUrlState('news', String(newsId || '').trim());
    if (parentId) {
      delete newsUi.replyDraftByParent[parentId];
      newsUi.replyTargetId = '';
    } else {
      newsUi.commentDraft = '';
    }
  } catch (err) {
    newsUi.commentError = err?.message || 'Failed to send comment.';
  } finally {
    newsUi.postingComment = false;
    renderNewsFeed();
  }
}

function renderNewsReplyComposer(container, parentId) {
  const wrap = document.createElement('div');
  wrap.className = 'news-comment-compose news-comment-reply-compose';

  const input = document.createElement('textarea');
  input.className = 'news-comment-input';
  input.rows = 2;
  input.maxLength = 1500;
  input.placeholder = 'Напишите комментарий...';
  input.value = String(newsUi.replyDraftByParent[parentId] || '');
  input.addEventListener('input', () => {
    newsUi.replyDraftByParent[parentId] = input.value;
  });

  const actions = document.createElement('div');
  actions.className = 'news-comment-actions';

  const sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.className = 'mini';
  sendBtn.textContent = newsUi.postingComment ? 'Отправка...' : 'Отправить';
  sendBtn.disabled = newsUi.postingComment || !input.value.trim();
  sendBtn.addEventListener('click', () => {
    void submitNewsComment(newsUi.activeId, { text: input.value, parentId });
  });
  const refreshSendState = () => {
    sendBtn.disabled = newsUi.postingComment || !input.value.trim();
  };
  input.addEventListener('input', refreshSendState);
  input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!sendBtn.disabled) sendBtn.click();
    }
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'mini';
  cancelBtn.textContent = '\u041e\u0442\u043c\u0435\u043d\u0430';
  cancelBtn.disabled = newsUi.postingComment;
  cancelBtn.addEventListener('click', () => {
    newsUi.replyTargetId = '';
    renderNewsFeed();
  });

  actions.appendChild(sendBtn);
  actions.appendChild(cancelBtn);
  wrap.appendChild(input);
  wrap.appendChild(actions);
  container.appendChild(wrap);
}

function renderNewsCommentNode(comment, isReply = false, parentCommentId = '') {
  const item = document.createElement('div');
  item.className = isReply ? 'news-comment news-comment-reply' : 'news-comment';

  const isLoggedIn = Boolean(game.playerAuth?.player);
  const parentId = String(comment?.id || '').trim();
  const myAccountId = Math.max(0, Number(game.playerAuth?.player?.id) || 0);
  const commentOwnerId = Math.max(0, Number(comment?.authorAccountId) || 0);
  const canDelete = Boolean(isLoggedIn && myAccountId > 0 && commentOwnerId === myAccountId && parentId);

  const head = document.createElement('div');
  head.className = 'news-comment-head';

  const authorAccountId = Math.max(0, Number(comment?.authorAccountId) || 0);
  const authorNameText = String(comment?.authorName || 'Player');
  const author = document.createElement('button');
  author.type = 'button';
  author.className = 'news-comment-author news-comment-author-btn';
  author.textContent = authorNameText;
  author.addEventListener('click', () => {
    void openAuthorProfileFromComment(authorAccountId, authorNameText);
  });

  const meta = document.createElement('div');
  meta.className = 'news-comment-meta';
  const date = document.createElement('span');
  date.className = 'news-comment-date';
  date.textContent = formatNewsDate(comment?.createdAt || 0);
  meta.appendChild(date);

  head.appendChild(author);
  head.appendChild(meta);

  const text = document.createElement('div');
  text.className = 'news-comment-text';
  text.textContent = String(comment?.text || '');

  item.appendChild(head);
  item.appendChild(text);

  const actionsRow = document.createElement('div');
  actionsRow.className = 'news-comment-actions-row';
  let hasActions = false;

  if (!isReply && isLoggedIn && parentId) {
    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'mini news-comment-reply-btn';
    replyBtn.textContent = newsUi.replyTargetId === parentId ? '\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u043e\u0442\u0432\u0435\u0442' : '\u041e\u0442\u0432\u0435\u0442\u0438\u0442\u044c';
    replyBtn.addEventListener('click', () => {
      newsUi.replyTargetId = newsUi.replyTargetId === parentId ? '' : parentId;
      renderNewsFeed();
    });
    actionsRow.appendChild(replyBtn);
    hasActions = true;
  }

  if (canDelete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'mini news-comment-delete-btn';
    deleteBtn.textContent = '\u0423\u0434\u0430\u043b\u0438\u0442\u044c';
    deleteBtn.disabled = newsUi.postingComment;
    deleteBtn.addEventListener('click', () => {
      void deleteNewsComment(newsUi.activeId, {
        commentId: parentId,
        parentId: isReply ? parentCommentId : '',
      });
    });
    actionsRow.appendChild(deleteBtn);
    hasActions = true;
  }

  if (hasActions) {
    item.appendChild(actionsRow);
  }

  if (!isReply && isLoggedIn && parentId && newsUi.replyTargetId === parentId) {
    renderNewsReplyComposer(item, parentId);
  }

  const replies = Array.isArray(comment?.replies) ? comment.replies : [];
  if (replies.length > 0) {
    const repliesWrap = document.createElement('div');
    repliesWrap.className = 'news-comment-replies';
    for (const reply of replies) {
      repliesWrap.appendChild(renderNewsCommentNode(reply, true, parentId));
    }
    item.appendChild(repliesWrap);
  }

  return item;
}

function renderNewsFeed() {
  if (!newsFeedEl) return;

  newsFeedEl.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'news-main-title';
  title.textContent = 'Новости';
  newsFeedEl.appendChild(title);

  if (newsUi.loading && newsUi.items.length === 0 && !newsUi.activeItem) {
    const loading = document.createElement('div');
    loading.className = 'news-sub';
    loading.textContent = 'Загрузка новостей...';
    newsFeedEl.appendChild(loading);
    return;
  }

  if (newsUi.error && newsUi.items.length === 0 && !newsUi.activeItem) {
    const error = document.createElement('div');
    error.className = 'news-sub';
    error.textContent = newsUi.error;
    newsFeedEl.appendChild(error);
    return;
  }

  if (newsUi.activeItem) {
    const detailActions = document.createElement('div');
    detailActions.className = 'news-detail-actions';
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'mini news-back-btn';
    backBtn.textContent = '\u2190 \u041a \u0441\u043f\u0438\u0441\u043a\u0443 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439';
    backBtn.addEventListener('click', () => {
      newsUi.activeId = '';
      newsUi.activeItem = null;
      newsUi.itemError = '';
      newsUi.commentError = '';
      newsUi.replyTargetId = '';
      newsUi.shareCopied = false;
      updateMenuUrlState('news', '');
      renderNewsFeed();
    });
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'mini news-share-btn';
    shareBtn.textContent = newsUi.shareCopied ? '\u0421\u0441\u044b\u043b\u043a\u0430 \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0430' : '\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f';
    shareBtn.addEventListener('click', async () => {
      try {
        await shareNewsLink(newsUi.activeId);
      } catch {
        newsUi.commentError = '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443.';
        renderNewsFeed();
      }
    });
    detailActions.appendChild(backBtn);
    detailActions.appendChild(shareBtn);
    newsFeedEl.appendChild(detailActions);

    if (newsUi.loadingItem) {
      const loadingItem = document.createElement('div');
      loadingItem.className = 'news-sub';
      loadingItem.textContent = 'Открываем новость...';
      newsFeedEl.appendChild(loadingItem);
      return;
    }

    if (newsUi.itemError) {
      const itemError = document.createElement('div');
      itemError.className = 'news-sub';
      itemError.textContent = newsUi.itemError;
      newsFeedEl.appendChild(itemError);
      return;
    }

    const item = newsUi.activeItem;

    const article = document.createElement('article');
    article.className = 'news-item news-item-detail';

    const h = document.createElement('h3');
    h.className = 'news-item-title';
    h.textContent = String(item?.title || 'Без названия');

    const meta = document.createElement('div');
    meta.className = 'news-item-meta';
    meta.textContent = formatNewsDate(item?.publishedAt) + ' | Views: ' + (Math.max(0, Number(item?.views) || 0)) + ' | Comments: ' + (Math.max(0, Number(item?.commentsCount) || 0));

    const summary = document.createElement('div');
    summary.className = 'news-sub';
    summary.textContent = String(item?.summary || '');

    article.appendChild(h);
    article.appendChild(meta);
    if (summary.textContent) article.appendChild(summary);

    const lines = Array.isArray(item?.items) ? item.items : [];
    if (lines.length > 0) {
      const list = document.createElement('div');
      list.className = 'news-list';
      for (const line of lines) {
        const row = document.createElement('div');
        row.textContent = '- ' + String(line || '').replace(/^[-\s]+/, '');
        list.appendChild(row);
      }
      article.appendChild(list);
    }

    newsFeedEl.appendChild(article);

    const commentsTitle = document.createElement('div');
    commentsTitle.className = 'news-comments-title';
    commentsTitle.textContent = 'Комментарии';

    const isLoggedIn = Boolean(game.playerAuth?.player);
    if (isLoggedIn) {
      const compose = document.createElement('div');
      compose.className = 'news-comment-compose';

      const input = document.createElement('textarea');
      input.className = 'news-comment-input';
      input.rows = 3;
      input.maxLength = 1500;
      input.placeholder = 'Напишите комментарий...';
      input.value = newsUi.commentDraft;
      input.addEventListener('input', () => {
        newsUi.commentDraft = input.value;
      });

      const actions = document.createElement('div');
      actions.className = 'news-comment-actions';

      const sendBtn = document.createElement('button');
      sendBtn.type = 'button';
      sendBtn.className = 'mini';
      sendBtn.textContent = newsUi.postingComment ? 'Отправка...' : 'Отправить';
      sendBtn.disabled = newsUi.postingComment || !input.value.trim();
      sendBtn.addEventListener('click', () => {
        void submitNewsComment(item.id, { text: input.value });
      });
      const refreshSendState = () => {
        sendBtn.disabled = newsUi.postingComment || !input.value.trim();
      };
      input.addEventListener('input', refreshSendState);
      input.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          if (!sendBtn.disabled) sendBtn.click();
        }
      });

      actions.appendChild(sendBtn);
      compose.appendChild(input);
      compose.appendChild(actions);
      newsFeedEl.appendChild(compose);
    } else {
      const authHint = document.createElement('div');
      authHint.className = 'news-sub';
      authHint.textContent = 'Войдите в аккаунт, чтобы оставлять комментарии и ответы.';
      newsFeedEl.appendChild(authHint);
    }

    if (newsUi.commentError) {
      const commentError = document.createElement('div');
      commentError.className = 'news-sub';
      commentError.textContent = newsUi.commentError;
      newsFeedEl.appendChild(commentError);
    }

    newsFeedEl.appendChild(commentsTitle);

    const commentsWrap = document.createElement('div');
    commentsWrap.className = 'news-comments-wrap';
    const comments = Array.isArray(item?.comments) ? item.comments : [];
    if (comments.length <= 0) {
      const empty = document.createElement('div');
      empty.className = 'news-sub';
      empty.textContent = 'Пока нет комментариев.';
      commentsWrap.appendChild(empty);
    } else {
      for (const comment of comments) {
        commentsWrap.appendChild(renderNewsCommentNode(comment, false));
      }
    }
    newsFeedEl.appendChild(commentsWrap);
    return;
  }

  const items = Array.isArray(newsUi.items) ? newsUi.items : [];
  if (items.length <= 0) {
    const empty = document.createElement('div');
    empty.className = 'news-sub';
    empty.textContent = 'Пока новостей нет.';
    newsFeedEl.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'news-items';
  for (const item of items) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'news-item news-item-button';

    const h = document.createElement('div');
    h.className = 'news-item-title';
    h.textContent = String(item?.title || 'Без названия');

    const meta = document.createElement('div');
    meta.className = 'news-item-meta';
    meta.textContent = formatNewsDate(item?.publishedAt) + ' | Views: ' + (Math.max(0, Number(item?.views) || 0)) + ' | Comments: ' + (Math.max(0, Number(item?.commentsCount) || 0));

    const summary = document.createElement('div');
    summary.className = 'news-sub';
    summary.textContent = String(item?.summary || '');

    card.appendChild(h);
    card.appendChild(meta);
    if (summary.textContent) card.appendChild(summary);

    card.addEventListener('click', () => {
      void openNewsItem(item?.id || '');
    });

    list.appendChild(card);
  }
  newsFeedEl.appendChild(list);
}

async function requestNewsFeed(options = {}) {
  const force = options?.force === true;
  const now = Date.now();
  if (!force && !newsUi.loading && newsUi.items.length > 0 && (now - newsUi.lastLoadedAt) < newsUi.cacheMs) {
    renderNewsFeed();
    return;
  }
  const token = newsUi.fetchToken + 1;
  newsUi.fetchToken = token;
  newsUi.loading = true;
  newsUi.error = '';
  renderNewsFeed();
  try {
    const res = await fetch('/api/news', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const payload = await res.json();
    if (newsUi.fetchToken !== token) return;
    newsUi.items = Array.isArray(payload?.items) ? payload.items : [];
    newsUi.lastLoadedAt = Date.now();
    newsUi.error = '';
    if (newsUi.activeItem) upsertNewsListCounters(newsUi.activeItem);
  } catch (err) {
    if (newsUi.fetchToken !== token) return;
    newsUi.error = err?.message || 'Failed to load news.';
  } finally {
    if (newsUi.fetchToken === token) {
      newsUi.loading = false;
      renderNewsFeed();
    }
  }
}

async function openNewsItem(newsId, { force = false } = {}) {
  const id = String(newsId || '').trim();
  if (!id) return;
  if (newsUi.loadingItem) return;
  if (!force && newsUi.activeItem && newsUi.activeId === id) {
    renderNewsFeed();
    return;
  }

  const token = newsUi.itemFetchToken + 1;
  newsUi.itemFetchToken = token;
  newsUi.loadingItem = true;
  newsUi.itemError = '';
  newsUi.commentError = '';
  newsUi.replyTargetId = '';
  newsUi.activeId = id;
  newsUi.activeItem = null;
  renderNewsFeed();

  try {
    const res = await fetch('/api/news/' + encodeURIComponent(id), { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (newsUi.itemFetchToken !== token) return;
    if (!res.ok || !payload?.ok || !payload?.item) {
      throw new Error(payload?.message || ('HTTP ' + res.status));
    }
    setNewsDetailItem(payload.item);
    updateMenuUrlState('news', id);
  } catch (err) {
    if (newsUi.itemFetchToken !== token) return;
    newsUi.itemError = err?.message || 'Failed to open news.';
  } finally {
    if (newsUi.itemFetchToken === token) {
      newsUi.loadingItem = false;
      renderNewsFeed();
    }
  }
}


function formatRatingValue(item, categoryKey) {
  const value = Math.max(0, Number(item?.value) || 0);
  if (categoryKey === 'best_time_run') return value + 's';
  if (categoryKey === 'best_dps_run') return value.toFixed(2) + ' DPS';
  if (categoryKey === 'profile_level') return 'Lv' + value + ' (XP ' + Math.max(0, Number(item?.accountXp) || 0) + ')';
  if (categoryKey === 'heroes_unlocked') return value + ' \u0433\u0435\u0440.';
  if (categoryKey === 'runs_count') return value + ' \u0437\u0430\u0431.';
  return String(value);
}

function renderRatingBoard() {
  if (!ratingBoardEl) return;
  const title = '<b>Рейтинг игроков</b>';
  if (ratingUi.loading && ratingUi.items.length === 0) {
    ratingBoardEl.innerHTML = title + '<div class="profile-run-empty">Загрузка рейтинга...</div>';
    return;
  }
  if (ratingUi.error && ratingUi.items.length === 0) {
    ratingBoardEl.innerHTML = title + '<div class="profile-run-empty">' + escapeNewsHtml(ratingUi.error) + '</div>';
    return;
  }

  const categories = (ratingUi.categories || []).map((cat) => {
    const active = cat.key === ratingUi.currentCategory ? ' active' : '';
    return '<button type="button" class="mini rating-category-btn' + active + '" data-rating-cat="' + escapeNewsHtml(String(cat.key || '')) + '">' + escapeNewsHtml(String(cat.title || cat.key || 'Category')) + '</button>';
  }).join('');

  const modeOptions = (ratingUi.modes || []).map((mode) => {
    const key = String(mode?.key || 'all');
    const modeTitle = String(mode?.title || key || 'Mode');
    const selected = key === ratingUi.currentMode ? ' selected' : '';
    return '<option value="' + escapeNewsHtml(key) + '"' + selected + '>' + escapeNewsHtml(modeTitle) + '</option>';
  }).join('');

  const rows = (ratingUi.items || []).map((item, i) => {
    const rank = ((ratingUi.page - 1) * ratingUi.pageSize) + i + 1;
    const pid = Math.max(0, Number(item?.playerId) || 0);
    const nick = escapeNewsHtml(String(item?.nickname || 'Unknown'));
    const nickHtml = pid > 0
      ? ('<button type="button" class="news-comment-author news-comment-author-btn" data-rating-player="' + pid + '">' + nick + '</button>')
      : nick;
    const replayRunId = Math.max(0, Number(item?.replayRunId) || 0);
    const valueText = escapeNewsHtml(formatRatingValue(item, ratingUi.currentCategory));
    const playBtn = replayRunId > 0 ? ('<button type="button" class="mini rating-play-btn" data-rating-replay="' + replayRunId + '" data-rating-rank="' + rank + '">Play</button>') : '';
    return '<div class="record-row rating-row"><div class="record-rank">#' + rank + '</div><div class="record-name">' + nickHtml + '</div><div class="record-meta"><span class="rating-value-text">' + valueText + '</span>' + playBtn + '</div></div>';
  }).join('');

  const pager = '<div class="profile-run-history-pager"><button type="button" class="mini" data-rating-prev ' + (ratingUi.page <= 1 ? 'disabled' : '') + '>Prev</button><span class="profile-run-history-page">Page ' + ratingUi.page + '/' + ratingUi.totalPages + ' | Total: ' + ratingUi.total + '</span><button type="button" class="mini" data-rating-next ' + (ratingUi.page >= ratingUi.totalPages ? 'disabled' : '') + '>Next</button></div>';
  const modeControl = '<div class="rating-mode-wrap"><label class="rating-mode-label" for="rating-mode-select">Режим:</label><select id="rating-mode-select" class="rating-mode-select">' + modeOptions + '</select></div>';

  ratingBoardEl.innerHTML = title
    + modeControl
    + '<div class="rating-categories">' + categories + '</div>'
    + (rows || '<div class="profile-run-empty">Пока нет данных.</div>')
    + pager;

  for (const b of Array.from(ratingBoardEl.querySelectorAll('[data-rating-cat]'))) {
    b.addEventListener('click', () => {
      const cat = String(b.getAttribute('data-rating-cat') || '').trim();
      if (!cat) return;
      ratingUi.currentCategory = cat;
      ratingUi.page = 1;
      void requestLeaderboard({ force: true, page: 1, category: cat, mode: ratingUi.currentMode });
    });
  }

  ratingBoardEl.querySelector('[data-rating-prev]')?.addEventListener('click', () => {
    if (ratingUi.page > 1) void requestLeaderboard({ force: true, page: ratingUi.page - 1, category: ratingUi.currentCategory, mode: ratingUi.currentMode });
  });
  ratingBoardEl.querySelector('[data-rating-next]')?.addEventListener('click', () => {
    if (ratingUi.page < ratingUi.totalPages) void requestLeaderboard({ force: true, page: ratingUi.page + 1, category: ratingUi.currentCategory, mode: ratingUi.currentMode });
  });

  for (const b of Array.from(ratingBoardEl.querySelectorAll('[data-rating-player]'))) {
    b.addEventListener('click', () => {
      const pid = Math.max(0, Number(b.getAttribute('data-rating-player')) || 0);
      if (pid > 0) void openAuthorProfileModal(pid, b.textContent || '');
    });
  }

  for (const b of Array.from(ratingBoardEl.querySelectorAll('[data-rating-replay]'))) {
    b.addEventListener('click', () => {
      const replayRunId = Math.max(0, Number(b.getAttribute('data-rating-replay')) || 0);
      if (!replayRunId) return;
      const rank = Math.max(1, Number(b.getAttribute('data-rating-rank')) || 1);
      const rowIndex = rank - 1 - ((ratingUi.page - 1) * ratingUi.pageSize);
      const item = ratingUi.items[rowIndex] || null;
      const replayRun = item?.replayRun || null;
      const row = b.closest('.rating-row');
      const nickname = String(row?.querySelector('.record-name')?.textContent || '').trim() || 'Unknown';
      openRecordDetailsModal({
        id: replayRunId,
        name: replayRun?.name || nickname,
        kills: Math.max(0, Number(replayRun?.kills) || 0),
        score: Math.max(0, Number(replayRun?.score) || 0),
        roomCode: String(replayRun?.roomCode || '-'),
        durationSec: Math.max(1, Number(replayRun?.durationSec) || 1),
        at: Math.max(0, Number(replayRun?.at) || 0),
        runDetails: replayRun?.runDetails || null,
        replayApiPath: '/api/leaderboard/runs/' + replayRunId + '/replay',
      }, '#' + rank);
    });
  }
  const modeSelect = ratingBoardEl.querySelector('#rating-mode-select');
  modeSelect?.addEventListener('change', () => {
    const nextMode = String(modeSelect.value || 'all').trim().toLowerCase();
    ratingUi.currentMode = (nextMode === 'normal' || nextMode === 'hardcore') ? nextMode : 'all';
    ratingUi.page = 1;
    void requestLeaderboard({ force: true, page: 1, category: ratingUi.currentCategory, mode: ratingUi.currentMode });
  });
}

async function requestLeaderboard({ force = false, page = ratingUi.page, category = ratingUi.currentCategory, mode = ratingUi.currentMode } = {}) {
  if (!ratingBoardEl) return;
  if (!force && ratingUi.loading) return;
  const token = ratingUi.fetchToken + 1;
  ratingUi.fetchToken = token;
  ratingUi.loading = true;
  ratingUi.error = '';
  ratingUi.page = Math.max(1, Number(page) || 1);
  ratingUi.currentCategory = String(category || ratingUi.currentCategory || 'best_kills_run');
  ratingUi.currentMode = String(mode || ratingUi.currentMode || 'all').trim().toLowerCase();
  if (ratingUi.currentMode !== 'normal' && ratingUi.currentMode !== 'hardcore') ratingUi.currentMode = 'all';
  renderRatingBoard();
  try {
    const params = new URLSearchParams({
      category: ratingUi.currentCategory,
      mode: ratingUi.currentMode,
      page: String(ratingUi.page),
      page_size: String(ratingUi.pageSize),
    });
    const res = await fetch('/api/leaderboard?' + params.toString(), { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (ratingUi.fetchToken !== token) return;
    if (!res.ok || !payload?.ok) throw new Error(payload?.message || ('HTTP ' + res.status));
    ratingUi.categories = Array.isArray(payload.categories) ? payload.categories : [];
    ratingUi.modes = Array.isArray(payload.modes) ? payload.modes : ratingUi.modes;
    ratingUi.items = Array.isArray(payload.items) ? payload.items : [];
    ratingUi.page = Math.max(1, Number(payload.page) || ratingUi.page);
    ratingUi.totalPages = Math.max(1, Number(payload.totalPages) || 1);
    ratingUi.total = Math.max(0, Number(payload.total) || 0);
    ratingUi.currentCategory = String(payload?.category?.key || ratingUi.currentCategory || 'best_kills_run');
    ratingUi.currentMode = String(payload?.mode?.key || ratingUi.currentMode || 'all').trim().toLowerCase();
    if (ratingUi.currentMode !== 'normal' && ratingUi.currentMode !== 'hardcore') ratingUi.currentMode = 'all';
    ratingUi.error = '';
  } catch (err) {
    if (ratingUi.fetchToken !== token) return;
    ratingUi.error = err?.message || 'Failed to load leaderboard.';
  } finally {
    if (ratingUi.fetchToken === token) {
      ratingUi.loading = false;
      renderRatingBoard();
    }
  }
}
globalThis.renderNewsFeed = renderNewsFeed;

function setMainMenuTab(tabId) {
  const nextTab = String(tabId || '').trim() || 'play';
  const prevTab = currentMainMenuTab;
  currentMainMenuTab = nextTab;
  for (const btn of mainMenuTabButtons) {
    const active = btn.getAttribute('data-menu-tab') === nextTab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  }
  for (const panel of mainMenuPanels) {
    const active = panel.getAttribute('data-menu-panel') === nextTab;
    panel.classList.toggle('active', active);
  }
  if (nextTab === 'profile') {
    void requestProfileRunHistory({ force: false, page: profileRunHistoryUi.page });
  }
  if (nextTab === 'rating') {
    void requestLeaderboard({ force: false, page: ratingUi.page, category: ratingUi.currentCategory, mode: ratingUi.currentMode });
  }
  if (nextTab === 'news') {
    if (prevTab === 'news' && newsUi.activeItem) {
      newsUi.activeId = '';
      newsUi.activeItem = null;
      newsUi.itemError = '';
      newsUi.commentError = '';
      newsUi.replyTargetId = '';
      newsUi.shareCopied = false;
      updateMenuUrlState('news', '');
      renderNewsFeed();
    }
    void requestNewsFeed({ force: false });
  }
  if (nextTab !== 'news') {
    newsUi.shareCopied = false;
    updateMenuUrlState(nextTab, '');
  } else if (!newsUi.activeItem) {
    updateMenuUrlState('news', '');
  }
}

for (const btn of mainMenuTabButtons) {
  btn.addEventListener('click', () => {
    setMainMenuTab(btn.getAttribute('data-menu-tab'));
  });
}
currentMainMenuTab = initialMenuTab;
setMainMenuTab(currentMainMenuTab);
void requestNewsFeed({ force: false });
if (currentMainMenuTab === 'news' && initialNewsIdParam) {
  void openNewsItem(initialNewsIdParam, { force: true });
}

function getPlayerVariant(id) {
  return PLAYER_VARIANTS.find((x) => x.id === id) || PLAYER_VARIANTS[0];
}

function sanitizePlayerClass(id) {
  const key = (id || '').toString().trim();
  return getPlayerVariant(key).id;
}

function getProgressionCatalog() {
  const fallbackHeroes = PLAYER_VARIANTS.map((variant) => ({
    ...variant,
    unlockLevel: variant.id === 'cyber' ? 1 : 999,
    unlockShardCost: variant.id === 'cyber' ? 0 : 9999,
    unlockCardId: variant.id === 'cyber' ? '' : (variant.id + '_core_card'),
    unlockCardName: variant.name + ' Core Card',
    unlockCardNeed: variant.id === 'cyber' ? 0 : 99,
    tagline: '',
  }));
  const catalog = game.playerAuth?.progressionCatalog || null;
  return {
    baseHeroId: catalog?.baseHeroId || 'cyber',
    heroes: Array.isArray(catalog?.heroes) && catalog.heroes.length > 0 ? catalog.heroes : fallbackHeroes,
    trees: catalog?.trees && typeof catalog.trees === 'object' ? catalog.trees : {},
  };
}

function getProgressionState() {
  return game.playerAuth?.progression || null;
}

function getUnlockedHeroSet(catalog, progression) {
  if (progression?.unlockedHeroes && Array.isArray(progression.unlockedHeroes)) {
    return new Set(progression.unlockedHeroes.map((id) => String(id || '').trim()).filter(Boolean));
  }
  return new Set([catalog.baseHeroId || 'cyber']);
}

function setHeroActionFeedback(message, kind = '') {
  if (!heroActionFeedbackEl) return;
  const text = String(message || '').trim();
  if (!text) {
    heroActionFeedbackEl.textContent = '';
    heroActionFeedbackEl.className = 'hero-action-feedback hidden';
    return;
  }
  heroActionFeedbackEl.textContent = text;
  heroActionFeedbackEl.className = `hero-action-feedback ${kind}`.trim();
  heroActionFeedbackEl.classList.remove('hidden');
}

function humanizeHeroApiError(err, fallback) {
  const msg = String(err?.message || '').trim();
  if (msg.includes('404')) {
    return 'Progression API not found on server. Restart server to apply updates.';
  }
  return msg || fallback;
}
async function selectHeroForAccount(heroId) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/select-hero', {
    method: 'POST',
    body: JSON.stringify({ heroId }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function unlockHeroForAccount(heroId) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/unlock-hero', {
    method: 'POST',
    body: JSON.stringify({ heroId }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

async function upgradeHeroNodeForAccount(heroId, nodeId) {
  if (!game.playerAuth?.player) return;
  const data = await apiJson('/api/player/progression/upgrade-node', {
    method: 'POST',
    body: JSON.stringify({ heroId, nodeId }),
  });
  if (data?.progression) game.playerAuth.progression = data.progression;
}

const heroPreviewImageCache = new Map();

function getHeroPreviewImage(heroId) {
  const key = String(heroId || '').trim().toLowerCase() || 'cyber';
  if (heroPreviewImageCache.has(key)) return heroPreviewImageCache.get(key);
  const img = new Image();
  img.src = getHeroCardImagePath(key);
  heroPreviewImageCache.set(key, img);
  return img;
}
function drawCharacterPreview(previewCanvas, variant) {
  const c = previewCanvas;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;

  const portrait = getHeroPreviewImage(variant.id);
  if (portrait?.complete && portrait.naturalWidth > 0 && portrait.naturalHeight > 0) {
    g.imageSmoothingEnabled = true;
    const srcRatio = portrait.naturalWidth / Math.max(1, portrait.naturalHeight);
    const dstRatio = c.width / Math.max(1, c.height);
    let sx = 0;
    let sy = 0;
    let sw = portrait.naturalWidth;
    let sh = portrait.naturalHeight;
    if (srcRatio > dstRatio) {
      sw = Math.round(sh * dstRatio);
      sx = Math.round((portrait.naturalWidth - sw) * 0.5);
    } else {
      sh = Math.round(sw / dstRatio);
      sy = Math.round((portrait.naturalHeight - sh) * 0.18);
      sy = Math.max(0, Math.min(sy, portrait.naturalHeight - sh));
    }
    g.drawImage(portrait, sx, sy, sw, sh, 0, 0, c.width, c.height);
    g.fillStyle = variant.accent;
    g.fillRect(c.width - 14, 4, 10, 3);
    return;
  }

  const sprite = sprites.players[variant.id];
  const fw = Math.max(8, Number(variant.frameW) || 32);
  const fh = Math.max(8, Number(variant.frameH) || 48);
  const baseScale = Math.max(0.5, Number(variant.scale) || 1);
  const frameCount = sprite?.naturalWidth ? Math.max(1, Math.floor(sprite.naturalWidth / fw)) : 1;
  const idleFrame = Math.max(0, Math.min(frameCount - 1, Number(variant.idleFrame) || 1));

  if (!(sprite?.complete && sprite.naturalWidth >= fw && sprite.naturalHeight >= fh)) {
    g.fillStyle = variant.accent;
    g.beginPath();
    g.arc(c.width / 2, c.height / 2, 12, 0, Math.PI * 2);
    g.fill();
    return;
  }

  const fitScale = Math.min(
    baseScale,
    Math.max(0.2, (c.width - 8) / fw),
    Math.max(0.2, (c.height - 8) / fh),
  );

  const dw = fw * fitScale;
  const dh = fh * fitScale;
  const dx = Math.round((c.width - dw) / 2);
  const dy = Math.round((c.height - dh) / 2) + 1;
  g.drawImage(sprite, idleFrame * fw, (variant.rows?.down || 0) * fh, fw, fh, dx, dy, dw, dh);

  const tint = String(variant.tint || variant.accent || '').trim();
  if (tint) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = 0.34;
    g.fillStyle = tint;
    g.fillRect(dx, dy, dw, dh);
    g.restore();
  }

  g.fillStyle = variant.accent;
  g.fillRect(c.width - 14, 4, 10, 3);
}

function renderAccountSummary(catalog, progression) {
  if (!accountProgressSummaryEl) return;
  if (!game.playerAuth?.player || !progression) {
    accountProgressSummaryEl.innerHTML = '<b>Guest mode:</b> account progression, heroes and talents are saved only for logged in players.';
    return;
  }
  const level = Math.max(1, Number(progression.accountLevel) || 1);
  const xp = Math.max(0, Number(progression.accountXp) || 0);
  const xpToNext = Math.max(1, Number(progression.accountXpToNext) || 1);
  const points = Math.max(0, Number(progression.accountSkillPoints) || 0);
  const shards = Math.max(0, Number(progression.shards) || 0);
  accountProgressSummaryEl.innerHTML = `Account Lv${level} | XP ${xp}/${xpToNext} | Skill points: <b>${points}</b> | Shards: <b>${shards}</b>`;
}

function getNodeLevel(progression, heroId, nodeId) {
  return Math.max(0, Number(progression?.heroNodes?.[heroId]?.[nodeId]) || 0);
}

function renderHeroTreePanel(catalog, progression, hero, unlocked) {
  if (!heroTreePanelEl) return;
  if (!hero) {
    heroTreePanelEl.innerHTML = '';
    return;
  }

  const points = Math.max(0, Number(progression?.accountSkillPoints) || 0);
  const shards = Math.max(0, Number(progression?.shards) || 0);
  const accountLevel = Math.max(1, Number(progression?.accountLevel) || 1);
  const needLevel = Math.max(1, Number(hero.unlockLevel) || 1);
  const needShardCost = Math.max(0, Number(hero.unlockShardCost ?? hero.unlockCost) || 0);
  const needCardId = String(hero.unlockCardId || '').trim();
  const needCards = Math.max(0, Number(hero.unlockCardNeed) || 0);
  const cardName = String(hero.unlockCardName || hero.name || 'Hero Card');
  const haveCards = needCardId ? Math.max(0, Number(progression?.heroCards?.[needCardId]) || 0) : needCards;
  const canUnlock = game.playerAuth?.player
    && !unlocked
    && accountLevel >= needLevel
    && shards >= needShardCost
    && haveCards >= needCards;

  const tree = Array.isArray(catalog.trees?.[hero.id]) ? catalog.trees[hero.id] : [];
  const rows = [];
  for (const node of tree) {
    const lvl = getNodeLevel(progression, hero.id, node.id);
    const maxLevel = Math.max(1, Number(node.maxLevel) || 1);
    const cost = Math.max(1, Number(node.cost) || 1);
    const canUpgrade = Boolean(game.playerAuth?.player && unlocked && lvl < maxLevel && points >= cost);
    rows.push(`<div class="hero-node"><div><div class="hero-node-name">${escapeHtml(node.name || node.id)}</div><div class="hero-node-desc">${escapeHtml(node.desc || '')}</div></div><button type="button" class="hero-node-up" data-node-id="${escapeHtml(node.id)}" ${canUpgrade ? '' : 'disabled'}>Lv ${lvl}/${maxLevel} (+${cost})</button></div>`);
  }

  const unlockMeta = !unlocked
    ? `<div class="hero-lock-meta">Unlock: Lv${needLevel} | ${haveCards}/${needCards} ${escapeHtml(cardName)} | ${needShardCost} shards</div>`
    : '<div class="hero-lock-meta unlocked">Unlocked</div>';

  const actionBtn = !game.playerAuth?.player
    ? '<button type="button" class="hero-main-action" disabled>Login to unlock/progress</button>'
    : (!unlocked
      ? `<button type="button" class="hero-main-action" data-hero-unlock="1" ${canUnlock ? '' : 'disabled'}>Unlock hero</button>`
      : `<button type="button" class="hero-main-action" data-hero-select="1" ${(selectedPlayerClass === hero.id) ? 'disabled' : ''}>Select hero</button>`);

  heroTreePanelEl.innerHTML = `<div class="hero-tree-head"><div><b>${escapeHtml(hero.name)}</b><div class="hero-tagline">${escapeHtml(hero.tagline || '')}</div></div>${unlockMeta}</div>${actionBtn}<div class="hero-tree-list">${rows.join('')}</div>`;

  const unlockBtn = heroTreePanelEl.querySelector('[data-hero-unlock="1"]');
  unlockBtn?.addEventListener('click', async () => {
    try {
      await unlockHeroForAccount(hero.id);
      setHeroActionFeedback(`${hero.name} unlocked.`, 'ok');
      selectedPlayerClass = hero.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      await selectHeroForAccount(hero.id);
      renderCharacterPicker();
    } catch (err) {
      setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to unlock hero.'), 'err');
    }
  });

  const selectBtn = heroTreePanelEl.querySelector('[data-hero-select="1"]');
  selectBtn?.addEventListener('click', async () => {
    selectedPlayerClass = hero.id;
    localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
    try {
      await selectHeroForAccount(hero.id);
      setHeroActionFeedback(`${hero.name} selected.`, 'ok');
    } catch (err) {
      setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to select hero.'), 'err');
    }
    renderCharacterPicker();
  });

  for (const btn of heroTreePanelEl.querySelectorAll('.hero-node-up')) {
    btn.addEventListener('click', async () => {
      const nodeId = btn.getAttribute('data-node-id') || '';
      if (!nodeId) return;
      try {
        await upgradeHeroNodeForAccount(hero.id, nodeId);
        setHeroActionFeedback(`Upgraded ${hero.name}: ${nodeId}`, 'ok');
        renderCharacterPicker();
      } catch (err) {
        setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to upgrade node.'), 'err');
      }
    });
  }
}

function renderCharacterPicker() {
  if (!characterSelectEl) return;
  const catalog = getProgressionCatalog();
  const progression = getProgressionState();
  const unlockedHeroes = getUnlockedHeroSet(catalog, progression);
  const heroes = catalog.heroes.map((hero) => ({ ...getPlayerVariant(hero.id), ...hero }));

  selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);
  if (!unlockedHeroes.has(selectedPlayerClass)) {
    selectedPlayerClass = progression?.activeHero && unlockedHeroes.has(progression.activeHero)
      ? progression.activeHero
      : (catalog.baseHeroId || 'cyber');
    localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
  }

  if (!heroFocusId || !heroes.some((hero) => hero.id === heroFocusId)) {
    heroFocusId = selectedPlayerClass;
  }

  characterSelectEl.innerHTML = '';
  if (heroGalleryV2El) heroGalleryV2El.innerHTML = '';

  const wheel = document.createElement('div');
  wheel.className = 'hero-wheel';
  const isMobileWheel = window.innerWidth <= 720;
  const wheelSize = isMobileWheel
    ? Math.max(220, Math.min(320, window.innerWidth - 34))
    : Math.max(260, Math.min(420, window.innerWidth - 90));
  const wheelRadius = isMobileWheel
    ? Math.max(82, Math.round(wheelSize * 0.31))
    : Math.max(98, Math.round(wheelSize * 0.39));
  wheel.style.setProperty('--radius', wheelRadius + 'px');

  const center = document.createElement('div');
  center.className = 'hero-wheel-center';
  center.innerHTML = `<div class="hero-center-label">Selected hero</div><div class="hero-center-name">${escapeHtml(getPlayerVariant(selectedPlayerClass).name || selectedPlayerClass)}</div>`;
  wheel.appendChild(center);

  const count = Math.max(1, heroes.length);
  const step = 360 / count;
  for (let i = 0; i < heroes.length; i += 1) {
    const hero = heroes[i];
    const unlocked = unlockedHeroes.has(hero.id);
    const active = selectedPlayerClass === hero.id;
    const focused = heroFocusId === hero.id;
    const angle = -90 + step * i;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `char-option wheel-option${active ? ' active' : ''}${focused ? ' focused' : ''}${unlocked ? '' : ' locked'}`;
    btn.dataset.classId = hero.id;
    const rad = (Math.PI / 180) * angle;
    const offsetX = Math.round(Math.cos(rad) * wheelRadius);
    const offsetY = Math.round(Math.sin(rad) * wheelRadius);
    btn.style.setProperty('--x', offsetX + 'px');
    btn.style.setProperty('--y', offsetY + 'px');
    btn.style.setProperty('--accent', hero.accent || '#22d3ee');

    const preview = document.createElement('canvas');
    preview.width = 56;
    preview.height = 62;
    preview.className = 'char-preview';
    drawCharacterPreview(preview, hero);

    const label = document.createElement('span');
    label.className = 'char-label';
    label.textContent = hero.name;

    btn.appendChild(preview);
    btn.appendChild(label);
    if (!unlocked) {
      const lock = document.createElement('span');
      lock.className = 'char-lock';
      const cardId = String(hero.unlockCardId || '').trim();
      const needCards = Math.max(0, Number(hero.unlockCardNeed) || 0);
      const haveCards = cardId ? Math.max(0, Number(progression?.heroCards?.[cardId]) || 0) : needCards;
      lock.textContent = needCards > 0
        ? (`C${haveCards}/${needCards}`)
        : (`Lv${Math.max(1, Number(hero.unlockLevel) || 1)}`);
      btn.appendChild(lock);
    }

    btn.addEventListener('click', async () => {
      heroFocusId = hero.id;
      if (!unlocked) {
        renderCharacterPicker();
        return;
      }
      selectedPlayerClass = hero.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      if (game.playerAuth?.player) {
        try {
          await selectHeroForAccount(hero.id);
          setHeroActionFeedback(`${hero.name} selected.`, 'ok');
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to select hero.'), 'err');
        }
      }
      renderCharacterPicker();
    });

    wheel.appendChild(btn);
  }

  characterSelectEl.appendChild(wheel);
  const focusedHero = heroes.find((hero) => hero.id === heroFocusId) || heroes[0] || null;
  renderHeroGalleryV2(heroes, progression, unlockedHeroes);
  renderProfilePanel(heroes, progression, unlockedHeroes);
  renderAccountSummary(catalog, progression);
  renderHeroTreePanel(catalog, progression, focusedHero, focusedHero ? unlockedHeroes.has(focusedHero.id) : false);
}

function buildHeroUnlockHint(hero, progression) {
  const needLevel = Math.max(1, Number(hero.unlockLevel) || 1);
  const needShardCost = Math.max(0, Number(hero.unlockShardCost ?? hero.unlockCost) || 0);
  const cardId = String(hero.unlockCardId || '').trim();
  const cardNeed = Math.max(0, Number(hero.unlockCardNeed) || 0);
  const haveCards = cardId ? Math.max(0, Number(progression?.heroCards?.[cardId]) || 0) : cardNeed;
  if (cardNeed > 0) return `Lv${needLevel} | Cores ${haveCards}/${cardNeed} | ${needShardCost} shards`;
  return `Lv${needLevel} | ${needShardCost} shards`;
}

function getHeroCardImagePath(heroId) {
  const id = String(heroId || '').trim().toLowerCase();
  if (!id) return '/assets/characters/cyber.jpg';
  if (id === 'medic') return '/assets/characters/medis.jpg';
  return `/assets/characters/${id}.jpg`;
}

function renderHeroGalleryV2(heroes, progression, unlockedHeroes) {
  if (!heroGalleryV2El) return;
  heroGalleryV2El.innerHTML = '';
  for (const hero of heroes) {
    const unlocked = unlockedHeroes.has(hero.id);
    const focused = hero.id === heroFocusId;
    const active = hero.id === selectedPlayerClass;

    const cardBtn = document.createElement('button');
    cardBtn.type = 'button';
    cardBtn.className = `hero-v2-card${active ? ' active' : ''}${focused ? ' focused' : ''}${unlocked ? '' : ' locked'}`;
    cardBtn.style.setProperty('--accent', hero.accent || '#38bdf8');
    cardBtn.setAttribute('aria-label', `Hero ${hero.name}`);

    const inner = document.createElement('div');
    inner.className = 'hero-v2-inner';

    const portrait = document.createElement('img');
    portrait.className = 'hero-v2-portrait';
    portrait.src = getHeroCardImagePath(hero.id);
    portrait.alt = hero.name;

    const preview = document.createElement('canvas');
    preview.width = 100;
    preview.height = 108;
    preview.className = 'hero-v2-preview hidden';
    drawCharacterPreview(preview, hero);

    portrait.addEventListener('error', () => {
      portrait.classList.add('hidden');
      preview.classList.remove('hidden');
    }, { once: true });

    inner.appendChild(portrait);
    inner.appendChild(preview);
    if (!unlocked) {
      const lockBadge = document.createElement('img');
      lockBadge.className = 'hero-v2-lock';
      lockBadge.src = '/assets/ui/lock-overlay.svg';
      lockBadge.alt = 'Locked';
      inner.appendChild(lockBadge);
    }
    cardBtn.appendChild(inner);

    const name = document.createElement('div');
    name.className = 'hero-v2-name';
    name.textContent = hero.name;

    const status = document.createElement('div');
    status.className = `hero-v2-status${unlocked ? '' : ' locked'}`;
    status.textContent = unlocked ? (active ? 'Selected' : 'Unlocked') : buildHeroUnlockHint(hero, progression);

    cardBtn.addEventListener('click', async () => {
      heroFocusId = hero.id;
      if (!unlocked) {
        renderCharacterPicker();
        return;
      }
      selectedPlayerClass = hero.id;
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
      if (game.playerAuth?.player) {
        try {
          await selectHeroForAccount(hero.id);
          setHeroActionFeedback(`${hero.name} selected.`, 'ok');
        } catch (err) {
          setHeroActionFeedback(humanizeHeroApiError(err, 'Failed to select hero.'), 'err');
        }
      }
      renderCharacterPicker();
    });

    const wrap = document.createElement('div');
    wrap.className = 'hero-v2-item';
    wrap.appendChild(cardBtn);
    wrap.appendChild(name);
    wrap.appendChild(status);
    heroGalleryV2El.appendChild(wrap);
  }
}

function resetProfileRunHistoryUi() {
  profileRunHistoryUi.items = [];
  profileRunHistoryUi.page = 1;
  profileRunHistoryUi.totalPages = 1;
  profileRunHistoryUi.total = 0;
  profileRunHistoryUi.loading = false;
  profileRunHistoryUi.error = '';
  profileRunHistoryUi.loadedNickname = '';
  profileRunHistoryUi.lastLoadedAt = 0;
}

function renderProfileRunHistory() {
  if (!profileRunHistoryEl) return;
  if (!game.playerAuth?.player) {
    profileRunHistoryEl.innerHTML = '<b>Run history</b><div class="profile-run-empty">Login required.</div>';
    return;
  }

  const canPrev = profileRunHistoryUi.page > 1;
  const canNext = profileRunHistoryUi.page < profileRunHistoryUi.totalPages;

  profileRunHistoryEl.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'profile-run-history-head';

  const title = document.createElement('div');
  title.className = 'profile-run-history-title';
  title.textContent = 'Run history (' + profileRunHistoryUi.total + ')';

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'mini';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.disabled = profileRunHistoryUi.loading;
  refreshBtn.addEventListener('click', () => {
    void requestProfileRunHistory({ force: true, page: profileRunHistoryUi.page });
  });

  head.appendChild(title);
  head.appendChild(refreshBtn);
  profileRunHistoryEl.appendChild(head);

  if (profileRunHistoryUi.loading && profileRunHistoryUi.items.length === 0) {
    const loading = document.createElement('div');
    loading.className = 'profile-run-empty';
    loading.textContent = 'Загрузка новостей...';
    profileRunHistoryEl.appendChild(loading);
    return;
  }

  if (profileRunHistoryUi.error && profileRunHistoryUi.items.length === 0) {
    const error = document.createElement('div');
    error.className = 'profile-run-empty';
    error.textContent = profileRunHistoryUi.error;
    profileRunHistoryEl.appendChild(error);
    return;
  }

  if (!profileRunHistoryUi.items.length) {
    const empty = document.createElement('div');
    empty.className = 'profile-run-empty';
    empty.textContent = 'No runs yet. Finish a run to see history here.';
    profileRunHistoryEl.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'profile-run-list';
  const rankOffset = (profileRunHistoryUi.page - 1) * profileRunHistoryUi.pageSize;

  for (let i = 0; i < profileRunHistoryUi.items.length; i += 1) {
    const run = profileRunHistoryUi.items[i];
    const heroXp = Math.max(0, Number(run?.runDetails?.xp) || 0);
    const gameModeLabel = formatRunGameModeLabel(run);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'profile-run-row';

    const headRow = document.createElement('div');
    headRow.className = 'profile-run-head';

    const when = document.createElement('span');
    when.textContent = formatRecordDateTime(run?.at);

    const room = document.createElement('span');
    room.textContent = 'Room ' + String(run?.roomCode || '-') + ' | ' + gameModeLabel;

    headRow.appendChild(when);
    headRow.appendChild(room);

    const main = document.createElement('div');
    main.className = 'profile-run-main';
    main.innerHTML = '<span>' + Math.max(0, Number(run?.kills) || 0) + ' kills</span>'
      + '<span>' + Math.max(0, Number(run?.score) || 0) + ' pts</span>'
      + '<span>' + Math.max(1, Number(run?.durationSec) || 1) + 's</span>'
      + '<span class="profile-run-meta">XP ' + heroXp + '</span>';

    row.appendChild(headRow);
    row.appendChild(main);

    const runRank = 'Run #' + (rankOffset + i + 1);
    row.addEventListener('click', () => {
      openRecordDetailsModal(run, runRank);
    });

    list.appendChild(row);
  }

  profileRunHistoryEl.appendChild(list);

  const pager = document.createElement('div');
  pager.className = 'profile-run-history-pager';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'mini';
  prevBtn.textContent = 'Prev';
  prevBtn.disabled = profileRunHistoryUi.loading || !canPrev;
  prevBtn.addEventListener('click', () => {
    if (profileRunHistoryUi.page > 1) {
      void requestProfileRunHistory({ force: true, page: profileRunHistoryUi.page - 1 });
    }
  });

  const pageText = document.createElement('div');
  pageText.className = 'profile-run-history-page';
  pageText.textContent = 'Page ' + profileRunHistoryUi.page + '/' + profileRunHistoryUi.totalPages;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'mini';
  nextBtn.textContent = 'Next';
  nextBtn.disabled = profileRunHistoryUi.loading || !canNext;
  nextBtn.addEventListener('click', () => {
    if (profileRunHistoryUi.page < profileRunHistoryUi.totalPages) {
      void requestProfileRunHistory({ force: true, page: profileRunHistoryUi.page + 1 });
    }
  });

  pager.appendChild(prevBtn);
  pager.appendChild(pageText);
  pager.appendChild(nextBtn);

  profileRunHistoryEl.appendChild(pager);
}

async function requestProfileRunHistory({ force = false, page = profileRunHistoryUi.page } = {}) {
  if (!profileRunHistoryEl) return;
  if (!game.playerAuth?.player) {
    resetProfileRunHistoryUi();
    renderProfileRunHistory();
    return;
  }

  const nicknameKey = String(game.playerAuth.player.nickname || '').trim().toLowerCase();
  if (!nicknameKey) {
    resetProfileRunHistoryUi();
    renderProfileRunHistory();
    return;
  }

  if (profileRunHistoryUi.loadedNickname && profileRunHistoryUi.loadedNickname !== nicknameKey) {
    resetProfileRunHistoryUi();
  }

  const nextPage = Math.max(1, Math.floor(page) || 1);
  const now = Date.now();
  if (!force
    && !profileRunHistoryUi.loading
    && profileRunHistoryUi.loadedNickname === nicknameKey
    && profileRunHistoryUi.page === nextPage
    && profileRunHistoryUi.items.length > 0
    && (now - profileRunHistoryUi.lastLoadedAt) < PROFILE_RUN_HISTORY_CACHE_MS) {
    renderProfileRunHistory();
    return;
  }

  const token = profileRunHistoryUi.fetchToken + 1;
  profileRunHistoryUi.fetchToken = token;
  profileRunHistoryUi.loading = true;
  profileRunHistoryUi.error = '';
  profileRunHistoryUi.page = nextPage;
  renderProfileRunHistory();

  try {
    const params = new URLSearchParams({
      page: String(nextPage),
      page_size: String(profileRunHistoryUi.pageSize),
    });
    const res = await fetch('/api/player/run-history?' + params.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const payload = await res.json();

    if (profileRunHistoryUi.fetchToken !== token) return;

    profileRunHistoryUi.items = Array.isArray(payload.runs) ? payload.runs : [];
    profileRunHistoryUi.page = Math.max(1, Number(payload.page) || nextPage);
    profileRunHistoryUi.totalPages = Math.max(1, Number(payload.totalPages) || 1);
    profileRunHistoryUi.total = Math.max(0, Number(payload.total) || 0);
    profileRunHistoryUi.loadedNickname = nicknameKey;
    profileRunHistoryUi.lastLoadedAt = Date.now();
    profileRunHistoryUi.error = '';
  } catch {
    if (profileRunHistoryUi.fetchToken !== token) return;
    profileRunHistoryUi.error = 'Failed to load run history.';
  } finally {
    if (profileRunHistoryUi.fetchToken === token) {
      profileRunHistoryUi.loading = false;
      renderProfileRunHistory();
    }
  }
}

function renderProfilePanel(heroes, progression, unlockedHeroes) {
  if (!profileSummaryEl || !profileAchievementsEl || !profileCharacterStatsEl || !profileRunHistoryEl) return;
  if (!game.playerAuth?.player || !progression) {
    profileSummaryEl.innerHTML = '<b>Guest profile</b><div>Login to save profile progression, achievements and hero stats.</div>';
    profileAchievementsEl.innerHTML = '<b>Achievements</b><div>Login required.</div>';
    profileCharacterStatsEl.innerHTML = '<b>Hero stats</b><div>Login required.</div>';
    resetProfileRunHistoryUi();
    renderProfileRunHistory();
    return;
  }

  const level = Math.max(1, Number(progression.accountLevel) || 1);
  const xp = Math.max(0, Number(progression.accountXp) || 0);
  const xpToNext = Math.max(1, Number(progression.accountXpToNext) || 1);
  const shards = Math.max(0, Number(progression.shards) || 0);
  const points = Math.max(0, Number(progression.accountSkillPoints) || 0);
  const unlockedCount = unlockedHeroes.size;
  const heroLevels = progression.heroLevels && typeof progression.heroLevels === 'object' ? progression.heroLevels : {};
  const totalRuns = Math.max(0, Number(progression.totalRuns) || 0);
  const heroRuns = progression.heroRuns && typeof progression.heroRuns === 'object' ? progression.heroRuns : {};

  profileSummaryEl.innerHTML = `<b>Profile Lv${level}</b><div>XP ${xp}/${xpToNext} | Skill points: ${points} | Shards: ${shards} | Heroes: ${unlockedCount}/${heroes.length} | Runs: ${totalRuns}</div>`;
  profileAchievementsEl.innerHTML = '<b>Achievements</b><div>First Blood, Survivor, Boss Hunter and account milestones can be shown here.</div>';

  const rows = heroes.map((hero) => {
    const heroLvl = Math.max(1, Number(heroLevels[hero.id]) || 1);
    const runs = Math.max(0, Number(heroRuns[hero.id]) || 0);
    const unlocked = unlockedHeroes.has(hero.id) ? 'Unlocked' : 'Locked';
    return `<div class="profile-hero-row"><span>${escapeHtml(hero.name)}</span><span>Lv${heroLvl} | Runs: ${runs}</span><span>${unlocked}</span></div>`;
  }).join('');
  profileCharacterStatsEl.innerHTML = `<b>Hero stats</b><div class="profile-hero-list">${rows}</div>`;
  renderProfileRunHistory();
  if (currentMainMenuTab === 'profile') {
    void requestProfileRunHistory({ force: false, page: profileRunHistoryUi.page });
  }
}

globalThis.renderCharacterPicker = renderCharacterPicker;

const storedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
if (nameInput && storedNickname && storedNickname.trim() && !game.playerAuth?.player) {
  nameInput.value = storedNickname.trim().slice(0, 18);
}
if (!game.playerAuth?.player) {
  void updateNicknameStatus(nameInput?.value || '');
}
selectedPlayerClass = sanitizePlayerClass(localStorage.getItem(PLAYER_CLASS_STORAGE_KEY) || selectedPlayerClass);
renderCharacterPicker();

applyPresetToUi('normal');
applyRoomSync(configFromSyncUi());

syncPresetEl?.addEventListener('change', () => {
  const key = syncPresetEl.value;
  if (key === 'custom') return;
  applyPresetToUi(key);
  applyRoomSync(configFromSyncUi());
});

for (const el of [syncTickrateEl, syncStateRateEl, syncRenderDelayEl, syncMaxExtrapolationEl, syncEntityInterpEl, syncBulletCorrectionEl, syncInputRateEl]) {
  el?.addEventListener('change', () => {
    if (syncPresetEl) syncPresetEl.value = 'custom';
    applyRoomSync(configFromSyncUi());
  });
}

async function sendJoinRequest(roomCode, joinSync = null, options = {}) {
  const mode = joinSync ? 'create' : 'join';
  const skipRouting = options?.skipRouting === true;
  const source = options?.source || 'menu';
  if (typeof window.cwSetPendingJoinAnalytics === 'function') {
    window.cwSetPendingJoinAnalytics(mode, roomCode, source);
  }
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal(mode === 'create' ? 'create_room_attempt' : 'join_room_attempt', {
      source,
      room_code: String(roomCode || '').trim().toUpperCase() || 'AUTO',
      sync_preset: joinSync ? String(syncPresetEl?.value || 'custom') : 'none',
    });
    window.cwTrackMetrikaGoal('game_start_attempt', {
      mode,
      source,
      room_code: String(roomCode || '').trim().toUpperCase() || 'AUTO',
    });
  }
  clearJoinFeedback();
  if (!skipRouting) {
    try {
      const route = await resolveRoomRoute(mode, roomCode, { gameMode: selectedGameMode });
      if (mode === 'join' && route?.found && route?.room?.isFull) {
        const message = `Room ${route.room.code} is full (${route.room.players}/${route.room.maxPlayers}).`;
        statusEl.textContent = message;
        setJoinFeedback(message);
        joinOverlay.style.display = 'grid';
        joinOverlay.classList.remove('death-mode');
        setDeathCinematicActive(false);
        updateMobileControlsVisibility();
        return;
      }
      const workerOrigin = normalizeOrigin(route?.target?.publicBaseUrl || APP_ORIGIN);
      await connectGameSocket(workerOrigin);
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to resolve room route.';
      setJoinFeedback(err.message || 'Failed to resolve room route.');
      return;
    }
  } else {
    try {
      await connectGameSocket(currentWorkerOrigin || APP_ORIGIN);
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to connect to game server.';
      setJoinFeedback(err.message || 'Failed to connect to game server.');
      return;
    }
  }
  if (ws.readyState !== WebSocket.OPEN) return;
  const name = (game.playerAuth?.player?.nickname || nameInput.value.trim() || 'Fighter').trim();
  localStorage.setItem(NICKNAME_STORAGE_KEY, name);
  if (authLoginNicknameEl && !authLoginNicknameEl.value) authLoginNicknameEl.value = name;
  if (authRegisterNicknameEl && !authRegisterNicknameEl.value) authRegisterNicknameEl.value = name;
  waitingForFirstState = true;
  resetNetStats();
  waitingForFirstStateSince = performance.now();
  sendJson({
    type: 'join',
    name,
    playerClass: selectedPlayerClass,
    roomCode,
    sync: joinSync || undefined,
    gameMode: mode === 'create' ? selectedGameMode : undefined,
  });
  joinOverlay.style.display = 'none';
  joinOverlay.classList.remove('death-mode');
  setDeathCinematicActive(false);
  updateMobileControlsVisibility();
}


async function copyRoomCodeToClipboard(roomCode, { silent = false } = {}) {
  const code = String(roomCode || '').trim();
  if (!code) return false;
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    if (!silent) statusEl.textContent = `Room code: ${code} (clipboard unavailable)`;
    return false;
  }
  try {
    await navigator.clipboard.writeText(code);
    if (!silent) statusEl.textContent = `Room code copied: ${code}`;
    return true;
  } catch {
    if (!silent) statusEl.textContent = `Room code: ${code} (click Room to copy)`;
    return false;
  }
}

if (roomMetaEl) { roomMetaEl.style.cursor = 'pointer'; roomMetaEl.title = 'Click to copy room code'; }
roomMetaEl?.addEventListener('click', () => {
  if (!game.roomCode) return;
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('room_code_copy', { room_code: game.roomCode });
  }
  copyRoomCodeToClipboard(game.roomCode, { silent: false });
});
function renderPresence(presence) {
  if (!presenceMetaEl) return;
  const online = Number(presence?.online) || 0;
  const inGame = Number(presence?.inGame) || 0;
  const inMenu = Number(presence?.inMenu) || 0;
  const hasRegistered = Number.isFinite(Number(presence?.registered));
  const registered = hasRegistered ? Math.max(0, Number(presence?.registered) || 0) : null;
  const renderCount = (value) => {
    if (value === null) return '<span class="presence-count">--</span>';
    const cls = value > 0 ? 'presence-count hot' : 'presence-count';
    return `<span class="${cls}">${value}</span>`;
  };
  presenceMetaEl.innerHTML = `Online: ${renderCount(online)} | In game: ${renderCount(inGame)} | In menu: ${renderCount(inMenu)} | Registered: ${renderCount(registered)}`;
}

function renderRoomsList(rooms) {
  if (!roomsListEl) return;

  if (!rooms.length) {
    roomsListEl.textContent = 'No active rooms yet.';
    return;
  }

  roomsListEl.innerHTML = '';
  for (const room of rooms) {
    const row = document.createElement('div');
    row.className = 'room-row';

    const code = document.createElement('div');
    code.className = 'room-code';
    code.textContent = room.code;

    const meta = document.createElement('div');
    meta.className = 'room-meta';
    meta.textContent = `${room.players}/${room.maxPlayers}`;

    const joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.className = 'room-join';
    joinBtn.textContent = 'Join';
    joinBtn.disabled = room.players >= room.maxPlayers;
    joinBtn.addEventListener('click', () => {
      roomCodeInput.value = room.code;
      joinMode = 'join';
      if (typeof window.cwTrackMetrikaGoal === 'function') {
        window.cwTrackMetrikaGoal('room_search_result_click', {
          room_code: room.code,
          players: Number(room.players) || 0,
        });
      }
      void sendJoinRequest(room.code, null, { source: 'rooms_list' });
    });

    row.appendChild(code);
    row.appendChild(meta);
    row.appendChild(joinBtn);
    roomsListEl.appendChild(row);
  }
}

async function requestRoomsList() {
  if (!roomsListEl) return;
  try {
    const res = await fetch('/api/rooms', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (payload?.isShuttingDown) {
      statusEl.textContent = 'Server restarting. New rooms are temporarily unavailable.';
    }
    renderPresence(payload.presence);
    renderRoomsList(Array.isArray(payload.rooms) ? payload.rooms : []);
  } catch {
    if (presenceMetaEl) presenceMetaEl.textContent = 'Online: -- | In game: -- | In menu: -- | Registered: --';
    roomsListEl.textContent = 'Failed to load rooms.';
  }
}


function updateRecordsPager() {
  if (recordsPageEl) recordsPageEl.textContent = `Page ${recordsUi.page}/${recordsUi.totalPages}`;
  if (recordsTotalEl) recordsTotalEl.textContent = `(Total: ${recordsUi.total})`;
  if (recordsPrevBtn) recordsPrevBtn.disabled = recordsUi.page <= 1;
  if (recordsNextBtn) recordsNextBtn.disabled = recordsUi.page >= recordsUi.totalPages;
}

function buildReplayShareUrl(recordId, startSec = 0) {
  const id = Math.max(0, Number(recordId) || 0);
  const at = Math.max(0, Number(startSec) || 0);
  const url = new URL(window.location.href);
  url.searchParams.delete('room');
  url.searchParams.delete('mode');
  url.searchParams.delete('routed');
  if (id > 0) url.searchParams.set('replay', String(id));
  else url.searchParams.delete('replay');
  if (at > 0) url.searchParams.set('replayAt', String(at));
  else url.searchParams.delete('replayAt');
  url.searchParams.delete('t');
  return url.toString();
}

function formatReplayClock(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatReplayBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function describeReplayLoadProgress(info) {
  const received = Math.max(0, Number(info?.received) || 0);
  const total = Math.max(0, Number(info?.total) || 0);
  const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((received / total) * 100))) : null;
  if (total > 0) return `${formatReplayBytes(received)} / ${formatReplayBytes(total)}${percent !== null ? ` (${percent}%)` : ''}`;
  if (received > 0) return `${formatReplayBytes(received)} loaded`;
  return 'Preparing replay data...';
}

function showReplayLoadOverlay(label, meta = 'Preparing replay data...') {
  if (replayLoadLabelEl) replayLoadLabelEl.textContent = label || 'Loading replay...';
  if (replayLoadMetaEl) replayLoadMetaEl.textContent = meta;
  if (replayLoadFillEl) {
    replayLoadFillEl.style.width = '0%';
    replayLoadFillEl.classList.add('indeterminate');
  }
  if (replayLoadOverlayEl) replayLoadOverlayEl.classList.remove('hidden');
}

function updateReplayLoadOverlay(info) {
  if (replayLoadMetaEl) replayLoadMetaEl.textContent = describeReplayLoadProgress(info);
  if (!replayLoadFillEl) return;
  const total = Math.max(0, Number(info?.total) || 0);
  const received = Math.max(0, Math.min(total || Number.MAX_SAFE_INTEGER, Number(info?.received) || 0));
  if (total > 0) {
    const percent = Math.max(0, Math.min(100, (received / total) * 100));
    replayLoadFillEl.classList.remove('indeterminate');
    replayLoadFillEl.style.width = `${percent.toFixed(1)}%`;
    return;
  }
  replayLoadFillEl.style.width = '35%';
  replayLoadFillEl.classList.add('indeterminate');
}

function hideReplayLoadOverlay() {
  if (replayLoadOverlayEl) replayLoadOverlayEl.classList.add('hidden');
}

function updateRecordReplayStageButton() {
  if (!recordReplayStageLoadBtn) return;
  const shouldShow = recordReplay.recordId > 0 && !recordReplay.loaded;
  recordReplayStageLoadBtn.classList.toggle('hidden', !shouldShow);
  recordReplayStageLoadBtn.disabled = recordReplay.loading;
  recordReplayStageLoadBtn.textContent = recordReplay.loading ? 'Loading...' : 'Load Replay';
}

function stopRecordReplayPlayback(resetElapsed = false) {
  if (recordReplay.rafId) cancelAnimationFrame(recordReplay.rafId);
  recordReplay.rafId = 0;
  recordReplay.playing = false;
  if (resetElapsed) recordReplay.elapsedMs = 0;
  if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = recordReplay.loaded ? 'Play Replay' : 'Load Replay';
  updateRecordReplayButtons();
  updateRecordReplayStageButton();
}

function setRecordReplaySpeed(speed) {
  const nextSpeed = Math.max(1, Number(speed) || 1);
  recordReplay.speed = nextSpeed;
  const buttons = recordReplaySpeedsEl ? Array.from(recordReplaySpeedsEl.querySelectorAll('[data-replay-speed]')) : [];
  for (const btn of buttons) {
    btn.classList.toggle('active', Number(btn.dataset.replaySpeed) === nextSpeed);
  }
  if (recordReplayMetaEl && recordReplay.loaded && !recordReplay.playing) {
    const replayDurationMs = getReplayDurationMs(recordReplay.payload);
    recordReplayMetaEl.textContent = `Ready. ${formatReplayClock(replayDurationMs)} total | speed x${recordReplay.speed}`;
  }
}

function updateRecordReplayButtons() {
  if (recordReplayToggleBtn) recordReplayToggleBtn.textContent = recordReplay.playing ? 'Pause' : 'Continue';
}

function seekRecordReplay(elapsedMs, { keepPaused = null } = {}) {
  const totalMs = getReplayDurationMs(recordReplay.payload);
  recordReplay.elapsedMs = Math.max(0, Math.min(totalMs, Number(elapsedMs) || 0));
  recordReplay.startedAt = performance.now() - (recordReplay.elapsedMs / Math.max(1, recordReplay.speed || 1));
  if (typeof keepPaused === 'boolean') recordReplay.playing = !keepPaused;
  drawRecordReplay();
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
  }
  if (recordReplayProgressEl && !recordReplay.seeking) {
    const value = totalMs > 0 ? Math.round((recordReplay.elapsedMs / totalMs) * 1000) : 0;
    recordReplayProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
  updateRecordReplayButtons();
}

function resizeRecordReplayCanvas() {
  if (!recordReplayCanvasEl) return null;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const cssWidth = Math.max(280, Math.round(recordReplayCanvasEl.clientWidth || 520));
  const cssHeight = Math.max(180, Math.round(cssWidth / 1.625));
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);
  if (recordReplayCanvasEl.width !== width || recordReplayCanvasEl.height !== height) {
    recordReplayCanvasEl.width = width;
    recordReplayCanvasEl.height = height;
  }
  const replayCtx = recordReplayCanvasEl.getContext('2d');
  if (!replayCtx) return null;
  replayCtx.setTransform(1, 0, 0, 1, 0, 0);
  replayCtx.scale(dpr, dpr);
  return { ctx: replayCtx, width: cssWidth, height: cssHeight };
}

function pickReplayFramePair(frames, elapsedMs) {
  if (!Array.isArray(frames) || frames.length <= 0) return { current: null, next: null, alpha: 0 };
  if (frames.length === 1 || elapsedMs <= Number(frames[0]?.t || 0)) return { current: frames[0], next: frames[0], alpha: 0 };
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (Number(frames[mid]?.t || 0) <= elapsedMs) lo = mid;
    else hi = mid - 1;
  }
  const current = frames[lo] || frames[frames.length - 1];
  const next = frames[Math.min(frames.length - 1, lo + 1)] || current;
  const currentT = Number(current?.t || 0);
  const nextT = Math.max(currentT, Number(next?.t || currentT));
  const alpha = nextT > currentT ? Math.max(0, Math.min(1, (elapsedMs - currentT) / (nextT - currentT))) : 0;
  return { current, next, alpha, index: lo };
}

function frameEntityMap(frameList) {
  const map = new Map();
  for (const item of Array.isArray(frameList) ? frameList : []) {
    map.set(item[0], item);
  }
  return map;
}

function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}

function getReplayDurationMs(payload) {
  const secondsMs = Math.max(0, Number(payload?.durationSec || 0) * 1000);
  const lastFrameMs = Math.max(0, Number(payload?.frames?.at(-1)?.t || 0));
  return Math.max(secondsMs, lastFrameMs);
}

function updateReplayGameButtons() {
  if (replayGameToggleBtn) replayGameToggleBtn.textContent = replayGame.playing ? 'Pause' : 'Continue';
}

function seekReplayGame(elapsedMs, { keepPaused = null } = {}) {
  const totalMs = getReplayDurationMs(replayGame.payload);
  replayGame.elapsedMs = Math.max(0, Math.min(totalMs, Number(elapsedMs) || 0));
  replayGame.startedAt = performance.now() - (replayGame.elapsedMs / Math.max(1, replayGame.speed || 1));
  if (typeof keepPaused === 'boolean') replayGame.playing = !keepPaused;
  visuals.enemyPrev = new Map();
  visuals.playerPrev = new Map();
  visuals.rocketPrev = new Map();
  visuals.bulletIds = new Set();
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  visuals.blood = [];
  visuals.bloodPuddles = [];
  visuals.gore = [];
  visuals.hitFx = [];
  visuals.muzzle = [];
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  replayGame.fxFrameIndex = -1;
  tickReplayGame(performance.now());
  updateReplayGameButtons();
}

function makeReplayBulletId(kind, fromEnemy, x, y, matchIndex) {
  return `${kind}:${fromEnemy ? 1 : 0}:${Math.round(x / 8)}:${Math.round(y / 8)}:${matchIndex}`;
}

function isNewReplayBulletTuple(bullet) {
  return Array.isArray(bullet) && (typeof bullet[0] === 'string' || typeof bullet[0] === 'number') && bullet.length >= 8;
}

function buildReplayCollisionTargets(enemiesRaw, playersRaw, bullet) {
  const targets = [];
  const hitPlayers = Boolean(bullet?.[7]);
  if (hitPlayers) {
    for (const player of Array.isArray(playersRaw) ? playersRaw : []) {
      if (!player?.[4]) continue;
      targets.push({
        x: Number(player[1]) || 0,
        y: Number(player[2]) || 0,
        r: 18,
      });
    }
    return targets;
  }

  for (const enemy of Array.isArray(enemiesRaw) ? enemiesRaw : []) {
    targets.push({
      x: Number(enemy[2]) || 0,
      y: Number(enemy[3]) || 0,
      r: Math.max(18, Number(enemy[6]) || 18),
    });
  }
  return targets;
}

function findReplayBulletImpactPoint(bullet, dtSec, enemiesRaw, playersRaw) {
  const x1 = Number(bullet?.[1]) || 0;
  const y1 = Number(bullet?.[2]) || 0;
  const vx = Number(bullet?.[3]) || 0;
  const vy = Number(bullet?.[4]) || 0;
  const bulletRadius = Math.max(2, Number(bullet?.[8]) || 3);
  const x2 = x1 + vx * dtSec;
  const y2 = y1 + vy * dtSec;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segLenSq = dx * dx + dy * dy;
  if (segLenSq <= 0.0001) return { x: x1, y: y1 };

  const targets = buildReplayCollisionTargets(enemiesRaw, playersRaw, bullet);
  let bestT = 1;
  for (const target of targets) {
    const rr = Math.max(4, bulletRadius + Math.max(8, Number(target.r) || 0));
    const tx = Number(target.x) || 0;
    const ty = Number(target.y) || 0;
    const proj = ((tx - x1) * dx + (ty - y1) * dy) / segLenSq;
    const t = Math.max(0, Math.min(1, proj));
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const ddx = tx - px;
    const ddy = ty - py;
    if ((ddx * ddx + ddy * ddy) <= rr * rr) {
      bestT = Math.min(bestT, Math.max(0, t - 0.06));
    }
  }

  return {
    x: x1 + dx * bestT,
    y: y1 + dy * bestT,
  };
}

function interpolateReplayBullets(currentBullets, nextBullets, alpha, currentT, nextT, currentEnemies, nextEnemies, currentPlayers, nextPlayers) {
  const source = Array.isArray(currentBullets) ? currentBullets : [];
  const target = Array.isArray(nextBullets) ? nextBullets : [];
  if (source.some(isNewReplayBulletTuple)) {
    const targetById = new Map();
    for (const nextBullet of target) {
      if (!isNewReplayBulletTuple(nextBullet)) continue;
      targetById.set(String(nextBullet[0]), nextBullet);
    }
    const dtSec = Math.max(0.001, (Math.max(currentT, nextT) - currentT) / 1000 || 0.2);
    return source.map((bullet, index) => {
      if (!isNewReplayBulletTuple(bullet)) {
        return {
          id: `legacy-${index}`,
          ownerId: '',
          x: Number(bullet?.[0]) || 0,
          y: Number(bullet?.[1]) || 0,
          vx: 0,
          vy: 0,
          color: bullet?.[3] ? '#fb7185' : ((bullet?.[2] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc'),
          kind: bullet?.[2] || 'bullet',
          radius: (bullet?.[2] || 'bullet') === 'rocket' ? 6 : 3,
          fromEnemy: Boolean(bullet?.[3]),
        };
      }
      const nextBullet = targetById.get(String(bullet[0])) || bullet;
      const x1 = Number(bullet[1]) || 0;
      const y1 = Number(bullet[2]) || 0;
      let x2 = Number(nextBullet[1]) || 0;
      let y2 = Number(nextBullet[2]) || 0;
      if (targetById.has(String(bullet[0]))) {
        x2 = Number(nextBullet[1]) || x1;
        y2 = Number(nextBullet[2]) || y1;
      } else {
        const impact = findReplayBulletImpactPoint(
          bullet,
          dtSec,
          Array.isArray(currentEnemies) && currentEnemies.length ? currentEnemies : nextEnemies,
          Array.isArray(currentPlayers) && currentPlayers.length ? currentPlayers : nextPlayers,
        );
        x2 = impact.x;
        y2 = impact.y;
      }
      return {
        id: String(bullet[0]),
        ownerId: bullet[9] || '',
        x: lerp(x1, x2, alpha),
        y: lerp(y1, y2, alpha),
        vx: Number(bullet[3]) || 0,
        vy: Number(bullet[4]) || 0,
        color: bullet[5] || (bullet[7] ? '#fb7185' : ((bullet[6] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc')),
        kind: bullet[6] || 'bullet',
        radius: Math.max(2, Number(bullet[8]) || ((bullet[6] || 'bullet') === 'rocket' ? 6 : 3)),
        fromEnemy: Boolean(bullet[7]),
      };
    });
  }
  const used = new Set();
  const out = [];
  const dtSec = Math.max(0.001, (Math.max(currentT, nextT) - currentT) / 1000 || 0.2);

  for (let i = 0; i < source.length; i += 1) {
    const bullet = source[i];
    let bestIndex = -1;
    let bestScore = Infinity;
    for (let j = 0; j < target.length; j += 1) {
      if (used.has(j)) continue;
      const nextBullet = target[j];
      if ((bullet?.[2] || 'bullet') !== (nextBullet?.[2] || 'bullet')) continue;
      if ((bullet?.[3] ? 1 : 0) !== (nextBullet?.[3] ? 1 : 0)) continue;
      const dx = (Number(nextBullet?.[0]) || 0) - (Number(bullet?.[0]) || 0);
      const dy = (Number(nextBullet?.[1]) || 0) - (Number(bullet?.[1]) || 0);
      const score = dx * dx + dy * dy;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = j;
      }
    }

    const nextBullet = bestIndex >= 0 ? target[bestIndex] : null;
    if (bestIndex >= 0) used.add(bestIndex);
    const x1 = Number(bullet?.[0]) || 0;
    const y1 = Number(bullet?.[1]) || 0;
    const x2 = Number(nextBullet?.[0]) || x1;
    const y2 = Number(nextBullet?.[1]) || y1;
    out.push({
      id: makeReplayBulletId(bullet?.[2] || 'bullet', Boolean(bullet?.[3]), x1, y1, bestIndex >= 0 ? bestIndex : i),
      ownerId: '',
      x: lerp(x1, x2, alpha),
      y: lerp(y1, y2, alpha),
      vx: (x2 - x1) / dtSec,
      vy: (y2 - y1) / dtSec,
      color: bullet?.[3] ? '#fb7185' : ((bullet?.[2] || 'bullet') === 'rocket' ? '#fb923c' : '#f8fafc'),
      kind: bullet?.[2] || 'bullet',
      radius: (bullet?.[2] || 'bullet') === 'rocket' ? 6 : 3,
      fromEnemy: Boolean(bullet?.[3]),
    });
  }

  return out;
}

function updateReplayGameSpeed(speed) {
  const nextSpeed = Math.max(1, Number(speed) || 1);
  replayGame.speed = nextSpeed;
  const buttons = replayGameSpeedsEl ? Array.from(replayGameSpeedsEl.querySelectorAll('[data-replay-game-speed]')) : [];
  for (const btn of buttons) {
    btn.classList.toggle('active', Number(btn.dataset.replayGameSpeed) === nextSpeed);
  }
  if (replayGameMetaEl && replayGame.active) {
    const totalMs = getReplayDurationMs(replayGame.payload);
    replayGameMetaEl.textContent = `Replay ${formatReplayClock(replayGame.elapsedMs)} / ${formatReplayClock(totalMs)} | x${replayGame.speed}`;
  }
}

function buildReplayState(payload, elapsedMs) {
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  const pair = pickReplayFramePair(frames, elapsedMs);
  const { current, next, alpha, index } = pair;
  if (!current) return null;

  const nowMs = Number(payload?.startedAt || Date.now()) + Math.max(0, Number(elapsedMs) || 0);
  const nextPlayers = frameEntityMap(next?.p);
  const nextEnemies = frameEntityMap(next?.e);
  const nextCompanions = frameEntityMap(next?.c);
  const playerList = [];

  for (const player of Array.isArray(current.p) ? current.p : []) {
    const nextPlayer = nextPlayers.get(player[0]) || player;
    const x = lerp(player[1], nextPlayer[1], alpha);
    const y = lerp(player[2], nextPlayer[2], alpha);
    const level = Math.max(1, Math.floor(Number(player[14]) || 1));
    const xpToNext = Math.max(1, Math.floor(Number(player[16]) || 1));
    const aimX = lerp(x, nextPlayer[1], 0.65);
    const aimY = lerp(y, nextPlayer[2], 0.65);
    const skills = (Array.isArray(player[9]) ? player[9] : []).map((skill) => ({
      id: skill[0] || '',
      level: Math.max(0, Number(skill[1]) || 0),
      cooldownMs: Math.max(0, Number(skill[2]) || 0),
      maxCooldownMs: Math.max(0, Number(skill[3]) || 0),
      kind: skill[4] || 'passive',
      rarity: skill[5] || 'common',
      name: skill[6] || skill[0] || 'Skill',
      desc: '',
    }));
    playerList.push({
      id: player[0],
      name: player[0] === payload?.playerId ? (payload?.playerName || 'Replay') : `Player ${String(player[0]).slice(0, 4)}`,
      x,
      y,
      hp: Math.max(0, Number(player[3]) || 0),
      maxHp: Math.max(1, Number(player[17]) || 100),
      alive: Boolean(player[4]),
      score: Math.max(0, Number(player[8]) || 0),
      kills: Math.max(0, Number(player[7]) || 0),
      weaponKey: player[5] || 'pistol',
      weaponLabel: player[5] || 'pistol',
      ammo: null,
      aimX,
      aimY,
      shooting: false,
      damageMul: 1,
      fireRateMul: 1,
      moveSpeedMul: 1,
      pickupRadius: 0,
      hpRegenPerSec: 0,
      moveSpeed: 0,
      shotDamage: 1,
      shotIntervalMs: 170,
      playerClass: player[6] || 'cyber',
      netQuality: 0,
      netPingMs: 0,
      slowUntil: 0,
      dodgeCooldownMs: 0,
      dodgeCharges: Math.max(0, Number(player[10]) || 0),
      dodgeChargesMax: Math.max(1, Number(player[11]) || 1),
      dodgeRechargeMs: Math.max(0, Number(player[12]) || 0),
      dodgeRechargeTotalMs: Math.max(1, Number(player[13]) || 1200),
      dodgeInvulnUntil: 0,
      level,
      xp: Math.max(0, Math.floor(Number(player[15]) || 0)),
      xpToNext,
      pendingSkillChoices: [],
      enemyKills: Math.max(0, Number(player[7]) || 0),
      bossKills: Math.max(0, Math.floor(Number(player[18]) || 0)),
      skills,
    });
  }

  for (const companion of Array.isArray(current.c) ? current.c : []) {
    const nextCompanion = nextCompanions.get(companion[0]) || companion;
    playerList.push({
      id: companion[0],
      name: '',
      x: lerp(companion[1], nextCompanion[1], alpha),
      y: lerp(companion[2], nextCompanion[2], alpha),
      hp: 1,
      maxHp: 1,
      alive: true,
      score: 0,
      kills: 0,
      weaponKey: companion[3] || 'pistol',
      weaponLabel: companion[3] || 'pistol',
      ammo: null,
      aimX: lerp(companion[1], nextCompanion[1], alpha) + 10,
      aimY: lerp(companion[2], nextCompanion[2], alpha),
      shooting: false,
      damageMul: 1,
      fireRateMul: 1,
      moveSpeedMul: 1,
      pickupRadius: 0,
      hpRegenPerSec: 0,
      moveSpeed: 0,
      shotDamage: 1,
      shotIntervalMs: 170,
      playerClass: payload?.playerClass || 'cyber',
      netQuality: 0,
      netPingMs: 0,
      slowUntil: 0,
      dodgeCooldownMs: 0,
      dodgeCharges: 0,
      dodgeChargesMax: 0,
      dodgeRechargeMs: 0,
      dodgeRechargeTotalMs: 1200,
      dodgeInvulnUntil: 0,
      level: 1,
      xp: 0,
      xpToNext: 1,
      pendingSkillChoices: [],
      skills: [],
      isCompanion: true,
      ownerId: companion[4] || '',
    });
  }

  const enemies = (Array.isArray(current.e) ? current.e : []).map((enemy) => {
    const nextEnemy = nextEnemies.get(enemy[0]) || enemy;
    return {
      id: enemy[0],
      type: enemy[1] || 'normal',
      x: lerp(enemy[2], nextEnemy[2], alpha),
      y: lerp(enemy[3], nextEnemy[3], alpha),
      hp: Math.max(0, Number(enemy[4]) || 0),
      maxHp: Math.max(1, Number(enemy[5]) || 1),
      radius: Math.max(18, Number(enemy[6]) || 18),
      spriteScale: enemy[1] === 'boss' ? 1.8 : 1,
    };
  });

  const bullets = interpolateReplayBullets(
    current.b,
    next?.b,
    alpha,
    Number(current?.t || 0),
    Number(next?.t || current?.t || 0),
    current.e,
    next?.e,
    current.p,
    next?.p,
  );

  const drops = (Array.isArray(current.d) ? current.d : []).map((drop, index) => {
    const kind = drop[3] || 'weapon';
    const weaponKey = drop[2] || 'pistol';
    return {
      id: `rd-${index}`,
      x: Number(drop[0]) || 0,
      y: Number(drop[1]) || 0,
      kind,
      weaponKey: kind === 'xp_vacuum' ? null : weaponKey,
      weaponLabel: kind === 'xp_vacuum' ? 'XP Surge' : weaponKey,
      ttlMs: 999999,
      ttlMaxMs: 999999,
    };
  });

  const xpOrbs = (Array.isArray(current.x) ? current.x : []).map((orb, index) => ({
    id: `rx-${index}`,
    x: Number(orb[0]) || 0,
    y: Number(orb[1]) || 0,
    xp: Math.max(1, Number(orb[2]) || 1),
    ttlMs: 999999,
    ttlMaxMs: 999999,
  }));

  const bossPortals = (Array.isArray(current.bp) ? current.bp : []).map((portal, index) => ({
    id: `rp-${index}`,
    x: Number(portal[0]) || 0,
    y: Number(portal[1]) || 0,
    spawnAt: nowMs + Math.max(0, Number(portal[2]) || 0),
    ttlMs: Math.max(0, Number(portal[2]) || 0),
  }));

  return {
    replayFrameIndex: index,
    now: nowMs,
    roomCode: payload?.roomCode || 'REPLAY',
    roomStartedAt: Number(payload?.roomStartedAt || payload?.startedAt || nowMs),
    totalEnemyKills: Math.max(0, Number(current.te) || 0),
    nextBossAtKills: Math.max(50, Math.max(0, Number(current.te) || 0) + 25),
    bossAlive: Boolean(current.ba),
    nextBossSpawnAt: 0,
    roomDifficulty: {
      level: 1 + Math.floor(Math.max(0, Number(elapsedMs) || 0) / 60000),
      hpMul: 1,
      speedMul: 1,
      damageMul: 1,
      attackRateMul: 1,
      spawnIntervalMs: Number(payload?.captureIntervalMs) || 200,
    },
    world: payload?.world || { width: 2400, height: 1400 },
    sync: { tickRate: 45, stateSendHz: 30, netRenderDelayMs: 0 },
    players: playerList,
    bullets,
    enemies,
    bossPortals,
    drops,
    xpOrbs,
    decor: { trees: Array.isArray(payload?.decor?.trees) ? payload.decor.trees : [] },
  };
}

function stopReplayGame({ showMenu = true } = {}) {
  replayGame.active = false;
  replayGame.recordId = 0;
  replayGame.payload = null;
  replayGame.playing = true;
  replayGame.startedAt = 0;
  replayGame.elapsedMs = 0;
  replayGame.fxFrameIndex = -1;
  replayGame.seeking = false;
  if (replayGameControlsEl) replayGameControlsEl.classList.add('hidden');
  if (replayGameMetaEl) replayGameMetaEl.textContent = 'Replay';
  if (replayGameProgressEl) replayGameProgressEl.value = '0';
  updateReplayGameButtons();
  if (showMenu) {
    clearLocalSessionState();
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
  }
  document.body.classList.remove('replay-game-active');
}

function tickReplayGame(ts) {
  if (!replayGame.active || !replayGame.payload) return;
  if (replayGame.playing) {
    if (!replayGame.startedAt) replayGame.startedAt = ts - (replayGame.elapsedMs / replayGame.speed);
    const totalMs = getReplayDurationMs(replayGame.payload);
    replayGame.elapsedMs = Math.max(0, (ts - replayGame.startedAt) * replayGame.speed);
    if (replayGame.elapsedMs >= totalMs) {
      replayGame.elapsedMs = totalMs;
      replayGame.playing = false;
      updateReplayGameButtons();
    }
  }
  const totalMs = getReplayDurationMs(replayGame.payload);
  const nextState = buildReplayState(replayGame.payload, replayGame.elapsedMs);
  if (nextState) {
    if (nextState.replayFrameIndex !== replayGame.fxFrameIndex) {
      processStateFx(nextState);
      replayGame.fxFrameIndex = nextState.replayFrameIndex;
    }
    game.state = nextState;
    game.world = nextState.world;
    game.roomCode = nextState.roomCode;
    game.roomStartedAt = nextState.roomStartedAt;
    game.totalEnemyKills = nextState.totalEnemyKills;
    game.nextBossAtKills = nextState.nextBossAtKills;
    game.nextBossSpawnAt = nextState.nextBossSpawnAt;
    game.bossAlive = nextState.bossAlive;
    game.roomDifficulty = nextState.roomDifficulty;
    game.sortedTrees = Array.isArray(nextState.decor?.trees) ? nextState.decor.trees.slice().sort((a, b) => a.y - b.y) : [];
    updateScoreboard(nextState.players || []);
    updateStatsPanel((nextState.players || []).find((p) => p.id === game.myId) || (nextState.players || [])[0] || null);
    updateJumpButtonUi((nextState.players || []).find((p) => p.id === game.myId) || null);
    roomMetaEl.textContent = `Replay: ${nextState.roomCode}`;
    weaponMetaEl.textContent = 'Replay mode';
    if (movementMetaEl) movementMetaEl.textContent = 'Controls disabled';
  }
  if (replayGameMetaEl) {
    replayGameMetaEl.textContent = `Replay ${formatReplayClock(replayGame.elapsedMs)} / ${formatReplayClock(totalMs)} | x${replayGame.speed}`;
  }
  if (replayGameProgressEl && !replayGame.seeking) {
    const value = totalMs > 0 ? Math.round((replayGame.elapsedMs / totalMs) * 1000) : 0;
    replayGameProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
}

function startReplayGame(payload, record) {
  if (!payload || !Array.isArray(payload.frames) || payload.frames.length <= 0) return false;
  if (game.myId || game.connected) leaveActiveRoom();
  clearLocalSessionState();
  closeRecordDetailsModal();
  replayGame.active = true;
  replayGame.recordId = Math.max(0, Number(record?.id) || 0);
  replayGame.payload = payload;
  replayGame.playing = true;
  replayGame.startedAt = 0;
  replayGame.elapsedMs = 0;
  replayGame.fxFrameIndex = -1;
  game.connected = false;
  game.myId = payload.playerId || 'replay-player';
  game.roomCode = payload.roomCode || 'REPLAY';
  visuals.enemyPrev = new Map();
  visuals.playerPrev = new Map();
  visuals.rocketPrev = new Map();
  visuals.bulletIds = new Set();
  visuals.blood = [];
  visuals.bloodPuddles = [];
  visuals.gore = [];
  visuals.hitFx = [];
  visuals.muzzle = [];
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  joinOverlay.style.display = 'none';
  document.body.classList.add('replay-game-active');
  if (replayGameControlsEl) replayGameControlsEl.classList.remove('hidden');
  if (replayGameProgressEl) replayGameProgressEl.value = '0';
  updateReplayGameSpeed(replayGame.speed || 1);
  updateReplayGameButtons();
  updateMobileControlsVisibility();
  tickReplayGame(performance.now());
  return true;
}

function startReplayGameAt(payload, record, startSec = 0) {
  const started = startReplayGame(payload, record);
  if (!started) return false;
  const atMs = Math.max(0, Math.round((Number(startSec) || 0) * 1000));
  if (atMs > 0) {
    replayGame.playing = false;
    seekReplayGame(atMs, { keepPaused: true });
  }
  return true;
}

async function maybeStartReplayFromUrl() {
  const recordId = Math.max(0, Number(pendingReplayRecordId) || 0);
  const startSec = Math.max(0, Number(pendingReplayStartSec) || 0);
  if (recordId <= 0) return;
  pendingReplayRecordId = 0;
  pendingReplayStartSec = 0;
  try {
    statusEl.textContent = 'Loading replay...';
    showReplayLoadOverlay(`Loading replay #${recordId}`, 'Preparing replay data...');
    const payload = await fetchReplayPayloadByRecordId(recordId, {
      onProgress(info) {
        const text = describeReplayLoadProgress(info);
        updateReplayLoadOverlay(info);
        statusEl.textContent = `Loading replay... ${text}`;
      },
    });
    const replay = payload?.replay || null;
    const record = payload?.record || { id: recordId };
    if (!replay || !Array.isArray(replay.frames) || replay.frames.length <= 0) {
      throw new Error('Replay not found.');
    }
    startReplayGameAt(replay, record, startSec);
    statusEl.textContent = `Replay loaded: ${record?.name || 'Record'} #${recordId}${startSec > 0 ? ` from ${startSec}s` : ''}`;
  } catch (err) {
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
    statusEl.textContent = err?.message || 'Failed to load replay.';
  } finally {
    hideReplayLoadOverlay();
  }
}

function drawRecordReplay() {
  if (!recordReplayCanvasEl) return;
  const sized = resizeRecordReplayCanvas();
  if (!sized) return;
  const replayCtx = sized.ctx;
  const width = sized.width;
  const height = sized.height;
  replayCtx.clearRect(0, 0, width, height);
  replayCtx.fillStyle = '#08131d';
  replayCtx.fillRect(0, 0, width, height);

  const payload = recordReplay.payload;
  const frames = Array.isArray(payload?.frames) ? payload.frames : [];
  const world = payload?.world || { width: 2400, height: 1400 };
  const worldW = Math.max(1, Number(world.width) || 2400);
  const worldH = Math.max(1, Number(world.height) || 1400);
  const scale = Math.min(width / worldW, height / worldH);
  const offsetX = (width - worldW * scale) * 0.5;
  const offsetY = (height - worldH * scale) * 0.5;
  const toScreenX = (x) => offsetX + (Number(x) || 0) * scale;
  const toScreenY = (y) => offsetY + (Number(y) || 0) * scale;

  replayCtx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  replayCtx.lineWidth = 1;
  const gridStep = 240;
  for (let x = 0; x <= worldW; x += gridStep) {
    const sx = toScreenX(x);
    replayCtx.beginPath();
    replayCtx.moveTo(sx, offsetY);
    replayCtx.lineTo(sx, offsetY + worldH * scale);
    replayCtx.stroke();
  }
  for (let y = 0; y <= worldH; y += gridStep) {
    const sy = toScreenY(y);
    replayCtx.beginPath();
    replayCtx.moveTo(offsetX, sy);
    replayCtx.lineTo(offsetX + worldW * scale, sy);
    replayCtx.stroke();
  }

  const { current, next, alpha } = pickReplayFramePair(frames, recordReplay.elapsedMs);
  if (!current) {
    replayCtx.fillStyle = '#94a3b8';
    replayCtx.font = '14px Segoe UI';
    replayCtx.fillText('Replay has no frames.', 18, 24);
    return;
  }

  const nextPlayers = frameEntityMap(next?.p);
  const nextEnemies = frameEntityMap(next?.e);
  const nextCompanions = frameEntityMap(next?.c);
  const previewBullets = interpolateReplayBullets(
    current.b,
    next?.b,
    alpha,
    Number(current?.t || 0),
    Number(next?.t || current?.t || 0),
    current.e,
    next?.e,
    current.p,
    next?.p,
  );

  for (const portal of Array.isArray(current.bp) ? current.bp : []) {
    const sx = toScreenX(portal[0]);
    const sy = toScreenY(portal[1]);
    replayCtx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 16, 0, Math.PI * 2);
    replayCtx.fill();
    replayCtx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    replayCtx.stroke();
  }

  for (const drop of Array.isArray(current.d) ? current.d : []) {
    const sx = toScreenX(drop[0]);
    const sy = toScreenY(drop[1]);
    replayCtx.fillStyle = '#f59e0b';
    replayCtx.fillRect(sx - 4, sy - 4, 8, 8);
  }

  for (const orb of Array.isArray(current.x) ? current.x : []) {
    const sx = toScreenX(orb[0]);
    const sy = toScreenY(orb[1]);
    replayCtx.fillStyle = '#60a5fa';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const bullet of previewBullets) {
    const sx = toScreenX(bullet.x);
    const sy = toScreenY(bullet.y);
    replayCtx.fillStyle = bullet.fromEnemy ? '#fb7185' : (bullet.kind === 'rocket' ? '#f59e0b' : '#f8fafc');
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, bullet.kind === 'rocket' ? 4 : 2.2, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const enemy of Array.isArray(current.e) ? current.e : []) {
    const nextEnemy = nextEnemies.get(enemy[0]) || enemy;
    const sx = toScreenX(lerp(enemy[2], nextEnemy[2], alpha));
    const sy = toScreenY(lerp(enemy[3], nextEnemy[3], alpha));
    const radius = Math.max(5, (Number(enemy[6]) || 18) * scale * 0.55);
    replayCtx.fillStyle = enemy[1] === 'boss' ? '#dc2626' : (enemy[1] === 'ranged' ? '#fb7185' : (enemy[1] === 'charger' ? '#f97316' : '#ef4444'));
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, radius, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const companion of Array.isArray(current.c) ? current.c : []) {
    const nextCompanion = nextCompanions.get(companion[0]) || companion;
    const sx = toScreenX(lerp(companion[1], nextCompanion[1], alpha));
    const sy = toScreenY(lerp(companion[2], nextCompanion[2], alpha));
    replayCtx.fillStyle = '#22c55e';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, 5.5, 0, Math.PI * 2);
    replayCtx.fill();
  }

  for (const player of Array.isArray(current.p) ? current.p : []) {
    const nextPlayer = nextPlayers.get(player[0]) || player;
    const sx = toScreenX(lerp(player[1], nextPlayer[1], alpha));
    const sy = toScreenY(lerp(player[2], nextPlayer[2], alpha));
    const isTracked = player[0] === payload?.playerId;
    replayCtx.fillStyle = isTracked ? '#22d3ee' : '#e2e8f0';
    replayCtx.beginPath();
    replayCtx.arc(sx, sy, isTracked ? 8 : 6, 0, Math.PI * 2);
    replayCtx.fill();
    if (!player[4]) {
      replayCtx.strokeStyle = 'rgba(248, 113, 113, 0.95)';
      replayCtx.lineWidth = 2;
      replayCtx.beginPath();
      replayCtx.moveTo(sx - 7, sy - 7);
      replayCtx.lineTo(sx + 7, sy + 7);
      replayCtx.moveTo(sx + 7, sy - 7);
      replayCtx.lineTo(sx - 7, sy + 7);
      replayCtx.stroke();
    }
  }

  replayCtx.fillStyle = '#e2e8f0';
  replayCtx.font = '12px Segoe UI';
  replayCtx.fillText(`Time ${formatReplayClock(recordReplay.elapsedMs)}`, 14, 20);
  replayCtx.fillText(`Kills ${Math.max(0, Number(current.te) || 0)} | Bosses ${Math.max(0, Number(current.tb) || 0)}`, 14, 38);
  if (payload?.truncated) replayCtx.fillText('Truncated', width - 72, 20);
}

function tickRecordReplayFrame(ts) {
  if (!recordReplay.playing || !recordReplay.payload) return;
  if (!recordReplay.startedAt) recordReplay.startedAt = ts - (recordReplay.elapsedMs / recordReplay.speed);
  const totalMs = getReplayDurationMs(recordReplay.payload);
  recordReplay.elapsedMs = Math.max(0, (ts - recordReplay.startedAt) * recordReplay.speed);
  if (recordReplay.elapsedMs >= totalMs) {
    recordReplay.elapsedMs = totalMs;
    stopRecordReplayPlayback(false);
  }
  drawRecordReplay();
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
  }
  if (recordReplayProgressEl && !recordReplay.seeking) {
    const value = totalMs > 0 ? Math.round((recordReplay.elapsedMs / totalMs) * 1000) : 0;
    recordReplayProgressEl.value = String(Math.max(0, Math.min(1000, value)));
  }
  if (recordReplay.playing) {
    recordReplay.rafId = requestAnimationFrame(tickRecordReplayFrame);
  }
}

function startRecordReplayPlayback() {
  if (!recordReplay.payload) return;
  if (recordReplay.elapsedMs >= getReplayDurationMs(recordReplay.payload)) {
    recordReplay.elapsedMs = 0;
  }
  recordReplay.playing = true;
  recordReplay.startedAt = 0;
  if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Pause Replay';
  updateRecordReplayButtons();
  recordReplay.rafId = requestAnimationFrame(tickRecordReplayFrame);
}

function resetRecordReplayUi(recordId = 0) {
  stopRecordReplayPlayback(true);
  recordReplay.recordId = Math.max(0, Number(recordId) || 0);
  recordReplay.record = null;
  recordReplay.loading = false;
  recordReplay.loaded = false;
  recordReplay.payload = null;
  recordReplay.startedAt = 0;
  recordReplay.seeking = false;
  if (recordReplayPanelEl) recordReplayPanelEl.classList.toggle('hidden', recordReplay.recordId <= 0);
  if (recordReplaySpeedsEl) recordReplaySpeedsEl.classList.add('hidden');
  if (recordReplayControlsEl) recordReplayControlsEl.classList.add('hidden');
  if (recordReplayProgressEl) recordReplayProgressEl.value = '0';
  if (recordReplayMetaEl) {
    recordReplayMetaEl.textContent = recordReplay.recordId > 0
      ? 'Replay is available on demand.'
      : 'Replay is unavailable for this record.';
  }
  drawRecordReplay();
  setRecordReplaySpeed(1);
  updateRecordReplayButtons();
  updateRecordReplayStageButton();
}

async function loadRecordReplay(recordId, options = {}) {
  const id = Math.max(0, Number(recordId) || 0);
  if (id <= 0) return false;
  const autoPlay = options?.autoPlay === true;
  recordReplay.loading = true;
  if (recordReplayPlayBtn) {
    recordReplayPlayBtn.disabled = true;
    recordReplayPlayBtn.textContent = 'Loading...';
  }
  if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Loading replay data...';
  showReplayLoadOverlay(`Loading replay #${id}`, 'Preparing replay data...');
  updateRecordReplayStageButton();
  try {
    const payload = await fetchReplayPayloadByRecordId(id, {
      replayApiPath: recordReplay.record?.replayApiPath || '',
      onProgress(info) {
        const text = describeReplayLoadProgress(info);
        updateReplayLoadOverlay(info);
        if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Loading replay data... ${text}`;
      },
    });
    recordReplay.payload = payload?.replay || null;
    recordReplay.loaded = Boolean(recordReplay.payload && Array.isArray(recordReplay.payload.frames) && recordReplay.payload.frames.length > 0);
    recordReplay.elapsedMs = 0;
    drawRecordReplay();
    if (!recordReplay.loaded) throw new Error('empty replay');
    if (recordReplaySpeedsEl) recordReplaySpeedsEl.classList.remove('hidden');
    if (recordReplayControlsEl) recordReplayControlsEl.classList.remove('hidden');
    if (recordReplayProgressEl) recordReplayProgressEl.value = '0';
    const totalMs = getReplayDurationMs(recordReplay.payload);
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Replay loaded. ${formatReplayClock(totalMs)} total | speed x${recordReplay.speed}`;
    if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Play Replay';
    updateRecordReplayButtons();
    updateRecordReplayStageButton();
    if (autoPlay) startRecordReplayPlayback();
    return true;
  } catch {
    recordReplay.payload = null;
    recordReplay.loaded = false;
    if (recordReplayControlsEl) recordReplayControlsEl.classList.add('hidden');
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Replay is not available for this record.';
    if (recordReplayPlayBtn) recordReplayPlayBtn.textContent = 'Replay Unavailable';
    updateRecordReplayButtons();
    updateRecordReplayStageButton();
    return false;
  } finally {
    recordReplay.loading = false;
    hideReplayLoadOverlay();
    if (recordReplayPlayBtn) recordReplayPlayBtn.disabled = false;
    updateRecordReplayStageButton();
  }
}

async function fetchReplayPayloadByRecordId(recordId, options = {}) {
  const id = Math.max(0, Number(recordId) || 0);
  if (id <= 0) return null;
  const onProgress = typeof options?.onProgress === 'function' ? options.onProgress : null;
  const replayApiPath = String(options?.replayApiPath || '').trim();
  const replayUrl = replayApiPath || (`/api/records/${id}/replay`);
  const res = await fetch(replayUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Math.max(0, Number(res.headers.get('content-length')) || 0);
  if (!res.body || typeof res.body.getReader !== 'function') {
    onProgress?.({ received: total, total, done: true });
    return res.json();
  }

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  onProgress?.({ received, total, done: false });
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value?.length) {
      chunks.push(value);
      received += value.length;
      onProgress?.({ received, total, done: false });
    }
  }
  onProgress?.({ received: total > 0 ? total : received, total, done: true });

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

async function copyReplayLink(recordId) {
  const id = Math.max(0, Number(recordId) || 0);
  if (id <= 0 || !navigator.clipboard?.writeText) {
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Replay link is unavailable.';
    return false;
  }
  const startSec = Math.max(0, Math.floor((Number(recordReplay.elapsedMs) || 0) / 1000));
  try {
    await navigator.clipboard.writeText(buildReplayShareUrl(id, startSec));
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = `Replay link copied${startSec > 0 ? ` from ${startSec}s` : ''}.`;
    return true;
  } catch {
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Failed to copy replay link.';
    return false;
  }
}

function closeRecordDetailsModal() {
  if (!recordDetailsModalEl) return;
  resetRecordReplayUi(0);
  recordDetailsModalEl.classList.add('hidden');
}

function formatRecordDateTime(ts) {
  const value = Math.max(0, Number(ts) || 0);
  if (value <= 0) return '--';
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

function renderRunDetailsHtml(details) {
  if (!details || typeof details !== 'object') {
    return '<div class="record-details-empty">No detailed run stats for this record.</div>';
  }

  const shotIntervalMs = Math.max(1, Number(details.shotIntervalMs) || 1);
  const fireRate = (1000 / shotIntervalMs).toFixed(2);
  const list = [
    ['Character', details.playerClass || '--'],
    ['Level', Math.max(1, Number(details.level) || 1)],
    ['Monsters killed', Math.max(0, Number(details.enemyKills) || 0)],
    ['Bosses killed', Math.max(0, Number(details.bossKills) || 0)],
    ['XP', `${Math.max(0, Number(details.xp) || 0)} / ${Math.max(1, Number(details.xpToNext) || 1)}`],
    ['HP', `${Math.max(0, Number(details.hp) || 0)} / ${Math.max(1, Number(details.maxHp) || 1)}`],
    ['Weapon', details.weaponLabel || details.weaponKey || '--'],
    ['Damage / shot', Math.max(1, Number(details.shotDamage) || 1)],
    ['Fire rate', `${fireRate} shots/s`],
    ['Move speed', Math.max(0, Math.round(Number(details.moveSpeed) || 0))],
    ['Pickup radius', Math.max(0, Math.round(Number(details.pickupRadius) || 0))],
    ['HP regen', `${Math.max(0, Number(details.hpRegenPerSec) || 0).toFixed(2)}/s`],
    ['Jump charges', Math.max(1, Number(details.dodgeChargesMax) || 1)],
    ['Damage multiplier', `x${Math.max(0.1, Number(details.damageMul) || 1).toFixed(2)}`],
    ['Fire-rate multiplier', `x${Math.max(0.1, Number(details.fireRateMul) || 1).toFixed(2)}`],
    ['Speed multiplier', `x${Math.max(0.1, Number(details.moveSpeedMul) || 1).toFixed(2)}`],
    ['Room kills at death', Math.max(0, Number(details.totalEnemyKills) || 0)],
    ['Bosses killed in room', Math.max(0, Number(details.totalBossKills) || 0)],
    ['Survived', `${Math.max(1, Number(details.survivedSec) || 1)}s`],
  ];

  const rows = list.map(([k, v]) => `<div class="rd-row"><span>${k}</span><b>${v}</b></div>`).join('');
  const skills = Array.isArray(details.skills) ? details.skills : [];
  const skillsHtml = skills.length
    ? `<div class="rd-skills">${skills.map((s) => `<span class="rd-skill">${s.name || s.id} Lv${Math.max(1, Number(s.level) || 1)}</span>`).join('')}</div>`
    : '<div class="record-details-empty">No skills picked.</div>';

  return `<div class="rd-grid">${rows}</div><div class="rd-subtitle">Skills</div>${skillsHtml}`;
}

function openRecordDetailsModal(record, rankLabel) {
  if (!recordDetailsModalEl || !recordDetailsTitleEl || !recordDetailsBodyEl) return;
  const name = record?.name || 'Unknown';
  const kills = Number(record?.kills) || 0;
  const score = Number(record?.score) || 0;
  const durationSec = Number(record?.durationSec) || 0;
  const roomCode = (record?.roomCode || '-').toString();
  const playedAt = formatRecordDateTime(record?.at);

  recordDetailsTitleEl.textContent = `${rankLabel} ${name} | ${kills} kills | ${score} pts`;
  const summary = `<div class="rd-summary">${playedAt} | Room ${roomCode} | ${durationSec}s</div>`;
  recordDetailsBodyEl.innerHTML = summary + renderRunDetailsHtml(record?.runDetails || null);
  resetRecordReplayUi(record?.id);
  recordReplay.record = record || null;
  if (recordReplayCopyLinkBtn) {
    const isHistoryReplay = !!String(record?.replayApiPath || '').trim();
    recordReplayCopyLinkBtn.disabled = isHistoryReplay;
    recordReplayCopyLinkBtn.title = isHistoryReplay ? 'Share link is available only for Top records replays.' : '';
  }
  recordDetailsModalEl.classList.remove('hidden');
}

function renderRecordsList(items, page = 1, totalPages = 1, total = 0) {
  if (!recordsListEl) return;
  recordsUi.page = page;
  recordsUi.totalPages = totalPages;
  recordsUi.total = total;
  updateRecordsPager();

  if (!items.length) {
    recordsListEl.textContent = 'No records yet.';
    return;
  }

  const rankOffset = (recordsUi.page - 1) * recordsUi.pageSize;
  recordsListEl.innerHTML = '';
  for (let i = 0; i < items.length; i += 1) {
    const r = items[i];
    const rankNumber = rankOffset + i + 1;
    const rankLabel = `#${rankNumber}`;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'record-row';

    const rank = document.createElement('div');
    rank.className = 'record-rank';
    rank.textContent = rankLabel;

    const name = document.createElement('div');
    name.className = 'record-name';
    const attempts = Math.max(1, Number(r.attempts) || 1);
    name.textContent = (r.name || 'Unknown') + ' [' + attempts + ']';

    const kills = Number(r.kills) || 0;
    const score = Number(r.score) || 0;

    const meta = document.createElement('div');
    meta.className = 'record-meta';
    meta.textContent = `${kills} kills / ${score} pts`;

    row.addEventListener('click', () => {
      openRecordDetailsModal(r, rankLabel);
    });

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(meta);
    recordsListEl.appendChild(row);
  }
}

recordDetailsCloseBtn?.addEventListener('click', () => {
  closeRecordDetailsModal();
});

recordDetailsModalEl?.addEventListener('click', (e) => {
  if (e.target === recordDetailsModalEl) closeRecordDetailsModal();
});
recordReplayPlayBtn?.addEventListener('click', async () => {
  if (recordReplay.loading) return;
  if (!recordReplay.loaded) {
    await loadRecordReplay(recordReplay.recordId, { autoPlay: true });
    return;
  }
  if (recordReplay.playing) {
    stopRecordReplayPlayback(false);
    drawRecordReplay();
    if (recordReplayMetaEl) {
      const totalMs = getReplayDurationMs(recordReplay.payload);
      recordReplayMetaEl.textContent = `${formatReplayClock(recordReplay.elapsedMs)} / ${formatReplayClock(totalMs)} | speed x${recordReplay.speed}`;
    }
    return;
  }
  startRecordReplayPlayback();
});
recordReplayInGameBtn?.addEventListener('click', async () => {
  if (recordReplay.loading) return;
  if (!recordReplay.loaded) {
    const ok = await loadRecordReplay(recordReplay.recordId);
    if (!ok) return;
  }
  startReplayGame(recordReplay.payload, recordReplay.record);
});
recordReplayCopyLinkBtn?.addEventListener('click', async () => {
  if (String(recordReplay.record?.replayApiPath || '').trim()) {
    if (recordReplayMetaEl) recordReplayMetaEl.textContent = 'Share link is available only for Top records replays.';
    return;
  }
  await copyReplayLink(recordReplay.recordId);
});
recordReplayStageLoadBtn?.addEventListener('click', async () => {
  if (recordReplay.loading || recordReplay.loaded) return;
  await loadRecordReplay(recordReplay.recordId, { autoPlay: true });
});
recordReplaySpeedsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-replay-speed]');
  if (!btn) return;
  const nextSpeed = Math.max(1, Number(btn.dataset.replaySpeed) || 1);
  const prevElapsed = recordReplay.elapsedMs;
  setRecordReplaySpeed(nextSpeed);
  if (recordReplay.playing) {
    const nowTs = performance.now();
    recordReplay.startedAt = nowTs - (prevElapsed / nextSpeed);
  } else {
    drawRecordReplay();
  }
});
recordReplayStartBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(0, { keepPaused: true });
});
recordReplayBackBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(recordReplay.elapsedMs - 5000, { keepPaused: true });
});
recordReplayToggleBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = !recordReplay.playing;
  recordReplay.startedAt = performance.now() - (recordReplay.elapsedMs / Math.max(1, recordReplay.speed || 1));
  updateRecordReplayButtons();
  if (recordReplay.playing) tickRecordReplayFrame(performance.now());
});
recordReplayForwardBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(recordReplay.elapsedMs + 5000, { keepPaused: true });
});
recordReplayEndBtn?.addEventListener('click', () => {
  if (!recordReplay.payload) return;
  recordReplay.playing = false;
  seekRecordReplay(getReplayDurationMs(recordReplay.payload), { keepPaused: true });
});
recordReplayProgressEl?.addEventListener('input', () => {
  if (!recordReplay.payload) return;
  recordReplay.seeking = true;
  const totalMs = getReplayDurationMs(recordReplay.payload);
  const ratio = Math.max(0, Math.min(1, (Number(recordReplayProgressEl.value) || 0) / 1000));
  recordReplay.playing = false;
  seekRecordReplay(totalMs * ratio, { keepPaused: true });
});
recordReplayProgressEl?.addEventListener('change', () => {
  recordReplay.seeking = false;
});
replayGameExitBtn?.addEventListener('click', () => {
  stopReplayGame({ showMenu: true });
});
replayGameStartBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(0, { keepPaused: true });
});
replayGameBackBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(replayGame.elapsedMs - 5000, { keepPaused: true });
});
replayGameToggleBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = !replayGame.playing;
  replayGame.startedAt = performance.now() - (replayGame.elapsedMs / Math.max(1, replayGame.speed || 1));
  updateReplayGameButtons();
  tickReplayGame(performance.now());
});
replayGameForwardBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(replayGame.elapsedMs + 5000, { keepPaused: true });
});
replayGameEndBtn?.addEventListener('click', () => {
  if (!replayGame.payload) return;
  replayGame.playing = false;
  seekReplayGame(getReplayDurationMs(replayGame.payload), { keepPaused: true });
});
replayGameSpeedsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-replay-game-speed]');
  if (!btn) return;
  const nextSpeed = Math.max(1, Number(btn.dataset.replayGameSpeed) || 1);
  const prevElapsed = replayGame.elapsedMs;
  updateReplayGameSpeed(nextSpeed);
  if (replayGame.active) {
    replayGame.startedAt = performance.now() - (prevElapsed / nextSpeed);
    tickReplayGame(performance.now());
  }
});
replayGameProgressEl?.addEventListener('input', () => {
  if (!replayGame.payload) return;
  replayGame.seeking = true;
  const totalMs = getReplayDurationMs(replayGame.payload);
  const ratio = Math.max(0, Math.min(1, (Number(replayGameProgressEl.value) || 0) / 1000));
  replayGame.playing = false;
  seekReplayGame(totalMs * ratio, { keepPaused: true });
});
replayGameProgressEl?.addEventListener('change', () => {
  replayGame.seeking = false;
});
window.addEventListener('resize', () => {
  if (!recordReplayPanelEl || recordReplayPanelEl.classList.contains('hidden')) return;
  drawRecordReplay();
});
async function requestRecordsList(page = recordsUi.page) {
  if (!recordsListEl) return;
  try {
    const params = new URLSearchParams({
      page: String(Math.max(1, page)),
      page_size: String(recordsUi.pageSize),
    });
    const res = await fetch(`/api/records?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    renderRecordsList(
      Array.isArray(payload.records) ? payload.records : [],
      Number(payload.page) || 1,
      Number(payload.totalPages) || 1,
      Number(payload.total) || 0,
    );
  } catch {
    recordsUi.total = 0;
    updateRecordsPager();
    recordsListEl.textContent = 'Failed to load records.';
  }
}
function updatePlayerInterpolation(dt) {
  if (!game.state) return;
  const liveMap = mapById(game.state.players);
  const targetMap = game.sampledNet?.players ? new Map(game.sampledNet.players) : new Map(liveMap);
  if (game.myId && liveMap.has(game.myId)) {
    targetMap.set(game.myId, liveMap.get(game.myId));
  }
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt);
  const alive = new Set();

  for (const [id, p] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderPlayers.get(id);
    if (!r) {
      r = { x: p.x, y: p.y, vx: 0, vy: 0 };
      game.renderPlayers.set(id, r);
      continue;
    }

    const nx = r.x + (p.x - r.x) * alpha;
    const ny = r.y + (p.y - r.y) * alpha;
    r.vx = (nx - r.x) / Math.max(0.001, dt);
    r.vy = (ny - r.y) / Math.max(0.001, dt);
    r.x = nx;
    r.y = ny;
  }

  for (const id of Array.from(game.renderPlayers.keys())) {
    if (!alive.has(id)) game.renderPlayers.delete(id);
  }
}

function getPlayerRenderPos(player) {
  return game.renderPlayers.get(player.id) || player;
}

function updateEnemyInterpolation(dt) {
  if (!game.state) return;
  const targetMap = game.sampledNet?.enemies || mapById(game.state.enemies);
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt);
  const alive = new Set();

  for (const [id, e] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderEnemies.get(id);
    if (!r) {
      r = { x: e.x, y: e.y, vx: 0, vy: 0 };
      game.renderEnemies.set(id, r);
      continue;
    }

    const nx = r.x + (e.x - r.x) * alpha;
    const ny = r.y + (e.y - r.y) * alpha;
    r.vx = (nx - r.x) / Math.max(0.001, dt);
    r.vy = (ny - r.y) / Math.max(0.001, dt);
    r.x = nx;
    r.y = ny;
  }

  for (const id of Array.from(game.renderEnemies.keys())) {
    if (!alive.has(id)) game.renderEnemies.delete(id);
  }
}

function syncBulletsFromState(nextState) {
  const alive = new Set();

  for (const b of nextState.bullets) {
    const id = b.id;
    if (!id) continue;
    alive.add(id);

    let r = game.renderBullets.get(id);
    if (!r) {
      r = {
        x: b.x,
        y: b.y,
        serverX: b.x,
        serverY: b.y,
        vx: b.vx || 0,
        vy: b.vy || 0,
        color: b.color,
        kind: b.kind || 'bullet',
        radius: b.radius || 3,
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = b.x;
    r.serverY = b.y;
    r.vx = (r.vx * 0.3) + ((b.vx || 0) * 0.7);
    r.vy = (r.vy * 0.3) + ((b.vy || 0) * 0.7);
    r.color = b.color;
    r.kind = b.kind || 'bullet';
    r.radius = b.radius || 3;
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
}

function updateBulletInterpolation(dt) {
  const targets = game.sampledNet?.bullets || mapById(game.state?.bullets || []);
  const alive = new Set();

  for (const [id, tb] of targets.entries()) {
    alive.add(id);

    let r = game.renderBullets.get(id);
    if (!r) {
      r = {
        x: tb.x,
        y: tb.y,
        serverX: tb.x,
        serverY: tb.y,
        vx: tb.vx || 0,
        vy: tb.vy || 0,
        color: tb.color,
        kind: tb.kind || 'bullet',
        radius: tb.radius || 3,
      };
      game.renderBullets.set(id, r);
      continue;
    }

    r.serverX = tb.x;
    r.serverY = tb.y;
    const isRocket = String(tb.kind || r.kind || '').toLowerCase() === 'rocket';
    const velBlend = isRocket ? 0.45 : 0.65;
    r.vx = (r.vx * (1 - velBlend)) + ((tb.vx || 0) * velBlend);
    r.vy = (r.vy * (1 - velBlend)) + ((tb.vy || 0) * velBlend);
    r.color = tb.color;
    r.kind = tb.kind || 'bullet';
    r.radius = tb.radius || 3;

    if (replayGame.active) {
      r.x = tb.x;
      r.y = tb.y;
      continue;
    }

    r.x += r.vx * dt;
    r.y += r.vy * dt;

    const dx = r.serverX - r.x;
    const dy = r.serverY - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      const speed = Math.hypot(r.vx, r.vy);
      const maxStep = Math.max(isRocket ? 5 : 8, speed * dt * (isRocket ? 1.05 : 1.4));
      const correction = Math.min(dist, maxStep);
      const corrRate = roomSync.bulletCorrectionRate * (isRocket ? 0.58 : 1);
      const k = (correction / dist) * Math.min(1, corrRate * dt);
      r.x += dx * k;
      r.y += dy * k;
    }
  }

  for (const id of Array.from(game.renderBullets.keys())) {
    if (!alive.has(id)) game.renderBullets.delete(id);
  }
}

function updateXpOrbInterpolation(dt) {
  if (!game.state) return;
  const targetMap = game.sampledNet?.xpOrbs || mapById(game.state.xpOrbs || []);
  const alpha = 1 - Math.exp(-roomSync.entityInterpRate * dt * 0.9);
  const alive = new Set();
  for (const [id, o] of targetMap.entries()) {
    alive.add(id);
    let r = game.renderXpOrbs.get(id);
    if (!r) {
      r = { x: o.x, y: o.y };
      game.renderXpOrbs.set(id, r);
      continue;
    }
    r.x += (o.x - r.x) * alpha;
    r.y += (o.y - r.y) * alpha;
  }
  for (const id of Array.from(game.renderXpOrbs.keys())) {
    if (!alive.has(id)) game.renderXpOrbs.delete(id);
  }
}
function getXpOrbRenderPos(orb) {
  return game.renderXpOrbs.get(orb.id) || orb;
}

function getEnemyRenderPos(enemy) {
  return game.renderEnemies.get(enemy.id) || enemy;
}

function getBulletRenderPos(bullet) {
  const id = bullet.id;
  return (id && game.renderBullets.get(id)) || bullet;
}
function pushNetSnapshot(state) {
  const snap = {
    t: performance.now(),
    players: state.players.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    enemies: state.enemies.map((e) => ({ id: e.id, x: e.x, y: e.y })),
    bullets: state.bullets.map((b) => ({
      id: b.id ?? `${b.x.toFixed(1)}:${b.y.toFixed(1)}`,
      x: b.x,
      y: b.y,
      vx: b.vx || 0,
      vy: b.vy || 0,
      color: b.color,
      kind: b.kind || 'bullet',
      radius: b.radius || 3,
    })),
    xpOrbs: state.xpOrbs.map((o) => ({ id: o.id, x: o.x, y: o.y })),
  };

  game.netSnapshots.push(snap);
  if (game.netSnapshots.length > 30) game.netSnapshots.shift();
}

function mapById(list) {
  const out = new Map();
  for (const item of list) out.set(item.id, item);
  return out;
}

function sampleBufferedState() {
  const snaps = game.netSnapshots;
  if (snaps.length === 0) return null;

  const target = performance.now() - roomSync.netRenderDelayMs;
  let a = snaps[0];
  let b = snaps[snaps.length - 1];

  for (let i = 0; i < snaps.length - 1; i += 1) {
    if (snaps[i].t <= target && target <= snaps[i + 1].t) {
      a = snaps[i];
      b = snaps[i + 1];
      break;
    }
  }

  if (target >= snaps[snaps.length - 1].t) {
    const latest = snaps[snaps.length - 1];
    const extraMs = Math.min(roomSync.maxExtrapolationMs, target - latest.t);
    const extraSec = Math.max(0, extraMs / 1000);

    const bullets = latest.bullets.map((x) => ({
      ...x,
      x: x.x + x.vx * extraSec,
      y: x.y + x.vy * extraSec,
    }));

    return {
      players: mapById(latest.players),
      enemies: mapById(latest.enemies),
      bullets: mapById(bullets),
      xpOrbs: mapById(latest.xpOrbs || []),
    };
  }

  const dt = Math.max(1, b.t - a.t);
  const k = Math.max(0, Math.min(1, (target - a.t) / dt));

  const lerpMap = (la, lb, withVel) => {
    const ma = mapById(la);
    const mb = mapById(lb);
    const ids = new Set([...ma.keys(), ...mb.keys()]);
    const out = new Map();

    for (const id of ids) {
      const pa = ma.get(id);
      const pb = mb.get(id);
      if (pa && pb) {
        out.set(id, {
          id,
          x: pa.x + (pb.x - pa.x) * k,
          y: pa.y + (pb.y - pa.y) * k,
          vx: withVel ? (pb.vx ?? pa.vx ?? 0) : 0,
          vy: withVel ? (pb.vy ?? pa.vy ?? 0) : 0,
          color: pb.color ?? pa.color,
          kind: pb.kind ?? pa.kind,
          radius: pb.radius ?? pa.radius,
        });
      } else {
        out.set(id, pb || pa);
      }
    }

    return out;
  };

  return {
    players: lerpMap(a.players, b.players, false),
    enemies: lerpMap(a.enemies, b.enemies, false),
    bullets: lerpMap(a.bullets, b.bullets, true),
    xpOrbs: lerpMap(a.xpOrbs || [], b.xpOrbs || [], false),
  };
}
function isVisibleWorld(x, y, pad = 0) {
  const sx = x - camera.x;
  const sy = y - camera.y;
  return sx >= -pad && sx <= canvas.width + pad && sy >= -pad && sy <= canvas.height + pad;
}

function updateScoreboard(players) {
  const sorted = [...players].filter((p) => !p.isCompanion).sort((a, b) => b.score - a.score);
  const titleText = scoreboardMinimized ? `Players: ${sorted.length}` : 'Players';
  const toggleLabel = scoreboardMinimized ? 'Expand players list' : 'Minimize players list';
  const toggleIcon = scoreboardMinimized ? '+' : '&minus;';
  const rows = sorted.map((p) => {
    const kills = Number(p.kills) || 0;
    const ammo = p.ammo === null ? 'inf' : p.ammo;
    const meClass = p.id === game.myId ? ' me' : '';
    const conn = getConnectionIndicatorData(p);
    const connIcon = game.connectionIndicatorEnabled
      ? `<span class="conn-wrap" aria-label="${conn.title}"><span class="conn-indicator conn-lvl-${conn.level}"></span><span class="conn-meta">${conn.shortText}</span></span>`
      : '';
    return `<div class="score-row${meClass}">${connIcon}<span class="score-player-text">${p.name} - Kills: ${kills} (${p.weaponLabel} ${ammo})</span></div>`;
  });

  const nextHtml = scoreboardMinimized
    ? `<div class="score-head"><div class="score-title">${titleText}</div><button type="button" class="panel-close panel-close-sm scoreboard-toggle" aria-label="${toggleLabel}" title="${toggleLabel}">${toggleIcon}</button></div>`
    : `<div class="score-head"><div class="score-title">${titleText}</div><button type="button" class="panel-close panel-close-sm scoreboard-toggle" aria-label="${toggleLabel}" title="${toggleLabel}">${toggleIcon}</button></div>${rows.join('')}`;
  const allowPinnedHover = !replayGame.active && !mobile.enabled;
  if (allowPinnedHover && scoreboardEl.matches(':hover')) return;
  if (nextHtml === lastScoreboardHtml) return;
  lastScoreboardHtml = nextHtml;
  scoreboardEl.innerHTML = nextHtml;
}

function keyStateFromCode(code, isDown) {
  if (code === 'KeyW' || code === 'ArrowUp') input.up = isDown;
  if (code === 'KeyS' || code === 'ArrowDown') input.down = isDown;
  if (code === 'KeyA' || code === 'ArrowLeft') input.left = isDown;
  if (code === 'KeyD' || code === 'ArrowRight') input.right = isDown;
}

function queueJump() {
  input.jumpQueued = true;
  requestImmediateInputSend();
}

function updateSyncSettingsVisibility() {
  if (!syncSettingsEl) return;
  syncSettingsEl.style.display = joinMode === 'create' ? '' : 'none';
}

function renderGameModeSelection() {
  if (!Array.isArray(gameModeOptionButtons) || !gameModeOptionButtons.length) return;
  for (const btn of gameModeOptionButtons) {
    if (!(btn instanceof HTMLElement)) continue;
    const mode = normalizeGameMode(btn.dataset.gameMode || 'normal');
    btn.classList.toggle('active', mode === selectedGameMode);
  }
}

let immediateInputSendQueued = false;

function requestImmediateInputSend() {
  if (immediateInputSendQueued) return;
  immediateInputSendQueued = true;
  setTimeout(() => {
    immediateInputSendQueued = false;
    sendInput();
  }, 0);
}


window.addEventListener('keydown', (e) => {
  if (e.code === 'Backquote') {
    e.preventDefault();
    toggleDevConsole();
    return;
  }

  if (isDevConsoleOpen()) return;

  const t = e.target;
  const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
  const overlayOpen = getComputedStyle(joinOverlay).display !== 'none';

  if (!typing && e.code === 'KeyH') {
    setInfoPanelHidden(!infoPanelHidden);
    return;
  }

  if (!typing && !overlayOpen && !e.repeat && runBoundDevCommand(e.code)) {
    e.preventDefault();
    return;
  }

  if (!typing && e.code === 'Space') {
    e.preventDefault();
    queueJump();
    return;
  }

  const digitMatch = !typing ? /^Digit([1-3])$/.exec(e.code) : null;
  if (digitMatch) {
    const idx = Number(digitMatch[1]);
    if (chooseSkillByIndex(idx)) {
      e.preventDefault();
      return;
    }
  }

  const before = `${input.up}:${input.down}:${input.left}:${input.right}`;
  keyStateFromCode(e.code, true);
  const after = `${input.up}:${input.down}:${input.left}:${input.right}`;
  if (before !== after) requestImmediateInputSend();
  if (e.code === 'Digit1' && ws.readyState === WebSocket.OPEN) {
    sendJson({ type: 'weaponSwitch', weaponKey: 'pistol' });
  }
});
window.addEventListener('keyup', (e) => {
  if (isDevConsoleOpen()) return;
  const before = `${input.up}:${input.down}:${input.left}:${input.right}`;
  keyStateFromCode(e.code, false);
  const after = `${input.up}:${input.down}:${input.left}:${input.right}`;
  if (before !== after) requestImmediateInputSend();
});

function setPointerFromClient(clientX, clientY) {
  input.pointerX = clientX;
  input.pointerY = clientY;
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  input.shooting = true;
  setPointerFromClient(e.clientX, e.clientY);
  requestImmediateInputSend();
});
window.addEventListener('mouseup', () => {
  if (!input.shooting) return;
  input.shooting = false;
  requestImmediateInputSend();
});
canvas.addEventListener('mousemove', (e) => {
  setPointerFromClient(e.clientX, e.clientY);
  if (input.shooting) requestImmediateInputSend();
});

let mobileShootTouchId = null;
canvas.addEventListener('touchstart', (e) => {
  if (!mobile.enabled) return;
  const t = e.changedTouches[0];
  if (!t) return;
  if (t.identifier === mobile.moveId || t.identifier === mobile.aimId) return;
  mobileShootTouchId = t.identifier;
  input.shooting = true;
  setPointerFromClient(t.clientX, t.clientY);
  requestImmediateInputSend();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (!mobile.enabled || mobileShootTouchId === null) return;
  const t = getTouchById(e.touches, mobileShootTouchId);
  if (!t) return;
  setPointerFromClient(t.clientX, t.clientY);
  requestImmediateInputSend();
  e.preventDefault();
}, { passive: false });

const stopMobileTapShoot = (e) => {
  if (!mobile.enabled || mobileShootTouchId === null) return;
  const ended = getTouchById(e.changedTouches, mobileShootTouchId);
  if (!ended) return;
  mobileShootTouchId = null;
  input.shooting = false;
  requestImmediateInputSend();
  e.preventDefault();
};
canvas.addEventListener('touchend', stopMobileTapShoot, { passive: false });
canvas.addEventListener('touchcancel', stopMobileTapShoot, { passive: false });

joinForm.addEventListener('click', (e) => {
  const rawTarget = e.target;
  if (!(rawTarget instanceof Element)) return;
  const t = rawTarget.closest('button');
  if (!(t instanceof HTMLButtonElement)) return;

  if (t.dataset.gameMode) {
    selectedGameMode = normalizeGameMode(t.dataset.gameMode);
    localStorage.setItem(GAME_MODE_STORAGE_KEY, selectedGameMode);
    renderGameModeSelection();
    return;
  }

  if (!t.dataset.mode) return;
  joinMode = t.dataset.mode;
  updateSyncSettingsVisibility();
});

updateSyncSettingsVisibility();
renderGameModeSelection();

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (ws.readyState !== WebSocket.OPEN) return;
  const roomCode = joinMode === 'create' ? '' : roomCodeInput.value.trim();
  const joinSync = joinMode === 'create' ? configFromSyncUi() : null;
  void sendJoinRequest(roomCode, joinSync, { source: 'join_form' });
});

function handleSkillOptionInteract(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const card = t.closest('.skill-option');
  if (!(card instanceof HTMLElement)) return;
  const sid = card.dataset.skillId;
  if (!sid || ws.readyState !== WebSocket.OPEN || !game.myId) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('skill_pick', { skill_id: sid });
  }
  sendJson({ type: 'skillPick', skillId: sid });
}

levelupOptionsEl?.addEventListener('pointerdown', handleSkillOptionInteract);
levelupOptionsEl?.addEventListener('click', handleSkillOptionInteract);



const DEATH_OVERLAY_DELAY_MS = 3000;
const DEATH_REWARDS_SHOW_DELAY_MS = 3000;
let pendingDeathOverlayTimer = null;
let pendingDeathResult = null;
let pendingDeathRewardsTimer = null;
let latestRunRewards = null;
let latestDeathSnapshot = null;
let localDeathStateLocked = false;

function clearDeathRewardsUi() {
  joinOverlay.classList.remove('death-rewards-visible');
  if (deathRewardsBodyEl) deathRewardsBodyEl.innerHTML = 'Collecting rewards...';
}

function formatRunRewardsPayload(rewards) {
  const gainedXp = Math.max(0, Number(rewards?.gainedXp) || 0);
  const gainedShards = Math.max(0, Number(rewards?.gainedShards) || 0);
  const levelsGained = Math.max(0, Number(rewards?.levelsGained) || 0);
  const gainedCards = rewards?.gainedCards && typeof rewards.gainedCards === 'object' ? rewards.gainedCards : {};
  const catalogCards = Array.isArray(game.playerAuth?.progressionCatalog?.cards) ? game.playerAuth.progressionCatalog.cards : [];
  const cardNameById = Object.fromEntries(catalogCards.map((card) => [String(card.id || ''), String(card.name || card.id || '')]));
  const cards = [];
  for (const cardId of Object.keys(gainedCards)) {
    const cnt = Math.max(0, Number(gainedCards[cardId]) || 0);
    if (cnt <= 0) continue;
    cards.push({ id: cardId, count: cnt, name: cardNameById[cardId] || cardId });
  }
  return { gainedXp, gainedShards, levelsGained, cards };
}

function renderDeathRewardsPanel() {
  if (!deathRewardsBodyEl) return;
  const run = latestDeathSnapshot || {};
  const rewards = latestRunRewards;
  const isLoggedIn = Boolean(game.playerAuth?.player);
  const accountXpLabel = rewards
    ? ('+' + rewards.gainedXp)
    : (isLoggedIn ? 'Pending...' : 'Login required');
  const shardsLabel = rewards
    ? ('+' + rewards.gainedShards)
    : (isLoggedIn ? 'Pending...' : 'Login required');
  const baseRows = [
    ['Score', Math.max(0, Number(run.score) || 0)],
    ['Kills', Math.max(0, Number(run.kills) || 0)],
    ['Enemy kills', Math.max(0, Number(run.enemyKills) || 0)],
    ['Boss kills', Math.max(0, Number(run.bossKills) || 0)],
    ['Survival', `${Math.max(1, Number(run.survivalSec) || 1)}s`],
    ['Hero XP', `Lv${Math.max(1, Number(run.heroLevel) || 1)} | ${Math.max(0, Number(run.heroXp) || 0)}/${Math.max(1, Number(run.heroXpToNext) || 1)}`],
    ['Account XP', accountXpLabel],
    ['Shards', shardsLabel],
  ];
  if (rewards && rewards.levelsGained > 0) baseRows.push(['Account level up', '+' + rewards.levelsGained]);
  const rowsHtml = baseRows.map(([k, v]) => `<div class="death-reward-row"><span>${escapeHtml(String(k))}</span><b>${escapeHtml(String(v))}</b></div>`).join('');
  const cardsHtml = rewards && rewards.cards.length > 0
    ? (`<div class="death-reward-cards">` + rewards.cards.map((card) => `<span>+${card.count} ${escapeHtml(card.name)}</span>`).join('') + `</div>`)
    : '<div class="death-reward-cards muted">No hero card drops this run</div>';
  deathRewardsBodyEl.innerHTML = rowsHtml + cardsHtml;
}

function scheduleDeathRewardsReveal() {
  if (pendingDeathRewardsTimer) clearTimeout(pendingDeathRewardsTimer);
  clearDeathRewardsUi();
  pendingDeathRewardsTimer = setTimeout(() => {
    pendingDeathRewardsTimer = null;
    renderDeathRewardsPanel();
    joinOverlay.classList.add('death-rewards-visible');
  }, DEATH_REWARDS_SHOW_DELAY_MS);
}

function cancelPendingDeathOverlay() {
  if (pendingDeathOverlayTimer) {
    clearTimeout(pendingDeathOverlayTimer);
    pendingDeathOverlayTimer = null;
  }
  if (pendingDeathRewardsTimer) {
    clearTimeout(pendingDeathRewardsTimer);
    pendingDeathRewardsTimer = null;
  }
  pendingDeathResult = null;
  clearDeathScreenBloodFx();
  clearDeathRewardsUi();
}

function clearDeathScreenBloodFx() {
  if (!deathScreenBloodOverlayEl) return;
  deathScreenBloodOverlayEl.innerHTML = '';
}

function spawnDeathScreenBloodFx() {
  if (!deathScreenBloodOverlayEl) return;
  clearDeathScreenBloodFx();

  const shotCount = 22;
  const w = Math.max(320, window.innerWidth || 0);
  const h = Math.max(240, window.innerHeight || 0);
  const maxX = (w * 0.48);
  const maxY = (h * 0.46);

  for (let i = 0; i < shotCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = (0.24 + Math.random() * 0.78) * Math.min(maxX, maxY);
    const tx = Math.cos(angle) * dist + ((Math.random() - 0.5) * 56);
    const ty = Math.sin(angle) * dist + ((Math.random() - 0.5) * 44);
    const delay = Math.round(Math.random() * 360);
    const flyDur = Math.round(280 + Math.random() * 360);
    const fadeDur = Math.round(760 + Math.random() * 680);

    const shot = document.createElement('div');
    shot.className = 'death-screen-shot';
    shot.style.setProperty('--tx', tx.toFixed(1) + 'px');
    shot.style.setProperty('--ty', ty.toFixed(1) + 'px');
    shot.style.setProperty('--delay', delay + 'ms');
    shot.style.setProperty('--fly-dur', flyDur + 'ms');
    shot.style.setProperty('--drop-size', (6 + Math.random() * 8).toFixed(1) + 'px');
    deathScreenBloodOverlayEl.appendChild(shot);

    const splat = document.createElement('div');
    splat.className = 'death-screen-splat';
    splat.style.setProperty('--tx', tx.toFixed(1) + 'px');
    splat.style.setProperty('--ty', ty.toFixed(1) + 'px');
    splat.style.setProperty('--rot', Math.round((Math.random() * 70) - 35) + 'deg');
    splat.style.setProperty('--delay', (delay + Math.max(70, Math.round(flyDur * 0.64))) + 'ms');
    splat.style.setProperty('--fade-dur', fadeDur + 'ms');
    splat.style.setProperty('--splat-size', (24 + Math.random() * 78).toFixed(1) + 'px');
    deathScreenBloodOverlayEl.appendChild(splat);

    const cleanupMs = delay + flyDur + fadeDur + 420;
    setTimeout(() => {
      shot.remove();
      splat.remove();
    }, cleanupMs);
  }
}

function spawnPlayerDeathBloodFx(result) {
  const me = game.state?.players?.find((p) => p.id === game.myId);
  if (!me) return;
  const x = Number(me.x) || 0;
  const y = Number(me.y) || 0;

  if (typeof spawnBlood === 'function') spawnBlood(x, y, 140);
  if (typeof spawnGoreBurst === 'function') spawnGoreBurst(x, y, 88);
  if (typeof spawnHitFx === 'function') spawnHitFx(x, y, 28, true);

  if (typeof spawnBloodPuddle === 'function') {
    for (let i = 0; i < 9; i += 1) {
      const ox = (Math.random() * 64) - 32;
      const oy = (Math.random() * 44) - 22;
      const intensity = 1.35 + Math.random() * 0.9;
      spawnBloodPuddle(x + ox, y + oy, intensity);
    }
  }
}
function lockCameraForDeathSequence() {
  game.deathCameraLock = {
    active: true,
    x: Math.max(0, Number(camera.x) || 0),
    y: Math.max(0, Number(camera.y) || 0),
  };
}

function clearDeathCameraLock() {
  if (game.deathCameraLock && typeof game.deathCameraLock === 'object') {
    game.deathCameraLock.active = false;
  }
  game.deathCameraLock = null;
}

function scheduleDeathOverlay(result) {
  localDeathStateLocked = true;
  if (pendingDeathOverlayTimer) return;
  pendingDeathResult = result || null;
  statusEl.textContent = 'Critical damage...';
  pendingDeathOverlayTimer = setTimeout(() => {
    const snapshot = pendingDeathResult;
    pendingDeathOverlayTimer = null;
    pendingDeathResult = null;
    openDeathOverlay(snapshot);
  }, DEATH_OVERLAY_DELAY_MS);
}
function clearLocalSessionState() {
  cancelPendingDeathOverlay();
  clearDeathCameraLock();
  localDeathStateLocked = false;
  game.myId = null;
  game.roomCode = null;
  game.state = null;
  game.netSnapshots = [];
  game.sampledNet = null;
  game.nextInputSeq = 0;
  game.renderPlayers.clear();
  game.renderEnemies.clear();
  game.renderBullets.clear();
  game.renderXpOrbs.clear();
  game.roomStartedAt = 0;
  game.totalEnemyKills = 0;
  game.nextBossAtKills = 50;
  game.nextBossSpawnAt = 0;
  game.bossAlive = false;
  game.roomDifficulty = { level: 1, hpMul: 1, speedMul: 1, damageMul: 1, attackRateMul: 1, spawnIntervalMs: 760 };
  game.mySkillChoices = [];
  prevMyAlive = null;
  sessionStartedAt = 0;
  waitingForFirstState = false;
  waitingForFirstStateSince = 0;
  netStats.pendingPings.clear();
  netStats.rttSamples = [];
  netStats.rttMs = 0;
  netStats.jitterMs = 0;
  netStats.stateDelayMs = 0;
  roomMetaEl.textContent = '';
  weaponMetaEl.textContent = '';
  if (movementMetaEl) movementMetaEl.textContent = '';
  input.jumpQueued = false;
  scoreboardEl.innerHTML = '';
  lastScoreboardHtml = '';
  lastLevelupHtml = '';
  visuals.bossBlast = [];
  visuals.bloodMist = [];
  visuals.rocketSmoke = [];
  visuals.rocketFire = [];
  visuals.rocketBlast = [];
  visuals.skillBursts = [];
  visuals.skillArcs = [];
  visuals.skillLinks = [];
  visuals.skillLabels = [];
  visuals.skillCdPrev = new Map();
  visuals.skillOfferPrev = new Map();
  visuals.rocketPrev = new Map();
  updateTopCenterHud(Date.now());
  updateBottomHud();
  updateStatsPanel(null);
  updateJumpButtonUi(null);
  immediateInputSendQueued = false;
}

function leaveActiveRoom() {
  if (ws.readyState === WebSocket.OPEN && game.myId) {
    sendJson({ type: 'leave' });
  }
  clearLocalSessionState();
}

function renderDeathResult(result) {
  if (!deathResultEl) return;
  if (!result) {
    deathResultEl.textContent = 'Last result: --';
    return;
  }
  deathResultEl.textContent = `Last result: ${result.kills} kills | ${result.score} pts | ${result.survivalSec}s | room ${result.roomCode}`;
}

function setDeathCinematicActive(active) {
  const on = Boolean(active);
  if (on) {
    joinOverlay.classList.remove('death-cinematic-active');
    if (deathCinematicEl) {
      deathCinematicEl.setAttribute('aria-hidden', 'true');
      void deathCinematicEl.offsetWidth;
      deathCinematicEl.setAttribute('aria-hidden', 'false');
    }
    joinOverlay.classList.add('death-cinematic-active');
    return;
  }
  joinOverlay.classList.remove('death-cinematic-active');
  if (deathCinematicEl) deathCinematicEl.setAttribute('aria-hidden', 'true');
}

function openDeathMenuAfterCinematic() {
  clearDeathCameraLock();
  clearDeathRewardsUi();
  setDeathCinematicActive(false);
  joinOverlay.classList.add('death-mode');
  statusEl.textContent = 'You died. Last result is shown below.';
  updateMobileControlsVisibility();
  requestRoomsList();
  requestRecordsList(recordsUi.page);
}

function openDeathOverlay(result) {
  latestDeathSnapshot = result || null;
  cancelPendingDeathOverlay();
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('player_death', {
      room_code: result?.roomCode || '-',
      kills: Number(result?.kills) || 0,
      score: Number(result?.score) || 0,
      survival_sec: Number(result?.survivalSec) || 0,
    });
  }
  leaveActiveRoom();
  joinOverlay.style.display = 'grid';
  joinOverlay.classList.add('death-mode');
  spawnDeathScreenBloodFx();
  renderDeathResult(result);
  renderDeathRewardsPanel();
  setDeathCinematicActive(true);
  scheduleDeathRewardsReveal();
}

deathContinueBtn?.addEventListener('click', () => {
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('death_overlay_continue', { source: 'death_cinematic' });
  }
  openDeathMenuAfterCinematic();
});

deathRewardsMenuBtn?.addEventListener('click', () => {
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('death_overlay_continue', { source: 'run_rewards' });
  }
  openDeathMenuAfterCinematic();
});


refreshRoomsBtn?.addEventListener('click', () => {
  if (typeof window.cwTrackMetrikaGoal === 'function') {
    window.cwTrackMetrikaGoal('room_search_manual', { source: 'refresh_button' });
  }
  requestRoomsList();
});
refreshRecordsBtn?.addEventListener('click', () => {
  requestRecordsList(recordsUi.page);
});
recordsPrevBtn?.addEventListener('click', () => {
  if (recordsUi.page > 1) requestRecordsList(recordsUi.page - 1);
});
recordsNextBtn?.addEventListener('click', () => {
  if (recordsUi.page < recordsUi.totalPages) requestRecordsList(recordsUi.page + 1);
});

setInterval(() => {
  if (!game.myId && game.connected) {
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }
}, 5000);
registerSocketHandlers({
open: () => {
  game.connected = true;
  statusEl.textContent = 'Connected. Create room or join code.';
  game.runtimeInstance.publicBaseUrl = currentWorkerOrigin || APP_ORIGIN;
  renderInstanceMeta();
  void refreshPlayerAuthSession({ silent: true });
  requestRoomsList();
  requestRecordsList(1);
  sendNetPing();
  if (pendingAutoJoin && roomCodeInput?.value) {
    pendingAutoJoin = false;
    joinMode = 'join';
    void sendJoinRequest(roomCodeInput.value.trim(), null, { skipRouting: true });
  } else if (pendingAutoCreate) {
    pendingAutoCreate = false;
    joinMode = 'create';
    void sendJoinRequest('', configFromSyncUi(), { skipRouting: true });
  }
},
close: () => {
  game.connected = false;
  netStats.pendingPings.clear();
  if (!restartReloadTimer) {
    statusEl.textContent = 'Disconnected';
  }
},
message: (ev) => {
  const rawSize = typeof ev.data === 'string' ? ev.data.length : 0;
  if (rawSize > 0) markRxBytes(rawSize);

  let msg;
  try { msg = JSON.parse(ev.data); } catch { return; }

  if (msg.type === 'netPong') {
    handleNetPong(msg);
    return;
  }

  if (msg.type === 'devConsole') {
    onDevConsoleServerMessage(msg);
    return;
  }

  if (msg.type === 'serverRestart') {
    handleServerRestartNotice(msg);
    return;
  }

  if (msg.type === 'accountProgression') {
    if (msg.progression) game.playerAuth.progression = msg.progression;
    if (msg.rewards) {
      latestRunRewards = formatRunRewardsPayload(msg.rewards);
      const cardPieces = latestRunRewards.cards.map((card) => ('+' + card.count + ' ' + card.name));
      statusEl.textContent = 'Run rewards: +' + latestRunRewards.gainedXp + ' XP, +' + latestRunRewards.gainedShards + ' shards'
        + (latestRunRewards.levelsGained > 0 ? (', +' + latestRunRewards.levelsGained + ' account level') : '')
        + (cardPieces.length > 0 ? (', ' + cardPieces.join(', ')) : '');
      if (joinOverlay.classList.contains('death-cinematic-active')) {
        renderDeathRewardsPanel();
      }
    }
    renderCharacterPicker();
    return;
  }

  if (msg.type === 'welcome') {
    clearJoinFeedback();
    game.myId = msg.id;
    game.runtimeInstance.instanceId = String(msg.instanceId || '');
    game.runtimeInstance.publicBaseUrl = currentWorkerOrigin || APP_ORIGIN;
    renderInstanceMeta();
    resetNetStats();
    prevMyAlive = true;
    localDeathStateLocked = false;
    clearDeathCameraLock();
    latestRunRewards = null;
    latestDeathSnapshot = null;
    sessionStartedAt = Date.now();
    if (msg.sync) applyRoomSync(msg.sync);
    game.roomCode = msg.roomCode;
    game.skillCatalog = {};
    const catalog = Array.isArray(msg.skillCatalog) ? msg.skillCatalog : [];
    for (const sk of catalog) { if (sk && sk.id) game.skillCatalog[sk.id] = sk; }
    game.renderPlayers.clear();
    game.renderEnemies.clear();
    game.renderBullets.clear();
    game.renderXpOrbs.clear();
    game.netSnapshots = [];
    game.sampledNet = null;
    game.nextInputSeq = 0;
    visuals.enemyPrev = new Map();
    visuals.playerPrev = new Map();
    visuals.blood = [];
    visuals.bloodPuddles = [];
    visuals.gore = [];
    visuals.hitFx = [];
    visuals.muzzle = [];
    visuals.bossBlast = [];
    visuals.bloodMist = [];
    visuals.rocketSmoke = [];
    visuals.rocketFire = [];
    visuals.rocketBlast = [];
    visuals.skillBursts = [];
    visuals.skillArcs = [];
    visuals.skillLinks = [];
    visuals.skillLabels = [];
    visuals.skillCdPrev = new Map();
    visuals.skillOfferPrev = new Map();
    visuals.rocketPrev = new Map();
    roomMetaEl.textContent = `Room: ${msg.roomCode}`;
    copyRoomCodeToClipboard(msg.roomCode, { silent: true });
    statusEl.textContent = `Online as ${msg.id} | tick ${roomSync.tickRate}`;
    const pendingJoin = game.analytics?.pendingJoin || null;
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      const mode = pendingJoin?.mode || (joinMode === 'create' ? 'create' : 'join');
      const source = pendingJoin?.source || 'unknown';
      window.cwTrackMetrikaGoal('room_connected', {
        mode,
        source,
        room_code: msg.roomCode,
      });
      window.cwTrackMetrikaGoal('game_start_success', {
        mode,
        source,
        room_code: msg.roomCode,
      });
      if (mode === 'create') {
        window.cwTrackMetrikaGoal('room_created', {
          source,
          room_code: msg.roomCode,
        });
      } else {
        window.cwTrackMetrikaGoal('room_join_success', {
          source,
          room_code: msg.roomCode,
        });
      }
    }
    if (typeof window.cwClearPendingJoinAnalytics === 'function') {
      window.cwClearPendingJoinAnalytics();
    }
    if (msg.progressionCatalog) game.playerAuth.progressionCatalog = msg.progressionCatalog;
    if (msg.progression) game.playerAuth.progression = msg.progression;
    if (msg.me?.activeHero) {
      selectedPlayerClass = sanitizePlayerClass(msg.me.activeHero);
      localStorage.setItem(PLAYER_CLASS_STORAGE_KEY, selectedPlayerClass);
    }
    renderCharacterPicker();
    if (msg.me?.name && !game.playerAuth?.player) {
      game.playerAuth.nicknameStatus = {
        nickname: msg.me.name,
        isRegistered: !!msg.me.isRegisteredNickname,
        isOccupied: false,
      };
      renderPlayerAuthUi();
    }
  }

  if (msg.type === 'joinError') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    statusEl.textContent = msg.message;
    setJoinFeedback(msg.message);
    if (typeof window.cwTrackMetrikaGoal === 'function') {
      const pendingJoin = game.analytics?.pendingJoin || null;
      window.cwTrackMetrikaGoal('room_join_error', {
        mode: pendingJoin?.mode || joinMode || 'unknown',
        source: pendingJoin?.source || 'unknown',
        room_code: msg.roomCode || pendingJoin?.roomCode || roomCodeInput?.value?.trim()?.toUpperCase() || 'AUTO',
        error_code: String(msg.code || 'unknown'),
      });
    }
    if (!msg.redirectUrl && typeof window.cwClearPendingJoinAnalytics === 'function') {
      window.cwClearPendingJoinAnalytics();
    }
    if (msg.redirectUrl) {
      try {
        const redirectedOrigin = normalizeOrigin(msg.redirectUrl);
        currentWorkerOrigin = redirectedOrigin;
        void sendJoinRequest(msg.roomCode || roomCodeInput?.value || '', null, { skipRouting: true });
      } catch {
        statusEl.textContent = msg.message || 'Failed to switch game server.';
        setJoinFeedback(msg.message || 'Failed to switch game server.');
      }
      return;
    }
    if (Number(msg.retryAfterMs) > 0) {
      scheduleClientReload(Number(msg.retryAfterMs), msg.message || 'Server restarting. Reconnecting...');
    }
    joinOverlay.style.display = 'grid';
    joinOverlay.classList.remove('death-mode');
    setDeathCinematicActive(false);
    updateMobileControlsVisibility();
    joinFeedbackEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    requestRoomsList();
    requestRecordsList(recordsUi.page);
  }

  if (msg.type === 'system') statusEl.textContent = msg.message;

  if (msg.type === 'state') {
    waitingForFirstState = false;
    waitingForFirstStateSince = 0;
    const s = msg.payload;
    onStateNetSample(s.now);
    pushNetSnapshot(s);
    syncBulletsFromState(s);
    processStateFx(s);
    game.state = s;
    game.world = s.world;
    game.roomCode = s.roomCode;
    game.roomStartedAt = Number(s.roomStartedAt) || game.roomStartedAt || Date.now();
    game.totalEnemyKills = Number(s.totalEnemyKills) || 0;
    game.nextBossAtKills = Number(s.nextBossAtKills) || game.nextBossAtKills || 50;
    game.nextBossSpawnAt = Number(s.nextBossSpawnAt) || 0;
    game.bossAlive = Boolean(s.bossAlive);
    if (game.bossAlive && typeof window.cwTrackMetrikaGoalOnce === 'function') {
      window.cwTrackMetrikaGoalOnce(`boss_encounter:${s.roomCode}`, 'boss_encounter', {
        room_code: s.roomCode,
        total_enemy_kills: Number(s.totalEnemyKills) || 0,
      });
    }
    game.roomDifficulty = s.roomDifficulty || game.roomDifficulty;
    if (s.sync) applyRoomSync(s.sync);
    roomMetaEl.textContent = `Room: ${s.roomCode}`;

    game.sortedTrees = (s.decor?.trees || []).slice().sort((a, b) => a.y - b.y);
    updateScoreboard(s.players);

    const me = s.players.find((p) => p.id === game.myId);
    if (me) {
      if (localDeathStateLocked && me.alive) {
        // Keep local player down during death sequence to avoid visible auto-respawn before overlay/menu handoff.
        me.alive = false;
        me.hp = 0;
      }
      updateStatsPanel(me);
      updateJumpButtonUi(me);
      const dodgeCdMeta = Math.max(0, Number(me.dodgeCooldownMs) || 0);
      const jumpMeta = dodgeCdMeta > 0 ? (dodgeCdMeta / 1000).toFixed(1) + 's' : 'ready';
      weaponMetaEl.textContent = `Weapon: ${me.weaponLabel} | Ammo: ${me.ammo === null ? 'inf' : me.ammo} | Jump: ${jumpMeta}`;
      if (movementMetaEl) {
        const nowMs = Date.now();
        const slowed = (Number(me.slowUntil) || 0) > nowMs;
        const slowLeft = Math.max(0, (Number(me.slowUntil) || 0) - nowMs);
        const dodgeCd = Math.max(0, Number(me.dodgeCooldownMs) || 0);
        const invuln = (Number(me.dodgeInvulnUntil) || 0) > nowMs;
        const dodgeText = dodgeCd > 0 ? (dodgeCd / 1000).toFixed(1) + 's' : 'ready';
        const slowText = slowed ? ('SLOWED ' + (slowLeft / 1000).toFixed(1) + 's') : 'normal';
        movementMetaEl.textContent = `Move: ${slowText} | Jump: ${dodgeText}${invuln ? ' | i-frames' : ''}`;
      }
      if (prevMyAlive === true && !me.alive) {
        const deathResult = {
          kills: Number(me.kills) || 0,
          score: Number(me.score) || 0,
          enemyKills: Number(me.enemyKills) || Number(me.kills) || 0,
          bossKills: Number(me.bossKills) || 0,
          heroLevel: Math.max(1, Number(me.level) || 1),
          heroXp: Math.max(0, Number(me.xp) || 0),
          heroXpToNext: Math.max(1, Number(me.xpToNext) || 1),
          roomCode: game.roomCode || s.roomCode || '-',
          survivalSec: Math.max(1, Math.floor((Date.now() - (sessionStartedAt || Date.now())) / 1000)),
        };
        const finalDeath = Boolean(me.isOut) || !Boolean(me.canRespawn);
        if (finalDeath) {
          lockCameraForDeathSequence();
          spawnPlayerDeathBloodFx(deathResult);
          scheduleDeathOverlay(deathResult);
        }
      }
      if (!me.alive && Boolean(me.canRespawn) && !Boolean(me.isOut)) {
        const leftMs = Math.max(0, Number(me.respawnAt) - Date.now());
        const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
        const livesLeft = Math.max(0, Number(me.livesLeft) || 0);
        const tokensLeft = Math.max(0, Number(me.reviveTokens) || 0);
        const extra = livesLeft > 0 ? (` | Lives left: ${livesLeft}`) : (tokensLeft > 0 ? (` | Tokens left: ${tokensLeft}`) : '');
        statusEl.textContent = `Downed. Respawn in ${leftSec}s${extra}`;
      }
      prevMyAlive = Boolean(me.alive);
    } else {
      updateStatsPanel(null);
      updateJumpButtonUi(null);
      prevMyAlive = null;
      if (movementMetaEl) movementMetaEl.textContent = '';
    }
  }
},
});

void connectGameSocket(APP_ORIGIN);

function buildCurrentInputPayload(includeJump = true) {
  if (!game.connected || !game.myId || !game.state) return null;
  const me = game.state.players.find((p) => p.id === game.myId);
  if (!me) return null;

  let moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  let aimX = input.pointerX + camera.x;
  let aimY = input.pointerY + camera.y;
  let shooting = input.shooting;

  if (mobile.enabled) {
    if (mobile.moveStrength > 0.05) {
      moveX = mobile.moveX * Math.min(1, mobile.moveStrength * 1.15);
      moveY = mobile.moveY * Math.min(1, mobile.moveStrength * 1.15);
    }

    const sx = me.x - camera.x;
    const sy = me.y - camera.y;
    const aimDistWorld = 240;
    const aimDistScreen = 120;

    if (mobile.aimStrength > 0.08) {
      aimX = me.x + mobile.aimX * aimDistWorld;
      aimY = me.y + mobile.aimY * aimDistWorld;
      shooting = mobile.aimStrength > 0.2;
      input.pointerX = sx + mobile.aimX * aimDistScreen;
      input.pointerY = sy + mobile.aimY * aimDistScreen;
    }
  }
  const manualAimOverride = Boolean(input.shooting || (mobile.enabled && mobile.aimStrength > 0.2));

  if (game.autoFireEnabled && !manualAimOverride) {
    let nearest = null;
    let bestD2 = Infinity;
    for (const e of game.state.enemies || []) {
      const dx = e.x - me.x;
      const dy = e.y - me.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = e;
      }
    }
    if (nearest) {
      aimX = nearest.x;
      aimY = nearest.y;
      shooting = true;
    } else {
      shooting = false;
    }
  }

  return {
    moveX,
    moveY,
    aimX,
    aimY,
    shooting,
    jump: includeJump ? input.jumpQueued : false,
  };
}

function sendInput() {
  if (!game.connected || !game.myId || ws.readyState !== WebSocket.OPEN || !game.state) return;
  const payload = buildCurrentInputPayload(true);
  if (!payload) return;
  const seq = game.nextInputSeq + 1;
  game.nextInputSeq = seq;

  sendJson({
    type: 'input',
    seq,
    ...payload,
  });

  input.jumpQueued = false;
}

void maybeStartReplayFromUrl();


































