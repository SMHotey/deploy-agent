import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/blog/utils';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) return {};

  return {
    title: `${post.title} - Deploy Agent Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors group"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
            Back to all posts
          </Link>

          {/* Article */}
          <article>
            <header className="mb-12">
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                {post.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <span>·</span>
                <span>{post.author}</span>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500 hover:bg-blue-500/20 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Content */}
            <div className="prose prose-invert prose-blue max-w-none
              prose-headings:font-semibold
              prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
              prose-code:before:content-none prose-code:after:content-none
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border
            ">
              <MDXRemote source={post.content} />
            </div>
          </article>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-border flex items-center justify-between">
            <Link href="/blog" className="text-blue-500 hover:underline">
              ← Back to Blog
            </Link>
            <Link href="/docs" className="text-blue-500 hover:underline">
              Read Docs →
            </Link>
          </footer>
        </div>
      </div>
    );
}
