import 'dart:convert';

import 'package:http/http.dart' as http;

import 'token_storage.dart';

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._storage);

  static const baseUrl = String.fromEnvironment('API_URL', defaultValue: '/api');

  final TokenStorage _storage;

  Future<dynamic> get(String path) => _send('GET', path);

  Future<dynamic> post(
    String path,
    Map<String, dynamic> body, {
    Map<String, String> headers = const {},
  }) {
    return _send('POST', path, body: body, extraHeaders: headers);
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String> extraHeaders = const {},
  }) async {
    final token = await _storage.read();
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
      ...extraHeaders,
    };

    final response = method == 'GET'
        ? await http.get(uri, headers: headers)
        : await http.post(uri, headers: headers, body: jsonEncode(body));

    final decoded = response.body.isEmpty ? null : jsonDecode(response.body);

    if (response.statusCode >= 400) {
      throw ApiException(response.statusCode, _readMessage(decoded));
    }

    return decoded;
  }

  String _readMessage(dynamic decoded) {
    if (decoded is! Map<String, dynamic>) {
      return 'Something went wrong';
    }

    final message = decoded['message'];

    if (message is List) {
      return message.join(', ');
    }

    return message?.toString() ?? 'Something went wrong';
  }
}
