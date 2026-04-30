'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import DeployWizard from '@/components/DeployWizard';

export default function DeployPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();
  const [showWizard, setShowWizard] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Deploy</h1>
              <p className="mt-2 text-muted-foreground">
                {showWizard ? 'Follow the simple steps to deploy your project.' : 'Deploy your project with advanced options.'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowWizard(!showWizard)}
            >
              Switch to {showWizard ? 'Advanced' : 'Wizard'} Mode
            </Button>
          </div>
        </div>

        {showWizard ? (
          <DeployWizard onComplete={() => success('Deployment started!')} />
        ) : (
          <div className="bg-card border rounded-xl p-6">
            <p className="text-muted-foreground mb-4">
              Advanced mode - coming soon. Use the wizard for now.
            </p>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
