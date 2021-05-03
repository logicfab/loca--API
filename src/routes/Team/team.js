const express = require("express");
const getConnectedTest = require("../../../sockets/user");
const Team = require("../../models/Team");
const User = require("../../models/User");
const router = express.Router();

// route /team
// desc Get all Teams
// Method GET
router.get("/:id", async (req, res) => {
  const allTeamsOfaUser = await Team.find({ team_by: req.params.id }).select(
    "-__v"
  );

  if (!allTeamsOfaUser) {
    return res.status(404).send("No teams Exist");
  }

  res.send({ msg: "All teams of a user", data: allTeamsOfaUser });
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

    const response = await team.save();

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
    console.log("BODY=>",req.body);
    const { team_id, team_members , team_by} = req.body;
    let updatedSet = {};
    if (req.body.team_name) {
      updatedSet.team_name = req.body.team_name;
    }
    if (req.body.team_members) {
      updatedSet.team_members = req.body.team_members;
    }
if(team_by)
{updatedSet.team_by=team_by;}
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

module.exports = router;
