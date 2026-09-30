# App player — version Supabase (nube)

Version alternativa de la app de Android TV que se conecta **directo a Supabase**, sin pasar
por el backend Express local. Pareja de `panel-web-cloud/` (ver ese README y `CLAUDE.md` en
la raiz del proyecto).

## Diferencias con `player-app/` (version local)

- No pide IP de servidor: las credenciales de Supabase estan fijas en
  `lib/config/supabase_config.dart`.
- El emparejamiento crea/lee la fila directo en `market58_pantallas` (Supabase), protegido por
  RLS (la TV puede crear su propia fila pendiente sin login, pero no puede editar pantallas ni
  contenidos — eso es solo del admin).
- El calculo de "que mostrar ahora" (`lib/services/schedule_service.dart`) corre **en la app**,
  no en un backend — mismo algoritmo que tenia el backend Express, portado a Dart.
- Las actualizaciones en tiempo real usan Supabase Realtime (Postgres changes) en vez de
  Socket.io.
- `applicationId` distinto (`com.market58tv.signage_player_cloud`) para poder instalarla junto
  a la version local en la misma TV durante pruebas, sin que se pisen.

## Compilar

```bash
flutter pub get
flutter build apk --release                      # universal, cualquier arquitectura
flutter build apk --release --target-platform android-arm   # solo 32 bits (mas liviano)
```

## Estado

- Compila limpio (`flutter analyze` sin errores) y el APK se genera sin problemas.
- Verificado por separado contra Supabase real (via curl): login admin, insert publico de
  pairing, y que RLS bloquea escritura sin autenticacion — todo funciona.
- **Pendiente de probar en un dispositivo real** (la prueba en vivo quedo interrumpida porque
  la TV de pruebas no estaba alcanzable por red en el momento).
- Mientras esto no este probado de punta a punta en una TV real, seguir usando `player-app/`
  (version local) para el uso real / instalacion en la tienda.
