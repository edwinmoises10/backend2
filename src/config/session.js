const session    = require('express-session');
const MongoStore = require('connect-mongo');

const buildSessionMiddleware = () => {
  const {
    SESSION_SECRET,
    SESSION_NAME,
    SESSION_MAX_AGE_MS,
    MONGO_URI,
    NODE_ENV,
  } = process.env;

  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  }

  return session({
    name: SESSION_NAME || 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Number(SESSION_MAX_AGE_MS) || 86_400_000,
    },
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: 'sessions',
      ttl: (Number(SESSION_MAX_AGE_MS) || 86_400_000) / 1000,
      autoRemove: 'native',
    }),
  });
};

module.exports = buildSessionMiddleware;
