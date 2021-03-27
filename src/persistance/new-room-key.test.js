const { uniq, random } = require("lodash");
const newRoomKey = require("./new-room-key");

describe("newRoomKey", () => {
  it("can produce random keys at least 95% of the time", () => {
    const totalKeysToMake = 1_000_000;
    const testKeys = new Array(totalKeysToMake).fill(null).map(newRoomKey);
    expect(uniq(testKeys).length).toBeGreaterThan(totalKeysToMake * 0.95);
  });
});
