function zone(material, shape, x, y, w, h, extra = {}) {
  return {
    material,
    shape,
    x,
    y,
    w,
    h,
    ...extra,
  };
}

function prop(kind, x, y, extra = {}) {
  return {
    kind,
    x,
    y,
    ...extra,
  };
}

const MAP_DEFS = [
  {
    id: 'mall_night',
    name: 'Night Mall',
    subtitle: 'Парковка, где тележки уже едят людей',
    description: 'Большая ночная парковка торгового центра. Места хватит и для кайтa, и для паники.',
    worldWidth: 4800,
    worldHeight: 2800,
    treeDensityMul: 1,
    cover: {
      from: '#2a0f12',
      to: '#0d121c',
      accent: '#f97316',
      glow: 'rgba(249, 115, 22, 0.26)',
    },
    scene: {
      themeId: 'mall',
      baseMaterial: 'grass',
      terrainZones: [
        zone('concrete', 'rect', 0.5, 0.108, 0.58, 0.16, { feather: 0.07, alpha: 1, angle: 0.01 }),
        zone('asphalt_wet', 'band', 0.5, 0.235, 0.86, 0.065, { feather: 0.08, alpha: 1, angle: 0 }),
        zone('asphalt_wet', 'band', 0.5, 0.49, 1.06, 0.2, { feather: 0.08, alpha: 1, angle: 0, centerStripe: true }),
        zone('dirt', 'ellipse', 0.18, 0.16, 0.18, 0.12, { feather: 0.28, alpha: 0.24 }),
        zone('dirt', 'ellipse', 0.82, 0.14, 0.18, 0.12, { feather: 0.28, alpha: 0.24 }),
        zone('dirt', 'ellipse', 0.18, 0.82, 0.22, 0.16, { feather: 0.28, alpha: 0.4 }),
        zone('dirt', 'ellipse', 0.84, 0.76, 0.18, 0.14, { feather: 0.28, alpha: 0.36 }),
      ],
      plannedObjects: [
        prop('mall_block', 0.5, 0.055, { scale: 1.28 }),
        prop('mall_block', 0.17, 0.09, { scale: 0.78, angle: -0.04 }),
        prop('mall_block', 0.83, 0.09, { scale: 0.78, angle: 0.04 }),
        prop('concrete_barrier', 0.39, 0.19, { scale: 1.08 }),
        prop('concrete_barrier', 0.61, 0.19, { scale: 1.08 }),
        prop('yellow_bus', 0.12, 0.31, { angle: Math.PI * 0.5 }),
        prop('red_hatchback', 0.29, 0.38, { angle: 0.12 }),
        prop('burnt_sedan', 0.37, 0.43, { angle: -0.08 }),
        prop('red_hatchback', 0.66, 0.39, { angle: -0.18 }),
        prop('burnt_sedan', 0.74, 0.44, { angle: 0.06 }),
        prop('concrete_barrier', 0.5, 0.58, { scale: 1.34, angle: 0.04 }),
        prop('concrete_barrier', 0.27, 0.67, { angle: -0.42 }),
        prop('concrete_barrier', 0.73, 0.66, { angle: 0.42 }),
      ],
      randomProps: {
        countMin: 10,
        countMax: 18,
        kinds: ['red_hatchback', 'burnt_sedan', 'concrete_barrier', 'yellow_bus', 'road_shack'],
      },
    },
  },
  {
    id: 'ringroad_bbq',
    name: 'Ringroad BBQ',
    subtitle: 'Пробка длиной в апокалипсис',
    description: 'Широкая трасса с обочинами, на которых зомби ведут себя как очень злые дачники.',
    worldWidth: 5200,
    worldHeight: 2400,
    treeDensityMul: 0.52,
    cover: {
      from: '#2a1810',
      to: '#111720',
      accent: '#fb7185',
      glow: 'rgba(251, 113, 133, 0.22)',
    },
    scene: {
      themeId: 'ringroad',
      baseMaterial: 'dirt',
      terrainZones: [
        zone('asphalt', 'band', 0.5, 0.5, 1.18, 0.26, { feather: 0.18, alpha: 0.98, angle: 0 }),
        zone('asphalt', 'band', 0.5, 0.36, 1.18, 0.16, { feather: 0.18, alpha: 0.78, angle: 0 }),
        zone('asphalt', 'band', 0.5, 0.64, 1.18, 0.16, { feather: 0.18, alpha: 0.78, angle: 0 }),
        zone('concrete', 'ellipse', 0.16, 0.2, 0.16, 0.11, { feather: 0.24, alpha: 0.44 }),
        zone('concrete', 'ellipse', 0.86, 0.82, 0.18, 0.12, { feather: 0.24, alpha: 0.42 }),
        zone('dirt', 'ellipse', 0.12, 0.5, 0.22, 0.34, { feather: 0.32, alpha: 0.68 }),
        zone('dirt', 'ellipse', 0.88, 0.48, 0.24, 0.36, { feather: 0.32, alpha: 0.68 }),
      ],
      plannedObjects: [
        prop('yellow_bus', 0.16, 0.46, { angle: 0.04 }),
        prop('yellow_bus', 0.82, 0.58, { angle: -0.05 }),
        prop('red_hatchback', 0.31, 0.47, { angle: 0.08 }),
        prop('burnt_sedan', 0.41, 0.55, { angle: -0.08 }),
        prop('ambulance_van', 0.52, 0.43, { angle: 0.05 }),
        prop('red_hatchback', 0.63, 0.57, { angle: -0.06 }),
        prop('concrete_barrier', 0.25, 0.33, { scale: 1.18, angle: 0.04 }),
        prop('concrete_barrier', 0.75, 0.68, { scale: 1.18, angle: -0.04 }),
        prop('road_shack', 0.08, 0.18, { scale: 0.92 }),
        prop('road_shack', 0.92, 0.82, { scale: 0.88, angle: Math.PI }),
      ],
      randomProps: {
        countMin: 16,
        countMax: 26,
        kinds: ['red_hatchback', 'burnt_sedan', 'yellow_bus', 'concrete_barrier', 'road_shack'],
      },
    },
  },
  {
    id: 'clinic_yard',
    name: 'Clinic Yard',
    subtitle: 'Скорая уже приехала, но не по той причине',
    description: 'Двор инфекционной клиники. Здесь пахнет антисептиком, плохими новостями и очень быстрой смертью.',
    worldWidth: 4400,
    worldHeight: 3200,
    treeDensityMul: 1.08,
    cover: {
      from: '#0d2b26',
      to: '#0c141b',
      accent: '#34d399',
      glow: 'rgba(52, 211, 153, 0.22)',
    },
    scene: {
      themeId: 'clinic',
      baseMaterial: 'concrete',
      terrainZones: [
        zone('concrete', 'rect', 0.5, 0.5, 1.04, 0.96, { feather: 0.08, alpha: 0.96 }),
        zone('asphalt', 'band', 0.5, 0.35, 0.92, 0.12, { feather: 0.16, alpha: 0.64, angle: 0 }),
        zone('asphalt', 'band', 0.5, 0.66, 0.88, 0.12, { feather: 0.16, alpha: 0.56, angle: 0.03 }),
        zone('grass', 'ellipse', 0.12, 0.14, 0.14, 0.16, { feather: 0.26, alpha: 0.52 }),
        zone('grass', 'ellipse', 0.88, 0.16, 0.14, 0.16, { feather: 0.26, alpha: 0.52 }),
        zone('toxic', 'ellipse', 0.22, 0.79, 0.18, 0.14, { feather: 0.28, alpha: 0.28 }),
        zone('toxic', 'ellipse', 0.78, 0.78, 0.2, 0.16, { feather: 0.28, alpha: 0.3 }),
      ],
      plannedObjects: [
        prop('clinic_block', 0.11, 0.16, { scale: 1.04, angle: Math.PI * 0.5 }),
        prop('clinic_block', 0.89, 0.16, { scale: 1.04, angle: -Math.PI * 0.5 }),
        prop('ambulance_van', 0.31, 0.34, { angle: 0.02 }),
        prop('ambulance_van', 0.5, 0.34, { angle: 0.02 }),
        prop('ambulance_van', 0.69, 0.34, { angle: 0.02 }),
        prop('concrete_barrier', 0.5, 0.5, { scale: 1.26 }),
        prop('concrete_barrier', 0.36, 0.63, { angle: -0.38 }),
        prop('concrete_barrier', 0.64, 0.63, { angle: 0.38 }),
        prop('road_shack', 0.16, 0.82, { scale: 0.88 }),
        prop('road_shack', 0.84, 0.82, { scale: 0.88 }),
      ],
      randomProps: {
        countMin: 8,
        countMax: 14,
        kinds: ['ambulance_van', 'concrete_barrier', 'road_shack', 'burnt_sedan'],
      },
    },
  },
  {
    id: 'reactor_sprawl',
    name: 'Reactor Sprawl',
    subtitle: 'Промзона, где дозиметр просто смеётся',
    description: 'Ржавая энергетическая зона с длинными прострелами, кучей хлама и заметно лишней радиацией.',
    worldWidth: 5600,
    worldHeight: 3000,
    treeDensityMul: 0.7,
    cover: {
      from: '#13240f',
      to: '#0d1118',
      accent: '#a3e635',
      glow: 'rgba(163, 230, 53, 0.22)',
    },
    scene: {
      themeId: 'reactor',
      baseMaterial: 'dirt',
      terrainZones: [
        zone('concrete', 'rect', 0.5, 0.5, 0.9, 0.74, { feather: 0.12, alpha: 0.54 }),
        zone('asphalt', 'band', 0.5, 0.24, 0.84, 0.12, { feather: 0.16, alpha: 0.42, angle: 0.08 }),
        zone('asphalt', 'band', 0.52, 0.73, 0.9, 0.14, { feather: 0.16, alpha: 0.38, angle: -0.06 }),
        zone('toxic', 'ellipse', 0.2, 0.22, 0.22, 0.18, { feather: 0.3, alpha: 0.4 }),
        zone('toxic', 'ellipse', 0.74, 0.26, 0.18, 0.14, { feather: 0.26, alpha: 0.34 }),
        zone('toxic', 'ellipse', 0.78, 0.76, 0.24, 0.18, { feather: 0.3, alpha: 0.42 }),
        zone('toxic', 'ellipse', 0.3, 0.72, 0.18, 0.14, { feather: 0.28, alpha: 0.28 }),
      ],
      plannedObjects: [
        prop('reactor_block', 0.18, 0.12, { scale: 0.98 }),
        prop('reactor_block', 0.82, 0.14, { scale: 0.98 }),
        prop('industrial_tank', 0.46, 0.21, { scale: 1.1 }),
        prop('industrial_tank', 0.62, 0.22, { scale: 1.1 }),
        prop('reactor_block', 0.52, 0.82, { scale: 1.18 }),
        prop('burnt_sedan', 0.24, 0.57, { angle: 0.18 }),
        prop('red_hatchback', 0.72, 0.59, { angle: -0.18 }),
        prop('concrete_barrier', 0.38, 0.48, { scale: 1.16, angle: 0.22 }),
        prop('concrete_barrier', 0.68, 0.48, { scale: 1.16, angle: -0.22 }),
        prop('road_shack', 0.12, 0.84, { scale: 0.94, angle: -0.05 }),
        prop('road_shack', 0.9, 0.84, { scale: 0.94, angle: 0.05 }),
      ],
      randomProps: {
        countMin: 12,
        countMax: 22,
        kinds: ['burnt_sedan', 'red_hatchback', 'concrete_barrier', 'industrial_tank', 'road_shack'],
      },
    },
  },
];

const CAMPAIGN_DEFS = [
  {
    id: 'mall_of_the_dead',
    name: 'Mall Of The Dead',
    shortName: 'ТЦ Конец Света',
    tagline: 'Фудкорт пал, охрана мертва, скидки вечны.',
    description: 'Торговый центр пережил всё, кроме клиентов-зомби. Нас ждут тележки, витрины и менеджер, у которого KPI теперь измеряется в мозгах.',
    cover: {
      from: '#3a1112',
      to: '#121925',
      accent: '#fb923c',
      glow: 'rgba(251, 146, 60, 0.24)',
      artLabel: 'MALL // PANIC',
    },
    levels: [
      {
        id: 'foodcourt_warmup',
        title: 'Открытие фудкорта',
        brief: 'Продержаться, пока зомби спорят, можно ли считать кетчуп супом.',
        scenario: 'Охрана пропала, музыка всё ещё играет, а фудкорт уже пытается укусить посетителей первым.',
        mapId: 'mall_night',
        goals: [
          { type: 'survive', target: 90, label: 'Продержаться 90 секунд' },
        ],
        modifiers: {
          enemySpawnMul: 1.08,
          enemyHpMul: 1,
          bossKillInterval: 28,
        },
      },
      {
        id: 'manager_special',
        title: 'Менеджер смены',
        brief: 'Выжить и снести первого босса, пока он орёт про сервис.',
        scenario: 'Из подсобки выходит менеджер фудкорта. Он очень недоволен отзывами и ещё сильнее недоволен тем, что у вас есть оружие.',
        mapId: 'mall_night',
        goals: [
          { type: 'survive', target: 120, label: 'Продержаться 2 минуты' },
          { type: 'boss_kills', target: 1, label: 'Убить 1 босса' },
        ],
        modifiers: {
          enemySpawnMul: 1.15,
          enemyHpMul: 1.08,
          bossKillInterval: 18,
        },
      },
      {
        id: 'discount_stampede',
        title: 'Чёрная пятница навсегда',
        brief: 'Устроить большую чистку и пережить давку.',
        scenario: 'Толпа заражённых услышала слово "скидка" и пришла оформлять право на ваше лицо.',
        mapId: 'mall_night',
        goals: [
          { type: 'enemy_kills', target: 150, label: 'Убить 150 врагов' },
          { type: 'player_level', target: 6, label: 'Поднять уровень до 6' },
        ],
        modifiers: {
          enemySpawnMul: 1.22,
          enemyHpMul: 1.14,
          bossKillInterval: 22,
        },
      },
      {
        id: 'parking_lot_closure',
        title: 'Парковка закрывается',
        brief: 'Дожить до финала и пережить нашествие начальства.',
        scenario: 'На парковке уже три босса, сирена орёт, а автоматические ворота почему-то решили спасать не вас.',
        mapId: 'mall_night',
        goals: [
          { type: 'survive', target: 180, label: 'Продержаться 3 минуты' },
          { type: 'boss_kills', target: 3, label: 'Убить 3 боссов' },
        ],
        modifiers: {
          enemySpawnMul: 1.28,
          enemyHpMul: 1.2,
          bossKillInterval: 16,
        },
      },
    ],
  },
  {
    id: 'ambulance_late_as_usual',
    name: 'Ambulance, But Make It Worse',
    shortName: 'Скорая Опоздала',
    tagline: 'Инфекционка, коридоры ужаса и три тонны плохих анализов.',
    description: 'В клинике вспыхнул идеальный бардак: пациенты ожили, врачи исчезли, а табличка "не бегать" теперь звучит как издёвка.',
    cover: {
      from: '#10312a',
      to: '#0d151d',
      accent: '#34d399',
      glow: 'rgba(52, 211, 153, 0.22)',
      artLabel: 'ER // CHAOS',
    },
    levels: [
      {
        id: 'triage_queue',
        title: 'Приёмное отделение',
        brief: 'Разобрать очередь пациентов, пока она не разобрала вас.',
        scenario: 'Номерки отменены. Теперь талон к врачу выдаётся укусом в бедро.',
        mapId: 'clinic_yard',
        goals: [
          { type: 'enemy_kills', target: 90, label: 'Убить 90 врагов' },
        ],
        modifiers: {
          enemySpawnMul: 1.1,
          enemyHpMul: 1.04,
          bossKillInterval: 24,
        },
      },
      {
        id: 'sterile_panic',
        title: 'Стерильная паника',
        brief: 'Дожить до конца карантина местного разлива.',
        scenario: 'Карантин объявлен. Всем советуют не паниковать, что особенно смешно среди бегущих трупов.',
        mapId: 'clinic_yard',
        goals: [
          { type: 'survive', target: 150, label: 'Продержаться 150 секунд' },
          { type: 'player_level', target: 7, label: 'Поднять уровень до 7' },
        ],
        modifiers: {
          enemySpawnMul: 1.16,
          enemyHpMul: 1.1,
          bossKillInterval: 22,
        },
      },
      {
        id: 'chief_physician',
        title: 'Главврач на смене',
        brief: 'Уволить босса клиники самым свинцовым способом.',
        scenario: 'Главврач вышел лично объяснить, что жалобы на обслуживание больше не принимаются. Челюстью.',
        mapId: 'clinic_yard',
        goals: [
          { type: 'boss_kills', target: 3, label: 'Убить 3 боссов' },
        ],
        modifiers: {
          enemySpawnMul: 1.2,
          enemyHpMul: 1.14,
          bossKillInterval: 14,
        },
      },
      {
        id: 'discharge_summary',
        title: 'Выписка без анестезии',
        brief: 'Финальная очистка двора клиники.',
        scenario: 'Пять жирных боссов перекрыли выход. Формально это называется "финальная выписка", но выглядит как массовая драка за парковку.',
        mapId: 'clinic_yard',
        goals: [
          { type: 'survive', target: 210, label: 'Продержаться 210 секунд' },
          { type: 'boss_kills', target: 5, label: 'Убить 5 боссов' },
        ],
        modifiers: {
          enemySpawnMul: 1.26,
          enemyHpMul: 1.2,
          bossKillInterval: 12,
        },
      },
    ],
  },
  {
    id: 'ringroad_grillfest',
    name: 'Ringroad Grillfest',
    shortName: 'Мясо на МКАДе',
    tagline: 'Пробка, гарь и очень личная ненависть к живым.',
    description: 'На кольцевой всё как обычно: пробка, агрессия и существа, которые лезут в окно даже без поворотника.',
    cover: {
      from: '#321410',
      to: '#121720',
      accent: '#fb7185',
      glow: 'rgba(251, 113, 133, 0.24)',
      artLabel: 'ROAD // FURY',
    },
    levels: [
      {
        id: 'traffic_jam',
        title: 'Пробка с зубами',
        brief: 'Удержать трассу и не дать ей съесть вас целиком.',
        scenario: 'Машины стоят, зомби бегут, а аварийка помогает ровно до тех пор, пока её не откусили.',
        mapId: 'ringroad_bbq',
        goals: [
          { type: 'survive', target: 120, label: 'Продержаться 2 минуты' },
          { type: 'enemy_kills', target: 110, label: 'Убить 110 врагов' },
        ],
        modifiers: {
          enemySpawnMul: 1.14,
          enemyHpMul: 1.06,
          bossKillInterval: 24,
        },
      },
      {
        id: 'roadside_brigade',
        title: 'Бригада обочечников',
        brief: 'Показать, что по встречке сегодня едут только патроны.',
        scenario: 'Особо наглые мутанты полезли по обочине. Пришло время объяснить им правила движения баллистикой.',
        mapId: 'ringroad_bbq',
        goals: [
          { type: 'boss_kills', target: 2, label: 'Убить 2 боссов' },
          { type: 'enemy_kills', target: 130, label: 'Убить 130 врагов' },
        ],
        modifiers: {
          enemySpawnMul: 1.2,
          enemyHpMul: 1.12,
          bossKillInterval: 18,
        },
      },
      {
        id: 'gas_station_choir',
        title: 'Хор на заправке',
        brief: 'Сдержать оркестр бензиновой ярости.',
        scenario: 'К заправке подтянулись бронированные уроды, и каждый уверен, что именно он сегодня будет вашим последним клиентом.',
        mapId: 'ringroad_bbq',
        goals: [
          { type: 'survive', target: 180, label: 'Продержаться 3 минуты' },
          { type: 'boss_kills', target: 4, label: 'Убить 4 боссов' },
        ],
        modifiers: {
          enemySpawnMul: 1.26,
          enemyHpMul: 1.18,
          bossKillInterval: 14,
        },
      },
      {
        id: 'ringroad_bbq_finale',
        title: 'Финальный шашлык',
        brief: 'Устроить полное мясо и выжить в дыму.',
        scenario: 'Пять боссов, гарь, клаксоны и чувство, что это всё можно было объехать, если бы апокалипсис начался вчера.',
        mapId: 'ringroad_bbq',
        goals: [
          { type: 'survive', target: 240, label: 'Продержаться 4 минуты' },
          { type: 'boss_kills', target: 5, label: 'Убить 5 боссов' },
        ],
        modifiers: {
          enemySpawnMul: 1.34,
          enemyHpMul: 1.24,
          bossKillInterval: 11,
        },
      },
    ],
  },
  {
    id: 'reactor_afterparty',
    name: 'Reactor Afterparty',
    shortName: 'Реактор После Корпоратива',
    tagline: 'Радиация, трубы и мутанты с профсоюзной злостью.',
    description: 'Промзона пережила очень плохой корпоратив: бочки светятся, техника орёт, а бывшие сотрудники превратились в радиоактивных энтузиастов.',
    cover: {
      from: '#18290d',
      to: '#0e1218',
      accent: '#a3e635',
      glow: 'rgba(163, 230, 53, 0.24)',
      artLabel: 'REACTOR // HANGOVER',
    },
    levels: [
      {
        id: 'night_shift',
        title: 'Ночная смена',
        brief: 'Поднять уровень, пока цех пытается поднять вас на вилы.',
        scenario: 'Обычная ночная смена: сирены воют, мутанты бегут, начальства нет, но проблем почему-то больше.',
        mapId: 'reactor_sprawl',
        goals: [
          { type: 'survive', target: 120, label: 'Продержаться 2 минуты' },
          { type: 'player_level', target: 6, label: 'Поднять уровень до 6' },
        ],
        modifiers: {
          enemySpawnMul: 1.16,
          enemyHpMul: 1.08,
          bossKillInterval: 24,
        },
      },
      {
        id: 'safety_briefing',
        title: 'Инструктаж по ТБ',
        brief: 'Пройти технику безопасности через бойню.',
        scenario: 'Инструкция гласит: "не стоять под трубой". Инструкция не уточняет, что делать, если труба бежит на вас.',
        mapId: 'reactor_sprawl',
        goals: [
          { type: 'enemy_kills', target: 160, label: 'Убить 160 врагов' },
          { type: 'boss_kills', target: 2, label: 'Убить 2 боссов' },
        ],
        modifiers: {
          enemySpawnMul: 1.22,
          enemyHpMul: 1.14,
          bossKillInterval: 17,
        },
      },
      {
        id: 'control_room',
        title: 'Пульт, который всё испортил',
        brief: 'Зачистить сердце промзоны.',
        scenario: 'В диспетчерской засели мутанты, которые всё ещё считают себя отделом контроля качества. Очень смешно, пока они не бегут на таран.',
        mapId: 'reactor_sprawl',
        goals: [
          { type: 'survive', target: 210, label: 'Продержаться 210 секунд' },
          { type: 'boss_kills', target: 4, label: 'Убить 4 боссов' },
        ],
        modifiers: {
          enemySpawnMul: 1.28,
          enemyHpMul: 1.2,
          bossKillInterval: 13,
        },
      },
      {
        id: 'reactor_core',
        title: 'Сердце реактора',
        brief: 'Финальный забег по зоне, где дозиметр плачет.',
        scenario: 'Пять элитных боссов охраняют ядро так, будто им обещали вернуть квартальную премию. Не вернут. Но урон нанесут.',
        mapId: 'reactor_sprawl',
        goals: [
          { type: 'survive', target: 260, label: 'Продержаться 260 секунд' },
          { type: 'boss_kills', target: 5, label: 'Убить 5 боссов' },
          { type: 'player_level', target: 8, label: 'Поднять уровень до 8' },
        ],
        modifiers: {
          enemySpawnMul: 1.36,
          enemyHpMul: 1.26,
          bossKillInterval: 10,
        },
      },
    ],
  },
];

const MAP_BY_ID = Object.fromEntries(MAP_DEFS.map((mapDef) => [mapDef.id, mapDef]));
const CAMPAIGN_BY_ID = Object.fromEntries(
  CAMPAIGN_DEFS.map((campaign) => [
    campaign.id,
    {
      ...campaign,
      levels: campaign.levels.map((level, index) => ({
        ...level,
        index,
        campaignId: campaign.id,
      })),
    },
  ]),
);

function getMapDef(mapId) {
  const id = String(mapId || '').trim();
  return MAP_BY_ID[id] || MAP_DEFS[0];
}

function getCampaignDef(campaignId) {
  const id = String(campaignId || '').trim();
  return CAMPAIGN_BY_ID[id] || null;
}

function getCampaignLevelDef(campaignId, levelId) {
  const campaign = getCampaignDef(campaignId);
  if (!campaign) return null;
  const id = String(levelId || '').trim();
  return campaign.levels.find((level) => level.id === id) || null;
}

function toPublicMapDef(mapDef) {
  if (!mapDef) return null;
  return {
    id: mapDef.id,
    name: mapDef.name,
    subtitle: mapDef.subtitle,
    description: mapDef.description,
    worldWidth: Math.max(1200, Number(mapDef.worldWidth) || 2400),
    worldHeight: Math.max(900, Number(mapDef.worldHeight) || 1400),
    cover: mapDef.cover ? { ...mapDef.cover } : null,
  };
}

function toPublicCampaignDef(campaignDef) {
  if (!campaignDef) return null;
  return {
    id: campaignDef.id,
    name: campaignDef.name,
    shortName: campaignDef.shortName,
    tagline: campaignDef.tagline,
    description: campaignDef.description,
    cover: campaignDef.cover ? { ...campaignDef.cover } : null,
    levels: campaignDef.levels.map((level) => ({
      id: level.id,
      index: level.index,
      title: level.title,
      brief: level.brief,
      scenario: level.scenario,
      mapId: level.mapId,
      goals: Array.isArray(level.goals) ? level.goals.map((goal) => ({ ...goal })) : [],
    })),
  };
}

module.exports = {
  MAP_DEFS,
  MAP_BY_ID,
  CAMPAIGN_DEFS: Object.values(CAMPAIGN_BY_ID),
  CAMPAIGN_BY_ID,
  getMapDef,
  getCampaignDef,
  getCampaignLevelDef,
  toPublicMapDef,
  toPublicCampaignDef,
};
