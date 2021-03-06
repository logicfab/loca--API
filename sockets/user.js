let geoLib = require("geo-lib");
const geolib = require("geolib");

const { sendNotification } = require("../helpers/oneSignalNotification");
const mongoose = require("mongoose");

const Needy = require("../src/models/Needy");
const Team = require("../src/models/Team");
const TeamHelp = require("../src/models/teamHelp");
const User = require("../src/models/User");
const Vehicle = require("../src/models/vehicle");
const { myFriends } = require("../controllers/FriendController.jS");

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
  GOTO_FIRST_AID: "GOTO_FIRST_AID",
  ERROR: "ERROR",
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

    socket.to(socketUsers[user_id]).emit(events_list.GET_TEAM_MEMBERS, {
      teams,
      notificationType: events_list.GET_TEAM_MEMBERS,
    });
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
        throw { message: "User not Found!" };
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
          message: "Unable to Update Location!",
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
      socket.to(socketUsers[user_id]).emit(events_list.UPDATE_LOCATION, {
        response,
        notificationType: events_list.UPDATE_LOCATION,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      // socket.emit(events_list.UPDATE_LOCATION, err.message ? err.message : err);
    }
  });
};

const needy = (io, socket, socketUsers) => {
  socket.on(events_list.GOTO_FIRST_AID, async (payload) => {
    try {
      const { user_id } = payload;
      const user = await User.findById(user_id);

      if (!user) throw { message: "User does not exist" };

      const needy = await Needy.findOneAndUpdate(
        { user: user_id, status: "unresolved" },
        {
          $unset: {
            assigned_team: 1,
          },
        },
        { new: true, upsert: true }
      );

      if (!needy) throw { message: "An error occurred" };
      // return res.status(404).send("An error occurred");

      const firstAidTeams = await User.find({
        userType: "professional",
        _id: { $ne: user_id },
      }).select("-password");

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
          nearestFirstAidTeams.push(team);
        }
        console.log("TEAMS  : =>>>", nearestFirstAidTeams);
        console.log("ONE SIGNAL: =>>>", oneSignalIdsOfFirstAidTeams);

        socket.emit(events_list.GOTO_FIRST_AID, {
          teams: nearestFirstAidTeams,
        });
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
    }
  });

  socket.on(events_list.FIRST_AID_HELP_NEEDED, async (payload) => {
    try {
      const { user_id } = payload;
      const user = await User.findById(user_id);

      if (!user) throw { message: "User does not exist" };

      const needy = await Needy.findOneAndUpdate(
        { user: user_id, status: "unresolved" },
        {
          $unset: {
            assigned_team: 1,
          },
        },
        { new: true, upsert: true }
      );

      if (!needy) throw { message: "An error occurred" };
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

      console.log("TEAMS  : =>>>", nearestFirstAidTeams);
      console.log("ONE SIGNAL: =>>>", oneSignalIdsOfFirstAidTeams);
      sendNotification(
        "First Aid Help Required",
        `${user.first_name} needs First Aid!`,
        {
          requester: user,
          notificationType: events_list.FIRST_AID_HELP_NEEDED,
          message: `${user.first_name} needs First Aid!`,
        },
        oneSignalIdsOfFirstAidTeams,
        2,
        2
      );

      // Emit to all first aid teams so that they can accept or reject a request
      nearestFirstAidTeams.forEach((id) => {
        socket
          .to(socketUsers[id])
          .emit(`${events_list.FIRST_AID_HELP_NEEDED}`, {
            message: `${user.first_name} needs First Aid!`,
            requester: user,
            user: id,
            notificationType: events_list.FIRST_AID_HELP_NEEDED,
          });
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
    }
  });
  socket.on(events_list.CANCEL_FIRST_AID_HELP_TEAM, async (payload) => {
    try {
      console.log("payload=>", payload);
      const { user_id, helper_id } = payload;
      const user = await User.findById(user_id);
      const helper = await User.findById(helper_id);

      if (!user) throw { message: "User does not exist" };
      // socket
      //   .to(socketUsers[user_id])
      //   .emit(events_list.CANCEL_FIRST_AID_HELP_TEAM, { needy });

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
      console.log("TEAMS  : =>>>", nearestFirstAidTeams);
      console.log("ONE SIGNAL: =>>>", oneSignalIdsOfFirstAidTeams);
      console.log("HELPER =>", helper);
      // console.log(oneSignalIdsOfFirstAidTeams);
      // Send Notification to nearestTeams (send user locaiton and name with it)
      sendNotification(
        helper.first_name + "Cancelled first aid help for you",
        `${helper.first_name} cancelled First Aid help for you`,
        {
          requester: helper,
          user,
          message: `${helper.first_name} cancelled First Aid help for You`,
          notificationType: events_list.CANCEL_FIRST_AID_HELP_TEAM,
        },
        [user.one_signal_id],
        1,
        1
      );

      oneSignalIdsOfFirstAidTeams.length > 0
        ? sendNotification(
            helper.first_name +
              "Cancelled first aid help for " +
              user.first_name,
            `${helper.first_name} cancelled First Aid help for ${user.first_name}`,
            {
              requester: helper,
              user,
              message: `${helper.first_name} cancelled First Aid help for ${user.first_name}`,
              notificationType: events_list.CANCEL_FIRST_AID_HELP_TEAM,
            },
            oneSignalIdsOfFirstAidTeams,
            2,
            2
          )
        : console.log("NO ONE SIGNAL ID FOUND!");

      // Emit to all first aid teams so that they can accept or reject a request
      nearestFirstAidTeams.forEach((id) => {
        console.log("ID <=", id, " SOKCET <=", socketUsers[id]);
        socket
          .to(socketUsers[id])
          .emit(events_list.CANCEL_FIRST_AID_HELP_TEAM, {
            message: `${helper.first_name} cancelled First Aid for ${user.first_name}!`,
            notificationType: events_list.CANCEL_FIRST_AID_HELP_TEAM,
            requester: helper,
            user,
          });
      });
      socket
        .to(socketUsers[user_id])
        .emit(events_list.CANCEL_FIRST_AID_HELP_TEAM, {
          message: `${helper.first_name} cancelled First Aid for You!`,
          notificationType: events_list.CANCEL_FIRST_AID_HELP_TEAM,
          requester: user,
          user: helper,
        });
    } catch (err) {
      // throw err;
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
    }
  });
  socket.on(events_list.CANCEL_FIRST_AID_HELP_REQUEST, async (payload) => {
    try {
      const { user_id } = payload;
      const user = await User.findById(user_id);

      if (!user) throw { message: "User does not exist" };
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
      console.log("TEAMS  : =>>>", nearestFirstAidTeams);
      console.log("ONE SIGNAL: =>>>", oneSignalIdsOfFirstAidTeams);
      // console.log(oneSignalIdsOfFirstAidTeams);
      // Send Notification to nearestTeams (send user locaiton and name with it)
      oneSignalIdsOfFirstAidTeams.length > 0
        ? sendNotification(
            "First Aid Help Cancelled",
            `${user.first_name} cancelled First Aid!`,
            {
              requester: user,
              message: `${user.first_name} cancelled First Aid!`,
              notificationType: events_list.CANCEL_FIRST_AID_HELP_REQUEST,
            },
            oneSignalIdsOfFirstAidTeams,
            2,
            2
          )
        : console.log("NO ONE SIGNAL ID FOUND !!!");

      // Emit to all first aid teams so that they can accept or reject a request
      nearestFirstAidTeams.forEach((id) => {
        console.log("ID <=", id, " SOKCET <=", socketUsers[id]);
        socket
          .to(socketUsers[id])
          .emit(events_list.CANCEL_FIRST_AID_HELP_REQUEST, {
            message: `${user.first_name} cancelled First Aid!`,
            requester: user,
            user: id,
            notificationType: events_list.CANCEL_FIRST_AID_HELP_REQUEST,
          });
      });
      // socket
      //   .to(socketUsers[user_id])
      //   .emit(events_list.CANCEL_FIRST_AID_HELP_REQUEST, {
      //     needy,
      //     requester: user,
      //     message: `${user.first_name} cancelled First Aid!`,
      //     notificationType: events_list.CANCEL_FIRST_AID_HELP_REQUEST,
      //   });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      throw err;
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
      if (!needy) throw { message: "Help does not exist" };
      // return res.status(404).send("Help does not exist");

      const user = await User.findById(user_id);
      if (!user) throw { message: "User not Found!" };
      //  res.status(404).send("User not found");

      const helper = await User.findById(helper_id);
      if (!helper) throw { message: "Helper not Found!" };
      // res.status(404).send("Helper not found");
      // ACCEPT_FIRST_AID_HELP
      console.log("User", user);
      if (user.one_signal_id) {
        sendNotification(
          "First Aid is coming",
          `First Aid is on its way!`,
          {
            team: helper,
            notificationType: events_list.ACCEPT_FIRST_AID_HELP,
          },
          [user.one_signal_id],
          "",
          1
        );
      }
      const firstAidTeams = await User.find({
        _id: { $ne: helper_id },
        userType: "professional",
      });
      // console.log("<-TEAMS FIRST AID->", firstAidTeams);
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

      console.log("TEAMS  : =>>>", nearestFirstAidTeams);
      console.log("ONE SIGNAL: =>>>", oneSignalIdsOfFirstAidTeams);
      // console.log(oneSignalIdsOfFirstAidTeams);
      // Send Notification to nearestTeams (send user locaiton and name with it)
      oneSignalIdsOfFirstAidTeams.length > 0
        ? sendNotification(
            "First Aid Help for " + user.first_name + " is on the way ",
            `${helper.first_name} going to ${user.first_name} for First Aid!`,
            {
              requester: helper,
              message: `${helper.first_name} going to ${user.first_name} for First Aid!`,
              user,
              restFriends: true,
              notificationType: events_list.ACCEPT_FIRST_AID_HELP,
            },
            oneSignalIdsOfFirstAidTeams,
            2,
            2
          )
        : console.log("NO FIRST AID TEAM FOUND");

      // Emit to all first aid teams so that they can accept or reject a request
      nearestFirstAidTeams.forEach((id) => {
        socket
          .to(socketUsers[id])
          .emit(`${events_list.ACCEPT_FIRST_AID_HELP}`, {
            message: `${helper.first_name} going to ${user.first_name} for First Aid!`,
            user,
            notificationType: events_list.ACCEPT_FIRST_AID_HELP,
            restFriends: true,
            requester: helper,
          });
      });

      socket.to(socketUsers[user_id]).emit(events_list.ACCEPT_FIRST_AID_HELP, {
        message: "First Aid Is Coming",
        user,
        requester: helper,
        notificationType: events_list.ACCEPT_FIRST_AID_HELP,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      // socket.emit(
      //   events_list.ACCEPT_FIRST_AID_HELP,
      //   err.message ? err.message : err
      // );
    }
  });

  socket.on(events_list.GET_NEEDY, async (payload) => {
    const { skip, limit } = payload;
    const needies = await Needy.find({ status: "unresolved" })
      .sort({ updatedAt: "-1" })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    socket.emit(events_list.GET_NEEDY, needies);
    console.log("needy!");
  });

  socket.on(events_list.TEAM_HELP_NEEDED, async (payload) => {
    const { user_id, team_id, needHelp } = payload;
    // user_id is for the person requesting help
    // console.log(socketUsers[user_id]);
    try {
      const userExists = await User.findById(user_id);
      if (!userExists) {
        throw { message: "User does not exist!" };
        // res.status(404).send({ message: "User does not exist!" });
      }

      const team = await Team.findById(team_id);
      if (!team) {
        throw { message: "Team does not exist" };
        // return res.status(404).send({ message: "Team does not exist!" });
      }
      team.team_members = team.team_members.filter(
        (member) => member.connected && member.visibility
      );
      const teamPhoneNumbers = team.team_members.map((t) => {
        return t.phone;
      });

      let allUsersInTeam = await User.find({
        phone: { $in: teamPhoneNumbers },
      });

      // console.log("All users in team", allUsersInTeam);
      const userIds = allUsersInTeam.map((user) => {
        return user._id;
      });

      // filter the user ids so it does not contain the user id of help requester
      const filteredUserIds = userIds.filter((id) => id.toString() != user_id);

      // Querying DB for one signal IDs of fitered users
      let oneSignalIds = await User.find({
        _id: { $in: filteredUserIds },
      }).select("one_signal_id");

      oneSignalIds = oneSignalIds.map((user) => {
        return user.one_signal_id;
      });
      console.log("filteredUserIds ------->", filteredUserIds);
      console.log("oneSignalIds ------->", oneSignalIds);

      // Send Notification to every member of team except help requester with user object
      sendNotification(
        "Help Needed",
        `${userExists.first_name} needs you!`,
        {
          requester: userExists,
          message: `${userExists.first_name} needs you!`,
          notificationType: events_list.TEAM_HELP_NEEDED,
          team_id: team_id,
        },
        oneSignalIds,
        "",
        1
      );

      filteredUserIds.forEach((id) => {
        // console.log("SOKCET USER ID==<<<", id);
        // console.log("SOKCET USER ID ", socketUsers[id]);
        if (socketUsers[id]) {
          console.log(id, ":", socketUsers[id]);
          io.to(socketUsers[id]).emit(events_list.TEAM_HELP_NEEDED, {
            message: `${userExists.first_name} needs you!`,
            requester: userExists,
            notificationType: "TEAM_HELP_NEEDED",
            team_id: team_id,
            user: id,
          });
        }
      });
      // socket.to(socketUsers[user_id]).emit()
      // Send Notification to every member of team where user is member
    } catch (err) {
      console.log("ERROR IN TEAM_HELP_NEEDED", err);
      socket.emit(events_list.ERROR, { error: err.message });
      // socket.emit(
      //   events_list.TEAM_HELP_NEEDED,
      //   err.message ? err.message : err
      // );
    }
  });
  socket.on(
    events_list.HELP_COMPLETE,
    async ({ requester_id, team_id, helper_id }) => {
      try {
        const requester = await User.findById(requester_id);
        if (!requester) throw { message: "Requester does not exist" };

        const teamExists = await Team.findById(team_id);
        if (!teamExists) throw { message: "Team does not exist!" };

        const helper = await User.findById(helper_id);
        if (!helper) throw { message: "Helper does not exist" };

        const teamPhoneNumbers = teamExists.team_members.map((t) => {
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
        const filteredUserIds = userIds.filter(
          (id) => id.toString() != helper_id && id.toString() != requester_id
        );
        // ););
        console.log("filteredUserIds ------->", filteredUserIds);

        // Querying DB for one signal IDs of fitered users
        let oneSignalIds = await User.find({
          _id: { $in: filteredUserIds },
        }).select("one_signal_id");

        oneSignalIds = oneSignalIds.map((user) => {
          return user.one_signal_id;
        });

        console.log("oneSignalIds ------->", oneSignalIds);

        // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER
        sendNotification(
          "Help Completed",
          `${helper.first_name} completed the help for ${requester.first_name}`,
          {
            user: helper,
            notificationType: events_list.HELP_COMPLETE,
          },
          oneSignalIds,
          2,
          2
        );

        filteredUserIds.forEach(({ _id }) => {
          socket.to(socketUsers[_id]).emit(events_list.HELP_COMPLETE, {
            message: `${helper.first_name} completed the help for ${requester.first_name}`,
            user: helper,
            // requester_id, team_id, helper_id
            notificationType: events_list.HELP_COMPLETE,
            requester,
            team_id,
          });
        });

        // SEND NOTIFICATION TO THE REQUESTER THAT THE HELP IS COMING
        sendNotification(
          "Help Canceled",
          `${helper.first_name} Canceled the help for You ${""}`,
          {
            notificationType: events_list.HELP_COMPLETE,
            user: helper,
            notificationType: events_list.HELP_COMPLETE,
            requester,
            team_id,
          },
          [requester.one_signal_id],
          1,
          1
        );

        socket.to(socketUsers[requester_id]).emit(events_list.HELP_COMPLETE, {
          message: "Help Completed",
          requester: requester,
          notificationType: events_list.HELP_COMPLETE,
          user: helper_id,
        });
      } catch (err) {
        console.log(err);
        socket.emit(events_list.ERROR, { error: err.message });
        throw err;
      }
    }
  );
  socket.on(events_list.HELP_GOING, async (payload) => {
    // console.log("payload=>", payload);
    const { helper_id, requester_id, team_id } = payload;

    try {
      const requester = await User.findById(requester_id);
      if (!requester) throw { message: "Requester does not exist" };
      // return res.status(404).send("Requester does not exist");

      const helper = await User.findById(helper_id);
      if (!helper) throw { message: "Helper does not exist" };
      // return res.status(404).send("Helper does not exist");

      const teamExists = await Team.findById(team_id);
      if (!teamExists) throw { message: "Team does not exist!" };
      // return res.status(404).send("Team does not exist");

      teamExists.team_members = teamExists.team_members.filter(
        (member) => member.connected && member.visibility
      );
      const teamPhoneNumbers = teamExists.team_members.map((t) => {
        return t.phone;
      });

      let allUsersInTeam = await User.find({
        phone: { $in: teamPhoneNumbers },
      });

      console.log(
        "All users in team",
        allUsersInTeam.map((item) => item._id)
      );
      const userIds = allUsersInTeam.map((user) => {
        return user._id;
      });

      // filter the user ids so it does not contain the user id of help requester
      const filteredUserIds = userIds.filter(
        (id) => id.toString() != helper_id && id.toString() != requester_id
      );
      // ););

      // Querying DB for one signal IDs of fitered users
      let oneSignalIds = await User.find({
        _id: { $in: filteredUserIds },
      }).select("one_signal_id");

      oneSignalIds = oneSignalIds.map((user) => {
        return user.one_signal_id;
      });

      console.log("oneSignalIds ------->", oneSignalIds);
      console.log("filteredUserIds ------->", filteredUserIds);

      sendNotification(
        "Help Going",
        `${helper.first_name} is going to ${requester.first_name}`,
        {
          user: requester_id,
          notificationType: events_list.HELP_GOING,
          requester: helper,
          restFriends: true,
          team_id,
          message: `${helper.first_name} is going to ${requester._id}`,
        },
        oneSignalIds,
        1,
        1
      );
      // console.log("OTHER", usersOneSignalIds);

      filteredUserIds.forEach(({ _id }) => {
        socket.to(socketUsers[_id]).emit(events_list.HELP_GOING, {
          message: `${helper.first_name} is going to ${requester.first_name}`,
          user: requester_id,
          restFriends: true,
          team_id,
          notificationType: events_list.HELP_GOING,
          requester: helper,
        });
      });
      // console.log(filteredUserIds);
      // SEND NOTIFICATION TO THE REQUESTER THAT THE HELP IS COMING
      sendNotification(
        "Help Coming",
        `${helper.first_name} is coming to you`,
        {
          user: requester_id,
          notificationType: events_list.HELP_GOING,
          requester: helper,
          team_id,
          message: `${helper.first_name} is coming to you`,
        },
        [requester.one_signal_id],
        1,
        1
      );
      console.log("REQUESTER ID==>>> ", socketUsers[requester_id]);
      socket.to(socketUsers[requester_id]).emit(events_list.HELP_GOING, {
        message: `${helper.first_name} is coming to you`,
        user: requester_id,
        notificationType: events_list.HELP_GOING,
        team_id,
        requester: helper,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      // socket.emit(events_list.HELP_GOING, err.message ? err.message : err);
    }
  });
  socket.on(events_list.HELP_CANCEL, async (payload) => {
    console.log("Cancelling the help");
    const { helper_id, requester_id, team_id } = payload;

    try {
      const requester = await User.findById(requester_id);
      if (!requester) throw { message: "Requester does not exist" };
      // return res.status(404).send("Requester does not exist");

      const helper = await User.findById(helper_id);
      if (!helper) throw { message: "Helper does not exist" };
      // return res.status(404).send("Helper does not exist");

      const teamExists = await Team.findById(team_id);
      if (!teamExists) throw { message: "Team does not exist!" };
      // return res.status(404).send("Team does not exist");

      socket.to(socketUsers[requester_id]).emit(events_list.HELP_CANCEL, {
        message: helper.first_name + " Canceled the help. Find other members",
        notificationType: events_list.HELP_CANCEL,
        user: requester_id,
        requester: helper,
      });

      // NOW SEND THE NOTIFICATION TO ALL THE MEMBERS IN THE TEAM

      // const filteredUserIds = teamHelp.team_selected.team_members.filter(
      //   ({ _id }) =>
      //     _id.toString() != helper_id && _id.toString() != requester_id
      // );
      // // console.log("filteredUserIds=>", filteredUserIds);
      // const oneSignalIds = await User.find({
      //   _id: { $in: filteredUserIds },
      // });
      teamExists.team_members = teamExists.team_members.filter(
        (member) => member.connected && member.visibility
      );

      const teamPhoneNumbers = teamExists.team_members.map((t) => {
        return t.phone;
      });

      let allUsersInTeam = await User.find({
        phone: { $in: teamPhoneNumbers },
      });

      console.log(
        "All users in team",
        allUsersInTeam.map((user) => user._id)
      );
      const userIds = allUsersInTeam.map((user) => {
        return user._id;
      });

      // filter the user ids so it does not contain the user id of help requester
      const filteredUserIds = userIds.filter(
        (id) => id.toString() != helper_id && id.toString() != requester_id
      );

      // Querying DB for one signal IDs of fitered users
      let oneSignalIds = await User.find({
        _id: { $in: filteredUserIds },
      }).select("one_signal_id");

      oneSignalIds = oneSignalIds.map((user) => {
        return user.one_signal_id;
      });

      console.log("oneSignalIds ------->", oneSignalIds);
      console.log("filteredUserIds ------->", filteredUserIds);

      // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER
      sendNotification(
        "Help Canceled",
        `${helper.first_name} Canceled the help for ${requester.first_name}`,
        {
          message: `${helper.first_name} Canceled the help for ${requester.first_name}`,
          user: requester_id,
          requester: helper,
          notificationType: events_list.HELP_CANCEL,
        },
        oneSignalIds,
        1,
        1
        // oneSignalIds.map((user) => user.one_signal_id)
      );

      filteredUserIds.forEach(({ _id }) => {
        socket.to(socketUsers[_id]).emit(events_list.HELP_CANCEL, {
          message: `${helper.first_name} Canceled the help for ${requester.first_name}`,
          notificationType: events_list.HELP_CANCEL,
          user: requester_id,
          requester: helper,
        });
      });

      // SEND NOTIFICATION TO THE REQUESTER THAT THE HELP IS COMING
      sendNotification(
        "Help Canceled",
        `${helper.first_name} Canceled the help for You ${""}`,
        {
          message: `${helper.first_name} Canceled the help for You ${""}`,
          user: requester_id,
          requester: helper,
          notificationType: events_list.HELP_CANCEL,
        },
        [requester.one_signal_id],
        1,
        1
      );
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      throw { message: err.message };
    }
  });
  socket.on(events_list.CANCEL_HELP_REQUEST, async (payload) => {
    console.log("PAYLOAD =>", payload);
    const { user_id, team_id } = payload;
    try {
      const requester = await User.findById(user_id);
      if (!requester) throw { message: "Requester does not exist" };
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
      )
        .populate("team_selected")
        .exec();

      // socket.to(socketUsers[user_id]).emit(events_list.CANCEL_HELP_REQUEST, {
      //   message: "Help Request Cancelled",
      //   request: cancelledRequest,
      //   notificationType: events_list.CANCEL_HELP_REQUEST,
      //   requester: requester,
      //   team_id,
      // });

      cancelledRequest.team_selected.team_members =
        cancelledRequest.team_selected.team_members.filter(
          (member) => member.connected && member.visibility
        );

      const filteredPhoneNumbers =
        cancelledRequest.team_selected.team_members.map((item) => {
          return item.phone;
        });
      // console.log(filteredPhoneNumbers, "--> filt");

      const oneSignalIds = await User.find({
        phone: { $in: filteredPhoneNumbers },
      });

      // console.log(
      //   "ONE SIGNAL=<>=",
      //   oneSignalIds.map((user) => user._id)
      // );
      // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER

      const usersOneSignalIds = oneSignalIds
        .filter((a) => a._id !== user_id)
        .map((user) => user.one_signal_id);
      // console.log(",,,,,", usersOneSignalIds, ",,,,,");
      // SEND NOTIFICATION TO ALL THE USERS IN THE filteredUserIds ARRAY HERE THAT #WHO IS GOING TO HELP REQUESTER

      sendNotification(
        "Help Request cancelled",
        `${requester.first_name} cancelled the help request`,
        {
          requester,
          message: `${requester.first_name} cancelled the help request`,
          notificationType: events_list.CANCEL_HELP_REQUEST,
          team_id,
        },
        usersOneSignalIds,
        1,
        1
      );

      oneSignalIds.forEach(({ _id }) => {
        console.log("ID =>", _id, "---", socketUsers[_id]);
        socket.to(socketUsers[_id]).emit(events_list.CANCEL_HELP_REQUEST, {
          message: `${requester.first_name} cancelled the help request`,
          notificationType: events_list.CANCEL_HELP_REQUEST,
          requester,
          team_id,
        });
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
    }
  });
  socket.on(events_list.FIND_FRIENDS, async (payload) => {
    const { team_id, user_id, userLocation } = payload;
    console.log({ userLocation });
    try {
      const requester = await User.findById(user_id).select("-password");

      const allUsersInTeam = await Team.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(team_id) } },
        {
          $lookup: {
            from: "users",
            let: { member: "$team_members" },
            pipeline: [
              {
                $match: {
                  $expr: { $and: [{ $in: ["$phone", "$$member.phone"] }] },
                },
              },
              { $project: { password: 0 } },
            ],
            as: "team_members",
          },
        },
        { $project: { team_members: 1 } },
      ]);

      if (allUsersInTeam[0].team_members.length === 0) {
        socket.emit(events_list.FIND_FRIENDS, {
          message: "No Friends in the group!",
          Friends: [],
        });
      }

      const { nearestFriends } = await myFriends(requester);

      let members = [...allUsersInTeam[0].team_members, ...nearestFriends];

      const userSortedDistances = geolib.orderByDistance(
        userLocation,
        members
          .filter(
            (item, index) =>
              members.findIndex((_item) => item._id == _item._id) === index
          )
          .map((user) => {
            return {
              latitude: user.location.lat,
              longitude: user.location.lng,
              user,
            };
          })
      );

      socket.emit(events_list.FIND_FRIENDS, {
        message: "Friends in the group!",
        Friends: userSortedDistances.map(({ user }) => user),
        notificationType: events_list.FIND_FRIENDS,
        requester,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
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
          message: "No Friends in Contact!",
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
        message: "Friends in Contacts!",
        Friends: friends,
        notificationType: events_list.UPLOAD_CONTACTS,
        // requester: user_id,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      // socket.emit(events_list.UPLOAD_CONTACTS, err.message ? err.message : err);
    }
  });
  socket.on(events_list.ANONYMOUS_GROUP, async (payload) => {
    const { contacts, user_id } = payload;
    try {
      const anonymousTeam = await Team.findOneAndUpdate(
        { team_by: user_id, team_type: "anonymous", team_name: "anonymous" },
        { team_members: contacts },
        { new: true, upsert: true }
      );

      // console.log(anonymousTeam);

      socket.to(socketUsers[user_id]).emit(events_list.ANONYMOUS_GROUP, {
        message: "Friends in Contacts!",
        Friends: anonymousTeam,
        notificationType: events_list.ANONYMOUS_GROUP,
        requester: user_id,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      // socket.emit(events_list.ANONYMOUS_GROUP, err.message ? err.message : err);
    }
  });
  socket.on(events_list.GET_ANONYMOUS_GROUP, async (payload) => {
    try {
      const { user_id } = payload;
      const user = await User.findById(user_id);
      const { friends } = await myFriends(user);

      socket.emit(events_list.GET_ANONYMOUS_GROUP, {
        message: "Anonymous Team",
        Friends: friends,
        notificationType: "GET_ANONYMOUS_GROUP",
        requester: user_id,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
    }
  });
  socket.on(events_list.SET_VEHICLE_LOCATION, async (payload) => {
    const { user_id, vehicle_location } = payload;
    console.log(payload);
    try {
      // const
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
        message: "Vehicle Location Set",
        vehicle: vehicleLocation,
        requester: user,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      // socket.emit(
      //   events_list.SET_VEHICLE_LOCATION,
      //   err.message ? err.message : err
      // );
    }
  });
  socket.on(events_list.GET_VEHICLE_LOCATION, async (payload) => {
    const { user_id } = payload;
    try {
      const vehicleLocation = await Vehicle.findOne({
        user: user_id,
      }).populate("user");
      socket.emit(events_list.GET_VEHICLE_LOCATION, {
        message: "Vehicle Location",
        vehicle: vehicleLocation,
        notificationType: events_list.GET_VEHICLE_LOCATION,
        requester: user_id,
      });
    } catch (err) {
      console.log(err);
      socket.emit(events_list.ERROR, { error: err.message });
      // socket.emit(
      //   events_list.GET_VEHICLE_LOCATION,
      //   err.message ? err.message : err
      // );
    }
  });
};

// FRINDS HELP NEEDED
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
module.exports = { updateLocation, needy, teamMembers };
