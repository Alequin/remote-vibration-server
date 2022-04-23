// comment
const express = require("express");
const fs = require("fs");
const logger = require("../logger");
const currentDatabaseName = require("../persistance/current-database-name");
const database = require("../persistance/database");
const startWebsocketServer = require("../websocket/start-websocket-server");
const healthEndpoint = require("./endpoints/health-endpoint");
const loggingEndpoint = require("./endpoints/logging-endpoint");
const roomEndpoints = require("./endpoints/room-endpoints");
const checkAuthTokenMiddleware = require("./middleware/check-auth-token-middleware");
const confirmDeviceIdHeaderMiddleware = require("./middleware/confirm-device-id-header-middleware");

const startServer = async ({ port }) =>
  new Promise(async (resolve) => {
    await database.connect(currentDatabaseName());

    const app = express();

    // parse application/json
    app.use(express.json());

    healthEndpoint(app);
    app.use(express.static("public"));
    checkAuthTokenMiddleware(app);
    confirmDeviceIdHeaderMiddleware(app);
    loggingEndpoint.log(app);
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

      let hasClosed = false;
      resolve({
        expressServer: server,
        closeServers: async () => {
          if (hasClosed) return;
          hasClosed = true;
          await logOnError(
            webSocket.closeServer,
            `There was an error while closing the websocket server`
          );
          await logOnError(
            () => server.close(), // New function due to use of "this" by express server
            `There was an error while closing the main server`
          );
          await logOnError(
            database.disconnect,
            `There was an error while disconnecting the database connection`
          );
        },
      });
    });
  });

const logOnError = async (functionWhichMayError, errorMessage) => {
  try {
    return await functionWhichMayError();
  } catch (error) {
    logger.error(errorMessage);
    logger.error(error);
  }
};

module.exports = startServer;
