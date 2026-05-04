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

  function tr(key, fallback) {
    const translate = globalThis.cwI18nT;
    if (typeof translate !== 'function') return fallback;
    const value = translate(key);
    return value && value !== key ? value : fallback;
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
      ['run', tr('ui.main.run', 'Забег')],
      ['story', tr('ui.main.story', 'Сюжет')],
      ['characters', tr('ui.main.characters', 'Персонажи')],
      ['skills', tr('ui.main.skills', 'Навыки')],
      ['profile', tr('ui.main.profile', 'Профиль')],
      ['rating', tr('ui.main.rating', 'Рейтинг')],
      ['news', tr('ui.main.news', 'Новости')],
      ['menu', tr('ui.main.settings', 'Настройки')],
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
      h('div', { id: 'battle-hub-player-card', className: 'battle-hub-player-card', role: 'status', 'aria-live': 'polite' },
        h('div', { className: 'battle-hub-player-avatar-wrap' },
          h('img', { id: 'battle-hub-player-avatar', className: 'battle-hub-player-avatar', src: '/assets/characters/cyber.png', alt: '', loading: 'lazy' }),
          h('span', { id: 'battle-hub-player-level', className: 'battle-hub-player-level' }, 'Hero Lv 1')
        ),
        h('div', { className: 'battle-hub-player-body' },
          h('div', { className: 'battle-hub-player-top' },
            h('strong', { id: 'battle-hub-player-name', className: 'battle-hub-player-name' }, 'Fighter'),
            h('div', { className: 'battle-hub-player-meta' },
              h('span', { id: 'battle-hub-player-account-level', className: 'battle-hub-player-account-level' }, 'Profile Lv 1'),
              h('span', { id: 'battle-hub-player-state', className: 'battle-hub-player-state' }, 'Guest')
            )
          ),
          h('div', { className: 'battle-hub-player-xp' },
            h('span', { className: 'battle-hub-player-xp-track' },
              h('span', { id: 'battle-hub-player-xp-fill', className: 'battle-hub-player-xp-fill', style: { width: '0%' } })
            ),
            h('span', { id: 'battle-hub-player-xp-text', className: 'battle-hub-player-xp-text' }, 'LV 1 · 0 / 1 XP · 0%')
          ),
          h('div', { className: 'battle-hub-profile-stats' },
            h('span', { className: 'battle-hub-profile-stat' },
              h('b', null, 'Skills'),
              h('strong', { id: 'battle-hub-player-skills' }, '0/0')
            ),
            h('span', { className: 'battle-hub-profile-stat' },
              h('b', null, 'Story'),
              h('strong', { id: 'battle-hub-player-story' }, '0/0')
            ),
            h('span', { className: 'battle-hub-profile-stat' },
              h('b', null, 'Heroes'),
              h('strong', { id: 'battle-hub-player-heroes' }, '1/1')
            ),
            h('span', { className: 'battle-hub-profile-stat' },
              h('b', null, 'Runs'),
              h('strong', { id: 'battle-hub-player-runs' }, '0')
            ),
            h('span', { className: 'battle-hub-profile-stat' },
              h('b', null, 'Shards'),
              h('strong', { id: 'battle-hub-player-shards' }, '0')
            ),
            h('span', { className: 'battle-hub-profile-stat' },
              h('b', null, 'SP'),
              h('strong', { id: 'battle-hub-player-skill-points' }, '0')
            )
          ),
          h('div', { id: 'battle-hub-hero-skills', className: 'battle-hub-hero-skills', 'aria-label': 'Selected hero skills' },
            h('div', { className: 'battle-hub-hero-skills-head' },
              h('span', null, 'Hero Skills'),
              h('strong', { id: 'battle-hub-hero-skills-count' }, '0/0 unlocked')
            ),
            h('div', { id: 'battle-hub-hero-skills-list', className: 'battle-hub-hero-skills-list' },
              h('div', { className: 'battle-hub-hero-skill-placeholder' }, 'Loading skills...')
            )
          )
        ),
        h('div', { className: 'battle-hub-profile-rating' },
          h('span', { className: 'battle-hub-profile-rating-label' }, 'Profile Index'),
          h('strong', { id: 'battle-hub-player-rating-value', className: 'battle-hub-profile-rating-value' }, '0'),
          h('span', { id: 'battle-hub-player-rating-detail', className: 'battle-hub-profile-rating-detail' }, 'Build profile'),
          h('div', { className: 'battle-hub-presence-block' },
            h('div', { className: 'battle-hub-presence-head' },
              h('span', null, 'Network'),
              h('button', { id: 'battle-hub-presence-refresh', type: 'button', className: 'battle-hub-presence-refresh' }, 'Refresh')
            ),
            h('div', { id: 'battle-hub-presence', className: 'battle-hub-presence' },
              h('span', null, 'Online --'),
              h('span', null, 'In game --'),
              h('span', null, 'In menu --'),
              h('span', null, 'Registered --')
            )
          )
        ),
        h('div', { id: 'menu-version-slot', className: 'menu-version-slot battle-hub-version-slot', 'aria-hidden': 'true' },
          h('span', { className: 'battle-hub-version-placeholder' })
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
            h('div', { className: 'cw-auth-headline', 'data-i18n-key': 'ui.auth.headline' }, tr('ui.auth.headline', 'Здесь остаётся полноценный экран логина/пароля и место под Google, VK и Mail.'))
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
            h('button', { id: 'provider-mailru', type: 'button', className: 'provider-btn' }, 'Mail.ru')
          )
        ),
        h('div', { id: 'player-rename-panel', className: 'auth-rename-panel hidden' },
          h('div', { className: 'auth-copy' }, 'Выберите постоянный никнейм для аккаунта. Он будет закреплён за этим входом.'),
          h('label', { htmlFor: 'player-rename-nickname' }, 'Новый никнейм'),
          h('input', { id: 'player-rename-nickname', maxLength: 18, placeholder: 'Nickname' }),
          h(CwButton, { id: 'player-rename-save', className: 'auth-action', variant: 'primary' }, 'Сохранить ник')
        ),
        h('div', { id: 'player-auth-feedback', className: 'auth-feedback hidden', 'aria-live': 'polite' })
      )
    );
  }

  function SyncSettingsCard(props = {}) {
    return h(CwRunCard, { id: props.id || 'settings-sync-card', className: cx('cw-subpanel', 'cw-subpanel-emphasis', props.className) },
      h('div', { className: 'cw-subpanel-head' },
        h('span', { className: 'cw-kicker' }, 'Sync'),
        h('strong', { 'data-i18n-key': 'ui.play.room_settings' }, tr('ui.play.room_settings', '\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u043a\u043e\u043c\u043d\u0430\u0442\u044b'))
      ),
      h('p', { className: 'cw-copy', 'data-i18n-key': 'ui.play.room_settings_desc' }, tr('ui.play.room_settings_desc', '\u0421\u0435\u0442\u0435\u0432\u043e\u0439 \u0440\u0435\u0436\u0438\u043c \u043d\u043e\u0432\u043e\u0439 \u043a\u043e\u043c\u043d\u0430\u0442\u044b: \u043f\u0440\u0435\u0441\u0435\u0442, \u0447\u0430\u0441\u0442\u043e\u0442\u0430 \u0442\u0438\u043a\u043e\u0432 \u0438 \u043f\u043b\u0430\u0432\u043d\u043e\u0441\u0442\u044c \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u0438.')),
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
    );
  }

  function ActiveRoomsCard() {
    return h(CwRunCard, { id: 'rooms-browser', className: 'rooms-browser' },
      h('div', { className: 'rooms-head' },
        h('span', null, '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u043a\u043e\u043c\u043d\u0430\u0442\u044b'),
        h('button', { type: 'button', id: 'refresh-rooms', className: 'mini' }, 'Refresh')
      ),
      h('div', { id: 'presence-meta', className: 'presence-meta' }, 'Online: -- | In game: -- | In menu: -- | Registered: --'),
      h('div', { id: 'rooms-list', className: 'rooms-list' }, 'Loading...')
    );
  }

  function DeployCard() {
    return h(CwPanel, { tag: 'div', id: 'play-deploy-card', className: 'cw-subpanel cw-subpanel-emphasis' },
      h('div', { className: 'cw-subpanel-head' },
        h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.play.deploy' }, tr('ui.play.deploy', 'Deploy')),
        h('strong', { 'data-i18n-key': 'ui.play.match_entry' }, tr('ui.play.match_entry', '\u0412\u0445\u043e\u0434 \u0432 \u043c\u0430\u0442\u0447'))
      ),
      h('div', { id: 'deploy-selection-summary', className: 'deploy-selection-summary', 'aria-live': 'polite' },
        h('span', { className: 'deploy-selection-chip' }, h('b', null, '\u0417\u0430\u0431\u0435\u0433'), h('strong', { id: 'deploy-summary-run' }, '--')),
        h('span', { className: 'deploy-selection-chip' }, h('b', null, '\u0426\u0435\u043b\u044c'), h('strong', { id: 'deploy-summary-target' }, '--')),
        h('span', { className: 'deploy-selection-chip' }, h('b', null, '\u0420\u0435\u0436\u0438\u043c'), h('strong', { id: 'deploy-summary-mode' }, '--'))
      ),
      h('label', { id: 'room-code-label', htmlFor: 'room-code' }, '\u041a\u043e\u0434 \u043a\u043e\u043c\u043d\u0430\u0442\u044b'),
      h('input', { id: 'room-code', maxLength: 10, placeholder: 'AUTO or ABC123' }),
      h('div', { className: 'actions cw-action-row' },
        h(CwButton, { type: 'submit', dataMode: 'create', variant: 'primary' }, '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043c\u0430\u0442\u0447'),
        h(CwButton, { type: 'submit', dataMode: 'join', className: 'secondary', variant: 'secondary' }, '\u0412\u043e\u0439\u0442\u0438 \u043f\u043e \u043a\u043e\u0434\u0443')
      ),
      h('div', { id: 'join-feedback', className: 'join-feedback hidden', 'aria-live': 'polite' }),
      h('div', { id: 'death-result', className: 'death-result' }, 'Last result: --')
    );
  }

  function PlayPanel() {
    return h(CwPanel, { id: 'menu-panel-play', className: 'menu-panel active cw-menu-grid', dataMenuPanel: 'play', active: true },
      h(DeployCard),
      h(CwPanel, { tag: 'div', id: 'campaign-browser-card', className: 'cw-subpanel battle-tab-card battle-tab-story hidden' },
        h('div', { className: 'cw-subpanel-head' },
          h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.play.story_kicker' }, tr('ui.play.story_kicker', 'Story')),
          h('strong', { 'data-i18n-key': 'ui.play.story_campaigns' }, tr('ui.play.story_campaigns', '\u0421\u044e\u0436\u0435\u0442\u043d\u044b\u0435 \u043a\u0430\u043c\u043f\u0430\u043d\u0438\u0438'))
        ),
        h('div', { id: 'campaign-browser-host', className: 'campaign-browser-host' }, 'Campaign data loading...')
      ),
      h('div', { className: 'cw-column cw-column-main' },
        h(CwPanel, { tag: 'div', id: 'run-setup-card', className: 'cw-subpanel battle-tab-card battle-tab-run' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.play.run_setup' }, tr('ui.play.run_setup', 'Run Setup')),
            h('strong', { 'data-i18n-key': 'ui.play.run_maps' }, tr('ui.play.run_maps', '\u041a\u0430\u0440\u0442\u044b \u0437\u0430\u0431\u0435\u0433\u0430'))
          ),
          h(CwRunCard, { id: 'game-mode-panel', className: 'rooms-browser game-mode-browser run-setup-mode-panel' },
            h('div', { className: 'rooms-head' }, h('span', null, '\u0420\u0435\u0436\u0438\u043c \u0431\u043e\u044f')),
            h('div', { className: 'game-mode-options' },
              h(CwButton, { className: 'game-mode-option active', dataGameMode: 'normal', variant: 'tab' }, h('b', null, 'Normal'), h('span', null, '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0431\u0430\u043b\u0430\u043d\u0441 \u0438\u0433\u0440\u044b')),
              h(CwButton, { className: 'game-mode-option', dataGameMode: 'hardcore', variant: 'tab' }, h('b', null, 'Hardcore'), h('span', null, 'x3 \u043c\u043e\u043d\u0441\u0442\u0440\u044b, x2 HP \u0432\u0440\u0430\u0433\u043e\u0432')),
              h(CwButton, { className: 'game-mode-option', dataGameMode: 'pvp', variant: 'tab' }, h('b', null, 'PvP'), h('span', null, '\u0414\u043e 16 \u0438\u0433\u0440\u043e\u043a\u043e\u0432, \u043c\u0435\u043d\u044c\u0448\u0435 NPC'))
            ),
            h('div', { id: 'pvp-duration-wrap', className: 'field-row hidden' },
              h('label', { htmlFor: 'pvp-duration-select' }, '\u0414\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u043c\u0430\u0442\u0447\u0430'),
              h('select', { id: 'pvp-duration-select', defaultValue: '10' },
                h('option', { value: '3' }, '3 min'),
                h('option', { value: '5' }, '5 min'),
                h('option', { value: '10' }, '10 min'),
                h('option', { value: '15' }, '15 min')
              )
            )
          ),
          h('div', { id: 'run-setup-host', className: 'run-setup-host' }, 'Loading run setup...')
        )
      ),
      h('div', { className: 'cw-column cw-column-side' },
        h(ActiveRoomsCard),
        h(CwPanel, { tag: 'div', id: 'player-access-card', className: 'cw-subpanel player-access-card' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker' }, 'Access'),
            h('strong', null, '\u0414\u043e\u0441\u0442\u0443\u043f \u0438\u0433\u0440\u043e\u043a\u0430')
          ),
          h(AuthShell)
        )
      )
    );
  }

  function CharactersPanel() {
    return h(CwPanel, { id: 'menu-panel-characters', className: 'menu-panel', dataMenuPanel: 'characters' },
        h(CwPanel, { tag: 'div', className: 'cw-subpanel' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.characters.roster' }, tr('ui.characters.roster', 'Roster')),
            h('strong', { 'data-i18n-key': 'ui.characters.arena' }, tr('ui.characters.arena', 'Персонажи арены'))
          ),
          h('div', { id: 'hero-gallery-v2', className: 'hero-gallery-v2', 'aria-live': 'polite' })
        ),
        h(CwPanel, { tag: 'div', className: 'cw-subpanel' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.characters.loadout' }, tr('ui.characters.loadout', 'Loadout')),
            h('strong', { 'data-i18n-key': 'ui.characters.tactical_dossier' }, tr('ui.characters.tactical_dossier', 'Тактическое досье'))
          ),
          h('div', { id: 'hero-character-panel', className: 'hero-tree-panel' })
        )
    );
  }

  function SkillsPanel() {
    return h(CwPanel, { id: 'menu-panel-skills', className: 'menu-panel', dataMenuPanel: 'skills' },
      h(CwPanel, { tag: 'div', className: 'cw-subpanel' },
        h('div', { className: 'cw-subpanel-head' },
          h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.characters.skills' }, tr('ui.characters.skills', 'Skills')),
          h('strong', { 'data-i18n-key': 'ui.characters.skills_tree' }, tr('ui.characters.skills_tree', 'Навыки и ветки'))
        ),
        h('div', { className: 'cw-skill-legend' },
          h(CwSkillNode, { label: tr('ui.characters.skill_base', 'База'), state: 'is-ready' }),
          h(CwSkillNode, { label: tr('ui.characters.skill_rare', 'Редкий'), state: 'is-locked' }),
          h(CwSkillNode, { label: tr('ui.characters.skill_ultimate', 'Ульта'), state: 'is-elite' })
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
            h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.settings.section.graphics' }, tr('ui.settings.section.graphics', '\u0413\u0440\u0430\u0444\u0438\u043a\u0430')),
            h('strong', { 'data-i18n-key': 'ui.settings.section.quality' }, tr('ui.settings.section.quality', '\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e'))
          ),
          h('div', { id: 'settings-graphics-host', className: 'cw-settings-host' })
        ),
        h(CwPanel, { tag: 'section', className: 'cw-subpanel cw-settings-section' },
          h('div', { className: 'cw-subpanel-head' },
            h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.settings.section.interface' }, tr('ui.settings.section.interface', '\u0418\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441')),
            h('strong', { 'data-i18n-key': 'ui.settings.section.interface_options' }, tr('ui.settings.section.interface_options', '\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430'))
          ),
          h('div', { id: 'settings-toggles-host', className: 'cw-settings-host' })
        ),
        h(SyncSettingsCard, { id: 'settings-sync-card', className: 'cw-settings-sync-section' }),
        h('div', { className: 'cw-subpanel-head' },
          h('span', { className: 'cw-kicker', 'data-i18n-key': 'ui.settings.section.system' }, tr('ui.settings.section.system', 'System')),
          h('strong', { 'data-i18n-key': 'ui.settings.section.hub_hud' }, tr('ui.settings.section.hub_hud', '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0445\u0430\u0431\u0430 \u0438 HUD'))
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

}());
