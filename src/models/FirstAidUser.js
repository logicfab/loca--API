const mongoose = require("mongoose");

const FirstAidUser = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      lat: {
        type: String,
        required: true,
        trim: true,
      },
      lng: {
        type: String,
        required: true,
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

module.exports = FirstAidUser = mongoose.model("firstaiduser", FirstAidUser);
