import { defineCollection, z } from 'astro:content';
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
  schema: z.object(base),
});

const cheatsheets = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/cheatsheets' }),
  schema: z.object(base),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    ...base,
    status: z.preprocess(empty, z.enum(['Đang làm', 'Hoàn thành', 'Tạm dừng']).default('Đang làm')),
    stack: list(),
    repo: opt(z.string().url()),
    link: opt(z.string().url()),
    order: z.preprocess(empty, z.number().default(100)),
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

export const collections = { blog, cheatsheets, projects, hobbies, albums };
