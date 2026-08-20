import {
  parseBlockTransfers,
  resolveConfirmationStatus,
} from '../src/tron/tron.parse';

const OWNER = '41a614f803b6fd780986a42c78ec9c7f77e6ded13c';
const RECIPIENT = '41b0f43a3a34c1e0d193ca2b3a68b63e9b360e4f10';

function transferTransaction(txId: string, amount: number) {
  return {
    txID: txId,
    raw_data: {
      contract: [
        {
          type: 'TransferContract',
          parameter: {
            value: { owner_address: OWNER, to_address: RECIPIENT, amount },
          },
        },
      ],
    },
  };
}

describe('parseBlockTransfers', () => {
  it('extracts plain TRX transfers', () => {
    const block = {
      transactions: [transferTransaction('tx-transfer', 123456)],
    };

    expect(parseBlockTransfers(block)).toEqual([
      {
        txHash: 'tx-transfer',
        fromHex: OWNER,
        toHex: RECIPIENT,
        amountSun: 123_456n,
      },
    ]);
  });

  it('ignores contracts that are not plain transfers', () => {
    const block = {
      transactions: [
        transferTransaction('tx-transfer', 1),
        {
          txID: 'tx-contract',
          raw_data: { contract: [{ type: 'TriggerSmartContract' }] },
        },
      ],
    };

    expect(
      parseBlockTransfers(block).map((transfer) => transfer.txHash),
    ).toEqual(['tx-transfer']);
  });

  it('skips transfers with missing fields', () => {
    const block = {
      transactions: [
        {
          txID: 'no-amount',
          raw_data: {
            contract: [
              {
                type: 'TransferContract',
                parameter: {
                  value: { owner_address: OWNER, to_address: RECIPIENT },
                },
              },
            ],
          },
        },
        {
          raw_data: {
            contract: [
              {
                type: 'TransferContract',
                parameter: {
                  value: {
                    owner_address: OWNER,
                    to_address: RECIPIENT,
                    amount: 5,
                  },
                },
              },
            ],
          },
        },
      ],
    };

    expect(parseBlockTransfers(block)).toEqual([]);
  });

  it('returns nothing for an empty or malformed block', () => {
    expect(parseBlockTransfers({ blockID: 'empty' })).toEqual([]);
    expect(parseBlockTransfers(null)).toEqual([]);
    expect(parseBlockTransfers(undefined)).toEqual([]);
  });
});

describe('resolveConfirmationStatus', () => {
  it('treats a plain TRX transfer without an execution result as confirmed', () => {
    const info = {
      id: 'hash',
      blockNumber: 70244089,
      fee: 100000,
      receipt: { net_fee: 100000 },
    };

    expect(resolveConfirmationStatus(info)).toBe('confirmed');
  });

  it('treats a successful contract call as confirmed', () => {
    const info = { blockNumber: 1, receipt: { result: 'SUCCESS' } };

    expect(resolveConfirmationStatus(info)).toBe('confirmed');
  });

  it('treats a rejected transaction as failed', () => {
    expect(
      resolveConfirmationStatus({ blockNumber: 1, result: 'FAILED' }),
    ).toBe('failed');
  });

  it('treats a reverted contract call as failed', () => {
    expect(
      resolveConfirmationStatus({
        blockNumber: 1,
        receipt: { result: 'REVERT' },
      }),
    ).toBe('failed');
  });

  it('treats a transaction without a block as pending', () => {
    expect(resolveConfirmationStatus({})).toBe('pending');
    expect(resolveConfirmationStatus(null)).toBe('pending');
    expect(resolveConfirmationStatus(undefined)).toBe('pending');
  });
});
