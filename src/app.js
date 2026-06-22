const express      = require('express');
const passport     = require('passport');
const cookieParser = require('cookie-parser');

const buildSessionMiddleware = require('./config/session');
const errorHandler  = require('./middlewares/errorHandler');
const authRoutes    = require('./modules/auth/auth.routes');
const userRoutes    = require('./modules/user/user.routes');
const adminRoutes   = require('./modules/admin/admin.routes');

require('./config/passport');

const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // cookie-parser antes de express-session para que req.cookies
  // esté disponible en isAuthenticated
  app.use(cookieParser());

  app.use(buildSessionMiddleware());
  app.use(passport.initialize());
  app.use(passport.session());

  app.set('sessionCookieName', process.env.SESSION_NAME || 'sid');

  app.use('/api/v1/auth',  authRoutes);
  app.use('/api/v1/user',  userRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.use(errorHandler);

  return app;
};

module.exports = createApp;
