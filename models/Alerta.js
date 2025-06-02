const mongoose = require("mongoose");

const AlertaSchema = new mongoose.Schema({
    sensor: String,
    valor: Number,
    mensagem: String,
    horario: String,
    criadoEm: { type: Date, default: Date.now },
  });
  
  
  module.exports = mongoose.model("Alerta", AlertaSchema);
  