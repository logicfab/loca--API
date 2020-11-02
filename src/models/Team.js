const mongoose = require("mongoose");

const TeamSchema = mongoose.Schema(
  {
    team_by: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
      trim: true,
    },
    team_name: {
      type: String,
      required: true,
      trim: true,
    },
    team_members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = Team = mongoose.model("team", TeamSchema);
