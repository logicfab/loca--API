const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
var CryptoJS = require("crypto-js");
const config = require("config");

const Team = require("../../models/Team");
const User = require("../../models/User");
const { CronJob } = require("../../models/CronJob");
const Auth = require("../../../middlewares/Auth");
const { Invite } = require("../../models/Invite");
const schedule = require("node-schedule");

// route /team
// desc Get all Teams
// Method GET
router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  const allTeamsOfaUser = await Team.aggregate([
    {
      $match: {
        $or: [
          { team_by: mongoose.Types.ObjectId(req.params.id) },
          { team_members: { phone: user.phone } },
        ],
      },
    },
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
          {
            $project: {
              _id: 1,
              location: 1,
              i_need_help: 1,
              detection_radius: 1,
              is_online: 1,
              phone: 1,
              date_of_birth: 1,
              email: 1,
              first_name: 1,
              gender: 1,
              imgUrl: 1,
              last_name: 1,
              userType: 1,
              one_signal_id: 1,
            },
          },
        ],
        as: "team_members",
      },
    },
    {
      $lookup: {
        from: "users",
        let: { teamby: "$team_by" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$_id", "$$teamby"] }] } } },
          {
            $project: {
              _id: 1,
              location: 1,
              i_need_help: 1,
              detection_radius: 1,
              is_online: 1,
              phone: 1,
              date_of_birth: 1,
              email: 1,
              first_name: 1,
              gender: 1,
              imgUrl: 1,
              last_name: 1,
              userType: 1,
              one_signal_id: 1,
            },
          },
        ],
        as: "team_by",
      },
    },
    { $unwind: { path: "$team_by", preserveNullAndEmptyArrays: true } },
  ]);

  if (!allTeamsOfaUser.length) {
    return res.status(404).send({ msg: "No teams Exist" });
  }

  res.send({
    total: allTeamsOfaUser.length,
    msg: "All teams of a user",
    data: allTeamsOfaUser,
  });
});

// route /team
// desc Create new Team
// Method POST

router.post("/", async (req, res) => {
  try {
    const { team_by, team_name } = req.body;

    const userExists = await User.findById(team_by);
    if (!userExists) {
      return res.status(404).send("User does not exist!");
    }

    const teamExists = await Team.findOne().and([
      { team_by },
      { team_name: team_name.toLowerCase() },
    ]);
    console.log(teamExists);

    if (teamExists) {
      return res.status(400).send("Team with the same name already exists");
    }

    const userPhone = {
      phone: userExists.phone,
    };

    const team = new Team({
      team_by,
      team_name,
      team_members: [userPhone],
    });

    const link =
      config.get("host") +
      "/group/" +
      CryptoJS.AES.encrypt(
        team._id.toString(),
        config.get("secretKey")
      ).toString();

    console.log("link :>> ", link);
    await team.save();

    const response = await Team.findByIdAndUpdate(
      team._id,
      { $set: { link } },
      { new: true }
    );

    res.send(response);
  } catch (err) {
    res.send(err.message ? { msg: err.msg } : err);
  }
});

// route /team/addmembers
// desc Add team Members
// Method POST

router.post("/addmembers", async (req, res) => {
  try {
    const { team_id, team_members } = req.body;
    console.log(team_members);

    const team = await Team.findById(team_id);
    if (!team) {
      return res.status(404).send("Team not found!");
    }

    const response = await Team.findByIdAndUpdate(
      team_id,
      { $addToSet: { team_members } },
      {
        new: true,
      }
    );
    if (!response) {
      throw { msg: "Unable to Add Members!" };
    }
    res.send(response);
  } catch (err) {
    res.send(err.message ? { msg: err.msg } : err);
  }
});

// route /team/removemember
// desc Remove team Members
// Method POST

router.post("/removemember", async (req, res) => {
  try {
    const { team_id, team_member } = req.body;
    console.log(team_member, "----", team_id);

    let response = await Team.findByIdAndUpdate(
      team_id,
      {
        $pull: { team_members: team_member },
      },
      {
        new: true,
      }
    );
    console.log(response);
    if (!response) {
      throw { msg: "Unable to remove member!" };
    }
    res.send(response);
  } catch (err) {
    res.send(err.message ? { msg: err.msg } : err);
  }
});

// route /team/updateTeam
// desc Update Existing Team
// Method PATCH

router.patch("/updateTeam", async (req, res) => {
  try {
    console.log("BODY=>", req.body);
    const { team_id, team_members, team_by } = req.body;
    let updatedSet = {};
    if (req.body.team_name) {
      updatedSet.team_name = req.body.team_name;
    }
    if (req.body.team_members) {
      updatedSet.team_members = req.body.team_members;
    }
    if (team_by) {
      updatedSet.team_by = team_by;
    }
    const teamFound = await Team.findById(team_id);

    if (!teamFound) {
      return res.status(400).send({ msg: "Team not available!" });
    }

    await Team.findByIdAndUpdate(team_id, { $unset: { team_members: "" } });

    const response = await Team.findByIdAndUpdate(
      team_id,
      {
        $set: { updatedSet },
        $push: { team_members: req.body.team_members },
      },
      {
        new: true,
      }
    );
    console.log("(response)", response.team_members.length);
    if (!response) {
      return res.status(400).send({ msg: "Team not added!" });
    }

    res.send(response);
  } catch (err) {
    console.log(err);
    res.send(err.message ? { msg: err.msg } : err);
  }
});
router.post("/add-me-link", Auth, async (req, res) => {
  try {
    const { link } = req.body;
    const { phone } = req.user;

    const encryptedId = link.split("/group/");

    const _link = CryptoJS.AES.decrypt(encryptedId[1], config.get("secretKey"));
    var _id = _link.toString(CryptoJS.enc.Utf8);

    const alreadyAMember = await Team.findOne({
      $and: [{ _id }, { "team_members.phone": phone }],
    });

    if (!alreadyAMember) {
      const newTeam = await Team.findByIdAndUpdate(
        _id,
        { $push: { team_members: { phone } } },
        { new: true }
      );

      return res.send({
        msg: "You're now connected to the group " + newTeam.team_name,
      });
    } else {
      return res.send({
        msg: "You're already in the group " + alreadyAMember.team_name,
      });
    }
  } catch (error) {
    console.log({ error });
    res.status(500).send({ msg: error.message });
  }
});
router.post("/toggle-visibility", Auth, async (req, res) => {
  try {
    const { team_id, visible } = req.body;
    const { phone } = req.user;

    await Team.findByIdAndUpdate(
      team_id,
      {
        $set: { "team_members.$[member].visibility": visible },
      },
      { arrayFilters: [{ "member.phone": phone }], new: true }
    );
    const status = !visible ? " Off" : "On";

    res.send({ msg: "Your visibility has been set to " + status });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.post("/leave-group", Auth, async (req, res, next) => {
  try {
    const { team_id } = req.body;
    const { phone } = req.user;

    await Team.updateOne(
      { _id: team_id },
      { $pull: { team_members: { phone } } },
      { new: true }
    );
    res.send({ msg: "You've successfully left the group" });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.post("/send-invite", Auth, async (req, res) => {
  const { phones, team_id } = req.body;

  const users = await User.find({ phone: { $in: phones } });

  const invites = await Promise.all(
    users.map(async (user) => {
      const invite = new Invite({
        _type: "GROUP",
        team_id: team_id,
        invite_by: req.user._id,
        invite_to: user._id,
      });
      return await invite.save();
    })
  );
  res.send({ msg: "Group invites sent" });
});
router.post("/accept-invite", Auth, async (req, res) => {
  const { invite_id } = req.body;
  const { phone, connection_time } = req.user;
  console.log(req.user);
  const invite = await Invite.findByIdAndUpdate(
    invite_id,
    { $set: { status: "Accepted" } },
    { new: true }
  );

  const alreadyAMember = await Team.findOne({
    $and: [{ _id: invite.team_id }, { "team_members.phone": phone }],
  });

  if (!alreadyAMember) {
    // :TODO: Handle Cron Jobs

    const _team = await Team.findByIdAndUpdate(
      invite.team_id,
      {
        $push: { team_members: { phone } },
      },
      { new: true }
    );
    console.log("Joined....");
  } else {
    // :TODO: Handle Cron Jobs
    const _team = await Team.findByIdAndUpdate(
      invite.team_id,
      { $set: { "team_members.$[member].connected": true } },
      { arrayFilters: [{ "member.phone": phone }], new: true }
    );
    console.log("Connected...");
  }

  const ended_at = new Date();
  ended_at.setHours(ended_at.getHours() + connection_time.hours);
  ended_at.setMinutes(ended_at.getMinutes() + connection_time.minutes);

  const job = new CronJob({
    id: invite_id,
    ended_at,
    type: "GROUP",
    _group: { team_id: alreadyAMember._id, phone, invite_id },
  });

  await job.save();

  console.log(ended_at);

  schedule.scheduleJob(
    invite_id,
    ended_at,
    function (team_id, phone, invite_id) {
      console.log("RUNNING JOB GROUP");
      Team.findByIdAndUpdate(
        team_id,
        { $set: { "team_members.$[member].connected": false } },
        { arrayFilters: [{ "member.phone": phone }], new: true }
      )
        .then((result) => console.log("DISCONNECTED"))
        .catch((err) => console.log(err));
      CronJob.findOneAndRemove({ id: invite_id })
        .then((result) => console.log("JOB DELETED"))
        .catch((err) => console.log(err));
    }.bind(null, invite.team_id, phone, invite_id)
  );

  res.send({
    msg: `You're now connected with group ${alreadyAMember.team_name} .`,
  });
});
router.post("/toggle-connect", Auth, async (req, res, next) => {
  const { team_id } = req.body;
  const { phone, connection_time } = req.user;

  const connected = await Team.findOne({
    $and: [
      { _id: team_id },
      { team_members: { $elemMatch: { phone, connected: true } } },
    ],
  });

  const team = await Team.findByIdAndUpdate(
    team_id,
    connected
      ? { $set: { "team_members.$[member].connected": false } }
      : { $set: { "team_members.$[member].connected": true } },
    { new: true, arrayFilters: [{ "member.phone": phone }] }
  );

  if (!connected) {
    try {
      schedule.scheduledJobs[team._id.toString()].cancel();
      console.log("<JOB DELETED>");
    } catch (error) {
      console.log("<JOB NOT FOUND>");
    }

    const ended_at = new Date();
    ended_at.setHours(ended_at.getHours() + connection_time.hours);
    ended_at.setMinutes(ended_at.getMinutes() + connection_time.minutes);

    const job = new CronJob({
      id: team._id,
      ended_at,
      type: "GROUP",
      _group: { team_id: team._id, phone, invite_id: null },
    });

    await job.save();

    console.log(ended_at);

    schedule.scheduleJob(
      team._id.toString(),
      ended_at,
      function (team_id, phone) {
        console.log("RUNNING JOB GROUP");
        Team.findByIdAndUpdate(
          team_id,
          { $set: { "team_members.$[member].connected": false } },
          { arrayFilters: [{ "member.phone": phone }], new: true }
        )
          .then((result) => console.log("DISCONNECTED"))
          .catch((err) => console.log(err));
        CronJob.findOneAndRemove({ id: team_id })
          .then((result) => console.log("JOB DELETED"))
          .catch((err) => console.log(err));
      }.bind(null, team._id, phone)
    );
  }
  const visibility = connected ? "Disconnected" : "connected";
  return res.send({
    msg: "You're " + visibility + " with group " + team.team_name,
  });
});
router.post("/remove-member", Auth, async (req, res) => {
  const { team_id, phone } = req.body;

  const team = await Team.findByIdAndUpdate(
    team_id,
    { $pull: { team_members: { phone } } },
    { new: true }
  );
  res.send({ msg: "Member removed" });
});

module.exports = router;
