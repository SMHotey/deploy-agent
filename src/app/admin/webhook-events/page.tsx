import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { webhookEvents } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { authenticate } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function AdminWebhookEventsPage() {
  const headersList = await headers();
  const request = new Request('http://localhost', { headers: headersList });
  const session = await authenticate(request);

  if (!session?.isAdmin) {
    redirect('/');
  }

  const t = await getTranslations('admin');

  const events = await db.query.webhookEvents.findMany({
    orderBy: [desc(webhookEvents.createdAt)],
    limit: 50,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t('webhook_events')}</h1>
          <Link href="/admin" className="text-blue-400 hover:text-blue-300">
            Back to Overview
          </Link>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">ID</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Source</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Event Type</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Status</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Retry Count</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Created</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-slate-700/50">
                  <td className="p-4">{event.id}</td>
                  <td className="p-4">{event.source}</td>
                  <td className="p-4">{event.eventType}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'processed' ? 'bg-green-500/20 text-green-400' :
                      event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="p-4">{event.retryCount}</td>
                  <td className="p-4 text-slate-400 text-sm">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    {event.status !== 'processed' && (
                      <form action="/api/admin/webhook-events" method="POST">
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="action" value="replay" />
                        <button type="submit" className="text-blue-400 hover:text-blue-300 text-sm">
                          Replay
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
