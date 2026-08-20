import { TronWeb } from 'tronweb';
import { config } from './config';
import { sleep } from './util';

const NANO_PER_SUN = 1000n;

function tronWeb(privateKey?: string): TronWeb {
  return new TronWeb({
    fullHost: `${config.chainstackEndpoint}/${config.chainstackApiKey}`,
    privateKey,
  });
}

export async function chainBalanceNano(address: string): Promise<bigint> {
  const sun = await tronWeb().trx.getBalance(address);

  return BigInt(sun) * NANO_PER_SUN;
}

export async function waitForChainConfirmation(txId: string, timeoutMs = 180_000) {
  const client = tronWeb();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const info = await client.trx.getTransactionInfo(txId);

    if (info && (info as { blockNumber?: number }).blockNumber !== undefined) {
      return info;
    }

    await sleep(3000);
  }

  throw new Error(`Transaction ${txId} was not confirmed within ${timeoutMs}ms`);
}

export async function fundWallet(to: string, amountNano: bigint): Promise<string> {
  if (!config.fundingPrivateKey) {
    throw new Error(
      'E2E_FUNDING_PRIVATE_KEY is empty. Fund the faucet wallet and put its private key in .env',
    );
  }

  const client = tronWeb(config.fundingPrivateKey);
  const receipt = await client.trx.sendTransaction(to, Number(amountNano / NANO_PER_SUN));

  if (!(receipt as { result?: boolean }).result) {
    throw new Error(`Funding transfer was rejected: ${JSON.stringify(receipt)}`);
  }

  const txId = (receipt as { transaction: { txID: string } }).transaction.txID;
  await waitForChainConfirmation(txId);

  return txId;
}
