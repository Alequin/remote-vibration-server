module.exports = Object.freeze({
  connectToRoom: "connectToRoom",
  sendMessage: "sendMessage",
  sendVibrationPattern: "sendVibrationPattern", // sent by client when send a vibration pattern
  receivedVibrationPattern: "receivedVibrationPattern", // sent by server to recipients of a vibration pattern
  confirmVibrationPatternSent: "confirmVibrationPatternSent", // sent by server in response to send to confirm message was sent
  confirmRoomConnection: "confirmRoomConnection", // sent by server to confirm a connection to a room was established
});
