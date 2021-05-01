const { serverAuthToken } = require("../../environment");

const checkAuthTokenWare = (app) =>
  app.use((req, res, next) => {
    if (serverAuthToken === req.header("authToken")) return next();

    res.status(401);
    res.send("Invalid authorization");
  });

module.exports = checkAuthTokenWare;
