# Unreal Gameplay FX Contract

The native Unreal client should load gameplay FX metadata from:

- `GET /api/native/bootstrap`
- `payload.catalog.skills`
- `payload.catalog.uiSettings` / `payload.native.uiSettings`
- `payload.catalog.skillFx` or `payload.native.skillFx` for backward-compatible skill-only clients
- `payload.catalog.fx` or `payload.native.fx` for the full native FX manifest

The full manifest contains:

- `fx.skillFx`: active/passive hero skill FX.
- `fx.skillTooltips`: Native HUD tooltip data keyed by skill id.
- `fx.worldFx`: pickups and one-shot world events, including `world.xp_vacuum` and `world.xp_surge_pull`.
- `fx.projectileFx`: bullet and rocket profiles. Homing missile rockets use `projectile.rocket`.
- `fx.meleeFx`: second-hand melee weapon swing profiles keyed by item id, for example `melee.melee_chainsaw`.

Each skill still has:

- `castType`: shared combat FX family, for example `shockwave`, `laser_strike`, `chain_lightning`, or `skill_burst`. Homing-missile hero skills intentionally expose a cast-only `skill_burst` profile.
- `sourceCastType`: original gameplay family, for example `homing_missiles` when `castType` is intentionally downgraded to `skill_burst`.
- `fxKey`: stable key into `skillFx.byKey`.
- `fx`: full visual profile with colors, scale, Niagara path hints, GameplayCue name, audio, and layer notes.
- `tooltip` / `nativeTooltip`: title, description, localized effect text, and structured `stats[]` for Native HUD hover/focus UI.

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
- Homing missile skills must not spawn skill-owned projectile meshes. When a skill/profile has `projectilesReplicated: true`, `spawnProjectiles: false`, or `fx.unreal.disableSkillProjectiles: true`, treat it as muzzle/cast-only and render moving rockets only from `state.bullets[]`.
- Native skill hints should be rendered in UE/UMG from `state.players[].skills[].tooltip`, `payload.catalog.skills[].tooltip`, or `payload.native.fx.skillTooltips.bySkillId`. Do not depend on Web DOM hover inside the Unreal viewport.
- If the Native client keeps the WebView HUD for skill slots, it can call `cwNativeShowSkillTooltip(skillId, screenX, screenY)` on hover/focus and `cwNativeHideSkillTooltip()` on leave. WebView2 host messages with `{ "type": "cw-native-skill-hover", "skillId": "...", "x": 100, "y": 100 }` and `{ "type": "cw-native-hide-skill-tooltip" }` are handled too. For data-only UMG tooltips, call `cwNativeGetSkillTooltip(skillId)` or use the replicated `tooltip` object directly.
- The in-run Native menu should render all controls from `payload.native.menu.settings.controls`. When a WebView is available, apply changes through `cwNativeApplyGameSetting(id, value)` and refresh values through `cwNativeGetGameSettings()`.

Recommended UE mapping:

- `fx.unreal.niagaraSystem`: preferred Niagara System asset path to create or map.
- `fx.unreal.gameplayCue`: GameplayCue tag to trigger from the native renderer.
- `fx.colors.primary`, `secondary`, `accent`: material parameter colors.
- `fx.scale.radiusBase`, `radiusPerLevel`, `targetsBase`, `targetsPerLevel`: drive Niagara user parameters.
- `fx.layers`: art-direction checklist for the final Niagara stack.
- `fx.projectileFx.byKey["projectile.rocket"].unreal.engineFlame`: short nozzle flame parameters; use this instead of stretching the flame mesh/trail beyond the rocket body.
- `fx.projectileFx.byKey["projectile.rocket"].unreal.rotationSmoothing`: smooth the visual rocket orientation toward the velocity angle using shortest-arc interpolation instead of snapping to every replicated velocity update.
- `fx.projectileFx.byKey["projectile.rocket"].unreal.impactExplosion`: radial soft impact profile. Use a single radial-gradient billboard material, camera-facing sprites, view-depth sorting, and keep `disableFlipbook`, `disableSubUv`, `disableRibbonRenderer`, and `disableTiledSpriteSheets` enabled to avoid horizontal sprite-sheet banding.
- Rocket impact explosions should resolve the surface material from `state.decor.terrainZones`/`state.sceneTheme.baseMaterial` for ground hits, or from `objectImpactEvents[].material` for object hits. Use the `impactExplosion.surfaceDebris` and `impactExplosion.scorch` hints so asphalt throws dark flat chunks, dirt/grass throw clods upward, concrete throws pale gravel, and metal throws sparks/shards.

For melee profiles, use `fx.scale.range`, `width`, `arcDeg`, `cooldownMs`, `stunMs`, `knockback`, `chainTargets`, and `echoRadius` as Niagara user parameters.

For the violet XP Surge crystal:

- Idle pickup profile: `world.xp_vacuum`, style `violet_singularity_crystal`.
- Activation profile: `world.xp_surge_pull`, sent as a `worldFx` websocket event.
- Suggested UE stack: faceted crystal mesh, violet emissive material, rotating rune rings, cyan tethers to XP crystals, and a short player-attached pull ripple on pickup.

The server remains authoritative for gameplay. The renderer can freely improve Niagara, materials, camera shake and audio as long as it keys off the replicated `fxKey` and runtime geometry.
