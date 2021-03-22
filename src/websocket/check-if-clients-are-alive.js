const {
  checkAliveClientsInterval,
} = require("./check-if-clients-are-alive/check-alive-clients-interval");
const disconnectInactiveUsers = require("./check-if-clients-are-alive/disconnect-inactive-users");
const pingActiveUsers = require("./check-if-clients-are-alive/ping-active-users");

const checkIfClientsAreAlive = (wss, connectedUsersList) => {
  const pingInterval = setInterval(() => {
    connectedUsersList.forEachUser((user) =>
      disconnectInactiveUsers(wss, connectedUsersList, user)
    );
    connectedUsersList.forEachUser((user) => pingActiveUsers(user));
  }, checkAliveClientsInterval());

  return { stop: () => clearInterval(pingInterval) };
};

module.exports = checkIfClientsAreAlive;
