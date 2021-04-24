const environment = require("../environment");

const databaseConfig = () => {
  if (environment.isEnvLocal() || environment.isEnvTest())
    return {
      user: "user",
      host: "localhost",
      database: "local-remote-vibration",
      password: "password",
      port: 5438,
    };

  if (environment.isEnvProduction()) return {};
};

module.exports = databaseConfig();
