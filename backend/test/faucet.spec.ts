import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FaucetService } from '../src/faucet/faucet.service';

const FAUCET_ADDRESS = 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay';
const USER_ADDRESS = 'TEg8m217pUpuNUyKmBANsFL2aVBQAzwwz3';

function makeFaucet(privateKey = 'a'.repeat(64)) {
  const config = { get: () => privateKey } as unknown as ConfigService;
  const prisma = {
    wallet: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ address: USER_ADDRESS }),
    },
  };
  const tron = {
    addressForPrivateKey: jest.fn().mockReturnValue(FAUCET_ADDRESS),
    getBalanceNano: jest.fn().mockResolvedValue(500_000_000_000n),
    sendFromPrivateKey: jest.fn().mockResolvedValue('hash-1'),
  };
  const events = { bump: jest.fn() };

  return {
    prisma,
    tron,
    events,
    service: new FaucetService(
      config,
      prisma as never,
      tron as never,
      events as never,
    ),
  };
}

describe('FaucetService.status', () => {
  it('reports the source address and what is left on it', async () => {
    const { service } = makeFaucet();

    expect(await service.status()).toMatchObject({
      enabled: true,
      address: FAUCET_ADDRESS,
      balanceTrx: '500.000000000',
      maxClaimTrx: '100.000000000',
    });
  });

  it('reports itself disabled when no key is configured', async () => {
    const { service } = makeFaucet('');

    expect(await service.status()).toEqual({ enabled: false });
  });
});

describe('FaucetService.claim', () => {
  it('sends the requested amount to the wallet of the signed in user', async () => {
    const { tron, events, service } = makeFaucet();

    const result = await service.claim('user-1', { amountNano: '20000000000' });

    expect(tron.sendFromPrivateKey).toHaveBeenCalledWith(
      'a'.repeat(64),
      USER_ADDRESS,
      20_000_000_000n,
    );
    expect(result.amountTrx).toBe('20.000000000');
    expect(events.bump).toHaveBeenCalledWith('user-1');
  });

  it('refuses to run when the faucet is switched off', async () => {
    const { service } = makeFaucet('');

    await expect(
      service.claim('user-1', { amountNano: '1000000' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('caps a single claim', async () => {
    const { service, tron } = makeFaucet();

    await expect(
      service.claim('user-1', { amountNano: '200000000000' }),
    ).rejects.toThrow(BadRequestException);
    expect(tron.sendFromPrivateKey).not.toHaveBeenCalled();
  });

  it('keeps a reserve so the source wallet can still pay fees', async () => {
    const { service, tron } = makeFaucet();
    tron.getBalanceNano.mockResolvedValue(21_000_000_000n);

    await expect(
      service.claim('user-1', { amountNano: '20000000000' }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(tron.sendFromPrivateKey).not.toHaveBeenCalled();
  });

  it('rejects an amount the network cannot settle', async () => {
    const { service } = makeFaucet();

    await expect(
      service.claim('user-1', { amountNano: '123456789' }),
    ).rejects.toThrow('AMOUNT_NOT_REPRESENTABLE_ON_CHAIN');
  });
});
