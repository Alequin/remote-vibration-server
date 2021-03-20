const connectToRequestedRoom = require("./connect-to-requested-room");

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
};

module.exports = processMessage;
