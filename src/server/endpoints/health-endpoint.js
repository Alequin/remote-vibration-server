const health = (app) => {
  app.get("/health", (_, res) => {
    res.send("OK");
  });
};

module.exports = health;
