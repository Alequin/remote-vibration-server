const { connectedUsersList, sendMessageToUser } = require("./connected-users");
const database = require("../persistance/database");
const messages = require("../persistance/messages");
const messageTypes = require("./on-user-start-connection/message-types");
const { seconds } = require("../to-milliseconds");

const watchForNewMessagesToSend = async () => {
  await messages.listenForNewMessages();
  return database.onNotification(newEventQueue(sendMessagesToUser));
};

/**
 * Manages database events and when the response to the event is called
 *
 * - The way messages are sent rely on the previous set of message to be delete before the next can be sent
 * - To ensure the process completes before the next batch is sent the event queue will manage any new event which fire
 *    and add them to the queue to be called once it is safe to do so
 */
const newEventQueue = (eventCallback) => {
  let eventQueue = [];

  const onEvent = async () => {
    // If the queue has 2 events all messages will be picked up and sent eventually. Calling any more will not provide any benefit
    if (eventQueue.length < 2) {
      eventQueue.push(eventCallback);
    }
  };

  const watcher = async () => {
    const queuedEvent = eventQueue.pop();
    if (queuedEvent) await queuedEvent();
    // Delay next check to avoid excess calls
    setTimeout(watcher, seconds(0.5));
  };

  watcher();

  return onEvent;
};

const sendMessagesToUser = async () => {
  const activeUserIds = connectedUsersList.allUserIds();
  const messagesToSend = await messages.findMessagesByRecipientIds(
    activeUserIds
  );

  for (const message of messagesToSend) {
    const userToSendMessageTo = connectedUsersList.findUserById(
      message.recipient_user_id
    );

    sendVibrationToRecipients(userToSendMessageTo, message);
  }
  await messages.removeMessagesByIds(messagesToSend.map(({ id }) => id));
};

const sendVibrationToRecipients = (user, { message_data: data }) => {
  sendMessageToUser(user, {
    type: messageTypes.receivedVibrationPattern,
    data,
  });
};

module.exports = watchForNewMessagesToSend;
