import 'package:flutter/material.dart';

import '../widgets/auth_form.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AuthForm(
      title: 'Sign in',
      submitLabel: 'Sign in',
      alternativeLabel: 'No account yet? Create one',
      alternativePath: '/register',
      register: false,
    );
  }
}
