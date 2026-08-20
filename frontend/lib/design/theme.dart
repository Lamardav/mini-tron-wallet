import 'package:flutter/material.dart';
import 'palette.dart';

const sansFamily = 'IBMPlexSans';
const monoFamily = 'IBMPlexMono';

ThemeData buildTheme(WalletPalette palette, Brightness brightness) {
  final base = ThemeData(brightness: brightness, useMaterial3: true);

  return base.copyWith(
    extensions: [palette],
    scaffoldBackgroundColor: palette.page,
    colorScheme: ColorScheme.fromSeed(
      seedColor: palette.brand,
      brightness: brightness,
      surface: palette.surface,
      error: palette.failed,
    ),
    textTheme: base.textTheme.apply(
      fontFamily: sansFamily,
      bodyColor: palette.ink,
      displayColor: palette.ink,
    ),
    dividerColor: palette.border,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: palette.surface,
      labelStyle: TextStyle(color: palette.inkMuted, fontFamily: sansFamily),
      hintStyle: TextStyle(color: palette.inkFaint, fontFamily: monoFamily),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: _inputBorder(palette.border),
      enabledBorder: _inputBorder(palette.border),
      focusedBorder: _inputBorder(palette.ink, width: 1.4),
      errorBorder: _inputBorder(palette.failed),
      focusedErrorBorder: _inputBorder(palette.failed, width: 1.4),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: palette.ink,
        foregroundColor: palette.page,
        disabledBackgroundColor: palette.borderStrong,
        disabledForegroundColor: palette.page,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontFamily: sansFamily, fontWeight: FontWeight.w500),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: palette.ink,
        side: BorderSide(color: palette.borderStrong),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontFamily: sansFamily, fontWeight: FontWeight.w500),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: palette.inkMuted,
        textStyle: const TextStyle(fontFamily: sansFamily, fontWeight: FontWeight.w400),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: palette.ink,
      contentTextStyle: TextStyle(color: palette.page, fontFamily: sansFamily),
      behavior: SnackBarBehavior.floating,
    ),
  );
}

OutlineInputBorder _inputBorder(Color color, {double width = 1}) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(8),
    borderSide: BorderSide(color: color, width: width),
  );
}
