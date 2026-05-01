import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation - Deploy Agent',
  description: 'Complete documentation for Deploy Agent - API reference, guides, and tutorials.',
};

interface DocItem {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
}

async function getDocs(): Promise<DocItem[]> {
  const baseUrl = process.env.DEPLOY_AGENT_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/docs`);
    const data = await res.json();
    return data.docs || [];
  } catch {
    return [];
  }
}

export default async function DocsPage() {
  const docs = await getDocs();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            <span className="gradient-text">Documentation</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to deploy with confidence.
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Link
            href="/docs/guides/quickstart"
            className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
          >
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-500 transition-colors">
              Quick Start
            </h3>
            <p className="text-sm text-muted-foreground">
              Get your first deployment live in 5 minutes.
            </p>
          </Link>

          <Link
            href="/api/instructions"
            className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
          >
            <div className="text-3xl mb-3">📖</div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-500 transition-colors">
              API Reference
            </h3>
            <p className="text-sm text-muted-foreground">
              Complete API endpoint documentation.
            </p>
          </Link>

          <Link
            href="/blog"
            className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
          >
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-500 transition-colors">
              Blog & Tutorials
            </h3>
            <p className="text-sm text-muted-foreground">
              Guides, best practices, and case studies.
            </p>
          </Link>
        </div>

        {/* Docs List */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Documentation</h2>
          {docs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documentation available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/docs/${doc.slug}`}
                  className="group flex items-start gap-4 rounded-xl border border-border/50 bg-card/30 p-4 transition-all duration-300 hover:border-blue-500/30 hover:bg-card/50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium group-hover:text-blue-500 transition-colors">
                      {doc.title}
                    </h3>
                    {doc.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {doc.excerpt}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
