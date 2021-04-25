const environment = require("../environment");

const currentDatabaseName = () => {
  if (environment.isEnvTest()) return "test_remote_vibration";
  if (environment.isEnvLocal()) return "local_remote_vibration";
  if (environment.isEnvProduction()) return "";
};

module.exports = currentDatabaseName;
