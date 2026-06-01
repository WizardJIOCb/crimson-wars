# Crimson Wars Local AI 3D Pipeline

This pack keeps the character generation pipeline free and local-first. The current sheets in `public/assets/characters/*-pos.png` are used as references and as single-image inputs for the first mesh pass.

## Installed Local Tools

- Blender: `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`
- Python 3.10: `C:\Users\Rodion\AppData\Local\Programs\Python\Python310\python.exe`
- TripoSR repo: `C:\Projects\_local-ai3d\TripoSR`
- TripoSR venv: `C:\Projects\_local-ai3d\venvs\triposr`
- CUDA PyTorch: `torch 2.5.1+cu124`

TripoSR is the fast local reconstruction layer. It outputs a static mesh; it does not create a production skeletal rig by itself. The local copy is patched to use `scikit-image` marching cubes when `torchmcubes` cannot compile on Windows/CUDA 12.8.

## Character Inputs

The character spec is in `docs/ai3d/characters.production.json`.

Prepare cropped inputs:

```powershell
py -3.10 scripts/ai3d/prepare_ai3d_inputs.py --character all
```

Outputs go to:

```text
public/assets/characters/ai3d/inputs/
```

## Generate A First Mesh

Run TripoSR for one character:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai3d/run_triposr_character.ps1 -Character cyber
```

Useful lower-memory test:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai3d/run_triposr_character.ps1 -Character cyber -McResolution 96 -TextureResolution 1024
```

Generated files go to:

```text
public/assets/characters/ai3d/generated/triposr/<character>/0/
```

Open the in-project preview page:

```text
http://localhost:8080/ai3d-viewer.html
```

The preview page now opens the clean Blender kitbash prototypes by default. The raw TripoSR pass is still linked as `AI Raw` on the page for comparison.

Generate the clean local prototypes:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python scripts/ai3d/generate_kitbash_characters.py -- --character all
```

Generated kitbash files go to:

```text
public/assets/characters/ai3d/generated/kitbash/<character>/
```

Each kitbash character exports `.blend`, `.glb`, and `.fbx`. These are clean static game prototypes with a reference skeleton/action in the file, not final skinned production characters yet.

Bake the kitbash characters into the current web game's 2D sprite-sheet format:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python scripts/ai3d/bake_kitbash_sprites.py -- --character all
```

Generated sheets go to:

```text
public/assets/sprites/player_<character>_3d.png
```

The sheets are `512x256`, with `64x64` frames, 8 frames per direction, and rows ordered `up`, `left`, `down`, `right`.

Validate/import through Blender and create a preview GLB:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python scripts/ai3d/blender_validate_export.py -- --mesh public/assets/characters/ai3d/generated/triposr/cyber/0/mesh.obj --out-glb public/assets/characters/ai3d/generated/triposr/cyber/0/cyber-preview.glb
```

## Generate Starter PBR Maps

The TripoSR baked texture is only a starting point. The helper below creates starter maps for Unreal material blockout:

```powershell
py -3.10 scripts/ai3d/make_pbr_from_texture.py --character cyber --texture public/assets/characters/ai3d/generated/triposr/cyber/0/texture.png
```

Maps are written beside the texture in a `maps/` folder.

## Render Tripo3D Environment Sprites

Environment FBX exports from Studio Tripo3D live in the native project by default:

```text
C:\Projects\crimson-wars-native\Content\Objects
```

Render them into web-game PNG sprites:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python scripts/ai3d/render_tripo_environment_sprites.py -- --asset all
```

Generated map props go to:

```text
public/assets/map-props/tripo3d/
```

The generated tree sprite goes to:

```text
public/assets/sprites/tree_tripo3d.png
```

## Unreal Direction

For final animated characters:

- Convert the AI mesh into clean humanoid topology in Blender.
- Put all five characters on one UE5 Manny-compatible skeleton.
- Keep weapons, med case, injector, knives, backpack props as socket attachments.
- Use separate material slots for skin, hair, cloth, armor, emissive, weapon, and props.
- Export skeletal mesh as FBX in centimeters.
- Import textures as sRGB only for BaseColor and Emissive; Normal uses normal map compression; Roughness/Metallic/AO/Height are non-color data.

The AI pass is best for silhouette, armor detail ideas, and blockout. The skeletal animation pass is a Blender/Unreal rigging job after mesh cleanup.

## Source Tools

- TripoSR official repo: https://github.com/VAST-AI-Research/TripoSR
- Hunyuan3D 2.1 official repo for a heavier future PBR pipeline: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
