import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--mesh", required=True)
    parser.add_argument("--out-glb", required=True)
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_obj(mesh_path):
    if hasattr(bpy.ops.wm, "obj_import"):
        bpy.ops.wm.obj_import(filepath=str(mesh_path))
    else:
        bpy.ops.import_scene.obj(filepath=str(mesh_path))


def orient_meshes_upright(mesh_objects):
    if not mesh_objects:
        return

    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]

    min_corner = Vector((float("inf"), float("inf"), float("inf")))
    max_corner = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in mesh_objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_corner.x = min(min_corner.x, world.x)
            min_corner.y = min(min_corner.y, world.y)
            min_corner.z = min(min_corner.z, world.z)
            max_corner.x = max(max_corner.x, world.x)
            max_corner.y = max(max_corner.y, world.y)
            max_corner.z = max(max_corner.z, world.z)

    dimensions = max_corner - min_corner
    longest_axis = max(range(3), key=lambda axis: dimensions[axis])

    if longest_axis == 0:
        bpy.ops.transform.rotate(value=-1.5707963268, orient_axis="Y")
    elif longest_axis == 1:
        bpy.ops.transform.rotate(value=1.5707963268, orient_axis="X")

    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    min_corner = Vector((float("inf"), float("inf"), float("inf")))
    max_corner = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in mesh_objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_corner.x = min(min_corner.x, world.x)
            min_corner.y = min(min_corner.y, world.y)
            min_corner.z = min(min_corner.z, world.z)
            max_corner.x = max(max_corner.x, world.x)
            max_corner.y = max(max_corner.y, world.y)
            max_corner.z = max(max_corner.z, world.z)

    center = (min_corner + max_corner) * 0.5
    floor_z = min_corner.z
    for obj in mesh_objects:
        obj.location.x -= center.x
        obj.location.y -= center.y
        obj.location.z -= floor_z


def main():
    args = parse_args()
    mesh_path = Path(args.mesh).resolve()
    out_glb = Path(args.out_glb).resolve()
    out_glb.parent.mkdir(parents=True, exist_ok=True)

    clear_scene()
    import_obj(mesh_path)

    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    orient_meshes_upright(mesh_objects)
    vertices = sum(len(obj.data.vertices) for obj in mesh_objects)
    polygons = sum(len(obj.data.polygons) for obj in mesh_objects)
    materials = sum(len(obj.data.materials) for obj in mesh_objects)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in mesh_objects:
        obj.select_set(True)
    if mesh_objects:
        bpy.context.view_layer.objects.active = mesh_objects[0]

    bpy.ops.export_scene.gltf(
        filepath=str(out_glb),
        export_format="GLB",
        export_image_format="AUTO",
        use_selection=True,
    )

    print(f"mesh_objects={len(mesh_objects)} vertices={vertices} polygons={polygons} materials={materials}")
    print(f"glb={out_glb}")


if __name__ == "__main__":
    main()
