import 'package:shared_preferences/shared_preferences.dart';

class TokenStorage {
  static const _key = 'auth_token';

  Future<String?> read() async {
    final preferences = await SharedPreferences.getInstance();

    return preferences.getString(_key);
  }

  Future<void> write(String token) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_key, token);
  }

  Future<void> clear() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_key);
  }
}
