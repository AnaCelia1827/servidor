const express = require("express");
const User = require("../models/User");
const Historico =require("../models/Historico");
const jwt = require("jsonwebtoken"); // gerar e verificar tokens JWT
const bcrypt = require("bcryptjs");
const router = express.Router();
const upload = require("../middleware/upload");
const authMiddleware = require("../middleware/authMiddleware");
const nodemailer = require('nodemailer');

// Middleware para verificar token
function checkToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Acesso negado" });
  }

  try {
    const secret = process.env.SECRET;
    const decoded = jwt.verify(token, secret);
    console.log("Token decodificado:", decoded);
    req.userId = decoded.id; 
    
    next(); // Permite que a requisição continue
  } catch (error) {
    res.status(400).json({ msg: "Token inválido" });
  }
}

// Cadastro de usuário
router.post("/Cadastro2", upload.single("fotoPerfil"), async (req, res) => {
  try {
    const { nome, email, password} = req.body;
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
    const newUser = new User({ nome, email, password: Hpassword, fotoPerfil });
    await newUser.save();

    res.status(201).json({ message: "Usuário cadastrado com sucesso" });
    console.log("Criando usuário:", { email });
  } catch (error) {
    console.error("Erro ao cadastrar o usuário:", error);
    res.status(500).json({ error: "Erro ao cadastrar o usuário" });
  }
});

// Login de usuário
router.post("/Login", async (req, res) => {
  try {
    console.log("Body recebido:", req.body);
    const { email, password } = req.body;
    console.log(email, password)
    const user = await User.findOne({ email,  role: "user" });

    if (!user) {
      return res.status(400).json({ message: "Usuário não encontrado!" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Senha é válida?", isMatch);
    if (!isMatch) {
      return res.status(400).json({ message: "Senha incorreta!" });
    }

    if (!process.env.SECRET) {
      throw new Error("Variável de ambiente SECRET não definida!");
    }

    const token = jwt.sign({ id: user._id, email: user.email,  role: user.role }, process.env.SECRET, {
      expiresIn: "8h", // Token expira em 1 hora
    });

    res.status(200).json({ msg: "Autenticação com sucesso", token, user});
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
 
});



router.get("/dashbord", checkToken, async (req, res) => {
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
router.post('/RSenha', async (req, res) => {
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
    text: `Seu código de recuperação é: ${codigo}. Ele é válido por 15 minutos.`
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
router.post('/CodigoSenha', async (req, res) => {
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
router.post('/ConfimarSenha', async (req, res) => {
  const { email, codigo, novaSenha } = req.body;

  // Verificando se o código é válido
  try {
    const user = await User.findOne({
      email: email,  // Certificando-se de que estamos buscando pelo email também
      resetToken: codigo,
      resetTokenValidoAte: { $gt: Date.now() }
    });

    console.log('Código de validação:', codigo);
    console.log('ResetTokenValidoAte:', user?.resetTokenValidoAte);
    console.log('Data atual:', Date.now());

    if (!user) {
      console.log('Erro: Código inválido ou expirado');
      return res.status(400).json({ erro: 'Código inválido ou expirado' });
    }

    // Hash da nova senha
    const hash = await bcrypt.hash(novaSenha, 10);
    user.password = hash;
    user.resetToken = undefined;  // Limpa o token após a alteração de senha
    user.resetTokenValidoAte = undefined;  // Limpa a validade do token
    await user.save();

    res.json({ mensagem: 'Senha atualizada com sucesso!' });
  } catch (err) {
    console.error("Erro ao atualizar a senha:", err);
    res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
});







router.post('/historico', async (req, res) => {
   const { usuario, acao, data } = req.body;

  if (!usuario || !acao) {
    return res.status(400).json({ erro: 'Usuário e ação são obrigatórios' });
  }
  console.log(usuario, acao)
  try {
    const novoRegistro = new Historico({ usuario, acao, data });

    await novoRegistro.save();
    console.log(novoRegistro);
    res.status(201).send('Histórico registrado');
  } catch (err) {
    console.error('Erro ao salvar no banco:', err);
    res.status(500).send('Erro interno');
  }
});








module.exports = router;
