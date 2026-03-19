# Resumen Ejecutivo - PLANIFIWEB

## Que es PLANIFIWEB

PLANIFIWEB es una plataforma SaaS para docentes del Peru orientada a la planificacion curricular alineada al CNEB.

El sistema resuelve una necesidad concreta: reducir el tiempo y el retrabajo al crear diagnosticos, planificaciones, unidades, sesiones, fichas, examenes y rubricas con una misma base metodologica.

## Como esta compuesto hoy

### 1. Hub principal
- dominio: `https://guidojh.pro`
- funcion: presencia principal, redes y proyectos

### 2. Gateway de PLANIFIWEB
- dominio: `https://planifiweb.guidojh.pro`
- funcion:
  - landing comercial
  - login y registro
  - dashboard de cuenta
  - seleccion de planes
  - pagos por Yape
  - panel admin
  - cambio y recuperacion de contraseña

### 3. App autenticada
- dominio: `https://app.planifiweb.guidojh.pro`
- funcion:
  - generacion curricular
  - trabajo diario del docente
  - documentos guardados y exportacion

### 4. Backend
- hosting: Koyeb
- funcion:
  - auth
  - cuotas
  - IA
  - pagos
  - seguridad

## Propuesta de valor

PLANIFIWEB concentra en un solo flujo lo que normalmente se hace de forma dispersa:
- planificacion anual
- unidades
- sesiones
- instrumentos
- control de acceso y suscripcion

Eso permite:
- mayor velocidad de produccion
- mas coherencia entre documentos
- menos retrabajo
- una ruta mas profesional para docentes que trabajan con CNEB

## Modelo comercial actual

### Planes activos
| Plan | Precio | Limite diario |
|---|---:|---:|
| Start | S/9 | 20 generaciones |
| Pro | S/19 | 60 generaciones |
| Institucional | S/39 | 200 generaciones |

### Pago
- metodo visible: Yape
- validacion: revision administrativa

## Estado operativo

| Componente | Estado |
|---|---|
| Hub | Activo |
| Gateway | Activo |
| App | Activa |
| Backend | Activo |
| Login y sesion | Operativos |
| Cambio de contraseña | Operativo |
| Recuperacion por correo | Operativa |
| Generacion IA | Operativa |

## Seguridad ya implementada

- sesion por cookie segura
- CSRF
- control de acceso por estado de cuenta
- login con mensajes claros
- recuperacion por token de un solo uso
- docs del backend cerradas en produccion

## Riesgos o pendientes visibles

- el dominio `guidojh.pro` debe verificarse en Resend para usar solo `noreply@guidojh.pro` sin fallback
- la base de datos activa aun depende de SeeNode aunque el backend ya corre en Koyeb
- todos los tokens expuestos en chat deben rotarse

## Lectura rapida para negocio

PLANIFIWEB ya esta operativo como producto funcional para beta privada o uso comercial controlado. La arquitectura publica esta ordenada, el flujo de cuenta ya existe y el producto central ya genera contenido real.

El siguiente salto no es construir desde cero, sino endurecer operacion, cerrar la dependencia pendiente de base de datos y mejorar conversion comercial.
