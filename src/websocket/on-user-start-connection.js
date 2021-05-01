const { isPlainObject, isError } = require("lodash");
const logger = require("../logger");
const connectedUsers = require("./connected-users");
const messageHandlers = require("./on-user-start-connection/message-handlers");

const onUserStartConnection = (wss, connectedUsersList) => {
  wss.on("connection", (client) => {
    const currentUser = connectedUsersList.addUser(client);

    currentUser.client.on("message", async (message) => {
      const parsedMessage = parseMessage(message);

      if (isError(parsedMessage) || !isMessageValid(message, parsedMessage)) {
        logger.warn(
          `User disconnected to due to an invalid message / Message: ${message}`
        );
        return connectedUsersList.removeUser(currentUser);
      }

      const handler = messageHandlers[parsedMessage.type];

      if (!handler) {
        logger.warn(
          `User disconnected to due an unrecognized message type / Message: ${message}`
        );
        return connectedUsersList.removeUser(currentUser);
      }

      try {
        await handler(currentUser, parsedMessage);
      } catch (error) {
        logger.error(error);
      }
    });

    currentUser.client.on("pong", () =>
      connectedUsers.markUserAsHavingReceivePong(currentUser)
    );
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
