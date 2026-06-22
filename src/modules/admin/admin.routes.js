const { Router }      = require('express');
const isAuthenticated = require('../../middlewares/isAuthenticated');
const hasRole         = require('../../middlewares/hasRole');
const { getDashboard } = require('./admin.controller');

const router = Router();

// isAuthenticated → 401 si no autenticado
// hasRole('admin') → 403 si el rol no es admin
router.get('/dashboard', isAuthenticated, hasRole('admin'), getDashboard);

module.exports = router;
