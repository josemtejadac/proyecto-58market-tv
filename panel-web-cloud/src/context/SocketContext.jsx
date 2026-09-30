import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Se mantiene el nombre "SocketContext" por compatibilidad con las paginas
// existentes, pero ahora usa Supabase Realtime en vez de Socket.io.
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { autenticado } = useAuth();
  const [conectado, setConectado] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!autenticado) return undefined;

    const channel = supabase
      .channel('market58-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market58_pantallas' }, (payload) => {
        channelRef.current?.onPantalla?.(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market58_programaciones' }, (payload) => {
        channelRef.current?.onProgramacion?.(payload);
      })
      .subscribe((status) => setConectado(status === 'SUBSCRIBED'));

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [autenticado]);

  const socketApi = {
    // Compatibilidad con el codigo de las paginas: se registran callbacks
    // que el canal de arriba invoca cuando llega un cambio.
    on(event, cb) {
      if (!channelRef.current) return;
      if (event === 'pantalla:actualizada' || event === 'pantalla:eliminada') {
        channelRef.current.onPantalla = (payload) => {
          if (payload.eventType === 'DELETE' && event === 'pantalla:eliminada') {
            cb({ id: payload.old.id });
          } else if (payload.eventType !== 'DELETE' && event === 'pantalla:actualizada') {
            cb(payload.new);
          }
        };
      }
      if (event === 'preview:actualizado') {
        channelRef.current.onProgramacion = (payload) => {
          const pantallaId = payload.new?.pantalla_id || payload.old?.pantalla_id;
          if (pantallaId) cb({ pantallaId });
        };
      }
    },
    off() {
      if (channelRef.current) {
        channelRef.current.onPantalla = null;
        channelRef.current.onProgramacion = null;
      }
    },
  };

  return (
    <SocketContext.Provider value={{ socket: socketApi, conectado }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket debe usarse dentro de SocketProvider');
  return ctx;
}
