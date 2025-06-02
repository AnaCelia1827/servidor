/*const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  nome: {type:String,require},
  email:  {type:String,require},
  password: {type:String,require},
  cargo:  {type:String,require},
  fotoPerfil:  {type:String,require},
  recoveryCode: String,
  recoveryCodeExpiry: Date,
});



const User = mongoose.model("User", UserSchema);

module.exports = User;*/


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

