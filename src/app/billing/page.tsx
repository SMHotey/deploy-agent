'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BillingInfo {
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  features: string[];
  limits: {
    plan: string;
    checks: {
      deployments: { allowed: boolean; current: number; limit: number };
      projects: { allowed: boolean; current: number; limit: number };
    };
    maxDeploymentsPerDay: number;
    maxProjects: number;
    maxTeamMembers: number;
    maxStorageBytes: number;
  };
}

export default function BillingPage() {
  const router = useRouter();
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchBillingInfo();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
    }
  };

  const fetchBillingInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch('/api/billing', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch billing info');
      }

      const data = await res.json();
      setBillingInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    if (!confirm(`Upgrade to ${plan} plan? (Demo mode - no payment)`)) {
      return;
    }

    setUpgrading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'upgrade', plan }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upgrade');
      }

      alert('Subscription upgraded successfully! (Demo mode)');
      fetchBillingInfo();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel subscription at period end?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel');
      }

      alert('Subscription will cancel at period end.');
      fetchBillingInfo();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      'free': 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300',
      'pro': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'team': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'enterprise': 'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400',
    };
    return colors[plan] || colors.free;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === Infinity) return 'Unlimited';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading billing info...</div>
      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Failed to load billing info</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Calculate usage percentages
  const deploymentPercent = billingInfo.limits.checks.deployments.limit === Infinity 
    ? 0 
    : Math.min(100, (billingInfo.limits.checks.deployments.current / billingInfo.limits.maxDeploymentsPerDay) * 100);
  
  const projectPercent = billingInfo.limits.maxProjects === Infinity
    ? 0
    : Math.min(100, (billingInfo.limits.checks.projects.current / billingInfo.limits.maxProjects) * 100);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                Billing & Plans
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Manage your subscription and view usage
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Current Plan
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(billingInfo.subscription.plan)}`}>
                  {billingInfo.subscription.plan.toUpperCase()}
                </span>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Status: {billingInfo.subscription.status} • Renews: {new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              {billingInfo.subscription.plan !== 'enterprise' && (
                <button
                  onClick={() => handleCancel()}
                  className="px-4 py-2 border border-red-300 text-red-600 font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Cancel Plan
                </button>
              )}
            </div>

            {/* Features */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Features Included:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {billingInfo.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Limits */}
            <div>
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Usage Limits:</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Daily Deployments</span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {billingInfo.limits.checks.deployments.current} / {billingInfo.limits.checks.deployments.limit === Infinity ? '∞' : billingInfo.limits.checks.deployments.limit}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${deploymentPercent}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400">Projects</span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {billingInfo.limits.checks.projects.current} / {billingInfo.limits.maxProjects === Infinity ? '∞' : billingInfo.limits.checks.projects.limit}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${projectPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Storage</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {formatBytes(billingInfo.limits.maxStorageBytes)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            Available Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { plan: 'free', price: '$0', description: 'For personal projects' },
              { plan: 'pro', price: '$29/mo', description: 'For professional developers' },
              { plan: 'team', price: '$99/mo', description: 'For teams and startups' },
              { plan: 'enterprise', price: '$499+/mo', description: 'For large organizations' },
            ].map(({ plan, price, description }) => (
              <div
                key={plan}
                className={`bg-white dark:bg-zinc-900 rounded-lg shadow-sm border-2 p-6 relative ${
                  billingInfo.subscription.plan === plan
                    ? 'border-blue-600'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {billingInfo.subscription.plan === plan && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                    CURRENT
                  </div>
                )}
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                  {plan}
                </h3>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                  {price}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {description}
                </p>
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={upgrading || billingInfo.subscription.plan === plan}
                  className={`mt-4 w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    billingInfo.subscription.plan === plan
                      ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {upgrading
                    ? 'Processing...'
                    : billingInfo.subscription.plan === plan
                    ? 'Current Plan'
                    : 'Upgrade (Demo)'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Mode Notice */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Demo Mode:</strong> This is a demonstration of the billing system. No actual payments are processed. 
            In production, this would integrate with Stripe or LemonSqueeze for real payment processing.
          </p>
        </div>
      </div>
    </div>
  );
}
