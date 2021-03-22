const toMilliseconds = require("../../to-milliseconds");

const checkAliveClientsInterval = () => toMilliseconds.seconds(60);

module.exports = { checkAliveClientsInterval };
