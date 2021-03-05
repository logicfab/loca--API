const express = require("express");
const FirstAidTeam = require("../../models/FirstAidTeam");

const router = express.Router();

// route  -> /firstaid/team/register
// desc   -> Register FirstAid User
// Method -> POST

/**
 * @swagger
 * /firstaid/team/register:
 *  post:
 *    tags:
 *      - FIRST AID TEAM
 *    description: Register
  *    parameters:
 *      - name: phone
 *        in: formData
 *        required: true
 *        type: string
 *        description: phone
 *      - name: team_number
 *        in: formData
 *        required: true
 *        type: string
 *        description: team_number

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: Team
 *      400:
 *       description: Error
 */

router.post("/register", async (req, res) => {
  try {
    const { phone, team_number } = req.body;

    const alreadyRegistered = await FirstAidTeam.findOne({
      "phone.code": phone.code,
      "phone.number": phone.number,
    });

    if (alreadyRegistered) {
      throw { msg: "Another Team with same number is registered!" };
    }

    const firstaidteam = new FirstAidTeam({
      phone,
      team_number,
    });

    const response = await firstaidteam.save();
    if (!response) {
      throw { msg: "Team could not be added!" };
    }

    res.send(response);
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

module.exports = router;
