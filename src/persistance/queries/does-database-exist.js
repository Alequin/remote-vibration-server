const database = require("../database");

const doesDatabaseExist = async (databaseName) =>
  database
    .query("SELECT FROM pg_database WHERE datname=$1", [databaseName])
    .then((foundDatabases) => foundDatabases.length > 0);

module.exports = doesDatabaseExist;
