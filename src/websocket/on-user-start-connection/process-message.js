const connectToRequestedRoom = require("./connect-to-requested-room");
const sendMessage = require("./send-message");

const processMessage = (currentUser, message) => {
  const handler = messageHandlers[message.type];
  if (!handler) {
    return currentUser.client.send(
      JSON.stringify({ error: "unknown message type" })
    );
  }
  return handler(currentUser, message);
};
const messageHandlers = {
  connectToRoom: connectToRequestedRoom,
  sendMessage,
};

module.exports = processMessage;
