const database = require("../database");

const insertNewRoom = async ({ password, creatorDeviceId }) =>
  database
    .query(
      `
        INSERT INTO rooms 
            (password, creator_id, last_active_date) 
            VALUES ($1, $2, NOW())
            RETURNING id, password, users_in_room, creator_id, last_active_date
    `,
      [password, creatorDeviceId]
    )
    .then(([room]) => room);

module.exports = insertNewRoom;
