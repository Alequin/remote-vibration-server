const WebSocket = require("ws");
const connectedUsers = require("./connected-users");
const toMilliseconds = require("../to-milliseconds");
const checkIfClientsAreAlive = require("./check-if-clients-are-alive");
const onUserStartConnection = require("./on-user-start-connection");

const startServer = () => {
  const server = new WebSocket.Server({
    noServer: true,
  });

  const connectedUsersList = connectedUsers.newConnectedUsersList();

  onUserStartConnection(server, connectedUsersList);

  const aliveLoop = checkIfClientsAreAlive(server, connectedUsersList, {
    interval: toMilliseconds.seconds(60),
    onDisconnect: (user) => {
      console.log(`Disconnected user with id ${user.id}`);
    },
  });

  server.on("close", () => {
    console.log("Closing server");
    aliveLoop.stop();
  });

  return server;
};

module.exports = startServer;
