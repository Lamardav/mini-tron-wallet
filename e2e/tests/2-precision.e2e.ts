import { api } from '../src/api';
import { chainBalanceNano } from '../src/chain';
import { AMOUNT_NANO } from '../src/config';
import { withDatabase } from '../src/db';
import { fundedPair, send, waitForConfirmation } from '../src/fixtures';

test('an amount keeps its exact value through every layer', async () => {
  const { sender, recipient } = await fundedPair('precision');

  const tooPrecise = await api('POST', '/wallet/send', {
    token: sender.token,
    body: { toAddress: recipient.address, amountNano: '123456789' },
    headers: { 'Idempotency-Key': `precision-rejected-${Date.now()}` },
  });

  expect(tooPrecise.status).toBe(400);
  expect(JSON.stringify(tooPrecise.data)).toContain('AMOUNT_NOT_REPRESENTABLE_ON_CHAIN');

  const recipientBefore = await chainBalanceNano(recipient.address);
  const result = await send(sender, recipient, `precision-${Date.now()}`);

  expect(result.status).toBe(201);
  expect(result.data.amountNano).toBe('123456000');
  expect(result.data.amountTrx).toBe('0.123456000');

  const stored = await withDatabase((client) =>
    client.query('SELECT amount::text AS amount FROM transactions WHERE id = $1', [result.data.id]),
  );

  expect(stored.rows[0].amount).toBe('123456000');

  await waitForConfirmation(sender, result.data.id);

  const received = (await chainBalanceNano(recipient.address)) - recipientBefore;

  expect(received).toBe(AMOUNT_NANO);
  expect(received).not.toBe(AMOUNT_NANO - 1000n);
  expect(received).not.toBe(AMOUNT_NANO + 1000n);
});
