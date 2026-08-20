import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../src/crypto/crypto.service';

function makeService(masterKey = 'a'.repeat(64)): CryptoService {
  const config = { getOrThrow: () => masterKey } as unknown as ConfigService;

  return new CryptoService(config);
}

describe('CryptoService', () => {
  it('decrypts what it encrypted', () => {
    const service = makeService();
    const privateKey = '0'.repeat(63) + '1';

    expect(service.decrypt(service.encrypt(privateKey))).toBe(privateKey);
  });

  it('produces a different ciphertext for the same input', () => {
    const service = makeService();

    expect(service.encrypt('same input')).not.toBe(service.encrypt('same input'));
  });

  it('never leaves the plaintext visible in the ciphertext', () => {
    const service = makeService();

    expect(service.encrypt('secret')).not.toContain('secret');
  });

  it('rejects a tampered ciphertext', () => {
    const service = makeService();
    const [iv, tag, data] = service.encrypt('secret').split('.');
    const tampered = Buffer.from(data, 'base64');
    tampered[0] ^= 0xff;

    expect(() => service.decrypt([iv, tag, tampered.toString('base64')].join('.'))).toThrow();
  });

  it('rejects a ciphertext produced with another master key', () => {
    const encrypted = makeService('a'.repeat(64)).encrypt('secret');

    expect(() => makeService('b'.repeat(64)).decrypt(encrypted)).toThrow();
  });

  it('refuses to start with an invalid master key', () => {
    expect(() => makeService('too-short')).toThrow('WALLET_MASTER_KEY');
  });
});
