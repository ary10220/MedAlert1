import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/backend.dart';
import '../models/incident.dart';
import '../rutas.dart';
import '../widgets/estado_chip.dart';
import '../widgets/estado_timeline.dart';
import '../widgets/incident_photo.dart';
import '../widgets/info_row.dart';

class DetalleReporteScreen extends StatefulWidget {
  const DetalleReporteScreen({super.key, required this.reporteId});

  final String reporteId;

  @override
  State<DetalleReporteScreen> createState() => _DetalleReporteScreenState();
}

class _DetalleReporteScreenState extends State<DetalleReporteScreen> {
  late final Future<Incident?> _detalle = backend.cargarDetalle(
    widget.reporteId,
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del reporte')),
      body: SafeArea(
        child: FutureBuilder<Incident?>(
          future: _detalle,
          builder: (context, carga) {
            // Lo que ya está en memoria se muestra mientras llega el detalle.
            final reporte =
                backend.buscarReporte(widget.reporteId) ?? carga.data;
            if (reporte != null) return _Contenido(reporte: reporte);
            if (carga.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            return const _NoEncontrado();
          },
        ),
      ),
    );
  }
}

class _Contenido extends StatelessWidget {
  const _Contenido({required this.reporte});

  final Incident reporte;

  @override
  Widget build(BuildContext context) {
    final hospital = reporte.hospital;
    final ambulancia = reporte.ambulancia;
    final coordenadas = reporte.coordenadas;
    return ListView(
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
        Align(
          alignment: Alignment.centerLeft,
          child: EstadoChip(estado: reporte.estado),
        ),
        const SizedBox(height: 10),
        if (reporte.ubicacion != null || coordenadas != null)
          InfoRow(
            icono: Icons.location_on_outlined,
            titulo: 'Ubicación',
            valor: reporte.ubicacion ?? coordenadas!,
          ),
        if (hospital != null)
          InfoRow(
            icono: Icons.local_hospital_outlined,
            titulo: 'Hospital',
            valor: [hospital.nombre, ?hospital.direccion].join('\n'),
          ),
        if (ambulancia != null && ambulancia.descripcion.isNotEmpty)
          InfoRow(
            icono: Icons.airport_shuttle_outlined,
            titulo: 'Ambulancia',
            valor: ambulancia.descripcion,
          ),
        InfoRow(
          icono: Icons.event_outlined,
          titulo: 'Fecha',
          valor: reporte.fechaTexto,
        ),
        InfoRow(icono: Icons.tag, titulo: 'Código', valor: reporte.codigo),
        const SizedBox(height: 16),
        EstadoTimeline(estado: reporte.estado),
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
            'No encontramos este reporte',
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
