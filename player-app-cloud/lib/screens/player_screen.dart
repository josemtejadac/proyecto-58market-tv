import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/contenido_item.dart';
import '../services/cache_service.dart';
import '../services/pairing_service.dart';
import '../services/schedule_service.dart';
import '../widgets/content_view.dart';

/// Pantalla principal: reproduce en loop la playlist/contenido asignado,
/// escucha cambios en tiempo real via Supabase Realtime y usa polling de
/// respaldo. Si se pierde la conexion, sigue mostrando el ultimo contenido
/// cacheado.
class PlayerScreen extends StatefulWidget {
  final String pantallaId;

  const PlayerScreen({super.key, required this.pantallaId});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  final ScheduleService _schedule = ScheduleService();
  final PairingService _pairing = PairingService();
  final CacheService _cache = CacheService();

  List<ContenidoItem> _items = [];
  int _index = 0;
  File? _archivoActual;
  bool _cargandoItem = false;

  Timer? _imageTimer;
  Timer? _pollTimer;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _iniciar();
  }

  void _iniciar() {
    _pairing.actualizarEstado(widget.pantallaId, estado: 'online');

    _channel = _pairing.suscribirProgramaciones(widget.pantallaId, _cargarContenidoActual);

    _cargarContenidoActual();

    // Respaldo por si se pierde un evento de realtime: refresca cada 60s.
    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      _cargarContenidoActual();
      _pairing.actualizarEstado(widget.pantallaId, estado: 'online');
    });
  }

  Future<void> _cargarContenidoActual() async {
    try {
      final actual = await _schedule.obtenerContenidoActual(widget.pantallaId);
      _setItems(actual.items);
    } catch (_) {
      // Sin conexion: seguimos con lo que ya tenemos cacheado en memoria.
    }
  }

  void _setItems(List<ContenidoItem> nuevos) {
    final mismosIds = nuevos.length == _items.length &&
        nuevos.asMap().entries.every((e) => e.value.id == _items[e.key].id);
    if (mismosIds) return;

    _items = nuevos;
    _index = 0;
    _cache.precargarTodos(_items);
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
    final file = await _cache.ensureCached(item);

    if (!mounted) return;

    if (file == null) {
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
    if (_channel != null) _pairing.cerrarCanal(_channel!);
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
