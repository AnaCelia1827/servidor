const { Server } = require("socket.io");

const socketHandler = (server) => {

  
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("Novo cliente conectado!");

    // Enviar notificação automática após 5 segundos
    setTimeout(() => {
      socket.emit("notificacao", { message: "Bem-vindo! Essa é sua primeira notificação." });
    }, 5000);

    socket.on("disconnect", () => {
      console.log("Cliente desconectado");
    });
  });

  return io;
};

module.exports = socketHandler;
