const rooms = require("../../persistance/rooms");

const createRoom = (app) => {
  /* TODO
     - Should stop the same person from creating multiple rooms
  */

  app.post("/room", (_, res) => {
    const { id, key } = rooms.createRoom();
    res.json({ roomId: id, roomKey: key });
  });
};

module.exports = { createRoom };
