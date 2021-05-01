const assert = require("assert");
const { isEmpty } = require("lodash");

const validEnvironmentOptions = {
  test: "test",
  local: "local",
  production: "production",
};

const currentEnvironment = process.env.NODE_ENV;

assert(
  currentEnvironment,
  'A value for the environment variable "NODE_ENV" must be provided'
);
assert(
  validEnvironmentOptions[currentEnvironment],
  `The given "NODE_ENV" is not one of the valid options / Given Env: ${currentEnvironment}, valid Options: ${JSON.stringify(
    Object.values(validEnvironmentOptions)
  )}`
);

const isEnvTest = () => currentEnvironment === validEnvironmentOptions.test;
const isEnvLocal = () => currentEnvironment === validEnvironmentOptions.local;
const isEnvProduction = () =>
  currentEnvironment === validEnvironmentOptions.production;

const serverAuthToken = isEnvProduction() ? process.env.AUTH_TOKEN : "123";
assert(
  serverAuthToken && !isEmpty(serverAuthToken),
  `An auth token must be defined / Given token: ${serverAuthToken}`
);

module.exports = {
  isEnvTest,
  isEnvLocal,
  isEnvProduction,
  connectionString: process.env.DATABASE_URL,
  serverAuthToken,
};
