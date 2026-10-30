import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import 'estado_chip.dart';

/// Los seis pasos de `estadosFlujo`, con el actual resaltado.
class EstadoTimeline extends StatelessWidget {
  const EstadoTimeline({super.key, required this.estado});

  final IncidentStatus estado;

  @override
  Widget build(BuildContext context) {
    final pasos = IncidentStatus.values;
    return Column(
      children: [
        for (final paso in pasos)
          _Paso(
            paso: paso,
            hecho:
                paso.index < estado.index || estado == IncidentStatus.completed,
            actual: paso == estado && estado.activo,
            ultimo: paso == pasos.last,
          ),
      ],
    );
  }
}

class _Paso extends StatelessWidget {
  const _Paso({
    required this.paso,
    required this.hecho,
    required this.actual,
    required this.ultimo,
  });

  final IncidentStatus paso;
  final bool hecho;
  final bool actual;
  final bool ultimo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final pendiente = !hecho && !actual;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: hecho
                        ? AppColors.mint
                        : actual
                        ? colorDeEstado(paso)
                        : Colors.transparent,
                    border: pendiente
                        ? Border.all(color: scheme.outline, width: 2)
                        : null,
                  ),
                  child: hecho
                      ? const Icon(
                          Icons.check,
                          size: 16,
                          color: AppColors.night,
                        )
                      : null,
                ),
                if (!ultimo)
                  Expanded(
                    child: Container(
                      width: 2,
                      constraints: const BoxConstraints(minHeight: 14),
                      color: hecho ? AppColors.mint : scheme.outlineVariant,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: ultimo ? 0 : 14, top: 1),
              child: Semantics(
                value: actual
                    ? 'estado actual'
                    : hecho
                    ? 'completado'
                    : 'pendiente',
                child: Text(
                  paso.etiqueta,
                  style: theme.textTheme.bodyLarge
                      ?.conPeso(actual ? FontWeight.w800 : FontWeight.w500)
                      .copyWith(
                        color: pendiente ? scheme.onSurfaceVariant : null,
                      ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
