const express = require("express");
const router = express.Router();

router.use("/", require("./team"));

module.exports = router;
