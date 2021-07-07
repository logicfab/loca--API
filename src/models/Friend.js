const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  connected: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending",
  },
});

exports.Friend = mongoose.model("friend", schema);
