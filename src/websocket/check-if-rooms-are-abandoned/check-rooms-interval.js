const toMilliseconds = require("../../to-milliseconds");

const checkRoomsInterval = () => toMilliseconds.minutes(30);

module.exports = { checkRoomsInterval };
