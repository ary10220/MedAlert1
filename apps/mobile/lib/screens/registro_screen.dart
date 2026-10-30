import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/mock_store.dart';
import '../data/validators.dart';
import '../models/usuario.dart';

class RegistroScreen extends StatefulWidget {
  const RegistroScreen({super.key});

  @override
  State<RegistroScreen> createState() => _RegistroScreenState();
}

class _RegistroScreenState extends State<RegistroScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nombre = TextEditingController();
  final _ci = TextEditingController();
  final _telefono = TextEditingController();
  final _email = TextEditingController();
  var _modo = AutovalidateMode.disabled;
  var _ocultarPassword = true;

  @override
  void dispose() {
    _nombre.dispose();
    _ci.dispose();
    _telefono.dispose();
    _email.dispose();
    super.dispose();
  }

  void _crearCuenta() {
    if (_formKey.currentState!.validate()) {
      // El redirect del router lleva a home al abrirse la sesión.
      mockStore.registrar(
        Usuario(
          nombre: _nombre.text.trim(),
          ci: _ci.text.trim(),
          telefono: _telefono.text.trim(),
          email: _email.text.trim(),
        ),
      );
    } else {
      setState(() => _modo = AutovalidateMode.onUserInteraction);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Crear cuenta')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Form(
            key: _formKey,
            autovalidateMode: _modo,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _nombre,
                  textInputAction: TextInputAction.next,
                  textCapitalization: TextCapitalization.words,
                  autofillHints: const [AutofillHints.name],
                  decoration: const InputDecoration(
                    labelText: 'Nombre completo',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: Validators.nombre,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _ci,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'CI',
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                  validator: Validators.ci,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _telefono,
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
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(
                    labelText: 'Correo',
                    prefixIcon: Icon(Icons.mail_outline),
                  ),
                  validator: Validators.email,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  obscureText: _ocultarPassword,
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.newPassword],
                  onFieldSubmitted: (_) => _crearCuenta(),
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
                      onPressed: () =>
                          setState(() => _ocultarPassword = !_ocultarPassword),
                    ),
                  ),
                  validator: Validators.password,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _crearCuenta,
                  child: const Text('Crear cuenta'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
