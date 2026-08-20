import 'package:flutter/material.dart';

@immutable
class WalletPalette extends ThemeExtension<WalletPalette> {
  const WalletPalette({
    required this.page,
    required this.surface,
    required this.border,
    required this.borderStrong,
    required this.ink,
    required this.inkMuted,
    required this.inkFaint,
    required this.brand,
    required this.pending,
    required this.confirmed,
    required this.failed,
  });

  static const light = WalletPalette(
    page: Color(0xFFF4F5F5),
    surface: Color(0xFFFFFFFF),
    border: Color(0xFFE3E5E6),
    borderStrong: Color(0xFFC9CDD1),
    ink: Color(0xFF16181A),
    inkMuted: Color(0xFF5A6169),
    inkFaint: Color(0xFFA8AEB3),
    brand: Color(0xFFEB0029),
    pending: Color(0xFFB4700A),
    confirmed: Color(0xFF1F7A4D),
    failed: Color(0xFFC0271E),
  );

  static const dark = WalletPalette(
    page: Color(0xFF121417),
    surface: Color(0xFF191C20),
    border: Color(0xFF262A2F),
    borderStrong: Color(0xFF3A3F47),
    ink: Color(0xFFE9EBED),
    inkMuted: Color(0xFF969CA4),
    inkFaint: Color(0xFF5C626A),
    brand: Color(0xFFFF3B4E),
    pending: Color(0xFFD9A441),
    confirmed: Color(0xFF4EAE7E),
    failed: Color(0xFFE86A62),
  );

  final Color page;
  final Color surface;
  final Color border;
  final Color borderStrong;
  final Color ink;
  final Color inkMuted;
  final Color inkFaint;
  final Color brand;
  final Color pending;
  final Color confirmed;
  final Color failed;

  Color statusColor(String status) {
    return switch (status) {
      'confirmed' => confirmed,
      'failed' => failed,
      _ => pending,
    };
  }

  @override
  WalletPalette copyWith({
    Color? page,
    Color? surface,
    Color? border,
    Color? borderStrong,
    Color? ink,
    Color? inkMuted,
    Color? inkFaint,
    Color? brand,
    Color? pending,
    Color? confirmed,
    Color? failed,
  }) {
    return WalletPalette(
      page: page ?? this.page,
      surface: surface ?? this.surface,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      ink: ink ?? this.ink,
      inkMuted: inkMuted ?? this.inkMuted,
      inkFaint: inkFaint ?? this.inkFaint,
      brand: brand ?? this.brand,
      pending: pending ?? this.pending,
      confirmed: confirmed ?? this.confirmed,
      failed: failed ?? this.failed,
    );
  }

  @override
  WalletPalette lerp(covariant WalletPalette? other, double t) {
    if (other == null) {
      return this;
    }

    return WalletPalette(
      page: Color.lerp(page, other.page, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      border: Color.lerp(border, other.border, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      inkMuted: Color.lerp(inkMuted, other.inkMuted, t)!,
      inkFaint: Color.lerp(inkFaint, other.inkFaint, t)!,
      brand: Color.lerp(brand, other.brand, t)!,
      pending: Color.lerp(pending, other.pending, t)!,
      confirmed: Color.lerp(confirmed, other.confirmed, t)!,
      failed: Color.lerp(failed, other.failed, t)!,
    );
  }
}

extension WalletPaletteAccess on BuildContext {
  WalletPalette get palette => Theme.of(this).extension<WalletPalette>()!;
}
