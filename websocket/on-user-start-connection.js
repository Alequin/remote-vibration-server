const connectedUsers = require("./connected-users");

const onUserStartConnection = (wss, connectedUsersList) => {
  wss.on("connection", function (currentUserClient) {
    const currentUser = connectedUsersList.addUser(currentUserClient);

    currentUserClient.send("Welcome to the chat, enjoy :)");

    currentUserClient.on("message", (data) => {
      connectedUsersList.forEachUser(({ id }) => {
        const isSender = id === currentUser.id;
        const isConnectionOpen =
          currentUser.client.readyState === WebSocket.OPEN;
        if (!isSender && isConnectionOpen) client.send(data);
      });
    });

    currentUserClient.on("pong", () => {
      console.log("pong");
      connectedUsers.setConnectionStatusAsAlive(currentUser);
    });
  });
};

module.exports = onUserStartConnection;
