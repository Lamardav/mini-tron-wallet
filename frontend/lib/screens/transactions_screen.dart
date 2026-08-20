import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/download.dart';
import '../design/motion.dart';
import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import '../widgets/skeleton.dart';
import '../widgets/transaction_tile.dart';

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  bool _exporting = false;

  Future<void> _export() async {
    setState(() => _exporting = true);

    try {
      final csv = await ref.read(walletProvider.notifier).statementCsv();
      downloadTextFile('tron-wallet-statement.csv', csv, 'text/csv;charset=utf-8');
    } finally {
      if (mounted) {
        setState(() => _exporting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final wallet = ref.watch(walletProvider);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          children: [
            FadeIn(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
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
                      const Spacer(),
                      OutlinedButton.icon(
                        onPressed: wallet.transactions.isEmpty || _exporting ? null : _export,
                        icon: const Icon(Icons.download_outlined, size: 16),
                        label: Text(_exporting ? 'Preparing' : 'Statement, CSV'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  AnimatedSize(
                    duration: baseDuration,
                    curve: enterCurve,
                    alignment: Alignment.topCenter,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (wallet.loading && wallet.transactions.isEmpty)
                          const Column(
                            children: [
                              TransactionSkeleton(),
                              TransactionSkeleton(),
                              TransactionSkeleton(),
                              TransactionSkeleton(),
                            ],
                          )
                        else if (wallet.transactions.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: Text(
                              'No transactions yet',
                              style: TextStyle(
                                fontFamily: sansFamily,
                                fontSize: 14,
                                color: palette.inkMuted,
                              ),
                            ),
                          )
                        else ...[
                          for (final transaction in wallet.transactions)
                            TransactionTile(transaction),
                          if (wallet.hasMore) ...[
                            const SizedBox(height: 12),
                            OutlinedButton(
                              onPressed: wallet.loadingMore
                                  ? null
                                  : () => ref.read(walletProvider.notifier).loadMore(),
                              child: Text(wallet.loadingMore ? 'Loading' : 'Load older'),
                            ),
                          ],
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
