# PocketCloset Backend

Este repositorio contiene la API del PocketCloset, desarrollada con **Node.js + Express + NestJS + TypeScript**, encargada de gestionar usuarios, autenticación, prendas, outfits y la integración con IA.

---

## Descripción del Proyecto

PocketCloset es una aplicación inteligente de organización de ropa, que actúa como un asistente personal de estilo. Permite:

- Gestionar el armario digital del usuario
- Planificar outfits diarios
- Preparar prendas para diferentes actividades o viajes
- Sugerir combinaciones según el clima y la ocasión
Clasificar automáticamente prendas y sugerir combinaciones según clima y ocasión
- Crear maletas de viaje con prendas seleccionadas

Objetivo: facilitar la toma de decisiones diarias sobre qué vestir y optimizar el uso de la ropa existente.

El backend es responsable de gestionar usuarios, prendas, y las recomendaciones de outfits basadas en la información proporcionada por el usuario.

---


## Funcionalidades principales

- Registro y autenticación de usuarios
- CRUD completo de prendas y outfits
- Generación de combinaciones inteligentes vía IA
- Creación de maletas de viaje con recomendaciones automáticas
- Integración con MySQL
- Endpoints REST consumidos por el frontend
- Validación de datos y manejo de errores
- Logging de requests y middlewares de seguridad
- Google Cloud Storage y Vision API para gestión de imágenes

---

## Tecnologías

- Tecnologías
- Node.js + NestJS + TypeScript
- MySQL + TypeORM
- JWT + Passport para autenticación
- Bcrypt para hash de contraseñas
- Redis 
- Google Cloud Storage y Vision API
- Winston + Nest-Winston para logging
- Jest 

---

## Estructura del Proyecto

```plaintext
backend/
├── .gitignore
├── .prettierrc
├── README.md
├── package.json
├── tsconfig.json
├── src
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── common
│   │   ├── decorators
│   │   ├── filters
│   │   ├── guards
│   │   ├── logger
│   │   ├── middleware
│   │   ├── redis
│   │   ├── services
│   │   └── validators
│   ├── entities
│   │   ├── user.entity.ts
│   │   ├── preferences.entity.ts
│   │   ├── outfit.entity.ts
│   │   ├── viaje.entity.ts
│   │   └── auditoria.entity.ts
│   ├── modules
│   │   ├── auth
│   │   ├── users
│   │   ├── prendas
│   │   ├── outfits
│   │   ├── viajes
│   │   ├── eventos
│   │   ├── auditoria-usuarios
│   │   └── utils
├── test
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
```
---

## Configuración del entorno

### 1. Instalar dependencias
```bash
npm install
npm install -D typescript ts-node-dev @types/node @types/express
```

### 2. Variables de entorno

- Copiar .env.example para .env y completar con tus credenciales locales.

### 3. Ejecutar localmente
```bash
npm run start:dev

Servidor disponible en: http://localhost:5000
```
----

## Deploy / Producción

El backend está desplegado en Railway y listo para ser consumido por el frontend:
```plaintext
Endpoint base: https://pocketcloset-backend.up.railway.app
```
---

## Enlaces relacionados

Frontend del proyecto: [PocketCloset Frontend](https://github.com/stephanny-soares/pocket-closet-frontend)

---