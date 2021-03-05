const express = require("express");
const otpGenerator = require("otp-generator");
const User = require("../../models/User");
const router = express.Router();

// route  -> /user/auth/register
// desc   -> Register new User
// Method -> POST

/**
 * @swagger
 * /user/auth/register:
 *  post:
 *    tags:
 *      - USER
 *    description: Register User
  *    parameters:
 *      - name: name
 *        in: formData
 *        required: true
 *        type: string
 *        description: name
 *      - name: email
 *        in: formData
 *        required: true
 *        type: string
 *        description: email
 *      - name: phone
 *        in: formData
 *        required: true
 *        type: string
 *        description: phone

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: user registered
 *      400:
 *       description: Error
 */

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const alreadyRegistered = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { "phone.code": phone.code, "phone.number": phone.number },
      ],
    });

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

/**
 * @swagger
 * /user/auth/sendOTP:
 *  post:
 *    tags:
 *      - USER
 *    description: Send OTP
  *    parameters:
 *      - name: phone
 *        in: formData
 *        required: true
 *        type: string
 *        description: phone

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: user registered
 *      400:
 *       description: Error
 */

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

    // TODO: Send OTP to Number -> code goes here!

    res.send({ msg: "Otp Sent to Your Number",otp });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

// route  -> /user/auth/verifyOTP
// desc   -> Verify OTP
// Method -> POST

/**
 * @swagger
 * /user/auth/verifyOTP:
 *  post:
 *    tags:
 *      - USER
 *    description: Verify OTP
  *    parameters:
 *      - name: phone
 *        in: formData
 *        required: true
 *        type: string
 *        description: phone
 *      - name: otp
 *        in: formData
 *        required: true
 *        type: string
 *        description: otp


 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: verify otp
 *      400:
 *       description: Error
 */

router.post("/verifyOTP", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const verified = await User.findOne({
      "phone.code": phone.code,
      "phone.number": phone.number,
      "otp_verification.otp": parseInt(otp),
      "otp_verification.expiresIn": { $gt: new Date() },
    });

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

// route  -> /user/auth/setNewPassword
// desc   -> Set new password
// Method -> POST

/**
 * @swagger
 * /user/auth/setNewPassword:
 *  post:
 *    tags:
 *      - USER
 *    description: Set New Password
  *    parameters:
 *      - name: user_id
 *        in: formData
 *        required: true
 *        type: string
 *        description: user_id
 *      - name: password
 *        in: formData
 *        required: true
 *        type: string
 *        description: password

 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: Set New Password
 *      400:
 *       description: Error
 */

router.post("/setNewPassword", async (req, res) => {
  try {
    const { user_id, password } = req.body;

    const userNotVerified = await User.findOne({
      _id: user_id,
      "otp_verification.otp": { $not: null },
    });

    console.log(userNotVerified);

    if (userNotVerified) {
      throw { msg: "User not verified!" };
    }

    const response = await User.findByIdAndUpdate(
      user_id,
      {
        $set: {
          password,
        },
      },
      {
        new: true,
      }
    );

    if (!response) {
      throw { msg: "Password not updated!" };
    }

    res.send({ status: "success", msg: "Password Updated!" });
  } catch (err) {
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

module.exports = router;
