const WebSocket = require("ws");
const { connectedUsersList } = require("./connected-users");
const toMilliseconds = require("../to-milliseconds");
const checkIfClientsAreAlive = require("./check-if-clients-are-alive");
const onUserStartConnection = require("./on-user-start-connection");

const startServer = () => {
  const server = new WebSocket.Server({
    noServer: true,
  });

  onUserStartConnection(server, connectedUsersList);

  const aliveLoop = checkIfClientsAreAlive(server, connectedUsersList, {
    interval: toMilliseconds.seconds(2),
  });

  return {
    server,
    closeServer: () => {
      server.close();
      return new Promise((resolve) =>
        server.on("close", () => {
          connectedUsersList.removeAllUsers();
          aliveLoop.stop();
          resolve();
        })
      );
    },
  };
};

module.exports = startServer;
