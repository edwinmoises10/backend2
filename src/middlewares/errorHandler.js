/**
 * Manejador global de errores.
 * Respeta el statusCode adjuntado por los servicios; si no existe, usa 500.
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message    = statusCode === 500 ? 'Error interno del servidor.' : err.message;

  if (statusCode === 500) {
    console.error('[ErrorHandler]', err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
