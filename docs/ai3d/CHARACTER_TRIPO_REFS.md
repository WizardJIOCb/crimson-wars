# Character Tripo3D Reference Images

Generated single-character reference images for Tripo3D image-to-3D hero modeling.

Source folder:

```text
public/assets/characters/ai3d/tripo-refs/
```

## Files

| Hero | File | Notes |
| --- | --- | --- |
| Cyber | `cyber-tripo-ref.png` | Heavy cybernetic assault trooper, black armor, cyan/red emissive details |
| Medis | `medis-tripo-ref.png` | Battlefield medic, white armor panels, cyan medical emissive details |
| Raider | `raider-tripo-ref.png` | Heavy raider, skull pauldrons, red emissive core |
| Scout | `scout-tripo-ref.png` | Hooded marksman, green optics, long rifle |
| Shadow | `shadow-tripo-ref.png` | Hooded assassin, mask, blue emissive knives |

## Tripo3D Usage

- Upload one hero image per generation.
- Do not upload a combined five-character lineup if the goal is five separate hero models.
- Use the HD model path for first-pass characters.
- Keep weapons and backpacks as part of the first mesh only for blockout. For production animation, rebuild weapons, med case, backpack, knives, and rifles as socket attachments.
- If Tripo fuses the weapon too tightly into the arm, regenerate a cleaner reference with the weapon moved lower or export the weapon as a separate prop.

## Prompt Pattern

```text
Create one clean full-body character reference image for Tripo3D image-to-3D conversion.
Subject: [one hero only].
Style: semi-realistic stylized 3D game character concept render, game-ready PBR materials, gritty Crimson Wars sci-fi survival tone.
Composition: exactly one character, full body visible, centered, front 3/4 view, neutral A-pose, arms slightly away from torso, legs slightly apart, generous padding.
Lighting: neutral studio lighting, soft floor shadow.
Background: plain off-white.
Constraints: no multiple views, no other heroes, no extra characters, no zombies, no environment scene, no UI, no text, no logo, no watermark, no gore.
```
