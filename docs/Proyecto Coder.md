# Decisiones técnicas — Sistema de autenticación y autorización

## 1. Dónde vive el rol

El rol del usuario existe en **dos lugares** con propósitos distintos:

| Lugar | Contiene | Propósito |
|---|---|---|
| Payload del JWT (`role`) | Copia del rol en el momento de login | Solo referencia; **no se usa para decidir acceso** |
| Documento MongoDB (`User.role`) | Fuente de verdad autoritativa | Lectura en **cada request** para la decisión de autorización |

### Justificación

`isAuthenticated` hace una consulta a la base de datos en cada petición autenticada:

```js
// src/middlewares/isAuthenticated.js
const user = await User.findOne({ _id: payload.sub, isActive: true });
req.user = user;  // <-- objeto vivo de Mongo, no el payload del token
```

`hasRole` evalúa `req.user.role`, que proviene de ese documento, **no** del claim `role` del JWT:

```js
// src/middlewares/hasRole.js
if (!roles.includes(req.user.role)) { ... }
```

Esto significa que el JWT actúa únicamente como **prueba de identidad** (quién eres, via `sub`). La **autorización** (qué puedes hacer) siempre refleja el estado actual de la base de datos.

---

## 2. Mitigación de CSRF

El sistema no implementa tokens CSRF explícitos porque la cookie lleva `sameSite: 'lax'`, lo cual es suficiente para el modelo de amenaza actual.

```js
// src/services/jwt.service.js
res.cookie(JWT_COOKIE_NAME, token, {
  httpOnly: true,
  secure:   IS_PRODUCTION,
  sameSite: 'lax',   // <-- barrera anti-CSRF
  ...
});
```

### Por qué `lax` es suficiente aquí

`sameSite: 'lax'` bloquea el envío de la cookie en peticiones **cross-site** de método no seguro (POST, PUT, DELETE, PATCH). Un atacante que logre que la víctima visite `evil.com` **no puede** forzar un POST a la API porque el navegador omitirá la cookie. Las peticiones GET cross-site sí portan la cookie, pero ninguna ruta de la API tiene efectos secundarios en GET.

`sameSite: 'strict'` rechazaría incluso los GETs legítimos que vengan de un redirect OAuth o de un link externo, rompiendo el flujo de Google OAuth y la UX general. `lax` es el balance correcto.

> `sameSite: 'none'` requeriría `secure: true` siempre y abriría la puerta a ataques CSRF clásicos; queda descartado.

La cookie también es `httpOnly: true`, con lo que JavaScript del cliente no puede leerla ni exfiltrarla aunque exista una vulnerabilidad XSS.

---

## 3. Diferenciación de entornos local / producción

El flag `secure` de la cookie se activa condicionalmente según `NODE_ENV`:

```js
// src/services/jwt.service.js
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

res.cookie(JWT_COOKIE_NAME, token, {
  secure: IS_PRODUCTION,   // false en local, true en prod
  ...
});
```

La misma lógica se aplica a la cookie de sesión:

```js
// src/config/session.js
cookie: {
  secure: NODE_ENV === 'production',
  ...
}
```

### Qué cambia en cada entorno

| Comportamiento | Local (`NODE_ENV != 'production'`) | Producción (`NODE_ENV = 'production'`) |
|---|---|---|
| Cookie `secure` | `false` — funciona sobre HTTP (`localhost`) | `true` — solo se envía sobre HTTPS |
| Cookie `sameSite` | `'lax'` | `'lax'` (igual) |
| Cookie `httpOnly` | `true` | `true` (igual) |

En desarrollo local los navegadores no sirven HTTPS de forma nativa, por lo que `secure: false` es necesario para que las cookies se transmitan. En producción, `secure: true` garantiza que la cookie nunca viaje en texto claro.

> La variable `NODE_ENV` debe configurarse explícitamente en el servidor de producción. Si se olvida, la cookie no se enviará sobre HTTP/HTTPS mixto y la autenticación fallará silenciosamente en el cliente.

---

## 4. Decisión de usar cookie + JWT

### Alternativas consideradas

| Enfoque | Protección XSS | Protección CSRF | Revocación | Complejidad |
|---|---|---|---|---|
| JWT en `localStorage` | Vulnerable (JS puede leerlo) | Inmune (no es cookie) | Sin estado (difícil) | Baja |
| JWT en `httpOnly` cookie | Inmune (JS no puede leerlo) | Requiere `sameSite` | Sin estado (difícil) | Media |
| Sesión pura (Passport) | Inmune | Requiere `sameSite` | Inmediata (destroy) | Media |
| **Cookie + JWT (elegido)** | **Inmune** | **`sameSite: lax`** | **Efectiva (DB lookup)** | **Media** |

### Por qué se eligió cookie httpOnly + JWT

1. **Inmunidad a XSS**: `localStorage` es accesible desde cualquier script en la página. Un token almacenado allí puede ser robado con una sola línea de JavaScript malicioso. La cookie `httpOnly` es invisible para el DOM.

2. **Stateless en origen, stateful en efecto**: El JWT no requiere tabla de sesiones, pero el middleware hace lookup a MongoDB por request, lo que permite invalidación inmediata (desactivar usuario o cambiar rol) sin lista de revocación.

3. **Compatibilidad dual**: El guard `isAuthenticated` acepta el token tanto desde la cookie como desde el header `Authorization: Bearer`, lo que permite que el mismo sistema sirva a clientes web (cookie) y a clientes API / móvil (header).

4. **Complementariedad con OAuth**: Google OAuth requiere Passport + sesión para el callback. El sistema mantiene ambos mecanismos: la sesión Passport se usa durante el flujo OAuth, y el JWT se emite al finalizar el callback.

---

## 5. Qué sucede si el rol cambia con un token ya emitido

### Comportamiento actual: cambio **inmediato**

Cuando un administrador eleva o revoca el rol de un usuario en MongoDB, el cambio tiene efecto en la **siguiente petición** del usuario afectado, aunque su token siga siendo criptográficamente válido.

Esto ocurre porque `isAuthenticated` siempre recupera el documento fresco de la base de datos:

```js
// Flujo en cada request autenticada:
const payload = verifyToken(token);          // 1. Verificar firma y expiración
const user    = await User.findOne({         // 2. Leer estado actual de Mongo
  _id: payload.sub,
  isActive: true,
});
req.user = user;                             // 3. req.user tiene el rol vigente
```

```js
// hasRole usa req.user.role (del documento Mongo, no del payload):
if (!roles.includes(req.user.role)) { 403 }
```

### Tabla de escenarios

| Evento en MongoDB | Efecto en el siguiente request |
|---|---|
| `role: 'user'` → `'admin'` | El usuario obtiene acceso admin inmediatamente |
| `role: 'admin'` → `'user'` | El usuario pierde acceso admin inmediatamente |
| `isActive: false` | El usuario recibe `401 USER_NOT_FOUND` aunque el token sea válido |

### Trade-off aceptado

El lookup por request añade una consulta a MongoDB en cada petición autenticada. Para el volumen esperado del sistema este costo es despreciable y es el precio de obtener revocación instantánea sin mantener una blacklist de tokens. Si en el futuro el rendimiento se vuelve un cuello de botella, se puede introducir una capa de caché (Redis con TTL corto) manteniendo la semántica de revocación.

---

## Resumen de invariantes del sistema

| Invariante | Dónde se garantiza |
|---|---|
| El rol de autorización es siempre el de la BD | `isAuthenticated` → `User.findOne` → `req.user` |
| Un token robado no sirve si el usuario está inactivo | `isActive: true` en el query de `isAuthenticated` |
| Las cookies no son accesibles desde JavaScript | `httpOnly: true` en todas las cookies de auth |
| En producción las cookies solo viajan por HTTPS | `secure: IS_PRODUCTION` |
| Las peticiones cross-site no portan la cookie de auth | `sameSite: 'lax'` |
| El sistema tolera clientes sin cookies | Fallback a `Authorization: Bearer` en `isAuthenticated` |
