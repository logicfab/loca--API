const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth"));
router.use("/friends", require("./Friends"));
router.use("/", require("./user"));

module.exports = router;
