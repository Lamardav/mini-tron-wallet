import { Client } from 'pg';
import { config } from './config';

export async function withDatabase<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: config.databaseUrl });
  await client.connect();

  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export async function countRows(sql: string, params: unknown[]): Promise<number> {
  return withDatabase(async (client) => {
    const result = await client.query(sql, params);

    return Number(result.rows[0].count);
  });
}
