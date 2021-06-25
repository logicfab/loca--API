const express = require("express");
const app = express();
const cors = require("cors");
const socketIO = require("socket.io");
const connectDb = require("./helpers/connectDb");
const { socketioConnect } = require("./sockets/socket");
const getConnectedTest = require("./sockets/user");
const path = require("path");

const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "images"))); //  "public" off of current is root

//db connection
connectDb();

app.set("view engine", "ejs");

//routes connection
app.use("/user", require("./src/routes/User"));
app.use("/team", require("./src/routes/Team"));
app.use("/firstaid", require("./src/routes/FirstAid"));
app.use("/upload", require("./src/routes/FileUploads"));
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  // res.render("../views/welcome");

  res.send({ msg: "loca----" });
});

const server = app.listen(PORT, () => {
  console.log("App is Listening at " + PORT);
});
// let http = require("http").createServer(app);

const io = require("socket.io").listen(server);
// io.on("connection", (socket) => {console.log("user connected")});
socketioConnect(io);
