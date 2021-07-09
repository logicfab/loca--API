const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user1: {
      phone: {
        code: { type: String, required: true, trim: true },
        number: { type: String, required: true, trim: true },
      },
    },
    user2: {
      phone: {
        code: { type: String, required: true, trim: true },
        number: { type: String, required: true, trim: true },
      },
    },
    connected: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

exports.Friend = mongoose.model("friend", schema);
