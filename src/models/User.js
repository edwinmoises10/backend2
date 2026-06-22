const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio.'],
      trim: true,
      maxlength: [80, 'El nombre no puede superar 80 caracteres.'],
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Formato de email inválido.'],
    },
    password: {
      type: String,
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres.'],
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: {
        values: ['local', 'google'],
        message: 'El proveedor "{VALUE}" no está soportado.',
      },
      required: true,
      default: 'local',
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'El rol "{VALUE}" no es válido.',
      },
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ email: 1, provider: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
