const { isEmpty } = require("lodash");
const database = require("../src/persistance/database");

const run = async () => {
  const databaseName = "local_remote_vibration";
  await prepareDatabaseForTableCreation(databaseName);

  await createDatabaseTables(databaseName);
};

const prepareDatabaseForTableCreation = async (databaseName) => {
  // Create a connection without a target database
  await database.connect();

  // Check if target database exists
  const shouldCreateDatabase = isEmpty(
    await database.query("SELECT FROM pg_database WHERE datname=$1", [
      databaseName,
    ])
  );

  // If target database does not exist create it
  if (shouldCreateDatabase) {
    await database.query(`CREATE DATABASE ${databaseName}`);
  }

  // Reconnect to the target database
  await database.disconnect();
  await database.connect(databaseName);
};

const createDatabaseTables = async (databaseName) => {
  await database.connect(databaseName);

  await database.query(`
        CREATE TABLE rooms (
            id SERIAL PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            users_in_room TEXT [] NOT NULL,
            creator_id TEXT NOT NULL,
            last_active_date timestamp NOT NULL
        );
    `);
};

run()
  .then(process.exit)
  .catch((error) => {
    console.error(error);
    process.exit();
  });
