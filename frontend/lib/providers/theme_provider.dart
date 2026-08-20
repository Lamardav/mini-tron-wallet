import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _storageKey = 'theme_mode';

class ThemeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    _restore();

    return ThemeMode.light;
  }

  Future<void> toggle() async {
    final next = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    state = next;

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_storageKey, next.name);
  }

  Future<void> _restore() async {
    final preferences = await SharedPreferences.getInstance();

    if (preferences.getString(_storageKey) == ThemeMode.dark.name) {
      state = ThemeMode.dark;
    }
  }
}

final themeProvider = NotifierProvider<ThemeNotifier, ThemeMode>(ThemeNotifier.new);
