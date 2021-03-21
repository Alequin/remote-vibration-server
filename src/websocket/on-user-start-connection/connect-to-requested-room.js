const rooms = require("../../persistance/rooms");

const connectToRequestedRoom = (user, { data: { roomKey } }) => {
  const roomToAddUserTo = rooms.findRoomByKey(roomKey);
  rooms.addUserToRoom(roomToAddUserTo.id, user);
};

module.exports = connectToRequestedRoom;
