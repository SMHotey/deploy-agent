'use client';

import { useState } from 'react';
import DynamicLanding from '@/components/DynamicLanding';

interface LandingConfig {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    gradient: string;
  };
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  cta: {
    text: string;
    link: string;
  };
}

interface GenerateFormProps {
  onSuccess?: () => void;
}

export default function GenerateForm({ onSuccess }: GenerateFormProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setConfig(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      topic: formData.get('topic'),
      targetAudience: formData.get('targetAudience'),
      tone: formData.get('tone'),
      sections: (formData.get('sections') as string).split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      const res = await fetch('/api/admin/generate-landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok && result.config) {
        setConfig(result.config);
      } else {
        setError(result.error || 'Failed to generate landing page');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (configToPublish: LandingConfig) => {
    if (!slug || !configToPublish) return;

    try {
      const res = await fetch('/api/admin/generate-landing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          config: configToPublish,
        }),
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Publish failed', err);
    }
  };

  return (
    <form method="dialog" className="p-6" onSubmit={handleGenerate}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Generate Landing Page</h2>
        <button
          type="button"
          onClick={(e) => (e.target as HTMLElement).closest('dialog')?.close()}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Topic *</label>
          <input
            name="topic"
            type="text"
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Launch your AI startup in 30 minutes"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Audience *</label>
          <input
            name="targetAudience"
            type="text"
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
            placeholder="AI enthusiasts who built a prototype"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Tone</label>
          <select
            name="tone"
            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="inspiring">Inspiring</option>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Sections (comma-separated) *</label>
          <input
            name="sections"
            type="text"
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
            placeholder="hero, features, cta"
          />
          <p className="text-xs text-slate-500 mt-1">Available: hero, features, cta, testimonials, pricing</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generating...' : 'Generate with AI'}
        </button>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
      </div>

      {/* Preview */}
      {config && (
        <div className="mt-6 border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div className="border border-slate-700 rounded-xl overflow-hidden">
            <DynamicLanding config={config} />
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                placeholder="ai-startup-launch"
              />
              <p className="text-xs text-slate-500 mt-1">Page will be available at /landing/{slug}</p>
            </div>

              <button
                type="button"
                onClick={() => handlePublish(config)}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
              Publish Page
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
