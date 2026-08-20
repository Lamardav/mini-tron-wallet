import {
  AmountError,
  nanoToSun,
  nanoToTrx,
  parseAmountNano,
  sunToNano,
  trxToNano,
} from '../src/common/amount';

describe('trxToNano', () => {
  it('converts whole TRX', () => {
    expect(trxToNano('2')).toBe(2_000_000_000n);
  });

  it('converts nine decimal places', () => {
    expect(trxToNano('0.123456789')).toBe(123_456_789n);
  });

  it('pads a short fractional part', () => {
    expect(trxToNano('2.5')).toBe(2_500_000_000n);
    expect(trxToNano('0.123456')).toBe(123_456_000n);
  });

  it('rejects malformed input', () => {
    for (const value of ['', 'abc', '-1', '1,5', '1.1234567890', '.5', '1.']) {
      expect(() => trxToNano(value)).toThrow(AmountError);
    }
  });
});

describe('nanoToTrx', () => {
  it('always renders nine decimal places', () => {
    expect(nanoToTrx(2_500_000_000n)).toBe('2.500000000');
    expect(nanoToTrx(123_456_789n)).toBe('0.123456789');
    expect(nanoToTrx(0n)).toBe('0.000000000');
  });

  it('round-trips through trxToNano', () => {
    expect(trxToNano(nanoToTrx(987_654_321_000n))).toBe(987_654_321_000n);
  });
});

describe('nanoToSun and sunToNano', () => {
  it('scales by one thousand in both directions', () => {
    expect(nanoToSun(123_456_000n)).toBe(123_456n);
    expect(sunToNano(123_456n)).toBe(123_456_000n);
  });

  it('rejects amounts the network cannot represent', () => {
    expect(() => nanoToSun(123_456_789n)).toThrow(
      'AMOUNT_NOT_REPRESENTABLE_ON_CHAIN',
    );
  });
});

describe('parseAmountNano', () => {
  it('accepts a valid integer string', () => {
    expect(parseAmountNano('123456000')).toBe(123_456_000n);
  });

  it('rejects zero', () => {
    expect(() => parseAmountNano('0')).toThrow('ZERO_AMOUNT');
  });

  it('rejects non-integer input', () => {
    for (const value of ['', '-5', '1.5', '10e3', 'NaN', ' 100']) {
      expect(() => parseAmountNano(value)).toThrow('INVALID_AMOUNT_FORMAT');
    }
  });

  it('rejects amounts finer than one SUN', () => {
    expect(() => parseAmountNano('123456789')).toThrow(
      'AMOUNT_NOT_REPRESENTABLE_ON_CHAIN',
    );
  });
});
