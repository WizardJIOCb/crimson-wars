import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[2]


ACCENTS = {
    "cyan": ("cyan",),
    "cyan_red": ("cyan", "red"),
    "red": ("red",),
    "green": ("green",),
    "blue": ("blue",),
}


def normalize_channel(values):
    values = values.astype(np.float32)
    low = float(np.percentile(values, 1))
    high = float(np.percentile(values, 99))
    if high <= low:
        return np.zeros_like(values, dtype=np.uint8)
    scaled = (values - low) / (high - low)
    return np.clip(scaled * 255.0, 0, 255).astype(np.uint8)


def accent_mask(rgb, accent_names):
    r = rgb[..., 0].astype(np.float32)
    g = rgb[..., 1].astype(np.float32)
    b = rgb[..., 2].astype(np.float32)
    masks = []
    for accent in accent_names:
        if accent == "cyan":
            masks.append((g > 120) & (b > 120) & (r < 120) & (np.abs(g - b) < 90))
        elif accent == "red":
            masks.append((r > 130) & (r > g * 1.35) & (r > b * 1.25))
        elif accent == "green":
            masks.append((g > 120) & (g > r * 1.25) & (g > b * 1.15))
        elif accent == "blue":
            masks.append((b > 120) & (b > r * 1.25) & (b > g * 1.1))
    if not masks:
        return np.zeros(rgb.shape[:2], dtype=bool)
    return np.logical_or.reduce(masks)


def normal_from_height(height, strength=3.5):
    h = height.astype(np.float32) / 255.0
    dy, dx = np.gradient(h)
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(h)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack((nx / length, ny / length, nz / length), axis=-1)
    return ((normal * 0.5 + 0.5) * 255.0).clip(0, 255).astype(np.uint8)


def make_maps(texture_path, character, accent, out_dir=None):
    texture_path = Path(texture_path)
    image = Image.open(texture_path).convert("RGB")
    rgb = np.asarray(image).astype(np.uint8)
    luminance = (
        rgb[..., 0].astype(np.float32) * 0.2126
        + rgb[..., 1].astype(np.float32) * 0.7152
        + rgb[..., 2].astype(np.float32) * 0.0722
    )

    max_channel = rgb.max(axis=-1).astype(np.float32)
    min_channel = rgb.min(axis=-1).astype(np.float32)
    saturation = np.zeros_like(max_channel, dtype=np.float32)
    np.divide(max_channel - min_channel, max_channel, out=saturation, where=max_channel > 0)
    accent_names = ACCENTS.get(accent, (accent,))
    glow = accent_mask(rgb, accent_names)

    blurred = np.asarray(Image.fromarray(luminance.astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)))
    detail = np.abs(luminance - blurred)
    height = normalize_channel(blurred * 0.7 + detail * 1.7)
    normal = normal_from_height(height)

    roughness = np.full(luminance.shape, 172, dtype=np.float32)
    roughness -= np.clip(luminance - 90, 0, 130) * 0.35
    roughness += (saturation < 0.18) * 18
    roughness[glow] = 38
    roughness = np.clip(roughness, 35, 235).astype(np.uint8)

    metallic = np.where((saturation < 0.28) & (luminance > 35) & (luminance < 215), 205, 22)
    metallic[glow] = 0
    metallic = metallic.astype(np.uint8)

    ao = np.clip(235 - (255 - luminance) * 0.28 - detail * 0.65, 45, 245).astype(np.uint8)
    emissive = np.zeros_like(rgb)
    emissive[glow] = rgb[glow]

    if out_dir is None:
        out_dir = texture_path.parent / "maps"
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    base_name = character
    Image.fromarray(rgb).save(out_dir / f"{base_name}_BaseColor.png")
    Image.fromarray(normal).save(out_dir / f"{base_name}_Normal.png")
    Image.fromarray(roughness, mode="L").save(out_dir / f"{base_name}_Roughness.png")
    Image.fromarray(metallic, mode="L").save(out_dir / f"{base_name}_Metallic.png")
    Image.fromarray(ao, mode="L").save(out_dir / f"{base_name}_AO.png")
    Image.fromarray(height, mode="L").save(out_dir / f"{base_name}_Height.png")
    Image.fromarray(emissive).save(out_dir / f"{base_name}_Emissive.png")
    return out_dir


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", required=True)
    parser.add_argument("--texture", required=True)
    parser.add_argument("--accent", default="")
    parser.add_argument("--out-dir", default="")
    args = parser.parse_args()

    accent = args.accent
    if not accent:
        import json

        config_path = ROOT / "docs" / "ai3d" / "characters.production.json"
        with config_path.open("r", encoding="utf-8") as handle:
            config = json.load(handle)
        accent = config["characters"][args.character]["accent"]

    out_dir = args.out_dir or None
    written = make_maps(args.texture, args.character, accent, out_dir)
    print(written)


if __name__ == "__main__":
    main()
