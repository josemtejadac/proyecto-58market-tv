import 'package:shared_preferences/shared_preferences.dart';

/// Configuracion persistida en el dispositivo: URL del backend y datos
/// de emparejamiento de esta pantalla.
class AppConfig {
  static const _keyServerUrl = 'server_url';
  static const _keyPantallaId = 'pantalla_id';
  static const _keyCodigo = 'pantalla_codigo';
  static const _keyEmparejada = 'pantalla_emparejada';

  static Future<String?> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyServerUrl);
  }

  static Future<void> setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    final limpio = url.trim().replaceAll(RegExp(r'/+$'), '');
    await prefs.setString(_keyServerUrl, limpio);
  }

  static Future<String?> getPantallaId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyPantallaId);
  }

  static Future<String?> getCodigo() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyCodigo);
  }

  static Future<bool> getEmparejada() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyEmparejada) ?? false;
  }

  static Future<void> guardarPendiente(String pantallaId, String codigo) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyPantallaId, pantallaId);
    await prefs.setString(_keyCodigo, codigo);
    await prefs.setBool(_keyEmparejada, false);
  }

  static Future<void> marcarEmparejada() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyEmparejada, true);
  }

  /// Borra todo (util si se quiere volver a emparejar la TV desde cero).
  static Future<void> reiniciarEmparejamiento() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyPantallaId);
    await prefs.remove(_keyCodigo);
    await prefs.remove(_keyEmparejada);
  }
}
