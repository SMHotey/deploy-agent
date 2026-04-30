import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, teamMembers, teams } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { authenticate } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function AdminUsersPage() {
  const headersList = await headers();
  const request = new Request('http://localhost', { headers: headersList });
  const session = await authenticate(request);

  if (!session?.isAdmin) {
    redirect('/');
  }

  const t = await getTranslations('admin');

  const allUsers = await db.query.users.findMany({
    with: {
      teamMemberships: {
        with: {
          team: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t('users')}</h1>
          <Link href="/admin" className="text-blue-400 hover:text-blue-300">
            Back to Overview
          </Link>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">ID</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Email</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Name</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Admin</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Teams</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-700/50">
                  <td className="p-4">{user.id}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.name || '-'}</td>
                  <td className="p-4">
                    {user.isAdmin ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="p-4">
                    {user.teamMemberships.map((tm) => tm.team.name).join(', ') || '-'}
                  </td>
                  <td className="p-4">
                    {!user.isAdmin ? (
                      <form action={`/api/admin/users`} method="PATCH">
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="isAdmin" value="true" />
                        <button type="submit" className="text-blue-400 hover:text-blue-300 text-sm">
                          {t('make_admin')}
                        </button>
                      </form>
                    ) : (
                      <form action={`/api/admin/users`} method="PATCH">
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="isAdmin" value="false" />
                        <button type="submit" className="text-red-400 hover:text-red-300 text-sm">
                          {t('remove_admin')}
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
