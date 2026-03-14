# PLANIFIWEB Platform Gateway

Repositorio principal de la puerta comercial y operativa de `PLANIFIWEB`.

## Arquitectura objetivo

```text
https://planifiweb-gateway.vercel.app/
├── /              -> Next.js landing, auth, dashboard, legal y panel admin
├── /dashboard     -> centro de cuenta, licencia y continuidad del flujo
├── /api/*         -> rewrite Vercel hacia FastAPI en SeeNode
└── /app/*         -> rewrite Vercel hacia PLANIFIWEB desplegado por separado
```

## Flujo productivo

1. El docente entra a la landing.
2. Crea su cuenta o inicia sesión desde el mismo flujo principal.
3. Acepta los documentos legales vigentes.
4. Elige el plan `planifiweb_pro`.
5. Sube su comprobante de pago manual por Yape.
6. El sistema deja la cuenta en `pending_review`.
7. Un admin revisa el pago desde `/admin`.
8. Si se aprueba, la cuenta pasa a `active` y entra a `/app/dashboard` con la misma sesión segura.

## Seguridad implementada

- Autenticación por cookie `HttpOnly` de sesión.
- JWT firmado en backend, pero no persistido en `localStorage` del navegador.
- Comprobantes privados: ya no se publican por `/uploads`; se sirven por endpoint autenticado o URL firmada S3.
- `Swagger` / `OpenAPI` desactivables por entorno y pensados para quedar fuera en producción.
- `TrustedHostMiddleware`, headers de seguridad y política CORS explícita.
- Rate limiting aplicativo para login, registro, pagos, admin e IA.
- Rate limiting distribuido compatible con Redis cuando `REDIS_URL` está configurado.
- Aceptación legal versionada para Términos y Política de Privacidad.
- Soporte visible por Telegram a `@guidojh`.

## Política operativa de acceso

| Estado | Acceso a `/app` | IA diaria | Exportación |
|---|---:|---:|---:|
| `awaiting_payment` | No | 0 | No |
| `pending_review` | Sí | 3 | No |
| `active` | Sí | 20 | Sí |
| `rejected` / `expired` / `suspended` | No | 0 | No |

## Variables de entorno

### Backend
Copia `backend/.env.example` a `backend/.env`.

Variables clave:
- `APP_ENV`
- `SECRET_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `ALLOWED_EMAIL_DOMAINS`
- `CORS_ORIGINS`
- `TRUSTED_HOSTS`
- `API_DOCS_ENABLED`
- `SESSION_COOKIE_*`
- `S3_*`
- `AI_PROVIDER`, `AI_PROVIDER_CHAIN`, `AI_TIMEOUT_SECONDS`
- `LEGAL_TERMS_VERSION`, `LEGAL_PRIVACY_VERSION`

### Landing Next.js
Copia `frontend/.env.example` a `frontend/.env.local`.

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`
- `API_PROXY_TARGET`
- `APP_PROXY_TARGET`

Para staging en Vercel usa:

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb-gateway.vercel.app
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://planifiweb-api.seenode.com
APP_PROXY_TARGET=https://planifiweb-app.vercel.app
```

## Desarrollo local

### Backend
```powershell
cd backend
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m alembic upgrade head
venv\Scripts\python.exe scripts/create_admin.py --email admin@local.test --password "Admin12345!" --name "Admin"
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Landing
```powershell
cd frontend
npm install
npm run dev
```

## Despliegue actual: Vercel Hobby + SeeNode

### Gateway en Vercel
```bash
Proyecto: `frontend`
Root Directory: `frontend`
```

### Backend en SeeNode
```bash
Build command: `cd backend && pip install -r requirements.txt`
Run command: `cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000`
```

### App real en Vercel
Despliega el repositorio `PLANIFIWEB` por separado y publícalo como proyecto dedicado.

### Guía detallada
Usa [deploy/vercel/README.md](deploy/vercel/README.md) como checklist operativo.
Usa [deploy/vercel/bootstrap.ps1](deploy/vercel/bootstrap.ps1) para sincronizar variables y redeployar Vercel.
Usa [deploy/seenode/bootstrap.ps1](deploy/seenode/bootstrap.ps1) para generar el entorno productivo del backend y verificar el estado de GitHub en SeeNode.

### Alternativa legacy
El archivo [deploy/nginx/planifiweb.production.conf](deploy/nginx/planifiweb.production.conf) sigue disponible como referencia para una topología clásica con reverse proxy propio.

## Quality gate

```powershell
cd backend; venv\Scripts\python.exe -m pytest tests -q
cd ..\frontend; npm run lint; npm run typecheck; npm run build
```

## Checklist de release

1. Rotar `SECRET_KEY` y cualquier API key usada en pruebas.
2. Configurar PostgreSQL real.
3. Configurar bucket privado S3 o compatible.
4. Dejar `API_DOCS_ENABLED=false`.
5. Dejar `SESSION_COOKIE_SECURE=true` detrás de HTTPS.
6. Publicar gateway y app en Vercel, y backend en SeeNode.
7. Crear al menos una cuenta admin real.
8. Verificar subida de comprobante, aprobación admin y entrada final a `/app/dashboard`.

## Estado actual del repositorio

- Backend: `pytest` pasando.
- Landing: `lint`, `typecheck` y `build` listos.
- Legal: Términos y Privacidad visibles y exigidos en registro/aceptación.
- Soporte: botón flotante y enlaces visibles a Telegram.
- Vercel Hobby: gateway y app ya publicados en `planifiweb-gateway.vercel.app` y `planifiweb-app.vercel.app`.
- SeeNode: proyecto `planifiweb-platform` y PostgreSQL creados.
- Bloqueo restante de backend: el workspace de SeeNode todavía no tiene autorización GitHub activa para crear `planifiweb-api` desde el repo. El script `deploy/seenode/bootstrap.ps1` deja el `env` generado y la URL exacta de autorización.

## Nota importante sobre cookies

No se implementó banner de consentimiento porque el servicio usa cookies estrictamente necesarias para autenticación, continuidad de sesión y seguridad. No se usan cookies publicitarias ni de analítica de terceros.

---
© 2026 PLANIFIWEB Platform.
