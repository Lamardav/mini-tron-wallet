import { api, registerUser, TestUser, transactionStatus } from './api';
import { chainBalanceNano, fundWallet } from './chain';
import { AMOUNT_NANO, FUNDING_NANO } from './config';
import { waitFor } from './util';

export interface TransferPair {
  sender: TestUser;
  recipient: TestUser;
}

export async function fundedPair(prefix: string): Promise<TransferPair> {
  const sender = await registerUser(`${prefix}-sender`);
  const recipient = await registerUser(`${prefix}-recipient`);

  await fundWallet(sender.address, FUNDING_NANO);
  await waitFor(
    'the sender balance to arrive',
    async () => (await chainBalanceNano(sender.address)) >= FUNDING_NANO,
    180_000,
  );

  return { sender, recipient };
}

export function send(sender: TestUser, recipient: TestUser, idempotencyKey: string) {
  return api('POST', '/wallet/send', {
    token: sender.token,
    body: { toAddress: recipient.address, amountNano: AMOUNT_NANO.toString() },
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function waitForConfirmation(user: TestUser, transactionId: string) {
  return waitFor(
    `transaction ${transactionId} to be confirmed`,
    async () => (await transactionStatus(user, transactionId)) === 'confirmed',
    240_000,
  );
}
