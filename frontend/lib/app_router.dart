import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'design/motion.dart';
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

class _AuthChangeNotifier extends ChangeNotifier {
  _AuthChangeNotifier(Ref ref) {
    ref.listen(authProvider, (previous, next) {
      if (previous?.restored != next.restored || previous?.signedIn != next.signedIn) {
        notifyListeners();
      }
    });
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final authChanges = _AuthChangeNotifier(ref);
  ref.onDispose(authChanges.dispose);

  return GoRouter(
    initialLocation: _splashRoute,
    refreshListenable: authChanges,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
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
      GoRoute(
        path: _splashRoute,
        pageBuilder: (context, state) => fadePage(state, const SplashScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => fadePage(state, const LoginScreen()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => fadePage(state, const RegisterScreen()),
      ),
      ShellRoute(
        builder: (context, state, child) => WalletShell(child: child),
        routes: [
          GoRoute(
            path: '/wallet',
            pageBuilder: (context, state) => fadeThroughPage(state, const WalletScreen()),
          ),
          GoRoute(
            path: '/send',
            pageBuilder: (context, state) => fadeThroughPage(state, const SendScreen()),
          ),
          GoRoute(
            path: '/transactions',
            pageBuilder: (context, state) => fadeThroughPage(state, const TransactionsScreen()),
          ),
        ],
      ),
    ],
  );
});
