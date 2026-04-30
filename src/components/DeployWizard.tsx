'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface WizardStep {
  title: string;
  description: string;
  fields: {
    name: string;
    label: string;
    type: 'text' | 'url' | 'select';
    placeholder?: string;
    options?: { value: string; label: string }[];
    required?: boolean;
  }[];
}

const STEPS: WizardStep[] = [
  {
    title: 'Choose your project',
    description: 'Enter your git repository URL to get started.',
    fields: [
      { name: 'repo_url', label: 'Repository URL', type: 'url', placeholder: 'https://github.com/user/repo', required: true },
      { name: 'project_name', label: 'Project Name (optional)', type: 'text', placeholder: 'my-awesome-project' },
    ],
  },
  {
    title: 'Select platform',
    description: 'Choose where to deploy your project.',
    fields: [
      { name: 'target_platform', label: 'Platform', type: 'select', required: true, options: [
        { value: 'vercel', label: 'Vercel (Recommended for beginners)' },
        { value: 'netlify', label: 'Netlify' },
        { value: 'cloudflare-pages', label: 'Cloudflare Pages' },
      ]},
    ],
  },
  {
    title: 'Configure build',
    description: 'Set up your build settings. We\'ll auto-detect most settings.',
    fields: [
      { name: 'branch', label: 'Branch', type: 'text', placeholder: 'main', required: true },
      { name: 'framework_preset', label: 'Framework (auto-detected)', type: 'select', options: [
        { value: 'nextjs', label: 'Next.js' },
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue' },
        { value: 'astro', label: 'Astro' },
        { value: 'other', label: 'Other / Auto-detect' },
      ]},
    ],
  },
  {
    title: 'Ready to deploy!',
    description: 'Review your settings and click Deploy to go live.',
    fields: [],
  },
];

export default function DeployWizard({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({
    target_platform: 'vercel',
    branch: 'main',
    framework_preset: 'nextjs',
  });

  const updateField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    // Validate current step
    const step = STEPS[currentStep];
    for (const field of step.fields) {
      if (field.required && !formData[field.name]?.trim()) {
        setError(`${field.label} is required`);
        return;
      }
    }
    setError(null);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setError(null);
  };

  const handleDeploy = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        router.push('/');
        return;
      }

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deployment failed');
      }

      if (onComplete) onComplete();
      router.push(`/deploy/${data.deployment_id || data.deploymentId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-violet-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="bg-card border rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
        <p className="text-muted-foreground mb-6">{step.description}</p>

        <div className="space-y-4">
          {step.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1.5">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={formData[field.name] || ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleDeploy}
              loading={loading}
              className="bg-gradient-to-r from-blue-600 to-violet-600"
            >
              Deploy Now
            </Button>
          )}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentStep ? 'bg-primary' :
              i < currentStep ? 'bg-primary/60' :
              'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
