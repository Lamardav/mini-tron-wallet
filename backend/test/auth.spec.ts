import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/auth/auth.service';

function makeAuthService() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
  };
  const tron = {
    createAccount: jest.fn().mockResolvedValue({
      address: 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay',
      privateKey: 'plain-private-key',
    }),
  };
  const crypto = {
    encrypt: jest.fn().mockReturnValue('encrypted-private-key'),
  };
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '24h' },
  });

  return {
    prisma,
    tron,
    crypto,
    jwt,
    service: new AuthService(
      prisma as never,
      jwt,
      tron as never,
      crypto as never,
    ),
  };
}

const credentials = {
  email: 'user@example.com',
  password: 'rope harbour lantern',
};

describe('AuthService.register', () => {
  it('creates a wallet, hashes the password and encrypts the private key', async () => {
    const { prisma, crypto, jwt, service } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'user-1',
        email: data.email,
        passwordHash: data.passwordHash,
        wallet: { address: 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay' },
      }),
    );

    const result = await service.register(credentials);
    const created = prisma.user.create.mock.calls[0][0].data;

    expect(
      await bcrypt.compare(credentials.password, created.passwordHash),
    ).toBe(true);
    expect(created.passwordHash).not.toContain(credentials.password);
    expect(crypto.encrypt).toHaveBeenCalledWith('plain-private-key');
    expect(created.wallet.create.encryptedPrivateKey).toBe(
      'encrypted-private-key',
    );
    expect(result.user).toEqual({
      id: 'user-1',
      email: credentials.email,
      address: 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay',
    });
    expect(jwt.verify(result.token).sub).toBe('user-1');
  });

  it('never exposes the private key to the caller', async () => {
    const { prisma, service } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: credentials.email,
      passwordHash: 'hash',
      wallet: {
        address: 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay',
        encryptedPrivateKey: 'encrypted',
      },
    });

    const result = await service.register(credentials);

    expect(JSON.stringify(result)).not.toContain('plain-private-key');
    expect(JSON.stringify(result)).not.toContain('encrypted');
  });

  it('rejects an email that is already registered', async () => {
    const { prisma, service } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(service.register(credentials)).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('AuthService.login', () => {
  it('returns a token for valid credentials', async () => {
    const { prisma, service } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: credentials.email,
      passwordHash: await bcrypt.hash(credentials.password, 10),
      wallet: { address: 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay' },
    });

    const result = await service.login(credentials);

    expect(result.user.address).toBe('TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay');
    expect(typeof result.token).toBe('string');
  });

  it('rejects an unknown email', async () => {
    const { prisma, service } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login(credentials)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a wrong password', async () => {
    const { prisma, service } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: credentials.email,
      passwordHash: await bcrypt.hash('a different password', 10),
      wallet: { address: 'TVTqhMdd6mSQ3VanpwZvAn3H3zsUG8v7Ay' },
    });

    await expect(service.login(credentials)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('AuthService password policy', () => {
  it('refuses a password that is too short', async () => {
    const { service } = makeAuthService();

    await expect(
      service.register({ email: 'user@example.com', password: '12345678' }),
    ).rejects.toThrow('PASSWORD_TOO_SHORT');
  });

  it('refuses a password built from the email address', async () => {
    const { prisma, service } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.register({
        email: 'valentina@example.com',
        password: 'valentina-wallet',
      }),
    ).rejects.toThrow('PASSWORD_CONTAINS_EMAIL');
  });

  it('checks the password before touching the database', async () => {
    const { prisma, service } = makeAuthService();

    await service
      .register({ email: 'user@example.com', password: 'short' })
      .catch(() => undefined);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
