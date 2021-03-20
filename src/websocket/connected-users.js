const { forEach, uniqueId } = require("lodash");

const newConnectedUsersList = () => {
  const connectedUsers = {};

  const forEachUser = (forSingleUser) => forEach(connectedUsers, forSingleUser);

  const addUser = (client) => {
    const user = {
      id: uniqueId(),
      hasReceivedPong: true,
      client,
    };

    connectedUsers[user.id] = user;
    return connectedUsers[user.id];
  };

  const removeUser = (user) => {
    user.client.terminate();
    delete connectedUsers[user.id];
    return user;
  };

  const removeAllUsers = () => forEachUser(removeUser);

  return {
    forEachUser,
    addUser,
    removeUser,
    removeAllUsers,
  };
};

const setReceivedPongStatus = (user, status) => (user.hasReceivedPong = status);

const hasReceivedPongFromUser = (user) => user.hasReceivedPong;

module.exports = {
  connectedUsersList: newConnectedUsersList(),
  setReceivedPongStatus,
  hasReceivedPongFromUser,
};
