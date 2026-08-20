import 'package:flutter/material.dart';

import '../widgets/auth_form.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AuthForm(
      title: 'Create a wallet',
      submitLabel: 'Create wallet',
      alternativeLabel: 'Already registered? Sign in',
      alternativePath: '/login',
      register: true,
    );
  }
}
