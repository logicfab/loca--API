const e = require("express");
const express = require("express");
const User = require("../../models/User");
const router = express.Router();
const {Vehicle} = require('../../models/vehicle');
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
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true }
  );
  if (!user) return res.status(404).send("User Does not exist");

  delete user.password;

  res.send({ user: user });
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
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User does not exist");

    res.send({ detection_radius: user.detection_radius });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/updateDetectionRadius
// desc   -> Update Detection Radius
// Method -> Update

router.put("/updateDetectionRadius/:id", async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/toggleUserStatus
// desc   -> Update User Status
// Method -> Update

router.put("/toggleUserStatus/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User does not exist");

    user.is_online = !user.is_online;
    await user.save();

    res.send({ user_status: user.is_online });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/setOnesignalId/:id
// desc   -> Set One Signal ID
// Method -> Put

router.put("/setOnesignalId/:id", async (req, res) => {
  try {
    const { oneSignalId } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          one_signal_id: oneSignalId,
        },
      },
      { new: true }
    );
    if (!user) return res.status(404).send("User not Found");

    res.send({ msg: "One Signal Id Updated", data: user });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

router.post('/get-vehicle-location' , async (req,res)=>{
  const { user_id } = req.body;
  try {
    const vehicleLocation = await Vehicle.findOne({
      user: user_id,
    }).populate("user");

    res.send({vehicleLocation})
  }catch (e) {
    res.status(400).send({message:"Not Found"})
  }
})

module.exports = router;
