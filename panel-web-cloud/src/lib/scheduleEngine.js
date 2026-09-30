import { supabase } from './supabase';

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Calcula que debe mostrar una pantalla EN ESTE MOMENTO, igual que hacia
 * el backend antes: entre las programaciones vigentes ahora, gana la de
 * mayor prioridad (y en empate, la mas reciente).
 */
export async function getContenidoActual(pantallaId) {
  const now = new Date();
  const hoyISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const horaActual = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const diaSemana = now.getDay();

  const { data: programaciones, error } = await supabase
    .from('market58_programaciones')
    .select('*')
    .eq('pantalla_id', pantallaId)
    .eq('activo', true)
    .order('prioridad', { ascending: false })
    .order('creado_en', { ascending: false });

  if (error) throw error;

  const vigente = (programaciones || []).find((p) => {
    if (p.fecha_inicio && p.fecha_inicio > hoyISO) return false;
    if (p.fecha_fin && p.fecha_fin < hoyISO) return false;
    if (p.hora_inicio && p.hora_inicio > horaActual) return false;
    if (p.hora_fin && p.hora_fin < horaActual) return false;
    if (!p.dias_semana.includes(diaSemana)) return false;
    return true;
  });

  if (!vigente) return { programacion: null, items: [] };

  let items = [];

  if (vigente.contenido_id) {
    const { data, error: e2 } = await supabase
      .from('market58_contenidos')
      .select('*')
      .eq('id', vigente.contenido_id);
    if (e2) throw e2;
    items = data || [];
  } else if (vigente.playlist_id) {
    const { data, error: e3 } = await supabase
      .from('market58_playlist_items')
      .select('orden, contenido:market58_contenidos(*)')
      .eq('playlist_id', vigente.playlist_id)
      .order('orden', { ascending: true });
    if (e3) throw e3;
    items = (data || []).map((row) => ({ ...row.contenido, orden: row.orden }));
  }

  return { programacion: vigente, items };
}
