'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstructionsPage() {
  const router = useRouter();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstructions();
  }, []);

  const fetchInstructions = async () => {
    try {
      const res = await fetch('/api/instructions');
      if (!res.ok) throw new Error(`Failed to load instructions: ${res.status}`);
      const text = await res.text();
      setContent(text);
    } catch (err: any) {
      setError(err.message);
      // Fallback: try to load the markdown file directly
      fetch('/README_RU.md')
        .then(r => r.text())
        .then(setContent)
        .catch(() => setContent('Не удалось загрузить инструкцию.'));
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown to HTML converter (safe - escapes HTML in content)
  const renderMarkdown = (md: string): string => {
    let html = md
      // Headers
      .replace(/^### (.*)$/gm, '<h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-6 mb-3">$1</h3>')
      .replace(/^## (.*)$/gm, '<h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-8 mb-4">$1</h2>')
      .replace(/^# (.*)$/gm, '<h1 class="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-10 mb-6">$1</h1>')
      // Bold & italic (escape content)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Code blocks (escape content)
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```[^\n]*\n?/, '').replace(/```$/, '');
        return `<pre class="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto my-4"><code>${escapeHtml(code)}</code></pre>`;
      })
      // Inline code (escape content)
      .replace(/`([^`]+)`/g, (_, code) => `<code class="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm">${escapeHtml(code)}</code>`)
      // Links (escape URL and text)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline">${escapeHtml(text)}</a>`)
      // Images (escape alt and src)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img alt="${escapeHtml(alt)}" src="${escapeHtml(src)}" class="max-w-full h-auto my-4 rounded-lg" />`)
      // Lists
      .replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-6 list-disc">$1</li>')
      .replace(/^\s*(\d+)\.\s+(.*)$/gm, '<li class="ml-6 list-decimal">$2</li>')
      // Blockquotes
      .replace(/^\s*> (.*)$/gm, '<blockquote class="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 my-4 text-zinc-600 dark:text-zinc-400">$1</blockquote>')
      // Paragraphs
      .split('\n\n')
      .map(para => {
        if (para.includes('<h') || para.includes('<pre') || para.includes('<li') || para.includes('<blockquote')) {
          return para;
        }
        return `<p class="my-3 text-zinc-600 dark:text-zinc-400">${para}</p>`;
      })
      .join('\n');

    return html;
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/')}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Вернуться к созданию деплоя
            </button>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Инструкция по работе с Deploy Agent
            </h1>
          </div>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Подробное руководство по использованию платформы
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              Примечание: {error}. Отображается локальная версия.
            </p>
          </div>
        )}

        <div className="prose dark:prose-invert max-w-none bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        </div>
      </div>
    </div>
  );
}
