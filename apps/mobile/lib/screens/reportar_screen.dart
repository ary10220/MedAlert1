import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../data/location_service.dart';
import '../data/mock_store.dart';
import '../data/photo_service.dart';
import '../data/validators.dart';
import '../rutas.dart';
import '../theme/colors.dart';

/// Entra directo a la cámara. Con la foto y el GPS listos el reporte se envía
/// solo tras una cuenta regresiva: dos toques en total (reportar y disparar).
class ReportarScreen extends StatefulWidget {
  const ReportarScreen({
    super.key,
    this.ubicacion = const LocationService(),
    this.fotos = const PhotoService(),
  });

  final LocationService ubicacion;
  final PhotoService fotos;

  @override
  State<ReportarScreen> createState() => _ReportarScreenState();
}

class _ReportarScreenState extends State<ReportarScreen> {
  static const _segundosParaEnviar = 5;

  final _formKey = GlobalKey<FormState>();
  final _direccion = TextEditingController();

  LocationResult? _gps;
  String? _foto;
  var _camaraAbierta = false;
  var _sinFoto = false;
  var _enviado = false;
  Timer? _cuenta;
  Timer? _reintentoGps;
  var _restante = _segundosParaEnviar;

  bool get _fotoResuelta => _foto != null || _sinFoto;
  bool get _gpsFallo => _gps != null && !_gps!.ok;

  @override
  void initState() {
    super.initState();
    _buscarGps();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _abrirCamara();
    });
  }

  @override
  void dispose() {
    _cuenta?.cancel();
    _reintentoGps?.cancel();
    _direccion.dispose();
    super.dispose();
  }

  Future<void> _buscarGps({bool mostrarCarga = true}) async {
    if (mostrarCarga && _gps != null) setState(() => _gps = null);
    final resultado = await widget.ubicacion.obtener();
    if (!mounted || _enviado) return;
    // La primera señal puede tardar más que el límite: se sigue intentando
    // mientras el testigo puede escribir la dirección.
    if (resultado.fallo == LocationFailure.sinSenal) {
      _reintentoGps = Timer(
        const Duration(seconds: 1),
        () => _buscarGps(mostrarCarga: false),
      );
    }
    setState(() => _gps = resultado);
    _iniciarCuentaSiCorresponde();
  }

  Future<void> _abrirCamara() async {
    _detenerCuenta();
    setState(() => _camaraAbierta = true);
    String? ruta;
    try {
      ruta = await widget.fotos.tomarFoto();
    } on PlatformException {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir la cámara')),
        );
      }
    }
    if (!mounted) return;
    setState(() {
      _camaraAbierta = false;
      if (ruta != null) {
        _foto = ruta;
        _sinFoto = false;
      }
    });
    _iniciarCuentaSiCorresponde();
  }

  void _continuarSinFoto() {
    setState(() => _sinFoto = true);
    _iniciarCuentaSiCorresponde();
  }

  void _iniciarCuentaSiCorresponde() {
    if (_cuenta != null || _enviado || !_fotoResuelta) return;
    if (_gps == null || !_gps!.ok) return;
    setState(() => _restante = _segundosParaEnviar);
    _cuenta = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_restante <= 1) {
        _enviar();
      } else {
        setState(() => _restante--);
      }
    });
  }

  void _detenerCuenta() {
    _cuenta?.cancel();
    _cuenta = null;
  }

  void _enviar() {
    if (_enviado) return;
    final ubicacion = _gps?.ok == true ? _gps!.texto : _direccion.text.trim();
    if (ubicacion.isEmpty) return;
    _enviado = true;
    _detenerCuenta();
    _reintentoGps?.cancel();
    final reporte = mockStore.crearReporte(
      ubicacion: ubicacion,
      fotoLocal: _foto,
    );
    context.go(Rutas.buscando(reporte.id));
  }

  void _enviarConDireccion() {
    if (_formKey.currentState?.validate() ?? false) _enviar();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reportar accidente')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AspectRatio(aspectRatio: 4 / 3, child: _zonaFoto()),
                const SizedBox(height: 16),
                _zonaGps(),
                const SizedBox(height: 20),
                ..._acciones(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _zonaFoto() {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: ColoredBox(
        color: scheme.surfaceContainer,
        child: _foto != null
            ? Stack(
                fit: StackFit.expand,
                children: [
                  Image.file(
                    File(_foto!),
                    fit: BoxFit.cover,
                    semanticLabel: 'Foto del accidente',
                    errorBuilder: (context, _, _) => Icon(
                      Icons.image_not_supported_outlined,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: IconButton.filledTonal(
                      tooltip: 'Repetir foto',
                      icon: const Icon(Icons.replay),
                      onPressed: _abrirCamara,
                    ),
                  ),
                ],
              )
            : _camaraAbierta
            ? const Center(child: CircularProgressIndicator())
            : Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _sinFoto
                            ? Icons.no_photography_outlined
                            : Icons.photo_camera_outlined,
                        size: 40,
                        color: scheme.onSurfaceVariant,
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _abrirCamara,
                        child: const Text('Tomar foto'),
                      ),
                      if (!_sinFoto)
                        TextButton(
                          onPressed: _continuarSinFoto,
                          child: const Text('Continuar sin foto'),
                        ),
                    ],
                  ),
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
          Expanded(child: Text(gps.texto, style: theme.textTheme.titleMedium)),
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
                LocationFailure.servicioApagado => 'El GPS está apagado',
                LocationFailure.permisoDenegado => 'Sin permiso de ubicación',
                LocationFailure.sinSenal =>
                  'Sin señal de GPS, seguimos buscando',
              }, style: theme.textTheme.titleMedium),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _direccion,
          textInputAction: TextInputAction.done,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(labelText: '¿Dónde es?'),
          validator: Validators.direccion,
        ),
        if (fallo != LocationFailure.sinSenal) ...[
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            children: [
              TextButton(
                onPressed: _buscarGps,
                child: const Text('Reintentar'),
              ),
              TextButton(
                onPressed: () => widget.ubicacion.abrirAjustes(fallo),
                child: const Text('Abrir ajustes'),
              ),
            ],
          ),
        ],
      ],
    );
  }

  List<Widget> _acciones() {
    final enCuenta = _cuenta != null;
    final String etiqueta;
    final VoidCallback? accion;
    if (enCuenta) {
      etiqueta = 'ENVIAR AHORA ($_restante)';
      accion = _enviar;
    } else if (_gpsFallo && _fotoResuelta) {
      etiqueta = 'ENVIAR';
      accion = _enviarConDireccion;
    } else if (!_fotoResuelta) {
      etiqueta = 'Falta la foto';
      accion = null;
    } else {
      etiqueta = 'Esperando GPS…';
      accion = null;
    }

    return [
      SizedBox(
        height: 68,
        child: FilledButton(
          onPressed: accion,
          child: FittedBox(fit: BoxFit.scaleDown, child: Text(etiqueta)),
        ),
      ),
      const SizedBox(height: 10),
      OutlinedButton(
        onPressed: () {
          _detenerCuenta();
          context.pop();
        },
        child: const Text('Cancelar'),
      ),
    ];
  }
}
