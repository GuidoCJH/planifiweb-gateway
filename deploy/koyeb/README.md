# Deploy del backend en Koyeb

Guia operativa del backend productivo de PLANIFIWEB.

## Estado actual

- compute productivo: Koyeb
- servicio: `planifiweb-platform/planifiweb-api`
- URL productiva actual: `https://planifiweb-platform-guidojh-de66ea4f.koyeb.app`
- health checks activos:
  - `/health`
  - `/ready`

## Importante sobre la base de datos

Estado real actual:
- backend en Koyeb
- base de datos activa en PostgreSQL de Supabase
- proyecto productivo: `planifiweb-platform-prod`

El corte de base ya esta cerrado. SeeNode no forma parte del runtime productivo.

## Variables minimas del backend

```bash
APP_ENV=production
SECRET_KEY=<secreto>
DATABASE_URL=<postgresql activo>
PUBLIC_APP_URL=https://planifiweb.guidojh.pro
CORS_ORIGINS=https://planifiweb.guidojh.pro,https://app.planifiweb.guidojh.pro
TRUSTED_HOSTS=planifiweb.guidojh.pro,*.koyeb.app
SESSION_COOKIE_NAME=planifiweb_session
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
SESSION_COOKIE_DOMAIN=
API_DOCS_ENABLED=false
PAYMENT_PRECHECK_ENABLED=false
GROQ_API_KEY=<token>
GROQ_MODEL=llama-3.1-8b-instant
RESEND_API_KEY=<token>
RESEND_FROM_EMAIL=noreply@guidojh.pro
RESEND_FROM_NAME=PLANIFIWEB
PASSWORD_RESET_TOKEN_TTL_MINUTES=60
PASSWORD_RESET_URL_BASE=https://planifiweb.guidojh.pro/restablecer-contrasena
```

## Comando de arranque

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Bootstrap automatizado

```powershell
$env:KOYEB_API_TOKEN="TU_TOKEN_KOYEB"
$env:SUPABASE_ACCESS_TOKEN="TU_TOKEN_SUPABASE"
.\deploy\koyeb\bootstrap.ps1
```

El bootstrap:
- prepara un despliegue desde `backend/`
- puede crear o resolver proyecto en Supabase
- genera archivos de estado en `.local/koyeb/` y `.local/supabase/`

Usalo solo si vas a reconstruir o rehacer el entorno.

## Corte de base SeeNode -> Supabase

Script one-off agregado:

```powershell
$env:KOYEB_API_TOKEN="TU_TOKEN_KOYEB"
$env:SUPABASE_MCP_ACCESS_TOKEN="TU_TOKEN_SUPABASE"
.\deploy\koyeb\cutover-db-to-supabase.ps1
```

Ese script:
- crea o reutiliza el proyecto `planifiweb-platform-prod`
- aplica Alembic sobre Supabase
- genera respaldo logico local del origen
- migra solo la cuenta admin
- actualiza `DATABASE_URL` en Koyeb

## Redeploy manual desde el repo

Si solo quieres publicar cambios de backend en el servicio existente, usa Koyeb CLI contra el servicio actual y conserva las variables cargadas.

Puntos que no debes sobrescribir por accidente:
- `DATABASE_URL`
- `GROQ_API_KEY`
- `SECRET_KEY`
- configuracion de correo `RESEND_*`

## Smoke recomendado

```powershell
Invoke-RestMethod -Uri 'https://planifiweb-platform-guidojh-de66ea4f.koyeb.app/health'
Invoke-RestMethod -Uri 'https://planifiweb-platform-guidojh-de66ea4f.koyeb.app/ready'
```

Validar tambien desde el gateway:
- `https://planifiweb.guidojh.pro/api/auth/me`
- `https://planifiweb.guidojh.pro/api/auth/csrf`
- login
- recuperacion de contraseña
- generacion IA

## Nota sobre Resend

Mientras `guidojh.pro` no este verificado en Resend, el backend usa fallback a `onboarding@resend.dev` para no bloquear el flujo de recuperacion.
