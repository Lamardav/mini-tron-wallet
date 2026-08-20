import { execSync } from 'node:child_process';
import { api } from '../src/api';
import { chainBalanceNano } from '../src/chain';
import { AMOUNT_NANO, config } from '../src/config';
import { countRows } from '../src/db';
import { fundedPair, send, waitForConfirmation } from '../src/fixtures';
import { waitFor } from '../src/util';

const testOrSkip = config.restartCommand ? test : test.skip;

testOrSkip('a backend restart neither loses nor duplicates a pending transfer', async () => {
  const { sender, recipient } = await fundedPair('resilience');
  const recipientBefore = await chainBalanceNano(recipient.address);
  const key = `resilience-${Date.now()}`;

  const result = await send(sender, recipient, key);

  expect(result.status).toBe(201);
  expect(result.data.status).toBe('pending');

  execSync(config.restartCommand, { stdio: 'inherit', timeout: 120_000 });

  await waitFor(
    'the backend to accept requests again',
    async () => {
      const health = await api('GET', '/health').catch(() => ({ status: 0 }));

      return health.status === 200;
    },
    120_000,
    2000,
  );

  await waitForConfirmation(sender, result.data.id);

  const transfers = await countRows(
    'SELECT count(*) FROM transactions WHERE user_id = $1 AND direction = $2 AND idempotency_key = $3',
    [sender.userId, 'outgoing', key],
  );

  expect(transfers).toBe(1);

  const events = await countRows(
    "SELECT count(*) FROM outbox_events WHERE payload->>'transaction_id' = $1",
    [result.data.id],
  );

  expect(events).toBe(1);
  expect((await chainBalanceNano(recipient.address)) - recipientBefore).toBe(AMOUNT_NANO);
});
