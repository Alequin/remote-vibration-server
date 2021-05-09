const connectedUsers = require("../connected-users");

const disconnectInactiveUsers = async (wss, connectedUsersList, user) => {
  if (isUserInactive(wss, connectedUsers, user))
    await disconnect(connectedUsersList, user);
};

const isUserInactive = (wss, connectedUsers, user) => {
  const hasUserDisconnected = !wss.clients.has(user.client);
  const hasFailedToReceivedPong = !connectedUsers.hasReceivedPongFromUser(user);
  return (
    hasUserDisconnected ||
    hasFailedToReceivedPong ||
    connectedUsers.isUserIdle(user)
  );
};

const disconnect = async (connectedUsersList, user) => {
  await connectedUsersList.removeUser(user);
};

module.exports = disconnectInactiveUsers;
