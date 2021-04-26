const database = require("../database");

const byRecipientUserIds = async (recipientIds) =>
  database.query(
    `SELECT * FROM messages WHERE recipient_user_id = ANY($1::TEXT[]) ORDER BY id`,
    [recipientIds]
  );

module.exports = {
  byRecipientUserIds,
};
