# Mobile Readiness (Misproyectos)

Este proyecto web ya quedó preparado con base `mobile-first` para evolucionar a app móvil (React Native/Capacitor/Flutter) sin rehacer backend.

## Cambios implementados

- Viewport móvil con `viewportFit=cover` y `safe areas`.
- Manifest web (`/manifest.webmanifest`) para modo app (standalone).
- Reglas globales táctiles:
  - objetivos mínimos de toque (`44px`)
  - `touch-action: manipulation`
  - ajustes para teclados móviles y zoom iOS.
- Layout responsive reforzado en vistas críticas:
  - `board`: header, filtros, tabs, lanes y modales en pantallas pequeñas.
  - `workspace`: header/acciones y grillas para móvil.
  - `SupportWidget`: panel full-width en móvil + safe area inferior.
  - `login`: formulario con ancho/padding fluidos y safe areas.
  - `admin/support`: tabla con scroll horizontal y modal de respuesta con alto adaptable.
  - `admin/settings`: wizard de correo con modal scrollable y acciones responsivas.
  - `admin/users`: formulario de creación adaptable, tabla scrollable y acciones táctiles.
  - `admin/dashboards`: tabla scrollable, modal adaptable y botones de acción responsive.
  - `profile/register`: mejor distribución de acciones y safe areas en pantallas estrechas.
- Componentes transversales adaptados:
  - `ConfirmModal`: ancho fluido, botones responsivos y padding con safe areas.
  - `ToastProvider`: ubicación segura en móvil y ancho máximo adaptativo.
  - `MentionInput`: sugerencias de menciones sin desbordar en pantallas estrechas.
  - `EditUserModal` / `UserLogsModal`: mejor lectura/interacción en móvil.

## Contrato backend para app móvil

La app móvil podrá reutilizar las rutas existentes `app/api/**` porque:

- la API es JSON-first;
- la autorización es por sesión (`JWT`) y permisos por recurso (`dashboard/folder`);
- las operaciones críticas (tareas/tableros/compartir) ya exponen endpoints claros.

## Recomendaciones siguientes (fase app nativa)

- Agregar versión de API (`/api/v1/...`) antes de publicar apps móviles.
- Añadir refresh token dedicado para móvil (no solo cookie web).
- Centralizar validaciones de payload (zod/schemas) para mantener compatibilidad.
- Instrumentar métricas por endpoint (p95/p99, errores, timeouts).
- Crear suite de pruebas E2E móvil para:
  - login
  - tablero (carga, mover tarea, guardar)
  - compartir y permisos.
