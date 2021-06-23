const express = require("express");
const otpGenerator = require("otp-generator");
const User = require("../../models/User");
const bcrypt = require("bcrypt");
const Nexmo = require("nexmo");
const { sendEmail } = require("../../../helpers/EmailService");
const router = express.Router();
const config = require("config");
var CryptoJS = require("crypto-js");
const mongoose = require("mongoose");

const nexmo = new Nexmo({
  apiKey: "7a663118",
  apiSecret: "HcDe3nsU2rGpX8aP",
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
    const { email, password, userType } = req.body;
    let user = await User.findOne({
      email: email,
      userType: userType,
    }).select("+password");
    console.log({ user });
    if (!user)
      return res.status(400).send("Invalid Email, Password or User Type");

    if (!user.email_verified)
      return res.status(400).send("Please verify your email first");

    const validPassword = await bcrypt.compare(password, user.password);

    user = user.toObject();
    delete user.password;
    console.log(validPassword);

    if (!validPassword)
      return res
        .status(400)
        .send({ success: false, msg: "Invalid Email or Password" });

    return res.send({ success: true, msg: "Logged in", user: user });
  } catch (err) {
    console.log(err);
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
      userType,
    } = req.body;

    // :TODO: :FIXME:
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
          userType,
        },
      },
      { new: true, upsert: true }
    );

    const registered_user = await user.save();

    delete registered_user.password;
    console.log(registered_user);

    await sendWelcomeEmail(email, user._id, first_name);

    res.send({
      success: true,
      msg: "An email has been sent to you. Please verify your account",
      user: "",
    });
  } catch (err) {
    console.log({ err });
    res.status(500).send(err.message ? { msg: err.message } : err);
  }
});

router.get("/verify", async (req, res) => {
  try {
    const { query } = req.query;
    const data = req.query.query.replace(/\s/g, "+");

    var bytes = CryptoJS.AES.decrypt(data, config.get("secretKey"));
    var originalText = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    const id = originalText[0]._id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.send("Invalid Link!....OR EXPIRED");
    }
    const time = new Date(originalText[1].time);

    time.setMinutes(time.getMinutes() + 10);

    const now = new Date();

    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          email_verified: true,
        },
      },
      { new: true }
    );
    await sendEmail(
      user.email,
      "[LOCA Email Confirmation success] Welcome to LOCA...",
      "Welcome to Loca. Your email has been successfully verified."
    );
    res.send({ msg: "email verified successfully...." });
    // } else res.status(400).send({ msg: "Link has been expired.." });
  } catch (exp) {
    return res.status(404).send({ msg: "Invalid link or expired..." });
  }
});

const sendWelcomeEmail = async (email, _id, first_name) => {
  await sendEmail(
    email,
    "LOCA! Please verify your email address",
    HTMLWELCOME(_id, new Date(), first_name)
  );
};

function HTMLWELCOME(id, time, first_name) {
  var data = [{ _id: id }, { time }, { url: config.get("host") }];

  var ciphertext = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    config.get("secretKey")
  ).toString();

  const url = config.get("host") + "/logo.png";

  const host = config.get("host") + "/user/auth/verify?query=" + ciphertext;

  return `
     <div id="root">
       <div
         style="
           text-align: center;
           margin:"20px";
           background-color: rgb(40, 44, 52);
           min-height: 100vh;
           display: flex;
           flex-direction: column;
           align-items: center;
           justify-content: center;
           font-size: calc(10px + 2vmin);
           color: white;
         "
       >
         <div class="container">
           <div
             style="
               text-align: center;
               margin-top: 10px;
               display: flex;
               flex-direction: row;
               align-items: center;
               justify-content: center;
             "
           >
             <div style="text-align: center; width: 315px">
               <div style="padding: 5px">
                 <img src="${url}" height="300" width="300" />
               </div>
             </div>
           </div>
           <div style="margin-top: 100px">
             <h1>Hi ${first_name}</h1>
             <h2 style="margin-left: 0px">
               One last step to complete your loca account. Confirm your email
               address by clicking on the button below
             </h2>
           </div>
           <button class="btn btn-success">
             <a href="${host}"><h1>Verify</h1></a>
           </button>
           <div style="text-align: left; margin-top: 50px">
             Amsterdam - Loca©
             <a href="mailto:info@loca-loca.nl">info@loca-loca.nl</a>
             <br />
           </div>
           <div style="text-align: left; margin-top: 50px">
             <a href="http://localhost:3000/">Unsubscribe</a>
           </div>
         </div>
       </div>
       <link
       rel="stylesheet"
       href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css"
       integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh"
       crossorigin="anonymous"
     />
     <script
       src="https://code.jquery.com/jquery-3.4.1.slim.min.js"
       integrity="sha384-J6qa4849blE2+poT4WnyKhv5vZF5SrPo0iEjwBvKU7imGFAV0wwj1yYfoRSJoZ+n"
       crossorigin="anonymous"
     ></script>
     <script
       src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js"
       integrity="sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo"
       crossorigin="anonymous"
     ></script>
     <script
       src="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js"
       integrity="sha384-wfSDF2E50Y2D1uUdj0O3uMBJnjuUD4Ih7YwaYd1iqfktj0Uod8GCExl3Og8ifwB6"
       crossorigin="anonymous"
     ></script>
     </div>
 `;
  // return `<button><a href="${host}">Click here to verify your email address.</a></button>`;
}

module.exports = router;
