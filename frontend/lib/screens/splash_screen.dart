import 'package:flutter/material.dart';

import '../design/palette.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Scaffold(
      body: Center(
        child: SizedBox(
          height: 22,
          width: 22,
          child: CircularProgressIndicator(strokeWidth: 2, color: palette.inkFaint),
        ),
      ),
    );
  }
}
