const User = require("../src/models/User");

module.exports = async (req, res, next) => {
  const { user } = req.headers;
  if (!user) {
    return res.status(500).send({ msg: "Access Denied" });
  } else {
    const _user = await User.findById(user);
    if (_user) {
      req.user = _user;
      next();
    } else {
      return res.status(500).send({ msg: "Access Denied" });
    }
  }
};
