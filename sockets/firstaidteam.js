const FirstAidTeam = require("../src/models/FirstAidTeam");

let events_list = {
  UPDATE_TEAM_LOCATION: "UPDATE_TEAM_LOCATION",
  HELP_NEEDED: "FIRSTAID_HELP_NEEDED",
};

const firstAidTeam = (io, socket) => {
  socket.on(events_list.UPDATE_TEAM_LOCATION, async (payload) => {
    const { team_id, location } = payload;

    try {
      const teamExists = await FirstAidTeam.findById(team_id);
      if (!teamExists) {
        throw {
          status: false,
          msg: "Team does not exist!",
        };
      }

      location.lastUpdate = new Date();

      const response = await FirstAidTeam.findByIdAndUpdate(
        team_id,
        {
          location,
        },
        { new: true, upsert: true }
      );

      if (!response) {
        throw {
          status: false,
          msg: "Unable to update location!",
        };
      }
      socket.emit(events_list.UPDATE_TEAM_LOCATION, response);
    } catch (err) {
      socket.emit(
        events_list.UPDATE_TEAM_LOCATION,
        err.message ? err.message : err
      );
    }
  });
};

module.exports = { firstAidTeam };
