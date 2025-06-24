const ffmpeg = require('fluent-ffmpeg');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { SerialPort } = require('serialport');  
const { ReadlineParser } = require('@serialport/parser-readline'); 
const connectDb = require("./database/connection");
const bodyParser = require("body-parser");

const Alerta = require('./models/Alerta');

connectDb();
const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'], credentials: true }));
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

// Configuração para simulação
const SIMULATION_MODE = true; // Mude para false quando quiser usar o Arduino real
const SIMULATION_INTERVAL = 1000; // Intervalo de atualização em ms

// Dados iniciais
let sensorData = {
  corrente1: 0,
  corrente2: 0,
  misturador: 0,
  escotilha: 0,
  prensa: 0,
  esteira: 0
};

// Função para simular dados
function simulateArduinoData() {
  // Gera valores aleatórios para simulação
  sensorData.corrente1 = (Math.random() * 3).toFixed(2);
  sensorData.corrente2 = (Math.random() * 6).toFixed(2);
  sensorData.misturador = Math.round(Math.random());
  sensorData.escotilha = Math.round(Math.random());
  sensorData.prensa = Math.round(Math.random());
  sensorData.esteira = Math.round(Math.random());

  // Simula alertas
  if (sensorData.corrente1 > 2) {
    const novoAlerta = new Alerta({
      sensor: 'corrente1',
      valor: sensorData.corrente1,
      mensagem: 'Curto de corrente: corrente acima do nível de segurança (SIMULAÇÃO)',
      horario: new Date(),
    });
    
    novoAlerta.save()
      .then(() => console.log('Alerta simulado salvo no MongoDB'))
      .catch(err => console.error('Erro ao salvar alerta simulado:', err));
  }

  if (sensorData.corrente2 > 5) {
    const novoAlerta = new Alerta({
      sensor: 'corrente2',
      valor: sensorData.corrente2,
      mensagem: 'Curto de corrente: corrente acima do nível de segurança (SIMULAÇÃO)',
      horario: new Date(),
    });
    
    novoAlerta.save()
      .then(() => console.log('Alerta simulado salvo no MongoDB'))
      .catch(err => console.error('Erro ao salvar alerta simulado:', err));
  }

  // Envia dados via Socket.IO
  io.emit('sensorData', sensorData);
  console.log('Dados simulados enviados:', sensorData);
}

// Configuração da porta serial (se não estiver em modo de simulação)
if (!SIMULATION_MODE) {
  const portName = 'COM9'; 
  const port = new SerialPort({
    path: portName,
    baudRate: 9600,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  parser.on('data', (data) => {
    console.log('Dados recebidos do Arduino:', data.trim());

    const [label, valueStr] = data.trim().split(':');
    const value = parseFloat(valueStr);

    if (isNaN(value)) {
      console.warn('Valor inválido recebido:', data);
      return;
    }

    if (label === 'corrente1') {
      sensorData.corrente1 = value;
      if (sensorData.corrente1 > 2) {
        const novoAlerta = new Alerta({
          sensor: 'corrente1',
          valor: sensorData.corrente1,
          mensagem: 'Curto de corrente: corrente acima do nível de segurança',
          horario: new Date(),
        });
       
        novoAlerta.save()
          .then(() => console.log('Alerta salvo no MongoDB'))
          .catch(err => console.error('Erro ao salvar alerta:', err));
      }
    } 
    else if (label === 'corrente2') {
      sensorData.corrente2 = value;
      if (sensorData.corrente2 > 5) {
        const novoAlerta = new Alerta({
          sensor: 'corrente2',
          valor: sensorData.corrente2,
          mensagem: 'Curto de corrente: corrente acima do nível de segurança',
          horario: new Date(),
        });
       
        novoAlerta.save()
          .then(() => console.log('Alerta salvo no MongoDB'))
          .catch(err => console.error('Erro ao salvar alerta:', err));
      }
    } 
    else if (label === 'misturador') {
      sensorData.misturador = value;
    } 
    else if (label === 'escotilha') {
      sensorData.escotilha = value;
    }
    else if (label === 'prensa') {
      sensorData.prensa = value;
    }
    else if (label === 'esteira') {
      sensorData.esteira = value;
    }
    else {
      console.warn('Label desconhecido:', label);
      return;
    }

    io.emit('sensorData', sensorData);
  });

  port.on('error', (err) => {
    console.error('Erro na porta serial:', err.message);
  });
} else {
  // Inicia a simulação se estiver em modo de simulação
  setInterval(simulateArduinoData, SIMULATION_INTERVAL);
  console.log('Modo de simulação ativado - Gerando dados fictícios');
}

// Rotas
app.post('/enviar', (req, res) => {
  const { comando } = req.body;
  console.log('comando', comando);

  if (!SIMULATION_MODE && (comando === 'b' || comando === 'r')) {
    port.write(comando, err => {
      if (err) {
        return res.status(500).send('Erro ao enviar para o Arduino');
      }
      res.send('Comando enviado para o Arduino: ' + comando);
    });
  } else if (SIMULATION_MODE) {
    // Simula resposta para comandos no modo de simulação
    console.log(`Simulação: Comando "${comando}" recebido`);
    res.send(`Simulação: Comando "${comando}" processado (nenhum Arduino conectado)`);
  } else {
    res.status(400).send('Comando inválido');
  }
});

app.get('/', (req, res) => {
  res.send('Servidor Rodando');
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Envia os dados atuais imediatamente quando um cliente se conecta
  socket.emit('sensorData', sensorData);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Servidor WebSocket rodando na porta 3001');
});