const connectedUsers = require("./connected-users");

const checkIfClientsAreAlive = (
  wss,
  connectedUsersList,
  { interval, onPingUser, onDisconnect }
) => {
  const pingInterval = setInterval(() => {
    connectedUsersList.forEachUser((user) => {
      const hasUserDisconnected = !wss.clients.has(user.client);
      const hasFailedToReceivedPong = !connectedUsers.hasReceivedPongFromUser(
        user
      );
      if (hasUserDisconnected || hasFailedToReceivedPong)
        return onDisconnect(connectedUsersList.removeUser(user));

      connectedUsers.setReceivedPongStatus(user, false);
      user.client.ping(() => onPingUser && onPingUser(user));
    });
  }, interval);

  return { stop: () => clearInterval(pingInterval) };
};

module.exports = checkIfClientsAreAlive;
