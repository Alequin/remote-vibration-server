const WebSocket = require("ws");
const { connectedUsersList } = require("./connected-users");
const checkIfClientsAreAlive = require("./check-if-clients-are-alive");
const onUserStartConnection = require("./on-user-start-connection");
const checkIfRoomsAreAbandoned = require("./check-if-rooms-are-abandoned");
const rooms = require("../persistance/rooms");

const startServer = () => {
  const server = new WebSocket.Server({
    noServer: true,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false,
  });

  server.on("request", () => {
    console.log("on request");
    if (originIsAllowed(request.origin)) return;

    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log(
      new Date() + " Connection from origin " + request.origin + " rejected."
    );
  });

  onUserStartConnection(server, connectedUsersList);

  const aliveLoop = checkIfClientsAreAlive(server, connectedUsersList);
  const activeRoomsLoop = checkIfRoomsAreAbandoned(rooms);

  return {
    server,
    closeServer: () => {
      const onClose = new Promise((resolve) =>
        server.on("close", () => {
          connectedUsersList.removeAllUsers();
          aliveLoop.stop();
          activeRoomsLoop.stop();
          resolve();
        })
      );
      server.close();
      return onClose;
    },
  };
};

// TODO define logic for checking origin
const originIsAllowed = (origin) => {
  return true;
};

module.exports = startServer;
