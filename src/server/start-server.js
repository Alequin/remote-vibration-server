const express = require("express");
const currentDatabaseName = require("../persistance/current-database-name");
const database = require("../persistance/database");
const startWebsocketServer = require("../websocket/start-websocket-server");
const healthEndpoint = require("./endpoints/health-endpoint");
const roomEndpoints = require("./endpoints/room-endpoints");
const confirmDeviceIdHeaderMiddleware = require("./middleware/confirm-device-id-header-middleware");

const startServer = async ({ port }) =>
  new Promise(async (resolve) => {
    await database.connect(currentDatabaseName());

    const app = express();

    // parse application/json
    app.use(express.json());

    confirmDeviceIdHeaderMiddleware(app);

    healthEndpoint(app);
    roomEndpoints.createRoom(app);

    const webSocket = await startWebsocketServer();

    // `server` is a vanilla Node.js HTTP server, so use
    // the same ws upgrade process described here:
    // https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server
    const server = app.listen(port, () => {
      server.on("upgrade", (request, socket, head) => {
        webSocket.server.handleUpgrade(request, socket, head, (socket) => {
          webSocket.server.emit("connection", socket, request);
        });
      });
      resolve({
        expressServer: server,
        closeServers: async () => {
          await webSocket.closeServer();
          await server.close();
          await database.disconnect();
        },
      });
    });
  });

module.exports = startServer;
