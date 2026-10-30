import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mock_store.dart';
import '../rutas.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import '../widgets/pulse_rings.dart';

class BuscandoScreen extends StatefulWidget {
  const BuscandoScreen({super.key, required this.reporteId});

  final String reporteId;

  @override
  State<BuscandoScreen> createState() => _BuscandoScreenState();
}

class _BuscandoScreenState extends State<BuscandoScreen> {
  static const _paso = Duration(seconds: 3);

  Timer? _simulacion;

  @override
  void initState() {
    super.initState();
    _iniciarSimulacion();
  }

  @override
  void dispose() {
    _simulacion?.cancel();
    super.dispose();
  }

  void _iniciarSimulacion() {
    _simulacion = Timer.periodic(_paso, (_) {
      mockStore.avanzarEstado(widget.reporteId);
      final reporte = mockStore.buscarReporte(widget.reporteId);
      if (reporte == null) {
        context.go(Rutas.home);
      } else if (!reporte.estado.buscando) {
        context.go(Rutas.seguimiento(reporte.id));
      }
    });
  }

  Future<void> _cancelar() async {
    _simulacion?.cancel();
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Cancelar el reporte?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Seguir buscando'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sí, cancelar'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (confirmado != true) {
      _iniciarSimulacion();
      return;
    }
    mockStore.cancelarReporte(widget.reporteId);
    context.go(Rutas.home);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const PulseRings(
                          color: AppColors.amber,
                          size: 220,
                          child: Icon(
                            Icons.airport_shuttle,
                            size: 64,
                            color: AppColors.amber,
                          ),
                        ),
                        const SizedBox(height: 24),
                        ListenableBuilder(
                          listenable: mockStore,
                          builder: (context, _) {
                            final etiqueta =
                                mockStore
                                    .buscarReporte(widget.reporteId)
                                    ?.estado
                                    .etiqueta ??
                                '';
                            return AnimatedSwitcher(
                              duration: const Duration(milliseconds: 300),
                              child: Text(
                                etiqueta,
                                key: ValueKey(etiqueta),
                                textAlign: TextAlign.center,
                                style: theme.textTheme.headlineMedium?.conPeso(
                                  FontWeight.w600,
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              OutlinedButton(
                onPressed: _cancelar,
                child: const Text('Cancelar reporte'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
