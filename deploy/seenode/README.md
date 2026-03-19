# SeeNode - Referencia legada retirada

SeeNode ya no hospeda el backend web de PLANIFIWEB.

## Estado actual

### Retirado
- apps web FastAPI en SeeNode
- despliegues publicos de backend en SeeNode

### Aun vigente
- nada en produccion

## Regla operativa

No recrees servicios web ni bases de datos en SeeNode para este proyecto.

## Que hay en este directorio

- `bootstrap.ps1`: referencia historica de bootstrap de SeeNode
- archivos generados en `.local/seenode/`: solo apoyo operativo, no fuente de verdad del despliegue actual

## Estado de retiro

El corte productivo ya fue completado:
1. base migrada a Supabase
2. `DATABASE_URL` actualizado en Koyeb
3. smoke tests ejecutados
4. produccion sin dependencia operativa de SeeNode
