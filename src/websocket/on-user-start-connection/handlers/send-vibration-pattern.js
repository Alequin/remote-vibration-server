const rooms = require("../../../persistance/rooms");
const {
  connectedUsersList,
  sendMessageToUser,
} = require("../../connected-users");
const messageTypes = require("../message-types");

const sendVibrationPattern = (currentUser, message) => {
  const room = rooms.findRoomByUser(currentUser);
  room.userIds.forEach((userId) => {
    const user = connectedUsersList.findUserById(userId);
    user.id === currentUser.id
      ? sendConfirmationToSender(user)
      : sendVibrationToRecipients(user, message);
  });
};

const sendVibrationToRecipients = (user, { data }) => {
  sendMessageToUser(user, {
    type: messageTypes.receivedVibrationPattern,
    ...data,
  });
};

const sendConfirmationToSender = (user) => {
  sendMessageToUser(user, {
    type: messageTypes.confirmVibrationPatternSent,
  });
};

module.exports = sendVibrationPattern;
