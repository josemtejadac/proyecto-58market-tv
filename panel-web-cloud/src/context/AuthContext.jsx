import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUsuario({ id: data.session.user.id, usuario: data.session.user.email.split('@')[0] });
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUsuario({ id: session.user.id, usuario: session.user.email.split('@')[0] });
      } else {
        setUsuario(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function login(usuarioNombre, password) {
    const limpio = usuarioNombre.trim().toLowerCase();
    const email = limpio.includes('@') ? limpio : `${limpio}@58market.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { response: { data: { error: 'Usuario o clave incorrectos' } } };
    return data;
  }

  async function logout() {
    await supabase.auth.signOut();
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
