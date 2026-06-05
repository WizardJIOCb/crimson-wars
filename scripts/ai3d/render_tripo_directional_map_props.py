import argparse
import math
import shutil
import sys
from array import array
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import render_tripo_environment_sprites as base


ROOT = base.ROOT
DEFAULT_SOURCE_ROOT = base.DEFAULT_SOURCE_ROOT
MAP_PROP_OUT = base.MAP_PROP_OUT
DEFAULT_FRAMES = 8
DEFAULT_COLUMNS = 4
DEFAULT_CAMERA = (-6.0, -7.0, 4.4)


def prop_spec(folder, width=768, height=512, fill=0.82, camera=DEFAULT_CAMERA, directional=True):
    return {
        "folder": folder,
        "out": MAP_PROP_OUT / "{key}.png",
        "sheet": MAP_PROP_OUT / "{key}_directions.png",
        "resolution": (int(width), int(height)),
        "camera": camera,
        "fill": float(fill),
        "directional": bool(directional),
    }


ASSETS = {
    "barrier": prop_spec("concrete+barrier+3d+model", 640, 288, 0.9, (-5.5, -6.2, 3.4)),
    "shopping_cart_barricade": prop_spec("rusty+shopping+cart+3d+model", 640, 384, 0.88, (-5.3, -6.2, 3.5)),
    "mall_block": prop_spec("ruined+storefront+3d+model", 896, 448, 0.62, (-6.2, -7.0, 4.2)),
    "clinic_block": prop_spec("clinic+building+3d+model", 896, 448, 0.8, (-6.0, -7.0, 4.4)),
    "industrial_tank": prop_spec("steampunk+reactor+3d+model", 768, 672, 0.84, (-5.8, -6.6, 4.4)),
    "reactor_block": prop_spec("industrial+facility+3d+model", 896, 512, 0.82, (-6.2, -7.0, 4.6)),
    "build_1": prop_spec("abandoned+building+3d+model", 768, 768, 0.82),
    "build_2": prop_spec("rusty+gas+station+3d+model", 768, 768, 0.84, (-6.0, -7.0, 4.6)),
    "build_3": prop_spec("haunted+house+3d+model", 768, 768, 0.82),
    "build_4": prop_spec("industrial+factory+3d+model", 896, 768, 0.82),
    "build_5": prop_spec("clinic+building+3d+model", 768, 768, 0.82),
    "build_6": prop_spec("cyberpunk+storefront+3d+model", 768, 768, 0.8),
    "build_7": prop_spec("ruined+sci-fi+facility+3d+model", 768, 768, 0.82),
    "abandoned_building": prop_spec("abandoned+building+3d+model", 768, 576, 0.82),
    "abandoned_building_1": prop_spec("abandoned+building+3d+model (1)", 768, 576, 0.82),
    "abandoned_building_2": prop_spec("abandoned+building+3d+model (2)", 768, 576, 0.82),
    "abandoned_gas_station": prop_spec("abandoned+gas+station+3d+model", 896, 576, 0.82),
    "cyberpunk_storefront": prop_spec("cyberpunk+storefront+3d+model", 896, 512, 0.82),
    "futuristic_barrier": prop_spec("futuristic+barrier+3d+model", 640, 320, 0.9, (-5.5, -6.2, 3.4)),
    "futuristic_vending_machine": prop_spec("futuristic+vending+machine+3d+model", 512, 640, 0.86, (-5.4, -6.2, 3.8)),
    "glowing_twisted_tree": prop_spec("glowing+twisted+tree+3d+model", 640, 768, 0.86, (-5.2, -6.0, 4.4)),
    "gnarled_tree": prop_spec("gnarled+tree+3d+model", 640, 768, 0.86, (-5.2, -6.0, 4.4)),
    "haunted_house": prop_spec("haunted+house+3d+model", 896, 672, 0.82),
    "industrial_facility": prop_spec("industrial+facility+3d+model", 896, 576, 0.82, (-6.2, -7.0, 4.6)),
    "industrial_factory": prop_spec("industrial+factory+3d+model", 896, 576, 0.82),
    "ruined_sci_fi_facility": prop_spec("ruined+sci-fi+facility+3d+model", 896, 576, 0.82),
    "ruined_storefront": prop_spec("ruined+storefront+3d+model", 896, 512, 0.82, (-6.2, -7.0, 4.2)),
    "rusty_gas_station": prop_spec("rusty+gas+station+3d+model", 896, 576, 0.84, (-6.0, -7.0, 4.6)),
    "rusty_shopping_cart": prop_spec("rusty+shopping+cart+3d+model", 640, 384, 0.88, (-5.3, -6.2, 3.5)),
    "steampunk_reactor": prop_spec("steampunk+reactor+3d+model", 768, 512, 0.84, (-5.8, -6.6, 4.4)),
    "toxic_waste_barrels": prop_spec("toxic+waste+barrels+3d+model", 640, 512, 0.86),
    "bus_yellow": prop_spec("abandoned+bus+3d+model", 768, 384, 0.76, (-6.0, -7.0, 4.2), False),
    "abandoned_bus": prop_spec("abandoned+bus+3d+model", 768, 384, 0.76, (-6.0, -7.0, 4.2), False),
    "ambulance": prop_spec("military+ambulance+3d+model", 640, 384, 0.52, (-5.5, -6.4, 3.7), False),
    "military_ambulance": prop_spec("military+ambulance+3d+model", 640, 384, 0.52, (-5.5, -6.4, 3.7), False),
    "futuristic_police_vehicle": prop_spec("futuristic+police+vehicle+3d+model", 640, 384, 0.54, (-5.5, -6.4, 3.7), False),
    "post_apocalyptic_car": prop_spec("post+apocalyptic+car+3d+model", 640, 384, 0.54, (-5.5, -6.4, 3.7), False),
    "wrecked_police_car": prop_spec("wrecked+police+car+3d+model", 640, 384, 0.54, (-5.5, -6.4, 3.7), False),
}


def log(message):
    print(message, flush=True)


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", default=str(DEFAULT_SOURCE_ROOT))
    parser.add_argument("--asset", default="all", choices=["all", *ASSETS.keys()])
    parser.add_argument("--frames", type=int, default=DEFAULT_FRAMES)
    parser.add_argument("--columns", type=int, default=DEFAULT_COLUMNS)
    parser.add_argument("--samples", type=int, default=24)
    parser.add_argument("--yaw-sign", type=int, default=1, choices=[-1, 1])
    parser.add_argument("--keep-frames", action="store_true")
    return parser.parse_args(argv)


def make_rotation_root():
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.object
    root.name = "directional_sprite_root"
    inv = root.matrix_world.inverted()
    for obj in base.mesh_objects():
        obj.parent = root
        obj.matrix_parent_inverse = inv
    return root


def projected_spans(camera):
    inv = camera.matrix_world.inverted()
    projected = []
    for obj in base.mesh_objects():
        for corner in obj.bound_box:
            projected.append(inv @ (obj.matrix_world @ Vector(corner)))
    return (
        max(p.x for p in projected) - min(p.x for p in projected),
        max(p.y for p in projected) - min(p.y for p in projected),
    )


def setup_directional_camera(spec, root, frames, yaw_sign):
    scene = bpy.context.scene
    objects = base.mesh_objects()
    min_v, max_v = base.object_bbox_world(objects)
    center = (min_v + max_v) * 0.5
    size = max((max_v - min_v).length, 0.01)
    target = Vector((center.x, center.y, center.z))
    camera_location = Vector(spec["camera"])
    camera_location.normalize()
    camera_location *= max(5.0, size * 1.75)

    bpy.ops.object.camera_add(location=camera_location)
    camera = bpy.context.object
    camera.name = "directional_sprite_camera"
    camera.data.type = "ORTHO"
    camera.data.clip_start = 0.01
    camera.data.clip_end = max(100.0, size * 8.0)
    scene.camera = camera
    base.look_at(camera, target)

    aspect = spec["resolution"][0] / max(1, spec["resolution"][1])
    fill = max(0.28, min(0.72, float(spec.get("fill", 0.84)) * 0.72))
    max_span_x = 0.01
    max_span_y = 0.01
    original_z = root.rotation_euler.z
    for frame in range(max(1, int(frames))):
        root.rotation_euler.z = yaw_sign * ((math.pi * 2 * frame) / max(1, int(frames)))
        bpy.context.view_layer.update()
        span_x, span_y = projected_spans(camera)
        max_span_x = max(max_span_x, span_x)
        max_span_y = max(max_span_y, span_y)
    root.rotation_euler.z = original_z
    bpy.context.view_layer.update()

    camera.data.ortho_scale = max(max_span_y / fill, max_span_x / (aspect * fill), 0.1)
    return size


def render_frame(root, frame, frames, yaw_sign, out_path):
    root.rotation_euler.z = yaw_sign * ((math.pi * 2 * frame) / max(1, int(frames)))
    bpy.context.view_layer.update()
    bpy.context.scene.render.filepath = str(out_path)
    bpy.ops.render.render(write_still=True)


def resolve_out_path(value, key):
    return Path(str(value).format(key=key))


def compose_sheet(frame_paths, out_path, columns):
    if not frame_paths:
        return
    first = bpy.data.images.load(str(frame_paths[0]), check_existing=False)
    frame_w = int(first.size[0])
    frame_h = int(first.size[1])
    bpy.data.images.remove(first)
    frames = len(frame_paths)
    columns = max(1, min(int(columns), frames))
    rows = int(math.ceil(frames / columns))
    sheet_w = frame_w * columns
    sheet_h = frame_h * rows
    sheet_pixels = array("f", [0.0]) * (sheet_w * sheet_h * 4)
    frame_pixels = array("f", [0.0]) * (frame_w * frame_h * 4)

    for frame, frame_path in enumerate(frame_paths):
        img = bpy.data.images.load(str(frame_path), check_existing=False)
        img.pixels.foreach_get(frame_pixels)
        tile_x = frame % columns
        visual_row = frame // columns
        tile_y = rows - 1 - visual_row
        for row in range(frame_h):
            src_start = row * frame_w * 4
            src_end = src_start + frame_w * 4
            dst_start = ((tile_y * frame_h + row) * sheet_w + tile_x * frame_w) * 4
            sheet_pixels[dst_start:dst_start + frame_w * 4] = frame_pixels[src_start:src_end]
        bpy.data.images.remove(img)

    sheet = bpy.data.images.new(out_path.stem, width=sheet_w, height=sheet_h, alpha=True, float_buffer=False)
    sheet.pixels.foreach_set(sheet_pixels)
    sheet.filepath_raw = str(out_path)
    sheet.file_format = "PNG"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save()
    bpy.data.images.remove(sheet)


def import_asset(asset_key, spec, source_root, samples):
    asset_root = source_root / spec["folder"]
    fbx = base.find_fbx(asset_root)
    log(f"{asset_key}: importing {fbx}")
    base.clear_scene()
    bpy.ops.import_scene.fbx(filepath=str(fbx), use_image_search=True)
    base.remove_imported_helpers()
    if not base.mesh_objects():
        raise RuntimeError(f"No mesh objects imported from {fbx}")

    mat = base.make_tripo_material(asset_key, asset_root)
    base.assign_material_to_meshes(mat)
    base.normalize_model()
    base.setup_render(*spec["resolution"], samples)
    min_v, max_v = base.object_bbox_world(base.mesh_objects())
    bounds_size = max((max_v - min_v).length, 0.01)
    base.setup_lights(bounds_size)
    root = make_rotation_root()
    return root


def render_asset(asset_key, spec, source_root, frames, columns, samples, yaw_sign, keep_frames):
    root = import_asset(asset_key, spec, source_root, samples)
    out_path = resolve_out_path(spec["out"], asset_key)
    sheet_path = resolve_out_path(spec["sheet"], asset_key)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    frame_root = MAP_PROP_OUT / "_direction_frames" / asset_key
    if frame_root.exists():
        shutil.rmtree(frame_root)
    frame_root.mkdir(parents=True, exist_ok=True)

    if not spec.get("directional", True):
        setup_directional_camera(spec, root, 1, yaw_sign)
        render_frame(root, 0, 1, yaw_sign, out_path)
        log(f"{asset_key}: wrote {out_path.relative_to(ROOT).as_posix()}")
        if not keep_frames:
            shutil.rmtree(frame_root, ignore_errors=True)
        return

    setup_directional_camera(spec, root, frames, yaw_sign)
    frame_paths = []
    for frame in range(max(1, int(frames))):
        frame_path = frame_root / f"{asset_key}_{frame:02d}.png"
        render_frame(root, frame, frames, yaw_sign, frame_path)
        frame_paths.append(frame_path)
        if frame == 0:
            shutil.copyfile(frame_path, out_path)

    compose_sheet(frame_paths, sheet_path, columns)
    log(f"{asset_key}: wrote {out_path.relative_to(ROOT).as_posix()}")
    log(f"{asset_key}: wrote {sheet_path.relative_to(ROOT).as_posix()}")
    if not keep_frames:
        shutil.rmtree(frame_root, ignore_errors=True)


def main():
    args = parse_args()
    source_root = Path(args.source_root)
    selected = ASSETS.keys() if args.asset == "all" else [args.asset]
    frames = max(1, int(args.frames))
    columns = max(1, int(args.columns))
    samples = max(1, int(args.samples))
    for asset_key in selected:
        render_asset(
            asset_key,
            ASSETS[asset_key],
            source_root,
            frames,
            columns,
            samples,
            int(args.yaw_sign),
            bool(args.keep_frames),
        )


if __name__ == "__main__":
    main()
