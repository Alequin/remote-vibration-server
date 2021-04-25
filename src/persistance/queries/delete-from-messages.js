const database = require("../database");

const byIds = async (ids) =>
  database.query(`DELETE FROM messages WHERE id = ANY($1::INT8[]);`, [ids]);

module.exports = { byIds };
