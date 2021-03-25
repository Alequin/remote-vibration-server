const { isEmpty } = require("lodash");
const toMilliseconds = require("../to-milliseconds");
const {
  checkRoomsInterval,
} = require("./check-if-rooms-are-abandoned/check-rooms-interval");

const checkIfRoomsAreAbandoned = (rooms) => {
  const interval = setInterval(() => {
    removeAbandonedRooms(rooms);
    updateLastValidCheckTimes(rooms);
  }, checkRoomsInterval());

  return { stop: () => clearInterval(interval) };
};

const removeAbandonedRooms = (rooms) =>
  findAbandonedRooms(rooms).forEach((roomId) => rooms.removeRoom(roomId));

const findAbandonedRooms = (rooms) => {
  const roomsIdsToRemove = [];
  rooms.forEachRoom((room) => {
    const haveAllUsersDisconnected = isEmpty(room.userIds);
    const hasRoomTimedOut =
      new Date().getTime() - new Date(room.lastValidCheckTime).getTime() >
      toMilliseconds.minutes(30);

    const canDeleteRoom = haveAllUsersDisconnected && hasRoomTimedOut;

    if (canDeleteRoom) roomsIdsToRemove.push(room.id);
  });
  return roomsIdsToRemove;
};

const updateLastValidCheckTimes = (rooms) =>
  rooms.forEachRoom((room) => {
    const isAtLeastOneUserConnected = !isEmpty(room.userIds);
    if (isAtLeastOneUserConnected) room.lastValidCheckTime = new Date();
  });

module.exports = checkIfRoomsAreAbandoned;
