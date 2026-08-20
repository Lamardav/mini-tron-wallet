import 'package:flutter/material.dart';

import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import 'amount_text.dart';

Future<bool> confirmTransfer(
  BuildContext context, {
  required String toAddress,
  required BigInt amountNano,
  required FeeEstimate fee,
}) async {
  final approved = await showDialog<bool>(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.45),
    builder: (context) => _Confirmation(toAddress: toAddress, amountNano: amountNano, fee: fee),
  );

  return approved ?? false;
}

class _Confirmation extends StatelessWidget {
  const _Confirmation({
    required this.toAddress,
    required this.amountNano,
    required this.fee,
  });

  final String toAddress;
  final BigInt amountNano;
  final FeeEstimate fee;

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
        constraints: const BoxConstraints(maxWidth: 420),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Confirm this transfer',
                style: TextStyle(
                  fontFamily: sansFamily,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: palette.ink,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'A TRON transfer cannot be reversed once it is broadcast.',
                style: TextStyle(fontFamily: sansFamily, fontSize: 13, color: palette.inkMuted),
              ),
              const SizedBox(height: 20),
              _Field(label: 'Recipient', value: toAddress),
              const SizedBox(height: 16),
              _Line(label: 'Recipient gets', amountNano: amountNano),
              const SizedBox(height: 8),
              _Line(label: 'Network fee', amountNano: fee.feeNano),
              const SizedBox(height: 10),
              Divider(color: palette.border, height: 1),
              const SizedBox(height: 10),
              _Line(
                label: 'Debited from your wallet',
                amountNano: fee.totalNano,
                emphasised: true,
              ),
              if (!fee.recipientActivated) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: palette.pending.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline, size: 16, color: palette.pending),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'This address has never received TRX. Check it carefully: the network charges 1 TRX to activate a new account, and that is already included above.',
                          style: TextStyle(
                            fontFamily: sansFamily,
                            fontSize: 12,
                            height: 1.45,
                            color: palette.pending,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).pop(true),
                      child: const Text('Confirm and send'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Column(
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
        SelectableText(
          value,
          style: TextStyle(fontFamily: monoFamily, fontSize: 13, color: palette.ink),
        ),
      ],
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.label, required this.amountNano, this.emphasised = false});

  final String label;
  final BigInt amountNano;
  final bool emphasised;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontFamily: sansFamily,
            fontSize: 13,
            fontWeight: emphasised ? FontWeight.w600 : FontWeight.w400,
            color: emphasised ? palette.ink : palette.inkMuted,
          ),
        ),
        AmountText(amountNano: amountNano, fontSize: emphasised ? 15 : 13),
      ],
    );
  }
}
