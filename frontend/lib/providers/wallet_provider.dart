import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/error_messages.dart';
import 'auth_provider.dart';

const pollInterval = Duration(seconds: 5);

class WalletTransaction {
  const WalletTransaction({
    required this.id,
    required this.direction,
    required this.amountNano,
    required this.address,
    required this.status,
    required this.txHash,
  });

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: json['id'] as String,
      direction: json['direction'] as String,
      amountNano: BigInt.parse(json['amountNano'] as String),
      address: json['address'] as String,
      status: json['status'] as String,
      txHash: json['txHash'] as String?,
    );
  }

  final String id;
  final String direction;
  final BigInt amountNano;
  final String address;
  final String status;
  final String? txHash;

  bool get incoming => direction == 'incoming';
}

class FeeEstimate {
  const FeeEstimate({
    required this.feeNano,
    required this.totalNano,
    required this.activationNano,
    required this.coveredByBandwidth,
    required this.recipientActivated,
  });

  factory FeeEstimate.fromJson(Map<String, dynamic> json) {
    return FeeEstimate(
      feeNano: BigInt.parse(json['feeNano'] as String),
      totalNano: BigInt.parse(json['totalNano'] as String),
      activationNano: BigInt.parse(json['activationNano'] as String),
      coveredByBandwidth: json['coveredByBandwidth'] as bool,
      recipientActivated: json['recipientActivated'] as bool,
    );
  }

  final BigInt feeNano;
  final BigInt totalNano;
  final BigInt activationNano;
  final bool coveredByBandwidth;
  final bool recipientActivated;

  bool get free => feeNano == BigInt.zero;
}

class WalletState {
  const WalletState({
    this.address,
    this.balanceNano,
    this.transactions = const [],
    this.loading = true,
    this.error,
  });

  final String? address;
  final BigInt? balanceNano;
  final List<WalletTransaction> transactions;
  final bool loading;
  final String? error;

  WalletState copyWith({
    String? address,
    BigInt? balanceNano,
    List<WalletTransaction>? transactions,
    bool? loading,
    String? error,
  }) {
    return WalletState(
      address: address ?? this.address,
      balanceNano: balanceNano ?? this.balanceNano,
      transactions: transactions ?? this.transactions,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}

class WalletNotifier extends Notifier<WalletState> {
  @override
  WalletState build() {
    final timer = Timer.periodic(pollInterval, (_) => refresh());
    ref.onDispose(timer.cancel);

    refresh();

    return const WalletState();
  }

  Future<void> refresh() async {
    final api = ref.read(apiClientProvider);

    try {
      final overview = await api.get('/wallet') as Map<String, dynamic>;
      final history = await api.get('/wallet/transactions') as List<dynamic>;

      if (!ref.mounted) {
        return;
      }

      state = WalletState(
        address: overview['address'] as String,
        balanceNano: BigInt.parse(overview['balanceNano'] as String),
        transactions: history
            .map((item) => WalletTransaction.fromJson(item as Map<String, dynamic>))
            .toList(),
        loading: false,
      );
    } on ApiException catch (error) {
      if (ref.mounted) {
        state = state.copyWith(loading: false, error: humanizeError(error.message));
      }
    }
  }

  Future<FeeEstimate> estimate({
    required String toAddress,
    required BigInt amountNano,
  }) async {
    final payload = await ref.read(apiClientProvider).post('/wallet/estimate', {
      'toAddress': toAddress,
      'amountNano': amountNano.toString(),
    });

    return FeeEstimate.fromJson(payload as Map<String, dynamic>);
  }

  Future<WalletTransaction> send({
    required String toAddress,
    required BigInt amountNano,
    required String idempotencyKey,
  }) async {
    final payload = await ref.read(apiClientProvider).post(
      '/wallet/send',
      {'toAddress': toAddress, 'amountNano': amountNano.toString()},
      headers: {'Idempotency-Key': idempotencyKey},
    );

    await refresh();

    return WalletTransaction.fromJson(payload as Map<String, dynamic>);
  }
}

final walletProvider = NotifierProvider<WalletNotifier, WalletState>(
  WalletNotifier.new,
  isAutoDispose: true,
);
