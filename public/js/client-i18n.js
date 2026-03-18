(() => {
  const LANG_STORAGE_KEY = 'cw:uiLang';
  const DEFAULT_LANG = 'ru';
  const SUPPORTED_LANGS = new Set(['en', 'ru']);

  const I18N = {
    en: {
      'settings.language': 'Language',
      'settings.language.en': 'English',
      'settings.language.ru': 'Russian',
      'ui.menu': 'Menu',
      'ui.show_menu': 'Show menu',
      'ui.hide_menu': 'Hide menu',
      'ui.settings.show_fps': 'Show FPS',
      'ui.settings.show_chat': 'Show chat',
      'ui.settings.shadows': 'Shadows',
      'ui.settings.show_minimap': 'Show minimap',
      'ui.settings.bullet_tracers': 'Bullet tracers',
      'ui.settings.enemy_hp_bars': 'Enemy HP Bars',
      'ui.settings.extra_blood': 'Extra blood',
      'ui.settings.hit_effects': 'Hit effects',
      'ui.settings.auto_fire': 'Auto fire',
      'ui.settings.dynamic_sticks': 'Dynamic sticks',
      'ui.settings.show_aim_stick': 'Show aim stick',
      'ui.settings.connection_indicator': 'Connection indicator',
      'ui.session.exit_run': 'Exit Run',
      'ui.chat.placeholder': 'Enter to chat. /mute name',
      'ui.chat.send': 'Send',
      'ui.replay.exit': 'Exit Replay',
      'ui.replay.title': 'Replay',
      'ui.replay.load': 'Load Replay',
      'ui.replay.not_loaded': 'Replay not loaded.',
      'ui.replay.loading': 'Loading replay...',
      'ui.replay.preparing': 'Preparing replay data...',
      'ui.auth.player_access': 'Player access',
      'ui.auth.guest': 'Guest',
      'ui.auth.login': 'Login',
      'ui.auth.register': 'Register',
      'ui.main.play': 'Play',
      'ui.main.characters': 'Characters',
      'ui.main.skills': 'Skills',
      'ui.main.profile': 'Profile',
      'ui.main.rating': 'Rating',
      'ui.main.news': 'News',
      'ui.play.mode.normal': 'Normal',
      'ui.play.mode.normal_desc': 'Current game balance',
      'ui.play.mode.hardcore': 'Hardcore',
      'ui.play.mode.hardcore_desc': 'x3 monsters, enemy HP x2',
      'ui.version.open': 'Open version history',
      'ui.version.title': 'Version history',
      'ui.close': 'Close',
      'ui.loading': 'Loading...',
      'ui.news.title': 'News',
      'ui.news.loading': 'Loading news...',
      'ui.news.back': '← Back to news list',
      'ui.news.comments': 'Comments',
      'ui.news.empty': 'No news yet.',
      'ui.news.comment_placeholder': 'Write a comment...',
      'ui.news.send': 'Send',
      'ui.news.sending': 'Sending...',
      'ui.news.cancel': 'Cancel',
      'ui.news.reply': 'Reply',
      'ui.news.close_reply': 'Close reply',
      'ui.news.delete': 'Delete',
      'ui.news.share': 'Share',
      'ui.news.share_copied': 'Link copied',
      'ui.news.opening': 'Opening news...',
      'ui.news.no_comments': 'No comments yet.',
      'ui.news.auth_hint': 'Log in to leave comments and replies.',
      'ui.rating.title': 'Player Rating',
      'ui.rating.loading': 'Loading rating...',
      'ui.rating.mode': 'Mode:',
      'ui.rating.empty': 'No data yet.',
      'ui.rating.mode.all': 'All modes',
      'ui.rating.mode.normal': 'Normal',
      'ui.rating.mode.hardcore': 'Hardcore',
      'ui.profile.player': 'Player profile',
      'ui.profile.loading': 'Loading profile...',
      'ui.profile.unavailable': 'Profile for this nickname is unavailable.',
      'ui.profile.load_failed': 'Failed to load profile.',
      'ui.profile.open_failed': 'Failed to open profile.',
      'ui.profile.searching': 'Searching account by nickname...',
      'ui.profile.history': 'Run history ({total})',
      'ui.profile.history_empty': 'Runs not found.',
      'ui.profile.info': 'Account info',
      'ui.profile.created': 'Created',
      'ui.profile.last_login': 'Last login',
      'ui.profile.heroes': 'Heroes',
      'ui.profile.no_heroes': 'No hero data.',
      'ui.profile.hero_open': 'Unlocked',
      'ui.profile.hero_closed': 'Locked',
      'ui.play.mode.unknown': 'Unknown',
      'ui.version.v081': 'Chat is now stored in replay and synced during playback.',
      'ui.version.v080': 'Added game version badge in menu and version history modal.',
      'ui.version.v074': 'Added news and improved profile with run history.',
      'ui.version.v070': 'Updated main menu tabs, character gallery and mode selection.',
      'ui.death.last_result': 'Last result: --',
      'ui.death.you_died': 'You died. Last result is shown below.',
      'ui.death.collecting_rewards': 'Collecting rewards...',
      'ui.death.back_to_menu': 'Back to menu',
      'ui.chat.system.player': 'Player',
      'ui.chat.cmd.usage_mute': 'Usage: /mute nickname',
      'ui.chat.cmd.usage_unmute': 'Usage: /unmute nickname',
      'ui.chat.cmd.muted': 'Muted {name}.',
      'ui.chat.cmd.unmuted': 'Unmuted {name}.',
      'ui.chat.cmd.muted_list': 'Muted: {names}',
      'ui.chat.cmd.muted_empty': 'Muted list is empty.',
      'ui.chat.cmd.help': 'Chat commands: /mute <name>, /unmute <name>, /muted',
      'ui.chat.cmd.unknown': 'Unknown chat command. Use /chathelp',
      'ui.chat.unavailable': 'Chat is unavailable while disconnected.',
      'ui.hud.time': 'Time',
      'ui.hud.boss_in': 'Boss in',
      'ui.hud.threat': 'Threat',
      'ui.hud.boss_active': 'Boss: ACTIVE',
      'ui.scoreboard.players': 'Players',
      'ui.scoreboard.expand': 'Expand players list',
      'ui.scoreboard.minimize': 'Minimize players list',
      'ui.auth.summary_guest': 'Guest mode. Registered nicknames require login.',
      'ui.auth.logout': 'Log out',
      'ui.auth.mode_label': 'Player access mode',
      'ui.auth.guest_copy': 'Play immediately with any free nickname that is not registered.',
      'ui.auth.registered_nickname': 'Registered nickname',
      'ui.auth.password': 'Password',
      'ui.auth.new_nickname': 'New nickname',
      'ui.auth.register_nickname': 'Register nickname',
      'ui.auth.external_signin': 'External sign-in',
      'ui.auth.google_soon': 'Google coming soon',
      'ui.auth.vk_soon': 'VK ID coming soon',
      'ui.auth.mail_soon': 'Mail.ru coming soon',
      'ui.nickname': 'Nickname',
      'ui.nickname_hint_guest': 'Guest mode: choose any free nickname.',
      'ui.play.room_code_optional': 'Room code (optional)',
      'ui.play.room_code_placeholder': 'AUTO or e.g. ABC123',
      'ui.play.sync_settings': 'Sync settings (Create room)',
      'ui.play.preset': 'Preset',
      'ui.play.preset.normal': 'Normal (default)',
      'ui.play.preset.better': 'Better',
      'ui.play.preset.best': 'Best',
      'ui.play.preset.custom': 'Custom',
      'ui.play.tickrate': 'Tickrate',
      'ui.play.state_send_rate': 'State send rate (Hz)',
      'ui.play.interp_delay': 'Interp delay (ms)',
      'ui.play.max_extrapolation': 'Max extrapolation (ms)',
      'ui.play.entity_interp': 'Entity interp rate',
      'ui.play.bullet_correction': 'Bullet correction rate',
      'ui.play.input_send_rate': 'Input send rate (Hz)',
      'ui.play.create_room': 'Create room',
      'ui.play.join_code': 'Join code',
      'ui.play.game_mode': 'Game mode',
      'ui.play.active_rooms': 'Active rooms',
      'ui.refresh': 'Refresh',
      'ui.profile.loading_panel': 'Profile loading...',
      'ui.profile.achievements_soon': 'Achievements: soon',
      'ui.profile.character_stats_soon': 'Character stats: soon',
      'ui.profile.run_history_loading': 'Run history: loading...',
      'ui.rating.loading_leaderboard': 'Loading leaderboard...',
      'ui.news.loading_news': 'Loading news...',
      'ui.record.run_details': 'Run details',
      'ui.record.no_data': 'No data.',
      'ui.record.play_replay': 'Play Replay',
      'ui.record.show_replay_ingame': 'Show Replay In Game',
      'ui.record.copy_replay_link': 'Copy Replay Link',
      'ui.auth.summary_logged_in': 'Logged in as {nickname}. This nickname is reserved for your account.',
      'ui.auth.nick_authenticated': 'Authenticated nickname. Join will use your reserved account name.',
      'ui.auth.nick_registered': 'Nickname {nickname} is registered. Use Login to play with it.',
      'ui.auth.nick_in_use': 'Nickname {nickname} is already in use right now.',
      'ui.auth.nick_available': 'Nickname {nickname} is available for guest play.',
      'ui.auth.logged_in_short': 'Logged in as {nickname}.',
      'ui.auth.registered_short': 'Nickname {nickname} registered.',
      'ui.skill.no_description': 'No description',
      'ui.skill.ready': 'ready',
      'ui.skill.cooldown': 'cooldown',
      'ui.profile.account': 'Account',
      'ui.profile.skill_points': 'Skill points',
      'ui.profile.shards': 'Shards',
      'ui.profile.runs': 'Runs',
      'ui.profile.profile': 'Profile',
      'ui.profile.hero_stats': 'Hero stats',
      'ui.profile.achievements': 'Achievements',
      'ui.profile.achievements_hint': 'First Blood, Survivor, Boss Hunter and account milestones can be shown here.',
      'ui.profile.guest_mode': 'Guest mode:',
      'ui.profile.guest_progression_hint': 'account progression, heroes and talents are saved only for logged in players.',
      'ui.profile.guest_profile': 'Guest profile',
      'ui.profile.login_to_save': 'Login to save profile progression, achievements and hero stats.',
      'ui.profile.login_required': 'Login required.',
      'ui.profile.run_history_failed': 'Failed to load run history.',
      'ui.hero.card': 'Hero Card',
      'ui.hero.unlock': 'Unlock',
      'ui.hero.unlock_btn': 'Unlock hero',
      'ui.hero.select_btn': 'Select hero',
      'ui.hero.unlocked': 'Unlocked',
      'ui.hero.locked': 'Locked',
      'ui.hero.selected_short': 'Selected',
      'ui.hero.selected_label': 'Selected hero',
      'ui.hero.selected': '{hero} selected.',
      'ui.hero.unlocked_msg': '{hero} unlocked.',
      'ui.hero.cores': 'Cores',
      'ui.hero.aria': 'Hero {hero}',
      'ui.auth.login_required_unlock': 'Login to unlock/progress',
      'ui.record.no_skills': 'No skills picked.',
      'hero.cyber.name': 'Cyber',
      'hero.scout.name': 'Scout',
      'hero.shadow.name': 'Shadow',
      'hero.medic.name': 'Medic',
      'hero.raider.name': 'Raider',
      'hero.cyber.tagline': 'Universal adaptive operator',
      'hero.scout.tagline': 'Fast recon and chase specialist',
      'hero.shadow.tagline': 'Ambush and burst assassin',
      'hero.medic.tagline': 'Sustain and recovery master',
      'hero.raider.tagline': 'Frontline brawler and bruiser',
      'hero.node.cyber_overclock.name': 'Overclock',
      'hero.node.cyber_overclock.desc': '+fire rate',
      'hero.node.cyber_nano_core.name': 'Nano Core',
      'hero.node.cyber_nano_core.desc': '+damage',
      'hero.node.cyber_barrier.name': 'Barrier Matrix',
      'hero.node.cyber_barrier.desc': '+max HP',
      'hero.node.cyber_magnet.name': 'Mag Sweep',
      'hero.node.cyber_magnet.desc': '+pickup radius',
      'hero.node.scout_stride.name': 'Long Stride',
      'hero.node.scout_stride.desc': '+move speed',
      'hero.node.scout_reload.name': 'Quick Hands',
      'hero.node.scout_reload.desc': '+fire rate',
      'hero.node.scout_dodge.name': 'Evasive Roll',
      'hero.node.scout_dodge.desc': '+dodge charge',
      'hero.node.scout_shots.name': 'Steady Burst',
      'hero.node.scout_shots.desc': '+damage',
      'hero.node.shadow_killer.name': 'Killer Instinct',
      'hero.node.shadow_killer.desc': '+damage',
      'hero.node.shadow_haste.name': 'Dark Tempo',
      'hero.node.shadow_haste.desc': '+fire rate',
      'hero.node.shadow_blink.name': 'Blink Step',
      'hero.node.shadow_blink.desc': '+move speed',
      'hero.node.shadow_sting.name': 'Venom Edge',
      'hero.node.shadow_sting.desc': '+damage +speed',
      'hero.node.medic_aid.name': 'Field Aid',
      'hero.node.medic_aid.desc': '+regen',
      'hero.node.medic_plating.name': 'Vital Plating',
      'hero.node.medic_plating.desc': '+max HP',
      'hero.node.medic_focus.name': 'Combat Focus',
      'hero.node.medic_focus.desc': '+damage',
      'hero.node.medic_aura.name': 'Recovery Aura',
      'hero.node.medic_aura.desc': '+pickup radius',
      'hero.node.raider_rage.name': 'Battle Rage',
      'hero.node.raider_rage.desc': '+damage',
      'hero.node.raider_armor.name': 'Iron Skin',
      'hero.node.raider_armor.desc': '+max HP',
      'hero.node.raider_push.name': 'Relentless Push',
      'hero.node.raider_push.desc': '+move speed',
      'hero.node.raider_charge.name': 'War Charge',
      'hero.node.raider_charge.desc': '+dodge charge',
      'skill.weapon_mastery.name': 'Weapon Mastery',
      'skill.rapid_reload.name': 'Rapid Reload',
      'skill.vitality.name': 'Vitality',
      'skill.haste.name': 'Haste',
      'skill.magnetism.name': 'Magnetism',
      'skill.bloodlust.name': 'Bloodlust',
      'skill.regeneration.name': 'Regeneration',
      'skill.dodge_instinct.name': 'Dodge Instinct',
      'skill.pistol_buddy.name': 'Pistol Buddy',
      'skill.smg_buddy.name': 'SMG Buddy',
      'skill.shotgun_buddy.name': 'Shotgun Buddy',
      'skill.sniper_buddy.name': 'Sniper Buddy',
      'skill.shockwave.name': 'Shockwave',
      'skill.blade_orbit.name': 'Blade Orbit',
      'skill.chain_lightning.name': 'Chain Lightning',
      'skill.laser_strike.name': 'Laser Strike',
      'skill.homing_missiles.name': 'Homing Missiles',
      'skill.weapon_mastery.desc': '+damage',
      'skill.rapid_reload.desc': '+fire rate',
      'skill.vitality.desc': '+max HP',
      'skill.haste.desc': '+move speed',
      'skill.magnetism.desc': '+XP pickup radius',
      'skill.bloodlust.desc': '+damage +fire rate',
      'skill.regeneration.desc': 'HP regen/sec',
      'skill.dodge_instinct.desc': '+jump charges',
      'skill.pistol_buddy.desc': '+1 pistol bot',
      'skill.smg_buddy.desc': '+1 SMG bot',
      'skill.shotgun_buddy.desc': '+1 shotgun bot',
      'skill.sniper_buddy.desc': '+1 sniper bot',
      'skill.shockwave.desc': 'AoE blast around hero',
      'skill.blade_orbit.desc': 'Hits nearest enemies',
      'skill.chain_lightning.desc': 'Chains to nearest enemies',
      'skill.laser_strike.desc': 'Instantly zaps nearest enemies',
      'skill.homing_missiles.desc': 'Launches seeking rockets at nearby enemies',
    },
    ru: {
      'settings.language': 'Язык',
      'settings.language.en': 'English',
      'settings.language.ru': 'Русский',
      'ui.menu': 'Меню',
      'ui.show_menu': 'Показать меню',
      'ui.hide_menu': 'Скрыть меню',
      'ui.settings.show_fps': 'Показывать FPS',
      'ui.settings.show_chat': 'Показывать чат',
      'ui.settings.shadows': 'Тени',
      'ui.settings.show_minimap': 'Показывать миникарту',
      'ui.settings.bullet_tracers': 'Трассеры пуль',
      'ui.settings.enemy_hp_bars': 'HP врагов',
      'ui.settings.extra_blood': 'Больше крови',
      'ui.settings.hit_effects': 'Эффекты попаданий',
      'ui.settings.auto_fire': 'Авто-огонь',
      'ui.settings.dynamic_sticks': 'Динамические стики',
      'ui.settings.show_aim_stick': 'Показывать стик прицеливания',
      'ui.settings.connection_indicator': 'Индикатор соединения',
      'ui.session.exit_run': 'Выйти из забега',
      'ui.chat.placeholder': 'Enter для чата. /mute ник',
      'ui.chat.send': 'Отправить',
      'ui.replay.exit': 'Выйти из реплея',
      'ui.replay.title': 'Реплей',
      'ui.replay.load': 'Загрузить реплей',
      'ui.replay.not_loaded': 'Реплей не загружен.',
      'ui.replay.loading': 'Загрузка реплея...',
      'ui.replay.preparing': 'Подготовка данных реплея...',
      'ui.auth.player_access': 'Доступ игрока',
      'ui.auth.guest': 'Гость',
      'ui.auth.login': 'Вход',
      'ui.auth.register': 'Регистрация',
      'ui.main.play': 'Играть',
      'ui.main.characters': 'Персонажи',
      'ui.main.skills': 'Навыки',
      'ui.main.profile': 'Профиль',
      'ui.main.rating': 'Рейтинг',
      'ui.main.news': 'Новости',
      'ui.play.mode.normal': 'Обычный',
      'ui.play.mode.normal_desc': 'Текущий баланс игры',
      'ui.play.mode.hardcore': 'Хард-кор',
      'ui.play.mode.hardcore_desc': 'x3 монстров, HP врагов x2',
      'ui.version.open': 'Открыть историю версий',
      'ui.version.title': 'История версий',
      'ui.close': 'Закрыть',
      'ui.loading': 'Загрузка...',
      'ui.news.title': 'Новости',
      'ui.news.loading': 'Загрузка новостей...',
      'ui.news.back': '← К списку новостей',
      'ui.news.comments': 'Комментарии',
      'ui.news.empty': 'Пока новостей нет.',
      'ui.news.comment_placeholder': 'Напишите комментарий...',
      'ui.news.send': 'Отправить',
      'ui.news.sending': 'Отправка...',
      'ui.news.cancel': 'Отмена',
      'ui.news.reply': 'Ответить',
      'ui.news.close_reply': 'Закрыть ответ',
      'ui.news.delete': 'Удалить',
      'ui.news.share': 'Поделиться',
      'ui.news.share_copied': 'Ссылка скопирована',
      'ui.news.opening': 'Открываем новость...',
      'ui.news.no_comments': 'Пока нет комментариев.',
      'ui.news.auth_hint': 'Войдите в аккаунт, чтобы оставлять комментарии и ответы.',
      'ui.rating.title': 'Рейтинг игроков',
      'ui.rating.loading': 'Загрузка рейтинга...',
      'ui.rating.mode': 'Режим:',
      'ui.rating.empty': 'Пока нет данных.',
      'ui.rating.mode.all': 'Все режимы',
      'ui.rating.mode.normal': 'Обычный',
      'ui.rating.mode.hardcore': 'Хард-кор',
      'ui.profile.player': 'Профиль игрока',
      'ui.profile.loading': 'Загрузка профиля...',
      'ui.profile.unavailable': 'Профиль для этого ника недоступен.',
      'ui.profile.load_failed': 'Не удалось загрузить профиль.',
      'ui.profile.open_failed': 'Не удалось открыть профиль.',
      'ui.profile.searching': 'Поиск аккаунта по нику...',
      'ui.profile.history': 'История забегов ({total})',
      'ui.profile.history_empty': 'Забеги не найдены.',
      'ui.profile.info': 'Инфо аккаунта',
      'ui.profile.created': 'Создан',
      'ui.profile.last_login': 'Последний вход',
      'ui.profile.heroes': 'Герои',
      'ui.profile.no_heroes': 'Нет данных по героям.',
      'ui.profile.hero_open': 'Открыт',
      'ui.profile.hero_closed': 'Закрыт',
      'ui.play.mode.unknown': 'Неизвестно',
      'ui.version.v081': 'Чат теперь сохраняется в реплей и воспроизводится синхронно при просмотре повтора.',
      'ui.version.v080': 'Новый блок версии в меню: кнопка справа снизу и окно с историей обновлений.',
      'ui.version.v074': 'Добавлены новости и улучшен экран профиля с историей забегов.',
      'ui.version.v070': 'Обновлено главное меню: вкладки, галерея персонажей и доработанный выбор режима.',
      'ui.death.last_result': 'Последний результат: --',
      'ui.death.you_died': 'Вы погибли. Последний результат показан ниже.',
      'ui.death.collecting_rewards': 'Считаем награды...',
      'ui.death.back_to_menu': 'В меню',
      'ui.chat.system.player': 'Игрок',
      'ui.chat.cmd.usage_mute': 'Использование: /mute ник',
      'ui.chat.cmd.usage_unmute': 'Использование: /unmute ник',
      'ui.chat.cmd.muted': 'Заглушен {name}.',
      'ui.chat.cmd.unmuted': 'Разглушен {name}.',
      'ui.chat.cmd.muted_list': 'Заглушены: {names}',
      'ui.chat.cmd.muted_empty': 'Список заглушенных пуст.',
      'ui.chat.cmd.help': 'Команды чата: /mute <ник>, /unmute <ник>, /muted',
      'ui.chat.cmd.unknown': 'Неизвестная команда чата. Используйте /chathelp',
      'ui.chat.unavailable': 'Чат недоступен при отключении.',
      'ui.hud.time': '\u0412\u0440\u0435\u043c\u044f',
      'ui.hud.boss_in': '\u0411\u043e\u0441\u0441 \u0447\u0435\u0440\u0435\u0437',
      'ui.hud.threat': '\u0423\u0433\u0440\u043e\u0437\u0430',
      'ui.hud.boss_active': '\u0411\u043e\u0441\u0441: \u0410\u041a\u0422\u0418\u0412\u0415\u041d',
      'ui.scoreboard.players': '\u0418\u0433\u0440\u043e\u043a\u0438',
      'ui.scoreboard.expand': '\u0420\u0430\u0437\u0432\u0435\u0440\u043d\u0443\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u0438\u0433\u0440\u043e\u043a\u043e\u0432',
      'ui.scoreboard.minimize': '\u0421\u0432\u0435\u0440\u043d\u0443\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u0438\u0433\u0440\u043e\u043a\u043e\u0432',
      'ui.auth.summary_guest': 'Гостевой режим. Зарегистрированные ники требуют входа.',
      'ui.auth.logout': 'Выйти',
      'ui.auth.mode_label': 'Режим доступа игрока',
      'ui.auth.guest_copy': 'Играйте сразу с любым свободным ником, который не занят.',
      'ui.auth.registered_nickname': 'Зарегистрированный ник',
      'ui.auth.password': 'Пароль',
      'ui.auth.new_nickname': 'Новый ник',
      'ui.auth.register_nickname': 'Зарегистрировать ник',
      'ui.auth.external_signin': 'Внешний вход',
      'ui.auth.google_soon': 'Google скоро',
      'ui.auth.vk_soon': 'VK ID скоро',
      'ui.auth.mail_soon': 'Mail.ru скоро',
      'ui.nickname': 'Никнейм',
      'ui.nickname_hint_guest': 'Гостевой режим: выберите любой свободный ник.',
      'ui.play.room_code_optional': 'Код комнаты (необязательно)',
      'ui.play.room_code_placeholder': 'AUTO или, например, ABC123',
      'ui.play.sync_settings': 'Настройки синхронизации (Создание комнаты)',
      'ui.play.preset': 'Пресет',
      'ui.play.preset.normal': 'Обычный (по умолчанию)',
      'ui.play.preset.better': 'Лучше',
      'ui.play.preset.best': 'Лучший',
      'ui.play.preset.custom': 'Кастом',
      'ui.play.tickrate': 'Тикрейт',
      'ui.play.state_send_rate': 'Частота отправки стейта (Гц)',
      'ui.play.interp_delay': 'Задержка интерполяции (мс)',
      'ui.play.max_extrapolation': 'Макс. экстраполяция (мс)',
      'ui.play.entity_interp': 'Частота интерполяции сущностей',
      'ui.play.bullet_correction': 'Частота коррекции пуль',
      'ui.play.input_send_rate': 'Частота отправки инпута (Гц)',
      'ui.play.create_room': 'Создать комнату',
      'ui.play.join_code': 'Войти по коду',
      'ui.play.game_mode': 'Режим игры',
      'ui.play.active_rooms': 'Активные комнаты',
      'ui.refresh': 'Обновить',
      'ui.profile.loading_panel': 'Загрузка профиля...',
      'ui.profile.achievements_soon': 'Достижения: скоро',
      'ui.profile.character_stats_soon': 'Статистика персонажа: скоро',
      'ui.profile.run_history_loading': 'История забегов: загрузка...',
      'ui.rating.loading_leaderboard': 'Загрузка рейтинга...',
      'ui.news.loading_news': 'Загрузка новостей...',
      'ui.record.run_details': 'Детали забега',
      'ui.record.no_data': 'Нет данных.',
      'ui.record.play_replay': 'Проиграть реплей',
      'ui.record.show_replay_ingame': 'Показать реплей в игре',
      'ui.record.copy_replay_link': 'Скопировать ссылку на реплей',
      'ui.auth.summary_logged_in': '\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d \u0432\u0445\u043e\u0434 \u043a\u0430\u043a {nickname}. \u042d\u0442\u043e\u0442 \u043d\u0438\u043a \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0451\u043d \u0437\u0430 \u0432\u0430\u0448\u0438\u043c \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u043e\u043c.',
      'ui.auth.nick_authenticated': '\u041d\u0438\u043a \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d. \u0412\u0445\u043e\u0434 \u0432 \u043c\u0430\u0442\u0447 \u0431\u0443\u0434\u0435\u0442 \u0441 \u0437\u0430\u043a\u0440\u0435\u043f\u043b\u0451\u043d\u043d\u044b\u043c \u0430\u043a\u043a\u0430\u0443\u043d\u0442-\u043d\u0438\u043a\u043e\u043c.',
      'ui.auth.nick_registered': '\u041d\u0438\u043a {nickname} \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u0412\u0445\u043e\u0434, \u0447\u0442\u043e\u0431\u044b \u0438\u0433\u0440\u0430\u0442\u044c \u0441 \u043d\u0438\u043c.',
      'ui.auth.nick_in_use': '\u041d\u0438\u043a {nickname} \u0441\u0435\u0439\u0447\u0430\u0441 \u0443\u0436\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f.',
      'ui.auth.nick_available': '\u041d\u0438\u043a {nickname} \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043b\u044f \u0433\u043e\u0441\u0442\u0435\u0432\u043e\u0439 \u0438\u0433\u0440\u044b.',
      'ui.auth.logged_in_short': '\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d \u0432\u0445\u043e\u0434 \u043a\u0430\u043a {nickname}.',
      'ui.auth.registered_short': '\u041d\u0438\u043a {nickname} \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d.',
      'ui.skill.no_description': '\u041d\u0435\u0442 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f',
      'ui.skill.ready': '\u0433\u043e\u0442\u043e\u0432\u043e',
      'ui.skill.cooldown': '\u043f\u0435\u0440\u0435\u0437\u0430\u0440\u044f\u0434\u043a\u0430',
      'ui.profile.account': '\u0410\u043a\u043a\u0430\u0443\u043d\u0442',
      'ui.profile.skill_points': '\u041e\u0447\u043a\u0438 \u043d\u0430\u0432\u044b\u043a\u043e\u0432',
      'ui.profile.shards': '\u041e\u0441\u043a\u043e\u043b\u043a\u0438',
      'ui.profile.runs': '\u0417\u0430\u0431\u0435\u0433\u0438',
      'ui.profile.profile': '\u041f\u0440\u043e\u0444\u0438\u043b\u044c',
      'ui.profile.hero_stats': '\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0433\u0435\u0440\u043e\u0435\u0432',
      'ui.profile.achievements': '\u0414\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u044f',
      'ui.profile.achievements_hint': '\u0417\u0434\u0435\u0441\u044c \u043c\u043e\u0436\u043d\u043e \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c First Blood, Survivor, Boss Hunter \u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u044d\u0442\u0430\u043f\u044b \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430.',
      'ui.profile.guest_mode': '\u0413\u043e\u0441\u0442\u0435\u0432\u043e\u0439 \u0440\u0435\u0436\u0438\u043c:',
      'ui.profile.guest_progression_hint': '\u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430, \u0433\u0435\u0440\u043e\u0438 \u0438 \u0442\u0430\u043b\u0430\u043d\u0442\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u044e\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0443 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u0438\u0433\u0440\u043e\u043a\u043e\u0432.',
      'ui.profile.guest_profile': '\u0413\u043e\u0441\u0442\u0435\u0432\u043e\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c',
      'ui.profile.login_to_save': '\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0442\u044c \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043f\u0440\u043e\u0444\u0438\u043b\u044f, \u0434\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u044f \u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0443 \u0433\u0435\u0440\u043e\u0435\u0432.',
      'ui.profile.login_required': '\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0432\u0445\u043e\u0434.',
      'ui.profile.run_history_failed': '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u0437\u0430\u0431\u0435\u0433\u043e\u0432.',
      'ui.hero.card': '\u041a\u0430\u0440\u0442\u0430 \u0433\u0435\u0440\u043e\u044f',
      'ui.hero.unlock': '\u041e\u0442\u043a\u0440\u044b\u0442\u0438\u0435',
      'ui.hero.unlock_btn': '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0433\u0435\u0440\u043e\u044f',
      'ui.hero.select_btn': '\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0433\u0435\u0440\u043e\u044f',
      'ui.hero.unlocked': '\u041e\u0442\u043a\u0440\u044b\u0442',
      'ui.hero.locked': '\u0417\u0430\u043a\u0440\u044b\u0442',
      'ui.hero.selected_short': '\u0412\u044b\u0431\u0440\u0430\u043d',
      'ui.hero.selected_label': '\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0433\u0435\u0440\u043e\u0439',
      'ui.hero.selected': '{hero} \u0432\u044b\u0431\u0440\u0430\u043d.',
      'ui.hero.unlocked_msg': '{hero} \u043e\u0442\u043a\u0440\u044b\u0442.',
      'ui.hero.cores': '\u042f\u0434\u0440\u0430',
      'ui.hero.aria': '\u0413\u0435\u0440\u043e\u0439 {hero}',
      'ui.auth.login_required_unlock': '\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0442\u044c \u0438 \u0440\u0430\u0437\u0432\u0438\u0432\u0430\u0442\u044c \u0433\u0435\u0440\u043e\u0435\u0432',
      'ui.record.no_skills': '\u041d\u0430\u0432\u044b\u043a\u0438 \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u044b.',
      'hero.cyber.name': '\u041a\u0438\u0431\u0435\u0440',
      'hero.scout.name': '\u0421\u043a\u0430\u0443\u0442',
      'hero.shadow.name': '\u0422\u0435\u043d\u044c',
      'hero.medic.name': '\u041c\u0435\u0434\u0438\u043a',
      'hero.raider.name': '\u0420\u0435\u0439\u0434\u0435\u0440',
      'hero.cyber.tagline': '\u0423\u043d\u0438\u0432\u0435\u0440\u0441\u0430\u043b\u044c\u043d\u044b\u0439 \u0430\u0434\u0430\u043f\u0442\u0438\u0432\u043d\u044b\u0439 \u043e\u043f\u0435\u0440\u0430\u0442\u043e\u0440',
      'hero.scout.tagline': '\u0411\u044b\u0441\u0442\u0440\u044b\u0439 \u0440\u0430\u0437\u0432\u0435\u0434\u0447\u0438\u043a \u0438 \u043f\u0440\u0435\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u0442\u0435\u043b\u044c',
      'hero.shadow.tagline': '\u041c\u0430\u0441\u0442\u0435\u0440 \u0437\u0430\u0441\u0430\u0434 \u0438 \u0432\u0437\u0440\u044b\u0432\u043d\u043e\u0433\u043e \u0443\u0440\u043e\u043d\u0430',
      'hero.medic.tagline': '\u041c\u0430\u0441\u0442\u0435\u0440 \u0432\u044b\u0436\u0438\u0432\u0430\u043d\u0438\u044f \u0438 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f',
      'hero.raider.tagline': '\u0424\u0440\u043e\u043d\u0442\u043e\u0432\u043e\u0439 \u0431\u043e\u0435\u0446 \u0438 \u0431\u0440\u0443\u0437\u0435\u0440',
      'hero.node.cyber_overclock.name': '\u041e\u0432\u0435\u0440\u043a\u043b\u043e\u043a',
      'hero.node.cyber_overclock.desc': '+\u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0440\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c',
      'hero.node.cyber_nano_core.name': '\u041d\u0430\u043d\u043e-\u044f\u0434\u0440\u043e',
      'hero.node.cyber_nano_core.desc': '+\u0443\u0440\u043e\u043d',
      'hero.node.cyber_barrier.name': '\u0411\u0430\u0440\u044c\u0435\u0440\u043d\u0430\u044f \u043c\u0430\u0442\u0440\u0438\u0446\u0430',
      'hero.node.cyber_barrier.desc': '+\u043c\u0430\u043a\u0441. HP',
      'hero.node.cyber_magnet.name': '\u041c\u0430\u0433-\u0441\u0431\u043e\u0440\u0449\u0438\u043a',
      'hero.node.cyber_magnet.desc': '+\u0440\u0430\u0434\u0438\u0443\u0441 \u043f\u043e\u0434\u0431\u043e\u0440\u0430',
      'hero.node.scout_stride.name': '\u0414\u043b\u0438\u043d\u043d\u044b\u0439 \u0448\u0430\u0433',
      'hero.node.scout_stride.desc': '+\u0441\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f',
      'hero.node.scout_reload.name': '\u0411\u044b\u0441\u0442\u0440\u044b\u0435 \u0440\u0443\u043a\u0438',
      'hero.node.scout_reload.desc': '+\u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0440\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c',
      'hero.node.scout_dodge.name': '\u0423\u043a\u043b\u043e\u043d\u0447\u0438\u0432\u044b\u0439 \u043f\u0435\u0440\u0435\u043a\u0430\u0442',
      'hero.node.scout_dodge.desc': '+\u0437\u0430\u0440\u044f\u0434 \u0440\u044b\u0432\u043a\u0430',
      'hero.node.scout_shots.name': '\u0423\u0432\u0435\u0440\u0435\u043d\u043d\u0430\u044f \u043e\u0447\u0435\u0440\u0435\u0434\u044c',
      'hero.node.scout_shots.desc': '+\u0443\u0440\u043e\u043d',
      'hero.node.shadow_killer.name': '\u0418\u043d\u0441\u0442\u0438\u043d\u043a\u0442 \u0443\u0431\u0438\u0439\u0446\u044b',
      'hero.node.shadow_killer.desc': '+\u0443\u0440\u043e\u043d',
      'hero.node.shadow_haste.name': '\u0422\u0451\u043c\u043d\u044b\u0439 \u0442\u0435\u043c\u043f',
      'hero.node.shadow_haste.desc': '+\u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0440\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c',
      'hero.node.shadow_blink.name': '\u0428\u0430\u0433 \u0432 \u0442\u0435\u043d\u0438',
      'hero.node.shadow_blink.desc': '+\u0441\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f',
      'hero.node.shadow_sting.name': '\u042f\u0434\u043e\u0432\u0438\u0442\u043e\u0435 \u0436\u0430\u043b\u043e',
      'hero.node.shadow_sting.desc': '+\u0443\u0440\u043e\u043d +\u0441\u043a\u043e\u0440\u043e\u0441\u0442\u044c',
      'hero.node.medic_aid.name': '\u041f\u043e\u043b\u0435\u0432\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c',
      'hero.node.medic_aid.desc': '+\u0440\u0435\u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u044f',
      'hero.node.medic_plating.name': '\u0416\u0438\u0432\u0430\u044f \u0431\u0440\u043e\u043d\u044f',
      'hero.node.medic_plating.desc': '+\u043c\u0430\u043a\u0441. HP',
      'hero.node.medic_focus.name': '\u0411\u043e\u0435\u0432\u043e\u0439 \u0444\u043e\u043a\u0443\u0441',
      'hero.node.medic_focus.desc': '+\u0443\u0440\u043e\u043d',
      'hero.node.medic_aura.name': '\u0410\u0443\u0440\u0430 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f',
      'hero.node.medic_aura.desc': '+\u0440\u0430\u0434\u0438\u0443\u0441 \u043f\u043e\u0434\u0431\u043e\u0440\u0430',
      'hero.node.raider_rage.name': '\u0411\u043e\u0435\u0432\u0430\u044f \u044f\u0440\u043e\u0441\u0442\u044c',
      'hero.node.raider_rage.desc': '+\u0443\u0440\u043e\u043d',
      'hero.node.raider_armor.name': '\u0416\u0435\u043b\u0435\u0437\u043d\u0430\u044f \u043a\u043e\u0436\u0430',
      'hero.node.raider_armor.desc': '+\u043c\u0430\u043a\u0441. HP',
      'hero.node.raider_push.name': '\u041d\u0435\u0443\u0434\u0435\u0440\u0436\u0438\u043c\u044b\u0439 \u043d\u0430\u0442\u0438\u0441\u043a',
      'hero.node.raider_push.desc': '+\u0441\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f',
      'hero.node.raider_charge.name': '\u0412\u043e\u0435\u043d\u043d\u044b\u0439 \u0440\u044b\u0432\u043e\u043a',
      'hero.node.raider_charge.desc': '+\u0437\u0430\u0440\u044f\u0434 \u0440\u044b\u0432\u043a\u0430',
      'skill.weapon_mastery.name': '\u041c\u0430\u0441\u0442\u0435\u0440 \u043e\u0440\u0443\u0436\u0438\u044f',
      'skill.rapid_reload.name': '\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u043f\u0435\u0440\u0435\u0437\u0430\u0440\u044f\u0434\u043a\u0430',
      'skill.vitality.name': '\u0416\u0438\u0432\u0443\u0447\u0435\u0441\u0442\u044c',
      'skill.haste.name': '\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c',
      'skill.magnetism.name': '\u041c\u0430\u0433\u043d\u0435\u0442\u0438\u0437\u043c',
      'skill.bloodlust.name': '\u041a\u0440\u043e\u0432\u043e\u0436\u0430\u0434\u043d\u043e\u0441\u0442\u044c',
      'skill.regeneration.name': '\u0420\u0435\u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u044f',
      'skill.dodge_instinct.name': '\u0418\u043d\u0441\u0442\u0438\u043d\u043a\u0442 \u0443\u043a\u043b\u043e\u043d\u0435\u043d\u0438\u044f',
      'skill.pistol_buddy.name': '\u041f\u0438\u0441\u0442\u043e\u043b\u0435\u0442-\u0434\u0440\u043e\u043d',
      'skill.smg_buddy.name': 'SMG-\u0434\u0440\u043e\u043d',
      'skill.shotgun_buddy.name': '\u0414\u0440\u043e\u0431\u043e\u0432\u0438\u043a-\u0434\u0440\u043e\u043d',
      'skill.sniper_buddy.name': '\u0421\u043d\u0430\u0439\u043f\u0435\u0440-\u0434\u0440\u043e\u043d',
      'skill.shockwave.name': '\u0423\u0434\u0430\u0440\u043d\u0430\u044f \u0432\u043e\u043b\u043d\u0430',
      'skill.blade_orbit.name': '\u041e\u0440\u0431\u0438\u0442\u0430 \u043a\u043b\u0438\u043d\u043a\u043e\u0432',
      'skill.chain_lightning.name': '\u0426\u0435\u043f\u043d\u0430\u044f \u043c\u043e\u043b\u043d\u0438\u044f',
      'skill.laser_strike.name': '\u041b\u0430\u0437\u0435\u0440\u043d\u044b\u0439 \u0443\u0434\u0430\u0440',
      'skill.homing_missiles.name': '\u0421\u0430\u043c\u043e\u043d\u0430\u0432\u043e\u0434\u044f\u0449\u0438\u0435\u0441\u044f \u0440\u0430\u043a\u0435\u0442\u044b',
      'skill.weapon_mastery.desc': '\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u0443\u0440\u043e\u043d',
      'skill.rapid_reload.desc': '\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0440\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c',
      'skill.vitality.desc': '\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u043c\u0430\u043a\u0441. HP',
      'skill.haste.desc': '\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f',
      'skill.magnetism.desc': '\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u0440\u0430\u0434\u0438\u0443\u0441 \u043f\u043e\u0434\u0431\u043e\u0440\u0430 XP',
      'skill.bloodlust.desc': '\u0423\u0440\u043e\u043d + \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0440\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c',
      'skill.regeneration.desc': '\u0420\u0435\u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u044f HP/\u0441',
      'skill.dodge_instinct.desc': '\u0414\u043e\u043f. \u0437\u0430\u0440\u044f\u0434\u044b \u0440\u044b\u0432\u043a\u0430',
      'skill.pistol_buddy.desc': '+1 \u0431\u043e\u0442 \u0441 \u043f\u0438\u0441\u0442\u043e\u043b\u0435\u0442\u043e\u043c',
      'skill.smg_buddy.desc': '+1 \u0431\u043e\u0442 \u0441 SMG',
      'skill.shotgun_buddy.desc': '+1 \u0431\u043e\u0442 \u0441 \u0434\u0440\u043e\u0431\u043e\u0432\u0438\u043a\u043e\u043c',
      'skill.sniper_buddy.desc': '+1 \u0431\u043e\u0442 \u0441\u043d\u0430\u0439\u043f\u0435\u0440',
      'skill.shockwave.desc': '\u0423\u0434\u0430\u0440\u043d\u0430\u044f AoE-\u0432\u043e\u043b\u043d\u0430 \u0432\u043e\u043a\u0440\u0443\u0433 \u0433\u0435\u0440\u043e\u044f',
      'skill.blade_orbit.desc': '\u0411\u044c\u0451\u0442 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0445 \u0432\u0440\u0430\u0433\u043e\u0432',
      'skill.chain_lightning.desc': '\u0426\u0435\u043f\u043d\u0430\u044f \u043c\u043e\u043b\u043d\u0438\u044f \u043f\u043e \u0431\u043b\u0438\u0436\u043d\u0438\u043c \u0446\u0435\u043b\u044f\u043c',
      'skill.laser_strike.desc': '\u041c\u0433\u043d\u043e\u0432\u0435\u043d\u043d\u043e \u043f\u043e\u0440\u0430\u0436\u0430\u0435\u0442 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0445 \u0432\u0440\u0430\u0433\u043e\u0432',
      'skill.homing_missiles.desc': '\u0417\u0430\u043f\u0443\u0441\u043a\u0430\u0435\u0442 \u0441\u0430\u043c\u043e\u043d\u0430\u0432\u043e\u0434\u044f\u0449\u0438\u0435\u0441\u044f \u0440\u0430\u043a\u0435\u0442\u044b \u043f\u043e \u0431\u043b\u0438\u0436\u043d\u0438\u043c \u0432\u0440\u0430\u0433\u0430\u043c',
    },
  };

  let currentLang = DEFAULT_LANG;

  function normalizeLang(raw) {
    const value = String(raw || '').trim().toLowerCase();
    if (SUPPORTED_LANGS.has(value)) return value;
    return DEFAULT_LANG;
  }

  function interpolate(template, params = {}) {
    return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(params[key] ?? ''));
  }

  function t(key, params = null) {
    const k = String(key || '');
    const dict = I18N[currentLang] || I18N[DEFAULT_LANG];
    const fallback = I18N[DEFAULT_LANG];
    const raw = dict[k] ?? fallback[k] ?? k;
    return params ? interpolate(raw, params) : raw;
  }

  

  const EXTRA_PHRASE_PAIRS = [
    ['Профиль игрока', 'Player profile'],
    ['Загрузка профиля...', 'Loading profile...'],
    ['Поиск аккаунта по нику...', 'Searching account by nickname...'],
    ['Не удалось загрузить профиль.', 'Failed to load profile.'],
    ['Не удалось открыть профиль.', 'Failed to open profile.'],
    ['Профиль для этого ника недоступен.', 'Profile for this nickname is unavailable.'],
    ['Напишите комментарий...', 'Write a comment...'],
    ['Отправка...', 'Sending...'],
    ['Отправить', 'Send'],
    ['Отмена', 'Cancel'],
    ['Закрыть ответ', 'Close reply'],
    ['Ответить', 'Reply'],
    ['Удалить', 'Delete'],
    ['Новости', 'News'],
    ['Загрузка новостей...', 'Loading news...'],
    ['← К списку новостей', '← Back to news list'],
    ['Ссылка скопирована', 'Link copied'],
    ['Поделиться', 'Share'],
    ['Открываем новость...', 'Opening news...'],
    ['Комментарии', 'Comments'],
    ['Войдите в аккаунт, чтобы оставлять комментарии и ответы.', 'Log in to leave comments and replies.'],
    ['Пока нет комментариев.', 'No comments yet.'],
    ['Пока новостей нет.', 'No news yet.'],
    ['Рейтинг игроков', 'Player Rating'],
    ['Загрузка рейтинга...', 'Loading rating...'],
    ['Режим:', 'Mode:'],
    ['Пока нет данных.', 'No data yet.'],
    ['Обычный', 'Normal'],
    ['Хард-кор', 'Hardcore'],
    ['Неизвестно', 'Unknown'],
    ['История забегов', 'Run history'],
    ['Забеги не найдены.', 'Runs not found.'],
    ['Инфо аккаунта', 'Account info'],
    ['Создан', 'Created'],
    ['Последний вход', 'Last login'],
    ['Герои', 'Heroes'],
    ['Нет данных по героям.', 'No hero data.'],
    ['Открыт', 'Unlocked'],
    ['Закрыт', 'Locked'],
    ['Все режимы', 'All modes'],
  
    ['Вы не в активном забеге.', 'You are not in an active run.'],
    ['Забег уже завершается...', 'Run is already ending...'],
    ['Не удалось завершить забег. Соединение потеряно.', 'Failed to end run. Connection lost.'],
    ['Завершаем текущий забег...', 'Ending current run...'],
    ['Требуется вход.', 'Login required.'],
    ['Забегов пока нет. Завершите забег, чтобы увидеть историю.', 'No runs yet. Finish a run to see history here.'],
    ['Обновить', 'Refresh'],
    ['Назад', 'Prev'],
    ['Вперед', 'Next'],
    ['Страница ', 'Page '],
    ['Всего: ', 'Total: '],
    ['Комната ', 'Room '],
    [' убийств', ' kills'],
    [' очк.', ' pts'],
    ['Активных комнат пока нет.', 'No active rooms yet.'],
    ['Не удалось загрузить комнаты.', 'Failed to load rooms.'],
    ['Войти', 'Join'],
    ['Подключено. Создайте комнату или войдите по коду.', 'Connected. Create room or join code.'],
    ['Отключено', 'Disconnected'],
    ['Сервер перезапускается. Новые комнаты временно недоступны.', 'Server restarting. New rooms are temporarily unavailable.'],
    ['Онлайн: -- | В игре: -- | В меню: -- | Зарег.: --', 'Online: -- | In game: -- | In menu: -- | Registered: --'],
    ['Онлайн:', 'Online:'],
    ['В игре:', 'In game:'],
    ['В меню:', 'In menu:'],
    ['Зарег.:', 'Registered:'],
    ['Рекордов пока нет.', 'No records yet.'],
    ['Не удалось загрузить рекорды.', 'Failed to load records.'],
    ['Не удалось загрузить историю забегов.', 'Failed to load run history.'],
    ['Не удалось загрузить рейтинг.', 'Failed to load leaderboard.'],
    ['Режим реплея', 'Replay mode'],
    ['Управление отключено', 'Controls disabled'],
    ['Реплей не найден.', 'Replay not found.'],
    ['Загрузка реплея...', 'Loading replay...'],
    ['Загрузка данных реплея...', 'Loading replay data...'],
    ['Подготовка данных реплея...', 'Preparing replay data...'],
    ['Загрузить реплей', 'Load Replay'],
    ['Пауза реплея', 'Pause Replay'],
    ['Проиграть реплей', 'Play Replay'],
    ['Реплей недоступен', 'Replay Unavailable'],
    ['Реплей для этой записи недоступен.', 'Replay is not available for this record.'],
    ['Ссылка на реплей недоступна.', 'Replay link is unavailable.'],
    ['Не удалось скопировать ссылку реплея.', 'Failed to copy replay link.'],
    ['Шаринг ссылки доступен только для реплеев топ-рекордов.', 'Share link is available only for Top records replays.'],
    ['Не удалось загрузить реплей.', 'Failed to load replay.'],
    ['Не удалось загрузить новости.', 'Failed to load news.'],
    ['Не удалось открыть новость.', 'Failed to open news.'],
    ['Не удалось отправить комментарий.', 'Failed to send comment.'],
    ['Не удалось удалить комментарий.', 'Failed to delete comment.'],
    ['Критическое повреждение...', 'Critical damage...'],
    ['Награды за забег: +', 'Run rewards: +'],
    [' осколков', ' shards'],
    ['Ожидание...', 'Pending...'],
    ['Требуется вход', 'Login required'],
    ['Гостевой профиль', 'Guest profile'],
    ['Статистика героя', 'Hero stats'],
    ['Достижения', 'Achievements'],
    ['Персонаж', 'Character'],
    ['Показать меню', 'Show menu'],
    ['Скрыть меню', 'Hide menu'],
    ['\u0413\u043b\u0430\u0432\u043d\u043e\u0435 \u043c\u0435\u043d\u044e', 'Main menu'],
    ['\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044f...', 'Profile loading...'],
    ['\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0442\u0430\u0431\u043b\u0438\u0446\u044b \u043b\u0438\u0434\u0435\u0440\u043e\u0432...', 'Loading leaderboard...'],
    ['\u0414\u0435\u0442\u0430\u043b\u0438 \u0437\u0430\u0431\u0435\u0433\u0430', 'Run details'],
    ['\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.', 'No data.'],
    ['\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0440\u0435\u043f\u043b\u0435\u0439 \u0432 \u0438\u0433\u0440\u0435', 'Show Replay In Game'],
    ['\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443 \u043d\u0430 \u0440\u0435\u043f\u043b\u0435\u0439', 'Copy Replay Link'],
    ['\u0420\u0435\u043f\u043b\u0435\u0439 \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d.', 'Replay not loaded.'],
    ['\u041a \u043d\u0430\u0447\u0430\u043b\u0443', 'To start'],
    ['\u041d\u0430\u0437\u0430\u0434 5\u0441', 'Back 5s'],
    ['\u041f\u0430\u0443\u0437\u0430 \u0438\u043b\u0438 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c', 'Pause or continue'],
    ['\u0412\u043f\u0435\u0440\u0451\u0434 5\u0441', 'Forward 5s'],
    ['\u041a \u043a\u043e\u043d\u0446\u0443', 'To end'],
    ['\u0420\u0435\u043f\u043b\u0435\u0439 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443.', 'Replay is available on demand.'],
    ['\u0420\u0435\u043f\u043b\u0435\u0439 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043b\u044f \u044d\u0442\u043e\u0439 \u0437\u0430\u043f\u0438\u0441\u0438.', 'Replay is unavailable for this record.'],
    ['\u0423 \u0440\u0435\u043f\u043b\u0435\u044f \u043d\u0435\u0442 \u043a\u0430\u0434\u0440\u043e\u0432.', 'Replay has no frames.'],
    ['\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...', 'Loading...'],
    ['\u0423\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0432 \u043a\u043e\u043c\u043d\u0430\u0442\u0435 \u043d\u0430 \u043c\u043e\u043c\u0435\u043d\u0442 \u0441\u043c\u0435\u0440\u0442\u0438', 'Room kills at death'],
    ['\u0423\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0431\u043e\u0441\u0441\u043e\u0432', 'Boss kills'],
    ['\u0423\u0431\u0438\u0442\u043e \u0431\u043e\u0441\u0441\u043e\u0432', 'Bosses killed'],
    ['\u0423\u0431\u0438\u0442\u043e \u0431\u043e\u0441\u0441\u043e\u0432 \u0432 \u043a\u043e\u043c\u043d\u0430\u0442\u0435', 'Bosses killed in room'],
    ['XP \u0433\u0435\u0440\u043e\u044f', 'Hero XP'],
    ['XP \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430', 'Account XP'],
    ['\u0423\u0431\u0438\u0439\u0441\u0442\u0432\u0430 \u0432\u0440\u0430\u0433\u043e\u0432', 'Enemy kills'],
  ];

  function buildPhrasePairs() {
    const pairs = [];
    const seen = new Set();
    const enDict = I18N.en || {};
    const ruDict = I18N.ru || {};

    for (const key of Object.keys(enDict)) {
      const en = enDict[key];
      const ru = ruDict[key];
      if (typeof en !== 'string' || typeof ru !== 'string') continue;
      if (!en || !ru || en === ru) continue;
      const sig = ru + '|' + en;
      if (seen.has(sig)) continue;
      seen.add(sig);
      pairs.push([ru, en]);
    }

    for (const [ru, en] of EXTRA_PHRASE_PAIRS) {
      if (!ru || !en || ru === en) continue;
      const sig = ru + '|' + en;
      if (seen.has(sig)) continue;
      seen.add(sig);
      pairs.push([ru, en]);
    }

    return pairs;
  }

  const PHRASE_PAIRS = buildPhrasePairs();

  function escapeRegExp(value) {
    let out = String(value || '');
    const chars = ['\\', '[', ']', '(', ')', '{', '}', '?', '+', '*', '.', '^', '$', '|'];
    for (const ch of chars) {
      out = out.split(ch).join('\\' + ch);
    }
    return out;
  }

  function phraseTranslate(raw) {
    let out = String(raw || '');
    const toRu = currentLang === 'ru';
    for (const [ru, en] of PHRASE_PAIRS) {
      const from = toRu ? en : ru;
      const to = toRu ? ru : en;
      if (!from || from === to) continue;
      if (out === from) {
        out = to;
        continue;
      }
      if (/^[A-Za-z0-9_]+$/.test(from)) {
        const safe = escapeRegExp(from);
        out = out.replace(new RegExp('\\b' + safe + '\\b', 'g'), to);
      } else {
        out = out.split(from).join(to);
      }
    }
    return out;
  }

  function translateDynamicDom(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent) continue;
      if (parent.closest('script, style')) continue;
      const next = phraseTranslate(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    const attrs = ['placeholder', 'title', 'aria-label'];
    const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of all) {
      for (const attr of attrs) {
        const v = el.getAttribute(attr);
        if (!v) continue;
        const next = phraseTranslate(v);
        if (next !== v) el.setAttribute(attr, next);
      }
    }
  }

  function applyStaticTranslations() {
    const setText = (selector, key) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = t(key);
    };
    const setAttr = (selector, attr, key) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, t(key));
    };

    setText('#toggle-info .menu-label', 'ui.menu');
    setText('#join-toggle-info .menu-label', 'ui.menu');
    setAttr('#toggle-info', 'aria-label', 'ui.show_menu');
    setAttr('#join-toggle-info', 'aria-label', 'ui.show_menu');
    setAttr('#join-toggle-info', 'title', 'ui.show_menu');
    setText('#session-exit-btn', 'ui.session.exit_run');
    setText('#replay-game-exit', 'ui.replay.exit');
    setText('#replay-game-meta', 'ui.replay.title');
    setText('#record-replay-stage-load', 'ui.replay.load');
    setText('#record-replay-meta', 'ui.replay.not_loaded');
    setText('#replay-load-label', 'ui.replay.loading');
    setText('#replay-load-meta', 'ui.replay.preparing');
    setAttr('#chat-send', 'title', 'ui.chat.send');
    setAttr('#chat-send', 'aria-label', 'ui.chat.send');
    setAttr('#chat-input', 'placeholder', 'ui.chat.placeholder');
    setText('#game-version-title', 'ui.version.title');
    setText('#game-version-close', 'ui.close');
    setAttr('#menu-version-trigger', 'aria-label', 'ui.version.open');
    setText('#main-menu-tabs [data-menu-tab="play"]', 'ui.main.play');
    setText('#main-menu-tabs [data-menu-tab="characters"]', 'ui.main.characters');
    setText('#main-menu-tabs [data-menu-tab="skills"]', 'ui.main.skills');
    setText('#main-menu-tabs [data-menu-tab="profile"]', 'ui.main.profile');
    setText('#main-menu-tabs [data-menu-tab="rating"]', 'ui.main.rating');
    setText('#main-menu-tabs [data-menu-tab="news"]', 'ui.main.news');
    setText('[data-game-mode="normal"] b', 'ui.play.mode.normal');
    setText('[data-game-mode="normal"] span', 'ui.play.mode.normal_desc');
    setText('[data-game-mode="hardcore"] b', 'ui.play.mode.hardcore');
    setText('[data-game-mode="hardcore"] span', 'ui.play.mode.hardcore_desc');
    setText('#death-rewards-menu', 'ui.death.back_to_menu');
    setText('#player-access-details .auth-card-summary', 'ui.auth.player_access');
    setText('#player-auth-summary', 'ui.auth.summary_guest');
    setText('#player-logout', 'ui.auth.logout');
    setText('#auth-tab-guest', 'ui.auth.guest');
    setText('#auth-tab-login', 'ui.auth.login');
    setText('#auth-tab-register', 'ui.auth.register');
    setAttr('#join-form .auth-tabs', 'aria-label', 'ui.auth.mode_label');
    setText('#join-form [data-auth-panel="guest"] .auth-copy', 'ui.auth.guest_copy');
    setText('label[for="auth-login-nickname"]', 'ui.auth.registered_nickname');
    setText('label[for="auth-login-password"]', 'ui.auth.password');
    setText('#player-login', 'ui.auth.login');
    setText('label[for="auth-register-nickname"]', 'ui.auth.new_nickname');
    setText('label[for="auth-register-password"]', 'ui.auth.password');
    setText('#player-register', 'ui.auth.register_nickname');
    setText('.providers-title', 'ui.auth.external_signin');
    setText('.provider-btn:nth-of-type(1)', 'ui.auth.google_soon');
    setText('.provider-btn:nth-of-type(2)', 'ui.auth.vk_soon');
    setText('.provider-btn:nth-of-type(3)', 'ui.auth.mail_soon');
    setText('label[for="name"]', 'ui.nickname');
    setText('#nickname-hint', 'ui.nickname_hint_guest');
    setText('#room-code-label', 'ui.play.room_code_optional');
    setAttr('#room-code', 'placeholder', 'ui.play.room_code_placeholder');
    setText('#sync-settings summary', 'ui.play.sync_settings');
    setText('label[for="sync-preset"]', 'ui.play.preset');
    setText('#sync-preset option[value="normal"]', 'ui.play.preset.normal');
    setText('#sync-preset option[value="better"]', 'ui.play.preset.better');
    setText('#sync-preset option[value="best"]', 'ui.play.preset.best');
    setText('#sync-preset option[value="custom"]', 'ui.play.preset.custom');
    setText('label[for="sync-tickrate"]', 'ui.play.tickrate');
    setText('label[for="sync-state-rate"]', 'ui.play.state_send_rate');
    setText('label[for="sync-render-delay"]', 'ui.play.interp_delay');
    setText('label[for="sync-max-extrapolation"]', 'ui.play.max_extrapolation');
    setText('label[for="sync-entity-interp"]', 'ui.play.entity_interp');
    setText('label[for="sync-bullet-correction"]', 'ui.play.bullet_correction');
    setText('label[for="sync-input-rate"]', 'ui.play.input_send_rate');
    setText('#menu-panel-play [data-mode="create"]', 'ui.play.create_room');
    setText('#menu-panel-play [data-mode="join"]', 'ui.play.join_code');
    setText('#game-mode-panel .rooms-head span', 'ui.play.game_mode');
    setText('#rooms-browser .rooms-head span', 'ui.play.active_rooms');
    setText('#refresh-rooms', 'ui.refresh');
    setText('#profile-summary', 'ui.profile.loading_panel');
    setText('#profile-achievements', 'ui.profile.achievements_soon');
    setText('#profile-character-stats', 'ui.profile.character_stats_soon');
    setText('#profile-run-history', 'ui.profile.run_history_loading');
    setText('#rating-board', 'ui.rating.loading_leaderboard');
    setText('#news-feed', 'ui.news.loading_news');
    setText('#record-details-title', 'ui.record.run_details');
    setText('#record-details-body', 'ui.record.no_data');
    setText('#record-replay-play', 'ui.record.play_replay');
    setText('#record-replay-ingame', 'ui.record.show_replay_ingame');
    setText('#record-replay-copy-link', 'ui.record.copy_replay_link');
    setText('#language-label', 'settings.language');
    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      const en = langSelect.querySelector('option[value="en"]');
      const ru = langSelect.querySelector('option[value="ru"]');
      if (en) en.textContent = t('settings.language.en');
      if (ru) ru.textContent = t('settings.language.ru');
    }
  }

  function setLanguage(nextLang, options = {}) {
    currentLang = normalizeLang(nextLang);
    document.documentElement.setAttribute('lang', currentLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, currentLang);
    } catch {
      // ignore
    }
    const select = document.getElementById('language-select');
    if (select && select.value !== currentLang) select.value = currentLang;
    applyStaticTranslations();
    translateDynamicDom(document.body);
    if (!options.silent) {
      window.dispatchEvent(new CustomEvent('cw:i18n-changed', { detail: { lang: currentLang } }));
    }
  }

  function init() {
    const select = document.getElementById('language-select');
    const langLabel = document.getElementById('language-label');
    if (langLabel) langLabel.textContent = t('settings.language');
    if (select) {
      select.innerHTML = ''
        + `<option value="en">${t('settings.language.en')}</option>`
        + `<option value="ru">${t('settings.language.ru')}</option>`;
      select.addEventListener('change', () => setLanguage(select.value));
    }
    let stored = DEFAULT_LANG;
    try {
      stored = localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANG;
    } catch {
      stored = DEFAULT_LANG;
    }
    setLanguage(stored, { silent: true });
    const mo = new MutationObserver((mut) => {
      for (const m of mut) {
        if (m.type === 'characterData' && m.target && m.target.nodeType === Node.TEXT_NODE) {
          const raw = m.target.nodeValue || '';
          const next = phraseTranslate(raw);
          if (next !== raw) m.target.nodeValue = next;
          continue;
        }
        for (const n of m.addedNodes || []) {
          if (n.nodeType === Node.ELEMENT_NODE) {
            translateDynamicDom(n);
            continue;
          }
          if (n.nodeType === Node.TEXT_NODE && n.parentElement) {
            const raw = n.nodeValue || '';
            const next = phraseTranslate(raw);
            if (next !== raw) n.nodeValue = next;
          }
        }
      }
    });
    if (document.body) mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.cwI18nT = t;
  window.cwI18nSetLanguage = setLanguage;
  window.cwI18nGetLanguage = () => currentLang;
  window.cwI18nApplyStatic = applyStaticTranslations;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})()

