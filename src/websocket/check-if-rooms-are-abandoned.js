const {
  checkRoomsInterval,
} = require("./check-if-rooms-are-abandoned/check-rooms-interval");
const rooms = require("../persistance/rooms");

const checkIfRoomsAreAbandoned = () => {
  cleanUpRooms();
  const interval = setInterval(cleanUpRooms, checkRoomsInterval());

  return { stop: () => clearInterval(interval) };
};

const cleanUpRooms = async () => {
  await rooms.markRoomsWithUsersAsActive();
  await rooms.removeAbandonedRooms();
};

module.exports = checkIfRoomsAreAbandoned;
