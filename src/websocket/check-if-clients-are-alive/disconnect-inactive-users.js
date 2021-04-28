const { removeUserFromAllRooms } = require("../../persistance/rooms");
const connectedUsers = require("../connected-users");

const disconnectInactiveUsers = async (wss, connectedUsersList, user) => {
  if (isUserInactive(wss, connectedUsers, user))
    await disconnect(connectedUsersList, user);
};

const isUserInactive = (wss, connectedUsers, user) => {
  const hasUserDisconnected = !wss.clients.has(user.client);
  const hasFailedToReceivedPong = !connectedUsers.hasReceivedPongFromUser(user);
  return hasUserDisconnected || hasFailedToReceivedPong;
};

const disconnect = async (connectedUsersList, user) => {
  await connectedUsersList.removeUser(user);
  await removeUserFromAllRooms(user);
};

module.exports = disconnectInactiveUsers;
