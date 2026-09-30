import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(usuario, password);
      navigate('/pantallas');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesion');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl shadow-2xl shadow-black/50 p-8 border border-slate-700">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-brand-600/30">
            58
          </div>
          <h1 className="text-2xl font-bold text-white">Market TV</h1>
        </div>
        <p className="text-slate-400 mb-6">Ingresa a tu panel de cartelera</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Usuario</label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
