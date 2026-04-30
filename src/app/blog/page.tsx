import Link from 'next/link';
import { getAllPosts } from '@/lib/blog/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - Deploy Agent',
  description: 'Latest news, tutorials, and insights from the Deploy Agent team.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            <span className="gradient-text">Deploy Agent</span> Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tutorials, guides, and insights to help you ship faster.
          </p>
        </div>

        {/* Posts Grid */}
        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
            >
              <Link href={`/blog/${post.slug}`} className="block">
                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
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

                {/* Title */}
                <h2 className="text-2xl font-semibold mb-3 group-hover:text-blue-500 transition-colors">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Read more */}
                <div className="mt-4 text-sm text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more →
                </div>
              </Link>
            </article>
          ))}
        </div>

        {/* Empty state */}
        {posts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
