const { forEach, size } = require("lodash");
const { v4: uuidv4 } = require("uuid");

const newConnectedUsersList = () => {
  const connectedUsers = {};

  const forEachUser = (forSingleUser) => forEach(connectedUsers, forSingleUser);

  const addUser = (client) => {
    const user = {
      id: uuidv4(),
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

  const findUserById = (userId) => connectedUsers[userId];

  const removeAllUsers = () => forEachUser(removeUser);

  const count = () => size(connectedUsers);

  return {
    forEachUser,
    addUser,
    removeUser,
    removeAllUsers,
    findUserById,
    count,
  };
};

const setReceivedPongStatus = (user, status) => (user.hasReceivedPong = status);

const hasReceivedPongFromUser = (user) => user.hasReceivedPong;

const sendMessageToUser = (user, message) =>
  user.client.send(JSON.stringify(message));
const sendErrorMessageToUser = (user, message) =>
  sendMessageToUser(user, { error: message });

module.exports = {
  connectedUsersList: newConnectedUsersList(),
  sendMessageToUser,
  sendErrorMessageToUser,
  setReceivedPongStatus,
  hasReceivedPongFromUser,
};
