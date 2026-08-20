import * as dotenv from 'dotenv';
import * as path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  apiUrl: process.env.E2E_API_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  fundingPrivateKey: process.env.E2E_FUNDING_PRIVATE_KEY ?? '',
  chainstackEndpoint: (process.env.CHAINSTACK_ENDPOINT ?? '').replace(/\/+$/, ''),
  chainstackApiKey: process.env.CHAINSTACK_API_KEY ?? '',
  restartCommand: process.env.E2E_RESTART_CMD ?? '',
};

export const AMOUNT_NANO = 123_456_000n;
export const FUNDING_NANO = 20_000_000_000n;
export const MAX_FEE_NANO = 5_000_000_000n;
