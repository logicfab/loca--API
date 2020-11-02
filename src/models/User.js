const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
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
    phone: {
      code: {
        type: Number,
        required: true,
        trim: true,
      },
      number: {
        type: Number,
        required: true,
        trim: true,
      },
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
    otp_verification: {
      otp: {
        type: Number,
      },
      expiresIn: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = User = mongoose.model("user", UserSchema);
