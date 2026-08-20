import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../core/amount.dart';
import '../core/api_client.dart';
import '../core/error_messages.dart';
import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import '../widgets/amount_text.dart';

class SendScreen extends ConsumerStatefulWidget {
  const SendScreen({super.key});

  @override
  ConsumerState<SendScreen> createState() => _SendScreenState();
}

class _SendScreenState extends ConsumerState<SendScreen> {
  final _address = TextEditingController();
  final _amount = TextEditingController();

  String _idempotencyKey = const Uuid().v4();
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _amount.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _address.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final toAddress = _address.text.trim();
    final amountNano = trxToNano(_amount.text);

    if (toAddress.isEmpty) {
      setState(() => _error = 'Enter the recipient address');

      return;
    }

    if (amountNano == null || amountNano == BigInt.zero) {
      setState(
        () => _error = 'Enter an amount with at most six decimal places, for example 0.123456',
      );

      return;
    }

    setState(() {
      _sending = true;
      _error = null;
    });

    try {
      await ref.read(walletProvider.notifier).send(
            toAddress: toAddress,
            amountNano: amountNano,
            idempotencyKey: _idempotencyKey,
          );

      if (!mounted) {
        return;
      }

      _idempotencyKey = const Uuid().v4();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Transfer submitted'), duration: Duration(seconds: 3)),
      );
      context.go('/wallet');
    } on ApiException catch (error) {
      setState(() {
        _sending = false;
        _error = humanizeError(error.message);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final wallet = ref.watch(walletProvider);
    final preview = trxToNano(_amount.text);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          children: [
            Text(
              'Send TRX',
              style: TextStyle(
                fontFamily: sansFamily,
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: palette.ink,
              ),
            ),
            const SizedBox(height: 6),
            if (wallet.balanceNano != null)
              Row(
                children: [
                  Text(
                    'Available ',
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 13,
                      color: palette.inkMuted,
                    ),
                  ),
                  AmountText(amountNano: wallet.balanceNano!, fontSize: 13),
                ],
              ),
            const SizedBox(height: 26),
            TextField(
              controller: _address,
              style: TextStyle(fontFamily: monoFamily, fontSize: 14, color: palette.ink),
              decoration: const InputDecoration(
                labelText: 'Recipient address',
                hintText: 'T...',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _amount,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onSubmitted: (_) => _submit(),
              style: TextStyle(fontFamily: monoFamily, fontSize: 14, color: palette.ink),
              decoration: const InputDecoration(
                labelText: 'Amount, TRX',
                hintText: '0.123456',
              ),
            ),
            const SizedBox(height: 10),
            if (preview != null)
              Row(
                children: [
                  Text(
                    'Sends exactly ',
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 13,
                      color: palette.inkMuted,
                    ),
                  ),
                  AmountText(amountNano: preview, fontSize: 13),
                ],
              ),
            const SizedBox(height: 20),
            if (_error != null) ...[
              Text(
                _error!,
                style: TextStyle(fontFamily: sansFamily, fontSize: 13, color: palette.failed),
              ),
              const SizedBox(height: 16),
            ],
            FilledButton(
              onPressed: _sending ? null : _submit,
              child: _sending
                  ? SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: palette.page),
                    )
                  : const Text('Send'),
            ),
          ],
        ),
      ),
    );
  }
}
