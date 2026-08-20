import 'package:flutter/material.dart';

import '../core/amount.dart';
import '../design/palette.dart';
import '../design/theme.dart';

class AmountText extends StatelessWidget {
  const AmountText({
    super.key,
    required this.amountNano,
    this.fontSize = 16,
    this.prefix = '',
    this.color,
  });

  final BigInt amountNano;
  final double fontSize;
  final String prefix;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final formatted = nanoToTrx(amountNano);
    final settled = formatted.substring(0, formatted.length - 3);
    final belowSun = formatted.substring(formatted.length - 3);

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: '$prefix$settled'),
          TextSpan(
            text: belowSun,
            style: TextStyle(fontSize: fontSize * 0.68, color: palette.inkFaint),
          ),
          TextSpan(
            text: ' TRX',
            style: TextStyle(
              fontSize: fontSize * 0.6,
              color: palette.inkMuted,
              fontFamily: sansFamily,
            ),
          ),
        ],
      ),
      style: TextStyle(
        fontFamily: monoFamily,
        fontWeight: FontWeight.w500,
        fontSize: fontSize,
        color: color ?? palette.ink,
        height: 1.2,
      ),
    );
  }
}
