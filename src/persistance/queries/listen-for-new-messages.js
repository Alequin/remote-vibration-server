const database = require("../database");

const listenForNewMessages = async () => database.query(`LISTEN new_message`);

module.exports = listenForNewMessages;
