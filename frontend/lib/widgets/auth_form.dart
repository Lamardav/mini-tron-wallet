import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/palette.dart';
import '../design/theme.dart';
import '../providers/auth_provider.dart';

class AuthForm extends ConsumerStatefulWidget {
  const AuthForm({
    super.key,
    required this.title,
    required this.submitLabel,
    required this.alternativeLabel,
    required this.alternativePath,
    required this.register,
  });

  final String title;
  final String submitLabel;
  final String alternativeLabel;
  final String alternativePath;
  final bool register;

  @override
  ConsumerState<AuthForm> createState() => _AuthFormState();
}

class _AuthFormState extends ConsumerState<AuthForm> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _localError;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    final email = _email.text.trim();
    final password = _password.text;

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _localError = 'Enter a valid email address');

      return;
    }

    if (widget.register && password.length < 8) {
      setState(() => _localError = 'Use at least 8 characters');

      return;
    }

    setState(() => _localError = null);

    final notifier = ref.read(authProvider.notifier);
    widget.register ? notifier.register(email, password) : notifier.signIn(email, password);
  }

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final auth = ref.watch(authProvider);
    final error = _localError ?? auth.error;

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
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
                  ],
                ),
                const SizedBox(height: 28),
                Text(
                  widget.title,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: sansFamily,
                    fontSize: 26,
                    fontWeight: FontWeight.w600,
                    color: palette.ink,
                  ),
                ),
                const SizedBox(height: 28),
                TextField(
                  controller: _email,
                  autofillHints: const [AutofillHints.email],
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    hintText: 'you@example.com',
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _password,
                  obscureText: true,
                  onSubmitted: (_) => _submit(),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    helperText: widget.register ? 'At least 8 characters' : null,
                    helperStyle: TextStyle(color: palette.inkFaint, fontFamily: sansFamily),
                  ),
                ),
                const SizedBox(height: 18),
                if (error != null) ...[
                  Text(
                    error,
                    style: TextStyle(
                      fontFamily: sansFamily,
                      fontSize: 13,
                      color: palette.failed,
                    ),
                  ),
                  const SizedBox(height: 14),
                ],
                FilledButton(
                  onPressed: auth.busy ? null : _submit,
                  child: auth.busy
                      ? SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: palette.page),
                        )
                      : Text(widget.submitLabel),
                ),
                const SizedBox(height: 6),
                TextButton(
                  onPressed: () => context.go(widget.alternativePath),
                  child: Text(widget.alternativeLabel),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
