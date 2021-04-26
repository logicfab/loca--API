const { firstAidTeam } = require("./firstaidteam");
const { updateLocation, needy, teamMembers } = require("./user");

let users = {};
const socketioConnect = (io) => {
  io.on("connection", (socket) => {
    const user = socket.handshake.query.user_id;
    users[user] = socket.id;
    console.log("USERS==>", users);

    //teams
    teamMembers(io, socket, users);

    //update location
    updateLocation(io, socket, users);

    //help events
    needy(io, socket, users);

    // firstAid Team
    firstAidTeam(io, socket, users);

    socket.on("DISCONNECT", () => {
      let removed_user_id = "";
      for (var key in users) {
        console.log(key);
        if (users[key] == socket.id) {
          delete users[key];
          removed_user_id = key;
        }
      }
      console.log("User ", removed_user_id, " DISCONNECTED!");
    });
  });
};

module.exports = { socketioConnect, users };
