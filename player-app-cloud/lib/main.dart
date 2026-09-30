import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'config/app_config.dart';
import 'config/supabase_config.dart';
import 'screens/pairing_screen.dart';
import 'screens/player_screen.dart';

void main() {
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();

    // Modo kiosco: pantalla completa, sin barras de sistema, apaisado.
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);

    WakelockPlus.enable();

    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      debugPrint('[FlutterError] ${details.exceptionAsString()}');
    };

    Supabase.initialize(url: SupabaseConfig.url, publishableKey: SupabaseConfig.publishableKey).then((_) {
      runApp(const SignageApp());
    });
  }, (error, stack) {
    debugPrint('[UncaughtError] $error');
  });
}

class SignageApp extends StatelessWidget {
  const SignageApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '58 Market TV',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true),
      home: const RootFlow(),
    );
  }
}

enum _Etapa { cargando, emparejamiento, reproduccion }

/// Decide que pantalla mostrar segun el estado guardado localmente:
/// 1) pantalla no emparejada -> PairingScreen
/// 2) pantalla emparejada -> PlayerScreen
class RootFlow extends StatefulWidget {
  const RootFlow({super.key});

  @override
  State<RootFlow> createState() => _RootFlowState();
}

class _RootFlowState extends State<RootFlow> {
  _Etapa _etapa = _Etapa.cargando;
  String? _pantallaId;

  @override
  void initState() {
    super.initState();
    _resolverEstado();
  }

  Future<void> _resolverEstado() async {
    final emparejada = await AppConfig.getEmparejada();
    final pantallaId = await AppConfig.getPantallaId();

    if (emparejada && pantallaId != null) {
      setState(() {
        _pantallaId = pantallaId;
        _etapa = _Etapa.reproduccion;
      });
    } else {
      setState(() => _etapa = _Etapa.emparejamiento);
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_etapa) {
      case _Etapa.cargando:
        return const ColoredBox(color: Colors.black);
      case _Etapa.emparejamiento:
        return PairingScreen(onEmparejada: _resolverEstado);
      case _Etapa.reproduccion:
        return PlayerScreen(pantallaId: _pantallaId!);
    }
  }
}
