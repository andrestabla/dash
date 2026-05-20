# Base de datos

Esquema y migraciones de la plataforma (PostgreSQL / Neon).

## Archivos

| Ruta | Qué es |
|------|--------|
| `db/schema.sql` | **Fuente de verdad** del esquema. Es una instantánea de la base de datos de producción, generada por introspección. No editar a mano. |
| `db/migrations/` | Migraciones incrementales, numeradas y ordenadas (`NNNN_descripcion.sql`). |
| `scripts/dump-schema.mjs` | Regenera `db/schema.sql` introspectando la base de datos real (solo lectura). |
| `scripts/migrate.mjs` | Aplica las migraciones pendientes de `db/migrations/`. |

El runner registra lo aplicado en la tabla `schema_migrations` (`version`, `applied_at`),
que crea automáticamente la primera vez que se ejecuta.

## Flujo de trabajo

### Aplicar migraciones pendientes

```bash
node scripts/migrate.mjs --dry-run   # lista lo que se aplicaría, sin tocar nada
node scripts/migrate.mjs             # aplica cada migración pendiente en una transacción
```

### Crear una nueva migración

1. Crea `db/migrations/NNNN_descripcion.sql` con el siguiente número correlativo.
2. Escribe SQL idempotente cuando sea posible (`IF NOT EXISTS`, `IF EXISTS`).
3. Aplícala con `node scripts/migrate.mjs`.
4. Regenera la instantánea: `node scripts/dump-schema.mjs` y commitea `db/schema.sql`.

### Levantar una base de datos desde cero

```bash
psql "$DATABASE_URL" -f db/schema.sql   # crea el esquema base
node scripts/migrate.mjs                # aplica migraciones posteriores a la instantánea
```

## Estado del esquema (deuda conocida)

La introspección de producción reveló **tablas duplicadas** heredadas de iteraciones
anteriores. En cada par, la aplicación usa una y la otra quedó muerta:

| Tabla muerta | Reemplazada por | Filas | Acción |
|--------------|-----------------|-------|--------|
| `audit_log` | `audit_logs` | 0 | Eliminada en `0001_drop_legacy_duplicate_tables.sql` |
| `comments` | `task_comments` | 0 | Eliminada en `0001_drop_legacy_duplicate_tables.sql` |
| `dashboard_collaborators` | `dashboard_user_permissions` | 17 | **Pendiente de decisión** (ver abajo) |

### `dashboard_collaborators` — decisión pendiente

Ningún código en `app/` o `lib/` lee esta tabla; la app usa `dashboard_user_permissions`.
Pero todavía contiene 17 filas de permisos antiguos que nunca se migraron, así que
esos accesos ya están de hecho inactivos. Antes de eliminarla, el equipo debe decidir:

- **Descartar** esos accesos: crear una migración con `DROP TABLE dashboard_collaborators;`.
- **Conservarlos**: copiarlos primero a `dashboard_user_permissions`, p. ej.

  ```sql
  INSERT INTO dashboard_user_permissions (dashboard_id, user_id, role)
  SELECT dashboard_id, user_id, role FROM dashboard_collaborators
  ON CONFLICT (dashboard_id, user_id) DO NOTHING;
  DROP TABLE dashboard_collaborators;
  ```

No se incluye como migración automática porque implica una decisión sobre datos reales.
