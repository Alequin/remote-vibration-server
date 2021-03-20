const connectedUsers = require("./connected-users");

const pingClients = (
  connectedUsersList,
  { interval, onPingUser, onDisconnect }
) => {
  const pingInterval = setInterval(() => {
    connectedUsersList.forEachUser((user) => {
      if (!connectedUsers.isUserConnectionAlive(user))
        return onDisconnect(connectedUsersList.removeUser(user));

      connectedUsers.setConnectionStatusAsDead(user);
      user.client.ping(() => onPingUser && onPingUser(user));
    });
  }, interval);

  return { stop: () => clearInterval(pingInterval) };
};

module.exports = pingClients;
