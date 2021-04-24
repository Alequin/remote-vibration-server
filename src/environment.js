const assert = require("assert");

const validEnvironmentOptions = {
  test: "test",
  local: "local",
  production: "production",
};

const setupConfig = () => {
  validateEnvironmentVariables();

  const currentEnvironment = process.env.NODE_ENV;
  const connectionString = process.env.DATABASE_URL;

  return {
    isEnvTest: () => currentEnvironment === validEnvironmentOptions.test,
    isEnvLocal: () => currentEnvironment === validEnvironmentOptions.local,
    isEnvProduction: () =>
      currentEnvironment === validEnvironmentOptions.production,
    connectionString,
  };
};

const validateEnvironmentVariables = () => {
  const nodeEnv = process.env.NODE_ENV;
  assert(
    nodeEnv,
    'A value for the environment variable "NODE_ENV" must be provided'
  );
  assert(
    validEnvironmentOptions[nodeEnv],
    `The given "NODE_ENV" is not one of the valid options / Given Env: ${nodeEnv}, valid Options: ${JSON.stringify(
      Object.values(validEnvironmentOptions)
    )}`
  );
};

module.exports = setupConfig();
