# Dựng hai khối x và o cho nền 3D trang chủ, cùng một kiểu: ống tròn bán kính TUBE.
#   o: hình xuyến
#   x: hai ống tròn đầu bán cầu bắt chéo, gộp liền bằng voxel remesh, chỗ giao lượn nhẹ
# Chạy:
#   "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python assets-src/xo/build_xo.py
# Ra: assets-src/xo/xo.blend (file gốc), public/models/xo.glb (three.js nạp), assets-src/xo/preview.png
import math
import os

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TUBE = 0.17  # bán kính ống, chung cho cả x và o
RING = 0.5  # bán kính vòng của o (tâm ống)
ARM = RING + TUBE  # nửa chiều dài mỗi nhánh của x tới đầu tròn: bằng bán kính ngoài của o


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_o():
    bpy.ops.mesh.primitive_torus_add(major_radius=RING, minor_radius=TUBE, major_segments=72, minor_segments=24)
    o = bpy.context.active_object
    o.name = "O"
    o.data.name = "O"
    bpy.ops.object.shade_smooth()
    return o


def make_x(radius):
    # hai ống tròn thẳng bán kính TUBE, đầu bán cầu, bắt chéo 90 độ; mỗi nhánh dài bằng đường kính ngoài của o
    parts = []
    for angle in (45, -45):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=2 * (ARM - radius))
        cyl = bpy.context.active_object
        cyl.rotation_euler = (0, math.radians(90), math.radians(angle))
        parts.append(cyl)
        for sign in (1, -1):
            d = ARM - radius
            bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=radius)
            cap = bpy.context.active_object
            cap.location = (sign * d * math.cos(math.radians(angle)), sign * d * math.sin(math.radians(angle)), 0)
            parts.append(cap)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    x = bpy.context.active_object
    x.name = "X"
    x.data.name = "X"
    # gộp thành một khối liền, rồi làm mượt nhẹ để chỗ giao có góc lượn nhỏ
    rm = x.modifiers.new("remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = 0.012
    sm = x.modifiers.new("smooth", "CORRECTIVE_SMOOTH")
    sm.iterations = 6
    sm.scale = 1.0
    sm.smooth_type = "LENGTH_WEIGHTED"
    bpy.ops.object.modifier_apply(modifier="remesh")
    bpy.ops.object.modifier_apply(modifier="smooth")
    return x


def arm_radius(x):
    # đo độ dày ở giữa một nhánh (hướng 45 độ), nơi ống còn thẳng
    d = Vector((math.cos(math.radians(45)), math.sin(math.radians(45)), 0))
    target = ARM * 0.6
    best = 0.0
    for v in x.data.vertices:
        p = x.matrix_world @ v.co
        along = p.dot(d)
        if abs(along - target) < 0.02:
            best = max(best, (p - d * along).length)
    return best


def tidy(obj, tris):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    m = obj.modifiers.new("dec", "DECIMATE")
    m.ratio = min(1.0, tris / max(1, len(obj.data.polygons)))
    bpy.ops.object.modifier_apply(modifier="dec")
    bpy.ops.object.shade_smooth()
    obj.select_set(False)


def preview(path):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items} else "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 800, 400
    world = bpy.data.worlds.new("w")
    world.color = (0.02, 0.07, 0.12)
    scene.world = world
    mat = bpy.data.materials.new("blue")
    mat.diffuse_color = (0.36, 0.78, 1.0, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.36, 0.78, 1.0, 1)
    bsdf.inputs["Roughness"].default_value = 0.35
    for o in bpy.data.objects:
        if o.type == "MESH":
            o.data.materials.append(mat)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    cam.location = (0, -6, 3.2)
    cam.rotation_euler = (math.radians(62), 0, 0)
    scene.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 3
    sun.rotation_euler = (math.radians(40), math.radians(20), math.radians(30))
    scene.collection.objects.link(sun)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o in bpy.data.objects:
        if o.type == "MESH":
            o.data.materials.clear()


clear()
o = make_o()
x = make_x(TUBE)
measured = final = arm_radius(x)
tidy(x, 5000)
o.location = (-1.0, 0, 0)
x.location = (1.0, 0, 0)

os.makedirs(os.path.join(ROOT, "public", "models"), exist_ok=True)
preview(os.path.join(ROOT, "assets-src", "xo", "preview.png"))

# về gốc toạ độ để three.js dùng làm geometry
o.location = (0, 0, 0)
x.location = (0, 0, 0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "assets-src", "xo", "xo.blend"))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=os.path.join(ROOT, "public", "models", "xo.glb"),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="NONE",
    export_yup=True,
)
print(f"XO done: tube {TUBE}, x arm radius measured {measured:.3f} -> {final:.3f}, X tris {len(x.data.polygons)}, O tris {len(o.data.polygons)}")
