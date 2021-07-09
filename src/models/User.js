const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    email: { type: String, trim: true },
    one_signal_id: { type: String, trim: true },
    date_of_birth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Not Specified"] },
    password: { type: String, select: false, trim: true },
    userType: { type: String, enum: ["normal", "professional"] },
    phone: {
      code: { type: String, required: true, trim: true },
      number: { type: String, required: true, trim: true },
    },
    imgUrl: { type: String, trim: true },
    location: {
      lat: { type: String, trim: true },
      lng: { type: String, trim: true },
      lastUpdate: { type: Date, default: Date.now() },
    },
    email_verified: { type: Boolean, default: true },
    otp_verification: { otp: { type: Number }, expiresIn: { type: Date } },
    i_need_help: { type: String, default: false },
    detection_radius: { type: Number, default: 2 },
    detection_time: { hours: { type: Number }, minutes: { type: Number } },
    is_online: { type: Boolean, default: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = User = mongoose.model("user", UserSchema);
