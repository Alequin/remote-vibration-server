const rooms = require("../../persistance/rooms");

const createRoom = (app) => {
  /* TODO
     - Should stop the same person from creating multiple rooms
  */

  app.post("/room", (_, res) => {
    const { id } = rooms.createRoom();
    res.json({ newRoomId: id });
  });
};

module.exports = { createRoom };
