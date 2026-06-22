require('dotenv').config();

const createApp = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await connectDB();

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`[Server] Corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Error fatal al iniciar:', err.message);
    process.exit(1);
  }
})();
