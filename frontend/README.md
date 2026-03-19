# Frontend Gateway - PLANIFIWEB

Next.js público para:

- landing comercial
- login y registro
- dashboard de cuenta
- checkout Yape
- panel admin
- proxy `/api` hacia Koyeb

## Variables

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb.guidojh.pro
NEXT_PUBLIC_APP_URL=https://app.planifiweb.guidojh.pro
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://web-nr3pfzfysqpy.up-de-fra1-k8s-1.apps.run-on-seenode.com
```

En produccion:

```bash
API_PROXY_TARGET=https://<tu-servicio>.koyeb.app
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

## Netlify

- root directory del site: `frontend`
- framework: Next.js
- plugin: `@netlify/plugin-nextjs`
- dominio productivo: `https://planifiweb.guidojh.pro`
- la app real ya no vive bajo `/app`; ahora va a `https://app.planifiweb.guidojh.pro`
