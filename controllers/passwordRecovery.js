/*const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// Função que gera e envia o código de recuperação de senha
const recoverPassword = async (email, res) => {
  try {
    const user = await User.findOne({ email });
    console.log(`Tentativa de recuperação para: ${email}`);

    if (!user) {
      return res.status(404).send("Usuário não encontrado");
    }

    // Gera código aleatório de 4 dígitos
    const recoveryCode = Math.floor(1000 + Math.random() * 9000);
    const expiry = Date.now() + 3600000; // 1h de expiração

    // Atualiza dados do usuário com o código
    user.recoveryCode = recoveryCode.toString();
    user.recoveryCodeExpiry = expiry; // Corrigido

    await user.save();

    // Envia código do meu e-mail pro usuário
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "anaceliaaugusta@gmail.com", // Seu e-mail
        pass: "182720Aa@", // Sua senha ou senha de aplicativo
      },
    });

    const mailOptions = {
      from: "anaceliaaugusta@gmail.com", // Seu e-mail
      to: email,
      subject: "Código de Recuperação de senha",
      text: `Seu código de recuperação é: ${recoveryCode}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send("Erro ao enviar e-mail");
      }
      res.send("Código enviado para o seu e-mail");
    });
  } catch (error) {
    res.status(500).send("Erro ao recuperar senha");
  }
};

// Função que redefine a senha
const resetPassword = async (email, Code, newPassword, res) => {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("Usuário não encontrado");
    }

    if (user.recoveryCode !== Code) {
      return res.status(400).send("Código inválido");
    }

    if (Date.now() > user.recoveryCodeExpiry) {
      return res.status(400).send("Código expirado");
    }

    // Atualizando a senha
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    user.password = hashedNewPassword;
    user.recoveryCode = null;
    user.recoveryCodeExpiry = null;

    await user.save();

    res.send("Senha alterada com sucesso");
  } catch (error) {
    res.status(500).send("Erro ao redefinir a senha");
  }
};

module.exports = { recoverPassword, resetPassword };
*/

const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// Função que gera e envia o código de recuperação de senha
const recoverPassword = async (email, res) => {
  try {
    const user = await User.findOne({ email });
    console.log(`Tentativa de recuperação para: ${email}`);

    if (!user) {
      return res.status(404).send("Usuário não encontrado");
    }

    // Gera código aleatório de 4 dígitos
    const recoveryCode = Math.floor(1000 + Math.random() * 9000);
    const expiry = Date.now() + 3600000; // 1 hora de expiração

    // Atualiza dados do usuário com o código
    user.recoveryCode = recoveryCode.toString();
    user.recoverPasswordExpiry = expiry;

    await user.save();

    // Envia o código por e-mail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "anaceliaaugusta@gmail.com",
        pass: "182720Aa@",  // Se você estiver usando senha de aplicativo, coloque-a aqui
      },
    });

    const mailOptions = {
      from: "anaceliaaugusta@gmail.com",
      to: email,
      subject: "Código de Recuperação de senha",
      text: `Seu código de recuperação é: ${recoveryCode}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Erro ao enviar e-mail:", error);
        return res.status(500).send("Erro ao enviar e-mail");
      }
      res.send("Código enviado para o seu e-mail");
    });
  } catch (error) {
    console.error("Erro ao recuperar senha:", error);
    res.status(500).send("Erro ao recuperar senha");
  }
};

// Função para redefinir a senha
const resetPassword = async (email, code, newPassword, res) => {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("Usuário não encontrado");
    }

    if (user.recoveryCode !== code) {
      return res.status(400).send("Código inválido");
    }

    if (Date.now() > user.recoveryCodeExpiry) {
      return res.status(400).send("Código expirado");
    }

    // Atualizando a senha
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    user.password = hashedNewPassword;
    user.recoveryCode = null;
    user.recoveryCodeExpiry = null;

    await user.save();

    res.send("Senha alterada com sucesso");
  } catch (error) {
    console.error("Erro ao redefinir a senha:", error);
    res.status(500).send("Erro ao redefinir a senha");
  }
};

module.exports = { recoverPassword, resetPassword };
