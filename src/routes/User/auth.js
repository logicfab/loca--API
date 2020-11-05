const express = require("express");
const otpGenerator = require("otp-generator");
const User = require("../../models/User");
const router = express.Router();

// route  -> /user/auth/register
// desc   -> Register new User
// Method -> POST

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const alreadyRegistered = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { "phone.code": phone.code, "phone.number": phone.number },
      ],
    });
    console.log(alreadyRegistered);
    if (alreadyRegistered) {
      throw { msg: "User Already registered!" };
    }
    const user = new User({
      name,
      email: email.toLowerCase(),
      phone,
    });

    const registered_user = await user.save();

    res.send(registered_user);
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/auth/sendOTP
// desc   -> Send OTP to User
// Method -> POST

router.post("/sendOTP", async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({
      "phone.code": phone.code,
      "phone.number": phone.number,
    });
    if (!user) {
      throw { msg: "User not registered!" };
    }
    let expiryTime = new Date();

    expiryTime.setSeconds(expiryTime.getSeconds() + 60);

    let otp = otpGenerator.generate(4, {
      upperCase: false,
      specialChars: false,
      alphabets: false,
    });
    otp = parseInt(otp);

    if (otp < 1000) {
      otp = otp + 1000;
    }

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          "otp_verification.otp": otp,
          "otp_verification.expiresIn": expiryTime,
        },
      },
      {
        new: true,
      }
    );

    // Send OTP to Number -> code goes here!

    res.send({ msg: "Otp Sent to Your Number" });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/auth/verifyOTP
// desc   -> Verify OTP
// Method -> POST

router.post("/verifyOTP", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const verified = await User.findOne({
      "phone.code": phone.code,
      "phone.number": phone.number,
      "otp_verification.otp": parseInt(otp),
      "otp_verification.expiresIn": { $gt: new Date() },
    });

    console.log(verified);
    if (!verified) {
      throw { msg: "OTP verification failed!" };
    }

    await User.findByIdAndUpdate(
      verified._id,
      {
        "otp_verification.otp": null,
        "otp_verification.expiresIn": null,
      },
      {
        new: true,
      }
    );

    res.send({ status: "success", msg: "OTP verified!" });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

module.exports = router;
