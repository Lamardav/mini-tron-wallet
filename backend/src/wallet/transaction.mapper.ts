import { nanoToTrx } from '../common/amount';

export interface TransactionRecord {
  id: string;
  userId: string;
  direction: string;
  amountNano: bigint;
  address: string;
  status: string;
  txHash: string | null;
  feeNano: bigint | null;
  balanceBeforeNano: bigint | null;
  balanceAfterNano: bigint | null;
  blockNumber: bigint | null;
  createdAt: Date;
}

export interface TransactionResponse {
  id: string;
  userId: string;
  direction: string;
  amountNano: string;
  amountTrx: string;
  address: string;
  status: string;
  txHash: string | null;
  feeNano: string | null;
  balanceBeforeNano: string | null;
  balanceAfterNano: string | null;
  blockNumber: string | null;
  createdAt: string;
}

export function toTransactionResponse(
  transaction: TransactionRecord,
): TransactionResponse {
  const balanceBefore =
    transaction.balanceBeforeNano ?? derivedBalanceBefore(transaction);

  return {
    id: transaction.id,
    userId: transaction.userId,
    direction: transaction.direction,
    amountNano: transaction.amountNano.toString(),
    amountTrx: nanoToTrx(transaction.amountNano),
    address: transaction.address,
    status: transaction.status,
    txHash: transaction.txHash,
    feeNano: transaction.feeNano?.toString() ?? null,
    balanceBeforeNano: balanceBefore?.toString() ?? null,
    balanceAfterNano: transaction.balanceAfterNano?.toString() ?? null,
    blockNumber: transaction.blockNumber?.toString() ?? null,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function derivedBalanceBefore(transaction: TransactionRecord): bigint | null {
  if (transaction.balanceAfterNano === null) {
    return null;
  }

  if (transaction.direction === 'incoming') {
    return transaction.balanceAfterNano - transaction.amountNano;
  }

  return (
    transaction.balanceAfterNano +
    transaction.amountNano +
    (transaction.feeNano ?? 0n)
  );
}
