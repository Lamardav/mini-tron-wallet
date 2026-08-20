import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import '../widgets/transaction_tile.dart';

class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = context.palette;
    final wallet = ref.watch(walletProvider);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          children: [
            Text(
              'Transactions',
              style: TextStyle(
                fontFamily: sansFamily,
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: palette.ink,
              ),
            ),
            const SizedBox(height: 16),
            if (wallet.transactions.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  wallet.loading ? 'Loading' : 'No transactions yet',
                  style: TextStyle(
                    fontFamily: sansFamily,
                    fontSize: 14,
                    color: palette.inkMuted,
                  ),
                ),
              )
            else
              for (final transaction in wallet.transactions) TransactionTile(transaction),
          ],
        ),
      ),
    );
  }
}
