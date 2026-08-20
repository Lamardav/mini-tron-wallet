import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../core/amount.dart';
import '../core/api_client.dart';
import '../core/error_messages.dart';
import '../design/motion.dart';
import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/wallet_provider.dart';
import '../widgets/amount_text.dart';

const _addressLength = 34;
const _estimateDebounce = Duration(milliseconds: 450);

class SendScreen extends ConsumerStatefulWidget {
  const SendScreen({super.key});

  @override
  ConsumerState<SendScreen> createState() => _SendScreenState();
}

class _SendScreenState extends ConsumerState<SendScreen> {
  final _address = TextEditingController();
  final _amount = TextEditingController();

  String _idempotencyKey = const Uuid().v4();
  Timer? _debounce;
  FeeEstimate? _fee;
  String? _feeProblem;
  bool _estimating = false;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _address.addListener(_scheduleEstimate);
    _amount.addListener(_scheduleEstimate);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _address.dispose();
    _amount.dispose();
    super.dispose();
  }

  void _scheduleEstimate() {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(_estimateDebounce, _refreshEstimate);
  }

  Future<void> _refreshEstimate() async {
    final toAddress = _address.text.trim();
    final amountNano = trxToNano(_amount.text);

    if (toAddress.length != _addressLength || amountNano == null || amountNano == BigInt.zero) {
      if (mounted) {
        setState(() {
          _fee = null;
          _feeProblem = null;
          _estimating = false;
        });
      }

      return;
    }

    setState(() => _estimating = true);

    try {
      final fee = await ref
          .read(walletProvider.notifier)
          .estimate(toAddress: toAddress, amountNano: amountNano);

      if (mounted) {
        setState(() {
          _fee = fee;
          _feeProblem = null;
          _estimating = false;
        });
      }
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _fee = null;
          _feeProblem = humanizeError(error.message);
          _estimating = false;
        });
      }
    }
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
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(
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
            FadeIn(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
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
                  const SizedBox(height: 16),
                  AnimatedSize(
                    duration: baseDuration,
                    curve: enterCurve,
                    alignment: Alignment.topCenter,
                    child: _CostSummary(
                      amountNano: preview,
                      fee: _fee,
                      problem: _feeProblem,
                      estimating: _estimating,
                    ),
                  ),
                  const SizedBox(height: 20),
                  AnimatedSize(
                    duration: baseDuration,
                    curve: enterCurve,
                    child: _error == null
                        ? const SizedBox(width: double.infinity)
                        : Padding(
                            padding: const EdgeInsets.only(bottom: 16),
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
                  FilledButton(
                    onPressed: _sending ? null : _submit,
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
                          : const Text('Send', key: ValueKey<String>('idle')),
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

class _CostSummary extends StatelessWidget {
  const _CostSummary({
    required this.amountNano,
    required this.fee,
    required this.problem,
    required this.estimating,
  });

  final BigInt? amountNano;
  final FeeEstimate? fee;
  final String? problem;
  final bool estimating;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    if (amountNano == null) {
      return const SizedBox(width: double.infinity);
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.surface,
        border: Border.all(color: palette.border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CostRow(label: 'Recipient gets', amountNano: amountNano!),
          const SizedBox(height: 8),
          if (estimating)
            Text(
              'Estimating the network fee',
              style: TextStyle(
                fontFamily: sansFamily,
                fontSize: 13,
                color: palette.inkFaint,
              ),
            )
          else if (problem != null)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.error_outline, size: 15, color: palette.failed),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    problem!,
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 13,
                      height: 1.4,
                      color: palette.failed,
                    ),
                  ),
                ),
              ],
            )
          else if (fee == null)
            Text(
              'Enter a full recipient address to see the network fee',
              style: TextStyle(
                fontFamily: sansFamily,
                fontSize: 13,
                color: palette.inkFaint,
              ),
            )
          else ...[
            if (fee!.free)
              Row(
                children: [
                  Text(
                    'Network fee ',
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 13,
                      color: palette.inkMuted,
                    ),
                  ),
                  Text(
                    'free, covered by your daily bandwidth',
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: palette.confirmed,
                    ),
                  ),
                ],
              )
            else
              _CostRow(label: 'Network fee', amountNano: fee!.feeNano),
            const SizedBox(height: 8),
            Divider(color: palette.border, height: 1),
            const SizedBox(height: 8),
            _CostRow(label: 'Total charged', amountNano: fee!.totalNano, emphasised: true),
            if (!fee!.recipientActivated) ...[
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, size: 15, color: palette.pending),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'This address has never been used. TRON charges 1 TRX to activate it, and that is included above.',
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
            ],
          ],
        ],
      ),
    );
  }
}

class _CostRow extends StatelessWidget {
  const _CostRow({
    required this.label,
    required this.amountNano,
    this.emphasised = false,
  });

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
