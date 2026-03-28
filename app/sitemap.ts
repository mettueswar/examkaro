import { MetadataRoute } from 'next';
import { query } from '@/lib/db';
import type { MockTest, NewsArticle, Category } from '@/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://examkaro.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/tests`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/news`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/packages`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  const tests = await query<MockTest>('SELECT slug, updated_at FROM mock_tests WHERE is_active = 1').catch(() => []);
  const testRoutes: MetadataRoute.Sitemap = tests.map(t => ({
    url: `${baseUrl}/tests/${t.slug}`,
    lastModified: t.updatedAt || new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const categories = await query<Category>('SELECT slug FROM categories WHERE is_active = 1').catch(() => []);
  const categoryRoutes: MetadataRoute.Sitemap = categories.map(c => ({
    url: `${baseUrl}/tests?category=${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const articles = await query<NewsArticle>(
    'SELECT slug, updated_at FROM news_articles WHERE published = 1'
  ).catch(() => []);
  const newsRoutes: MetadataRoute.Sitemap = articles.map(a => ({
    url: `${baseUrl}/news/${a.slug}`,
    lastModified: a.updatedAt || new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...testRoutes, ...categoryRoutes, ...newsRoutes];
}
