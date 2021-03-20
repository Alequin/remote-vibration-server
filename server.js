const WebSocket = require("ws");
const connectedUsers = require("./websocket/connected-users");
const toMilliseconds = require("./to-milliseconds");
const pingClients = require("./websocket/ping-clients");
const onUserStartConnection = require("./websocket/on-user-start-connection");

const wss = new WebSocket.Server({
  port: 8080,
});

const connectedUsersList = connectedUsers.newConnectedUsersList();

onUserStartConnection(wss, connectedUsersList);

const ping = pingClients(connectedUsersList, {
  interval: toMilliseconds.seconds(5),
  onPingUser: ({ id }) => {
    console.log("ping: ", id);
  },
  onDisconnect: (user) => {
    console.log(`Disconnected user with id ${user.id}`);
  },
});

wss.on("close", function close() {
  ping.stop();
});
