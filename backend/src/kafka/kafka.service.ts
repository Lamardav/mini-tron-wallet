import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  readonly enabled: boolean;

  private readonly logger = new Logger(KafkaService.name);
  private readonly producer: Producer | null = null;

  constructor(config: ConfigService) {
    this.enabled = config.get<string>('KAFKA_ENABLED') === 'true';

    if (!this.enabled) {
      return;
    }

    const kafka = new Kafka({
      clientId: 'wallet-backend',
      brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
      retry: { retries: 3 },
      logLevel: 1,
    });

    this.producer = kafka.producer();
  }

  async onModuleInit() {
    if (!this.producer) {
      return;
    }

    try {
      await this.producer.connect();
    } catch (error) {
      this.logger.warn(`Kafka producer is not available yet: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  async publish(topic: string, key: string, value: object): Promise<void> {
    if (!this.producer) {
      return;
    }

    await this.producer.send({ topic, messages: [{ key, value: JSON.stringify(value) }] });
  }
}
