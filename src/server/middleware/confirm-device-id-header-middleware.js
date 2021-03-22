const confirmDeviceIdHeaderMiddleware = (app) => {
  app.use((req, res, next) => {
    if (isDeviceIdValid(req.header("deviceId"))) return next();

    res.status(403);
    res.send("Missing header D.I.D");
  });
};

// TODO make this check more defensive
const isDeviceIdValid = (deviceId) => !!deviceId;

module.exports = confirmDeviceIdHeaderMiddleware;
