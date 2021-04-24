const currentDatabaseName = require("../src/persistance/current-database-name");
const database = require("../src/persistance/database");
const doesDatabaseExist = require("../src/persistance/does-database-exist");

const dropDatabase = async () => {
  const databaseName = currentDatabaseName();
  await database.connect();
  if (await doesDatabaseExist(databaseName)) return;

  await database.query(`DROP DATABASE ${databaseName}`);
  await database.disconnect();
};

if (require.main === module)
  dropDatabase()
    .then(process.exit)
    .catch((error) => {
      console.error(error);
      process.exit();
    });

module.exports = dropDatabase;
