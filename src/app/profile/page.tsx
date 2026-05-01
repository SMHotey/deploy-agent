"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PointsData {
  points: {
    userId: number;
    totalPoints: number;
    availablePoints: number;
    spentPoints: number;
    level: number;
  };
  transactions: Array<{
    id: number;
    amount: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
  leaderboardRank: {
    overall: number | null;
    categories: Array<{
      category: string;
      rank: number;
      points: number;
    }>;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<PointsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'rankings'>('overview');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      
      if (res.ok) {
        setData(data);
      } else {
        setError(data.error || 'Failed to fetch profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = (level: number, totalPoints: number) => {
    const currentLevelMin = (level - 1) * 1000;
    const nextLevelMin = level * 1000;
    const progress = ((totalPoints - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
    return Math.min(progress, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 mb-2">Error loading profile</p>
          <p className="text-zinc-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-zinc-400">Track your points, level, and rankings</p>
        </div>

        {data && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-sm">Total Points</span>
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-yellow-500">{data.points.totalPoints}</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-sm">Available</span>
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-green-500">{data.points.availablePoints}</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-sm">Level</span>
                  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-purple-500">{data.points.level}</div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-sm">Spent</span>
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-red-500">{data.points.spentPoints}</div>
              </div>
            </div>

            {/* Level Progress */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Level Progress</h2>
                <span className="text-zinc-400">Level {data.points.level}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${getLevelProgress(data.points.level, data.points.totalPoints)}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-zinc-400">
                <span>{data.points.totalPoints} pts</span>
                <span>{data.points.level * 1000} pts needed for next level</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'overview' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`pb-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'transactions' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('rankings')}
                className={`pb-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'rankings' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                Rankings
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Overall Rank</span>
                    <span className="text-xl font-bold text-yellow-500">
                      #{data.leaderboardRank.overall || 'Unranked'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Total Transactions</span>
                    <span className="text-xl font-bold">{data.transactions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Category Rankings</span>
                    <span className="text-xl font-bold">{data.leaderboardRank.categories.length}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                {data.transactions.length === 0 ? (
                  <p className="text-zinc-400 text-center py-8">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-sm text-zinc-400">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`text-lg font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount} pts
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rankings' && (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Overall Ranking</h3>
                  {data.leaderboardRank.overall ? (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Your Rank</span>
                      <span className="text-3xl font-bold text-yellow-500">#{data.leaderboardRank.overall}</span>
                    </div>
                  ) : (
                    <p className="text-zinc-400 text-center py-4">Not ranked yet. Submit reviews to get ranked!</p>
                  )}
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Category Rankings</h3>
                  {data.leaderboardRank.categories.length === 0 ? (
                    <p className="text-zinc-400 text-center py-4">No category rankings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {data.leaderboardRank.categories.map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                          <div>
                            <p className="font-medium capitalize">{cat.category.replace('-', ' ')}</p>
                            <p className="text-sm text-zinc-400">{cat.points} points</p>
                          </div>
                          <span className="text-xl font-bold text-blue-500">#{cat.rank}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.push('/review')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Start Reviewing
          </button>
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
