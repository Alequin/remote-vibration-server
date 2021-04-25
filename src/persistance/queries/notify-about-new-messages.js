const database = require("../database");

const notifyAboutNewMessages = async () => database.query("NOTIFY new_message");

module.exports = notifyAboutNewMessages;
