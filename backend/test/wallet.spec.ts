import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WalletService } from '../src/wallet/wallet.service';

const OUR_ADDRESS = 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay';
const RECIPIENT = 'TEg8m217pUpuNUyKmBANsFL2aVBQAzwwz3';

function makeWalletService() {
  const prisma = {
    wallet: { findUniqueOrThrow: jest.fn() },
    transaction: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const tron = {
    isValidAddress: jest.fn().mockReturnValue(true),
    getBalanceNano: jest.fn(),
    buildSignedTransfer: jest.fn(),
    broadcast: jest.fn().mockResolvedValue(undefined),
  };
  const crypto = { decrypt: jest.fn().mockReturnValue('plain-private-key') };

  return {
    prisma,
    tron,
    crypto,
    service: new WalletService(prisma as never, tron as never, crypto as never),
  };
}

describe('WalletService.overview', () => {
  it('reports the address and balance as strings', async () => {
    const { prisma, tron, service } = makeWalletService();
    prisma.wallet.findUniqueOrThrow.mockResolvedValue({
      address: OUR_ADDRESS,
      encryptedPrivateKey: 'encrypted',
    });
    tron.getBalanceNano.mockResolvedValue(2_500_000_000n);

    expect(await service.overview('user-1')).toEqual({
      address: OUR_ADDRESS,
      balanceNano: '2500000000',
      balanceTrx: '2.500000000',
    });
  });
});

describe('WalletService.history', () => {
  it('maps stored transactions to string amounts, newest first', async () => {
    const { prisma, service } = makeWalletService();
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        userId: 'user-1',
        direction: 'outgoing',
        amountNano: 500_000_000n,
        address: RECIPIENT,
        status: 'pending',
        txHash: null,
        feeNano: null,
        balanceBeforeNano: null,
        balanceAfterNano: null,
        blockNumber: null,
        createdAt: new Date('2026-08-20T10:00:00.000Z'),
      },
    ]);

    const [transaction] = await service.history('user-1');

    expect(transaction.amountNano).toBe('500000000');
    expect(transaction.amountTrx).toBe('0.500000000');
    expect(transaction.createdAt).toBe('2026-08-20T10:00:00.000Z');
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });
});

describe('WalletService.send', () => {
  const request = { toAddress: RECIPIENT, amountNano: '123456000' };
  const storedTransaction = {
    id: 'tx-1',
    userId: 'user-1',
    direction: 'outgoing',
    amountNano: 123_456_000n,
    address: RECIPIENT,
    status: 'pending',
    txHash: null,
    idempotencyKey: 'key-1',
    feeNano: null,
    balanceBeforeNano: null,
    balanceAfterNano: null,
    blockNumber: null,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
  };

  function primeSuccessfulSend(context: ReturnType<typeof makeWalletService>) {
    context.prisma.wallet.findUniqueOrThrow.mockResolvedValue({
      address: OUR_ADDRESS,
      encryptedPrivateKey: 'encrypted',
    });
    context.prisma.transaction.findUnique.mockResolvedValue(null);
    context.tron.getBalanceNano.mockResolvedValue(10_000_000_000n);
    context.prisma.transaction.create.mockResolvedValue(storedTransaction);
    context.tron.buildSignedTransfer.mockResolvedValue({ txHash: 'hash-1', signed: {} });
    context.prisma.transaction.update.mockResolvedValue({
      ...storedTransaction,
      txHash: 'hash-1',
    });
  }

  it('requires an idempotency key', async () => {
    const { service } = makeWalletService();

    await expect(service.send('user-1', request, '')).rejects.toThrow('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('rejects an invalid recipient address', async () => {
    const context = makeWalletService();
    context.tron.isValidAddress.mockReturnValue(false);

    await expect(context.service.send('user-1', request, 'key-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an amount finer than one SUN', async () => {
    const context = makeWalletService();

    await expect(
      context.service.send('user-1', { ...request, amountNano: '123456789' }, 'key-1'),
    ).rejects.toThrow('AMOUNT_NOT_REPRESENTABLE_ON_CHAIN');
  });

  it('rejects a transfer larger than the balance', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);
    context.tron.getBalanceNano.mockResolvedValue(100_000n);

    await expect(context.service.send('user-1', request, 'key-1')).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(context.prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('stores the hash before broadcasting so a crash cannot lose the transaction', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);

    const result = await context.service.send('user-1', request, 'key-1');

    expect(result.status).toBe('pending');
    expect(result.txHash).toBe('hash-1');
    expect(context.prisma.transaction.update.mock.invocationCallOrder[0]).toBeLessThan(
      context.tron.broadcast.mock.invocationCallOrder[0],
    );
  });

  it('returns the original transaction when the idempotency key repeats', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);
    context.prisma.transaction.findUnique.mockResolvedValue({
      ...storedTransaction,
      txHash: 'hash-1',
    });

    const result = await context.service.send('user-1', request, 'key-1');

    expect(result.id).toBe('tx-1');
    expect(context.prisma.transaction.create).not.toHaveBeenCalled();
    expect(context.tron.buildSignedTransfer).not.toHaveBeenCalled();
    expect(context.tron.broadcast).not.toHaveBeenCalled();
  });

  it('survives two concurrent requests sharing one idempotency key', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);
    context.prisma.transaction.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    context.prisma.transaction.findUniqueOrThrow.mockResolvedValue({
      ...storedTransaction,
      txHash: 'hash-1',
    });

    const result = await context.service.send('user-1', request, 'key-1');

    expect(result.id).toBe('tx-1');
    expect(context.tron.buildSignedTransfer).not.toHaveBeenCalled();
  });

  it('marks the transaction failed when signing fails', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);
    context.tron.buildSignedTransfer.mockRejectedValue(new Error('signing rejected'));
    context.prisma.transaction.update.mockResolvedValue({
      ...storedTransaction,
      status: 'failed',
    });

    expect((await context.service.send('user-1', request, 'key-1')).status).toBe('failed');
  });

  it('keeps the transaction pending when the broadcast connection drops', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);
    context.tron.broadcast.mockRejectedValue(new Error('connection reset'));

    const result = await context.service.send('user-1', request, 'key-1');

    expect(result.status).toBe('pending');
    expect(result.txHash).toBe('hash-1');
  });
});
