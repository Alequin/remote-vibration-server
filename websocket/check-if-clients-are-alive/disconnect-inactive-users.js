const connectedUsers = require("../connected-users");

const disconnectInactiveUsers = (
  wss,
  connectedUsersList,
  user,
  onDisconnect
) => {
  const hasUserDisconnected = !wss.clients.has(user.client);
  const hasFailedToReceivedPong = !connectedUsers.hasReceivedPongFromUser(user);
  if (hasUserDisconnected || hasFailedToReceivedPong)
    return onDisconnect(connectedUsersList.removeUser(user));
};

module.exports = disconnectInactiveUsers;
