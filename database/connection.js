const mongoose = require("mongoose");
require("dotenv").config();

const dbName = process.env.DB_NAME;

const connectDb = () => {
  console.log("Tentando conectar ao MongoDB local...");

  // Conexão com o MongoDB local
  mongoose.connect(`mongodb://127.0.0.1:27017/${dbName}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log(" Conectado ao MongoDB local"))
    .catch((err) => console.error(" Erro ao conectar:", err));
};

module.exports = connectDb;