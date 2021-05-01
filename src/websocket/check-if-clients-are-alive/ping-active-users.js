const noop = require("lodash/noop");
const connectedUsers = require("../connected-users");

const pingActiveUsers = (user) => {
  connectedUsers.markUserAsNeedingToReceivePong(user);
  user.client.ping(noop);
};

module.exports = pingActiveUsers;
