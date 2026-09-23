# Panel de administración web

React + Vite + Tailwind (via CDN). Consume la API del [backend](../backend/README.md)
por HTTP y WebSocket (Socket.io).

## Correr en desarrollo

```bash
cd panel-web
npm install
npm run dev
```

Abre `http://localhost:5173`. La primera vez te va a pedir la URL del backend
(ej. `http://192.168.1.50:4000` en tu red local, o la URL del túnel de Cloudflare si
lo expones remotamente) — queda guardada en el navegador y se puede cambiar después
desde el botón "Cambiar servidor" en el panel lateral.

## Compilar para producción

```bash
npm run build    # genera panel-web/dist
npm run preview  # sirve el build en http://localhost:5173
```

`dist/` es contenido estático puro: se puede servir con cualquier servidor web
(nginx, `serve`, o detrás del túnel de Cloudflare) sin necesidad de Node en producción.

## Usuario

El usuario admin se crea automáticamente la primera vez que arranca el backend,
usando `ADMIN_USER` / `ADMIN_PASSWORD` (ver [`docker-compose.yml`](../docker-compose.yml)
o `backend/.env`).

## Funcionalidades

- **Pantallas**: listado con estado en vivo (online/offline vía WebSocket), emparejar
  una TV nueva con el código que muestra, ver detalle con vista previa en vivo y
  gestionar sus programaciones.
- **Contenidos**: subir imágenes/videos por drag & drop, editar duración, eliminar.
- **Playlists**: crear listas ordenadas de contenidos (arrastrar para reordenar).
- **Programaciones**: por pantalla, asignar una playlist o un contenido con rango de
  fechas, horario, días de la semana y prioridad.
