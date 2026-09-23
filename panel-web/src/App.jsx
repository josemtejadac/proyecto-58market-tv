import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ApiUrlGate from './components/ApiUrlGate';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import PantallasPage from './pages/PantallasPage';
import PantallaDetallePage from './pages/PantallaDetallePage';
import ContenidosPage from './pages/ContenidosPage';
import PlaylistsPage from './pages/PlaylistsPage';

export default function App() {
  return (
    <ApiUrlGate>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/pantallas" element={<PantallasPage />} />
              <Route path="/pantallas/:id" element={<PantallaDetallePage />} />
              <Route path="/contenidos" element={<ContenidosPage />} />
              <Route path="/playlists" element={<PlaylistsPage />} />
              <Route path="/" element={<Navigate to="/pantallas" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/pantallas" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </ApiUrlGate>
  );
}
