import { ConfirmationWorker } from '../src/workers/confirmation.worker';

function makeWorker() {
  const transactionsInTx = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
  const outboxInTx = { create: jest.fn().mockResolvedValue({}) };
  const prisma = {
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(async (run: (db: unknown) => Promise<unknown>) =>
      run({ transaction: transactionsInTx, outboxEvent: outboxInTx }),
    ),
  };
  const tron = { getConfirmation: jest.fn(), getBalanceNano: jest.fn().mockResolvedValue(5_000_000_000n) };
  const events = { bump: jest.fn() };

  return {
    prisma,
    tron,
    events,
    transactionsInTx,
    outboxInTx,
    worker: new ConfirmationWorker(prisma as never, tron as never, events as never),
  };
}

const pendingTransaction = {
  id: 'tx-1',
  userId: 'user-1',
  amountNano: 500_000_000n,
  txHash: 'hash-1',
  createdAt: new Date(),
};

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

describe('ConfirmationWorker.resolve', () => {
  it('confirms a transaction and records one outbox event', async () => {
    const { tron, worker, transactionsInTx, outboxInTx } = makeWorker();
    tron.getConfirmation.mockResolvedValue({ status: 'confirmed', feeNano: 100000000n, blockNumber: 70000000n });

    await worker.resolve(pendingTransaction);

    expect(transactionsInTx.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: 'pending' },
      data: {
        status: 'confirmed',
        feeNano: 100000000n,
        blockNumber: 70000000n,
        balanceAfterNano: null,
      },
    });
    expect(outboxInTx.create).toHaveBeenCalledWith({
      data: {
        topic: 'wallet.transaction.confirmed',
        payload: {
          event: 'wallet.transaction.confirmed',
          transaction_id: 'tx-1',
          amount_nano: '500000000',
        },
      },
    });
  });

  it('does not publish twice when another worker already confirmed it', async () => {
    const { tron, worker, transactionsInTx, outboxInTx } = makeWorker();
    tron.getConfirmation.mockResolvedValue({ status: 'confirmed', feeNano: 100000000n, blockNumber: 70000000n });
    transactionsInTx.updateMany.mockResolvedValue({ count: 0 });

    await worker.resolve(pendingTransaction);

    expect(outboxInTx.create).not.toHaveBeenCalled();
  });

  it('marks a rejected transaction failed without publishing', async () => {
    const { prisma, tron, worker, outboxInTx } = makeWorker();
    tron.getConfirmation.mockResolvedValue({ status: 'failed', feeNano: 100000000n, blockNumber: 70000000n });

    await worker.resolve(pendingTransaction);

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: 'pending' },
      data: { status: 'failed' },
    });
    expect(outboxInTx.create).not.toHaveBeenCalled();
  });

  it('leaves a fresh unconfirmed transaction alone', async () => {
    const { prisma, tron, worker } = makeWorker();
    tron.getConfirmation.mockResolvedValue({ status: 'pending', feeNano: 100000000n, blockNumber: 70000000n });

    await worker.resolve(pendingTransaction);

    expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
  });

  it('gives up on a transaction still unconfirmed after ten minutes', async () => {
    const { prisma, tron, worker } = makeWorker();
    tron.getConfirmation.mockResolvedValue({ status: 'pending', feeNano: 100000000n, blockNumber: 70000000n });

    await worker.resolve({ ...pendingTransaction, createdAt: minutesAgo(11) });

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: 'pending' },
      data: { status: 'failed' },
    });
  });

  it('fails a transaction that never got a hash, without asking the network', async () => {
    const { prisma, tron, worker } = makeWorker();

    await worker.resolve({ ...pendingTransaction, txHash: null, createdAt: minutesAgo(3) });

    expect(tron.getConfirmation).not.toHaveBeenCalled();
    expect(prisma.transaction.updateMany).toHaveBeenCalled();
  });

  it('waits before failing a hashless transaction that was just created', async () => {
    const { prisma, worker } = makeWorker();

    await worker.resolve({ ...pendingTransaction, txHash: null });

    expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
  });
});

describe('ConfirmationWorker.tick', () => {
  it('keeps going when one transaction fails to resolve', async () => {
    const { prisma, tron, worker } = makeWorker();
    prisma.transaction.findMany.mockResolvedValue([
      { ...pendingTransaction, id: 'tx-broken' },
      { ...pendingTransaction, id: 'tx-fine' },
    ]);
    tron.getConfirmation
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ status: 'confirmed', feeNano: 0n, blockNumber: 1n });

    await worker.tick();

    expect(tron.getConfirmation).toHaveBeenCalledTimes(2);
  });

  it('stays idle when workers are disabled', async () => {
    const { prisma, worker } = makeWorker();
    process.env.WORKERS_ENABLED = 'false';

    await worker.tick();
    process.env.WORKERS_ENABLED = 'true';

    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });
});

describe('ConfirmationWorker balance snapshot', () => {
  it('stores the balance observed right after confirmation', async () => {
    const { tron, worker, transactionsInTx } = makeWorker();
    tron.getConfirmation.mockResolvedValue({
      status: 'confirmed',
      feeNano: 100000000n,
      blockNumber: 70000000n,
    });

    await worker.resolve({
      ...pendingTransaction,
      user: { wallet: { address: 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay' } },
    });

    expect(transactionsInTx.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: 'pending' },
      data: {
        status: 'confirmed',
        feeNano: 100000000n,
        blockNumber: 70000000n,
        balanceAfterNano: 5_000_000_000n,
      },
    });
  });

  it('still confirms when the balance cannot be read', async () => {
    const { tron, worker, transactionsInTx } = makeWorker();
    tron.getConfirmation.mockResolvedValue({
      status: 'confirmed',
      feeNano: null,
      blockNumber: null,
    });
    tron.getBalanceNano.mockRejectedValue(new Error('network down'));

    await worker.resolve({
      ...pendingTransaction,
      user: { wallet: { address: 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay' } },
    });

    expect(transactionsInTx.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: 'pending' },
      data: {
        status: 'confirmed',
        feeNano: null,
        blockNumber: null,
        balanceAfterNano: null,
      },
    });
  });
});
