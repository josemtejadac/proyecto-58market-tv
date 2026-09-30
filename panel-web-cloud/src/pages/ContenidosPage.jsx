import { useCallback, useEffect, useRef, useState } from 'react';
import { contenidosApi } from '../api/resources';
import { publicUrl } from '../lib/supabase';

function detectarTipo(file) {
  if (file.type.startsWith('video/')) return 'video';
  return 'imagen';
}

function DuracionStepper({ valor, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-slate-900 border border-slate-600 rounded-lg px-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, valor - 1))}
        className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-brand-400 font-bold text-sm"
      >
        −
      </button>
      <span className="text-xs text-white w-9 text-center tabular-nums">{valor}s</span>
      <button
        type="button"
        onClick={() => onChange(valor + 1)}
        className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-brand-400 font-bold text-sm"
      >
        +
      </button>
    </div>
  );
}

export default function ContenidosPage() {
  const [contenidos, setContenidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState({});
  const inputRef = useRef(null);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await contenidosApi.listar();
      setContenidos(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const subirArchivos = useCallback(async (files) => {
    setSubiendo(true);
    const total = files.length;
    let hechos = 0;
    for (const file of Array.from(files)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await contenidosApi.subir(file, { nombre: file.name, tipo: detectarTipo(file), duracionSegundos: 10 });
      } catch (err) {
        window.alert(`No se pudo subir "${file.name}": ${err.response?.data?.error || err.message}`);
      }
      hechos += 1;
      setProgreso(Math.round((hechos * 100) / total));
    }
    setSubiendo(false);
    setProgreso(0);
    cargar();
  }, []);

  function onDrop(e) {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files.length > 0) subirArchivos(e.dataTransfer.files);
  }

  async function eliminar(contenido) {
    if (!window.confirm('¿Eliminar este contenido? Se quitara de las playlists que lo usen.')) return;
    await contenidosApi.eliminar(contenido.id, contenido.storage_path);
    setContenidos((prev) => prev.filter((c) => c.id !== contenido.id));
  }

  async function actualizarDuracion(c, duracion) {
    setContenidos((prev) => prev.map((x) => (x.id === c.id ? { ...x, duracion_segundos: duracion } : x)));
    setEstadoGuardado((prev) => ({ ...prev, [c.id]: 'guardando' }));
    try {
      await contenidosApi.actualizar(c.id, { duracion_segundos: duracion });
      setEstadoGuardado((prev) => ({ ...prev, [c.id]: 'guardado' }));
      setTimeout(() => {
        setEstadoGuardado((prev) => ({ ...prev, [c.id]: undefined }));
      }, 1500);
    } catch (err) {
      setEstadoGuardado((prev) => ({ ...prev, [c.id]: 'error' }));
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Contenidos</h1>
        <p className="text-slate-400 text-sm">
          Las fotos y videos que subas aqui quedan disponibles para armar tus{' '}
          <span className="text-brand-400 font-medium">Playlists</span>. Para una imagen puedes
          elegir cuantos segundos se muestra; un video se reproduce completo y pasa solo al
          siguiente.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
          arrastrando ? 'border-brand-500 bg-brand-500/10' : 'border-slate-700 hover:border-brand-500/60 hover:bg-slate-800/40'
        }`}
      >
        <div className="text-3xl mb-2">📤</div>
        <p className="text-slate-300 font-medium">Arrastra imagenes o videos aqui, o haz clic para elegir</p>
        <p className="text-slate-500 text-xs mt-1">JPG, PNG, WEBP, GIF, MP4, WEBM, MOV</p>
        {subiendo && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-brand-400 text-xs mt-1.5">Subiendo... {progreso}%</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files.length > 0 && subirArchivos(e.target.files)}
        />
      </div>

      {cargando ? (
        <p className="text-slate-400">Cargando...</p>
      ) : contenidos.length === 0 ? (
        <p className="text-slate-400 text-sm">Aun no has subido contenido.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {contenidos.map((c) => (
            <div
              key={c.id}
              className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-brand-500/50 transition"
            >
              <div className="aspect-video bg-black flex items-center justify-center">
                {c.tipo === 'video' ? (
                  <video src={publicUrl(c.storage_path)} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={publicUrl(c.storage_path)} alt={c.nombre} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm text-white truncate" title={c.nombre}>
                  {c.nombre}
                </p>
                <p className="text-xs text-slate-500 mb-2.5 capitalize flex items-center gap-1">
                  <span>{c.tipo === 'video' ? '🎬' : '🖼️'}</span> {c.tipo}
                </p>
                {c.tipo === 'imagen' && (
                  <div className="flex items-center gap-2 mb-2.5">
                    <DuracionStepper valor={c.duracion_segundos ?? 10} onChange={(v) => actualizarDuracion(c, v)} />
                    {estadoGuardado[c.id] === 'guardando' && (
                      <span className="text-xs text-slate-400">Guardando...</span>
                    )}
                    {estadoGuardado[c.id] === 'guardado' && (
                      <span className="text-xs text-brand-400">Guardado ✓</span>
                    )}
                    {estadoGuardado[c.id] === 'error' && (
                      <span className="text-xs text-red-400">Error</span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => eliminar(c)}
                  className="text-xs font-medium text-red-400 hover:text-red-300 transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
