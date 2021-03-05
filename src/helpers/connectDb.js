const mongoose = require("mongoose");
const config = require("config");

const connectDb = async () => {
  try {
    await mongoose.connect(config.get("dbURI"), {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
    console.log("Database connected!");
  } catch (error) {
    console.log(error);
  }
};

module.exports = connectDb;
