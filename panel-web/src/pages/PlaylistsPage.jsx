import { useEffect, useState } from 'react';
import { playlistsApi, contenidosApi } from '../api/resources';
import { getApiUrl } from '../config';
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Playlists</h1>
          <p className="text-slate-400 text-sm">Listas ordenadas de contenidos para reproducir en loop</p>
        </div>
        <button
          onClick={() => {
            setEditando(null);
            setModalForm(true);
          }}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Nueva playlist
        </button>
      </div>

      {cargando ? (
        <p className="text-slate-400">Cargando...</p>
      ) : playlists.length === 0 ? (
        <p className="text-slate-400 text-sm">Aun no hay playlists.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playlists.map((p) => (
            <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">{p.nombre}</h3>
                <div className="flex gap-2">
                  <button onClick={() => abrirEdicion(p)} className="text-xs text-slate-300 hover:text-white">
                    Editar
                  </button>
                  <button onClick={() => eliminar(p.id)} className="text-xs text-red-400 hover:text-red-300">
                    Eliminar
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">Creada: {new Date(p.creado_en).toLocaleDateString()}</p>
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

function PlaylistModal({ playlist, onClose, onGuardada }) {
  const [nombre, setNombre] = useState(playlist?.nombre || '');
  const [disponibles, setDisponibles] = useState([]);
  const [seleccionados, setSeleccionados] = useState(playlist?.items || []);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

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
    <Modal titulo={playlist ? 'Editar playlist' : 'Nueva playlist'} onClose={onClose} ancho="max-w-2xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-300 mb-2">Contenidos disponibles</p>
            <div className="h-64 overflow-y-auto border border-slate-700 rounded-lg divide-y divide-slate-700">
              {disponibles.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => agregar(c)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                >
                  <span className="truncate">{c.nombre}</span>
                  <span className="text-xs text-slate-500 capitalize">{c.tipo}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-300 mb-2">
              En la playlist ({seleccionados.length}) — arrastra para ordenar
            </p>
            <div className="h-64 overflow-y-auto border border-slate-700 rounded-lg divide-y divide-slate-700">
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
                  className="flex items-center justify-between px-3 py-2 text-sm text-slate-200 bg-slate-800 cursor-move"
                >
                  <span className="truncate">
                    {idx + 1}. {c.nombre}
                  </span>
                  <button type="button" onClick={() => quitar(c.id)} className="text-red-400 hover:text-red-300 text-xs">
                    Quitar
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
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </Modal>
  );
}
