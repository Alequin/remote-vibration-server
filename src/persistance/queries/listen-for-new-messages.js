const database = require("../database");

const listenForNewMessages = async () => {
  const connection = await database.openConnection({
    disconnectMethod: "manual",
  });
  await connection.client.query(`LISTEN new_message`);
  return {
    ...connection,
    stopListening: async () => {
      await connection.client.query(`UNLISTEN new_message`);
      await connection.closeConnection();
    },
  };
};

module.exports = listenForNewMessages;
