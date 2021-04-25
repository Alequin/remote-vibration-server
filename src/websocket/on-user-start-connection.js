const connectedUsers = require("./connected-users");
const processMessage = require("./on-user-start-connection/process-message");

const onUserStartConnection = (wss, connectedUsersList) => {
  wss.on("connection", (client) => {
    const currentUser = connectedUsersList.addUser(client);
    console.log("user connected: ", currentUser.id);

    currentUser.client.on("message", async (data) => {
      try {
        await processMessage(currentUser, JSON.parse(data));
      } catch (error) {
        // TODO add error logging
      }
    });

    currentUser.client.on("pong", () => {
      console.log("pong: ", currentUser.id);
      connectedUsers.setReceivedPongStatus(currentUser, true);
    });
  });
};

module.exports = onUserStartConnection;
