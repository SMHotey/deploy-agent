"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BrowseReviewsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects/submit-for-review?status=approved')
      .then(r => r.json())
      .then(data => {
        setSubmissions(data.submissions || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Browse Projects for Review</h1>
        <p className="text-zinc-400 mb-8">Test projects, earn points!</p>

        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400">No projects available for review yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissions.map((s: any) => (
              <div key={s.id} className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors">
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-zinc-400 text-sm mb-4 line-clamp-3">{s.description}</p>
                <div className="flex justify-between text-sm text-zinc-500 mb-4">
                  <span>👤 {s.testers.current}/{s.testers.max} testers</span>
                  <span className="text-green-400 font-medium">{s.pointsReward} pts</span>
                </div>
                <button
                  onClick={() => router.push(`/review/${s.id}`)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Review This Project
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
