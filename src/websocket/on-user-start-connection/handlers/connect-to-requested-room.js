const rooms = require("../../../persistance/rooms");
const {
  sendErrorMessageToUser,
  sendMessageToUser,
} = require("../../connected-users");
const messageTypes = require("../message-types");

const connectToRequestedRoom = async (user, { data: { password } }) => {
  if (!password || !validateRoomPassword(password)) {
    sendErrorMessageToUser(user, "password is invalid");
    throw new Error(
      `To connect to a room a valid password must be given / Given Password: ${password}`
    );
  }

  const roomToAddUserTo = await rooms.findRoomByKey(password.toLowerCase());

  if (!roomToAddUserTo) {
    return sendErrorMessageToUser(user, "password does not exist");
  }

  await rooms.removeUserFromAllRooms(user);
  await rooms.addUserToRoom(roomToAddUserTo.id, user);

  sendMessageToUser(user, { type: messageTypes.confirmRoomConnection });
};

const validRoomPasswordFormat = /^[a-z]*\s[a-z]*$/i;
const validateRoomPassword = (password) =>
  validRoomPasswordFormat.test(password);

module.exports = connectToRequestedRoom;
