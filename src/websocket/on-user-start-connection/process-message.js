const { sendErrorMessageToUser } = require("../connected-users");
const connectToRequestedRoom = require("./connect-to-requested-room");
const messageTypes = require("./message-types");
const sendMessage = require("./send-message");

const processMessage = (currentUser, message) => {
  const handler = messageHandlers[message.type];
  handler
    ? handler(currentUser, message)
    : sendErrorMessageToUser(currentUser, "unknown message type");
};
const messageHandlers = {
  [messageTypes.connectToRoom]: connectToRequestedRoom,
  [messageTypes.sendMessage]: sendMessage,
};

module.exports = processMessage;
