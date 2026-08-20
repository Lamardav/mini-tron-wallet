import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/amount.dart';
import '../core/api_client.dart';
import '../core/clipboard.dart';
import '../core/error_messages.dart';
import '../design/motion.dart';
import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import 'amount_text.dart';

const _faucetUrl = 'https://nile.tronscan.org';

class FaucetCard extends ConsumerStatefulWidget {
  const FaucetCard({super.key});

  @override
  ConsumerState<FaucetCard> createState() => _FaucetCardState();
}

class _FaucetCardState extends ConsumerState<FaucetCard> {
  final _amount = TextEditingController(text: '20');

  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  Future<void> _claim(BigInt maxClaimNano) async {
    final amountNano = trxToNano(_amount.text);

    if (amountNano == null || amountNano == BigInt.zero) {
      setState(() => _error = 'Enter an amount, for example 20');

      return;
    }

    if (amountNano > maxClaimNano) {
      setState(() => _error = 'One request may not exceed ${nanoToTrx(maxClaimNano)} TRX');

      return;
    }

    setState(() {
      _sending = true;
      _error = null;
    });

    try {
      await ref.read(walletProvider.notifier).claimFromFaucet(amountNano);

      if (!mounted) {
        return;
      }

      ref.invalidate(faucetProvider);
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(
          const SnackBar(
            content: Text('Test TRX sent, it arrives within a minute'),
            duration: Duration(seconds: 4),
          ),
        );
    } on ApiException catch (error) {
      setState(() => _error = humanizeError(error.message));
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final status = ref.watch(faucetProvider);

    return status.maybeWhen(
      data: (faucet) {
        if (!faucet.enabled) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: palette.surface,
            border: Border.all(color: palette.borderStrong, style: BorderStyle.solid),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.science_outlined, size: 16, color: palette.inkMuted),
                  const SizedBox(width: 8),
                  Text(
                    'TEST FAUCET',
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 12,
                      letterSpacing: 0.6,
                      fontWeight: FontWeight.w600,
                      color: palette.inkMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Sends test TRX to the wallet you are signed into. Nothing here is real money.',
                style: TextStyle(
                  fontFamily: sansFamily,
                  fontSize: 13,
                  height: 1.45,
                  color: palette.inkMuted,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Text(
                    'Left in the pool ',
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 13,
                      color: palette.inkMuted,
                    ),
                  ),
                  AmountText(amountNano: faucet.balanceNano!, fontSize: 14),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _amount,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: TextStyle(
                        fontFamily: monoFamily,
                        fontSize: 14,
                        color: palette.ink,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Amount, TRX',
                        hintText: '20',
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: _sending ? null : () => _claim(faucet.maxClaimNano!),
                    child: AnimatedSwitcher(
                      duration: fastDuration,
                      child: _sending
                          ? SizedBox(
                              key: const ValueKey<String>('sending'),
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: palette.page,
                              ),
                            )
                          : const Text('Top up', key: ValueKey<String>('idle')),
                    ),
                  ),
                ],
              ),
              AnimatedSize(
                duration: baseDuration,
                curve: enterCurve,
                child: _error == null
                    ? const SizedBox(width: double.infinity)
                    : Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          _error!,
                          style: TextStyle(
                            fontFamily: sansFamily,
                            fontSize: 13,
                            color: palette.failed,
                          ),
                        ),
                      ),
              ),
              const SizedBox(height: 18),
              Divider(color: palette.border, height: 1),
              const SizedBox(height: 14),
              Text(
                'Pool wallet',
                style: TextStyle(
                  fontFamily: sansFamily,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: palette.inkMuted,
                ),
              ),
              const SizedBox(height: 4),
              _PoolAddress(address: faucet.address!),
              const SizedBox(height: 8),
              Text(
                'When the pool runs dry, top this address up once a day from the Nile faucet at $_faucetUrl, section Tools.',
                style: TextStyle(
                  fontFamily: sansFamily,
                  fontSize: 12,
                  height: 1.45,
                  color: palette.inkFaint,
                ),
              ),
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _PoolAddress extends StatefulWidget {
  const _PoolAddress({required this.address});

  final String address;

  @override
  State<_PoolAddress> createState() => _PoolAddressState();
}

class _PoolAddressState extends State<_PoolAddress> {
  bool _copied = false;

  Future<void> _copy() async {
    final copied = await copyToClipboard(widget.address);

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
      children: [
        Expanded(
          child: SelectableText(
            widget.address,
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
