const connectedUsers = require("../connected-users");

const disconnectInactiveUsers = (wss, connectedUsersList, user) => {
  const hasUserDisconnected = !wss.clients.has(user.client);
  const hasFailedToReceivedPong = !connectedUsers.hasReceivedPongFromUser(user);
  if (hasUserDisconnected || hasFailedToReceivedPong) {
    connectedUsersList.removeUser(user);
  }
};

module.exports = disconnectInactiveUsers;
