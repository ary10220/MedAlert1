import 'dart:io';

import 'package:flutter/material.dart';

import '../models/incident.dart';

class IncidentPhoto extends StatelessWidget {
  const IncidentPhoto({super.key, required this.reporte});

  final Incident reporte;

  @override
  Widget build(BuildContext context) {
    Widget sinFoto(BuildContext _, Object _, StackTrace? _) => const _SinFoto();

    final local = reporte.fotoLocal;
    if (local != null) {
      return Image.file(
        File(local),
        fit: BoxFit.cover,
        semanticLabel: 'Foto del accidente',
        errorBuilder: sinFoto,
      );
    }
    final url = reporte.fotoUrl;
    if (url != null) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        semanticLabel: 'Foto del accidente',
        errorBuilder: sinFoto,
        loadingBuilder: (context, child, progreso) =>
            progreso == null ? child : const _SinFoto(),
      );
    }
    return const _SinFoto();
  }
}

class _SinFoto extends StatelessWidget {
  const _SinFoto();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ColoredBox(
      color: scheme.surfaceContainerHigh,
      child: Center(
        child: Icon(
          Icons.image_outlined,
          color: scheme.onSurfaceVariant,
          size: 28,
        ),
      ),
    );
  }
}
