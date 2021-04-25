const toMilliseconds = require("../../to-milliseconds");

const checkAliveClientsInterval = () => toMilliseconds.seconds(1);

module.exports = { checkAliveClientsInterval };
