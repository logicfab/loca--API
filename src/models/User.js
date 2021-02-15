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
    password: {
      type: String,
      required: false,
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
    otp_verification: {
      otp: {
        type: Number,
      },
      expiresIn: {
        type: Date,
      },
    },
    i_need_help: {
      type: String,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = User = mongoose.model("user", UserSchema);
