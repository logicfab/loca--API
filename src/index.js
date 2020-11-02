const express = require("express");
const app = express();
const cors = require("cors");
const socketIO = require("socket.io");
const connectDb = require("../helpers/connectDb");
const { socketioConnect } = require("../sockets/socket");
const getConnectedTest = require("../sockets/user");

const PORT = process.env.PORT || 5060;
let http = require("http").createServer(app);

app.use(cors());
app.use(express.json());

//db connection
connectDb();

//routes connection
app.use("/user", require("./routes/User"));
app.use("/team", require("./routes/Team"));

http.listen(PORT, () => {
  console.log("App is Listening at " + PORT);
});

let io = require("socket.io")(http);

socketioConnect(io);
