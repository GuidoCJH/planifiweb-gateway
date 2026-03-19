# Frontend Gateway - PLANIFIWEB

Gateway publico de PLANIFIWEB construido con Next.js.

## Responsabilidades

Este frontend es la superficie oficial para:
- landing comercial
- login y registro
- dashboard de cuenta
- seleccion de planes
- checkout Yape
- panel admin
- aceptacion legal
- cambio de contraseña
- recuperacion de acceso
- proxy `/api` al backend FastAPI en Koyeb

La app curricular real no vive aqui. Se publica en `https://app.planifiweb.guidojh.pro` desde el repositorio separado `PLANIFIWEB`.

## Dominios

- productivo: `https://planifiweb.guidojh.pro`
- alias tecnico Netlify: `planifiweb-gateway.netlify.app` con redireccion canónica

## Variables de entorno

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb.guidojh.pro
NEXT_PUBLIC_APP_URL=https://app.planifiweb.guidojh.pro
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://planifiweb-platform-guidojh-de66ea4f.koyeb.app
```

## Rutas clave

### Publicas
- `/`
- `/login`
- `/register`
- `/recuperar-acceso`
- `/restablecer-contrasena`
- `/terminos`
- `/privacidad`

### Operativas
- `/dashboard`
- `/admin`
- `/api/*`

## Seguridad y comportamiento

- `login` muestra mensajes especificos del backend
- `forgot-password` usa respuesta neutra para no enumerar correos en la UI publica
- `dashboard#seguridad` contiene el formulario de cambio de contraseña
- la app `PLANIFIWEB` enlaza a estas rutas y no mantiene formularios de credenciales propios

## Desarrollo local

```powershell
npm install
npm run dev
```

Servidor esperado del backend en local:
- `http://127.0.0.1:8000`

## Validacion tecnica

```powershell
npm run lint
npm run typecheck
npm run build
```

## Produccion

- hosting: Netlify
- runtime: Next.js
- dominio canónico: `https://planifiweb.guidojh.pro`
- backend proxied: Koyeb
