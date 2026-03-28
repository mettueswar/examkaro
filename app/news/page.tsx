import Link from 'next/link';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Calendar, Eye, ArrowRight } from 'lucide-react';
import type { NewsArticle } from '@/types';

export const metadata: Metadata = {
  title: 'Current Affairs & News',
  description: 'Latest current affairs, exam updates and news for SSC, Banking, Railway and UPSC aspirants',
};

export default async function NewsPage() {
  const articles = await query<NewsArticle & { author_name: string }>(
    `SELECT n.id, n.title, n.slug, n.excerpt, n.featured_image,
            n.published_at, n.view_count, u.name as author_name
     FROM news_articles n LEFT JOIN users u ON n.author_id = u.id
     WHERE n.published = 1 ORDER BY n.published_at DESC LIMIT 24`
  ).catch(() => []);

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-display font-bold text-surface-900">Current Affairs & News</h1>
          <p className="text-surface-500 text-sm mt-1">Stay updated with the latest exam news and current affairs</p>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-surface-400 font-medium">No articles published yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map(article => (
              <Link
                key={article.id}
                href={`/news/${article.slug}`}
                className="card overflow-hidden group hover:shadow-elevated hover:border-brand-200 transition-all"
              >
                {article.featuredImage ? (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-24 bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                    <span className="text-white font-display font-bold text-2xl opacity-20">EK</span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-semibold text-surface-800 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="text-xs text-surface-500 line-clamp-2 mb-3">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-surface-400">
                    {article.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(article.publishedAt).toLocaleDateString('en-IN')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye size={10} /> {article.viewCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
