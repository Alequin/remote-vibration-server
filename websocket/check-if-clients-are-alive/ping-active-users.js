const connectedUsers = require("../connected-users");

const pingActiveUsers = (user, onPingUser) => {
  connectedUsers.setReceivedPongStatus(user, false);
  user.client.ping(() => onPingUser && onPingUser(user));
};

module.exports = pingActiveUsers;
