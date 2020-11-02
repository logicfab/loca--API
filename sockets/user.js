const Needy = require("../src/models/Needy");
const Team = require("../src/models/Team");
const User = require("../src/models/User");

let events_list = {
  UPDATE_LOCATION: "UPDATE_LOCATION",
  HELP_NEEDED: "HELP_NEEDED",
  GET_NEEDY: "GET_NEEDY",
  GET_TEAM_MEMBERS: "GET_TEAM_MEMBERS",
};

const teamMembers = (io, socket) => {
  socket.on(events_list.GET_TEAM_MEMBERS, async (payload) => {
    const { user_id } = payload;
    const teams = await Team.find({
      $or: [{ team_by: user_id }, { team_members: user_id }],
    });
    console.log(teams);
    socket.emit(events_list.GET_TEAM_MEMBERS, { teams });
  });
};

const updateLocation = (io, socket) => {
  const { users } = require("./socket");
  socket.on(events_list.UPDATE_LOCATION, async (payload) => {
    const { user_id, user_location } = payload;
    const user = await User.findById(user_id);
    if (!user) {
      throw { msg: "User not Found!" };
    }
    const response = await User.findByIdAndUpdate(
      user_id,
      {
        "location.lat": user_location.lat,
        "location.lng": user_location.lng,
        "location.lastUpdate": Date.now(),
      },
      {
        new: true,
        upsert: true,
      }
    );
    if (!response) {
      return socket.emit(events_list.UPDATE_LOCATION, {
        msg: "Unable to Update Location!",
      });
    }

    console.log(user_id);
    // Send Updated Location To EveryOne(Team where user is member)
    const teams = await Team.find({ team_members: user_id }).populate({
      model: "user",
      path: "team_members",
    });
    teams.forEach((team) => {
      if (team.team_by != user._id) {
        io.to(users[team.team_by]).emit(events_list.GET_TEAM_MEMBERS, {
          teams,
        });
      }
      team.team_members.forEach((member) => {
        if (member._id != user_id) {
          io.to(users[member._id]).emit(events_list.GET_TEAM_MEMBERS, {
            teams,
          });
        }
      });
    });
    console.log(users);

    socket.emit(events_list.UPDATE_LOCATION, response);
  });
};

const needy = (io, socket) => {
  socket.on(events_list.HELP_NEEDED, async (payload) => {
    const { user_id, description } = payload;
    let needy = new Needy({
      user: user_id,
      description,
    });
    let response = await needy.save();
    if (!response) {
      return socket.emit(events_list.HELP_NEEDED, {
        status: false,
        msg: "Operation Failed!",
      });
    }

    socket.emit(events_list.HELP_NEEDED, {
      status: true,
      msg: response,
    });
  });

  // GET PEOPLE WHO NEED HELP

  socket.on(events_list.GET_NEEDY, async (payload) => {
    const { skip, limit } = payload;
    const needies = await Needy.find({ status: "unresolved" })
      .sort({ updatedAt: "-1" })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    socket.emit(events_list.GET_NEEDY, needies);
    console.log("needy!");
  });
};

module.exports = { updateLocation, needy, teamMembers };
