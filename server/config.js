const path = require('path');

const MAIN_LOOP_RATE = 120;
const MAIN_LOOP_MS = 1000 / MAIN_LOOP_RATE;
const MAX_PLAYERS = 8;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1400;
const PLAYER_RADIUS = 18;
const ENEMY_RADIUS = 18;
const BULLET_RADIUS = 4;
const DROP_RADIUS = 16;

const PLAYER_SPEED = 340;
const PLAYER_HP_MAX = 100;
const PLAYER_DODGE_DISTANCE = 165;
const PLAYER_DODGE_COOLDOWN_MS = 1200;
const PLAYER_DODGE_MAX_CHARGES = 2;
const PLAYER_DODGE_INVULN_MS = 220;
const ENEMY_SPEED_MIN = 75;
const ENEMY_SPEED_MAX = 135;
const ENEMY_HP_BASE = 22;
const ENEMY_SPAWN_INTERVAL_MS = 760;
const ENEMY_ATTACK_WINDUP_MS = 500;
const ENEMY_ATTACK_DAMAGE = 16;
const ENEMY_ATTACK_BASE_COOLDOWN_MS = 1000;
const ENEMY_ATTACK_MIN_COOLDOWN_MS = 150;
const ENEMY_ATTACK_CAST_FREQUENCY = 0;
const ENEMY_CHARGER_DASH_DISTANCE = 120;
const ENEMY_RANGED_DAMAGE = 10;
const ENEMY_RANGED_BULLET_SPEED = 520;
const ENEMY_RANGED_BULLET_LIFE_MS = 1300;
const ENEMY_RANGED_FIRE_COOLDOWN_MS = 900;
const ENEMY_RANGED_MIN_RANGE = 170;
const ENEMY_RANGED_MAX_RANGE = 280;
const BOSS_KILL_INTERVAL = 50;
const BOSS_PORTAL_WARN_MS = 4200;
const BOSS_RADIUS = 42;
const BOSS_SPRITE_SCALE = 2.6;
const BOSS_HP_BASE = 520;
const BOSS_SPEED = 88;
const BOSS_ATTACK_DAMAGE = 30;
const BOSS_ATTACK_WINDUP_MS = 820;
const BOSS_ATTACK_COOLDOWN_MS = 1300;
const BOSS_DASH_DISTANCE = 180;
const DIFFICULTY_STEP_SEC = 45;
const DIFFICULTY_SPAWN_MIN_MS = 260;
const DIFFICULTY_HP_PER_LEVEL = 0.11;
const DIFFICULTY_SPEED_PER_LEVEL = 0.045;
const DIFFICULTY_DAMAGE_PER_LEVEL = 0.08;
const DIFFICULTY_ATTACK_RATE_PER_LEVEL = 0.04;
const DIFFICULTY_SPAWN_REDUCTION_MS = 24;
const XP_ORB_LIFETIME_MS = 22000;
const XP_ORB_PULL_SPEED = 520;
const PLAYER_PICKUP_RADIUS_BASE = 74;
const SKILL_PICK_OPTIONS = 3;
const SKILL_OFFER_TTL_MS = 15000;
const SKILL_OFFER_PICKUP_RADIUS = 22;
const SKILL_OFFER_SPAWN_MIN_DIST = 140;
const SKILL_OFFER_SPAWN_MAX_DIST = 420;
const PLAYER_SLOW_FACTOR = 0.8;
const PLAYER_SLOW_DURATION_MS = 600;
const DROP_LIFETIME_MS = 30000;
const TREE_COUNT = 65;
const LEADERBOARD_LIMIT = 500;
const LEADERBOARD_PAGE_SIZE = 10;
const DATA_DIR = path.join(__dirname, '..', 'data');
const RECORDS_DB_PATH = path.join(DATA_DIR, 'records.db');
const SKILLS_CONFIG_PATH = path.join(DATA_DIR, 'skills.json');
const ADMIN_AUTH_DB_PATH = path.join(DATA_DIR, 'admin-auth.db');
const PLAYER_AUTH_DB_PATH = path.join(DATA_DIR, 'player-auth.db');
const RUNTIME_REGISTRY_DB_PATH = path.join(DATA_DIR, 'runtime-registry.db');

const DEFAULT_ROOM_SYNC = {
  tickRate: 45,
  stateSendHz: 30,
  netRenderDelayMs: 90,
  maxExtrapolationMs: 80,
  entityInterpRate: 16,
  bulletCorrectionRate: 18,
  inputSendHz: 30,
};

const WEAPONS = {
  pistol: {
    label: 'Pistol',
    cooldownMs: 170,
    pellets: 1,
    spreadDeg: 1.5,
    bulletSpeed: 920,
    bulletLifeMs: 1300,
    bulletDamage: 11,
    ammo: null,
    color: '#f59e0b',
  },
  smg: {
    label: 'SMG',
    cooldownMs: 85,
    pellets: 1,
    spreadDeg: 4,
    bulletSpeed: 860,
    bulletLifeMs: 950,
    bulletDamage: 8,
    ammo: 220,
    color: '#38bdf8',
  },
  shotgun: {
    label: 'Shotgun',
    cooldownMs: 430,
    pellets: 7,
    spreadDeg: 20,
    bulletSpeed: 770,
    bulletSpeedVariance: 0.18,
    bulletLifeMs: 470,
    bulletDamage: 7,
    ammo: 46,
    color: '#f97316',
  },
  sniper: {
    label: 'Sniper',
    cooldownMs: 700,
    pellets: 1,
    spreadDeg: 0.2,
    bulletSpeed: 3050,
    bulletLifeMs: 1700,
    bulletDamage: 44,
    ammo: 40,
    color: '#e5e7eb',
  },
};

const DROP_WEAPON_KEYS = ['smg', 'shotgun', 'sniper'];

const DEFAULT_SKILL_DEFS = {
  weapon_mastery: { id: 'weapon_mastery', name: 'Weapon Mastery', kind: 'passive', rarity: 'common', maxLevel: 8, weight: 1.35, damageMulPerLevel: 0.11, desc: '+damage' },
  rapid_reload: { id: 'rapid_reload', name: 'Rapid Reload', kind: 'passive', rarity: 'common', maxLevel: 8, weight: 1.3, fireRateMulPerLevel: 0.1, desc: '+fire rate' },
  vitality: { id: 'vitality', name: 'Vitality', kind: 'passive', rarity: 'common', maxLevel: 8, weight: 1.25, maxHpFlatPerLevel: 20, desc: '+max HP' },
  haste: { id: 'haste', name: 'Haste', kind: 'passive', rarity: 'common', maxLevel: 7, weight: 1.2, moveSpeedMulPerLevel: 0.075, desc: '+move speed' },
  magnetism: { id: 'magnetism', name: 'Magnetism', kind: 'passive', rarity: 'common', maxLevel: 6, weight: 1.12, pickupRadiusPerLevel: 22, desc: '+XP pickup radius' },
  bloodlust: { id: 'bloodlust', name: 'Bloodlust', kind: 'passive', rarity: 'rare', maxLevel: 6, weight: 0.86, damageMulPerLevel: 0.16, fireRateMulPerLevel: 0.05, desc: '+damage +fire rate' },
  regeneration: { id: 'regeneration', name: 'Regeneration', kind: 'passive', rarity: 'rare', maxLevel: 6, weight: 0.85, hpRegenPerSecPerLevel: 1.15, desc: 'HP regen/sec' },
  dodge_instinct: { id: 'dodge_instinct', name: 'Dodge Instinct', kind: 'passive', rarity: 'rare', maxLevel: 3, weight: 0.62, extraDodgeChargesPerLevel: 1, desc: '+jump charges' },
  pistol_buddy: { id: 'pistol_buddy', name: 'Pistol Buddy', kind: 'passive', rarity: 'common', maxLevel: 5, weight: 0.96, companionWeaponKey: 'pistol', desc: '+1 pistol bot' },
  smg_buddy: { id: 'smg_buddy', name: 'SMG Buddy', kind: 'passive', rarity: 'common', maxLevel: 5, weight: 0.82, companionWeaponKey: 'smg', desc: '+1 SMG bot' },
  shotgun_buddy: { id: 'shotgun_buddy', name: 'Shotgun Buddy', kind: 'passive', rarity: 'rare', maxLevel: 4, weight: 0.56, companionWeaponKey: 'shotgun', desc: '+1 shotgun bot' },
  sniper_buddy: { id: 'sniper_buddy', name: 'Sniper Buddy', kind: 'passive', rarity: 'epic', maxLevel: 3, weight: 0.34, companionWeaponKey: 'sniper', desc: '+1 sniper bot' },
  shockwave: { id: 'shockwave', name: 'Shockwave', kind: 'active', rarity: 'rare', maxLevel: 8, weight: 0.84, cooldownMs: 5400, cooldownMulPerLevel: 0.08, radius: 170, radiusPerLevel: 14, damage: 38, damagePerLevel: 16, desc: 'AoE blast around hero' },
  blade_orbit: { id: 'blade_orbit', name: 'Blade Orbit', kind: 'active', rarity: 'common', maxLevel: 8, weight: 1.02, cooldownMs: 1450, cooldownMulPerLevel: 0.05, radius: 190, radiusPerLevel: 12, damage: 23, damagePerLevel: 10, targets: 2, targetsPerLevel: 1, desc: 'Hits nearest enemies' },
  chain_lightning: { id: 'chain_lightning', name: 'Chain Lightning', kind: 'active', rarity: 'epic', maxLevel: 7, weight: 0.52, cooldownMs: 6200, cooldownMulPerLevel: 0.08, radius: 330, radiusPerLevel: 18, damage: 52, damagePerLevel: 19, targets: 3, targetsPerLevel: 1, desc: 'Chains to nearest enemies' },
  laser_strike: { id: 'laser_strike', name: 'Laser Strike', kind: 'active', rarity: 'rare', maxLevel: 8, weight: 0.72, cooldownMs: 2600, cooldownMulPerLevel: 0.06, radius: 320, radiusPerLevel: 34, damage: 40, damagePerLevel: 15, targets: 1, targetsPerLevel: 1, desc: 'Instantly zaps nearest enemies' },
  homing_missiles: { id: 'homing_missiles', name: 'Homing Missiles', kind: 'active', rarity: 'epic', maxLevel: 8, weight: 0.46, cooldownMs: 7600, cooldownMulPerLevel: 0.07, radius: 1560, radiusPerLevel: 78, damage: 34, damagePerLevel: 12, targets: 5, targetsPerLevel: 1, missileSpeed: 640, missileSpeedPerLevel: 48, turnRate: 5.8, turnRatePerLevel: 0.24, explosionRadius: 58, explosionRadiusPerLevel: 5, lifeMs: 2600, desc: 'Launches seeking rockets at nearby enemies' },
};
const ACCOUNT_BASE_HERO_ID = 'cyber';
const ACCOUNT_XP_BASE = 120;
const ACCOUNT_XP_PER_LEVEL = 80;
const ACCOUNT_XP_QUAD = 14;
const ACCOUNT_XP_FROM_SCORE_MUL = 0.22;
const ACCOUNT_XP_FROM_KILLS_MUL = 3.4;
const ACCOUNT_XP_FROM_BOSS_KILLS_MUL = 42;
const ACCOUNT_XP_FROM_SURVIVAL_SEC_MUL = 0.35;
const ACCOUNT_SHARDS_FROM_SCORE_MUL = 0.05;
const ACCOUNT_SHARDS_FROM_KILLS_MUL = 1.1;
const ACCOUNT_SHARDS_FROM_BOSS_KILLS_MUL = 12;
const ACCOUNT_SHARDS_FROM_SURVIVAL_SEC_MUL = 0.08;

const HERO_DEFS = [
  {
    id: 'cyber',
    name: 'Cyber',
    accent: '#8ec5ff',
    sprite: '/assets/sprites/player_cyber.png',
    frameW: 64,
    frameH: 64,
    rows: { down: 2, left: 1, right: 3, up: 0 },
    scale: 0.88,
    fps: 10,
    idleFrame: 1,
    unlockLevel: 1,
    unlockShardCost: 0,
    unlockCardId: '',
    unlockCardName: '',
    unlockCardNeed: 0,
    tagline: 'Universal adaptive operator',
  },
  {
    id: 'scout',
    name: 'Scout',
    accent: '#a7e7c5',
    sprite: '/assets/sprites/player_cyber.png',
    frameW: 64,
    frameH: 64,
    rows: { down: 2, left: 1, right: 3, up: 0 },
    scale: 0.9,
    fps: 11,
    idleFrame: 1,
    unlockLevel: 3,
    unlockShardCost: 90,
    unlockCardId: 'scout_core_card',
    unlockCardName: 'Scout Core Card',
    unlockCardNeed: 12,
    tagline: 'Fast recon and chase specialist',
  },
  {
    id: 'shadow',
    name: 'Shadow',
    accent: '#d4c1ff',
    sprite: '/assets/sprites/player_cyber.png',
    frameW: 64,
    frameH: 64,
    rows: { down: 2, left: 1, right: 3, up: 0 },
    scale: 0.88,
    fps: 11,
    idleFrame: 1,
    unlockLevel: 5,
    unlockShardCost: 140,
    unlockCardId: 'shadow_core_card',
    unlockCardName: 'Shadow Core Card',
    unlockCardNeed: 18,
    tagline: 'Ambush and burst assassin',
  },
  {
    id: 'medic',
    name: 'Medic',
    accent: '#ffd1dc',
    sprite: '/assets/sprites/player_cyber.png',
    frameW: 64,
    frameH: 64,
    rows: { down: 2, left: 1, right: 3, up: 0 },
    scale: 0.88,
    fps: 9,
    idleFrame: 1,
    unlockLevel: 7,
    unlockShardCost: 190,
    unlockCardId: 'medic_core_card',
    unlockCardName: 'Medic Core Card',
    unlockCardNeed: 24,
    tagline: 'Sustain and recovery master',
  },
  {
    id: 'raider',
    name: 'Raider',
    accent: '#ffe4b5',
    sprite: '/assets/sprites/player_cyber.png',
    frameW: 64,
    frameH: 64,
    rows: { down: 2, left: 1, right: 3, up: 0 },
    scale: 0.9,
    fps: 10,
    idleFrame: 1,
    unlockLevel: 9,
    unlockShardCost: 260,
    unlockCardId: 'raider_core_card',
    unlockCardName: 'Raider Core Card',
    unlockCardNeed: 30,
    tagline: 'Frontline brawler and bruiser',
  },
];

const HERO_SKILL_TREE_DEFS = {
  cyber: [
    { id: 'cyber_overclock', name: 'Overclock', desc: '+fire rate', maxLevel: 5, cost: 1, fireRateMulPerLevel: 0.03 },
    { id: 'cyber_nano_core', name: 'Nano Core', desc: '+damage', maxLevel: 5, cost: 1, damageMulPerLevel: 0.03 },
    { id: 'cyber_barrier', name: 'Barrier Matrix', desc: '+max HP', maxLevel: 5, cost: 1, maxHpFlatPerLevel: 8 },
    { id: 'cyber_magnet', name: 'Mag Sweep', desc: '+pickup radius', maxLevel: 5, cost: 1, pickupRadiusPerLevel: 6 },
  ],
  scout: [
    { id: 'scout_stride', name: 'Long Stride', desc: '+move speed', maxLevel: 5, cost: 1, moveSpeedMulPerLevel: 0.04 },
    { id: 'scout_reload', name: 'Quick Hands', desc: '+fire rate', maxLevel: 5, cost: 1, fireRateMulPerLevel: 0.025 },
    { id: 'scout_dodge', name: 'Evasive Roll', desc: '+dodge charge', maxLevel: 2, cost: 1, extraDodgeChargesPerLevel: 1 },
    { id: 'scout_shots', name: 'Steady Burst', desc: '+damage', maxLevel: 4, cost: 1, damageMulPerLevel: 0.025 },
  ],
  shadow: [
    { id: 'shadow_killer', name: 'Killer Instinct', desc: '+damage', maxLevel: 6, cost: 1, damageMulPerLevel: 0.035 },
    { id: 'shadow_haste', name: 'Dark Tempo', desc: '+fire rate', maxLevel: 4, cost: 1, fireRateMulPerLevel: 0.03 },
    { id: 'shadow_blink', name: 'Blink Step', desc: '+move speed', maxLevel: 4, cost: 1, moveSpeedMulPerLevel: 0.03 },
    { id: 'shadow_sting', name: 'Venom Edge', desc: '+damage +speed', maxLevel: 3, cost: 1, damageMulPerLevel: 0.02, moveSpeedMulPerLevel: 0.02 },
  ],
  medic: [
    { id: 'medic_aid', name: 'Field Aid', desc: '+regen', maxLevel: 5, cost: 1, hpRegenPerSecPerLevel: 0.42 },
    { id: 'medic_plating', name: 'Vital Plating', desc: '+max HP', maxLevel: 6, cost: 1, maxHpFlatPerLevel: 10 },
    { id: 'medic_focus', name: 'Combat Focus', desc: '+damage', maxLevel: 4, cost: 1, damageMulPerLevel: 0.025 },
    { id: 'medic_aura', name: 'Recovery Aura', desc: '+pickup radius', maxLevel: 4, cost: 1, pickupRadiusPerLevel: 7 },
  ],
  raider: [
    { id: 'raider_rage', name: 'Battle Rage', desc: '+damage', maxLevel: 6, cost: 1, damageMulPerLevel: 0.035 },
    { id: 'raider_armor', name: 'Iron Skin', desc: '+max HP', maxLevel: 6, cost: 1, maxHpFlatPerLevel: 11 },
    { id: 'raider_push', name: 'Relentless Push', desc: '+move speed', maxLevel: 4, cost: 1, moveSpeedMulPerLevel: 0.025 },
    { id: 'raider_charge', name: 'War Charge', desc: '+dodge charge', maxLevel: 2, cost: 1, extraDodgeChargesPerLevel: 1 },
  ],
};

module.exports = {
  MAIN_LOOP_RATE,
  MAIN_LOOP_MS,
  MAX_PLAYERS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_RADIUS,
  ENEMY_RADIUS,
  BULLET_RADIUS,
  DROP_RADIUS,
  PLAYER_SPEED,
  PLAYER_HP_MAX,
  PLAYER_DODGE_DISTANCE,
  PLAYER_DODGE_COOLDOWN_MS,
  PLAYER_DODGE_MAX_CHARGES,
  PLAYER_DODGE_INVULN_MS,
  ENEMY_SPEED_MIN,
  ENEMY_SPEED_MAX,
  ENEMY_HP_BASE,
  ENEMY_SPAWN_INTERVAL_MS,
  ENEMY_ATTACK_WINDUP_MS,
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_BASE_COOLDOWN_MS,
  ENEMY_ATTACK_MIN_COOLDOWN_MS,
  ENEMY_ATTACK_CAST_FREQUENCY,
  ENEMY_CHARGER_DASH_DISTANCE,
  ENEMY_RANGED_DAMAGE,
  ENEMY_RANGED_BULLET_SPEED,
  ENEMY_RANGED_BULLET_LIFE_MS,
  ENEMY_RANGED_FIRE_COOLDOWN_MS,
  ENEMY_RANGED_MIN_RANGE,
  ENEMY_RANGED_MAX_RANGE,
  BOSS_KILL_INTERVAL,
  BOSS_PORTAL_WARN_MS,
  BOSS_RADIUS,
  BOSS_SPRITE_SCALE,
  BOSS_HP_BASE,
  BOSS_SPEED,
  BOSS_ATTACK_DAMAGE,
  BOSS_ATTACK_WINDUP_MS,
  BOSS_ATTACK_COOLDOWN_MS,
  BOSS_DASH_DISTANCE,
  DIFFICULTY_STEP_SEC,
  DIFFICULTY_SPAWN_MIN_MS,
  DIFFICULTY_HP_PER_LEVEL,
  DIFFICULTY_SPEED_PER_LEVEL,
  DIFFICULTY_DAMAGE_PER_LEVEL,
  DIFFICULTY_ATTACK_RATE_PER_LEVEL,
  DIFFICULTY_SPAWN_REDUCTION_MS,
  XP_ORB_LIFETIME_MS,
  XP_ORB_PULL_SPEED,
  PLAYER_PICKUP_RADIUS_BASE,
  SKILL_PICK_OPTIONS,
  SKILL_OFFER_TTL_MS,
  SKILL_OFFER_PICKUP_RADIUS,
  SKILL_OFFER_SPAWN_MIN_DIST,
  SKILL_OFFER_SPAWN_MAX_DIST,
  PLAYER_SLOW_FACTOR,
  PLAYER_SLOW_DURATION_MS,
  DROP_LIFETIME_MS,
  TREE_COUNT,
  LEADERBOARD_LIMIT,
  LEADERBOARD_PAGE_SIZE,
  DATA_DIR,
  RECORDS_DB_PATH,
  SKILLS_CONFIG_PATH,
  ADMIN_AUTH_DB_PATH,
  PLAYER_AUTH_DB_PATH,
  RUNTIME_REGISTRY_DB_PATH,
  DEFAULT_ROOM_SYNC,
  WEAPONS,
  DROP_WEAPON_KEYS,
  DEFAULT_SKILL_DEFS,
  ACCOUNT_BASE_HERO_ID,
  ACCOUNT_XP_BASE,
  ACCOUNT_XP_PER_LEVEL,
  ACCOUNT_XP_QUAD,
  ACCOUNT_XP_FROM_SCORE_MUL,
  ACCOUNT_XP_FROM_KILLS_MUL,
  ACCOUNT_XP_FROM_BOSS_KILLS_MUL,
  ACCOUNT_XP_FROM_SURVIVAL_SEC_MUL,
  ACCOUNT_SHARDS_FROM_SCORE_MUL,
  ACCOUNT_SHARDS_FROM_KILLS_MUL,
  ACCOUNT_SHARDS_FROM_BOSS_KILLS_MUL,
  ACCOUNT_SHARDS_FROM_SURVIVAL_SEC_MUL,
  HERO_DEFS,
  HERO_SKILL_TREE_DEFS,
};





