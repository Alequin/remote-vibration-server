const rooms = require("../../persistance/rooms");
const { connectedUsersList } = require("../../websocket/connected-users");

// TODO either remove the exposure of information or guard against info being openly available
const health = (app) => {
  app.get("/health", (_, res) => {
    res.send(
      JSON.stringify({
        status: "OK",
        totalConnectionUsers: connectedUsersList.count(),
        totalOpenRooms: rooms.countOpenRooms(),
      })
    );
  });
};

module.exports = health;
