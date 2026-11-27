// Nền x o dạng khối 3D (three.js) trên một canvas cố định phía sau nội dung.
// Hình x và o dựng trong Blender (assets-src/xo/build_xo.py), cùng kiểu ống tròn, nạp từ /models/xo.glb;
// không tải được file thì dùng hình xuyến và hai thanh hộp dựng sẵn bằng code. Mỗi khối xoay trong không gian, phóng to rồi
// thu nhỏ tới biến mất theo vòng riêng; sương mù cùng màu nền làm khối ở xa mờ đi.
// Màu lấy từ biến CSS --p-bg, --p-accent, --p-ink của trang.
// Giảm chuyển động: vẽ một khung đứng yên. Không có WebGL: trả về false để giữ lớp x o phẳng.
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  TorusGeometry,
  WebGLRenderer,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Mesh } from 'three';

interface Item {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  sx: number; // tốc độ xoay
  sy: number;
  size: number;
  period: number; // giây cho một vòng hiện ra rồi biến mất
  phase: number;
  drift: number;
}

export async function startXo3d(canvas: HTMLCanvasElement): Promise<boolean> {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return false;
  }
  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const bg = new Color(token('--p-bg', '#06121f'));
  const accent = new Color(token('--p-accent', '#5cc8ff'));
  const ink = new Color(token('--p-ink', '#ffffff'));

  const scene = new Scene();
  scene.fog = new Fog(bg, 6, 22);
  const camera = new PerspectiveCamera(50, 1, 0.1, 40);
  camera.position.z = 10;
  scene.add(new AmbientLight(0xffffff, 0.55));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 6, 8);
  scene.add(sun);

  let torus: BufferGeometry;
  let cross: BufferGeometry;
  try {
    const gltf = await new GLTFLoader().loadAsync('/models/xo.glb');
    torus = (gltf.scene.getObjectByName('O') as Mesh).geometry;
    cross = (gltf.scene.getObjectByName('X') as Mesh).geometry;
    if (!torus || !cross) throw new Error('xo.glb thiếu mesh O hoặc X');
  } catch {
    torus = new TorusGeometry(0.5, 0.17, 18, 48);
    const bar = new BoxGeometry(1.35, 0.3, 0.3);
    const barB = bar.clone().rotateZ(Math.PI / 4);
    const barA = bar.rotateZ(-Math.PI / 4);
    cross = mergeGeometries([barA, barB]) as BufferGeometry;
  }

  const phone = innerWidth < 640;
  const perGroup = phone ? 10 : 18;
  const mat = (c: Color) =>
    new MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.25, transparent: true, opacity: 0.42 });
  const groups = [
    { mesh: new InstancedMesh(torus, mat(accent), perGroup), items: [] as Item[] },
    { mesh: new InstancedMesh(cross, mat(accent), perGroup), items: [] as Item[] },
    { mesh: new InstancedMesh(torus, mat(ink), perGroup), items: [] as Item[] },
    { mesh: new InstancedMesh(cross, mat(ink), perGroup), items: [] as Item[] },
  ];

  let seed = 1996;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const g of groups) {
    for (let i = 0; i < perGroup; i++) {
      const k = rnd();
      g.items.push({
        x: -9 + rnd() * 18,
        y: -6 + rnd() * 12,
        z: -12 + rnd() * 10,
        rx: rnd() * Math.PI * 2,
        ry: rnd() * Math.PI * 2,
        sx: -0.6 + rnd() * 1.2,
        sy: -0.6 + rnd() * 1.2,
        size: 0.35 + k * k * 1.6, // nhiều cái nhỏ, ít cái to
        period: 7 + rnd() * 9,
        phase: rnd(),
        drift: 0.3 + rnd() * 0.8,
      });
    }
    scene.add(g.mesh);
  }

  const dummy = new Object3D();
  const m = new Matrix4();
  const place = (t: number) => {
    for (const g of groups) {
      g.items.forEach((it, i) => {
        // Vòng 0..1: phóng to hiện ra, giữ, thu nhỏ tới 0
        const p = (t / it.period + it.phase) % 1;
        const s = p < 0.3 ? p / 0.3 : p > 0.7 ? (1 - p) / 0.3 : 1 + 0.15 * Math.sin(((p - 0.3) / 0.4) * Math.PI);
        dummy.position.set(it.x, it.y + p * it.drift, it.z);
        dummy.rotation.set(it.rx + t * it.sx, it.ry + t * it.sy, 0);
        dummy.scale.setScalar(it.size * Math.max(s, 0.0001));
        dummy.updateMatrix();
        m.copy(dummy.matrix);
        g.mesh.setMatrixAt(i, m);
      });
      g.mesh.instanceMatrix.needsUpdate = true;
    }
  };

  const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    place(3);
    renderer.render(scene, camera);
    return true;
  }

  const t0 = performance.now();
  const frame = (now: number) => {
    if (!document.hidden) {
      place((now - t0) / 1000);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return true;
}
