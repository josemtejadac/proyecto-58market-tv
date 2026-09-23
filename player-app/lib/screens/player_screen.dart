import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import '../models/contenido_item.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';
import '../services/socket_service.dart';
import '../widgets/content_view.dart';

/// Pantalla principal: reproduce en loop la playlist/contenido asignado,
/// escucha actualizaciones en tiempo real por WebSocket y usa polling de
/// respaldo. Si se pierde la conexion, sigue mostrando el ultimo contenido
/// cacheado.
class PlayerScreen extends StatefulWidget {
  final String serverUrl;
  final String pantallaId;

  const PlayerScreen({super.key, required this.serverUrl, required this.pantallaId});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final ApiService _api;
  final SocketService _socket = SocketService();
  final CacheService _cache = CacheService();

  List<ContenidoItem> _items = [];
  int _index = 0;
  File? _archivoActual;
  bool _cargandoItem = false;

  Timer? _imageTimer;
  Timer? _pollTimer;
  Timer? _watchdogTimer;
  DateTime _ultimaActividad = DateTime.now();

  @override
  void initState() {
    super.initState();
    _api = ApiService(widget.serverUrl);
    _iniciar();
  }

  void _iniciar() {
    _socket.conectar(widget.serverUrl);
    _socket.onConnect(() {
      _socket.identificarPantalla(widget.pantallaId);
      _marcarActividad();
      _cargarContenidoActual();
    });
    _socket.onDisconnect(() {
      // Se sigue reproduciendo lo que ya esta cacheado; socket.io reintenta solo.
    });
    _socket.onContenidoActualizado((data) {
      _marcarActividad();
      _aplicarContenido(data);
    });

    _cargarContenidoActual();

    // Respaldo por si el socket se pierde un evento: refresca cada 60s.
    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) => _cargarContenidoActual());

    // Si no hay actividad de red en 5 minutos, fuerza un refresco manual.
    _watchdogTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      final inactivo = DateTime.now().difference(_ultimaActividad);
      if (inactivo > const Duration(minutes: 5)) {
        _cargarContenidoActual();
      }
    });
  }

  void _marcarActividad() {
    _ultimaActividad = DateTime.now();
  }

  Future<void> _cargarContenidoActual() async {
    try {
      final actual = await _api.contenidoActual(widget.pantallaId);
      _marcarActividad();
      _setItems(actual.items);
    } catch (_) {
      // Sin conexion: seguimos con lo que ya tenemos cacheado en memoria.
    }
  }

  void _aplicarContenido(dynamic data) {
    try {
      final map = Map<String, dynamic>.from(data as Map);
      final itemsJson = (map['items'] as List?) ?? [];
      final items = itemsJson
          .map((e) => ContenidoItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      _setItems(items);
    } catch (_) {
      // payload inesperado, ignorar
    }
  }

  void _setItems(List<ContenidoItem> nuevos) {
    final mismosIds = nuevos.length == _items.length &&
        nuevos.asMap().entries.every((e) => e.value.id == _items[e.key].id);
    if (mismosIds) return;

    _items = nuevos;
    _index = 0;
    _cache.precargarTodos(widget.serverUrl, _items);
    _cache.limpiarNoUsados(_items);
    _mostrarActual();
  }

  Future<void> _mostrarActual() async {
    _imageTimer?.cancel();

    if (_items.isEmpty) {
      setState(() => _archivoActual = null);
      return;
    }

    setState(() => _cargandoItem = true);
    final item = _items[_index];
    final file = await _cache.ensureCached(widget.serverUrl, item);

    if (!mounted) return;

    if (file == null) {
      // No se pudo cachear ni hay copia previa: saltar al siguiente en 3s.
      setState(() {
        _cargandoItem = false;
        _archivoActual = null;
      });
      Future.delayed(const Duration(seconds: 3), _siguiente);
      return;
    }

    setState(() {
      _cargandoItem = false;
      _archivoActual = file;
    });

    if (item.tipo == 'imagen') {
      _imageTimer = Timer(Duration(seconds: item.duracionSegundos.clamp(1, 3600)), _siguiente);
    }
    // Los videos avanzan solos via ContentView.onFinished al terminar.
  }

  void _siguiente() {
    if (_items.isEmpty) return;
    _index = (_index + 1) % _items.length;
    _mostrarActual();
  }

  @override
  void dispose() {
    _imageTimer?.cancel();
    _pollTimer?.cancel();
    _watchdogTimer?.cancel();
    _socket.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) {
      return const _PantallaInactiva();
    }

    if (_cargandoItem && _archivoActual == null) {
      return const ColoredBox(color: Colors.black);
    }

    if (_archivoActual == null) {
      return const _PantallaInactiva();
    }

    final item = _items[_index];

    return ContentView(
      key: ValueKey('${item.id}-$_index'),
      file: _archivoActual!,
      tipo: item.tipo,
      onFinished: _siguiente,
      onError: _siguiente,
    );
  }
}

class _PantallaInactiva extends StatelessWidget {
  const _PantallaInactiva();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Colors.black,
      child: Center(
        child: Text(
          '58 Market TV',
          style: TextStyle(color: Colors.white24, fontSize: 28, fontWeight: FontWeight.w300),
        ),
      ),
    );
  }
}
