# Guía de instalación — 58 Market TV

Esta guía es para instalar el sistema completo en una PC nueva (por ejemplo, si cambias de
computador, o quieres tener un respaldo). Sigue los pasos en orden.

## Qué necesitas antes de empezar

- Una PC con Windows conectada a la **misma red WiFi** donde están las Smart TVs.
- El código del proyecto: clónalo desde GitHub (`https://github.com/josemtejadac/proyecto-58market-tv`)
  o copia la carpeta completa desde la PC anterior.
- El o los archivos `.apk` de la app de TV (están en
  `player-app\build\app\outputs\flutter-apk\app-release.apk` — este es el que sirve para
  **cualquier** TV/Android box, sin importar su procesador).

---

## 1. Instalar Docker Desktop (el backend corre adentro)

1. Descarga e instala **Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. Si el instalador te pide **WSL2** y no lo tienes, abre PowerShell **como administrador** y
   ejecuta:
   ```powershell
   wsl --install
   ```
   Reinicia la PC.
3. Abre Docker Desktop y espera a que la ballena 🐳 quede lista (1-2 min la primera vez).

Es gratis para este uso (negocio pequeño) — no hace falta pagar ni crear cuenta.

## 2. Permitir las conexiones en el firewall

Sin este paso, el panel y las TVs no van a poder hablarle al backend desde otros dispositivos
de la red (solo funcionaría en la misma PC). Abre PowerShell **como administrador** y ejecuta:

```powershell
New-NetFirewallRule -DisplayName "58 Market TV - Backend 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow -Profile Private,Domain
New-NetFirewallRule -DisplayName "58 Market TV - Panel 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private,Domain
```

## 3. Configurar la clave de administrador

Las claves NO van en `docker-compose.yml` (ese archivo es público en GitHub). Van en un
archivo `.env` separado que nunca se sube al repositorio.

1. Copia `.env.example` (en la raíz del proyecto) y renombra la copia a `.env`.
2. Ábrelo con el Bloc de notas y pon tu propia clave:
   ```
   ADMIN_PASSWORD=tu-clave-aqui
   ```
   (De paso, cambia `JWT_SECRET` por cualquier texto largo random — no es obligatorio pero es
   buena práctica).

## 4. Levantar el backend

Abre PowerShell (normal, no como admin) en la carpeta del proyecto:

```powershell
cd "C:\ruta\a\Proyecto 58 market Tvs"
docker-compose up --build -d
```

El `-d` lo deja corriendo en segundo plano (no se cierra si cierras la ventana). Para verlo
funcionando: `http://localhost:4000/api/health` debería responder `{"status":"ok"}`.

## 5. Levantar el panel web

```powershell
cd panel-web
npm install
npm run build
npm run preview
```

Deja esa ventana abierta (o ciérrala y vuelve a correr `npm run preview` cuando lo necesites —
el backend en Docker sigue funcionando igual, solo el panel se apaga).

## 6. Averiguar la IP de la PC

```powershell
ipconfig
```

Busca la "Dirección IPv4" del adaptador **WiFi** (ej. `192.168.1.143`). Esa es la IP que vas a
usar en el panel y en las TVs.

## 7. (Opcional) Que todo arranque solo al prender la PC

Con esto, prender la PC es lo único que tienes que hacer — Docker, el backend y el panel se
levantan solos, sin abrir nada a mano.

**a) Docker Desktop arranca solo:**
1. Cierra Docker Desktop si está abierto (clic derecho en la ballena → Quit Docker Desktop).
2. Abre el archivo `%APPDATA%\Docker\settings-store.json` con el Bloc de notas.
3. Busca la línea `"AutoStart": false` y cámbiala a `"AutoStart": true`.
4. Guarda y abre Docker Desktop de nuevo.

**b) El backend arranca solo apenas Docker esté listo:** no hay que hacer nada más — los
contenedores ya están configurados con `restart: unless-stopped`, así que en cuanto el motor de
Docker prende, ellos se reinician solos automáticamente.

**c) El panel web arranca solo:**
1. Presiona `Win + R`, escribe `shell:startup` y Enter (abre la carpeta de inicio de Windows).
2. Crea un acceso directo ahí que apunte a un archivo `.bat` con este contenido (créalo, por
   ejemplo, en la carpeta del proyecto como `iniciar-panel.bat`):
   ```bat
   @echo off
   cd /d "C:\ruta\a\Proyecto 58 market Tvs\panel-web"
   npm run preview
   ```
3. Windows va a abrir esa ventana minimizada cada vez que inicies sesión.

Con los 3 pasos hechos: prendes la PC → inicias sesión en Windows → esperas ~1 minuto → todo
(Docker, backend, panel) está arriba solo. Las TVs se reconectan solas apenas detectan que el
backend volvió a estar disponible.

---

## Activar (emparejar) una pantalla nueva

Esto es lo que haces cada vez que agregas una TV nueva al sistema:

1. **Instala la app** en la TV: pasa el archivo `app-release.apk` (por USB, WhatsApp, o el
   método que prefieras) y ábrelo desde el gestor de archivos de la TV para instalarlo.
   - Si te da "aplicación no instalada", el archivo se corrompió en la transferencia — prueba
     con un USB en vez de WiFi, o usa ADB (pregúntame si necesitas ayuda con esto).
2. **Abre la app** en la TV. La primera vez te pide la URL del backend — escribe:
   ```
   http://<IP-DE-TU-PC>:4000
   ```
   (ej. `http://192.168.1.143:4000`) y confirma.
3. La TV va a mostrar un **código de 4 letras** grande en el centro de la pantalla.
4. Entra al panel en tu navegador: `http://<IP-DE-TU-PC>:5173`, inicia sesión con `admin` y tu
   clave.
5. Click en **"+ Emparejar pantalla"**, escribe el código que salió en la TV y ponle un nombre
   (ej. "Entrada", "Caja 1"). Confirmar.
6. La TV se conecta sola al instante — no hay que hacer nada más ahí.
7. Ve a **Contenidos** y sube imágenes/videos, arma una **Playlist** en el menú de ese nombre,
   y entra al detalle de la pantalla para crear una **Programación**: elige la playlist, marca
   **"Mostrar siempre"** si quieres que se muestre todo el tiempo sin restricciones, y guarda.

La TV va a actualizar lo que muestra en tiempo real, sin que tengas que tocarla de nuevo.

---

## Uso del día a día

Cada vez que prendas esta PC para usar el sistema:

1. Abre **Docker Desktop** (si no arranca solo) y espera a que esté listo.
2. Si los contenedores no quedaron corriendo, en PowerShell: `docker-compose up -d` (sin
   `--build`, ya está construido).
3. Si necesitas el panel: `cd panel-web && npm run preview`.

Las TVs se reconectan solas apenas el backend esté disponible — no hace falta tocarlas.

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El panel no puede conectar al backend | Backend apagado, o falta la regla de firewall | Revisa Docker Desktop, y el paso 2 de esta guía |
| "Aplicación no instalada" en la TV | Archivo corrupto en la transferencia | Reenvía el `.apk`, o instala por USB/ADB |
| La TV no cambia de contenido | La playlist está vacía, o la programación no coincide con la fecha/hora | Revisa que la playlist tenga contenidos, y marca "Mostrar siempre" en la programación |
| El panel en https (Cloudflare Pages) no conecta al backend | Los navegadores bloquean https → http ("mixed content") | Usa el panel en local (`npm run preview`) dentro de la misma WiFi de la tienda |
