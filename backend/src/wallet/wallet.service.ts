import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AmountError, nanoToTrx, parseAmountNano } from '../common/amount';
import { CryptoService } from '../crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { TronService } from '../tron/tron.service';
import { SendDto } from './dto';
import { toTransactionResponse, TransactionRecord, TransactionResponse } from './transaction.mapper';

const HISTORY_LIMIT = 100;

interface WalletKeys {
  address: string;
  encryptedPrivateKey: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tron: TronService,
    private readonly crypto: CryptoService,
  ) {}

  async overview(userId: string) {
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const balanceNano = await this.tron.getBalanceNano(wallet.address);

    return {
      address: wallet.address,
      balanceNano: balanceNano.toString(),
      balanceTrx: nanoToTrx(balanceNano),
    };
  }

  async estimate(userId: string, dto: SendDto) {
    if (!this.tron.isValidAddress(dto.toAddress)) {
      throw new BadRequestException('INVALID_ADDRESS');
    }

    const amountNano = this.parseAmount(dto.amountNano);
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const fee = await this.tron.estimateFee(wallet.address, dto.toAddress, amountNano);
    const totalNano = amountNano + fee.totalNano;

    return {
      amountNano: amountNano.toString(),
      feeNano: fee.totalNano.toString(),
      feeTrx: nanoToTrx(fee.totalNano),
      activationNano: fee.activationNano.toString(),
      bandwidthNano: fee.bandwidthNano.toString(),
      totalNano: totalNano.toString(),
      totalTrx: nanoToTrx(totalNano),
      coveredByBandwidth: fee.coveredByBandwidth,
      recipientActivated: fee.recipientActivated,
    };
  }

  async history(userId: string): Promise<TransactionResponse[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });

    return (transactions as TransactionRecord[]).map(toTransactionResponse);
  }

  async send(userId: string, dto: SendDto, idempotencyKey: string): Promise<TransactionResponse> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('IDEMPOTENCY_KEY_REQUIRED');
    }

    if (!this.tron.isValidAddress(dto.toAddress)) {
      throw new BadRequestException('INVALID_ADDRESS');
    }

    const amountNano = this.parseAmount(dto.amountNano);

    const alreadySent = await this.prisma.transaction.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });

    if (alreadySent) {
      return toTransactionResponse(alreadySent as TransactionRecord);
    }

    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const balanceNano = await this.tron.getBalanceNano(wallet.address);

    if (balanceNano < amountNano) {
      throw new UnprocessableEntityException('INSUFFICIENT_BALANCE');
    }

    const transaction = await this.claimTransaction(userId, dto, amountNano, idempotencyKey);

    if (!transaction) {
      const owned = await this.prisma.transaction.findUniqueOrThrow({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });

      return toTransactionResponse(owned as TransactionRecord);
    }

    return toTransactionResponse(await this.signAndBroadcast(transaction, wallet, dto, amountNano));
  }

  private parseAmount(raw: string): bigint {
    try {
      return parseAmountNano(raw);
    } catch (error) {
      if (error instanceof AmountError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private async claimTransaction(
    userId: string,
    dto: SendDto,
    amountNano: bigint,
    idempotencyKey: string,
  ): Promise<TransactionRecord | null> {
    try {
      return (await this.prisma.transaction.create({
        data: {
          userId,
          direction: 'outgoing',
          amountNano,
          address: dto.toAddress,
          status: 'pending',
          idempotencyKey,
        },
      })) as TransactionRecord;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }

      throw error;
    }
  }

  private async signAndBroadcast(
    transaction: TransactionRecord,
    wallet: WalletKeys,
    dto: SendDto,
    amountNano: bigint,
  ): Promise<TransactionRecord> {
    let signed;

    try {
      signed = await this.tron.buildSignedTransfer(
        wallet.address,
        dto.toAddress,
        amountNano,
        this.crypto.decrypt(wallet.encryptedPrivateKey),
      );
    } catch (error) {
      this.logger.error(`Signing failed for ${transaction.id}: ${(error as Error).message}`);

      return (await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'failed' },
      })) as TransactionRecord;
    }

    const withHash = (await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { txHash: signed.txHash },
    })) as TransactionRecord;

    try {
      await this.tron.broadcast(signed.signed);
    } catch (error) {
      this.logger.warn(
        `Broadcast of ${signed.txHash} failed, leaving it for the confirmation worker: ${(error as Error).message}`,
      );
    }

    return withHash;
  }
}
