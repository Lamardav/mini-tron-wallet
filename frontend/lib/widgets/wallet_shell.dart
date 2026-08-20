import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/motion.dart';
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
          AnimatedContainer(
            duration: themeDuration,
            curve: enterCurve,
            decoration: BoxDecoration(
              color: palette.surface,
              border: Border(bottom: BorderSide(color: palette.border)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
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
                      NavLink(
                        label: destination.label,
                        selected: location == destination.path,
                        onTap: () => context.go(destination.path),
                      ),
                    const SizedBox(width: 12),
                    IconAction(
                      tooltip: dark ? 'Switch to light theme' : 'Switch to dark theme',
                      onTap: () => ref.read(themeProvider.notifier).toggle(),
                      icon: AnimatedSwitcher(
                        duration: baseDuration,
                        switchInCurve: enterCurve,
                        transitionBuilder: (child, animation) => FadeTransition(
                          opacity: animation,
                          child: RotationTransition(
                            turns: Tween<double>(begin: 0.6, end: 1).animate(animation),
                            child: child,
                          ),
                        ),
                        child: Icon(
                          dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                          key: ValueKey<bool>(dark),
                          size: 18,
                          color: palette.inkMuted,
                        ),
                      ),
                    ),
                    IconAction(
                      tooltip: 'Sign out',
                      onTap: () => ref.read(authProvider.notifier).signOut(),
                      icon: Icon(Icons.logout, size: 18, color: palette.inkMuted),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (ref.watch(authProvider).user?.emailVerified == false)
            const VerificationBanner(),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class VerificationBanner extends ConsumerStatefulWidget {
  const VerificationBanner({super.key});

  @override
  ConsumerState<VerificationBanner> createState() => _VerificationBannerState();
}

class _VerificationBannerState extends ConsumerState<VerificationBanner> {
  bool _sending = false;

  Future<void> _resend() async {
    setState(() => _sending = true);

    try {
      await ref.read(authProvider.notifier).resendVerification();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Verification email requested')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Container(
      width: double.infinity,
      color: palette.pending.withValues(alpha: 0.12),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Row(
            children: [
              Icon(Icons.mark_email_unread_outlined, size: 16, color: palette.pending),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Your email is not confirmed yet. Confirm it to keep access to recovery and alerts.',
                  style: TextStyle(
                    fontFamily: sansFamily,
                    fontSize: 13,
                    color: palette.pending,
                  ),
                ),
              ),
              TextButton(
                onPressed: _sending ? null : _resend,
                child: Text(_sending ? 'Sending' : 'Resend'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class NavLink extends StatefulWidget {
  const NavLink({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<NavLink> createState() => _NavLinkState();
}

class _NavLinkState extends State<NavLink> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final active = widget.selected || _hovered;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedDefaultTextStyle(
                duration: fastDuration,
                curve: enterCurve,
                style: TextStyle(
                  fontFamily: sansFamily,
                  fontSize: 14,
                  fontWeight: widget.selected ? FontWeight.w600 : FontWeight.w400,
                  color: active ? palette.ink : palette.inkMuted,
                ),
                child: Text(widget.label),
              ),
              const SizedBox(height: 5),
              AnimatedContainer(
                duration: baseDuration,
                curve: enterCurve,
                height: 2,
                width: widget.selected ? 18 : 0,
                decoration: BoxDecoration(
                  color: palette.brand,
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class IconAction extends StatefulWidget {
  const IconAction({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final Widget icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  State<IconAction> createState() => _IconActionState();
}

class _IconActionState extends State<IconAction> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Tooltip(
      message: widget.tooltip,
      waitDuration: const Duration(milliseconds: 400),
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: widget.onTap,
          behavior: HitTestBehavior.opaque,
          child: AnimatedContainer(
            duration: fastDuration,
            curve: enterCurve,
            margin: const EdgeInsets.symmetric(horizontal: 2),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _hovered ? palette.page : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: widget.icon,
          ),
        ),
      ),
    );
  }
}
