const messageTypes = require("./message-types");

const messageHandlers = {
  [messageTypes.connectToRoom]: require("./handlers/connect-to-requested-room"),
  [messageTypes.sendVibrationPattern]: require("./handlers/send-vibration-pattern"),
};

module.exports = messageHandlers;
