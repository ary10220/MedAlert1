import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_store.dart';
import '../rutas.dart';
import '../widgets/estado_chip.dart';
import '../widgets/estado_timeline.dart';
import '../widgets/incident_photo.dart';
import '../widgets/info_row.dart';

class DetalleReporteScreen extends StatelessWidget {
  const DetalleReporteScreen({super.key, required this.reporteId});

  final String reporteId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reporte = mockStore.buscarReporte(reporteId);
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del reporte')),
      body: SafeArea(
        child: reporte == null
            ? Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Este reporte ya no existe',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleLarge,
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: () => context.go(Rutas.home),
                      child: const Text('Volver al inicio'),
                    ),
                  ],
                ),
              )
            : ListView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: AspectRatio(
                      aspectRatio: 4 / 3,
                      child: IncidentPhoto(reporte: reporte),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      EstadoChip(estado: reporte.estado),
                      if (reporte.prioridad != null)
                        EtiquetaChip(
                          texto: 'Prioridad ${reporte.prioridad}',
                          color: colorDePrioridad(reporte.prioridad!),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  InfoRow(
                    icono: Icons.location_on_outlined,
                    titulo: 'Ubicación',
                    valor: reporte.ubicacion,
                  ),
                  if (reporte.hospitalAsignado != null)
                    InfoRow(
                      icono: Icons.local_hospital_outlined,
                      titulo: 'Hospital',
                      valor: reporte.hospitalAsignado!,
                    ),
                  if (reporte.etaMin != null)
                    InfoRow(
                      icono: Icons.timer_outlined,
                      titulo: 'Tiempo estimado',
                      valor: '${reporte.etaMin} min',
                    ),
                  InfoRow(
                    icono: Icons.event_outlined,
                    titulo: 'Fecha',
                    valor: reporte.fechaTexto,
                  ),
                  InfoRow(
                    icono: Icons.tag,
                    titulo: 'Código',
                    valor: reporte.id,
                  ),
                  const SizedBox(height: 16),
                  EstadoTimeline(estado: reporte.estado),
                ],
              ),
      ),
    );
  }
}
