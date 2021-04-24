const rooms = require("../../../persistance/rooms");
const {
  connectedUsersList,
  sendMessageToUser,
  sendErrorMessageToUser,
} = require("../../connected-users");
const messageTypes = require("../message-types");

const sendVibrationPattern = async (currentUser, message) => {
  validateMessage(currentUser, message);

  // TODO make sure only one room is returned

  const [room] = await rooms.findRoomByUser(currentUser);

  room.users_in_room.forEach((userId) => {
    const user = connectedUsersList.findUserById(userId);
    user.id === currentUser.id
      ? sendConfirmationToSender(user)
      : sendVibrationToRecipients(user, message);
  });
};

const validateMessage = (currentUser, message) => {
  if (areAnyPropsInvalid(message.data)) {
    const errorMessage = "sendVibrationPattern: Invalid properties provided";
    sendErrorMessageToUser(currentUser, errorMessage);
    throw new Error(errorMessage);
  }

  if (areAnyRequiredPropsMissing(message.data)) {
    const errorMessage = "sendVibrationPattern: Missing properties";
    sendErrorMessageToUser(currentUser, errorMessage);
    throw new Error(errorMessage);
  }
};

const requiredProps = ["vibrationPattern", "speed"];
const areAnyPropsInvalid = (data) =>
  !Object.keys(data).every((prop) => requiredProps.includes(prop));

const areAnyRequiredPropsMissing = (data) => {
  const givenProperties = Object.keys(data);
  return !requiredProps.every((prop) => givenProperties.includes(prop));
};

const sendVibrationToRecipients = (user, { data }) => {
  sendMessageToUser(user, {
    type: messageTypes.receivedVibrationPattern,
    data,
  });
};

const sendConfirmationToSender = (user) => {
  sendMessageToUser(user, {
    type: messageTypes.confirmVibrationPatternSent,
  });
};

module.exports = sendVibrationPattern;
