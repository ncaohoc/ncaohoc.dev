// Nền x o dạng khối 3D (three.js) trên một canvas cố định phía sau nội dung.
// Hình x và o dựng trong Blender (assets-src/xo/build_xo.py), cùng kiểu ống tròn, nạp từ /models/xo.glb;
// không tải được file thì dùng hình xuyến và hai thanh hộp dựng sẵn bằng code. Mỗi khối xoay trong không gian, phóng to rồi
// thu nhỏ tới biến mất theo vòng riêng; sương mù cùng màu nền làm khối ở xa mờ đi.
// Màu lấy từ biến CSS của trang: trang chủ --p-bg/--p-accent/--p-ink, các trang khác --paper/--seal/--ink,
// và đổi theo khi bấm nút sáng/tối (data-theme trên <html>).
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
  nx: number; // vị trí theo màn hình, -1..1, đổi ra toạ độ thế giới mỗi khung theo tỉ lệ khung hình
  ny: number;
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

export interface XoOptions {
  opacity?: number; // độ đục của khối
  middleGap?: number; // tỉ lệ ô bị bỏ trống ở vùng giữa, nơi chữ nằm
}

export async function startXo3d(canvas: HTMLCanvasElement, opts: XoOptions = {}): Promise<boolean> {
  const opacity = opts.opacity ?? 0.22;
  const middleGap = opts.middleGap ?? 0.35;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return false;
  }
  const token = (names: string[], fallback: string) => {
    const css = getComputedStyle(document.documentElement);
    for (const n of names) {
      const v = css.getPropertyValue(n).trim();
      if (v) return v;
    }
    return fallback;
  };
  const bg = new Color();
  const accent = new Color();
  const ink = new Color();
  const readColors = () => {
    bg.set(token(['--p-bg', '--paper'], '#06121f'));
    accent.set(token(['--p-accent', '--seal'], '#5cc8ff'));
    ink.set(token(['--p-ink', '--ink'], '#ffffff'));
  };
  readColors();

  const scene = new Scene();
  scene.fog = new Fog(bg, 7, 18);
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

  // Rải đều và thưa: chia màn hình thành lưới, mỗi ô nhiều nhất một khối, lệch ngẫu nhiên trong ô,
  // nên không chỗ nào dồn nhiều khối, chỉ thỉnh thoảng hai khối chạm nhẹ nhau.
  const phone = innerWidth < 640;
  const cols = phone ? 4 : 10;
  const rows = phone ? 6 : 5;
  const mat = (c: Color) =>
    new MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.2, transparent: true, opacity });

  let seed = 1996;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const buckets: Item[][] = [[], [], [], []]; // o xanh, x xanh, o trắng, x trắng
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // vùng giữa là chỗ chữ nằm: bỏ trống một phần số ô ở đó để khối dồn ra hai bên
      const middle = phone ? c === 1 || c === 2 : c >= 3 && c <= cols - 4;
      if (middle && rnd() < middleGap) continue;
      const k = rnd();
      const item: Item = {
        nx: -1 + ((c + 0.5 + (rnd() - 0.5) * 0.8) / cols) * 2,
        ny: -1 + ((r + 0.5 + (rnd() - 0.5) * 0.8) / rows) * 2,
        z: -4 + rnd() * 5,
        rx: rnd() * Math.PI * 2,
        ry: rnd() * Math.PI * 2,
        sx: -0.35 + rnd() * 0.7,
        sy: -0.35 + rnd() * 0.7,
        size: 0.18 + k * k * 0.42, // nhỏ là chính, to nhất bằng khoảng một phần ba trước
        period: 9 + rnd() * 9,
        phase: rnd(),
        drift: 0.1 + rnd() * 0.25,
      };
      buckets[(r * cols + c + Math.floor(rnd() * 4)) % 4].push(item);
      // khoảng 1/4 số ô có thêm một khối nhỏ đi kèm, nằm sát và đè nhẹ lên khối chính
      if (rnd() < 0.27) {
        const a = rnd() * Math.PI * 2;
        const gap = (0.35 + rnd() * 0.25) / cols;
        buckets[Math.floor(rnd() * 4)].push({
          ...item,
          nx: item.nx + Math.cos(a) * gap * 2,
          ny: item.ny + Math.sin(a) * gap * 2 * (cols / rows) * 0.6,
          z: item.z + (rnd() - 0.5) * 0.8,
          rx: rnd() * Math.PI * 2,
          ry: rnd() * Math.PI * 2,
          size: 0.12 + rnd() * 0.16,
          period: 9 + rnd() * 9,
          phase: rnd(),
        });
      }
    }
  }
  const geos = [torus, cross, torus, cross];
  const cols4 = [accent, accent, ink, ink];
  const groups = buckets.map((items, i) => ({
    mesh: new InstancedMesh(geos[i], mat(cols4[i].clone()), Math.max(1, items.length)),
    items,
  }));
  groups.forEach((g) => scene.add(g.mesh));

  // Bấm nút sáng/tối: đọc lại màu, tô lại sương mù và khối
  const recolor = () => {
    readColors();
    (scene.fog as Fog).color.copy(bg);
    groups.forEach((g, i) => (g.mesh.material as MeshStandardMaterial).color.copy(i < 2 ? accent : ink));
    renderer.render(scene, camera);
  };
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const dummy = new Object3D();
  const m = new Matrix4();
  const place = (t: number) => {
    for (const g of groups) {
      g.items.forEach((it, i) => {
        // Vòng 0..1: phóng to hiện ra, giữ, thu nhỏ tới 0
        const p = (t / it.period + it.phase) % 1;
        const s = p < 0.3 ? p / 0.3 : p > 0.7 ? (1 - p) / 0.3 : 1 + 0.15 * Math.sin(((p - 0.3) / 0.4) * Math.PI);
        const halfH = Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z - it.z) * 0.94;
        dummy.position.set(it.nx * halfH * camera.aspect, it.ny * halfH + p * it.drift, it.z);
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
