const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken"); // gerar e verificar tokens JWT
const bcrypt = require("bcryptjs");
const router = express.Router();
const upload = require("../middleware/upload");
const authMiddleware = require("../middleware/authMiddleware");
const nodemailer = require('nodemailer');
const Historico = require("../models/Historico");
const Alerta = require("../models/Alerta");


const Azulejo = require('../models/Azulejo')

// Middleware para verificar token
function isAdmin(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1];
  
    if (!token) {
      return res.status(401).json({ msg: "Token ausente" });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.SECRET);
  
      if (decoded.role !== "admin") {
        return res.status(403).json({ msg: "Acesso restrito para administradores" });
      }
  
      req.userId = decoded.id;
      next();
    } catch (error) {
      return res.status(401).json({ msg: "Token inválido" });
    }
  }


// Cadastro de usuário adm
router.post("/Cadastro", upload.single("fotoPerfil"), async (req, res) => {
  try {
    const { nome, email, password } = req.body;
    const fotoPerfil = req.file ? `/uploads/${req.file.filename}` : "";

    if (!nome || !email || !password ) {
      return res.status(400).json({ error: "Preencha todos os campos!" });
    }

    console.log("Dados recebidos:", { nome, email, password, fotoPerfil });

    // Verifica se o email já está cadastrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado!" });
    }

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const Hpassword = await bcrypt.hash(password, salt);

    // Cria um novo usuário
    const newUser = new User({ nome, email, password: Hpassword,  fotoPerfil, role: "admin" });
    await newUser.save();

    res.status(201).json({ message: "Usuário cadastrado com sucesso" });
    console.log("Criando usuário:", { email });
  } catch (error) {
    console.error("Erro ao cadastrar o usuário:", error);
    res.status(500).json({ error: "Erro ao cadastrar o usuário" });
  }
});

// Login de usuário
router.post("/LoginAdm", async (req, res) => {
  try {
    console.log("Body recebido:", req.body);
    const { email, password } = req.body;
    console.log(email, password)
    const user = await User.findOne({ email, role: "admin"});

    if (!user) {
      return res.status(400).json({ message: "Usuário não encontrado!" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Senha é válida?", isMatch);
    if (!isMatch) {
      return res.status(400).json({ message: "Senha incorreta!" });
      return res.status(400).json(console.log("senha errda"));
    }

    if (!process.env.SECRET) {
      throw new Error("Variável de ambiente SECRET não definida!");
    }

    const token = jwt.sign({ id: user._id, email: user.email,  role: user.role }, process.env.SECRET, {
      expiresIn: "8h", 
    });

    res.status(200).json({ msg: "Autenticação com sucesso", token });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
 
});



router.get("/dashbordAdm", isAdmin, async (req, res) => {
  console.log("ID do usuário autenticado:", req.userId);
  try {
    const user = await User.findById(req.userId, "-password");
    if (!user) {
      return res.status(404).json({ msg: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ msg: "Erro no servidor" });
  }
});






const transporter = nodemailer.createTransport({
  service: 'gmail', // Ou o serviço que você preferir (ex: Outlook, Yahoo, etc.)
  auth: {
    user: 'projetofibrac@gmail.com',  
    pass: 'dsse eoll jkwt kjjm'            
  }
});

// Função para gerar um código de 6 dígitos
const gerarCodigoRecuperacao = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Rota para solicitar recuperação de senha
router.post('/RSenhaAdm', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const codigo = gerarCodigoRecuperacao(); // Gerar o código de 6 dígitos
  const validade = Date.now() + 1000 * 60 * 15; // Código válido por 15 minutos

  // Atualizando o banco com o código de recuperação e a validade
  user.resetToken = codigo;
  user.resetTokenValidoAte = validade;
  await user.save();

  // Criando o conteúdo do e-mail com o código de recuperação
  const mailOptions = {
    from: 'projetofibrac@gmail.com',     
    to: email,                      
    subject: 'Código de Recuperação de Senha',
    text: `Seu código de recuperação é: ${codigo}. Ele é válido por 15 minutos.
    Ficamos muito feliz por escolher e confiar no Fibrac!`
  };

  try {
    //Enviando o e-mail
    await transporter.sendMail(mailOptions);
    res.json({ mensagem: 'Código de recuperação enviado para o e-mail.' });
  } catch (error) {
    console.error('Erro ao enviar o e-mail:', error);
    res.status(500).json({ erro: 'Erro ao enviar o e-mail de recuperação.' });
  }
});

// Rota para resetar a senha usando o código
router.post('/CodigoSenhaAdm', async (req, res) => {
  const { email, codigo } = req.body;
  console.log("Dados recebidos:", req.body);

  const user = await User.findOne({
    email: email.trim(),
    resetToken: codigo.trim(),
    resetTokenValidoAte: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ success: false, message: "Código inválido ou expirado." });

  res.json({ success: true });
});

//trocar de senha
router.post('/ConfimarSenhaAdm', async (req, res) => {
  const { email, codigo, novaSenha } = req.body;

  console.log('Dados recebidos:', { email, codigo });

  try {
    const user = await User.findOne({
      email, // garantimos que o email corresponde
      resetToken: codigo,
      resetTokenValidoAte: { $gt: Date.now() } // token ainda válido
    });

    if (!user) {
      console.log('Erro: Código inválido, expirado ou já utilizado');
      return res.status(400).json({
        success: false,
        message: 'Código inválido, expirado ou já utilizado. Solicite um novo para continuar.'
      });
    }

    // Atualiza a senha
    const hash = await bcrypt.hash(novaSenha, 10);
    user.password = hash;

    // Invalida o token para evitar reuso
    user.resetToken = undefined;
    user.resetTokenValidoAte = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'Senha atualizada com sucesso!'
    });

  } catch (err) {
    console.error('Erro no backend ao confirmar senha:', err);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao tentar atualizar a senha.'
    });
  }
});








  
router.get('/azulejos', async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({ erro: 'Parâmetros "inicio" e "fim" são obrigatórios' });
    }

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    console.log(dataInicio, dataFim);

    const filtro = {
      dataProducao: {
        $gte: dataInicio,
        $lte: dataFim
      }
    };

    const dados = await Azulejo.find(filtro);
    console.log(dados)

    const contagem = await Azulejo.aggregate([
      { $match: filtro },
      { $group: { _id: "$status", total: { $sum: 1 } } }
    ]);

    const resultado = {
      total: dados.length,
      contagemStatus: {
        bom: 0,
        ruim: 0
      },
      dados
    };

    contagem.forEach(item => {
      if (item._id === "bom") resultado.contagemStatus.bom = item.total;
      else if (item._id === "ruim") resultado.contagemStatus.ruim = item.total;
    });

    res.json(resultado);
    console.log(resultado);
  } catch (err) {
    console.error('Erro ao buscar dados por data:', err);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

router.get("/historico", async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    // Verifica se ambas as datas foram fornecidas
    if (!inicio || !fim) {
      return res.status(400).json({ message: "Datas de início e fim são obrigatórias." });
    }

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    // Verifica se as datas são válidas
    if (isNaN(dataInicio) || isNaN(dataFim)) {
      return res.status(400).json({ message: "Datas inválidas fornecidas." });
    }

    // Cria o filtro para o campo `data`
    const filtro = {
      data: {
        $gte: dataInicio,
        $lte: dataFim
      }
    };

    // Consulta no banco de dados
  const historico = await Historico.find(filtro).sort({ data: -1 });
    res.json(historico);
  } catch (err) {
    console.error("Erro ao buscar o histórico:", err);
    res.status(500).json({ message: "Erro ao buscar o histórico" });
  }
});



router.get("/alertas", async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    // Verifica se ambas as datas foram fornecidas
    if (!inicio || !fim) {
      return res.status(400).json({ message: "Datas de início e fim são obrigatórias." });
    }

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    // Verifica se as datas são válidas
    if (isNaN(dataInicio) || isNaN(dataFim)) {
      return res.status(400).json({ message: "Datas inválidas fornecidas." });
    }

    // Cria o filtro para o campo `data`
    const filtro = {
      data: {
        $gte: dataInicio,
        $lte: dataFim
      }
    };

    // Consulta no banco de dados
    const alertas = await Alerta.find(filtro)
    
      .sort({ criadoEm: -1 }); // Ordena do mais recente para o mais antigo

    res.json(alertas);

  } catch (err) {
    console.error("Erro ao buscar o histórico:", err);
    res.status(500).json({ message: "Erro ao buscar o histórico" });
  }
});


//rotas para puxar quant de informacoes de azulejos  no mongo db 











module.exports = router;
