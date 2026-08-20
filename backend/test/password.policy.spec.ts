import {
  findPasswordProblem,
  MINIMUM_PASSWORD_LENGTH,
} from '../src/auth/password.policy';

const email = 'valentina@example.com';

describe('findPasswordProblem', () => {
  it('accepts a long unrelated passphrase', () => {
    expect(findPasswordProblem('rope harbour lantern', email)).toBeNull();
  });

  it('rejects anything shorter than the minimum', () => {
    expect(findPasswordProblem('12345678', email)).toBe('PASSWORD_TOO_SHORT');
    expect(
      findPasswordProblem('a'.repeat(MINIMUM_PASSWORD_LENGTH - 1), email),
    ).toBe('PASSWORD_TOO_SHORT');
  });

  it('rejects well known passwords regardless of case', () => {
    expect(findPasswordProblem('Password1234', email)).toBe(
      'PASSWORD_TOO_COMMON',
    );
  });

  it('rejects a single repeated character', () => {
    expect(findPasswordProblem('aaaaaaaaaaaaaa', email)).toBe(
      'PASSWORD_TOO_SIMPLE',
    );
  });

  it('rejects long digit runs', () => {
    expect(findPasswordProblem('123456789012345', email)).toBe(
      'PASSWORD_TOO_SIMPLE',
    );
  });

  it('rejects a password built from the email address', () => {
    expect(findPasswordProblem('valentina-wallet', email)).toBe(
      'PASSWORD_CONTAINS_EMAIL',
    );
  });

  it('ignores very short email local parts when matching', () => {
    expect(
      findPasswordProblem('ann harbour lantern', 'ann@example.com'),
    ).toBeNull();
  });
});
