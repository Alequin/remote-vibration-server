const rooms = require("../../persistance/rooms");
const { connectedUsersList } = require("../../websocket/connected-users");

const sendMessage = (currentUser, message) => {
  const room = rooms.findRoomByUser(currentUser);
  room.usersIds.forEach((userId) => {
    if (userId.id === currentUser.id) return;
    const user = connectedUsersList.findUserById(userId);
    user.client.send(JSON.stringify({ message: message.data.message }));
  });
};

module.exports = sendMessage;
