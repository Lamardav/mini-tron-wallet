import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';

const _destinations = <({String label, String path})>[
  (label: 'Wallet', path: '/wallet'),
  (label: 'Send', path: '/send'),
  (label: 'Transactions', path: '/transactions'),
];

class WalletShell extends ConsumerWidget {
  const WalletShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final palette = context.palette;
    final location = GoRouterState.of(context).matchedLocation;
    final dark = ref.watch(themeProvider) == ThemeMode.dark;

    return Scaffold(
      body: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: palette.surface,
              border: Border(bottom: BorderSide(color: palette.border)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 720),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(color: palette.brand, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'NILE TESTNET',
                      style: TextStyle(
                        fontFamily: sansFamily,
                        fontSize: 12,
                        letterSpacing: 0.6,
                        fontWeight: FontWeight.w500,
                        color: palette.inkMuted,
                      ),
                    ),
                    const Spacer(),
                    for (final destination in _destinations)
                      _NavLink(
                        label: destination.label,
                        selected: location == destination.path,
                        onTap: () => context.go(destination.path),
                      ),
                    const SizedBox(width: 8),
                    IconButton(
                      tooltip: dark ? 'Switch to light theme' : 'Switch to dark theme',
                      onPressed: () => ref.read(themeProvider.notifier).toggle(),
                      icon: Icon(
                        dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                        size: 18,
                        color: palette.inkMuted,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Sign out',
                      onPressed: () => ref.read(authProvider.notifier).signOut(),
                      icon: Icon(Icons.logout, size: 18, color: palette.inkMuted),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _NavLink extends StatelessWidget {
  const _NavLink({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return TextButton(
      onPressed: onTap,
      child: Text(
        label,
        style: TextStyle(
          fontFamily: sansFamily,
          fontSize: 14,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
          color: selected ? palette.ink : palette.inkMuted,
        ),
      ),
    );
  }
}
