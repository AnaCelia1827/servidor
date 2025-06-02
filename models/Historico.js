const mongoose = require("mongoose");

const historicoSchema = new mongoose.Schema({
  usuario: String,
  acao: String,
  data: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Historico", historicoSchema);
