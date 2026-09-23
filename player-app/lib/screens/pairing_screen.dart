import 'dart:async';
import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

/// Muestra el codigo de emparejamiento y espera a que el admin la vincule
/// desde el panel web. Hace polling de respaldo por si se pierde el evento
/// de WebSocket.
class PairingScreen extends StatefulWidget {
  final String serverUrl;
  final VoidCallback onEmparejada;

  const PairingScreen({super.key, required this.serverUrl, required this.onEmparejada});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  late final ApiService _api;
  final SocketService _socket = SocketService();
  String? _codigo;
  String? _error;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _api = ApiService(widget.serverUrl);
    _inicializar();
  }

  Future<void> _inicializar() async {
    try {
      String? pantallaId = await AppConfig.getPantallaId();
      String? codigo = await AppConfig.getCodigo();

      if (pantallaId == null || codigo == null) {
        final data = await _api.iniciarEmparejamiento();
        pantallaId = data['id'] as String;
        codigo = data['codigo_emparejamiento'] as String;
        await AppConfig.guardarPendiente(pantallaId, codigo);
      } else {
        // Puede que ya se haya emparejado mientras la app estaba apagada.
        final pantalla = await _api.obtenerPantalla(pantallaId);
        if (pantalla != null && pantalla['emparejada'] == true) {
          await AppConfig.marcarEmparejada();
          widget.onEmparejada();
          return;
        }
      }

      if (!mounted) return;
      setState(() => _codigo = codigo);

      _socket.conectar(widget.serverUrl);
      _socket.suscribirPendiente(codigo);
      _socket.onPantallaEmparejada((_) async {
        await AppConfig.marcarEmparejada();
        widget.onEmparejada();
      });

      _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
        try {
          final pantalla = await _api.obtenerPantalla(pantallaId!);
          if (pantalla != null && pantalla['emparejada'] == true) {
            _pollTimer?.cancel();
            await AppConfig.marcarEmparejada();
            widget.onEmparejada();
          }
        } catch (_) {
          // Reintenta en el siguiente ciclo
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'No se pudo iniciar el emparejamiento: $e');
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _socket.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              '58 Market TV',
              style: TextStyle(color: Colors.white70, fontSize: 22, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 32),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 48),
                child: Text(_error!, style: const TextStyle(color: Colors.redAccent), textAlign: TextAlign.center),
              )
            else if (_codigo == null)
              const CircularProgressIndicator(color: Colors.white)
            else ...[
              const Text(
                'Ingresa este codigo en el panel de administracion',
                style: TextStyle(color: Colors.white70, fontSize: 18),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1e293b),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFF2563eb), width: 2),
                ),
                child: Text(
                  _codigo!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 72,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 16,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(color: Colors.white38, strokeWidth: 2),
              ),
              const SizedBox(height: 12),
              const Text('Esperando vinculacion...', style: TextStyle(color: Colors.white38)),
            ],
          ],
        ),
      ),
    );
  }
}
