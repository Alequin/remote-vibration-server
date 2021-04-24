const currentDatabaseName = require("../src/persistance/current-database-name");
const database = require("../src/persistance/database");

const truncateDatabaseTables = async () => {
  const databaseName = currentDatabaseName();
  await database.connect(databaseName);

  await database.query(`TRUNCATE TABLE rooms`);
};

if (require.main === module)
  truncateDatabaseTables()
    .then(process.exit)
    .catch((error) => {
      console.error(error);
      process.exit();
    });

module.exports = truncateDatabaseTables;
