import 'package:flutter/material.dart';

import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import 'amount_text.dart';

class TransactionTile extends StatelessWidget {
  const TransactionTile(this.transaction, {super.key});

  final WalletTransaction transaction;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
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
                  prefix: transaction.incoming ? '+ ' : '− ',
                  fontSize: 15,
                ),
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
            child: Text(
              transaction.status,
              style: TextStyle(
                fontFamily: sansFamily,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: palette.statusColor(transaction.status),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
