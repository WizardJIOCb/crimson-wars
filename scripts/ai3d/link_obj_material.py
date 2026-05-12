import argparse
from pathlib import Path


def write_mtl(mesh_path, character):
    mesh_path = Path(mesh_path)
    material_name = f"{character}_PBR"
    mtl_path = mesh_path.with_suffix(".mtl")
    maps_dir = "maps"

    mtl = "\n".join(
        [
            f"newmtl {material_name}",
            "Ka 1.000 1.000 1.000",
            "Kd 1.000 1.000 1.000",
            "Ks 0.180 0.180 0.180",
            "Ns 128.000",
            "d 1.000",
            "illum 2",
            "map_Kd texture.png",
            f"map_Bump {maps_dir}/{character}_Normal.png",
            f"map_Pr {maps_dir}/{character}_Roughness.png",
            f"map_Pm {maps_dir}/{character}_Metallic.png",
            f"map_Ke {maps_dir}/{character}_Emissive.png",
            "",
        ]
    )
    mtl_path.write_text(mtl, encoding="utf-8")
    return mtl_path, material_name


def patch_obj(mesh_path, mtl_path, material_name):
    mesh_path = Path(mesh_path)
    lines = mesh_path.read_text(encoding="utf-8").splitlines()

    if not any(line.startswith("mtllib ") for line in lines):
        lines.insert(0, f"mtllib {mtl_path.name}")

    if not any(line.startswith("usemtl ") for line in lines):
        for index, line in enumerate(lines):
            if line.startswith("f "):
                lines.insert(index, f"usemtl {material_name}")
                break

    mesh_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", required=True)
    parser.add_argument("--mesh", required=True)
    args = parser.parse_args()

    mtl_path, material_name = write_mtl(args.mesh, args.character)
    patch_obj(args.mesh, mtl_path, material_name)
    print(mtl_path)


if __name__ == "__main__":
    main()
