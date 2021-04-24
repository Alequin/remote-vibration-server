const { Pool } = require("pg");
const environment = require("../environment");

const setupDatabaseInterface = () => {
  let pool = null;

  const connect = async (databaseName) => {
    pool = new Pool(databaseConfig(databaseName));
  };

  const query = async (query, variables) => {
    if (!pool)
      throw new Error("Query Error: Client is not connected to database");

    const client = await pool.connect();
    const rows = await client.query(query, variables).then(({ rows }) => rows);
    client.release();

    return rows;
  };

  const disconnect = async () => {
    if (!pool)
      throw new Error("Disconnect Error: Client is not connected to database");

    await pool.end();
    pool = null;
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

  if (environment.isEnvProduction())
    return {
      connectionString: environment.connectionString,
    };
};

module.exports = setupDatabaseInterface();
