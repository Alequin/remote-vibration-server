const express = require("express");
const WebSocket = require("ws");
const startWebsocketServer = require("../websocket/start-websocket-server");

const startServer = async ({ port }) =>
  new Promise((resolve) => {
    const app = express();

    app.get("/health", (_, res) => {
      res.send("OK");
    });

    const webSocket = startWebsocketServer();

    // `server` is a vanilla Node.js HTTP server, so use
    // the same ws upgrade process described here:
    // https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server
    const server = app.listen(port, () => {
      server.on("upgrade", (request, socket, head) => {
        webSocket.handleUpgrade(request, socket, head, (socket) => {
          webSocket.emit("connection", socket, request);
        });
      });
      resolve(server);
    });
  });

module.exports = startServer;
