// Deteccion heuristica del codec de video dentro de un archivo MP4: busca
// los identificadores (FourCC) del codec que Android suele guardar como
// texto plano dentro del contenedor, sin necesitar una libreria de video.
//
// H.264 (avc1/avc3) tiene soporte de hardware en practicamente cualquier
// Android TV, por barata/vieja que sea. VP9 (vp09/vp08) y HEVC (hvc1/hev1)
// son mas nuevos y varios chips economicos (ej. Realtek) no los soportan
// por hardware, lo que hace que el video nunca cargue en esa TV.

const MARCADORES = {
  h264: ['avc1', 'avc3'],
  hevc: ['hvc1', 'hev1'],
  vp9: ['vp09', 'vp08'],
};

export async function detectarCodecVideo(file) {
  try {
    // Con los primeros ~6MB alcanza para la gran mayoria de MP4 (el bloque
    // stsd con el codec suele estar cerca del inicio o del final; leemos
    // el archivo completo solo si es chico, para no cargar videos enormes
    // enteros en memoria solo para este chequeo).
    const limite = Math.min(file.size, 6 * 1024 * 1024);
    const buffer = await file.slice(0, limite).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let texto = '';
    for (let i = 0; i < bytes.length; i += 1) {
      texto += String.fromCharCode(bytes[i]);
    }

    for (const [codec, marcadores] of Object.entries(MARCADORES)) {
      if (marcadores.some((m) => texto.includes(m))) {
        return codec; // 'h264' | 'hevc' | 'vp9'
      }
    }
    return 'desconocido';
  } catch (err) {
    return 'desconocido';
  }
}

export const MENSAJE_CODEC_RIESGOSO = {
  vp9: 'Este video fue grabado o descargado en un formato que algunas Smart TV economicas no pueden leer — en esas pantallas simplemente nunca va a aparecer (se queda en negro).',
  hevc: 'Este video fue grabado o descargado en un formato que algunas Smart TV economicas no leen bien.',
};
