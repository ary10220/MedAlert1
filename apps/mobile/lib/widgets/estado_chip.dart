import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';

Color colorDeEstado(IncidentStatus estado) =>
    estado.buscando ? AppColors.amber : AppColors.mint;

Color colorDePrioridad(String prioridad) =>
    prioridad == 'P1' ? AppColors.pulse : AppColors.amber;

class EstadoChip extends StatelessWidget {
  const EstadoChip({super.key, required this.estado});

  final IncidentStatus estado;

  @override
  Widget build(BuildContext context) =>
      EtiquetaChip(texto: estado.etiqueta, color: colorDeEstado(estado));
}

class EtiquetaChip extends StatelessWidget {
  const EtiquetaChip({super.key, required this.texto, required this.color});

  final String texto;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            child: const SizedBox.square(dimension: 9),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              texto,
              style: theme.textTheme.labelMedium
                  ?.conPeso(FontWeight.w700)
                  .copyWith(color: theme.colorScheme.onSurface),
            ),
          ),
        ],
      ),
    );
  }
}
