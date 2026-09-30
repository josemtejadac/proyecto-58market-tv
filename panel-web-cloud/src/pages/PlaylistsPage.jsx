import { useEffect, useState } from 'react';
import { playlistsApi, contenidosApi } from '../api/resources';
import { publicUrl } from '../lib/supabase';
import Modal from '../components/Modal';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState(null);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await playlistsApi.listar();
      setPlaylists(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function abrirEdicion(p) {
    const { data } = await playlistsApi.obtener(p.id);
    setEditando(data);
    setModalForm(true);
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta playlist? Las programaciones que la usen dejaran de funcionar.')) return;
    await playlistsApi.eliminar(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Playlists</h1>
          <p className="text-slate-400 text-sm">
            Una playlist es un grupo de fotos/videos que se reproducen uno tras otro, en loop,
            en la pantalla que quieras. Armas la playlist aqui, y despues la asignas a una TV
            desde "Pantallas".
          </p>
        </div>
        <button
          onClick={() => {
            setEditando(null);
            setModalForm(true);
          }}
          className="shrink-0 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
        >
          + Nueva playlist
        </button>
      </div>

      {cargando ? (
        <p className="text-slate-400 mt-6">Cargando...</p>
      ) : playlists.length === 0 ? (
        <div className="mt-6 bg-slate-800/60 border border-dashed border-slate-700 rounded-2xl p-8 text-center">
          <p className="text-slate-300 font-medium">Aun no tienes playlists</p>
          <p className="text-slate-500 text-sm mt-1">
            Crea una con "+ Nueva playlist" y elige que fotos/videos va a mostrar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {playlists.map((p) => (
            <div
              key={p.id}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-brand-500/60 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span className="text-lg">📑</span> {p.nombre}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Creada: {new Date(p.creado_en).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => abrirEdicion(p)}
                  className="text-xs font-medium bg-slate-700 hover:bg-brand-600 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminar(p.id)}
                  className="text-xs font-medium bg-slate-700 hover:bg-red-600/80 text-red-300 hover:text-white px-3 py-1.5 rounded-lg transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalForm && (
        <PlaylistModal
          playlist={editando}
          onClose={() => setModalForm(false)}
          onGuardada={() => {
            setModalForm(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function Miniatura({ contenido }) {
  if (!contenido.storage_path) {
    return <div className="w-10 h-10 rounded-lg bg-slate-700 shrink-0" />;
  }
  const url = publicUrl(contenido.storage_path);
  if (contenido.tipo === 'video') {
    return (
      <video
        src={url}
        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-black"
        muted
      />
    );
  }
  return <img src={url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white" />;
}

function DuracionStepper({ valor, onChange }) {
  return (
    <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-slate-600 rounded-lg px-1">
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onChange(Math.max(1, valor - 1));
        }}
        className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-brand-400 font-bold"
      >
        −
      </button>
      <span className="text-xs text-white w-9 text-center tabular-nums">{valor}s</span>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onChange(valor + 1);
        }}
        className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-brand-400 font-bold"
      >
        +
      </button>
    </div>
  );
}

function PlaylistModal({ playlist, onClose, onGuardada }) {
  const [nombre, setNombre] = useState(playlist?.nombre || '');
  const [disponibles, setDisponibles] = useState([]);
  const [seleccionados, setSeleccionados] = useState(playlist?.items || []);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [guardandoDuracion, setGuardandoDuracion] = useState({});

  useEffect(() => {
    contenidosApi.listar().then(({ data }) => setDisponibles(data));
  }, []);

  function agregar(contenido) {
    if (seleccionados.some((s) => s.id === contenido.id)) return;
    setSeleccionados((prev) => [...prev, contenido]);
  }

  function quitar(contenidoId) {
    setSeleccionados((prev) => prev.filter((s) => s.id !== contenidoId));
  }

  function onDragStart(idx) {
    setDragIdx(idx);
  }

  function onDragOver(idx, e) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setSeleccionados((prev) => {
      const copia = [...prev];
      const [movido] = copia.splice(dragIdx, 1);
      copia.splice(idx, 0, movido);
      return copia;
    });
    setDragIdx(idx);
  }

  async function actualizarDuracion(contenido, duracion) {
    setSeleccionados((prev) => prev.map((s) => (s.id === contenido.id ? { ...s, duracion_segundos: duracion } : s)));
    setGuardandoDuracion((prev) => ({ ...prev, [contenido.id]: true }));
    try {
      await contenidosApi.actualizar(contenido.id, { duracion_segundos: duracion });
    } finally {
      setGuardandoDuracion((prev) => ({ ...prev, [contenido.id]: false }));
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setGuardando(true);
    const payload = { nombre, contenido_ids: seleccionados.map((s) => s.id) };
    try {
      if (playlist) {
        await playlistsApi.actualizar(playlist.id, payload);
      } else {
        await playlistsApi.crear(payload);
      }
      onGuardada();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la playlist');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={playlist ? 'Editar playlist' : 'Nueva playlist'} onClose={onClose} ancho="max-w-3xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Promociones de la semana"
            className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-300 mb-1 font-medium">Contenidos disponibles</p>
            <p className="text-xs text-slate-500 mb-2">Click en uno para agregarlo a la playlist →</p>
            <div className="h-72 overflow-y-auto border border-slate-700 rounded-xl divide-y divide-slate-700/80 bg-slate-900/40">
              {disponibles.length === 0 && (
                <p className="text-xs text-slate-500 p-3">
                  Sube fotos/videos primero desde "Contenidos".
                </p>
              )}
              {disponibles.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => agregar(c)}
                  disabled={seleccionados.some((s) => s.id === c.id)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/70 flex items-center gap-2.5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <Miniatura contenido={c} />
                  <span className="truncate flex-1">{c.nombre}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500 shrink-0">{c.tipo}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-300 mb-1 font-medium">
              En la playlist ({seleccionados.length})
            </p>
            <p className="text-xs text-slate-500 mb-2">Arrastra para cambiar el orden de reproduccion</p>
            <div className="h-72 overflow-y-auto border border-slate-700 rounded-xl divide-y divide-slate-700/80 bg-slate-900/40">
              {seleccionados.length === 0 && (
                <p className="text-xs text-slate-500 p-3">Selecciona contenidos de la izquierda</p>
              )}
              {seleccionados.map((c, idx) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(idx, e)}
                  onDragEnd={() => setDragIdx(null)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 bg-slate-800/80 hover:bg-slate-800 cursor-move border-l-2 border-transparent hover:border-brand-500 transition"
                >
                  <span className="text-slate-500 text-xs w-4 text-center shrink-0">{idx + 1}</span>
                  <Miniatura contenido={c} />
                  <span className="truncate flex-1">{c.nombre}</span>
                  {c.tipo === 'imagen' && (
                    <DuracionStepper
                      valor={c.duracion_segundos ?? 10}
                      onChange={(v) => actualizarDuracion(c, v)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => quitar(c.id)}
                    className="text-red-400 hover:text-red-300 text-xs shrink-0 px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </Modal>
  );
}
