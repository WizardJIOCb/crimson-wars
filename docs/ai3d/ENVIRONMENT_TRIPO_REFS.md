# Environment Tripo3D Reference Images

Generated source images for Tripo3D image-to-3D environment models.

Source folder:

```text
public/assets/environment/tripo-refs/
```

Recommended Tripo3D settings:

- Use one image per generation.
- Prefer HD model for buildings, vehicles, and chunky props.
- Keep topology as triangle output first, then simplify after export if needed.
- If the generated mesh includes background residue, crop the image tighter and retry.
- Avoid using images with multiple disconnected props unless they are meant to become one combined object.

## Starter Pack

| File | Intended level use |
| --- | --- |
| `mall-entrance-block.png` | Mall campaign building block, parking lot edge, food court entrance |
| `clinic-reception-block.png` | Clinic yard main building, quarantine reception, ambulance bay |
| `ringroad-gas-station-checkpoint.png` | Ringroad/gas station building, fuel stop landmark |
| `reactor-control-block.png` | Reactor sprawl landmark, industrial blocker, mission objective |
| `ambulance-van-prop.png` | Clinic yard vehicle, road blocker, destructible cover |
| `burned-city-bus-prop.png` | Mall parking lot / ringroad blocker |
| `toxic-storage-tank-prop.png` | Reactor prop, industrial cover, hazard objective |
| `concrete-road-barrier-prop.png` | Generic cover and lane blocker |
| `shopping-cart-barricade-prop.png` | Mall-specific cover / barricade |
| `dead-roadside-tree-prop.png` | Generic organic prop for map variation |

## Prompt Pattern

Use this pattern for future Tripo input images:

```text
Create a single isolated asset reference image for Tripo3D image-to-3D conversion.
Subject: [one clear object only].
Style: semi-realistic stylized 3D game asset concept render for Crimson Wars, PBR-like materials, gritty post-apocalyptic tone.
Composition: 3/4 front isometric view, centered, full object visible, generous padding, readable silhouette.
Lighting: neutral studio lighting, soft shadow.
Background: plain off-white.
Constraints: no characters, no zombies, no gore, no legible text, no logos, no watermark, no full environment scene, avoid tiny floating parts.
```
