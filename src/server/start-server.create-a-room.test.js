jest.mock(
  "../websocket/check-if-clients-are-alive/check-alive-clients-interval",
  () => ({ checkAliveClientsInterval: () => 2000 })
);

const fetch = require("node-fetch");
const { default: waitFor } = require("wait-for-expect");
const rooms = require("../persistance/rooms");
const truncateDatabaseTables = require("../../script/truncate-database-tables");
const environment = require("../environment");
const { startServerTest } = require("./test-utils");

waitFor.defaults.timeout = 15000;
waitFor.defaults.interval = 1000;

describe("startServer", () => {
  const mockDeviceId = "012345678998765--123";

  beforeEach(async () => {
    await truncateDatabaseTables();
    jest.clearAllMocks();
  });

  describe("When request send a request to create a room", () => {
    const context = startServerTest();

    it("creates a room", async () => {
      const response = await fetch(
        `http://localhost:${context.server.port}/room`,
        {
          method: "POST",
          headers: {
            deviceId: mockDeviceId,
            authToken: environment.serverAuthToken,
          },
        }
      );

      const responseJson = await response.json();

      // Assert response contains the room key
      expect(responseJson.password).toMatch(/\w*/);

      // Assert a room has been created
      const createdRoom = await rooms.findRoomByKey(responseJson.password);

      expect(createdRoom.id).toBeDefined();
      expect(createdRoom.password).toBe(responseJson.password);
      expect(createdRoom.users_in_room).toEqual([]);
      expect(createdRoom.creator_id).toEqual(mockDeviceId);
    });
  });

  describe("When a user already has a room associated with their device id", () => {
    const context = startServerTest();

    it("does not create a new room", async () => {
      const testRoom = await rooms.createRoom(mockDeviceId);

      const response = await fetch(
        `http://localhost:${context.server.port}/room`,
        {
          method: "POST",
          headers: {
            deviceId: mockDeviceId,
            authToken: environment.serverAuthToken,
          },
        }
      );

      const responseJson = await response.json();

      // Returned room key should match the test rooms key
      expect(responseJson.password).toBe(testRoom.password);
    });
  });
});
