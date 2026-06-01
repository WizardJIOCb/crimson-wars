import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_ROOT = Path(r"C:\Projects\crimson-wars-native\Content\Objects")
MAP_PROP_OUT = ROOT / "public" / "assets" / "map-props" / "tripo3d"
SPRITE_OUT = ROOT / "public" / "assets" / "sprites"


ASSETS = {
    "abandoned_bus": {
        "folder": "abandoned+bus+3d+model",
        "out": MAP_PROP_OUT / "bus_yellow.png",
        "resolution": (1152, 512),
        "camera": (-6.0, -7.0, 4.2),
        "fill": 0.45,
    },
    "clinic_building": {
        "folder": "clinic+building+3d+model",
        "out": MAP_PROP_OUT / "clinic_block.png",
        "resolution": (1280, 640),
        "camera": (-6.0, -7.0, 4.4),
        "fill": 0.82,
    },
    "concrete_barrier": {
        "folder": "concrete+barrier+3d+model",
        "out": MAP_PROP_OUT / "barrier.png",
        "resolution": (1024, 384),
        "camera": (-5.5, -6.2, 3.4),
        "fill": 0.88,
    },
    "gnarled_tree": {
        "folder": "gnarled+tree+3d+model",
        "out": SPRITE_OUT / "tree_tripo3d.png",
        "resolution": (640, 896),
        "camera": (-5.2, -6.0, 4.4),
        "fill": 0.86,
    },
    "industrial_facility": {
        "folder": "industrial+facility+3d+model",
        "out": MAP_PROP_OUT / "reactor_block.png",
        "resolution": (1152, 672),
        "camera": (-6.2, -7.0, 4.6),
        "fill": 0.82,
    },
    "military_ambulance": {
        "folder": "military+ambulance+3d+model",
        "out": MAP_PROP_OUT / "ambulance.png",
        "resolution": (1024, 576),
        "camera": (-5.5, -6.4, 3.7),
        "fill": 0.48,
    },
    "ruined_storefront": {
        "folder": "ruined+storefront+3d+model",
        "out": MAP_PROP_OUT / "mall_block.png",
        "resolution": (1536, 672),
        "camera": (-6.2, -7.0, 4.2),
        "fill": 0.55,
    },
    "rusty_gas_station": {
        "folder": "rusty+gas+station+3d+model",
        "out": MAP_PROP_OUT / "build_2.png",
        "resolution": (1024, 1024),
        "camera": (-6.0, -7.0, 4.6),
        "fill": 0.82,
    },
    "rusty_shopping_cart": {
        "folder": "rusty+shopping+cart+3d+model",
        "out": MAP_PROP_OUT / "shopping_cart_barricade.png",
        "resolution": (1024, 512),
        "camera": (-5.3, -6.2, 3.5),
        "fill": 0.86,
    },
    "steampunk_reactor": {
        "folder": "steampunk+reactor+3d+model",
        "out": MAP_PROP_OUT / "industrial_tank.png",
        "resolution": (1024, 896),
        "camera": (-5.8, -6.6, 4.4),
        "fill": 0.84,
    },
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
    parser.add_argument("--samples", type=int, default=48)
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def find_fbx(asset_root):
    files = sorted(asset_root.glob("*.fbx"))
    if not files:
        raise FileNotFoundError(f"Missing FBX in {asset_root}")
    return files[0]


def find_texture(asset_root, suffix):
    for path in sorted(asset_root.rglob(f"*_{suffix}.JPEG")):
        return path
    for path in sorted(asset_root.rglob(f"*_{suffix}.jpg")):
        return path
    for path in sorted(asset_root.rglob(f"*_{suffix}.png")):
        return path
    return None


def remove_imported_helpers():
    for obj in list(bpy.context.scene.objects):
        if obj.type in {"CAMERA", "LIGHT", "ARMATURE", "EMPTY"}:
            bpy.data.objects.remove(obj, do_unlink=True)


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def make_tripo_material(asset_key, asset_root):
    base = find_texture(asset_root, "basecolor")
    normal = find_texture(asset_root, "normal")
    roughness = find_texture(asset_root, "roughness")
    metallic = find_texture(asset_root, "metallic")

    mat = bpy.data.materials.new(f"{asset_key}_pbr")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in list(nodes):
        nodes.remove(node)

    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (520, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (250, 0)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.2
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = 0.62

    def image_node(path, x, y, colorspace):
        if not path or not path.exists():
            return None
        node = nodes.new("ShaderNodeTexImage")
        node.location = (x, y)
        node.image = bpy.data.images.load(str(path), check_existing=True)
        node.image.colorspace_settings.name = colorspace
        return node

    base_node = image_node(base, -420, 170, "sRGB")
    if base_node and "Base Color" in bsdf.inputs:
        links.new(base_node.outputs["Color"], bsdf.inputs["Base Color"])
        if "Emission Color" in bsdf.inputs:
            links.new(base_node.outputs["Color"], bsdf.inputs["Emission Color"])
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 0.18

    metal_node = image_node(metallic, -420, -40, "Non-Color")
    if metal_node and "Metallic" in bsdf.inputs:
        links.new(metal_node.outputs["Color"], bsdf.inputs["Metallic"])

    rough_node = image_node(roughness, -420, -220, "Non-Color")
    if rough_node and "Roughness" in bsdf.inputs:
        links.new(rough_node.outputs["Color"], bsdf.inputs["Roughness"])

    normal_node = image_node(normal, -640, -420, "Non-Color")
    if normal_node and "Normal" in bsdf.inputs:
        normal_map = nodes.new("ShaderNodeNormalMap")
        normal_map.location = (-170, -420)
        normal_map.inputs["Strength"].default_value = 0.65
        links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])

    return mat


def assign_material_to_meshes(mat):
    for obj in mesh_objects():
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        try:
            for poly in obj.data.polygons:
                poly.use_smooth = True
        except Exception:
            pass
        if not any(mod.type == "WEIGHTED_NORMAL" for mod in obj.modifiers):
            obj.modifiers.new("sprite weighted normals", "WEIGHTED_NORMAL")


def object_bbox_world(objects):
    points = []
    for obj in objects:
        for corner in obj.bound_box:
            points.append(obj.matrix_world @ Vector(corner))
    if not points:
        raise RuntimeError("Imported asset has no mesh bounds")
    min_v = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    max_v = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return min_v, max_v


def normalize_model(target_extent=4.0):
    objects = mesh_objects()
    min_v, max_v = object_bbox_world(objects)
    center = (min_v + max_v) * 0.5
    bottom = min_v.z
    offset = Vector((-center.x, -center.y, -bottom))
    for obj in objects:
        obj.location += offset
    min_v, max_v = object_bbox_world(objects)
    extent = max(max_v.x - min_v.x, max_v.y - min_v.y, max_v.z - min_v.z, 0.001)
    scale = float(target_extent) / extent
    scale_matrix = Matrix.Scale(scale, 4)
    for obj in objects:
        obj.matrix_world = scale_matrix @ obj.matrix_world


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_render(width, height, samples):
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = int(width)
    scene.render.resolution_y = int(height)
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1

    eevee = getattr(scene, "eevee", None)
    if eevee:
        for attr, value in {
            "taa_render_samples": max(16, samples),
            "use_gtao": True,
            "gtao_distance": 3,
            "gtao_factor": 1.2,
            "use_bloom": True,
            "bloom_intensity": 0.03,
        }.items():
            if hasattr(eevee, attr):
                setattr(eevee, attr, value)

    world = scene.world or bpy.data.worlds.new("sprite_world")
    scene.world = world
    world.color = (0.025, 0.028, 0.035)


def setup_lights(bounds_size):
    for obj in list(bpy.context.scene.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)

    radius = max(2.5, bounds_size)
    bpy.ops.object.light_add(type="AREA", location=(-radius * 1.6, -radius * 1.9, radius * 2.3))
    key = bpy.context.object
    key.name = "tripo_sprite_key"
    key.data.energy = 1800
    key.data.size = radius * 1.25

    bpy.ops.object.light_add(type="AREA", location=(radius * 1.7, radius * 1.2, radius * 1.5))
    fill = bpy.context.object
    fill.name = "tripo_sprite_fill"
    fill.data.energy = 520
    fill.data.size = radius * 1.8
    fill.data.color = (0.62, 0.78, 1.0)

    bpy.ops.object.light_add(type="POINT", location=(0, -radius * 1.6, radius * 1.35))
    rim = bpy.context.object
    rim.name = "tripo_sprite_rim"
    rim.data.energy = 360
    rim.data.color = (1.0, 0.72, 0.42)


def setup_camera(spec):
    scene = bpy.context.scene
    objects = mesh_objects()
    min_v, max_v = object_bbox_world(objects)
    center = (min_v + max_v) * 0.5
    size = max((max_v - min_v).length, 0.01)
    target = Vector((center.x, center.y, center.z))
    camera_location = Vector(spec["camera"])
    camera_location.normalize()
    camera_location *= max(5.0, size * 1.65)

    bpy.ops.object.camera_add(location=camera_location)
    camera = bpy.context.object
    camera.name = "tripo_sprite_camera"
    camera.data.type = "ORTHO"
    camera.data.clip_start = 0.01
    camera.data.clip_end = max(100.0, size * 8.0)
    scene.camera = camera
    look_at(camera, target)

    inv = camera.matrix_world.inverted()
    projected = []
    for obj in objects:
        for corner in obj.bound_box:
            projected.append(inv @ (obj.matrix_world @ Vector(corner)))
    min_x = min(p.x for p in projected)
    max_x = max(p.x for p in projected)
    min_y = min(p.y for p in projected)
    max_y = max(p.y for p in projected)
    aspect = spec["resolution"][0] / max(1, spec["resolution"][1])
    fill = max(0.24, min(0.68, float(spec.get("fill", 0.84)) * 0.72))
    camera.data.ortho_scale = max((max_y - min_y) / fill, (max_x - min_x) / (aspect * fill), 0.1)

    return size


def render_asset(asset_key, spec, source_root, samples):
    asset_root = source_root / spec["folder"]
    fbx = find_fbx(asset_root)
    log(f"{asset_key}: importing {fbx}")

    clear_scene()
    bpy.ops.import_scene.fbx(filepath=str(fbx), use_image_search=True)
    remove_imported_helpers()
    if not mesh_objects():
        raise RuntimeError(f"No mesh objects imported from {fbx}")

    mat = make_tripo_material(asset_key, asset_root)
    assign_material_to_meshes(mat)
    normalize_model()
    setup_render(*spec["resolution"], samples)
    min_v, max_v = object_bbox_world(mesh_objects())
    bounds_size = max((max_v - min_v).length, 0.01)
    setup_lights(bounds_size)
    setup_camera(spec)

    out_path = Path(spec["out"])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.filepath = str(out_path)
    bpy.ops.render.render(write_still=True)
    log(f"{asset_key}: wrote {out_path.relative_to(ROOT).as_posix()}")


def main():
    args = parse_args()
    source_root = Path(args.source_root)
    selected = ASSETS.keys() if args.asset == "all" else [args.asset]
    for asset_key in selected:
        render_asset(asset_key, ASSETS[asset_key], source_root, max(1, int(args.samples)))


if __name__ == "__main__":
    main()
