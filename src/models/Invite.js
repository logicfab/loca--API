const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  link: {},
  user: {},
  invited_by: {},
  active: {},
});

exports.Invite = mongoose.model("invite", schema);
