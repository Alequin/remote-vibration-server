const { updateUsersLastActiveTime } = require("../../connected-users");

const receivedHeartbeat = async (user) => {
  updateUsersLastActiveTime(user);
};

module.exports = receivedHeartbeat;
