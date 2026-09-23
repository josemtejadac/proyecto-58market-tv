import 'dart:io';
import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

/// Muestra una imagen o reproduce un video a pantalla completa (contain,
/// fondo negro). Llama a [onFinished] cuando corresponde avanzar al
/// siguiente item (fin del video, o via timer externo para imagenes).
class ContentView extends StatefulWidget {
  final File file;
  final String tipo; // 'imagen' | 'video'
  final VoidCallback onFinished;
  final VoidCallback? onError;

  const ContentView({
    super.key,
    required this.file,
    required this.tipo,
    required this.onFinished,
    this.onError,
  });

  @override
  State<ContentView> createState() => _ContentViewState();
}

class _ContentViewState extends State<ContentView> {
  VideoPlayerController? _controller;
  bool _avanzoYa = false;

  @override
  void initState() {
    super.initState();
    if (widget.tipo == 'video') {
      _initVideo();
    }
  }

  Future<void> _initVideo() async {
    final controller = VideoPlayerController.file(widget.file);
    _controller = controller;
    try {
      await controller.initialize();
      if (!mounted) return;
      controller.addListener(_onVideoTick);
      await controller.play();
      setState(() {});
    } catch (_) {
      _avanzarUnaVez();
      widget.onError?.call();
    }
  }

  void _onVideoTick() {
    final controller = _controller;
    if (controller == null) return;
    final value = controller.value;
    if (!value.isInitialized) return;
    final terminado = value.position >= value.duration && value.duration > Duration.zero;
    if (terminado) {
      _avanzarUnaVez();
    }
  }

  void _avanzarUnaVez() {
    if (_avanzoYa) return;
    _avanzoYa = true;
    widget.onFinished();
  }

  @override
  void dispose() {
    _controller?.removeListener(_onVideoTick);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tipo == 'video') {
      final controller = _controller;
      if (controller == null || !controller.value.isInitialized) {
        return const ColoredBox(color: Colors.black);
      }
      // Nota: usar el mismo controller en dos VideoPlayer no duplica la
      // decodificacion (ambos apuntan a la misma textura), asi que el fondo
      // desenfocado no cuesta un segundo video corriendo en paralelo.
      return Container(
        color: Colors.black,
        width: double.infinity,
        height: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ImageFiltered(
              imageFilter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: controller.value.size.width,
                  height: controller.value.size.height,
                  child: VideoPlayer(controller),
                ),
              ),
            ),
            Container(color: Colors.black.withValues(alpha: 0.25)),
            Center(
              child: AspectRatio(
                aspectRatio: controller.value.aspectRatio,
                child: VideoPlayer(controller),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      color: Colors.black,
      width: double.infinity,
      height: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Fondo: la misma imagen ampliada y desenfocada, para rellenar
          // los bordes sin dejar barras negras cuando la foto es vertical.
          ImageFiltered(
            imageFilter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
            child: Image.file(
              widget.file,
              fit: BoxFit.cover,
              width: double.infinity,
              height: double.infinity,
              errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
            ),
          ),
          Container(color: Colors.black.withValues(alpha: 0.25)),
          // Primer plano: la imagen completa, sin recortar.
          Center(
            child: Image.file(
              widget.file,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _avanzarUnaVez();
                  widget.onError?.call();
                });
                return const SizedBox.shrink();
              },
            ),
          ),
        ],
      ),
    );
  }
}
