// Sentry configuration for Next.js
import { init } from '@sentry/nextjs';
import type { NextConfig } from 'next';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
      integrations: [
        // Add integrations here
      ],
    });
  }
}
