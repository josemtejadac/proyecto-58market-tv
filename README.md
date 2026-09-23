# 58 Market TV — Digital Signage

Sistema de cartelera digital para mostrar publicidad y promociones en varias Smart TV
(Android TV) dentro de la red WiFi local de la tienda. Corre completo en un PC dentro
del local, sin depender de internet.

## Partes del proyecto

| Carpeta | Estado | Descripción |
|---|---|---|
| [`backend/`](backend/README.md) | ✅ Listo | API REST + WebSocket (Node.js + Express + PostgreSQL + Socket.io) |
| [`panel-web/`](panel-web/README.md) | 🔜 Siguiente fase | Panel de administración (React) |
| [`player-app/`](player-app/README.md) | 🔜 Última fase | App Android TV (Flutter) |
| [`db/`](db/init.sql) | ✅ Listo | Esquema SQL de PostgreSQL |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | ✅ Listo | Modelo de datos y flujos (emparejamiento, programación) |

## Arranque rápido (backend)

```bash
docker-compose up --build
```

Levanta PostgreSQL + la API en `http://<IP-de-tu-PC>:4000`. Detalles, variables de
entorno y endpoints en [`backend/README.md`](backend/README.md).

## Arquitectura

```
┌─────────────┐      WiFi local (LAN)      ┌──────────────────┐
│  Panel web   │ ───────────────────────── │                    │
│  (tu PC)     │        HTTP + WS           │   Backend API      │
└─────────────┘                            │  Node + Express     │
                                            │  + Socket.io        │
┌─────────────┐      WiFi local (LAN)      │  (tu PC, Docker)    │
│ Android TV 1 │ ───────────────────────── │                    │
│ App Player   │        HTTP + WS           └─────────┬──────────┘
└─────────────┘                                        │
┌─────────────┐                                        │
│ Android TV 2 │ ──────────────────────────────────────┘
│ App Player   │
└─────────────┘                              ┌──────────────┐
                                              │ PostgreSQL    │
                                              │ (Docker)      │
                                              └──────────────┘
```

Todo el tráfico queda dentro del WiFi del local. Si más adelante quieres administrar
el panel desde afuera, se puede exponer solo el panel web vía un túnel de Cloudflare
(Cloudflare Tunnel), sin exponer la base de datos.

## Próximos pasos

1. Construir el **panel web** (React) que consume la API del backend.
2. Construir la **app player** en Flutter para Android TV.
