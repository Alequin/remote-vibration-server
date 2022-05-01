const currentDatabaseName = require("../src/persistance/current-database-name");
const database = require("../src/persistance/database");

const truncateDatabaseTables = async () => {
  await database.query(`TRUNCATE TABLE rooms`);
  await database.query(`TRUNCATE TABLE messages`);

  await database.disconnect();
};

if (require.main === module)
  truncateDatabaseTables()
    .then(process.exit)
    .catch((error) => {
      console.error(error);
      process.exit();
    });

module.exports = truncateDatabaseTables;
