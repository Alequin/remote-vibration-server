const {
  checkRoomsInterval,
} = require("./check-if-rooms-are-abandoned/check-rooms-interval");
const rooms = require("../persistance/rooms");

const checkIfRoomsAreAbandoned = () => {
  const interval = setInterval(
    async () =>
      Promise.all([
        rooms.removeAbandonedRooms(),
        rooms.markRoomsWithUsersAsActive(),
      ]),
    checkRoomsInterval()
  );

  return { stop: () => clearInterval(interval) };
};

module.exports = checkIfRoomsAreAbandoned;
