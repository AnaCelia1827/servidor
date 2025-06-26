
const ffmpeg = require('fluent-ffmpeg');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { SerialPort } = require('serialport');  
const { ReadlineParser } = require('@serialport/parser-readline'); 
const connectDb= require("./database/connection");
const bodyParser = require("body-parser");
const path = require('path');



const Alerta = require('./models/Alerta');

connectDb();
const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'], credentials: true })); //  conexões externas ou seja o site 
app.use("/api/users", require("./routes/userRoutes")); 
app.use("/auth", require("./routes/userRoutes")); 
app.use("/auth", require("./routes/userRoutesAdm"));
app.use("/api/adm", require("./routes/userRoutesAdm"));

app.use("/uploads", express.static("uploads"));





const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'] 
});


const portName = 'COM4'; 
const port = new SerialPort({
  path: portName,
  baudRate: 9600,
});




const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

let corrente1Data = 0;
let corrente2Data = 0;

  let misturadorData=0;
    let escotilhaData=0;
    let prensaData = 0;
    let esteiraData=0;


parser.on('data', (data) => {
  console.log('Dados recebidos do Arduino:', data.trim());

  const [label, valueStr] = data.trim().split(':');
  const value = parseFloat(valueStr);

  if (isNaN(value)) {
    console.warn('Valor inválido recebido:', data);
    return;
  }

  if (label === 'corrente1') {
    corrente1Data = value;
    if (corrente1Data > 2) {

      const novoAlerta = new Alerta({
        sensor: 'corrente1',
        valor: corrente1Data,
        mensagem: 'Curto de corrente:corrente acima do nivel se seguranca',
        horario: new Date(),
      });
     
      novoAlerta.save()
      .then(() => {
        console.log('Alerta salvo no MongoDB com sucesso!');
      })
      .catch((err) => {
        console.error('Erro ao salvar alerta no MongoDB:', err);
      });
    }
  } else if (label === 'corrente2') {
    corrente2Data = value;

    if (corrente2Data > 5) {

      const novoAlerta = new Alerta({
        sensor: 'corrente2',
        valor: corrente2Data,
        mensagem: 'Curto de corrente:corrente acima do nivel se seguranca',
        horario: new Date(),
      });
    
      novoAlerta.save()
      .then(() => {
        console.log('Alerta salvo no MongoDB com sucesso!');
      })
      .catch((err) => {
        console.error('Erro ao salvar alerta no MongoDB:', err);
      });
    }
  } else if (label === 'misturador') {
    misturadorData = value;
  } else if(label=='escotilha'){
    escotilhaData=value;

  }else if(label=='prensa'){
    prensaData=value;
  }else if(label=='esteira'){
   esteiraData=value;
  }else {
    console.warn('Label desconhecido:', label);
    return;
  }

  io.emit('sensorData', {
    corrente1: corrente1Data,
    corrente2: corrente2Data,
    misturador: misturadorData,
    escotilha: escotilhaData,
    prensa: prensaData,
    esteira: esteiraData


    
  });
});




app.post('/enviar', (req, res) => {
  const { comando } = req.body;
console.log( 'comando',comando);
  if (comando === 'b' || comando === 'r') {
    port.write(comando, err => {
      if (err) {
        return res.status(500).send('Erro ao enviar para o Arduino');
      }
      res.send('Comando enviado para o Arduino: ' + comando);
    });
  } else {
    res.status(400).send('Comando inválido');
  }
});


port.on('error', (err) => {
  console.error('Erro na porta serial:', err.message);
});

app.get('/', (req, res) => {
  res.send('Servidor Rodando');
});




io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Servidor WebSocket rodando na porta 3001');
});






