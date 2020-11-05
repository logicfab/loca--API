let geoLib = require("geo-lib");
const { findByIdAndUpdate } = require("../src/models/FirstAidTeam");

const FirstAidTeam = require("../src/models/FirstAidTeam");
const Needy = require("../src/models/Needy");
const Team = require("../src/models/Team");
const User = require("../src/models/User");
const socket = require("./socket");

let events_list = {
  UPDATE_LOCATION: "UPDATE_LOCATION",
  HELP_NEEDED: "HELP_NEEDED",
  TEAM_HELP_NEEDED: "TEAM_HELP_NEEDED",
  GET_NEEDY: "GET_NEEDY",
  GET_TEAM_MEMBERS: "GET_TEAM_MEMBERS",
};

const teamMembers = (io, socket) => {
  socket.on(events_list.GET_TEAM_MEMBERS, async (payload) => {
    const { user_id } = payload;
    const teams = await Team.find({
      $or: [{ team_by: user_id }, { team_members: user_id }],
    }).populate({
      model: "user",
      path: "team_by team_members",
    });

    socket.emit(events_list.GET_TEAM_MEMBERS, { teams });
  });
};

const updateLocation = (io, socket) => {
  const { users } = require("./socket");

  socket.on(events_list.UPDATE_LOCATION, async (payload) => {
    console.log("here!");
    const { user_id, user_location } = payload;

    console.log(user_location);
    try {
      const user = await User.findById(user_id);
      if (!user) {
        throw { msg: "User not Found!" };
      }

      user_location.lastUpdate = new Date();
      const response = await User.findByIdAndUpdate(
        user_id,
        {
          location: user_location,
        },
        {
          new: true,
          upsert: true,
        }
      );
      if (!response) {
        throw {
          msg: "Unable to Update Location!",
        };
      }

      console.log(response);

      console.log(user_id);
      // Send Updated Location To EveryOne(Team where user is member)
      const teams = await Team.find({
        $or: [{ team_by: user_id }, { team_members: user_id }],
      }).populate({
        model: "user",
        path: "team_members team_by",
      });
      teams.forEach((team) => {
        if (team.team_by._id != user._id) {
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

      socket.emit(events_list.UPDATE_LOCATION, response);
    } catch (err) {
      socket.emit(events_list.UPDATE_LOCATION, err.message ? err.message : err);
    }
  });
};

const needy = (io, socket) => {
  socket.on(events_list.HELP_NEEDED, async (payload) => {
    const { user_id, description } = payload;
    try {
      let needy = new Needy({
        user: user_id,
        description,
      });
      let response = await needy.save();
      if (!response) {
        throw {
          status: false,
          msg: "Operation Failed!",
        };
      }

      const user = await User.findById(user_id);

      console.log(user);

      const teams = await FirstAidTeam.find({});

      // get Nearest FirstAid Team
      let nearestTeam = { distance: 1500 };
      teams.forEach((team) => {
        let result = geoLib.distance({
          p1: {
            lat: user.location.lat,
            lon: user.location.lng,
          },
          p2: {
            lat: team.location.lat,
            lon: team.location.lng,
          },
        });
        if (result.distance < nearestTeam.distance) {
          nearestTeam.distance = result.distance;
          nearestTeam.team = team._id;
        }
        console.log(result);
      });

      console.log(nearestTeam);

      // Send Notification to nearestTeam (send user locaiton and name with it)

      socket.emit(events_list.HELP_NEEDED, {
        status: true,
        msg: response,
      });
    } catch (err) {
      socket.emit(events_list.HELP_NEEDED, err.message ? err.message : err);
    }
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

  // FRINDS HELP NEEDED
  socket.on(events_list.TEAM_HELP_NEEDED, async (payload) => {
    const { user_id, needHelp } = payload;

    try {
      const userExists = await User.findById(user_id);
      if (!userExists) {
        throw { msg: "User does not exist!" };
      }

      const response = await User.findByIdAndUpdate(
        user_id,
        {
          $set: {
            i_need_help: needHelp,
          },
        },
        {
          new: true,
        }
      );

      if (!response) {
        throw { msg: "Help could not be requested!" };
      }

      const teams = await Team.find({
        $or: [{ team_members: user_id }, { team_by: user_id }],
      });

      // Send Notification to every member of team where user is member

      socket.emit(events_list.TEAM_HELP_NEEDED, { msg: "Help requested!" });
    } catch (err) {
      socket.emit(events_list.HELP_NEEDED, err.message ? err.message : err);
    }
  });
};

module.exports = { updateLocation, needy, teamMembers };
