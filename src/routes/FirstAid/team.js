const express = require("express");
const FirstAidTeam = require("../../models/FirstAidTeam");

const router = express.Router();

// route  -> /firstaid/team/register
// desc   -> Register FirstAid User
// Method -> POST

router.post("/register", async (req, res) => {
  try {
    const { phone, team_number } = req.body;

    console.log(req.body);

    const alreadyRegistered = await FirstAidTeam.findOne({
      "phone.code": phone.code,
      "phone.number": phone.number,
    });

    console.log(alreadyRegistered);

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
