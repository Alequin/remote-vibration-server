const rooms = require("../../../persistance/rooms");
const {
  connectedUsersList,
  sendMessageToUser,
} = require("../../connected-users");

const sendMessage = (currentUser, message) => {
  const room = rooms.findRoomByUser(currentUser);
  room.userIds.forEach((userId) => {
    if (userId.id === currentUser.id) return;
    const user = connectedUsersList.findUserById(userId);
    sendMessageToUser(user, { text: message.data.text });
  });
};

module.exports = sendMessage;