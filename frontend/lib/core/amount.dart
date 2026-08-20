final BigInt _nanoPerTrx = BigInt.from(1000000000);

final RegExp _trxPattern = RegExp(r'^(\d+)(?:\.(\d{1,6}))?$');

String nanoToTrx(BigInt nano) {
  final whole = nano ~/ _nanoPerTrx;
  final fraction = (nano % _nanoPerTrx).toString().padLeft(9, '0');

  return '$whole.$fraction';
}

String formatSendable(BigInt nano) {
  final full = nanoToTrx(nano);

  return full.substring(0, full.length - 3);
}

BigInt? trxToNano(String input) {
  final match = _trxPattern.firstMatch(input.trim());

  if (match == null) {
    return null;
  }

  final whole = BigInt.parse(match.group(1)!) * _nanoPerTrx;
  final digits = match.group(2);
  final fraction = digits == null ? BigInt.zero : BigInt.parse(digits.padRight(9, '0'));

  return whole + fraction;
}
