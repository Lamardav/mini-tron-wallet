const _messages = <String, String>{
  'EMAIL_TAKEN': 'That email is already registered',
  'INVALID_CREDENTIALS': 'Wrong email or password',
  'INVALID_ADDRESS': 'That is not a valid TRON address',
  'INVALID_AMOUNT_FORMAT': 'Enter the amount as a plain number',
  'ZERO_AMOUNT': 'Enter an amount greater than zero',
  'AMOUNT_NOT_REPRESENTABLE_ON_CHAIN':
      'The TRON network settles six decimal places, so this amount cannot be sent',
  'INSUFFICIENT_BALANCE': 'Your balance is too low for this transfer',
  'CANNOT_SEND_TO_SELF': 'This is your own address, choose a different recipient',
  'IDEMPOTENCY_KEY_REQUIRED': 'The request was missing its idempotency key',
};

String humanizeError(String raw) => _messages[raw] ?? raw;
