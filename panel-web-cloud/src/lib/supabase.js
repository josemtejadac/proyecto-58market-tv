import { createClient } from '@supabase/supabase-js';

// Claves publicas de Supabase (seguras de exponer en el cliente: el acceso
// real esta controlado por las politicas de RLS en la base de datos).
export const SUPABASE_URL = 'https://wiuuzsiiaagqldtxfouj.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdXV6c2lpYWFncWxkdHhmb3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjI1NDcsImV4cCI6MjA5NzI5ODU0N30.hPNrXFz9GIBDMAKMZ3Ao22cVsFoyQO1Ne7eYvHhEF7U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Bucket de Storage donde viven las fotos/videos.
export const BUCKET = 'market58-contenidos';

export function publicUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
