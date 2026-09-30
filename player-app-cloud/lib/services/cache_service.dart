import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../models/contenido_item.dart';

/// Descarga y cachea localmente los archivos de contenido (desde Supabase
/// Storage), para poder seguir reproduciendo aunque se pierda la conexion.
class CacheService {
  Future<Directory> _cacheDir() async {
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/signage_cache');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  String _extension(String storagePath) {
    final idx = storagePath.lastIndexOf('.');
    return idx == -1 ? '' : storagePath.substring(idx);
  }

  Future<File> _localFile(ContenidoItem item) async {
    final dir = await _cacheDir();
    return File('${dir.path}/${item.id}${_extension(item.storagePath)}');
  }

  /// Devuelve el archivo local del contenido. Si ya esta cacheado lo reutiliza;
  /// si no, intenta descargarlo. Si la descarga falla pero existe una copia
  /// vieja, esa copia se sigue usando.
  Future<File?> ensureCached(ContenidoItem item) async {
    final file = await _localFile(item);

    if (await file.exists() && await file.length() > 0) {
      return file;
    }

    try {
      final resp = await http.get(Uri.parse(item.url)).timeout(const Duration(seconds: 30));
      if (resp.statusCode != 200) {
        throw Exception('HTTP ${resp.statusCode}');
      }
      final tmp = File('${file.path}.tmp');
      await tmp.writeAsBytes(resp.bodyBytes, flush: true);
      await tmp.rename(file.path);
      return file;
    } catch (e) {
      if (await file.exists() && await file.length() > 0) return file;
      return null;
    }
  }

  void precargarTodos(List<ContenidoItem> items) {
    for (final item in items) {
      // ignore: unawaited_futures
      ensureCached(item);
    }
  }

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
