let geoLib = require("geo-lib");
const { sendNotification } = require("../helpers/oneSignalNotification");
const {
  findByIdAndUpdate,
  findOneAndUpdate,
} = require("../src/models/FirstAidTeam");

const FirstAidTeam = require("../src/models/FirstAidTeam");
const Needy = require("../src/models/Needy");
const Team = require("../src/models/Team");
const TeamHelp = require("../src/models/teamHelp");
const User = require("../src/models/User");
const Vehicle = require("../src/models/vehicle");
const socket = require("./socket");

let events_list = {
  UPDATE_LOCATION: "UPDATE_LOCATION",
  FIRST_AID_HELP_NEEDED: "FIRST_AID_HELP_NEEDED",
  ACCEPT_FIRST_AID_HELP: "ACCEPT_FIRST_AID_HELP",
  CANCEL_FIRST_AID_HELP_TEAM: "CANCEL_FIRST_AID_HELP_TEAM",
  CANCEL_FIRST_AID_HELP_REQUEST: "CANCEL_FIRST_AID_HELP_REQUEST",
  TEAM_HELP_NEEDED: "TEAM_HELP_NEEDED",
  CANCEL_HELP_REQUEST: "CANCEL_HELP_REQUEST",
  HELP_GOING: "HELP_GOING",
  HELP_COMING: "HELP_COMING",
  HELP_CANCEL: "HELP_CANCEL",
  HELP_COMPLETE: "HELP_COMPLETE",
  GET_NEEDY: "GET_NEEDY",
  GET_TEAM_MEMBERS: "GET_TEAM_MEMBERS",
  FIND_FRIENDS: "FIND_FRIENDS",
  UPLOAD_CONTACTS: "UPLOAD_CONTACTS",
  ANONYMOUS_GROUP: "ANONYMOUS_GROUP",
  GET_ANONYMOUS_GROUP: "GET_ANONYMOUS_GROUP",
  SET_VEHICLE_LOCATION: "SET_VEHICLE_LOCATION",
  GET_VEHICLE_LOCATION: "GET_VEHICLE_LOCATION",
};

const teamMembers = (io, socket, socketUsers) => {
  socket.on(events_list.GET_TEAM_MEMBERS, async (payload) => {
    const { user_id } = payload;
    // console.log("user Id is", user_id);
    const teams = await Team.find({
      team_by: user_id,
    }).populate({
      model: "user",

      path: "team_by",
    });

    socket
      .to(socketUsers[user_id])
      .emit(events_list.GET_TEAM_MEMBERS, { teams });
  });
};

const updateLocation = (io, socket, socketUsers) => {
  const { users } = require("./socket");

  socket.on(events_list.UPDATE_LOCATION, async (payload) => {
    // console.log("here!");
    const { user_id, user_location } = payload;

    // console.log(user_location);
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

      // console.log(response);

      // console.log(user_id);
      // // Send Updated Location To EveryOne(Team where user is member)
      // const teams = await Team.find({
      //   $or: [{ team_by: user_id }, { team_members: user_id }],
      // }).populate({
      //   model: "user",
      //   path: "team_members team_by",
      // });
      // teams.forEach((team) => {
      //   if (team.team_by._id != user._id) {
      //     io.to(users[team.team_by]).emit(events_list.GET_TEAM_MEMBERS, {
      //       teams,
      //     });
      //   }
      //   team.team_members.forEach((member) => {
      //     if (member._id != user_id) {
      //       io.to(users[member._id]).emit(events_list.GET_TEAM_MEMBERS, {
      //         teams,
      //       });
      //     }
      //   });
      // });
      // console.log("error");
      socket
        .to(socketUsers[user_id])
        .emit(events_list.UPDATE_LOCATION, response);
    } catch (err) {
      socket.emit(events_list.UPDATE_LOCATION, err.message ? err.message : err);
    }
  });
};

const needy = (io, socket, socketUsers) => {
  socket.on(events_list.CANCEL_FIRST_AID_HELP_TEAM, async (payload) => {
    try {
      const { user_id, helper_id } = payload;
      const user = await User.findById(user_id);
      const helper = await User.findById(helper_id);

      const needy = await Needy.findOneAndUpdate(
        { user: user_id, status: "unresolved" },
        {
          $unset: {
            assigned_team: 1,
          },
        },
        { new: true, upsert: true }
      );
      if (!user) throw { msg: "User does not exist" };
      socket
        .to(socketUsers[user_id])
        .emit(events_list.CANCEL_FIRST_AID_HELP_TEAM, { needy });

      const firstAidTeams = await User.find({
        userType: "professional",
        _id: { $ne: helper_id },
      });

      let nearestFirstAidTeams = []; // PROFESSIONAL USER ID FOR SOCKET EMISSION
      let oneSignalIdsOfFirstAidTeams = []; // One signal IDs for notifications

      firstAidTeams.forEach((team) => {
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
        if (result.distance < user.detection_radius * 1000) {
          team.one_signal_id
            ? oneSignalIdsOfFirstAidTeams.push(team.one_signal_id)
            : console.log();
          nearestFirstAidTeams.push(team._id);
        }
      });
      // console.log(oneSignalIdsOfFirstAidTeams);
      // Send Notification to nearestTeams (send user locaiton and name with it)
      sendNotification(
        helper.first_name + "Cancelled first aid help for " + user.first_name,
        `${helper.first_name} cancelled First Aid help for ${user.first_name}`,
        {
          user: user,
        },
        oneSignalIdsOfFirstAidTeams
      );

      // Emit to all first aid teams so that they can accept or reject a request
      nearestFirstAidTeams.forEach((id) => {
        console.log("ID <=", id, " SOKCET <=", socketUsers[id]);
        socket
          .to(socketUsers[id])
          .emit(events_list.CANCEL_FIRST_AID_HELP_TEAM, {
            msg: `${helper.first_name} cancelled First Aid for ${user.first_name}!`,
            user: user,
            helper: helper,
          });
      });
      socket
        .to(socketUsers[user_id])
        .emit(events_list.CANCEL_FIRST_AID_HELP_TEAM, {
          msg: `${helper.first_name} cancelled First Aid for You!`,
          needy,
        });
    } catch (err) {
      throw err;
    }
  });
  socket.on(events_list.CANCEL_FIRST_AID_HELP_REQUEST, async (payload) => {
    try {
      const { user_id } = payload;
      const user = await User.findById(user_id);

      const needy = await Needy.findOneAndUpdate(
        { user: user_id, status: "unresolved" },
        {
          $unset: {
            assigned_team: 1,
          },
          $set: {
            status: "cancelled",
          },
        },
        { new: true, upsert: true }
      );
      if (!user) throw { msg: "User does not exist" };
      const firstAidTeams = await User.find({ userType: "professional" });

      let nearestFirstAidTeams = []; // PROFESSIONAL USER ID FOR SOCKET EMISSION
      let oneSignalIdsOfFirstAidTeams = []; // One signal IDs for notifications

      firstAidTeams.forEach((team) => {
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
        if (result.distance < user.detection_radius * 1000) {
          team.one_signal_id
            ? oneSignalIdsOfFirstAidTeams.push(team.one_signal_id)
            : console.log();
          nearestFirstAidTeams.push(team._id);
        }
      });
      // console.log(oneSignalIdsOfFirstAidTeams);
      // Send Notification to nearestTeams (send user locaiton and name with it)
      sendNotification(
        "First Aid Help Cancelled",
        `${user.first_name} cancelled First Aid!`,
        {
          user: user,
        },
        oneSignalIdsOfFirstAidTeams
      );

      // Emit to all first aid teams so that they can accept or reject a request
      nearestFirstAidTeams.forEach((id) => {
        console.log("ID <=", id, " SOKCET <=", socketUsers[id]);
        socket
          .to(socketUsers[id])
          .emit(events_list.CANCEL_FIRST_AID_HELP_REQUEST, {
            msg: `${user.first_name} cancelled First Aid!`,
            user: user,
          });
      });
      socket
        .to(socketUsers[user_id])
        .emit(events_list.CANCEL_FIRST_AID_HELP_REQUEST, { needy });
    } catch (err) {
      console.log(err);
      throw err;
    }
  });

  socket.on(events_list.FIRST_AID_HELP_NEEDED, async (payload) => {
    try {
      const { user_id } = payload;
      const user = await User.findById(user_id);

      if (!user) throw { msg: "User does not exist" };

      const needy = await Needy.findOneAndUpdate(
        { user: user_id, status: "unresolved" },
        {
          $unset: {
            assigned_team: 1,
          },
        },
        { new: true, upsert: true }
      );

      if (!needy) throw { msg: "An error occurred" };
      // return res.status(404).send("An error occurred");

      const firstAidTeams = await User.find({ userType: "professional" });

      let nearestFirstAidTeams = []; // PROFESSIONAL USER ID FOR SOCKET EMISSION
      let oneSignalIdsOfFirstAidTeams = []; // One signal IDs for notifications

      firstAidTeams.forEach((team) => {
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
        if (result.distance < user.detection_radius * 1000) {
          team.one_signal_id
            ? oneSignalIdsOfFirstAidTeams.push(team.one_signal_id)
            : console.log();
          nearestFirstAidTeams.push(team._id);
        }
      });
      // console.log("TEAMS  : =>>>", nearestFirstAidTeams);
      sendNotification(
        "First Aid Help Required",
        `${user.first_name} needs First Aid!`,
        {
          user: user,
        },
        oneSignalIdsOfFirstAidTeams
      );

      // Emit to all first aid teams so that they can accept or reject a request
      nearestFirstAidTeams.forEach((id) => {
        socket
          .to(socketUsers[id])
          .emit(`${events_list.FIRST_AID_HELP_NEEDED}`, {
            msg: `${user.first_name} needs First Aid!`,
            user: user,
          });
      });
    } catch (err) {
      socket.emit(
        events_list.FIRST_AID_HELP_NEEDED,
        err.message ? err.message : err
      );
    }
  });

  socket.on(events_list.ACCEPT_FIRST_AID_HELP, async (payload) => {
    try {
      // console.log("ACCEPT_FIRST_AID_HELP=>>>");
      const { helper_id, user_id } = payload;
      const needy = await Needy.findOneAndUpdate(
        {
          user: user_id,
          status: "unresolved",
        },
        {
          $set: {
            assigned_team: helper_id,
          },
        },
        { new: true }
      );
      if (!needy) throw { msg: "Help does not exist" };
      // return res.status(404).send("Help does not exist");

      const user = await User.findById(user_id);
      if (!user) throw { msg: "User not Found!" };
      //  res.status(404).send("User not found");

      const helper = await User.findById(helper_id);
      if (!helper) throw { msg: "Helper not Found!" };
      // res.status(404).send("Helper not found");
      // ACCEPT_FIRST_AID_HELP
      if (user.one_signal_id) {
        sendNotification(
          "First Aid is coming",
          `First Aid is on its way!`,
          {
            team: helper,
          },
          [user.one_signal_id]
        );
      }
      const firstAidTeams = await User.find({
        _id: { $ne: helper_id },
        userType: "professional",
      });
      // console.log(firstAidTeams);
      let nearestFirstAidTeams = []; // PROFESSIONAL USER ID FOR SOCKET EMISSION
      let oneSignalIdsOfFirstAidTeams = []; // One signal IDs for notifications

      firstAidTeams.forEach((team) => {
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
        if (result.distance < user.detection_radius * 1000) {
          team.one_signal_id
            ? oneSignalIdsOfFirstAidTeams.push(team.one_signal_id)
            : console.log();
          nearestFirstAidTeams.push(team._id);
        }
      });
      // console.log(oneSignalIdsOfFirstAidTeams);
      // Send Notification to nearestTeams (send user locaiton and name with it)
      sendNotification(
        "First Aid Help for " + user.first_name + " is on the way ",
        `${helper.first_name} going to ${user.first_name} for First Aid!`,
        {
          user: user,
        },
        oneSignalIdsOfFirstAidTeams
      );

      // Emit to all first aid teams so that they can accept or reject a request
      nearestFirstAidTeams.forEach((id) => {
        socket
          .to(socketUsers[id])
          .emit(`${events_list.ACCEPT_FIRST_AID_HELP}`, {
            msg: `${helper.first_name} going to ${user.first_name} for First Aid!`,
            user: user,
            helper,
          });
      });
      socket.to(socketUsers[user_id]).emit(events_list.ACCEPT_FIRST_AID_HELP, {
        msg: "First Aid Is Coming",
        team: helper,
      });
    } catch (err) {
      console.log(err);
      socket.emit(
        events_list.ACCEPT_FIRST_AID_HELP,
        err.message ? err.message : err
      );
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
    // console.log(socketUsers[user_id]);
    try {
      const userExists = await User.findById(user_id);
      if (!userExists) {
        throw { msg: "User does not exist!" };
        // res.status(404).send({ msg: "User does not exist!" });
      }

      const team = await Team.findById(team_id);
      if (!team) {
        throw { msg: "Team does not exist" };
        // return res.status(404).send({ msg: "Team does not exist!" });
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

      const teamPhoneNumbers = team.team_members.map((t) => {
        return t.phone;
      });

      let allUsersInTeam = await User.find({
        phone: { $in: teamPhoneNumbers },
      });

      console.log("All users in team", allUsersInTeam);
      const userIds = allUsersInTeam.map((user) => {
        return user._id;
      });

      // filter the user ids so it does not contain the user id of help requester
      const filteredUserIds = userIds.filter((id) => id.toString() != user_id);
      console.log("filteredUserIds ------->", filteredUserIds);

      // Querying DB for one signal IDs of fitered users
      let oneSignalIds = await User.find({
        _id: { $in: filteredUserIds },
      }).select("one_signal_id");

      oneSignalIds = oneSignalIds.map((user) => {
        return user.one_signal_id;
      });

      console.log("oneSignalIds ------->", oneSignalIds);

      // Send Notification to every member of team except help requester with user object
      sendNotification(
        "Help Needed",
        `${userExists.first_name} needs you!`,
        {
          user: userExists,
          notificationType: "TEAM_HELP_NEEDED",
          team_id: team_id,
        },
        oneSignalIds
      );

      filteredUserIds.forEach((id) => {
        console.log("SOKCET USER ID ", socketUsers[id]);
        if (socketUsers[id]) {
          console.log(id, ":", socketUsers[id]);
          io.to(socketUsers[id]).emit(events_list.TEAM_HELP_NEEDED, {
            msg: "Notification sent to friends in group",
            user: userExists,
            notificationType: "TEAM_HELP_NEEDED",
            team_id: team_id,
          });
        }
      });
      // socket.to(socketUsers[user_id]).emit()
      // Send Notification to every member of team where user is member
    } catch (err) {
      console.log(err.message);
      socket.emit(
        events_list.TEAM_HELP_NEEDED,
        err.message ? err.message : err
      );
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

  socket.on(
    events_list.HELP_COMPLETE,
    async ({ requester_id, team_id, helper_id }) => {
      try {
        const requester = await User.findById(requester_id);
        if (!requester) throw { msg: "Requester does not exist" };

        const teamExists = await Team.findById(team_id);
        if (!teamExists) throw { msg: "Team does not exist!" };

        const helper = await User.findById(helper_id);
        if (!helper) throw { msg: "Helper does not exist" };

        const teamHelp = await TeamHelp.findOneAndUpdate(
          {
            $and: [{ requester: requester_id }, { team_selected: team_id }],
          },
          {
            $set: {
              status: "completed",
            },
            $addToSet: {
              helpers: helper_id,
            },
          },
          {
            new: true,
          }
        ).populate("team_selected");

        const filteredUserIds = teamHelp.team_selected.team_members.filter(
          ({ _id }) =>
            _id.toString() != helper_id && _id.toString() != requester_id
        );
        console.log(
          "filteredUserIds=>",
          filteredUserIds.map((item) => {
            return item._id;
          })
        );
        const oneSignalIds = await User.find({
          _id: { $in: filteredUserIds },
        });

        // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER
        sendNotification(
          "Help Completed",
          `${helper.first_name} completed the help for ${requester.first_name}`,
          {
            user: helper,
          },
          oneSignalIds.map((user) => user.one_signal_id)
        );

        filteredUserIds.forEach(({ _id }) => {
          socket.to(socketUsers[_id]).emit(events_list.HELP_COMPLETE, {
            msg: `${helper.first_name} completed the help for ${requester.first_name}`,
            user: helper,
          });
        });

        // SEND NOTIFICATION TO THE REQUESTER THAT THE HELP IS COMING
        sendNotification(
          "Help Canceled",
          `${helper.first_name} Canceled the help for You ${""}`,
          {
            user: helper,
          },
          [requester.one_signal_id]
        );

        socket.to(socketUsers[requester_id]).emit(events_list.HELP_COMPLETE, {
          msg: "Help Completed",
          requester,
          helper,
        });
      } catch (err) {
        console.log(err);
        throw err;
      }
    }
  );
  socket.on(events_list.HELP_CANCEL, async (payload) => {
    console.log("Cancelling the help");
    const { helper_id, requester_id, team_id } = payload;

    try {
      const requester = await User.findById(requester_id);
      if (!requester) throw { msg: "Requester does not exist" };
      // return res.status(404).send("Requester does not exist");

      const helper = await User.findById(helper_id);
      if (!helper) throw { msg: "Helper does not exist" };
      // return res.status(404).send("Helper does not exist");

      const teamExists = await Team.findById(team_id);
      if (!teamExists) throw { msg: "Team does not exist!" };
      // return res.status(404).send("Team does not exist");

      const teamHelp = await TeamHelp.findOneAndUpdate(
        {
          $and: [{ requester: requester_id }, { team_selected: team_id }],
        },
        {
          $set: {
            helper: null,
            status: "pending",
          },
          $addToSet: {
            helpers: helper_id,
            cancelled_by: helper_id,
          },
        },
        {
          new: true,
        }
      ).populate("team_selected");

      socket.to(socketUsers[requester_id]).emit(events_list.HELP_CANCEL, {
        msg: helper.first_name + " Canceled the help. Finding other members",
        user: helper,
      });

      // NOW SEND THE NOTIFICATION TO ALL THE MEMBERS IN THE TEAM

      const filteredUserIds = teamHelp.team_selected.team_members.filter(
        ({ _id }) =>
          _id.toString() != helper_id && _id.toString() != requester_id
      );
      // console.log("filteredUserIds=>", filteredUserIds);
      const oneSignalIds = await User.find({
        _id: { $in: filteredUserIds },
      });

      // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER
      sendNotification(
        "Help Canceled",
        `${helper.first_name} Canceled the help for ${requester.first_name}`,
        {
          user: helper,
        },
        oneSignalIds.map((user) => user.one_signal_id)
      );

      filteredUserIds.forEach(({ _id }) => {
        socket.to(socketUsers[_id]).emit(events_list.HELP_CANCEL, {
          msg: `${helper.first_name} Canceled the help for ${requester.first_name}`,
          user: helper,
        });
      });

      // SEND NOTIFICATION TO THE REQUESTER THAT THE HELP IS COMING
      sendNotification(
        "Help Canceled",
        `${helper.first_name} Canceled the help for You ${""}`,
        {
          user: helper,
        },
        [requester.one_signal_id]
      );
    } catch (err) {
      throw { msg: err.message };
    }
  });

  socket.on(events_list.HELP_GOING, async (payload) => {
    const { helper_id, requester_id, team_id } = payload;

    try {
      const requester = await User.findById(requester_id);
      if (!requester) throw { msg: "Requester does not exist" };
      // return res.status(404).send("Requester does not exist");

      const helper = await User.findById(helper_id);
      if (!helper) throw { msg: "Helper does not exist" };
      // return res.status(404).send("Helper does not exist");

      const teamExists = await Team.findById(team_id);
      if (!teamExists) throw { msg: "Team does not exist!" };
      // return res.status(404).send("Team does not exist");

      const teamHelp = await TeamHelp.findOneAndUpdate(
        {
          $and: [{ requester: requester_id }, { team_selected: team_id }],
        },
        {
          $set: {
            helper: helper_id,
            status: "accepted",
          },
        },
        {
          new: true,
        }
      ).populate("team_selected");
      // console.log(teamHelp.team_selected.team_members, "<===members");

      const filteredUserIds = teamHelp.team_selected.team_members.filter(
        ({ _id }) =>
          _id.toString() != helper_id && _id.toString() != requester_id
      );
      console.log("filteredUserIds=>", filteredUserIds);
      const oneSignalIds = await User.find({
        _id: { $in: filteredUserIds },
      });

      // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER
      sendNotification(
        "Help Going",
        `${helper.first_name} is going to ${requester._id}`,
        {
          user: helper,
        },
        oneSignalIds.map((user) => user.one_signal_id)
      );

      filteredUserIds.forEach(({ _id }) => {
        socket.to(socketUsers[_id]).emit(events_list.HELP_GOING, {
          msg: `${helper.first_name} is going to ${requester.first_name}`,
          user: helper,
        });
      });
      // console.log(filteredUserIds);
      // SEND NOTIFICATION TO THE REQUESTER THAT THE HELP IS COMING
      sendNotification(
        "Help Coming",
        `${helper.first_name} is going to ${requester._id}`,
        {
          user: helper,
        },
        [requester.one_signal_id]
      );

      socket.to(socketUsers[requester_id]).emit(events_list.HELP_COMING, {
        msg: `${helper.first_name} is coming to you`,
        user: helper,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.HELP_GOING, err.message ? err.message : err);
    }
  });

  socket.on(events_list.CANCEL_HELP_REQUEST, async (payload) => {
    // console.log("PAYLOAD =>", payload);
    const { user_id, team_id } = payload;
    try {
      const requester = await User.findById(user_id);
      if (!requester) throw { msg: "Requester does not exist" };
      const cancelledRequest = await TeamHelp.findOneAndUpdate(
        {
          $and: [{ requester: user_id }, { team_selected: team_id }],
        },
        {
          $set: {
            status: "cancelled",
          },
        },
        {
          new: true,
        }
      ).populate("team_selected");

      socket.to(socketUsers[user_id]).emit(events_list.CANCEL_HELP_REQUEST, {
        msg: "Help Request Cancelled",
        request: cancelledRequest,
      });
      // console.log("MEMBERS:<=== ", cancelledRequest.team_selected.team_members.map);
      const filteredUserIds = cancelledRequest.team_selected.team_members.filter(
        ({ _id }) => _id.toString() != user_id
      );
      // console.log("filteredUserIds=>", filteredUserIds);
      const oneSignalIds = await User.find({
        _id: { $in: filteredUserIds },
      });

      // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER
      sendNotification(
        "Help Request cancelled",
        `${requester.first_name} cancelled the help request`,
        {
          user: requester,
        },
        oneSignalIds.map((user) => user.one_signal_id)
      );

      filteredUserIds.forEach(({ _id }) => {
        // console.log("ID =>", _id, "---", socketUsers[_id]);
        socket.to(socketUsers[_id]).emit(events_list.HELP_GOING, {
          msg: `${requester.first_name} cancelled the help request`,
          user: requester,
          cancelledRequest,
        });
      });
    } catch (err) {
      console.log(err);
      socket.emit(
        events_list.CANCEL_HELP_REQUEST,
        err.message ? err.message : err
      );
    }
  });

  socket.on(events_list.FIND_FRIENDS, async (payload) => {
    const { team_id, user_id } = payload;

    try {
      const team = await Team.findById(team_id);

      const teamPhoneNumbers = team.team_members.map((t) => {
        return t.phone;
      });

      let allUsersInTeam = await User.find({
        phone: { $in: teamPhoneNumbers },
      });

      if (!(allUsersInTeam.length > 0)) {
        socket.emit(events_list.FIND_FRIENDS, {
          msg: "No Friends in the group!",
          Friends: [],
        });
      }

      // Filter users and remove the person finding friends
      const filteredUsers = allUsersInTeam.filter(
        (user) => user._id.toString() != user_id
      );

      socket.emit(events_list.FIND_FRIENDS, {
        msg: "Friends in the group!",
        Friends: filteredUsers,
      });
    } catch (err) {
      socket.emit(events_list.FIND_FRIENDS, err.message ? err.message : err);
    }
  });

  socket.on(events_list.UPLOAD_CONTACTS, async (payload) => {
    const { contacts } = payload;
    let phoneNumbers = [];

    try {
      contacts.forEach((item) => {
        phoneNumbers.push(item.phone);
      });

      let friends = await User.find({
        phone: { $in: phoneNumbers },
      });

      if (!(friends.length > 0)) {
        socket.emit(events_list.UPLOAD_CONTACTS, {
          msg: "No Friends in Contact!",
          Friends: [],
        });
      }

      friends.forEach((obj) => {
        contacts.forEach((obj2) => {
          if (
            obj.phone.code === obj2.phone.code &&
            obj.phone.number === obj2.phone.number
          ) {
            obj._doc.contactName = obj2.name;
          }
        });
      });

      // console.log("Friends", friends);

      socket.emit(events_list.UPLOAD_CONTACTS, {
        msg: "Friends in Contacts!",
        Friends: friends,
      });
    } catch (err) {
      socket.emit(events_list.UPLOAD_CONTACTS, err.message ? err.message : err);
    }
  });

  socket.on(events_list.ANONYMOUS_GROUP, async (payload) => {
    const { contacts, user_id } = payload;

    try {
      const anonymousTeam = await Team.findOneAndUpdate(
        {
          team_by: user_id,
          team_type: "anonymous",
          team_name: "anonymous",
        },
        {
          team_members: contacts,
        },
        {
          new: true,
          upsert: true,
        }
      );

      // console.log(anonymousTeam);

      socket.to(socketUsers[user_id]).emit(events_list.ANONYMOUS_GROUP, {
        msg: "Friends in Contacts!",
        Friends: anonymousTeam,
      });
    } catch (err) {
      socket.emit(events_list.ANONYMOUS_GROUP, err.message ? err.message : err);
    }
  });

  socket.on(events_list.GET_ANONYMOUS_GROUP, async (payload) => {
    const { user_id } = payload;
    let phoneNumbers = [];

    try {
      const anonymousTeam = await Team.findOne({
        team_by: user_id,
        team_type: "anonymous",
        team_name: "anonymous",
      }).select("-__v");

      if (!anonymousTeam) {
        socket.emit(events_list.GET_ANONYMOUS_GROUP, {
          msg: "Anonymous Team does not exist",
          Friends: [],
        });
      }

      anonymousTeam.team_members.forEach((item) => {
        phoneNumbers.push(item.phone);
      });

      const friends = await User.find({
        phone: { $in: phoneNumbers },
      });

      // console.log(friends);
      socket.to(socketUsers[user_id]).emit(events_list.GET_ANONYMOUS_GROUP, {
        msg: "Anonymous Team",
        Friends: friends,
      });
    } catch (err) {
      socket.emit(
        events_list.GET_ANONYMOUS_GROUP,
        err.message ? err.message : err
      );
    }
  });

  socket.on(events_list.SET_VEHICLE_LOCATION, async (payload) => {
    const { user_id, vehicle_location } = payload;
    console.log(payload);
    try {
      const vehicleLocation = await Vehicle.findOneAndUpdate(
        {
          user: user_id,
        },
        {
          $set: {
            location: vehicle_location,
          },
        },
        {
          new: true,
          upsert: true,
        }
      ).populate("user");

      socket.emit(events_list.SET_VEHICLE_LOCATION, {
        msg: "Vehicle Location Set",
        vehicle: vehicleLocation,
      });
    } catch (err) {
      socket.emit(
        events_list.SET_VEHICLE_LOCATION,
        err.message ? err.message : err
      );
    }
  });

  socket.on(events_list.GET_VEHICLE_LOCATION, async (payload) => {
    const { user_id } = payload;
    try {
      const vehicleLocation = await Vehicle.findOne({
        user: user_id,
      }).populate("user");
      socket.emit(events_list.GET_VEHICLE_LOCATION, {
        msg: "Vehicle Location",
        vehicle: vehicleLocation,
      });
    } catch (err) {
      socket.emit(
        events_list.GET_VEHICLE_LOCATION,
        err.message ? err.message : err
      );
    }
  });
};

module.exports = { updateLocation, needy, teamMembers };
