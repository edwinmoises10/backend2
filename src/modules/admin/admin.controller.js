/**
 * GET /api/v1/admin/dashboard
 * Requiere: isAuthenticated + hasRole('admin')
 */
const getDashboard = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Bienvenido al panel de administración.',
    data: {
      admin: {
        id:    req.user._id,
        name:  req.user.name,
        email: req.user.email,
        role:  req.user.role,
      },
      serverTime: new Date().toISOString(),
    },
  });
};

module.exports = { getDashboard };
