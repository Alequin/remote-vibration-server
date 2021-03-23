const seconds = (seconds) => seconds * 1000;
const minutes = (minutes) => seconds(minutes * 60);

module.exports = { seconds, minutes };
