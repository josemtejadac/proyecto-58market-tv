import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pantallasApi, programacionesApi, playlistsApi, contenidosApi } from '../api/resources';
import { getApiUrl } from '../config';
import { useSocket } from '../context/SocketContext';
import EstadoBadge from '../components/EstadoBadge';
import Modal from '../components/Modal';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export default function PantallaDetallePage() {
  const { id } = useParams();
  const { socket } = useSocket();
  const [pantalla, setPantalla] = useState(null);
  const [programaciones, setProgramaciones] = useState([]);
  const [preview, setPreview] = useState(null);
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState(null);

  async function cargarTodo() {
    const [{ data: p }, { data: progs }, { data: actual }] = await Promise.all([
      pantallasApi.obtener(id),
      programacionesApi.listar(id),
      pantallasApi.contenidoActual(id),
    ]);
    setPantalla(p);
    setProgramaciones(progs);
    setPreview(actual);
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!socket) return undefined;

    const onPantalla = (p) => {
      if (p.id === id) setPantalla(p);
    };
    const onPreview = (data) => {
      if (data.pantallaId === id) setPreview(data);
    };

    socket.on('pantalla:actualizada', onPantalla);
    socket.on('preview:actualizado', onPreview);
    return () => {
      socket.off('pantalla:actualizada', onPantalla);
      socket.off('preview:actualizado', onPreview);
    };
  }, [socket, id]);

  async function eliminarProgramacion(progId) {
    if (!window.confirm('¿Eliminar esta programacion?')) return;
    await programacionesApi.eliminar(progId);
    setProgramaciones((prev) => prev.filter((p) => p.id !== progId));
  }

  if (!pantalla) return <p className="text-slate-400">Cargando...</p>;

  return (
    <div>
      <Link to="/pantallas" className="text-sm text-slate-400 hover:text-white">
        ← Volver a pantallas
      </Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{pantalla.nombre}</h1>
          <p className="text-slate-400 text-sm">{pantalla.ubicacion || 'Sin ubicacion'}</p>
        </div>
        <EstadoBadge estado={pantalla.estado} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-3">Vista previa en vivo</h2>
          <PreviewBox preview={preview} />
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Programaciones</h2>
            <button
              onClick={() => {
                setEditando(null);
                setModalForm(true);
              }}
              className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg"
            >
              + Nueva
            </button>
          </div>

          {programaciones.length === 0 ? (
            <p className="text-slate-400 text-sm">Sin programaciones. Esta pantalla no muestra nada aun.</p>
          ) : (
            <ul className="space-y-2">
              {programaciones.map((prog) => (
                <li
                  key={prog.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white">{prog.nombre || '(sin nombre)'}</p>
                    <p className="text-xs text-slate-400">
                      {prog.dias_semana.map((d) => DIAS[d]).join(', ')} ·{' '}
                      {prog.hora_inicio ? prog.hora_inicio.slice(0, 5) : '00:00'}–
                      {prog.hora_fin ? prog.hora_fin.slice(0, 5) : '23:59'}
                      {!prog.activo && ' · inactiva'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditando(prog);
                        setModalForm(true);
                      }}
                      className="text-xs text-slate-300 hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarProgramacion(prog.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modalForm && (
        <ProgramacionModal
          pantallaId={id}
          programacion={editando}
          onClose={() => setModalForm(false)}
          onGuardada={() => {
            setModalForm(false);
            cargarTodo();
          }}
        />
      )}
    </div>
  );
}

function PreviewBox({ preview }) {
  if (!preview || !preview.items || preview.items.length === 0) {
    return (
      <div className="aspect-video bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-slate-500 text-sm">
        Nada programado en este momento
      </div>
    );
  }

  const item = preview.items[0];
  const url = `${getApiUrl()}${item.url_archivo}`;

  return (
    <div>
      <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        {item.tipo === 'video' ? (
          <video src={url} className="w-full h-full object-contain" controls muted autoPlay loop />
        ) : (
          <img src={url} alt={item.nombre} className="w-full h-full object-contain" />
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        {preview.items.length > 1 ? `Playlist con ${preview.items.length} elementos` : item.nombre}
      </p>
    </div>
  );
}

function ProgramacionModal({ pantallaId, programacion, onClose, onGuardada }) {
  const [playlists, setPlaylists] = useState([]);
  const [contenidos, setContenidos] = useState([]);
  const [tipoOrigen, setTipoOrigen] = useState(programacion?.playlist_id ? 'playlist' : 'contenido');
  const [origenId, setOrigenId] = useState(programacion?.playlist_id || programacion?.contenido_id || '');
  const [nombre, setNombre] = useState(programacion?.nombre || '');
  const [fechaInicio, setFechaInicio] = useState(programacion?.fecha_inicio?.slice(0, 10) || '');
  const [fechaFin, setFechaFin] = useState(programacion?.fecha_fin?.slice(0, 10) || '');
  const [horaInicio, setHoraInicio] = useState(programacion?.hora_inicio?.slice(0, 5) || '');
  const [horaFin, setHoraFin] = useState(programacion?.hora_fin?.slice(0, 5) || '');
  const [dias, setDias] = useState(programacion?.dias_semana || [0, 1, 2, 3, 4, 5, 6]);
  const [prioridad, setPrioridad] = useState(programacion?.prioridad ?? 0);
  const [activo, setActivo] = useState(programacion?.activo ?? true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    playlistsApi.listar().then(({ data }) => setPlaylists(data));
    contenidosApi.listar().then(({ data }) => setContenidos(data));
  }, []);

  function toggleDia(d) {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!origenId) {
      setError('Selecciona una playlist o un contenido');
      return;
    }
    if (dias.length === 0) {
      setError('Selecciona al menos un dia de la semana');
      return;
    }

    setGuardando(true);
    const payload = {
      pantalla_id: pantallaId,
      playlist_id: tipoOrigen === 'playlist' ? origenId : null,
      contenido_id: tipoOrigen === 'contenido' ? origenId : null,
      nombre: nombre || null,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      dias_semana: dias,
      prioridad: Number(prioridad) || 0,
      activo,
    };

    try {
      if (programacion) {
        await programacionesApi.actualizar(programacion.id, payload);
      } else {
        await programacionesApi.crear(payload);
      }
      onGuardada();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la programacion');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={programacion ? 'Editar programacion' : 'Nueva programacion'} onClose={onClose} ancho="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Nombre (opcional)</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Promocion fin de semana"
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Que mostrar</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                setTipoOrigen('playlist');
                setOrigenId('');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm ${tipoOrigen === 'playlist' ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              Playlist
            </button>
            <button
              type="button"
              onClick={() => {
                setTipoOrigen('contenido');
                setOrigenId('');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm ${tipoOrigen === 'contenido' ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              Contenido individual
            </button>
          </div>
          <select
            value={origenId}
            onChange={(e) => setOrigenId(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
            required
          >
            <option value="">Selecciona...</option>
            {(tipoOrigen === 'playlist' ? playlists : contenidos).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Fecha inicio (opcional)</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Fecha fin (opcional)</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Hora inicio (opcional)</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Hora fin (opcional)</label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">Dias de la semana</label>
          <div className="flex gap-1.5 flex-wrap">
            {DIAS.map((label, idx) => (
              <button
                type="button"
                key={label}
                onClick={() => toggleDia(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  dias.includes(idx) ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Prioridad</label>
            <input
              type="number"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 pb-2">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Activa
          </label>
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
