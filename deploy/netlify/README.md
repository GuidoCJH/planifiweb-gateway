# Deploy en Netlify + Porkbun + Koyeb

Arquitectura final:

- `guidojh.pro` -> hub principal desde `hub/`
- `planifiweb.guidojh.pro` -> gateway Next.js desde `frontend/`
- `app.planifiweb.guidojh.pro` -> app real de `PLANIFIWEB`
- backend FastAPI -> Koyeb

## 1. Crear los sites de Netlify

```powershell
$env:NETLIFY_AUTH_TOKEN="TU_TOKEN"
.\deploy\netlify\bootstrap.ps1
```

El script:

- detecta o crea `guidojh-root`
- detecta o crea `planifiweb-gateway`
- detecta o crea `planifiweb-app`
- guarda el estado en `.local/netlify/bootstrap-state.json`
- imprime los registros DNS para Porkbun

## 2. Configurar dominios en Netlify

### Hub
- site: `guidojh-root`
- custom domain: `guidojh.pro`
- alias: `www.guidojh.pro`
- primary domain: `guidojh.pro`

### Gateway
- site: `planifiweb-gateway`
- custom domain: `planifiweb.guidojh.pro`
- primary domain: `planifiweb.guidojh.pro`

### App
- site: `planifiweb-app`
- custom domain: `app.planifiweb.guidojh.pro`
- primary domain: `app.planifiweb.guidojh.pro`

Si Netlify pide TXT de verificación, agrégalo exactamente como lo muestre el panel.

## 3. DNS en Porkbun

Registros esperados:

| Tipo | Host | Destino |
|---|---|---|
| `ALIAS` | `@` | `apex-loadbalancer.netlify.com` |
| `CNAME` | `www` | `guidojh-root.netlify.app` |
| `CNAME` | `planifiweb` | `planifiweb-gateway.netlify.app` |
| `CNAME` | `app.planifiweb` | `planifiweb-app.netlify.app` |

Usa el dominio `.netlify.app` real que aparezca en el estado guardado si llegara a variar.

## 4. Variables críticas

### Gateway

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb.guidojh.pro
NEXT_PUBLIC_APP_URL=https://app.planifiweb.guidojh.pro
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://web-nr3pfzfysqpy.up-de-fra1-k8s-1.apps.run-on-seenode.com
```

En produccion reemplaza ese valor por el host real de Koyeb:

```bash
API_PROXY_TARGET=https://<tu-servicio>.koyeb.app
```

### App

```bash
VITE_API_BASE_URL=https://planifiweb.guidojh.pro/api
VITE_APP_PUBLIC_URL=https://app.planifiweb.guidojh.pro
```

### Backend

```bash
PUBLIC_APP_URL=https://planifiweb.guidojh.pro
CORS_ORIGINS=https://planifiweb.guidojh.pro,https://app.planifiweb.guidojh.pro
SESSION_COOKIE_DOMAIN=
```

Bootstrap recomendado del backend:

```powershell
.\deploy\koyeb\bootstrap.ps1
```

## 5. Smoke mínimo

```powershell
.\deploy\security-smoke.ps1
```

Validar:

- `https://guidojh.pro`
- `https://www.guidojh.pro` -> redirect
- `https://planifiweb.guidojh.pro`
- `https://app.planifiweb.guidojh.pro`
- `https://planifiweb.guidojh.pro/api/auth/me`
