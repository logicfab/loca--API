const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  id: { type: String, required: true },
  active: { type: Boolean, default: false },
  type: { type: String, enum: ["FRIEND", "USER", "GROUP"], default: "FRIEND" },
  ended_at: { type: Date, required: true },
  _user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  _group: { type: Object },
});
exports.CronJob = mongoose.model("cron-jobs", schema);
