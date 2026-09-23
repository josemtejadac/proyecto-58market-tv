-- ============================================================
-- Digital Signage - Esquema de base de datos (PostgreSQL)
-- Se ejecuta automaticamente al crear el contenedor de Postgres
-- (docker-entrypoint-initdb.d)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- usuarios: administrador del panel web
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- pantallas: cada Smart TV / Android TV
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pantallas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    ubicacion VARCHAR(150),
    codigo_emparejamiento VARCHAR(10) UNIQUE,
    emparejada BOOLEAN NOT NULL DEFAULT false,
    estado VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (estado IN ('online', 'offline')),
    ultima_conexion TIMESTAMPTZ,
    socket_id VARCHAR(100),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pantallas_codigo ON pantallas (codigo_emparejamiento);

-- ------------------------------------------------------------
-- contenidos: imagenes y videos subidos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contenidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('imagen', 'video')),
    url_archivo VARCHAR(500) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    duracion_segundos INTEGER NOT NULL DEFAULT 10,
    tamano_bytes BIGINT,
    mime_type VARCHAR(100),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- playlists: listas ordenadas de contenidos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- playlist_items: relacion ordenada playlist <-> contenido
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS playlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    contenido_id UUID NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items (playlist_id, orden);

-- ------------------------------------------------------------
-- programaciones: que se muestra, donde y cuando
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pantalla_id UUID NOT NULL REFERENCES pantallas(id) ON DELETE CASCADE,
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    contenido_id UUID REFERENCES contenidos(id) ON DELETE CASCADE,
    nombre VARCHAR(150),
    fecha_inicio DATE,
    fecha_fin DATE,
    hora_inicio TIME,
    hora_fin TIME,
    -- dias de la semana activos: 0=domingo ... 6=sabado
    dias_semana SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
    prioridad INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_programacion_contenido CHECK (
        (playlist_id IS NOT NULL AND contenido_id IS NULL) OR
        (playlist_id IS NULL AND contenido_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_programaciones_pantalla ON programaciones (pantalla_id, activo);

-- trigger generico para actualizar "actualizado_en"
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pantallas_actualizado ON pantallas;
CREATE TRIGGER trg_pantallas_actualizado BEFORE UPDATE ON pantallas
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

DROP TRIGGER IF EXISTS trg_playlists_actualizado ON playlists;
CREATE TRIGGER trg_playlists_actualizado BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

DROP TRIGGER IF EXISTS trg_programaciones_actualizado ON programaciones;
CREATE TRIGGER trg_programaciones_actualizado BEFORE UPDATE ON programaciones
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
