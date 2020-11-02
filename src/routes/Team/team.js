const express = require("express");
const getConnectedTest = require("../../../sockets/user");
const Team = require("../../models/Team");
const router = express.Router();

// route /team
// desc Create new Team
// Method POST

router.post("/", async (req, res) => {
  try {
    const { team_by, team_name } = req.body;

    const teamExists = await Team.findOne({ team_by });
    if (teamExists) {
      throw { msg: "User already Has Team!" };
    }

    const team = new Team({
      team_by,
      team_name,
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
    const team = await Team.findById(team_id);
    if (!team) {
      throw { msg: "Team not found!" };
    }

    const response = await Team.findByIdAndUpdate(
      team_id,
      {
        $addToSet: { team_members: { $each: team_members } },
      },
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
    const { team_id, member_id } = req.body;
    let response = await Team.findByIdAndUpdate(
      team_id,
      {
        $pull: { team_members: member_id },
      },
      {
        new: true,
      }
    );

    if (!response) {
      throw { msg: "Unable to remove member!" };
    }
    res.send(response);
  } catch (err) {
    res.send(err.message ? { msg: err.msg } : err);
  }
});

router.post("/test", async (req, res) => {
  getConnectedTest();
  res.send("heheh");
});

module.exports = router;
