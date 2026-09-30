import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../models/contenido_item.dart';

/// Descarga y cachea localmente los archivos de contenido (desde Supabase
/// Storage), para poder seguir reproduciendo aunque se pierda la conexion.
///
/// Muchas Android TV baratas tienen muy poco almacenamiento (4-8 GB en
/// total, casi lleno de fabrica). Por eso el cache tiene un tope: si se
/// pasa, se borra automaticamente lo menos usado recientemente (LRU) para
/// hacerle espacio a lo nuevo, en vez de llenar el disco del dispositivo.
class CacheService {
  static const int _maxCacheBytes = 800 * 1024 * 1024; // 800 MB

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

  Future<void> _marcarUsoReciente(File file) async {
    try {
      await file.setLastModified(DateTime.now());
    } catch (_) {
      // no critico
    }
  }

  /// Devuelve el archivo local del contenido. Si ya esta cacheado lo reutiliza;
  /// si no, intenta descargarlo. Si la descarga falla pero existe una copia
  /// vieja, esa copia se sigue usando.
  Future<File?> ensureCached(ContenidoItem item) async {
    final file = await _localFile(item);

    if (await file.exists() && await file.length() > 0) {
      await _marcarUsoReciente(file);
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
      await _liberarEspacioSiHaceFalta(mantener: file.path);
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

  /// Si el total del cache pasa el tope, borra los archivos menos usados
  /// recientemente (mas viejos primero) hasta volver a estar bajo el tope.
  /// Nunca borra [mantener] (el archivo que se acaba de descargar).
  Future<void> _liberarEspacioSiHaceFalta({String? mantener}) async {
    try {
      final dir = await _cacheDir();
      final archivos = <File>[];
      int total = 0;

      await for (final entity in dir.list()) {
        if (entity is File && !entity.path.endsWith('.tmp')) {
          archivos.add(entity);
          total += await entity.length();
        }
      }

      if (total <= _maxCacheBytes) return;

      final candidatos = archivos.where((f) => f.path != mantener).toList();
      final conFecha = await Future.wait(
        candidatos.map((f) async => MapEntry(f, (await f.stat()).modified)),
      );
      conFecha.sort((a, b) => a.value.compareTo(b.value)); // mas viejo primero

      for (final entry in conFecha) {
        if (total <= _maxCacheBytes) break;
        try {
          final tamano = await entry.key.length();
          await entry.key.delete();
          total -= tamano;
        } catch (_) {
          // seguir con el siguiente
        }
      }
    } catch (_) {
      // no critico: si falla la limpieza, seguimos funcionando igual
    }
  }
}
