const rooms = require("../../persistance/rooms");

const createRoom = (app) => {
  app.post("/room", async (req, res) => {
    const creatorDeviceId = req.header("deviceId");
    const previouslyCreatedRoom = await rooms.findRoomByCreatorId(
      creatorDeviceId
    );
    if (previouslyCreatedRoom)
      return res.json({ password: previouslyCreatedRoom.password });

    const { password } = await rooms.createRoom(creatorDeviceId);
    res.json({ password });
  });
};

module.exports = { createRoom };
