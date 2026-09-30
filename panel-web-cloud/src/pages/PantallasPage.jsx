import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pantallasApi } from '../api/resources';
import { useSocket } from '../context/SocketContext';
import EstadoBadge from '../components/EstadoBadge';
import Modal from '../components/Modal';

function formatFecha(iso) {
  if (!iso) return 'Nunca';
  return new Date(iso).toLocaleString();
}

export default function PantallasPage() {
  const { socket } = useSocket();
  const [pantallas, setPantallas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalEmparejar, setModalEmparejar] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await pantallasApi.listar();
      setPantallas(data);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    const onActualizada = (pantalla) => {
      setPantallas((prev) => {
        const existe = prev.some((p) => p.id === pantalla.id);
        if (existe) return prev.map((p) => (p.id === pantalla.id ? pantalla : p));
        return [pantalla, ...prev];
      });
    };
    const onEliminada = ({ id }) => {
      setPantallas((prev) => prev.filter((p) => p.id !== id));
    };

    socket.on('pantalla:actualizada', onActualizada);
    socket.on('pantalla:eliminada', onEliminada);
    return () => {
      socket.off('pantalla:actualizada', onActualizada);
      socket.off('pantalla:eliminada', onEliminada);
    };
  }, [socket]);

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta pantalla? Se borraran tambien sus programaciones.')) return;
    await pantallasApi.eliminar(id);
    setPantallas((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Pantallas</h1>
          <p className="text-slate-400 text-sm">
            Cada tarjeta es una Smart TV. Click en una para asignarle contenido y programar
            horarios. El punto verde/gris indica si esta conectada ahora mismo.
          </p>
        </div>
        <button
          onClick={() => setModalEmparejar(true)}
          className="shrink-0 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
        >
          + Emparejar pantalla
        </button>
      </div>

      {cargando ? (
        <p className="text-slate-400 mt-6">Cargando...</p>
      ) : pantallas.length === 0 ? (
        <div className="mt-6 bg-slate-800/60 border border-dashed border-slate-700 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-2">📺</div>
          <p className="text-slate-300 font-medium">Aun no hay pantallas</p>
          <p className="text-slate-500 text-sm mt-1">
            Abre la app en una Android TV: va a mostrar un codigo de 4 letras. Usa el botón
            "+ Emparejar pantalla" e ingresa ese codigo para vincularla.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {pantallas.map((p) => (
            <Link
              key={p.id}
              to={`/pantallas/${p.id}`}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-600/10 transition block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📺</span>
                  <div>
                    <h3 className="text-white font-semibold">{p.nombre}</h3>
                    {p.ubicacion && <p className="text-slate-400 text-sm">{p.ubicacion}</p>}
                  </div>
                </div>
                <EstadoBadge estado={p.estado} />
              </div>
              <p className="text-xs text-slate-500">Ultima conexion: {formatFecha(p.ultima_conexion)}</p>
              <div className="flex justify-end mt-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    eliminar(p.id);
                  }}
                  className="text-xs font-medium text-red-400 hover:text-red-300 transition"
                >
                  Eliminar
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modalEmparejar && (
        <EmparejarModal
          onClose={() => setModalEmparejar(false)}
          onEmparejada={() => {
            setModalEmparejar(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function EmparejarModal({ onClose, onEmparejada }) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await pantallasApi.emparejarConfirmar(codigo, nombre, ubicacion);
      onEmparejada();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo emparejar la pantalla');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal titulo="Emparejar pantalla" onClose={onClose}>
      <p className="text-sm text-slate-400 mb-4">
        Abre la app en la Android TV: va a mostrar un codigo de 4 caracteres. Ingresalo aqui junto con un nombre
        para identificarla.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Codigo mostrado en la TV</label>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white tracking-widest text-center text-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Nombre (ej. "Entrada")</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Ubicacion (opcional)</label>
          <input
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="Ej. Caja 1, Pasillo lacteos..."
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
        >
          {cargando ? 'Emparejando...' : 'Emparejar'}
        </button>
      </form>
    </Modal>
  );
}
