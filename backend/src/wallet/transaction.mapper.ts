import { nanoToTrx } from '../common/amount';

export interface TransactionRecord {
  id: string;
  userId: string;
  direction: string;
  amountNano: bigint;
  address: string;
  status: string;
  txHash: string | null;
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
  createdAt: string;
}

export function toTransactionResponse(transaction: TransactionRecord): TransactionResponse {
  return {
    id: transaction.id,
    userId: transaction.userId,
    direction: transaction.direction,
    amountNano: transaction.amountNano.toString(),
    amountTrx: nanoToTrx(transaction.amountNano),
    address: transaction.address,
    status: transaction.status,
    txHash: transaction.txHash,
    createdAt: transaction.createdAt.toISOString(),
  };
}
