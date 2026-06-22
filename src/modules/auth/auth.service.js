const User = require('../../models/User');

/**
 * Registra un nuevo usuario con proveedor 'local'.
 * El hashing ocurre en el hook pre-save del modelo.
 *
 * @throws {Error} statusCode 409 si el email ya está registrado
 */
const registerUser = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    const err = new Error('El email ya está registrado.');
    err.statusCode = 409;
    throw err;
  }

  const user = new User({ name, email, password, provider: 'local' });
  await user.save();

  return user;
};

module.exports = { registerUser };
