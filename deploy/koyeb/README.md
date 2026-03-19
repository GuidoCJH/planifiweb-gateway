# Deploy del backend en Koyeb Free + Supabase Free

## Variables necesarias

```powershell
$env:KOYEB_API_TOKEN="TU_TOKEN_KOYEB"
$env:SUPABASE_ACCESS_TOKEN="TU_TOKEN_SUPABASE"
```

Opcional:

```powershell
$env:SUPABASE_ORGANIZATION_ID="tu-org-id"
$env:SUPABASE_DATABASE_PASSWORD="tu-password"
```

## Bootstrap

```powershell
.\deploy\koyeb\bootstrap.ps1
```

El script:

- resuelve o crea el proyecto `planifiweb-platform` en Supabase
- genera o reutiliza `SECRET_KEY`
- despliega `backend/` como `planifiweb-api` en Koyeb
- publica el servicio con healthcheck TCP en `8000`
- guarda estado en:
  - `.local/supabase/bootstrap-state.json`
  - `.local/koyeb/bootstrap-state.json`
  - `.local/koyeb/planifiweb-api.env.generated`

## Después del bootstrap

1. Toma `backend_url` desde `.local/koyeb/bootstrap-state.json`
2. Actualiza `API_PROXY_TARGET` del site `planifiweb-gateway` en Netlify
3. Redeploy del gateway
4. Ejecuta:

```powershell
$env:PLANIFIWEB_BACKEND_URL="https://tu-backend.koyeb.app"
.\deploy\security-smoke.ps1
```

## Notas

- El deploy usa fallback en DB para rate limiting y recibos: no requiere Redis ni S3.
- `PAYMENT_PRECHECK_ENABLED=false` en el entorno free.
- El backend se despliega desde el directorio local `backend/`, no desde GitHub.
