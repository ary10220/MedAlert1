import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_store.dart';
import '../rutas.dart';
import '../widgets/reporte_card.dart';

class HistorialScreen extends StatelessWidget {
  const HistorialScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Mis reportes')),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: mockStore,
          builder: (context, _) {
            final reportes = mockStore.reportes;
            if (reportes.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'Todavía no tienes reportes',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleMedium,
                  ),
                ),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              itemCount: reportes.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, indice) {
                final reporte = reportes[indice];
                return ReporteCard(
                  reporte: reporte,
                  onTap: () => context.push(Rutas.paraReporte(reporte)),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
