export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor(
  description: string,
  condition: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs = 3000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${description}`);
}
