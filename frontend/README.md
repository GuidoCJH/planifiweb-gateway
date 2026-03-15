# Frontend Gateway - PLANIFIWEB

Landing comercial, centro de cuenta y puerta de entrada al producto.

## Responsabilidades

- captar usuarios y presentar la propuesta comercial
- registrar e iniciar sesión sin salir del flujo principal
- exigir aceptación legal cuando corresponda
- mostrar estado de licencia y uso en `/dashboard`
- permitir suscripción y carga de comprobantes
- exponer panel admin en `/admin`
- redirigir a `PLANIFIWEB` en `/app`

## Seguridad y arquitectura

- sesión basada en cookie `HttpOnly`
- consumo del backend bajo `/api`
- enlaces visibles a `Términos`, `Privacidad` y soporte Telegram
- cookies solo esenciales; no se usan cookies publicitarias ni analíticas

## Variables de entorno

```bash
# Gateway en Vercel: trabaja por mismo origen usando /api.
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb-gateway.vercel.app
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=

# Variables de build para rewrites externos
API_PROXY_TARGET=https://web-nr3pfzfysqpy.up-de-fra1-k8s-1.apps.run-on-seenode.com
APP_PROXY_TARGET=https://planifiweb-app.vercel.app
```

## Desarrollo

```bash
npm install
npm run dev
```

## Validación

```bash
npm run lint
npm run typecheck
npm run build
```

## Vercel Hobby en produccion temporal

```bash
npm ci
npm run build
npm run start
```

En Vercel:
- root directory: `frontend`
- `/api/*` se resuelve por rewrite hacia SeeNode
- `/app/*` se resuelve por rewrite hacia el proyecto real de `PLANIFIWEB`
- URL operativa actual: `https://planifiweb-gateway.vercel.app`
