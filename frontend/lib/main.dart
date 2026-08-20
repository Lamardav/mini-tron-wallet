import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_router.dart';
import 'design/motion.dart';
import 'design/palette.dart';
import 'design/theme.dart';
import 'providers/theme_provider.dart';

void main() {
  runApp(const ProviderScope(child: WalletApp()));
}

class WalletApp extends ConsumerWidget {
  const WalletApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Mini TRON Wallet',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(WalletPalette.light, Brightness.light),
      darkTheme: buildTheme(WalletPalette.dark, Brightness.dark),
      themeMode: ref.watch(themeProvider),
      themeAnimationDuration: themeDuration,
      themeAnimationCurve: enterCurve,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
