export interface FeeInputs {
  transactionBytes: number;
  availableBandwidth: number;
  bandwidthPriceSun: bigint;
  accountActivationSun: bigint;
  recipientActivated: boolean;
}

export interface FeeBreakdownSun {
  bandwidthSun: bigint;
  activationSun: bigint;
  totalSun: bigint;
  coveredByBandwidth: boolean;
}

export function calculateFee(inputs: FeeInputs): FeeBreakdownSun {
  const activationSun = inputs.recipientActivated
    ? 0n
    : inputs.accountActivationSun;
  const coveredByBandwidth =
    inputs.recipientActivated &&
    inputs.availableBandwidth >= inputs.transactionBytes;

  const bandwidthSun = coveredByBandwidth
    ? 0n
    : BigInt(inputs.transactionBytes) * inputs.bandwidthPriceSun;

  return {
    bandwidthSun,
    activationSun,
    totalSun: bandwidthSun + activationSun,
    coveredByBandwidth,
  };
}
