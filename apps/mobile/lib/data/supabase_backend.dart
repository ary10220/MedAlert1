import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/incident.dart';
import '../models/usuario.dart';
import 'backend.dart';

/// Contratos en docs/api-contracts.md. El testigo crea el incidente con RLS y
/// después llama a `triage-ia` y `dispatch`.
class SupabaseBackend extends Backend {
  SupabaseBackend(this._db) {
    _sesion = _db.auth.onAuthStateChange.listen((cambio) {
      if (cambio.event == AuthChangeEvent.signedOut && _usuario != null) {
        _limpiar();
        notifyListeners();
      }
    });
  }

  static const _bucket = 'incident-photos';
  static const _columnas = 'id,estado,foto_url,created_at';

  /// Respaldo de Realtime: si un evento se pierde, el estado igual se ve.
  static const _intervaloRespaldo = Duration(seconds: 15);

  final SupabaseClient _db;
  late final StreamSubscription<AuthState> _sesion;
  Usuario? _usuario;
  var _reportes = <Incident>[];
  final _canales = <String, RealtimeChannel>{};
  final _respaldos = <String, Timer>{};

  /// Fotos recién tomadas: evitan descargar lo que ya está en el teléfono.
  final _fotosLocales = <String, String>{};

  @override
  bool get modoDemo => false;

  @override
  Usuario? get usuario => _usuario;

  @override
  List<Incident> get reportes => List.unmodifiable(_reportes);

  @override
  Future<void> restaurarSesion() async {
    if (_db.auth.currentSession == null) return;
    try {
      // Si el perfil no sirve, _cargarPerfil ya cierra la sesión. Sin conexión
      // la sesión se conserva para el próximo intento.
      await _cargarPerfil();
    } on BackendException {
      return;
    }
    try {
      await cargarReportes();
    } on BackendException {
      // El historial se vuelve a pedir al abrirlo.
    }
  }

  @override
  Future<void> iniciarSesion({
    required String email,
    required String password,
  }) async {
    try {
      await _db.auth.signInWithPassword(email: email, password: password);
    } on AuthException catch (e) {
      throw BackendException(
        e.code == 'invalid_credentials'
            ? 'Correo o contraseña incorrectos'
            : _sinConexion(e) ?? 'No pudimos iniciar sesión',
      );
    } on Exception catch (e) {
      throw _traducir(e);
    }
    await _cargarPerfil();
    await cargarReportes();
  }

  @override
  Future<void> registrar({
    required Usuario usuario,
    required String password,
  }) async {
    final AuthResponse respuesta;
    try {
      // El backend crea el perfil a partir de estos datos (ver docs/mobile.md).
      respuesta = await _db.auth.signUp(
        email: usuario.email,
        password: password,
        data: {
          'rol': 'testigo',
          'nombre': usuario.nombre,
          'ci': usuario.ci,
          'telefono': usuario.telefono,
        },
      );
    } on AuthException catch (e) {
      throw BackendException(
        e.code == 'user_already_exists'
            ? 'Ya existe una cuenta con ese correo'
            : _sinConexion(e) ?? 'No pudimos crear la cuenta',
      );
    } on Exception catch (e) {
      throw _traducir(e);
    }
    if (respuesta.session == null) {
      throw const BackendException(
        'Te enviamos un correo para confirmar la cuenta. '
        'Confirmala y después iniciá sesión.',
      );
    }
    await _cargarPerfil();
  }

  @override
  Future<void> cerrarSesion() async {
    _limpiar();
    notifyListeners();
    await _db.auth.signOut();
  }

  @override
  Future<void> cargarReportes() async {
    final filas = await _intentar(
      () => _db
          .from('incidents')
          .select(_columnas)
          .order('created_at', ascending: false)
          .limit(50),
    );
    final fotos = await _urlsFirmadas([
      for (final fila in filas)
        if (fila['foto_url'] case final String ruta
            when !_fotosLocales.containsKey(fila['id']))
          ruta,
    ]);
    final anteriores = {for (final r in _reportes) r.id: r};
    _reportes = [
      for (final fila in filas)
        _desdeFila(
          fila,
          anterior: anteriores[fila['id']],
          fotoUrl: fotos[fila['foto_url']],
        ),
    ];
    notifyListeners();
  }

  @override
  Future<Incident> enviarReporte(
    EnvioReporte envio, {
    void Function(PasoEnvio paso)? alAvanzar,
  }) async {
    final uid = _db.auth.currentUser?.id;
    if (uid == null) throw const BackendException('Tu sesión expiró');

    if (envio.fotoRemota == null) {
      alAvanzar?.call(PasoEnvio.subiendoFoto);
      final extension = _extension(envio.fotoLocal);
      final ruta = '$uid/${DateTime.now().millisecondsSinceEpoch}.$extension';
      await _intentar(
        () => _db.storage
            .from(_bucket)
            .upload(
              ruta,
              File(envio.fotoLocal),
              fileOptions: FileOptions(contentType: _mime(extension)),
            ),
      );
      envio.fotoRemota = ruta;
    }

    if (envio.incidentId == null) {
      alAvanzar?.call(PasoEnvio.creandoReporte);
      final fila = await _intentar(
        () => _db
            .from('incidents')
            .insert({
              'reporter_id': uid,
              'ubicacion':
                  'SRID=4326;POINT(${envio.longitud} ${envio.latitud})',
              'foto_url': envio.fotoRemota,
            })
            .select(_columnas)
            .single(),
      );
      envio.incidentId = fila['id'] as String;
      _fotosLocales[envio.incidentId!] = envio.fotoLocal;
    }
    final id = envio.incidentId!;

    alAvanzar?.call(PasoEnvio.avisandoHospitales);
    // La IA solo sugiere y tarda hasta 30 s: no frena el aviso a hospitales.
    unawaited(
      _db.functions
          .invoke(
            'triage-ia',
            body: {'incident_id': id, 'photo_url': envio.fotoRemota},
          )
          .then<void>(
            (_) {},
            onError: (Object e) => debugPrint('triage-ia falló: $e'),
          ),
    );

    int? avisados;
    try {
      final respuesta = await _db.functions.invoke(
        'dispatch',
        body: {'incident_id': id},
      );
      avisados = (respuesta.data['hospitals'] as List?)?.length;
    } on FunctionException catch (e) {
      // Un reintento después de un despacho que sí llegó: no es un error.
      if (!_esError(e, 'already_dispatched')) throw _traducir(e);
    } on Exception catch (e) {
      throw _traducir(e);
    }

    final reporte = Incident(
      id: id,
      fecha: DateTime.now(),
      estado: IncidentStatus.searching,
      latitud: envio.latitud,
      longitud: envio.longitud,
      fotoLocal: envio.fotoLocal,
      hospitalesAvisados: avisados,
    );
    _reportes = [reporte, ..._reportes.where((r) => r.id != id)];
    notifyListeners();
    return reporte;
  }

  @override
  void seguir(String id) {
    if (_canales.containsKey(id)) return;
    _canales[id] = _db
        .channel('incidente-$id')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'incidents',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: id,
          ),
          callback: (cambio) => _alCambiar(id, cambio.newRecord),
        )
        .subscribe();
    _respaldos[id] = Timer.periodic(_intervaloRespaldo, (_) {
      unawaited(cargarDetalle(id));
    });
    unawaited(cargarDetalle(id));
  }

  @override
  void dejarDeSeguir(String id) {
    _respaldos.remove(id)?.cancel();
    final canal = _canales.remove(id);
    if (canal != null) unawaited(_db.removeChannel(canal));
  }

  @override
  Future<Incident?> cargarDetalle(String id) async {
    try {
      final respuesta = await _db.functions.invoke(
        'get-incident',
        body: {'incident_id': id},
      );
      return _actualizar(id, _desdeDetalle(id, respuesta.data as Map));
    } on FunctionException catch (e) {
      // Sin get-incident desplegada, al menos se lee el estado propio.
      if (e.status != 404 || _esError(e, 'Incident not found')) {
        debugPrint('get-incident falló: $e');
        return buscarReporte(id);
      }
    } on Exception catch (e) {
      debugPrint('get-incident falló: $e');
      return buscarReporte(id);
    }
    final fila = await _db
        .from('incidents')
        .select(_columnas)
        .eq('id', id)
        .maybeSingle();
    if (fila == null) return null;
    return _actualizar(id, _desdeFila(fila, anterior: buscarReporte(id)));
  }

  void _alCambiar(String id, Map<String, dynamic> fila) {
    final codigo = fila['estado'];
    final anterior = buscarReporte(id);
    if (codigo is! String || anterior == null) return;
    final estado = IncidentStatus.fromCode(codigo);
    if (estado == anterior.estado) return;
    _actualizar(id, anterior.copyWith(estado: estado));
    // Hospital y ambulancia llegan con el detalle, no en el evento.
    if (!estado.buscando) unawaited(cargarDetalle(id));
  }

  Incident _actualizar(String id, Incident nuevo) {
    final indice = _reportes.indexWhere((r) => r.id == id);
    _reportes = [..._reportes];
    if (indice == -1) {
      _reportes.insert(0, nuevo);
    } else {
      _reportes[indice] = nuevo;
    }
    notifyListeners();
    return nuevo;
  }

  Incident _desdeFila(
    Map<String, dynamic> fila, {
    Incident? anterior,
    String? fotoUrl,
  }) {
    final id = fila['id'] as String;
    return Incident(
      id: id,
      fecha: DateTime.parse(fila['created_at'] as String).toLocal(),
      estado: IncidentStatus.fromCode(fila['estado'] as String),
      latitud: anterior?.latitud,
      longitud: anterior?.longitud,
      fotoUrl: fotoUrl ?? anterior?.fotoUrl,
      fotoLocal: _fotosLocales[id],
      hospital: anterior?.hospital,
      ambulancia: anterior?.ambulancia,
      hospitalesAvisados: anterior?.hospitalesAvisados,
    );
  }

  Incident _desdeDetalle(String id, Map<dynamic, dynamic> datos) {
    final caso = datos['incident'] as Map;
    final hospital = datos['hospital'] as Map?;
    final ambulancia = datos['ambulance'] as Map?;
    final anterior = buscarReporte(id);
    return Incident(
      id: id,
      fecha: DateTime.parse(caso['created_at'] as String).toLocal(),
      estado: IncidentStatus.fromCode(caso['estado'] as String),
      latitud: (caso['lat'] as num?)?.toDouble(),
      longitud: (caso['lon'] as num?)?.toDouble(),
      fotoUrl: datos['photo_signed_url'] as String? ?? anterior?.fotoUrl,
      fotoLocal: _fotosLocales[id],
      hospital: hospital == null
          ? null
          : Hospital(
              nombre: hospital['nombre'] as String,
              direccion: hospital['direccion'] as String?,
              telefono: hospital['telefono_despacho'] as String?,
            ),
      ambulancia: ambulancia == null
          ? null
          : Ambulancia(
              codigo: ambulancia['codigo'] as String?,
              placa: ambulancia['placa'] as String?,
              tipo: ambulancia['tipo'] as String?,
            ),
      hospitalesAvisados: anterior?.hospitalesAvisados,
    );
  }

  Future<void> _cargarPerfil() async {
    final uid = _db.auth.currentUser!.id;
    final perfil = await _intentar(
      () => _db
          .from('profiles')
          .select('nombre,ci,telefono,rol,activo')
          .eq('id', uid)
          .maybeSingle(),
    );
    if (perfil == null) {
      await _db.auth.signOut();
      throw const PerfilPendienteException();
    }
    if (perfil['rol'] != 'testigo') {
      await _db.auth.signOut();
      throw const BackendException(
        'Esta app es para testigos. El personal del hospital usa el panel web.',
      );
    }
    if (perfil['activo'] != true) {
      await _db.auth.signOut();
      throw const BackendException(
        'Tu cuenta está suspendida. Escribí al equipo de MedAlert.',
      );
    }
    _usuario = Usuario(
      nombre: perfil['nombre'] as String,
      ci: perfil['ci'] as String,
      telefono: perfil['telefono'] as String,
      email: _db.auth.currentUser!.email ?? '',
    );
    notifyListeners();
  }

  Future<Map<String, String>> _urlsFirmadas(List<String> rutas) async {
    if (rutas.isEmpty) return {};
    try {
      final resultados = await _db.storage
          .from(_bucket)
          .createSignedUrlsResult(rutas, 3600);
      return {
        for (final r in resultados.whereType<SignedUrlSuccess>())
          r.path: r.signedUrl,
      };
    } on Exception catch (e) {
      debugPrint('No se pudieron firmar las fotos: $e');
      return {};
    }
  }

  Future<T> _intentar<T>(Future<T> Function() accion) async {
    try {
      return await accion();
    } on BackendException {
      rethrow;
    } on Exception catch (e) {
      throw _traducir(e);
    }
  }

  BackendException _traducir(Object e) {
    debugPrint('Supabase: $e');
    if (e is SocketException || e is TimeoutException) {
      return const BackendException('Sin conexión. Revisá tu internet.');
    }
    if (e is AuthException) {
      return BackendException(_sinConexion(e) ?? 'Tu sesión expiró');
    }
    if (e is FunctionException && e.status == 403) {
      return const BackendException('Tu cuenta no puede enviar reportes');
    }
    if (e is PostgrestException && e.code == '42501') {
      return const BackendException('Tu cuenta no puede enviar reportes');
    }
    return const BackendException('Algo falló en el servidor. Probá de nuevo.');
  }

  String? _sinConexion(AuthException e) =>
      e.statusCode == null ? 'Sin conexión. Revisá tu internet.' : null;

  bool _esError(FunctionException e, String error) =>
      e.details is Map && (e.details as Map)['error'] == error;

  static String _extension(String ruta) {
    final punto = ruta.lastIndexOf('.');
    final ext = punto == -1 ? '' : ruta.substring(punto + 1).toLowerCase();
    return const {'jpg', 'jpeg', 'png', 'webp'}.contains(ext) ? ext : 'jpg';
  }

  static String _mime(String extension) => switch (extension) {
    'png' => 'image/png',
    'webp' => 'image/webp',
    _ => 'image/jpeg',
  };

  void _limpiar() {
    for (final id in [..._canales.keys]) {
      dejarDeSeguir(id);
    }
    _usuario = null;
    _reportes = [];
    _fotosLocales.clear();
  }

  @override
  void dispose() {
    unawaited(_sesion.cancel());
    _limpiar();
    super.dispose();
  }
}
