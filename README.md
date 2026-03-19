# PLANIFIWEB Gateway

Repositorio principal del ecosistema publico de PLANIFIWEB.

Incluye:
- `hub/`: sitio principal de `guidojh.pro`
- `frontend/`: gateway comercial y operativo de `planifiweb.guidojh.pro`
- `backend/`: API FastAPI publicada en Koyeb
- `deploy/`: scripts y guias de despliegue

## Estado operativo actual

| Componente | Estado | Dominio / servicio | Notas |
|---|---|---|---|
| Hub principal | Activo | `https://guidojh.pro` | Netlify |
| Gateway PLANIFIWEB | Activo | `https://planifiweb.guidojh.pro` | Next.js en Netlify |
| App autenticada | Activa | `https://app.planifiweb.guidojh.pro` | Repo separado `PLANIFIWEB`, Netlify |
| Backend API | Activo | `https://planifiweb-platform-guidojh-de66ea4f.koyeb.app` | FastAPI en Koyeb |
| Base de datos productiva | Activa | PostgreSQL en Supabase | Proyecto productivo `planifiweb-platform-prod` |
| Correo transaccional | Activo | Resend | Mientras `guidojh.pro` no este verificado, usa fallback a `onboarding@resend.dev` |
| Vercel | Fuera de operacion | N/A | Ya no forma parte del flujo productivo |

## Topologia publica

```text
https://guidojh.pro/
└── hub personal y de proyectos

https://planifiweb.guidojh.pro/
├── landing comercial
├── login / registro
├── dashboard de cuenta
├── panel admin
├── recuperacion y cambio de contraseña
└── /api/* -> proxy al backend FastAPI en Koyeb

https://app.planifiweb.guidojh.pro/
└── aplicacion real de PLANIFIWEB para usuarios autenticados
```

## Funcionalidades implementadas

### Cuenta y acceso
- registro con aceptacion legal
- login con errores especificos:
  - `Correo no registrado`
  - `Contraseña incorrecta`
- sesion por cookie `HttpOnly`
- CSRF por doble envio
- cambio de contraseña autenticado desde el gateway
- recuperacion de contraseña por correo con token de un solo uso
- rutas publicas de recuperacion:
  - `/recuperar-acceso`
  - `/restablecer-contrasena`

### Suscripcion y pagos
- tres planes mensuales:
  - `Start` `S/9` `20` generaciones por dia
  - `Pro` `S/19` `60` generaciones por dia
  - `Institucional` `S/39` `200` generaciones por dia
- pago visible por Yape
- subida de comprobante con revision administrativa
- panel admin para revisar pagos y activar cuentas
- precheck IA de comprobantes desactivado en el entorno free actual

### Aplicacion curricular
- acceso a la app solo con suscripcion activa y documentos legales aceptados
- generacion IA operativa desde backend Koyeb
- la app delega seguridad de credenciales al gateway

### Descubrimiento web
- indexables:
  - `https://guidojh.pro`
  - `https://planifiweb.guidojh.pro`
- no indexables:
  - `https://app.planifiweb.guidojh.pro`
  - `/admin`
  - `/dashboard`
  - `/api/*`
- el gateway publica:
  - `robots.txt`
  - `sitemap.xml`
  - `llms.txt`

## Variables de entorno clave

### Gateway `frontend`

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb.guidojh.pro
NEXT_PUBLIC_APP_URL=https://app.planifiweb.guidojh.pro
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://planifiweb-platform-guidojh-de66ea4f.koyeb.app
```

### Backend `backend`

```bash
APP_ENV=production
DATABASE_URL=<postgresql activo>
PUBLIC_APP_URL=https://planifiweb.guidojh.pro
CORS_ORIGINS=https://planifiweb.guidojh.pro,https://app.planifiweb.guidojh.pro
SESSION_COOKIE_DOMAIN=
API_DOCS_ENABLED=false
PAYMENT_PRECHECK_ENABLED=false
RESEND_API_KEY=<token>
RESEND_FROM_EMAIL=noreply@guidojh.pro
RESEND_FROM_NAME=PLANIFIWEB
PASSWORD_RESET_TOKEN_TTL_MINUTES=60
PASSWORD_RESET_URL_BASE=https://planifiweb.guidojh.pro/restablecer-contrasena
```

## Desarrollo local

### Backend

```powershell
cd backend
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m alembic upgrade head
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Gateway

```powershell
cd frontend
npm install
npm run dev
```

### App separada

```powershell
cd ..\PLANIFIWEB
npm install
npm run dev
```

## Despliegue

### Netlify
- hub: `hub/`
- gateway: `frontend/`
- app: repo separado `PLANIFIWEB`

### DNS
- proveedor: Porkbun
- dominios productivos:
  - `guidojh.pro`
  - `www.guidojh.pro`
  - `planifiweb.guidojh.pro`
  - `app.planifiweb.guidojh.pro`

### Backend
- compute: Koyeb
- base de datos activa: PostgreSQL en Supabase
- scripts de despliegue y guias en:
  - [deploy/netlify/README.md](deploy/netlify/README.md)
  - [deploy/koyeb/README.md](deploy/koyeb/README.md)
  - [deploy/seenode/README.md](deploy/seenode/README.md)

## Quality gate

```powershell
cd backend
venv\Scripts\python.exe -m pytest tests -q

cd ..\frontend
npm run lint
npm run typecheck
npm run build

cd ..\PLANIFIWEB
npm run build
```

## Documentacion relacionada
- [RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md)
- [DOCUMENTACION.md](DOCUMENTACION.md)
- [frontend/README.md](frontend/README.md)
- [deploy/netlify/README.md](deploy/netlify/README.md)
- [deploy/koyeb/README.md](deploy/koyeb/README.md)
- [deploy/seenode/README.md](deploy/seenode/README.md)
- [deploy/vercel/README.md](deploy/vercel/README.md)

## Nota operativa

No guardes secretos en el repo, en MCP ni en archivos versionados. Los tokens compartidos en chat deben considerarse expuestos y deben rotarse.
