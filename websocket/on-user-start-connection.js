const WebSocket = require("ws");
const connectedUsers = require("./connected-users");

const onUserStartConnection = (wss, connectedUsersList) => {
  wss.on("connection", function (client) {
    const currentUser = connectedUsersList.addUser(client);

    currentUser.client.on("message", (data) => {
      connectedUsersList.forEachUser(({ id, client }) => {
        const isSender = id === currentUser.id;
        const isConnectionOpen =
          currentUser.client.readyState === WebSocket.OPEN;
        if (!isSender && isConnectionOpen) {
          client.send(data);
        }
      });
    });

    currentUser.client.on("pong", () => {
      connectedUsers.setReceivedPongStatus(currentUser, true);
    });
  });
};

module.exports = onUserStartConnection;
