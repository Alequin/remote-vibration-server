const { sendErrorMessageToUser } = require("../connected-users");
const messageTypes = require("./message-types");

const processMessage = async (currentUser, message) => {
  const handler = messageHandlers[message.type];
  handler
    ? await handler(currentUser, message)
    : sendErrorMessageToUser(currentUser, "unknown message type");
};

const messageHandlers = {
  [messageTypes.connectToRoom]: require("./handlers/connect-to-requested-room"),
  [messageTypes.sendVibrationPattern]: require("./handlers/send-vibration-pattern"),
};

module.exports = processMessage;
