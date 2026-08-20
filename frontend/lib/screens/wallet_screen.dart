import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import '../widgets/amount_text.dart';
import '../widgets/transaction_tile.dart';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = context.palette;
    final wallet = ref.watch(walletProvider);
    final recent = wallet.transactions.take(5).toList();

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: palette.surface,
                border: Border.all(color: palette.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Label('Balance'),
                  const SizedBox(height: 6),
                  if (wallet.balanceNano == null)
                    Text(
                      'Loading',
                      style: TextStyle(fontFamily: monoFamily, color: palette.inkFaint),
                    )
                  else
                    AmountText(amountNano: wallet.balanceNano!, fontSize: 30),
                  const SizedBox(height: 24),
                  _Label('Address'),
                  const SizedBox(height: 6),
                  SelectableText(
                    wallet.address ?? '',
                    style: TextStyle(
                      fontFamily: monoFamily,
                      fontSize: 14,
                      color: palette.ink,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: wallet.address == null
                              ? null
                              : () => _copyAddress(context, wallet.address!),
                          child: const Text('COPY'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: () => context.go('/send'),
                          child: const Text('SEND'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'Recent transactions',
              style: TextStyle(
                fontFamily: sansFamily,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: palette.ink,
              ),
            ),
            const SizedBox(height: 4),
            if (wallet.loading && recent.isEmpty)
              _Hint('Loading')
            else if (recent.isEmpty)
              _Hint('Nothing here yet. Fund this address from the Nile faucet to get started.')
            else ...[
              for (final transaction in recent) TransactionTile(transaction),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () => context.go('/transactions'),
                  child: const Text('See all transactions'),
                ),
              ),
            ],
            if (wallet.error != null) ...[
              const SizedBox(height: 16),
              Text(
                wallet.error!,
                style: TextStyle(fontFamily: sansFamily, fontSize: 13, color: palette.failed),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _copyAddress(BuildContext context, String address) async {
    await Clipboard.setData(ClipboardData(text: address));

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Address copied'), duration: Duration(seconds: 2)),
      );
    }
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontFamily: sansFamily,
        fontSize: 12,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.3,
        color: context.palette.inkMuted,
      ),
    );
  }
}

class _Hint extends StatelessWidget {
  const _Hint(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Text(
        text,
        style: TextStyle(
          fontFamily: sansFamily,
          fontSize: 14,
          color: context.palette.inkMuted,
        ),
      ),
    );
  }
}
