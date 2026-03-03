# System Health Report - 2026-03-03

Base URL evaluada: `https://misproyectos.com.co`  
Branch: `codex/dash-setup`

## Estado General

- Disponibilidad API crítica (`/api/health`): **OK**
- Base de datos (Neon Postgres): **OK**
- Seguridad de transporte (HSTS + headers base): **OK**
- Capacidad concurrente observada en endpoint liviano (`/api/health`): **estable hasta 100 conexiones de prueba**
- Dependencias productivas auditadas (`npm audit --omit=dev`): **0 vulnerabilidades activas**

## Validaciones Ejecutadas

## 1) Seguridad y cabeceras en producción

Se validó respuesta HTTP en `https://misproyectos.com.co` y `https://misproyectos.com.co/api/health`.

Headers presentes:
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`

Resultado: **correcto para baseline de hardening web**.

## 2) Latencia HTTP (25 muestras por endpoint)

- `/`: avg **135.1 ms**, p50 **121.0 ms**, p95 **201.7 ms**, p99 **308.1 ms**, errores **0**
- `/login`: avg **167.8 ms**, p50 **112.2 ms**, p95 **197.0 ms**, p99 **1138.6 ms** (outlier aislado), errores **0**
- `/api/health`: avg **152.7 ms**, p50 **142.4 ms**, p95 **214.5 ms**, p99 **310.9 ms**, errores **0**
- `/manifest.webmanifest`: avg **133.6 ms**, p50 **113.7 ms**, p95 **217.6 ms**, p99 **243.4 ms**, errores **0**

Conclusión: latencia general saludable; existe variabilidad ocasional en p99 (esperable en serverless cold paths).

## 3) Salud DB (Neon)

Métricas de conectividad medidas:
- `connectMs`: **505 ms**
- Query `SELECT 1` (30 muestras): min **72 ms**, avg **87.03 ms**, p95 **134 ms**, p99 **149 ms**, max **149 ms**

Estado y carga actual:
- `current_database`: `neondb`
- `current_user`: `neondb_owner`
- `current_connections`: **10**
- `max_connections`: **901** (server setting reportado)

Tablas con mayor volumen estimado:
- `audit_logs`: 246
- `task_comments`: 181
- `task_assignees`: 122
- `login_attempts`: 94
- `tasks`: 84

## 4) Prueba de concurrencia (autocannon, 20s)

Target: `GET /api/health` (sin autenticación, consulta simple a DB)

- `c=20`: ~**130.5 req/s**, p95 **337 ms**, errores **0**
- `c=50`: ~**337.5 req/s**, p95 **263 ms**, errores **0**
- `c=100`: ~**588.8 req/s**, p95 **412 ms**, errores **0**

Interpretación:
- La plataforma soporta sin error al menos 100 conexiones simultáneas en endpoint liviano.
- Para endpoints de negocio (`/api/tasks`, `/api/dashboards`, joins, permisos), el límite real será menor.
- Estimación operativa conservadora actual: **50-120 usuarios activos concurrentes** con buena experiencia, dependiendo del patrón de uso.

## Cambios Correctivos Aplicados en Este Ciclo

## 1) API-friendly auth para móvil e integraciones

Archivo: `middleware.ts`

Problema detectado:
- Requests no autenticadas a `/api/tasks` y `/api/dashboards` recibían HTML de login por redirect.

Corrección:
- Para rutas API protegidas, middleware ahora retorna JSON:
  - `401 { "error": "Unauthorized" }` si no hay sesión
  - `403 { "error": "Privacy policy not accepted" }` si aplica

Impacto:
- Contrato API consistente para futura app móvil y clientes no-browser.

## 2) Upgrade de seguridad de framework

- `next`: `16.1.1` -> `16.1.6`
- `eslint-config-next`: `16.1.1` -> `16.1.6`

Resultado de `npm audit --omit=dev`:
- Vulnerabilidades en `next` quedaron resueltas.

## 3) Hardening de exportaciones

Archivo: `app/api/export/route.ts`

Problemas detectados:
- Dependencia `xlsx` vulnerable.
- Endpoint de exportación sin control robusto de autorización por recurso.

Correcciones:
- Migración de exportación a CSV (`text/csv; charset=utf-8`) con escape seguro de campos.
- Eliminación de `xlsx` del proyecto (`npm uninstall xlsx`).
- Validación explícita de sesión y permisos por dashboard/carpeta antes de exportar.
- Uso del pool central (`lib/db`) y eliminación de conexiones sueltas.

Resultado:
- `npm audit --omit=dev` queda en **0 vulnerabilidades** de producción.
- Exportaciones quedan alineadas con contrato API para app móvil (descarga segura y controlada).

## Riesgos Residuales y Recomendaciones

1. TLS laxo en algunos conectores (`rejectUnauthorized: false`):
- Revisar y endurecer donde sea viable (DB/SMTP/export), especialmente en producción.

2. CSP permite `'unsafe-inline'` y `'unsafe-eval'`:
- Mantener temporalmente por compatibilidad.
- Plan recomendado: remover gradualmente con nonce/hash en scripts y sin `eval`.

3. Tech debt de Next:
- Advertencia vigente: convención `middleware` deprecada en Next 16.
- Migrar a `proxy.ts` en siguiente ciclo para alineación futura.

## Veredicto

Sistema operativo en producción con salud **BUENA** para el tamaño actual.
Con los cambios de este ciclo, quedó mejor preparado para app móvil (respuestas API semánticas), exportaciones seguras y mejor postura de seguridad en dependencias.
