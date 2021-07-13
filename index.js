const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const schedule = require("node-schedule");

const connectDb = require("./helpers/connectDb");
const { socketioConnect } = require("./sockets/socket");

const { CronJob } = require("./src/models/CronJob");
const { Friend } = require("./src/models/Friend");
const User = require("./src/models/User");
const Team = require("./src/models/Team");

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

// Running Active Cron Jobs=>>>>>
CronJob.find()
  .then((activeJobs) => {
    console.log("Found ", activeJobs.length, " Jobs");
    activeJobs.forEach(({ id, ended_at }) => {
      schedule.scheduleJob(
        id,
        ended_at,
        function (id) {
          CronJob.findOneAndRemove({ id }).then((job) => {
            const { id, type } = job;

            if (type == "FRIEND")
              Friend.findByIdAndUpdate(
                id,
                { $set: { connected: false } },
                { new: true }
              ).then((result) => {});
            else if (type == "GROUP") {
              const { phone, team_id } = job._group;
              Team.findByIdAndUpdate(
                team_id,
                { $set: { "team_members.$[member].connected": false } },
                { arrayFilters: [{ "member.phone": phone }], new: true }
              )
                .then((result) => console.log("DISCONNECTED"))
                .catch((err) => console.log(err));
            } else
              User.findByIdAndUpdate(
                id,
                { $set: { status: true } },
                { new: true }
              ).then((result) => {});
          });
        }.bind(null, id)
      );
    });
  })
  .catch((err) => {});
