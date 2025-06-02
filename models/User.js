const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  nome: String,
  email: { type: String, unique: true },
  password: String,
  fotoPerfil: String,
  role: { type: String, default: 'user' },
  resetToken: String, //campo para armazenar o token de recuperação
  resetTokenValidoAte: Date
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);