const { Client } = require("pg");
const environment = require("../environment");

const setupDatabaseInterface = () => {
  let client = null;

  const connect = async (databaseName) => {
    client = new Client(databaseConfig(databaseName));
    return await client.connect();
  };

  const query = async (query, variables) => {
    if (!client)
      throw new Error("Query Error: Client is not connected to database");

    return await client.query(query, variables).then(({ rows }) => rows);
  };

  const disconnect = async () => {
    if (!client)
      throw new Error("Disconnect Error: Client is not connected to database");

    await client.end();
    client = null;
  };

  return {
    connect,
    query,
    disconnect,
  };
};

const databaseConfig = (databaseName) => {
  if (environment.isEnvLocal() || environment.isEnvTest())
    return {
      database: databaseName,
      user: "user",
      host: "localhost",
      password: "password",
      port: 5438,
    };

  if (environment.isEnvProduction()) return {};
};

module.exports = setupDatabaseInterface();
