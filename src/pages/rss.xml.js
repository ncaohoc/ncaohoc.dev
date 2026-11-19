import { getRssString } from '@astrojs/rss';
import { getCollection, getEntry } from 'astro:content';
import { SITE, published } from '../site';
import { getUpdates, versionAnchor } from '../lib/updates';

export async function GET(context) {
  const posts = published(await getCollection('blog')).map((p) => ({
    title: p.data.title,
    description: p.data.description,
    pubDate: p.data.date,
    link: `/blog/${p.id}/`,
  }));
  const sheets = published(await getCollection('cheatsheets')).map((s) => ({
    title: `Kiến thức: ${s.data.title}`,
    description: s.data.description,
    pubDate: s.data.date,
    link: `/kien-thuc/${s.id}/`,
  }));
  // Bản cập nhật dự án: link thẳng tới đúng bản trên trang dự án
  const updates = [];
  for (const u of await getUpdates()) {
    const project = await getEntry(u.data.project);
    if (!project || (!import.meta.env.DEV && project.data.draft)) continue;
    updates.push({
      title: `${project.data.title} v${u.data.version}: ${u.data.title}`,
      description: u.data.description || u.data.title,
      pubDate: u.data.date,
      link: `/projects/${project.id}/#${versionAnchor(u.data.version)}`,
    });
  }

  const xml = await getRssString({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: [...posts, ...sheets, ...updates].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()),
    customData: '<language>vi</language>',
  });
  // @astrojs/rss thêm / vào cuối mọi link, kể cả sau anchor (#v1-0-2/). Bỏ dấu / đó đi.
  return new Response(xml.replace(/(#[\w-]+)\/</g, '$1<'), {
    headers: { 'Content-Type': 'application/xml' },
  });
}
