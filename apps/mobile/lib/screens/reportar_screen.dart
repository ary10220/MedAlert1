import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../data/backend.dart';
import '../data/location_service.dart';
import '../data/photo_service.dart';
import '../rutas.dart';
import '../theme/colors.dart';
import '../widgets/aviso_error.dart';

/// "Revisá la foto" del prototipo testigo.html. Entra directo a la cámara;
/// el reporte sale cuando el testigo toca "Enviar alerta".
class ReportarScreen extends StatefulWidget {
  const ReportarScreen({super.key, this.fotos = const PhotoService()});

  final PhotoService fotos;

  @override
  State<ReportarScreen> createState() => _ReportarScreenState();
}

class _ReportarScreenState extends State<ReportarScreen> {
  LocationResult? _gps;
  String? _foto;
  var _eligiendo = false;
  Timer? _reintentoGps;

  EnvioReporte? _envio;
  PasoEnvio? _paso;
  String? _error;

  bool get _enviando => _paso != null;

  /// Con el incidente ya creado, la foto y la ubicación quedan fijas.
  bool get _reporteCreado => _envio?.incidentId != null;

  bool get _listo =>
      _foto != null && (_gps?.ok ?? false) && !_enviando && !_eligiendo;

  @override
  void initState() {
    super.initState();
    _gps = ubicacionActual.reciente;
    unawaited(_buscarGps());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(_elegirFoto(widget.fotos.tomarFoto));
    });
  }

  @override
  void dispose() {
    _reintentoGps?.cancel();
    super.dispose();
  }

  Future<void> _buscarGps() async {
    final resultado = await ubicacionActual.actualizar();
    if (!mounted || _reporteCreado) return;
    // La primera señal puede tardar más que el límite: se sigue intentando.
    if (resultado.fallo == LocationFailure.sinSenal) {
      _reintentoGps = Timer(const Duration(seconds: 1), _buscarGps);
    }
    // Una posición válida reciente vale más que un fallo nuevo.
    if (resultado.ok || !(_gps?.ok ?? false)) setState(() => _gps = resultado);
  }

  Future<void> _elegirFoto(Future<String?> Function() origen) async {
    if (_eligiendo || _enviando || _reporteCreado) return;
    setState(() => _eligiendo = true);
    String? ruta;
    try {
      ruta = await origen();
    } on PlatformException {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir la cámara')),
        );
      }
    }
    if (!mounted) return;
    setState(() {
      _eligiendo = false;
      if (ruta != null) {
        _foto = ruta;
        _error = null;
      }
    });
  }

  Future<void> _enviar() async {
    final gps = _gps;
    final foto = _foto;
    if (!_listo || gps == null || foto == null) return;
    final anterior = _envio;
    // Un envío fallido se reintenta igual, salvo que haya cambiado la foto
    // antes de crear el incidente.
    _envio = anterior != null && (anterior.fotoLocal == foto || _reporteCreado)
        ? anterior
        : EnvioReporte(
            fotoLocal: foto,
            latitud: gps.latitud!,
            longitud: gps.longitud!,
          );
    setState(() {
      _error = null;
      _paso = PasoEnvio.subiendoFoto;
    });
    try {
      final reporte = await backend.enviarReporte(
        _envio!,
        alAvanzar: (paso) {
          if (mounted) setState(() => _paso = paso);
        },
      );
      if (!mounted) return;
      _reintentoGps?.cancel();
      context.go(Rutas.seguimiento(reporte.id));
    } on BackendException catch (e) {
      if (!mounted) return;
      setState(() {
        _paso = null;
        _error = e.mensaje;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      canPop: !_enviando,
      child: Scaffold(
        appBar: AppBar(title: const Text('Revisá la foto')),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
            children: [
              Text(
                'Confirmá que muestra el lugar o la situación. Un hospital '
                'cercano la evaluará junto con tu ubicación.',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 16),
              AspectRatio(aspectRatio: 4 / 3, child: _zonaFoto()),
              const SizedBox(height: 16),
              _zonaGps(),
              if (_error != null) ...[
                const SizedBox(height: 16),
                AvisoError(mensaje: _error!),
              ],
              const SizedBox(height: 20),
              SizedBox(
                height: 64,
                child: FilledButton(
                  onPressed: _listo ? _enviar : null,
                  child: _enviando
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox.square(
                              dimension: 22,
                              child: CircularProgressIndicator(strokeWidth: 3),
                            ),
                            const SizedBox(width: 12),
                            Flexible(child: Text(_paso!.texto)),
                          ],
                        )
                      : Text(
                          _error != null && _envio != null
                              ? 'Reintentar envío'
                              : 'Enviar alerta',
                        ),
                ),
              ),
              const SizedBox(height: 10),
              if (!_reporteCreado) ...[
                OutlinedButton.icon(
                  onPressed: _enviando || _eligiendo
                      ? null
                      : () => _elegirFoto(widget.fotos.tomarFoto),
                  icon: const Icon(Icons.photo_camera_outlined),
                  label: Text(_foto == null ? 'Tomar foto' : 'Cambiar foto'),
                ),
                const SizedBox(height: 4),
                TextButton.icon(
                  onPressed: _enviando || _eligiendo
                      ? null
                      : () => _elegirFoto(widget.fotos.elegirDeGaleria),
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Elegir de la galería'),
                ),
              ],
              const SizedBox(height: 8),
              Text(
                'Compartiremos la foto solo con el equipo que atienda este '
                'reporte.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _zonaFoto() {
    final scheme = Theme.of(context).colorScheme;
    final foto = _foto;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: ColoredBox(
        color: scheme.surfaceContainer,
        child: foto != null
            ? Image.file(
                File(foto),
                fit: BoxFit.cover,
                semanticLabel: 'Foto del accidente',
                errorBuilder: (context, _, _) => Icon(
                  Icons.image_not_supported_outlined,
                  color: scheme.onSurfaceVariant,
                ),
              )
            : Center(
                child: _eligiendo
                    ? const CircularProgressIndicator()
                    : Text(
                        'La foto aparecerá aquí',
                        style: Theme.of(context).textTheme.bodyMedium
                            ?.copyWith(color: scheme.onSurfaceVariant),
                      ),
              ),
      ),
    );
  }

  Widget _zonaGps() {
    final theme = Theme.of(context);
    final gps = _gps;

    if (gps == null) {
      return Row(
        children: [
          const SizedBox.square(
            dimension: 22,
            child: CircularProgressIndicator(strokeWidth: 3),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Buscando tu ubicación…',
              style: theme.textTheme.titleMedium,
            ),
          ),
        ],
      );
    }

    if (gps.ok) {
      return Row(
        children: [
          const Icon(Icons.location_on, color: AppColors.mint),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ubicación lista', style: theme.textTheme.titleMedium),
                Text(
                  gps.texto,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    final fallo = gps.fallo!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Icon(Icons.location_off, color: AppColors.amber),
            const SizedBox(width: 12),
            Expanded(
              child: Text(switch (fallo) {
                LocationFailure.servicioApagado =>
                  'El GPS está apagado. Sin ubicación no se puede reportar.',
                LocationFailure.permisoDenegado =>
                  'Sin permiso de ubicación. Sin ubicación no se puede '
                      'reportar.',
                LocationFailure.sinSenal =>
                  'Sin señal de GPS, seguimos buscando…',
              }, style: theme.textTheme.titleMedium),
            ),
          ],
        ),
        if (fallo != LocationFailure.sinSenal)
          Wrap(
            spacing: 8,
            children: [
              TextButton(
                onPressed: _buscarGps,
                child: const Text('Reintentar'),
              ),
              TextButton(
                onPressed: () => ubicacionActual.abrirAjustes(fallo),
                child: const Text('Abrir ajustes'),
              ),
            ],
          ),
      ],
    );
  }
}
