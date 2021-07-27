const {
  checkRoomsInterval,
} = require("./check-if-rooms-are-abandoned/check-rooms-interval");
const rooms = require("../persistance/rooms");

const checkIfRoomsAreAbandoned = () => {
  const interval = setInterval(async () => {
    await rooms.markRoomsWithUsersAsActive();
    await rooms.removeAbandonedRooms();
  }, checkRoomsInterval());

  return { stop: () => clearInterval(interval) };
};

module.exports = checkIfRoomsAreAbandoned;
