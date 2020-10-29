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
      type: Object,
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
