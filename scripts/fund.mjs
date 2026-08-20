import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TronWeb } from 'tronweb';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readEnv() {
  const values = {};

  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());

    if (match) {
      values[match[1]] = match[2].replace(/^"|"$/g, '');
    }
  }

  return values;
}

const [recipient, amountTrx = '20'] = process.argv.slice(2);

if (!recipient) {
  console.error('usage: node scripts/fund.mjs <address> [amountTrx]');
  process.exit(1);
}

const env = readEnv();
const endpoint = env.CHAINSTACK_ENDPOINT.replace(/\/+$/, '');
const tronWeb = new TronWeb({
  fullHost: `${endpoint}/${env.CHAINSTACK_API_KEY}`,
  privateKey: env.E2E_FUNDING_PRIVATE_KEY,
});

if (!TronWeb.isAddress(recipient)) {
  console.error(`not a valid TRON address: ${recipient}`);
  process.exit(1);
}

const sun = Math.round(Number(amountTrx) * 1_000_000);
const sender = TronWeb.address.fromPrivateKey(env.E2E_FUNDING_PRIVATE_KEY);
const available = await tronWeb.trx.getBalance(sender);

console.log(`funding wallet ${sender} holds ${(available / 1e6).toFixed(6)} TRX`);

if (available < sun) {
  console.error('funding wallet does not hold enough TRX');
  process.exit(1);
}

const receipt = await tronWeb.trx.sendTransaction(recipient, sun);

if (!receipt.result) {
  console.error(`transfer rejected: ${JSON.stringify(receipt)}`);
  process.exit(1);
}

console.log(`sent ${amountTrx} TRX to ${recipient}`);
console.log(`tx: ${receipt.transaction.txID}`);
