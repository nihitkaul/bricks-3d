"""
Blender headless asset generator for Bricks 3D.
Generates beveled, PBR-textured GLB models for the game and all 3 environments:
  - paddle.glb
  - brick_standard.glb
  - brick_armored.glb
  - tree_nature.glb
  - planter_mall.glb
  - satellite_space.glb
"""

import os
import math
import bpy
import bmesh

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "models"))
os.makedirs(OUT_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_material(name, base_color, metallic=0.1, roughness=0.4, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def add_bevel(obj, width=0.04, segments=3):
    mod = obj.modifiers.new(name="Bevel", type="BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def export_glb(filename):
    path = os.path.join(OUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
    )
    print(f"Exported: {path}")


def build_paddle():
    clear_scene()
    mat_body = make_material("PaddleBody", (0.85, 0.9, 0.96), metallic=0.65, roughness=0.22)
    mat_cap = make_material("PaddleCap", (0.05, 0.75, 1.0), metallic=0.3, roughness=0.2, emission=(0.05, 0.75, 1.0), emission_strength=1.8)
    mat_core = make_material("PaddleCore", (0.12, 0.16, 0.24), metallic=0.8, roughness=0.3)

    # Main center bar (width 2.0 along X, height 0.35 along Y, depth 0.55 along Z in glTF)
    # Note: Blender Z is up, glTF exporter converts Z-up to Y-up automatically.
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    body = bpy.context.active_object
    body.scale = (1.6, 0.5, 0.32)
    bpy.ops.object.transform_apply(scale=True)
    add_bevel(body, width=0.05, segments=3)
    body.data.materials.append(mat_body)

    # Top glowing strip
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.165))
    strip = bpy.context.active_object
    strip.scale = (1.2, 0.14, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    add_bevel(strip, width=0.012, segments=2)
    strip.data.materials.append(mat_cap)

    # Dark bumper spine
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.22, 0))
    spine = bpy.context.active_object
    spine.scale = (1.4, 0.12, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    spine.data.materials.append(mat_core)

    # Left and right glowing end-caps
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.24, depth=0.32, location=(side * 0.84, 0, 0))
        cap = bpy.context.active_object
        add_bevel(cap, width=0.04, segments=2)
        cap.data.materials.append(mat_cap)

    export_glb("paddle.glb")


def build_brick_standard():
    clear_scene()
    mat_brick = make_material("BrickBase", (1.0, 1.0, 1.0), metallic=0.15, roughness=0.28)
    mat_inset = make_material("BrickInset", (0.92, 0.92, 0.96), metallic=0.25, roughness=0.2)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    brick = bpy.context.active_object
    brick.scale = (1.0, 0.55, 0.42)
    bpy.ops.object.transform_apply(scale=True)
    add_bevel(brick, width=0.045, segments=3)
    brick.data.materials.append(mat_brick)

    # Subtle raised top cap for classic arcade brick look
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.21))
    top = bpy.context.active_object
    top.scale = (0.76, 0.34, 0.05)
    bpy.ops.object.transform_apply(scale=True)
    add_bevel(top, width=0.015, segments=2)
    top.data.materials.append(mat_inset)

    export_glb("brick_standard.glb")


def build_brick_armored():
    clear_scene()
    mat_steel = make_material("ArmorSteel", (0.72, 0.78, 0.86), metallic=0.85, roughness=0.25)
    mat_rivet = make_material("ArmorRivet", (0.95, 0.75, 0.25), metallic=0.9, roughness=0.2)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    brick = bpy.context.active_object
    brick.scale = (1.0, 0.58, 0.46)
    bpy.ops.object.transform_apply(scale=True)
    add_bevel(brick, width=0.05, segments=3)
    brick.data.materials.append(mat_steel)

    # Corner rivets
    for sx in (-0.36, 0.36):
        for sy in (-0.18, 0.18):
            bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.045, depth=0.08, location=(sx, sy, 0.23))
            rivet = bpy.context.active_object
            rivet.data.materials.append(mat_rivet)

    export_glb("brick_armored.glb")


def build_tree_nature():
    clear_scene()
    mat_trunk = make_material("TrunkWood", (0.36, 0.21, 0.11), metallic=0.0, roughness=0.85)
    mat_leaf1 = make_material("PineLeafDark", (0.11, 0.42, 0.18), metallic=0.0, roughness=0.72)
    mat_leaf2 = make_material("PineLeafLight", (0.18, 0.56, 0.24), metallic=0.0, roughness=0.68)

    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.22, depth=1.3, location=(0, 0, 0.65))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_trunk)

    tiers = [
        (1.25, 1.5, 1.75, mat_leaf1),
        (0.98, 1.35, 2.55, mat_leaf2),
        (0.68, 1.15, 3.25, mat_leaf1),
    ]
    for radius, depth, z_pos, mat in tiers:
        bpy.ops.mesh.primitive_cone_add(vertices=9, radius1=radius, radius2=0.05, depth=depth, location=(0, 0, z_pos))
        cone = bpy.context.active_object
        cone.data.materials.append(mat)

    export_glb("tree_nature.glb")


def build_planter_mall():
    clear_scene()
    mat_marble = make_material("MallMarble", (0.93, 0.91, 0.88), metallic=0.05, roughness=0.18)
    mat_gold = make_material("MallBrass", (0.92, 0.72, 0.28), metallic=0.88, roughness=0.22)
    mat_soil = make_material("Soil", (0.2, 0.14, 0.09), metallic=0.0, roughness=0.95)
    mat_palm = make_material("PalmLeaf", (0.12, 0.62, 0.32), metallic=0.05, roughness=0.5)
    mat_neon = make_material("MallNeon", (1.0, 0.2, 0.7), metallic=0.1, roughness=0.2, emission=(1.0, 0.2, 0.7), emission_strength=2.2)

    # Octagonal planter base
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.85, depth=0.75, location=(0, 0, 0.375))
    base = bpy.context.active_object
    add_bevel(base, width=0.03, segments=2)
    base.data.materials.append(mat_marble)

    # Brass rim
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.9, depth=0.1, location=(0, 0, 0.76))
    rim = bpy.context.active_object
    rim.data.materials.append(mat_gold)

    # Neon accent ring
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.87, depth=0.06, location=(0, 0, 0.16))
    neon = bpy.context.active_object
    neon.data.materials.append(mat_neon)

    # Soil disk
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.76, depth=0.08, location=(0, 0, 0.73))
    soil = bpy.context.active_object
    soil.data.materials.append(mat_soil)

    # Palm trunk
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.12, depth=1.6, location=(0, 0, 1.5))
    trunk = bpy.context.active_object
    trunk.data.materials.append(mat_soil)

    # Stylized palm fronds
    for i in range(6):
        angle = (i / 6.0) * math.tau
        bpy.ops.mesh.primitive_cone_add(
            vertices=5,
            radius1=0.22,
            radius2=0.02,
            depth=1.3,
            location=(math.cos(angle) * 0.52, math.sin(angle) * 0.52, 2.35),
            rotation=(math.radians(65) * math.sin(angle), -math.radians(65) * math.cos(angle), angle),
        )
        frond = bpy.context.active_object
        frond.scale = (1.0, 0.45, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        frond.data.materials.append(mat_palm)

    export_glb("planter_mall.glb")


def build_satellite_space():
    clear_scene()
    mat_hull = make_material("SatHull", (0.78, 0.83, 0.9), metallic=0.82, roughness=0.24)
    mat_panel = make_material("SolarPanel", (0.06, 0.22, 0.65), metallic=0.6, roughness=0.18)
    mat_glow = make_material("SatGlow", (0.0, 0.92, 1.0), metallic=0.2, roughness=0.2, emission=(0.0, 0.92, 1.0), emission_strength=2.8)

    # Core octagonal hub
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.45, depth=0.9, location=(0, 0, 0))
    hub = bpy.context.active_object
    add_bevel(hub, width=0.03, segments=2)
    hub.data.materials.append(mat_hull)

    # Glowing sensor ring
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.49, depth=0.14, location=(0, 0, 0))
    ring = bpy.context.active_object
    ring.data.materials.append(mat_glow)

    # Dish antenna
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.35, radius2=0.04, depth=0.25, location=(0, 0, 0.6), rotation=(math.pi, 0, 0))
    dish = bpy.context.active_object
    dish.data.materials.append(mat_hull)

    # Solar wings
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 1.45, 0, 0))
        wing = bpy.context.active_object
        wing.scale = (1.6, 0.65, 0.05)
        bpy.ops.object.transform_apply(scale=True)
        wing.data.materials.append(mat_panel)

        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.04, depth=0.5, location=(side * 0.6, 0, 0), rotation=(0, math.pi / 2, 0))
        strut = bpy.context.active_object
        strut.data.materials.append(mat_hull)

    export_glb("satellite_space.glb")


if __name__ == "__main__":
    build_paddle()
    build_brick_standard()
    build_brick_armored()
    build_tree_nature()
    build_planter_mall()
    build_satellite_space()
    print("All Bricks 3D Blender assets generated successfully!")
