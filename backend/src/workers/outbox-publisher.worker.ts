import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { KafkaService } from '../kafka/kafka.service';
import { PrismaService } from '../prisma/prisma.service';

const POLL_INTERVAL_MS = 3_000;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxPublisherWorker {
  private readonly logger = new Logger(OutboxPublisherWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService,
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async tick() {
    if (process.env.WORKERS_ENABLED === 'false' || !this.kafka.enabled) {
      return;
    }

    const events = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    for (const event of events) {
      try {
        await this.kafka.publish(event.topic, event.id, event.payload as object);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { publishedAt: new Date() },
        });
      } catch (error) {
        this.logger.warn(`Could not publish ${event.id}: ${(error as Error).message}`);

        return;
      }
    }
  }
}
