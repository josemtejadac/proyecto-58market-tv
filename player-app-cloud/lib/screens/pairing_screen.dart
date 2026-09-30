import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/app_config.dart';
import '../services/pairing_service.dart';

/// Muestra el codigo de emparejamiento y espera a que el admin la vincule
/// desde el panel web. Escucha el cambio en tiempo real via Supabase
/// Realtime, con polling de respaldo cada 5s.
class PairingScreen extends StatefulWidget {
  final VoidCallback onEmparejada;

  const PairingScreen({super.key, required this.onEmparejada});

  @override
  State<PairingScreen> createState() => _PairingScreenState();
}

class _PairingScreenState extends State<PairingScreen> {
  final PairingService _pairing = PairingService();
  String? _codigo;
  String? _error;
  Timer? _pollTimer;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _inicializar();
  }

  Future<void> _inicializar() async {
    try {
      String? pantallaId = await AppConfig.getPantallaId();
      String? codigo = await AppConfig.getCodigo();

      if (pantallaId == null || codigo == null) {
        final (id, cod) = await _pairing.iniciarEmparejamiento();
        pantallaId = id;
        codigo = cod;
        await AppConfig.guardarPendiente(pantallaId, codigo);
      } else {
        final pantalla = await _pairing.obtenerPantalla(pantallaId);
        if (pantalla != null && pantalla['emparejada'] == true) {
          await AppConfig.marcarEmparejada();
          widget.onEmparejada();
          return;
        }
      }

      if (!mounted) return;
      setState(() => _codigo = codigo);

      _channel = _pairing.suscribirPantalla(pantallaId, (nueva) async {
        if (nueva['emparejada'] == true) {
          await AppConfig.marcarEmparejada();
          widget.onEmparejada();
        }
      });

      _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
        final pantalla = await _pairing.obtenerPantalla(pantallaId!);
        if (pantalla != null && pantalla['emparejada'] == true) {
          _pollTimer?.cancel();
          await AppConfig.marcarEmparejada();
          widget.onEmparejada();
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
    if (_channel != null) _pairing.cerrarCanal(_channel!);
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
