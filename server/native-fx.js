'use strict';

const ACTIVE_FX_PRESETS = {
  shockwave: {
    style: 'shockwave',
    primary: '#86efac',
    secondary: '#dcfce7',
    accent: '#bbf7d0',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Shockwave_GroundPulse',
    gameplayCue: 'GameplayCue.Crimson.Skill.Shockwave',
    spawnMode: 'radial_floor',
    attachTo: 'caster_root',
    cameraShake: 'CW_ShockwaveKick',
    decal: 'M_Scorch_Radial_Crack',
    layers: ['expanding_energy_ring', 'ground_crack_decal', 'dust_wall', 'outward_sparks'],
  },
  psi_blast: {
    style: 'psi_blast',
    primary: '#60a5fa',
    secondary: '#93c5fd',
    accent: '#c084fc',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_PsiBlast_RefractiveNova',
    gameplayCue: 'GameplayCue.Crimson.Skill.PsiBlast',
    spawnMode: 'radial_airburst',
    attachTo: 'caster_core',
    cameraShake: 'CW_PsiBlastSnap',
    decal: 'M_Psi_Ripple_Decal',
    layers: ['refractive_sphere', 'inner_ring_stack', 'violet_tendrils', 'enemy_push_streaks'],
  },
  blade_orbit: {
    style: 'blade_orbit',
    primary: '#fde68a',
    secondary: '#fca5a5',
    accent: '#fb7185',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_BladeOrbit_RibbonCuts',
    gameplayCue: 'GameplayCue.Crimson.Skill.BladeOrbit',
    spawnMode: 'orbiting_caster',
    attachTo: 'caster_root',
    cameraShake: 'CW_LightSlash',
    decal: 'M_Slash_Dust_Decal',
    layers: ['orbiting_blade_ribbons', 'slash_afterimages', 'hit_spark_fans', 'micro_dust_cuts'],
  },
  chain_lightning: {
    style: 'chain_lightning',
    primary: '#67e8f9',
    secondary: '#bfdbfe',
    accent: '#22d3ee',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_ChainLightning_BranchingArcs',
    gameplayCue: 'GameplayCue.Crimson.Skill.ChainLightning',
    spawnMode: 'caster_to_targets',
    attachTo: 'caster_hand',
    cameraShake: 'CW_ElectricTick',
    decal: 'M_Electric_Scorch_Decal',
    layers: ['branching_beams', 'target_contact_sparks', 'blue_white_core', 'short_lived_afterglow'],
  },
  laser_strike: {
    style: 'laser_strike',
    primary: '#f472b6',
    secondary: '#f9a8d4',
    accent: '#fdf2f8',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_LaserStrike_IonLances',
    gameplayCue: 'GameplayCue.Crimson.Skill.LaserStrike',
    spawnMode: 'caster_to_targets',
    attachTo: 'caster_weapon',
    cameraShake: 'CW_LaserPin',
    decal: 'M_Ion_Burn_Decal',
    layers: ['instant_beam_lances', 'target_reticle_flash', 'impact_flare', 'thin_pink_afterline'],
  },
  homing_missiles: {
    style: 'skill_burst',
    primary: '#fb923c',
    secondary: '#fed7aa',
    accent: '#fde047',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_GenericSkill_Burst',
    gameplayCue: 'GameplayCue.Crimson.Skill.Generic',
    spawnMode: 'caster_burst',
    attachTo: 'caster_backpack',
    cameraShake: 'CW_RocketSalvo',
    decal: 'M_Rocket_Soot_Decal',
    layers: ['muzzle_pop_cluster', 'backpack_flash', 'short_smoke_puffs'],
  },
  default: {
    style: 'skill_burst',
    primary: '#a5b4fc',
    secondary: '#c4b5fd',
    accent: '#f8fafc',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_GenericSkill_Burst',
    gameplayCue: 'GameplayCue.Crimson.Skill.Generic',
    spawnMode: 'caster_burst',
    attachTo: 'caster_root',
    cameraShake: 'CW_SkillPulse',
    decal: 'M_Energy_Pulse_Decal',
    layers: ['soft_ring', 'small_sparks', 'caster_flash'],
  },
};

const HERO_FX_THEMES = {
  cyber: { primary: '#67e8f9', secondary: '#22d3ee', accent: '#f0f9ff', material: 'MI_FX_Cyber_Cyan' },
  scout: { primary: '#a7e7c5', secondary: '#86efac', accent: '#fef08a', material: 'MI_FX_Scout_Mint' },
  shadow: { primary: '#c084fc', secondary: '#8b5cf6', accent: '#f0abfc', material: 'MI_FX_Shadow_Violet' },
  medic: { primary: '#fb7185', secondary: '#86efac', accent: '#ffe4e6', material: 'MI_FX_Medic_RoseGreen' },
  raider: { primary: '#fb923c', secondary: '#facc15', accent: '#fee2e2', material: 'MI_FX_Raider_Ember' },
};

const PASSIVE_FX_PRESETS = {
  shield: {
    style: 'force_shield',
    primary: '#93c5fd',
    secondary: '#bfdbfe',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_ShieldReactive',
    gameplayCue: 'GameplayCue.Crimson.Passive.Shield',
    trigger: 'shield_hit_or_recharge',
    layers: ['hex_barrier_flash', 'surface_ripple', 'blue_sparks'],
  },
  dodge: {
    style: 'dodge_wind',
    primary: '#bfdbfe',
    secondary: '#e0f2fe',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_DodgeAfterimage',
    gameplayCue: 'GameplayCue.Crimson.Passive.Dodge',
    trigger: 'dodge_start_end',
    layers: ['wind_streaks', 'foot_dust', 'brief_afterimage'],
  },
  companion: {
    style: 'companion_spawn',
    primary: '#f8fafc',
    secondary: '#93c5fd',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_CompanionSpawn',
    gameplayCue: 'GameplayCue.Crimson.Passive.Companion',
    trigger: 'companion_spawn_and_fire',
    layers: ['spawn_ring', 'tiny_thrusters', 'muzzle_sync'],
  },
  bullet_homing: {
    style: 'bullet_guidance',
    primary: '#67e8f9',
    secondary: '#fef08a',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_BulletGuidance',
    gameplayCue: 'GameplayCue.Crimson.Passive.BulletGuidance',
    trigger: 'homing_bullet_turn',
    layers: ['thin_guidance_trail', 'target_pin_glint'],
  },
  bullet_pierce: {
    style: 'piercing_rounds',
    primary: '#fca5a5',
    secondary: '#fde68a',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_PiercingRounds',
    gameplayCue: 'GameplayCue.Crimson.Passive.Pierce',
    trigger: 'bullet_spawn_or_pierce',
    layers: ['hard_tracer_core', 'impact_splinters'],
  },
  regen: {
    style: 'regen_aura',
    primary: '#86efac',
    secondary: '#bbf7d0',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_RegenAura',
    gameplayCue: 'GameplayCue.Crimson.Passive.Regen',
    trigger: 'periodic_health_tick',
    layers: ['soft_cross_motes', 'green_ring_breath'],
  },
  speed: {
    style: 'speed_wind',
    primary: '#a7e7c5',
    secondary: '#fef08a',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_SpeedWake',
    gameplayCue: 'GameplayCue.Crimson.Passive.Speed',
    trigger: 'movement_loop',
    layers: ['low_wind_streaks', 'heel_sparks'],
  },
  combat: {
    style: 'combat_aura',
    primary: '#fca5a5',
    secondary: '#fde68a',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_CombatAura',
    gameplayCue: 'GameplayCue.Crimson.Passive.CombatAura',
    trigger: 'damage_or_reload_loop',
    layers: ['weapon_heat_glow', 'short_power_pulses'],
  },
  armor: {
    style: 'armor_pulse',
    primary: '#cbd5e1',
    secondary: '#f8fafc',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_ArmorPulse',
    gameplayCue: 'GameplayCue.Crimson.Passive.Armor',
    trigger: 'spawn_or_level_change',
    layers: ['plate_glint', 'heavy_step_dust'],
  },
  support: {
    style: 'roster_aura',
    primary: '#c4b5fd',
    secondary: '#bfdbfe',
    niagaraSystem: '/Game/CrimsonWars/FX/Skills/NS_Passive_RosterAura',
    gameplayCue: 'GameplayCue.Crimson.Passive.RosterAura',
    trigger: 'team_buff_loop',
    layers: ['subtle_roster_rune', 'ally_link_threads'],
  },
};

const WORLD_FX_PRESETS = {
  xp_crystal: {
    key: 'world.xp_crystal',
    style: 'cyan_xp_shard',
    primary: '#67e8f9',
    secondary: '#cffafe',
    accent: '#f8fafc',
    niagaraSystem: '/Game/CrimsonWars/FX/Pickups/NS_XPShard_CyanHover',
    gameplayCue: 'GameplayCue.Crimson.Pickup.XPShard',
    spawnMode: 'pickup_hover',
    attachTo: 'world',
    materialPreset: 'MI_FX_XPShard_Cyan',
    cameraShake: '',
    mesh: '/Game/CrimsonWars/Pickups/SM_XPShard_Faceted',
    trigger: 'xp_orb_spawn_and_pull',
    layers: ['faceted_cyan_core', 'thin_orbit_ring', 'small_floor_glow', 'pickup_sparkle'],
  },
  xp_vacuum: {
    key: 'world.xp_vacuum',
    style: 'violet_singularity_crystal',
    primary: '#a855f7',
    secondary: '#67e8f9',
    accent: '#f5d0fe',
    niagaraSystem: '/Game/CrimsonWars/FX/Pickups/NS_XPVacuum_VioletSingularity',
    gameplayCue: 'GameplayCue.Crimson.Pickup.XPVacuum',
    spawnMode: 'pickup_hover',
    attachTo: 'world',
    materialPreset: 'MI_FX_XPVacuum_VioletCrystal',
    cameraShake: 'CW_XPVacuumPulse',
    mesh: '/Game/CrimsonWars/Pickups/SM_XPVacuum_Crystal',
    trigger: 'drop_spawn_until_pickup',
    layers: ['faceted_violet_core', 'rotating_rune_rings', 'crystal_shards_orbit', 'cyan_xp_tethers', 'gravity_lens'],
  },
  xp_surge_pull: {
    key: 'world.xp_surge_pull',
    style: 'xp_singularity_pull',
    primary: '#c084fc',
    secondary: '#67e8f9',
    accent: '#fef08a',
    niagaraSystem: '/Game/CrimsonWars/FX/Pickups/NS_XPSurge_GlobalPull',
    gameplayCue: 'GameplayCue.Crimson.Pickup.XPSurgePull',
    spawnMode: 'attach_to_player_then_world_tethers',
    attachTo: 'player_core',
    materialPreset: 'MI_FX_XPSurge_Tethers',
    cameraShake: 'CW_XPSurgeWhoosh',
    mesh: '',
    trigger: 'server_worldFx_event',
    layers: ['player_violet_core_pulse', 'global_cyan_tethers', 'orb_speed_streaks', 'soft_screen_pull_ripple'],
  },
};

const PROJECTILE_FX_PRESETS = {
  bullet: {
    key: 'projectile.bullet',
    style: 'hot_tracer',
    primary: '#f59e0b',
    secondary: '#fde68a',
    accent: '#ffffff',
    niagaraSystem: '/Game/CrimsonWars/FX/Projectiles/NS_Bullet_HotTracer',
    gameplayCue: 'GameplayCue.Crimson.Projectile.Bullet',
    spawnMode: 'projectile_loop',
    attachTo: 'projectile',
    materialPreset: 'MI_FX_BulletTracer',
    cameraShake: '',
    mesh: '/Game/CrimsonWars/Projectiles/SM_BulletTracer',
    trigger: 'bullet_state',
    layers: ['hot_core_tracer', 'thin_afterline', 'impact_sparks'],
  },
  rocket: {
    key: 'projectile.rocket',
    style: 'smart_rocket',
    primary: '#fb923c',
    secondary: '#fde047',
    accent: '#f8fafc',
    niagaraSystem: '/Game/CrimsonWars/FX/Projectiles/NS_Rocket_SmartTrail',
    gameplayCue: 'GameplayCue.Crimson.Projectile.Rocket',
    spawnMode: 'projectile_loop_with_impact',
    attachTo: 'projectile',
    materialPreset: 'MI_FX_Rocket_EmberCore',
    cameraShake: 'CW_RocketImpact',
    mesh: '/Game/CrimsonWars/Projectiles/SM_Rocket_Smart',
    trigger: 'rocket_bullet_state_and_removed_explosion',
    engineFlame: {
      style: 'short_nozzle_flame',
      socket: 'Nozzle',
      length: 10,
      width: 4.5,
      lengthScale: 0.38,
      widthScale: 0.55,
      alpha: 0.78,
    },
    rotationSmoothing: {
      enabled: true,
      target: 'velocity_angle',
      mode: 'exponential_shortest_arc',
      interpSpeed: 14,
      maxTurnDegPerSec: 540,
      resetDistance: 96,
    },
    impactExplosion: {
      renderMode: 'radial_soft_billboards',
      niagaraSystem: '/Game/CrimsonWars/FX/Projectiles/NS_Rocket_Impact_RadialSoft',
      materialPreset: 'MI_FX_RocketExplosion_RadialSoft_Additive',
      spriteSource: 'single_radial_gradient',
      facingMode: 'camera_facing',
      sortMode: 'view_depth',
      blendMode: 'additive_soft',
      durationMs: 420,
      coreRadius: 34,
      outerRadius: 92,
      spriteCount: 9,
      verticalJitter: 0.18,
      horizontalJitter: 0.28,
      surfaceMaterialMode: 'terrain_zone_or_object_impact_material',
      fireball: {
        style: 'layered_fireball',
        hotCoreColor: '#fff1a8',
        midColor: '#fb923c',
        outerColor: '#ef3b12',
        verticalLift: 0.35,
      },
      scorch: {
        durationMs: 6400,
        asphaltColor: '#050607',
        dirtColor: '#1f1007',
        grassColor: '#051106',
        concreteColor: '#111315',
      },
      surfaceDebris: {
        enabled: true,
        countBase: 24,
        countAsphalt: 30,
        countDirt: 28,
        asphalt: ['dark_flat_chunks', 'gray_dust', 'tar_scorch'],
        dirt: ['brown_clods', 'soil_dust', 'loose_pebbles'],
        grass: ['earth_clods', 'green_sod_chunks', 'leaf_dust'],
        concrete: ['pale_gravel', 'concrete_dust', 'radial_cracks'],
        metal: ['bright_sparks', 'cool_gray_shards', 'smoke'],
      },
      avoidTextureAtlases: true,
      disableFlipbook: true,
      disableSubUv: true,
      disableRibbonRenderer: true,
      disableTiledSpriteSheets: true,
      removeHorizontalBanding: true,
    },
    layers: ['bright_engine_flame', 'curved_smoke_ribbon', 'ember_sparks', 'warhead_glint', 'impact_fireball', 'surface_specific_debris', 'ground_scorch_decal'],
  },
};

const MELEE_STYLE_FX_PRESETS = {
  sword: {
    style: 'sword',
    primary: '#e5e7eb',
    secondary: '#fca5a5',
    accent: '#ffffff',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_SwordCleanArc',
    gameplayCue: 'GameplayCue.Crimson.Melee.Sword',
    materialPreset: 'MI_FX_Melee_SwordArc',
    cameraShake: 'CW_MeleeLight',
    layers: ['clean_white_arc', 'thin_red_edge', 'hit_spark_fan', 'fast_afterimage'],
  },
  chainsaw: {
    style: 'chainsaw',
    primary: '#fb923c',
    secondary: '#fde68a',
    accent: '#ef4444',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_ChainsawTeeth',
    gameplayCue: 'GameplayCue.Crimson.Melee.Chainsaw',
    materialPreset: 'MI_FX_Melee_ChainsawHeat',
    cameraShake: 'CW_MeleeSawBuzz',
    layers: ['tooth_tick_marks', 'orange_heat_arc', 'metal_sparks', 'short_saw_smoke'],
  },
  hammer: {
    style: 'hammer',
    primary: '#facc15',
    secondary: '#94a3b8',
    accent: '#f8fafc',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_HammerGroundCrack',
    gameplayCue: 'GameplayCue.Crimson.Melee.Hammer',
    materialPreset: 'MI_FX_Melee_HammerShock',
    cameraShake: 'CW_MeleeHeavySlam',
    layers: ['heavy_impact_ring', 'ground_cracks', 'dust_plume', 'yellow_core_flash'],
  },
  bat: {
    style: 'bat',
    primary: '#f59e0b',
    secondary: '#fed7aa',
    accent: '#ffffff',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_BatHomeRun',
    gameplayCue: 'GameplayCue.Crimson.Melee.Bat',
    materialPreset: 'MI_FX_Melee_BatStreak',
    cameraShake: 'CW_MeleeBatHit',
    layers: ['wide_impact_sweep', 'knockback_speed_lines', 'wood_chip_sparks'],
  },
  glaive: {
    style: 'glaive',
    primary: '#22d3ee',
    secondary: '#a78bfa',
    accent: '#f8fafc',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_PlasmaGlaiveRicochet',
    gameplayCue: 'GameplayCue.Crimson.Melee.Glaive',
    materialPreset: 'MI_FX_Melee_PlasmaGlaive',
    cameraShake: 'CW_MeleePlasmaSlice',
    layers: ['cyan_plasma_arc', 'violet_edge_echo', 'chain_target_bolt', 'burning_afterline'],
  },
  baton: {
    style: 'baton',
    primary: '#67e8f9',
    secondary: '#f8fafc',
    accent: '#bfdbfe',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_ShockBatonArc',
    gameplayCue: 'GameplayCue.Crimson.Melee.Baton',
    materialPreset: 'MI_FX_Melee_ShockBaton',
    cameraShake: 'CW_MeleeElectricTick',
    layers: ['compact_blue_arc', 'electric_contact_sparks', 'stun_ring', 'small_ozone_flash'],
  },
  whip: {
    style: 'whip',
    primary: '#f0abfc',
    secondary: '#f8fafc',
    accent: '#c084fc',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_MonowireWhip',
    gameplayCue: 'GameplayCue.Crimson.Melee.Whip',
    materialPreset: 'MI_FX_Melee_Monowire',
    cameraShake: 'CW_MeleeWireSnap',
    layers: ['thin_laser_wire_curve', 'snap_point_flash', 'purple_cut_afterimage'],
  },
  cryo: {
    style: 'cryo',
    primary: '#93c5fd',
    secondary: '#cffafe',
    accent: '#ffffff',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_CryoAxeShatter',
    gameplayCue: 'GameplayCue.Crimson.Melee.CryoAxe',
    materialPreset: 'MI_FX_Melee_Cryo',
    cameraShake: 'CW_MeleeIceCrack',
    layers: ['ice_blue_cleave', 'snow_motes', 'crystal_shards', 'frost_ground_decal'],
  },
  scythe: {
    style: 'scythe',
    primary: '#c084fc',
    secondary: '#fb7185',
    accent: '#f5d0fe',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_VoidScytheEclipse',
    gameplayCue: 'GameplayCue.Crimson.Melee.Scythe',
    materialPreset: 'MI_FX_Melee_VoidScythe',
    cameraShake: 'CW_MeleeVoidSweep',
    layers: ['large_violet_arc', 'dark_inner_wake', 'edge_echo_wave', 'rose_violet_hit_glints'],
  },
  default: {
    style: 'slash',
    primary: '#fda4af',
    secondary: '#ffffff',
    accent: '#fecdd3',
    niagaraSystem: '/Game/CrimsonWars/FX/Melee/NS_Melee_GenericSlash',
    gameplayCue: 'GameplayCue.Crimson.Melee.Generic',
    materialPreset: 'MI_FX_Melee_Generic',
    cameraShake: 'CW_MeleeLight',
    layers: ['generic_energy_arc', 'hit_sparks'],
  },
};

function normalizeId(value) {
  return String(value || '').trim().toLowerCase();
}

function numberOr(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function roundNumber(value, digits = 3) {
  const mul = 10 ** Math.max(0, Math.floor(digits));
  return Math.round(numberOr(value, 0) * mul) / mul;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, numberOr(value, min)));
}

function pascalCase(value) {
  return String(value || '')
    .split(/[^A-Za-z0-9]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') || 'Skill';
}

function isActiveSkill(skill) {
  return normalizeId(skill?.kind) === 'active';
}

function getSkillCastType(skill) {
  const id = normalizeId(skill?.id);
  if (!isActiveSkill(skill)) return '';
  const castType = normalizeId(skill?.castType) || id;
  return castType === 'homing_missiles' ? 'skill_burst' : castType;
}

function getSourceSkillCastType(skill) {
  const id = normalizeId(skill?.id);
  if (!isActiveSkill(skill)) return '';
  const sourceCastType = normalizeId(skill?.sourceCastType);
  if (sourceCastType) return sourceCastType;
  return normalizeId(skill?.castType) || id;
}

function getSkillFxKey(skill, heroId = '') {
  const id = normalizeId(skill?.id);
  const ownerHero = normalizeId(heroId || skill?.sourceHeroId || skill?.heroId);
  if (!id) return '';
  return ownerHero ? `skill.${ownerHero}.${id}` : `skill.${id}`;
}

function getHeroTheme(heroId) {
  return HERO_FX_THEMES[normalizeId(heroId)] || null;
}

function buildColors(skill, heroId, preset) {
  const theme = getHeroTheme(heroId || skill?.sourceHeroId || skill?.heroId);
  if (!theme) {
    return {
      primary: preset.primary,
      secondary: preset.secondary,
      accent: preset.accent || preset.secondary,
    };
  }

  return {
    primary: theme.primary || preset.primary,
    secondary: theme.secondary || preset.secondary,
    accent: theme.accent || preset.accent || preset.secondary,
  };
}

function getRarityIntensity(skill) {
  const rarity = normalizeId(skill?.rarity);
  if (rarity === 'legendary') return 1.35;
  if (rarity === 'epic') return 1.18;
  if (rarity === 'rare') return 1.05;
  return 0.92;
}

function getPassivePresetKey(skill) {
  if (skill?.globalAura === true) return 'support';
  if (skill?.companionWeaponKey) return 'companion';
  if (numberOr(skill?.shieldMaxBase, 0) > 0 || numberOr(skill?.shieldMaxPerLevel, 0) > 0) return 'shield';
  if (numberOr(skill?.extraDodgeChargesPerLevel, 0) > 0) return 'dodge';
  if (numberOr(skill?.bulletHomingRangeBase, 0) > 0 || numberOr(skill?.bulletHomingRangePerLevel, 0) > 0) return 'bullet_homing';
  if (numberOr(skill?.bulletPiercePerLevel, 0) > 0 || numberOr(skill?.bulletDamageMulPerLevel, 0) > 0) return 'bullet_pierce';
  if (numberOr(skill?.hpRegenPerSecPerLevel, 0) > 0) return 'regen';
  if (numberOr(skill?.moveSpeedMulPerLevel, 0) > 0 || numberOr(skill?.pickupRadiusPerLevel, 0) > 0) return 'speed';
  if (numberOr(skill?.maxHpFlatPerLevel, 0) > 0) return 'armor';
  return 'combat';
}

function buildActiveFxProfile(skill, heroId = '') {
  const sourceCastType = getSourceSkillCastType(skill);
  const castType = getSkillCastType(skill);
  const preset = ACTIVE_FX_PRESETS[sourceCastType] || ACTIVE_FX_PRESETS[castType] || ACTIVE_FX_PRESETS.default;
  const colors = buildColors(skill, heroId, preset);
  const theme = getHeroTheme(heroId || skill?.sourceHeroId || skill?.heroId);
  const maxLevel = Math.max(1, Math.floor(numberOr(skill?.maxLevel, 1)));
  const radiusBase = Math.max(0, Math.round(numberOr(skill?.radius, 0)));
  const radiusAtMax = radiusBase + (Math.max(0, maxLevel - 1) * Math.max(0, numberOr(skill?.radiusPerLevel, 0)));
  const targetsBase = Math.max(0, Math.round(numberOr(skill?.targets, 0)));
  const targetsAtMax = targetsBase + (Math.max(0, maxLevel - 1) * Math.max(0, numberOr(skill?.targetsPerLevel, 0)));
  const intensity = roundNumber(getRarityIntensity(skill) * (1 + Math.min(0.35, Math.max(0, radiusAtMax - radiusBase) / 1200)), 3);

  return {
    schemaVersion: 1,
    key: getSkillFxKey(skill, heroId),
    skillId: normalizeId(skill?.id),
    heroId: normalizeId(heroId || skill?.sourceHeroId || skill?.heroId),
    kind: 'active',
    castType,
    sourceCastType,
    style: preset.style,
    trigger: 'cooldown_reset_after_successful_cast',
    colors,
    scale: {
      intensity,
      radiusBase,
      radiusPerLevel: Math.max(0, Math.round(numberOr(skill?.radiusPerLevel, 0))),
      radiusAtMax,
      targetsBase,
      targetsPerLevel: Math.max(0, Math.round(numberOr(skill?.targetsPerLevel, 0))),
      targetsAtMax,
      explosionRadiusBase: Math.max(0, Math.round(numberOr(skill?.explosionRadius, 0))),
      explosionRadiusPerLevel: Math.max(0, Math.round(numberOr(skill?.explosionRadiusPerLevel, 0))),
    },
    web: {
      burstStyle: preset.style,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
    },
    unreal: {
      niagaraSystem: preset.niagaraSystem,
      gameplayCue: `${preset.gameplayCue}.${pascalCase(heroId || skill?.sourceHeroId || skill?.heroId || 'Base')}.${pascalCase(skill?.id)}`,
      spawnMode: preset.spawnMode,
      attachTo: preset.attachTo,
      materialPreset: theme?.material || 'MI_FX_Base_Skill',
      cameraShake: preset.cameraShake,
      decalMaterial: preset.decal,
      lightColor: colors.primary,
      shouldSpawnOnServerEvent: false,
      shouldInferFromCooldownReset: true,
      shouldSpawnProjectiles: sourceCastType !== 'homing_missiles',
      projectilesReplicated: sourceCastType === 'homing_missiles',
      projectileSpawnMode: sourceCastType === 'homing_missiles' ? 'none' : 'client_fx',
      skillProjectileActors: sourceCastType === 'homing_missiles' ? 'replicated_bullet_state_only' : 'fx_profile',
      disableSkillProjectiles: sourceCastType === 'homing_missiles',
      projectileCount: sourceCastType === 'homing_missiles' ? 0 : null,
    },
    layers: preset.layers.slice(),
    audio: {
      cast: '/assets/sounds/skill-cast.ogg',
      impact: sourceCastType === 'homing_missiles'
        ? '/assets/sounds/skill-rocket-explosion.ogg'
        : (castType === 'psi_blast' ? '/assets/sounds/skill-psi-blast.ogg' : '/assets/sounds/skill-cast.ogg'),
    },
  };
}

function buildPassiveFxProfile(skill, heroId = '') {
  const presetKey = getPassivePresetKey(skill);
  const preset = PASSIVE_FX_PRESETS[presetKey] || PASSIVE_FX_PRESETS.combat;
  const colors = buildColors(skill, heroId, preset);
  const theme = getHeroTheme(heroId || skill?.sourceHeroId || skill?.heroId);

  return {
    schemaVersion: 1,
    key: getSkillFxKey(skill, heroId),
    skillId: normalizeId(skill?.id),
    heroId: normalizeId(heroId || skill?.sourceHeroId || skill?.heroId),
    kind: 'passive',
    castType: '',
    style: preset.style,
    trigger: preset.trigger,
    colors,
    scale: {
      intensity: roundNumber(getRarityIntensity(skill), 3),
      auraRadius: Math.max(36, Math.round(46 + getRarityIntensity(skill) * 18)),
    },
    web: {
      burstStyle: preset.style,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
    },
    unreal: {
      niagaraSystem: preset.niagaraSystem,
      gameplayCue: `${preset.gameplayCue}.${pascalCase(heroId || skill?.sourceHeroId || skill?.heroId || 'Base')}.${pascalCase(skill?.id)}`,
      spawnMode: 'state_reactive',
      attachTo: 'caster_root',
      materialPreset: theme?.material || 'MI_FX_Base_Passive',
      cameraShake: '',
      decalMaterial: '',
      lightColor: colors.primary,
      shouldSpawnOnServerEvent: false,
      shouldInferFromCooldownReset: false,
    },
    layers: preset.layers.slice(),
    audio: {
      cast: '',
      impact: '',
    },
  };
}

function buildSkillFxProfile(skill, options = {}) {
  if (!skill || typeof skill !== 'object') return null;
  return isActiveSkill(skill)
    ? buildActiveFxProfile(skill, options.heroId || '')
    : buildPassiveFxProfile(skill, options.heroId || '');
}

function buildRuntimeSkillFxRef(skill, options = {}) {
  const profile = buildSkillFxProfile(skill, options);
  if (!profile) return null;
  return {
    key: profile.key,
    castType: profile.castType,
    sourceCastType: profile.sourceCastType || profile.castType || '',
    style: profile.style,
    color: profile.colors.primary,
    secondaryColor: profile.colors.secondary,
    intensity: profile.scale.intensity,
    spawnProjectiles: profile.unreal?.shouldSpawnProjectiles !== false,
    projectilesReplicated: profile.unreal?.projectilesReplicated === true,
  };
}

function buildWorldFxProfile(kind = 'xp_crystal', options = {}) {
  const presetKey = normalizeId(kind) || 'xp_crystal';
  const preset = WORLD_FX_PRESETS[presetKey] || WORLD_FX_PRESETS.xp_crystal;
  const radius = Math.max(0, Math.round(numberOr(options.radius, presetKey === 'xp_surge_pull' ? 560 : 44)));
  return {
    schemaVersion: 1,
    key: preset.key,
    kind: presetKey,
    style: preset.style,
    trigger: preset.trigger,
    colors: {
      primary: options.primary || preset.primary,
      secondary: options.secondary || preset.secondary,
      accent: options.accent || preset.accent,
    },
    scale: {
      intensity: roundNumber(numberOr(options.intensity, presetKey === 'xp_vacuum' ? 1.3 : 1), 3),
      radius,
      durationMs: Math.max(0, Math.round(numberOr(options.durationMs, presetKey === 'xp_surge_pull' ? 4500 : 0))),
      tetherCount: Math.max(0, Math.round(numberOr(options.tetherCount, presetKey === 'xp_surge_pull' ? 24 : 6))),
    },
    web: {
      burstStyle: preset.style,
      primaryColor: options.primary || preset.primary,
      secondaryColor: options.secondary || preset.secondary,
    },
    unreal: {
      niagaraSystem: preset.niagaraSystem,
      gameplayCue: preset.gameplayCue,
      spawnMode: preset.spawnMode,
      attachTo: preset.attachTo,
      materialPreset: preset.materialPreset,
      cameraShake: preset.cameraShake,
      mesh: preset.mesh,
      lightColor: options.primary || preset.primary,
      shouldSpawnOnServerEvent: presetKey === 'xp_surge_pull',
      shouldInferFromState: presetKey !== 'xp_surge_pull',
    },
    layers: preset.layers.slice(),
    audio: {
      cast: presetKey === 'xp_surge_pull' ? '/assets/sounds/xp-surge.ogg' : '',
      impact: '',
    },
  };
}

function buildRuntimeWorldFxRef(kind = 'xp_crystal', options = {}) {
  const profile = buildWorldFxProfile(kind, options);
  if (!profile) return null;
  return {
    key: profile.key,
    kind: profile.kind,
    style: profile.style,
    color: profile.colors.primary,
    secondaryColor: profile.colors.secondary,
    intensity: profile.scale.intensity,
  };
}

function buildNativeWorldFxManifest() {
  const byKey = {};
  const byKind = {};
  for (const kind of Object.keys(WORLD_FX_PRESETS)) {
    const fx = buildWorldFxProfile(kind);
    byKey[fx.key] = fx;
    byKind[kind] = fx.key;
  }
  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    triggerContract: 'World FX come from replicated drops plus explicit worldFx websocket events for one-shot activations such as XP Surge.',
    byKey,
    byKind,
  };
}

function getProjectilePresetKey(projectile) {
  const kind = normalizeId(typeof projectile === 'string' ? projectile : projectile?.kind);
  const weaponKey = normalizeId(projectile?.weaponKey);
  if (kind === 'rocket' || weaponKey === 'homing_missiles') return 'rocket';
  return 'bullet';
}

function getProjectileFxKey(projectile) {
  return PROJECTILE_FX_PRESETS[getProjectilePresetKey(projectile)]?.key || PROJECTILE_FX_PRESETS.bullet.key;
}

function buildProjectileFxProfile(projectile = 'bullet', options = {}) {
  const presetKey = getProjectilePresetKey(projectile);
  const preset = PROJECTILE_FX_PRESETS[presetKey] || PROJECTILE_FX_PRESETS.bullet;
  const explosionRadius = Math.max(0, Math.round(numberOr(options.explosionRadius ?? projectile?.explosionRadius, presetKey === 'rocket' ? 120 : 0)));
  const isRocket = presetKey === 'rocket';
  return {
    schemaVersion: 1,
    key: preset.key,
    kind: presetKey,
    weaponKey: isRocket ? 'homing_missiles' : normalizeId(projectile?.weaponKey),
    style: preset.style,
    trigger: preset.trigger,
    colors: {
      primary: options.primary || projectile?.color || preset.primary,
      secondary: options.secondary || preset.secondary,
      accent: options.accent || preset.accent,
    },
    scale: {
      intensity: roundNumber(numberOr(options.intensity, isRocket ? 1.25 : 0.9), 3),
      radius: Math.max(2, Math.round(numberOr(options.radius ?? projectile?.radius, isRocket ? 6 : 3))),
      speed: Math.max(0, Math.round(numberOr(options.speed ?? projectile?.speed, 0))),
      explosionRadius,
      trailSeconds: isRocket ? 0.42 : 0.08,
      flameLength: isRocket ? preset.engineFlame.length : 0,
      flameWidth: isRocket ? preset.engineFlame.width : 0,
      impactDurationMs: isRocket ? preset.impactExplosion.durationMs : 0,
      impactOuterRadius: isRocket ? preset.impactExplosion.outerRadius : 0,
    },
    web: {
      burstStyle: preset.style,
      primaryColor: options.primary || projectile?.color || preset.primary,
      secondaryColor: options.secondary || preset.secondary,
    },
    unreal: {
      niagaraSystem: preset.niagaraSystem,
      gameplayCue: preset.gameplayCue,
      spawnMode: preset.spawnMode,
      attachTo: preset.attachTo,
      materialPreset: preset.materialPreset,
      cameraShake: preset.cameraShake,
      mesh: preset.mesh,
      lightColor: options.primary || projectile?.color || preset.primary,
      renderMode: isRocket ? 'mesh_projectile' : 'tracer_only',
      projectileActorSource: 'replicated_bullet_state',
      shotEventRole: 'muzzle_audio_only',
      engineFlame: isRocket ? { ...preset.engineFlame } : null,
      rotationSmoothing: isRocket ? { ...preset.rotationSmoothing } : null,
      impactExplosion: isRocket ? { ...preset.impactExplosion } : null,
      isRocket,
      shouldSpawnOnServerEvent: false,
      shouldInferFromBulletState: true,
    },
    layers: preset.layers.slice(),
    audio: {
      cast: isRocket ? '/assets/sounds/rocket-launch.ogg' : '',
      impact: isRocket ? '/assets/sounds/skill-rocket-explosion.ogg' : '/assets/sounds/bullet-impact.ogg',
    },
  };
}

function buildRuntimeProjectileFxRef(projectile = 'bullet', options = {}) {
  const profile = buildProjectileFxProfile(projectile, options);
  if (!profile) return null;
  return {
    key: profile.key,
    kind: profile.kind,
    style: profile.style,
    color: profile.colors.primary,
    secondaryColor: profile.colors.secondary,
    intensity: profile.scale.intensity,
    renderMode: profile.unreal?.renderMode || '',
    trailSeconds: Math.max(0, Number(profile.scale?.trailSeconds) || 0),
    engineFlame: profile.unreal?.engineFlame || null,
    rotationSmoothing: profile.unreal?.rotationSmoothing || null,
    impactExplosion: profile.unreal?.impactExplosion || null,
  };
}

function buildNativeProjectileFxManifest() {
  const byKey = {};
  const byKind = {};
  for (const kind of Object.keys(PROJECTILE_FX_PRESETS)) {
    const fx = buildProjectileFxProfile(kind);
    byKey[fx.key] = fx;
    byKind[kind] = fx.key;
  }
  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    triggerContract: 'Projectile actors should be maintained from replicated bullet state. shotEvents are muzzle/audio timing only and must not spawn persistent projectile meshes. Rockets use projectile.rocket from replicated bullet state only, use short nozzle flame settings from unreal.engineFlame, smooth orientation with unreal.rotationSmoothing, and should explode when removed after impact.',
    byKey,
    byKind,
  };
}

function getMeleeStyleKey(value) {
  const style = normalizeId(value?.melee?.style || value?.style);
  if (style === 'void_scythe') return 'scythe';
  if (style === 'cryo_axe') return 'cryo';
  if (style === 'warhammer') return 'hammer';
  if (style === 'shock_baton') return 'baton';
  if (style === 'plasma_glaive') return 'glaive';
  if (style === 'monowire_whip') return 'whip';
  return style || 'default';
}

function getMeleeFxKey(melee) {
  const itemId = normalizeId(melee?.itemId || melee?.id);
  if (itemId) return `melee.${itemId}`;
  const style = getMeleeStyleKey(melee);
  return `melee_style.${style}`;
}

function buildMeleeFxProfile(itemOrRuntime = {}, options = {}) {
  const melee = itemOrRuntime?.melee && typeof itemOrRuntime.melee === 'object' ? itemOrRuntime.melee : itemOrRuntime;
  const itemId = normalizeId(itemOrRuntime?.id || itemOrRuntime?.itemId || melee?.itemId);
  const styleKey = getMeleeStyleKey(melee);
  const preset = MELEE_STYLE_FX_PRESETS[styleKey] || MELEE_STYLE_FX_PRESETS.default;
  const maxTargets = Math.max(1, Math.round(numberOr(melee?.maxTargets, 1)));
  const range = Math.max(24, Math.round(numberOr(melee?.range, 96)));
  const width = Math.max(18, Math.round(numberOr(melee?.width, 64)));
  return {
    schemaVersion: 1,
    key: getMeleeFxKey({ ...melee, itemId }),
    itemId,
    style: preset.style,
    trigger: 'server_meleeFx_event',
    colors: {
      primary: options.primary || melee?.color || preset.primary,
      secondary: options.secondary || melee?.secondaryColor || preset.secondary,
      accent: options.accent || preset.accent,
    },
    scale: {
      intensity: roundNumber(numberOr(options.intensity, 1 + Math.min(0.35, maxTargets * 0.035 + width / 800)), 3),
      damageBase: Math.max(1, Math.round(numberOr(melee?.damage, 1))),
      damagePerLevel: Math.max(0, Math.round(numberOr(melee?.damagePerLevel, 0))),
      range,
      rangePerLevel: Math.max(0, Math.round(numberOr(melee?.rangePerLevel, 0))),
      width,
      arcDeg: Math.max(1, Math.round(numberOr(melee?.arcDeg, 90))),
      cooldownMs: Math.max(1, Math.round(numberOr(melee?.cooldownMs, 800))),
      maxTargets,
      chainTargets: Math.max(0, Math.round(numberOr(melee?.chainTargets, 0))),
      echoRadius: Math.max(0, Math.round(numberOr(melee?.echoRadius, 0))),
      stunMs: Math.max(0, Math.round(numberOr(melee?.stunMs, 0))),
      knockback: Math.max(0, Math.round(numberOr(melee?.knockback, 0))),
    },
    web: {
      burstStyle: preset.style,
      primaryColor: options.primary || melee?.color || preset.primary,
      secondaryColor: options.secondary || melee?.secondaryColor || preset.secondary,
    },
    unreal: {
      niagaraSystem: preset.niagaraSystem,
      gameplayCue: itemId
        ? `${preset.gameplayCue}.${pascalCase(itemId)}`
        : preset.gameplayCue,
      spawnMode: preset.style === 'hammer' ? 'ground_impact_arc' : 'caster_forward_arc',
      attachTo: 'caster_weapon_or_hand',
      materialPreset: preset.materialPreset,
      cameraShake: preset.cameraShake,
      lightColor: options.primary || melee?.color || preset.primary,
      shouldSpawnOnServerEvent: true,
      shouldInferFromState: false,
    },
    layers: preset.layers.slice(),
    audio: {
      cast: preset.style === 'chainsaw' ? '/assets/sounds/melee-chainsaw.ogg' : '/assets/sounds/melee-swing.ogg',
      impact: preset.style === 'hammer' ? '/assets/sounds/melee-heavy-impact.ogg' : '/assets/sounds/melee-hit.ogg',
    },
  };
}

function buildRuntimeMeleeFxRef(melee = {}, options = {}) {
  const profile = buildMeleeFxProfile(melee, options);
  if (!profile) return null;
  return {
    key: profile.key,
    itemId: profile.itemId,
    style: profile.style,
    color: profile.colors.primary,
    secondaryColor: profile.colors.secondary,
    intensity: profile.scale.intensity,
  };
}

function buildNativeMeleeFxManifest(items) {
  const byKey = {};
  const byItemId = {};
  const byStyle = {};
  for (const item of Array.isArray(items) ? items : []) {
    if (normalizeId(item?.slotCategory) !== 'melee' || !item?.melee) continue;
    const fx = buildMeleeFxProfile(item);
    if (!fx?.key) continue;
    byKey[fx.key] = fx;
    if (fx.itemId) byItemId[fx.itemId] = fx.key;
    byStyle[fx.style] = fx.key;
  }

  for (const style of Object.keys(MELEE_STYLE_FX_PRESETS)) {
    const fallbackFx = buildMeleeFxProfile({ itemId: '', style });
    byKey[fallbackFx.key] = fallbackFx;
    if (!byStyle[fallbackFx.style]) byStyle[fallbackFx.style] = fallbackFx.key;
  }

  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    triggerContract: 'Spawn melee FX from websocket meleeFx events. The event includes fxKey, style, arc/range/width, impact point, colors, damage and hitCount.',
    byKey,
    byItemId,
    byStyle,
  };
}

function formatTooltipNumber(value, digits = 1) {
  const rounded = roundNumber(value, digits);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(Math.max(0, Math.floor(digits))).replace(/\.?0+$/u, '');
}

function buildTooltipStat(key, label, labelRu, value, options = {}) {
  const num = Number(value);
  if (!Number.isFinite(num) || Math.abs(num) < 0.0001) return null;
  const digits = Math.max(0, Math.floor(options.digits ?? (Math.abs(num) < 10 ? 1 : 0)));
  const sign = options.sign && num > 0 ? '+' : '';
  const prefix = String(options.prefix || '');
  const unit = String(options.unit || '');
  const display = `${sign}${prefix}${formatTooltipNumber(num, digits)}${unit}`;
  return {
    key,
    label,
    labelRu,
    value: roundNumber(num, digits),
    unit,
    display,
    displayRu: display,
  };
}

function buildTooltipTextStat(key, label, labelRu, display, displayRu = display) {
  const text = String(display || '').trim();
  if (!text) return null;
  return {
    key,
    label,
    labelRu,
    value: text,
    unit: '',
    display: text,
    displayRu: String(displayRu || text),
  };
}

function addTooltipStat(stats, stat) {
  if (stat) stats.push(stat);
}

function buildSkillTooltipEffect(skill) {
  const kind = normalizeId(skill?.kind) || 'passive';
  const sourceCastType = getSourceSkillCastType(skill);
  const text = `${skill?.id || ''} ${skill?.name || ''} ${skill?.desc || ''}`.toLowerCase();
  if (kind === 'active') {
    if (sourceCastType === 'homing_missiles' || numberOr(skill?.missileSpeed, 0) > 0) {
      return {
        ru: 'Launches homing rockets at nearby enemies. In Native, visible rocket actors must come only from state.bullets[], while the skill FX stays as a short launch burst.',
        en: 'Launches homing rockets at nearby enemies. In Native, visible rocket actors must come only from state.bullets[], while the skill FX stays as a short launch burst.',
      };
    }
    if (sourceCastType === 'laser_strike' || /(laser|beam|lance|mark|shrapnel)/u.test(text)) {
      return {
        ru: 'Instantly pierces nearby targets with directed beams.',
        en: 'Instantly pierces nearby targets with directed beams.',
      };
    }
    if (sourceCastType === 'chain_lightning' || /(chain|arc|storm|matrix|lightning)/u.test(text)) {
      return {
        ru: 'A chained discharge jumps between multiple targets.',
        en: 'A chained discharge jumps between multiple targets.',
      };
    }
    if (sourceCastType === 'shockwave' || /(wave|stomp|pulse)/u.test(text)) {
      return {
        ru: 'A shockwave around the hero deals damage and clears space.',
        en: 'A shockwave around the hero deals damage and clears space.',
      };
    }
    if (sourceCastType === 'psi_blast' || /(psi|void|burst)/u.test(text)) {
      return {
        ru: 'A psi blast around the hero knocks back and briefly stuns enemies.',
        en: 'A psi blast around the hero knocks back and briefly stuns enemies.',
      };
    }
    if (sourceCastType === 'blade_orbit' || /(blade|fang|razor)/u.test(text)) {
      return {
        ru: 'Fast blades strike nearby targets on cooldown.',
        en: 'Fast blades strike nearby targets on cooldown.',
      };
    }
    return {
      ru: 'Triggers on cooldown and damages nearby enemies.',
      en: 'Triggers on cooldown and damages nearby enemies.',
    };
  }

  if (skill?.companionWeaponKey) {
    return {
      ru: 'Summons a combat buddy with its own weapon.',
      en: 'Summons a combat buddy with its own weapon.',
    };
  }
  if (numberOr(skill?.shieldMaxBase, 0) > 0 || numberOr(skill?.shieldMaxPerLevel, 0) > 0) {
    return {
      ru: 'Creates a shield that absorbs part of incoming damage and restores after breaking.',
      en: 'Creates a shield that absorbs part of incoming damage and restores after breaking.',
    };
  }
  if (skill?.globalAura === true) {
    return {
      ru: 'Passively improves the other heroes on the account.',
      en: 'Passively improves the other heroes on the account.',
    };
  }
  if (numberOr(skill?.hpRegenPerSecPerLevel, 0) > 0 || numberOr(skill?.maxHpFlatPerLevel, 0) > 0) {
    return {
      ru: 'Improves hero survivability.',
      en: 'Improves hero survivability.',
    };
  }
  if (numberOr(skill?.moveSpeedMulPerLevel, 0) > 0 || numberOr(skill?.reloadSpeedMulPerLevel, 0) > 0 || numberOr(skill?.extraDodgeChargesPerLevel, 0) > 0) {
    return {
      ru: 'Improves movement, reloads, or dodges.',
      en: 'Improves movement, reloads, or dodges.',
    };
  }
  return {
    ru: 'Passively improves combat stats.',
    en: 'Passively improves combat stats.',
  };
}

function buildSkillTooltipStats(skill, level = 1) {
  const lvl = Math.max(1, Math.floor(numberOr(level, 1)));
  const activeLevel = Math.max(0, lvl - 1);
  const stats = [];
  if (isActiveSkill(skill)) {
    const damage = numberOr(skill?.damage, 0) + numberOr(skill?.damagePerLevel, 0) * activeLevel;
    const radius = numberOr(skill?.radius, 0) + numberOr(skill?.radiusPerLevel, 0) * activeLevel;
    const targets = numberOr(skill?.targets, 0) + numberOr(skill?.targetsPerLevel, 0) * activeLevel;
    const cooldownMs = Math.max(0, numberOr(skill?.cooldownMs, 0));
    const cooldownScale = Math.max(0.2, 1 - Math.max(0, numberOr(skill?.cooldownMulPerLevel, 0)) * activeLevel);
    const currentCooldownMs = cooldownMs > 0 ? Math.max(300, Math.round(cooldownMs * cooldownScale)) : 0;
    const missileSpeed = numberOr(skill?.missileSpeed, 0) + numberOr(skill?.missileSpeedPerLevel, 0) * activeLevel;
    const turnRate = numberOr(skill?.turnRate, 0) + numberOr(skill?.turnRatePerLevel, 0) * activeLevel;
    const explosionRadius = numberOr(skill?.explosionRadius, 0) + numberOr(skill?.explosionRadiusPerLevel, 0) * activeLevel;

    addTooltipStat(stats, buildTooltipStat('damage', 'Damage', 'Damage', damage));
    addTooltipStat(stats, buildTooltipStat('radius', 'Radius', 'Radius', radius));
    addTooltipStat(stats, buildTooltipStat('targets', 'Targets', 'Targets', Math.max(0, Math.round(targets))));
    addTooltipStat(stats, buildTooltipStat('cooldown', 'Cooldown', 'Cooldown', currentCooldownMs / 1000, { digits: 2, unit: 's' }));
    addTooltipStat(stats, buildTooltipStat('missile_speed', 'Missile speed', 'Missile speed', missileSpeed));
    addTooltipStat(stats, buildTooltipStat('turn_rate', 'Turn rate', 'Turn rate', turnRate, { digits: 2 }));
    addTooltipStat(stats, buildTooltipStat('explosion_radius', 'Explosion radius', 'Explosion radius', explosionRadius));
    addTooltipStat(stats, buildTooltipStat('flight_time', 'Flight time', 'Flight time', numberOr(skill?.lifeMs, 0) / 1000, { digits: 2, unit: 's' }));
    addTooltipStat(stats, buildTooltipStat('knockback', 'Knockback', 'Knockback', numberOr(skill?.knockbackMul, 0), { digits: 1, prefix: 'x' }));
    addTooltipStat(stats, buildTooltipStat('stun', 'Stun', 'Stun', numberOr(skill?.stunMs, 0), { unit: 'ms' }));
    return stats;
  }

  addTooltipStat(stats, buildTooltipStat('damage', 'Damage', 'Damage', numberOr(skill?.damageMulPerLevel, 0) * lvl * 100, { digits: 1, sign: true, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('fire_rate', 'Fire rate', 'Fire rate', numberOr(skill?.fireRateMulPerLevel, 0) * lvl * 100, { digits: 1, sign: true, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('reload_speed', 'Reload speed', 'Reload speed', numberOr(skill?.reloadSpeedMulPerLevel, 0) * lvl * 100, { digits: 1, sign: true, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('move_speed', 'Move speed', 'Move speed', numberOr(skill?.moveSpeedMulPerLevel, 0) * lvl * 100, { digits: 1, sign: true, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('max_hp', 'Max HP', 'Max HP', numberOr(skill?.maxHpFlatPerLevel, 0) * lvl, { sign: true }));
  addTooltipStat(stats, buildTooltipStat('pickup_radius', 'Pickup radius', 'Pickup radius', numberOr(skill?.pickupRadiusPerLevel, 0) * lvl, { sign: true }));
  addTooltipStat(stats, buildTooltipStat('hp_regen', 'HP regen', 'HP regen', numberOr(skill?.hpRegenPerSecPerLevel, 0) * lvl, { digits: 2, sign: true, unit: '/s' }));
  addTooltipStat(stats, buildTooltipStat('jump_charges', 'Jump charges', 'Jump charges', numberOr(skill?.extraDodgeChargesPerLevel, 0) * lvl, { sign: true }));
  addTooltipStat(stats, buildTooltipStat('bullet_pierce', 'Bullet pierce', 'Bullet pierce', numberOr(skill?.bulletPierceFlat, 0) + numberOr(skill?.bulletPiercePerLevel, 0) * lvl, { sign: true }));
  addTooltipStat(stats, buildTooltipStat('bullet_damage', 'Bullet damage', 'Bullet damage', numberOr(skill?.bulletDamageMulPerLevel, 0) * lvl * 100, { digits: 1, sign: true, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('bullet_homing_range', 'Bullet homing range', 'Bullet homing range', numberOr(skill?.bulletHomingRangeBase, 0) + numberOr(skill?.bulletHomingRangePerLevel, 0) * Math.max(0, lvl - 1)));
  addTooltipStat(stats, buildTooltipStat('bullet_homing_turn', 'Bullet homing turn', 'Bullet homing turn', numberOr(skill?.bulletHomingTurnBase, 0) + numberOr(skill?.bulletHomingTurnPerLevel, 0) * Math.max(0, lvl - 1), { digits: 2 }));
  addTooltipStat(stats, buildTooltipStat('shield_hp', 'Shield HP', 'Shield HP', (numberOr(skill?.shieldMaxBase, 0) > 0 ? numberOr(skill?.shieldMaxBase, 0) + numberOr(skill?.shieldMaxPerLevel, 0) * Math.max(0, lvl - 1) : numberOr(skill?.shieldMaxPerLevel, 0) * lvl)));
  addTooltipStat(stats, buildTooltipStat('shield_absorb', 'Shield absorb', 'Shield absorb', (numberOr(skill?.shieldAbsorbBase, 0) + numberOr(skill?.shieldAbsorbPerLevel, 0) * Math.max(0, lvl - 1)) * 100, { digits: 1, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('shield_restore', 'Shield restore', 'Shield restore', numberOr(skill?.shieldRestoreMs, 0) / 1000, { digits: 1, unit: 's' }));
  addTooltipStat(stats, buildTooltipStat('other_heroes_damage', 'Other heroes damage', 'Other heroes damage', numberOr(skill?.globalDamageMulPerLevel, 0) * lvl * 100, { digits: 1, sign: true, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('other_heroes_fire_rate', 'Other heroes fire rate', 'Other heroes fire rate', numberOr(skill?.globalFireRateMulPerLevel, 0) * lvl * 100, { digits: 1, sign: true, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('other_heroes_speed', 'Other heroes speed', 'Other heroes speed', numberOr(skill?.globalMoveSpeedMulPerLevel, 0) * lvl * 100, { digits: 1, sign: true, unit: '%' }));
  addTooltipStat(stats, buildTooltipStat('other_heroes_hp', 'Other heroes HP', 'Other heroes HP', numberOr(skill?.globalMaxHpFlatPerLevel, 0) * lvl, { sign: true }));
  addTooltipStat(stats, buildTooltipStat('other_heroes_pickup', 'Other heroes pickup', 'Other heroes pickup', numberOr(skill?.globalPickupRadiusPerLevel, 0) * lvl, { sign: true }));
  addTooltipStat(stats, buildTooltipStat('other_heroes_regen', 'Other heroes regen', 'Other heroes regen', numberOr(skill?.globalHpRegenPerSecPerLevel, 0) * lvl, { digits: 2, sign: true, unit: '/s' }));
  addTooltipStat(stats, buildTooltipTextStat('companion_weapon', 'Companion weapon', 'Companion weapon', normalizeId(skill?.companionWeaponKey).toUpperCase()));
  return stats;
}

function buildSkillTooltipProfile(skill, options = {}) {
  if (!skill || typeof skill !== 'object') return null;
  const level = Math.max(1, Math.floor(numberOr(options.level ?? skill.level, 1)));
  const id = normalizeId(skill.id);
  const name = String(skill.name || id || 'Skill');
  const heroId = normalizeId(options.heroId || skill.sourceHeroId || skill.heroId);
  const effect = buildSkillTooltipEffect(skill);
  return {
    schemaVersion: 1,
    skillId: id,
    heroId,
    name,
    title: `${name} Lv${level}`,
    titleRu: `${name} Lv${level}`,
    kind: normalizeId(skill.kind) || 'passive',
    rarity: normalizeId(skill.rarity) || 'common',
    level,
    maxLevel: Math.max(1, Math.floor(numberOr(skill.maxLevel, level))),
    description: String(skill.desc || ''),
    effect: effect.en,
    effectRu: effect.ru,
    castType: getSkillCastType(skill),
    sourceCastType: getSourceSkillCastType(skill),
    stats: buildSkillTooltipStats(skill, level),
    trigger: 'native_hud_hover_or_focus',
  };
}

function buildRuntimeSkillTooltipRef(skill, options = {}) {
  return buildSkillTooltipProfile(skill, options);
}

function buildNativeSkillTooltipManifest(skills) {
  const bySkillId = {};
  for (const skill of Array.isArray(skills) ? skills : []) {
    const tooltip = buildSkillTooltipProfile(skill, {
      heroId: skill?.sourceHeroId || skill?.heroId || '',
      level: 1,
    });
    if (!tooltip?.skillId) continue;
    bySkillId[tooltip.skillId] = tooltip;
  }
  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    triggerContract: 'Render Native skill hints in UMG from payload.catalog.skills[].tooltip, state.players[].skills[].tooltip, or this bySkillId map. Do not depend on Web DOM mouse hover inside the Unreal viewport.',
    bySkillId,
  };
}

function buildNativeGameplayFxManifest(options = {}) {
  const skills = Array.isArray(options.skills) ? options.skills : [];
  const items = Array.isArray(options.items) ? options.items : [];
  const skillFx = buildNativeSkillFxManifest(skills);
  const skillTooltips = buildNativeSkillTooltipManifest(skills);
  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    triggerContract: 'Top-level native FX manifest. Use skillFx for skills, worldFx for pickups/world events, projectileFx for bullets and rockets, meleeFx for second-hand melee weapon attacks, and skillTooltips for Native HUD hover/focus hints.',
    skillFx,
    skillTooltips,
    ui: {
      skillTooltips,
    },
    worldFx: buildNativeWorldFxManifest(),
    projectileFx: buildNativeProjectileFxManifest(),
    meleeFx: buildNativeMeleeFxManifest(items),
  };
}

function enrichSkillForClient(skill, options = {}) {
  if (!skill || typeof skill !== 'object') return null;
  const heroId = normalizeId(options.heroId || skill.sourceHeroId || skill.heroId);
  const fx = buildSkillFxProfile(skill, { heroId });
  const castType = getSkillCastType(skill);
  const sourceCastType = getSourceSkillCastType(skill);
  const tooltip = buildSkillTooltipProfile(skill, { heroId, level: options.level || skill.level || 1 });
  const out = {
    ...skill,
    id: normalizeId(skill.id) || String(skill.id || ''),
    heroId: heroId || skill.heroId,
    sourceHeroId: heroId || skill.sourceHeroId,
    fxKey: fx?.key || '',
    fx: fx || null,
    tooltip,
    nativeTooltip: tooltip,
  };
  if (castType) out.castType = castType;
  if (sourceCastType) out.sourceCastType = sourceCastType;
  if (fx?.unreal?.projectilesReplicated) {
    out.projectilesReplicated = true;
    out.spawnProjectiles = false;
  }
  return out;
}

function addSkillToMap(map, skill, options = {}) {
  const enriched = enrichSkillForClient(skill, options);
  const id = normalizeId(enriched?.id);
  if (!id || map.has(id)) return;
  map.set(id, enriched);
}

function withRuntimeSkillIcon(skill, defaultSkillDefs) {
  if (!skill || typeof skill !== 'object') return skill;
  if (skill.icon || skill.iconPath) return skill;
  const id = normalizeId(skill.id);
  if (!id || !defaultSkillDefs?.[id]) return skill;
  return {
    ...skill,
    icon: `/assets/hero-skills/${id}.webp`,
  };
}

function flattenHeroUniqueSkills(heroUniqueSkillDefs) {
  const out = [];
  const groups = heroUniqueSkillDefs && typeof heroUniqueSkillDefs === 'object' ? heroUniqueSkillDefs : {};
  for (const [heroId, skills] of Object.entries(groups)) {
    if (!Array.isArray(skills)) continue;
    for (const skill of skills) {
      if (skill && typeof skill === 'object') out.push({ skill, heroId });
    }
  }
  return out;
}

function buildSkillCatalogWithFx(baseSkills, options = {}) {
  const byId = new Map();
  const defaultSkillDefs = options.defaultSkillDefs && typeof options.defaultSkillDefs === 'object'
    ? options.defaultSkillDefs
    : {};

  for (const skill of Array.isArray(baseSkills) ? baseSkills : []) {
    addSkillToMap(byId, withRuntimeSkillIcon(skill, defaultSkillDefs));
  }

  for (const skill of Object.values(defaultSkillDefs)) {
    if (isActiveSkill(skill)) addSkillToMap(byId, withRuntimeSkillIcon(skill, defaultSkillDefs));
  }

  for (const entry of flattenHeroUniqueSkills(options.heroUniqueSkillDefs)) {
    addSkillToMap(byId, entry.skill, { heroId: entry.heroId });
  }

  return Array.from(byId.values());
}

function buildNativeSkillFxManifest(skills) {
  const byKey = {};
  const bySkillId = {};
  const activeCastTypes = {};
  const passiveStyles = {};

  for (const skill of Array.isArray(skills) ? skills : []) {
    const fx = skill?.fx || buildSkillFxProfile(skill);
    if (!fx?.key) continue;
    byKey[fx.key] = fx;
    bySkillId[normalizeId(skill.id || fx.skillId)] = fx.key;
    if (fx.kind === 'active') activeCastTypes[fx.castType || fx.style] = true;
    else passiveStyles[fx.style] = true;
  }

  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    triggerContract: 'A client should spawn active FX when an active skill cooldown jumps from ready to a fresh cooldown. Runtime skill state includes castType and fxKey. Homing missile skill FX is cast/muzzle-only; moving rockets come from replicated projectile.rocket bullet state.',
    byKey,
    bySkillId,
    activeCastTypes: Object.keys(activeCastTypes).sort(),
    passiveStyles: Object.keys(passiveStyles).sort(),
  };
}

module.exports = {
  buildNativeGameplayFxManifest,
  buildNativeMeleeFxManifest,
  buildNativeProjectileFxManifest,
  buildNativeSkillFxManifest,
  buildNativeSkillTooltipManifest,
  buildNativeWorldFxManifest,
  buildRuntimeMeleeFxRef,
  buildRuntimeProjectileFxRef,
  buildRuntimeSkillFxRef,
  buildRuntimeSkillTooltipRef,
  buildRuntimeWorldFxRef,
  buildSkillCatalogWithFx,
  buildSkillFxProfile,
  buildSkillTooltipProfile,
  buildMeleeFxProfile,
  buildProjectileFxProfile,
  buildWorldFxProfile,
  enrichSkillForClient,
  getMeleeFxKey,
  getProjectileFxKey,
  getSkillCastType,
  getSkillFxKey,
};
