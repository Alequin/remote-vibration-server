const database = require("../persistance/database");
const messages = require("../persistance/messages");
const newEventQueue = require("./watch-for-new-message-to-send/new-event-queue");
const sendMessagesToUser = require("./watch-for-new-message-to-send/send-message-to-user");

const watchForNewMessagesToSend = async () => {
  await messages.listenForNewMessages();
  return database.onNotification(newEventQueue(sendMessagesToUser));
};

module.exports = watchForNewMessagesToSend;
