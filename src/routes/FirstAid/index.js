const express = require("express");
const router = express.Router();

//routes
router.use("/team", require("./team"));

module.exports = router;
