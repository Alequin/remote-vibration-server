const { forEach, uniqueId } = require("lodash");

const newConnectedUsersList = () => {
  const connectedUsers = {};
  return {
    forEachUser: (forSingleUser) => forEach(connectedUsers, forSingleUser),
    addUser: (client) => {
      const user = {
        id: uniqueId(),
        hasReceivedPong: true,
        client,
      };

      connectedUsers[user.id] = user;
      return user;
    },
    removeUser: (user) => {
      user.client.terminate();
      delete connectedUsers[user.id];
      return user;
    },
  };
};

const setReceivedPongStatus = (user, status) => (user.hasReceivedPong = status);

const hasReceivedPongFromUser = (user) => user.hasReceivedPong;

module.exports = {
  newConnectedUsersList,
  setReceivedPongStatus,
  hasReceivedPongFromUser,
};
