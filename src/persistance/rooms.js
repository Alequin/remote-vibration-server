const { forEach, find } = require("lodash");
const { v4: uuidv4 } = require("uuid");

const rooms = {};

const forEachRoom = (forASingleRoom) => forEach(rooms, forASingleRoom);

const createRoom = () => {
  const room = {
    id: uuidv4(),
    usersIds: [],
  };

  rooms[room.id] = room;
  return rooms[room.id];
};

const findRoomById = (roomId) => rooms[roomId];
const findRoomByUser = ({ id }) => {
  return find(rooms, (room) => room.usersIds.some((userId) => userId === id));
};

const addUserToRoom = (roomId, user) => {
  const room = findRoomById(roomId);
  room.usersIds.push(user.id);
};

const removeRoom = (roomId) => delete rooms[roomId];

const removeAllRooms = () => forEachRoom(({ id }) => removeRoom(id));

module.exports = {
  createRoom,
  findRoomById,
  findRoomByUser,
  addUserToRoom,
  removeRoom,
  removeAllRooms,
};
