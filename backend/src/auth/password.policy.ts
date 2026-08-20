export const MINIMUM_PASSWORD_LENGTH = 12;

const COMMON_PASSWORDS = new Set([
  '123456789012',
  'password1234',
  'qwertyuiop12',
  'administrator',
  'letmein12345',
  'welcome12345',
  'passw0rd1234',
  'iloveyou1234',
  'trustno1trustno1',
  'monkey123456',
]);

const REPEATED_CHARACTER = /^(.)\1+$/;
const SEQUENTIAL_DIGITS = /(012|123|234|345|456|567|678|789|890){3,}/;

export type PasswordProblem =
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_COMMON'
  | 'PASSWORD_TOO_SIMPLE'
  | 'PASSWORD_CONTAINS_EMAIL';

export function findPasswordProblem(
  password: string,
  email: string,
): PasswordProblem | null {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return 'PASSWORD_TOO_SHORT';
  }

  const normalised = password.toLowerCase();

  if (COMMON_PASSWORDS.has(normalised)) {
    return 'PASSWORD_TOO_COMMON';
  }

  if (REPEATED_CHARACTER.test(password) || SEQUENTIAL_DIGITS.test(password)) {
    return 'PASSWORD_TOO_SIMPLE';
  }

  const localPart = email.split('@')[0]?.toLowerCase() ?? '';

  if (localPart.length >= 4 && normalised.includes(localPart)) {
    return 'PASSWORD_CONTAINS_EMAIL';
  }

  return null;
}
