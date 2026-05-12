import argparse
import math
import sys
from tempfile import TemporaryDirectory
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[2]
KITBASH_ROOT = ROOT / "public" / "assets" / "characters" / "ai3d" / "generated" / "kitbash"
SPRITE_ROOT = ROOT / "public" / "assets" / "sprites"

FRAME_W = 64
FRAME_H = 64
FRAMES = 8
ROWS = [
    ("up", math.pi * 0.5),
    ("left", math.pi),
    ("down", -math.pi * 0.5),
    ("right", 0.0),
]

CHARACTERS = {
    "cyber": {"source": "cyber", "out": "player_cyber_3d.png", "ortho": 2.45},
    "scout": {"source": "scout", "out": "player_scout_3d.png", "ortho": 2.35},
    "shadow": {"source": "shadow", "out": "player_shadow_3d.png", "ortho": 2.35},
    "medic": {"source": "medis", "out": "player_medic_3d.png", "ortho": 2.35},
    "raider": {"source": "raider", "out": "player_raider_3d.png", "ortho": 2.5},
}


def log(message):
    print(message, flush=True)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_scene(ortho_scale):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.show_shadows = True
    scene.render.resolution_x = FRAME_W
    scene.render.resolution_y = FRAME_H
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.frame_start = 1
    scene.frame_end = FRAMES
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1

    camera = scene.camera
    if camera is None:
        bpy.ops.object.camera_add()
        camera = bpy.context.object
        scene.camera = camera
    camera.name = "sprite_bake_camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale
    camera.location = (0, -4.2, 1.58)
    look_at(camera, (0, 0, 1.03))

    for obj in list(scene.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)

    bpy.ops.object.light_add(type="AREA", location=(0, -3.2, 3.8))
    key = bpy.context.object
    key.name = "sprite_key_light"
    key.data.energy = 520
    key.data.size = 3.8

    bpy.ops.object.light_add(type="POINT", location=(-2.3, 1.8, 2.2))
    fill = bpy.context.object
    fill.name = "sprite_fill_light"
    fill.data.energy = 85
    fill.data.color = (0.45, 0.78, 1.0)


def sync_workbench_material_colors():
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if not bsdf:
            continue
        base = bsdf.inputs.get("Base Color")
        if base:
            mat.diffuse_color = base.default_value


def collect_render_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type in {"MESH", "CURVE"}]


def side_sign(bone_name):
    if bone_name.endswith(".L"):
        return -1
    if bone_name.endswith(".R"):
        return 1
    return 0


def rotate_around(pivot, angle):
    return (
        Matrix.Translation(Vector(pivot))
        @ Matrix.Rotation(angle, 4, "X")
        @ Matrix.Translation(-Vector(pivot))
    )


def pose_matrix_for(obj, phase):
    bone = str(obj.get("intended_bone", ""))
    sign = side_sign(bone)
    if not sign:
        return Matrix.Identity(4)

    if bone.startswith(("upper_arm", "forearm", "hand")):
        arm_phase = phase if sign > 0 else -phase
        pivot = (sign * 0.43, 0.0, 1.49)
        return rotate_around(pivot, math.radians(10.0) * arm_phase)

    if bone.startswith(("thigh", "shin", "foot")):
        leg_phase = -phase if sign > 0 else phase
        pivot = (sign * 0.16, 0.0, 0.84)
        return rotate_around(pivot, math.radians(8.0) * leg_phase)

    return Matrix.Identity(4)


def apply_pose(render_objects, base_matrices, row_angle, frame_index):
    phase = math.sin((frame_index / FRAMES) * math.tau)
    bob = 0.018 * (1.0 - math.cos((frame_index / FRAMES) * math.tau * 2.0))
    root = Matrix.Rotation(row_angle, 4, "Z") @ Matrix.Translation((0, 0, bob))
    for obj in render_objects:
        base = base_matrices[obj.name]
        obj.matrix_world = root @ pose_matrix_for(obj, phase) @ base


def render_frame_pixels(temp_path):
    bpy.context.scene.render.filepath = str(temp_path)
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(str(temp_path), check_existing=False)
    pixels = list(image.pixels)
    size = (int(image.size[0]), int(image.size[1]))
    bpy.data.images.remove(image)
    return pixels, size[0], size[1]


def paste_frame(sheet_pixels, frame_data, col, row):
    frame_pixels, frame_w, frame_h = frame_data
    sheet_w = FRAME_W * FRAMES
    x0 = col * FRAME_W
    y0 = row * FRAME_H
    copy_w = min(FRAME_W, frame_w)
    copy_h = min(FRAME_H, frame_h)
    x_pad = max(0, (FRAME_W - copy_w) // 2)
    y_pad = max(0, (FRAME_H - copy_h) // 2)
    for y in range(copy_h):
        for x in range(copy_w):
            src = ((y * frame_w) + x) * 4
            dst = (((y0 + y) * sheet_w) + (x0 + x)) * 4
            src_pixel = frame_pixels[src:src + 4]
            if len(src_pixel) == 4:
                dst = (((y0 + y + y_pad) * sheet_w) + (x0 + x + x_pad)) * 4
                sheet_pixels[dst:dst + 4] = src_pixel


def bake_character(character_id, spec):
    blend_path = KITBASH_ROOT / spec["source"] / f"{spec['source']}.blend"
    if not blend_path.exists():
        raise SystemExit(f"Missing kitbash blend: {blend_path}")
    bpy.ops.wm.open_mainfile(filepath=str(blend_path))
    sync_workbench_material_colors()
    setup_scene(spec["ortho"])
    render_objects = collect_render_objects()
    base_matrices = {obj.name: obj.matrix_world.copy() for obj in render_objects}
    sheet_w = FRAME_W * FRAMES
    sheet_h = FRAME_H * len(ROWS)
    sheet_pixels = [0.0] * (sheet_w * sheet_h * 4)

    with TemporaryDirectory(prefix=f"cw_{character_id}_sprite_") as temp_dir:
        temp_root = Path(temp_dir)
        for row_index, (row_name, row_angle) in enumerate(ROWS):
            for frame_index in range(FRAMES):
                apply_pose(render_objects, base_matrices, row_angle, frame_index)
                temp_path = temp_root / f"{row_name}_{frame_index:02d}.png"
                paste_frame(sheet_pixels, render_frame_pixels(temp_path), frame_index, row_index)

    image = bpy.data.images.new(f"{character_id}_sprite_sheet", width=sheet_w, height=sheet_h, alpha=True)
    image.pixels.foreach_set(sheet_pixels)
    image.file_format = "PNG"
    SPRITE_ROOT.mkdir(parents=True, exist_ok=True)
    out_path = SPRITE_ROOT / spec["out"]
    image.save_render(filepath=str(out_path))
    log(f"{character_id}: {out_path.relative_to(ROOT).as_posix()}")


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", default="all", choices=["all", *CHARACTERS.keys()])
    return parser.parse_args(argv)


def main():
    args = parse_args()
    selected = CHARACTERS.keys() if args.character == "all" else [args.character]
    for character_id in selected:
        bake_character(character_id, CHARACTERS[character_id])


if __name__ == "__main__":
    main()
