import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const base = {
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
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
    status: z.enum(['Đang làm', 'Hoàn thành', 'Tạm dừng']).default('Đang làm'),
    stack: z.array(z.string()).default([]),
    repo: z.string().url().optional(),
    link: z.string().url().optional(),
    order: z.number().default(100),
  }),
});

// Sở thích: nhiếp ảnh, mô hình, ... Mỗi bài thuộc một chủ đề (category).
const hobbies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/hobbies' }),
  schema: ({ image }) =>
    z.object({
      ...base,
      category: z.string(), // ví dụ: 'Nhiếp ảnh', 'Mô hình'
      gear: z.array(z.string()).default([]), // máy ảnh, ống kính, kit mô hình...
      cover: image().optional(), // đường dẫn tương đối tới ảnh, ví dụ ./anh-bia.jpg
    }),
});

// Album ảnh: mỗi album là một thư mục trong src/content/albums/<tên-album>/
// gồm file index.md (mô tả) và các file ảnh để cùng chỗ.
const albums = defineCollection({
  loader: glob({ pattern: '*/index.{md,mdx}', base: './src/content/albums' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    camera: z.string().optional(), // tự ghi, ví dụ 'Fujifilm X-T50'
    lens: z.string().optional(),
    location: z.string().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(), // tên file ảnh bìa, mặc định là ảnh đầu tiên
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, cheatsheets, projects, hobbies, albums };
