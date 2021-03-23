const { removeUserFromAllRooms } = require("../../persistance/rooms");
const connectedUsers = require("../connected-users");

const disconnectInactiveUsers = (wss, connectedUsersList, user) => {
  if (isUserInactive(wss, connectedUsers, user))
    disconnect(connectedUsersList, user);
};

const isUserInactive = (wss, connectedUsers, user) => {
  const hasUserDisconnected = !wss.clients.has(user.client);
  const hasFailedToReceivedPong = !connectedUsers.hasReceivedPongFromUser(user);
  return hasUserDisconnected || hasFailedToReceivedPong;
};

const disconnect = (connectedUsersList, user) => {
  connectedUsersList.removeUser(user);
  removeUserFromAllRooms(user);
};

module.exports = disconnectInactiveUsers;
