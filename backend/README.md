# Backend — Digital Signage API

API REST + WebSocket (Socket.io) para el sistema de cartelera digital. Node.js + Express + PostgreSQL.

## Correr con Docker (recomendado)

Desde la raíz del repo:

```bash
docker-compose up --build
```

Esto levanta PostgreSQL (con el esquema de `db/init.sql` aplicado automáticamente) y el backend en `http://<IP-de-tu-PC>:4000`. En el primer arranque se crea el usuario admin (`admin` / `cambia-esta-clave` por defecto — cámbialos en `docker-compose.yml` antes de exponer nada).

## Correr en local sin Docker

Requiere Node 18+ y PostgreSQL corriendo.

```bash
cd backend
cp .env.example .env      # y edita DATABASE_URL, JWT_SECRET, etc.
npm install

# aplica el esquema manualmente (una sola vez)
psql "$DATABASE_URL" -f ../db/init.sql

npm run seed   # crea el usuario admin definido en .env
npm run dev    # nodemon, http://localhost:4000
```

## Encontrar la IP local del servidor

Las TVs y el panel deben usar la IP de tu PC en la red WiFi del local, no `localhost`. En Windows:

```powershell
ipconfig
```

Busca la "Dirección IPv4" del adaptador WiFi (ej. `192.168.1.50`). El backend queda accesible en `http://192.168.1.50:4000`.

## Endpoints principales

Todos bajo el prefijo `/api`. Los marcados 🔒 requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servidor |
| POST | `/auth/login` | Login admin, devuelve JWT |
| GET | `/auth/me` 🔒 | Datos del usuario autenticado |
| POST | `/pantallas/emparejar/iniciar` | La TV solicita un código de emparejamiento |
| POST | `/pantallas/emparejar/confirmar` 🔒 | El admin vincula la TV con el código |
| GET | `/pantallas` 🔒 | Listar pantallas |
| GET | `/pantallas/:id` | Detalle de una pantalla |
| PUT | `/pantallas/:id` 🔒 | Renombrar / reubicar pantalla |
| DELETE | `/pantallas/:id` 🔒 | Eliminar pantalla |
| GET | `/pantallas/:id/contenido-actual` | Qué debe mostrar esa pantalla AHORA |
| GET | `/contenidos` 🔒 | Listar contenidos |
| POST | `/contenidos` 🔒 | Subir imagen/video (`multipart/form-data`, campo `archivo`) |
| PUT | `/contenidos/:id` 🔒 | Editar nombre/duración |
| DELETE | `/contenidos/:id` 🔒 | Eliminar contenido (borra también el archivo) |
| GET | `/playlists` 🔒 | Listar playlists |
| POST | `/playlists` 🔒 | Crear playlist (`{ nombre, contenido_ids: [...] }`) |
| PUT | `/playlists/:id` 🔒 | Renombrar / reordenar contenidos |
| DELETE | `/playlists/:id` 🔒 | Eliminar playlist |
| GET | `/programaciones?pantalla_id=` 🔒 | Listar programaciones |
| POST | `/programaciones` 🔒 | Crear programación |
| PUT | `/programaciones/:id` 🔒 | Editar programación |
| DELETE | `/programaciones/:id` 🔒 | Eliminar programación |

Detalle del modelo de datos en [`docs/DATA_MODEL.md`](../docs/DATA_MODEL.md).

## WebSocket (Socket.io)

Conectar a la misma URL/puerto del backend. Eventos disponibles en [`src/sockets/socketManager.js`](src/sockets/socketManager.js):

- **App player**: `pantalla:suscribir-pendiente`, `pantalla:conectar`, escucha `pantalla:emparejada` y `contenido:actualizado`.
- **Panel admin**: `admin:suscribir`, escucha `pantalla:actualizada`, `pantalla:eliminada`, `preview:actualizado`.

## Archivos subidos

Se guardan en `backend/uploads/` (o en el volumen Docker `uploads_data`) y se sirven en `http://<IP>:4000/uploads/<archivo>`.
