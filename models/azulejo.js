// models/Azulejo.js
const mongoose = require('mongoose');

const AzulejoSchema = new mongoose.Schema({
  status: String,
  dataProducao: Date,  
  
});

module.exports = mongoose.model('Azulejos', AzulejoSchema);
