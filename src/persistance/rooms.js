const { isNil, isEmpty } = require("lodash");
const newRoomKey = require("./new-room-key");
const assert = require("assert");
const insertNewRoom = require("./queries/insert-new-room");
const selectFromRooms = require("./queries/select-from-rooms");
const updateRooms = require("./queries/update-rooms");
const deleteFromRooms = require("./queries/delete-from-rooms");
const logger = require("../logger");

const createRoom = async (creatorDeviceId) => {
  assert(!isNil(creatorDeviceId));

  return await insertNewRoom({
    password: await newUniqueRoomKey(),
    creatorDeviceId,
  });
};

const newUniqueRoomKey = async () => {
  const keySize = 6;
  let keyToUse = newRoomKey({ size: keySize });

  // It's unlikely that a key will be a duplicate but just in case
  // check against other existing rooms and retry if it's not unique
  let attemptsToFindUniqueKey = 0;
  while (!isEmpty(await findRoomByKey(keyToUse))) {
    attemptsToFindUniqueKey++;
    if (attemptsToFindUniqueKey > 100) {
      throw new Error("Unable to create a unique room key");
    }

    keyToUse = newRoomKey({ size: keySize });
  }

  return keyToUse;
};

const findRoomById = async (roomId) => selectFromRooms.byRoomId(roomId);
const findRoomByUser = async ({ id }) => {
  const room = await selectFromRooms.byUserId(id);
  if (!room) {
    throw new Error(`Unable to find a room for the user with an id of ${id}`);
  }
  return room;
};
const findRoomByKey = async (password) => selectFromRooms.byPassword(password);
const findRoomByCreatorId = (creatorDeviceId) =>
  selectFromRooms.byCreatorId(creatorDeviceId);

const addUserToRoom = async (roomId, user) =>
  updateRooms.addUserToRoom({ roomId, userIdToAdd: user.id });
const removeUserFromAllRooms = async (user) =>
  updateRooms.removeUserFromAllRooms(user.id);
const markRoomsWithUsersAsActive = async () =>
  updateRooms.updateLastActiveDateForRoomsWithUsers();

const removeRoom = async (roomId) => deleteFromRooms.deleteRoomById(roomId);
const removeAbandonedRooms = async () => deleteFromRooms.deleteAbandonedRooms();

module.exports = {
  createRoom,
  findRoomById,
  findRoomByUser,
  findRoomByKey,
  findRoomByCreatorId,
  addUserToRoom,
  removeAbandonedRooms,
  removeRoom,
  removeUserFromAllRooms,
  markRoomsWithUsersAsActive,
};
