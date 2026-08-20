import { Module } from '@nestjs/common';
import { ConfirmationWorker } from './confirmation.worker';
import { IncomingScannerWorker } from './incoming-scanner.worker';
import { OutboxPublisherWorker } from './outbox-publisher.worker';

@Module({
  providers: [ConfirmationWorker, IncomingScannerWorker, OutboxPublisherWorker],
})
export class WorkersModule {}
