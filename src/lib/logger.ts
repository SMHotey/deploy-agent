import { createWriteStream, WriteStream } from 'fs';
import { randomUUID } from 'crypto';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  requestId?: string;
  userId?: number;
  [key: string]: unknown;
}

const logLevel = process.env.LOG_LEVEL || 'info';
const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = logLevels[logLevel as keyof typeof logLevels] ?? 1;

let logStream: WriteStream | null = null;

function getLogStream(): WriteStream {
  if (!logStream) {
    const logDir = path.join(process.cwd(), 'logs');
    const fs = require('fs'); // Keep require for conditional use
    fs.mkdirSync(logDir, { recursive: true });
    logStream = createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });
  }
  return logStream;
}

// Close log stream on shutdown
export function closeLogger(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

export function createLogger(requestId?: string, userId?: number) {
  function log(level: LogEntry['level'], message: string, meta: Record<string, unknown> = {}) {
    if (logLevels[level] < currentLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...meta,
    };

    const formatted = JSON.stringify(entry);

    // Console output (structured in dev)
    if (process.env.NODE_ENV === 'development') {
      const prefix = requestId ? `[${requestId}]` : '';
      console[level === 'debug' ? 'log' : level](prefix, message, Object.keys(meta).length > 0 ? meta : '');
    } else {
      // Production: structured JSON to stdout + file
      process.stdout.write(formatted + '\n');
      if (process.env.NODE_ENV === 'production') {
        getLogStream().write(formatted + '\n');
      }
    }
  }

  return {
    info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  };
}

export function generateRequestId(): string {
  return randomUUID().split('-')[0]; // short ID
}

export type Logger = ReturnType<typeof createLogger>;
