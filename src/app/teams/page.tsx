'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

interface Team {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  createdAt: string;
}

export default function TeamsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, getToken } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch teams');
      }

      const data = await res.json();
      setTeams(data.teams || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch teams';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (!user) return;
    fetchTeams();
  }, [user, authLoading, router]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newTeamName) return;

    try {
      const token = getToken();
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDesc,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create team');
      }

      toastSuccess('Team created successfully!');
      setShowCreateModal(false);
      setNewTeamName('');
      setNewTeamDesc('');
      fetchTeams();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create team';
      setError(message);
      toastError(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400 animate-pulse">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                Teams
              </h1>
              <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
                Manage your teams and collaboration
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>+ Create Team</Button>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Back to Dashboard
          </Link>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              No teams yet
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Create a team to collaborate with others
            </p>
            <Button size="lg" onClick={() => setShowCreateModal(true)}>
              Create Your First Team
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(team => (
              <Card key={team.id} className="hover:shadow-md transition-shadow animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="text-xl">{team.name}</CardTitle>
                  {team.description && (
                    <CardDescription className="mt-2">{team.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Created: {new Date(team.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <Card className="w-full max-w-md animate-scale-in">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl">Create Team</CardTitle>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <Input
                    label="Team Name *"
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="My Team"
                  />

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newTeamDesc}
                      onChange={(e) => setNewTeamDesc(e.target.value)}
                      placeholder="Optional team description..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Create Team
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
