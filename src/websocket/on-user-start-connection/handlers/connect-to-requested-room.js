const rooms = require("../../../persistance/rooms");
const {
  sendErrorMessageToUser,
  sendMessageToUser,
} = require("../../connected-users");
const messageTypes = require("../message-types");

const connectToRequestedRoom = async (user, { data: { password } }) => {
  if (!password)
    throw new Error(
      `To connect to a room a password must be passed / Given Password: ${password}`
    );

  // TODO validate password chars do not include anything invalid
  const roomToAddUserTo = await rooms.findRoomByKey(password.toLowerCase());

  if (!roomToAddUserTo) {
    return sendErrorMessageToUser(user, "There is no room for the given key");
  }

  await rooms.addUserToRoom(roomToAddUserTo.id, user);
  sendMessageToUser(user, { type: messageTypes.confirmRoomConnection });
};

module.exports = connectToRequestedRoom;
