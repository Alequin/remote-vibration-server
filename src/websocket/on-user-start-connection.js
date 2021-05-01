const { isPlainObject, isError } = require("lodash");
const logger = require("../logger");
const connectedUsers = require("./connected-users");
const messageHandlers = require("./on-user-start-connection/message-handlers");
const parseJsonWithErrorHandling = require("./on-user-start-connection/parse-json-with-error-handling");

const onUserStartConnection = (wss) => {
  wss.on("connection", (client) => {
    const currentUser = connectedUsers.connectedUsersList.addUser(client);

    currentUser.client.on("message", onUserReceivedMessage(currentUser));

    currentUser.client.on("pong", () =>
      connectedUsers.markUserAsHavingReceivePong(currentUser)
    );
  });
};

const onUserReceivedMessage = (currentUser) => async (message) => {
  const parsedMessage = parseJsonWithErrorHandling(message);

  if (isError(parsedMessage) || !isMessageValid(message, parsedMessage)) {
    logger.warn(
      `User disconnected to due to an invalid message / Message: ${message}`
    );
    return connectedUsers.connectedUsersList.removeUser(currentUser);
  }

  const handler = messageHandlers[parsedMessage.type];

  if (!handler) {
    logger.warn(
      `User disconnected to due an unrecognized message type / Message: ${message}`
    );
    return connectedUsers.connectedUsersList.removeUser(currentUser);
  }

  try {
    await handler(currentUser, parsedMessage);
  } catch (error) {
    logger.error(error);
  }
};

const isMessageValid = (message, parsedMessage) =>
  Buffer.byteLength(message, "utf8") < 300 &&
  isPlainObject(parsedMessage) &&
  typeof parsedMessage.type === "string";

module.exports = onUserStartConnection;
