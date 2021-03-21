const { sendErrorMessageToUser } = require("../connected-users");
const connectToRequestedRoom = require("./connect-to-requested-room");
const sendMessage = require("./send-message");

const processMessage = (currentUser, message) => {
  const handler = messageHandlers[message.type];
  handler
    ? handler(currentUser, message)
    : sendErrorMessageToUser(currentUser, "unknown message type");
};
const messageHandlers = {
  connectToRoom: connectToRequestedRoom,
  sendMessage,
};

module.exports = processMessage;
