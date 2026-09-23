import { useState } from 'react';
import { getApiUrl, setApiUrl, hasApiUrl, guessDefaultApiUrl } from '../config';

export default function ApiUrlGate({ children }) {
  const [listo, setListo] = useState(hasApiUrl());
  const [valor, setValor] = useState(getApiUrl() || guessDefaultApiUrl());
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState('');

  async function probarYGuardar(e) {
    e.preventDefault();
    setError('');
    setProbando(true);
    const limpio = valor.trim().replace(/\/+$/, '');
    try {
      const resp = await fetch(`${limpio}/api/health`);
      if (!resp.ok) throw new Error('Respuesta no OK');
      setApiUrl(limpio);
      setListo(true);
    } catch (err) {
      setError('No se pudo conectar a esa direccion. Revisa que el backend este corriendo y la IP/URL sea correcta.');
    } finally {
      setProbando(false);
    }
  }

  if (listo) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold mb-1 text-white">58 Market TV</h1>
        <p className="text-slate-400 mb-6">Configura la direccion del servidor backend</p>
        <form onSubmit={probarYGuardar} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              URL del backend (IP local o dominio de Cloudflare)
            </label>
            <input
              type="text"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="http://192.168.1.50:4000"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={probando}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition"
          >
            {probando ? 'Conectando...' : 'Conectar'}
          </button>
        </form>
      </div>
    </div>
  );
}
