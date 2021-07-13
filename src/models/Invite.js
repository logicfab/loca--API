const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "team",
      required: false,
    },
    invite_by: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    invite_to: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    status: {
      type: String,
      default: "Pending",
      enum: ["Accepted", "Pending", "Rejected"],
    },
    _type: { type: String, enum: ["GROUP", "FRIEND"] },
  },
  { timestamps: true }
);

exports.Invite = mongoose.model("invite", schema);
