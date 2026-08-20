import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IncomingTransfer, TronService } from '../tron/tron.service';
import { WalletEventsService } from '../wallet/wallet-events.service';

const POLL_INTERVAL_MS = 5_000;
const MAX_BLOCKS_PER_PASS = 20n;
const SYNC_STATE_ID = 1;

@Injectable()
export class IncomingScannerWorker {
  private readonly logger = new Logger(IncomingScannerWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tron: TronService,
    private readonly events: WalletEventsService,
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async tick() {
    if (process.env.WORKERS_ENABLED === 'false') {
      return;
    }

    const latest = await this.tron.getLatestBlockNumber();
    const state = await this.prisma.syncState.upsert({
      where: { id: SYNC_STATE_ID },
      create: { id: SYNC_STATE_ID, lastScannedBlock: latest },
      update: {},
    });

    const from = state.lastScannedBlock + 1n;
    const lastAllowed = from + MAX_BLOCKS_PER_PASS - 1n;
    const to = latest < lastAllowed ? latest : lastAllowed;

    if (to < from) {
      return;
    }

    for (let block = from; block <= to; block++) {
      for (const transfer of await this.tron.getBlockTransfers(block)) {
        try {
          await this.record(transfer);
        } catch (error) {
          this.logger.warn(
            `Could not record incoming ${transfer.txHash}: ${(error as Error).message}`,
          );
        }
      }
    }

    await this.prisma.syncState.update({
      where: { id: SYNC_STATE_ID },
      data: { lastScannedBlock: to },
    });
  }

  private async record(transfer: IncomingTransfer) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: transfer.to },
    });

    if (!wallet) {
      return;
    }

    const known = await this.prisma.transaction.findFirst({
      where: {
        userId: wallet.userId,
        txHash: transfer.txHash,
        direction: 'incoming',
      },
    });

    if (known) {
      return;
    }

    try {
      await this.prisma.transaction.create({
        data: {
          userId: wallet.userId,
          direction: 'incoming',
          amountNano: transfer.amountNano,
          address: transfer.from,
          status: 'pending',
          txHash: transfer.txHash,
        },
      });

      this.events.bump(wallet.userId);
    } catch (error) {
      if (!(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )) {
        throw error;
      }
    }
  }
}
