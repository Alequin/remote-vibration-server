const { forEach, find, size, isNil } = require("lodash");
const { v4: uuidv4 } = require("uuid");
const newRoomKey = require("./new-room-key");
const assert = require("assert");

const rooms = {};

const forEachRoom = (forASingleRoom) => forEach(rooms, forASingleRoom);

const createRoom = (creatorDeviceId) => {
  assert(!isNil(creatorDeviceId));

  const room = {
    id: uuidv4(),
    key: newUniqueRoomKey(),
    userIds: [],
    creatorDeviceId,
  };

  rooms[room.id] = room;
  return rooms[room.id];
};

const newUniqueRoomKey = () => {
  const keySize = 6;
  let keyToUse = newRoomKey({ size: keySize });

  // It's unlikely that a key will be a duplicate but just in case
  // check against other existing rooms and retry if it's not unique
  let attemptsToFindUniqueKey = 0;
  while (findRoomByKey(keyToUse)) {
    attemptsToFindUniqueKey++;
    if (attemptsToFindUniqueKey > 100) {
      throw new Error("Unable to create a unique room key");
    }

    keyToUse = newRoomKey({ size: keySize });
  }

  return keyToUse;
};

const findRoomById = (roomId) => rooms[roomId];
const findRoomByUser = ({ id }) =>
  find(rooms, (room) => room.userIds.some((userId) => userId === id));
const findRoomByKey = (roomKey) => find(rooms, (room) => room.key === roomKey);

const addUserToRoom = (roomId, user) => {
  const room = findRoomById(roomId);
  room.userIds.push(user.id);
};

const findRoomByCreatorId = (creatorDeviceId) =>
  find(rooms, (room) => room.creatorDeviceId === creatorDeviceId);

const countOpenRooms = () => size(rooms);

const removeRoom = (roomId) => delete rooms[roomId];

const removeUserFromAllRooms = (user) =>
  forEachRoom(
    (room) =>
      (room.userIds = room.userIds.filter((userId) => userId !== user.id))
  );

const removeAllRooms = () => forEachRoom(({ id }) => removeRoom(id));

module.exports = {
  createRoom,
  findRoomById,
  findRoomByUser,
  findRoomByKey,
  findRoomByCreatorId,
  addUserToRoom,
  forEachRoom,
  removeRoom,
  removeUserFromAllRooms,
  removeAllRooms,
  countOpenRooms,
};
