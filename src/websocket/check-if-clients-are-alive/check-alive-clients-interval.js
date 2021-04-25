const toMilliseconds = require("../../to-milliseconds");

const checkAliveClientsInterval = () => toMilliseconds.seconds(30);

module.exports = { checkAliveClientsInterval };
