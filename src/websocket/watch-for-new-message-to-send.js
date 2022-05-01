const database = require("../persistance/database");
const messages = require("../persistance/messages");
const onDatabaseNotification = require("../persistance/on-database-notifications");
const newEventQueue = require("./watch-for-new-message-to-send/new-event-queue");
const sendMessagesToUser = require("./watch-for-new-message-to-send/send-message-to-user");

const watchForNewMessagesToSend = async () => {
  const connection = await messages.listenForNewMessages();
  await onDatabaseNotification(
    newEventQueue(sendMessagesToUser),
    connection.client
  );
  return connection.stopListening;
};

module.exports = watchForNewMessagesToSend;
