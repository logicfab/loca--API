const { Friend } = require("../src/models/Friend");
let geoLib = require("geo-lib");

const myFriends = async (user) => {
  try {
    const nearestFriends = [];
    const friends = await Friend.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { "user1.phone": user.phone },
                { "user2.phone": user.phone },
              ],
            },
            { status: "Accepted" },
            // { connected: true },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          let: { phone: "$user1.phone" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$phone", "$phone"] } } },
            { $project: { password: 0 } },
          ],
          as: "user1",
        },
      },
      { $unwind: { path: "$user1" } },
      {
        $lookup: {
          from: "users",
          let: { phone: "$user2.phone" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$phone", "$phone"] } } },
            { $project: { password: 0 } },
          ],
          as: "user2",
        },
      },
      { $unwind: { path: "$user2" } },
      { $sort: { connected: -1 } },
    ]);

    friends.forEach((friend) => {
      const other = friend.user1._id == user._id ? friend.user1 : friend.user2;

      let { distance } = geoLib.distance({
        p1: {
          lat: user.location.lat,
          lon: user.location.lng,
        },
        p2: {
          lat: other.location.lat,
          lon: other.location.lng,
        },
      });
      if (distance < user.detection_radius * 1000) nearestFriends.push(other);
    });

    return {
      nearestFriends,
      friends: friends.map((friend) =>
        friend.user1._id == user._id ? friend.user1 : friend.user2
      ),
    };
  } catch (error) {
    throw error;
  }
};

module.exports = { myFriends };
