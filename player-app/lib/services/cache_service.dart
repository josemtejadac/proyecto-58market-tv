import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../models/contenido_item.dart';

/// Descarga y cachea localmente los archivos de contenido, para poder seguir
/// reproduciendo aunque se pierda la conexion con el backend.
class CacheService {
  Future<Directory> _cacheDir() async {
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/signage_cache');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  String _extension(String urlArchivo) {
    final idx = urlArchivo.lastIndexOf('.');
    return idx == -1 ? '' : urlArchivo.substring(idx);
  }

  Future<File> _localFile(ContenidoItem item) async {
    final dir = await _cacheDir();
    return File('${dir.path}/${item.id}${_extension(item.urlArchivo)}');
  }

  /// Devuelve el archivo local del contenido. Si ya esta cacheado lo reutiliza;
  /// si no, intenta descargarlo. Si la descarga falla pero existe una copia
  /// vieja, esa copia se sigue usando.
  Future<File?> ensureCached(String baseUrl, ContenidoItem item) async {
    final file = await _localFile(item);

    if (await file.exists() && await file.length() > 0) {
      // Ya esta cacheado: no volvemos a descargar (el archivo de un
      // contenido no cambia una vez subido).
      return file;
    }

    try {
      final resp = await http
          .get(Uri.parse('$baseUrl${item.urlArchivo}'))
          .timeout(const Duration(seconds: 30));
      if (resp.statusCode != 200) {
        throw Exception('HTTP ${resp.statusCode}');
      }
      final tmp = File('${file.path}.tmp');
      await tmp.writeAsBytes(resp.bodyBytes, flush: true);
      await tmp.rename(file.path);
      return file;
    } catch (e) {
      // Sin conexion o error de descarga: usamos lo que haya en cache, si hay.
      if (await file.exists() && await file.length() > 0) return file;
      return null;
    }
  }

  /// Descarga en segundo plano todos los items de una lista (no bloqueante).
  void precargarTodos(String baseUrl, List<ContenidoItem> items) {
    for (final item in items) {
      // ignore: unawaited_futures
      ensureCached(baseUrl, item);
    }
  }

  /// Elimina archivos cacheados que ya no pertenecen a ningun item vigente,
  /// para no llenar el almacenamiento de la TV con contenido viejo.
  Future<void> limpiarNoUsados(List<ContenidoItem> vigentes) async {
    try {
      final dir = await _cacheDir();
      final idsVigentes = vigentes.map((e) => e.id).toSet();
      await for (final entity in dir.list()) {
        if (entity is! File) continue;
        final nombre = entity.uri.pathSegments.last;
        final id = nombre.split('.').first;
        if (!idsVigentes.contains(id)) {
          try {
            await entity.delete();
          } catch (_) {
            // ignorar
          }
        }
      }
    } catch (_) {
      // ignorar errores de limpieza, no son criticos
    }
  }
}
