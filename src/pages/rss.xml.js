import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE, published } from '../site';

export async function GET(context) {
  const posts = published(await getCollection('blog')).map((p) => ({
    title: p.data.title,
    description: p.data.description,
    pubDate: p.data.date,
    link: `/blog/${p.id}/`,
  }));
  const sheets = published(await getCollection('cheatsheets')).map((s) => ({
    title: `Cheatsheet: ${s.data.title}`,
    description: s.data.description,
    pubDate: s.data.date,
    link: `/cheatsheets/${s.id}/`,
  }));

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: [...posts, ...sheets].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()),
    customData: '<language>vi</language>',
  });
}
