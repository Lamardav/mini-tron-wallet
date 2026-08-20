import { config } from './config';

export interface ApiResult<T = any> {
  status: number;
  data: T;
}

export interface TestUser {
  email: string;
  token: string;
  userId: string;
  address: string;
}

interface RequestOptions {
  token?: string;
  body?: object;
  headers?: Record<string, string>;
}

export async function api<T = any>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = response.status === 204 ? null : await response.json();

  return { status: response.status, data: data as T };
}

export async function registerUser(prefix: string): Promise<TestUser> {
  const email = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@e2e.test`;
  const result = await api('POST', '/auth/register', {
    body: { email, password: 'Password123!' },
  });

  if (result.status !== 201) {
    throw new Error(`Registration failed: ${result.status} ${JSON.stringify(result.data)}`);
  }

  return {
    email,
    token: result.data.token,
    userId: result.data.user.id,
    address: result.data.user.address,
  };
}

export async function transactionStatus(user: TestUser, id: string): Promise<string | undefined> {
  const history = await api('GET', '/wallet/transactions', { token: user.token });

  return history.data.items.find((transaction: { id: string }) => transaction.id === id)?.status;
}
