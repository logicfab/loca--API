const express = require("express");
const getConnectedTest = require("../../../sockets/user");
const Team = require("../../models/Team");
const User = require("../../models/User");
const router = express.Router();

// route /team
// desc Create new Team
// Method POST

/**
 * @swagger
 * /team:
 *  post:
 *    tags:
 *      - USER
 *    description: Create new Team
  *    parameters:
 *      - name: team_by
 *        in: formData
 *        required: true
 *        type: string
 *        description: team_by
 *      - name: team_name
 *        in: formData
 *        required: true
 *        type: string
 *        description: team_name

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: Team
 *      400:
 *       description: Error
 */

router.post("/", async (req, res) => {
  try {
    const { team_by, team_name } = req.body;

    const userExists = await User.findById(team_by);
    if (!userExists) {
      throw { msg: "User does not exist!" };
    }

    const teamExists = await Team.findOne({ team_by });
    if (teamExists) {
      await Team.findByIdAndRemove(teamExists._id);
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

/**
 * @swagger
 * /team/addmembers:
 *  post:
 *    tags:
 *      - USER
 *    description: Add Members
  *    parameters:
 *      - name: team_id
 *        in: formData
 *        required: true
 *        type: string
 *        description: team_id
 *      - name: team_members
 *        in: formData
 *        required: true
 *        type: string
 *        description: team_members

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: Team
 *      400:
 *       description: Error
 */

router.post("/addmembers", async (req, res) => {
  try {
    const { team_id, team_members } = req.body;
    console.log(team_members);

    const team = await Team.findById(team_id);
    if (!team) {
      throw { msg: "Team not found!" };
    }

    const membersList = await User.find({
      phone: {
        $in: team_members,
      },
    }).select("_id");

    let members = membersList.map((member) => member._id);

    const response = await Team.findByIdAndUpdate(
      team_id,
      {
        $addToSet: { team_members: { $each: members } },
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

/**
 * @swagger
 * /team/removemember:
 *  post:
 *    tags:
 *      - USER
 *    description: Add Members
  *    parameters:
 *      - name: team_id
 *        in: formData
 *        required: true
 *        type: string
 *        description: team_id
 *      - name: member_id
 *        in: formData
 *        required: true
 *        type: string
 *        description: member_id

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: Team
 *      400:
 *       description: Error
 */

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

// route /team/updateTeam
// desc Update Existing Team
// Method PATCH

/**
 * @swagger
 * /team/updateTeam:
 *  post:
 *    tags:
 *      - USER
 *    description: Add Members
  *    parameters:
 *      - name: team_id
 *        in: formData
 *        required: true
 *        type: string
 *        description: team_id
 *      - name: team_members
 *        in: formData
 *        required: true
 *        type: string
 *        description: team_members

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: Team
 *      400:
 *       description: Error
 */

router.patch("/updateTeam", async (req, res) => {
  try {
    const { team_id, team_members } = req.body;

    const teamFound = await Team.findById(team_id);

    if (!teamFound) {
      return res.status(400).send({ msg: "Team not available!" });
    }

    const response = await Team.findByIdAndUpdate(
      team_id,
      {
        team_members: team_members,
      },
      {
        new: true,
      }
    );

    if (!response) {
      return res.status(400).send({ msg: "Team not added!" });
    }

    res.send(response);
  } catch (err) {
    res.send(err.message ? { msg: err.msg } : err);
  }
});

module.exports = router;
