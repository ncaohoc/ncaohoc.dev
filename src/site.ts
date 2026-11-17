// Thông tin chung của site. Sửa ở đây là đổi được khắp nơi.
export const SITE = {
  name: 'Cao Học',
  fullName: 'Nguyễn Lê Cao Học',
  seal: '高學', // Hán Việt của "Cao Học", dùng làm con dấu/logo
  title: 'Cao Học — Unity game developer',
  description:
    'Blog cá nhân của Nguyễn Lê Cao Học: gameplay, shader, ghi chép học thuật và những dự án tự làm.',
  url: 'https://ncaohoc.dev',
  lang: 'vi',
};

export const NAV = [
  { href: '/blog/', label: 'Blog' },
  { href: '/cheatsheets/', label: 'Cheatsheet' },
  { href: '/projects/', label: 'Dự án' },
  { href: '/hobbies/', label: 'Sở thích' },
  { href: '/cv/', label: 'CV' },
];

export function formatDate(d: Date) {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Sắp xếp mới nhất lên trước và bỏ bài nháp khi build production
export function published<T extends { data: { date: Date; draft: boolean } }>(items: T[]) {
  return items
    .filter((i) => import.meta.env.DEV || !i.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// "Nhiếp ảnh" -> "nhiep-anh", dùng làm id/anchor
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Thứ tự dự án: nổi bật lên đầu, sau đó theo `order`
export function byProjectOrder<T extends { data: { order: number; featured: boolean } }>(a: T, b: T) {
  return Number(b.data.featured) - Number(a.data.featured) || a.data.order - b.data.order;
}

// Dữ liệu một dự án cho ProjectCards
export function projectCard(p: {
  id: string;
  data: { title: string; description: string; status: string; stack: string[]; repo?: string; featured: boolean };
}) {
  return {
    href: `/projects/${p.id}/`,
    title: p.data.title,
    description: p.data.description,
    status: p.data.status,
    stack: p.data.stack,
    repo: p.data.repo,
    featured: p.data.featured,
  };
}
