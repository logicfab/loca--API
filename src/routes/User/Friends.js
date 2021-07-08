const router = require("express").Router();
const schedule = require("node-schedule");

const auth = require("../../../middlewares/Auth");
const { sendNotification } = require("../../../helpers/oneSignalNotification");
const { myFriends } = require("../../../controllers/FriendController.jS");

const { CronJob } = require("../../models/CronJob");
const { Friend } = require("../../models/Friend");

router.post("/send-request", auth, async (req, res) => {
  try {
    const me = req.user.phone;
    const user = req.body.user.phone;

    const alreadySent = await Friend.findOne({
      $and: [
        {
          $or: [
            { "user1.phone": me, "user2.phone": user },
            { "user2.phone": me, "user1.phone": user },
          ],
        },
        { status: "Pending" },
      ],
    });

    if (alreadySent) {
      return res.json({ msg: "Request already sent", status: false });
    }

    const friend = new Friend({ user1: { phone: me }, user2: { phone: user } });
    await friend.save();

    const otherUser = await User.findOne({ phone: user });

    console.log("otherUser :>> ", otherUser);

    sendNotification(
      "New friend Request",
      `${req.user.first_name} Would like to connect with you!`,
      {
        requester: req.user._id,
        reciever: user,
        message: `${req.user.first_name} Would like to connect with you!`,
        notificationType: "FRIEND_REQUEST",
        _id: friend._id,
      },
      [otherUser.one_signal_id],
      "",
      1
    );

    return res.send({ msg: "Friend request sent", status: true });
  } catch (error) {
    console.log("error :>> ", error);
    res.status(500).send({ msg: error.message });
  }
});
router.post("/accept-request", auth, async (req, res) => {
  try {
    const { _id } = req.body;

    const request = await Friend.findByIdAndUpdate(_id, {
      $set: { status: "Accepted", connected: true },
    });

    /*
     * SETTING FRIENDS ON THE BASE OF DETECTION TIME ----
     * Running the Cron Job to Unset the detection time
     */
    // :TODO: :FIXME: RUNNING CRON JOB TO SET THE ACTIVE TIME FOR USERS
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

    const job = new CronJob({ id: _id, ended_at, type: "FRIEND" });

    await job.save();

    schedule.scheduleJob(
      _id,
      ended_at,
      function (_id) {
        Job.findOneAndRemove({ id: _id }).then((result) => {});
        Friend.findByIdAndUpdate(
          _id,
          { $set: { connected: false } },
          { new: true }
        ).then((result) => {});
      }.bind(null, _id)
    );
    res.send({
      status: true,
      msg: `You're now Friend with ${
        users.find((u) => u._id != req.user._id).first_name
      }`,
    });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.get("/my-friends", auth, async (req, res) => {
  try {
    const { friends, nearestFriends } = await myFriends(req.user);
    res.send({
      nearestFriends,
      // friends
    });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.get("/requests", auth, async (req, res) => {
  try {
    const requests = await Friend.aggregate([
      {
        $match: {
          $and: [{ "user2.phone": req.user.phone }, { status: "Pending" }],
        },
      },
      {
        $lookup: {
          from: "users",
          let: { phone: "$user1.phone" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$phone", "$phone"] } } },
            { $project: { password: 0 } },
          ],
          as: "user1",
        },
      },
      { $unwind: { path: "$user1" } },
    ]);

    res.send({ requests });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.get("/sent-requests", auth, async (req, res) => {
  try {
    const requests = await Friend.aggregate([
      {
        $match: {
          $and: [{ "user1.phone": req.user.phone }, { status: "Pending" }],
        },
      },
      {
        $lookup: {
          from: "users",
          let: { phone: "$user1.phone" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$phone", "$phone"] } } },
            { $project: { password: 0 } },
          ],
          as: "user1",
        },
      },
      { $unwind: { path: "$user1" } },
    ]);

    res.send({ requests });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.post("/cancel-request", auth, async (req, res) => {
  try {
    const { _id } = req.body;
    await Friend.findByIdAndUpdate(
      _id,
      {
        $set: { status: "Rejected" },
      },
      { new: true }
    );
    res.send({ msg: "Friend request removed" });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});

module.exports = router;
