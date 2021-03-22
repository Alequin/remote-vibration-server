const rooms = require("../../../persistance/rooms");
const {
  connectedUsersList,
  sendMessageToUser,
} = require("../../connected-users");

const sendVibrationPattern = (currentUser, message) => {
  const room = rooms.findRoomByUser(currentUser);
  room.usersIds.forEach((userId) => {
    if (userId.id === currentUser.id) return;
    const user = connectedUsersList.findUserById(userId);
    sendMessageToUser(user, { ...message.data });
  });
};

module.exports = sendVibrationPattern;
