const express = require("express");
const app = express();
const cors = require("cors");
const socketIO = require("socket.io");
const connectDb = require("./helpers/connectDb");
const { socketioConnect } = require("./sockets/socket");
const getConnectedTest = require("./sockets/user");

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

//db connection
connectDb();

//routes connection
app.use("/user", require("./src/routes/User"));
app.use("/team", require("./src/routes/Team"));
app.use("/firstaid", require("./src/routes/FirstAid"));
app.use("/upload", require("./src/routes/FileUploads"));
app.use("/uploads", express.static("uploads"));

const server = app.listen(PORT, () => {
  console.log("App is Listening at " + PORT);
});
// let http = require("http").createServer(app);

const io = require("socket.io").listen(server);
// io.on("connection", (socket) => {console.log("user connected")});
socketioConnect(io);
