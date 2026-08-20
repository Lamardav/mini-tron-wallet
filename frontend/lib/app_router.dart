import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/send_screen.dart';
import 'screens/transactions_screen.dart';
import 'screens/wallet_screen.dart';
import 'widgets/wallet_shell.dart';

const _publicRoutes = {'/login', '/register'};

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/wallet',
    redirect: (context, state) {
      if (!auth.restored) {
        return null;
      }

      final onPublicRoute = _publicRoutes.contains(state.matchedLocation);

      if (!auth.signedIn) {
        return onPublicRoute ? null : '/login';
      }

      return onPublicRoute ? '/wallet' : null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      ShellRoute(
        builder: (context, state, child) => WalletShell(child: child),
        routes: [
          GoRoute(path: '/wallet', builder: (context, state) => const WalletScreen()),
          GoRoute(path: '/send', builder: (context, state) => const SendScreen()),
          GoRoute(path: '/transactions', builder: (context, state) => const TransactionsScreen()),
        ],
      ),
    ],
  );
});
