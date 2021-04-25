const database = require("../database");

const insertNewMessages = async (messages) => {
  for (const message of messages) {
    await database.query(
      `INSERT INTO messages 
        (room_id, recipient_user_id, author_id, message_data)
        VALUES ($1, $2, $3, $4)`,
      [
        message.roomId,
        message.recipientId,
        message.authorId,
        message.messageData,
      ]
    );
  }
};

module.exports = insertNewMessages;
