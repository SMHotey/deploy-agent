import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { landingPages } from '@/db/schema';
import { authenticate } from '@/lib/auth';
import Link from 'next/link';
import GenerateForm from './GenerateForm';

export default async function GenerateLandingPage() {
  const session = await authenticate(new Request('http://localhost'));
  if (!session?.isAdmin) {
    redirect('/');
  }

  const t = await getTranslations('admin');
  const pages = await db
    .select()
    .from(landingPages)
    .orderBy(landingPages.createdAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold">{t('generate_landing') || 'Generate Landing Page'}</h1>
          </div>
          <button
            onClick={() => (document.getElementById('generate-modal') as HTMLDialogElement)?.showModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Generate New
          </button>
        </div>

        {/* Existing Pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {pages.map((page) => (
            <div
              key={page.id}
              className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{page.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  page.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {page.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-2">Topic: {page.topic}</p>
              <p className="text-slate-500 text-xs mb-4">Slug: /landing/{page.slug}</p>
              <div className="flex gap-3">
                <Link
                  href={`/landing/${page.slug}`}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View →
                </Link>
                {!page.isPublished && (
                  <form action={`/api/admin/generate-landing/publish?id=${page.id}`} method="POST">
                    <button type="submit" className="text-green-400 hover:text-green-300 text-sm">
                      Publish
                    </button>
                  </form>
                )}
                <form action={`/api/admin/generate-landing/delete?id=${page.id}`} method="POST" className="ml-auto">
                  <button type="submit" className="text-red-400 hover:text-red-300 text-sm">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        {pages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No landing pages yet.</p>
            <p className="text-slate-500 text-sm mt-2">Click "+ Generate New" to create your first AI-powered landing page.</p>
          </div>
        )}

        {/* Generate Modal */}
        <dialog id="generate-modal" className="bg-slate-800 border border-slate-700 rounded-xl p-0 max-w-2xl w-full backdrop:bg-black/50 open:flex open:flex-col">
          <GenerateForm />
        </dialog>
      </div>
    </div>
  );
}
