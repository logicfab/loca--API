const express = require("express");
const User = require("../../models/User");
const router = express.Router();

// route  -> /user/updateLocation
// desc   -> Update User Location
// Method -> POST

/**
 * @swagger
 * /user/updateLocation:
 *  post:
 *    tags:
 *      - USER
 *    description: Update User Location
  *    parameters:
 *      - name: user_id
 *        in: formData
 *        required: true
 *        type: string
 *        description: user _id
 *      - name: user_location
 *        in: formData
 *        required: true
 *        type: string
 *        description: user_location

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: Update User Location
 *      400:
 *       description: Error
 */

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

// route  -> /user/GetUsersByNumbers
// desc   -> GET USERS BY NUMBERS
// Method -> POST

/**
 * @swagger
 * /user/GetUsersByNumbers:
 *  post:
 *    tags:
 *      - USER
 *    description: Get Users By Numbers
  *    parameters:
 *      - name: numbers
 *        in: formData
 *        required: true
 *        type: string
 *        description: numbers

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: Numbers
 *      400:
 *       description: Error
 */

router.post("/GetUsersByNumbers", async (req, res) => {
  try {
    const { numbers } = req.body;

    const users = await User.find({
      "phone.number": { $in: numbers },
    }).select("_id");

    res.send(users);
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

module.exports = router;
