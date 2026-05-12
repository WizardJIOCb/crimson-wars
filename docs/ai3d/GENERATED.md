# Generated Local Prototype Assets

## Clean Blender Kitbash Prototypes

These are the current viewer/game-preview models. They are procedural Blender kitbash characters with readable silhouettes, materials, weapons/props, exported as `.blend`, `.glb`, and `.fbx`.

| Character | Vertices | Faces | Meshes | GLB | FBX | Blend |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Cyber | 3929 | 4001 | 65 | `public/assets/characters/ai3d/generated/kitbash/cyber/cyber.glb` | `public/assets/characters/ai3d/generated/kitbash/cyber/cyber.fbx` | `public/assets/characters/ai3d/generated/kitbash/cyber/cyber.blend` |
| Medis | 3278 | 3284 | 59 | `public/assets/characters/ai3d/generated/kitbash/medis/medis.glb` | `public/assets/characters/ai3d/generated/kitbash/medis/medis.fbx` | `public/assets/characters/ai3d/generated/kitbash/medis/medis.blend` |
| Raider | 4379 | 4473 | 68 | `public/assets/characters/ai3d/generated/kitbash/raider/raider.glb` | `public/assets/characters/ai3d/generated/kitbash/raider/raider.fbx` | `public/assets/characters/ai3d/generated/kitbash/raider/raider.blend` |
| Scout | 3430 | 3424 | 55 | `public/assets/characters/ai3d/generated/kitbash/scout/scout.glb` | `public/assets/characters/ai3d/generated/kitbash/scout/scout.fbx` | `public/assets/characters/ai3d/generated/kitbash/scout/scout.blend` |
| Shadow | 3274 | 3270 | 54 | `public/assets/characters/ai3d/generated/kitbash/shadow/shadow.glb` | `public/assets/characters/ai3d/generated/kitbash/shadow/shadow.fbx` | `public/assets/characters/ai3d/generated/kitbash/shadow/shadow.blend` |

Preview them at:

```text
http://localhost:8080/ai3d-viewer.html
```

## Baked Game Sprite Sheets

These are generated from the kitbash `.blend` files for the current web game renderer.

| Character | Sprite sheet | Layout |
| --- | --- | --- |
| Cyber | `public/assets/sprites/player_cyber_3d.png` | `512x256`, `64x64`, 8 frames x 4 directions |
| Scout | `public/assets/sprites/player_scout_3d.png` | `512x256`, `64x64`, 8 frames x 4 directions |
| Shadow | `public/assets/sprites/player_shadow_3d.png` | `512x256`, `64x64`, 8 frames x 4 directions |
| Medic | `public/assets/sprites/player_medic_3d.png` | `512x256`, `64x64`, 8 frames x 4 directions |
| Raider | `public/assets/sprites/player_raider_3d.png` | `512x256`, `64x64`, 8 frames x 4 directions |

## Raw TripoSR Meshes

Generated with local TripoSR at `mc-resolution=96` and `texture-resolution=1024`.

| Character | Vertices | Faces | Mesh | Preview |
| --- | ---: | ---: | --- | --- |
| Cyber | 6953 | 8094 | `public/assets/characters/ai3d/generated/triposr/cyber/0/mesh.obj` | `public/assets/characters/ai3d/generated/triposr/cyber/0/cyber-preview.glb` |
| Medis | 6216 | 7604 | `public/assets/characters/ai3d/generated/triposr/medis/0/mesh.obj` | `public/assets/characters/ai3d/generated/triposr/medis/0/medis-preview.glb` |
| Raider | 7157 | 8708 | `public/assets/characters/ai3d/generated/triposr/raider/0/mesh.obj` | `public/assets/characters/ai3d/generated/triposr/raider/0/raider-preview.glb` |
| Scout | 5051 | 6364 | `public/assets/characters/ai3d/generated/triposr/scout/0/mesh.obj` | `public/assets/characters/ai3d/generated/triposr/scout/0/scout-preview.glb` |
| Shadow | 5201 | 6784 | `public/assets/characters/ai3d/generated/triposr/shadow/0/mesh.obj` | `public/assets/characters/ai3d/generated/triposr/shadow/0/shadow-preview.glb` |

Each character folder also contains:

- `texture.png`
- `mesh.mtl`
- `maps/<character>_BaseColor.png`
- `maps/<character>_Normal.png`
- `maps/<character>_Roughness.png`
- `maps/<character>_Metallic.png`
- `maps/<character>_AO.png`
- `maps/<character>_Height.png`
- `maps/<character>_Emissive.png`

These are static prototype meshes. They are useful for inspection, blockout, and material exploration. For Unreal skeletal animation, the next pass is retopology plus a Manny-compatible rig in Blender/Unreal.
