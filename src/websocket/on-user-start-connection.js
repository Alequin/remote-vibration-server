const { isPlainObject, isError } = require("lodash");
const connectedUsers = require("./connected-users");
const messageHandlers = require("./on-user-start-connection/message-handlers");

const onUserStartConnection = (wss, connectedUsersList) => {
  wss.on("connection", (client) => {
    const currentUser = connectedUsersList.addUser(client);

    currentUser.client.on("message", async (message) => {
      const parsedMessage = parseMessage(message);

      if (isError(parsedMessage) || !isMessageValid(message, parsedMessage)) {
        // TODO log bad messages
        // disconnect users who send non json or non valid messages
        return connectedUsersList.removeUser(currentUser);
      }

      const handler = messageHandlers[parsedMessage.type];

      if (!handler) {
        // TODO log invalid handlers requests
        // Disconnect users who send unusable messages
        return connectedUsersList.removeUser(currentUser);
      }

      try {
        await handler(currentUser, parsedMessage);
      } catch (error) {
        // TODO add error logging
      }
    });

    currentUser.client.on("pong", () => {
      connectedUsers.setReceivedPongStatus(currentUser, true);
    });
  });
};

const parseMessage = (message) => {
  try {
    return JSON.parse(message);
  } catch (error) {
    return error;
  }
};

const isMessageValid = (message, parsedMessage) =>
  Buffer.byteLength(message, "utf8") < 300 &&
  isPlainObject(parsedMessage) &&
  typeof parsedMessage.type === "string";

module.exports = onUserStartConnection;
