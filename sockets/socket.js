const { firstAidTeam } = require("./firstaidteam");
const { updateLocation, needy, teamMembers } = require("./user");

let users = {};
const socketioConnect = (io) => {
  console.log("Connection");
  io.on("connection", (socket) => {
    console.log("user connected", socket.id);

    socket.on("ESTABLISH_CONNECTION", ({ user_id }) => {
      users[user_id] = socket.id;
      console.log("users =", users);
    });

    //teams
    teamMembers(io, socket);

    //update location
    updateLocation(io, socket);

    //help events
    needy(io, socket, users);

    // firstAid Team
    firstAidTeam(io, socket);

    socket.on("DISCONNECT", () => {
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
