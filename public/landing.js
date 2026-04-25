const nav = document.getElementById('site-nav');
const mobileToggle = document.querySelector('.mobile-menu-toggle');
const newsGrid = document.getElementById('landing-news-grid');
const ratingsGrid = document.getElementById('landing-ratings-grid');
const latestRunsGrid = document.getElementById('landing-latest-runs');
const latestRunsPager = document.getElementById('landing-latest-runs-pager');
const liveIframe = document.getElementById('landing-live-iframe');
const liveCanvas = document.getElementById('landing-live-canvas');
const liveEmpty = document.getElementById('landing-live-empty');
const liveLayout = document.querySelector('.live-run-layout');
const liveCopyPanel = document.querySelector('.live-run-copy');
const livePlayerPanel = document.querySelector('.live-run-player');
const liveKicker = document.getElementById('landing-live-kicker');
const liveTitle = document.getElementById('landing-live-title');
const liveDescription = document.getElementById('landing-live-description');
const liveActiveRuns = document.getElementById('landing-live-active-runs');
const liveInGame = document.getElementById('landing-live-in-game');
const liveRoomCode = document.getElementById('landing-live-room-code');
const liveDuration = document.getElementById('landing-live-duration');
const liveMode = document.getElementById('landing-live-mode');
const livePlayers = document.getElementById('landing-live-players');
const liveThreat = document.getElementById('landing-live-threat');
const liveBoss = document.getElementById('landing-live-boss');
const livePrimaryLink = document.getElementById('landing-live-primary-link');
const liveSecondaryLink = document.getElementById('landing-live-secondary-link');
const livePrevBtn = document.getElementById('landing-live-prev');
const liveNextBtn = document.getElementById('landing-live-next');
const liveSwitchStatus = document.getElementById('landing-live-switch-status');
const liveStatusPill = document.getElementById('landing-live-status-pill');
const liveFootline = document.getElementById('landing-live-footline');
const liveViewers = document.getElementById('landing-live-viewers');
const liveKills = document.getElementById('landing-live-kills');
const liveUpdated = document.getElementById('landing-live-updated');
const liveCommentatorTitle = document.getElementById('landing-live-commentator-title');
const liveCommentatorText = document.getElementById('landing-live-commentator-text');
const revealNodes = Array.from(document.querySelectorAll('.reveal'));
const navLinks = Array.from(document.querySelectorAll('.site-nav a'));
const navSectionTargets = navLinks
  .map((link) => {
    const href = String(link.getAttribute('href') || '').trim();
    if (!href.startsWith('#')) return null;
    const id = href.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!(target instanceof HTMLElement)) return null;
    return { id, link, target };
  })
  .filter(Boolean);
const profileModal = document.getElementById('landing-profile-modal');
const profileBody = document.getElementById('landing-profile-body');
const profileTitle = document.getElementById('landing-profile-title');
const profileCloseBtn = document.getElementById('landing-profile-close');
const hubFrame = document.getElementById('battle-hub-frame');
const hubLoading = document.getElementById('battle-hub-loading');
const hubTabTitle = document.getElementById('hub-tab-title');
const hubTabDescription = document.getElementById('hub-tab-description');
const HUB_TABS = new Set(['play', 'characters', 'skills', 'profile', 'rating', 'news']);
const hubTabMeta = {
  play: {
    title: 'Play',
    description: 'Создай комнату, зайди по коду, выбери режим и стартуй без лишнего шага между лендингом и игрой.',
  },
  characters: {
    title: 'Characters',
    description: 'Смотри доступных героев, переключай стиль боя и собирай состав до того, как откроется арена.',
  },
  skills: {
    title: 'Skills',
    description: 'Прокачка и дерево героя теперь открываются внутри лендинга, а не в отдельном экране-ответвлении.',
  },
  profile: {
    title: 'Profile',
    description: 'Аккаунт, прогресс, история забегов и личная динамика теперь остаются прямо в основном flow страницы.',
  },
  rating: {
    title: 'Rating',
    description: 'Полный leaderboard живёт внутри общего battle hub, а блоки ниже на лендинге работают как preview.',
  },
  news: {
    title: 'News',
    description: 'Патчи, апдейты и обсуждение доступны без разрыва между витриной проекта и игровым меню.',
  },
};
let activeHubTab = 'play';
let latestRunsSignature = '';
let latestRunsPollTimer = 0;
let latestRunsPage = 1;
let latestRunsTotalPages = 1;
const LATEST_RUNS_PAGE_SIZE = 3;
let landingLivePollTimer = 0;
let landingLiveRuntimeTimer = 0;
let landingLiveData = null;
let landingLiveSelectedRoomCode = '';
let landingLiveIframeRoomCode = '';
let landingLivePaused = true;
let landingLivePauseReason = 'initial';
let landingLiveFullscreenToggle = null;
let landingLiveCenterToggle = null;
let landingLiveControlToggle = null;
let landingLiveTimeline = null;
let landingLiveTimelineLabel = null;
let landingLiveMuteToggle = null;
let landingLiveVolumeSlider = null;
let landingLiveVolume = 0.72;
let landingLiveMuted = false;
let activeNavSectionId = '';
let landingLiveTimelineDragging = false;
let landingLiveIframeWatchdog = 0;
let landingLiveIframeReady = false;
let landingLiveIframeProbeTimer = 0;
let landingLiveIframeProbeStopper = 0;
let landingLiveCanvasWrap = null;
let landingLiveSpectatorCommentary = {
  roomCode: '',
  title: '',
  text: '',
  at: 0,
};
let landingCommentaryVoiceToggle = null;
let landingCommentaryVoiceStatus = null;
const landingCommentaryState = {
  roomCode: '',
  lastEventAt: new Map(),
  lastPlayers: 0,
  lastKills: 0,
  lastThreatLevel: 1,
  lastBossAlive: false,
  lastBossCountdownBucket: 0,
  lastLowHpCount: 0,
  lastDownedCount: 0,
  lastKillMilestone: 0,
  lastPulseBucket: 0,
};
const HERO_LABELS = {
  cyber: 'Cyber',
  scout: 'Scout',
  shadow: 'Shadow',
  medic: 'Medic',
  medis: 'Medic',
  raider: 'Raider',
};
const LANDING_COMMENTARY_TTS_KEY = 'cw:landingCommentatorTtsEnabled';
const LANDING_LIVE_VOLUME_KEY = 'cw:landingLiveVolume';
const LANDING_LIVE_MUTED_KEY = 'cw:landingLiveMuted';
const landingCommentarySpeech = {
  supported: typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function',
  enabled: false,
  lastSpokenAt: 0,
  activeSinceAt: 0,
  lastKey: '',
  lastQueuedText: '',
  activeKey: '',
  activeText: '',
  pendingTimer: 0,
  seq: 0,
  recentKeys: new Map(),
  queue: [],
};

try {
  landingCommentarySpeech.enabled = localStorage.getItem(LANDING_COMMENTARY_TTS_KEY) === '1';
} catch {
  landingCommentarySpeech.enabled = false;
}

try {
  const storedVolume = Number(localStorage.getItem(LANDING_LIVE_VOLUME_KEY));
  if (Number.isFinite(storedVolume)) landingLiveVolume = Math.max(0, Math.min(1, storedVolume));
  landingLiveMuted = localStorage.getItem(LANDING_LIVE_MUTED_KEY) === '1';
} catch {
  landingLiveVolume = 0.72;
  landingLiveMuted = false;
}

function composeLandingLiveLayout() {
  if (!(liveLayout instanceof HTMLElement) || !(liveCopyPanel instanceof HTMLElement) || !(livePlayerPanel instanceof HTMLElement)) return;
  if (liveLayout.dataset.composed === '1') return;

  const playerHead = livePlayerPanel.querySelector('.live-run-player-head');
  const canvasWrap = livePlayerPanel.querySelector('.live-run-canvas-wrap');
  const playerFoot = livePlayerPanel.querySelector('.live-run-player-foot');
  const commentary = livePlayerPanel.querySelector('.live-run-commentary');
  const stats = liveCopyPanel.querySelector('.live-run-stats');
  const flags = liveCopyPanel.querySelector('.live-run-flags');
  const actions = liveCopyPanel.querySelector('.live-run-actions');
  const switcher = liveCopyPanel.querySelector('.live-run-switcher');

  const overview = document.createElement('div');
  overview.className = 'live-run-overview';
  const overviewCopy = document.createElement('div');
  overviewCopy.className = 'live-run-overview-copy';
  const overviewActions = document.createElement('div');
  overviewActions.className = 'live-run-overview-actions';

  const copyNodes = [liveKicker, liveTitle, liveDescription].filter((node) => node instanceof HTMLElement);
  for (const node of copyNodes) overviewCopy.appendChild(node);
  if (actions instanceof HTMLElement) overviewActions.appendChild(actions);
  if (switcher instanceof HTMLElement) overviewActions.appendChild(switcher);
  overview.appendChild(overviewCopy);
  overview.appendChild(overviewActions);

  if (canvasWrap instanceof HTMLElement) {
    landingLiveCanvasWrap = canvasWrap;
    if (commentary instanceof HTMLElement) {
      canvasWrap.insertAdjacentElement('afterend', commentary);
      commentary.insertAdjacentElement('afterend', overview);
    } else {
      canvasWrap.insertAdjacentElement('afterend', overview);
    }
  } else {
    livePlayerPanel.appendChild(overview);
  }
  if (stats instanceof HTMLElement) livePlayerPanel.insertBefore(stats, playerFoot || commentary || null);
  if (flags instanceof HTMLElement) livePlayerPanel.insertBefore(flags, playerFoot || commentary || null);

  livePlayerPanel.classList.add('live-run-player-wide');
  liveCopyPanel.remove();
  liveLayout.dataset.composed = '1';

  if (commentary instanceof HTMLElement && !commentary.querySelector('.live-run-commentary-tools')) {
    if (!commentary.querySelector('.live-run-commentary-avatar')) {
      const avatar = document.createElement('div');
      avatar.className = 'live-run-commentary-avatar';
      const portrait = document.createElement('img');
      portrait.src = '/assets/stream/commentator-old.jpg';
      portrait.alt = 'Комментатор арены';
      portrait.loading = 'lazy';
      const body = document.createElement('div');
      body.className = 'live-run-commentary-body';

      avatar.appendChild(portrait);

      while (commentary.firstChild) {
        body.appendChild(commentary.firstChild);
      }
      commentary.appendChild(avatar);
      commentary.appendChild(body);
    }

    const tools = document.createElement('div');
    tools.className = 'live-run-commentary-tools';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'live-run-commentary-voice-btn';
    toggle.title = 'Включить озвучку комментатора на главной';
    const status = document.createElement('span');
    status.className = 'live-run-commentary-voice-status';
    tools.appendChild(toggle);
    tools.appendChild(status);
    const avatar = commentary.querySelector('.live-run-commentary-avatar');
    if (avatar) avatar.appendChild(tools);
    else {
      const label = commentary.querySelector('.live-run-commentary-label');
      if (label) label.insertAdjacentElement('afterend', tools);
      else commentary.prepend(tools);
    }
    landingCommentaryVoiceToggle = toggle;
    landingCommentaryVoiceStatus = status;
  } else {
    landingCommentaryVoiceToggle = commentary?.querySelector('.live-run-commentary-voice-btn') || null;
    landingCommentaryVoiceStatus = commentary?.querySelector('.live-run-commentary-voice-status') || null;
  }
  if (canvasWrap instanceof HTMLElement && !canvasWrap.querySelector('.live-player-controls')) {
    const controls = document.createElement('div');
    controls.className = 'live-player-controls';
    controls.innerHTML = `
      <button class="live-player-fullscreen-toggle" type="button" aria-label="Open live fullscreen"></button>
      <button class="live-player-center-toggle" type="button" aria-label="Pause Live">Pause</button>
      <div class="live-player-controlbar">
        <button class="live-player-play-toggle" type="button" aria-label="Pause Live">Pause</button>
        <span class="live-player-time">LIVE 00:00</span>
        <input class="live-player-timeline" type="range" min="0" max="1" value="1" step="1" aria-label="Live timeline" />
        <div class="live-player-volume">
          <button class="live-player-mute-toggle" type="button" aria-label="Mute live sound">Sound</button>
          <input class="live-player-volume-slider" type="range" min="0" max="100" value="72" step="1" aria-label="Live sound volume" />
        </div>
      </div>
    `;
    canvasWrap.appendChild(controls);
    landingLiveFullscreenToggle = controls.querySelector('.live-player-fullscreen-toggle');
    landingLiveCenterToggle = controls.querySelector('.live-player-center-toggle');
    landingLiveControlToggle = controls.querySelector('.live-player-play-toggle');
    landingLiveTimeline = controls.querySelector('.live-player-timeline');
    landingLiveTimelineLabel = controls.querySelector('.live-player-time');
    landingLiveMuteToggle = controls.querySelector('.live-player-mute-toggle');
    landingLiveVolumeSlider = controls.querySelector('.live-player-volume-slider');
    landingLiveFullscreenToggle?.addEventListener('click', openLandingLiveFullscreen);
    landingLiveCenterToggle?.addEventListener('click', () => {
      unlockLandingLiveAudio();
      setLandingLivePaused(!landingLivePaused, 'manual');
    });
    landingLiveControlToggle?.addEventListener('click', () => {
      unlockLandingLiveAudio();
      setLandingLivePaused(!landingLivePaused, 'manual');
    });
    landingLiveMuteToggle?.addEventListener('click', () => {
      setLandingLiveMuted(!landingLiveMuted);
    });
    landingLiveVolumeSlider?.addEventListener('input', () => {
      setLandingLiveVolume((Number(landingLiveVolumeSlider.value) || 0) / 100);
    });
    landingLiveTimeline?.addEventListener('pointerdown', () => {
      landingLiveTimelineDragging = true;
    });
    landingLiveTimeline?.addEventListener('input', () => {
      updateLandingLiveTimelineUi(true);
    });
    landingLiveTimeline?.addEventListener('change', () => {
      landingLiveTimelineDragging = false;
      jumpLandingLiveToLiveEdge();
    });
    landingLiveTimeline?.addEventListener('pointerup', () => {
      landingLiveTimelineDragging = false;
      jumpLandingLiveToLiveEdge();
    });
  } else if (canvasWrap instanceof HTMLElement) {
    landingLiveFullscreenToggle = canvasWrap.querySelector('.live-player-fullscreen-toggle');
    landingLiveCenterToggle = canvasWrap.querySelector('.live-player-center-toggle');
    landingLiveControlToggle = canvasWrap.querySelector('.live-player-play-toggle');
    landingLiveTimeline = canvasWrap.querySelector('.live-player-timeline');
    landingLiveTimelineLabel = canvasWrap.querySelector('.live-player-time');
    landingLiveMuteToggle = canvasWrap.querySelector('.live-player-mute-toggle');
    landingLiveVolumeSlider = canvasWrap.querySelector('.live-player-volume-slider');
  }
  updateLandingLiveControlsUi();
  updateLandingLiveVolumeUi();
  updateLandingLivePauseUi();
}

function toggleMenu(forceOpen) {
  if (!nav || !mobileToggle) return;
  const nextState = typeof forceOpen === 'boolean' ? forceOpen : !nav.classList.contains('is-open');
  nav.classList.toggle('is-open', nextState);
  document.body.classList.toggle('menu-open', nextState);
  mobileToggle.setAttribute('aria-expanded', String(nextState));
  mobileToggle.classList.toggle('is-open', nextState);
}

function setActiveNavSection(sectionId) {
  const nextId = String(sectionId || '').trim();
  if (!nextId || activeNavSectionId === nextId) return;
  activeNavSectionId = nextId;
  for (const item of navSectionTargets) {
    const isActive = item.id === nextId;
    item.link.classList.toggle('is-active', isActive);
    if (isActive) item.link.setAttribute('aria-current', 'page');
    else item.link.removeAttribute('aria-current');
  }
}

mobileToggle?.addEventListener('click', () => {
  toggleMenu();
});

for (const item of navSectionTargets) {
  item.link.addEventListener('click', () => {
    setActiveNavSection(item.id);
    toggleMenu(false);
  });
}

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  }
}, { threshold: 0.18 });

for (const node of revealNodes) {
  revealObserver.observe(node);
}

const navSpyObserver = new IntersectionObserver((entries) => {
  const visibleEntries = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
  if (!visibleEntries.length) return;
  const nextTarget = visibleEntries[0]?.target;
  if (!(nextTarget instanceof HTMLElement) || !nextTarget.id) return;
  setActiveNavSection(nextTarget.id);
}, {
  root: null,
  rootMargin: '-22% 0px -52% 0px',
  threshold: [0.2, 0.35, 0.5, 0.7],
});

for (const item of navSectionTargets) {
  navSpyObserver.observe(item.target);
}

setActiveNavSection(window.location.hash ? window.location.hash.slice(1) : 'top');

function getHubUrl(tabId) {
  const nextTab = HUB_TABS.has(String(tabId || '').trim().toLowerCase()) ? String(tabId).trim().toLowerCase() : 'play';
  return nextTab === 'play' ? '/play' : `/play?tab=${encodeURIComponent(nextTab)}`;
}

function scrollToBattleHub() {
  const section = document.getElementById('play');
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setActiveHubTab(tabId, { updateFrame = true, scrollIntoView = false } = {}) {
  const nextTab = HUB_TABS.has(String(tabId || '').trim().toLowerCase()) ? String(tabId).trim().toLowerCase() : 'play';
  activeHubTab = nextTab;
  for (const button of Array.from(document.querySelectorAll('[data-hub-tab]'))) {
    const isActive = String(button.getAttribute('data-hub-tab') || '').trim().toLowerCase() === nextTab;
    if (button.tagName === 'BUTTON') button.classList.toggle('active', isActive);
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
  }
  if (hubTabTitle) hubTabTitle.textContent = hubTabMeta[nextTab]?.title || 'Play';
  if (hubTabDescription) hubTabDescription.textContent = hubTabMeta[nextTab]?.description || '';
  if (updateFrame && hubFrame) {
    const nextUrl = getHubUrl(nextTab);
    const currentUrl = String(hubFrame.getAttribute('src') || '').trim();
    if (currentUrl !== nextUrl) {
      hubLoading?.classList.remove('is-hidden');
      hubFrame.setAttribute('src', nextUrl);
    }
  }
  if (scrollIntoView) scrollToBattleHub();
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const trigger = target.closest('[data-hub-tab]');
  if (!(trigger instanceof Element)) return;
  const nextTab = String(trigger.getAttribute('data-hub-tab') || '').trim().toLowerCase();
  if (!HUB_TABS.has(nextTab)) return;
  event.preventDefault();
  toggleMenu(false);
  setActiveHubTab(nextTab, { updateFrame: true, scrollIntoView: true });
});

hubFrame?.addEventListener('load', () => {
  hubLoading?.classList.add('is-hidden');
});

setActiveHubTab('play', { updateFrame: false, scrollIntoView: false });
composeLandingLiveLayout();
setLandingLivePaused(true, 'initial');

function getLandingCommentaryVoice() {
  if (!landingCommentarySpeech.supported) return null;
  const voices = Array.isArray(window.speechSynthesis?.getVoices?.()) ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return null;
  const maleNamePattern = /(pavel|aleks|alex|dmit|denis|ivan|nikol|maks|maxim|serg|mikhail|mihail|yuri|юр|иван|павел|дмит|алекс|серг|миха)/i;
  return voices.find((voice) => /^ru(-|_|$)/i.test(String(voice.lang || '')) && maleNamePattern.test(String(voice.name || '')))
    || voices.find((voice) => /russian/i.test(String(voice.name || '')) && maleNamePattern.test(String(voice.name || '')))
    || voices.find((voice) => /^ru(-|_|$)/i.test(String(voice.lang || '')))
    || voices.find((voice) => /russian/i.test(String(voice.name || '')))
    || voices[0]
    || null;
}

function renderLandingCommentaryVoiceUi() {
  if (landingCommentaryVoiceToggle) {
    landingCommentaryVoiceToggle.disabled = !landingCommentarySpeech.supported;
    landingCommentaryVoiceToggle.classList.toggle('is-active', landingCommentarySpeech.supported && landingCommentarySpeech.enabled);
    landingCommentaryVoiceToggle.textContent = landingCommentarySpeech.supported && landingCommentarySpeech.enabled ? 'Озвучка: вкл' : 'Озвучка: выкл';
  }
  if (landingCommentaryVoiceStatus) {
    landingCommentaryVoiceStatus.textContent = !landingCommentarySpeech.supported
      ? 'Браузер не дал speech synthesis для озвучки.'
      : (landingCommentarySpeech.enabled ? 'Комментатор на главной говорит вслух.' : 'Нажми, чтобы включить озвучку комментатора на главной.');
  }
}

function setLandingCommentaryVoiceEnabled(enabled) {
  landingCommentarySpeech.enabled = Boolean(enabled) && landingCommentarySpeech.supported;
  try {
    localStorage.setItem(LANDING_COMMENTARY_TTS_KEY, landingCommentarySpeech.enabled ? '1' : '0');
  } catch {
    // ignore storage failures
  }
  if (landingCommentarySpeech.pendingTimer) {
    window.clearTimeout(landingCommentarySpeech.pendingTimer);
    landingCommentarySpeech.pendingTimer = 0;
  }
  if (!landingCommentarySpeech.enabled && landingCommentarySpeech.supported) {
    landingCommentarySpeech.seq += 1;
    landingCommentarySpeech.activeSinceAt = 0;
    landingCommentarySpeech.lastQueuedText = '';
    landingCommentarySpeech.activeKey = '';
    landingCommentarySpeech.activeText = '';
    landingCommentarySpeech.queue = [];
    window.speechSynthesis.cancel();
  }
  renderLandingCommentaryVoiceUi();
}

function normalizeLandingSpeechKeyPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b[a-z0-9]{5,8}\b/g, '#room')
    .replace(/\b\d{1,2}:\d{2}\b/g, '#time')
    .replace(/\b\d+(?:[.,]\d+)?\b/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

function pluralizeLandingSeconds(value) {
  const n = Math.max(0, Math.abs(Number(value) || 0));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'секунда';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'секунды';
  return 'секунд';
}

function expandLandingSpeechText(value) {
  return String(value || '')
    .replace(/(\d+)\s*с\b/gi, (_, raw) => `${raw} ${pluralizeLandingSeconds(raw)}`)
    .replace(/(\d+)\s*sec\b/gi, (_, raw) => `${raw} ${pluralizeLandingSeconds(raw)}`)
    .replace(/Lv\s*(\d+)/gi, 'уровень $1');
}

function pluralizeLandingSeconds(value) {
  const n = Math.max(0, Math.abs(Number(value) || 0));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '\u0441\u0435\u043a\u0443\u043d\u0434\u0430';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return '\u0441\u0435\u043a\u0443\u043d\u0434\u044b';
  return '\u0441\u0435\u043a\u0443\u043d\u0434';
}

function expandLandingSpeechText(value) {
  return String(value || '')
    .replace(/(\d+)\s*[сc](?=[\s.,!?;:)]|$)/giu, (_, raw) => `${raw} ${pluralizeLandingSeconds(raw)}`)
    .replace(/(\d+)\s*sec\b/gi, (_, raw) => `${raw} ${pluralizeLandingSeconds(raw)}`)
    .replace(/Lv\s*(\d+)/gi, '\u0443\u0440\u043e\u0432\u0435\u043d\u044c $1');
}

function isLandingCommentaryUrgent(key, spokenText) {
  const sample = `${String(key || '')} ${String(spokenText || '')}`.toLowerCase();
  return /final_death|death|boss|downed|respawn|critical|low hp|нокаут|нокдаун|умер|смерт|босс/.test(sample);
}

function flushLandingCommentarySpeechQueue() {
  if (!landingCommentarySpeech.supported || !landingCommentarySpeech.enabled || document.hidden) return;
  if (landingCommentarySpeech.pendingTimer) return;
  if (landingCommentarySpeech.activeText) return;
  if (!landingCommentarySpeech.queue.length) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    landingCommentarySpeech.pendingTimer = window.setTimeout(() => {
      landingCommentarySpeech.pendingTimer = 0;
      flushLandingCommentarySpeechQueue();
    }, 80);
    return;
  }
  const nextItem = landingCommentarySpeech.queue.shift();
  if (!nextItem?.text) return;
  const { key, text: queuedText } = nextItem;
  const spokenText = expandLandingSpeechText(queuedText);
  const speakSeq = ++landingCommentarySpeech.seq;
  landingCommentarySpeech.activeSinceAt = Date.now();
  landingCommentarySpeech.activeKey = key || '';
  landingCommentarySpeech.activeText = spokenText;
  const voice = getLandingCommentaryVoice();
  const utterance = new SpeechSynthesisUtterance(spokenText);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'ru-RU';
  } else {
    utterance.lang = 'ru-RU';
  }
  utterance.rate = 2.36;
  utterance.pitch = 0.94;
  utterance.volume = Math.max(0, Math.min(1, 0.9 * getLandingLiveEffectiveVolume()));
  utterance.onstart = () => {
    if (speakSeq !== landingCommentarySpeech.seq) return;
    landingCommentarySpeech.lastSpokenAt = Date.now();
  };
  utterance.onend = () => {
    if (speakSeq !== landingCommentarySpeech.seq) return;
    landingCommentarySpeech.activeSinceAt = 0;
    landingCommentarySpeech.activeKey = '';
    landingCommentarySpeech.activeText = '';
    window.setTimeout(flushLandingCommentarySpeechQueue, 40);
  };
  utterance.onerror = () => {
    if (speakSeq !== landingCommentarySpeech.seq) return;
    landingCommentarySpeech.activeSinceAt = 0;
    landingCommentarySpeech.activeKey = '';
    landingCommentarySpeech.activeText = '';
    window.setTimeout(flushLandingCommentarySpeechQueue, 40);
  };
  try {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  } catch {
    landingCommentarySpeech.activeSinceAt = 0;
    landingCommentarySpeech.activeKey = '';
    landingCommentarySpeech.activeText = '';
    return;
  }
}

function maybeSpeakLandingCommentary(title, text, roomCode = '') {
  if (!landingCommentarySpeech.supported || !landingCommentarySpeech.enabled || document.hidden) return;
  const spokenText = expandLandingSpeechText(`${String(title || '').trim()}. ${String(text || '').trim()}`.trim());
  if (!spokenText) return;
  const silentFallbackPattern = /сейчас в эфире тишина|эфир есть, камеры рядом нет|arena took a smoke break|signal lost/i;
  if (silentFallbackPattern.test(spokenText)) return;
  const key = [
    String(roomCode || '').trim().toUpperCase(),
    normalizeLandingSpeechKeyPart(title),
    normalizeLandingSpeechKeyPart(text),
  ].join('|');
  const now = Date.now();
  const recentAt = Math.max(0, Number(landingCommentarySpeech.recentKeys.get(key)) || 0);
  if (recentAt && (now - recentAt) < 14000) return;
  if (landingCommentarySpeech.activeKey === key) return;
  if (landingCommentarySpeech.queue.some((item) => item?.key === key)) return;
  const urgent = isLandingCommentaryUrgent(key, spokenText);
  landingCommentarySpeech.lastKey = key;
  landingCommentarySpeech.lastQueuedText = spokenText;
  landingCommentarySpeech.recentKeys.set(key, now);
  for (const [recentKey, stamp] of landingCommentarySpeech.recentKeys.entries()) {
    if ((now - Math.max(0, Number(stamp) || 0)) > 45000) landingCommentarySpeech.recentKeys.delete(recentKey);
  }
  if (landingCommentarySpeech.recentKeys.size > 32) {
    const oldestKey = landingCommentarySpeech.recentKeys.keys().next().value;
    if (oldestKey) landingCommentarySpeech.recentKeys.delete(oldestKey);
  }
  if (urgent) {
    landingCommentarySpeech.queue = [{ key, text: spokenText }];
    if (landingCommentarySpeech.activeText) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancel failures
      }
      landingCommentarySpeech.activeSinceAt = 0;
      landingCommentarySpeech.activeKey = '';
      landingCommentarySpeech.activeText = '';
    }
  } else if (landingCommentarySpeech.activeText) {
    landingCommentarySpeech.queue = [{ key, text: spokenText }];
  } else {
    landingCommentarySpeech.queue.push({ key, text: spokenText });
    if (landingCommentarySpeech.queue.length > 2) {
      landingCommentarySpeech.queue.splice(0, landingCommentarySpeech.queue.length - 2);
    }
  }
  if (landingCommentarySpeech.pendingTimer) {
    window.clearTimeout(landingCommentarySpeech.pendingTimer);
    landingCommentarySpeech.pendingTimer = 0;
  }
  landingCommentarySpeech.pendingTimer = window.setTimeout(() => {
    landingCommentarySpeech.pendingTimer = 0;
    flushLandingCommentarySpeechQueue();
  }, urgent ? 10 : 25);
}

function buildLiveSpectatorUrl(roomCode) {
  const normalizedRoomCode = String(roomCode || '').trim().toUpperCase();
  const url = new URL('/play', window.location.origin);
  if (normalizedRoomCode) {
    url.searchParams.set('room', normalizedRoomCode);
    url.searchParams.set('mode', 'spectate');
  }
  return url.toString();
}

function updateLandingFullscreenButtonLabel() {
  if (!(liveSecondaryLink instanceof HTMLElement)) return;
  const isFullscreen = document.fullscreenElement === landingLiveCanvasWrap;
  liveSecondaryLink.textContent = isFullscreen ? 'Свернуть экран' : 'На весь экран';
}

function openLandingLiveFullscreen(event) {
  if (event) event.preventDefault();
  if (!(landingLiveCanvasWrap instanceof HTMLElement)) return;
  if (document.fullscreenElement === landingLiveCanvasWrap) {
    void document.exitFullscreen?.();
    return;
  }
  void landingLiveCanvasWrap.requestFullscreen?.();
}

function updateLandingFullscreenButtonLabel() {
  const isFullscreen = document.fullscreenElement === landingLiveCanvasWrap;
  if (liveSecondaryLink instanceof HTMLElement) {
    liveSecondaryLink.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
  }
  if (landingLiveFullscreenToggle instanceof HTMLButtonElement) {
    landingLiveFullscreenToggle.classList.toggle('is-exit', isFullscreen);
    landingLiveFullscreenToggle.setAttribute('aria-label', isFullscreen ? 'Exit live fullscreen' : 'Open live fullscreen');
    landingLiveFullscreenToggle.title = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
  }
}

liveSecondaryLink?.addEventListener('click', openLandingLiveFullscreen);
document.addEventListener('fullscreenchange', updateLandingFullscreenButtonLabel);
updateLandingFullscreenButtonLabel();
landingCommentaryVoiceToggle?.addEventListener('click', () => {
  setLandingCommentaryVoiceEnabled(!landingCommentarySpeech.enabled);
});
if (landingCommentarySpeech.supported) {
  if (typeof window.speechSynthesis?.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', renderLandingCommentaryVoiceUi);
  } else {
    window.speechSynthesis.onvoiceschanged = renderLandingCommentaryVoiceUi;
  }
}
renderLandingCommentaryVoiceUi();

window.setInterval(() => {
  if (!landingCommentarySpeech.supported || !landingCommentarySpeech.enabled) return;
  const activeForMs = Date.now() - Math.max(0, landingCommentarySpeech.activeSinceAt || 0);
  const speechBusy = Boolean(window.speechSynthesis.speaking || window.speechSynthesis.pending);
  if (landingCommentarySpeech.activeText && !speechBusy && activeForMs > 1200) {
    landingCommentarySpeech.activeSinceAt = 0;
    landingCommentarySpeech.activeKey = '';
    landingCommentarySpeech.activeText = '';
    flushLandingCommentarySpeechQueue();
    return;
  }
  if (landingCommentarySpeech.activeText && speechBusy && activeForMs > 25000) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore cancel failures
    }
    landingCommentarySpeech.activeSinceAt = 0;
    landingCommentarySpeech.activeKey = '';
    landingCommentarySpeech.activeText = '';
    window.setTimeout(flushLandingCommentarySpeechQueue, 60);
  }
}, 1200);

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setLandingCommentaryRuntime(title, text, eventKey = 'generic', cooldownMs = 5000) {
  const now = Date.now();
  const key = String(eventKey || 'generic').trim().toLowerCase();
  const lastAt = Math.max(0, Number(landingCommentaryState.lastEventAt.get(key)) || 0);
  if (cooldownMs > 0 && now - lastAt < cooldownMs) return null;
  const nextTitle = String(title || '').trim();
  const nextText = String(text || '').trim();
  if (!nextTitle || !nextText) return null;
  landingCommentaryState.lastEventAt.set(key, now);
  return { title: nextTitle, text: nextText };
}

function getExtraLandingCommentaryVariants(eventKey = 'generic') {
  const key = String(eventKey || 'generic').toLowerCase();
  if (key.includes('boss_countdown')) return [
    { title: 'Босс уже почти в эфире.', text: 'Последние секунды перед большим разговором. Игроки делают вид, что это просто ещё один рабочий момент.' },
    { title: 'Отсчёт звучит неприятно бодро.', text: 'Арена заранее предупреждает, чтобы паника успела красиво уложиться в кадр.' },
    { title: 'До начальства рукой подать.', text: 'Если у кого-то есть план, ему пора перестать быть абстрактным понятием.' },
    { title: 'Портал готовит крупную неприятность.', text: 'Зрители устраиваются удобнее, игроки мысленно ищут выход, но выход сегодня занят.' },
  ];
  if (key.includes('kills_') || key.includes('kill_milestone')) return [
    { title: 'Счётчик врагов растёт бодро.', text: 'Матч производит опыт, шум и уверенность, которая может закончиться в любой неудобный момент.' },
    { title: 'Темп убийств держится спортивный.', text: 'Арена выглядит как отчёт о переработке проблем, только с более громкими спецэффектами.' },
    { title: 'Враги уходят пачками.', text: 'Комментатор сохраняет профессионализм, но внутри уже хлопает в ладоши.' },
    { title: 'На табло снова красивые цифры.', text: 'Цифры красивые, ситуация спорная, зрелище отличное. Всё как мы любим.' },
  ];
  if (key.includes('low_hp')) return [
    { title: 'HP просело до драматургии.', text: 'Полоска здоровья сейчас такая тонкая, что её можно использовать как сюжетный поворот.' },
    { title: 'Кто-то живёт на вдохе.', text: 'Очень хрупкий момент: один неверный шаг, и комментатору придётся доставать траурный сарказм.' },
    { title: 'Здоровье ушло в режим экономии.', text: 'Аптечки в такие моменты выглядят не предметом, а религиозной надеждой.' },
  ];
  if (key.includes('threat_up')) return [
    { title: 'Угроза снова полезла вверх.', text: 'Матч решил, что зрителям слишком спокойно. Смелая позиция, неприятная реализация.' },
    { title: 'Арена добавила давления.', text: 'Теперь всё то же самое, только быстрее, злее и с меньшим уважением к личному пространству.' },
    { title: 'Сложность прибавила характер.', text: 'Игроки держатся, но арена явно хочет перейти на разговор повышенным уроном.' },
  ];
  if (key.includes('pulse')) return [
    { title: 'Эфир всё ещё живой.', text: 'Матч держится на упрямстве, реакции и небольшом количестве решений, которые лучше не разбирать после игры.' },
    { title: 'Забег набрал стаж.', text: 'Это уже не короткий бой, это отношения с ареной: громкие, нервные и почему-то продолжаются.' },
    { title: 'Время идёт, шоу не сдаётся.', text: 'Комментатор уважает такую стойкость. Арена, судя по всему, воспринимает её как личный вызов.' },
  ];
  return [];
}

function pickLandingCommentaryVariant(options, eventKey = 'generic', cooldownMs = 5000) {
  const list = [...(Array.isArray(options) ? options.filter(Boolean) : []), ...getExtraLandingCommentaryVariants(eventKey)];
  if (!list.length) return null;
  const selected = list[Math.floor(Math.random() * list.length)] || null;
  if (!selected) return null;
  return setLandingCommentaryRuntime(selected.title, selected.text, eventKey, cooldownMs);
}

function getLandingCommentaryPlayerLabel(featuredRun) {
  const previewPlayers = Array.isArray(featuredRun?.preview?.players) ? featuredRun.preview.players : [];
  const namedPlayers = previewPlayers
    .map((player) => String(player?.name || '').trim())
    .filter(Boolean);
  if (namedPlayers.length > 0) {
    const selected = namedPlayers[Math.floor(Math.random() * namedPlayers.length)] || namedPlayers[0];
    return `Игрок ${selected}`;
  }
  return 'Один из бойцов';
}

function personalizeLandingCommentary(commentary, featuredRun) {
  if (!commentary || !featuredRun) return commentary;
  const roomCode = String(featuredRun?.code || '').trim();
  if (!roomCode) return commentary;
  const playerLabel = getLandingCommentaryPlayerLabel(featuredRun);
  const replaceRoomMentions = (value) => String(value || '')
    .replaceAll(`PvP-комната ${roomCode}`, playerLabel)
    .replaceAll(`PvP-\u0420\u0454\u0420\u0455\u0420\u0458\u0420\u0405\u0420\u00b0\u0421\u201a\u0420\u00b0 ${roomCode}`, playerLabel)
    .replaceAll(`Комната ${roomCode}`, playerLabel)
    .replaceAll(`\u0420\u0459\u0420\u0455\u0420\u0458\u0420\u0405\u0420\u00b0\u0421\u201a\u0420\u00b0 ${roomCode}`, playerLabel)
    .replaceAll(roomCode, playerLabel);
  return {
    ...commentary,
    title: replaceRoomMentions(commentary.title),
    text: replaceRoomMentions(commentary.text),
  };
}

function formatNewsDate(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return 'Свежий апдейт';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(stamp);
}

function formatShortDateTime(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(stamp);
}

function formatProfileDateTime(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(stamp);
}

function formatDurationSec(value) {
  return `${Math.max(0, Number(value) || 0)}s`;
}

function formatRunGameModeLabel(run) {
  const raw = String(run?.runDetails?.gameMode || '').trim().toLowerCase();
  if (raw === 'hardcore') return '\u0425\u0430\u0440\u0434\u043a\u043e\u0440';
  if (raw === 'normal') return '\u041e\u0431\u044b\u0447\u043d\u044b\u0439';
  if (raw === 'pvp') return 'PvP';
  return '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439';
}

function formatRunHeroLabel(run) {
  const raw = String(run?.runDetails?.heroId || run?.runDetails?.playerClass || '').trim().toLowerCase();
  if (!raw) return '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u044b\u0439 \u0433\u0435\u0440\u043e\u0439';
  if (HERO_LABELS[raw]) return HERO_LABELS[raw];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatRunAgo(value) {
  const stamp = Number(value) || 0;
  if (!stamp) return '\u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e';
  const diffSec = Math.max(0, Math.round((Date.now() - stamp) / 1000));
  if (diffSec < 60) return `${diffSec || 1} \u0441\u0435\u043a. \u043d\u0430\u0437\u0430\u0434`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} \u043c\u0438\u043d. \u043d\u0430\u0437\u0430\u0434`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} \u0447. \u043d\u0430\u0437\u0430\u0434`;
  return `${Math.floor(diffSec / 86400)} \u0434. \u043d\u0430\u0437\u0430\u0434`;
}

function formatLiveDuration(value) {
  const totalSec = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatLiveUpdatedLabel(value) {
  const stamp = Math.max(0, Number(value) || 0);
  if (!stamp) return '\u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e';
  const diffSec = Math.max(0, Math.round((Date.now() - stamp) / 1000));
  if (diffSec < 4) return '\u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e';
  if (diffSec < 60) return `${diffSec} \u0441\u0435\u043a. \u043d\u0430\u0437\u0430\u0434`;
  return `${Math.floor(diffSec / 60)} \u043c\u0438\u043d. \u043d\u0430\u0437\u0430\u0434`;
}

function pickLandingCommentary(featuredRun, payload) {
  if (!featuredRun?.preview) {
    if (Math.max(0, Number(payload?.activeRuns) || 0) > 0) {
      return {
        title: 'Эфир есть, камеры рядом нет.',
        text: 'Матчи уже идут, просто этот сервер сегодня играет в скромность. Пока можно посмотреть свежий реплей и сделать вид, что так и задумано.',
      };
    }
    return {
      title: 'Арена взяла перекур.',
      text: 'Сейчас в эфире тишина. Подозрительно, но временно. Первый же смельчак разбудит этот блок.',
    };
  }

  const players = Math.max(0, Number(featuredRun.players) || 0);
  const kills = Math.max(0, Number(featuredRun.totalEnemyKills) || 0);
  const difficulty = Math.max(1, Number(featuredRun.roomDifficulty?.level) || 1);
  const bossAlive = Boolean(featuredRun.bossAlive);
  const mode = String(featuredRun.gameMode || '').toLowerCase();

  if (bossAlive) {
    return {
      title: 'На арене босс. Всем сделать страшные лица.',
      text: `Комната ${featuredRun.code} уже дожила до босса, а значит у игроков закончилась спокойная жизнь и началась настоящая работа по выживанию.`,
    };
  }
  if (mode === 'pvp' && players >= 4) {
    return {
      title: 'Люди снова решили, что друг другу они главные монстры.',
      text: `PvP-комната ${featuredRun.code} уже собрала ${players} игроков. Вежливость отменена, сарказм и хэдшоты включены.`,
    };
  }
  if (difficulty >= 7) {
    return {
      title: 'Угроза уже выросла, а здравый смысл нет.',
      text: `Текущая катка держится достаточно долго, чтобы игра начала душить красиво: уровень угрозы уже ${difficulty}, а мобам всё ещё мало.`,
    };
  }
  if (kills >= 40) {
    return {
      title: 'Карта уже завалена трофеями и плохими решениями.',
      text: `В этой комнате набили уже ${kills} киллов. До босса рукой подать, если руку не откусит следующая волна.`,
    };
  }
  if (players >= 3) {
    return {
      title: 'Пати жива. Сомнительно, но пока жива.',
      text: `В эфире ${players} игрока, и они всё ещё не развалились. Для Crimson Wars это уже звучит как дисциплина и маленькое чудо.`,
    };
  }
  return {
    title: 'Один герой, толпа чудовищ и ноль уважения к рискам.',
    text: `Комната ${featuredRun.code} пока выглядит как классический забег на упрямстве: одинокий темп, растущая угроза и явное нежелание уходить живым пораньше.`,
  };
}

function pickLandingCommentaryLive(featuredRun, payload) {
  if (!featuredRun?.preview) {
    landingCommentaryState.roomCode = '';
    landingCommentaryState.lastEventAt.clear();
    landingCommentaryState.lastPlayers = 0;
    landingCommentaryState.lastKills = 0;
    landingCommentaryState.lastThreatLevel = 1;
    landingCommentaryState.lastBossAlive = false;
    landingCommentaryState.lastBossCountdownBucket = 0;
    landingCommentaryState.lastLowHpCount = 0;
    landingCommentaryState.lastDownedCount = 0;
    landingCommentaryState.lastKillMilestone = 0;
    landingCommentaryState.lastPulseBucket = 0;
    return pickLandingCommentary(featuredRun, payload);
  }

  const players = Math.max(0, Number(featuredRun.players) || 0);
  const kills = Math.max(0, Number(featuredRun.totalEnemyKills) || 0);
  const difficulty = Math.max(1, Number(featuredRun.roomDifficulty?.level) || 1);
  const bossAlive = Boolean(featuredRun.bossAlive);
  const mode = String(featuredRun.gameMode || '').toLowerCase();
  const preview = featuredRun.preview || {};
  const previewPlayers = Array.isArray(preview.players) ? preview.players : [];
  const now = Math.max(0, Number(preview.now) || Number(payload?.now) || Date.now());
  const startedAt = Math.max(0, Number(featuredRun.startedAt) || now);
  const matchSec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const lowHpCount = previewPlayers.filter((player) => {
    const hp = Math.max(0, Number(player?.hp) || 0);
    const maxHp = Math.max(1, Number(player?.maxHp) || 1);
    return hp > 0 && (hp / maxHp) <= 0.35;
  }).length;
  const downedCount = previewPlayers.filter((player) => Math.max(0, Number(player?.hp) || 0) <= 0).length;
  const bossEtaMs = Math.max(0, Number(preview.nextBossSpawnAt) || 0) - now;
  const bossEtaSec = bossAlive ? 0 : Math.max(0, Math.ceil(bossEtaMs / 1000));
  const bossCountdownBucket = bossAlive ? 0 : (bossEtaSec <= 4 ? 4 : bossEtaSec <= 8 ? 8 : bossEtaSec <= 14 ? 14 : 0);
  const killMilestone = Math.floor(kills / 10);
  const pulseBucket = Math.floor(matchSec / 18);
  const roomCode = String(featuredRun.code || '').trim().toUpperCase();

  if (landingCommentaryState.roomCode !== roomCode) {
    landingCommentaryState.roomCode = roomCode;
    landingCommentaryState.lastEventAt.clear();
    landingCommentaryState.lastPlayers = players;
    landingCommentaryState.lastKills = kills;
    landingCommentaryState.lastThreatLevel = difficulty;
    landingCommentaryState.lastBossAlive = bossAlive;
    landingCommentaryState.lastBossCountdownBucket = bossCountdownBucket;
    landingCommentaryState.lastLowHpCount = lowHpCount;
    landingCommentaryState.lastDownedCount = downedCount;
    landingCommentaryState.lastKillMilestone = killMilestone;
    landingCommentaryState.lastPulseBucket = pulseBucket;
  }

  if (!landingCommentaryState.lastBossAlive && bossAlive) {
    landingCommentaryState.lastBossAlive = bossAlive;
    return pickLandingCommentaryVariant([
      {
        title: 'Босс уже на сцене. Всем сделать страшные лица.',
        text: `Комната ${featuredRun.code} дошла до той части шоу, где игра перестаёт шутить и начинает проверять, кто тут герой, а кто просто удачно бегал кругами.`,
      },
      {
        title: 'На арену вышло начальство.',
        text: `Босс уже в эфире, а значит у игроков закончилась спокойная жизнь и началась полноценная работа по выживанию под давлением.`,
      },
    ], 'boss_spawn', 9000) || pickLandingCommentary(featuredRun, payload);
  }

  if (bossCountdownBucket > 0 && bossCountdownBucket !== landingCommentaryState.lastBossCountdownBucket) {
    landingCommentaryState.lastBossCountdownBucket = bossCountdownBucket;
    const eventCommentary = pickLandingCommentaryVariant([
      {
        title: `До босса около ${bossEtaSec} секунд.`,
        text: 'Паника пока ещё добровольная, но матч уже уверенно подталкивает игроков к очень нервным решениям.',
      },
      {
        title: `Босс почти у двери: ${bossEtaSec}с.`,
        text: 'Тем, кто хотел ещё немного спокойно пофармить, пора признать очевидное: спокойствие здесь было временной ошибкой.',
      },
    ], `boss_countdown_${bossCountdownBucket}`, 3200);
    if (eventCommentary) return eventCommentary;
  } else if (!bossAlive) {
    landingCommentaryState.lastBossCountdownBucket = bossCountdownBucket;
  }

  if (downedCount > landingCommentaryState.lastDownedCount) {
    landingCommentaryState.lastDownedCount = downedCount;
    const eventCommentary = pickLandingCommentaryVariant([
      {
        title: 'На арене пошли падения без лишней скромности.',
        text: `Сейчас лежат уже ${downedCount}. Команда тестирует старый принцип: сначала рискуем, потом героически разгребаем последствия.`,
      },
      {
        title: 'Кто-то прилёг прямо в прямом эфире.',
        text: `Минус вертикальное положение у ${downedCount} бойцов. Красиво, тревожно и очень по-кримсоновски.`,
      },
    ], 'downed_players', 4200);
    if (eventCommentary) return eventCommentary;
  } else {
    landingCommentaryState.lastDownedCount = downedCount;
  }

  if (lowHpCount > landingCommentaryState.lastLowHpCount) {
    landingCommentaryState.lastLowHpCount = lowHpCount;
    const eventCommentary = pickLandingCommentaryVariant([
      {
        title: 'HP просел, улыбки тоже.',
        text: `На грани уже ${lowHpCount} игроков. Полоска здоровья снова напоминает, что она здесь не для декора, а для драм.`,
      },
      {
        title: 'Пошёл режим “живём на честном слове”.',
        text: `С низким HP сейчас ${lowHpCount} бойцов. Аптечки снова выглядят как политическое обещание: хочется верить, но гарантий никаких.`,
      },
    ], 'low_hp_spike', 4000);
    if (eventCommentary) return eventCommentary;
  } else {
    landingCommentaryState.lastLowHpCount = lowHpCount;
  }

  if (players !== landingCommentaryState.lastPlayers && landingCommentaryState.lastPlayers > 0) {
    const morePlayers = players > landingCommentaryState.lastPlayers;
    landingCommentaryState.lastPlayers = players;
    const eventCommentary = morePlayers
      ? pickLandingCommentaryVariant([
          {
            title: 'В эфир влетели новые лица.',
            text: `Теперь в комнате ${players} игроков. Отлично: шансов на координацию чуть больше, а на хаос всё ещё значительно больше.`,
          },
          {
            title: 'Комната стала многолюднее и подозрительнее.',
            text: `Состав вырос до ${players} человек. У арены появился свежий материал для ошибок, спасений и зрительских вздохов.`,
          },
        ], 'players_up', 5000)
      : pickLandingCommentaryVariant([
          {
            title: 'Состав проредило без благодарственной речи.',
            text: `Игроков осталось ${players}. Комната стала тише, но безопаснее от этого, как обычно, не стала.`,
          },
          {
            title: 'Нас стало меньше, нервов тоже.',
            text: `Сейчас в эфире ${players} игроков. Арена методично сокращает штат добровольцев на эту мясорубку.`,
          },
        ], 'players_down', 5000);
    if (eventCommentary) return eventCommentary;
  }

  if (difficulty > landingCommentaryState.lastThreatLevel) {
    landingCommentaryState.lastThreatLevel = difficulty;
    const eventCommentary = pickLandingCommentaryVariant([
      {
        title: `Угроза выросла до ${difficulty}.`,
        text: 'Матч решил, что участникам жилось слишком спокойно. Теперь враги злее, темп гуще, а права на расслабление больше не существует.',
      },
      {
        title: `Арена подкрутила давление до Lv${difficulty}.`,
        text: 'Игра снова инвестирует в стресс. Монстры получили повод верить в себя, а игроки получили ещё один повод сомневаться.',
      },
    ], 'threat_up', 6000);
    if (eventCommentary) return eventCommentary;
  }

  if (killMilestone > landingCommentaryState.lastKillMilestone && kills >= 10) {
    landingCommentaryState.lastKillMilestone = killMilestone;
    const eventCommentary = pickLandingCommentaryVariant([
      {
        title: `${kills} киллов уже в эфире.`,
        text: 'Счётчик монстров бодро растёт, а у арены всё ещё хватает наглости делать вид, что это только разминка.',
      },
      {
        title: `Комната уже насобирала ${kills} убийств.`,
        text: 'Темп хороший, манеры спорные, результат зрелищный. Именно ради этого люди и включают живые забеги.',
      },
      {
        title: `${kills} врагов убрано с повестки.`,
        text: 'Карта постепенно заполняется опытом, лутом и последствиями решений, принятых на повышенном адреналине.',
      },
    ], `kills_${killMilestone}`, 5200);
    if (eventCommentary) return eventCommentary;
  }

  if (pulseBucket > landingCommentaryState.lastPulseBucket) {
    landingCommentaryState.lastPulseBucket = pulseBucket;
    const eventCommentary = pickLandingCommentaryVariant([
      {
        title: `Матч держится уже ${matchSec} секунд.`,
        text: 'Для этой арены это уже полноценные отношения: много напряжения, мало доверия и ни капли стабильности.',
      },
      {
        title: `${matchSec} секунд чистого упрямства.`,
        text: `Комната ${featuredRun.code} пока не развалилась, и это уже звучит как серьёзное достижение с лёгким привкусом безрассудства.`,
      },
      {
        title: 'Эфир продолжает исправно поставлять драму.',
        text: `Забег живёт уже ${matchSec} секунд и всё ещё уверенно производит монстров, панику и крайне сомнительные, но эффектные решения.`,
      },
    ], `pulse_${pulseBucket}`, 6500);
    if (eventCommentary) return eventCommentary;
  }

  landingCommentaryState.lastPlayers = players;
  landingCommentaryState.lastKills = kills;
  landingCommentaryState.lastThreatLevel = difficulty;
  landingCommentaryState.lastBossAlive = bossAlive;
  landingCommentaryState.lastLowHpCount = lowHpCount;
  landingCommentaryState.lastDownedCount = downedCount;
  landingCommentaryState.lastKillMilestone = killMilestone;
  landingCommentaryState.lastPulseBucket = pulseBucket;

  if (mode === 'pvp' && players >= 4) {
    return {
      title: 'Люди снова решили, что главный монстр здесь кто-то из них.',
      text: `PvP-комната ${featuredRun.code} уже собрала ${players} игроков. Вежливость отключена, сарказм и хэдшоты включены.`,
    };
  }

  return pickLandingCommentary(featuredRun, payload);
}

function buildReplayUrl(run) {
  const id = Math.max(0, Number(run?.id) || 0);
  const url = new URL('/play', window.location.origin);
  if (id > 0) {
    url.searchParams.set('replay', String(id));
    url.searchParams.set('replayPath', `/api/leaderboard/runs/${id}/replay`);
  }
  return url.toString();
}

function buildLatestRunsSignature(runs) {
  return (Array.isArray(runs) ? runs : [])
    .slice(0, 10)
    .map((run) => `${Math.max(0, Number(run?.id) || 0)}:${Math.max(0, Number(run?.at) || 0)}`)
    .join('|');
}

function renderLatestRunsPager() {
  if (!latestRunsPager) return;
  if (latestRunsTotalPages <= 1) {
    latestRunsPager.innerHTML = '';
    return;
  }
  latestRunsPager.innerHTML = `
    <button class="raid-pager-btn" type="button" data-runs-page-action="prev" ${latestRunsPage <= 1 ? 'disabled' : ''}>
      \u041d\u0430\u0437\u0430\u0434
    </button>
    <span class="raid-pager-status">\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430 ${latestRunsPage} \u0438\u0437 ${latestRunsTotalPages}</span>
    <button class="raid-pager-btn" type="button" data-runs-page-action="next" ${latestRunsPage >= latestRunsTotalPages ? 'disabled' : ''}>
      \u0412\u043f\u0435\u0440\u0451\u0434
    </button>
  `;
}

function formatRatingValue(item, categoryKey) {
  const value = Math.max(0, Number(item?.value) || 0);
  if (categoryKey === 'best_time_run') return `${value}s`;
  if (categoryKey === 'best_dps_run') return `${value.toFixed(2)} DPS`;
  if (categoryKey === 'profile_level') return `Lv${value}`;
  if (categoryKey === 'heroes_unlocked') return `${value} героев`;
  if (categoryKey === 'runs_count') return `${value} забегов`;
  if (categoryKey === 'shards_balance') return `${value} shards`;
  if (categoryKey === 'best_pvp_kills_run') return `${value} PvP`;
  return String(value);
}

function closeProfileModal() {
  if (!profileModal) return;
  profileModal.classList.add('hidden');
  profileModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('menu-open');
}

function openProfileModalShell(title) {
  if (!profileModal || !profileBody || !profileTitle) return;
  profileTitle.textContent = title;
  profileBody.innerHTML = 'Загрузка...';
  profileModal.classList.remove('hidden');
  profileModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('menu-open');
}

profileCloseBtn?.addEventListener('click', closeProfileModal);
profileModal?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.hasAttribute('data-profile-close')) closeProfileModal();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
    toggleMenu(false);
    return;
  }
  if (event.key === 'Escape' && profileModal && !profileModal.classList.contains('hidden')) {
    closeProfileModal();
  }
});

function renderProfile(profile, runPayload) {
  const publicHeroes = Array.isArray(profile?.heroStats) ? profile.heroStats : [];
  const runs = Array.isArray(runPayload?.runs) ? runPayload.runs : [];

  const heroesHtml = publicHeroes.length > 0
    ? publicHeroes.map((hero) => `
        <div class="landing-profile-row">
          <span>${escapeHtml(hero?.name || hero?.id || 'Hero')}</span>
          <span>Lv${Math.max(1, Number(hero?.level) || 1)}</span>
          <span>${Math.max(0, Number(hero?.runs) || 0)} runs | ${hero?.unlocked ? 'Unlocked' : 'Locked'}</span>
        </div>
      `).join('')
    : '<div class="landing-profile-empty">No hero data.</div>';

  const runsHtml = runs.length > 0
    ? runs.map((run) => `
        <div class="landing-profile-run">
          <div class="landing-profile-run-head">
            <span>${escapeHtml(formatShortDateTime(run?.at))}</span>
            <span>Room ${escapeHtml(run?.roomCode || '-')} | ${escapeHtml(formatRunGameModeLabel(run))}</span>
          </div>
          <div class="landing-profile-run-main">
            <span>${Math.max(0, Number(run?.kills) || 0)} kills</span>
            <span>${Math.max(0, Number(run?.score) || 0)} pts</span>
            <span>${escapeHtml(formatDurationSec(run?.durationSec))}</span>
            <span class="landing-profile-run-xp">XP ${Math.max(0, Number(run?.runDetails?.xp) || 0)}</span>
          </div>
        </div>
      `).join('')
    : '<div class="landing-profile-empty">Runs not found.</div>';

  return `
    <div class="landing-profile-card">
      <h3>Profile Lv${Math.max(1, Number(profile?.accountLevel) || 1)}</h3>
      <div class="landing-profile-meta">
        XP ${Math.max(0, Number(profile?.accountXp) || 0)}/${Math.max(0, Number(profile?.accountXpToNext) || 0)}
        | Skill points: ${Math.max(0, Number(profile?.accountSkillPoints) || 0)}
        | Shards: ${Math.max(0, Number(profile?.shards) || 0)}
        | Heroes: ${Math.max(0, Number(profile?.heroesUnlocked) || 0)}/${Math.max(0, Number(profile?.heroesTotal) || 0)}
        | Runs: ${Math.max(0, Number(profile?.totalRuns) || 0)}
      </div>
    </div>
    <div class="landing-profile-card">
      <h3>Account info</h3>
      <div class="landing-profile-meta">
        Created: ${escapeHtml(formatProfileDateTime(profile?.createdAt))}
        | Last login: ${escapeHtml(formatProfileDateTime(profile?.lastLoginAt))}
      </div>
    </div>
    <div class="landing-profile-card">
      <h3>Heroes</h3>
      <div class="landing-profile-heroes">${heroesHtml}</div>
    </div>
    <div class="landing-profile-card">
      <h3>Run history (${Math.max(0, Number(runPayload?.total) || runs.length)})</h3>
      <div class="landing-profile-runs">${runsHtml}</div>
    </div>
  `;
}

async function openPlayerProfile(playerId, fallbackName) {
  const id = Math.max(0, Number(playerId) || 0);
  if (!id || !profileBody || !profileTitle) return;
  openProfileModalShell(`Profile: ${String(fallbackName || `ID ${id}`)}`);
  try {
    const [profileResponse, runsResponse] = await Promise.all([
      fetch(`/api/player/public-profile/${id}`, { cache: 'no-store' }),
      fetch(`/api/player/public-profile/${id}/run-history?page=1&page_size=8`, { cache: 'no-store' }),
    ]);
    const profilePayload = await profileResponse.json().catch(() => ({}));
    const runsPayload = await runsResponse.json().catch(() => ({}));
    if (!profileResponse.ok || !profilePayload?.ok || !profilePayload?.profile) {
      throw new Error(profilePayload?.message || `HTTP ${profileResponse.status}`);
    }
    profileTitle.textContent = `Profile: ${String(profilePayload.profile?.nickname || fallbackName || `ID ${id}`)}`;
    const runData = runsResponse.ok && runsPayload?.ok
      ? {
          runs: Array.isArray(runsPayload.runs) ? runsPayload.runs : [],
          total: Math.max(0, Number(runsPayload.total) || 0),
        }
      : { runs: [], total: 0 };
    profileBody.innerHTML = renderProfile(profilePayload.profile, runData);
  } catch (error) {
    profileBody.innerHTML = `<div class="landing-profile-card">Не удалось загрузить профиль: ${escapeHtml(error?.message || 'Unknown error')}</div>`;
  }
}

function bindRatingProfileButtons() {
  if (!ratingsGrid) return;
  for (const button of Array.from(ratingsGrid.querySelectorAll('[data-rating-player]'))) {
    button.addEventListener('click', () => {
      const playerId = Math.max(0, Number(button.getAttribute('data-rating-player')) || 0);
      const nickname = String(button.textContent || '').trim();
      void openPlayerProfile(playerId, nickname);
    });
  }
}

function renderNews(items) {
  if (!newsGrid) return;
  if (!Array.isArray(items) || items.length === 0) {
    newsGrid.innerHTML = `
      <article class="news-card">
        <span class="news-meta">Пока тихо</span>
        <h3>Сводка еще не пролилась</h3>
        <p>Как только в игре появится свежий патч, этот блок первым поднимет боевую новость на поверхность.</p>
        <a href="#play" data-hub-tab="news">Открыть вкладку новостей</a>
      </article>
    `;
    return;
  }

  newsGrid.innerHTML = items.slice(0, 3).map((item) => {
    const title = escapeHtml(item?.title || 'Crimson Wars update');
    const summary = escapeHtml(item?.summary || 'Свежая запись в журнале обновлений.');
    const date = escapeHtml(formatNewsDate(item?.publishedAt));
    return `
      <article class="news-card">
        <span class="news-meta">${date}</span>
        <h3>${title}</h3>
        <p>${summary}</p>
        <a href="#play" data-hub-tab="news">Открыть новость</a>
      </article>
    `;
  }).join('');
}

function renderRatings(cards) {
  if (!ratingsGrid) return;
  if (!Array.isArray(cards) || cards.length === 0) {
    ratingsGrid.innerHTML = `
      <article class="rating-card">
        <span class="rating-card-meta">Пусто</span>
        <h3>Рейтинги еще не прогрузились</h3>
        <p>Можно открыть полную вкладку рейтинга в игре и посмотреть таблицы уже там.</p>
        <a class="rating-card-link" href="#play" data-hub-tab="rating">Открыть полный рейтинг</a>
      </article>
    `;
    return;
  }

  ratingsGrid.innerHTML = cards.map((card) => {
    const rows = (card.items || []).slice(0, 3).map((item, index) => {
      const playerId = Math.max(0, Number(item?.playerId) || 0);
      const nickname = escapeHtml(item?.nickname || item?.name || 'Unknown');
      const nicknameHtml = playerId > 0
        ? `<button type="button" class="rating-name" data-rating-player="${playerId}">${nickname}</button>`
        : `<span class="rating-name">${nickname}</span>`;
      return `
        <div class="rating-card-row">
          <span class="rating-rank">#${index + 1}</span>
          ${nicknameHtml}
          <span class="rating-value">${escapeHtml(formatRatingValue(item, card.key))}</span>
        </div>
      `;
    }).join('');
    return `
      <article class="rating-card">
        <span class="rating-card-meta">${escapeHtml(card.source === 'account' ? 'Профиль' : 'Забеги')}</span>
        <h3>${escapeHtml(card.title || card.key)}</h3>
        <div class="rating-card-list">${rows}</div>
        <a class="rating-card-link" href="#play" data-hub-tab="rating">Открыть полный рейтинг</a>
      </article>
    `;
  }).join('');
  bindRatingProfileButtons();
}

function renderLatestRuns(runs) {
  if (!latestRunsGrid) return;
  if (!Array.isArray(runs) || runs.length === 0) {
    latestRunsGrid.innerHTML = `
      <article class="raid-card raid-card-featured">
        <span class="raid-card-topline">\u0422\u0438\u0445\u043e</span>
        <h3>\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0441\u0432\u0435\u0436\u0438\u0445 \u0432\u044b\u043b\u0430\u0437\u043e\u043a</h3>
        <p>\u041a\u0430\u043a \u0442\u043e\u043b\u044c\u043a\u043e \u0437\u0430\u043a\u043e\u043d\u0447\u0438\u0442\u0441\u044f \u043d\u043e\u0432\u044b\u0439 \u0437\u0430\u0431\u0435\u0433, \u043e\u043d \u0441\u0440\u0430\u0437\u0443 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c.</p>
      </article>
    `;
    renderLatestRunsPager();
    return;
  }

  latestRunsGrid.innerHTML = runs.map((run, index) => {
    const kills = Math.max(0, Number(run?.kills) || 0);
    const score = Math.max(0, Number(run?.score) || 0);
    const duration = escapeHtml(formatDurationSec(run?.durationSec));
    const playedAt = escapeHtml(formatShortDateTime(run?.at));
    const ago = escapeHtml(formatRunAgo(run?.at));
    const hero = escapeHtml(formatRunHeroLabel(run));
    const mode = escapeHtml(formatRunGameModeLabel(run));
    const xp = Math.max(0, Number(run?.runDetails?.xp) || 0);
    const bossKills = Math.max(0, Number(run?.runDetails?.bossKills) || 0);
    const name = escapeHtml(run?.name || '\u0411\u0435\u0437 \u0438\u043c\u0435\u043d\u0438');
    const room = escapeHtml(run?.roomCode || '-');
    const replayUrl = escapeHtml(buildReplayUrl(run));
    const badge = latestRunsPage === 1 && index === 0
      ? '\u0421\u0430\u043c\u0430\u044f \u0441\u0432\u0435\u0436\u0430\u044f'
      : '\u0412\u044b\u043b\u0430\u0437\u043a\u0430';
    const summary = latestRunsPage === 1 && index === 0
      ? `${name}: ${kills} \u0443\u0431\u0438\u0439\u0441\u0442\u0432, ${score} \u043e\u0447\u043a\u043e\u0432, ${duration} \u0447\u0438\u0441\u0442\u043e\u0433\u043e \u0434\u0430\u0432\u043b\u0435\u043d\u0438\u044f.`
      : `${name} \u0437\u0430\u043a\u043e\u043d\u0447\u0438\u043b \u0437\u0430\u0431\u0435\u0433 \u0441 ${kills} \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u0430\u043c\u0438 \u0438 ${score} \u043e\u0447\u043a\u0430\u043c\u0438 \u0437\u0430 ${duration}.`;

    return `
      <article class="raid-card${latestRunsPage === 1 && index === 0 ? ' raid-card-featured' : ''}">
        <div class="raid-card-head">
          <div class="raid-card-name">
            <span class="raid-card-topline">${escapeHtml(badge)}</span>
            <strong>${name}</strong>
            <span class="raid-card-subtitle">${hero} | \u041a\u043e\u043c\u043d\u0430\u0442\u0430 ${room} | ${playedAt}</span>
          </div>
          <span class="raid-card-badge">${ago}</span>
        </div>
        <h3>${summary}</h3>
        <div class="raid-card-stats">
          <div class="raid-stat">
            <span>\u0423\u0431\u0438\u0439\u0441\u0442\u0432\u0430</span>
            <strong>${kills}</strong>
          </div>
          <div class="raid-stat">
            <span>\u041e\u0447\u043a\u0438</span>
            <strong>${score}</strong>
          </div>
          <div class="raid-stat">
            <span>\u0412\u0440\u0435\u043c\u044f</span>
            <strong>${duration}</strong>
          </div>
          <div class="raid-stat">
            <span>XP \u0433\u0435\u0440\u043e\u044f</span>
            <strong>${xp}</strong>
          </div>
        </div>
        <div class="raid-card-footer">
          <div class="raid-card-meta">
            <span>\u0420\u0435\u0436\u0438\u043c: ${mode}</span>
            <span>\u0411\u043e\u0441\u0441\u043e\u0432: ${bossKills}</span>
            <span>\u041a\u043e\u043c\u043d\u0430\u0442\u0430: ${room}</span>
          </div>
          <div class="raid-card-actions">
            <a class="raid-replay-link" href="${replayUrl}" target="_blank" rel="noopener noreferrer">\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0437\u0430\u0431\u0435\u0433</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
  renderLatestRunsPager();
}

function getLivePlayerColor(playerClass) {
  const key = String(playerClass || '').trim().toLowerCase();
  if (key === 'scout') return '#57d3ff';
  if (key === 'shadow') return '#c18cff';
  if (key === 'medic' || key === 'medis') return '#7dffb2';
  if (key === 'raider') return '#ffbf5f';
  return '#ff6f61';
}

function setLiveStatusPill(state, label) {
  if (!liveStatusPill) return;
  liveStatusPill.classList.remove('is-live', 'is-waiting');
  liveStatusPill.classList.add(state === 'live' ? 'is-live' : 'is-waiting');
  liveStatusPill.textContent = label;
}

function getLandingLiveEffectiveVolume() {
  return landingLiveMuted ? 0 : Math.max(0, Math.min(1, Number(landingLiveVolume) || 0));
}

function updateLandingLiveControlsUi() {
  const label = landingLivePaused ? 'Play' : 'Pause';
  const aria = landingLivePaused ? 'Resume Live Run Feed' : 'Pause Live Run Feed';
  if (landingLiveCenterToggle instanceof HTMLButtonElement) {
    landingLiveCenterToggle.textContent = label;
    landingLiveCenterToggle.setAttribute('aria-label', aria);
  }
  if (landingLiveControlToggle instanceof HTMLButtonElement) {
    landingLiveControlToggle.textContent = label;
    landingLiveControlToggle.setAttribute('aria-label', aria);
  }
}

function updateLandingLiveVolumeUi() {
  const volumePercent = Math.round(Math.max(0, Math.min(1, Number(landingLiveVolume) || 0)) * 100);
  if (landingLiveVolumeSlider instanceof HTMLInputElement) {
    landingLiveVolumeSlider.value = String(volumePercent);
  }
  if (landingLiveMuteToggle instanceof HTMLButtonElement) {
    landingLiveMuteToggle.textContent = landingLiveMuted || volumePercent <= 0 ? 'Muted' : 'Sound';
    landingLiveMuteToggle.setAttribute('aria-pressed', landingLiveMuted ? 'true' : 'false');
    landingLiveMuteToggle.setAttribute('aria-label', landingLiveMuted ? 'Unmute live sound' : 'Mute live sound');
  }
}

function postLandingLiveAudioControl(unlock = false) {
  if (!(liveIframe instanceof HTMLIFrameElement) || !liveIframe.contentWindow) return;
  liveIframe.contentWindow.postMessage({
    type: 'cw-live-audio-control',
    volume: Math.max(0, Math.min(1, Number(landingLiveVolume) || 0)),
    muted: landingLiveMuted,
    unlock: Boolean(unlock),
  }, window.location.origin);
}

function applyLandingLiveAudioState({ unlock = false } = {}) {
  const effectiveVolume = getLandingLiveEffectiveVolume();
  try {
    const frameWindow = liveIframe instanceof HTMLIFrameElement ? liveIframe.contentWindow : null;
    if (!frameWindow) return;
    postLandingLiveAudioControl(unlock);
    if (typeof frameWindow.cwApplyLiveSfxState === 'function') {
      frameWindow.cwApplyLiveSfxState(Math.max(0, Math.min(1, Number(landingLiveVolume) || 0)), landingLiveMuted, unlock);
    } else if (frameWindow.cwGame) {
      frameWindow.cwGame.sfxVolume = effectiveVolume;
      frameWindow.cwGame.sfxEnabled = effectiveVolume > 0;
    }
  } catch {
    // Same-origin audio bridge is best-effort while the iframe is loading.
  }
}

function unlockLandingLiveAudio() {
  applyLandingLiveAudioState({ unlock: true });
  if (getLandingLiveEffectiveVolume() <= 0) return;
  try {
    const frameWindow = liveIframe instanceof HTMLIFrameElement ? liveIframe.contentWindow : null;
    if (typeof frameWindow?.cwUnlockGameAudio === 'function') {
      frameWindow.cwUnlockGameAudio();
    }
    const ctx = frameWindow?.cwGame?.audio?.ctx || frameWindow?.gameAudio?.ctx || null;
    if (ctx?.state === 'suspended') void ctx.resume?.().catch?.(() => {});
  } catch {
    // Browser audio unlock is user-gesture dependent and best-effort.
  }
}

function setLandingLiveVolume(value) {
  landingLiveVolume = Math.max(0, Math.min(1, Number(value) || 0));
  if (landingLiveVolume > 0) landingLiveMuted = false;
  try {
    localStorage.setItem(LANDING_LIVE_VOLUME_KEY, String(landingLiveVolume));
    localStorage.setItem(LANDING_LIVE_MUTED_KEY, landingLiveMuted ? '1' : '0');
  } catch {
    // ignore storage failures
  }
  updateLandingLiveVolumeUi();
  unlockLandingLiveAudio();
}

function setLandingLiveMuted(muted) {
  landingLiveMuted = Boolean(muted);
  try {
    localStorage.setItem(LANDING_LIVE_MUTED_KEY, landingLiveMuted ? '1' : '0');
  } catch {
    // ignore storage failures
  }
  updateLandingLiveVolumeUi();
  unlockLandingLiveAudio();
}

function updateLandingLiveTimelineUi(fromDrag = false) {
  const run = landingLiveData?.featuredRun || null;
  const startedAt = Number(run?.startedAt) || 0;
  const elapsed = run ? Math.max(0, Math.floor((Date.now() - (startedAt || Date.now())) / 1000)) : 0;
  const max = Math.max(1, elapsed);
  if (landingLiveTimeline instanceof HTMLInputElement) {
    landingLiveTimeline.max = String(max);
    if (!landingLiveTimelineDragging || !fromDrag) landingLiveTimeline.value = String(max);
  }
  if (landingLiveTimelineLabel) {
    const current = landingLiveTimelineDragging && landingLiveTimeline instanceof HTMLInputElement
      ? Math.max(0, Number(landingLiveTimeline.value) || 0)
      : max;
    landingLiveTimelineLabel.textContent = landingLivePaused
      ? `PAUSED ${formatLiveDuration(current)}`
      : `LIVE ${formatLiveDuration(current)}`;
  }
}

function jumpLandingLiveToLiveEdge() {
  updateLandingLiveTimelineUi(false);
  if (landingLivePaused && landingLivePauseReason === 'timeline') {
    setLandingLivePaused(false, 'manual');
  }
}

function updateLandingLivePauseUi() {
  if (liveLayout instanceof HTMLElement) {
    liveLayout.classList.toggle('is-live-paused', landingLivePaused);
  }
  updateLandingLiveControlsUi();
  updateLandingLiveTimelineUi(false);
}

function setLandingLivePaused(paused, reason = 'manual') {
  const nextPaused = Boolean(paused);
  landingLivePaused = nextPaused;
  landingLivePauseReason = nextPaused ? String(reason || 'manual') : '';
  updateLandingLivePauseUi();

  if (nextPaused) {
    clearLivePreview();
    setLandingLiveFallbackArt(true);
    setLiveStatusPill('waiting', 'paused');
    if (liveEmpty) {
      liveEmpty.classList.remove('is-hidden');
      const emptyTitle = liveEmpty.querySelector('strong');
      const emptyText = liveEmpty.querySelector('span');
      if (emptyTitle) emptyTitle.textContent = 'Live Run Feed on standby';
      if (emptyText) emptyText.textContent = 'Press Play to wake the arena stream.';
    }
    if (liveKicker) liveKicker.textContent = landingLivePauseReason === 'auto-play' ? 'Live paused while you play' : 'Live preview stopped';
    if (liveFootline) liveFootline.textContent = 'Press Play to start Live Run Feed';
    try {
      window.speechSynthesis?.cancel?.();
    } catch {
      // Voice cancellation is best-effort.
    }
    return;
  }

  setLiveStatusPill('waiting', 'loading');
  void loadLandingLive();
}

function clearLivePreview() {
  if (liveIframe instanceof HTMLIFrameElement) {
    liveIframe.classList.add('is-hidden');
    if (landingLiveIframeRoomCode) {
      liveIframe.removeAttribute('src');
      landingLiveIframeRoomCode = '';
    }
    landingLiveIframeReady = false;
  }
  if (landingLiveIframeProbeTimer) {
    window.clearInterval(landingLiveIframeProbeTimer);
    landingLiveIframeProbeTimer = 0;
  }
  if (landingLiveIframeProbeStopper) {
    window.clearTimeout(landingLiveIframeProbeStopper);
    landingLiveIframeProbeStopper = 0;
  }
  if (liveCanvas instanceof HTMLCanvasElement) liveCanvas.classList.remove('is-hidden');
  if (!(liveCanvas instanceof HTMLCanvasElement)) return;
  const ctx = liveCanvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  ctx.fillStyle = '#0a0507';
  ctx.fillRect(0, 0, liveCanvas.width, liveCanvas.height);
}

function setLandingLiveFallbackArt(enabled, variant = 'default') {
  if (landingLiveCanvasWrap instanceof HTMLElement) {
    landingLiveCanvasWrap.classList.toggle('has-fallback-art', Boolean(enabled));
    landingLiveCanvasWrap.classList.toggle('has-no-live-art', Boolean(enabled) && variant === 'no-live');
  }
  if (liveCanvas instanceof HTMLCanvasElement) {
    liveCanvas.classList.toggle('is-hidden', Boolean(enabled));
  }
}

function getLiveIframeSpectatorState() {
  if (!(liveIframe instanceof HTMLIFrameElement)) return null;
  try {
    const frameWindow = liveIframe.contentWindow || null;
    const frameDocument = liveIframe.contentDocument || frameWindow?.document || null;
    const spectatorGame = frameWindow?.cwGame || null;
    const stateRoomCode = String(spectatorGame?.state?.roomCode || spectatorGame?.roomCode || '').trim().toUpperCase();
    const overlayEl = frameDocument?.getElementById?.('join-overlay') || null;
    const gameCanvasEl = frameDocument?.getElementById?.('game') || null;
    const hasState = Boolean(spectatorGame?.state);
    return {
      frameWindow,
      frameDocument,
      spectatorGame,
      stateRoomCode,
      overlayEl,
      gameCanvasEl,
      hasState,
      matchesRoom: Boolean(stateRoomCode && stateRoomCode === landingLiveIframeRoomCode),
    };
  } catch {
    return null;
  }
}

function forceLiveIframeReady(frameState) {
  if (landingLivePaused) return false;
  const state = frameState || getLiveIframeSpectatorState();
  if (!state || !state.hasState || !state.matchesRoom) return false;
  try {
    if (state.overlayEl instanceof HTMLElement) state.overlayEl.style.display = 'none';
    if (state.gameCanvasEl instanceof HTMLElement) state.gameCanvasEl.classList.remove('hidden');
    if (typeof state.frameWindow?.updateHudVisibility === 'function') {
      state.frameWindow.updateHudVisibility(false);
    }
    state.frameWindow?.dispatchEvent?.(new Event('resize'));
  } catch {
    // Best effort: even if forcing UI visibility fails, we can still show the iframe.
  }
  landingLiveIframeReady = true;
  if (liveIframe instanceof HTMLIFrameElement) liveIframe.classList.remove('is-hidden');
  if (liveCanvas instanceof HTMLCanvasElement) liveCanvas.classList.add('is-hidden');
  if (landingLiveIframeProbeTimer) {
    window.clearInterval(landingLiveIframeProbeTimer);
    landingLiveIframeProbeTimer = 0;
  }
  if (landingLiveIframeProbeStopper) {
    window.clearTimeout(landingLiveIframeProbeStopper);
    landingLiveIframeProbeStopper = 0;
  }
  if (landingLiveIframeWatchdog) {
    window.clearTimeout(landingLiveIframeWatchdog);
    landingLiveIframeWatchdog = 0;
  }
  return true;
}

function updateLiveIframe(roomCode) {
  if (!(liveIframe instanceof HTMLIFrameElement)) return false;
  if (landingLivePaused) {
    clearLivePreview();
    setLandingLiveFallbackArt(true);
    return false;
  }
  const normalizedRoomCode = String(roomCode || '').trim().toUpperCase();
  if (!normalizedRoomCode) {
    liveIframe.classList.add('is-hidden');
    liveIframe.removeAttribute('src');
    landingLiveIframeRoomCode = '';
    landingLiveSpectatorCommentary = { roomCode: '', title: '', text: '', at: 0 };
    if (liveCanvas instanceof HTMLCanvasElement) liveCanvas.classList.remove('is-hidden');
    return false;
  }
  if (landingLiveIframeRoomCode !== normalizedRoomCode) {
    const url = new URL('/play', window.location.origin);
    url.searchParams.set('room', normalizedRoomCode);
    url.searchParams.set('mode', 'spectate');
    url.searchParams.set('embed', '1');
    url.searchParams.set('liveEmbedBuild', '20260424live1');
    liveIframe.src = url.toString();
    landingLiveIframeRoomCode = normalizedRoomCode;
    landingLiveSpectatorCommentary = { roomCode: normalizedRoomCode, title: '', text: '', at: 0 };
    landingLiveIframeReady = false;
    liveIframe.classList.add('is-hidden');
    if (liveCanvas instanceof HTMLCanvasElement) liveCanvas.classList.remove('is-hidden');
    if (landingLiveIframeProbeTimer) {
      window.clearInterval(landingLiveIframeProbeTimer);
      landingLiveIframeProbeTimer = 0;
    }
    if (landingLiveIframeProbeStopper) {
      window.clearTimeout(landingLiveIframeProbeStopper);
      landingLiveIframeProbeStopper = 0;
    }
    landingLiveIframeProbeTimer = window.setInterval(() => {
      const frameState = getLiveIframeSpectatorState();
      if (!frameState || !frameState.matchesRoom) return;
      if (frameState.hasState) forceLiveIframeReady(frameState);
    }, 300);
    if (landingLiveIframeWatchdog) window.clearTimeout(landingLiveIframeWatchdog);
    landingLiveIframeWatchdog = window.setTimeout(() => {
      if (!landingLiveIframeReady) {
        liveIframe.classList.add('is-hidden');
        if (liveCanvas instanceof HTMLCanvasElement) liveCanvas.classList.remove('is-hidden');
      }
    }, 2200);
    landingLiveIframeProbeStopper = window.setTimeout(() => {
      if (landingLiveIframeProbeTimer) {
        window.clearInterval(landingLiveIframeProbeTimer);
        landingLiveIframeProbeTimer = 0;
      }
      landingLiveIframeProbeStopper = 0;
    }, 15000);
  }
  if (landingLiveIframeReady) {
    liveIframe.classList.remove('is-hidden');
    if (liveCanvas instanceof HTMLCanvasElement) liveCanvas.classList.add('is-hidden');
    applyLandingLiveAudioState();
    window.setTimeout(applyLandingLiveAudioState, 250);
    return true;
  }
  liveIframe.classList.add('is-hidden');
  if (liveCanvas instanceof HTMLCanvasElement) liveCanvas.classList.remove('is-hidden');
  return false;
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const payload = event.data;
  if (payload?.type === 'cw-player-run' && payload.status === 'started') {
    setLandingLivePaused(true, 'auto-play');
    return;
  }
  if (!payload || payload.type !== 'cw-live-spectator') return;
  if (landingLivePaused) return;
  const roomCode = String(payload.roomCode || '').trim().toUpperCase();
  if (!roomCode || roomCode !== landingLiveIframeRoomCode) return;
  if (payload.status === 'commentary') {
    landingLiveSpectatorCommentary = {
      roomCode,
      title: String(payload.title || '').trim(),
      text: String(payload.text || '').trim(),
      at: Date.now(),
    };
    return;
  }
  if (payload.status === 'ready') {
    forceLiveIframeReady();
    return;
  }
  if (payload.status === 'error') {
    landingLiveIframeReady = false;
    if (liveIframe instanceof HTMLIFrameElement) liveIframe.classList.add('is-hidden');
    if (liveCanvas instanceof HTMLCanvasElement) liveCanvas.classList.remove('is-hidden');
  }
});

function drawLivePreview(preview) {
  if (!(liveCanvas instanceof HTMLCanvasElement)) return;
  const ctx = liveCanvas.getContext('2d');
  if (!ctx || !preview?.world) return;
  const width = liveCanvas.width;
  const height = liveCanvas.height;
  const worldW = Math.max(1, Number(preview.world?.width) || 2400);
  const worldH = Math.max(1, Number(preview.world?.height) || 1400);
  const scale = Math.min(width / worldW, height / worldH);
  const offsetX = (width - worldW * scale) * 0.5;
  const offsetY = (height - worldH * scale) * 0.5;
  const project = (x, y) => [
    offsetX + (Number(x || 0) * scale),
    offsetY + (Number(y || 0) * scale),
  ];
  const players = Array.isArray(preview.players) ? preview.players : [];
  const enemies = Array.isArray(preview.enemies) ? preview.enemies : [];
  const bullets = Array.isArray(preview.bullets) ? preview.bullets : [];
  const xpOrbs = Array.isArray(preview.xpOrbs) ? preview.xpOrbs : [];
  const drops = Array.isArray(preview.drops) ? preview.drops : [];
  const bossPortals = Array.isArray(preview.bossPortals) ? preview.bossPortals : [];
  const trees = Array.isArray(preview.decor?.trees) ? preview.decor.trees : [];

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#111b26');
  bg.addColorStop(0.52, '#0b121a');
  bg.addColorStop(1, '#070b10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(4, 9, 14, 0.76)';
  ctx.fillRect(offsetX, offsetY, worldW * scale, worldH * scale);

  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= worldW; x += 240) {
    const sx = offsetX + (x * scale);
    ctx.beginPath();
    ctx.moveTo(sx, offsetY);
    ctx.lineTo(sx, offsetY + worldH * scale);
    ctx.stroke();
  }
  for (let y = 0; y <= worldH; y += 240) {
    const sy = offsetY + (y * scale);
    ctx.beginPath();
    ctx.moveTo(offsetX, sy);
    ctx.lineTo(offsetX + worldW * scale, sy);
    ctx.stroke();
  }
  ctx.restore();

  for (const tree of trees) {
    const [x, y] = project(tree?.x, tree?.y);
    const radius = Math.max(4, (Number(tree?.s) || 12) * scale * 0.34);
    ctx.fillStyle = 'rgba(47, 79, 61, 0.32)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const portal of bossPortals) {
    const [x, y] = project(portal?.x, portal?.y);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const orb of xpOrbs) {
    const [x, y] = project(orb?.x, orb?.y);
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const drop of drops) {
    const [x, y] = project(drop?.x, drop?.y);
    ctx.fillStyle = drop?.kind === 'xp_vacuum' ? '#22d3ee' : '#f59e0b';
    ctx.fillRect(x - 4, y - 4, 8, 8);
  }

  for (const bullet of bullets) {
    const [x, y] = project(bullet?.x, bullet?.y);
    ctx.fillStyle = bullet?.fromEnemy ? '#fb7185' : (bullet?.kind === 'rocket' ? '#f59e0b' : '#f8fafc');
    ctx.beginPath();
    ctx.arc(x, y, bullet?.kind === 'rocket' ? 4 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const enemy of enemies) {
    const [x, y] = project(enemy?.x, enemy?.y);
    const type = String(enemy?.type || '').toLowerCase();
    const isBoss = type === 'boss';
    const radius = isBoss ? 14 : (type === 'charger' ? 9 : 7);
    ctx.fillStyle = isBoss ? '#dc2626' : (type === 'ranged' ? '#fb7185' : (type === 'charger' ? '#f97316' : '#ef4444'));
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (isBoss) {
      ctx.strokeStyle = 'rgba(254, 226, 226, 0.92)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  for (const player of players) {
    const [x, y] = project(player?.x, player?.y);
    const color = getLivePlayerColor(player?.playerClass);
    const hp = Math.max(0, Number(player?.hp) || 0);
    const maxHp = Math.max(1, Number(player?.maxHp) || 1);
    const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
    const isDowned = hp <= 0;

    ctx.fillStyle = 'rgba(34, 211, 238, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.92)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
    ctx.stroke();

    if (isDowned) {
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.95)';
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 7);
      ctx.lineTo(x + 7, y + 7);
      ctx.moveTo(x + 7, y - 7);
      ctx.lineTo(x - 7, y + 7);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(226, 232, 240, 0.96)';
    ctx.font = '600 12px "IBM Plex Sans", sans-serif';
    ctx.fillText(String(player?.name || 'Player').slice(0, 12), x + 14, y - 10);
  }

  ctx.save();
  ctx.fillStyle = 'rgba(7, 11, 16, 0.82)';
  ctx.fillRect(12, 12, 270, 58);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.strokeRect(12.5, 12.5, 269, 57);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 13px "IBM Plex Sans", sans-serif';
  ctx.fillText(`LIVE ROOM ${String(preview.roomCode || '--')}`, 24, 34);
  ctx.font = '500 12px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Players ${players.length} | Kills ${Math.max(0, Number(preview.totalEnemyKills) || 0)} | Threat Lv${Math.max(1, Number(preview.roomDifficulty?.level) || 1)}`, 24, 54);

  if (preview.bossAlive) {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.92)';
    ctx.fillRect(width - 162, 12, 150, 34);
    ctx.fillStyle = '#fee2e2';
    ctx.font = '700 13px "IBM Plex Sans", sans-serif';
    ctx.fillText('BOSS ACTIVE', width - 144, 34);
  }
  ctx.restore();
}

function refreshLandingLiveRuntime() {
  if (landingLivePaused) return;
  if (!landingLiveData?.featuredRun) return;
  const run = landingLiveData.featuredRun;
  if (liveDuration) {
    liveDuration.textContent = formatLiveDuration(Math.max(0, Math.floor((Date.now() - (Number(run.startedAt) || Date.now())) / 1000)));
  }
  updateLandingLiveTimelineUi(false);
  if (liveUpdated) {
    liveUpdated.textContent = formatLiveUpdatedLabel(run.preview?.now || landingLiveData.now || Date.now());
  }
}

function renderLandingLiveSwitcher(payload, featuredRun) {
  if (!liveSwitchStatus) return;
  const runs = Array.isArray(payload?.liveRuns) ? payload.liveRuns : [];
  const selectedCode = String(payload?.selectedRoomCode || featuredRun?.code || landingLiveSelectedRoomCode || '').trim().toUpperCase();
  const currentIndex = runs.findIndex((run) => String(run?.code || '').trim().toUpperCase() === selectedCode);
  const total = runs.length;

  if (total <= 0) {
    liveSwitchStatus.textContent = 'Эфир недоступен';
    if (livePrevBtn) livePrevBtn.disabled = true;
    if (liveNextBtn) liveNextBtn.disabled = true;
    return;
  }

  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const current = runs[safeIndex] || null;
  liveSwitchStatus.textContent = `Эфир ${safeIndex + 1} из ${total}${current?.code ? ` • ${current.code}` : ''}`;
  if (livePrevBtn) livePrevBtn.disabled = total <= 1;
  if (liveNextBtn) liveNextBtn.disabled = total <= 1;
}

function cycleLandingLive(direction) {
  if (landingLivePaused) return;
  const runs = Array.isArray(landingLiveData?.liveRuns) ? landingLiveData.liveRuns : [];
  if (runs.length <= 1) return;
  const selectedCode = String(landingLiveSelectedRoomCode || landingLiveData?.selectedRoomCode || runs[0]?.code || '').trim().toUpperCase();
  const currentIndex = Math.max(0, runs.findIndex((run) => String(run?.code || '').trim().toUpperCase() === selectedCode));
  const nextIndex = (currentIndex + (direction > 0 ? 1 : -1) + runs.length) % runs.length;
  const nextRun = runs[nextIndex];
  const nextCode = String(nextRun?.code || '').trim().toUpperCase();
  if (!nextCode) return;
  landingLiveSelectedRoomCode = nextCode;
  void loadLandingLive();
}

function renderLandingLive(payload) {
  if (!liveTitle) return;
  if (landingLivePaused) return;
  const featuredRun = payload?.live ? payload?.featuredRun : null;
  const liveRuns = Array.isArray(payload?.liveRuns) ? payload.liveRuns : [];
  const selectedRoomCode = String(payload?.selectedRoomCode || featuredRun?.code || '').trim().toUpperCase();
  if (selectedRoomCode) landingLiveSelectedRoomCode = selectedRoomCode;
  landingLiveData = {
    featuredRun,
    liveRuns,
    selectedRoomCode,
    now: payload?.now || Date.now(),
  };
  const fallbackCommentary = personalizeLandingCommentary(pickLandingCommentaryLive(featuredRun, payload), featuredRun);
  const spectatorCommentaryAgeMs = Date.now() - Math.max(0, Number(landingLiveSpectatorCommentary.at) || 0);
  const hasFreshSpectatorCommentary = Boolean(
    landingLiveSpectatorCommentary.title
    && landingLiveSpectatorCommentary.text
    && spectatorCommentaryAgeMs < (featuredRun?.code ? 45000 : 12000)
    && (
      !featuredRun?.code
      || String(landingLiveSpectatorCommentary.roomCode || '').trim().toUpperCase() === String(featuredRun.code || '').trim().toUpperCase()
    )
  );
  const commentary = hasFreshSpectatorCommentary
    ? {
        title: landingLiveSpectatorCommentary.title,
        text: landingLiveSpectatorCommentary.text,
      }
    : fallbackCommentary;

  if (liveActiveRuns) liveActiveRuns.textContent = String(Math.max(0, Number(payload?.activeRuns) || 0));
  if (liveInGame) liveInGame.textContent = String(Math.max(0, Number(payload?.presence?.inGame) || 0));
  if (liveCommentatorTitle) liveCommentatorTitle.textContent = commentary.title;
  if (liveCommentatorText) liveCommentatorText.textContent = commentary.text;
  maybeSpeakLandingCommentary(commentary.title, commentary.text, featuredRun?.code || payload?.selectedRoomCode || '');
  renderLandingLiveSwitcher(payload, featuredRun);

  if (featuredRun?.preview) {
    setLandingLiveFallbackArt(false);
    if (liveEmpty) liveEmpty.classList.add('is-hidden');
    if (liveKicker) liveKicker.textContent = 'Longest live run';
    if (liveTitle) liveTitle.textContent = `Комната ${featuredRun.code} уже держится ${formatLiveDuration(featuredRun.liveForSec)}.`;
    if (liveDescription) {
      liveDescription.textContent = `Сейчас в эфире ${featuredRun.players}/${featuredRun.maxPlayers} игроков. Блок тянет живой снимок самой долгой активной комнаты и обновляет арену прямо на лендинге.`;
    }
    if (liveRoomCode) liveRoomCode.textContent = String(featuredRun.code || '--');
    if (liveMode) liveMode.textContent = `Режим: ${formatRunGameModeLabel({ runDetails: { gameMode: featuredRun.gameMode } })}`;
    if (livePlayers) livePlayers.textContent = `Игроки: ${featuredRun.players}/${featuredRun.maxPlayers}`;
    if (liveThreat) liveThreat.textContent = `Угроза: Lv${Math.max(1, Number(featuredRun.roomDifficulty?.level) || 1)}`;
    if (liveBoss) liveBoss.textContent = featuredRun.bossAlive ? 'Босс: в игре' : 'Босс: на подходе';
    if (liveFootline) liveFootline.textContent = featuredRun.bossAlive ? 'На карте уже есть живой босс' : 'Комната наращивает давление до следующего босса';
    if (liveViewers) liveViewers.textContent = `${Math.max(0, Number(featuredRun.spectators) || 0)} зрителей`;
    if (liveKills) liveKills.textContent = `${Math.max(0, Number(featuredRun.totalEnemyKills) || 0)} киллов`;
    if (livePrimaryLink) {
      livePrimaryLink.href = buildLiveSpectatorUrl(featuredRun.code);
      livePrimaryLink.target = '_blank';
      livePrimaryLink.rel = 'noopener noreferrer';
      livePrimaryLink.textContent = 'В новом окне';
      livePrimaryLink.textContent = 'Залететь в эту комнату';
    }
    if (liveSecondaryLink) {
      liveSecondaryLink.href = '#';
      liveSecondaryLink.target = '';
      liveSecondaryLink.rel = '';
      liveSecondaryLink.textContent = 'На весь экран';
      liveSecondaryLink.textContent = 'Открыть Battle Hub';
    }
    if (livePrimaryLink) livePrimaryLink.textContent = 'В новом окне';
    if (liveSecondaryLink) liveSecondaryLink.textContent = 'На весь экран';
    setLiveStatusPill('live', 'live');
    if (!updateLiveIframe(featuredRun.code)) {
      drawLivePreview(featuredRun.preview);
    }
    refreshLandingLiveRuntime();
    return;
  }

  clearLivePreview();
  setLandingLiveFallbackArt(true, 'no-live');
  if (liveEmpty) {
    liveEmpty.classList.remove('is-hidden');
    const emptyTitle = liveEmpty.querySelector('strong');
    const emptyText = liveEmpty.querySelector('span');
    if (emptyTitle) emptyTitle.textContent = 'No local live preview yet';
    if (emptyText) emptyText.textContent = 'When an active room appears here, this block will wake up automatically.';
  }

  const fallbackRun = payload?.fallbackRun || null;
  const activeRuns = Math.max(0, Number(payload?.activeRuns) || 0);
  const localActiveRuns = Math.max(0, Number(payload?.localActiveRuns) || 0);

  if (liveKicker) liveKicker.textContent = activeRuns > 0 ? 'Live preview paused' : 'Сейчас тихо';
  if (liveTitle) {
    liveTitle.textContent = activeRuns > 0 && localActiveRuns <= 0
      ? 'Онлайн-забеги есть, но на другом игровом инстансе.'
      : 'Прямо сейчас никто не держит арену онлайн.';
  }
  if (liveDescription) {
    liveDescription.textContent = fallbackRun
      ? `Пока live-комнаты рядом нет, можно открыть свежий реплей ${String(fallbackRun.name || 'последнего игрока')} и не ждать новый заход.`
      : 'Как только кто-то снова поднимет комнату, этот блок автоматически переключится в режим live-preview.';
  }
  if (liveRoomCode) liveRoomCode.textContent = fallbackRun?.roomCode || '--';
  if (liveDuration) liveDuration.textContent = formatLiveDuration(fallbackRun?.durationSec || 0);
  if (liveMode) liveMode.textContent = `Режим: ${fallbackRun ? formatRunGameModeLabel(fallbackRun) : '--'}`;
  if (livePlayers) livePlayers.textContent = 'Игроки: --';
  if (liveThreat) liveThreat.textContent = activeRuns > 0 ? `Локально: ${localActiveRuns}` : 'Угроза: --';
  if (liveBoss) liveBoss.textContent = fallbackRun ? `Повтор: ${Math.max(0, Number(fallbackRun.kills) || 0)} киллов` : 'Босс: --';
  if (liveViewers) liveViewers.textContent = activeRuns > 0 ? '0 зрителей' : '--';
  if (liveFootline) {
    liveFootline.textContent = fallbackRun
      ? `Свежий повтор от ${String(fallbackRun.name || 'игрока')}`
      : 'Ждём новый матч, чтобы поднять его сюда автоматически';
  }
  if (liveKills) liveKills.textContent = `${Math.max(0, Number(fallbackRun?.kills) || 0)} киллов`;
  if (liveUpdated) liveUpdated.textContent = formatLiveUpdatedLabel(payload?.now || Date.now());
  if (livePrimaryLink) {
    livePrimaryLink.href = String(fallbackRun?.replayUrl || '/play');
    livePrimaryLink.target = '_blank';
    livePrimaryLink.rel = 'noopener noreferrer';
    livePrimaryLink.textContent = fallbackRun ? 'Открыть свежий реплей' : 'Открыть игру';
  }
  if (liveSecondaryLink) {
    liveSecondaryLink.href = '#';
    liveSecondaryLink.target = '';
    liveSecondaryLink.rel = '';
    liveSecondaryLink.textContent = 'Перейти к вылазкам';
  }
  if (livePrimaryLink) livePrimaryLink.textContent = 'В новом окне';
  if (liveSecondaryLink) liveSecondaryLink.textContent = 'На весь экран';
  setLiveStatusPill('waiting', activeRuns > 0 ? 'remote' : 'offline');
}

async function loadLandingLive() {
  if (!liveTitle) return;
  if (landingLivePaused) return;
  try {
    const params = new URLSearchParams();
    if (landingLiveSelectedRoomCode) params.set('roomCode', landingLiveSelectedRoomCode);
    const response = await fetch(`/api/landing/live-run${params.toString() ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) throw new Error(`HTTP ${response.status}`);
    renderLandingLive(payload);
  } catch (_error) {
    landingLiveData = null;
    clearLivePreview();
    setLandingLiveFallbackArt(true, 'no-live');
    if (liveEmpty) liveEmpty.classList.remove('is-hidden');
    if (liveKicker) liveKicker.textContent = 'Signal lost';
    if (liveTitle) liveTitle.textContent = 'Не удалось подтянуть live-сводку.';
    if (liveDescription) liveDescription.textContent = 'Попробуем обновить блок ещё раз автоматически, а пока можно открыть игру обычным способом.';
    if (liveSwitchStatus) liveSwitchStatus.textContent = 'Эфир недоступен';
    if (livePrevBtn) livePrevBtn.disabled = true;
    if (liveNextBtn) liveNextBtn.disabled = true;
    if (livePrimaryLink) {
      livePrimaryLink.href = '/play';
      livePrimaryLink.textContent = 'Открыть игру';
    }
    setLiveStatusPill('waiting', 'error');
  }
}

async function loadNews() {
  if (!newsGrid) return;
  try {
    const response = await fetch('/api/news', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    renderNews(Array.isArray(payload?.items) ? payload.items : []);
  } catch (_error) {
    newsGrid.innerHTML = `
      <article class="news-card">
        <span class="news-meta">Ошибка</span>
        <h3>Сводка не загрузилась</h3>
        <p>Игра на месте. Если нужно, можешь сразу открыть новостную вкладку внутри боевого меню и проверить все там.</p>
        <a href="#play" data-hub-tab="news">Открыть новости в игре</a>
      </article>
    `;
  }
}

async function loadRatings() {
  if (!ratingsGrid) return;
  try {
    const categoriesResponse = await fetch('/api/leaderboard?mode=all&page=1&page_size=3', { cache: 'no-store' });
    if (!categoriesResponse.ok) throw new Error(`HTTP ${categoriesResponse.status}`);
    const categoriesPayload = await categoriesResponse.json();
    const categories = Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : [];
    const selected = categories.slice(0, 6);
    const cards = await Promise.all(selected.map(async (category) => {
      const params = new URLSearchParams({
        category: String(category?.key || ''),
        mode: 'all',
        page: '1',
        page_size: '3',
      });
      const response = await fetch(`/api/leaderboard?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) return null;
      return {
        key: String(category?.key || ''),
        title: String(category?.title || category?.key || 'Rating'),
        source: String(category?.source || 'runs'),
        items: Array.isArray(payload?.items) ? payload.items : [],
      };
    }));
    renderRatings(cards.filter(Boolean));
  } catch (_error) {
    ratingsGrid.innerHTML = `
      <article class="rating-card">
        <span class="rating-card-meta">Ошибка</span>
        <h3>Не удалось загрузить рейтинги</h3>
        <p>Полная таблица все равно доступна в игровом меню, если нужно посмотреть топы без лендинга.</p>
        <a class="rating-card-link" href="#play" data-hub-tab="rating">Открыть рейтинг в игре</a>
      </article>
    `;
  }
}

async function loadLatestRuns() {
  if (!latestRunsGrid) return;
  try {
    const response = await fetch(`/api/landing/latest-runs?page=${latestRunsPage}&page_size=${LATEST_RUNS_PAGE_SIZE}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) throw new Error(`HTTP ${response.status}`);
    const runs = Array.isArray(payload?.runs) ? payload.runs : [];
    latestRunsPage = Math.max(1, Number(payload?.page) || latestRunsPage);
    latestRunsTotalPages = Math.max(1, Number(payload?.totalPages) || 1);
    const nextSignature = buildLatestRunsSignature(runs);
    if (nextSignature !== latestRunsSignature) {
      latestRunsSignature = nextSignature;
      renderLatestRuns(runs);
    } else {
      renderLatestRunsPager();
    }
  } catch (_error) {
    if (!latestRunsSignature) {
      latestRunsGrid.innerHTML = `
        <article class="raid-card raid-card-featured">
          <span class="raid-card-topline">\u041e\u0448\u0438\u0431\u043a\u0430</span>
          <h3>\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0432\u044b\u043b\u0430\u0437\u043a\u0438</h3>
          <p>\u041b\u0435\u043d\u0442\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430, \u043d\u043e \u043f\u043e\u043f\u044b\u0442\u043a\u0430 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.</p>
        </article>
      `;
    }
    renderLatestRunsPager();
  }
}

function goToLatestRunsPage(nextPage) {
  const page = Math.max(1, Number(nextPage) || 1);
  if (page === latestRunsPage) return;
  latestRunsPage = page;
  latestRunsSignature = '';
  latestRunsGrid?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  void loadLatestRuns();
}

latestRunsPager?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest('[data-runs-page-action]');
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  const action = String(button.getAttribute('data-runs-page-action') || '').trim().toLowerCase();
  if (action === 'prev' && latestRunsPage > 1) goToLatestRunsPage(latestRunsPage - 1);
  if (action === 'next' && latestRunsPage < latestRunsTotalPages) goToLatestRunsPage(latestRunsPage + 1);
});

function startLatestRunsPolling() {
  if (!latestRunsGrid || latestRunsPollTimer) return;
  latestRunsPollTimer = window.setInterval(() => {
    if (document.hidden) return;
    void loadLatestRuns();
  }, 15000);
}

function startLandingLivePolling() {
  if (!liveTitle || landingLivePollTimer) return;
  landingLivePollTimer = window.setInterval(() => {
    if (document.hidden || landingLivePaused) return;
    void loadLandingLive();
  }, 2500);
}

function startLandingLiveRuntime() {
  if (!liveTitle || landingLiveRuntimeTimer) return;
  landingLiveRuntimeTimer = window.setInterval(() => {
    if (landingLivePaused) return;
    refreshLandingLiveRuntime();
  }, 1000);
}

livePrevBtn?.addEventListener('click', () => {
  cycleLandingLive(-1);
});

liveNextBtn?.addEventListener('click', () => {
  cycleLandingLive(1);
});

void loadNews();
void loadRatings();
void loadLandingLive();
void loadLatestRuns();
startLatestRunsPolling();
startLandingLivePolling();
startLandingLiveRuntime();
