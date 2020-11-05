const mongoose = require("mongoose");

const FirstAidTeamSchema = mongoose.Schema(
  {
    team_number: {
      type: Number,
      required: true,
      unique: true,
    },
    phone: {
      code: {
        type: String,
        required: true,
        trim: true,
      },
      number: {
        type: String,
        required: true,
        trim: true,
      },
    },
    location: {
      lat: {
        type: String,
        trim: true,
      },
      lng: {
        type: String,
        trim: true,
      },
      lastUpdate: {
        type: Date,
        default: Date.now(),
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = FirstAidTeam = mongoose.model(
  "firstaidteam",
  FirstAidTeamSchema
);
