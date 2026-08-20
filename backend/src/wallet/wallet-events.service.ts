import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

const MAX_LISTENERS = 0;

@Injectable()
export class WalletEventsService {
  private readonly emitter = new EventEmitter();
  private readonly versions = new Map<string, number>();

  constructor() {
    this.emitter.setMaxListeners(MAX_LISTENERS);
  }

  versionFor(userId: string): number {
    return this.versions.get(userId) ?? 0;
  }

  bump(userId: string): void {
    const next = this.versionFor(userId) + 1;
    this.versions.set(userId, next);
    this.emitter.emit(userId, next);
  }

  waitForChange(userId: string, since: number, timeoutMs: number): Promise<number | null> {
    const current = this.versionFor(userId);

    if (current > since) {
      return Promise.resolve(current);
    }

    return new Promise((resolve) => {
      const finish = (version: number | null) => {
        clearTimeout(timer);
        this.emitter.removeListener(userId, onChange);
        resolve(version);
      };

      const onChange = (version: number) => finish(version);
      const timer = setTimeout(() => finish(null), timeoutMs);

      this.emitter.once(userId, onChange);
    });
  }
}
