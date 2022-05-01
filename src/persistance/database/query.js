const logger = require("../../logger");
const currentDatabaseName = require("../current-database-name");
const { openManagedConnection } = require("./open-managed-connections");

module.exports.query = async (
  query,
  variables,
  databaseName = currentDatabaseName()
) => {
  try {
    const connection = await openManagedConnection({
      databaseName,
    });
    const rows = await connection
      .query(query, variables)
      .then(({ rows }) => rows);
    return rows;
  } catch (error) {
    logger.error(`Unable to call database query: ${query}`);
    throw error;
  }
};
currentDatabaseName;
