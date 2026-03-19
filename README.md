# PLANIFIWEB Platform Gateway

Repositorio principal del hub público y gateway comercial de `PLANIFIWEB`.

## Arquitectura actual

```text
https://guidojh.pro/
└── hub principal personal/profesional

https://planifiweb.guidojh.pro/
├── landing comercial + auth + dashboard + admin
└── /api/* -> gateway Next.js hacia FastAPI en Koyeb

https://app.planifiweb.guidojh.pro/
└── app real de PLANIFIWEB (React/Vite), ya sin prefijo /app
```

## Flujo del usuario

1. El docente entra por `planifiweb.guidojh.pro`.
2. Crea cuenta o inicia sesión.
3. Acepta términos y política si corresponde.
4. Elige plan y paga por Yape.
5. Sube comprobante y pasa a `pending_review`.
6. Admin revisa el pago en `/admin`.
7. Si se aprueba, entra a `https://app.planifiweb.guidojh.pro/dashboard`.

## Variables de entorno

### Gateway `frontend/.env.local`

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb.guidojh.pro
NEXT_PUBLIC_APP_URL=https://app.planifiweb.guidojh.pro
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://web-nr3pfzfysqpy.up-de-fra1-k8s-1.apps.run-on-seenode.com
```

En produccion Netlify debe apuntar al host Koyeb real:

```bash
API_PROXY_TARGET=https://<tu-servicio>.koyeb.app
```

### Backend `backend/.env`

```bash
PUBLIC_APP_URL=https://planifiweb.guidojh.pro
CORS_ORIGINS=https://planifiweb.guidojh.pro,https://app.planifiweb.guidojh.pro
SESSION_COOKIE_DOMAIN=
```

## Desarrollo local

### Backend

```powershell
cd backend
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m alembic upgrade head
venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Gateway

```powershell
cd frontend
npm install
npm run dev
```

## Netlify + Porkbun

- Hub: `hub/`
- Gateway: `frontend/`
- App real: repo separado `PLANIFIWEB`
- DNS externo: `Porkbun`
- Backend: `Koyeb`

Checklist operativo:

```powershell
.\deploy\netlify\bootstrap.ps1
```

Guía completa:

- [deploy/netlify/README.md](deploy/netlify/README.md)
- [deploy/koyeb/README.md](deploy/koyeb/README.md)

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

## Descubrimiento web

- indexable:
  - `https://guidojh.pro`
  - `https://planifiweb.guidojh.pro`
- no indexable:
  - `https://app.planifiweb.guidojh.pro`
  - `/admin`, `/dashboard`, `/api/*`

El gateway publica:

- `robots.txt`
- `sitemap.xml`
- `llms.txt`

## Nota operativa

No guardes tokens en el repo ni en config de MCP. Usa variables de entorno locales o del proveedor y rota cualquier token expuesto en chat después del bootstrap.
