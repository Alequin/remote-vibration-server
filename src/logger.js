const { isEnvTest } = require("./environment");

const logger = (level) => (...log) => {
  if (isEnvTest()) return;
  if (level === "info") return console.log("INFO: ", ...log);
  if (level === "warn") return console.log("WARN: ", ...log);
  if (level === "error") return console.error(...log);
};

module.exports = {
  info: logger("info"),
  warn: logger("warn"),
  error: logger("error"),
};
