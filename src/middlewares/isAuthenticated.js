const { verifyToken } = require('../services/jwt.service');
const User = require('../models/User');

const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'token';

/**
 * Guard de autenticación híbrido.
 *
 * Prioridad:
 *  1. JWT en cookie httpOnly
 *  2. JWT en header Authorization: Bearer
 *  3. Sesión Passport (fallback OAuth / navegador)
 */
const isAuthenticated = async (req, res, next) => {
  try {
    const token =
      req.cookies?.[JWT_COOKIE_NAME] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (token) {
      const payload = verifyToken(token);

      const user = await User.findOne({ _id: payload.sub, isActive: true });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token válido pero el usuario no existe o está inactivo.',
          code: 'USER_NOT_FOUND',
        });
      }

      req.user       = user;
      req.authMethod = 'jwt';
      return next();
    }

    if (req.isAuthenticated()) {
      req.authMethod = 'session';
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Autenticación requerida.',
      code: 'UNAUTHENTICATED',
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'El token ha expirado. Inicia sesión nuevamente.',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token malformado o con firma inválida.',
        code: 'TOKEN_INVALID',
      });
    }
    next(err);
  }
};

module.exports = isAuthenticated;
