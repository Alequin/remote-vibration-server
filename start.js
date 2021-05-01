const logger = require("./src/logger");
const onProcessEnd = require("./src/on-process-end");
const startServer = require("./src/server/start-server");

const port = process.env.PORT || 3000;

(async () => {
  const { expressServer, closeServers } = await startServer({ port });

  logger.info("Server running on port", expressServer.address().port);

  onProcessEnd(async (closeEventType) => {
    logger.info(`${closeEventType} received, closing down`);
    await closeServers();
    logger.info(`${closeEventType} complete`);
  });
})();
