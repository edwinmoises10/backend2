const { body, validationResult } = require('express-validator');

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.')
    .isLength({ max: 80 }).withMessage('El nombre no puede superar 80 caracteres.'),
  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio.')
    .isEmail().withMessage('Formato de email inválido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una letra mayúscula.')
    .matches(/[0-9]/).withMessage('Debe contener al menos un número.'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio.')
    .isEmail().withMessage('Formato de email inválido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación.',
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }

  next();
};

module.exports = { registerRules, loginRules, validate };
