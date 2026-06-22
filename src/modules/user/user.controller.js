/**
 * GET /api/v1/user/profile
 * Requiere: isAuthenticated
 *
 * req.user contiene el documento Mongoose completo,
 * ya sea autenticado por JWT o por sesión Passport.
 */
const getProfile = (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
      meta: {
        authMethod: req.authMethod,
        sessionID:  req.authMethod === 'session' ? req.sessionID : null,
      },
    },
  });
};

module.exports = { getProfile };
