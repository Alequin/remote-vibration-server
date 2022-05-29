const logger = require("../../logger");
const connectedUsers = require("../connected-users");

const disconnectInactiveUsers = async (wss, connectedUsersList, user) => {
  const hasUserDisconnected = !wss.clients.has(user.client);
  if (hasUserDisconnected) {
    logger.info(
      `Cleaning up user: their client has already been disconnected / Id: ${user.id}`
    );
    return await disconnect(connectedUsersList, user);
  }

  // If user is not idle nothing else matters
  const isUserIdle = connectedUsers.isUserIdle(user);
  if (!isUserIdle) return;

  const hasFailedToReceivedPong = !connectedUsers.hasReceivedPongFromUser(user);
  if (hasFailedToReceivedPong) {
    logger.info(
      `Cleaning up user: Pong response has not been received / Id: ${user.id}`
    );
    return await disconnect(connectedUsersList, user);
  }
  // if user is idle but has received pong do not disconnect
  // TODO in future only rely on idle state
  if (hasFailedToReceivedPong) return;

  logger.info(
    `Cleaning up user: User has been idle for too long / Id: ${user.id}`
  );
  return await disconnect(connectedUsersList, user);
};

const disconnect = async (connectedUsersList, user) => {
  await connectedUsersList.removeUser(user);
};

module.exports = disconnectInactiveUsers;
