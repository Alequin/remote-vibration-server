const { Client } = require("pg");
const environment = require("../../environment");
const logger = require("../../logger");
const currentDatabaseName = require("../current-database-name");

const databaseConfig = (databaseName) => {
  if (environment.isEnvLocal() || environment.isEnvTest())
    return {
      database: databaseName,
      user: "user",
      host: "localhost",
      password: "password",
      port: 5438,
    };

  if (environment.isEnvProduction())
    return {
      connectionString: environment.connectionString,
      ssl: {
        sslmode: "require",
        rejectUnauthorized: false,
      },
    };
};

module.exports.openConnection = async ({
  databaseName = currentDatabaseName(),
} = {}) => {
  try {
    const client = new Client(databaseConfig(databaseName));
    await client.connect();

    const connection = {
      client,
      closeConnection: async () => {
        client.end();
      },
    };

    return connection;
  } catch (error) {
    logger.error(`Unable to open database connection: ${error}`);
    throw error;
  }
};
