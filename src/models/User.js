const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    first_name: {
      type: String,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    date_of_birth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Not Specified"],
    },
    password: {
      type: String,
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
