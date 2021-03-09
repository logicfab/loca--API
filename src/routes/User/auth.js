const express = require("express");
const otpGenerator = require("otp-generator");
const User = require("../../models/User");
const bcrypt = require("bcrypt");
const Nexmo = require("nexmo");
const router = express.Router();

const nexmo = new Nexmo({
  apiKey: "7a663118",
  apiSecret: "HcDe3nsU2rGpX8aP",
});

// route  -> /user/auth/register
// desc   -> Register new User
// Method -> POST

router.post("/register", async (req, res) => {
  try {
    const {
      email,
      imgUrl,
      first_name,
      last_name,
      phone,
      date_of_birth,
      gender,
      password,
    } = req.body;

    console.log(req.body);
    const alreadyRegistered = await User.findOne({
      email: email.toLowerCase(),
    });

    if (alreadyRegistered) {
      return res
        .status(400)
        .send({ success: false, msg: "Email address already exists!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.findOneAndUpdate(
      {
        "phone.code": phone.code,
        "phone.number": phone.number,
      },
      {
        $set: {
          email,
          imgUrl,
          first_name,
          last_name,
          date_of_birth,
          gender,
          password: hashedPassword,
        },
      },
      { new: true }
    );

    const registered_user = await user.save();

    res.send({
      success: true,
      msg: "Registered successfully",
      user: registered_user._id,
    });
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
    // console.log("otp sending");

    let otp = otpGenerator.generate(4, {
      upperCase: false,
      specialChars: false,
      alphabets: false,
    });
    otp = parseInt(otp);

    if (otp < 1000) {
      otp = otp + 1000;
    }

    let expiryTime = new Date();

    expiryTime.setSeconds(expiryTime.getSeconds() + 60);

    const code = phone.code.slice(1);
    const phoneNumber = code + phone.number;
    const from = "LOCA";
    const to = phoneNumber;
    const text = `Hello from LOCA. Your OTP is ${otp}`;

    const user = await User.findOne({
      "phone.code": phone.code,
      "phone.number": phone.number,
    });

    if (!user) {
      const NewUser = new User({
        phone,
        otp_verification: {
          otp: otp,
          expiresIn: expiryTime,
        },
      });

      const registered_user = await NewUser.save();
      nexmo.message.sendSms(from, to, text);

      return res.send({
        msg: "Otp Sent to Your Number",
        data: registered_user,
      });
    } else if (user.email && user.name) {
      return res.status(400).send("User already registered");
    } else if (user.phone) {
      const registered_user = await User.findByIdAndUpdate(
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
      console.log(phoneNumber);

      nexmo.message.sendSms(from, to, text);

      return res.send({
        msg: "Otp Sent to Your Number again",
        data: registered_user,
      });
    }
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
    console.log(req.body);

    const verified = await User.findOne({
      "phone.code": phone.code,
      "phone.number": phone.number,
      "otp_verification.otp": parseInt(otp),
      "otp_verification.expiresIn": { $gt: new Date() },
    });

    console.log(verified);
    if (!verified) {
      res.status(400).send({ success: false, msg: "OTP verification failed!" });
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

    res.send({ status: "success", success: true, msg: "OTP verified!" });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/auth/login
// desc   -> Login new User
// Method -> POST

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email: email });
    if (!user) return res.status(400).send("Invalid Email or Password");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res
        .status(400)
        .send({ success: false, msg: "Invalid Email or Password" });

    return res.send({ success: true, msg: "Loggid in", user: user._id });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/auth/forget-password
// desc   -> Forget Password
// Method -> POST

router.post("/forget-password", async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({
      "phone.code": phone.code,
      "phone.number": phone.number,
    });

    if (!user) return res.status(400).send({ msg: "User does not exist" });

    let otp = otpGenerator.generate(4, {
      upperCase: false,
      specialChars: false,
      alphabets: false,
    });
    otp = parseInt(otp);

    if (otp < 1000) {
      otp = otp + 1000;
    }

    let expiryTime = new Date();

    expiryTime.setSeconds(expiryTime.getSeconds() + 60);

    const registered_user = await User.findByIdAndUpdate(
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

    const code = phone.code.slice(1);
    const phoneNumber = code + phone.number;
    const from = "LOCA";
    const to = phoneNumber;
    const text = `Hello from LOCA. Your OTP is ${otp}`;

    nexmo.message.sendSms(from, to, text);

    res.send({ msg: "OTP sent", OTP: otp });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/auth/reset-password
// desc   -> Reset Password -> after forget password
// Method -> POST

router.post("/reset-password", async (req, res) => {
  try {
    const { password, phone } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.findOneAndUpdate(
      {
        "phone.code": phone.code,
        "phone.number": phone.number,
      },
      {
        $set: {
          password: hashedPassword,
        },
      },
      { new: true }
    );
    if (!user) return res.status(400).send("User Not registered");

    res.send({ msg: "Password Reset", success: true });
  } catch (error) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

module.exports = router;
