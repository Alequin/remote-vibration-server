const currentDatabaseName = require("../src/persistance/current-database-name");
const database = require("../src/persistance/database");
const doesDatabaseExist = require("../src/persistance/does-database-exist");

const createDatabase = async () => {
  const databaseName = currentDatabaseName();
  await prepareDatabaseForTableCreation(databaseName);

  await createDatabaseTables(databaseName);
};

const prepareDatabaseForTableCreation = async (databaseName) => {
  // Create a connection without a target database
  await database.connect();

  if (await doesDatabaseExist(databaseName))
    throw new Error(`Database already exists / databaseName: ${databaseName}`);

  await database.query(`CREATE DATABASE ${databaseName}`);
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

if (require.main === module)
  createDatabase()
    .then(process.exit)
    .catch((error) => {
      console.error(error);
      process.exit();
    });

module.exports = createDatabase;
