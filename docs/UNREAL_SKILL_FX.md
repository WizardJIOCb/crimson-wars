# Unreal Gameplay FX Contract

The native Unreal client should load gameplay FX metadata from:

- `GET /api/native/bootstrap`
- `payload.catalog.skills`
- `payload.catalog.skillFx` or `payload.native.skillFx` for backward-compatible skill-only clients
- `payload.catalog.fx` or `payload.native.fx` for the full native FX manifest

The full manifest contains:

- `fx.skillFx`: active/passive hero skill FX.
- `fx.worldFx`: pickups and one-shot world events, including `world.xp_vacuum` and `world.xp_surge_pull`.
- `fx.projectileFx`: bullet and rocket profiles. Homing missile rockets use `projectile.rocket`.
- `fx.meleeFx`: second-hand melee weapon swing profiles keyed by item id, for example `melee.melee_chainsaw`.

Each skill still has:

- `castType`: shared combat FX family, for example `shockwave`, `laser_strike`, `chain_lightning`, `homing_missiles`.
- `fxKey`: stable key into `skillFx.byKey`.
- `fx`: full visual profile with colors, scale, Niagara path hints, GameplayCue name, audio, and layer notes.

Runtime state still sends player skills in each `state` payload. A native renderer should spawn an active skill effect when:

1. `skill.kind === "active"`.
2. The skill cooldown changes from ready/near-ready to a fresh cooldown.
3. Use `skill.fxKey` to find the profile in `skillFx.byKey`.

The web client uses the same rule, so Unreal and web stay visually aligned.

Runtime events/state now also include:

- `meleeFx` websocket message: spawn the melee swing immediately from `event.fxKey`, `event.style`, `range`, `width`, `arcDeg`, `impactX/Y`, colors and `hitCount`.
- `worldFx` websocket message: one-shot world activations. `xp_surge_pull` fires when a violet XP Surge crystal is picked up.
- `state.drops[]`: XP Surge drops have `kind: "xp_vacuum"` plus `fxKey/fx` in non-compact state.
- `state.bullets[]` and `state.shotEvents[]`: rockets have `kind: "rocket"` and `fxKey: "projectile.rocket"` in non-compact state/events.

Recommended UE mapping:

- `fx.unreal.niagaraSystem`: preferred Niagara System asset path to create or map.
- `fx.unreal.gameplayCue`: GameplayCue tag to trigger from the native renderer.
- `fx.colors.primary`, `secondary`, `accent`: material parameter colors.
- `fx.scale.radiusBase`, `radiusPerLevel`, `targetsBase`, `targetsPerLevel`: drive Niagara user parameters.
- `fx.layers`: art-direction checklist for the final Niagara stack.

For melee profiles, use `fx.scale.range`, `width`, `arcDeg`, `cooldownMs`, `stunMs`, `knockback`, `chainTargets`, and `echoRadius` as Niagara user parameters.

For the violet XP Surge crystal:

- Idle pickup profile: `world.xp_vacuum`, style `violet_singularity_crystal`.
- Activation profile: `world.xp_surge_pull`, sent as a `worldFx` websocket event.
- Suggested UE stack: faceted crystal mesh, violet emissive material, rotating rune rings, cyan tethers to XP crystals, and a short player-attached pull ripple on pickup.

The server remains authoritative for gameplay. The renderer can freely improve Niagara, materials, camera shake and audio as long as it keys off the replicated `fxKey` and runtime geometry.
