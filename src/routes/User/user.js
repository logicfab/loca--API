const e = require("express");
const express = require("express");
const Auth = require("../../../middlewares/Auth");
const { CronJob } = require("../../models/CronJob");
const User = require("../../models/User");
const router = express.Router();
const Vehicle = require("../../models/vehicle");

const schedule = require("node-schedule");
const Mongoose = require("mongoose");
const { Invite } = require("../../models/Invite");
const { Friend } = require("../../models/Friend");
// route  -> /user/GetUsersById/:id
// desc   -> GET USER BY USER ID
// Method -> GET
router.get("/getUsersById/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-__v");
  if (!user) return res.status(404).send("User does not exist");

  res.send(user);
});
router.post("/check-number", async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone }).select("-password");
    res.json({ user: user ? user : null });
  } catch (error) {
    console.log("error :>> ", error);
    res.status(404).send({ error });
  }
});

router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select("-password");
    res.json({ user: user ? user : null });
  } catch (error) {
    console.log("error :>> ", error);
    res.status(404).send({ error });
  }
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

    res.send({ detection_radius: user.detection_radius, user });
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
    console.log("ONE SIGNAL BODY", req.body);
    const results = await User.updateMany(
      { one_signal_id: oneSignalId },
      { $set: { one_signal_id: null } }
    );
    // console.log(results);
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
router.post("/get-vehicle-location", async (req, res) => {
  const { user_id } = req.body;
  try {
    console.log(Vehicle);
    const vehicleLocation = await Vehicle.findOne({
      user: user_id,
    }).populate("user");

    res.send({ vehicleLocation });
  } catch (e) {
    console.log(e);
    res.status(400).send({ message: "Not Found" });
  }
});
router.post("/set-detection-time", Auth, async (req, res) => {
  try {
    const { hours, minutes } = req.body;

    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: { detection_time: { hours, minutes } },
      },
      { new: true }
    );

    res.send({ msg: `Detection Time set to  ${hours}H and ${minutes}M` });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.post("/pause", Auth, async (req, res) => {
  try {
    const { minutes } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { status: !req.user.status } },
      { new: true }
    );

    if (!req.user.status) {
      const ended_at = new Date();
      ended_at.setMinutes(ended_at.getMinutes() + minutes);

      const job = new CronJob({ id: req.user._id, ended_at, type: "USER" });
      await job.save();
      const id = req.user._id;

      schedule.scheduleJob(
        Mongoose.Types.ObjectId(id).toString(),
        ended_at,
        function (id) {
          Job.findOneAndRemove({ id }).then((result) => {});
          User.findByIdAndUpdate(
            id,
            { $set: { status: true } },
            { new: true }
          ).then((result) => {});
        }.bind(null, id)
      );
    } else {
      try {
        schedule.scheduledJobs[req.user._id].cancel();
        console.log("Job deleted");

        await CronJob.findOneAndRemove({ id: req.user._id });
      } catch (error) {
        console.log(error);
        console.log("NOT FOUND");
      }
    }
    const status = req.user.status ? "Unpause" : "Pause";
    res.send({ msg: `You've gone into ${status} position` });
  } catch (error) {
    console.log(error);
    res.status(500).send({ msg: error.message });
  }
});
router.post("/invites", Auth, async (req, res) => {
  console.log(req.user._id);
  const invites = await Invite.find({
    $and: [{ invite_to: req.user._id }, { status: "Pending" }],
  })
    .populate({
      path: "invite_by invite_to",
      model: "user",
      select: "-password",
    })
    .populate({ path: "team_id", model: "team" });

  res.send({ invites });
});
router.post("/cancel-invite", Auth, async (req, res) => {
  const { invite_id } = req.body;

  await Invite.findByIdAndUpdate(
    invite_id,
    {
      $set: { status: "Rejected" },
    },
    { new: true }
  );
  res.send({ msg: "Invite cancelled" });
});
router.post("/accept-invite", Auth, async (req, res) => {
  const { invite_id } = req.body;

  const invite = await Invite.findByIdAndUpdate(
    invite_id,
    { $set: { status: "Accepted" } },
    { new: true }
  );

  if (invite._type == "FRIEND") {
    const request = await Friend.findOneAndUpdate(
      { invite_id },
      {
        $set: { status: "Accepted", connected: true },
      }
    );
    const date1 = new Date();
    const date2 = new Date();

    const users = await User.find({
      phone: { $in: [request.user1.phone, request.user2.phone] },
    });

    if (users[0].detection_time) {
      date1.setHours(date1.getHours() + users[0].detection_time.hours);
      date1.setMinutes(date1.getMinutes() + users[0].detection_time.minutes);
    }
    if (users[1].detection_time) {
      date2.setHours(date2.getHours() + users[1].detection_time.hours);
      date2.setHours(date2.getMinutes() + users[1].detection_time.hours);
    }

    let ended_at = null;
    if (date1 > date2) {
      ended_at = date1;
    } else {
      ended_at = date2;
    }

    const job = new CronJob({ id: invite_id, ended_at, type: "FRIEND" });

    await job.save();

    schedule.scheduleJob(
      invite_id,
      ended_at,
      function (_id) {
        CronJob.findOneAndRemove({ id: _id }).then((result) => {});
        Friend.findByIdAndUpdate(
          _id,
          { $set: { connected: false } },
          { new: true }
        ).then((result) => {});
      }.bind(null, invite_id)
    );

    return res.send({ msg: "Friend Connection invite accepted" });
  } else {
    // :TODO: Handle or cancel the group invite
  }
});

module.exports = router;
