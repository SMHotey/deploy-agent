import { pool } from '@/db';
import { getRateLimiter } from '@/lib/rate-limiter';
import { closeLogger } from '@/lib/logger';

let isShuttingDown = false;

export function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);

    // Close rate limiter (Redis connection)
    try {
      const rateLimiter = getRateLimiter();
      if (rateLimiter) {
        await rateLimiter.cleanup();
        console.log('Rate limiter cleaned up');
      }
    } catch (err) {
      console.error('Error cleaning up rate limiter:', err);
    }

    // Close DB pool
    try {
      await pool.end();
      console.log('Database pool closed');
    } catch (err) {
      console.error('Error closing database pool:', err);
    }

    // Close logger
    try {
      closeLogger();
      console.log('Logger closed');
    } catch (err) {
      console.error('Error closing logger:', err);
    }

    console.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions - graceful shutdown
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    shutdown('uncaughtException');
  });

  // Log unhandled rejections but don't exit - let the process continue
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    // Don't call shutdown() here - unhandled rejections are often recoverable
  });
}
