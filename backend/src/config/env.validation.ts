const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'WALLET_MASTER_KEY',
  'CHAINSTACK_ENDPOINT',
  'CHAINSTACK_API_KEY',
];

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return config;
}
