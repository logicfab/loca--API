const express = require("express");
const router = express.Router();

router.use("/image", require("./uploadImage"));

module.exports = router;
