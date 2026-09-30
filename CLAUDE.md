# 58 Market TV — Contexto del proyecto

Sistema de cartelera digital (digital signage) para el mercado "58 Market", del usuario
José Manuel Tejada. Muestra promociones/publicidad en varias Smart TVs (Android TV) conectadas
a la WiFi local de la tienda. Todo corre en un PC dentro del local, sin depender de internet
para el uso diario.

## Estado actual (última sesión: 2026-09-30)

Hay **dos arquitecturas en paralelo** en este repo — no confundirlas:

### A) Version LOCAL (en uso real, la que se va a instalar en la tienda)

Construida, probada end-to-end y funcionando con al menos una TV real emparejada y mostrando
contenido. Repo: https://github.com/josemtejadac/proyecto-58market-tv (rama `main`, pública).

1. **`backend/`** — Node/Express + PostgreSQL + Socket.io. Corre en Docker (`docker-compose.yml`
   en la raíz). Sirve la API en el puerto 4000.
2. **`panel-web/`** — React + Vite + Tailwind (CDN). Se compila y se sirve local con
   `npm run build && npm run preview` (puerto 5173). Corre **local**, no en Cloudflare Pages
   (ver "Decisiones" abajo).
3. **`player-app/`** — Flutter, para Android TV. El APK universal (todas las arquitecturas)
   se genera con `flutter build apk --release` en `player-app/build/app/outputs/flutter-apk/`.

Esta es la version que el usuario va a instalar físicamente en la PC y las TVs de la tienda
(ver `SETUP.md`). **Es la version en uso real hasta que la de Supabase este probada en un
dispositivo real y el usuario decida migrar.**

### B) Version NUBE / Supabase (experimental, en construcción)

El usuario tiene Supabase Pro y pidió explorar una arquitectura sin backend propio: el panel y
la app de la TV hablan **directo con Supabase** (Postgres + Storage + Realtime + Auth), sin
pasar por Express/Socket.io ni por una PC prendida en la tienda.

4. **`panel-web-cloud/`** — Copia de `panel-web/` adaptada a Supabase. Probado end-to-end
   (login, RLS, pairing) contra la base real via curl. Compila limpio.
5. **`player-app-cloud/`** — Copia de `player-app/` adaptada a Supabase (`applicationId`
   distinto: `com.market58tv.signage_player_cloud`, para poder instalarla junto a la version
   local en la misma TV sin pisarla). **Probada de punta a punta en la TV real** (UnionTV,
   192.168.1.114): emparejamiento, notificacion en tiempo real, descarga y reproduccion de
   contenido — todo funciono correctamente el 2026-09-30. Sigue instalada en esa TV junto a
   la version local para referencia.
6. **Base de datos**: proyecto Supabase compartido "Base de datos Proyectos varios"
   (`project_id: wiuuzsiiaagqldtxfouj`, org "SpotGo", plan Pro), tablas con prefijo
   `market58_` (NO es un proyecto Supabase aparte — así no cuesta nada extra del plan, ver mas
   abajo). Bucket de Storage: `market58-contenidos`. Usuario admin en Supabase Auth: email
   `+58market@58market.local`, clave `58market2027` (pedida explícitamente por el usuario).
7. El usuario mencionó que **esto se va a mover a otro proyecto/repo más adelante** — por ahora
   vive junto a la version local en el mismo repo.

**La version B ya esta probada tecnicamente end-to-end** (ver arriba). Falta: que el usuario
decida si/cuándo migrar la operación real de la tienda a esta arquitectura, y reescribir el
panel-web-cloud con drag&drop de playlists igual de completo que el local (tiene lo esencial
pero no se re-verificó cada detalle de UI tras el rewrite). No asumir que ya reemplazó a la
version A en producción sin confirmar con el usuario.

### Decisiones importantes tomadas (no revertir sin preguntar)

- **Cloudflare Pages** (`tv58market.pages.dev`) quedó desplegado pero **sin usar**: el panel
  ahí es https y el backend es http (LAN), los navegadores bloquean esa mezcla ("mixed
  content"). El usuario decidió usar el panel **en local** (`npm run preview`) en vez de
  arreglar esto con un túnel — no proponer Cloudflare Tunnel a menos que el usuario lo pida.
- **Zona horaria**: la tienda está en Chile (America/Santiago, UTC-3). El backend tiene
  `TZ: America/Santiago` en `docker-compose.yml`. Si se despliega en otro país, hay que
  cambiar esto (y preguntarle al usuario la zona horaria correcta primero).
- **Secretos**: `ADMIN_PASSWORD`, `JWT_SECRET`, `POSTGRES_PASSWORD` viven en un archivo `.env`
  en la raíz (gitignored, NO se sube a GitHub porque el repo es público). `docker-compose.yml`
  los referencia como `${VAR:-default}`. Si vas a crear una PC nueva, copiar `.env.example` a
  `.env` y poner valores reales ahí, nunca hardcodear en `docker-compose.yml`.
- **Auto-actualización**: hay una tarea programada de Windows (`58MarketTV-AutoUpdate`, ver
  `scripts/auto-update.ps1`) que corre cada 15 minutos: si hay commits nuevos en `origin/main`,
  hace `git pull` + reconstruye backend y panel automáticamente. El usuario prefirió esto
  "casi al instante" en vez de una vez al día — es consciente del riesgo de que un cambio con
  bug se note en las pantallas en horario de atención.
- **Imágenes/videos verticales u horizontales**: el player (TV) y la vista previa del panel
  muestran el contenido completo (`BoxFit.contain` / `object-contain`) centrado, con una copia
  del mismo contenido de fondo, ampliada y desenfocada (`BoxFit.cover` + blur), para llenar la
  pantalla sin recortar ni dejar barras negras. No cambiar a `cover` puro sin este fondo — ya
  se probó y el usuario lo rechazó por recortar demasiado las fotos verticales.

### Bugs reales encontrados y corregidos hoy (por si reaparecen en otro entorno)

- `scheduleEngine.js` usaba `now.toISOString().slice(0,10)` para la fecha "de hoy", lo cual
  usa UTC y queda desfasado un día en zonas horarias negativas durante la noche. Se corrigió
  para usar getters locales (`getFullYear/getMonth/getDate`).
- El INSERT de `programaciones` fallaba con `column "dias_semana" is of type smallint[] but
  expression is of type text` — el `COALESCE($9, '{...}')` necesitaba cast explícito
  (`::smallint[]`) en ambos lados.
- El firewall de Windows bloqueaba conexiones entrantes a los puertos 4000/5173 desde otros
  dispositivos de la LAN (como la TV) — hacía falta `New-NetFirewallRule` explícito.
- La primera TV de prueba (marca "UnionTV") es de **32 bits (armeabi-v7a)**, no arm64. El APK
  universal (`flutter build apk --release`, sin `--target-platform`) sirve para cualquier
  arquitectura — usar siempre ese para distribuir, no el de una sola arquitectura.

### Costo de la version Supabase (por si el usuario pregunta de nuevo)

Con 40 TVs corriendo 8h/día, usando el proyecto compartido existente (no uno nuevo): **$0
extra** sobre el Pro que ya paga. Conexiones Realtime (40) muy por debajo del límite de 500
incluidas; mensajes, storage y egress también muy por debajo de los límites Pro (5M msgs,
100GB storage, 250GB egress). Lo único que sí generaría costo es un proyecto Supabase *nuevo*
(~$10/mes extra) — por eso se uso el proyecto compartido con prefijo de tablas, no uno nuevo.

## Cómo ayudar en una sesión nueva

- La guía completa de instalación para una PC nueva está en `SETUP.md` (raíz del proyecto) y
  también como PDF en el escritorio del usuario (`Guia instalacion 58 Market TV.pdf`).
- `actualizar.bat` y `build-panel.bat` (raíz) son scripts de un clic para aplicar actualizaciones
  manualmente si hace falta.
- El usuario (José) es el dueño del mercado, no es programador — explica las cosas en términos
  simples, evita jerga técnica sin explicarla, y confirma antes de tocar configuración de
  Windows/firewall/Docker (son sistemas fuera del proyecto en sí).
- Antes de tocar `docker-compose.yml`, `.env`, o reglas de firewall: son cambios que afectan un
  sistema en producción usado por un negocio real — confirmar con el usuario si no es evidente.
