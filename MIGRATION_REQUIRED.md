# ⚠️ IMPORTANTE: Migración de Base de Datos Requerida

## Antes de usar la nueva funcionalidad

La nueva funcionalidad de permisos granulares de tableros **requiere ejecutar una migración de base de datos** antes de que funcione correctamente.

---

## Pasos para Migración

### Opción 1: Usando psql (Recomendado)

```bash
# Conectar a la base de datos de Neon
psql 'postgresql://neondb_owner:npg_7qvpgUrD6Qfc@ep-red-rice-a4po8o6h-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# Ejecutar el script de migración
\i scripts/add_dashboard_permissions.sql

# O copiar y pegar el contenido del archivo
```

### Opción 2: Usando Neon Console

1. Ir a https://console.neon.tech
2. Seleccionar el proyecto
3. Ir a "SQL Editor"
4. Copiar el contenido de `scripts/add_dashboard_permissions.sql`
5. Pegar y ejecutar (Run)

---

## Script de Migración

**Archivo:** `scripts/add_dashboard_permissions.sql`

**Contenido:**

```sql
-- Create dashboard_user_permissions table
CREATE TABLE IF NOT EXISTS dashboard_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dashboard_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_user_perms_dashboard 
ON dashboard_user_permissions(dashboard_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_user_perms_user 
ON dashboard_user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_user_perms_granted_by 
ON dashboard_user_permissions(granted_by);

CREATE INDEX IF NOT EXISTS idx_dashboard_user_perms_role 
ON dashboard_user_permissions(role);
```

---

## Verificación

Después de ejecutar la migración, verificar que la tabla existe:

```sql
-- Verificar que la tabla existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'dashboard_user_permissions';

-- Verificar estructura de la tabla
\d dashboard_user_permissions

-- Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'dashboard_user_permissions';
```

**Resultado esperado:**
- Tabla `dashboard_user_permissions` existe
- 4 índices creados
- Constraints de foreign key activos

---

## ¿Qué pasa si no ejecuto la migración?

Si intentas usar la funcionalidad de compartir carpetas sin ejecutar la migración:

❌ **Error en el backend:**
```
ERROR: relation "dashboard_user_permissions" does not exist
```

❌ **Síntomas:**
- El botón "Compartir Acceso" no funciona
- Error 500 en la consola del navegador
- Toast de error: "Error al compartir"

---

## Rollback (si es necesario)

Si necesitas revertir la migración:

```sql
DROP TABLE IF EXISTS dashboard_user_permissions CASCADE;
```

**⚠️ ADVERTENCIA:** Esto eliminará todos los permisos granulares creados.

---

## Estado Actual

✅ **Código deployado en Vercel:** Commit `b763597`  
⚠️ **Migración de BD:** PENDIENTE  
❌ **Funcionalidad activa:** NO (hasta ejecutar migración)

---

## Próximos Pasos

1. ✅ Código pusheado a GitHub
2. ✅ Vercel deployará automáticamente
3. ⚠️ **EJECUTAR MIGRACIÓN DE BD** (este paso)
4. ✅ Probar funcionalidad en producción

---

**Fecha:** 2026-01-07  
**Commit:** b763597  
**Archivos modificados:** 3 (2 modificados, 1 nuevo)  
**Líneas agregadas:** 182
