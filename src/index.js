const express = require("express");
const app = express();
const cors = require("cors");
const socketIO = require("socket.io");
const swagger = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
const connectDb = require("./helpers/connectDb");
const { socketioConnect } = require("../sockets/socket");
const getConnectedTest = require("../sockets/user");

const swaggerOptions = require("./helpers/swagger");
app.use(
  "/api-docs/loca",
  swagger.serve,
  swagger.setup(swaggerJSDoc(swaggerOptions))
);

const PORT = process.env.PORT || 5055;
let http = require("http").createServer(app);

app.use(cors());
app.use(express.json());

//swagger

//db connection
connectDb();

//routes connection
app.use("/user", require("./routes/User"));
app.use("/team", require("./routes/Team"));
app.use("/firstaid", require("./routes/FirstAid"));

http.listen(PORT, () => {
  console.log("App is Listening at " + PORT);
});

let io = require("socket.io")(http);

socketioConnect(io);
