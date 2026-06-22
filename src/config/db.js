const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI no está definida en las variables de entorno.');
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`[DB] MongoDB conectado: ${mongoose.connection.host}`);

  mongoose.connection.on('error', (err) => {
    console.error('[DB] Error de conexión:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB desconectado.');
  });
};

module.exports = connectDB;
