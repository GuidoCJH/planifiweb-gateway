# SeeNode - Referencia legada y base de datos activa

SeeNode ya no hospeda el backend web de PLANIFIWEB.

## Estado actual

### Retirado
- apps web FastAPI en SeeNode
- despliegues publicos de backend en SeeNode

### Aun vigente
- PostgreSQL productiva actualmente usada por el backend en Koyeb

## Regla operativa

No recrees servicios web de FastAPI en SeeNode para este proyecto.

El uso correcto de SeeNode, mientras no se complete una migracion de base de datos, es solo:
- mantener disponible la instancia PostgreSQL activa
- conservar credenciales y backups relacionados con la base

## Que hay en este directorio

- `bootstrap.ps1`: referencia historica de bootstrap de SeeNode
- archivos generados en `.local/seenode/`: solo apoyo operativo, no fuente de verdad del despliegue actual

## Si vas a cerrar SeeNode por completo

Antes debes completar estos pasos:
1. mover la base de datos activa a otro proveedor
2. actualizar `DATABASE_URL` en Koyeb
3. ejecutar migraciones y smoke tests
4. validar login, dashboard, admin, pagos y app
5. recien despues apagar la base de SeeNode

## Riesgo principal

Si eliminas la base PostgreSQL de SeeNode antes de migrarla, rompes la produccion aunque el backend siga vivo en Koyeb.
