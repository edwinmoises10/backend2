/**
 * Factory de guard de autorización por rol.
 * Debe ejecutarse siempre después de isAuthenticated.
 *
 * @param {...string} roles  Roles permitidos (OR lógico)
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   router.get('/admin', isAuthenticated, hasRole('admin'), handler)
 */
const hasRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autenticación requerida.',
      code: 'UNAUTHENTICATED',
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Acceso denegado. Rol requerido: [${roles.join(' | ')}]. Tu rol: ${req.user.role}.`,
      code: 'FORBIDDEN',
    });
  }

  next();
};

module.exports = hasRole;
