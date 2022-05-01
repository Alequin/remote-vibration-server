const { onNotification } = require("./on-notification");
const { openConnection } = require("./open-connection");
const { disconnect } = require("./open-managed-connections");
const { query } = require("./query");

module.exports = {
  openConnection,
  disconnect,
  query,
  onNotification,
};
