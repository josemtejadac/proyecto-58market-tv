import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'config/app_config.dart';
import 'screens/setup_screen.dart';
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

    runApp(const SignageApp());
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

enum _Etapa { cargando, setup, emparejamiento, reproduccion }

/// Decide que pantalla mostrar segun el estado guardado localmente:
/// 1) sin servidor configurado -> SetupScreen
/// 2) servidor configurado pero pantalla no emparejada -> PairingScreen
/// 3) pantalla emparejada -> PlayerScreen
class RootFlow extends StatefulWidget {
  const RootFlow({super.key});

  @override
  State<RootFlow> createState() => _RootFlowState();
}

class _RootFlowState extends State<RootFlow> {
  _Etapa _etapa = _Etapa.cargando;
  String? _serverUrl;
  String? _pantallaId;

  @override
  void initState() {
    super.initState();
    _resolverEstado();
  }

  Future<void> _resolverEstado() async {
    final serverUrl = await AppConfig.getServerUrl();
    if (serverUrl == null || serverUrl.isEmpty) {
      setState(() => _etapa = _Etapa.setup);
      return;
    }

    final emparejada = await AppConfig.getEmparejada();
    final pantallaId = await AppConfig.getPantallaId();

    if (emparejada && pantallaId != null) {
      setState(() {
        _serverUrl = serverUrl;
        _pantallaId = pantallaId;
        _etapa = _Etapa.reproduccion;
      });
    } else {
      setState(() {
        _serverUrl = serverUrl;
        _etapa = _Etapa.emparejamiento;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_etapa) {
      case _Etapa.cargando:
        return const ColoredBox(color: Colors.black);
      case _Etapa.setup:
        return SetupScreen(onConfigurado: _resolverEstado);
      case _Etapa.emparejamiento:
        return PairingScreen(serverUrl: _serverUrl!, onEmparejada: _resolverEstado);
      case _Etapa.reproduccion:
        return PlayerScreen(serverUrl: _serverUrl!, pantallaId: _pantallaId!);
    }
  }
}
