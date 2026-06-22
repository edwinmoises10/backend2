const passport = require('passport');
const User     = require('../models/User');

require('../strategies/local.strategy');
require('../strategies/google.strategy');

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findOne({ _id: id, isActive: true });
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});
