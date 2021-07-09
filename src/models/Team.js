const mongoose = require("mongoose");

const TeamSchema = mongoose.Schema(
  {
    team_by: { type: mongoose.Types.ObjectId, ref: "user", required: true },
    link: { type: String },
    team_name: { type: String, required: true, trim: true },
    team_type: {
      type: String,
      trim: true,
      enum: ["normal", "anonymous"],
      default: "normal",
    },
    team_members: [
      {
        connected: { type: Boolean, default: true },
        visibility: { type: Boolean, default: true },
        phone: {
          code: { type: String, required: true, trim: true },
          number: { type: String, required: true, trim: true },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = Team = mongoose.model("team", TeamSchema);
