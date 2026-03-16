/**
 * Races a promise-returning function against an AbortSignal.
 * Rejects immediately if the signal is already aborted, or rejects as soon
 * as the signal fires while `fn` is still pending.
 */
export async function raceWithAbort<T>(fn: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    throw createAbortError(signal.reason);
  }

  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(createAbortError(signal.reason));
    };

    signal.addEventListener('abort', onAbort, { once: true });

    Promise.resolve(fn()).then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort);
    });
  });
}

/**
 * Normalises an abort reason into an `Error` with `name = 'AbortError'`.
 */
export function createAbortError(reason: unknown): Error {
  const message = reason instanceof Error ? reason.message : 'Request aborted before response commit.';
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}
