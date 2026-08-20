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

      state = WalletState(
        address: overview['address'] as String,
        balanceNano: BigInt.parse(overview['balanceNano'] as String),
        transactions: history
            .map((item) => WalletTransaction.fromJson(item as Map<String, dynamic>))
            .toList(),
        loading: false,
      );
    } on ApiException catch (error) {
      state = state.copyWith(loading: false, error: humanizeError(error.message));
    }
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
