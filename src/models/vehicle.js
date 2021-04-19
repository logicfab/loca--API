const mongoose = require("mongoose");

const VehicleSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: true,
    },
    location: {
      lat: {
        type: String,
        trim: true,
        required: true,
      },
      lng: {
        type: String,
        trim: true,
        required: true,
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

module.exports = Vehicle = mongoose.model("vehicle", VehicleSchema);
