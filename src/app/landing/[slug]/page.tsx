import DynamicLanding from '@/components/DynamicLanding';
import { db } from '@/db';
import { landingPages } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LandingPage({ params }: PageProps) {
  const { slug } = await params;

  const pages = await db
    .select()
    .from(landingPages)
    .where(eq(landingPages.slug, slug))
    .limit(1);

  if (pages.length === 0 || !pages[0].isPublished) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
          <p className="text-zinc-400">This landing page doesn't exist or isn't published yet.</p>
        </div>
      </div>
    );
  }

  const page = pages[0];
  const config = page.config as any;

  return <DynamicLanding config={config} slug={slug} />;
}
