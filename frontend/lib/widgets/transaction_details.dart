import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

import '../core/clipboard.dart';
import '../design/motion.dart';
import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import 'amount_text.dart';

const _explorerBase = 'https://nile.tronscan.org/#/transaction/';

Future<void> showTransactionDetails(BuildContext context, WalletTransaction transaction) {
  return showDialog<void>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.45),
    builder: (context) => TransactionDetails(transaction),
  );
}

class TransactionDetails extends StatelessWidget {
  const TransactionDetails(this.transaction, {super.key});

  final WalletTransaction transaction;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Dialog(
      backgroundColor: palette.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: palette.border),
      ),
      insetPadding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    transaction.incoming ? 'Received' : 'Sent',
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: palette.ink,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: palette.statusColor(transaction.status).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(4),
                    ),
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
                  const Spacer(),
                  IconButton(
                    tooltip: 'Close',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(Icons.close, size: 18, color: palette.inkMuted),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              AmountText(
                amountNano: transaction.amountNano,
                prefix: transaction.incoming ? '+ ' : '- ',
                fontSize: 26,
              ),
              const SizedBox(height: 22),
              _Row(
                label: transaction.incoming ? 'From' : 'To',
                child: _Copyable(text: transaction.address),
              ),
              _Row(
                label: transaction.incoming ? 'Network fee, paid by the sender' : 'Network fee',
                child: transaction.feeNano == null
                    ? _Muted(transaction.settled ? 'not reported' : 'known once confirmed')
                    : AmountText(amountNano: transaction.feeNano!, fontSize: 13),
              ),
              if (!transaction.incoming)
                _Row(
                  label: 'Total debited from your wallet',
                  child: transaction.feeNano == null
                      ? _Muted(
                          transaction.settled
                              ? 'the amount above, fee not reported'
                              : 'known once confirmed',
                        )
                      : AmountText(
                          amountNano: transaction.debitedNano,
                          fontSize: 15,
                          color: palette.ink,
                        ),
                ),
              _Row(
                label: 'Balance before',
                child: transaction.balanceBeforeNano == null
                    ? const _Muted('not recorded')
                    : AmountText(amountNano: transaction.balanceBeforeNano!, fontSize: 13),
              ),
              _Row(
                label: 'Balance after',
                child: transaction.balanceAfterNano == null
                    ? _Muted(transaction.settled ? 'not recorded' : 'known once confirmed')
                    : AmountText(amountNano: transaction.balanceAfterNano!, fontSize: 13),
              ),
              _Row(label: 'Date', child: _Plain(_formatDate(transaction.createdAt))),
              if (transaction.blockNumber != null)
                _Row(label: 'Block', child: _Plain(transaction.blockNumber!)),
              _Row(
                label: 'Transaction hash',
                child: transaction.txHash == null
                    ? const _Muted('not assigned yet')
                    : _Copyable(text: transaction.txHash!),
              ),
              if (transaction.txHash != null) ...[
                const SizedBox(height: 18),
                OutlinedButton.icon(
                  onPressed: () => _openExplorer(transaction.txHash!),
                  icon: const Icon(Icons.open_in_new, size: 16),
                  label: const Text('View on Tronscan'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _openExplorer(String hash) {
    web.window.open('$_explorerBase$hash', '_blank');
  }
}

String _formatDate(DateTime value) {
  String two(int number) => number.toString().padLeft(2, '0');

  return '${two(value.day)}.${two(value.month)}.${value.year} ${two(value.hour)}:${two(value.minute)}';
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontFamily: sansFamily,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: palette.inkMuted,
            ),
          ),
          const SizedBox(height: 4),
          child,
        ],
      ),
    );
  }
}

class _Plain extends StatelessWidget {
  const _Plain(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(fontFamily: monoFamily, fontSize: 13, color: context.palette.ink),
    );
  }
}

class _Muted extends StatelessWidget {
  const _Muted(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(fontFamily: sansFamily, fontSize: 13, color: context.palette.inkFaint),
    );
  }
}

class _Copyable extends StatefulWidget {
  const _Copyable({required this.text});

  final String text;

  @override
  State<_Copyable> createState() => _CopyableState();
}

class _CopyableState extends State<_Copyable> {
  bool _copied = false;

  Future<void> _copy() async {
    final copied = await copyToClipboard(widget.text);

    if (!mounted || !copied) {
      return;
    }

    setState(() => _copied = true);
    await Future<void>.delayed(const Duration(milliseconds: 1400));

    if (mounted) {
      setState(() => _copied = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: SelectableText(
            widget.text,
            style: TextStyle(fontFamily: monoFamily, fontSize: 13, color: palette.ink),
          ),
        ),
        const SizedBox(width: 8),
        MouseRegion(
          cursor: SystemMouseCursors.click,
          child: GestureDetector(
            onTap: _copy,
            behavior: HitTestBehavior.opaque,
            child: AnimatedSwitcher(
              duration: fastDuration,
              child: Icon(
                _copied ? Icons.check : Icons.copy,
                key: ValueKey<bool>(_copied),
                size: 15,
                color: _copied ? palette.confirmed : palette.inkMuted,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
