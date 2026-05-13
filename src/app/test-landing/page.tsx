import Link from 'next/link';

export default function TestLandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="flex min-h-screen flex-col items-center justify-between p-6">
        <div className="w-full max-w-2xl">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Test Landing Page
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            This is a test landing page created to verify the Deploy Agent setup.
          </p>
          <div className="space-y-4">
            <Link
              href="/"
              className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Go to Home
            </Link>
            <Link
              href="/dashboard"
              className="w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}