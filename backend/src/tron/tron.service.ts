import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TronWeb } from 'tronweb';
import { nanoToSun, sunToNano } from '../common/amount';
import { ConfirmationStatus, parseBlockTransfers, resolveConfirmationStatus } from './tron.parse';

export type { ConfirmationStatus };

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
  private readonly tronWeb: TronWeb;

  constructor(config: ConfigService) {
    const endpoint = config.getOrThrow<string>('CHAINSTACK_ENDPOINT').replace(/\/+$/, '');
    const apiKey = config.getOrThrow<string>('CHAINSTACK_API_KEY');

    this.tronWeb = new TronWeb({ fullHost: `${endpoint}/${apiKey}` });
  }

  isValidAddress(address: string): boolean {
    return TronWeb.isAddress(address);
  }

  async createAccount(): Promise<{ address: string; privateKey: string }> {
    const account = await TronWeb.createAccount();

    return { address: account.address.base58, privateKey: account.privateKey };
  }

  async getBalanceNano(address: string): Promise<bigint> {
    const sun = await this.tronWeb.trx.getBalance(address);

    return sunToNano(BigInt(sun));
  }

  async buildSignedTransfer(
    from: string,
    to: string,
    amountNano: bigint,
    privateKey: string,
  ): Promise<SignedTransfer> {
    const transaction = await this.tronWeb.transactionBuilder.sendTrx(
      to,
      Number(nanoToSun(amountNano)),
      from,
    );
    const signed = await this.tronWeb.trx.sign(transaction, privateKey);

    return { txHash: signed.txID, signed };
  }

  async broadcast(signed: object): Promise<void> {
    const result = await this.tronWeb.trx.sendRawTransaction(signed as never);

    if (result.result !== true && result.code !== 'DUP_TRANSACTION_ERROR') {
      throw new Error(`BROADCAST_FAILED: ${result.code ?? 'unknown reason'}`);
    }
  }

  async getConfirmation(txHash: string): Promise<ConfirmationStatus> {
    return resolveConfirmationStatus(await this.tronWeb.trx.getTransactionInfo(txHash));
  }

  async getLatestBlockNumber(): Promise<bigint> {
    const block = await this.tronWeb.trx.getCurrentBlock();

    return BigInt(block.block_header.raw_data.number);
  }

  async getBlockTransfers(blockNumber: bigint): Promise<IncomingTransfer[]> {
    const block = await this.tronWeb.trx.getBlock(Number(blockNumber));

    return parseBlockTransfers(block).map((transfer) => ({
      txHash: transfer.txHash,
      from: TronWeb.address.fromHex(transfer.fromHex),
      to: TronWeb.address.fromHex(transfer.toHex),
      amountNano: sunToNano(transfer.amountSun),
    }));
  }
}
