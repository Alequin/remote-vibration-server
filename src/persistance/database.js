const { Client } = require("pg");
const databaseConfig = require("./database-config");
const client = new Client(databaseConfig);

const connect = async () => client.connect();

const query = async (query, variables) =>
  client.query(query, variables).then(({ rows }) => rows);

const disconnect = async () => client.end();

module.exports = { connect, query, disconnect };
