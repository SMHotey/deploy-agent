export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
}

/**
 * Executes an async function with exponential backoff retry logic
 * @param fn - The function to execute
 * @param options - Retry options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 60000,
    backoffMultiplier = 2,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: unknown;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const data = await fn();
      return { success: true, data, attempts: attempt };
    } catch (error) {
      lastError = error;

      if (attempt > maxRetries || !shouldRetry(error)) {
        return { success: false, error, attempts: attempt };
      }

      if (onRetry) {
        onRetry(error, attempt, delayMs);
      }

      // Calculate delay with jitter
      const jitter = Math.random() * 0.3 * delayMs;
      const actualDelay = Math.min(delayMs + jitter, maxDelayMs);

      await sleep(actualDelay);
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
    }
  }

  return { success: false, error: lastError, attempts: maxRetries + 1 };
}

/**
 * Default retry predicate - retries on network errors and rate limits
 */
function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('enotfound') ||
      message.includes('network') ||
      message.includes('socket')
    ) {
      return true;
    }

    // Rate limiting (429)
    if (message.includes('429') || message.includes('rate limit')) {
      return true;
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return true;
    }
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a retryable version of a function
 */
export function retryable<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: Partial<RetryOptions> = {}
): T {
  return ((...args: unknown[]) => withRetry(() => fn(...args), options)) as T;
}