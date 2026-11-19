import { getCollection, type CollectionEntry } from 'astro:content';

export type Update = CollectionEntry<'updates'>;

// So sánh phiên bản dạng 1.0.10 > 1.0.9 (không so như chuỗi)
export function compareVersion(a: string, b: string) {
  const pa = a.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// Anchor của một bản trên trang dự án: 1.0.2 -> v1-0-2
export const versionAnchor = (v: string) => `v${v.replace(/[^a-zA-Z0-9]+/g, '-')}`;

// Mọi bản cập nhật đã đăng, mới nhất lên trước (cùng ngày thì theo số phiên bản)
export async function getUpdates(projectId?: string) {
  const all = await getCollection(
    'updates',
    (u) => (import.meta.env.DEV || !u.data.draft) && (!projectId || u.data.project.id === projectId),
  );
  return all.sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf() || compareVersion(b.data.version, a.data.version),
  );
}

// Phiên bản mới nhất của từng dự án, lấy từ bài cập nhật
export async function latestVersions() {
  const map = new Map<string, string>();
  for (const u of await getUpdates()) {
    if (!map.has(u.data.project.id)) map.set(u.data.project.id, u.data.version);
  }
  return map;
}
