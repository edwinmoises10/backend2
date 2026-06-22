const jwt = require('jsonwebtoken');

const JWT_SECRET      = process.env.JWT_SECRET;
const JWT_EXPIRES_IN  = process.env.JWT_EXPIRES_IN  || '1h';
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'token';
const IS_PRODUCTION   = process.env.NODE_ENV === 'production';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
}

/**
 * Genera un JWT firmado con sub (userId) y role.
 * No incluye datos mutables para evitar desincronización.
 */
const generateToken = (user) => {
  const payload = {
    sub:  user._id.toString(),
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'auth-system',
  });
};

/**
 * Verifica y decodifica un JWT.
 * Lanza JsonWebTokenError o TokenExpiredError si es inválido.
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, { issuer: 'auth-system' });
};

/**
 * Adjunta el JWT como cookie httpOnly en la respuesta.
 */
const attachTokenCookie = (res, token) => {
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure:   IS_PRODUCTION,
    sameSite: 'lax',
    maxAge:   60 * 60 * 1000,
    path:     '/',
  });
};

/**
 * Elimina la cookie del token en el cliente.
 */
const clearTokenCookie = (res) => {
  res.clearCookie(JWT_COOKIE_NAME, { path: '/' });
};

module.exports = { generateToken, verifyToken, attachTokenCookie, clearTokenCookie };
