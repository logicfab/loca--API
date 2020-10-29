let users = {};
const socketioConnect = (io) => {
  console.log("Connection");
  io.on("connection", (socket) => {
    console.log("user connected", socket.id);
    socket.on("establishConnection", (payload) => {
      const { _id } = payload;
      users[_id] = socket.id;
      console.log(users);
    });
    socket.on("disconnect", () => {
      console.log(socket.id);
    });
  });
};

module.exports = socketioConnect;
