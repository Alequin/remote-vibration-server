const { random, shuffle } = require("lodash");

const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const newRoomKey = ({ size }) =>
  shuffle(
    new Array(size).fill(null).map(() => CHARS[random(0, CHARS.length - 1)])
  ).join("");

module.exports = newRoomKey;
