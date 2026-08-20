export type ConfirmationStatus = 'pending' | 'confirmed' | 'failed';

interface TransactionInfo {
  blockNumber?: number;
  result?: string;
  receipt?: { result?: string };
}

export function resolveConfirmationStatus(info: unknown): ConfirmationStatus {
  const record = info as TransactionInfo | null | undefined;

  if (!record || record.blockNumber === undefined) {
    return 'pending';
  }

  if (record.result === 'FAILED') {
    return 'failed';
  }

  const executionResult = record.receipt?.result;

  if (executionResult !== undefined && executionResult !== 'SUCCESS') {
    return 'failed';
  }

  return 'confirmed';
}

export interface BlockTransfer {
  txHash: string;
  fromHex: string;
  toHex: string;
  amountSun: bigint;
}

interface RawContract {
  type?: string;
  parameter?: {
    value?: {
      owner_address?: string;
      to_address?: string;
      amount?: number;
    };
  };
}

interface RawTransaction {
  txID?: string;
  raw_data?: { contract?: RawContract[] };
}

interface RawBlock {
  transactions?: RawTransaction[];
}

export function parseBlockTransfers(block: unknown): BlockTransfer[] {
  const transactions =
    (block as RawBlock | null | undefined)?.transactions ?? [];
  const transfers: BlockTransfer[] = [];

  for (const transaction of transactions) {
    const contract = transaction.raw_data?.contract?.[0];

    if (contract?.type !== 'TransferContract') {
      continue;
    }

    const {
      owner_address: from,
      to_address: to,
      amount,
    } = contract.parameter?.value ?? {};

    if (!transaction.txID || !from || !to || typeof amount !== 'number') {
      continue;
    }

    transfers.push({
      txHash: transaction.txID,
      fromHex: from,
      toHex: to,
      amountSun: BigInt(amount),
    });
  }

  return transfers;
}
