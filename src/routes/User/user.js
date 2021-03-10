const e = require("express");
const express = require("express");
const User = require("../../models/User");
const router = express.Router();

// route  -> /user/GetUsersById/:id
// desc   -> GET USER BY USER ID
// Method -> GET
router.get("/getUsersById/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-__v");
  if (!user) return res.status(404).send("User does not exist");

  res.send(user);
});

// route  -> /user/updateUserByUserId
// desc   -> Update User By ID
// Method -> PUT
router.put("/updateUsersById/:id", async (req, res) => {
  console.log("checking-----------------", req.body);
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true }
  );
  if (!user) return res.status(404).send("User Does not exist");

  res.send(user);
});

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

// route  -> /user/GetUsersByNumbers
// desc   -> GET USERS BY NUMBERS
// Method -> POST

router.post("/GetUsersByNumbers", async (req, res) => {
  try {
    const { numbers } = req.body;

    console.log(numbers.length);

    const users = await User.find({
      "phone.number": { $in: numbers },
    }).select("_id");

    console.log(users.length);

    res.send(users);
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/getDetectionRadius
// desc   -> GET Detection Radius
// Method -> GET

router.get("/getDetectionRadius/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send("User does not exist");

  res.send({ detection_radius: user.detection_radius });
});

// route  -> /user/updateDetectionRadius
// desc   -> Update Detection Radius
// Method -> Update

router.put("/updateDetectionRadius/:id", async (req, res) => {
  const { detection_radius } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        detection_radius,
      },
    },
    { new: true }
  );

  if (!user) return res.status(404).send("User does not exist");

  res.send({ detection_radius: user.detection_radius });
});

// route  -> /user/toggleUserStatus
// desc   -> Update User Status
// Method -> Update

router.put("/toggleUserStatus/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send("User does not exist");

  user.app_status = !user.app_status;
  await user.save();

  res.send({ user_status: user.app_status });
});

module.exports = router;
