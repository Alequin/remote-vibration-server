const { forEach, uniqueId } = require("lodash");

const newConnectedUsersList = () => {
  const connectedUsers = {};
  return {
    forEachUser: (forSingleUser) => forEach(connectedUsers, forSingleUser),
    addUser: (client) => {
      const user = {
        id: uniqueId(),
        isAlive: true,
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

const setConnectionStatusAsAlive = (user) => (user.isAlive = true);

const setConnectionStatusAsDead = (user) => (user.isAlive = false);

const isUserConnectionAlive = (user) => user.isAlive;

module.exports = {
  newConnectedUsersList,
  setConnectionStatusAsAlive,
  setConnectionStatusAsDead,
  isUserConnectionAlive,
};
