import 'package:flutter_test/flutter_test.dart';
import 'package:mini_tron_wallet/core/amount.dart';

void main() {
  group('nanoToTrx', () {
    test('always renders nine decimal places', () {
      expect(nanoToTrx(BigInt.parse('2500000000')), '2.500000000');
      expect(nanoToTrx(BigInt.parse('123456000')), '0.123456000');
      expect(nanoToTrx(BigInt.zero), '0.000000000');
    });
  });

  group('formatSendable', () {
    test('drops the three digits the network cannot settle', () {
      expect(formatSendable(BigInt.parse('2500000000')), '2.500000');
      expect(formatSendable(BigInt.parse('123456000')), '0.123456');
    });

    test('produces a value trxToNano accepts back', () {
      final nano = BigInt.parse('7999800000');

      expect(trxToNano(formatSendable(nano)), nano);
    });
  });

  group('trxToNano', () {
    test('converts whole and fractional amounts', () {
      expect(trxToNano('2'), BigInt.parse('2000000000'));
      expect(trxToNano('2.5'), BigInt.parse('2500000000'));
      expect(trxToNano('0.123456'), BigInt.parse('123456000'));
    });

    test('rejects amounts the network cannot represent', () {
      expect(trxToNano('0.1234567'), isNull);
      expect(trxToNano('0.123456789'), isNull);
    });

    test('rejects malformed input', () {
      expect(trxToNano('abc'), isNull);
      expect(trxToNano('-1'), isNull);
      expect(trxToNano(''), isNull);
      expect(trxToNano('1,5'), isNull);
      expect(trxToNano('1.'), isNull);
    });

    test('round-trips through nanoToTrx', () {
      expect(nanoToTrx(trxToNano('987.654321')!), '987.654321000');
    });
  });
}
