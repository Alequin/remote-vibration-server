const rooms = require("../../persistance/rooms");
const {
  connectedUsersList,
  sendMessageToUser,
} = require("../../websocket/connected-users");

const sendMessage = (currentUser, message) => {
  const room = rooms.findRoomByUser(currentUser);
  room.usersIds.forEach((userId) => {
    if (userId.id === currentUser.id) return;
    const user = connectedUsersList.findUserById(userId);
    sendMessageToUser(user, { text: message.data.message });
  });
};

module.exports = sendMessage;
