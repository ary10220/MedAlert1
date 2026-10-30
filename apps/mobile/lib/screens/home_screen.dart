import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_store.dart';
import '../models/incident.dart';
import '../rutas.dart';
import '../theme/app_theme.dart';
import '../widgets/estado_chip.dart';
import '../widgets/sos_button.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            children: [
              Row(
                children: [
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'MedAlert',
                      style: theme.textTheme.headlineSmall?.conPeso(
                        FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Mis reportes',
                    iconSize: 28,
                    icon: const Icon(Icons.history),
                    onPressed: () => context.push(Rutas.historial),
                  ),
                  IconButton(
                    tooltip: 'Mi perfil',
                    iconSize: 28,
                    icon: const Icon(Icons.person_outline),
                    onPressed: () => context.push(Rutas.perfil),
                  ),
                ],
              ),
              ListenableBuilder(
                listenable: mockStore,
                builder: (context, _) {
                  final activo = mockStore.reporteActivo;
                  if (activo == null) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: _ReporteActivo(reporte: activo),
                  );
                },
              ),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) => Center(
                    child: SosButton(
                      size: math.min(
                        constraints.maxWidth,
                        constraints.maxHeight,
                      ),
                      onPressed: () => context.push(Rutas.reportar),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReporteActivo extends StatelessWidget {
  const _ReporteActivo({required this.reporte});

  final Incident reporte;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final detalle = [
      if (reporte.estado.conEta && reporte.etaMin != null)
        '${reporte.etaMin} min',
      ?reporte.hospitalAsignado,
    ].join(' · ');

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(Rutas.paraReporte(reporte)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    EstadoChip(estado: reporte.estado),
                    if (detalle.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        detalle,
                        style: theme.textTheme.titleSmall?.conPeso(
                          FontWeight.w700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
