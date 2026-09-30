import 'package:shared_preferences/shared_preferences.dart';

/// Datos de emparejamiento de esta pantalla, persistidos en el dispositivo.
class AppConfig {
  static const _keyPantallaId = 'pantalla_id';
  static const _keyCodigo = 'pantalla_codigo';
  static const _keyEmparejada = 'pantalla_emparejada';

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

  static Future<void> reiniciarEmparejamiento() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyPantallaId);
    await prefs.remove(_keyCodigo);
    await prefs.remove(_keyEmparejada);
  }
}
