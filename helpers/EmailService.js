const nodemailer = require("nodemailer");
const config = require("config");

var transporter = nodemailer.createTransport({
  host: config.get("host"),
  service: "gmail",
  auth: {
    user: config.get("email"),
    pass: config.get("password"),
  },
});

exports.sendEmail = async (to, subject, text) => {
  var mailOptions = {
    from: config.get("email"),
    to: to,
    subject: subject,
    html: text,
  };
  await transporter.sendMail(mailOptions);
};
