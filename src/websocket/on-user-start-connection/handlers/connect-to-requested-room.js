const rooms = require("../../../persistance/rooms");
const { sendErrorMessageToUser } = require("../../connected-users");

const connectToRequestedRoom = (user, { data: { roomKey } }) => {
  const roomToAddUserTo = rooms.findRoomByKey(roomKey);
  if (!roomToAddUserTo) {
    return sendErrorMessageToUser(user, "There is no room for the give key");
  }

  rooms.addUserToRoom(roomToAddUserTo.id, user);
};

module.exports = connectToRequestedRoom;
