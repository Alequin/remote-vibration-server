const database = require("../database");

const deleteRoomById = async (roomId) =>
  database.query(
    `
    DELETE FROM rooms WHERE id=$1
    `,
    [roomId]
  );

const deleteAbandonedRooms = async () =>
  database.query(
    `
    DELETE FROM rooms WHERE last_active_date < NOW() - INTERVAL '30 minutes'
    `
  );

module.exports = {
  deleteRoomById,
  deleteAbandonedRooms,
};
