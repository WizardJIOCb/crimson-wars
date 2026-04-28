(function () {
  const ReactGlobal = globalThis.React;
  const ReactDomGlobal = globalThis.ReactDOM;
  const mountNode = document.getElementById('cw-menu-root');
  const oldJoinForm = document.getElementById('join-form');
  if (!ReactGlobal || !ReactDomGlobal || !mountNode || !oldJoinForm) return;

  oldJoinForm.remove();

  const h = ReactGlobal.createElement;

  function cx() {
    return Array.from(arguments).filter(Boolean).join(' ');
  }

  function CwButton(props) {
    return h(
      'button',
      {
        id: props.id,
        type: props.type || 'button',
        className: cx('cw-button', props.variant ? `cw-button-${props.variant}` : '', props.className),
        'data-mode': props.dataMode,
        'data-game-mode': props.dataGameMode,
        'data-menu-tab': props.dataMenuTab,
        'data-auth-tab': props.dataAuthTab,
        'aria-selected': props.ariaSelected,
        disabled: props.disabled,
      },
      props.children
    );
  }

  function CwPanel(props) {
    return h(
      props.tag || 'section',
      {
        id: props.id,
        className: cx('cw-panel', props.className, props.active && 'active'),
        'data-menu-panel': props.dataMenuPanel,
      },
      props.children
    );
  }

  function CwHeroCard(props) {
    return h('div', { className: cx('cw-hero-card', props.className) },
      h('span', { className: 'cw-kicker' }, props.kicker),
      h('strong', { className: 'cw-hero-title' }, props.title),
      h('p', { className: 'cw-copy' }, props.copy)
    );
  }

  function CwRunCard(props) {
    return h('div', { id: props.id, className: cx('cw-run-card', props.className) }, props.children);
  }

  function CwStatTile(props) {
    return h('div', { className: cx('cw-stat-tile', props.className) },
      h('span', { className: 'cw-stat-label' }, props.label),
      h('strong', { className: 'cw-stat-value' }, props.value)
    );
  }

  function CwProgressBar(props) {
    return h('div', { className: cx('cw-progress', props.className) },
      h('div', { className: 'cw-progress-track' },
        h('div', { className: 'cw-progress-fill', style: { width: `${props.value || 0}%` } })
      ),
      props.label ? h('span', { className: 'cw-progress-label' }, props.label) : null
    );
  }

  function CwSkillNode(props) {
    return h('div', { className: cx('cw-skill-node', props.state, props.className) },
      h('span', { className: 'cw-skill-node-core' }),
      h('span', { className: 'cw-skill-node-label' }, props.label)
    );
  }

  function CwLeaderboardTable(props) {
    return h('div', { className: cx('cw-leaderboard-table', props.className) }, props.children);
  }

  function CwSettingsRow(props) {
    return h('div', { className: cx('cw-settings-row', props.className) }, props.children);
  }

  function CwNewsCard(props) {
    return h('div', { className: cx('cw-news-shell', props.className) }, props.children);
  }

  function CwTopBar() {
    return h('header', { className: 'cw-topbar' },
      h('div', { className: 'cw-topbar-side' },
        h(CwHeroCard, {
          kicker: 'Operator',
          title: 'BloodReaper',
          copy: 'Командный вход, герои, таланты и хаб-новости в едином боевом HUD.',
          className: 'cw-topbar-identity',
        })
      ),
      h('div', { className: 'cw-brand-block' },
        h('div', { className: 'cw-brand-overline' }, 'Crimson Wars'),
        h('div', { className: 'cw-brand-title' }, 'Arena Hub'),
        h(CwProgressBar, { value: 68, label: 'network sync stable / account relay 68%' })
      ),
      h('div', { className: 'cw-topbar-side cw-topbar-side-right' },
        h(CwStatTile, { label: 'Threat', value: 'LV 07' }),
        h(CwStatTile, { label: 'PvP', value: 'LIVE' }),
        h(CwStatTile, { label: 'Season', value: 'S12' })
      )
    );
  }

  function CwNavTabs() {
    const tabs = [
      ['play', 'Играть'],
      ['characters', 'Персонажи'],
      ['skills', 'Навыки'],
      ['profile', 'Профиль'],
      ['rating', 'Рейтинг'],
      ['news', 'Новости'],
      ['menu', 'Настройки'],
    ];
    return h('div', { id: 'main-menu-tabs', className: 'main-menu-tabs cw-nav-tabs', role: 'tablist', 'aria-label': 'Main menu' },
      tabs.map((tab, index) => h(CwButton, {
        key: tab[0],
        type: 'button',
        className: cx('main-menu-tab', index === 0 && 'active'),
        dataMenuTab: tab[0],
        ariaSelected: index === 0 ? 'true' : 'false',
        variant: index === 0 ? 'primary' : 'tab',
      }, tab[1]))
    );
  }

  function CwShellHeading() {
    return h('div', { className: 'cw-shell-heading' },
      h('div', { className: 'cw-shell-heading-copy' },
        h('span', { className: 'cw-kicker' }, 'Crimson Wars'),
        h('div', { className: 'cw-shell-title-row' },
          h('strong', { className: 'cw-shell-title' }, 'Battle Hub'),
          h('span', { id: 'menu-version-slot', className: 'menu-version-slot' })
        )
      )
    );
  }

  function AuthShell() {
    return h('div', { id: 'player-access-details', className: 'auth-card' },
      h('div', { className: 'auth-card-body' },
        h('div', { className: 'auth-head' },
          h('div', null,
            h('div', { id: 'player-auth-summary', className: 'auth-summary' }, 'Guest mode. Registered nicknames require login.'),
            h('div', { className: 'cw-auth-headline' }, 'Здесь остаётся полноценный экран логина/пароля и место под Google, VK и Mail.')
          ),
          h('button', { id: 'player-logout', type: 'button', className: 'mini ghost hidden' }, 'Log out')
        ),
        h('div', { className: 'auth-tabs', role: 'tablist', 'aria-label': 'Player access mode' },
          h(CwButton, { id: 'auth-tab-guest', className: 'auth-tab active', dataAuthTab: 'guest', ariaSelected: 'true', variant: 'tab' }, 'Гость'),
          h(CwButton, { id: 'auth-tab-login', className: 'auth-tab', dataAuthTab: 'login', ariaSelected: 'false', variant: 'tab' }, 'Логин'),
          h(CwButton, { id: 'auth-tab-register', className: 'auth-tab', dataAuthTab: 'register', ariaSelected: 'false', variant: 'tab' }, 'Регистрация')
        ),
        h('div', { className: 'auth-panel active', 'data-auth-panel': 'guest' },
          h('div', { className: 'auth-copy' }, 'Быстрый гостевой вход для матчей без регистрации. Аккаунт подключается без смены интерфейса.'),
          h('label', { htmlFor: 'name' }, 'Никнейм'),
          h('input', { id: 'name', maxLength: 18, defaultValue: 'Fighter' }),
          h('div', { id: 'nickname-hint', className: 'field-hint' }, 'Guest mode: choose any free nickname.')
        ),
        h('div', { className: 'auth-panel', 'data-auth-panel': 'login' },
          h('label', { htmlFor: 'auth-login-nickname' }, 'Логин / ник'),
          h('input', { id: 'auth-login-nickname', maxLength: 18, placeholder: 'Nickname' }),
          h('label', { htmlFor: 'auth-login-password' }, 'Пароль'),
          h('input', { id: 'auth-login-password', type: 'password', maxLength: 72, placeholder: 'Password' }),
          h(CwButton, { id: 'player-login', className: 'auth-action', variant: 'primary' }, 'Войти')
        ),
        h('div', { className: 'auth-panel', 'data-auth-panel': 'register' },
          h('label', { htmlFor: 'auth-register-nickname' }, 'Новый ник'),
          h('input', { id: 'auth-register-nickname', maxLength: 18, placeholder: 'Nickname' }),
          h('label', { htmlFor: 'auth-register-password' }, 'Пароль'),
          h('input', { id: 'auth-register-password', type: 'password', maxLength: 72, placeholder: 'Password' }),
          h(CwButton, { id: 'player-register', className: 'auth-action', variant: 'secondary' }, 'Создать')
        ),
        h('div', { className: 'providers-card' },
          h('div', { className: 'providers-title' }, 'Соц. логины'),
          h('div', { className: 'providers-grid' },
            h('button', { id: 'provider-google', type: 'button', className: 'provider-btn' }, 'Google'),
            h('button', { id: 'provider-vk', type: 'button', className: 'provider-btn' }, 'VK ID'),
            h('button', { id: 'provider-mailru', type: 'button', className: 'provider-btn', disabled: true }, 'Mail.ru')
          )
        ),
        h('div', { id: 'player-auth-feedback', className: 'auth-feedback hidden', 'aria-live': 'polite' })
      )
    );
  }

  function PlayPanel() {
    return h(CwPanel, { id: 'menu-panel-play', className: 'menu-panel active cw-menu-grid', dataMenuPanel: 'play', active: true },
      h('div', { className: 'cw-column cw-column-main' },
        h(CwPanel, { tag: 'div', id: 'play-deploy-card', className: 'cw-subpanel cw-subpanel-emphasis' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker' }, 'Deploy'),
            h('strong', null, 'Вход в матч')
          ),
          h('label', { id: 'room-code-label', htmlFor: 'room-code' }, 'Код комнаты'),
          h('input', { id: 'room-code', maxLength: 10, placeholder: 'AUTO or ABC123' }),
          h('div', { className: 'actions cw-action-row' },
            h(CwButton, { type: 'submit', dataMode: 'create', variant: 'primary' }, 'Создать матч'),
            h(CwButton, { type: 'submit', dataMode: 'join', className: 'secondary', variant: 'secondary' }, 'Войти по коду')
          ),
          h('div', { id: 'join-feedback', className: 'join-feedback hidden', 'aria-live': 'polite' }),
          h('div', { id: 'death-result', className: 'death-result' }, 'Last result: --')
        ),
        h(CwRunCard, { id: 'game-mode-panel', className: 'rooms-browser game-mode-browser' },
          h('div', { className: 'rooms-head' }, h('span', null, 'Режим боя')),
          h('div', { className: 'game-mode-options' },
            h(CwButton, { className: 'game-mode-option active', dataGameMode: 'normal', variant: 'tab' }, h('b', null, 'Normal'), h('span', null, 'Текущий баланс игры')),
            h(CwButton, { className: 'game-mode-option', dataGameMode: 'hardcore', variant: 'tab' }, h('b', null, 'Hardcore'), h('span', null, 'x3 монстры, x2 HP врагов')),
            h(CwButton, { className: 'game-mode-option', dataGameMode: 'pvp', variant: 'tab' }, h('b', null, 'PvP'), h('span', null, 'До 16 игроков, меньше NPC'))
          ),
          h('div', { id: 'pvp-duration-wrap', className: 'field-row hidden' },
            h('label', { htmlFor: 'pvp-duration-select' }, 'Длительность матча'),
            h('select', { id: 'pvp-duration-select', defaultValue: '10' },
              h('option', { value: '3' }, '3 min'),
              h('option', { value: '5' }, '5 min'),
              h('option', { value: '10' }, '10 min'),
              h('option', { value: '15' }, '15 min')
            )
          )
        ),
        h(CwRunCard, { id: 'rooms-browser', className: 'rooms-browser' },
          h('div', { className: 'rooms-head' },
            h('span', null, 'Активные комнаты'),
            h('button', { type: 'button', id: 'refresh-rooms', className: 'mini' }, 'Refresh')
          ),
          h('div', { id: 'presence-meta', className: 'presence-meta' }, 'Online: -- | In game: -- | In menu: -- | Registered: --'),
          h('div', { id: 'rooms-list', className: 'rooms-list' }, 'Loading...')
        )
      ),
      h('div', { className: 'cw-column cw-column-side' },
        h(CwPanel, { tag: 'div', className: 'cw-subpanel' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker' }, 'Access'),
            h('strong', null, 'Доступ игрока')
          ),
          h(AuthShell)
        ),
        h(CwRunCard, { id: 'play-sync-card', className: 'cw-subpanel cw-subpanel-emphasis' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker' }, 'Sync'),
            h('strong', null, 'Параметры комнаты')
          ),
          h('p', { className: 'cw-copy' }, 'Настройка сетевого режима комнаты: пресет, частота тиков и плавность синхронизации.'),
          h('details', { id: 'sync-settings', className: 'sync-settings' },
            h('summary', null, 'Sync settings (Create room)'),
            h('label', { htmlFor: 'sync-preset' }, 'Preset'),
            h('select', { id: 'sync-preset', defaultValue: 'normal' },
              h('option', { value: 'normal' }, 'Normal (default)'),
              h('option', { value: 'better' }, 'Better'),
              h('option', { value: 'best' }, 'Best'),
              h('option', { value: 'custom' }, 'Custom')
            ),
            h('div', { className: 'sync-grid' },
              h('label', { htmlFor: 'sync-tickrate' }, 'Tickrate'),
              h('input', { id: 'sync-tickrate', type: 'number', min: '20', max: '120', step: '1' }),
              h('label', { htmlFor: 'sync-state-rate' }, 'State send rate (Hz)'),
              h('input', { id: 'sync-state-rate', type: 'number', min: '10', max: '120', step: '1' }),
              h('label', { htmlFor: 'sync-render-delay' }, 'Interp delay (ms)'),
              h('input', { id: 'sync-render-delay', type: 'number', min: '20', max: '250', step: '1' }),
              h('label', { htmlFor: 'sync-max-extrapolation' }, 'Max extrapolation (ms)'),
              h('input', { id: 'sync-max-extrapolation', type: 'number', min: '20', max: '250', step: '1' }),
              h('label', { htmlFor: 'sync-entity-interp' }, 'Entity interp rate'),
              h('input', { id: 'sync-entity-interp', type: 'number', min: '4', max: '50', step: '1' }),
              h('label', { htmlFor: 'sync-bullet-correction' }, 'Bullet correction rate'),
              h('input', { id: 'sync-bullet-correction', type: 'number', min: '4', max: '60', step: '1' }),
              h('label', { htmlFor: 'sync-input-rate' }, 'Input send rate (Hz)'),
              h('input', { id: 'sync-input-rate', type: 'number', min: '10', max: '120', step: '1' })
            )
          )
        )
      )
    );
  }

  function CharactersPanel() {
    return h(CwPanel, { id: 'menu-panel-characters', className: 'menu-panel', dataMenuPanel: 'characters' },
        h(CwPanel, { tag: 'div', className: 'cw-subpanel' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker' }, 'Roster'),
            h('strong', null, 'Персонажи арены')
          ),
          h('div', { id: 'hero-gallery-v2', className: 'hero-gallery-v2', 'aria-live': 'polite' })
        ),
        h(CwPanel, { tag: 'div', className: 'cw-subpanel' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker' }, 'Loadout'),
            h('strong', null, 'Тактическое досье')
          ),
          h('div', { id: 'hero-character-panel', className: 'hero-tree-panel' })
        )
    );
  }

  function SkillsPanel() {
    return h(CwPanel, { id: 'menu-panel-skills', className: 'menu-panel', dataMenuPanel: 'skills' },
      h(CwPanel, { tag: 'div', className: 'cw-subpanel' },
        h('div', { className: 'cw-subpanel-head' },
          h('span', { className: 'cw-kicker' }, 'Skills'),
          h('strong', null, 'Навыки и ветки')
        ),
        h('div', { className: 'cw-skill-legend' },
          h(CwSkillNode, { label: 'База', state: 'is-ready' }),
          h(CwSkillNode, { label: 'Редкий', state: 'is-locked' }),
          h(CwSkillNode, { label: 'Ульта', state: 'is-elite' })
        ),
        h('label', { id: 'character-label' }, 'Character'),
        h('div', { id: 'account-progress-summary', className: 'account-progress-summary' }),
        h('div', { id: 'character-select', className: 'character-select' }),
        h('div', { id: 'hero-tree-panel', className: 'hero-tree-panel' }),
        h('div', { id: 'hero-action-feedback', className: 'hero-action-feedback hidden', 'aria-live': 'polite' })
      )
    );
  }

  function ProfilePanel() {
    return h(CwPanel, { id: 'menu-panel-profile', className: 'menu-panel cw-profile-grid', dataMenuPanel: 'profile' },
      h('div', { className: 'cw-profile-main' },
        h('div', { id: 'profile-summary', className: 'profile-card cw-subpanel' }, 'Profile loading...'),
        h('div', { id: 'profile-character-stats', className: 'profile-card cw-subpanel' }, 'Character stats: soon'),
        h('div', { id: 'profile-achievements', className: 'profile-card cw-subpanel' }, 'Achievements: soon')
      ),
      h('div', { className: 'cw-profile-side' },
        h('div', { id: 'profile-run-history', className: 'profile-card cw-subpanel' }, 'Run history: loading...')
      )
    );
  }

  function RatingPanel() {
    return h(CwPanel, { id: 'menu-panel-rating', className: 'menu-panel', dataMenuPanel: 'rating' },
      h(CwLeaderboardTable, null,
        h('div', { id: 'rating-board', className: 'profile-card cw-subpanel' }, 'Loading leaderboard...')
      )
    );
  }

  function NewsPanel() {
    return h(CwPanel, { id: 'menu-panel-news', className: 'menu-panel', dataMenuPanel: 'news' },
      h(CwNewsCard, null,
        h('div', { id: 'news-feed', className: 'profile-card news-card cw-subpanel' }, 'Loading news...')
      )
    );
  }

  function SettingsPanel() {
    return h(CwPanel, { id: 'menu-panel-menu', className: 'menu-panel', dataMenuPanel: 'menu' },
      h(CwSettingsRow, { className: 'cw-settings-shell' },
        h(CwPanel, { tag: 'section', className: 'cw-subpanel cw-settings-section' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker' }, '\u0413\u0440\u0430\u0444\u0438\u043a\u0430'),
            h('strong', null, '\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e')
          ),
          h('div', { id: 'settings-graphics-host', className: 'cw-settings-host' })
        ),
        h(CwPanel, { tag: 'section', className: 'cw-subpanel cw-settings-section' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker' }, '\u0418\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441'),
            h('strong', null, '\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430')
          ),
          h('div', { id: 'settings-toggles-host', className: 'cw-settings-host' })
        ),
        h('div', { className: 'cw-subpanel-head' },
          h('span', { className: 'cw-kicker' }, 'System'),
          h('strong', null, 'Настройки хаба и HUD')
        ),
        h('div', { id: 'info-panel-menu-host', className: 'info-panel-menu-host settings-source-host' })
      )
    );
  }

  function CwShell() {
    return h('form', { id: 'join-form', className: 'cw-shell', autoComplete: 'off' },
      h('section', { className: 'cw-shell-grid' },
        h('div', { className: 'cw-shell-main' },
          h(CwShellHeading),
          h(CwNavTabs),
          h(SettingsPanel),
          h(PlayPanel),
          h(CharactersPanel),
          h(SkillsPanel),
          h(ProfilePanel),
          h(RatingPanel),
          h(NewsPanel)
        )
      )
    );
  }

  ReactDomGlobal.render(h(CwShell), mountNode);

  const versionTrigger = document.getElementById('menu-version-trigger');
  const versionSlot = document.getElementById('menu-version-slot');
  if (versionTrigger && versionSlot) {
    versionSlot.appendChild(versionTrigger);
  }

  function syncPlayHeroPanelHeights() {
    const leftCard = document.querySelector('#play-deploy-card');
    const rightCard = document.querySelector('#play-sync-card');
    if (!(leftCard instanceof HTMLElement) || !(rightCard instanceof HTMLElement)) return;
    leftCard.style.minHeight = '';
    rightCard.style.minHeight = '';
    const targetHeight = Math.max(leftCard.offsetHeight, rightCard.offsetHeight);
    if (targetHeight > 0) {
      leftCard.style.minHeight = `${targetHeight}px`;
      rightCard.style.minHeight = `${targetHeight}px`;
    }
  }

  const syncPlayHeroPanelHeightsDeferred = () => {
    globalThis.requestAnimationFrame(syncPlayHeroPanelHeights);
  };

  syncPlayHeroPanelHeightsDeferred();
  globalThis.addEventListener('resize', syncPlayHeroPanelHeightsDeferred);
}());
