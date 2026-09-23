# Modelo de datos — Digital Signage

Esquema completo en [`db/init.sql`](../db/init.sql). Resumen de entidades y relaciones:

```
usuarios                 (login del panel admin)
  id, usuario, password_hash

pantallas                (cada Smart TV / Android TV)
  id, nombre, ubicacion, codigo_emparejamiento, emparejada,
  estado (online/offline), ultima_conexion, socket_id

contenidos                (imagen o video subido)
  id, nombre, tipo (imagen/video), url_archivo, nombre_archivo,
  duracion_segundos, tamano_bytes, mime_type

playlists                 (lista con nombre)
  id, nombre

playlist_items             (contenidos ordenados dentro de una playlist)
  id, playlist_id -> playlists, contenido_id -> contenidos, orden

programaciones             (que/donde/cuando)
  id, pantalla_id -> pantallas,
  playlist_id -> playlists (opcional) XOR contenido_id -> contenidos (opcional),
  nombre, fecha_inicio, fecha_fin, hora_inicio, hora_fin,
  dias_semana (int[] 0=domingo..6=sabado), prioridad, activo
```

## Relaciones

- Una **pantalla** puede tener muchas **programaciones** (una fila por franja horaria/rango de fechas).
- Una **programación** apunta a una **playlist** *o* a un **contenido** individual, nunca ambos (constraint `chk_programacion_contenido`).
- Una **playlist** contiene muchos **contenidos** a través de `playlist_items`, con un campo `orden` para la secuencia de reproducción.

## Resolución de "qué mostrar ahora"

Implementada en [`backend/src/utils/scheduleEngine.js`](../backend/src/utils/scheduleEngine.js):

1. Se buscan las `programaciones` de la pantalla con `activo = true` cuyo rango de fechas, horario y día de la semana cubren el momento actual.
2. Si hay varias vigentes al mismo tiempo, gana la de mayor `prioridad` (y en empate, la más reciente).
3. Se resuelve a la lista de `contenidos` a reproducir (un único contenido, o todos los de la playlist en su `orden`).
4. Si no hay ninguna programación vigente, la pantalla no recibe contenido (el player debe seguir mostrando lo último cacheado o una pantalla en blanco/logo por defecto).

## Flujo de emparejamiento de una pantalla nueva

1. La app player, al arrancar sin estar emparejada, llama a `POST /api/pantallas/emparejar/iniciar`. El backend crea una fila en `pantallas` con `emparejada = false` y un `codigo_emparejamiento` corto (ej. `A3F9`), y lo devuelve.
2. La TV muestra ese código en pantalla y se suscribe por WebSocket a la sala `pantalla-pendiente:<codigo>`.
3. Desde el panel web, el administrador ingresa el código en `POST /api/pantallas/emparejar/confirmar` junto con nombre/ubicación.
4. El backend marca `emparejada = true` y emite el evento `pantalla:emparejada` a esa sala, con el `id` real de la pantalla.
5. La TV guarda ese `id` localmente y a partir de ahí se conecta como pantalla emparejada (`pantalla:conectar`), quedando `online`.

## Notificación en tiempo real de contenido nuevo

Cuando se crea/edita/borra una `programacion` (o se reasigna), el backend recalcula el contenido actual de esa pantalla y emite `contenido:actualizado` a la sala `pantalla:<id>`, y `preview:actualizado` a la sala `admin` para la vista previa en vivo del panel.
