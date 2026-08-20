import 'package:flutter/material.dart';

import '../design/motion.dart';
import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import 'amount_text.dart';
import 'transaction_details.dart';

class TransactionTile extends StatefulWidget {
  const TransactionTile(this.transaction, {super.key});

  final WalletTransaction transaction;

  @override
  State<TransactionTile> createState() => _TransactionTileState();
}

class _TransactionTileState extends State<TransactionTile> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final transaction = widget.transaction;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: () => showTransactionDetails(context, transaction),
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: fastDuration,
          curve: enterCurve,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            color: _hovered ? palette.page : Colors.transparent,
            border: Border(bottom: BorderSide(color: palette.border)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AmountText(
                      amountNano: transaction.amountNano,
                      prefix: transaction.incoming ? '+ ' : '- ',
                      fontSize: 15,
                    ),
                    if (transaction.chargedFee) ...[
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Text(
                            'fee ',
                            style: TextStyle(
                              fontFamily: sansFamily,
                              fontSize: 11,
                              color: palette.inkMuted,
                            ),
                          ),
                          AmountText(
                            amountNano: transaction.feeNano!,
                            fontSize: 11,
                            color: palette.inkMuted,
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      transaction.address,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: monoFamily,
                        fontSize: 12,
                        color: palette.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: AnimatedDefaultTextStyle(
                  duration: baseDuration,
                  curve: enterCurve,
                  style: TextStyle(
                    fontFamily: sansFamily,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: palette.statusColor(transaction.status),
                  ),
                  child: AnimatedSwitcher(
                    duration: baseDuration,
                    switchInCurve: enterCurve,
                    child: Text(transaction.status, key: ValueKey<String>(transaction.status)),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              AnimatedOpacity(
                duration: fastDuration,
                opacity: _hovered ? 1 : 0,
                child: Icon(Icons.chevron_right, size: 16, color: palette.inkMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
