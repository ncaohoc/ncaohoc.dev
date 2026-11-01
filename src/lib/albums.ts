// Ảnh của album nằm trong src/assets/ (Pages CMS tải lên src/assets/uploads/).
// File album src/content/albums/<tên-album>.md liệt kê ảnh trong `photos`, theo đúng thứ tự hiển thị:
//   photos:
//     - ../../assets/uploads/01-cau-thu-thiem.jpg
// Tên file thành chú thích: "01-cau-thu-thiem.jpg" -> "cau thu thiem". Tên gốc của máy (DSCF1234) thì không có chú thích.
import type { ImageMetadata } from 'astro';
import type { CollectionEntry } from 'astro:content';

const files = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
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

// "../../assets/uploads/a.jpg", "/src/assets/uploads/a.jpg"... -> "/src/assets/uploads/a.jpg"
function toKey(path: string) {
  const i = path.indexOf('assets/');
  return i < 0 ? '' : `/src/${path.slice(i)}`;
}

function toPhoto(path: string): Photo | undefined {
  const key = toKey(path);
  const mod = files[key];
  if (!mod) {
    console.warn(`[albums] Không tìm thấy ảnh: ${path}`);
    return undefined;
  }
  const file = key.split('/').pop() ?? '';
  return { id: key, file, img: mod.default, caption: toCaption(file) };
}

type Album = CollectionEntry<'albums'>;

// Tên file chính là đường dẫn của album: /hobbies/anh/<tên-file>/
export function albumSlug(entry: Album) {
  return entry.id;
}

export function albumPhotos(entry: Album) {
  return entry.data.photos.map(toPhoto).filter((p): p is Photo => !!p);
}

export function albumCover(entry: Album) {
  const photos = albumPhotos(entry);
  const key = entry.data.cover ? toKey(entry.data.cover) : '';
  return photos.find((p) => p.id === key) ?? (key ? toPhoto(entry.data.cover!) : undefined) ?? photos[0];
}
