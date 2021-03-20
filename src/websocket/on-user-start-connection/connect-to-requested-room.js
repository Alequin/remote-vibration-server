const rooms = require("../../persistance/rooms");

const connectToRequestedRoom = (user, { data: { roomId } }) => {
  rooms.addUserToRoom(roomId, user);
};

module.exports = connectToRequestedRoom;
