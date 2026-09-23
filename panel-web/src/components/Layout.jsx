import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { setApiUrl, getApiUrl } from '../config';

const links = [
  { to: '/pantallas', label: 'Pantallas', icon: '📺' },
  { to: '/contenidos', label: 'Contenidos', icon: '🖼️' },
  { to: '/playlists', label: 'Playlists', icon: '📑' },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { conectado } = useSocket();

  function cambiarServidor() {
    const nuevo = window.prompt('Nueva URL del backend', getApiUrl());
    if (nuevo) {
      setApiUrl(nuevo);
      window.location.reload();
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      <aside className="w-64 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="text-lg font-bold text-white">58 Market TV</h1>
          <p className="text-xs text-slate-400">Panel de cartelera</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-700 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-400' : 'bg-red-400'}`} />
            {conectado ? 'Conectado en tiempo real' : 'Sin conexion en tiempo real'}
          </div>
          <button onClick={cambiarServidor} className="text-xs text-slate-400 hover:text-white underline">
            Cambiar servidor
          </button>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-300">{usuario?.usuario}</span>
            <button
              onClick={logout}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
