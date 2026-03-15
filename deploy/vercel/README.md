# Deploy real: Vercel Hobby + SeeNode

Esta carpeta concentra la configuración operativa real en el estado actual:

- `PAGE LANDING SAAS/frontend` en Vercel como gateway público
- `PLANIFIWEB` en Vercel como app separada
- `PAGE LANDING SAAS/backend` en SeeNode como FastAPI productiva

## 1. Proyecto Vercel del gateway

Root directory: `frontend`
URL real: `https://planifiweb-gateway.vercel.app`

Variables:

```bash
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://planifiweb-gateway.vercel.app
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=
API_PROXY_TARGET=https://web-nr3pfzfysqpy.up-de-fra1-k8s-1.apps.run-on-seenode.com
APP_PROXY_TARGET=https://planifiweb-app.vercel.app
```

Con estas variables, `frontend/next.config.ts` aplica rewrites externos para:

- `/api/*` -> backend SeeNode
- `/app/*` -> app real de PLANIFIWEB

Bootstrap:

```powershell
$env:VERCEL_TOKEN="..."
.\deploy\vercel\bootstrap.ps1
```

El script:
- valida que existan `planifiweb-gateway` y `planifiweb-app`
- sincroniza variables de producción por API
- vincula ambos directorios locales con Vercel
- redeploya ambos proyectos
- guarda el estado en `.local/vercel/bootstrap-state.json`

## 2. Proyecto SeeNode del backend

Nombre esperado de la app: `planifiweb-api`
Host backend operativo actual: `https://web-nr3pfzfysqpy.up-de-fra1-k8s-1.apps.run-on-seenode.com`

Build command:

```bash
cd backend && pip install -r requirements.txt
```

Start command:

```bash
cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Base de variables:

- Usa `backend/.env.seenode.example` como plantilla.
- Debes reemplazar `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `S3_*` y claves IA reales.
- El script `deploy/seenode/bootstrap.ps1` genera un archivo listo para pegar en el dashboard:

```powershell
$env:SEENODE_TOKEN="..."
.\deploy\seenode\bootstrap.ps1
```

Salida esperada:
- `.local/seenode/planifiweb-api.env.generated`
- `.local/seenode/bootstrap-state.json`
- URL de autorización GitHub del workspace si todavía falta ese paso

Bloqueo real actual:
- el workspace de SeeNode todavía no tiene `github.authorized=true`
- mientras eso siga así, la creación de `planifiweb-api` por API falla con `Authentication to GitHub failed`

## 3. Proyecto Vercel de PLANIFIWEB

Repositorio: `PLANIFIWEB`
URL real: `https://planifiweb-app.vercel.app`

Variables recomendadas para producción Hobby:

```bash
VITE_API_BASE_URL=/api
VITE_APP_PUBLIC_URL=https://planifiweb-gateway.vercel.app/app
```

Notas:

- El acceso comercial oficial seguirá entrando por el gateway.
- La app standalone se usa para validar build, rutas `/app/*` y depuración aislada.
- El archivo `vercel.json` del repo `PLANIFIWEB` ya debe resolver el fallback SPA de `/app/*` y el proxy de `/api` hacia el gateway.

## 4. Orden recomendado de despliegue

1. Ejecutar `deploy/vercel/bootstrap.ps1` y confirmar que gateway y app responden `200`.
2. Ejecutar `deploy/seenode/bootstrap.ps1`.
3. Abrir la URL de OAuth que entrega el script de SeeNode y autorizar GitHub en el workspace.
4. Reejecutar `deploy/seenode/bootstrap.ps1` para crear `planifiweb-api`.
5. Pegar el contenido de `.local/seenode/planifiweb-api.env.generated` en el dashboard de variables de la app SeeNode.
6. Verificar `https://web-nr3pfzfysqpy.up-de-fra1-k8s-1.apps.run-on-seenode.com/health` y `https://web-nr3pfzfysqpy.up-de-fra1-k8s-1.apps.run-on-seenode.com/ready`.
7. Volver a probar `https://planifiweb-gateway.vercel.app/api/auth/me`, login, dashboard, checkout Yape y `https://planifiweb-gateway.vercel.app/app/dashboard`.
