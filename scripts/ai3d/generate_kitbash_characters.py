import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = ROOT / "public" / "assets" / "characters" / "ai3d" / "generated" / "kitbash"


CHARACTERS = {
    "cyber": {
        "name": "Cyber",
        "role": "Heavy assault",
        "body": "heavy",
        "accent": (0.05, 0.82, 1.0, 1.0),
        "accent2": (1.0, 0.08, 0.04, 1.0),
        "hair": "spikes",
        "skin": (0.78, 0.72, 0.68, 1.0),
        "weapon": "rifle",
        "backpack": "reactor",
        "extra": "cyber_face",
    },
    "medis": {
        "name": "Medis",
        "role": "Field medic",
        "body": "medium",
        "accent": (0.32, 1.0, 1.0, 1.0),
        "accent2": (0.78, 1.0, 1.0, 1.0),
        "hair": "bob",
        "skin": (0.86, 0.74, 0.68, 1.0),
        "weapon": "injector",
        "backpack": "medpack",
        "extra": "medical_cross",
    },
    "raider": {
        "name": "Raider",
        "role": "Heavy raider",
        "body": "heavy",
        "accent": (1.0, 0.05, 0.02, 1.0),
        "accent2": (0.85, 0.42, 0.22, 1.0),
        "hair": "short_spikes",
        "skin": (0.68, 0.53, 0.46, 1.0),
        "weapon": "heavy_rifle",
        "backpack": "ammo",
        "extra": "skulls",
    },
    "scout": {
        "name": "Scout",
        "role": "Marksman scout",
        "body": "light",
        "accent": (0.24, 1.0, 0.22, 1.0),
        "accent2": (0.65, 0.95, 0.38, 1.0),
        "hair": "hood",
        "skin": (0.72, 0.60, 0.50, 1.0),
        "weapon": "sniper",
        "backpack": "sensor",
        "extra": "hood",
    },
    "shadow": {
        "name": "Shadow",
        "role": "Stealth assassin",
        "body": "light",
        "accent": (0.1, 0.42, 1.0, 1.0),
        "accent2": (0.35, 0.9, 1.0, 1.0),
        "hair": "hood_mask",
        "skin": (0.58, 0.50, 0.46, 1.0),
        "weapon": "dual_knives",
        "backpack": "stealth",
        "extra": "mask",
    },
}


BODY = {
    "heavy": {"height": 2.08, "width": 1.18, "depth": 0.52, "limb": 0.115, "leg": 0.135},
    "medium": {"height": 1.96, "width": 0.9, "depth": 0.42, "limb": 0.085, "leg": 0.105},
    "light": {"height": 1.92, "width": 0.82, "depth": 0.38, "limb": 0.078, "leg": 0.096},
}


def log(message):
    print(message, flush=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_material(name, color, metallic=0.0, roughness=0.5, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = color
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def add_materials(spec):
    accent = spec["accent"]
    accent2 = spec["accent2"]
    return {
        "armor": make_material("blackened gunmetal", (0.015, 0.017, 0.02, 1), 0.75, 0.33),
        "armor2": make_material("worn dark steel", (0.09, 0.095, 0.105, 1), 0.65, 0.42),
        "cloth": make_material("matte tactical cloth", (0.018, 0.019, 0.024, 1), 0.0, 0.82),
        "leather": make_material("dark leather straps", (0.06, 0.043, 0.032, 1), 0.0, 0.7),
        "skin": make_material("skin", spec["skin"], 0.0, 0.48),
        "hair": make_material("silver hair", (0.72, 0.74, 0.78, 1), 0.0, 0.38),
        "bone": make_material("bone skulls", (0.70, 0.60, 0.48, 1), 0.0, 0.66),
        "white": make_material("white medic armor", (0.75, 0.78, 0.78, 1), 0.25, 0.32),
        "accent": make_material("primary emissive", accent, 0.0, 0.18, accent, 3.0),
        "accent2": make_material("secondary emissive", accent2, 0.0, 0.2, accent2, 2.6),
        "blade": make_material("energy blade", (0.35, 0.65, 1.0, 0.58), 0.0, 0.1, spec["accent"], 4.2),
    }


def assign_mat(obj, mat):
    obj.data.materials.append(mat)
    return obj


def shade(obj):
    try:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    except Exception:
        pass
    return obj


def bevel(obj, amount=0.025, segments=2):
    mod = obj.modifiers.new("soft bevel", "BEVEL")
    mod.width = amount
    mod.segments = segments
    mod.affect = "EDGES"
    obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj


def box(name, loc, scale, mat, bevel_amount=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_mat(obj, mat)
    bevel(obj, bevel_amount)
    return obj


def sphere(name, loc, scale, mat, segments=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=12, radius=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    assign_mat(obj, mat)
    shade(obj)
    return obj


def cyl(name, loc, radius, depth, mat, vertices=18, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    assign_mat(obj, mat)
    shade(obj)
    bevel(obj, radius * 0.1, 1)
    return obj


def cone(name, loc, radius1, radius2, depth, mat, vertices=18, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    assign_mat(obj, mat)
    shade(obj)
    return obj


def cylinder_between(name, start, end, radius, mat, vertices=18):
    start = Vector(start)
    end = Vector(end)
    mid = (start + end) * 0.5
    direction = end - start
    length = direction.length
    obj = cyl(name, mid, radius, length, mat, vertices)
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return obj


def curve_pipe(name, points, mat, radius=0.018):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    poly = curve.splines.new("POLY")
    poly.points.add(len(points) - 1)
    for point, co in zip(poly.points, points):
        point.co = (co[0], co[1], co[2], 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def make_armature(name):
    bpy.ops.object.armature_add(location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = f"{name}_armature"
    arm.data.name = f"{name}_skeleton"
    arm.show_in_front = True
    bpy.ops.object.mode_set(mode="EDIT")
    bones = arm.data.edit_bones
    root = bones[0]
    root.name = "root"
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.18)

    def add_bone(bone_name, head, tail, parent=None):
        bone = bones.new(bone_name)
        bone.head = head
        bone.tail = tail
        if parent:
            bone.parent = bones[parent]
            bone.use_connect = False
        return bone

    add_bone("pelvis", (0, 0, 0.82), (0, 0, 1.05), "root")
    add_bone("spine", (0, 0, 1.02), (0, 0, 1.43), "pelvis")
    add_bone("chest", (0, 0, 1.36), (0, 0, 1.64), "spine")
    add_bone("neck", (0, 0, 1.62), (0, 0, 1.73), "chest")
    add_bone("head", (0, 0, 1.72), (0, 0, 1.98), "neck")
    for side, sign in (("L", -1), ("R", 1)):
        add_bone(f"upper_arm.{side}", (sign * 0.34, 0, 1.56), (sign * 0.68, 0, 1.30), "chest")
        add_bone(f"forearm.{side}", (sign * 0.68, 0, 1.30), (sign * 0.89, 0, 1.04), f"upper_arm.{side}")
        add_bone(f"hand.{side}", (sign * 0.89, 0, 1.04), (sign * 0.96, 0, 0.92), f"forearm.{side}")
        add_bone(f"thigh.{side}", (sign * 0.16, 0, 0.86), (sign * 0.18, 0, 0.48), "pelvis")
        add_bone(f"shin.{side}", (sign * 0.18, 0, 0.48), (sign * 0.18, 0, 0.12), f"thigh.{side}")
        add_bone(f"foot.{side}", (sign * 0.18, 0, 0.12), (sign * 0.18, -0.18, 0.04), f"shin.{side}")
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def parent_to_bone(obj, arm, bone_name):
    obj["intended_bone"] = bone_name
    return obj


def add_idle_animation(arm):
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    for bone_name in ("root", "chest", "upper_arm.L", "upper_arm.R"):
        arm.pose.bones[bone_name].rotation_mode = "XYZ"
    frames = ((1, 0.0), (30, 1.0), (60, 0.0), (90, -1.0), (120, 0.0))
    for frame, wave in frames:
        bpy.context.scene.frame_set(frame)
        arm.pose.bones["root"].rotation_euler = (0.0, 0.0, math.radians(1.8 * wave))
        arm.pose.bones["chest"].rotation_euler = (0.0, math.radians(2.2 * wave), 0.0)
        arm.pose.bones["upper_arm.L"].rotation_euler = (math.radians(2.5 * wave), 0.0, 0.0)
        arm.pose.bones["upper_arm.R"].rotation_euler = (math.radians(-2.5 * wave), 0.0, 0.0)
        for bone_name in ("root", "chest", "upper_arm.L", "upper_arm.R"):
            arm.pose.bones[bone_name].keyframe_insert(data_path="rotation_euler", frame=frame)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 120
    if arm.animation_data and arm.animation_data.action:
        arm.animation_data.action.name = "Preview_Idle"


def add_armor_marks(parent_bone, arm, mats, body):
    width = BODY[body]["width"]
    marks = []
    for x in (-0.22, 0.22):
        marks.append(box("chest_emissive_bar", (x, -0.242, 1.46), (0.055, 0.018, 0.18), mats["accent"], 0.006))
    marks.append(sphere("chest_core", (0, -0.255, 1.44), (0.075, 0.025, 0.075), mats["accent"], 24))
    for obj in marks:
        parent_to_bone(obj, arm, parent_bone)
    for side, sign in (("L", -1), ("R", 1)):
        for z in (0.42, 0.68):
            plate = box("shin_light", (sign * 0.18, -0.105, z), (0.06, 0.02, 0.12), mats["accent"], 0.006)
            parent_to_bone(plate, arm, f"shin.{side}")
        wrist = box("wrist_light", (sign * 0.88, -0.08, 1.04), (0.08, 0.02, 0.035), mats["accent"], 0.006)
        parent_to_bone(wrist, arm, f"forearm.{side}")
    if width > 1.0:
        for sign in (-1, 1):
            lamp = sphere("shoulder_warning", (sign * 0.55, -0.14, 1.6), (0.035, 0.02, 0.035), mats["accent2"], 16)
            parent_to_bone(lamp, arm, "chest")


def add_hair(spec, mats, arm):
    hair = spec["hair"]
    objs = []
    if hair in ("spikes", "short_spikes"):
        count = 11 if hair == "spikes" else 7
        for i in range(count):
            x = (i - (count - 1) / 2) * 0.035
            z = 1.98 + abs(i - (count - 1) / 2) * -0.006
            obj = cone("silver_hair_spike", (x, -0.02, z), 0.026, 0.0, 0.18 if hair == "spikes" else 0.12, mats["hair"], 8, (math.radians(12 + i * 2), 0, 0))
            objs.append(obj)
    elif hair == "bob":
        objs.append(sphere("silver_bob_hair", (0, 0.018, 1.86), (0.22, 0.18, 0.19), mats["hair"], 24))
        objs.append(box("bob_front_lock", (-0.08, -0.15, 1.87), (0.08, 0.04, 0.22), mats["hair"], 0.018))
    elif hair in ("hood", "hood_mask"):
        hood_mat = mats["cloth"]
        objs.append(cone("dark_hood", (0, 0.015, 1.84), 0.28, 0.12, 0.42, hood_mat, 24, (0, 0, 0)))
        objs.append(box("hood_collar", (0, 0.01, 1.61), (0.5, 0.34, 0.16), hood_mat, 0.05))
    for obj in objs:
        parent_to_bone(obj, arm, "head")


def add_face_details(spec, mats, arm):
    if spec["extra"] == "cyber_face":
        for x in (0.08, 0.12):
            eye = sphere("red_cyber_eye", (x, -0.175, 1.86), (0.018, 0.008, 0.018), mats["accent2"], 12)
            parent_to_bone(eye, arm, "head")
        plate = box("face_implant", (0.13, -0.165, 1.81), (0.08, 0.025, 0.12), mats["armor"], 0.01)
        parent_to_bone(plate, arm, "head")
    elif spec["extra"] == "mask":
        mask = box("stealth_mask", (0, -0.16, 1.79), (0.28, 0.045, 0.12), mats["cloth"], 0.02)
        parent_to_bone(mask, arm, "head")
        for x in (-0.055, 0.055):
            eye = sphere("blue_eye", (x, -0.188, 1.86), (0.02, 0.007, 0.012), mats["accent"], 12)
            parent_to_bone(eye, arm, "head")
    elif spec["extra"] == "hood":
        for x in (-0.055, 0.055):
            eye = sphere("green_optic", (x, -0.18, 1.85), (0.018, 0.007, 0.014), mats["accent"], 12)
            parent_to_bone(eye, arm, "head")


def add_skulls(mats, arm):
    for side, sign in (("L", -1), ("R", 1)):
        skull = sphere("skull_pauldron", (sign * 0.54, -0.07, 1.58), (0.13, 0.1, 0.12), mats["bone"], 24)
        parent_to_bone(skull, arm, "chest")
        for ex in (-0.04, 0.04):
            eye = sphere("skull_eye", (sign * 0.54 + ex * sign, -0.152, 1.59), (0.018, 0.008, 0.018), mats["accent"], 10)
            parent_to_bone(eye, arm, "chest")


def add_medical_cross(mats, arm):
    for x, z, sx, sz in ((0, 1.49, 0.18, 0.045), (0, 1.49, 0.045, 0.18)):
        obj = box("medical_cross_chest", (x, -0.267, z), (sx, 0.02, sz), mats["accent"], 0.004)
        parent_to_bone(obj, arm, "chest")
    for sign in (-1, 1):
        for sx, sz in ((0.12, 0.034), (0.034, 0.12)):
            obj = box("medical_cross_shoulder", (sign * 0.48, -0.12, 1.62), (sx, 0.018, sz), mats["accent"], 0.004)
            parent_to_bone(obj, arm, "chest")


def add_backpack(spec, mats, arm, body):
    width = BODY[body]["width"]
    pack_w = 0.38 if body != "light" else 0.3
    pack = box("backpack", (0, 0.275, 1.38), (pack_w, 0.16, 0.54), mats["armor2"], 0.035)
    parent_to_bone(pack, arm, "chest")
    if spec["backpack"] == "reactor":
        core = sphere("back_reactor", (0, 0.37, 1.47), (0.09, 0.028, 0.09), mats["accent"], 24)
        parent_to_bone(core, arm, "chest")
        for sign in (-1, 1):
            pipe = curve_pipe("reactor_cable", [(sign * 0.12, 0.36, 1.62), (sign * 0.3, 0.3, 1.48), (sign * 0.42, 0.12, 1.36)], mats["armor2"], 0.016)
            parent_to_bone(pipe, arm, "chest")
    elif spec["backpack"] == "medpack":
        for sx, sz in ((0.16, 0.04), (0.04, 0.16)):
            cross = box("back_med_cross", (0, 0.365, 1.48), (sx, 0.02, sz), mats["accent"], 0.004)
            parent_to_bone(cross, arm, "chest")
    elif spec["backpack"] == "sensor":
        antenna = cylinder_between("sensor_antenna", (0.1, 0.34, 1.62), (0.1, 0.39, 1.92), 0.01, mats["armor2"], 8)
        parent_to_bone(antenna, arm, "chest")
        dot = sphere("sensor_dot", (0.1, 0.395, 1.94), (0.025, 0.025, 0.025), mats["accent"], 12)
        parent_to_bone(dot, arm, "chest")
    elif spec["backpack"] == "ammo":
        for i in range(4):
            ammo = box("ammo_cell", (-0.15 + i * 0.1, 0.37, 1.34), (0.055, 0.04, 0.2), mats["accent"], 0.006)
            parent_to_bone(ammo, arm, "chest")
    else:
        stealth = box("stealth_pack_light", (0, 0.37, 1.48), (0.18, 0.035, 0.22), mats["accent"], 0.006)
        parent_to_bone(stealth, arm, "chest")
    return width


def add_rifle(name, hand, sign, mats, length=0.72, heavy=False):
    x = sign * 0.98
    y = -0.18
    z = 0.95
    barrel = cylinder_between(name + "_barrel", (x, y, z + 0.12), (x, y - length, z + 0.02), 0.025 if heavy else 0.017, mats["armor2"], 12)
    body = box(name + "_receiver", (x, y - 0.2, z + 0.09), (0.11, 0.28, 0.08), mats["armor"], 0.012)
    stock = box(name + "_stock", (x, y - 0.02, z + 0.12), (0.095, 0.18, 0.075), mats["armor2"], 0.014)
    light = box(name + "_light", (x, y - 0.34, z + 0.055), (0.055, 0.018, 0.025), mats["accent"], 0.004)
    for obj in (barrel, body, stock, light):
        parent_to_bone(obj, hand[0], hand[1])


def add_weapons(spec, mats, arm):
    weapon = spec["weapon"]
    if weapon == "rifle":
        add_rifle("cyber_rifle", (arm, "hand.R"), 1, mats, 0.62, False)
    elif weapon == "heavy_rifle":
        add_rifle("raider_heavy_rifle", (arm, "hand.R"), 1, mats, 0.82, True)
        blade = cylinder_between("combat_knife", (-0.96, -0.13, 0.94), (-0.96, -0.34, 0.85), 0.018, mats["armor2"], 8)
        parent_to_bone(blade, arm, "hand.L")
    elif weapon == "sniper":
        add_rifle("scout_sniper", (arm, "hand.R"), 1, mats, 0.95, False)
        scope = cyl("scope", (0.98, -0.35, 1.11), 0.025, 0.18, mats["accent"], 12, (math.radians(90), 0, 0))
        parent_to_bone(scope, arm, "hand.R")
    elif weapon == "injector":
        vial = cyl("injector_vial", (0.96, -0.18, 0.98), 0.026, 0.16, mats["accent"], 12, (math.radians(90), 0, 0))
        parent_to_bone(vial, arm, "hand.R")
        case = box("med_case", (-0.96, -0.14, 0.86), (0.26, 0.12, 0.2), mats["armor2"], 0.022)
        parent_to_bone(case, arm, "hand.L")
        for sx, sz in ((0.12, 0.03), (0.03, 0.12)):
            cross = box("case_cross", (-0.96, -0.205, 0.86), (sx, 0.015, sz), mats["accent"], 0.003)
            parent_to_bone(cross, arm, "hand.L")
    elif weapon == "dual_knives":
        for side, sign in (("L", -1), ("R", 1)):
            grip = cylinder_between(f"knife_grip_{side}", (sign * 0.96, -0.08, 0.96), (sign * 0.96, -0.18, 0.91), 0.018, mats["armor2"], 10)
            blade = cone(f"energy_blade_{side}", (sign * 0.96, -0.3, 0.86), 0.045, 0.0, 0.32, mats["blade"], 4, (math.radians(70), 0, 0))
            parent_to_bone(grip, arm, f"hand.{side}")
            parent_to_bone(blade, arm, f"hand.{side}")


def build_character(character_id, spec):
    clear_scene()
    mats = add_materials(spec)
    body = spec["body"]
    dims = BODY[body]
    arm = make_armature(character_id)
    width = dims["width"]
    depth = dims["depth"]
    limb = dims["limb"]
    leg = dims["leg"]

    parts = [
        (sphere("pelvis_armor", (0, 0, 0.9), (width * 0.31, depth * 0.28, 0.15), mats["armor"], 24), "pelvis"),
        (sphere("abdomen_armor", (0, -0.005, 1.16), (width * 0.33, depth * 0.27, 0.25), mats["cloth"], 24), "spine"),
        (sphere("chest_plate", (0, -0.02, 1.43), (width * 0.42, depth * 0.33, 0.31), mats["armor"], 28), "chest"),
        (box("sternum_plate", (0, -0.245, 1.43), (width * 0.28, 0.035, 0.3), mats["armor2"], 0.025), "chest"),
        (sphere("collar", (0, -0.01, 1.65), (width * 0.32, depth * 0.28, 0.08), mats["armor2"], 24), "chest"),
        (cyl("neck", (0, 0, 1.70), 0.075, 0.16, mats["skin"], 16), "neck"),
        (sphere("head", (0, -0.03, 1.84), (0.17, 0.14, 0.2), mats["skin"], 24), "head"),
    ]

    if character_id == "medis":
        parts.append((box("white_chest_panel", (0, -0.245, 1.44), (width * 0.46, 0.028, 0.29), mats["white"], 0.02), "chest"))

    for side, sign in (("L", -1), ("R", 1)):
        parts.extend([
            (sphere("shoulder_pauldron", (sign * width * 0.47, -0.02, 1.55), (0.16, 0.12, 0.13), mats["armor2"], 18), "chest"),
            (cylinder_between("upper_arm", (sign * 0.42, 0, 1.48), (sign * 0.68, 0, 1.28), limb, mats["cloth"], 16), f"upper_arm.{side}"),
            (box("upper_arm_plate", (sign * 0.55, -0.075, 1.39), (0.12, 0.045, 0.22), mats["armor"], 0.02), f"upper_arm.{side}"),
            (cylinder_between("forearm", (sign * 0.70, 0, 1.25), (sign * 0.88, 0, 1.03), limb * 0.95, mats["armor"], 16), f"forearm.{side}"),
            (sphere("glove", (sign * 0.95, -0.02, 0.95), (0.075, 0.055, 0.08), mats["armor2"], 16), f"hand.{side}"),
            (cylinder_between("thigh", (sign * 0.16, 0, 0.82), (sign * 0.18, 0, 0.48), leg, mats["cloth"], 16), f"thigh.{side}"),
            (box("thigh_armor", (sign * 0.17, -0.08, 0.66), (0.14, 0.055, 0.24), mats["armor"], 0.018), f"thigh.{side}"),
            (cylinder_between("shin", (sign * 0.18, 0, 0.46), (sign * 0.18, 0, 0.13), leg * 0.96, mats["armor"], 16), f"shin.{side}"),
            (box("boot", (sign * 0.18, -0.06, 0.06), (0.18, 0.28, 0.11), mats["armor2"], 0.025), f"foot.{side}"),
            (box("boot_toe", (sign * 0.18, -0.18, 0.05), (0.17, 0.16, 0.075), mats["armor2"], 0.022), f"foot.{side}"),
        ])

    for obj, bone_name in parts:
        parent_to_bone(obj, arm, bone_name)

    for i, x in enumerate((-0.28, -0.14, 0, 0.14, 0.28)):
        pouch_mat = mats["armor2"] if i % 2 else mats["leather"]
        pouch = box("belt_pouch", (x, -0.245, 1.01), (0.095, 0.045, 0.13), pouch_mat, 0.012)
        parent_to_bone(pouch, arm, "pelvis")

    for sign in (-1, 1):
        side_plate = box("rib_side_plate", (sign * width * 0.32, -0.115, 1.4), (0.1, 0.035, 0.28), mats["armor2"], 0.018)
        parent_to_bone(side_plate, arm, "chest")

    add_armor_marks("chest", arm, mats, body)
    add_hair(spec, mats, arm)
    add_face_details(spec, mats, arm)
    add_backpack(spec, mats, arm, body)
    add_weapons(spec, mats, arm)
    if spec["extra"] == "skulls":
        add_skulls(mats, arm)
    if spec["extra"] == "medical_cross":
        add_medical_cross(mats, arm)

    add_idle_animation(arm)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 1.05))
    empty = bpy.context.object
    empty.name = f"{character_id}_preview_target"

    bpy.ops.object.light_add(type="AREA", location=(0, -3.5, 4.0))
    light = bpy.context.object
    light.name = "hero_key_light"
    light.data.energy = 500
    light.data.size = 4.0

    bpy.ops.object.camera_add(location=(0, -4.2, 1.65), rotation=(math.radians(72), 0, 0))
    camera = bpy.context.object
    bpy.context.scene.camera = camera

    return arm


def scene_stats():
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    return {
        "vertices": sum(len(obj.data.vertices) for obj in mesh_objects),
        "faces": sum(len(obj.data.polygons) for obj in mesh_objects),
        "meshes": len(mesh_objects),
    }


def export_character(character_id, spec):
    out_dir = OUT_ROOT / character_id
    out_dir.mkdir(parents=True, exist_ok=True)

    build_character(character_id, spec)
    stats = scene_stats()

    blend_path = out_dir / f"{character_id}.blend"
    glb_path = out_dir / f"{character_id}.glb"
    fbx_path = out_dir / f"{character_id}.fbx"

    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        export_animations=True,
        export_frame_range=True,
        export_image_format="AUTO",
    )
    bpy.ops.export_scene.fbx(
        filepath=str(fbx_path),
        object_types={"ARMATURE", "MESH"},
        add_leaf_bones=False,
        bake_anim=True,
        bake_anim_use_all_bones=True,
        bake_anim_use_nla_strips=False,
        bake_anim_use_all_actions=False,
        apply_unit_scale=True,
    )
    stats.update({
        "id": character_id,
        "name": spec["name"],
        "role": spec["role"],
        "glb": str(glb_path.relative_to(ROOT).as_posix()),
        "fbx": str(fbx_path.relative_to(ROOT).as_posix()),
        "blend": str(blend_path.relative_to(ROOT).as_posix()),
    })
    log(f"{character_id}: {stats['vertices']} vertices, {stats['faces']} faces")
    return stats


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", default="all")
    return parser.parse_args(argv)


def main():
    args = parse_args()
    selected = CHARACTERS.keys() if args.character == "all" else [args.character]
    manifest = {
        "generator": "Blender procedural kitbash",
        "kind": "clean_static_prototype_with_reference_skeleton",
        "characters": {},
    }
    for character_id in selected:
        if character_id not in CHARACTERS:
            raise SystemExit(f"Unknown character: {character_id}")
        manifest["characters"][character_id] = export_character(character_id, CHARACTERS[character_id])

    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    existing_manifest_path = OUT_ROOT / "manifest.json"
    if existing_manifest_path.exists() and args.character != "all":
        existing = json.loads(existing_manifest_path.read_text(encoding="utf-8"))
        existing.setdefault("characters", {}).update(manifest["characters"])
        manifest = existing
    existing_manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
