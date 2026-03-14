# Bootstrap real de SeeNode

Este directorio deja preparado el backend para el estado actual del workspace.

## Estado que ya existe

- Proyecto: `planifiweb-platform`
- PostgreSQL: `planifiweb-platform-db`
- Host backend objetivo: `planifiweb-api.seenode.com`

## Script principal

```powershell
$env:SEENODE_TOKEN="..."
.\deploy\seenode\bootstrap.ps1
```

## Que hace

1. Detecta el workspace activo.
2. Resuelve el proyecto `planifiweb-platform`.
3. Resuelve la base PostgreSQL asociada.
4. Construye el `DATABASE_URL` real.
5. Genera:
   - `.local/seenode/planifiweb-api.env.generated`
   - `.local/seenode/bootstrap-state.json`
   - `.local/seenode/secret-key.txt`
6. Verifica si el workspace ya tiene GitHub autorizado.
7. Si GitHub ya esta autorizado, intenta crear `planifiweb-api` con estos comandos:
   - build: `cd backend && pip install -r requirements.txt`
   - run: `cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Bloqueo conocido

Mientras `GET /v1/github/authorized` siga respondiendo `authorized=false`, SeeNode no puede crear la app desde GitHub y devolvera `Authentication to GitHub failed`.

El script no oculta eso. Imprime la URL exacta de OAuth para resolverlo y volver a correr el bootstrap.
