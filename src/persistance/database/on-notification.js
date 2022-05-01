const logger = require("../../logger");
const currentDatabaseName = require("../current-database-name");
const { openConnection } = require("./open-connection");

module.exports.onNotification = async (
  callback,
  databaseName = currentDatabaseName()
) => {
  try {
    const { client, closeConnection } = await openConnection({
      databaseName,
    });
    client.on("notification", callback);
    return closeConnection;
  } catch (error) {
    logger.error("Unable to watch database for notifications");
    throw error;
  }
};
