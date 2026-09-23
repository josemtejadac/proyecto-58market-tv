import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getApiUrl, hasApiUrl } from '../config';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { autenticado } = useAuth();
  const socketRef = useRef(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!autenticado || !hasApiUrl()) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const socket = io(getApiUrl(), { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConectado(true);
      socket.emit('admin:suscribir');
    });
    socket.on('disconnect', () => setConectado(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autenticado]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, conectado }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket debe usarse dentro de SocketProvider');
  return ctx;
}
