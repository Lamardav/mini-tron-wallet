import { calculateFee } from '../src/tron/fee';

const base = {
  transactionBytes: 270,
  availableBandwidth: 600,
  bandwidthPriceSun: 1000n,
  accountActivationSun: 1_000_000n,
  recipientActivated: true,
};

describe('calculateFee', () => {
  it('charges nothing when free bandwidth covers the transfer', () => {
    expect(calculateFee(base)).toEqual({
      bandwidthSun: 0n,
      activationSun: 0n,
      totalSun: 0n,
      coveredByBandwidth: true,
    });
  });

  it('charges for bandwidth once the free allowance runs out', () => {
    const fee = calculateFee({ ...base, availableBandwidth: 100 });

    expect(fee.bandwidthSun).toBe(270_000n);
    expect(fee.totalSun).toBe(270_000n);
    expect(fee.coveredByBandwidth).toBe(false);
  });

  it('adds the activation fee when the recipient has never been used', () => {
    const fee = calculateFee({ ...base, recipientActivated: false });

    expect(fee.activationSun).toBe(1_000_000n);
    expect(fee.bandwidthSun).toBe(270_000n);
    expect(fee.totalSun).toBe(1_270_000n);
  });

  it('never lets bandwidth cover the creation of a new account', () => {
    const fee = calculateFee({
      ...base,
      recipientActivated: false,
      availableBandwidth: 100_000,
    });

    expect(fee.coveredByBandwidth).toBe(false);
    expect(fee.totalSun).toBeGreaterThan(0n);
  });

  it('treats exactly sufficient bandwidth as covered', () => {
    expect(
      calculateFee({ ...base, availableBandwidth: 270 }).coveredByBandwidth,
    ).toBe(true);
    expect(
      calculateFee({ ...base, availableBandwidth: 269 }).coveredByBandwidth,
    ).toBe(false);
  });
});
