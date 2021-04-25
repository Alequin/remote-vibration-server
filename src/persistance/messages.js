const selectFromMessages = require("./queries/select-from-messages");
const insertNewMessages = require("./queries/insert-new-messages");
const deleteFromMessages = require("./queries/delete-from-messages");
const listenForNewMessages = require("./queries/listen-for-new-messages");
const notifyAboutNewMessages = require("./queries/notify-about-new-messages");

const findMessagesByRecipientIds = async (recipientIds) =>
  selectFromMessages.byRecipientUserIds(recipientIds);

const addNewMessages = async (messages) => {
  await insertNewMessages(messages);
  await notifyAboutNewMessages();
};

const removeMessagesByIds = async (ids) => deleteFromMessages.byIds(ids);

module.exports = {
  findMessagesByRecipientIds,
  addNewMessages,
  removeMessagesByIds,
  listenForNewMessages: listenForNewMessages,
};
