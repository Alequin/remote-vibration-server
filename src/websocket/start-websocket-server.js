const WebSocket = require("ws");
const { connectedUsersList } = require("./connected-users");
const checkIfClientsAreAlive = require("./check-if-clients-are-alive");
const onUserStartConnection = require("./on-user-start-connection");
const checkIfRoomsAreAbandoned = require("./check-if-rooms-are-abandoned");
const rooms = require("../persistance/rooms");
const watchForNewMessagesToSend = require("./watch-for-new-message-to-send");

const startServer = async () => {
  const server = new WebSocket.Server({
    noServer: true,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false,
  });

  onUserStartConnection(server);

  const aliveLoop = checkIfClientsAreAlive(server, connectedUsersList);
  const activeRoomsLoop = checkIfRoomsAreAbandoned(rooms);

  const cleanUpNewMessageWatcher = await watchForNewMessagesToSend();

  return {
    server,
    closeServer: async () => {
      const onClose = new Promise((resolve) =>
        server.on("close", async () => {
          await cleanUpNewMessageWatcher();
          aliveLoop.stop();
          activeRoomsLoop.stop();
          await connectedUsersList.removeAllUsers();
          resolve();
        })
      );
      server.close();
      return onClose;
    },
  };
};

module.exports = startServer;
