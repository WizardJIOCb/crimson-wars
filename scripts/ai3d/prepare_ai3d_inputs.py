import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "docs" / "ai3d" / "characters.production.json"
OUTPUT_DIR = ROOT / "public" / "assets" / "characters" / "ai3d" / "inputs"


def load_config():
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def square_pad(image, fill=(127, 127, 127)):
    width, height = image.size
    side = max(width, height)
    padded = Image.new("RGB", (side, side), fill)
    offset = ((side - width) // 2, (side - height) // 2)
    padded.paste(image.convert("RGB"), offset)
    return padded


def prepare_character(character_id, spec):
    source = ROOT / spec["sourceImage"]
    crop_box = tuple(spec["triposrCrop"])
    image = Image.open(source).convert("RGB")
    cropped = image.crop(crop_box)
    cropped = ImageOps.expand(cropped, border=24, fill=(127, 127, 127))
    output = square_pad(cropped).resize((1024, 1024), Image.Resampling.LANCZOS)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{character_id}-triposr-input.png"
    output.save(output_path)
    return output_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", default="all", help="Character id or all.")
    args = parser.parse_args()

    config = load_config()
    characters = config["characters"]
    selected = characters.keys() if args.character == "all" else [args.character]

    for character_id in selected:
        if character_id not in characters:
            raise SystemExit(f"Unknown character: {character_id}")
        output_path = prepare_character(character_id, characters[character_id])
        print(f"{character_id}: {output_path}")


if __name__ == "__main__":
    main()
