'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

interface ReferralStats {
  total: number;
  completed: number;
  pending: number;
  rewarded: number;
}

interface Referral {
  id: string;
  referredEmail: string;
  status: string;
  createdAt: string;
  rewardClaimed: boolean;
}

interface ReferralData {
  referralCode: string | null;
  referralLink: string | null;
  stats: ReferralStats;
  referrals: Referral[];
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetch('/api/referrals', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleClaimRewards = async () => {
    setClaiming(true);
    try {
      const res = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.ok) {
        alert(`Claimed ${data.claimed} reward(s)!`);
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    } finally {
      setClaiming(false);
    }
  };

  const copyToClipboard = () => {
    if (data?.referralLink) {
      navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Link href="/" className="text-blue-500 hover:underline">
          Please log in to view referrals
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            <span className="gradient-text">Referral</span> Program
          </h1>
          <p className="text-xl text-muted-foreground">
            Invite friends, earn rewards. Both of you get benefits!
          </p>
        </div>

        {/* Referral Link Card */}
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Referral Link</h2>
          {data?.referralLink ? (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={data.referralLink}
                  readOnly
                  className="flex-1 rounded-lg border border-border bg-muted px-4 py-2 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this link with friends. When they sign up and deploy, you both earn rewards!
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Generating your referral code...</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
            <div className="text-3xl font-bold text-blue-500">{data?.stats.total || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Referrals</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
            <div className="text-3xl font-bold text-green-500">{data?.stats.completed || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
            <div className="text-3xl font-bold text-yellow-500">{data?.stats.pending || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Pending</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
            <div className="text-3xl font-bold text-purple-500">{data?.stats.rewarded || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Rewards Claimed</div>
          </div>
        </div>

        {/* Claim Rewards Button */}
        {data && data.stats.completed > data.stats.rewarded && (
          <div className="mb-8 text-center">
            <button
              onClick={handleClaimRewards}
              disabled={claiming}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {claiming ? 'Claiming...' : `Claim ${data.stats.completed - data.stats.rewarded} Reward(s)`}
            </button>
          </div>
        )}

        {/* Referrals List */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Your Referrals</h2>
          {!data?.referrals || data.referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referrals yet. Share your link to start earning!
            </div>
          ) : (
            <div className="space-y-4">
              {data.referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card/30 p-4"
                >
                  <div>
                    <p className="font-medium">{referral.referredEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        referral.status === 'completed'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}
                    >
                      {referral.status}
                    </span>
                    {referral.rewardClaimed && (
                      <p className="text-xs text-muted-foreground mt-1">Reward claimed</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* How it Works */}
        <section className="mt-16 pt-8 border-t border-border">
          <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">1️⃣</div>
              <h3 className="font-semibold mb-2">Share Your Link</h3>
              <p className="text-sm text-muted-foreground">
                Copy your unique referral link and share it with friends.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">2️⃣</div>
              <h3 className="font-semibold mb-2">Friend Signs Up</h3>
              <p className="text-sm text-muted-foreground">
                They register using your link and become a referred user.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">3️⃣</div>
              <h3 className="font-semibold mb-2">Both Get Rewards</h3>
              <p className="text-sm text-muted-foreground">
                When they deploy their first project, you both earn credits!
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
