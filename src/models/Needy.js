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
      enum: ["unresolved", "resolved"],
      default: "unresolved",
    },
    description: {
      type: String,
      required: true,
    },
    assigned_team: {
      type: mongoose.Schema.Types.ObjectId,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Needy = mongoose.model("needy", NeedySchema);
