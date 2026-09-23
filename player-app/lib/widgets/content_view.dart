import 'dart:io';
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
      return Container(
        color: Colors.black,
        child: Center(
          child: AspectRatio(
            aspectRatio: controller.value.aspectRatio,
            child: VideoPlayer(controller),
          ),
        ),
      );
    }

    return Container(
      color: Colors.black,
      child: Center(
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
    );
  }
}
