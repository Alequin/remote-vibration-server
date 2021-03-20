const connectedUsers = require("./connected-users");
const processMessage = require("./on-user-start-connection/process-message");

const onUserStartConnection = (wss, connectedUsersList) => {
  wss.on("connection", (client) => {
    const currentUser = connectedUsersList.addUser(client);

    currentUser.client.on("message", (data) => {
      processMessage(currentUser, JSON.parse(data));
    });

    currentUser.client.on("pong", () => {
      connectedUsers.setReceivedPongStatus(currentUser, true);
    });
  });
};

module.exports = onUserStartConnection;
