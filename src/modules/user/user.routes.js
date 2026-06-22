const { Router }        = require('express');
const isAuthenticated   = require('../../middlewares/isAuthenticated');
const { getProfile }    = require('./user.controller');

const router = Router();

// 401 si no hay sesión ni JWT válido
router.get('/profile', isAuthenticated, getProfile);

module.exports = router;
