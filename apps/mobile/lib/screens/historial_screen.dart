import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/backend.dart';
import '../rutas.dart';
import '../widgets/aviso_error.dart';
import '../widgets/reporte_card.dart';

class HistorialScreen extends StatefulWidget {
  const HistorialScreen({super.key});

  @override
  State<HistorialScreen> createState() => _HistorialScreenState();
}

class _HistorialScreenState extends State<HistorialScreen> {
  late Future<void> _carga = backend.cargarReportes();

  Future<void> _recargar() {
    final carga = backend.cargarReportes();
    setState(() => _carga = carga);
    return carga.catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Mis reportes')),
      body: SafeArea(
        child: FutureBuilder<void>(
          future: _carga,
          builder: (context, carga) => ListenableBuilder(
            listenable: backend,
            builder: (context, _) {
              final reportes = backend.reportes;
              final error = carga.error;
              if (reportes.isEmpty) {
                if (carga.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: error is BackendException
                        ? Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              AvisoError(mensaje: error.mensaje),
                              const SizedBox(height: 12),
                              TextButton(
                                onPressed: _recargar,
                                child: const Text('Reintentar'),
                              ),
                            ],
                          )
                        : Text(
                            'Todavía no tenés reportes',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.titleMedium,
                          ),
                  ),
                );
              }
              return RefreshIndicator(
                onRefresh: _recargar,
                child: ListView.separated(
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
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
