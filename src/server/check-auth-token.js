const { isNil } = require("lodash");
const { serverAuthToken } = require("../environment");

const isAuthTokenValid = (authToken) =>
  !isNil(authToken) && serverAuthToken === authToken;

module.exports = isAuthTokenValid;
