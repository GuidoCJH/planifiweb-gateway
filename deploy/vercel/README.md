# Deploy split: Vercel + SeeNode

Esta carpeta concentra la configuración operativa para staging:

- `PAGE LANDING SAAS/frontend` en Vercel como gateway público
- `PLANIFIWEB` en Vercel como app separada
- `PAGE LANDING SAAS/backend` en SeeNode como FastAPI productiva

## 1. Proyecto Vercel del gateway

Root directory: `frontend`

Variables:

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb-gateway-staging.vercel.app
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://planifiweb-api-staging.seenode.com
APP_PROXY_TARGET=https://planifiweb-app-staging.vercel.app
```

Con estas variables, `frontend/next.config.ts` aplica rewrites externos para:

- `/api/*` -> backend SeeNode
- `/app/*` -> app real de PLANIFIWEB

## 2. Proyecto SeeNode del backend

Root directory: `backend`

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Base de variables:

- Usa `backend/.env.seenode.example` como plantilla.
- Debes reemplazar `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `S3_*` y claves IA reales.

## 3. Proyecto Vercel de PLANIFIWEB

Repositorio: `PLANIFIWEB`

Variables recomendadas para staging standalone:

```bash
VITE_API_BASE_URL=https://planifiweb-api-staging.seenode.com
VITE_APP_PUBLIC_URL=https://planifiweb-gateway-staging.vercel.app/app
```

Notas:

- El acceso comercial oficial seguirá entrando por el gateway.
- La app standalone se usa para validar build, rutas `/app/*` y depuración aislada.
- El archivo `vercel.json` del repo `PLANIFIWEB` debe resolver el fallback SPA de `/app/*`.

## 4. Orden recomendado de despliegue

1. Crear PostgreSQL en SeeNode.
2. Crear Redis en Upstash.
3. Crear bucket privado R2.
4. Desplegar backend en SeeNode y verificar `/health` y `/ready`.
5. Desplegar `PLANIFIWEB` en Vercel.
6. Desplegar gateway en Vercel con `API_PROXY_TARGET` y `APP_PROXY_TARGET`.
7. Probar login, dashboard, checkout Yape y `https://<gateway>/app/dashboard`.
