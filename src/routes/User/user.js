const express = require("express");
const User = require("../../models/User");
const router = express.Router();

// route  -> /user/updateLocation
// desc   -> Update User Location
// Method -> POST

router.post("/updateLocation", async (req, res) => {
  try {
    const { user_id, user_location } = req.body;
    const user = await User.findById(user_id);
    if (!user) {
      throw { msg: "User not Found!" };
    }
    const response = await User.findByIdAndUpdate(
      user_id,
      {
        "location.lat": user_location.lat,
        "location.lng": user_location.lng,
        "location.lastUpdate": Date.now(),
      },
      {
        new: true,
        upsert: true,
      }
    );
    if (!response) {
      throw { msg: "Location could not be updated!" };
    }
    res.send(response);
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

module.exports = router;
