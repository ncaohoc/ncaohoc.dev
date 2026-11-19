import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Pages CMS ghi "" hoặc null cho ô để trống. Coi như không có giá trị để dùng mặc định.
const empty = (v: unknown) => (v === '' || v === null ? undefined : v);
const opt = <T extends z.ZodTypeAny>(s: T) => z.preprocess(empty, s.optional());
const list = () => z.preprocess(empty, z.array(z.string()).default([]));
const draft = () => z.preprocess(empty, z.boolean().default(false));

const base = {
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  updated: opt(z.coerce.date()),
  tags: list(),
  draft: draft(),
};

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      ...base,
      ogImage: opt(image()), // ảnh hiện khi chia sẻ link (LinkedIn, Facebook...), nên 1200×627
    }),
});

const cheatsheets = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/cheatsheets' }),
  schema: z.object(base),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      ...base,
      ogImage: opt(image()), // ảnh hiện khi chia sẻ link (Facebook, LinkedIn...), nên 1200×627
      status: z.preprocess(empty, z.enum(['Đang làm', 'Hoàn thành', 'Tạm dừng']).default('Đang làm')),
      stack: list(),
      repo: opt(z.string().url()),
      link: opt(z.string().url()),
      download: opt(z.string().url()), // link tải bản mới nhất (vd. file exe trên GitHub Releases)
      version: opt(z.coerce.string()), // chỉ dùng khi dự án chưa có bài cập nhật nào; có rồi thì lấy bản mới nhất trong `updates`
      order: z.preprocess(empty, z.number().default(100)),
      featured: z.preprocess(empty, z.boolean().default(false)), // card lớn ở trang chủ và trang Dự án
    }),
});

// Bản cập nhật của dự án: mỗi phiên bản một file, hiện nối dài dưới trang dự án (mới nhất trên cùng).
// `project` là tên file dự án (vd. gpu-toggle-tools). Pages CMS ghi cả đường dẫn
// (src/content/projects/gpu-toggle-tools.md) nên cắt lấy phần tên.
const projectId = (v: unknown) =>
  typeof v === 'string' ? v.replace(/^.*[\\/]/, '').replace(/\.mdx?$/, '') : v;

const updates = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/updates' }),
  schema: z.object({
    project: z.preprocess(projectId, reference('projects')),
    version: z.coerce.string(), // vd. 1.0.2, không có chữ v
    title: z.string(), // tên ngắn cho bản này, vd. "Tự động hoá eGPU"
    description: z.preprocess(empty, z.string().default('')), // một câu tóm tắt, dùng cho RSS
    date: z.coerce.date(),
    draft: draft(),
  }),
});

// Sở thích: nhiếp ảnh, mô hình, ... Mỗi bài thuộc một chủ đề (category).
const hobbies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/hobbies' }),
  schema: ({ image }) =>
    z.object({
      ...base,
      category: z.string(), // ví dụ: 'Nhiếp ảnh', 'Mô hình'
      gear: list(), // máy ảnh, ống kính, kit mô hình...
      cover: opt(image()), // đường dẫn tương đối tới ảnh, ví dụ ../../assets/uploads/anh-bia.jpg
    }),
});

// Album ảnh: mỗi album là một file src/content/albums/<tên-album>.md,
// ảnh nằm trong src/assets/ và được liệt kê trong `photos` (xem src/lib/albums.ts).
const albums = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/albums' }),
  schema: z.object({
    title: z.string(),
    description: z.preprocess(empty, z.string().default('')),
    date: z.coerce.date(),
    camera: opt(z.string()), // tự ghi, ví dụ 'Fujifilm X-T50'
    lens: opt(z.string()),
    location: opt(z.string()),
    tags: list(),
    photos: list(), // đường dẫn ảnh, theo thứ tự hiển thị
    cover: opt(z.string()), // đường dẫn ảnh bìa, mặc định là ảnh đầu tiên
    draft: draft(),
  }),
});

export const collections = { blog, cheatsheets, projects, updates, hobbies, albums };
