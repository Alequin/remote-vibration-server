const { connectedUsersList, sendMessageToUser } = require("../connected-users");
const messages = require("../../persistance/messages");
const messageTypes = require("../on-user-start-connection/message-types");

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

module.exports = sendMessagesToUser;
