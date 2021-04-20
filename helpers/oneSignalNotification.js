const OneSignal = require("onesignal-node");

const client = new OneSignal.Client(
  "5c60d56a-599a-404e-b4a4-debc26fa4409",
  "MWQwZTQxYWEtYWQ2MC00ODJmLWFkMWEtNTIxM2QxNWRkNDMz",
  "ZWQ3NTU5ZWItYmI3ZC00MjVhLWE0NDQtZjBkNWViN2MyNjM1"
);

module.exports = {
  sendNotification: async (heading, message, data, participantsIds) => {
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
    console.log("sending notification");
    ///
    try {
      const response = await client.createNotification(notification);
      // console.log(response.body.id);
      console.log("notification sent");
    } catch (e) {
      if (e instanceof OneSignal.HTTPError) {
        // When status code of HTTP response is not 2xx, HTTPError is thrown.
        console.log(e.statusCode);
        console.log(e.body);
      }
    }
    //
    // console.log(participant.one_signal)
  },
};
