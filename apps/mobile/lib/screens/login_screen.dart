import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_store.dart';
import '../data/validators.dart';
import '../rutas.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  var _modo = AutovalidateMode.disabled;
  var _ocultarPassword = true;

  void _entrar() {
    if (_formKey.currentState!.validate()) {
      // El redirect del router lleva a home al abrirse la sesión.
      mockStore.iniciarSesion();
    } else {
      setState(() => _modo = AutovalidateMode.onUserInteraction);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              autovalidateMode: _modo,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.emergency, color: AppColors.pulse, size: 52),
                  const SizedBox(height: 12),
                  Text(
                    'MedAlert',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineLarge?.conPeso(
                      FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 32),
                  TextFormField(
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.telephoneNumber],
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(8),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Teléfono',
                      prefixIcon: Icon(Icons.phone_outlined),
                    ),
                    validator: Validators.telefono,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    obscureText: _ocultarPassword,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.password],
                    onFieldSubmitted: (_) => _entrar(),
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        tooltip: _ocultarPassword
                            ? 'Mostrar contraseña'
                            : 'Ocultar contraseña',
                        icon: Icon(
                          _ocultarPassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () => setState(
                          () => _ocultarPassword = !_ocultarPassword,
                        ),
                      ),
                    ),
                    validator: Validators.password,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(onPressed: _entrar, child: const Text('Entrar')),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => context.push(Rutas.registro),
                    child: const Text('Crear cuenta'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
