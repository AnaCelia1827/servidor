const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { nome, email, password, cargo } = req.body;
  const fotoPerfil = req.file?.filename || null;

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const user = await User.create({
      nome,
      email,
      password: hashedPassword,
      cargo,
      fotoPerfil
    });
    res.status(201).json({ message: "Usuário criado", user });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar", details: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Senha incorreta" });

    const token = jwt.sign(
      { id: user._id, cargo: user.cargo },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: "Erro no login", details: err.message });
  }
};
