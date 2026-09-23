import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/contenido_item.dart';

class ApiService {
  final String baseUrl;

  ApiService(this.baseUrl);

  static Future<bool> probarConexion(String baseUrl) async {
    try {
      final limpio = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
      final resp = await http
          .get(Uri.parse('$limpio/api/health'))
          .timeout(const Duration(seconds: 5));
      return resp.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> iniciarEmparejamiento() async {
    final resp = await http
        .post(Uri.parse('$baseUrl/api/pantallas/emparejar/iniciar'))
        .timeout(const Duration(seconds: 10));
    if (resp.statusCode != 201) {
      throw Exception('No se pudo iniciar el emparejamiento (${resp.statusCode})');
    }
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> obtenerPantalla(String id) async {
    final resp = await http
        .get(Uri.parse('$baseUrl/api/pantallas/$id'))
        .timeout(const Duration(seconds: 10));
    if (resp.statusCode == 404) return null;
    if (resp.statusCode != 200) {
      throw Exception('Error obteniendo pantalla (${resp.statusCode})');
    }
    return jsonDecode(resp.body) as Map<String, dynamic>;
  }

  Future<ContenidoActual> contenidoActual(String id) async {
    final resp = await http
        .get(Uri.parse('$baseUrl/api/pantallas/$id/contenido-actual'))
        .timeout(const Duration(seconds: 10));
    if (resp.statusCode != 200) {
      throw Exception('Error obteniendo contenido actual (${resp.statusCode})');
    }
    return ContenidoActual.fromJson(jsonDecode(resp.body) as Map<String, dynamic>);
  }
}
