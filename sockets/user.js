let geoLib = require("geo-lib");
const { findByIdAndUpdate } = require("../src/models/FirstAidTeam");

const FirstAidTeam = require("../src/models/FirstAidTeam");
const Needy = require("../src/models/Needy");
const Team = require("../src/models/Team");
const TeamHelp = require("../src/models/teamHelp");
const User = require("../src/models/User");
const socket = require("./socket");

let events_list = {
  UPDATE_LOCATION: "UPDATE_LOCATION",
  HELP_NEEDED: "HELP_NEEDED",
  TEAM_HELP_NEEDED: "TEAM_HELP_NEEDED",
  HELP_GOING: "HELP_GOING",
  HELP_COMING: "HELP_COMING",
  GET_NEEDY: "GET_NEEDY",
  GET_TEAM_MEMBERS: "GET_TEAM_MEMBERS",
};

const teamMembers = (io, socket) => {
  socket.on(events_list.GET_TEAM_MEMBERS, async (payload) => {
    const { user_id } = payload;
    console.log("user Id is", user_id);
    const teams = await Team.find({
      team_by: user_id,
    }).populate({
      model: "user",
      path: "team_by",
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
    const { user_id, team_id, needHelp } = payload;
    // user_id is for the person requesting help

    try {
      const userExists = await User.findById(user_id);
      if (!userExists) {
        return res.status(404).send({ msg: "User does not exist!" });
      }

      const team = await Team.findById(team_id);
      if (!team) {
        return res.status(404).send({ msg: "Team does not exist!" });
      }

      const newTeamHelp = await TeamHelp.findOneAndUpdate(
        {
          $and: [{ requester: user_id }, { team_selected: team_id }],
        },
        {
          $set: {
            time: Date.now(),
            requester: user_id,
            team_selected: team_id,
            helpMessage: needHelp,
          },
        },
        {
          new: true,
          upsert: true,
        }
      );

      console.log(newTeamHelp);

      const teamPhoneNumbers = team.team_members.map((t) => {
        return t.phone;
      });

      let allUsersInTeam = await User.find({
        phone: { $in: teamPhoneNumbers },
      }).select("_id");

      // Extracring user_ids
      const userIds = allUsersInTeam.map((user) => {
        return user._id;
      });
      console.log(userIds);

      // Update USER DOC with Need help string
      // const response = await User.findByIdAndUpdate(
      //   user_id,
      //   {
      //     $set: {
      //       i_need_help: needHelp,
      //     },
      //   },
      //   {
      //     new: true,
      //   }
      // );
      // if (!response) {
      //   throw { msg: "Help could not be requested!" };
      // }

      // Send Notification to every member of team except help requester with type

      // const teams = await Team.find({
      //   team_by: user_id,
      // });
      // Send Notification to every member of team where user is member
      // socket.emit(events_list.TEAM_HELP_NEEDED, {
      //   msg: "Help requested!",
      //   teams,
      // });
    } catch (err) {
      socket.emit(events_list.HELP_NEEDED, err.message ? err.message : err);
    }
  });

  /*
    TODO:
      1- CHECK IF REQUESTER EXISTS ----> DONE
      2- CHECK IF HELPER EXISTS ----> DONE
      3- CHECK IF TEAM EXISTS ----> DONE
      4- UPDATE TEAM HELP TABLE WITH HELPER ID ----> DONE
      4- GET ALL PHONE NUMBERS OF TEAM ----> DONE
      5- FIND THE USER_IDS OF ALL TEAM MEMBERS ----> DONE
      6- FILTER THE USER_IDS OF REQUESTER AND HELPER ----> DONE
      7- SEND NOTIFICATION TO ALL THE USERS IN THE ARRAY ----> INCOMPLETE
  */
  socket.on(events_list.HELP_GOING, async (payload) => {
    const { helper_id, requester_id, team_id } = payload;
    console.log("helper_id", helper_id);
    console.log("requester_id", requester_id);

    try {
      const requester = await User.findById(requester_id);
      if (!requester) return res.status(404).send("Requester does not exist");

      const helper = await User.findById(helper_id);
      if (!helper) return res.status(404).send("Helper does not exist");

      const teamExists = await Team.findById(team_id);
      if (!teamExists) return res.status(404).send("Team does not exist");

      const teamHelp = await TeamHelp.findOneAndUpdate(
        {
          $and: [{ requester: requester_id }, { team_selected: team_id }],
        },
        {
          $set: {
            helper: helper_id,
          },
        },
        {
          new: true,
        }
      ).populate("team_selected");

      // console.log(teamHelp.team_selected.team_members);
      const teamPhoneNumbers = teamHelp.team_selected.team_members.map((t) => {
        return t.phone;
      });

      let allUsersInTeam = await User.find({
        phone: { $in: teamPhoneNumbers },
      }).select("_id");

      // Extracring user_ids
      const userIds = allUsersInTeam.map((user) => {
        return user._id;
      });

      const filteredUserIds = userIds.filter(
        (user_id) =>
          user_id.toString() != helper_id && user_id.toString() != requester_id
      );

      // console.log(filteredUserIds);

      // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER

      // SEND NOTIFICATION TO THE REQUESTER THAT THE HELP IS COMING

      // SEND NOTIFICATION TO THE REQUESTER THAT THE HELP IS COMING

      // socket.emit(events_list.HELP_GOING, {
      //   msg: "Help Going!",
      //   filteredUserIds: filteredUserIds,
      // });
    } catch (err) {
      socket.emit(events_list.HELP_NEEDED, err.message ? err.message : err);
    }
  });
};

module.exports = { updateLocation, needy, teamMembers };
