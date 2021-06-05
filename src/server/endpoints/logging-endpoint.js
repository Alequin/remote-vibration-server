const logger = require("../../logger");

const log = (app) => {
  app.post("/log", async (req, res) => {
    const body = req.body;
    logger.info("log endpoint:", body);
    res.send(200);
  });
};

module.exports = { log };
