const rooms = require("../../../persistance/rooms");
const {
  sendErrorMessageToUser,
  sendMessageToUser,
} = require("../../connected-users");
const messageTypes = require("../message-types");

const connectToRequestedRoom = (user, { data: { roomKey } }) => {
  // TODO validate roomKey chars do not include anything invalid
  const roomToAddUserTo = rooms.findRoomByKey(roomKey);
  if (!roomToAddUserTo) {
    return sendErrorMessageToUser(user, "There is no room for the given key");
  }

  rooms.addUserToRoom(roomToAddUserTo.id, user);
  sendMessageToUser(user, { type: messageTypes.confirmRoomConnection });
};

module.exports = connectToRequestedRoom;
