const rooms = require("../../persistance/rooms");

const createRoom = (app) => {
  app.post("/room", (_, res) => {
    const { id } = rooms.createRoom();
    res.json({ newRoomId: id });
  });
};

module.exports = { createRoom };
