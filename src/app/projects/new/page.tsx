'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

export default function NewProjectPage() {
  const router = useRouter();
  const { user, isLoading, getToken } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [aiTool, setAiTool] = useState('');

  const handleGitClick = () => {
    router.push('/deploy');
  };

  const handleAiClick = () => {
    setShowUploadForm(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const name = file.name.toLowerCase();
    const ok = name.endsWith('.zip') || name.endsWith('.tar.gz') || name.endsWith('.rar');
    if (!ok) {
      toastError?.('Invalid file type. Supported: .zip, .tar.gz, .rar');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    const MAX_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toastError?.('File is too large. Maximum size is 50MB.');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const progressRef = useState(0);
  const startUpload = () => {
    progressRef[1](0);
    setUploadProgress(0);
    setUploading(true);
    const interval = window.setInterval(() => {
      progressRef[1](prev => {
        const next = prev + Math.floor(Math.random() * 12) + 6;
        if (next >= 100) {
          setUploadProgress(100);
          window.clearInterval(interval);
          setUploading(false);
          toastSuccess?.('Upload completed. Now analyzing...');
          return 100;
        }
        setUploadProgress(next);
        return next;
      });
    }, 180);
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!selectedFile) {
      toastError?.('Please select a file to upload.');
      return;
    }

    const token = getToken();
    if (!token) {
      toastError?.('Authentication required. Please log in.');
      router.push('/');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (description) formData.append('description', description);
    if (aiTool) formData.append('aiTool', aiTool);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploading(false);

        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          toastSuccess?.(`Project created! ID: ${result.projectId}`);
          setSelectedFile(null);
          setDescription('');
          setAiTool('');
          setUploadProgress(0);

          // Redirect to project page after short delay
          setTimeout(() => {
            router.push(`/projects/${result.projectId}`);
          }, 1500);
        } else {
          let errorMsg = 'Failed to upload file.';
          try {
            const error = JSON.parse(xhr.responseText);
            errorMsg = error.error || errorMsg;
          } catch (e) {
            // Use default message
          }
          toastError?.(errorMsg);
          setUploadProgress(0);
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        toastError?.('Network error. Please try again.');
        setUploadProgress(0);
      };

      xhr.open('POST', '/api/projects/ai-start');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error: any) {
      setUploading(false);
      toastError?.(error.message || 'Failed to upload file.');
      setUploadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </main>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-zinc-100">
          Create a new project
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Git Repository Card */}
          <div
            onClick={handleGitClick}
            className="border border-zinc-800 hover:border-blue-500 rounded-xl p-6 transition-all cursor-pointer group"
          >
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-white group-hover:bg-zinc-700 transition">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-label="GitHub">
                  <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66.23.66.5v1.5c0 .28-.22.5-.5.5-.09 0-.18-.01-.27-.01-.68-.04-1.37-.15-2.04-.32.18-.66.27-1.37.27-2.1 0-3.87-2.34-5.61-5-5.61S3 9.13 3 13c0 .73.09 1.44.27 2.1-.67.17-1.36.28-2.04.32-.09.01-.18.01-.27.01-.28 0-.5-.22-.5-.5v-1.5c0-.27.16-.42.66-.5C2.13 20.17 5 16.42 5 12 5 6.48 9.52 2 15 2s10 4.48 10 10c0 4.42-2.87 8.17-6.84 9.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-2 text-center">
                I have a Git repository
              </h2>
              <p className="text-zinc-400 text-center text-sm">
                Connect your GitHub, GitLab, or Bitbucket repository
              </p>
            </div>
          </div>

          {/* AI-Generated Code Card */}
          <div
            onClick={handleAiClick}
            className="border border-zinc-800 hover:border-violet-500 rounded-xl p-6 transition-all cursor-pointer group"
          >
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-white group-hover:bg-zinc-700 transition">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-label="AI Code">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-5 0v-15A2.5 2.5 0 0 1 9.5 2z" opacity="0.6" />
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 5 0v-15A2.5 2.5 0 0 0 14.5 2z" opacity="0.9" />
                  <circle cx="12" cy="8" r="1.5" fill="white" />
                  <circle cx="12" cy="16" r="1.5" fill="white" />
                  <path d="M5 20l2-3M19 20l-2-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-2 text-center">
                I generated code with AI
              </h2>
              <p className="text-zinc-400 text-center text-sm">
                Upload code from Cursor, Replit, ChatGPT, or other AI tools
              </p>
            </div>
          </div>
        </div>

        {showUploadForm && (
          <section aria-label="ai-upload" className="mt-12 bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-6">Upload AI-Generated Code</h2>
            <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-2" htmlFor="fileInput">
                  Project Archive (.zip, .tar.gz, .rar - max 50MB)
                </label>
                <input
                  id="fileInput"
                  type="file"
                  accept=".zip,.tar.gz,.rar"
                  onChange={handleFileChange}
                  className="w-full text-sm text-zinc-100 bg-zinc-800 border border-zinc-700 rounded-md p-3 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-zinc-400">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-2" htmlFor="descInput">
                  Project Description (optional)
                </label>
                <input
                  id="descInput"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project (e.g., Next.js blog with Supabase)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-3 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-200 mb-2" htmlFor="aiToolInput">
                  AI Tool Used (optional)
                </label>
                <input
                  id="aiToolInput"
                  type="text"
                  value={aiTool}
                  onChange={(e) => setAiTool(e.target.value)}
                  placeholder="Cursor, Replit, ChatGPT, Claude, etc."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-3 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              {uploading && (
                <div>
                  <label className="block text-sm font-medium text-zinc-200 mb-2">
                    Upload Progress
                  </label>
                  <div className="w-full bg-zinc-800 rounded-full h-2.5">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm text-zinc-400 text-right">{uploadProgress}%</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload & Analyze'}
                </button>
                <span className="text-sm text-zinc-400" aria-live="polite">
                  {uploading ? `Progress: ${uploadProgress}%` : 'Ready to upload'}
                </span>
              </div>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}
