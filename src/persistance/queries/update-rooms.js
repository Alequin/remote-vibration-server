const database = require("../database");

const addUserToRoom = async ({ roomId, userIdToAdd }) =>
  database.query(
    `
  UPDATE rooms
  SET users_in_room = users_in_room || ARRAY [$2] 
  WHERE id=$1
  `,
    [roomId, userIdToAdd]
  );

const removeUserFromAllRooms = async (userIdToRemove) =>
  database.query(
    `
    UPDATE rooms
    SET users_in_room = array_remove(users_in_room, $1)
    WHERE $1 = any (users_in_room)
    `,
    [userIdToRemove]
  );

const updateLastActiveDateForRoomsWithUsers = async () =>
  database.query(
    `
    UPDATE rooms
    SET last_active_date=NOW()
    WHERE array_length(users_in_room, 1) > 0
    `
  );

module.exports = {
  addUserToRoom,
  removeUserFromAllRooms,
  updateLastActiveDateForRoomsWithUsers,
};
