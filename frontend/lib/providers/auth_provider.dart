import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/error_messages.dart';
import '../core/token_storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(ref.watch(tokenStorageProvider)),
);

class WalletUser {
  const WalletUser({required this.id, required this.email, required this.address});

  factory WalletUser.fromJson(Map<String, dynamic> json) {
    return WalletUser(
      id: json['id'] as String,
      email: json['email'] as String,
      address: json['address'] as String?,
    );
  }

  final String id;
  final String email;
  final String? address;
}

class AuthState {
  const AuthState({this.restored = false, this.user, this.busy = false, this.error});

  final bool restored;
  final WalletUser? user;
  final bool busy;
  final String? error;

  bool get signedIn => user != null;
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _restoreSession();

    return const AuthState();
  }

  Future<void> signIn(String email, String password) {
    return _authenticate('/auth/login', email, password);
  }

  Future<void> register(String email, String password) {
    return _authenticate('/auth/register', email, password);
  }

  Future<void> signOut() async {
    await ref.read(tokenStorageProvider).clear();
    state = const AuthState(restored: true);
  }

  Future<void> _restoreSession() async {
    final storage = ref.read(tokenStorageProvider);

    if (await storage.read() == null) {
      state = const AuthState(restored: true);

      return;
    }

    try {
      final profile = await ref.read(apiClientProvider).get('/me');
      state = AuthState(
        restored: true,
        user: WalletUser.fromJson(profile as Map<String, dynamic>),
      );
    } on ApiException {
      await storage.clear();
      state = const AuthState(restored: true);
    }
  }

  Future<void> _authenticate(String path, String email, String password) async {
    state = const AuthState(restored: true, busy: true);

    try {
      final payload = await ref.read(apiClientProvider).post(path, {
        'email': email,
        'password': password,
      });
      final data = payload as Map<String, dynamic>;

      await ref.read(tokenStorageProvider).write(data['token'] as String);
      state = AuthState(
        restored: true,
        user: WalletUser.fromJson(data['user'] as Map<String, dynamic>),
      );
    } on ApiException catch (error) {
      state = AuthState(restored: true, error: humanizeError(error.message));
    }
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
