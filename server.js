const WebSocket = require("ws");
const connectedUsers = require("./websocket/connected-users");
const toMilliseconds = require("./to-milliseconds");
const checkIfClientsAreAlive = require("./websocket/check-if-clients-are-alive");
const onUserStartConnection = require("./websocket/on-user-start-connection");

const wss = new WebSocket.Server({
  port: 8080,
});

const connectedUsersList = connectedUsers.newConnectedUsersList();

onUserStartConnection(wss, connectedUsersList);

const aliveLoop = checkIfClientsAreAlive(wss, connectedUsersList, {
  interval: toMilliseconds.seconds(60),
  onDisconnect: (user) => {
    console.log(`Disconnected user with id ${user.id}`);
  },
});

wss.on("close", () => {
  aliveLoop.stop();
});
