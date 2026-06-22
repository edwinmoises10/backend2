const { Router } = require('express');
const passport   = require('passport');
const {
  register,
  loginLocal,
  getSession,
  logout,
  googleCallback,
} = require('./auth.controller');
const { registerRules, loginRules, validate } = require('./auth.validator');

const router = Router();

// ── Local ─────────────────────────────────────────────────────────────────────
router.post('/register', registerRules, validate, register);
router.post('/login',    loginRules,    validate, loginLocal);
router.get('/session',                            getSession);
router.post('/logout',                            logout);

// ── Google OAuth 2.0 ──────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/v1/auth/google/failure',
    session: true,
  }),
  googleCallback
);

router.get('/google/failure', (_req, res) => {
  res.status(401).json({
    success: false,
    message: 'Autenticación con Google fallida.',
  });
});

module.exports = router;
