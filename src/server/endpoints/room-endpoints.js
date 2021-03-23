const rooms = require("../../persistance/rooms");

const createRoom = (app) => {
  /* TODO
     - Should stop the same person from creating multiple rooms
  */

  app.post("/room", (req, res) => {
    const creatorDeviceId = req.header("deviceId");
    const previouslyCreatedRoom = rooms.findRoomByCreatorId(creatorDeviceId);
    if (previouslyCreatedRoom)
      return res.json({ roomKey: previouslyCreatedRoom.key });

    const { key } = rooms.createRoom(creatorDeviceId);
    res.json({ roomKey: key });
  });
};

module.exports = { createRoom };
