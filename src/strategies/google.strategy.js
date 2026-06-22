const passport                      = require('passport');
const { Strategy: GoogleStrategy }  = require('passport-google-oauth20');
const User                          = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, { message: 'Google no proporcionó un email.' });
        }

        // Caso 1: usuario existente con este googleId
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // Caso 2: email ya registrado con proveedor local → conflicto
        const existingLocal = await User.findOne({ email, provider: 'local' });
        if (existingLocal) {
          const err = new Error(
            'Este email ya está registrado con contraseña. Inicia sesión con tu cuenta local.'
          );
          err.statusCode = 409;
          return done(err);
        }

        // Caso 3: usuario nuevo → crear
        user = await User.create({
          name:     profile.displayName,
          email,
          googleId: profile.id,
          avatar:   profile.photos?.[0]?.value || null,
          provider: 'google',
          role:     'user',
        });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
