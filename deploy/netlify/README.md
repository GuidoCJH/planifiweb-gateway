# Deploy en Netlify + Porkbun + Koyeb

Guia operativa del despliegue publico actual.

## Arquitectura objetivo

- `guidojh.pro` -> hub principal desde `hub/`
- `planifiweb.guidojh.pro` -> gateway Next.js desde `frontend/`
- `app.planifiweb.guidojh.pro` -> app real del repo separado `PLANIFIWEB`
- backend FastAPI -> Koyeb
- base de datos activa -> PostgreSQL en SeeNode

## Sites esperados en Netlify

### Hub
- site: `guidojh-root`
- root directory: `hub`
- dominio principal: `guidojh.pro`
- alias: `www.guidojh.pro`

### Gateway
- site: `planifiweb-gateway`
- root directory: `frontend`
- dominio principal: `planifiweb.guidojh.pro`

### App
- site: `planifiweb-app`
- repositorio: `PLANIFIWEB`
- dominio principal: `app.planifiweb.guidojh.pro`

## Bootstrap por CLI

```powershell
$env:NETLIFY_AUTH_TOKEN="TU_TOKEN"
.\deploy\netlify\bootstrap.ps1
```

El script:
- crea o resuelve los tres sites
- guarda estado en `.local/netlify/bootstrap-state.json`
- imprime los registros DNS esperados para Porkbun

## DNS en Porkbun

Registros esperados:

| Tipo | Host | Destino |
|---|---|---|
| `ALIAS` | `@` | `apex-loadbalancer.netlify.com` |
| `CNAME` | `www` | `guidojh-root.netlify.app` |
| `CNAME` | `planifiweb` | `planifiweb-gateway.netlify.app` |
| `CNAME` | `app.planifiweb` | `planifiweb-app.netlify.app` |

Si Netlify exige un TXT de verificacion, agregalo exactamente como lo muestre el panel.

## Variables criticas

### Gateway

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb.guidojh.pro
NEXT_PUBLIC_APP_URL=https://app.planifiweb.guidojh.pro
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://planifiweb-platform-guidojh-de66ea4f.koyeb.app
```

### App

```bash
VITE_API_BASE_URL=https://planifiweb.guidojh.pro/api
VITE_APP_PUBLIC_URL=https://app.planifiweb.guidojh.pro
```

## Despliegue manual recomendado

### Gateway

```powershell
cd frontend
$env:NETLIFY_AUTH_TOKEN="TU_TOKEN"
npx netlify deploy --prod --build --site <site-id>
```

### App

```powershell
cd ..\PLANIFIWEB
$env:NETLIFY_AUTH_TOKEN="TU_TOKEN"
npx netlify deploy --prod --build --site <site-id>
```

## Smoke minimo

Validar despues de cada despliegue:
- `https://guidojh.pro`
- `https://www.guidojh.pro` -> redirect
- `https://planifiweb.guidojh.pro`
- `https://app.planifiweb.guidojh.pro`
- `https://planifiweb.guidojh.pro/api/auth/me`
- `https://planifiweb.guidojh.pro/recuperar-acceso`
- `https://planifiweb.guidojh.pro/restablecer-contrasena`

## Nota operativa

Netlify hospeda solo las superficies web. La API no debe desplegarse aqui; se sirve desde Koyeb y se expone al navegador a traves del proxy `/api` del gateway.
