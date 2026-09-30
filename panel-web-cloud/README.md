# Panel web — version Supabase (nube)

Version alternativa del panel que habla **directo con Supabase** (Postgres + Storage +
Realtime + Auth), sin pasar por el backend Express local. Pensada para cuando el sistema
completo se mueva a la nube (ver `CLAUDE.md` en la raiz del proyecto).

## Diferencias con `panel-web/` (version local)

- No pide IP de servidor: la URL de Supabase esta fija en `src/lib/supabase.js`.
- El login usa Supabase Auth (usuario `+58market` / clave la que se configuro al crear el
  usuario admin), no el backend propio.
- Las fotos/videos se suben directo a Supabase Storage (`market58-contenidos`).
- Las actualizaciones en vivo (pantallas online, nuevo contenido) usan Supabase Realtime en
  vez de Socket.io.
- Las tablas usadas son `market58_*` dentro del proyecto Supabase "Base de datos Proyectos
  varios" (compartido con otras apps, sin costo extra de plan).

## Correr en desarrollo

```bash
npm install
npm run dev
```

## Notas

- Este panel todavia no tiene contraparte funcionando en la app de la TV (`player-app/`
  sigue usando el backend local por ahora) — hasta que se reescriba tambien esa parte para
  Supabase, usar `panel-web/` (la version local) para el uso real del dia a dia.
