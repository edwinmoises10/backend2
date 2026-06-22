const passport = require('passport');
const { registerUser } = require('./auth.service');
const {
  generateToken,
  attachTokenCookie,
  clearTokenCookie,
  verifyToken,
} = require('../../services/jwt.service');
const User = require('../../models/User');

const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'token';

// ── Registro ──────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    return res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente.',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

// ── Login local ───────────────────────────────────────────────────────────────
const loginLocal = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || 'Credenciales inválidas.',
      });
    }

    req.logIn(user, async (loginErr) => {
      if (loginErr) return next(loginErr);

      const token = generateToken(user);
      attachTokenCookie(res, token);

      return res.status(200).json({
        success: true,
        message: 'Sesión iniciada correctamente.',
        data: { user, token },
      });
    });
  })(req, res, next);
};

// ── GET /session ──────────────────────────────────────────────────────────────
/**
 * Endpoint de introspección: nunca retorna 401.
 * Verifica: sesión Passport → JWT cookie → JWT header.
 */
const getSession = async (req, res) => {
  try {
    if (req.isAuthenticated() && req.user) {
      return res.status(200).json({
        success: true,
        data: {
          authenticated: true,
          authMethod: 'session',
          user: req.user,
          sessionID:  req.sessionID,
          expiresAt:  req.session?.cookie?.expires ?? null,
        },
      });
    }

    const token =
      req.cookies?.[JWT_COOKIE_NAME] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (token) {
      const payload = verifyToken(token);
      const user    = await User.findOne({ _id: payload.sub, isActive: true });

      if (user) {
        return res.status(200).json({
          success: true,
          data: {
            authenticated: true,
            authMethod: 'jwt',
            user,
            expiresAt: new Date(payload.exp * 1000).toISOString(),
          },
        });
      }
    }
  } catch {
    // Token inválido/expirado → responder como no autenticado
  }

  return res.status(200).json({
    success: true,
    data: { authenticated: false },
  });
};

// ── Logout ────────────────────────────────────────────────────────────────────
/**
 * Secuencia:
 *  1. req.logout()       → Passport desvincula req.user
 *  2. session.destroy()  → connect-mongo elimina el documento en MongoDB
 *  3. clearTokenCookie() → cookie JWT eliminada en el cliente
 *  4. clearCookie(sid)   → cookie de sesión eliminada en el cliente
 */
const logout = (req, res, next) => {
  const sessionCookieName =
    req.app.get('sessionCookieName') || process.env.SESSION_NAME || 'sid';

  req.logout((logoutErr) => {
    if (logoutErr) return next(logoutErr);

    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);

      clearTokenCookie(res);
      res.clearCookie(sessionCookieName, { path: '/' });

      return res.status(200).json({
        success: true,
        message: 'Sesión cerrada y cookies eliminadas correctamente.',
      });
    });
  });
};

// ── OAuth Google callback ─────────────────────────────────────────────────────
const googleCallback = (req, res) => {
  const token = generateToken(req.user);
  attachTokenCookie(res, token);
  res.redirect(process.env.FRONTEND_SUCCESS_URL || '/');
};

module.exports = { register, loginLocal, getSession, logout, googleCallback };
