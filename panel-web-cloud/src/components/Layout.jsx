import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const links = [
  { to: '/pantallas', label: 'Pantallas', icon: '📺', hint: 'Tus TVs y que muestran' },
  { to: '/contenidos', label: 'Contenidos', icon: '🖼️', hint: 'Fotos y videos subidos' },
  { to: '/playlists', label: 'Playlists', icon: '📑', hint: 'Listas para reproducir' },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { conectado } = useSocket();

  return (
    <div className="min-h-screen flex bg-slate-900">
      <aside className="w-64 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-700 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-brand-600/30">
            58
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Market TV</h1>
            <p className="text-xs text-slate-400">Panel de cartelera</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                    : 'text-slate-300 hover:bg-slate-700/70'
                }`
              }
              title={link.hint}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-700 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-brand-400' : 'bg-red-400'}`} />
            {conectado ? 'Conectado en tiempo real' : 'Sin conexion en tiempo real'}
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-300">{usuario?.usuario}</span>
            <button
              onClick={logout}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition"
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
