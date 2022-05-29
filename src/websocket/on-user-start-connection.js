const { isPlainObject, isError, isString } = require("lodash");
const logger = require("../logger");
const connectedUsers = require("./connected-users");
const messageHandlers = require("./on-user-start-connection/message-handlers");
const parseJsonWithErrorHandling = require("./on-user-start-connection/parse-json-with-error-handling");
const isAuthTokenValid = require("../server/check-auth-token");

const onUserStartConnection = (wss) => {
  wss.on("connection", (client, req) => {
    // Query string used as connections from mobile seem to pass custom headers to the server
    const authToken = authTokenFromSearchParams(req.url);
    if (!isAuthTokenValid(authToken)) {
      logger.error("Client attempt to connect without an auth token");
      client.terminate();
      return;
    }

    const currentUser = connectedUsers.connectedUsersList.addUser(client);

    currentUser.client.on("message", onReceivedMessageFromUser(currentUser));

    currentUser.client.on("pong", () =>
      connectedUsers.markUserAsHavingReceivePong(currentUser)
    );

    logger.info(`User connected: ${currentUser.id}`);
  });
};

const onReceivedMessageFromUser = (currentUser) => async (message) => {
  connectedUsers.updateUsersLastActiveTime(currentUser);

  const parsedMessage = parseJsonWithErrorHandling(message);

  if (isError(parsedMessage)) {
    logger.warn(
      `User disconnected to due to an invalid message, unable to parse / Message: ${message}`
    );
    return connectedUsers.connectedUsersList.removeUser(currentUser);
  }

  const { invalidMessageReason } = isMessageValid(message, parsedMessage);
  if (invalidMessageReason) {
    logger.warn(
      `User disconnected to due to an invalid message, bad message data / Reason: ${invalidMessageReason}, Message: ${message}`
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

const authTokenFromSearchParams = (url) =>
  new URLSearchParams(url.replace(/^.*\?/, "")).get("authToken");

const isMessageValid = (message, parsedMessage) => {
  if (isMessageToLarge(message)) {
    return {
      isValid: false,
      invalidMessageReason: "Message too large",
    };
  }

  if (!isPlainObject(parsedMessage)) {
    return {
      isValid: false,
      invalidMessageReason: "Message is not a plain object",
    };
  }

  if (!isString(parsedMessage.type)) {
    return {
      isValid: false,
      invalidMessageReason: "Message type is not usable",
    };
  }

  return {
    isMessageValid: true,
  };
};

const MAX_MESSAGE_SIZE_IN_BYTES = 1000;
const isMessageToLarge = (message) =>
  Buffer.byteLength(message, "utf8") > MAX_MESSAGE_SIZE_IN_BYTES;

module.exports = onUserStartConnection;
