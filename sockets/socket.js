const { updateLocation, needy, teamMembers } = require("./user");

let users = {};
const socketioConnect = (io) => {
  console.log("Connection");
  io.on("connection", (socket) => {
    console.log("user connected", socket.id);
    socket.on("establishConnection", (payload) => {
      const { _id } = payload;
      users[_id] = socket.id;
    });
    console.log(users);

    //teams
    teamMembers(io, socket);

    //update location
    updateLocation(io, socket);

    //help events
    needy(io, socket);

    socket.on("disconnect", () => {
      let removed_user_id = "";
      for (var key in users) {
        if (users[key] == socket.id) {
          delete users[key];
          removed_user_id = key;
        }
      }
    });
  });
};

module.exports = { socketioConnect, users };
