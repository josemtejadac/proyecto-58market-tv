import { useCallback, useEffect, useRef, useState } from 'react';
import { contenidosApi } from '../api/resources';
import { getApiUrl } from '../config';

export default function ContenidosPage() {
  const [contenidos, setContenidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
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
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('nombre', file.name);
      try {
        // eslint-disable-next-line no-await-in-loop
        await contenidosApi.subir(formData, (evt) => {
          setProgreso(Math.round((evt.loaded * 100) / evt.total));
        });
      } catch (err) {
        window.alert(`No se pudo subir "${file.name}": ${err.response?.data?.error || err.message}`);
      }
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

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este contenido? Se quitara de las playlists que lo usen.')) return;
    await contenidosApi.eliminar(id);
    setContenidos((prev) => prev.filter((c) => c.id !== id));
  }

  async function actualizarDuracion(c, duracion) {
    const { data } = await contenidosApi.actualizar(c.id, { duracion_segundos: duracion });
    setContenidos((prev) => prev.map((x) => (x.id === c.id ? data : x)));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Contenidos</h1>
        <p className="text-slate-400 text-sm">Imagenes y videos disponibles para tus playlists</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          arrastrando ? 'border-brand-500 bg-brand-500/10' : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        <p className="text-slate-300 font-medium">Arrastra imagenes o videos aqui, o haz clic para elegir</p>
        <p className="text-slate-500 text-xs mt-1">JPG, PNG, WEBP, GIF, MP4, WEBM, MOV</p>
        {subiendo && <p className="text-brand-400 text-sm mt-3">Subiendo... {progreso}%</p>}
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
            <div key={c.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center">
                {c.tipo === 'video' ? (
                  <video src={`${getApiUrl()}${c.url_archivo}`} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={`${getApiUrl()}${c.url_archivo}`} alt={c.nombre} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm text-white truncate" title={c.nombre}>
                  {c.nombre}
                </p>
                <p className="text-xs text-slate-500 mb-2 capitalize">{c.tipo}</p>
                {c.tipo === 'imagen' && (
                  <div className="flex items-center gap-1 mb-2">
                    <input
                      type="number"
                      min={1}
                      defaultValue={c.duracion_segundos}
                      onBlur={(e) => actualizarDuracion(c, Number(e.target.value) || 10)}
                      className="w-16 text-xs rounded bg-slate-900 border border-slate-600 px-2 py-1 text-white"
                    />
                    <span className="text-xs text-slate-500">seg.</span>
                  </div>
                )}
                <button onClick={() => eliminar(c.id)} className="text-xs text-red-400 hover:text-red-300">
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
