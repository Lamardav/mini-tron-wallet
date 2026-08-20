import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { providers, TronWeb } from 'tronweb';
import { nanoToSun, sunToNano } from '../common/amount';
import { calculateFee } from './fee';
import { isTransientRpcError } from './retry';
import {
  ConfirmationStatus,
  parseBlockTransfers,
  resolveConfirmationStatus,
} from './tron.parse';

export type { ConfirmationStatus };

const SIGNATURE_OVERHEAD_BYTES = 67;
const DEFAULT_BANDWIDTH_PRICE_SUN = 1000n;
const DEFAULT_ACTIVATION_SUN = 1_000_000n;
const RPC_TIMEOUT_MS = 8000;
const READ_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 300;

type RpcProvider = InstanceType<typeof providers.HttpProvider>;

export interface ConfirmationReport {
  status: ConfirmationStatus;
  feeNano: bigint | null;
  blockNumber: bigint | null;
}

export interface FeeEstimate {
  bandwidthNano: bigint;
  activationNano: bigint;
  totalNano: bigint;
  coveredByBandwidth: boolean;
  recipientActivated: boolean;
}

export interface PreparedTransfer {
  transaction: object;
  fee: FeeEstimate;
}

export interface SignedTransfer {
  txHash: string;
  signed: object;
}

export interface IncomingTransfer {
  txHash: string;
  from: string;
  to: string;
  amountNano: bigint;
}

@Injectable()
export class TronService {
  private readonly logger = new Logger(TronService.name);
  private readonly tronWeb: TronWeb;
  private readonly fullHost: string;

  constructor(config: ConfigService) {
    const endpoint = config
      .getOrThrow<string>('CHAINSTACK_ENDPOINT')
      .replace(/\/+$/, '');
    const apiKey = config.getOrThrow<string>('CHAINSTACK_API_KEY');

    this.fullHost = `${endpoint}/${apiKey}`;
    this.tronWeb = new TronWeb({ fullHost: this.provider() });
  }

  private provider(): RpcProvider {
    return new providers.HttpProvider(this.fullHost, RPC_TIMEOUT_MS);
  }

  private async read<T>(label: string, call: () => Promise<T>): Promise<T> {
    let attempt = 1;

    for (;;) {
      try {
        return await call();
      } catch (error) {
        if (attempt === READ_ATTEMPTS || !isTransientRpcError(error)) {
          throw error;
        }

        this.logger.warn(
          `${label} did not answer on attempt ${attempt}, retrying`,
        );

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_BACKOFF_MS * attempt),
        );
        attempt += 1;
      }
    }
  }

  isValidAddress(address: string): boolean {
    return TronWeb.isAddress(address);
  }

  async createAccount(): Promise<{ address: string; privateKey: string }> {
    const account = await TronWeb.createAccount();

    return { address: account.address.base58, privateKey: account.privateKey };
  }

  async getBalanceNano(address: string): Promise<bigint> {
    const sun = await this.read('getBalance', () =>
      this.tronWeb.trx.getBalance(address),
    );

    return sunToNano(BigInt(sun));
  }

  addressForPrivateKey(privateKey: string): string {
    return TronWeb.address.fromPrivateKey(privateKey) as string;
  }

  async sendFromPrivateKey(
    privateKey: string,
    toAddress: string,
    amountNano: bigint,
  ): Promise<string> {
    const sender = new TronWeb({
      fullHost: this.provider(),
      privateKey,
    });

    const receipt = await sender.trx.sendTransaction(
      toAddress,
      Number(nanoToSun(amountNano)),
    );

    if (!receipt.result) {
      throw new Error('FAUCET_TRANSFER_REJECTED');
    }

    return receipt.transaction.txID;
  }

  async prepareTransfer(
    from: string,
    to: string,
    amountNano: bigint,
  ): Promise<PreparedTransfer> {
    const [transaction, resources, parameters, recipient] = await Promise.all([
      this.read('sendTrx', () =>
        this.tronWeb.transactionBuilder.sendTrx(
          to,
          Number(nanoToSun(amountNano)),
          from,
        ),
      ),
      this.read('getAccountResources', () =>
        this.tronWeb.trx.getAccountResources(from),
      ),
      this.read('getChainParameters', () =>
        this.tronWeb.trx.getChainParameters(),
      ),
      this.read('getAccount', () => this.tronWeb.trx.getAccount(to)),
    ]);

    const rawDataHex =
      (transaction as { raw_data_hex?: string }).raw_data_hex ?? '';
    const free = (resources.freeNetLimit ?? 0) - (resources.freeNetUsed ?? 0);
    const staked = (resources.NetLimit ?? 0) - (resources.NetUsed ?? 0);
    const recipientActivated = Object.keys(recipient ?? {}).length > 0;

    const fee = calculateFee({
      transactionBytes: rawDataHex.length / 2 + SIGNATURE_OVERHEAD_BYTES,
      availableBandwidth: free + staked,
      bandwidthPriceSun: this.readParameter(
        parameters,
        'getTransactionFee',
        DEFAULT_BANDWIDTH_PRICE_SUN,
      ),
      accountActivationSun: this.readParameter(
        parameters,
        'getCreateNewAccountFeeInSystemContract',
        DEFAULT_ACTIVATION_SUN,
      ),
      recipientActivated,
    });

    return {
      transaction,
      fee: {
        bandwidthNano: sunToNano(fee.bandwidthSun),
        activationNano: sunToNano(fee.activationSun),
        totalNano: sunToNano(fee.totalSun),
        coveredByBandwidth: fee.coveredByBandwidth,
        recipientActivated,
      },
    };
  }

  async signTransfer(
    transaction: object,
    privateKey: string,
  ): Promise<SignedTransfer> {
    const signed = (await this.tronWeb.trx.sign(
      transaction as never,
      privateKey,
    )) as {
      txID: string;
    };

    return { txHash: signed.txID, signed };
  }

  private readParameter(
    parameters: Array<{ key: string; value: number }>,
    key: string,
    fallback: bigint,
  ): bigint {
    const found = parameters.find((parameter) => parameter.key === key);

    return found ? BigInt(found.value) : fallback;
  }

  async broadcast(signed: object): Promise<void> {
    const result = await this.tronWeb.trx.sendRawTransaction(signed as never);

    if (result.result !== true && result.code !== 'DUP_TRANSACTION_ERROR') {
      throw new Error(`BROADCAST_FAILED: ${result.code ?? 'unknown reason'}`);
    }
  }

  async getConfirmation(txHash: string): Promise<ConfirmationReport> {
    const info = await this.read('getTransactionInfo', () =>
      this.tronWeb.trx.getTransactionInfo(txHash),
    );
    const record = info as { fee?: number; blockNumber?: number } | null;

    return {
      status: resolveConfirmationStatus(info),
      feeNano: record?.fee === undefined ? null : sunToNano(BigInt(record.fee)),
      blockNumber:
        record?.blockNumber === undefined ? null : BigInt(record.blockNumber),
    };
  }

  async getLatestBlockNumber(): Promise<bigint> {
    const block = await this.read('getCurrentBlock', () =>
      this.tronWeb.trx.getCurrentBlock(),
    );

    return BigInt(block.block_header.raw_data.number);
  }

  async getBlockTransfers(blockNumber: bigint): Promise<IncomingTransfer[]> {
    const block = await this.read('getBlock', () =>
      this.tronWeb.trx.getBlock(Number(blockNumber)),
    );

    return parseBlockTransfers(block).map((transfer) => ({
      txHash: transfer.txHash,
      from: TronWeb.address.fromHex(transfer.fromHex),
      to: TronWeb.address.fromHex(transfer.toHex),
      amountNano: sunToNano(transfer.amountSun),
    }));
  }
}
