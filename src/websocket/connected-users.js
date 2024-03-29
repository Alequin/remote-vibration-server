const { size } = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { removeUserFromAllRooms } = require("../persistance/rooms");
const assert = require("assert");
const { minutes } = require("../to-milliseconds");

const userMaxIdleTime = minutes(2);

const newConnectedUsersList = () => {
  const connectedUsers = {};

  const forEachUser = async (forSingleUser) => {
    for (const user of Object.values(connectedUsers)) await forSingleUser(user);
  };

  const addUser = (client) => {
    assert(!!client, "A client must be provided when adding a user");

    const user = {
      id: uuidv4(),
      hasReceivedPong: true, // TODO remove in favour of heartbeat once no longer used
      lastActive: new Date(),
      client,
    };

    connectedUsers[user.id] = user;
    return connectedUsers[user.id];
  };

  const removeUser = async (user) => {
    await removeUserFromAllRooms(user);
    user.client.terminate();
    delete connectedUsers[user.id];
    return user;
  };

  const allUserIds = () => Object.keys(connectedUsers);
  const findUserById = (userId) => connectedUsers[userId];

  const removeAllUsers = async () => forEachUser(removeUser);

  const count = () => size(connectedUsers);

  return {
    forEachUser,
    addUser,
    removeUser,
    removeAllUsers,
    findUserById,
    allUserIds,
    count,
  };
};

const markUserAsNeedingToReceivePong = (user) => {
  user.hasReceivedPong = false;
};

const markUserAsHavingReceivePong = (user) => {
  user.hasReceivedPong = true;
};

const hasReceivedPongFromUser = (user) => user.hasReceivedPong;

const sendMessageToUser = (user, message) =>
  user.client.send(JSON.stringify(message));

const sendErrorMessageToUser = (user, message) =>
  sendMessageToUser(user, { error: message });

const updateUsersLastActiveTime = (user) => (user.lastActive = new Date());

const isUserIdle = (user) =>
  Date.now() - user.lastActive.getTime() > userMaxIdleTime;

module.exports = {
  connectedUsersList: newConnectedUsersList(),
  sendMessageToUser,
  sendErrorMessageToUser,
  markUserAsNeedingToReceivePong,
  markUserAsHavingReceivePong,
  hasReceivedPongFromUser,
  updateUsersLastActiveTime,
  isUserIdle,
  userMaxIdleTime,
};
