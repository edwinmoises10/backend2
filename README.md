# Sistema de Autenticación Híbrido — Node.js

Sistema backend de autenticación que combina sesiones con Passport.js, JWT en cookies `httpOnly` y OAuth 2.0 con Google, construido sobre Express y MongoDB.

---

## Tecnologías

- **Runtime:** Node.js
- **Framework:** Express 4
- **Base de datos:** MongoDB + Mongoose
- **Autenticación:** Passport.js (Local + Google OAuth 2.0)
- **Sesiones:** express-session + connect-mongo
- **Tokens:** JWT (jsonwebtoken)
- **Seguridad:** bcryptjs, httpOnly cookies, sameSite: lax

---

## Estructura del Proyecto

```
auth-system/
├── server.js
├── .env.example
├── package.json
├── docs/
│   └── TECHNICAL_DECISIONS.md
└── src/
    ├── app.js
    ├── config/
    │   ├── db.js
    │   ├── session.js
    │   └── passport.js
    ├── models/
    │   └── User.js
    ├── strategies/
    │   ├── local.strategy.js
    │   └── google.strategy.js
    ├── services/
    │   └── jwt.service.js
    ├── middlewares/
    │   ├── isAuthenticated.js
    │   ├── hasRole.js
    │   └── errorHandler.js
    └── modules/
        ├── auth/
        │   ├── auth.routes.js
        │   ├── auth.controller.js
        │   ├── auth.service.js
        │   └── auth.validator.js
        ├── user/
        │   ├── user.routes.js
        │   └── user.controller.js
        └── admin/
            ├── admin.routes.js
            └── admin.controller.js
```

---

## Instalación y Configuración

### 1. Clonar e instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
copy .env.example .env
```

Editar `.env` con los valores correspondientes:

```env
NODE_ENV=development
PORT=3000

MONGO_URI=mongodb://localhost:27017/auth_system

SESSION_SECRET=secreto_de_sesion_minimo_32_caracteres_aqui
SESSION_NAME=sid
SESSION_MAX_AGE_MS=86400000

GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
FRONTEND_SUCCESS_URL=http://localhost:3000/

JWT_SECRET=secreto_de_jwt_minimo_32_caracteres_aqui
JWT_EXPIRES_IN=1h
JWT_COOKIE_NAME=token

BCRYPT_SALT_ROUNDS=12
```

> **Importante:** `JWT_SECRET` y `SESSION_SECRET` deben tener al menos 32 caracteres.

### 3. Iniciar el servidor

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

Salida esperada:
```
[DB] Conectado a MongoDB: localhost
[Server] Corriendo en http://localhost:3000
```

---

## Modelo de Usuario

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre del usuario (obligatorio, max 80 chars) |
| `email` | String | Email único, convertido a minúsculas |
| `password` | String | Hash bcrypt, oculto en consultas (`select: false`) |
| `googleId` | String | ID de Google OAuth (solo para provider google) |
| `avatar` | String | URL de foto de perfil |
| `provider` | String | `local` o `google` |
| `role` | String | `user` (default) o `admin` |
| `isActive` | Boolean | Estado del usuario (default: `true`) |

---

## Tabla de Rutas

| Método | Endpoint | Auth requerida | Descripción |
|--------|----------|----------------|-------------|
| POST | `/api/v1/auth/register` | No | Registra un nuevo usuario local |
| POST | `/api/v1/auth/login` | No | Login local, retorna JWT + sesión |
| GET | `/api/v1/auth/session` | Opcional | Introspección de sesión activa |
| POST | `/api/v1/auth/logout` | No | Destruye sesión y limpia cookies |
| GET | `/api/v1/auth/google` | No | Inicia flujo OAuth con Google |
| GET | `/api/v1/auth/google/callback` | OAuth Google | Callback de Google, emite JWT |
| GET | `/api/v1/user/profile` | JWT o sesión | Perfil del usuario (401 si no autenticado) |
| GET | `/api/v1/admin/dashboard` | JWT + rol admin | Panel admin (401 sin auth, 403 sin rol) |

---

## Evidencias de Uso (Simulación Postman)

### POST `/api/v1/auth/register`

**Request**
```
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json
```
```json
{
  "name": "Usuario Test",
  "email": "test@test.com",
  "password": "Password123!"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "message": "Usuario registrado correctamente.",
  "data": {
    "user": {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "name": "Usuario Test",
      "email": "test@test.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-06-04T15:30:00.000Z"
    }
  }
}
```

**Response `400 Bad Request` (email duplicado)**
```json
{
  "success": false,
  "message": "El email ya está registrado."
}
```

---

### POST `/api/v1/auth/login`

**Request**
```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json
```
```json
{
  "email": "test@test.com",
  "password": "Password123!"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Sesión iniciada correctamente.",
  "data": {
    "user": {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "name": "Usuario Test",
      "email": "test@test.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NjVmMWEyYjNjNGQ1ZTZmN2E4YjljMGQiLCJyb2xlIjoidXNlciIsImlhdCI6MTcxNzUxMjIwMCwiZXhwIjoxNzE3NTE1ODAwfQ.SIGNATURE"
  }
}
```

**Cookie seteada automáticamente:**
```
Set-Cookie: token=eyJhbGci...; HttpOnly; SameSite=Lax; Path=/
```

**Payload JWT decodificado:**
```json
{
  "sub": "665f1a2b3c4d5e6f7a8b9c0d",
  "role": "user",
  "iat": 1717512200,
  "exp": 1717515800
}
```

**Response `401 Unauthorized` (credenciales inválidas)**
```json
{
  "success": false,
  "message": "Credenciales inválidas."
}
```

---

### GET `/api/v1/auth/session`

**Request**
```
GET http://localhost:3000/api/v1/auth/session
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response `200 OK` (con JWT activo)**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "authMethod": "jwt",
    "user": {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "name": "Usuario Test",
      "email": "test@test.com",
      "role": "user"
    },
    "expiresAt": "2024-06-04T16:30:00.000Z"
  }
}
```

**Response `200 OK` (sin sesión activa)**
```json
{
  "success": true,
  "data": {
    "authenticated": false
  }
}
```

---

### GET `/api/v1/user/profile`

**Request**
```
GET http://localhost:3000/api/v1/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "name": "Usuario Test",
      "email": "test@test.com",
      "role": "user"
    }
  }
}
```

**Response `401 Unauthorized` (sin token)**
```json
{
  "success": false,
  "message": "No autenticado."
}
```

---

### GET `/api/v1/admin/dashboard`

**Request**
```
GET http://localhost:3000/api/v1/admin/dashboard
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response `200 OK` (usuario con rol admin)**
```json
{
  "success": true,
  "message": "Bienvenido al panel de administración.",
  "data": {
    "admin": "Usuario Test"
  }
}
```

**Response `403 Forbidden` (autenticado pero sin rol admin)**
```json
{
  "success": false,
  "message": "Acceso denegado. Se requiere el rol: admin."
}
```

**Response `401 Unauthorized` (sin token)**
```json
{
  "success": false,
  "message": "No autenticado."
}
```

---

### POST `/api/v1/auth/logout`

**Request**
```
POST http://localhost:3000/api/v1/auth/logout
```

**Response `200 OK`**
```json
{
  "success": true,
  "message": "Sesión cerrada y cookies eliminadas correctamente."
}
```

---

## Decisiones Arquitectónicas

Para el detalle completo de las decisiones técnicas ver [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md).

| Decisión | Implementación |
|----------|---------------|
| Almacenamiento del rol | MongoDB (fuente de verdad), no en el JWT |
| Protección CSRF | `sameSite: 'lax'` en todas las cookies |
| Seguridad del token | Cookie `httpOnly` (anti-XSS) + fallback `Authorization: Bearer` |
| Diferenciación de entornos | `secure: NODE_ENV === 'production'` |
| Cambio de rol inmediato | `isAuthenticated` hace DB lookup en cada request |