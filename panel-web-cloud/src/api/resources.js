import { supabase } from '../lib/supabase';
import { getContenidoActual } from '../lib/scheduleEngine';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generarCodigo(length = 4) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export const authApi = {
  login: async (usuario, password) => {
    const limpio = usuario.trim().toLowerCase();
    const email = limpio.includes('@') ? limpio : `${limpio}@58market.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { response: { data: { error: 'Usuario o clave incorrectos' } } };
    return { usuario: { id: data.user.id, usuario } };
  },
  logout: () => supabase.auth.signOut(),
  sesionActual: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
};

export const pantallasApi = {
  listar: async () => ({ data: unwrap(await supabase.from('market58_pantallas').select('*').order('creado_en', { ascending: false })) }),

  obtener: async (id) => ({ data: unwrap(await supabase.from('market58_pantallas').select('*').eq('id', id).single()) }),

  actualizar: async (id, patch) => ({
    data: unwrap(await supabase.from('market58_pantallas').update(patch).eq('id', id).select().single()),
  }),

  eliminar: (id) => supabase.from('market58_pantallas').delete().eq('id', id),

  contenidoActual: async (id) => ({ data: await getContenidoActual(id) }),

  emparejarConfirmar: async (codigo, nombre, ubicacion) => {
    const { data, error } = await supabase
      .from('market58_pantallas')
      .update({ nombre: nombre || undefined, ubicacion: ubicacion || null, emparejada: true })
      .eq('codigo_emparejamiento', codigo.toUpperCase())
      .eq('emparejada', false)
      .select()
      .single();
    if (error || !data) throw { response: { data: { error: 'Codigo invalido o ya utilizado' } } };
    return { data };
  },

  generarCodigoDemo: () => generarCodigo(),
};

export const contenidosApi = {
  listar: async () => ({ data: unwrap(await supabase.from('market58_contenidos').select('*').order('creado_en', { ascending: false })) }),

  obtener: async (id) => ({ data: unwrap(await supabase.from('market58_contenidos').select('*').eq('id', id).single()) }),

  subir: async (file, { nombre, tipo, duracionSegundos }, onUploadProgress) => {
    const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
    const path = `${crypto.randomUUID()}${ext}`;

    const { error: uploadError } = await supabase.storage.from('market58-contenidos').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw { response: { data: { error: uploadError.message } } };

    onUploadProgress?.({ loaded: 1, total: 1 });

    const { data, error } = await supabase
      .from('market58_contenidos')
      .insert({
        nombre: nombre || file.name,
        tipo,
        storage_path: path,
        duracion_segundos: tipo === 'imagen' ? duracionSegundos || 10 : null,
        tamano_bytes: file.size,
        mime_type: file.type,
      })
      .select()
      .single();
    if (error) throw { response: { data: { error: error.message } } };
    return { data };
  },

  actualizar: async (id, patch) => ({
    data: unwrap(await supabase.from('market58_contenidos').update(patch).eq('id', id).select().single()),
  }),

  eliminar: async (id, storagePath) => {
    if (storagePath) {
      await supabase.storage.from('market58-contenidos').remove([storagePath]);
    }
    return supabase.from('market58_contenidos').delete().eq('id', id);
  },
};

export const playlistsApi = {
  listar: async () => ({ data: unwrap(await supabase.from('market58_playlists').select('*').order('creado_en', { ascending: false })) }),

  obtener: async (id) => {
    const playlist = unwrap(await supabase.from('market58_playlists').select('*').eq('id', id).single());
    const items = unwrap(
      await supabase
        .from('market58_playlist_items')
        .select('id, orden, contenido:market58_contenidos(*)')
        .eq('playlist_id', id)
        .order('orden', { ascending: true })
    );
    return { data: { ...playlist, items: items.map((i) => ({ ...i.contenido, item_id: i.id, orden: i.orden })) } };
  },

  crear: async ({ nombre, contenido_ids: contenidoIds }) => {
    const playlist = unwrap(await supabase.from('market58_playlists').insert({ nombre }).select().single());
    if (contenidoIds?.length) {
      const rows = contenidoIds.map((contenido_id, orden) => ({ playlist_id: playlist.id, contenido_id, orden }));
      await supabase.from('market58_playlist_items').insert(rows);
    }
    return playlistsApi.obtener(playlist.id);
  },

  actualizar: async (id, { nombre, contenido_ids: contenidoIds }) => {
    if (nombre !== undefined) {
      await supabase.from('market58_playlists').update({ nombre }).eq('id', id);
    }
    if (contenidoIds) {
      await supabase.from('market58_playlist_items').delete().eq('playlist_id', id);
      if (contenidoIds.length) {
        const rows = contenidoIds.map((contenido_id, orden) => ({ playlist_id: id, contenido_id, orden }));
        await supabase.from('market58_playlist_items').insert(rows);
      }
    }
    return playlistsApi.obtener(id);
  },

  eliminar: (id) => supabase.from('market58_playlists').delete().eq('id', id),
};

export const programacionesApi = {
  listar: async (pantallaId) => {
    let query = supabase.from('market58_programaciones').select('*').order('prioridad', { ascending: false });
    if (pantallaId) query = query.eq('pantalla_id', pantallaId);
    return { data: unwrap(await query) };
  },

  obtener: async (id) => ({ data: unwrap(await supabase.from('market58_programaciones').select('*').eq('id', id).single()) }),

  crear: async (payload) => ({
    data: unwrap(
      await supabase
        .from('market58_programaciones')
        .insert({
          pantalla_id: payload.pantalla_id,
          playlist_id: payload.playlist_id || null,
          contenido_id: payload.contenido_id || null,
          nombre: payload.nombre || null,
          fecha_inicio: payload.fecha_inicio || null,
          fecha_fin: payload.fecha_fin || null,
          hora_inicio: payload.hora_inicio || null,
          hora_fin: payload.hora_fin || null,
          dias_semana: payload.dias_semana || [0, 1, 2, 3, 4, 5, 6],
          prioridad: payload.prioridad ?? 0,
          activo: payload.activo ?? true,
        })
        .select()
        .single()
    ),
  }),

  actualizar: async (id, patch) => ({
    data: unwrap(await supabase.from('market58_programaciones').update(patch).eq('id', id).select().single()),
  }),

  eliminar: async (id) => {
    const prog = unwrap(await supabase.from('market58_programaciones').select('pantalla_id').eq('id', id).single());
    await supabase.from('market58_programaciones').delete().eq('id', id);
    return prog;
  },
};
