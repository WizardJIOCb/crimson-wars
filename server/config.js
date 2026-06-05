const path = require('path');

const {
  MAP_DEFS,
  CAMPAIGN_DEFS,
} = require('./world-content');

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
const PLAYER_MOVE_SPEED_GLOBAL_MUL = 0.75;
const PLAYER_HP_MAX = 100;
const PLAYER_DODGE_DISTANCE = 165;
const PLAYER_DODGE_COOLDOWN_MS = 1200;
const PLAYER_DODGE_MAX_CHARGES = 2;
const PLAYER_DODGE_INVULN_MS = 220;
const PLAYER_RESPAWN_MODE = 'none';
const PLAYER_RESPAWN_DELAY_MS = 3000;
const PLAYER_RESPAWN_EXTRA_LIVES = 2;
const PLAYER_RESPAWN_START_TOKENS = 1;
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
const ENEMY_HIT_STUN_MS = 110;
const ENEMY_HIT_KNOCKBACK_SPEED = 200;
const ENEMY_HIT_KNOCKBACK_FRICTION = 7.2;
const ENEMY_SKILL_KNOCKBACK_BONUS = 1.35;
const ENEMY_KNOCKBACK_BOSS_RESIST = 0.42;
const ENEMY_KNOCKBACK_CHARGER_RESIST = 0.72;
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
const TREE_COUNT = 24;
const LEADERBOARD_LIMIT = 500;
const LEADERBOARD_PAGE_SIZE = 10;
const DATA_DIR = path.join(__dirname, '..', 'data');
const RECORDS_DB_PATH = path.join(DATA_DIR, 'records.db');
const SKILLS_CONFIG_PATH = path.join(DATA_DIR, 'skills.json');
const WORLD_CONTENT_PATH = path.join(DATA_DIR, 'world-content.json');
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
    magazineSize: 12,
    reserveAmmo: null,
    pickupAmmo: null,
    reloadMs: 720,
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
    magazineSize: 36,
    reserveAmmo: 180,
    pickupAmmo: 120,
    reloadMs: 1180,
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
    magazineSize: 8,
    reserveAmmo: 40,
    pickupAmmo: 24,
    reloadMs: 1540,
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
    magazineSize: 5,
    reserveAmmo: 25,
    pickupAmmo: 15,
    reloadMs: 1780,
    color: '#e5e7eb',
  },
};

const DROP_WEAPON_KEYS = ['smg', 'shotgun', 'sniper'];

const DEFAULT_SKILL_DEFS = {
  weapon_mastery: { id: 'weapon_mastery', name: 'Weapon Mastery', kind: 'passive', rarity: 'common', maxLevel: 8, weight: 1.35, damageMulPerLevel: 0.11, desc: '+damage' },
  rapid_reload: { id: 'rapid_reload', name: 'Rapid Reload', kind: 'passive', rarity: 'common', maxLevel: 8, weight: 1.3, fireRateMulPerLevel: 0.1, desc: '+fire rate' },
  tactical_slap: { id: 'tactical_slap', name: 'Tactical Slap', kind: 'passive', rarity: 'common', maxLevel: 6, weight: 0.92, reloadSpeedMulPerLevel: 0.1, desc: 'A dramatic mag slap speeds up reloads' },
  shilo_rm: { id: 'shilo_rm', name: 'Shilo RM', kind: 'passive', rarity: 'rare', maxLevel: 5, weight: 0.64, bulletPiercePerLevel: 1, bulletDamageMulPerLevel: 0.08, desc: 'Shilo Rap Machine: bullets pierce enemies and hit harder' },
  bullet_gps: { id: 'bullet_gps', name: 'Bullet GPS', kind: 'passive', rarity: 'rare', maxLevel: 7, weight: 0.68, bulletHomingRangeBase: 360, bulletHomingRangePerLevel: 44, bulletHomingTurnBase: 1.7, bulletHomingTurnPerLevel: 0.42, desc: 'Bullets politely curve into nearby enemies' },
  vitality: { id: 'vitality', name: 'Vitality', kind: 'passive', rarity: 'common', maxLevel: 8, weight: 1.25, maxHpFlatPerLevel: 20, desc: '+max HP' },
  haste: { id: 'haste', name: 'Haste', kind: 'passive', rarity: 'common', maxLevel: 7, weight: 1.2, moveSpeedMulPerLevel: 0.075, desc: '+move speed' },
  magnetism: { id: 'magnetism', name: 'Magnetism', kind: 'passive', rarity: 'common', maxLevel: 6, weight: 1.12, pickupRadiusPerLevel: 22, desc: '+XP pickup radius' },
  bloodlust: { id: 'bloodlust', name: 'Bloodlust', kind: 'passive', rarity: 'rare', maxLevel: 6, weight: 0.86, damageMulPerLevel: 0.16, fireRateMulPerLevel: 0.05, desc: '+damage +fire rate' },
  regeneration: { id: 'regeneration', name: 'Regeneration', kind: 'passive', rarity: 'rare', maxLevel: 6, weight: 0.85, hpRegenPerSecPerLevel: 1.15, desc: 'HP regen/sec' },
  force_shield: { id: 'force_shield', name: 'Force Shield', kind: 'passive', rarity: 'rare', maxLevel: 6, weight: 0.74, shieldMaxBase: 26, shieldMaxPerLevel: 18, shieldAbsorbBase: 0.42, shieldAbsorbPerLevel: 0.045, shieldRestoreMs: 30000, desc: 'Blue barrier absorbs damage and reboots' },
  dodge_instinct: { id: 'dodge_instinct', name: 'Dodge Instinct', kind: 'passive', rarity: 'rare', maxLevel: 3, weight: 0.62, extraDodgeChargesPerLevel: 1, desc: '+jump charges' },
  pistol_buddy: { id: 'pistol_buddy', name: 'Pistol Buddy', kind: 'passive', rarity: 'common', maxLevel: 5, weight: 0.96, companionWeaponKey: 'pistol', desc: '+1 pistol bot' },
  smg_buddy: { id: 'smg_buddy', name: 'SMG Buddy', kind: 'passive', rarity: 'common', maxLevel: 5, weight: 0.82, companionWeaponKey: 'smg', desc: '+1 SMG bot' },
  shotgun_buddy: { id: 'shotgun_buddy', name: 'Shotgun Buddy', kind: 'passive', rarity: 'rare', maxLevel: 4, weight: 0.56, companionWeaponKey: 'shotgun', desc: '+1 shotgun bot' },
  sniper_buddy: { id: 'sniper_buddy', name: 'Sniper Buddy', kind: 'passive', rarity: 'epic', maxLevel: 3, weight: 0.34, companionWeaponKey: 'sniper', desc: '+1 sniper bot' },
  shockwave: { id: 'shockwave', name: 'Shockwave', kind: 'active', rarity: 'rare', maxLevel: 8, weight: 0.84, cooldownMs: 5400, cooldownMulPerLevel: 0.08, radius: 170, radiusPerLevel: 14, damage: 38, damagePerLevel: 16, desc: 'AoE blast around hero' },
  psi_blast: { id: 'psi_blast', name: 'Psi Blast', kind: 'active', rarity: 'epic', maxLevel: 6, weight: 0.55, cooldownMs: 8600, cooldownMulPerLevel: 0.07, radius: 465, radiusPerLevel: 29, damage: 54, damagePerLevel: 20, knockbackMul: 9.6, stunMs: 180, desc: 'Massive radial knockback blast' },
  blade_orbit: { id: 'blade_orbit', name: 'Blade Orbit', kind: 'active', rarity: 'common', maxLevel: 8, weight: 1.02, cooldownMs: 1450, cooldownMulPerLevel: 0.05, radius: 320, radiusPerLevel: 22, damage: 23, damagePerLevel: 10, targets: 2, targetsPerLevel: 1, desc: 'Hits nearest enemies' },
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
const HERO_LEVEL_CAP = 999;
const HERO_XP_BASE = 90;
const HERO_XP_PER_LEVEL = 32;
const HERO_XP_QUAD = 2.4;
const ITEM_SALVAGE_START = 0;

const ITEM_SLOT_DEFS = [
  { key: 'head', name: 'Шапка', kind: 'gear', category: 'head' },
  { key: 'armor', name: 'Броня', kind: 'gear', category: 'armor' },
  { key: 'legs', name: 'Штаны', kind: 'gear', category: 'legs' },
  { key: 'left_hand', name: 'Левая рука', kind: 'gear', category: 'hand' },
  { key: 'right_hand', name: 'Правая рука', kind: 'gear', category: 'hand' },
  { key: 'melee', name: 'Ближний бой', kind: 'gear', category: 'melee' },
  { key: 'ring_1', name: 'Кольцо 1', kind: 'gear', category: 'ring' },
  { key: 'ring_2', name: 'Кольцо 2', kind: 'gear', category: 'ring' },
  { key: 'quick_1', name: 'Быстрый слот 1', kind: 'consumable', category: 'quick' },
  { key: 'quick_2', name: 'Быстрый слот 2', kind: 'consumable', category: 'quick' },
  { key: 'quick_3', name: 'Быстрый слот 3', kind: 'consumable', category: 'quick' },
];

const ITEM_DEFS = [
  { id: 'wool_cap', name: 'Шерстяная шапка', slotCategory: 'head', rarity: 'common', sellSalvage: 6, upgradeSalvageBase: 10, upgradeSalvageStep: 6, stats: { maxHpFlat: 10, hpRegenPerSec: 0.08 } },
  { id: 'scavenger_mask', name: 'Маска падальщика', slotCategory: 'head', rarity: 'uncommon', sellSalvage: 10, upgradeSalvageBase: 14, upgradeSalvageStep: 7, stats: { damageMul: 0.012, pickupRadius: 12 } },
  { id: 'tactical_helmet', name: 'Тактический шлем', slotCategory: 'head', rarity: 'rare', sellSalvage: 15, upgradeSalvageBase: 18, upgradeSalvageStep: 9, stats: { damageMul: 0.015, maxHpFlat: 16 } },
  { id: 'psi_visor', name: 'Пси-визор', slotCategory: 'head', rarity: 'epic', sellSalvage: 32, upgradeSalvageBase: 28, upgradeSalvageStep: 13, stats: { fireRateMul: 0.025, pickupRadius: 18 } },
  { id: 'war_crown', name: 'Корона войны', slotCategory: 'head', rarity: 'legendary', sellSalvage: 52, upgradeSalvageBase: 42, upgradeSalvageStep: 18, stats: { damageMul: 0.03, fireRateMul: 0.018, maxHpFlat: 18 } },
  { id: 'oracle_hood', name: 'Капюшон оракула', slotCategory: 'head', rarity: 'rare', sellSalvage: 19, upgradeSalvageBase: 21, upgradeSalvageStep: 10, stats: { pickupRadius: 22, hpRegenPerSec: 0.16 } },
  { id: 'cloth_vest', name: 'Лёгкий жилет', slotCategory: 'armor', rarity: 'common', sellSalvage: 8, upgradeSalvageBase: 10, upgradeSalvageStep: 6, stats: { maxHpFlat: 18 } },
  { id: 'hunter_jacket', name: 'Куртка охотника', slotCategory: 'armor', rarity: 'uncommon', sellSalvage: 12, upgradeSalvageBase: 16, upgradeSalvageStep: 8, stats: { maxHpFlat: 20, moveSpeedMul: 0.01 } },
  { id: 'steel_carapace', name: 'Стальная кираса', slotCategory: 'armor', rarity: 'rare', sellSalvage: 18, upgradeSalvageBase: 20, upgradeSalvageStep: 10, stats: { maxHpFlat: 30, moveSpeedMul: -0.005 } },
  { id: 'nano_mail', name: 'Нано-кольчуга', slotCategory: 'armor', rarity: 'epic', sellSalvage: 34, upgradeSalvageBase: 30, upgradeSalvageStep: 14, stats: { maxHpFlat: 24, hpRegenPerSec: 0.22, damageMul: 0.012 } },
  { id: 'reactive_plate', name: 'Реактивная бронеплита', slotCategory: 'armor', rarity: 'legendary', sellSalvage: 56, upgradeSalvageBase: 44, upgradeSalvageStep: 19, stats: { maxHpFlat: 42, hpRegenPerSec: 0.28, damageMul: 0.018 } },
  { id: 'hazmat_shell', name: 'Хазмат-корпус', slotCategory: 'armor', rarity: 'epic', sellSalvage: 37, upgradeSalvageBase: 31, upgradeSalvageStep: 14, stats: { maxHpFlat: 28, hpRegenPerSec: 0.18, pickupRadius: 14 } },
  { id: 'field_pants', name: 'Полевые штаны', slotCategory: 'legs', rarity: 'common', sellSalvage: 7, upgradeSalvageBase: 10, upgradeSalvageStep: 5, stats: { moveSpeedMul: 0.012 } },
  { id: 'runner_leggings', name: 'Штаны рейдера', slotCategory: 'legs', rarity: 'uncommon', sellSalvage: 10, upgradeSalvageBase: 13, upgradeSalvageStep: 7, stats: { moveSpeedMul: 0.016, pickupRadius: 8 } },
  { id: 'combat_greaves', name: 'Боевые поножи', slotCategory: 'legs', rarity: 'rare', sellSalvage: 16, upgradeSalvageBase: 18, upgradeSalvageStep: 9, stats: { moveSpeedMul: 0.018, maxHpFlat: 10 } },
  { id: 'shadow_treads', name: 'Теневые ботфорты', slotCategory: 'legs', rarity: 'epic', sellSalvage: 31, upgradeSalvageBase: 28, upgradeSalvageStep: 12, stats: { moveSpeedMul: 0.03, fireRateMul: 0.012 } },
  { id: 'servo_greaves', name: 'Сервоприводные поножи', slotCategory: 'legs', rarity: 'legendary', sellSalvage: 50, upgradeSalvageBase: 41, upgradeSalvageStep: 18, stats: { moveSpeedMul: 0.04, fireRateMul: 0.015, maxHpFlat: 16 } },
  { id: 'grav_boots', name: 'Грави-ботинки', slotCategory: 'legs', rarity: 'rare', sellSalvage: 18, upgradeSalvageBase: 20, upgradeSalvageStep: 9, stats: { moveSpeedMul: 0.022, pickupRadius: 12 } },
  { id: 'combat_knife', name: 'Боевой нож', slotCategory: 'hand', rarity: 'common', sellSalvage: 7, upgradeSalvageBase: 9, upgradeSalvageStep: 5, stats: { damageMul: 0.014 } },
  { id: 'breacher_glove', name: 'Перчатка взломщика', slotCategory: 'hand', rarity: 'uncommon', sellSalvage: 11, upgradeSalvageBase: 14, upgradeSalvageStep: 7, stats: { fireRateMul: 0.014, pickupRadius: 10 } },
  { id: 'stabilizer_glove', name: 'Перчатка-стабилизатор', slotCategory: 'hand', rarity: 'rare', sellSalvage: 15, upgradeSalvageBase: 16, upgradeSalvageStep: 8, stats: { fireRateMul: 0.022 } },
  { id: 'plasma_emitter', name: 'Плазменный эмиттер', slotCategory: 'hand', rarity: 'epic', sellSalvage: 33, upgradeSalvageBase: 29, upgradeSalvageStep: 13, stats: { damageMul: 0.022, fireRateMul: 0.014 } },
  { id: 'nova_gauntlet', name: 'Нова-рукавица', slotCategory: 'hand', rarity: 'legendary', sellSalvage: 54, upgradeSalvageBase: 43, upgradeSalvageStep: 18, stats: { damageMul: 0.032, fireRateMul: 0.018, moveSpeedMul: 0.012 } },
  { id: 'phase_blade', name: 'Фазовый клинок', slotCategory: 'hand', rarity: 'epic', sellSalvage: 36, upgradeSalvageBase: 30, upgradeSalvageStep: 13, stats: { damageMul: 0.026, moveSpeedMul: 0.015 } },
  { id: 'melee_sword', name: 'Меч', slotCategory: 'melee', rarity: 'common', sellSalvage: 0, unsellable: true, upgradeSalvageBase: 12, upgradeSalvageStep: 7, upgradeShardBase: 2, upgradeShardStep: 1, stats: { damageMul: 0.008 }, melee: { style: 'sword', skillName: 'Чистый срез', skillDesc: 'Широкий быстрый удар, добивающий раненых врагов.', damage: 24, damagePerLevel: 5, range: 104, rangePerLevel: 2, width: 72, arcDeg: 94, cooldownMs: 760, cooldownMulPerLevel: 0.026, maxTargets: 3, targetEveryLevels: 4, executeHpPct: 0.35, executeDamageMul: 1.28, knockback: 170, stunMs: 70, color: '#e5e7eb', secondaryColor: '#fca5a5' } },
  { id: 'melee_chainsaw', name: 'Бензопила', slotCategory: 'melee', rarity: 'rare', sellSalvage: 22, upgradeSalvageBase: 25, upgradeSalvageStep: 11, upgradeShardBase: 6, upgradeShardStep: 2, stats: { damageMul: 0.014, reloadSpeedMul: 0.008 }, melee: { style: 'chainsaw', skillName: 'Разгон цепи', skillDesc: 'Грызёт сектор перед героем и дольше держит врагов в стане.', damage: 19, damagePerLevel: 6, range: 96, rangePerLevel: 2, width: 88, arcDeg: 78, cooldownMs: 620, cooldownMulPerLevel: 0.022, maxTargets: 5, targetEveryLevels: 3, closeDamageMul: 1.18, knockback: 95, stunMs: 150, color: '#fb923c', secondaryColor: '#fde68a' } },
  { id: 'melee_warhammer', name: 'Большой молот', slotCategory: 'melee', rarity: 'rare', sellSalvage: 24, upgradeSalvageBase: 27, upgradeSalvageStep: 12, upgradeShardBase: 7, upgradeShardStep: 2, stats: { damageMul: 0.016, maxHpFlat: 8 }, melee: { style: 'hammer', skillName: 'Трещина асфальта', skillDesc: 'Тяжёлый удар по земле с оглушением и отбрасыванием.', damage: 46, damagePerLevel: 9, range: 92, rangePerLevel: 2, width: 132, arcDeg: 360, cooldownMs: 1120, cooldownMulPerLevel: 0.02, maxTargets: 7, targetEveryLevels: 3, knockback: 520, stunMs: 360, color: '#facc15', secondaryColor: '#94a3b8' } },
  { id: 'melee_bat', name: 'Бита', slotCategory: 'melee', rarity: 'uncommon', sellSalvage: 13, upgradeSalvageBase: 18, upgradeSalvageStep: 8, upgradeShardBase: 4, upgradeShardStep: 1, stats: { moveSpeedMul: 0.01, damageMul: 0.01 }, melee: { style: 'bat', skillName: 'Хоум-ран', skillDesc: 'Первую цель бьёт особенно больно и далеко отбрасывает.', damage: 30, damagePerLevel: 6, range: 98, rangePerLevel: 2, width: 70, arcDeg: 82, cooldownMs: 820, cooldownMulPerLevel: 0.024, maxTargets: 3, targetEveryLevels: 4, firstTargetDamageMul: 1.34, knockback: 640, stunMs: 110, color: '#f59e0b', secondaryColor: '#fed7aa' } },
  { id: 'melee_plasma_glaive', name: 'Плазменная глефа', slotCategory: 'melee', rarity: 'epic', sellSalvage: 38, upgradeSalvageBase: 34, upgradeSalvageStep: 15, upgradeShardBase: 10, upgradeShardStep: 3, stats: { damageMul: 0.018, fireRateMul: 0.012 }, melee: { style: 'glaive', skillName: 'Плазменный рикошет', skillDesc: 'Клинок режет дугой и прожигает дополнительную цель рядом.', damage: 34, damagePerLevel: 8, range: 126, rangePerLevel: 3, width: 82, arcDeg: 112, cooldownMs: 900, cooldownMulPerLevel: 0.024, maxTargets: 4, targetEveryLevels: 3, chainTargets: 1, chainRadius: 145, chainDamageMul: 0.52, knockback: 190, stunMs: 90, color: '#22d3ee', secondaryColor: '#a78bfa' } },
  { id: 'melee_shock_baton', name: 'Шоковая дубинка', slotCategory: 'melee', rarity: 'uncommon', sellSalvage: 14, upgradeSalvageBase: 18, upgradeSalvageStep: 9, upgradeShardBase: 4, upgradeShardStep: 1, stats: { fireRateMul: 0.012, pickupRadius: 8 }, melee: { style: 'baton', skillName: 'Короткое замыкание', skillDesc: 'Быстрый удар, который надёжно станит ближайших врагов.', damage: 21, damagePerLevel: 5, range: 92, rangePerLevel: 2, width: 66, arcDeg: 76, cooldownMs: 560, cooldownMulPerLevel: 0.028, maxTargets: 3, targetEveryLevels: 4, knockback: 120, stunMs: 300, color: '#67e8f9', secondaryColor: '#f8fafc' } },
  { id: 'melee_monowire_whip', name: 'Моноволоконный хлыст', slotCategory: 'melee', rarity: 'epic', sellSalvage: 40, upgradeSalvageBase: 35, upgradeSalvageStep: 15, upgradeShardBase: 10, upgradeShardStep: 3, stats: { damageMul: 0.02, moveSpeedMul: 0.012 }, melee: { style: 'whip', skillName: 'Тонкий разрез', skillDesc: 'Длинный линейный удар, прошивающий плотную пачку.', damage: 29, damagePerLevel: 7, range: 176, rangePerLevel: 4, width: 42, arcDeg: 26, cooldownMs: 940, cooldownMulPerLevel: 0.022, maxTargets: 6, targetEveryLevels: 3, pierceDamageMul: 1.08, knockback: 150, stunMs: 80, color: '#f0abfc', secondaryColor: '#f8fafc' } },
  { id: 'melee_cryo_axe', name: 'Крио-топор', slotCategory: 'melee', rarity: 'epic', sellSalvage: 39, upgradeSalvageBase: 34, upgradeSalvageStep: 15, upgradeShardBase: 10, upgradeShardStep: 3, stats: { maxHpFlat: 12, damageMul: 0.016 }, melee: { style: 'cryo', skillName: 'Ледяной раскол', skillDesc: 'Морозный раскол сильно замедляет и оглушает цель.', damage: 38, damagePerLevel: 8, range: 112, rangePerLevel: 3, width: 86, arcDeg: 90, cooldownMs: 980, cooldownMulPerLevel: 0.022, maxTargets: 4, targetEveryLevels: 4, knockback: 240, stunMs: 420, playerSlowMs: 900, color: '#93c5fd', secondaryColor: '#cffafe' } },
  { id: 'melee_void_scythe', name: 'Коса бездны', slotCategory: 'melee', rarity: 'legendary', sellSalvage: 62, upgradeSalvageBase: 48, upgradeSalvageStep: 20, upgradeShardBase: 16, upgradeShardStep: 4, stats: { damageMul: 0.028, fireRateMul: 0.01, pickupRadius: 14 }, melee: { style: 'scythe', skillName: 'Серп затмения', skillDesc: 'Большая тёмная дуга с эхом урона по краю удара.', damage: 43, damagePerLevel: 10, range: 148, rangePerLevel: 4, width: 104, arcDeg: 124, cooldownMs: 1060, cooldownMulPerLevel: 0.024, maxTargets: 6, targetEveryLevels: 3, echoDamageMul: 0.32, echoRadius: 112, knockback: 280, stunMs: 170, color: '#c084fc', secondaryColor: '#fb7185' } },
  { id: 'copper_ring', name: 'Медное кольцо', slotCategory: 'ring', rarity: 'common', sellSalvage: 6, upgradeSalvageBase: 8, upgradeSalvageStep: 4, stats: { pickupRadius: 10 } },
  { id: 'emerald_ring', name: 'Изумрудное кольцо', slotCategory: 'ring', rarity: 'uncommon', sellSalvage: 10, upgradeSalvageBase: 12, upgradeSalvageStep: 6, stats: { hpRegenPerSec: 0.15, pickupRadius: 8 } },
  { id: 'ruby_ring', name: 'Рубиновое кольцо', slotCategory: 'ring', rarity: 'rare', sellSalvage: 14, upgradeSalvageBase: 15, upgradeSalvageStep: 8, stats: { damageMul: 0.012, maxHpFlat: 8 } },
  { id: 'storm_ring', name: 'Кольцо шторма', slotCategory: 'ring', rarity: 'epic', sellSalvage: 30, upgradeSalvageBase: 27, upgradeSalvageStep: 12, stats: { fireRateMul: 0.02, moveSpeedMul: 0.012 } },
  { id: 'void_ring', name: 'Кольцо пустоты', slotCategory: 'ring', rarity: 'legendary', sellSalvage: 49, upgradeSalvageBase: 39, upgradeSalvageStep: 17, stats: { damageMul: 0.026, fireRateMul: 0.012, pickupRadius: 18 } },
  { id: 'sapphire_ring', name: 'Сапфировое кольцо', slotCategory: 'ring', rarity: 'rare', sellSalvage: 17, upgradeSalvageBase: 18, upgradeSalvageStep: 8, stats: { fireRateMul: 0.014, hpRegenPerSec: 0.12 } },
  { id: 'bandage', name: 'Бинты', slotCategory: 'quick', rarity: 'common', stackable: true, maxStack: 12, sellSalvage: 2, combatUse: { type: 'heal', healFlat: 32 } },
  { id: 'trauma_foam', name: 'Травма-пена', slotCategory: 'quick', rarity: 'uncommon', stackable: true, maxStack: 10, sellSalvage: 3, combatUse: { type: 'heal', healFlat: 48 } },
  { id: 'medkit', name: 'Аптечка', slotCategory: 'quick', rarity: 'rare', stackable: true, maxStack: 8, sellSalvage: 5, combatUse: { type: 'heal', healFlat: 68 } },
  { id: 'frag_grenade', name: 'Осколочная граната', slotCategory: 'quick', rarity: 'common', stackable: true, maxStack: 10, sellSalvage: 3, combatUse: { type: 'grenade', damage: 80, radius: 120 } },
  { id: 'incendiary_grenade', name: 'Зажигательная граната', slotCategory: 'quick', rarity: 'uncommon', stackable: true, maxStack: 9, sellSalvage: 4, combatUse: { type: 'grenade', damage: 102, radius: 128 } },
  { id: 'cluster_grenade', name: 'Кассетная граната', slotCategory: 'quick', rarity: 'rare', stackable: true, maxStack: 6, sellSalvage: 6, combatUse: { type: 'grenade', damage: 130, radius: 145 } },
  { id: 'nuclear_grenade', name: 'Супер-ядерная граната', slotCategory: 'quick', rarity: 'legendary', stackable: true, maxStack: 10, sellSalvage: 1, icon: '/assets/items/nuclear_grenade.png', combatUse: { type: 'nuclear', damage: 1250, radius: 620, stunMs: 1800 } },
  { id: 'artillery_beacon', name: 'Маяк артиллерии', slotCategory: 'quick', rarity: 'epic', stackable: true, maxStack: 5, sellSalvage: 10, combatUse: { type: 'artillery', damage: 170, radius: 170, waves: 3 } },
  { id: 'satellite_laser', name: 'Спутниковый лазер', slotCategory: 'quick', rarity: 'legendary', stackable: true, maxStack: 4, sellSalvage: 14, combatUse: { type: 'satellite', damage: 280, radius: 190 } },
  { id: 'stim_pack', name: 'Стим-пак', slotCategory: 'quick', rarity: 'rare', stackable: true, maxStack: 7, sellSalvage: 6, combatUse: { type: 'buff', damageMul: 0.18, fireRateMul: 0.18, durationMs: 12000 } },
  { id: 'adrenaline_shot', name: 'Адреналиновый укол', slotCategory: 'quick', rarity: 'epic', stackable: true, maxStack: 6, sellSalvage: 8, combatUse: { type: 'buff', damageMul: 0.14, fireRateMul: 0.16, moveSpeedMul: 0.12, durationMs: 14000 } },
  { id: 'regen_injector', name: 'Реген-инъектор', slotCategory: 'quick', rarity: 'epic', stackable: true, maxStack: 5, sellSalvage: 9, combatUse: { type: 'regen', hpRegenPerSec: 7.5, durationMs: 10000 } },
  { id: 'shock_mine', name: 'Шок-мина', slotCategory: 'quick', rarity: 'rare', stackable: true, maxStack: 6, sellSalvage: 5, combatUse: { type: 'grenade', damage: 95, radius: 110, stunMs: 900 } },
  { id: 'orbital_marker', name: 'Орбитальный маркер', slotCategory: 'quick', rarity: 'legendary', stackable: true, maxStack: 3, sellSalvage: 16, combatUse: { type: 'satellite', damage: 340, radius: 210, stunMs: 1200 } },
  { id: 'phoenix_kit', name: 'Феникс-комплект', slotCategory: 'quick', rarity: 'legendary', stackable: true, maxStack: 4, sellSalvage: 15, combatUse: { type: 'heal', healFlat: 120 } },
  { id: 'drone_swarm', name: 'Рой дронов', slotCategory: 'quick', rarity: 'epic', stackable: true, maxStack: 5, sellSalvage: 11, combatUse: { type: 'artillery', damage: 210, radius: 155, waves: 4 } },
].map((item) => ({
  ...item,
  icon: item.icon || `/assets/items/${item.id}.webp`,
}));

function makeHeroUniqueSkills(heroId, defs) {
  return defs.map((def) => {
    const id = String(def?.id || '').trim();
    return {
      ...def,
      id,
      heroId,
      sourceHeroId: heroId,
      icon: `/assets/hero-skills/${heroId}_${id}.webp`,
    };
  });
}

function makeHeroTalentTree(defs) {
  return defs.map((def) => {
    const id = String(def?.id || '').trim();
    return {
      ...def,
      id,
      icon: `/assets/hero-talents/${id}.webp`,
    };
  });
}

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
    baseStats: { power: 7, agility: 6, vitality: 7, tech: 9 },
    levelGrowth: { power: 0.045, agility: 0.03, vitality: 0.055, tech: 0.06 },
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
    baseStats: { power: 6, agility: 10, vitality: 5, tech: 7 },
    levelGrowth: { power: 0.038, agility: 0.065, vitality: 0.038, tech: 0.04 },
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
    baseStats: { power: 9, agility: 8, vitality: 5, tech: 6 },
    levelGrowth: { power: 0.06, agility: 0.045, vitality: 0.035, tech: 0.03 },
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
    baseStats: { power: 5, agility: 6, vitality: 10, tech: 8 },
    levelGrowth: { power: 0.03, agility: 0.03, vitality: 0.07, tech: 0.05 },
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
    baseStats: { power: 10, agility: 5, vitality: 9, tech: 4 },
    levelGrowth: { power: 0.07, agility: 0.025, vitality: 0.06, tech: 0.02 },
  },
];

const HERO_UNIQUE_SKILL_DEFS = {
  cyber: makeHeroUniqueSkills('cyber', [
    { id: 'pulse_wave', name: 'Pulse Wave', kind: 'active', castType: 'shockwave', rarity: 'rare', maxLevel: 10, unlockCostShards: 60, upgradeCostShardsBase: 22, upgradeCostShardsStep: 10, cooldownMs: 5200, cooldownMulPerLevel: 0.045, radius: 170, radiusPerLevel: 16, damage: 44, damagePerLevel: 14, desc: 'EMP blast around the hero' },
    { id: 'ion_lance', name: 'Ion Lance', kind: 'active', castType: 'laser_strike', rarity: 'epic', maxLevel: 8, unlockCostShards: 95, upgradeCostShardsBase: 28, upgradeCostShardsStep: 12, cooldownMs: 2400, cooldownMulPerLevel: 0.05, radius: 340, radiusPerLevel: 22, damage: 42, damagePerLevel: 13, targets: 2, targetsPerLevel: 1, desc: 'Fires instant ion beams at nearby targets' },
    { id: 'arc_matrix', name: 'Arc Matrix', kind: 'active', castType: 'chain_lightning', rarity: 'epic', maxLevel: 10, unlockCostShards: 120, upgradeCostShardsBase: 32, upgradeCostShardsStep: 14, cooldownMs: 5600, cooldownMulPerLevel: 0.05, radius: 360, radiusPerLevel: 18, damage: 48, damagePerLevel: 15, targets: 3, targetsPerLevel: 1, desc: 'Releases chained electric discharges' },
    { id: 'seeker_protocol', name: 'Seeker Protocol', kind: 'active', castType: 'homing_missiles', rarity: 'legendary', maxLevel: 7, unlockCostShards: 155, upgradeCostShardsBase: 38, upgradeCostShardsStep: 16, cooldownMs: 7200, cooldownMulPerLevel: 0.05, radius: 1480, radiusPerLevel: 90, damage: 35, damagePerLevel: 12, targets: 4, targetsPerLevel: 1, missileSpeed: 700, missileSpeedPerLevel: 48, turnRate: 6.2, turnRatePerLevel: 0.26, explosionRadius: 62, explosionRadiusPerLevel: 6, lifeMs: 2700, desc: 'Launches autonomous smart rockets' },
    { id: 'adaptive_frame', name: 'Adaptive Frame', kind: 'passive', rarity: 'common', maxLevel: 10, unlockCostShards: 45, upgradeCostShardsBase: 16, upgradeCostShardsStep: 7, maxHpFlatPerLevel: 14, desc: '+max HP and stability' },
    { id: 'combat_firmware', name: 'Combat Firmware', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 70, upgradeCostShardsBase: 20, upgradeCostShardsStep: 9, damageMulPerLevel: 0.038, fireRateMulPerLevel: 0.018, desc: '+damage and fire rate' },
    { id: 'sync_link', name: 'Sync Link', kind: 'passive', rarity: 'epic', maxLevel: 10, unlockCostShards: 110, upgradeCostShardsBase: 24, upgradeCostShardsStep: 10, globalAura: true, globalDamageMulPerLevel: 0.02, globalFireRateMulPerLevel: 0.012, desc: 'Boosts every other hero in the roster' },
    { id: 'cache_goblin', name: 'Cache Goblin', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 78, upgradeCostShardsBase: 22, upgradeCostShardsStep: 9, reloadSpeedMulPerLevel: 0.028, pickupRadiusPerLevel: 6, desc: 'Hidden cache goblins keep stuffing mags and loot into your hands' },
  ]),
  scout: makeHeroUniqueSkills('scout', [
    { id: 'razor_wind', name: 'Razor Wind', kind: 'active', castType: 'blade_orbit', rarity: 'rare', maxLevel: 10, unlockCostShards: 60, upgradeCostShardsBase: 22, upgradeCostShardsStep: 10, cooldownMs: 1300, cooldownMulPerLevel: 0.04, radius: 340, radiusPerLevel: 20, damage: 25, damagePerLevel: 8, targets: 3, targetsPerLevel: 1, desc: 'Rapid slices through the nearest enemies' },
    { id: 'hunter_mark', name: 'Hunter Mark', kind: 'active', castType: 'laser_strike', rarity: 'rare', maxLevel: 9, unlockCostShards: 92, upgradeCostShardsBase: 28, upgradeCostShardsStep: 11, cooldownMs: 2100, cooldownMulPerLevel: 0.045, radius: 390, radiusPerLevel: 24, damage: 36, damagePerLevel: 11, targets: 2, targetsPerLevel: 1, desc: 'Targets and instantly pierces enemies' },
    { id: 'storm_net', name: 'Storm Net', kind: 'active', castType: 'chain_lightning', rarity: 'epic', maxLevel: 8, unlockCostShards: 118, upgradeCostShardsBase: 31, upgradeCostShardsStep: 13, cooldownMs: 5000, cooldownMulPerLevel: 0.048, radius: 380, radiusPerLevel: 20, damage: 43, damagePerLevel: 13, targets: 4, targetsPerLevel: 1, desc: 'Electrified chain burst for clustered packs' },
    { id: 'sky_chasers', name: 'Sky Chasers', kind: 'active', castType: 'homing_missiles', rarity: 'legendary', maxLevel: 7, unlockCostShards: 150, upgradeCostShardsBase: 37, upgradeCostShardsStep: 15, cooldownMs: 6800, cooldownMulPerLevel: 0.05, radius: 1600, radiusPerLevel: 100, damage: 32, damagePerLevel: 10, targets: 5, targetsPerLevel: 1, missileSpeed: 760, missileSpeedPerLevel: 50, turnRate: 6.8, turnRatePerLevel: 0.28, explosionRadius: 54, explosionRadiusPerLevel: 5, lifeMs: 2500, desc: 'Fast pursuit missiles for distant prey' },
    { id: 'long_stride', name: 'Long Stride', kind: 'passive', rarity: 'common', maxLevel: 10, unlockCostShards: 48, upgradeCostShardsBase: 17, upgradeCostShardsStep: 7, moveSpeedMulPerLevel: 0.028, desc: '+movement speed' },
    { id: 'vital_sight', name: 'Vital Sight', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 76, upgradeCostShardsBase: 21, upgradeCostShardsStep: 9, fireRateMulPerLevel: 0.025, damageMulPerLevel: 0.02, desc: '+precision and fire rhythm' },
    { id: 'trailblazer', name: 'Trailblazer', kind: 'passive', rarity: 'epic', maxLevel: 10, unlockCostShards: 112, upgradeCostShardsBase: 24, upgradeCostShardsStep: 10, globalAura: true, globalMoveSpeedMulPerLevel: 0.018, globalPickupRadiusPerLevel: 8, desc: 'Gives every other hero mobility and reach' },
    { id: 'energy_drink_iv', name: 'Energy Drink IV', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 82, upgradeCostShardsBase: 22, upgradeCostShardsStep: 9, moveSpeedMulPerLevel: 0.02, reloadSpeedMulPerLevel: 0.032, desc: 'Runs faster and reloads like there is caffeine in the bloodstream' },
  ]),
  shadow: makeHeroUniqueSkills('shadow', [
    { id: 'void_burst', name: 'Void Burst', kind: 'active', castType: 'psi_blast', rarity: 'epic', maxLevel: 8, unlockCostShards: 68, upgradeCostShardsBase: 24, upgradeCostShardsStep: 11, cooldownMs: 7600, cooldownMulPerLevel: 0.05, radius: 230, radiusPerLevel: 18, damage: 56, damagePerLevel: 16, knockbackMul: 8.8, stunMs: 170, desc: 'Dark pulse that stuns and hurls enemies away' },
    { id: 'night_fangs', name: 'Night Fangs', kind: 'active', castType: 'blade_orbit', rarity: 'rare', maxLevel: 10, unlockCostShards: 96, upgradeCostShardsBase: 29, upgradeCostShardsStep: 12, cooldownMs: 1200, cooldownMulPerLevel: 0.045, radius: 330, radiusPerLevel: 18, damage: 29, damagePerLevel: 9, targets: 3, targetsPerLevel: 1, desc: 'Shadow blades tear into nearby targets' },
    { id: 'eclipse_chain', name: 'Eclipse Chain', kind: 'active', castType: 'chain_lightning', rarity: 'epic', maxLevel: 8, unlockCostShards: 122, upgradeCostShardsBase: 33, upgradeCostShardsStep: 14, cooldownMs: 5200, cooldownMulPerLevel: 0.05, radius: 350, radiusPerLevel: 18, damage: 50, damagePerLevel: 15, targets: 3, targetsPerLevel: 1, desc: 'Dark chain strike for burst assassinations' },
    { id: 'black_comets', name: 'Black Comets', kind: 'active', castType: 'homing_missiles', rarity: 'legendary', maxLevel: 7, unlockCostShards: 158, upgradeCostShardsBase: 39, upgradeCostShardsStep: 16, cooldownMs: 6900, cooldownMulPerLevel: 0.05, radius: 1540, radiusPerLevel: 85, damage: 38, damagePerLevel: 13, targets: 4, targetsPerLevel: 1, missileSpeed: 720, missileSpeedPerLevel: 52, turnRate: 6.4, turnRatePerLevel: 0.28, explosionRadius: 58, explosionRadiusPerLevel: 5, lifeMs: 2600, desc: 'Explosive shadow missiles lock on silently' },
    { id: 'assassin_instinct', name: 'Assassin Instinct', kind: 'passive', rarity: 'common', maxLevel: 10, unlockCostShards: 52, upgradeCostShardsBase: 18, upgradeCostShardsStep: 8, damageMulPerLevel: 0.045, desc: '+damage' },
    { id: 'ghost_step', name: 'Ghost Step', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 80, upgradeCostShardsBase: 22, upgradeCostShardsStep: 9, moveSpeedMulPerLevel: 0.02, fireRateMulPerLevel: 0.016, desc: '+speed and evasiveness' },
    { id: 'umbral_doctrine', name: 'Umbral Doctrine', kind: 'passive', rarity: 'epic', maxLevel: 10, unlockCostShards: 118, upgradeCostShardsBase: 25, upgradeCostShardsStep: 10, globalAura: true, globalDamageMulPerLevel: 0.024, desc: 'Increases the lethality of every other hero' },
    { id: 'action_reload', name: 'Action Reload', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 86, upgradeCostShardsBase: 23, upgradeCostShardsStep: 9, damageMulPerLevel: 0.022, reloadSpeedMulPerLevel: 0.03, desc: 'Every reload is performed like the finale of an action movie' },
  ]),
  medic: makeHeroUniqueSkills('medic', [
    { id: 'sterile_wave', name: 'Sterile Wave', kind: 'active', castType: 'shockwave', rarity: 'rare', maxLevel: 9, unlockCostShards: 64, upgradeCostShardsBase: 23, upgradeCostShardsStep: 10, cooldownMs: 5000, cooldownMulPerLevel: 0.045, radius: 180, radiusPerLevel: 16, damage: 37, damagePerLevel: 12, desc: 'Medical shock pulse that clears space' },
    { id: 'triage_beam', name: 'Triage Beam', kind: 'active', castType: 'laser_strike', rarity: 'rare', maxLevel: 9, unlockCostShards: 92, upgradeCostShardsBase: 28, upgradeCostShardsStep: 11, cooldownMs: 2350, cooldownMulPerLevel: 0.045, radius: 320, radiusPerLevel: 20, damage: 39, damagePerLevel: 12, targets: 2, targetsPerLevel: 1, desc: 'Focused combat beam for emergency eliminations' },
    { id: 'toxin_arc', name: 'Toxin Arc', kind: 'active', castType: 'chain_lightning', rarity: 'epic', maxLevel: 8, unlockCostShards: 121, upgradeCostShardsBase: 32, upgradeCostShardsStep: 13, cooldownMs: 5400, cooldownMulPerLevel: 0.048, radius: 370, radiusPerLevel: 20, damage: 45, damagePerLevel: 13, targets: 4, targetsPerLevel: 1, desc: 'Contagious bio-electric chain discharge' },
    { id: 'rescue_rockets', name: 'Rescue Rockets', kind: 'active', castType: 'homing_missiles', rarity: 'legendary', maxLevel: 7, unlockCostShards: 154, upgradeCostShardsBase: 38, upgradeCostShardsStep: 15, cooldownMs: 7100, cooldownMulPerLevel: 0.05, radius: 1500, radiusPerLevel: 80, damage: 34, damagePerLevel: 11, targets: 4, targetsPerLevel: 1, missileSpeed: 690, missileSpeedPerLevel: 44, turnRate: 6.0, turnRatePerLevel: 0.24, explosionRadius: 60, explosionRadiusPerLevel: 5, lifeMs: 2650, desc: 'Support rockets that hunt priority threats' },
    { id: 'field_aid', name: 'Field Aid', kind: 'passive', rarity: 'common', maxLevel: 10, unlockCostShards: 50, upgradeCostShardsBase: 17, upgradeCostShardsStep: 8, hpRegenPerSecPerLevel: 0.42, desc: '+HP regen' },
    { id: 'vital_plating', name: 'Vital Plating', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 78, upgradeCostShardsBase: 21, upgradeCostShardsStep: 9, maxHpFlatPerLevel: 16, desc: '+max HP' },
    { id: 'support_protocol', name: 'Support Protocol', kind: 'passive', rarity: 'epic', maxLevel: 10, unlockCostShards: 114, upgradeCostShardsBase: 24, upgradeCostShardsStep: 10, globalAura: true, globalMaxHpFlatPerLevel: 8, globalHpRegenPerSecPerLevel: 0.16, desc: 'Improves survivability of every other hero' },
    { id: 'oops_all_bandages', name: 'Oops, All Bandages', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 82, upgradeCostShardsBase: 22, upgradeCostShardsStep: 9, hpRegenPerSecPerLevel: 0.22, reloadSpeedMulPerLevel: 0.026, desc: 'No one knows why the pockets are full of bandages, but it works' },
  ]),
  raider: makeHeroUniqueSkills('raider', [
    { id: 'war_stomp', name: 'War Stomp', kind: 'active', castType: 'shockwave', rarity: 'rare', maxLevel: 10, unlockCostShards: 66, upgradeCostShardsBase: 24, upgradeCostShardsStep: 10, cooldownMs: 4800, cooldownMulPerLevel: 0.045, radius: 185, radiusPerLevel: 18, damage: 49, damagePerLevel: 15, desc: 'Brutal ground smash around the raider' },
    { id: 'shrapnel_burst', name: 'Shrapnel Burst', kind: 'active', castType: 'laser_strike', rarity: 'rare', maxLevel: 9, unlockCostShards: 98, upgradeCostShardsBase: 29, upgradeCostShardsStep: 12, cooldownMs: 2300, cooldownMulPerLevel: 0.045, radius: 300, radiusPerLevel: 18, damage: 46, damagePerLevel: 14, targets: 2, targetsPerLevel: 1, desc: 'Wide kill burst on the closest targets' },
    { id: 'berserk_arc', name: 'Berserk Arc', kind: 'active', castType: 'chain_lightning', rarity: 'epic', maxLevel: 8, unlockCostShards: 124, upgradeCostShardsBase: 33, upgradeCostShardsStep: 14, cooldownMs: 5200, cooldownMulPerLevel: 0.05, radius: 340, radiusPerLevel: 18, damage: 52, damagePerLevel: 16, targets: 3, targetsPerLevel: 1, desc: 'Violent chain strike for close engagements' },
    { id: 'siege_barrage', name: 'Siege Barrage', kind: 'active', castType: 'homing_missiles', rarity: 'legendary', maxLevel: 7, unlockCostShards: 162, upgradeCostShardsBase: 40, upgradeCostShardsStep: 16, cooldownMs: 7000, cooldownMulPerLevel: 0.05, radius: 1460, radiusPerLevel: 82, damage: 40, damagePerLevel: 13, targets: 4, targetsPerLevel: 1, missileSpeed: 660, missileSpeedPerLevel: 42, turnRate: 5.8, turnRatePerLevel: 0.22, explosionRadius: 68, explosionRadiusPerLevel: 6, lifeMs: 2750, desc: 'Heavy rockets for smashing elite targets' },
    { id: 'battle_rage', name: 'Battle Rage', kind: 'passive', rarity: 'common', maxLevel: 10, unlockCostShards: 54, upgradeCostShardsBase: 18, upgradeCostShardsStep: 8, damageMulPerLevel: 0.04, desc: '+damage' },
    { id: 'iron_hide', name: 'Iron Hide', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 84, upgradeCostShardsBase: 23, upgradeCostShardsStep: 9, maxHpFlatPerLevel: 18, moveSpeedMulPerLevel: 0.01, desc: '+max HP and unstoppable momentum' },
    { id: 'war_banner', name: 'War Banner', kind: 'passive', rarity: 'epic', maxLevel: 10, unlockCostShards: 120, upgradeCostShardsBase: 25, upgradeCostShardsStep: 10, globalAura: true, globalDamageMulPerLevel: 0.016, globalFireRateMulPerLevel: 0.016, desc: 'Empowers the offense of every other hero' },
    { id: 'anger_management', name: 'Anger Management', kind: 'passive', rarity: 'rare', maxLevel: 10, unlockCostShards: 88, upgradeCostShardsBase: 23, upgradeCostShardsStep: 9, damageMulPerLevel: 0.028, reloadSpeedMulPerLevel: 0.032, maxHpFlatPerLevel: 6, desc: 'Slamming a fresh mag home counts as therapy if you are loud enough' },
  ]),
};

const HERO_SKILL_TREE_DEFS = {
  cyber: makeHeroTalentTree([
    { id: 'cyber_overclock', name: 'Overclock', desc: '+fire rate', maxLevel: 5, cost: 1, fireRateMulPerLevel: 0.03 },
    { id: 'cyber_nano_core', name: 'Nano Core', desc: '+damage', maxLevel: 5, cost: 1, damageMulPerLevel: 0.03 },
    { id: 'cyber_barrier', name: 'Barrier Matrix', desc: '+max HP', maxLevel: 5, cost: 1, maxHpFlatPerLevel: 8 },
    { id: 'cyber_magnet', name: 'Mag Sweep', desc: '+pickup radius', maxLevel: 5, cost: 1, pickupRadiusPerLevel: 6 },
  ]),
  scout: makeHeroTalentTree([
    { id: 'scout_stride', name: 'Long Stride', desc: '+move speed', maxLevel: 5, cost: 1, moveSpeedMulPerLevel: 0.04 },
    { id: 'scout_reload', name: 'Quick Hands', desc: '+fire rate', maxLevel: 5, cost: 1, fireRateMulPerLevel: 0.025 },
    { id: 'scout_dodge', name: 'Evasive Roll', desc: '+dodge charge', maxLevel: 2, cost: 1, extraDodgeChargesPerLevel: 1 },
    { id: 'scout_shots', name: 'Steady Burst', desc: '+damage', maxLevel: 4, cost: 1, damageMulPerLevel: 0.025 },
  ]),
  shadow: makeHeroTalentTree([
    { id: 'shadow_killer', name: 'Killer Instinct', desc: '+damage', maxLevel: 6, cost: 1, damageMulPerLevel: 0.035 },
    { id: 'shadow_haste', name: 'Dark Tempo', desc: '+fire rate', maxLevel: 4, cost: 1, fireRateMulPerLevel: 0.03 },
    { id: 'shadow_blink', name: 'Blink Step', desc: '+move speed', maxLevel: 4, cost: 1, moveSpeedMulPerLevel: 0.03 },
    { id: 'shadow_sting', name: 'Venom Edge', desc: '+damage +speed', maxLevel: 3, cost: 1, damageMulPerLevel: 0.02, moveSpeedMulPerLevel: 0.02 },
  ]),
  medic: makeHeroTalentTree([
    { id: 'medic_aid', name: 'Field Aid', desc: '+regen', maxLevel: 5, cost: 1, hpRegenPerSecPerLevel: 0.42 },
    { id: 'medic_plating', name: 'Vital Plating', desc: '+max HP', maxLevel: 6, cost: 1, maxHpFlatPerLevel: 10 },
    { id: 'medic_focus', name: 'Combat Focus', desc: '+damage', maxLevel: 4, cost: 1, damageMulPerLevel: 0.025 },
    { id: 'medic_aura', name: 'Recovery Aura', desc: '+pickup radius', maxLevel: 4, cost: 1, pickupRadiusPerLevel: 7 },
  ]),
  raider: makeHeroTalentTree([
    { id: 'raider_rage', name: 'Battle Rage', desc: '+damage', maxLevel: 6, cost: 1, damageMulPerLevel: 0.035 },
    { id: 'raider_armor', name: 'Iron Skin', desc: '+max HP', maxLevel: 6, cost: 1, maxHpFlatPerLevel: 11 },
    { id: 'raider_push', name: 'Relentless Push', desc: '+move speed', maxLevel: 4, cost: 1, moveSpeedMulPerLevel: 0.025 },
    { id: 'raider_charge', name: 'War Charge', desc: '+dodge charge', maxLevel: 2, cost: 1, extraDodgeChargesPerLevel: 1 },
  ]),
};

module.exports = {
  MAIN_LOOP_RATE,
  MAIN_LOOP_MS,
  MAX_PLAYERS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAP_DEFS,
  CAMPAIGN_DEFS,
  PLAYER_RADIUS,
  ENEMY_RADIUS,
  BULLET_RADIUS,
  DROP_RADIUS,
  PLAYER_SPEED,
  PLAYER_MOVE_SPEED_GLOBAL_MUL,
  PLAYER_HP_MAX,
  PLAYER_DODGE_DISTANCE,
  PLAYER_DODGE_COOLDOWN_MS,
  PLAYER_DODGE_MAX_CHARGES,
  PLAYER_DODGE_INVULN_MS,
  PLAYER_RESPAWN_MODE,
  PLAYER_RESPAWN_DELAY_MS,
  PLAYER_RESPAWN_EXTRA_LIVES,
  PLAYER_RESPAWN_START_TOKENS,
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
  ENEMY_HIT_STUN_MS,
  ENEMY_HIT_KNOCKBACK_SPEED,
  ENEMY_HIT_KNOCKBACK_FRICTION,
  ENEMY_SKILL_KNOCKBACK_BONUS,
  ENEMY_KNOCKBACK_BOSS_RESIST,
  ENEMY_KNOCKBACK_CHARGER_RESIST,
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
  WORLD_CONTENT_PATH,
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
  ITEM_SALVAGE_START,
  ITEM_SLOT_DEFS,
  ITEM_DEFS,
  HERO_DEFS,
  HERO_LEVEL_CAP,
  HERO_XP_BASE,
  HERO_XP_PER_LEVEL,
  HERO_XP_QUAD,
  HERO_UNIQUE_SKILL_DEFS,
  HERO_SKILL_TREE_DEFS,
};
