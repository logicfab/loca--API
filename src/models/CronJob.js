const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  id: { type: String, required: true },
  active: { type: Boolean, default: false },
  type: { type: String, enum: ["FRIEND"] },
  ended_at: { type: Date, required: true },
});
exports.CronJob = mongoose.model("cron-jobs", schema);
