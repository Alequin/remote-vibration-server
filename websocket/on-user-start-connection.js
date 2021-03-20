const WebSocket = require("ws");
const connectedUsers = require("./connected-users");
const sendMessageToOtherUsers = require("./on-user-start-connection/send-message-to-other-users");

const onUserStartConnection = (wss, connectedUsersList) => {
  wss.on("connection", function (client) {
    const currentUser = connectedUsersList.addUser(client);

    currentUser.client.on("message", (data) => {
      connectedUsersList.forEachUser((user) => {
        sendMessageToOtherUsers(user, currentUser, data);
      });
    });

    currentUser.client.on("pong", () => {
      connectedUsers.setReceivedPongStatus(currentUser, true);
    });
  });
};

module.exports = onUserStartConnection;
