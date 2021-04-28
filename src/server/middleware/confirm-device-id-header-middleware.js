const confirmDeviceIdHeaderMiddleware = (app) => {
  app.use((req, res, next) => {
    if (isDeviceIdValid(req.header("deviceId"))) return next();

    res.status(403);
    res.send("Missing header D.I.D");
  });
};

const isDeviceIdValid = (deviceId) =>
  !!deviceId && isDeviceIdFormatCorrect(deviceId);

const validDeviceIdFormat = /\w{15}--\d*/;
const isDeviceIdFormatCorrect = (deviceId) =>
  validDeviceIdFormat.test(deviceId);

module.exports = confirmDeviceIdHeaderMiddleware;
