import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string[] }>;
}

async function getDoc(slug: string) {
  const baseUrl = process.env.DEPLOY_AGENT_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/docs?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join('/');
  const doc = await getDoc(path);

  if (!doc) return {};

  return {
    title: `${doc.title} - Deploy Agent Docs`,
    description: doc.excerpt,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const path = slug.join('/');
  const doc = await getDoc(path);

  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
            Docs
          </Link>
          <span className="text-muted-foreground mx-2">/</span>
          <span className="text-sm text-foreground">{doc.title}</span>
        </nav>

        {/* Article */}
        <article>
          <header className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              {doc.title}
            </h1>
            {doc.date && (
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(doc.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </header>

          <div className="prose prose-invert prose-blue max-w-none
            prose-headings:font-semibold
            prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
            prose-code:before:content-none prose-code:after:content-none
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border
          ">
            <MDXRemote source={doc.content} />
          </div>
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border flex justify-between">
          <Link href="/docs" className="text-blue-500 hover:underline">
            ← Back to Docs
          </Link>
          <Link href="/blog" className="text-blue-500 hover:underline">
            Read Blog →
          </Link>
        </footer>
      </div>
    </div>
  );
}
