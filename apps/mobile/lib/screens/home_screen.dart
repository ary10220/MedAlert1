import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/backend.dart';
import '../data/location_service.dart';
import '../models/incident.dart';
import '../rutas.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import '../widgets/estado_chip.dart';
import '../widgets/sos_button.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Pedir el GPS desde ya: al reportar, la ubicación suele estar lista.
    if (ubicacionActual.reciente == null) {
      unawaited(ubicacionActual.actualizar());
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 12, 20),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - 28,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Encabezado(theme: theme),
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ListenableBuilder(
                      listenable: backend,
                      builder: (context, _) {
                        final activo = backend.reporteActivo;
                        if (activo == null) return const SizedBox(height: 8);
                        return Padding(
                          padding: const EdgeInsets.only(top: 8, bottom: 12),
                          child: _ReporteActivo(reporte: activo),
                        );
                      },
                    ),
                  ),
                  const _LineaUbicacion(),
                  const SizedBox(height: 20),
                  Text(
                    '¿Presenciaste una emergencia?',
                    style: theme.textTheme.headlineMedium?.conPeso(
                      FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Text(
                      'Podés pedir ayuda en segundos. Compartiremos la foto y '
                      'tu ubicación con hospitales cercanos.',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: SosButton(
                      size: math.min(constraints.maxWidth - 32, 320),
                      onPressed: () => context.push(Rutas.reportar),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Padding(
                    padding: EdgeInsets.only(right: 8),
                    child: _PasoUnico(),
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

class _Encabezado extends StatelessWidget {
  const _Encabezado({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.emergency, color: AppColors.pulse, size: 28),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'MedAlert',
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.headlineSmall?.conPeso(FontWeight.w600),
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
        if (backend.modoDemo)
          const EtiquetaChip(
            texto: 'Modo demo: datos simulados',
            color: AppColors.amber,
          ),
      ],
    );
  }
}

class _LineaUbicacion extends StatelessWidget {
  const _LineaUbicacion();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListenableBuilder(
      listenable: ubicacionActual,
      builder: (context, _) {
        final ultima = ubicacionActual.ultima;
        final (icono, color, detalle) = switch (ultima) {
          _ when ubicacionActual.buscando && ultima?.ok != true => (
            Icons.location_searching,
            theme.colorScheme.onSurfaceVariant,
            'Buscando tu ubicación…',
          ),
          LocationResult(ok: true) => (
            Icons.location_on,
            AppColors.pulse,
            'Tu ubicación está activa',
          ),
          LocationResult() => (
            Icons.location_off,
            AppColors.amber,
            'Activá la ubicación para poder reportar',
          ),
          null => (
            Icons.location_searching,
            theme.colorScheme.onSurfaceVariant,
            'Buscando tu ubicación…',
          ),
        };
        return Row(
          children: [
            Icon(icono, color: color, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Santa Cruz de la Sierra',
                    style: theme.textTheme.titleSmall?.conPeso(FontWeight.w700),
                  ),
                  Text(
                    detalle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _PasoUnico extends StatelessWidget {
  const _PasoUnico();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 15,
              backgroundColor: theme.colorScheme.surface,
              child: Text(
                '1',
                style: theme.textTheme.labelLarge
                    ?.conPeso(FontWeight.w800)
                    .copyWith(color: AppColors.pulse),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Solo necesitás una foto',
                    style: theme.textTheme.titleSmall?.conPeso(FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Al enviarla, un hospital revisará el caso y coordinará '
                    'la ambulancia.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
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
    final detalle =
        reporte.hospital?.nombre ?? 'Esperando confirmación del hospital';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push(Rutas.seguimiento(reporte.id)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tu reporte en curso',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 6),
                    EstadoChip(estado: reporte.estado),
                    const SizedBox(height: 6),
                    Text(
                      detalle,
                      style: theme.textTheme.titleSmall?.conPeso(
                        FontWeight.w700,
                      ),
                    ),
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
