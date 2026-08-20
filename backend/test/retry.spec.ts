import { isTransientRpcError } from '../src/tron/retry';

describe('isTransientRpcError', () => {
  it('treats an axios timeout as transient', () => {
    expect(
      isTransientRpcError({
        code: 'ECONNABORTED',
        message: 'timeout of 8000ms exceeded',
      }),
    ).toBe(true);
  });

  it('treats a dropped connection as transient', () => {
    expect(isTransientRpcError({ code: 'ECONNRESET' })).toBe(true);
  });

  it('treats gateway and rate limit answers as transient', () => {
    expect(isTransientRpcError({ response: { status: 502 } })).toBe(true);
    expect(isTransientRpcError({ response: { status: 429 } })).toBe(true);
  });

  it('keeps client errors final', () => {
    expect(isTransientRpcError({ response: { status: 400 } })).toBe(false);
    expect(isTransientRpcError({ response: { status: 404 } })).toBe(false);
  });

  it('keeps ordinary failures final', () => {
    expect(isTransientRpcError(new Error('BROADCAST_FAILED'))).toBe(false);
    expect(isTransientRpcError(null)).toBe(false);
    expect(isTransientRpcError('boom')).toBe(false);
  });
});
