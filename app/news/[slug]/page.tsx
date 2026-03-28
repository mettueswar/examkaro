import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { queryOne, execute } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Calendar, Eye, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { NewsArticle } from '@/types';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await queryOne<NewsArticle>(
    'SELECT title, excerpt FROM news_articles WHERE slug = ? AND published = 1',
    [slug]
  ).catch(() => null);
  return {
    title: article?.title || 'Article',
    description: article?.excerpt || '',
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;

  const article = await queryOne<NewsArticle & { author_name: string }>(
    `SELECT n.*, u.name as author_name FROM news_articles n
     LEFT JOIN users u ON n.author_id = u.id
     WHERE n.slug = ? AND n.published = 1`,
    [slug]
  ).catch(() => null);

  if (!article) notFound();

  // Increment view count
  await execute('UPDATE news_articles SET view_count = view_count + 1 WHERE slug = ?', [slug]).catch(() => {});

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/news" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-500 mb-6">
          <ArrowLeft size={14} /> Back to News
        </Link>

        <article>
          {article.featuredImage && (
            <div className="rounded-xl overflow-hidden mb-6 h-64">
              <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          <h1 className="text-2xl font-display font-bold text-surface-900 mb-3 leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-surface-500 mb-6 pb-6 border-b border-surface-200">
            {article.author_name && (
              <span className="flex items-center gap-1.5">
                <User size={12} /> {article.author_name}
              </span>
            )}
            {article.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye size={12} /> {article.viewCount} views
            </span>
          </div>

          <div
            className="prose prose-sm max-w-none text-surface-700 leading-relaxed
              prose-headings:font-display prose-headings:text-surface-900
              prose-a:text-brand-500 prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-blockquote:border-brand-400"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
      </main>
      <Footer />
    </>
  );
}
