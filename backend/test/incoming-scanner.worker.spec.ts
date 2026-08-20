import { IncomingScannerWorker } from '../src/workers/incoming-scanner.worker';

const OUR_ADDRESS = 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay';
const SENDER = 'TEg8m217pUpuNUyKmBANsFL2aVBQAzwwz3';

function makeWorker() {
  const prisma = {
    syncState: {
      upsert: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    wallet: { findUnique: jest.fn().mockResolvedValue(null) },
    transaction: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const tron = {
    getLatestBlockNumber: jest.fn(),
    getBlockTransfers: jest.fn().mockResolvedValue([]),
  };

  return { prisma, tron, worker: new IncomingScannerWorker(prisma as never, tron as never) };
}

describe('IncomingScannerWorker.tick', () => {
  it('records a transfer that landed on one of our wallets', async () => {
    const { prisma, tron, worker } = makeWorker();
    tron.getLatestBlockNumber.mockResolvedValue(101n);
    prisma.syncState.upsert.mockResolvedValue({ id: 1, lastScannedBlock: 100n });
    tron.getBlockTransfers.mockResolvedValue([
      { txHash: 'hash-in', from: SENDER, to: OUR_ADDRESS, amountNano: 1_000_000_000n },
    ]);
    prisma.wallet.findUnique.mockResolvedValue({ userId: 'user-2', address: OUR_ADDRESS });

    await worker.tick();

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-2',
        direction: 'incoming',
        amountNano: 1_000_000_000n,
        address: SENDER,
        status: 'pending',
        txHash: 'hash-in',
      },
    });
    expect(prisma.syncState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { lastScannedBlock: 101n },
    });
  });

  it('ignores transfers to addresses we do not own', async () => {
    const { prisma, tron, worker } = makeWorker();
    tron.getLatestBlockNumber.mockResolvedValue(101n);
    prisma.syncState.upsert.mockResolvedValue({ id: 1, lastScannedBlock: 100n });
    tron.getBlockTransfers.mockResolvedValue([
      { txHash: 'hash-other', from: SENDER, to: 'TStranger', amountNano: 5n },
    ]);

    await worker.tick();

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('does not record the same incoming transfer twice', async () => {
    const { prisma, tron, worker } = makeWorker();
    tron.getLatestBlockNumber.mockResolvedValue(101n);
    prisma.syncState.upsert.mockResolvedValue({ id: 1, lastScannedBlock: 100n });
    tron.getBlockTransfers.mockResolvedValue([
      { txHash: 'hash-in', from: SENDER, to: OUR_ADDRESS, amountNano: 1000n },
    ]);
    prisma.wallet.findUnique.mockResolvedValue({ userId: 'user-2', address: OUR_ADDRESS });
    prisma.transaction.findFirst.mockResolvedValue({ id: 'already-there' });

    await worker.tick();

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('does nothing when no new blocks have been produced', async () => {
    const { prisma, tron, worker } = makeWorker();
    tron.getLatestBlockNumber.mockResolvedValue(100n);
    prisma.syncState.upsert.mockResolvedValue({ id: 1, lastScannedBlock: 100n });

    await worker.tick();

    expect(tron.getBlockTransfers).not.toHaveBeenCalled();
    expect(prisma.syncState.update).not.toHaveBeenCalled();
  });

  it('scans at most twenty blocks in one pass', async () => {
    const { prisma, tron, worker } = makeWorker();
    tron.getLatestBlockNumber.mockResolvedValue(1000n);
    prisma.syncState.upsert.mockResolvedValue({ id: 1, lastScannedBlock: 100n });

    await worker.tick();

    expect(tron.getBlockTransfers).toHaveBeenCalledTimes(20);
    expect(prisma.syncState.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { lastScannedBlock: 120n },
    });
  });
});
