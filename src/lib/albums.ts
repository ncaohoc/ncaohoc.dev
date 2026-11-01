// Gom ảnh theo album. Ảnh nằm cùng thư mục với index.md của album:
//   src/content/albums/sai-gon-mua-mua/index.md
//   src/content/albums/sai-gon-mua-mua/01-cau-thu-thiem.jpg
// Ảnh xếp theo tên file (01-, 02-...). Phần còn lại của tên file thành chú thích:
// "01-cau-thu-thiem.jpg" -> "cau thu thiem". Tên gốc của máy (DSCF1234) thì không có chú thích.
import type { ImageMetadata } from 'astro';
import type { CollectionEntry } from 'astro:content';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/albums/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

export interface Photo {
  id: string;
  file: string;
  img: ImageMetadata;
  caption: string;
}

function toCaption(file: string) {
  const name = file.replace(/\.[^.]+$/, '');
  if (/^[A-Za-z_]{0,5}\d+$/.test(name)) return '';
  return name
    .replace(/^\d{4}[-_]?\d{2}[-_]?\d{2}[\s_-]*/, '')
    .replace(/^\d{1,3}[\s_.-]+/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

const byFolder = new Map<string, Photo[]>();
for (const [path, mod] of Object.entries(files)) {
  const parts = path.split('/');
  const file = parts.pop() ?? '';
  const folder = parts.pop() ?? '';
  const list = byFolder.get(folder) ?? [];
  list.push({ id: path, file, img: mod.default, caption: toCaption(file) });
  byFolder.set(folder, list);
}
for (const list of byFolder.values()) {
  list.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));
}

type Album = CollectionEntry<'albums'>;

// Tên thư mục chính là đường dẫn của album: /hobbies/anh/<tên-thư-mục>/
export function albumSlug(entry: Album) {
  const parts = (entry.filePath ?? entry.id).split('/');
  return parts.length > 1 ? parts[parts.length - 2] : entry.id;
}

export function albumPhotos(entry: Album) {
  return byFolder.get(albumSlug(entry)) ?? [];
}

export function albumCover(entry: Album) {
  const photos = albumPhotos(entry);
  return photos.find((p) => p.file === entry.data.cover) ?? photos[0];
}
