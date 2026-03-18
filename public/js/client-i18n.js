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
      'ui.show': 'Show',
      'ui.hide': 'Hide',
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
      'ui.death.run_rewards': 'Run Rewards',
      'ui.pending': 'Pending...',
      'ui.run_rewards.score': 'Score',
      'ui.run_rewards.kills': 'Kills',
      'ui.run_rewards.enemy_kills': 'Enemy kills',
      'ui.run_rewards.boss_kills': 'Boss kills',
      'ui.run_rewards.survival': 'Survival',
      'ui.run_rewards.hero_xp': 'Hero XP',
      'ui.run_rewards.account_xp': 'Account XP',
      'ui.run_rewards.shards': 'Shards',
      'ui.run_rewards.account_level_up': 'Account level up',
      'ui.run_rewards.no_cards': 'No hero card drops this run',
      'ui.run_rewards.status': 'Run rewards: +{xp} XP, +{shards} shards',
      'ui.hero.core_card': '{hero} Core Card',
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
      'ui.show': 'Показать',
      'ui.hide': 'Скрыть',
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
      'ui.death.run_rewards': 'Награды за забег',
      'ui.pending': 'Ожидание...',
      'ui.run_rewards.score': 'Очки',
      'ui.run_rewards.kills': 'Убийства',
      'ui.run_rewards.enemy_kills': 'Убийства врагов',
      'ui.run_rewards.boss_kills': 'Убийства боссов',
      'ui.run_rewards.survival': 'Время выживания',
      'ui.run_rewards.hero_xp': 'XP героя',
      'ui.run_rewards.account_xp': 'Аккаунт XP',
      'ui.run_rewards.shards': 'Осколки',
      'ui.run_rewards.account_level_up': 'Уровень аккаунта повышен',
      'ui.run_rewards.no_cards': 'В этом забеге не выпали карты героя',
      'ui.run_rewards.status': 'Награды за забег: +{xp} XP, +{shards} осколков',
      'ui.hero.core_card': 'Карта ядра {hero}',
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
      'ui.hud.time': 'Время',
      'ui.hud.boss_in': 'Босс через',
      'ui.hud.threat': 'Угроза',
      'ui.hud.boss_active': 'Босс: АКТИВЕН',
      'ui.scoreboard.players': 'Игроки',
      'ui.scoreboard.expand': 'Развернуть список игроков',
      'ui.scoreboard.minimize': 'Свернуть список игроков',
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
      'ui.auth.summary_logged_in': 'Выполнен вход как {nickname}. Этот ник закреплён за вашим аккаунтом.',
      'ui.auth.nick_authenticated': 'Ник подтверждён. Вход в матч будет с закреплённым аккаунт-ником.',
      'ui.auth.nick_registered': 'Ник {nickname} зарегистрирован. Используйте Вход, чтобы играть с ним.',
      'ui.auth.nick_in_use': 'Ник {nickname} сейчас уже используется.',
      'ui.auth.nick_available': 'Ник {nickname} доступен для гостевой игры.',
      'ui.auth.logged_in_short': 'Выполнен вход как {nickname}.',
      'ui.auth.registered_short': 'Ник {nickname} зарегистрирован.',
      'ui.skill.no_description': 'Нет описания',
      'ui.skill.ready': 'готово',
      'ui.skill.cooldown': 'перезарядка',
      'ui.profile.account': 'Аккаунт',
      'ui.profile.skill_points': 'Очки навыков',
      'ui.profile.shards': 'Осколки',
      'ui.profile.runs': 'Забеги',
      'ui.profile.profile': 'Профиль',
      'ui.profile.hero_stats': 'Статистика героев',
      'ui.profile.achievements': 'Достижения',
      'ui.profile.achievements_hint': 'Здесь можно показать First Blood, Survivor, Boss Hunter и другие этапы прогресса аккаунта.',
      'ui.profile.guest_mode': 'Гостевой режим:',
      'ui.profile.guest_progression_hint': 'прогресс аккаунта, герои и таланты сохраняются только у авторизованных игроков.',
      'ui.profile.guest_profile': 'Гостевой профиль',
      'ui.profile.login_to_save': 'Войдите, чтобы сохранять прогресс профиля, достижения и статистику героев.',
      'ui.profile.login_required': 'Требуется вход.',
      'ui.profile.run_history_failed': 'Не удалось загрузить историю забегов.',
      'ui.hero.card': 'Карта героя',
      'ui.hero.unlock': 'Открытие',
      'ui.hero.unlock_btn': 'Открыть героя',
      'ui.hero.select_btn': 'Выбрать героя',
      'ui.hero.unlocked': 'Открыт',
      'ui.hero.locked': 'Закрыт',
      'ui.hero.selected_short': 'Выбран',
      'ui.hero.selected_label': 'Выбранный герой',
      'ui.hero.selected': '{hero} выбран.',
      'ui.hero.unlocked_msg': '{hero} открыт.',
      'ui.hero.cores': 'Ядра',
      'ui.hero.aria': 'Герой {hero}',
      'ui.auth.login_required_unlock': 'Войдите, чтобы открывать и развивать героев',
      'ui.record.no_skills': 'Навыки не выбраны.',
      'hero.cyber.name': 'Кибер',
      'hero.scout.name': 'Скаут',
      'hero.shadow.name': 'Тень',
      'hero.medic.name': 'Медик',
      'hero.raider.name': 'Рейдер',
      'hero.cyber.tagline': 'Универсальный адаптивный оператор',
      'hero.scout.tagline': 'Быстрый разведчик и преследователь',
      'hero.shadow.tagline': 'Мастер засад и взрывного урона',
      'hero.medic.tagline': 'Мастер выживания и восстановления',
      'hero.raider.tagline': 'Фронтовой боец и брузер',
      'hero.node.cyber_overclock.name': 'Оверклок',
      'hero.node.cyber_overclock.desc': '+скорострельность',
      'hero.node.cyber_nano_core.name': 'Нано-ядро',
      'hero.node.cyber_nano_core.desc': '+урон',
      'hero.node.cyber_barrier.name': 'Барьерная матрица',
      'hero.node.cyber_barrier.desc': '+макс. HP',
      'hero.node.cyber_magnet.name': 'Маг-сборщик',
      'hero.node.cyber_magnet.desc': '+радиус подбора',
      'hero.node.scout_stride.name': 'Длинный шаг',
      'hero.node.scout_stride.desc': '+скорость движения',
      'hero.node.scout_reload.name': 'Быстрые руки',
      'hero.node.scout_reload.desc': '+скорострельность',
      'hero.node.scout_dodge.name': 'Уклончивый перекат',
      'hero.node.scout_dodge.desc': '+заряд рывка',
      'hero.node.scout_shots.name': 'Уверенная очередь',
      'hero.node.scout_shots.desc': '+урон',
      'hero.node.shadow_killer.name': 'Инстинкт убийцы',
      'hero.node.shadow_killer.desc': '+урон',
      'hero.node.shadow_haste.name': 'Тёмный темп',
      'hero.node.shadow_haste.desc': '+скорострельность',
      'hero.node.shadow_blink.name': 'Шаг в тени',
      'hero.node.shadow_blink.desc': '+скорость движения',
      'hero.node.shadow_sting.name': 'Ядовитое жало',
      'hero.node.shadow_sting.desc': '+урон +скорость',
      'hero.node.medic_aid.name': 'Полевая помощь',
      'hero.node.medic_aid.desc': '+регенерация',
      'hero.node.medic_plating.name': 'Живая броня',
      'hero.node.medic_plating.desc': '+макс. HP',
      'hero.node.medic_focus.name': 'Боевой фокус',
      'hero.node.medic_focus.desc': '+урон',
      'hero.node.medic_aura.name': 'Аура восстановления',
      'hero.node.medic_aura.desc': '+радиус подбора',
      'hero.node.raider_rage.name': 'Боевая ярость',
      'hero.node.raider_rage.desc': '+урон',
      'hero.node.raider_armor.name': 'Железная кожа',
      'hero.node.raider_armor.desc': '+макс. HP',
      'hero.node.raider_push.name': 'Неудержимый натиск',
      'hero.node.raider_push.desc': '+скорость движения',
      'hero.node.raider_charge.name': 'Военный рывок',
      'hero.node.raider_charge.desc': '+заряд рывка',
      'skill.weapon_mastery.name': 'Мастер оружия',
      'skill.rapid_reload.name': 'Быстрая перезарядка',
      'skill.vitality.name': 'Живучесть',
      'skill.haste.name': 'Скорость',
      'skill.magnetism.name': 'Магнетизм',
      'skill.bloodlust.name': 'Кровожадность',
      'skill.regeneration.name': 'Регенерация',
      'skill.dodge_instinct.name': 'Инстинкт уклонения',
      'skill.pistol_buddy.name': 'Пистолет-дрон',
      'skill.smg_buddy.name': 'SMG-дрон',
      'skill.shotgun_buddy.name': 'Дробовик-дрон',
      'skill.sniper_buddy.name': 'Снайпер-дрон',
      'skill.shockwave.name': 'Ударная волна',
      'skill.blade_orbit.name': 'Орбита клинков',
      'skill.chain_lightning.name': 'Цепная молния',
      'skill.laser_strike.name': 'Лазерный удар',
      'skill.homing_missiles.name': 'Самонаводящиеся ракеты',
      'skill.weapon_mastery.desc': 'Увеличивает урон',
      'skill.rapid_reload.desc': 'Увеличивает скорострельность',
      'skill.vitality.desc': 'Увеличивает макс. HP',
      'skill.haste.desc': 'Увеличивает скорость движения',
      'skill.magnetism.desc': 'Увеличивает радиус подбора XP',
      'skill.bloodlust.desc': 'Урон + скорострельность',
      'skill.regeneration.desc': 'Регенерация HP/с',
      'skill.dodge_instinct.desc': 'Доп. заряды рывка',
      'skill.pistol_buddy.desc': '+1 бот с пистолетом',
      'skill.smg_buddy.desc': '+1 бот с SMG',
      'skill.shotgun_buddy.desc': '+1 бот с дробовиком',
      'skill.sniper_buddy.desc': '+1 бот снайпер',
      'skill.shockwave.desc': 'Ударная AoE-волна вокруг героя',
      'skill.blade_orbit.desc': 'Бьёт ближайших врагов',
      'skill.chain_lightning.desc': 'Цепная молния по ближним целям',
      'skill.laser_strike.desc': 'Мгновенно поражает ближайших врагов',
      'skill.homing_missiles.desc': 'Запускает самонаводящиеся ракеты по ближним врагам',
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
    ['Главное меню', 'Main menu'],
    ['Профиль загружается...', 'Profile loading...'],
    ['Загрузка таблицы лидеров...', 'Loading leaderboard...'],
    ['Детали забега', 'Run details'],
    ['Нет данных.', 'No data.'],
    ['Показать реплей в игре', 'Show Replay In Game'],
    ['Скопировать ссылку на реплей', 'Copy Replay Link'],
    ['Реплей не загружен.', 'Replay not loaded.'],
    ['К началу', 'To start'],
    ['Назад 5с', 'Back 5s'],
    ['Пауза или продолжить', 'Pause or continue'],
    ['Вперёд 5с', 'Forward 5s'],
    ['К концу', 'To end'],
    ['Реплей доступен по запросу.', 'Replay is available on demand.'],
    ['Реплей недоступен для этой записи.', 'Replay is unavailable for this record.'],
    ['У реплея нет кадров.', 'Replay has no frames.'],
    ['Загрузка...', 'Loading...'],
    ['Убийства в комнате на момент смерти', 'Room kills at death'],
    ['Убийства боссов', 'Boss kills'],
    ['Убито боссов', 'Bosses killed'],
    ['Убито боссов в комнате', 'Bosses killed in room'],
    ['XP героя', 'Hero XP'],
    ['XP аккаунта', 'Account XP'],
    ['Убийства врагов', 'Enemy kills'],
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
    setText('.death-rewards-title', 'ui.death.run_rewards');
    setText('#player-access-details .auth-card-summary', 'ui.auth.player_access');
    setAttr('#player-access-details .auth-card-summary', 'data-label-open', 'ui.show');
    setAttr('#player-access-details .auth-card-summary', 'data-label-close', 'ui.hide');
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

