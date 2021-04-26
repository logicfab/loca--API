const mongoose = require("mongoose");

const TeamHelpSchema = mongoose.Schema(
  {
    requester: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
    },
    helper: {
      type: mongoose.Types.ObjectId,
      ref: "user",
    },
    helpers: [{ type: mongoose.Types.ObjectId, ref: "user", default: [] }],
    team_selected: {
      type: mongoose.Types.ObjectId,
      ref: "team",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "cancelled", "completed"],
      default: "pending",
    },
    helpMessage: {
      type: String,
      required: true,
      trim: true,
    },
    time: {
      type: Date,
      default: Date.now(),
    },
    cancelled_by: [{ type: mongoose.Types.ObjectId, ref: "user", default: [] }],
  },
  {
    timestamps: true,
  }
);

module.exports = TeamHelp = mongoose.model("teamHelp", TeamHelpSchema);
