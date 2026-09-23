import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/resources';
import { getToken, setToken, clearToken, hasApiUrl } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargarSesion = useCallback(async () => {
    if (!hasApiUrl() || !getToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUsuario(data.usuario);
    } catch (err) {
      clearToken();
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSesion();
  }, [cargarSesion]);

  async function login(usuarioNombre, password) {
    const { data } = await authApi.login(usuarioNombre, password);
    setToken(data.token);
    setUsuario(data.usuario);
    return data;
  }

  function logout() {
    clearToken();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, autenticado: Boolean(usuario) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
