import {
  BadRequestException,
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { TronService } from '../tron/tron.service';
import { LoginDto, RegisterDto, VerifyEmailDto } from './dto';
import { findPasswordProblem } from './password.policy';

const BCRYPT_ROUNDS = 10;
const RESEND_INTERVAL_MS = 60_000;

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  verificationSentAt?: Date | null;
  wallet: { address: string } | null;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    address: string | null;
    emailVerified: boolean;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tron: TronService,
    private readonly crypto: CryptoService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const problem = findPasswordProblem(dto.password, dto.email);

    if (problem) {
      throw new BadRequestException(problem);
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const account = await this.tron.createAccount();
    const verification = this.newVerificationToken();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        verificationHash: verification.hash,
        verificationSentAt: new Date(),
        wallet: {
          create: {
            address: account.address,
            encryptedPrivateKey: this.crypto.encrypt(account.privateKey),
          },
        },
      },
      include: { wallet: true },
    });

    this.deliverVerification(dto.email, verification.token);

    return this.buildResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = (await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { wallet: true },
    })) as UserRecord | null;

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return this.buildResponse(user);
  }

  async me(userId: string) {
    const user = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { wallet: true },
    })) as UserRecord;

    return {
      id: user.id,
      email: user.email,
      address: user.wallet?.address ?? null,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { verificationHash: this.hashToken(dto.token) },
    });

    if (!user) {
      throw new BadRequestException('VERIFICATION_TOKEN_INVALID');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), verificationHash: null },
    });

    return { emailVerified: true };
  }

  async resendVerification(userId: string) {
    const user = (await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { wallet: true },
    })) as UserRecord;

    if (user.emailVerifiedAt) {
      throw new BadRequestException('EMAIL_ALREADY_VERIFIED');
    }

    const sentAt = user.verificationSentAt?.getTime() ?? 0;

    if (Date.now() - sentAt < RESEND_INTERVAL_MS) {
      throw new BadRequestException('VERIFICATION_REQUESTED_TOO_SOON');
    }

    const verification = this.newVerificationToken();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationHash: verification.hash,
        verificationSentAt: new Date(),
      },
    });

    this.deliverVerification(user.email, verification.token);

    return { sent: true };
  }

  private newVerificationToken() {
    const token = randomBytes(32).toString('hex');

    return { token, hash: this.hashToken(token) };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private deliverVerification(email: string, token: string) {
    this.logger.log(`Verification token issued for ${email}: ${token}`);
  }

  private buildResponse(user: UserRecord): AuthResponse {
    return {
      token: this.jwt.sign({ sub: user.id, email: user.email }),
      user: {
        id: user.id,
        email: user.email,
        address: user.wallet?.address ?? null,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    };
  }
}
