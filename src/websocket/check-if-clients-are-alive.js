const disconnectInactiveUsers = require("./check-if-clients-are-alive/disconnect-inactive-users");
const pingActiveUsers = require("./check-if-clients-are-alive/ping-active-users");

const checkIfClientsAreAlive = (
  wss,
  connectedUsersList,
  { interval, onPingUser, onDisconnect }
) => {
  const pingInterval = setInterval(() => {
    connectedUsersList.forEachUser((user) =>
      disconnectInactiveUsers(wss, connectedUsersList, user, onDisconnect)
    );
    connectedUsersList.forEachUser((user) => pingActiveUsers(user, onPingUser));
  }, interval);

  return { stop: () => clearInterval(pingInterval) };
};

module.exports = checkIfClientsAreAlive;
