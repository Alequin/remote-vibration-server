const { forEach } = require("lodash");
const { v4: uuidv4 } = require("uuid");

const rooms = {};

const forEachRoom = (forASingleRoom) => forEach(rooms, forASingleRoom);

const createRoom = () => {
  const room = {
    id: uuidv4(),
    users: [],
  };

  rooms[room.id] = room;
  return rooms[room.id];
};

const findRoom = (roomId) => rooms[roomId];

const removeRoom = (roomId) => delete rooms[roomId];

const removeAllRooms = () => forEachRoom(({ id }) => removeRoom(id));

module.exports = { createRoom, findRoom, removeRoom, removeAllRooms };
