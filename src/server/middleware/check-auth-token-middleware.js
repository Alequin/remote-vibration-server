const { serverAuthToken } = require("../../environment");
const isAuthTokenValid = require("../check-auth-token");

const checkAuthTokenWare = (app) =>
  app.use((req, res, next) => {
    if (isAuthTokenValid(req.header("authToken"))) return next();

    res.status(401);
    res.send("Invalid authorization");
  });

module.exports = checkAuthTokenWare;
