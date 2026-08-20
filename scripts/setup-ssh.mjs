import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'ssh2';

const host = process.argv[2];
const password = process.env.SSH_PASSWORD;

if (!host || !password) {
  console.error('usage: SSH_PASSWORD=... node setup-ssh.mjs <host>');
  process.exit(1);
}

const publicKey = readFileSync(join(homedir(), '.ssh', 'id_ed25519.pub'), 'utf8').trim();
const install = [
  'mkdir -p ~/.ssh',
  'chmod 700 ~/.ssh',
  `grep -qF '${publicKey}' ~/.ssh/authorized_keys 2>/dev/null || echo '${publicKey}' >> ~/.ssh/authorized_keys`,
  'chmod 600 ~/.ssh/authorized_keys',
].join(' && ');

const connection = new Client();

connection
  .on('ready', () => {
    connection.exec(install, (error, stream) => {
      if (error) {
        console.error(error.message);
        connection.end();
        process.exit(1);
      }
      stream
        .on('close', (code) => {
          console.log(code === 0 ? 'public key installed' : `install failed with code ${code}`);
          connection.end();
          process.exit(code === 0 ? 0 : 1);
        })
        .resume()
        .stderr.on('data', (chunk) => process.stderr.write(chunk));
    });
  })
  .on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username: 'root', password, readyTimeout: 20000 });
