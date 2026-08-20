import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { TronService } from '../tron/tron.service';
import { LoginDto, RegisterDto } from './dto';

const BCRYPT_ROUNDS = 10;

interface UserWithWallet {
  id: string;
  email: string;
  passwordHash: string;
  wallet: { address: string } | null;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; address: string | null };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tron: TronService,
    private readonly crypto: CryptoService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const account = await this.tron.createAccount();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        wallet: {
          create: {
            address: account.address,
            encryptedPrivateKey: this.crypto.encrypt(account.privateKey),
          },
        },
      },
      include: { wallet: true },
    });

    return this.buildResponse(user as UserWithWallet);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = (await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { wallet: true },
    })) as UserWithWallet | null;

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return this.buildResponse(user);
  }

  async me(userId: string) {
    const user = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { wallet: true },
    })) as UserWithWallet;

    return { id: user.id, email: user.email, address: user.wallet?.address ?? null };
  }

  private buildResponse(user: UserWithWallet): AuthResponse {
    return {
      token: this.jwt.sign({ sub: user.id, email: user.email }),
      user: { id: user.id, email: user.email, address: user.wallet?.address ?? null },
    };
  }
}
