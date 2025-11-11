
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

| Componente | Tecnología |
|-----------|-----------|
| **Framework** | NestJS |
| **Lenguaje** | TypeScript |
| **Base de Datos** | MySQL |
| **Autenticación** | JWT + Passport |
| **Cache** | Redis Cloud |
| **Documentación** | Swagger/OpenAPI |


---

## Estructura del proyecto

```plaintext
src/
├── common/          # Utilidades compartidas
├── entities/        # Modelos
├── modules/         # Módulos (auth, users, prendas)
└── main.ts         # Entrada

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
# JWT
JWT_SECRET=tu_secreto_aqui

# Redis (Compartida)
REDIS_URL=redis://default:PASSWORD@HOST:PORT
REDIS_BLOCK_DURATION=60
```

### 3. Ejecutar localmente (TypeScript)
```bash
npm run start:dev
# "dev": "ts-node-dev src/index.ts" en package.json
```
Servidor disponible en: http://localhost:5000

📚 Swagger: http://localhost:5000/api/docs

## ✨ Endpoints

### Auth (Públicos)
- POST /api/auth/register - Registrar
- POST /api/auth/login - Login

### Users (JWT requerido)
- GET /api/users - Obtener todos
- POST /api/users - Crear

### Prendas (JWT requerido)
- GET /api/prendas - Obtener todas
- POST /api/prendas - Crear (upload + IA)

## 🔒 Seguridad

- ✅ Contraseñas con bcrypt
- ✅ JWT con expiración
- ✅ Anti-brute-force: 5 intentos = bloqueo IP
- ✅ Auditoría de eventos
- ✅ CORS configurado
- ✅ Validación de entrada

---

## Enlaces relacionados

Frontend del proyecto: https://github.com/stephanny-soares/pocket-closet-frontend

---