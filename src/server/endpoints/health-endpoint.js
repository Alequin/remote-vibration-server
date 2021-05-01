const rooms = require("../../persistance/rooms");
const { connectedUsersList } = require("../../websocket/connected-users");

const health = (app) => {
  app.get("/health", (_, res) => {
    res.send(
      JSON.stringify({
        status: "OK",
      })
    );
  });
};

module.exports = health;
