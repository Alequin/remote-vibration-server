const environment = require("../src/environment");
const currentDatabaseName = require("../src/persistance/current-database-name");
const database = require("../src/persistance/database");
const doesDatabaseExist = require("../src/persistance/queries/does-database-exist");

const createDatabase = async () => {
  const databaseName = currentDatabaseName();
  if (!environment.isEnvProduction()) {
    await setUpDatabaseLocally(databaseName);
  }

  await createDatabaseTables(databaseName);

  await database.disconnect();
};

const setUpDatabaseLocally = async (databaseName) => {
  if (await doesDatabaseExist(databaseName)) {
    console.log(`Database already exists / databaseName: ${databaseName}`);
    return;
  }

  await database.query(`CREATE DATABASE ${databaseName}`);

  // Reconnect to the target database
  await database.disconnect();
};

const createDatabaseTables = async (databaseName) => {
  await database.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      password TEXT UNIQUE NOT NULL,
      users_in_room TEXT [] DEFAULT ARRAY[]::TEXT[] NOT NULL,
      creator_id TEXT NOT NULL,
      last_active_date timestamp NOT NULL
    );`);

  await database.query(
    `CREATE INDEX IF NOT EXISTS idx_room_password ON rooms USING HASH (password);`
  );

  await database.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      room_id INT8 NOT NULL,
      recipient_user_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      message_data JSONB NOT NULL
      );`);
};

if (require.main === module)
  createDatabase()
    .then(process.exit)
    .catch((error) => {
      console.error(error);
      process.exit();
    });

module.exports = createDatabase;
