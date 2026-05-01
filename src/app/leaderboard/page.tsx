"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch leaderboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">🏆 Leaderboard</h1>
        <p className="text-zinc-400 mb-8">Top testers ranked by points</p>

        {data?.leaderboard?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">No entries yet. Be the first!</p>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4">Rank</th>
                  <th className="text-left p-4">User</th>
                  <th className="text-right p-4">Points</th>
                  <th className="text-right p-4">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {data?.leaderboard?.map((entry: any) => (
                  <tr key={entry.rank} className="border-b border-zinc-800/50 hover:bg-zinc-800/50">
                    <td className="p-4">
                      <span className="font-bold">#{entry.rank}</span>
                    </td>
                    <td className="p-4">{entry.user?.name || `User ${entry.userId}`}</td>
                    <td className="p-4 text-right text-blue-400 font-bold">{entry.points} pts</td>
                    <td className="p-4 text-right text-zinc-300">{entry.reviewsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.userRank && (
          <div className="mt-8 bg-blue-600/20 border border-blue-500/30 rounded-xl p-6">
            <h3 className="font-semibold">Your Rank: #{data.userRank}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
