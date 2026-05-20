# roadmap-4shine

Plataforma colaborativa de roadmaps y tableros de proyecto. Permite organizar
trabajo en carpetas y dashboards, gestionar tareas con asignados y comentarios,
colaborar en tiempo real, y compartir tableros de forma pública o con usuarios
concretos.

## Funcionalidades

- **Workspace** con carpetas anidadas y dashboards (tableros tipo kanban y canvas colaborativo).
- **Tareas** con estados, prioridades, asignados, fechas límite y notificaciones por correo.
- **Comentarios** en tareas con menciones (`@usuario`).
- **Tiempo real** vía SSE + Postgres `LISTEN/NOTIFY`.
- **Compartir**: enlaces públicos por token y colaboración granular por dashboard/carpeta.
- **Autenticación** propia (JWT en cookie httpOnly) y SSO OAuth2.
- **Panel de administración**: usuarios, dashboards, ajustes, SSO, soporte y métricas.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- PostgreSQL (alojado en [Neon](https://neon.tech)) vía `pg`
- Autenticación con `jose` (JWT) y `bcryptjs`
- Correo con `nodemailer`
- Despliegue en [Vercel](https://vercel.com)

## Requisitos

- Node.js 20+
- Una base de datos PostgreSQL

## Configuración

Crea un archivo `.env.local` en la raíz con las siguientes variables:

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | Sí | Cadena de conexión a PostgreSQL. |
| `JWT_SECRET` | Sí (en producción) | Secreto para firmar los JWT de sesión. En desarrollo usa un valor inseguro por defecto si falta. |
| `CRON_SECRET` | Sí (para el cron) | Token que autentica el endpoint `/api/cron/notifications`. Vercel Cron lo envía como `Authorization: Bearer`. |
| `NEXT_PUBLIC_APP_URL` | Opcional | URL pública de la app; se usa en los enlaces de los correos. |

> La configuración de SMTP (host, usuario, contraseña, remitente) no se define por
> variables de entorno: se gestiona desde el panel de administración y se almacena
> en la tabla `system_settings`.

### Base de datos

Los scripts de esquema están en `scripts/`. `scripts/complete_schema.sql` contiene
el esquema base; el resto de archivos `.sql` son migraciones incrementales.

## Comandos

```bash
npm run dev      # Servidor de desarrollo (http://localhost:3000)
npm run build    # Build de producción
npm run start    # Sirve el build de producción
npm run lint     # ESLint
```

### Pruebas

```bash
npm run test:e2e:export     # E2E: exportación CSV y contrato de la API
npm run test:e2e:realtime   # E2E: sincronización en tiempo real
npm run test:smoke:remote   # Smoke test contra un entorno remoto
npm run verify:release      # build + ambas suites E2E (puerta previa a release)
```

Las pruebas E2E levantan el servidor y se conectan a la base de datos real
indicada en `DATABASE_URL`.

## Despliegue

La aplicación se despliega en Vercel. El cron de notificaciones está definido en
`vercel.json` y se ejecuta cada hora; requiere que `CRON_SECRET` esté configurado
en las variables de entorno del proyecto en Vercel.

El estado del servicio puede consultarse en el endpoint `GET /api/health`.
