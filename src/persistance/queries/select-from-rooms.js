const database = require("../database");

const byRoomId = async (roomId) =>
  database
    .query(`SELECT * FROM rooms WHERE id=$1`, [roomId])
    .then(([room]) => room);

const byUserId = async (userId) =>
  database.query(`SELECT * FROM rooms WHERE $1 = any (users_in_room)`, [
    userId,
  ]);

const byPassword = async (password) =>
  database
    .query(`SELECT * FROM rooms WHERE password=$1`, [password])
    .then(([room]) => room);

const byCreatorId = async (creatorId) =>
  database
    .query(`SELECT * FROM rooms WHERE creator_id=$1`, [creatorId])
    .then(([room]) => room);

module.exports = {
  byRoomId,
  byUserId,
  byPassword,
  byCreatorId,
};
