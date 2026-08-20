import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WalletService } from '../src/wallet/wallet.service';

const OUR_ADDRESS = 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay';
const RECIPIENT = 'TEg8m217pUpuNUyKmBANsFL2aVBQAzwwz3';

const freeFee = {
  bandwidthNano: 0n,
  activationNano: 0n,
  totalNano: 0n,
  coveredByBandwidth: true,
  recipientActivated: true,
};

const newAddressFee = {
  bandwidthNano: 200_000_000n,
  activationNano: 1_000_000_000n,
  totalNano: 1_200_000_000n,
  coveredByBandwidth: false,
  recipientActivated: false,
};

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
    prepareTransfer: jest.fn().mockResolvedValue({ transaction: { raw: true }, fee: freeFee }),
    signTransfer: jest.fn(),
    broadcast: jest.fn().mockResolvedValue(undefined),
  };
  const crypto = { decrypt: jest.fn().mockReturnValue('plain-private-key') };
  const events = {
    bump: jest.fn(),
    versionFor: jest.fn().mockReturnValue(0),
    waitForChange: jest.fn(),
  };

  return {
    prisma,
    tron,
    crypto,
    events,
    service: new WalletService(prisma as never, tron as never, crypto as never, events as never),
  };
}

function transactionRow(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
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
  it('maps stored transactions to string amounts', async () => {
    const { prisma, service } = makeWalletService();
    prisma.transaction.findMany.mockResolvedValue([transactionRow({ amountNano: 500_000_000n })]);

    const page = await service.history('user-1');

    expect(page.items[0].amountNano).toBe('500000000');
    expect(page.items[0].amountTrx).toBe('0.500000000');
    expect(page.items[0].createdAt).toBe('2026-08-20T10:00:00.000Z');
    expect(page.nextCursor).toBeNull();
  });

  it('returns a cursor only when more rows exist', async () => {
    const { prisma, service } = makeWalletService();
    prisma.transaction.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => transactionRow({ id: `tx-${index}` })),
    );

    const page = await service.history('user-1');

    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBe('tx-19');
  });

  it('continues from a cursor without repeating it', async () => {
    const { prisma, service } = makeWalletService();
    prisma.transaction.findMany.mockResolvedValue([]);

    await service.history('user-1', 'tx-19');

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'tx-19' }, skip: 1 }),
    );
  });
});

describe('WalletService.exportCsv', () => {
  it('writes a header and one line per transaction', async () => {
    const { prisma, service } = makeWalletService();
    prisma.transaction.findMany.mockResolvedValue([
      transactionRow({ status: 'confirmed', feeNano: 1_100_000_000n, txHash: 'hash-1' }),
    ]);

    const [header, row] = (await service.exportCsv('user-1')).split('\n');

    expect(header).toContain('total_debited_trx');
    expect(row).toContain('1.223456000');
    expect(row).toContain('hash-1');
  });

  it('leaves the debited column empty for incoming transfers', async () => {
    const { prisma, service } = makeWalletService();
    prisma.transaction.findMany.mockResolvedValue([
      transactionRow({ direction: 'incoming', feeNano: 1_100_000_000n }),
    ]);

    const [, row] = (await service.exportCsv('user-1')).split('\n');

    expect(row).toContain('incoming');
    expect(row).not.toContain('1.223456000');
  });
});

describe('WalletService.send', () => {
  const request = { toAddress: RECIPIENT, amountNano: '123456000' };

  function primeSuccessfulSend(context: ReturnType<typeof makeWalletService>) {
    context.prisma.wallet.findUniqueOrThrow.mockResolvedValue({
      address: OUR_ADDRESS,
      encryptedPrivateKey: 'encrypted',
    });
    context.prisma.transaction.findUnique.mockResolvedValue(null);
    context.tron.getBalanceNano.mockResolvedValue(10_000_000_000n);
    context.prisma.transaction.create.mockResolvedValue(transactionRow());
    context.tron.signTransfer.mockResolvedValue({ txHash: 'hash-1', signed: {} });
    context.prisma.transaction.update.mockResolvedValue(transactionRow({ txHash: 'hash-1' }));
  }

  it('requires an idempotency key', async () => {
    const { service } = makeWalletService();

    await expect(service.send('user-1', request, '')).rejects.toThrow('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('rejects an invalid recipient address', async () => {
    const context = makeWalletService();
    context.prisma.transaction.findUnique.mockResolvedValue(null);
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

  it('refuses a transfer to the sender own address', async () => {
    const context = makeWalletService();
    context.prisma.transaction.findUnique.mockResolvedValue(null);
    context.prisma.wallet.findUniqueOrThrow.mockResolvedValue({
      address: OUR_ADDRESS,
      encryptedPrivateKey: 'encrypted',
    });

    await expect(
      context.service.send('user-1', { ...request, toAddress: OUR_ADDRESS }, 'key-1'),
    ).rejects.toThrow('CANNOT_SEND_TO_SELF');
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

  it('rejects a transfer that fits the balance but leaves nothing for the fee', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);
    context.tron.prepareTransfer.mockResolvedValue({
      transaction: { raw: true },
      fee: newAddressFee,
    });
    context.tron.getBalanceNano.mockResolvedValue(200_000_000n);

    await expect(
      context.service.send('user-1', { ...request, amountNano: '200000000' }, 'key-1'),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(context.prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('reports how much is missing when the fee does not fit', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);
    context.tron.prepareTransfer.mockResolvedValue({
      transaction: { raw: true },
      fee: newAddressFee,
    });
    context.tron.getBalanceNano.mockResolvedValue(200_000_000n);

    const failure = await context.service
      .send('user-1', { ...request, amountNano: '200000000' }, 'key-1')
      .catch((error: UnprocessableEntityException) => error.getResponse());

    expect(failure).toMatchObject({
      message: 'INSUFFICIENT_BALANCE',
      requiredNano: '1400000000',
      shortfallNano: '1200000000',
    });
  });

  it('builds the transaction once and signs that same transaction', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);

    await context.service.send('user-1', request, 'key-1');

    expect(context.tron.prepareTransfer).toHaveBeenCalledTimes(1);
    expect(context.tron.signTransfer).toHaveBeenCalledWith({ raw: true }, 'plain-private-key');
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
    context.prisma.transaction.findUnique.mockResolvedValue(transactionRow({ txHash: 'hash-1' }));

    const result = await context.service.send('user-1', request, 'key-1');

    expect(result.id).toBe('tx-1');
    expect(context.prisma.transaction.create).not.toHaveBeenCalled();
    expect(context.tron.prepareTransfer).not.toHaveBeenCalled();
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
    context.prisma.transaction.findUniqueOrThrow.mockResolvedValue(
      transactionRow({ txHash: 'hash-1' }),
    );

    const result = await context.service.send('user-1', request, 'key-1');

    expect(result.id).toBe('tx-1');
    expect(context.tron.signTransfer).not.toHaveBeenCalled();
  });

  it('marks the transaction failed when signing fails', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);
    context.tron.signTransfer.mockRejectedValue(new Error('signing rejected'));
    context.prisma.transaction.update.mockResolvedValue(transactionRow({ status: 'failed' }));

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

  it('announces the change so waiting clients wake up', async () => {
    const context = makeWalletService();
    primeSuccessfulSend(context);

    await context.service.send('user-1', request, 'key-1');

    expect(context.events.bump).toHaveBeenCalledWith('user-1');
  });
});

describe('WalletService.estimate', () => {
  it('reports the amount, the fee and the total to be debited', async () => {
    const context = makeWalletService();
    context.prisma.wallet.findUniqueOrThrow.mockResolvedValue({
      address: OUR_ADDRESS,
      encryptedPrivateKey: 'encrypted',
    });
    context.tron.prepareTransfer.mockResolvedValue({
      transaction: { raw: true },
      fee: newAddressFee,
    });

    const estimate = await context.service.estimate('user-1', {
      toAddress: RECIPIENT,
      amountNano: '123456000',
    });

    expect(estimate).toMatchObject({
      amountNano: '123456000',
      feeNano: '1200000000',
      totalNano: '1323456000',
      totalTrx: '1.323456000',
      recipientActivated: false,
    });
  });

  it('refuses to estimate a transfer to the sender own address', async () => {
    const context = makeWalletService();
    context.prisma.wallet.findUniqueOrThrow.mockResolvedValue({
      address: OUR_ADDRESS,
      encryptedPrivateKey: 'encrypted',
    });

    await expect(
      context.service.estimate('user-1', { toAddress: OUR_ADDRESS, amountNano: '1000' }),
    ).rejects.toThrow('CANNOT_SEND_TO_SELF');
  });
});
