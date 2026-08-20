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
import { FeeEstimate, TronService } from '../tron/tron.service';
import { SendDto } from './dto';
import { toTransactionResponse, TransactionRecord, TransactionResponse } from './transaction.mapper';
import { WalletEventsService } from './wallet-events.service';

const PAGE_SIZE = 20;
const EXPORT_LIMIT = 10_000;
const UPDATE_HOLD_MS = 25_000;

interface WalletKeys {
  address: string;
  encryptedPrivateKey: string;
}

export interface HistoryPage {
  items: TransactionResponse[];
  nextCursor: string | null;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tron: TronService,
    private readonly crypto: CryptoService,
    private readonly events: WalletEventsService,
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

  async history(userId: string, cursor?: string, limit = PAGE_SIZE): Promise<HistoryPage> {
    const rows = (await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })) as TransactionRecord[];

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map(toTransactionResponse),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async exportCsv(userId: string): Promise<string> {
    const rows = (await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: EXPORT_LIMIT,
    })) as TransactionRecord[];

    const header = [
      'created_at',
      'direction',
      'status',
      'amount_trx',
      'amount_nano',
      'fee_trx',
      'fee_nano',
      'total_debited_trx',
      'total_debited_nano',
      'counterparty_address',
      'tx_hash',
      'block_number',
    ];

    const lines = rows.map((row) => {
      const fee = row.direction === 'outgoing' ? (row.feeNano ?? 0n) : 0n;
      const debited = row.direction === 'outgoing' ? row.amountNano + fee : 0n;

      return [
        row.createdAt.toISOString(),
        row.direction,
        row.status,
        nanoToTrx(row.amountNano),
        row.amountNano.toString(),
        row.feeNano === null ? '' : nanoToTrx(row.feeNano),
        row.feeNano === null ? '' : row.feeNano.toString(),
        debited === 0n ? '' : nanoToTrx(debited),
        debited === 0n ? '' : debited.toString(),
        row.address,
        row.txHash ?? '',
        row.blockNumber?.toString() ?? '',
      ].join(',');
    });

    return [header.join(','), ...lines].join('\n');
  }

  async waitForUpdate(userId: string, since: number) {
    const version = await this.events.waitForChange(userId, since, UPDATE_HOLD_MS);

    if (version === null) {
      return { version: this.events.versionFor(userId), changed: false };
    }

    const [wallet, page] = await Promise.all([this.overview(userId), this.history(userId)]);

    return {
      version,
      changed: true,
      wallet,
      transactions: page.items,
      nextCursor: page.nextCursor,
    };
  }

  async estimate(userId: string, dto: SendDto) {
    const amountNano = this.parseAmount(dto.amountNano);
    const wallet = await this.requireWallet(userId, dto.toAddress);
    const prepared = await this.tron.prepareTransfer(wallet.address, dto.toAddress, amountNano);

    return this.describeCost(amountNano, prepared.fee);
  }

  async send(userId: string, dto: SendDto, idempotencyKey: string): Promise<TransactionResponse> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('IDEMPOTENCY_KEY_REQUIRED');
    }

    const amountNano = this.parseAmount(dto.amountNano);

    const alreadySent = await this.prisma.transaction.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });

    if (alreadySent) {
      return toTransactionResponse(alreadySent as TransactionRecord);
    }

    const wallet = await this.requireWallet(userId, dto.toAddress);
    const prepared = await this.tron.prepareTransfer(wallet.address, dto.toAddress, amountNano);
    const balanceNano = await this.tron.getBalanceNano(wallet.address);
    const requiredNano = amountNano + prepared.fee.totalNano;

    if (balanceNano < requiredNano) {
      throw new UnprocessableEntityException({
        message: 'INSUFFICIENT_BALANCE',
        requiredNano: requiredNano.toString(),
        feeNano: prepared.fee.totalNano.toString(),
        balanceNano: balanceNano.toString(),
        shortfallNano: (requiredNano - balanceNano).toString(),
      });
    }

    const transaction = await this.claimTransaction(
      userId,
      dto,
      amountNano,
      idempotencyKey,
      balanceNano,
    );

    if (!transaction) {
      const owned = await this.prisma.transaction.findUniqueOrThrow({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });

      return toTransactionResponse(owned as TransactionRecord);
    }

    const sent = await this.signAndBroadcast(transaction, wallet, prepared.transaction);
    this.events.bump(userId);

    return toTransactionResponse(sent);
  }

  private describeCost(amountNano: bigint, fee: FeeEstimate) {
    const totalNano = amountNano + fee.totalNano;

    return {
      amountNano: amountNano.toString(),
      amountTrx: nanoToTrx(amountNano),
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

  private async requireWallet(userId: string, toAddress: string): Promise<WalletKeys> {
    if (!this.tron.isValidAddress(toAddress)) {
      throw new BadRequestException('INVALID_ADDRESS');
    }

    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });

    if (wallet.address === toAddress) {
      throw new BadRequestException('CANNOT_SEND_TO_SELF');
    }

    return wallet;
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
    balanceBeforeNano: bigint,
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
          balanceBeforeNano,
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
    prepared: object,
  ): Promise<TransactionRecord> {
    let signed;

    try {
      signed = await this.tron.signTransfer(
        prepared,
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
