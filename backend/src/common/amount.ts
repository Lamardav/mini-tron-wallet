export const NANO_PER_TRX = 1_000_000_000n;
export const NANO_PER_SUN = 1_000n;

const TRX_PATTERN = /^(\d+)(?:\.(\d{1,9}))?$/;
const NANO_PATTERN = /^\d{1,19}$/;

export class AmountError extends Error {}

export function trxToNano(value: string): bigint {
  const match = TRX_PATTERN.exec(value);

  if (!match) {
    throw new AmountError('INVALID_AMOUNT_FORMAT');
  }

  const whole = BigInt(match[1]) * NANO_PER_TRX;
  const fraction = BigInt((match[2] ?? '0').padEnd(9, '0'));

  return whole + fraction;
}

export function nanoToTrx(nano: bigint): string {
  if (nano < 0n) {
    throw new AmountError('INVALID_AMOUNT_FORMAT');
  }

  const fraction = (nano % NANO_PER_TRX).toString().padStart(9, '0');

  return `${nano / NANO_PER_TRX}.${fraction}`;
}

export function nanoToSun(nano: bigint): bigint {
  if (nano % NANO_PER_SUN !== 0n) {
    throw new AmountError('AMOUNT_NOT_REPRESENTABLE_ON_CHAIN');
  }

  return nano / NANO_PER_SUN;
}

export function sunToNano(sun: bigint): bigint {
  return sun * NANO_PER_SUN;
}

export function parseAmountNano(raw: string): bigint {
  if (!NANO_PATTERN.test(raw)) {
    throw new AmountError('INVALID_AMOUNT_FORMAT');
  }

  const nano = BigInt(raw);

  if (nano === 0n) {
    throw new AmountError('ZERO_AMOUNT');
  }

  if (nano % NANO_PER_SUN !== 0n) {
    throw new AmountError('AMOUNT_NOT_REPRESENTABLE_ON_CHAIN');
  }

  return nano;
}
