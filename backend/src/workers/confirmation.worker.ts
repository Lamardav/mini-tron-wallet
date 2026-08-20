import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TronService } from '../tron/tron.service';

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 25;
const MISSING_HASH_TIMEOUT_MS = 2 * 60_000;
const UNCONFIRMED_TIMEOUT_MS = 10 * 60_000;

export interface PendingTransaction {
  id: string;
  amountNano: bigint;
  txHash: string | null;
  createdAt: Date;
}

@Injectable()
export class ConfirmationWorker {
  private readonly logger = new Logger(ConfirmationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tron: TronService,
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async tick() {
    if (process.env.WORKERS_ENABLED === 'false') {
      return;
    }

    const pending = (await this.prisma.transaction.findMany({
      where: { status: 'pending' },
      take: BATCH_SIZE,
    })) as PendingTransaction[];

    for (const transaction of pending) {
      try {
        await this.resolve(transaction);
      } catch (error) {
        this.logger.warn(`Could not resolve ${transaction.id}: ${(error as Error).message}`);
      }
    }
  }

  async resolve(transaction: PendingTransaction) {
    const age = Date.now() - transaction.createdAt.getTime();

    if (!transaction.txHash) {
      if (age > MISSING_HASH_TIMEOUT_MS) {
        await this.markFailed(transaction.id);
      }

      return;
    }

    const status = await this.tron.getConfirmation(transaction.txHash);

    if (status === 'confirmed') {
      await this.markConfirmed(transaction);

      return;
    }

    if (status === 'failed' || age > UNCONFIRMED_TIMEOUT_MS) {
      await this.markFailed(transaction.id);
    }
  }

  private async markConfirmed(transaction: PendingTransaction) {
    await this.prisma.$transaction(async (db) => {
      const updated = await db.transaction.updateMany({
        where: { id: transaction.id, status: 'pending' },
        data: { status: 'confirmed' },
      });

      if (updated.count === 0) {
        return;
      }

      await db.outboxEvent.create({
        data: {
          topic: 'wallet.transaction.confirmed',
          payload: {
            event: 'wallet.transaction.confirmed',
            transaction_id: transaction.id,
            amount_nano: transaction.amountNano.toString(),
          },
        },
      });
    });
  }

  private async markFailed(id: string) {
    await this.prisma.transaction.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'failed' },
    });
  }
}
