const passport                    = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const User                        = require('../models/User');

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: true,
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email, provider: 'local' }).select('+password');

        if (!user) {
          return done(null, false, { message: 'Credenciales inválidas.' });
        }

        if (!user.isActive) {
          return done(null, false, { message: 'La cuenta está desactivada.' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
          return done(null, false, { message: 'Credenciales inválidas.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
