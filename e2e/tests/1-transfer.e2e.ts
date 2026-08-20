import { api } from '../src/api';
import { chainBalanceNano } from '../src/chain';
import { AMOUNT_NANO, MAX_FEE_NANO } from '../src/config';
import { fundedPair, send, waitForConfirmation } from '../src/fixtures';

test('a transfer between two users moves exactly the requested amount on chain', async () => {
  const { sender, recipient } = await fundedPair('transfer');

  const senderBefore = await chainBalanceNano(sender.address);
  const recipientBefore = await chainBalanceNano(recipient.address);

  const result = await send(sender, recipient, `transfer-${Date.now()}`);

  expect(result.status).toBe(201);
  expect(result.data.status).toBe('pending');
  expect(result.data.amountNano).toBe(AMOUNT_NANO.toString());

  await waitForConfirmation(sender, result.data.id);

  const senderAfter = await chainBalanceNano(sender.address);
  const recipientAfter = await chainBalanceNano(recipient.address);

  expect(recipientAfter - recipientBefore).toBe(AMOUNT_NANO);

  const spent = senderBefore - senderAfter;
  expect(spent).toBeGreaterThanOrEqual(AMOUNT_NANO);
  expect(spent).toBeLessThanOrEqual(AMOUNT_NANO + MAX_FEE_NANO);

  const recipientWallet = await api('GET', '/wallet', { token: recipient.token });
  expect(recipientWallet.data.balanceNano).toBe(recipientAfter.toString());
});
