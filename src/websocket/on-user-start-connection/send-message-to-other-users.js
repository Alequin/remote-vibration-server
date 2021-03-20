const WebSocket = require("ws");
const connectedUsers = require("../connected-users");

const sendMessageToOtherUsers = ({ id, client }, currentUser, data) => {
  const isSender = id === currentUser.id;
  const isConnectionOpen = currentUser.client.readyState === WebSocket.OPEN;
  if (!isSender && isConnectionOpen) client.send(data);
};

module.exports = sendMessageToOtherUsers;
