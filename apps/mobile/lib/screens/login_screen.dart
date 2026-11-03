import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/backend.dart';
import '../data/validators.dart';
import '../rutas.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import '../widgets/aviso_error.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  var _modo = AutovalidateMode.disabled;
  var _ocultarPassword = true;
  var _cargando = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _entrar() async {
    if (_cargando) return;
    if (!_formKey.currentState!.validate()) {
      setState(() => _modo = AutovalidateMode.onUserInteraction);
      return;
    }
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      // Con la sesión abierta, el redirect del router lleva a home.
      await backend.iniciarSesion(
        email: _email.text.trim(),
        password: _password.text,
      );
    } on BackendException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
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
            child: AutofillGroup(
              child: Form(
                key: _formKey,
                autovalidateMode: _modo,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(
                      Icons.emergency,
                      color: AppColors.pulse,
                      size: 52,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'MedAlert',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineLarge?.conPeso(
                        FontWeight.w600,
                      ),
                    ),
                    if (backend.modoDemo) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Modo demo: entrá con cualquier correo',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autocorrect: false,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'Correo',
                        prefixIcon: Icon(Icons.mail_outline),
                      ),
                      validator: Validators.email,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _password,
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
                      validator: Validators.passwordIngreso,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      AvisoError(mensaje: _error!),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _cargando ? null : _entrar,
                      child: _cargando
                          ? const SizedBox.square(
                              dimension: 22,
                              child: CircularProgressIndicator(strokeWidth: 3),
                            )
                          : const Text('Entrar'),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _cargando
                          ? null
                          : () => context.push(Rutas.registro),
                      child: const Text('Crear cuenta'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
