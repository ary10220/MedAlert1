import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_store.dart';
import '../models/incident.dart';
import '../rutas.dart';
import '../theme/app_theme.dart';
import '../widgets/estado_timeline.dart';
import '../widgets/map_placeholder.dart';

class SeguimientoScreen extends StatefulWidget {
  const SeguimientoScreen({super.key, required this.reporteId});

  final String reporteId;

  @override
  State<SeguimientoScreen> createState() => _SeguimientoScreenState();
}

class _SeguimientoScreenState extends State<SeguimientoScreen> {
  static const _paso = Duration(seconds: 6);

  Timer? _simulacion;

  @override
  void initState() {
    super.initState();
    _simulacion = Timer.periodic(_paso, (timer) {
      mockStore.avanzarEstado(widget.reporteId);
      final reporte = mockStore.buscarReporte(widget.reporteId);
      if (reporte == null || !reporte.estado.activo) timer.cancel();
    });
  }

  @override
  void dispose() {
    _simulacion?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: mockStore,
      builder: (context, _) {
        final reporte = mockStore.buscarReporte(widget.reporteId);
        return Scaffold(
          appBar: AppBar(title: const Text('Seguimiento')),
          body: SafeArea(
            child: reporte == null
                ? const _NoEncontrado()
                : ListView(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                    children: [
                      const SizedBox(height: 190, child: MapPlaceholder()),
                      const SizedBox(height: 20),
                      _Resumen(reporte: reporte),
                      const SizedBox(height: 24),
                      EstadoTimeline(estado: reporte.estado),
                      if (!reporte.estado.activo) ...[
                        const SizedBox(height: 24),
                        FilledButton(
                          onPressed: () => context.go(Rutas.home),
                          child: const Text('Volver al inicio'),
                        ),
                      ],
                    ],
                  ),
          ),
        );
      },
    );
  }
}

class _Resumen extends StatelessWidget {
  const _Resumen({required this.reporte});

  final Incident reporte;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final titulo = switch (reporte.estado) {
      IncidentStatus.reported ||
      IncidentStatus.searching => reporte.estado.etiqueta,
      IncidentStatus.assigned ||
      IncidentStatus.onRoute => '${reporte.etaMin} min',
      IncidentStatus.onScene => 'La ambulancia llegó',
      IncidentStatus.completed => 'Atención completada',
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          layoutBuilder: (actual, anteriores) => Stack(
            alignment: Alignment.centerLeft,
            children: [...anteriores, ?actual],
          ),
          child: Text(
            titulo,
            key: ValueKey(titulo),
            style: theme.textTheme.displaySmall?.conPeso(FontWeight.w600),
          ),
        ),
        if (reporte.hospitalAsignado != null) ...[
          const SizedBox(height: 4),
          Text(reporte.hospitalAsignado!, style: theme.textTheme.titleMedium),
        ],
      ],
    );
  }
}

class _NoEncontrado extends StatelessWidget {
  const _NoEncontrado();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Este reporte ya no existe',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () => context.go(Rutas.home),
            child: const Text('Volver al inicio'),
          ),
        ],
      ),
    );
  }
}
