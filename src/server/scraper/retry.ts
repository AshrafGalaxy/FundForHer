/**
 * Exponential Backoff Retry Utility
 * -----------------------------------
 * Wraps any async operation with automatic retries using exponential backoff.
 * Prevents hitting API rate limits and handles transient network errors gracefully.
 */

export interface RetryOptions {
    /** Max number of attempts (including the first try). Default: 3 */
    maxAttempts?: number;
    /** Base delay in ms between retries. Doubles on each attempt. Default: 1000ms */
    baseDelayMs?: number;
    /** Max total time for a single attempt (ms). Throws if exceeded. Default: 30000ms */
    timeoutMs?: number;
    /** Optional label for log messages */
    label?: string;
}

/**
 * Wraps an async function with a hard timeout.
 * Throws an error if the function doesn't resolve within timeoutMs.
 */
export function withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    label = 'operation'
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`⏱️ Timeout: [${label}] exceeded ${timeoutMs}ms`));
        }, timeoutMs);

        fn()
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

/**
 * Retries an async function up to maxAttempts times using exponential backoff.
 * Each attempt is also wrapped in a per-call timeout.
 *
 * @example
 * const result = await withRetry(
 *   () => callGeminiAI(rawText),
 *   { maxAttempts: 3, baseDelayMs: 2000, timeoutMs: 30000, label: 'Gemini Parse' }
 * );
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        baseDelayMs = 1000,
        timeoutMs = 30_000,
        label = 'operation',
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await withTimeout(fn, timeoutMs, label);
            if (attempt > 1) {
                console.log(`✅ [${label}] succeeded on attempt ${attempt}/${maxAttempts}`);
            }
            return result;
        } catch (err: any) {
            lastError = err;
            const isLastAttempt = attempt === maxAttempts;

            if (isLastAttempt) {
                console.error(`❌ [${label}] failed permanently after ${maxAttempts} attempts. Last error: ${err.message}`);
            } else {
                const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
                console.warn(`⚠️ [${label}] attempt ${attempt}/${maxAttempts} failed. Retrying in ${delayMs}ms... (${err.message})`);
                await sleep(delayMs);
            }
        }
    }

    throw lastError ?? new Error(`[${label}] failed after ${maxAttempts} attempts`);
}

/** Simple promise-based sleep */
export const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));
