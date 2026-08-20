import { chainBalanceNano } from '../src/chain';
import { AMOUNT_NANO } from '../src/config';
import { countRows, withDatabase } from '../src/db';
import { fundedPair, send, waitForConfirmation } from '../src/fixtures';

test('one idempotency key produces exactly one transfer', async () => {
  const { sender, recipient } = await fundedPair('idempotency');
  const recipientBefore = await chainBalanceNano(recipient.address);
  const key = `idempotency-${Date.now()}`;

  const [first, second] = await Promise.all([
    send(sender, recipient, key),
    send(sender, recipient, key),
  ]);

  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  expect(first.data.id).toBe(second.data.id);

  const stored = await countRows(
    'SELECT count(*) FROM transactions WHERE user_id = $1 AND idempotency_key = $2',
    [sender.userId, key],
  );

  expect(stored).toBe(1);

  await waitForConfirmation(sender, first.data.id);

  const replay = await send(sender, recipient, key);

  expect(replay.data.id).toBe(first.data.id);
  expect(replay.data.status).toBe('confirmed');

  const hashes = await withDatabase((client) =>
    client.query(
      'SELECT DISTINCT tx_hash FROM transactions WHERE user_id = $1 AND idempotency_key = $2',
      [sender.userId, key],
    ),
  );

  expect(hashes.rows).toHaveLength(1);
  expect((await chainBalanceNano(recipient.address)) - recipientBefore).toBe(AMOUNT_NANO);
});
