import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/send_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/transactions_screen.dart';
import 'screens/wallet_screen.dart';
import 'widgets/wallet_shell.dart';

const _splashRoute = '/';
const _publicRoutes = {'/login', '/register'};

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: _splashRoute,
    redirect: (context, state) {
      final location = state.matchedLocation;

      if (!auth.restored) {
        return location == _splashRoute ? null : _splashRoute;
      }

      if (!auth.signedIn) {
        return _publicRoutes.contains(location) ? null : '/login';
      }

      return _publicRoutes.contains(location) || location == _splashRoute ? '/wallet' : null;
    },
    routes: [
      GoRoute(path: _splashRoute, builder: (context, state) => const SplashScreen()),
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
