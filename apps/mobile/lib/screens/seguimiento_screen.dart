import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/backend.dart';
import '../models/incident.dart';
import '../rutas.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import '../widgets/estado_chip.dart';
import '../widgets/estado_timeline.dart';
import '../widgets/info_row.dart';
import '../widgets/pulse_rings.dart';

/// "Alerta enviada" del prototipo, que se actualiza en vivo hasta cerrar el caso.
class SeguimientoScreen extends StatefulWidget {
  const SeguimientoScreen({super.key, required this.reporteId});

  final String reporteId;

  @override
  State<SeguimientoScreen> createState() => _SeguimientoScreenState();
}

class _SeguimientoScreenState extends State<SeguimientoScreen> {
  @override
  void initState() {
    super.initState();
    backend.seguir(widget.reporteId);
  }

  @override
  void dispose() {
    backend.dejarDeSeguir(widget.reporteId);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tu reporte'),
        leading: IconButton(
          tooltip: 'Volver al inicio',
          icon: const Icon(Icons.close),
          onPressed: () => context.go(Rutas.home),
        ),
      ),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: backend,
          builder: (context, _) {
            final reporte = backend.buscarReporte(widget.reporteId);
            if (reporte == null) return const _Cargando();
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
              children: [
                _Encabezado(reporte: reporte),
                const SizedBox(height: 20),
                _EstadoCard(reporte: reporte),
                if (reporte.hospital != null) ...[
                  const SizedBox(height: 12),
                  _HospitalCard(reporte: reporte),
                ],
                const SizedBox(height: 24),
                EstadoTimeline(estado: reporte.estado),
                const SizedBox(height: 24),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.night,
                    foregroundColor: AppColors.canvas,
                  ),
                  onPressed: () => context.go(Rutas.home),
                  child: const Text('Volver al inicio'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Encabezado extends StatelessWidget {
  const _Encabezado({required this.reporte});

  final Incident reporte;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estado = reporte.estado;
    final (titulo, texto) = switch (estado) {
      IncidentStatus.open || IncidentStatus.searching => (
        'Alerta enviada',
        _textoBusqueda(reporte.hospitalesAvisados),
      ),
      IncidentStatus.assigned => (
        'Ambulancia en camino',
        'El hospital confirmó la atención y envió una ambulancia al lugar.',
      ),
      IncidentStatus.onSite => (
        'La ambulancia llegó',
        'El equipo médico ya está en el lugar.',
      ),
      IncidentStatus.completed => (
        'Atención completada',
        'Gracias por reportar. Tu aviso ayudó a que llegara la ambulancia.',
      ),
      IncidentStatus.cancelled => (
        'Reporte cerrado',
        'El hospital cerró este reporte. Si la emergencia sigue, volvé a '
            'reportarla.',
      ),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        _Icono(estado: estado),
        const SizedBox(height: 20),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          layoutBuilder: (actual, anteriores) => Stack(
            alignment: Alignment.centerLeft,
            children: [...anteriores, ?actual],
          ),
          child: Text(
            titulo,
            key: ValueKey(titulo),
            style: theme.textTheme.headlineMedium?.conPeso(FontWeight.w600),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          texto,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  static String _textoBusqueda(int? avisados) => switch (avisados) {
    0 =>
      'Todavía no encontramos hospitales disponibles cerca. Seguimos '
          'buscando; si la emergencia es grave, llamá también a emergencias.',
    1 =>
      'Un hospital cercano ya recibió tu reporte. Te mostraremos aquí cuando '
          'confirme la atención y asigne una ambulancia.',
    final int n =>
      '$n hospitales cercanos ya recibieron tu reporte. Te mostraremos aquí '
          'cuando uno confirme la atención y asigne una ambulancia.',
    null =>
      'Los hospitales cercanos ya recibieron tu reporte. Te mostraremos aquí '
          'cuando uno confirme la atención y asigne una ambulancia.',
  };
}

class _Icono extends StatelessWidget {
  const _Icono({required this.estado});

  final IncidentStatus estado;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (estado.buscando) {
      return const PulseRings(
        color: AppColors.amber,
        size: 88,
        child: CircleAvatar(
          radius: 31,
          backgroundColor: AppColors.amber,
          foregroundColor: AppColors.night,
          child: Icon(Icons.check, size: 34),
        ),
      );
    }
    final (icono, color) = switch (estado) {
      IncidentStatus.assigned => (Icons.airport_shuttle, AppColors.mint),
      IncidentStatus.onSite => (Icons.medical_services, AppColors.mint),
      IncidentStatus.cancelled => (Icons.block, scheme.outline),
      _ => (Icons.check, AppColors.mint),
    };
    return CircleAvatar(
      radius: 31,
      backgroundColor: color,
      foregroundColor: AppColors.night,
      child: Icon(icono, size: 32),
    );
  }
}

class _EstadoCard extends StatelessWidget {
  const _EstadoCard({required this.reporte});

  final Incident reporte;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estado = reporte.estado;
    final detalle = estado.buscando
        ? 'Esperando confirmación del hospital'
        : estado.etiqueta;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ESTADO DEL REPORTE',
              style: theme.textTheme.labelSmall
                  ?.conPeso(FontWeight.w700)
                  .copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    letterSpacing: 0.6,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              detalle,
              style: theme.textTheme.titleMedium?.conPeso(FontWeight.w700),
            ),
            const SizedBox(height: 10),
            EtiquetaChip(
              texto: estado.buscando ? 'En revisión' : estado.etiqueta,
              color: colorDeEstado(estado, theme.colorScheme),
            ),
          ],
        ),
      ),
    );
  }
}

class _HospitalCard extends StatelessWidget {
  const _HospitalCard({required this.reporte});

  final Incident reporte;

  @override
  Widget build(BuildContext context) {
    final hospital = reporte.hospital!;
    final ambulancia = reporte.ambulancia;
    final telefono = hospital.telefono;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
            if (telefono != null) ...[
              const SizedBox(height: 4),
              OutlinedButton.icon(
                onPressed: () => launchUrl(Uri(scheme: 'tel', path: telefono)),
                icon: const Icon(Icons.call_outlined),
                label: Text('Llamar al hospital ($telefono)'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Cargando extends StatelessWidget {
  const _Cargando();

  @override
  Widget build(BuildContext context) =>
      const Center(child: CircularProgressIndicator());
}
