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
    team_selected: {
      type: mongoose.Types.ObjectId,
      ref: "team",
      required: true,
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
  },
  {
    timestamps: true,
  }
);

module.exports = TeamHelp = mongoose.model("teamHelp", TeamHelpSchema);
