import { TronWeb } from 'tronweb';

const account = await TronWeb.createAccount();

console.log(`address:    ${account.address.base58}`);
console.log(`privateKey: ${account.privateKey}`);
