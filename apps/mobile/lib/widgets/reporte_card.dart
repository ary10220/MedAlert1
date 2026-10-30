import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../theme/app_theme.dart';
import 'estado_chip.dart';
import 'incident_photo.dart';

class ReporteCard extends StatelessWidget {
  const ReporteCard({super.key, required this.reporte, required this.onTap});

  final Incident reporte;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox.square(
                  dimension: 76,
                  child: IncidentPhoto(reporte: reporte),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reporte.ubicacion,
                      style: theme.textTheme.titleSmall?.conPeso(
                        FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      reporte.fechaTexto,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    EstadoChip(estado: reporte.estado),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
