"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AIAssistant from '@/components/ai-assistant';

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const submissionId = searchParams.get('submissionId');
  
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    content: '',
    bugsFound: 0,
    screenshots: [] as string[],
    testingChecklist: {
      functionality: false,
      ui: false,
      performance: false,
      security: false,
      documentation: false,
    }
  });

  useEffect(() => {
    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      const res = await fetch(`/api/projects/submit-for-review?${new URLSearchParams({ id: submissionId! })}`);
      const data = await res.json();
      if (data.submissions?.length > 0) {
        setSubmission(data.submissions[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch submission');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (!formData.rating || !formData.title || !formData.content) {
      setError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: parseInt(submissionId!),
          ...formData,
        }),
      });
      alert('Review submitted! Points will be awarded after the project owner rates your review.');
      router.push('/review');
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>;
  if (!submission) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Submission not found</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="mb-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">← Back</button>
        
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
          <h1 className="text-2xl font-bold mb-2">{submission.title}</h1>
          <p className="text-zinc-400 mb-4">{submission.description}</p>
          <div className="flex gap-4 text-sm text-zinc-500">
            <span>{submission.category}</span>
            <span>👤 {submission.testers.current}/{submission.testers.max} testers</span>
            <span className="text-green-400">{submission.pointsReward} pts</span>
          </div>
        </div>

        {/* Author Actions - only show if user is the project owner */}
        {user?.id === submission.userId && (
          <div className="mb-8">
            <AIAssistant 
              type="review-feedback" 
              reviewId={parseInt(submissionId!)} 
              className="mb-6"
            />
            <p className="text-sm text-zinc-500 mt-2">
              Get AI-powered recommendations based on tester reviews to improve your project.
            </p>
          </div>
        )}

        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-xl font-semibold mb-4">Your Review</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Rating *</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className={`w-10 h-10 rounded-lg text-2xl ${star <= formData.rating ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800 text-zinc-600'}`}
                  >
                    {star <= formData.rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Title *</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summary of your review"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Detailed Review *</label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Describe your testing experience, what worked well, what didn't..."
                rows={6}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white resize-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Bugs Found</label>
              <input
                type="number"
                min="0"
                value={formData.bugsFound}
                onChange={(e) => setFormData({ ...formData, bugsFound: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Testing Checklist</label>
              <div className="space-y-2">
                {Object.entries(formData.testingChecklist).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => setFormData({
                        ...formData,
                        testingChecklist: {
                          ...formData.testingChecklist,
                          [key]: e.target.checked,
                        }
                      })}
                      className="w-5 h-5"
                    />
                    <span className="capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:bg-zinc-700"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
