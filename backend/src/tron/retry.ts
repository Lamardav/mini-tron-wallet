const TRANSIENT_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
  'ERR_NETWORK',
]);

export function isTransientRpcError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    response?: { status?: number };
  };

  if (candidate.code !== undefined && TRANSIENT_CODES.has(candidate.code)) {
    return true;
  }

  const status = candidate.response?.status;

  if (status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  return (
    typeof candidate.message === 'string' &&
    candidate.message.includes('timeout')
  );
}
