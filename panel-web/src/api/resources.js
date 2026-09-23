import client from './client';

export const authApi = {
  login: (usuario, password) => client.post('/auth/login', { usuario, password }),
  me: () => client.get('/auth/me'),
};

export const pantallasApi = {
  listar: () => client.get('/pantallas'),
  obtener: (id) => client.get(`/pantallas/${id}`),
  actualizar: (id, data) => client.put(`/pantallas/${id}`, data),
  eliminar: (id) => client.delete(`/pantallas/${id}`),
  contenidoActual: (id) => client.get(`/pantallas/${id}/contenido-actual`),
  emparejarConfirmar: (codigo, nombre, ubicacion) =>
    client.post('/pantallas/emparejar/confirmar', { codigo, nombre, ubicacion }),
};

export const contenidosApi = {
  listar: () => client.get('/contenidos'),
  obtener: (id) => client.get(`/contenidos/${id}`),
  subir: (formData, onUploadProgress) =>
    client.post('/contenidos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  actualizar: (id, data) => client.put(`/contenidos/${id}`, data),
  eliminar: (id) => client.delete(`/contenidos/${id}`),
};

export const playlistsApi = {
  listar: () => client.get('/playlists'),
  obtener: (id) => client.get(`/playlists/${id}`),
  crear: (data) => client.post('/playlists', data),
  actualizar: (id, data) => client.put(`/playlists/${id}`, data),
  eliminar: (id) => client.delete(`/playlists/${id}`),
};

export const programacionesApi = {
  listar: (pantallaId) => client.get('/programaciones', { params: pantallaId ? { pantalla_id: pantallaId } : {} }),
  obtener: (id) => client.get(`/programaciones/${id}`),
  crear: (data) => client.post('/programaciones', data),
  actualizar: (id, data) => client.put(`/programaciones/${id}`, data),
  eliminar: (id) => client.delete(`/programaciones/${id}`),
};
