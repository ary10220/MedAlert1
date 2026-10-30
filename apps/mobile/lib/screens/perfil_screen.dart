import 'package:flutter/material.dart';

import '../data/mock_store.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import '../widgets/info_row.dart';

class PerfilScreen extends StatelessWidget {
  const PerfilScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final usuario = mockStore.usuario;
    return Scaffold(
      appBar: AppBar(title: const Text('Mi perfil')),
      body: SafeArea(
        child: usuario == null
            ? const SizedBox.shrink()
            : ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Center(
                    child: CircleAvatar(
                      radius: 44,
                      backgroundColor: AppColors.mint,
                      foregroundColor: AppColors.night,
                      child: Text(
                        usuario.iniciales,
                        style: theme.textTheme.headlineMedium
                            ?.conPeso(FontWeight.w700)
                            .copyWith(color: AppColors.night),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    usuario.nombre,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineSmall?.conPeso(
                      FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 20),
                  InfoRow(
                    icono: Icons.badge_outlined,
                    titulo: 'CI',
                    valor: usuario.ci,
                  ),
                  InfoRow(
                    icono: Icons.phone_outlined,
                    titulo: 'Teléfono',
                    valor: usuario.telefono,
                  ),
                  InfoRow(
                    icono: Icons.mail_outline,
                    titulo: 'Correo',
                    valor: usuario.email,
                  ),
                  const SizedBox(height: 28),
                  // El redirect del router lleva a login al cerrarse la sesión.
                  OutlinedButton(
                    onPressed: mockStore.cerrarSesion,
                    child: const Text('Cerrar sesión'),
                  ),
                ],
              ),
      ),
    );
  }
}
