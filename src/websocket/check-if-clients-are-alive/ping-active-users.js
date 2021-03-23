const { noop } = require("lodash");
const connectedUsers = require("../connected-users");

const pingActiveUsers = (user) => {
  connectedUsers.setReceivedPongStatus(user, false);
  user.client.ping(noop);
};

module.exports = pingActiveUsers;
