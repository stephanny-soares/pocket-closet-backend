
# PocketCloset Backend

Este repositorio contiene la API del PocketCloset, desarrollada con **Node.js + Express + TypeScript**, encargada de gestionar usuarios, prendas, outfits y la integración con IA.

---

## Descripción del proyecto

PocketCloset es una aplicación móvil inteligente basada en Inteligencia Artificial (IA) que funciona como asistente personal de estilo y organización de ropa. Permite:

- Gestionar el armario digital del usuario
- Planificar outfits diarios
- Preparar prendas para diferentes actividades o viajes
- Clasificar automáticamente prendas y sugerir combinaciones según clima y ocasión

Objetivo: facilitar la toma de decisiones diarias sobre qué vestir y optimizar el uso de la ropa existente.

---

## Funcionalidades principales del backend

- Registro y autenticación de usuarios
- CRUD de prendas y outfits
- Generación de combinaciones inteligentes via IA
- Integración con MySQL
- Endpoints consumidos por el frontend

---

## Tecnologías

- Node.js
- Express
- TypeScript
- MySQL
- Docker & Docker Compose

---

## Estructura del proyecto

```plaintext
backend/
└── src/
    ├── app.js
    ├── server.js
    ├── config/        # Configuraciones (ej: db.js)
    ├── controllers/   # Lógica de rutas (registerController, userController)
    ├── middlewares/   # Middlewares y manejadores (errorHandler, requestLogger)
    ├── models/        # Models/Entities (User.js)
    ├── routes/        # Endpoints de la API (register, users, utils)
    ├── services/      # Lógica de negocio
    ├── utils/         # Scripts y utilitarios (create_users_table.sql)
    └── validators/    # Validaciones (generalValidators.js)

```
---

## Configuración del entorno

### 1. Instalar dependencias
```bash
npm install
npm install -D typescript ts-node-dev @types/node @types/express
```
### 2. Variables de entorno

Crear un archivo .env basado en .env.example:

```plaintext
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=pocketcloset
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### 3. Ejecutar localmente (TypeScript)
```bash
npm run dev
# "dev": "ts-node-dev src/index.ts" en package.json
```
Servidor disponible en: http://localhost:5000

### 4. Ejecutar con Docker
```bash
docker build -t pocketcloset-backend .
docker run -it --rm -p 5000:5000 pocketcloset-backend
```

---
## Enlaces relacionados

Frontend del proyecto: https://github.com/stephanny-soares/pocket-closet-frontend

---