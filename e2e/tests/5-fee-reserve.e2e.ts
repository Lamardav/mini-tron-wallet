import { TronWeb } from 'tronweb';
import { api, registerUser } from '../src/api';
import { chainBalanceNano, fundWallet } from '../src/chain';
import { waitFor } from '../src/util';

const STAKE_NANO = 2_000_000_000n;

test('a transfer of the whole balance to a new address is refused, because the fee would not fit', async () => {
  const sender = await registerUser('fee-reserve');
  const freshAccount = await TronWeb.createAccount();
  const untouchedAddress = freshAccount.address.base58;

  await fundWallet(sender.address, STAKE_NANO);
  await waitFor(
    'the sender balance to arrive',
    async () => (await chainBalanceNano(sender.address)) >= STAKE_NANO,
    180_000,
  );

  const estimate = await api('POST', '/wallet/estimate', {
    token: sender.token,
    body: { toAddress: untouchedAddress, amountNano: STAKE_NANO.toString() },
  });

  expect(estimate.status).toBe(200);
  expect(BigInt(estimate.data.feeNano)).toBeGreaterThan(0n);
  expect(BigInt(estimate.data.totalNano)).toBeGreaterThan(STAKE_NANO);

  const send = await api('POST', '/wallet/send', {
    token: sender.token,
    body: { toAddress: untouchedAddress, amountNano: STAKE_NANO.toString() },
    headers: { 'Idempotency-Key': `fee-reserve-${Date.now()}` },
  });

  expect(send.status).toBe(422);
  expect(send.data.message).toBe('INSUFFICIENT_BALANCE');
  expect(BigInt(send.data.shortfallNano)).toBeGreaterThan(0n);

  const history = await api('GET', '/wallet/transactions', { token: sender.token });
  expect(history.data.items).toHaveLength(1);
  expect(history.data.items[0].direction).toBe('incoming');

  const sendable = STAKE_NANO - BigInt(estimate.data.feeNano);
  const accepted = await api('POST', '/wallet/send', {
    token: sender.token,
    body: { toAddress: untouchedAddress, amountNano: sendable.toString() },
    headers: { 'Idempotency-Key': `fee-reserve-max-${Date.now()}` },
  });

  expect(accepted.status).toBe(201);
});
