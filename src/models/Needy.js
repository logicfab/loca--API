const mongoose = require("mongoose");

const NeedySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: String,
      enum: ["unresolved", "resolved", "cancelled"],
    },
    assigned_team: {
      type: mongoose.Schema.Types.ObjectId,
      trim: true,
      ref: "user",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Needy = mongoose.model("needy", NeedySchema);
