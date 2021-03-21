const rooms = require("../../persistance/rooms");

const connectToRequestedRoom = (user, { data: { roomKey } }) => {
  const roomToAddUserTo = rooms.findRoomByKey(roomKey);
  if (!roomToAddUserTo) {
    return user.client.send(
      JSON.stringify({
        error: "There is no room for the give key",
      })
    );
  }

  rooms.addUserToRoom(roomToAddUserTo.id, user);
};

module.exports = connectToRequestedRoom;
