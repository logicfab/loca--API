const router = require("express").Router();
const schedule = require("node-schedule");

const { Friend } = require("../../models/Friend");
const auth = require("../../../middlewares/Auth");
const { sendNotification } = require("../../../helpers/oneSignalNotification");

router.post("/send-request", auth, async (req, res) => {
  try {
    const me = req.user._id;
    const user = req.body.user;

    const alreadySent = await Friend.findOne({
      $and: [
        {
          $or: [
            { user1: me, user2: user },
            { user2: me, user1: user },
          ],
        },
        { status: "Pending" },
      ],
    });

    if (alreadySent) {
      return res.json({ msg: "Request already sent", status: false });
    }

    const friend = new Friend({ user1: me, user2: user });
    await friend.save();

    const otherUser = await User.findById(user);

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
    res.status(500).send({ msg: error.message });
  }
});
router.post("/accept-request", auth, async (req, res) => {
  try {
    const { _id } = req.body;

    const request = await Friend.findByIdAndUpdate(_id, {
      $set: { status: "Accepted", connected: true },
    }).populate("user1 user2");

    /*
     * SETTING FRIENDS ON THE BASE OF DETECTION TIME ----
     * Running the Cron Job to Unset the detection time
     */

    const ended_at = new Date();
    const users = await User.find({
      _id: { $in: [request.user1, request.user2] },
    });
    users.map((user) => console.log(user));

    schedule.scheduleJob(
      _id,
      ended_at,
      function (_id) {
        console.log("ME RUNING...", _id);
        PostModel.findByIdAndUpdate(
          _id,
          { $set: { is_live: false, ended: true } },
          { new: true }
        )
          .then((result) => {})
          .catch((err) => {});
      }.bind(null, _id)
    );
    res.send({
      status: true,
      msg: `You're now Friend with ${
        request.user1._id !== req.user._id
          ? request.user2.first_name
          : request.user1.first_name
      }`,
    });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.get("/my-friends", auth, async (req, res) => {
  try {
    const friends = await Friend.find({
      $and: [
        { $or: [{ user1: req.user._id }, { user2: req.user._id }] },
        { status: "Accepted" },
      ],
    })
      .sort({ connected: -1 })
      .populate({ path: "user1 user2", model: "user", select: "-password" })
      .exec();
    res.send({ friends });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.get("/requests", auth, async (req, res) => {
  try {
    const requests = await Friend.find({
      user2: req.user._id,
      status: "Pending",
    })
      .populate("user1")
      .exec();
    res.send({ requests });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});
router.get("/sent-requests", auth, async (req, res) => {
  try {
    const requests = await Friend.find({
      user1: req.user._id,
      status: "Pending",
    })
      .populate("user1")
      .exec();
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
