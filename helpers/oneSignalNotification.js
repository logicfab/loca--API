const e = require("express");
const OneSignal = require("onesignal-node");

const client = new OneSignal.Client(
  "5c60d56a-599a-404e-b4a4-debc26fa4409",
  "MWQwZTQxYWEtYWQ2MC00ODJmLWFkMWEtNTIxM2QxNWRkNDMz",
  "ZWQ3NTU5ZWItYmI3ZC00MjVhLWE0NDQtZjBkNWViN2MyNjM1"
);

const first_aid_cleint = new OneSignal.Client(
  "0c89b38e-7fa9-42fc-902d-0fc5328fff69",
  "NzllYzg0MmUtNDg0OC00OTI1LThkN2YtMzhmMmNlNmIxODVm",
  "ZWQ3NTU5ZWItYmI3ZC00MjVhLWE0NDQtZjBkNWViN2MyNjM1"
);

module.exports = {
  sendNotification: async (
    heading,
    message,
    data,
    participantsIds,
    users,
    type
  ) => {
    // console.log(participantsIds);
    console.log(type, ":TYPE");
    const notification = {
      headings: { en: heading },
      contents: {
        en: message,
      },
      // ios_sound: "moneySound.wav",
      // android_sound: "moneysound.mp3",
      // android_channel_id: "c4d53421-e4b3-4e58-b7f0-a7418cca9f59",
      data,
      include_player_ids: participantsIds,
    };
    // console.log(data);
    // console.log("sending notification");
    ///
    try {
      // Sending to USER
      if (type === 1) {
        // Sending to USER
        console.log("TYPE 1");
        const response = await client.createNotification(notification);
      } else if (type === 2) {
        // Sending to FIRST_AID_TEAM
        console.log("TYPE 2");
        const response1 = await first_aid_cleint.createNotification(
          notification
        );
      }
      // console.log(response.body.id);
      // console.log("notification sent");
    } catch (e) {
      if (e instanceof OneSignal.HTTPError) {
        // When status code of HTTP response is not 2xx, HTTPError is thrown.
        console.log("ERROR IN SENDING THE NOTIFICATION----> ", e);
        console.log(e.statusCode);
        console.log(e.body);
      }
    }
    //
    // console.log(participant.one_signal)
  },
};
