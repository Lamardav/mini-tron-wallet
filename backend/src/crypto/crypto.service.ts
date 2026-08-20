import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const MASTER_KEY_PATTERN = /^[0-9a-f]{64}$/i;

@Injectable()
export class CryptoService {
  private readonly masterKey: Buffer;

  constructor(config: ConfigService) {
    const hex = config.getOrThrow<string>('WALLET_MASTER_KEY');

    if (!MASTER_KEY_PATTERN.test(hex)) {
      throw new Error('WALLET_MASTER_KEY must be 64 hexadecimal characters');
    }

    this.masterKey = Buffer.from(hex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return [iv, cipher.getAuthTag(), ciphertext]
      .map((part) => part.toString('base64'))
      .join('.');
  }

  decrypt(encrypted: string): string {
    const [iv, authTag, ciphertext] = encrypted
      .split('.')
      .map((part) => Buffer.from(part, 'base64'));

    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
